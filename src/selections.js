import {
  computeSkipLimit,
  cypherDirective,
  cypherDirectiveArgs,
  filtersFromSelections,
  innerFilterParams,
  paramsToString,
  getFilterParams,
  innerType,
  isGraphqlScalarType,
  extractSelections,
  relationDirective,
  getRelationTypeDirective,
  decideNestedVariableName,
  safeVar,
  isNeo4jType,
  isNeo4jTypeField,
  getNeo4jTypeArguments,
  neo4jTypePredicateClauses,
  removeIgnoredFields
} from './utils';
import {
  customCypherField,
  relationFieldOnNodeType,
  relationTypeFieldOnNodeType,
  nodeTypeFieldOnRelationType,
  neo4jType,
  neo4jTypeField
} from './translate';

export function buildCypherSelection({
  initial = '',
  cypherParams,
  selections,
  variableName,
  schemaType,
  resolveInfo,
  paramIndex = 1,
  parentSelectionInfo = {},
  secondParentSelectionInfo = {}
}) {
  if (!selections.length) return [initial, {}];
  selections = removeIgnoredFields(schemaType, selections);
  let selectionFilters = filtersFromSelections(
    selections,
    resolveInfo.variableValues
  );
  const filterParams = getFilterParams(selectionFilters, paramIndex);
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
    cypherParams,
    variableName,
    paramIndex,
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

  if (selections.find(({ kind }) => kind && kind === 'InlineFragment')) {
    return selections
      .filter(({ kind }) => kind && kind === 'InlineFragment')
      .reduce((query, selection, index) => {
        const fragmentSelections = selections
          .filter(({ kind }) => kind && kind !== 'InlineFragment')
          .concat(selection.selectionSet.selections);
        const fragmentSchemaType = resolveInfo.schema.getType(
          selection.typeCondition.name.value
        );
        let fragmentTailParams = {
          selections: fragmentSelections,
          variableName,
          schemaType: fragmentSchemaType,
          resolveInfo,
          parentSelectionInfo,
          secondParentSelectionInfo
        };
        const result = recurse({
          initial: index === 0 ? query[0] : query[0] + ',',
          ...fragmentTailParams
        });
        return result;
      }, initial || ['']);
  }

  const fieldName = headSelection.name.value;
  const commaIfTail = tailSelections.length > 0 ? ',' : '';
  const isScalarSchemaType = isGraphqlScalarType(schemaType);
  const schemaTypeField = !isScalarSchemaType
    ? schemaType.getFields()[fieldName]
    : {};
  // Schema meta fields(__schema, __typename, etc)
  if (!isScalarSchemaType && !schemaTypeField) {
    return recurse({
      initial: tailSelections.length
        ? initial
        : initial.substring(0, initial.lastIndexOf(',')),
      ...tailParams
    });
  }

  const fieldType =
    schemaTypeField && schemaTypeField.type ? schemaTypeField.type : {};
  const innerSchemaType = innerType(fieldType); // for target "type" aka label

  const isInlineFragment =
    innerSchemaType &&
    innerSchemaType.astNode &&
    innerSchemaType.astNode.kind === 'InterfaceTypeDefinition';
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
      if (getRelationTypeDirective(schemaTypeAstNode)) {
        variableName = `${variableName}_relation`;
      }
      return recurse({
        initial: `${initial}${fieldName}: apoc.cypher.runFirstColumn("${customCypher}", {${cypherDirectiveArgs(
          variableName,
          headSelection,
          cypherParams,
          schemaType,
          resolveInfo,
          paramIndex
        )}}, false)${commaIfTail}`,
        ...tailParams
      });
    } else if (isNeo4jTypeField(schemaType, fieldName)) {
      return recurse(
        neo4jTypeField({
          initial,
          fieldName,
          variableName,
          commaIfTail,
          tailParams,
          parentSelectionInfo,
          secondParentSelectionInfo
        })
      );
    }
    // graphql scalar type, no custom cypher statement
    return recurse({
      initial: `${initial} .${fieldName} ${commaIfTail}`,
      ...tailParams
    });
  }
  // We have a graphql object type
  const innerSchemaTypeAstNode =
    innerSchemaType && typeMap[innerSchemaType]
      ? typeMap[innerSchemaType].astNode
      : {};
  const innerSchemaTypeRelation = getRelationTypeDirective(
    innerSchemaTypeAstNode
  );
  const schemaTypeRelation = getRelationTypeDirective(schemaTypeAstNode);
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
    headSelection.selectionSet ? headSelection.selectionSet.selections : [],
    resolveInfo.fragments
  );

  let subSelection = recurse({
    initial: '',
    selections: subSelections,
    variableName: nestedVariable,
    schemaType: innerSchemaType,
    resolveInfo,
    cypherParams,
    parentSelectionInfo: {
      fieldName,
      schemaType,
      variableName,
      fieldType,
      filterParams,
      selections,
      paramIndex
    },
    secondParentSelectionInfo: parentSelectionInfo
  });

  let selection;
  const fieldArgs =
    !isScalarSchemaType && schemaTypeField && schemaTypeField.args
      ? schemaTypeField.args.map(e => e.astNode)
      : [];

  const neo4jTypeArgs = getNeo4jTypeArguments(fieldArgs);
  const queryParams = paramsToString(
    innerFilterParams(filterParams, neo4jTypeArgs)
  );
  const fieldInfo = {
    initial,
    fieldName,
    fieldType,
    variableName,
    nestedVariable,
    queryParams,
    filterParams,
    neo4jTypeArgs,
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
        cypherParams,
        paramIndex,
        schemaType,
        schemaTypeRelation,
        customCypher,
        headSelection,
        resolveInfo
      })
    );
  } else if (isNeo4jType(innerSchemaType.name)) {
    selection = recurse(
      neo4jType({
        schemaType,
        schemaTypeRelation,
        parentSelectionInfo,
        ...fieldInfo
      })
    );
  } else if (relType && relDirection) {
    // Object type field with relation directive
    const neo4jTypeClauses = neo4jTypePredicateClauses(
      filterParams,
      nestedVariable,
      neo4jTypeArgs
    );
    // translate field, arguments and argument params
    const translation = relationFieldOnNodeType({
      ...fieldInfo,
      schemaType,
      selections,
      selectionFilters,
      relDirection,
      relType,
      isInlineFragment,
      innerSchemaType,
      neo4jTypeClauses,
      resolveInfo,
      paramIndex,
      fieldArgs,
      cypherParams
    });
    selection = recurse(translation.selection);
    // set subSelection to update field argument params
    subSelection = translation.subSelection;
  } else if (schemaTypeRelation) {
    // Object type field on relation type
    // (from, to, renamed, relation mutation payloads...)
    const translation = nodeTypeFieldOnRelationType({
      fieldInfo,
      schemaTypeRelation,
      innerSchemaType,
      isInlineFragment,
      paramIndex,
      schemaType,
      filterParams,
      neo4jTypeArgs,
      parentSelectionInfo,
      resolveInfo,
      selectionFilters,
      fieldArgs,
      cypherParams
    });
    selection = recurse(translation.selection);
    // set subSelection to update field argument params
    subSelection = translation.subSelection;
  } else if (innerSchemaTypeRelation) {
    // Relation type field on node type (field payload types...)
    const translation = relationTypeFieldOnNodeType({
      ...fieldInfo,
      innerSchemaTypeRelation,
      schemaType,
      innerSchemaType,
      filterParams,
      neo4jTypeArgs,
      resolveInfo,
      selectionFilters,
      paramIndex,
      fieldArgs,
      cypherParams
    });
    selection = recurse(translation.selection);
    // set subSelection to update field argument params
    subSelection = translation.subSelection;
  }
  return [selection[0], { ...selection[1], ...subSelection[1] }];
}
