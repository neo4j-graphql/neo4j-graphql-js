import {
  computeSkipLimit,
  cypherDirective,
  cypherDirectiveArgs,
  filtersFromSelections,
  innerFilterParams,
  getFilterParams,
  innerType,
  isGraphqlScalarType,
  extractSelections,
  relationDirective,
  getRelationTypeDirectiveArgs,
  decideNestedVariableName,
  safeLabel,
  safeVar,
  isTemporalType,
  isTemporalField,
  getTemporalArguments,
  temporalPredicateClauses
} from './utils';

import {
  customCypherField,
  relationFieldOnNodeType,
  relationTypeFieldOnNodeType,
  nodeTypeFieldOnRelationType,
  temporalType,
  temporalField
} from './translate';

export function buildCypherSelection({
  initial,
  selections,
  variableName,
  schemaType,
  resolveInfo,
  paramIndex = 1,
  parentSelectionInfo={},
  secondParentSelectionInfo={}
}) {

  if (!selections.length) {
    return [initial, {}];
  }

  const filterParams = getFilterParams(
    filtersFromSelections(selections, resolveInfo.variableValues),
    paramIndex
  );
  const shallowFilterParams = Object.entries(filterParams).reduce(
    (result, [key, value]) => {
      result[`${value.index}_${key}`] = value.value;
      return result;
    },
    {}
  );

  const [headSelection, ...tailSelections] = selections;

  let tailParams = {
    selections: tailSelections,
    variableName,
    schemaType,
    resolveInfo,
    parentSelectionInfo,
    secondParentSelectionInfo
  };

  const recurse = args => {
    paramIndex =
      Object.keys(shallowFilterParams).length > 0 ? paramIndex + 1 : paramIndex;
    const [subSelection, subFilterParams] = buildCypherSelection({
      ...args,
      ...{ paramIndex }
    });
    return [subSelection, { ...shallowFilterParams, ...subFilterParams }];
  };

  let fieldName;
  let isInlineFragment = false;
  let interfaceLabel;

  if (headSelection.kind === 'InlineFragment') {
    // get selections for the fragment and recurse on those
    const fragmentSelections = headSelection.selectionSet.selections;

    let fragmentTailParams = {
      selections: fragmentSelections,
      variableName,
      schemaType,
      resolveInfo,
      parentSelectionInfo,
      secondParentSelectionInfo
    };
    return recurse({
      initial: fragmentSelections.length
        ? initial
        : initial.substring(0, initial.lastIndexOf(',')),
      ...fragmentTailParams
    });
  } else {
    fieldName = headSelection.name.value;
  }

  const commaIfTail = tailSelections.length > 0 ? ',' : '';

  // Schema meta fields(__schema, __typename, etc)
  if (!schemaType.getFields()[fieldName]) {
    return recurse({
      initial: tailSelections.length
        ? initial
        : initial.substring(0, initial.lastIndexOf(',')),
      ...tailParams
    });
  }

  const fieldType = schemaType.getFields()[fieldName].type;
  const innerSchemaType = innerType(fieldType); // for target "type" aka label

  if (
    innerSchemaType &&
    innerSchemaType.astNode &&
    innerSchemaType.astNode.kind === 'InterfaceTypeDefinition'
  ) {
    isInlineFragment = true;
    // FIXME: remove unused variables
    const interfaceType = schemaType;
    const interfaceName = innerSchemaType.name;

    const fragments = headSelection.selectionSet.selections.filter(
      item => item.kind === 'InlineFragment'
    );

    // FIXME: this will only handle the first inline fragment
    const fragment = fragments[0];

    interfaceLabel = fragment.typeCondition.name.value;
    const implementationName = fragment.typeCondition.name.value;

    const schemaType = resolveInfo.schema._implementations[interfaceName].find(
      intfc => intfc.name === implementationName
    );
  }

  const { statement: customCypher } = cypherDirective(schemaType, fieldName);

  const typeMap = resolveInfo.schema.getTypeMap();
  const schemaTypeAstNode = typeMap[schemaType].astNode;

  // Database meta fields(_id)
  if (fieldName === '_id') {
    return recurse({
      initial: `${initial}${fieldName}: ID(${safeVar(
        variableName
      )})${commaIfTail}`,
      ...tailParams
    });
  }
  // Main control flow
  if (isGraphqlScalarType(innerSchemaType)) {
    if (customCypher) {
      if (getRelationTypeDirectiveArgs(schemaTypeAstNode)) {
        variableName = `${variableName}_relation`;
      }
      return recurse({
        initial: `${initial}${fieldName}: apoc.cypher.runFirstColumn("${customCypher}", ${cypherDirectiveArgs(
          variableName,
          headSelection,
          schemaType,
          resolveInfo
        )}, false)${commaIfTail}`,
        ...tailParams
      });
    }
    else if(isTemporalField(schemaType, fieldName)) {
      return recurse(temporalField({
        initial,
        fieldName, 
        variableName,
        commaIfTail,
        tailParams,
        parentSelectionInfo,
        secondParentSelectionInfo
      }));
    }
    // graphql scalar type, no custom cypher statement
    return recurse({
      initial: `${initial} .${fieldName} ${commaIfTail}`,
      ...tailParams
    });
  }
  // We have a graphql object type
  const innerSchemaTypeAstNode = typeMap[innerSchemaType].astNode;
  const innerSchemaTypeRelation = getRelationTypeDirectiveArgs(innerSchemaTypeAstNode);
  const schemaTypeRelation = getRelationTypeDirectiveArgs(schemaTypeAstNode);
  const { name: relType, direction: relDirection } = relationDirective(
    schemaType,
    fieldName
  );

  const nestedVariable = decideNestedVariableName({
    schemaTypeRelation,
    innerSchemaTypeRelation,
    variableName,
    fieldName,
    parentSelectionInfo
  });

  const skipLimit = computeSkipLimit(headSelection, resolveInfo.variableValues);

  const subSelections = extractSelections(
    headSelection.selectionSet.selections,
    resolveInfo.fragments
  );

  const subSelection = recurse({
    initial: '',
    selections: subSelections,
    variableName: nestedVariable,
    schemaType: innerSchemaType,
    resolveInfo,
    parentSelectionInfo: {
      fieldName,
      schemaType,
      variableName,
      fieldType
    },
    secondParentSelectionInfo: parentSelectionInfo
  });

  let selection;
  const fieldArgs = schemaType.getFields()[fieldName].args.map(e => e.astNode);
  const temporalArgs = getTemporalArguments(fieldArgs);
  const queryParams = innerFilterParams(filterParams, temporalArgs);
  const fieldInfo = {
    initial,
    fieldName,
    fieldType,
    variableName,
    nestedVariable,
    queryParams,
    subSelection,
    skipLimit,
    commaIfTail,
    tailParams
  };
  if (customCypher) {
    // Object type field with cypher directive
    selection = recurse(
      customCypherField({
        ...fieldInfo,
        schemaType,
        schemaTypeRelation,
        customCypher,
        headSelection,
        resolveInfo
      })
    );
  } else if(isTemporalType(innerSchemaType.name)) {
    selection = recurse(temporalType({
      schemaType,
      schemaTypeRelation,
      parentSelectionInfo,
      ...fieldInfo
    }));
  } else if (relType && relDirection) {
    // Object type field with relation directive
    const temporalClauses = temporalPredicateClauses(filterParams, nestedVariable, temporalArgs);
    selection = recurse(
      relationFieldOnNodeType({
        ...fieldInfo,
        relDirection,
        relType,
        isInlineFragment,
        interfaceLabel,
        innerSchemaType,
        temporalClauses
      })
    );
  } else if (schemaTypeRelation) {
    // Object type field on relation type
    // (from, to, renamed, relation mutation payloads...)
    selection = recurse(
      nodeTypeFieldOnRelationType({
        fieldInfo,
        schemaTypeRelation,
        innerSchemaType,
        isInlineFragment,
        interfaceLabel,
        paramIndex,
        schemaType,
        filterParams,
        temporalArgs,
        parentSelectionInfo
      })
      );
    } else if (innerSchemaTypeRelation) {
      // Relation type field on node type (field payload types...)
      selection = recurse(
        relationTypeFieldOnNodeType({
          ...fieldInfo,
          innerSchemaTypeRelation,
          schemaType,
          filterParams,
          temporalArgs
      })
    );
  }
  return [selection[0], { ...selection[1], ...subSelection[1] }];
}
