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
  relationDirective,
  getRelationTypeDirective,
  decideNestedVariableName,
  safeVar,
  isNeo4jType,
  isNeo4jTypeField,
  getNeo4jTypeArguments,
  removeIgnoredFields,
  getInterfaceDerivedTypeNames
} from './utils';
import {
  customCypherField,
  relationFieldOnNodeType,
  relationTypeFieldOnNodeType,
  nodeTypeFieldOnRelationType,
  neo4jType,
  neo4jTypeField,
  derivedTypesParams,
  fragmentType
} from './translate';
import { Kind } from 'graphql';
import {
  isObjectTypeDefinition,
  isInterfaceTypeDefinition,
  isUnionTypeDefinition
} from './augment/types/types';
import {
  unwrapNamedType,
  TypeWrappers,
  Neo4jSystemIDField
} from './augment/fields';

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
  const typeMap = resolveInfo.schema.getTypeMap();
  const schemaTypeName = schemaType.name;
  const schemaTypeAstNode = typeMap[schemaTypeName].astNode;
  const isUnionType = isUnionTypeDefinition({
    definition: schemaTypeAstNode
  });
  if (!isUnionType) {
    selections = removeIgnoredFields(schemaType, selections);
  }
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

  // TODO move recurse out of buildCypherSelection, refactoring paramIndex
  const recurse = args => {
    paramIndex =
      Object.keys(shallowFilterParams).length > 0 ? paramIndex + 1 : paramIndex;
    const [subSelection, subFilterParams] = buildCypherSelection({
      ...args,
      ...{ paramIndex }
    });
    const derivedTypesParams = Object.entries(args)
      .filter(([key]) => key.endsWith('_derivedTypes'))
      .reduce(
        (acc, [key, value]) => ({
          ...acc,
          [key]: value
        }),
        {}
      );
    return [
      subSelection,
      { ...shallowFilterParams, ...subFilterParams, ...derivedTypesParams }
    ];
  };

  let selection = [];
  let subSelection = [];

  const [headSelection, ...tailSelections] = selections;
  const fieldName =
    headSelection && headSelection.name ? headSelection.name.value : '';
  const safeVariableName = safeVar(variableName);

  const usesFragments = isFragmentedSelection({ selections });
  const isScalarType = isGraphqlScalarType(schemaType);
  const schemaTypeField =
    !isScalarType && !isUnionType ? schemaType.getFields()[fieldName] : {};

  const isInterfaceType = isInterfaceTypeDefinition({
    definition: schemaTypeAstNode
  });
  const isObjectType = isObjectTypeDefinition({
    definition: schemaTypeAstNode
  });
  const isFragmentedInterfaceType = usesFragments && isInterfaceType;
  const isFragmentedObjectType = usesFragments && isObjectType;
  const { statement: customCypherStatement } = cypherDirective(
    schemaType,
    fieldName
  );

  let tailParams = {
    selections: tailSelections,
    cypherParams,
    variableName,
    paramIndex,
    schemaType,
    resolveInfo,
    shallowFilterParams,
    parentSelectionInfo,
    secondParentSelectionInfo
  };

  let translationConfig = undefined;

  if (isFragmentedInterfaceType || isUnionType || isFragmentedObjectType) {
    const [schemaTypeFields, derivedTypeMap] = mergeSelectionFragments({
      schemaType,
      selections,
      isFragmentedObjectType,
      isUnionType,
      typeMap,
      resolveInfo
    });
    const hasOnlySchemaTypeFragments =
      schemaTypeFields.length > 0 && Object.keys(derivedTypeMap).length === 0;
    if (hasOnlySchemaTypeFragments || isFragmentedObjectType) {
      tailParams.selections = schemaTypeFields;
      translationConfig = tailParams;
    } else if (isFragmentedInterfaceType || isUnionType) {
      const derivedTypes = getDerivedTypes({
        schemaTypeName,
        derivedTypeMap,
        isFragmentedInterfaceType,
        isUnionType,
        resolveInfo
      });
      // TODO Make this a new function once recurse is moved out of buildCypherSelection
      // so that we don't have to start passing recurse as an argument
      const [fragmentedQuery, queryParams] = derivedTypes.reduce(
        ([listComprehensions, params], derivedType) => {
          // Get merged selections of this implementing type
          let mergedTypeSelections = derivedTypeMap[derivedType];
          if (!mergedTypeSelections) {
            // If no fields of this implementing type were selected,
            // use at least any interface fields selected generally
            mergedTypeSelections = schemaTypeFields;
          }
          if (mergedTypeSelections.length) {
            const composedTypeDefinition = typeMap[derivedType].astNode;
            const isInterfaceTypeFragment = isInterfaceTypeDefinition({
              definition: composedTypeDefinition
            });
            // If selections have been made for this type after merging
            if (isFragmentedInterfaceType || isUnionType) {
              schemaType = resolveInfo.schema.getType(derivedType);
            }
            // TODO Refactor when recurse is moved out buildCypherSelection
            // Build the map projection for this implementing type
            let [fragmentedQuery, queryParams] = recurse({
              ...tailParams,
              schemaType,
              selections: mergedTypeSelections,
              paramIndex
            });
            if (isFragmentedInterfaceType || isUnionType) {
              // Build a more complex list comprehension for
              // this type, to be aggregated together later
              [
                fragmentedQuery,
                queryParams
              ] = buildComposedTypeListComprehension({
                derivedType,
                isUnionType,
                mergedTypeSelections,
                queryParams,
                safeVariableName,
                isInterfaceTypeFragment,
                fragmentedQuery,
                resolveInfo
              });
            }
            listComprehensions.push(fragmentedQuery);
            // Merge any cypher params built for field arguments
            params = { ...params, ...queryParams };
          }
          return [listComprehensions, params];
        },
        [[], {}]
      );
      const composedQuery = concatenateComposedTypeLists({
        fragmentedQuery
      });
      selection = [composedQuery, queryParams];
    }
  } else {
    const fieldType =
      schemaTypeField && schemaTypeField.type ? schemaTypeField.type : {};
    const innerSchemaType = innerType(fieldType); // for target "type" aka label

    // TODO Switch to using schemaTypeField.astNode instead of schemaTypeField
    // so the field type could be extracted using unwrapNamedType. We could explicitly check
    // the ast for list type wrappers (changing isArrayType calls in translate.js) and we
    // could use in the branching logic here, the same astNode.kind based predicate functions
    // used in the  augmentation code (ex: from isObjectType to isObjectTypeDefinition from ast.js)
    const fieldAstNode = schemaTypeField ? schemaTypeField.astNode : {};
    const fieldTypeWrappers = unwrapNamedType({ type: fieldAstNode });
    const fieldTypeName = fieldTypeWrappers[TypeWrappers.NAME];
    const innerSchemaTypeAstNode = typeMap[fieldTypeName]
      ? typeMap[fieldTypeName].astNode
      : {};

    const commaIfTail = tailSelections.length > 0 ? ',' : '';

    const isIntrospectionField = !isScalarType && !schemaTypeField;
    const isScalarTypeField = isGraphqlScalarType(innerSchemaType);
    const isObjectTypeField = isObjectTypeDefinition({
      definition: innerSchemaTypeAstNode
    });
    const isInterfaceTypeField = isInterfaceTypeDefinition({
      definition: innerSchemaTypeAstNode
    });
    const isUnionTypeField = isUnionTypeDefinition({
      definition: innerSchemaTypeAstNode
    });
    if (isIntrospectionField) {
      // Schema meta fields(__schema, __typename, etc)
      translationConfig = {
        ...tailParams,
        initial: tailSelections.length
          ? initial
          : initial.substring(0, initial.lastIndexOf(','))
      };
    } else if (isScalarTypeField) {
      translationConfig = translateScalarTypeField({
        fieldName,
        initial,
        variableName,
        commaIfTail,
        tailParams,
        customCypherStatement,
        schemaType,
        schemaTypeAstNode,
        headSelection,
        resolveInfo,
        paramIndex,
        cypherParams,
        parentSelectionInfo,
        secondParentSelectionInfo
      });
    } else if (isObjectType || isInterfaceType) {
      const schemaTypeRelation = getRelationTypeDirective(schemaTypeAstNode);
      const innerSchemaTypeRelation = getRelationTypeDirective(
        innerSchemaTypeAstNode
      );
      const nestedVariable = decideNestedVariableName({
        schemaTypeRelation,
        innerSchemaTypeRelation,
        variableName,
        fieldName,
        parentSelectionInfo
      });
      const fieldSelectionSet =
        headSelection && headSelection.selectionSet
          ? headSelection.selectionSet.selections
          : [];

      subSelection = recurse({
        selections: fieldSelectionSet,
        variableName: nestedVariable,
        paramIndex,
        schemaType: innerSchemaType,
        resolveInfo,
        cypherParams,
        shallowFilterParams,
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

      const fieldArgs =
        !isScalarType && schemaTypeField && schemaTypeField.args
          ? schemaTypeField.args.map(e => e.astNode)
          : [];
      const neo4jTypeArgs = getNeo4jTypeArguments(fieldArgs);
      const queryParams = paramsToString(
        innerFilterParams(filterParams, neo4jTypeArgs)
      );
      const skipLimit = computeSkipLimit(
        headSelection,
        resolveInfo.variableValues
      );
      const { name: relType, direction: relDirection } = relationDirective(
        schemaType,
        fieldName
      );
      const isRelationshipField = relType && relDirection;
      const isRelationshipTypeField = innerSchemaTypeRelation !== undefined;

      const usesFragments = isFragmentedSelection({
        selections: fieldSelectionSet
      });
      const isFragmentedObjectTypeField = isObjectTypeField && usesFragments;
      const [schemaTypeFields, derivedTypeMap] = mergeSelectionFragments({
        schemaType: innerSchemaType,
        selections: fieldSelectionSet,
        isFragmentedObjectType: isFragmentedObjectTypeField,
        isUnionType: isUnionTypeField,
        typeMap,
        resolveInfo
      });
      const fragmentTypeParams = derivedTypesParams({
        isInterfaceType: isInterfaceTypeField,
        isUnionType: isUnionTypeField,
        schema: resolveInfo.schema,
        schemaTypeName: innerSchemaType.name,
        usesFragments
      });
      subSelection[1] = { ...subSelection[1], ...fragmentTypeParams };
      if (customCypherStatement) {
        // Object type field with cypher directive
        translationConfig = customCypherField({
          customCypherStatement,
          cypherParams,
          paramIndex,
          schemaTypeRelation,
          isInterfaceTypeField,
          isUnionTypeField,
          isObjectTypeField,
          usesFragments,
          schemaTypeFields,
          derivedTypeMap,
          initial,
          fieldName,
          fieldType,
          fieldTypeName,
          nestedVariable,
          variableName,
          headSelection,
          schemaType,
          innerSchemaType,
          resolveInfo,
          subSelection,
          skipLimit,
          commaIfTail,
          tailParams
        });
      } else if (isNeo4jType(fieldTypeName)) {
        translationConfig = neo4jType({
          initial,
          fieldName,
          subSelection,
          commaIfTail,
          tailParams,
          variableName,
          nestedVariable,
          fieldType,
          schemaType,
          schemaTypeRelation,
          parentSelectionInfo
        });
      } else if (isRelationshipField || isUnionTypeField) {
        // Object type field with relation directive
        [translationConfig, subSelection] = relationFieldOnNodeType({
          initial,
          fieldName,
          fieldType,
          variableName,
          relDirection,
          relType,
          nestedVariable,
          schemaTypeFields,
          derivedTypeMap,
          isInterfaceTypeField,
          isUnionTypeField,
          isObjectTypeField,
          usesFragments,
          innerSchemaType,
          paramIndex,
          fieldArgs,
          filterParams,
          selectionFilters,
          neo4jTypeArgs,
          selections,
          schemaType,
          subSelection,
          skipLimit,
          commaIfTail,
          tailParams,
          resolveInfo,
          cypherParams
        });
      } else if (schemaTypeRelation) {
        // Object type field on relation type
        // (from, to, renamed, relation mutation payloads...)
        [translationConfig, subSelection] = nodeTypeFieldOnRelationType({
          initial,
          fieldName,
          fieldType,
          variableName,
          nestedVariable,
          queryParams,
          subSelection,
          skipLimit,
          commaIfTail,
          tailParams,
          filterParams,
          neo4jTypeArgs,
          schemaTypeRelation,
          innerSchemaType,
          schemaTypeFields,
          derivedTypeMap,
          isObjectTypeField,
          isInterfaceTypeField,
          isUnionTypeField,
          usesFragments,
          paramIndex,
          parentSelectionInfo,
          resolveInfo,
          selectionFilters,
          fieldArgs,
          cypherParams
        });
      } else if (isRelationshipTypeField) {
        // Relation type field on node type (field payload types...)
        // and set subSelection to update field argument params
        [translationConfig, subSelection] = relationTypeFieldOnNodeType({
          innerSchemaTypeRelation,
          initial,
          fieldName,
          subSelection,
          skipLimit,
          commaIfTail,
          tailParams,
          fieldType,
          variableName,
          schemaType,
          innerSchemaType,
          nestedVariable,
          queryParams,
          filterParams,
          neo4jTypeArgs,
          resolveInfo,
          selectionFilters,
          paramIndex,
          fieldArgs,
          cypherParams
        });
      }
    }
  }
  if (translationConfig) {
    selection = recurse(translationConfig);
  }
  return [selection[0], { ...selection[1], ...subSelection[1] }];
}

const translateScalarTypeField = ({
  fieldName,
  initial,
  variableName,
  commaIfTail,
  tailParams,
  customCypherStatement,
  schemaType,
  schemaTypeAstNode,
  headSelection,
  resolveInfo,
  paramIndex,
  cypherParams,
  parentSelectionInfo,
  secondParentSelectionInfo
}) => {
  if (fieldName === Neo4jSystemIDField) {
    return {
      initial: `${initial}${fieldName}: ID(${safeVar(
        variableName
      )})${commaIfTail}`,
      ...tailParams
    };
  } else {
    if (customCypherStatement) {
      if (getRelationTypeDirective(schemaTypeAstNode)) {
        variableName = `${variableName}_relation`;
      }
      return {
        initial: `${initial}${fieldName}: apoc.cypher.runFirstColumn("${customCypherStatement}", {${cypherDirectiveArgs(
          variableName,
          headSelection,
          cypherParams,
          schemaType,
          resolveInfo,
          paramIndex
        )}}, false)${commaIfTail}`,
        ...tailParams
      };
    } else if (isNeo4jTypeField(schemaType, fieldName)) {
      return neo4jTypeField({
        initial,
        fieldName,
        variableName,
        commaIfTail,
        tailParams,
        parentSelectionInfo,
        secondParentSelectionInfo
      });
    }
    // graphql scalar type, no custom cypher statement
    return {
      initial: `${initial} .${fieldName} ${commaIfTail}`,
      ...tailParams
    };
  }
};

export const mergeSelectionFragments = ({
  schemaType,
  selections,
  isFragmentedObjectType,
  isUnionType,
  typeMap,
  resolveInfo
}) => {
  const schemaTypeName = schemaType.name;
  const fragmentDefinitions = resolveInfo.fragments;
  let [schemaTypeFields, derivedTypeMap] = buildFragmentMaps({
    selections,
    schemaTypeName,
    fragmentDefinitions,
    isUnionType,
    typeMap,
    resolveInfo
  });
  // Composed object queries still only use a single map projection
  if (isFragmentedObjectType) {
    derivedTypeMap[schemaTypeName] = schemaTypeFields;
  }
  Object.keys(derivedTypeMap).forEach(typeName => {
    const allSelections = [...derivedTypeMap[typeName], ...schemaTypeFields];
    derivedTypeMap[typeName] = mergeFragmentedSelections({
      selections: allSelections
    });
  });
  schemaTypeFields = mergeFragmentedSelections({
    selections: schemaTypeFields
  });
  // When querying an interface type using fragments, queries are made
  // more specific if there is not at least 1 interface field selected.
  // So the __typename field is removed here to prevent interpreting it
  // as a field for which a value could be obtained from matched data.
  // Otherwisez all interface type nodes would always be returned even
  // when only using fragments to select fields on implementing types
  const typeNameFieldIndex = schemaTypeFields.findIndex(
    field => field.name && field.name.value === '__typename'
  );
  if (typeNameFieldIndex !== -1) schemaTypeFields.splice(typeNameFieldIndex, 1);
  schemaTypeFields;
  return [schemaTypeFields, derivedTypeMap];
};

const buildFragmentMaps = ({
  selections = [],
  schemaTypeName,
  fragmentDefinitions,
  isUnionType,
  typeMap = {},
  resolveInfo
}) => {
  const schemaTypeFields = [];
  let interfaceFragmentMap = {};
  let objectFragmentMap = {};
  let objectSelectionMap = {};
  selections.forEach(selection => {
    let fieldKind = selection.kind;
    if (fieldKind === Kind.FIELD) {
      schemaTypeFields.push(selection);
    } else if (
      fieldKind === Kind.INLINE_FRAGMENT ||
      fieldKind === Kind.FRAGMENT_SPREAD
    ) {
      let fragmentSelections = [];
      let typeCondition = '';
      if (fieldKind === Kind.FRAGMENT_SPREAD) {
        const fragmentDefinition = fragmentDefinitions[selection.name.value];
        fragmentSelections = fragmentDefinition.selectionSet.selections;
        typeCondition = fragmentDefinition.typeCondition;
      } else {
        fragmentSelections = selection.selectionSet.selections;
        typeCondition = selection.typeCondition;
      }
      const typeName = typeCondition ? typeCondition.name.value : '';
      if (typeName) {
        const definition = typeMap[typeName] ? typeMap[typeName].astNode : {};
        if (isObjectTypeDefinition({ definition })) {
          if (typeName === schemaTypeName) {
            schemaTypeFields.push(...fragmentSelections);
          } else {
            if (!objectFragmentMap[typeName]) objectFragmentMap[typeName] = [];
            objectFragmentMap[typeName].push(selection);

            if (!objectSelectionMap[typeName])
              objectSelectionMap[typeName] = fragmentSelections;
            else objectSelectionMap[typeName].push(...fragmentSelections);
          }
        } else if (isInterfaceTypeDefinition({ definition })) {
          if (typeName === schemaTypeName) {
            schemaTypeFields.push(...fragmentSelections);
          } else if (isUnionType) {
            if (!interfaceFragmentMap[typeName])
              interfaceFragmentMap[typeName] = fragmentSelections;
            else interfaceFragmentMap[typeName].push(...fragmentSelections);
          }
        }
      } else {
        // For inline untyped fragments on the same type, ex: ...{ title }
        schemaTypeFields.push(...fragmentSelections);
      }
    }
  });
  const derivedTypeMap = mergeInterfacedObjectFragments({
    objectFragmentMap,
    objectSelectionMap,
    interfaceFragmentMap,
    resolveInfo
  });
  return [schemaTypeFields, derivedTypeMap];
};

const mergeInterfacedObjectFragments = ({
  objectFragmentMap,
  objectSelectionMap,
  interfaceFragmentMap = {},
  resolveInfo
}) => {
  Object.keys(interfaceFragmentMap).forEach(interfaceName => {
    const derivedTypes = getInterfaceDerivedTypeNames(
      resolveInfo.schema,
      interfaceName
    );
    derivedTypes.forEach(typeName => {
      const implementingTypeFragments = objectFragmentMap[typeName];
      if (implementingTypeFragments) {
        interfaceFragmentMap[interfaceName] = [
          ...interfaceFragmentMap[interfaceName],
          ...implementingTypeFragments
        ];
        delete objectSelectionMap[typeName];
      }
    });
  });
  return { ...objectSelectionMap, ...interfaceFragmentMap };
};

const mergeFragmentedSelections = ({ selections = [] }) => {
  const subSelecionFieldMap = {};
  const fragments = [];
  selections.forEach(selection => {
    const fieldKind = selection.kind;
    if (fieldKind === Kind.FIELD) {
      const fieldName = selection.name.value;
      if (!subSelecionFieldMap[fieldName]) {
        // initialize entry for this composing type
        subSelecionFieldMap[fieldName] = selection;
      } else {
        const alreadySelected = subSelecionFieldMap[fieldName].selectionSet
          ? subSelecionFieldMap[fieldName].selectionSet.selections
          : [];
        const selected = selection.selectionSet
          ? selection.selectionSet.selections
          : [];
        // If the field has a subselection (relationship field)
        if (alreadySelected.length && selected.length) {
          const selections = [...alreadySelected, ...selected];
          subSelecionFieldMap[
            fieldName
          ].selectionSet.selections = mergeFragmentedSelections({
            selections
          });
        }
      }
    } else {
      // Persist all fragments, to be merged later
      fragments.push(selection);
    }
  });
  // Return the aggregation of all fragments and merged relationship fields
  return [...Object.values(subSelecionFieldMap), ...fragments];
};

export const getDerivedTypes = ({
  schemaTypeName,
  derivedTypeMap,
  isFragmentedInterfaceType,
  isUnionType,
  resolveInfo
}) => {
  let derivedTypes = [];
  if (isFragmentedInterfaceType) {
    // Get an array of all types implementing this interface type
    derivedTypes = getInterfaceDerivedTypeNames(
      resolveInfo.schema,
      schemaTypeName
    );
  } else if (isUnionType) {
    // Use only those type names for which fragments have been used
    derivedTypes = Object.keys(derivedTypeMap);
    derivedTypes = derivedTypes.sort();
  }
  return derivedTypes;
};

export const isFragmentedSelection = ({ selections }) => {
  return selections.find(
    selection =>
      selection.kind === Kind.INLINE_FRAGMENT ||
      selection.kind === Kind.FRAGMENT_SPREAD
  );
};

const buildComposedTypeListComprehension = ({
  derivedType,
  isUnionType,
  safeVariableName,
  mergedTypeSelections,
  queryParams,
  isInterfaceTypeFragment,
  fragmentedQuery,
  resolveInfo
}) => {
  let typeMapProjection = `${safeVariableName} { FRAGMENT_TYPE: "${derivedType}"${
    // When __typename is the only field selected not within a fragment,
    // fragmentedQuery is undefined, so that we only provide the FRAGMENT_TYPE
    fragmentedQuery ? `, ${fragmentedQuery}` : ''
  } }`;
  if (isUnionType && isInterfaceTypeFragment) {
    const usesFragments = isFragmentedSelection({
      selections: mergedTypeSelections
    });
    if (usesFragments) {
      typeMapProjection = fragmentedQuery;
    } else {
      typeMapProjection = `${safeVariableName} { ${fragmentType(
        safeVariableName,
        derivedType
      )}${
        // When __typename is the only field selected not within a fragment,
        // fragmentedQuery is undefined, so that we only provide the FRAGMENT_TYPE
        fragmentedQuery ? `, ${fragmentedQuery}` : ''
      } }`;
      const fragmentTypeParams = derivedTypesParams({
        isInterfaceType: true,
        usesFragments: false,
        schema: resolveInfo.schema,
        schemaTypeName: derivedType
      });
      queryParams = { ...queryParams, ...fragmentTypeParams };
    }
  }
  fragmentedQuery = `[${safeVariableName} IN [${safeVariableName}] WHERE [label IN labels(${safeVariableName}) WHERE label = "${derivedType}" | TRUE] | ${typeMapProjection}]`;
  return [fragmentedQuery, queryParams];
};

// See: https://neo4j.com/docs/cypher-manual/current/syntax/operators/#syntax-concatenating-two-lists
const concatenateComposedTypeLists = ({ fragmentedQuery }) =>
  fragmentedQuery.length ? `head(${fragmentedQuery.join(` + `)})` : '';
