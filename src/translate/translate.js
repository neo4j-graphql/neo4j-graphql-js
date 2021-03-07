import {
  isArrayType,
  cypherDirectiveArgs,
  safeLabel,
  safeVar,
  getFilterParams,
  lowFirstLetter,
  computeOrderBy,
  innerFilterParams,
  paramsToString,
  filterNullParams,
  getOuterSkipLimit,
  getQueryCypherDirective,
  getQueryArguments,
  isNodeType,
  getRelationTypeDirective,
  isRelationTypePayload,
  getNeo4jTypeArguments,
  neo4jTypePredicateClauses,
  isNeo4jType,
  isTemporalType,
  isSpatialType,
  isSpatialDistanceInputType,
  isGraphqlScalarType,
  isGraphqlInterfaceType,
  isGraphqlUnionType,
  innerType,
  relationDirective,
  typeIdentifiers,
  getAdditionalLabels,
  getInterfaceDerivedTypeNames,
  getPayloadSelections,
  isGraphqlObjectType,
  decideNeo4jTypeConstructor
} from '../utils';
import {
  isScalarType,
  isEnumType,
  isObjectType,
  isInterfaceType
} from 'graphql';
import {
  buildCypherSelection,
  isFragmentedSelection,
  getDerivedTypes,
  getUnionDerivedTypes,
  mergeSelectionFragments
} from '../selections';
import _ from 'lodash';
import neo4j from 'neo4j-driver';
import {
  getFederatedOperationData,
  setCompoundKeyFilter,
  NEO4j_GRAPHQL_SERVICE
} from '../federation';
import {
  unwrapNamedType,
  isListTypeField,
  TypeWrappers
} from '../augment/fields';
import {
  isNeo4jTypeArgument,
  OrderingArgument,
  SearchArgument
} from '../augment/input-values';
import {
  isRelationshipMutationOutputType,
  isReflexiveRelationshipOutputType
} from '../augment/types/relationship/query';
import { ApolloError } from 'apollo-server-errors';

const derivedTypesParamName = schemaTypeName =>
  `${schemaTypeName}_derivedTypes`;

export const fragmentType = (varName, schemaTypeName) =>
  `FRAGMENT_TYPE: head( [ label IN labels(${varName}) WHERE label IN $${derivedTypesParamName(
    schemaTypeName
  )} ] )`;

export const derivedTypesParams = ({
  isInterfaceType,
  isUnionType,
  schema,
  schemaTypeName,
  usesFragments
}) => {
  const params = {};
  if (!usesFragments) {
    if (isInterfaceType) {
      const paramName = derivedTypesParamName(schemaTypeName);
      params[paramName] = getInterfaceDerivedTypeNames(schema, schemaTypeName);
    } else if (isUnionType) {
      const paramName = derivedTypesParamName(schemaTypeName);
      const typeMap = schema.getTypeMap();
      const schemaType = typeMap[schemaTypeName];
      const types = schemaType.getTypes();
      params[paramName] = types.map(type => type.name);
    }
  }
  return params;
};

export const customCypherField = ({
  customCypherStatement,
  cypherParams,
  paramIndex,
  schemaTypeRelation,
  isObjectTypeField,
  isInterfaceTypeField,
  isUnionTypeField,
  usesFragments,
  schemaTypeFields,
  derivedTypeMap,
  initial,
  fieldName,
  fieldType,
  nestedVariable,
  variableName,
  headSelection,
  schemaType,
  innerSchemaType,
  resolveInfo,
  subSelection,
  skipLimit,
  commaIfTail,
  tailParams,
  isFederatedOperation,
  context
}) => {
  const [mapProjection, labelPredicate] = buildMapProjection({
    isComputedField: true,
    schemaType: innerSchemaType,
    isObjectType: isObjectTypeField,
    isInterfaceType: isInterfaceTypeField,
    isUnionType: isUnionTypeField,
    usesFragments,
    safeVariableName: nestedVariable,
    subQuery: subSelection[0],
    schemaTypeFields,
    derivedTypeMap,
    resolveInfo
  });
  const headListWrapperPrefix = `${!isArrayType(fieldType) ? 'head(' : ''}`;
  const headListWrapperSuffix = `${!isArrayType(fieldType) ? ')' : ''}`;
  // For @cypher fields with object payload types, customCypherField is
  // called after the recursive call to compute a subSelection. But recurse()
  // increments paramIndex. So here we need to decrement it in order to map
  // appropriately to the indexed keys produced in getFilterParams()
  const cypherFieldParamsIndex = paramIndex - 1;
  if (schemaTypeRelation) {
    variableName = `${variableName}_relation`;
  }
  return {
    initial: `${initial}${fieldName}: ${headListWrapperPrefix}${
      labelPredicate ? `[${nestedVariable} IN ` : ''
    }[ ${nestedVariable} IN apoc.cypher.runFirstColumn("${customCypherStatement}", {${cypherDirectiveArgs(
      variableName,
      headSelection,
      cypherParams,
      schemaType,
      resolveInfo,
      cypherFieldParamsIndex,
      isFederatedOperation,
      context
    )}}, true) ${labelPredicate}| ${
      labelPredicate ? `${nestedVariable}] | ` : ''
    }${mapProjection}]${headListWrapperSuffix}${skipLimit} ${commaIfTail}`,
    ...tailParams
  };
};

export const relationFieldOnNodeType = ({
  initial,
  fieldName,
  fieldType,
  fieldSelectionSet,
  variableName,
  relDirection,
  relType,
  nestedVariable,
  schemaTypeFields,
  derivedTypeMap,
  isObjectTypeField,
  isInterfaceTypeField,
  isUnionTypeField,
  usesFragments,
  innerSchemaType,
  paramIndex,
  fieldArgs,
  filterParams,
  selectionFilters,
  neo4jTypeArgs,
  fieldsForTranslation,
  subSelection,
  skipLimit,
  commaIfTail,
  tailParams,
  resolveInfo,
  cypherParams
}) => {
  const safeVariableName = safeVar(nestedVariable);
  const subQuery = subSelection[0];

  const [mapProjection, labelPredicate] = buildMapProjection({
    schemaType: innerSchemaType,
    isObjectType: isObjectTypeField,
    isInterfaceType: isInterfaceTypeField,
    isUnionType: isUnionTypeField,
    usesFragments,
    safeVariableName,
    subQuery,
    schemaTypeFields,
    derivedTypeMap,
    resolveInfo
  });
  const allParams = innerFilterParams(filterParams, neo4jTypeArgs);
  const queryParams = paramsToString(
    _.filter(allParams, param => {
      const value =
        param.value.value !== undefined ? param.value.value : param.value;
      return !Array.isArray(value);
    })
  );

  const [filterPredicates, serializedFilterParam] = processFilterArgument({
    fieldArgs,
    schemaType: innerSchemaType,
    variableName: nestedVariable,
    resolveInfo,
    params: selectionFilters,
    paramIndex
  });
  const filterParamKey = `${tailParams.paramIndex}_filter`;
  const fieldArgumentParams = subSelection[1];
  const filterParam = fieldArgumentParams[filterParamKey];
  if (
    filterParam &&
    typeof serializedFilterParam[filterParamKey] !== 'undefined'
  ) {
    subSelection[1][filterParamKey] = serializedFilterParam[filterParamKey];
  }

  const neo4jTypeClauses = neo4jTypePredicateClauses(
    filterParams,
    nestedVariable,
    neo4jTypeArgs
  );

  const arrayPredicates = translateListArguments({
    schemaType: innerSchemaType,
    fieldArgs,
    filterParams,
    safeVariableName,
    resolveInfo
  });

  const [lhsOrdering, rhsOrdering] = translateNestedOrderingArgument({
    schemaType: innerSchemaType,
    selections: fieldsForTranslation,
    fieldSelectionSet,
    filterParams
  });

  let whereClauses = [
    labelPredicate,
    ...neo4jTypeClauses,
    ...arrayPredicates,
    ...filterPredicates
  ].filter(predicate => !!predicate);

  tailParams.initial = `${initial}${fieldName}: ${
    !isArrayType(fieldType) ? 'head(' : ''
  }${lhsOrdering}[(${safeVar(variableName)})${
    isUnionTypeField
      ? `--`
      : `${
          relDirection === 'in' || relDirection === 'IN' ? '<' : ''
        }-[:${safeLabel([relType])}]-${
          relDirection === 'out' || relDirection === 'OUT' ? '>' : ''
        }`
  }(${safeVariableName}${`:${safeLabel([
    innerSchemaType.name,
    ...getAdditionalLabels(
      resolveInfo.schema.getType(innerSchemaType.name),
      cypherParams
    )
  ])}`}${queryParams})${
    whereClauses.length > 0 ? ` WHERE ${whereClauses.join(' AND ')}` : ''
  } | ${mapProjection}]${rhsOrdering}${
    !isArrayType(fieldType) ? ')' : ''
  }${skipLimit} ${commaIfTail}`;

  return [tailParams, subSelection];
};

export const relationTypeFieldOnNodeType = ({
  innerSchemaTypeRelation,
  initial,
  fieldName,
  fieldSelectionSet,
  subSelection,
  skipLimit,
  commaIfTail,
  tailParams,
  fieldType,
  variableName,
  fieldsForTranslation,
  schemaType,
  innerSchemaType,
  nestedVariable,
  filterParams,
  neo4jTypeArgs,
  resolveInfo,
  selectionFilters,
  paramIndex,
  fieldArgs,
  cypherParams
}) => {
  let translation = '';
  if (innerSchemaTypeRelation.from === innerSchemaTypeRelation.to) {
    translation = `${initial}${fieldName}: {${subSelection[0]}}${skipLimit} ${commaIfTail}`;
  } else {
    const relationshipVariableName = `${nestedVariable}_relation`;
    const neo4jTypeClauses = neo4jTypePredicateClauses(
      filterParams,
      relationshipVariableName,
      neo4jTypeArgs
    );
    const [filterPredicates, serializedFilterParam] = processFilterArgument({
      fieldArgs,
      parentSchemaType: schemaType,
      schemaType: innerSchemaType,
      variableName: relationshipVariableName,
      resolveInfo,
      params: selectionFilters,
      paramIndex,
      rootIsRelationType: true
    });
    const filterParamKey = `${tailParams.paramIndex}_filter`;
    const fieldArgumentParams = subSelection[1];
    const filterParam = fieldArgumentParams[filterParamKey];
    if (
      filterParam &&
      typeof serializedFilterParam[filterParamKey] !== 'undefined'
    ) {
      subSelection[1][filterParamKey] = serializedFilterParam[filterParamKey];
    }

    const allParams = innerFilterParams(filterParams, neo4jTypeArgs);
    const queryParams = paramsToString(
      _.filter(allParams, param => {
        const value =
          param.value.value !== undefined ? param.value.value : param.value;
        return !Array.isArray(value);
      })
    );

    const arrayPredicates = translateListArguments({
      schemaType: innerSchemaType,
      fieldArgs,
      filterParams,
      safeVariableName: safeVar(relationshipVariableName),
      resolveInfo
    });

    const [lhsOrdering, rhsOrdering] = translateNestedOrderingArgument({
      schemaType: innerSchemaType,
      selections: fieldsForTranslation,
      fieldSelectionSet,
      filterParams
    });

    const fromTypeName = innerSchemaTypeRelation.from;
    const toTypeName = innerSchemaTypeRelation.to;
    const schemaTypeName = schemaType.name;
    const isFromField = schemaTypeName === fromTypeName;
    const isToField = schemaTypeName === toTypeName;

    const incomingNodeTypeName = innerSchemaTypeRelation.from;
    const outgoingNodeTypeName = innerSchemaTypeRelation.to;
    const innerSchemaTypeFields = innerSchemaType.getFields();
    const selectsIncomingField = innerSchemaTypeFields[incomingNodeTypeName];
    const selectsOutgoingField = innerSchemaTypeFields[outgoingNodeTypeName];
    const nestedTypeLabels =
      selectsOutgoingField || isFromField
        ? [
            toTypeName,
            ...getAdditionalLabels(
              resolveInfo.schema.getType(toTypeName),
              cypherParams
            )
          ]
        : [
            fromTypeName,
            ...getAdditionalLabels(
              resolveInfo.schema.getType(fromTypeName),
              cypherParams
            )
          ];

    const whereClauses = [
      ...neo4jTypeClauses,
      ...filterPredicates,
      ...arrayPredicates
    ];
    translation = `${initial}${fieldName}: ${
      !isArrayType(fieldType) ? 'head(' : ''
    }${lhsOrdering}[(${safeVar(variableName)})${
      // if its fromField -- is this logically equivalent?
      selectsIncomingField || isToField ? '<' : ''
    }-[${safeVar(relationshipVariableName)}:${safeLabel(
      innerSchemaTypeRelation.name
    )}${queryParams}]-${
      selectsOutgoingField || isFromField ? '>' : ''
    }(:${safeLabel(nestedTypeLabels)}) ${
      whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')} ` : ''
    }| ${relationshipVariableName} {${subSelection[0]}}]${rhsOrdering}${
      !isArrayType(fieldType) ? ')' : ''
    }${skipLimit} ${commaIfTail}`;
  }

  tailParams.initial = translation;
  return [tailParams, subSelection];
};

export const nodeTypeFieldOnRelationType = ({
  initial,
  schemaType,
  fieldName,
  fieldType,
  variableName,
  nestedVariable,
  subSelection,
  skipLimit,
  commaIfTail,
  tailParams,
  filterParams,
  neo4jTypeArgs,
  schemaTypeRelation,
  innerSchemaType,
  fieldSelectionSet,
  fieldsForTranslation,
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
}) => {
  if (isRelationshipMutationOutputType({ schemaType })) {
    const fromArgName = parentSelectionInfo.fromArgName;
    const toArgName = parentSelectionInfo.toArgName;
    const nodeFieldVariableName = decideRootRelationshipTypeNodeVariable({
      parentSelectionInfo,
      fieldName,
      fromArgName,
      toArgName
    });
    const [mapProjection, labelPredicate] = buildMapProjection({
      schemaType: innerSchemaType,
      isObjectType: isObjectTypeField,
      isInterfaceType: isInterfaceTypeField,
      isUnionType: isUnionTypeField,
      safeVariableName: nodeFieldVariableName,
      subQuery: subSelection[0],
      usesFragments,
      schemaTypeFields,
      derivedTypeMap,
      resolveInfo
    });
    const translationParams = relationTypeMutationPayloadField({
      initial,
      fieldName,
      mapProjection,
      skipLimit,
      commaIfTail,
      tailParams
    });
    return [translationParams, subSelection];
  }
  // Normal case of schemaType with a relationship directive
  return directedNodeTypeFieldOnRelationType({
    initial,
    schemaType,
    fieldName,
    fieldType,
    variableName,
    nestedVariable,
    subSelection,
    skipLimit,
    commaIfTail,
    tailParams,
    schemaTypeRelation,
    innerSchemaType,
    fieldSelectionSet,
    fieldsForTranslation,
    usesFragments,
    isObjectTypeField,
    isInterfaceTypeField,
    isUnionTypeField,
    filterParams,
    neo4jTypeArgs,
    paramIndex,
    resolveInfo,
    selectionFilters,
    schemaTypeFields,
    derivedTypeMap,
    fieldArgs,
    cypherParams,
    parentSelectionInfo
  });
};

const decideRootRelationshipTypeNodeVariable = ({
  parentSelectionInfo = {},
  fieldName = '',
  fromArgName = '',
  toArgName = ''
}) => {
  const fromVariable =
    parentSelectionInfo.from || parentSelectionInfo[fromArgName];
  const toVariable = parentSelectionInfo.to || parentSelectionInfo[toArgName];
  // assume incoming
  let variableName = safeVar(fromVariable);
  // else set as outgoing
  if (fieldName === 'to' || fieldName === toArgName)
    variableName = safeVar(toVariable);
  return variableName;
};

const relationTypeMutationPayloadField = ({
  initial,
  fieldName,
  mapProjection,
  skipLimit,
  commaIfTail,
  tailParams
}) => {
  const translation = `${initial}${fieldName}: ${mapProjection}${skipLimit} ${commaIfTail}`;
  return {
    initial: translation,
    ...tailParams
  };
};

const directedNodeTypeFieldOnRelationType = ({
  initial,
  schemaType,
  fieldName,
  fieldType,
  variableName,
  nestedVariable,
  subSelection,
  skipLimit,
  commaIfTail,
  tailParams,
  schemaTypeRelation,
  innerSchemaType,
  fieldSelectionSet,
  fieldsForTranslation,
  usesFragments,
  isObjectTypeField,
  isInterfaceTypeField,
  isUnionTypeField,
  filterParams,
  neo4jTypeArgs,
  paramIndex,
  resolveInfo,
  selectionFilters,
  schemaTypeFields,
  derivedTypeMap,
  fieldArgs,
  cypherParams,
  parentSelectionInfo
}) => {
  const relType = schemaTypeRelation.name;
  const fromTypeName = schemaTypeRelation.from;
  const toTypeName = schemaTypeRelation.to;
  const parentSchemaTypeName = parentSelectionInfo.schemaType.name;
  const innerSchemaTypeName = innerSchemaType.name;
  let isFromField =
    innerSchemaTypeName === fromTypeName || fieldName === 'from';
  let isToField = innerSchemaTypeName === toTypeName || fieldName === 'to';
  const safeVariableName = nestedVariable;
  const [mapProjection, labelPredicate] = buildMapProjection({
    schemaType: innerSchemaType,
    isObjectType: isObjectTypeField,
    isInterfaceType: isInterfaceTypeField,
    isUnionType: isUnionTypeField,
    usesFragments,
    safeVariableName,
    subQuery: subSelection[0],
    schemaTypeFields,
    derivedTypeMap,
    resolveInfo
  });
  const allParams = innerFilterParams(filterParams, neo4jTypeArgs);
  const queryParams = paramsToString(
    _.filter(allParams, param => {
      const value =
        param.value.value !== undefined ? param.value.value : param.value;
      return !Array.isArray(value);
    })
  );
  // Since the translations are significantly different,
  // we first check whether the relationship is reflexive
  if (fromTypeName === toTypeName) {
    const relationshipVariableName = `${variableName}_${
      isFromField ? 'from' : 'to'
    }_relation`;
    if (isReflexiveRelationshipOutputType({ schemaType })) {
      isFromField = schemaType.astNode.fields[0].name.value === fieldName;
      isToField = schemaType.astNode.fields[1].name.value === fieldName;
      const temporalFieldRelationshipVariableName = `${nestedVariable}_relation`;
      const neo4jTypeClauses = neo4jTypePredicateClauses(
        filterParams,
        temporalFieldRelationshipVariableName,
        neo4jTypeArgs
      );
      const [filterPredicates, serializedFilterParam] = processFilterArgument({
        fieldArgs,
        schemaType: innerSchemaType,
        variableName: relationshipVariableName,
        resolveInfo,
        params: selectionFilters,
        paramIndex,
        rootIsRelationType: true
      });
      const filterParamKey = `${tailParams.paramIndex}_filter`;
      const fieldArgumentParams = subSelection[1];
      const filterParam = fieldArgumentParams[filterParamKey];

      if (
        filterParam &&
        typeof serializedFilterParam[filterParamKey] !== 'undefined'
      ) {
        subSelection[1][filterParamKey] = serializedFilterParam[filterParamKey];
      }

      const arrayPredicates = translateListArguments({
        schemaType: innerSchemaType,
        fieldArgs,
        filterParams,
        safeVariableName: safeVar(relationshipVariableName),
        resolveInfo
      });

      const [lhsOrdering, rhsOrdering] = translateNestedOrderingArgument({
        schemaType: innerSchemaType,
        selections: fieldsForTranslation,
        fieldSelectionSet,
        filterParams
      });

      const whereClauses = [
        ...neo4jTypeClauses,
        ...filterPredicates,
        ...arrayPredicates
      ];

      tailParams.initial = `${initial}${fieldName}: ${
        !isArrayType(fieldType) ? 'head(' : ''
      }${lhsOrdering}[(${safeVar(variableName)})${
        isFromField ? '<' : ''
      }-[${safeVar(relationshipVariableName)}:${safeLabel(
        relType
      )}${queryParams}]-${isToField ? '>' : ''}(${safeVar(
        nestedVariable
      )}:${safeLabel([
        parentSchemaTypeName,
        ...getAdditionalLabels(
          resolveInfo.schema.getType(parentSchemaTypeName),
          cypherParams
        )
      ])}) ${
        whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')} ` : ''
      }| ${relationshipVariableName} {${subSelection[0]}}]${rhsOrdering}${
        !isArrayType(fieldType) ? ')' : ''
      }${skipLimit} ${commaIfTail}`;
      return [tailParams, subSelection];
    } else {
      // Case of a renamed directed field
      // e.g., 'from: Movie' -> 'Movie: Movie'
      tailParams.initial = `${initial}${fieldName}: ${mapProjection}${skipLimit} ${commaIfTail}`;
      return [tailParams, subSelection];
    }
  } else {
    let whereClauses = [labelPredicate].filter(predicate => !!predicate);
    const safeRelationshipVar = safeVar(`${variableName}_relation`);
    tailParams.initial = `${initial}${fieldName}: ${
      !isArrayType(fieldType) ? 'head(' : ''
    }[(:${safeLabel(
      isFromField
        ? [
            toTypeName,
            ...getAdditionalLabels(
              resolveInfo.schema.getType(toTypeName),
              cypherParams
            )
          ]
        : [
            fromTypeName,
            ...getAdditionalLabels(
              resolveInfo.schema.getType(fromTypeName),
              cypherParams
            )
          ]
    )})${
      isUnionTypeField
        ? `--`
        : `${isFromField ? '<' : ''}-[${safeRelationshipVar}]-${
            isToField ? '>' : ''
          }`
    }(${safeVar(nestedVariable)}:${safeLabel([
      innerSchemaType.name,
      ...getAdditionalLabels(
        resolveInfo.schema.getType(innerSchemaType.name),
        cypherParams
      )
    ])}${queryParams})${
      whereClauses.length > 0 ? ` WHERE ${whereClauses.join(' AND ')}` : ''
    } | ${mapProjection}]${
      !isArrayType(fieldType) ? ')' : ''
    }${skipLimit} ${commaIfTail}`;
    return [tailParams, subSelection];
  }
};

export const neo4jTypeField = ({
  initial,
  fieldName,
  commaIfTail,
  tailParams,
  parentSelectionInfo,
  secondParentSelectionInfo
}) => {
  const parentFieldName = parentSelectionInfo.fieldName;
  const parentFieldType = parentSelectionInfo.fieldType;
  const parentSchemaType = parentSelectionInfo.schemaType;
  const parentVariableName = parentSelectionInfo.variableName;
  const secondParentVariableName = secondParentSelectionInfo.variableName;
  // Initially assume that the parent type of the temporal type
  // containing this temporal field was a node
  let variableName = parentVariableName;
  let fieldIsArray = isArrayType(parentFieldType);
  if (parentSchemaType && !isNodeType(parentSchemaType.astNode)) {
    // initial assumption wrong, build appropriate relationship variable
    if (isRelationshipMutationOutputType({ schemaType: parentSchemaType })) {
      // If the second parent selection scope above is the root
      // then we need to use the root variableName
      variableName = `${secondParentVariableName}_relation`;
    } else if (isRelationTypePayload(parentSchemaType)) {
      const parentSchemaTypeRelation = getRelationTypeDirective(
        parentSchemaType.astNode
      );
      if (parentSchemaTypeRelation.from === parentSchemaTypeRelation.to) {
        variableName = `${variableName}_relation`;
      } else {
        variableName = `${variableName}_relation`;
      }
    }
  }
  return {
    initial: `${initial} ${fieldName}: ${
      fieldIsArray
        ? `${
            fieldName === 'formatted'
              ? `toString(INSTANCE)`
              : `INSTANCE.${fieldName}`
          } ${commaIfTail}`
        : `${
            fieldName === 'formatted'
              ? `toString(${safeVar(
                  variableName
                )}.${parentFieldName}) ${commaIfTail}`
              : `${safeVar(
                  variableName
                )}.${parentFieldName}.${fieldName} ${commaIfTail}`
          }`
    }`,
    ...tailParams
  };
};

export const neo4jType = ({
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
}) => {
  const parentVariableName = parentSelectionInfo.variableName;
  const parentFilterParams = parentSelectionInfo.filterParams;
  const parentSchemaType = parentSelectionInfo.schemaType;
  const relationshipVariableSuffix = `relation`;
  let fieldIsArray = isArrayType(fieldType);
  const isOrderedForNodeType = temporalOrderingFieldExists(
    parentSchemaType,
    parentFilterParams
  );
  const isOrderedForRelationshipType = temporalOrderingFieldExists(
    schemaType,
    parentFilterParams
  );
  if (!isNodeType(schemaType.astNode)) {
    if (
      isRelationTypePayload(schemaType) &&
      schemaTypeRelation.from === schemaTypeRelation.to
    ) {
      variableName = `${nestedVariable}_${relationshipVariableSuffix}`;
    } else {
      if (fieldIsArray) {
        if (isRelationshipMutationOutputType({ schemaType })) {
          variableName = `${parentVariableName}_${relationshipVariableSuffix}`;
        } else {
          variableName = `${variableName}_${relationshipVariableSuffix}`;
        }
      } else {
        if (isOrderedForRelationshipType) {
          variableName = `${variableName}_${relationshipVariableSuffix}`;
        } else {
          variableName = `${nestedVariable}_${relationshipVariableSuffix}`;
        }
      }
    }
  }
  const safeVariableName = safeVar(variableName);
  const usesTemporalOrdering =
    isOrderedForNodeType || isOrderedForRelationshipType;
  return {
    initial: `${initial}${fieldName}: ${
      fieldIsArray
        ? `reduce(a = [], INSTANCE IN ${variableName}.${fieldName} | a + {${subSelection[0]}})${commaIfTail}`
        : usesTemporalOrdering
        ? `${safeVariableName}.${fieldName}${commaIfTail}`
        : `{${subSelection[0]}}${commaIfTail}`
    }`,
    ...tailParams
  };
};

// Query API root operation branch
export const translateQuery = ({
  resolveInfo,
  context,
  first,
  offset,
  _id,
  orderBy,
  otherParams
}) => {
  const { typeName, variableName } = typeIdentifiers(resolveInfo.returnType);
  const schemaType = resolveInfo.schema.getType(typeName);
  const typeMap = resolveInfo.schema.getTypeMap();
  const selections = getPayloadSelections(resolveInfo);
  const isInterfaceType = isGraphqlInterfaceType(schemaType);
  const isUnionType = isGraphqlUnionType(schemaType);
  const isObjectType = isGraphqlObjectType(schemaType);
  let [nullParams, nonNullParams] = filterNullParams({
    offset,
    first,
    otherParams
  });

  // Check is this is a federated operation, in which case get the lookup keys
  const operation = resolveInfo.operation || {};
  // check if the operation name is the name used for generated queries
  const isFederatedOperation =
    operation.name && operation.name.value === NEO4j_GRAPHQL_SERVICE;
  const queryTypeCypherDirective = getQueryCypherDirective(
    resolveInfo,
    isFederatedOperation
  );
  let scalarKeys = {};
  let compoundKeys = {};
  let requiredData = {};
  if (isFederatedOperation) {
    const operationData = getFederatedOperationData({ context });
    scalarKeys = operationData.scalarKeys;
    compoundKeys = operationData.compoundKeys;
    requiredData = operationData.requiredData;
    if (queryTypeCypherDirective) {
      // all nonnull keys become available as cypher variables
      nonNullParams = {
        ...scalarKeys,
        ...compoundKeys,
        ...requiredData
      };
    } else {
      // all scalar keys get used as field arguments, while relationship
      // field keys being translated as a filter argument
      nonNullParams = {
        ...scalarKeys
      };
    }
  }

  let filterParams = getFilterParams(nonNullParams);
  const queryArgs = getQueryArguments(resolveInfo, isFederatedOperation);
  const neo4jTypeArgs = getNeo4jTypeArguments(queryArgs);
  const cypherParams = getCypherParams(context);
  const queryParams = paramsToString(
    innerFilterParams(
      filterParams,
      neo4jTypeArgs,
      null,
      queryTypeCypherDirective ? true : false
    ),
    cypherParams
  );
  const safeVariableName = safeVar(variableName);
  const neo4jTypeClauses = neo4jTypePredicateClauses(
    filterParams,
    safeVariableName,
    neo4jTypeArgs
  );
  const outerSkipLimit = getOuterSkipLimit(first, offset);
  const orderByValue = computeOrderBy(resolveInfo, schemaType);

  let usesFragments = isFragmentedSelection({ selections });
  const isFragmentedInterfaceType = usesFragments && isInterfaceType;
  const isFragmentedObjectType = usesFragments && isObjectType;
  const [schemaTypeFields, derivedTypeMap] = mergeSelectionFragments({
    schemaType,
    selections,
    isFragmentedObjectType,
    isFragmentedInterfaceType,
    isUnionType,
    typeMap,
    resolveInfo
  });

  const hasOnlySchemaTypeFragments =
    schemaTypeFields.length > 0 && Object.keys(derivedTypeMap).length === 0;
  if (hasOnlySchemaTypeFragments) {
    usesFragments = false;
  }

  let translation = ``;
  let translationParams = {};
  if (queryTypeCypherDirective) {
    [translation, translationParams] = customQuery({
      resolveInfo,
      cypherParams,
      schemaType,
      argString: queryParams,
      selections,
      variableName,
      safeVariableName,
      isObjectType,
      isInterfaceType,
      isUnionType,
      isFragmentedInterfaceType,
      usesFragments,
      schemaTypeFields,
      derivedTypeMap,
      orderByValue,
      outerSkipLimit,
      queryTypeCypherDirective,
      nonNullParams
    });
  } else {
    const additionalLabels = getAdditionalLabels(schemaType, cypherParams);
    if (isFederatedOperation) {
      nonNullParams = setCompoundKeyFilter({
        params: nonNullParams,
        compoundKeys
      });
      nonNullParams = {
        ...nonNullParams,
        ...otherParams,
        ...requiredData
      };
    }
    [translation, translationParams] = nodeQuery({
      resolveInfo,
      isFederatedOperation,
      context,
      cypherParams,
      schemaType,
      argString: queryParams,
      selections,
      variableName,
      typeName,
      isObjectType,
      isInterfaceType,
      isUnionType,
      isFragmentedInterfaceType,
      isFragmentedObjectType,
      usesFragments,
      schemaTypeFields,
      derivedTypeMap,
      additionalLabels,
      neo4jTypeClauses,
      orderByValue,
      outerSkipLimit,
      nullParams,
      nonNullParams,
      filterParams,
      neo4jTypeArgs,
      _id
    });
  }
  return [translation, translationParams];
};

const buildTypeCompositionPredicate = ({
  schemaType,
  schemaTypeFields,
  listVariable = 'x',
  derivedTypeMap,
  safeVariableName,
  isInterfaceType,
  isUnionType,
  isComputedQuery,
  isComputedMutation,
  isComputedField,
  usesFragments,
  resolveInfo
}) => {
  const schemaTypeName = schemaType.name;
  const isFragmentedInterfaceType = usesFragments && isInterfaceType;
  let labelPredicate = '';
  if (isFragmentedInterfaceType || isUnionType) {
    let derivedTypes = [];
    // If shared fields are selected then the translation builds
    // a type specific list comprehension for each interface implementing
    // type. Because of this, the type selecting predicate applied to
    // the interface type path pattern should allow for all possible
    // implementing types
    if (schemaTypeFields.length) {
      derivedTypes = getDerivedTypes({
        schemaTypeName,
        derivedTypeMap,
        isUnionType,
        isFragmentedInterfaceType,
        resolveInfo
      });
    } else if (isUnionType) {
      derivedTypes = getUnionDerivedTypes({
        derivedTypeMap,
        resolveInfo
      });
    } else {
      // Otherwise, use only those types provided in fragments
      derivedTypes = Object.keys(derivedTypeMap);
    }
    const typeSelectionPredicates = derivedTypes.map(selectedType => {
      return `"${selectedType}" IN labels(${safeVariableName})`;
    });
    if (typeSelectionPredicates.length) {
      labelPredicate = `(${typeSelectionPredicates.join(' OR ')})`;
    }
  }
  if (labelPredicate) {
    if (isComputedQuery) {
      labelPredicate = `WITH [${safeVariableName} IN ${listVariable} WHERE ${labelPredicate} | ${safeVariableName}] AS ${listVariable} `;
    } else if (isComputedMutation) {
      labelPredicate = `UNWIND [${safeVariableName} IN ${listVariable} WHERE ${labelPredicate} | ${safeVariableName}] `;
    } else if (isComputedField) {
      labelPredicate = `WHERE ${labelPredicate} `;
    }
  }
  return labelPredicate;
};

export const getCypherParams = context => {
  return context &&
    context.cypherParams &&
    context.cypherParams instanceof Object &&
    Object.keys(context.cypherParams).length > 0
    ? context.cypherParams
    : undefined;
};

// Custom read operation
const customQuery = ({
  resolveInfo,
  cypherParams,
  schemaType,
  argString,
  selections,
  variableName,
  isObjectType,
  isInterfaceType,
  isUnionType,
  usesFragments,
  schemaTypeFields,
  derivedTypeMap,
  orderByValue,
  outerSkipLimit,
  queryTypeCypherDirective,
  nonNullParams
}) => {
  const safeVariableName = safeVar(variableName);
  const [subQuery, subParams] = buildCypherSelection({
    cypherParams,
    selections,
    variableName,
    schemaType,
    resolveInfo
  });
  const params = { ...nonNullParams, ...subParams };
  if (cypherParams) {
    params['cypherParams'] = cypherParams;
  }
  // QueryType with a @cypher directive
  const cypherQueryArg = queryTypeCypherDirective.arguments.find(x => {
    return x.name.value === 'statement';
  });
  const isScalarType = isGraphqlScalarType(schemaType);
  const isNeo4jTypeOutput = isNeo4jType(schemaType.name);
  const { cypherPart: orderByClause } = orderByValue;
  // Don't add subQuery for scalar type payloads
  const isScalarPayload = isNeo4jTypeOutput || isScalarType;
  const fragmentTypeParams = derivedTypesParams({
    isInterfaceType,
    isUnionType,
    schema: resolveInfo.schema,
    schemaTypeName: schemaType.name,
    usesFragments
  });

  let [mapProjection, labelPredicate] = buildMapProjection({
    isComputedQuery: true,
    schemaType,
    schemaTypeFields,
    derivedTypeMap,
    isObjectType,
    isInterfaceType,
    isUnionType,
    isScalarPayload,
    usesFragments,
    safeVariableName,
    subQuery,
    resolveInfo
  });

  const query = `WITH apoc.cypher.runFirstColumn("${
    cypherQueryArg.value.value
  }", ${argString ||
    'null'}, True) AS x ${labelPredicate}UNWIND x AS ${safeVariableName} RETURN ${
    isScalarPayload
      ? `${mapProjection} `
      : `${mapProjection} AS ${safeVariableName}${orderByClause}`
  }${outerSkipLimit}`;

  return [query, { ...params, ...fragmentTypeParams }];
};

// Generated API
const nodeQuery = ({
  resolveInfo,
  isFederatedOperation,
  context,
  cypherParams,
  schemaType,
  selections,
  variableName,
  typeName,
  isObjectType,
  isInterfaceType,
  isUnionType,
  usesFragments,
  schemaTypeFields,
  derivedTypeMap,
  additionalLabels = [],
  neo4jTypeClauses,
  orderByValue,
  outerSkipLimit,
  nullParams,
  nonNullParams,
  filterParams,
  neo4jTypeArgs,
  _id
}) => {
  const safeVariableName = safeVar(variableName);
  const safeLabelName = safeLabel([typeName, ...additionalLabels]);
  const rootParamIndex = 1;
  const [subQuery, subParams] = buildCypherSelection({
    cypherParams,
    selections,
    variableName,
    schemaType,
    resolveInfo,
    paramIndex: rootParamIndex,
    isFederatedOperation,
    context
  });
  const [mapProjection, labelPredicate] = buildMapProjection({
    schemaType,
    schemaTypeFields,
    derivedTypeMap,
    isObjectType,
    isInterfaceType,
    isUnionType,
    usesFragments,
    safeVariableName,
    subQuery,
    resolveInfo
  });

  const fieldArgs = getQueryArguments(resolveInfo, isFederatedOperation);
  const [filterPredicates, serializedFilter] = processFilterArgument({
    fieldArgs,
    isFederatedOperation,
    schemaType,
    variableName,
    resolveInfo,
    params: nonNullParams,
    paramIndex: rootParamIndex
  });

  let params = { ...serializedFilter, ...subParams };

  if (cypherParams) {
    params['cypherParams'] = cypherParams;
  }

  const args = innerFilterParams(filterParams, neo4jTypeArgs);
  const argString = paramsToString(
    _.filter(args, arg => !Array.isArray(arg.value))
  );

  const idWherePredicate =
    typeof _id !== 'undefined' ? `ID(${safeVariableName})=${_id}` : '';
  const nullFieldPredicates = Object.keys(nullParams).map(
    key => `${variableName}.${key} IS NULL`
  );

  const arrayPredicates = translateListArguments({
    schemaType,
    fieldArgs,
    filterParams,
    safeVariableName,
    resolveInfo
  });

  const fragmentTypeParams = derivedTypesParams({
    isInterfaceType,
    isUnionType,
    schema: resolveInfo.schema,
    schemaTypeName: schemaType.name,
    usesFragments
  });

  let fullTextSearchStatement = '';
  let fullTextScorePredicate = '';
  const searchArg = fieldArgs.find(
    arg => arg.name.value === SearchArgument.SEARCH
  );
  const searchValue = params[SearchArgument.SEARCH];
  if (searchArg && searchValue) {
    const scoreThreshold = searchValue['threshold'];
    const searchIndexes = Object.keys(searchValue).filter(
      key => key !== 'threshold'
    );
    if (searchIndexes.length === 0) {
      throw new ApolloError(
        `At least one argument for a search index must be provided.`
      );
    } else if (searchIndexes.length > 1) {
      throw new ApolloError(
        `Only one argument for a search index can be provided.`
      );
    }
    const searchIndexName = searchIndexes[0];
    const searchArgValue = searchValue[searchIndexName];
    fullTextSearchStatement = `CALL db.index.fulltext.queryNodes("${searchIndexName}", "${searchArgValue}") YIELD node AS ${safeVariableName}`;
    if (scoreThreshold) {
      fullTextSearchStatement = `${fullTextSearchStatement}, score`;
      // threshold argument used as statistical floor to filter over results from single search index argument
      fullTextScorePredicate = `score >= ${scoreThreshold}`;
    }
  }

  const predicateClauses = [
    fullTextScorePredicate,
    idWherePredicate,
    labelPredicate,
    ...filterPredicates,
    ...nullFieldPredicates,
    ...neo4jTypeClauses,
    ...arrayPredicates
  ]
    .filter(predicate => !!predicate)
    .join(' AND ');

  const predicate = predicateClauses ? `WHERE ${predicateClauses} ` : '';
  const { optimization, cypherPart: orderByClause } = orderByValue;

  let query = `${
    fullTextSearchStatement
      ? `${fullTextSearchStatement} `
      : `MATCH (${safeVariableName}:${safeLabelName}${
          argString ? ` ${argString}` : ''
        })`
  } ${predicate}${
    optimization.earlyOrderBy ? `WITH ${safeVariableName}${orderByClause}` : ''
  }RETURN ${mapProjection} AS ${safeVariableName}${
    optimization.earlyOrderBy ? '' : orderByClause
  }${outerSkipLimit}`;

  return [query, { ...params, ...fragmentTypeParams }];
};

export const buildMapProjection = ({
  schemaType,
  schemaTypeFields,
  listVariable,
  derivedTypeMap,
  isObjectType,
  isInterfaceType,
  isUnionType,
  isScalarPayload,
  isComputedQuery,
  isComputedMutation,
  isComputedField,
  usesFragments,
  safeVariableName,
  subQuery,
  resolveInfo
}) => {
  const labelPredicate = buildTypeCompositionPredicate({
    schemaType,
    schemaTypeFields,
    listVariable,
    derivedTypeMap,
    safeVariableName,
    isInterfaceType,
    isUnionType,
    isComputedQuery,
    isComputedMutation,
    isComputedField,
    usesFragments,
    resolveInfo
  });
  const isFragmentedInterfaceType = usesFragments && isInterfaceType;
  const isFragmentedUnionType = usesFragments && isUnionType;
  let mapProjection = '';
  if (isScalarPayload) {
    // A scalar type payload has no map projection
    mapProjection = safeVariableName;
  } else if (isObjectType) {
    mapProjection = `${safeVariableName} {${subQuery}}`;
  } else if (isFragmentedInterfaceType || isFragmentedUnionType) {
    // An interface type possibly uses fragments and a
    // union type necessarily uses fragments
    mapProjection = subQuery;
  } else if (isInterfaceType || isUnionType) {
    // If no fragments are used, then this is an interface type
    // with only interface fields selected
    mapProjection = `${safeVariableName} {${fragmentType(
      safeVariableName,
      schemaType.name
    )}${subQuery ? `,${subQuery}` : ''}}`;
  }
  return [mapProjection, labelPredicate];
};

const translateNestedOrderingArgument = ({
  schemaType,
  selections,
  fieldSelectionSet,
  filterParams
}) => {
  const orderByParam = filterParams['orderBy'];
  const usesTemporalOrdering = temporalOrderingFieldExists(
    schemaType,
    filterParams
  );
  const selectedFieldNames = fieldSelectionSet.reduce((fieldNames, field) => {
    if (field.name) fieldNames.push(field.name.value);
    return fieldNames;
  }, []);
  let neo4jTypeFieldSelections = '';
  if (usesTemporalOrdering) {
    neo4jTypeFieldSelections = selections
      .reduce((temporalTypeFields, innerSelection) => {
        // name of temporal type field
        const fieldName = innerSelection.name.value;
        const fieldTypeName = getFieldTypeName(schemaType, fieldName);
        const fieldIsSelected = selectedFieldNames.some(
          name => name === fieldName
        );
        const isTemporalTypeField = isTemporalType(fieldTypeName);
        if (isTemporalTypeField && fieldIsSelected) {
          const innerSelectedTypes = innerSelection.selectionSet
            ? innerSelection.selectionSet.selections
            : [];
          temporalTypeFields.push(
            `${fieldName}: {${innerSelectedTypes
              .reduce((temporalSubFields, t) => {
                // temporal type subfields, year, minute, etc.
                const subFieldName = t.name.value;
                if (subFieldName === 'formatted') {
                  temporalSubFields.push(
                    `${subFieldName}: toString(sortedElement.${fieldName})`
                  );
                } else {
                  temporalSubFields.push(
                    `${subFieldName}: sortedElement.${fieldName}.${subFieldName}`
                  );
                }
                return temporalSubFields;
              }, [])
              .join(',')}}`
          );
        }
        return temporalTypeFields;
      }, [])
      .join(',');
  }
  const lhsOrdering = orderByParam
    ? usesTemporalOrdering
      ? `[sortedElement IN apoc.coll.sortMulti(`
      : `apoc.coll.sortMulti(`
    : '';
  const rhsOrdering = orderByParam
    ? `, [${buildSortMultiArgs(orderByParam)}])${
        usesTemporalOrdering
          ? ` | sortedElement { .* ${
              neo4jTypeFieldSelections ? `,  ${neo4jTypeFieldSelections}` : ''
            }}]`
          : ``
      }`
    : '';
  return [lhsOrdering, rhsOrdering];
};

const getFieldTypeName = (schemaType, fieldName) => {
  const field =
    schemaType && fieldName ? schemaType.getFields()[fieldName] : undefined;
  return field ? field.type.name : '';
};

const temporalOrderingFieldExists = (schemaType, filterParams) => {
  let orderByParam = filterParams ? filterParams['orderBy'] : undefined;
  if (orderByParam) {
    orderByParam = orderByParam.value;
    if (!Array.isArray(orderByParam)) orderByParam = [orderByParam];
    return orderByParam.find(e => {
      const fieldName = e.substring(0, e.lastIndexOf('_'));
      const fieldTypeName = getFieldTypeName(schemaType, fieldName);
      return isTemporalType(fieldTypeName);
    });
  }
  return undefined;
};

const buildSortMultiArgs = param => {
  let values = param ? param.value : [];
  let fieldName = '';
  if (!Array.isArray(values)) values = [values];
  return values
    .map(e => {
      fieldName = e.substring(0, e.lastIndexOf('_'));
      return e.includes('_asc') ? `'^${fieldName}'` : `'${fieldName}'`;
    })
    .join(',');
};

export const processFilterArgument = ({
  argumentName = 'filter',
  fieldArgs,
  isFederatedOperation,
  schemaType,
  variableName,
  resolveInfo,
  params,
  paramIndex,
  parentSchemaType,
  rootIsRelationType = false
}) => {
  const filterArg = fieldArgs.find(e => e.name.value === argumentName);
  const filterValue = Object.keys(params).length
    ? params[argumentName]
    : undefined;
  const filterParamKey =
    paramIndex > 1 ? `${paramIndex - 1}_${argumentName}` : argumentName;
  const filterCypherParam = `$${filterParamKey}`;
  let translations = [];
  // allows an exception for the existence of the filter argument AST
  // if isFederatedOperation
  if ((filterArg || isFederatedOperation) && filterValue) {
    // if field has both a filter argument and argument data is provided
    const schema = resolveInfo.schema;
    let serializedFilterParam = filterValue;
    let filterFieldMap = {};
    [filterFieldMap, serializedFilterParam] = analyzeFilterArguments({
      filterValue,
      variableName,
      filterCypherParam,
      schemaType,
      schema
    });
    translations = translateFilterArguments({
      filterValue,
      filterFieldMap,
      filterCypherParam,
      rootIsRelationType,
      variableName,
      schemaType,
      parentSchemaType,
      schema
    });
    params = {
      ...params,
      [filterParamKey]: serializedFilterParam
    };
  }
  return [translations, params];
};

const analyzeFilterArguments = ({
  filterValue,
  variableName,
  filterCypherParam,
  schemaType,
  schema
}) => {
  return Object.entries(filterValue).reduce(
    ([filterFieldMap, serializedParams], [name, value]) => {
      const filterParamName = serializeFilterFieldName(name, value);
      const [serializedValue, fieldMap] = analyzeFilterArgument({
        filterValue: value,
        filterValues: filterValue,
        fieldName: name,
        filterParam: filterCypherParam,
        variableName,
        schemaType,
        schema
      });
      filterFieldMap[filterParamName] = fieldMap;
      serializedParams[filterParamName] = serializedValue;
      return [filterFieldMap, serializedParams];
    },
    [{}, {}]
  );
};

const analyzeFilterArgument = ({
  parentFieldName,
  filterValue,
  fieldName,
  variableName,
  filterParam,
  parentSchemaType,
  schemaType,
  schema
}) => {
  const parsedFilterName = parseFilterArgumentName(fieldName);
  let filterOperationField = parsedFilterName.name;
  let filterOperationType = parsedFilterName.type;
  // defaults
  let filterMapValue = true;
  let serializedFilterParam = filterValue;
  let innerSchemaType = schemaType;
  let typeName = schemaType.name;
  if (filterOperationField !== 'OR' && filterOperationField !== 'AND') {
    const schemaTypeFields = schemaType.getFields();
    const filterField = schemaTypeFields[filterOperationField];
    const filterFieldAst = filterField.astNode;
    const filterType = filterFieldAst.type;
    const innerFieldType = unwrapNamedType({ type: filterType });
    typeName = innerFieldType.name;
    innerSchemaType = schema.getType(typeName);
  }
  if (isScalarType(innerSchemaType) || isEnumType(innerSchemaType)) {
    if (isExistentialFilter(filterOperationType, filterValue)) {
      serializedFilterParam = true;
      filterMapValue = null;
    }
  } else if (
    isObjectType(innerSchemaType) ||
    isInterfaceType(innerSchemaType)
  ) {
    if (fieldName === 'AND' || fieldName === 'OR') {
      // recursion
      [serializedFilterParam, filterMapValue] = analyzeNestedFilterArgument({
        filterValue,
        filterOperationType,
        parentFieldName: fieldName,
        parentSchemaType: schemaType,
        schemaType,
        variableName,
        filterParam,
        schema
      });
    } else {
      const schemaTypeField = schemaType.getFields()[filterOperationField];
      const innerSchemaType = innerType(schemaTypeField.type);
      const isObjectTypeFilter = isObjectType(innerSchemaType);
      const isInterfaceTypeFilter = isInterfaceType(innerSchemaType);
      if (isObjectTypeFilter || isInterfaceTypeFilter) {
        const [
          thisType,
          relatedType,
          relationLabel,
          relationDirection,
          isRelation,
          isRelationType,
          isRelationTypeNode,
          isReflexiveRelationType,
          isReflexiveTypeDirectedField
        ] = decideRelationFilterMetadata({
          fieldName,
          parentSchemaType,
          schemaType,
          variableName,
          innerSchemaType,
          filterOperationField
        });
        if (isReflexiveTypeDirectedField) {
          // for the 'from' and 'to' fields on the payload of a reflexive
          // relation type to use the parent field name, ex: 'knows_some'
          // is used for 'from' and 'to' in 'knows_some: { from: {}, to: {} }'
          const parsedFilterName = parseFilterArgumentName(parentFieldName);
          filterOperationField = parsedFilterName.name;
          filterOperationType = parsedFilterName.type;
        }
        if (isExistentialFilter(filterOperationType, filterValue)) {
          serializedFilterParam = true;
          filterMapValue = null;
        } else if (
          isTemporalType(typeName) ||
          isSpatialType(typeName) ||
          isSpatialDistanceInputType({
            filterOperationType
          })
        ) {
          [serializedFilterParam, filterMapValue] = analyzeNeo4jTypeFilter({
            typeName,
            filterOperationType,
            filterValue,
            parentFieldName
          });
        } else if (isRelation || isRelationType || isRelationTypeNode) {
          // recursion
          [serializedFilterParam, filterMapValue] = analyzeNestedFilterArgument(
            {
              filterValue,
              filterOperationType,
              isRelationType,
              parentFieldName: fieldName,
              parentSchemaType: schemaType,
              schemaType: innerSchemaType,
              variableName,
              filterParam,
              schema
            }
          );
        }
      }
    }
  }
  return [serializedFilterParam, filterMapValue];
};

const analyzeNeo4jTypeFilter = ({
  typeName,
  filterOperationType,
  filterValue,
  parentFieldName
}) => {
  let filterMapValue = {};
  const isListFilterArgument =
    filterOperationType === 'in' || filterOperationType === 'not_in';
  if (isListFilterArgument) {
    filterMapValue = filterValue.reduce((booleanMap, filter) => {
      Object.keys(filter).forEach(key => {
        booleanMap[key] = true;
      });
      return booleanMap;
    }, {});
  } else {
    filterMapValue = Object.keys(filterValue).reduce((booleanMap, key) => {
      booleanMap[key] = true;
      return booleanMap;
    }, {});
  }
  let serializedFilterParam = filterValue;
  if (
    !isSpatialDistanceInputType({ filterOperationType }) &&
    !isSpatialType(typeName)
  ) {
    serializedFilterParam = serializeNeo4jTypeParam({
      filterValue,
      filterOperationType,
      parentFieldName
    });
  }
  return [serializedFilterParam, filterMapValue];
};

const analyzeNestedFilterArgument = ({
  parentSchemaType,
  parentFieldName,
  schemaType,
  variableName,
  filterValue,
  filterParam,
  schema
}) => {
  const isList = Array.isArray(filterValue);
  // coersion to array for dynamic iteration of objects and arrays
  if (!isList) filterValue = [filterValue];
  let serializedFilterValue = [];
  let filterValueFieldMap = {};
  filterValue.forEach(filter => {
    let serializedValues = {};
    let serializedValue = {};
    let valueFieldMap = {};
    Object.entries(filter).forEach(([fieldName, value]) => {
      fieldName = deserializeFilterFieldName(fieldName);
      [serializedValue, valueFieldMap] = analyzeFilterArgument({
        parentFieldName,
        filterValue: value,
        filterValues: filter,
        fieldName,
        variableName,
        filterParam,
        parentSchemaType,
        schemaType,
        schema
      });
      const filterParamName = serializeFilterFieldName(fieldName, value);
      const filterMapEntry = filterValueFieldMap[filterParamName];
      if (!filterMapEntry) filterValueFieldMap[filterParamName] = valueFieldMap;
      // deep merges in order to capture differences in objects within nested array filters
      else
        filterValueFieldMap[filterParamName] = _.merge(
          filterMapEntry,
          valueFieldMap
        );
      serializedValues[filterParamName] = serializedValue;
    });
    serializedFilterValue.push(serializedValues);
  });
  // undo array coersion
  if (!isList) serializedFilterValue = serializedFilterValue[0];
  return [serializedFilterValue, filterValueFieldMap];
};

const serializeFilterFieldName = (name, value) => {
  if (value === null) {
    const parsedFilterName = parseFilterArgumentName(name);
    const filterOperationType = parsedFilterName.type;
    if (!filterOperationType || filterOperationType === 'not') {
      return `_${name}_null`;
    }
  }
  return name;
};

const serializeNeo4jTypeParam = ({
  filterValue,
  filterOperationType,
  parentFieldName
}) => {
  const isList = Array.isArray(filterValue);
  if (!isList) filterValue = [filterValue];
  let serializedValues = filterValue.reduce((serializedValues, filter) => {
    let serializedValue = {};
    if (
      filter['formatted'] &&
      parentFieldName !== 'OR' &&
      parentFieldName !== 'AND' &&
      filterOperationType !== 'in' &&
      filterOperationType !== 'not_in' &&
      !isList
    ) {
      serializedValue = filter['formatted'];
    } else {
      serializedValue = Object.entries(filter).reduce(
        (serialized, [key, value]) => {
          if (Number.isInteger(value)) {
            value = neo4j.int(value);
          }
          serialized[key] = value;
          return serialized;
        },
        {}
      );
    }
    serializedValues.push(serializedValue);
    return serializedValues;
  }, []);
  if (!isList) serializedValues = serializedValues[0];
  return serializedValues;
};

const deserializeFilterFieldName = name => {
  if (name.startsWith('_') && name.endsWith('_null')) {
    name = name.substring(1, name.length - 5);
  }
  return name;
};

const translateFilterArguments = ({
  filterValue,
  filterFieldMap,
  filterCypherParam,
  variableName,
  rootIsRelationType,
  schemaType,
  parentSchemaType,
  schema
}) => {
  return Object.entries(filterFieldMap).reduce(
    (translations, [name, value]) => {
      // the filter field map uses serialized field names to allow for both field: {} and field: null
      name = deserializeFilterFieldName(name);
      const translation = translateFilterArgument({
        filterParam: filterCypherParam,
        fieldName: name,
        filterValue: value,
        paramValue: filterValue,
        rootIsRelationType,
        variableName,
        schemaType,
        parentSchemaType,
        schema
      });
      if (translation) {
        translations.push(`(${translation})`);
      }
      return translations;
    },
    []
  );
};

const translateFilterArgument = ({
  parentParamPath,
  parentFieldName,
  isListFilterArgument = false,
  filterValue,
  paramValue,
  fieldName,
  rootIsRelationType,
  variableName,
  filterParam,
  schemaType,
  parentSchemaType,
  schema
}) => {
  // parse field name into prefix (ex: name, company) and
  // possible suffix identifying operation type (ex: _gt, _in)
  const parsedFilterName = parseFilterArgumentName(fieldName);
  const filterOperationField = parsedFilterName.name;
  const filterOperationType = parsedFilterName.type;
  let innerSchemaType = schemaType;
  let typeName = schemaType.name;
  let innerFieldType = {};
  let isListFieldFilter = false;
  if (filterOperationField !== 'OR' && filterOperationField !== 'AND') {
    const schemaTypeFields = schemaType.getFields();
    const filterField = schemaTypeFields[filterOperationField];
    const filterFieldAst = filterField.astNode;
    const filterType = filterFieldAst.type;
    innerFieldType = unwrapNamedType({ type: filterType });
    if (innerFieldType.wrappers[TypeWrappers.LIST_TYPE]) {
      isListFieldFilter = true;
    }
    typeName = innerFieldType.name;
    innerSchemaType = schema.getType(typeName);
  }
  // build path for parameter data for current filter field
  const parameterPath = `${
    parentParamPath ? parentParamPath : filterParam
  }.${fieldName}`;
  // short-circuit evaluation: predicate used to skip a field
  // if processing a list of objects that possibly contain different arguments
  const nullFieldPredicate = decideNullSkippingPredicate({
    parameterPath,
    isListFilterArgument,
    parentParamPath
  });
  let translation = '';
  if (isScalarType(innerSchemaType) || isEnumType(innerSchemaType)) {
    translation = translateScalarFilter({
      typeName,
      isListFilterArgument,
      isListFieldFilter,
      filterOperationField,
      filterOperationType,
      filterValue,
      paramValue,
      fieldName,
      variableName,
      parameterPath,
      parentParamPath,
      filterParam,
      nullFieldPredicate
    });
  } else if (
    isObjectType(innerSchemaType) ||
    isInterfaceType(innerSchemaType)
  ) {
    translation = translateInputFilter({
      rootIsRelationType,
      isListFilterArgument,
      isListFieldFilter,
      filterOperationField,
      filterOperationType,
      filterValue,
      paramValue,
      variableName,
      fieldName,
      filterParam,
      schema,
      parentSchemaType,
      schemaType,
      parameterPath,
      parentParamPath,
      parentFieldName,
      nullFieldPredicate
    });
  }
  return translation;
};

const parseFilterArgumentName = fieldName => {
  const fieldNameParts = fieldName.split('_');

  const filterTypes = [
    '_not',
    '_in',
    '_not_in',
    '_regexp',
    '_contains',
    '_not_contains',
    '_starts_with',
    '_not_starts_with',
    '_ends_with',
    '_not_ends_with',
    '_lt',
    '_lte',
    '_gt',
    '_gte',
    '_some',
    '_none',
    '_single',
    '_every',
    '_distance',
    '_distance_lt',
    '_distance_lte',
    '_distance_gt',
    '_distance_gte'
  ];

  let filterType = '';

  if (fieldNameParts.length > 1) {
    let regExp = [];

    _.each(filterTypes, f => {
      regExp.push(f + '$');
    });

    const regExpJoin = '(' + regExp.join('|') + ')';
    const preparedFieldAndFilterField = _.replace(
      fieldName,
      new RegExp(regExpJoin),
      '[::filterFieldSeperator::]$1'
    );
    const [parsedField, parsedFilterField] = preparedFieldAndFilterField.split(
      '[::filterFieldSeperator::]'
    );

    fieldName = !_.isUndefined(parsedField) ? parsedField : fieldName;
    filterType = !_.isUndefined(parsedFilterField)
      ? parsedFilterField.substr(1)
      : ''; // Strip off first underscore
  }

  return {
    name: fieldName,
    type: filterType
  };
};

const translateScalarFilter = ({
  typeName,
  isListFilterArgument,
  isListFieldFilter,
  filterOperationField,
  filterOperationType,
  filterValue,
  fieldName,
  paramValue,
  variableName,
  parameterPath,
  parentParamPath,
  filterParam,
  nullFieldPredicate
}) => {
  // build path to node/relationship property
  const propertyPath = `${safeVar(variableName)}.${filterOperationField}`;
  if (isExistentialFilter(filterOperationType, filterValue)) {
    return translateNullFilter({
      filterOperationField,
      filterOperationType,
      propertyPath,
      filterParam,
      parentParamPath,
      isListFilterArgument
    });
  }
  if (isListFieldFilter) {
    return translateListArgument({
      typeName,
      filterValue: paramValue[fieldName],
      filterOperationType,
      listVariable: propertyPath,
      paramPath: parameterPath
    });
  }
  return `${nullFieldPredicate}${buildOperatorExpression({
    filterOperationType,
    propertyPath
  })} ${parameterPath}`;
};

const isExistentialFilter = (type, value) =>
  (!type || type === 'not') && value === null;

const decideNullSkippingPredicate = ({
  parameterPath,
  isListFilterArgument,
  parentParamPath
}) =>
  isListFilterArgument && parentParamPath ? `${parameterPath} IS NULL OR ` : '';

const translateNullFilter = ({
  filterOperationField,
  filterOperationType,
  filterParam,
  propertyPath,
  parentParamPath,
  isListFilterArgument
}) => {
  const isNegationFilter = filterOperationType === 'not';
  // allign with modified parameter names for null filters
  const paramPath = `${
    parentParamPath ? parentParamPath : filterParam
  }._${filterOperationField}_${isNegationFilter ? `not_` : ''}null`;
  // build a predicate for checking the existence of a
  // property or relationship
  const predicate = `${paramPath} = TRUE AND${
    isNegationFilter ? '' : ' NOT'
  } EXISTS(${propertyPath})`;
  // skip the field if it is null in the case of it
  // existing within one of many objects in a list filter
  const nullFieldPredicate = decideNullSkippingPredicate({
    parameterPath: paramPath,
    isListFilterArgument,
    parentParamPath
  });
  return `${nullFieldPredicate}${predicate}`;
};

const buildOperatorExpression = ({
  filterOperationType,
  propertyPath,
  isListFilterArgument,
  parameterPath
}) => {
  if (isListFilterArgument) return `${propertyPath} =`;
  switch (filterOperationType) {
    case 'not':
      return `NOT ${propertyPath} = `;
    case 'in':
      return `${propertyPath} IN`;
    case 'not_in':
      return `NOT ${propertyPath} IN`;
    case 'regexp':
      return `${propertyPath} =~`;
    case 'contains':
      return `${propertyPath} CONTAINS`;
    case 'not_contains':
      return `NOT ${propertyPath} CONTAINS`;
    case 'starts_with':
      return `${propertyPath} STARTS WITH`;
    case 'not_starts_with':
      return `NOT ${propertyPath} STARTS WITH`;
    case 'ends_with':
      return `${propertyPath} ENDS WITH`;
    case 'not_ends_with':
      return `NOT ${propertyPath} ENDS WITH`;
    case 'distance':
      return `distance(${propertyPath}, point(${parameterPath}.point)) =`;
    case 'lt':
      return `${propertyPath} <`;
    case 'distance_lt':
      return `distance(${propertyPath}, point(${parameterPath}.point)) <`;
    case 'lte':
      return `${propertyPath} <=`;
    case 'distance_lte':
      return `distance(${propertyPath}, point(${parameterPath}.point)) <=`;
    case 'gt':
      return `${propertyPath} >`;
    case 'distance_gt':
      return `distance(${propertyPath}, point(${parameterPath}.point)) >`;
    case 'gte':
      return `${propertyPath} >=`;
    case 'distance_gte':
      return `distance(${propertyPath}, point(${parameterPath}.point)) >=`;
    default: {
      return `${propertyPath} =`;
    }
  }
};

const translateInputFilter = ({
  rootIsRelationType,
  isListFilterArgument,
  isListFieldFilter,
  filterOperationField,
  filterOperationType,
  filterValue,
  paramValue,
  variableName,
  fieldName,
  filterParam,
  schema,
  schemaType,
  parameterPath,
  nullFieldPredicate,
  parentSchemaType,
  parentParamPath,
  parentFieldName
}) => {
  if (fieldName === 'AND' || fieldName === 'OR') {
    return translateLogicalFilter({
      filterValue,
      variableName,
      filterOperationType,
      filterOperationField,
      fieldName,
      filterParam,
      schema,
      schemaType,
      parameterPath,
      nullFieldPredicate
    });
  } else {
    const schemaTypeField = schemaType.getFields()[filterOperationField];
    const innerSchemaType = innerType(schemaTypeField.type);
    const typeName = innerSchemaType.name;
    const isObjectTypeFilter = isObjectType(innerSchemaType);
    const isInterfaceTypeFilter = isInterfaceType(innerSchemaType);
    if (isObjectTypeFilter || isInterfaceTypeFilter) {
      const [
        thisType,
        relatedType,
        relationLabel,
        relationDirection,
        isRelation,
        isRelationType,
        isRelationTypeNode,
        isReflexiveRelationType,
        isReflexiveTypeDirectedField
      ] = decideRelationFilterMetadata({
        fieldName,
        parentSchemaType,
        schemaType,
        variableName,
        innerSchemaType,
        filterOperationField
      });
      if (
        isTemporalType(typeName) ||
        isSpatialType(typeName) ||
        isSpatialDistanceInputType({
          filterOperationType
        })
      ) {
        return translateNeo4jTypeFilter({
          typeName,
          isRelationTypeNode,
          filterValue,
          paramValue,
          variableName,
          filterOperationField,
          filterOperationType,
          fieldName,
          filterParam,
          parameterPath,
          parentParamPath,
          isListFilterArgument,
          isListFieldFilter,
          nullFieldPredicate
        });
      } else if (isRelation || isRelationType || isRelationTypeNode) {
        const filterTranslation = translateRelationFilter({
          rootIsRelationType,
          thisType,
          relatedType,
          relationLabel,
          relationDirection,
          isRelationType,
          isRelationTypeNode,
          isReflexiveRelationType,
          isReflexiveTypeDirectedField,
          filterValue,
          variableName,
          filterOperationField,
          filterOperationType,
          fieldName,
          filterParam,
          schema,
          schemaType,
          innerSchemaType,
          parameterPath,
          parentParamPath,
          isListFilterArgument,
          nullFieldPredicate,
          parentSchemaType,
          parentFieldName
        });
        return filterTranslation;
      }
    }
  }
};

const translateLogicalFilter = ({
  filterValue,
  variableName,
  filterOperationType,
  filterOperationField,
  fieldName,
  filterParam,
  schema,
  schemaType,
  parameterPath,
  nullFieldPredicate
}) => {
  const listElementVariable = `_${fieldName}`;
  // build predicate expressions for all unique arguments within filterValue
  // isListFilterArgument is true here so that nullFieldPredicate is used
  const predicates = buildFilterPredicates({
    filterOperationType,
    parentFieldName: fieldName,
    listVariable: listElementVariable,
    parentSchemaType: schemaType,
    isListFilterArgument: true,
    schemaType,
    variableName,
    filterValue,
    filterParam,
    // typeFields,
    schema
  });
  const predicateListVariable = parameterPath;
  // decide root predicate function
  const rootPredicateFunction = decidePredicateFunction({
    filterOperationField
  });
  // build root predicate expression
  const translation = buildPredicateFunction({
    nullFieldPredicate,
    predicateListVariable,
    rootPredicateFunction,
    predicates,
    listElementVariable
  });
  return translation;
};

const translateRelationFilter = ({
  rootIsRelationType,
  thisType,
  relatedType,
  relationLabel,
  relationDirection,
  isRelationType,
  isRelationTypeNode,
  isReflexiveRelationType,
  isReflexiveTypeDirectedField,
  filterValue,
  variableName,
  filterOperationField,
  filterOperationType,
  fieldName,
  filterParam,
  schema,
  schemaType,
  innerSchemaType,
  parameterPath,
  parentParamPath,
  isListFilterArgument,
  nullFieldPredicate,
  parentSchemaType,
  parentFieldName
}) => {
  if (isReflexiveTypeDirectedField) {
    // when at the 'from' or 'to' fields of a reflexive relation type payload
    // we need to use the name of the parent schema type, ex: 'person' for
    // Person.knows gets used here for reflexive path patterns, rather than
    // the normally set 'person_filter_person' variableName
    variableName = parentSchemaType.name.toLowerCase();
  }
  const pathExistencePredicate = buildRelationExistencePath(
    variableName,
    relationLabel,
    relationDirection,
    relatedType,
    isRelationTypeNode
  );
  if (isExistentialFilter(filterOperationType, filterValue)) {
    return translateNullFilter({
      filterOperationField,
      filterOperationType,
      propertyPath: pathExistencePredicate,
      filterParam,
      parentParamPath,
      isListFilterArgument
    });
  }
  let parentFilterOperationField = filterOperationField;
  let parentFilterOperationType = filterOperationType;
  if (isReflexiveTypeDirectedField) {
    // causes the 'from' and 'to' fields on the payload of a reflexive
    // relation type to use the parent field name, ex: 'knows_some'
    // is used for 'from' and 'to' in 'knows_some: { from: {}, to: {} }'
    const parsedFilterName = parseFilterArgumentName(parentFieldName);
    parentFilterOperationField = parsedFilterName.name;
    parentFilterOperationType = parsedFilterName.type;
  }
  // build a list comprehension containing path pattern for related type
  const predicateListVariable = buildRelatedTypeListComprehension({
    rootIsRelationType,
    variableName,
    thisType,
    relatedType,
    relationLabel,
    relationDirection,
    isRelationTypeNode,
    isRelationType
  });

  const rootPredicateFunction = decidePredicateFunction({
    isRelationTypeNode,
    filterOperationField: parentFilterOperationField,
    filterOperationType: parentFilterOperationType
  });

  return buildRelationPredicate({
    rootIsRelationType,
    parentFieldName,
    isRelationType,
    isListFilterArgument,
    isReflexiveRelationType,
    isReflexiveTypeDirectedField,
    thisType,
    relatedType,
    schemaType,
    innerSchemaType,
    fieldName,
    filterOperationType,
    filterValue,
    filterParam,
    schema,
    parameterPath,
    nullFieldPredicate,
    pathExistencePredicate,
    predicateListVariable,
    rootPredicateFunction
  });
};

const decideRelationFilterMetadata = ({
  fieldName,
  parentSchemaType,
  schemaType,
  variableName,
  innerSchemaType,
  filterOperationField
}) => {
  let thisType = '';
  let relatedType = '';
  let isRelation = false;
  let isRelationType = false;
  let isRelationTypeNode = false;
  let isReflexiveRelationType = false;
  let isReflexiveTypeDirectedField = false;
  // @relation field directive
  let { name: relLabel, direction: relDirection } = relationDirective(
    schemaType,
    filterOperationField
  );
  // @relation type directive on node type field
  const innerRelationTypeDirective = getRelationTypeDirective(
    innerSchemaType.astNode
  );
  // @relation type directive on this type; node type field on relation type
  // If there is no @relation directive on the schemaType, check the parentSchemaType
  // for the same directive obtained above when the relation type is first seen
  const relationTypeDirective = getRelationTypeDirective(schemaType.astNode);
  if (relLabel && relDirection) {
    isRelation = true;
    const typeVariables = typeIdentifiers(innerSchemaType);
    thisType = schemaType.name;
    relatedType = typeVariables.typeName;
  } else if (innerRelationTypeDirective) {
    isRelationType = true;
    thisType = innerRelationTypeDirective.from;
    relatedType = innerRelationTypeDirective.to;
    relLabel = innerRelationTypeDirective.name;
    relDirection = 'OUT';
    if (thisType === relatedType) {
      isReflexiveRelationType = true;
      const isReflexiveOutputType = isReflexiveRelationshipOutputType({
        schemaType
      });
      const directedNodeFieldNames = schemaType.astNode.fields.map(
        field => field.name.value
      );
      const fromFieldName = directedNodeFieldNames[0];
      const toFieldName = directedNodeFieldNames[1];
      if (
        fieldName === 'from' ||
        (isReflexiveOutputType && fieldName === fromFieldName)
      ) {
        isReflexiveTypeDirectedField = true;
        relDirection = 'IN';
      } else if (
        fieldName === 'to' ||
        (isReflexiveOutputType && fieldName === toFieldName)
      ) {
        isReflexiveTypeDirectedField = true;
      }
    } else if (thisType !== relatedType) {
      const filteredType = schemaType && schemaType.name ? schemaType.name : '';
      if (filteredType === relatedType) {
        // then a filter argument for the incoming direction is being used
        // when querying the node type it goes out from
        const temp = thisType;
        thisType = relatedType;
        relatedType = temp;
        relDirection = 'IN';
      }
    }
  } else if (relationTypeDirective) {
    isRelationTypeNode = true;
    thisType = relationTypeDirective.from;
    relatedType = relationTypeDirective.to;
    relLabel = variableName;
    relDirection = 'OUT';
    // if not a reflexive relationship type
    if (thisType !== relatedType) {
      // When buildFilterPredicates is used in buildRelationPredicate,
      // parentSchemaType is provided and used here to decide whether
      // to filter the incoming or outgoing node type
      const filteredType =
        parentSchemaType && parentSchemaType.name ? parentSchemaType.name : '';
      // the connecting node type field on a relationship type filter
      // may be incoming or outgoing; thisType could be .from or .to
      if (filteredType === relatedType) {
        // then this filter argument is being used on a field of the node type
        // the relationship goes .to, so we need to filter for the node types
        // it comes .from
        const temp = thisType;
        thisType = relatedType;
        relatedType = temp;
        relDirection = 'IN';
      }
    }
  }
  return [
    thisType,
    relatedType,
    relLabel,
    relDirection,
    isRelation,
    isRelationType,
    isRelationTypeNode,
    isReflexiveRelationType,
    isReflexiveTypeDirectedField
  ];
};

const buildRelationPredicate = ({
  rootIsRelationType,
  isRelationType,
  isReflexiveRelationType,
  isReflexiveTypeDirectedField,
  thisType,
  isListFilterArgument,
  relatedType,
  schemaType,
  innerSchemaType,
  fieldName,
  filterOperationType,
  filterValue,
  filterParam,
  schema,
  parameterPath,
  nullFieldPredicate,
  pathExistencePredicate,
  predicateListVariable,
  rootPredicateFunction
}) => {
  let isRelationList =
    filterOperationType === 'in' || filterOperationType === 'not_in';
  let relationVariable = buildRelationVariable(thisType, relatedType);
  let variableName = relatedType.toLowerCase();
  let listVariable = parameterPath;
  if (rootIsRelationType || isRelationType) {
    // change the variable to be used in filtering
    // to the appropriate relationship variable
    // ex: project -> person_filter_project
    variableName = relationVariable;
  }
  if (isRelationList) {
    // set the base list comprehension variable
    // to point at each array element instead
    // ex: $filter.company_in -> _company_in
    listVariable = `_${fieldName}`;
    // set to list to enable null field
    // skipping for all child filters
    isListFilterArgument = true;
  }
  let predicates = buildFilterPredicates({
    parentFieldName: fieldName,
    parentSchemaType: schemaType,
    schemaType: innerSchemaType,
    variableName,
    isListFilterArgument,
    listVariable,
    filterOperationType,
    isRelationType,
    filterValue,
    filterParam,
    schema
  });
  if (isRelationList) {
    predicates = buildPredicateFunction({
      predicateListVariable: parameterPath,
      listElementVariable: listVariable,
      rootPredicateFunction,
      predicates
    });
    rootPredicateFunction = decidePredicateFunction({
      isRelationList
    });
  }
  if (isReflexiveRelationType && !isReflexiveTypeDirectedField) {
    // At reflexive relation type fields, sufficient predicates and values are already
    // obtained from the above call to the recursive buildFilterPredicates
    // ex: Person.knows, Person.knows_in, etc.
    // Note: Since only the internal 'from' and 'to' fields are translated for reflexive
    // relation types, their translations will use the fieldName and schema type name
    // of this field. See: the top of translateRelationFilter
    return predicates;
  }
  const listElementVariable = safeVar(variableName);
  return buildPredicateFunction({
    nullFieldPredicate,
    pathExistencePredicate,
    predicateListVariable,
    rootPredicateFunction,
    predicates,
    listElementVariable
  });
};

const buildPredicateFunction = ({
  nullFieldPredicate,
  pathExistencePredicate,
  predicateListVariable,
  rootPredicateFunction,
  predicates,
  listElementVariable
}) => {
  // https://neo4j.com/docs/cypher-manual/current/functions/predicate/
  return `${nullFieldPredicate || ''}${
    pathExistencePredicate ? `EXISTS(${pathExistencePredicate}) AND ` : ''
  }${rootPredicateFunction}(${listElementVariable} IN ${predicateListVariable} WHERE ${predicates})`;
};

const buildRelationVariable = (thisType, relatedType) => {
  return `${thisType.toLowerCase()}_filter_${relatedType.toLowerCase()}`;
};

const decidePredicateFunction = ({
  filterOperationField,
  filterOperationType,
  isRelationTypeNode,
  isRelationList
}) => {
  if (filterOperationField === 'AND') return 'ALL';
  else if (filterOperationField === 'OR') return 'ANY';
  else if (isRelationTypeNode) return 'ALL';
  else if (isRelationList) return 'ALL';
  else {
    switch (filterOperationType) {
      case 'not':
        return 'NONE';
      case 'in':
        return 'ANY';
      case 'not_in':
        return 'NONE';
      case 'some':
        return 'ANY';
      case 'every':
        return 'ALL';
      case 'none':
        return 'NONE';
      case 'single':
        return 'SINGLE';
      case 'distance':
      case 'distance_lt':
      case 'distance_lte':
      case 'distance_gt':
      case 'distance_gte':
        return 'distance';
      default:
        return 'ALL';
    }
  }
};

const buildRelatedTypeListComprehension = ({
  rootIsRelationType,
  variableName,
  thisType,
  relatedType,
  relationLabel,
  relationDirection,
  isRelationTypeNode,
  isRelationType
}) => {
  let relationVariable = buildRelationVariable(thisType, relatedType);
  if (rootIsRelationType) {
    relationVariable = variableName;
  }
  const thisTypeVariable =
    !rootIsRelationType && !isRelationTypeNode
      ? safeVar(lowFirstLetter(variableName))
      : safeVar(lowFirstLetter(thisType));
  // prevents related node variable from
  // conflicting with parent variables
  const relatedTypeVariable = safeVar(`_${relatedType.toLowerCase()}`);
  // builds a path pattern within a list comprehension
  // that extracts related nodes
  return `[(${thisTypeVariable})${relationDirection === 'IN' ? '<' : ''}-[${
    isRelationType
      ? safeVar(`_${relationVariable}`)
      : isRelationTypeNode
      ? safeVar(relationVariable)
      : ''
  }${!isRelationTypeNode ? `:${relationLabel}` : ''}]-${
    relationDirection === 'OUT' ? '>' : ''
  }(${isRelationType ? '' : relatedTypeVariable}:${relatedType}) | ${
    isRelationType ? safeVar(`_${relationVariable}`) : relatedTypeVariable
  }]`;
};

const buildRelationExistencePath = (
  fromVar,
  relLabel,
  relDirection,
  toType,
  isRelationTypeNode
) => {
  // because ALL(n IN [] WHERE n) currently returns true
  // an existence predicate is added to make sure a relationship exists
  // otherwise a node returns when it has 0 such relationships, since the
  // predicate function then evaluates an empty list
  const safeFromVar = safeVar(fromVar);
  return !isRelationTypeNode
    ? `(${safeFromVar})${relDirection === 'IN' ? '<' : ''}-[:${relLabel}]-${
        relDirection === 'OUT' ? '>' : ''
      }(:${toType})`
    : '';
};

const buildFilterPredicates = ({
  parentSchemaType,
  parentFieldName,
  schemaType,
  variableName,
  listVariable,
  filterValue,
  filterParam,
  schema,
  isListFilterArgument
}) => {
  const predicates = Object.entries(filterValue)
    .reduce((predicates, [name, value]) => {
      name = deserializeFilterFieldName(name);
      const predicate = translateFilterArgument({
        parentParamPath: listVariable,
        fieldName: name,
        filterValue: value,
        paramValue: filterValue,
        parentFieldName,
        parentSchemaType,
        isListFilterArgument,
        variableName,
        filterParam,
        schemaType,
        schema
      });
      if (predicate) {
        predicates.push(`(${predicate})`);
      }
      return predicates;
    }, [])
    .join(' AND ');
  return predicates;
};

const decideNeo4jTypeFilter = ({ filterOperationType, typeName }) => {
  let cypherTypeConstructor = '';
  let isTemporalFilter = false;
  let isSpatialFilter = false;
  if (
    !isSpatialDistanceInputType({
      filterOperationType
    })
  ) {
    switch (typeName) {
      case '_Neo4jTime': {
        isTemporalFilter = true;
        cypherTypeConstructor = 'time';
        break;
      }
      case '_Neo4jDate': {
        isTemporalFilter = true;
        cypherTypeConstructor = 'date';
        break;
      }
      case '_Neo4jDateTime': {
        isTemporalFilter = true;
        cypherTypeConstructor = 'datetime';
        break;
      }
      case '_Neo4jLocalTime': {
        isTemporalFilter = true;
        cypherTypeConstructor = 'localtime';
        break;
      }
      case '_Neo4jLocalDateTime': {
        isTemporalFilter = true;
        cypherTypeConstructor = 'localdatetime';
        break;
      }
      case '_Neo4jPoint': {
        isSpatialFilter = true;
        cypherTypeConstructor = 'point';
        break;
      }
    }
  }
  return [isTemporalFilter, isSpatialFilter, cypherTypeConstructor];
};

const translateNeo4jTypeFilter = ({
  typeName,
  isRelationTypeNode,
  filterValue,
  paramValue,
  variableName,
  filterOperationField,
  filterOperationType,
  fieldName,
  filterParam,
  parameterPath,
  parentParamPath,
  isListFilterArgument,
  isListFieldFilter,
  nullFieldPredicate
}) => {
  const safeVariableName = safeVar(variableName);
  let propertyPath = `${safeVariableName}.${filterOperationField}`;
  const [
    isTemporalFilter,
    isSpatialFilter,
    cypherTypeConstructor
  ] = decideNeo4jTypeFilter({
    filterOperationType,
    typeName
  });
  if (isExistentialFilter(filterOperationType, filterValue)) {
    return translateNullFilter({
      filterOperationField,
      filterOperationType,
      propertyPath,
      filterParam,
      parentParamPath,
      isListFilterArgument
    });
  }
  if (isListFieldFilter) {
    return translateListArgument({
      typeName,
      filterValue: paramValue[fieldName],
      filterOperationType,
      listVariable: propertyPath,
      paramPath: parameterPath,
      isNeo4jType: true
    });
  }
  const rootPredicateFunction = decidePredicateFunction({
    isRelationTypeNode,
    filterOperationField,
    filterOperationType
  });
  return buildNeo4jTypePredicate({
    fieldName,
    filterOperationField,
    filterOperationType,
    filterValue,
    parameterPath,
    variableName,
    nullFieldPredicate,
    rootPredicateFunction,
    cypherTypeConstructor,
    parentIsListArgument: isListFilterArgument,
    isTemporalFilter,
    isSpatialFilter
  });
};

const buildNeo4jTypeTranslation = ({
  filterOperationType,
  listVariable,
  isTemporalFilter,
  isSpatialFilter,
  parentIsListArgument,
  isListFilterArgument,
  filterValue,
  nullFieldPredicate,
  propertyPath,
  cypherTypeConstructor,
  operatorExpression,
  parameterPath,
  rootPredicateFunction
}) => {
  if (
    isSpatialDistanceInputType({
      filterOperationType
    })
  ) {
    listVariable = `${listVariable}.distance`;
  }
  let translation = '';
  const isIdentityFilter =
    !filterOperationType || filterOperationType === 'not';
  if (
    (isTemporalFilter || isSpatialFilter) &&
    (isIdentityFilter || isListFilterArgument || parentIsListArgument)
  ) {
    const generalizedComparisonPredicates = Object.keys(filterValue).map(
      filterName => {
        const isTemporalFormatted =
          isTemporalFilter && filterName === 'formatted';
        if (nullFieldPredicate || isListFilterArgument) {
          nullFieldPredicate = `${listVariable}.${filterName} IS NULL OR `;
        }
        if (isTemporalFormatted) {
          return `(${nullFieldPredicate}${operatorExpression} ${cypherTypeConstructor}(${listVariable}.${filterName}))`;
        } else {
          let filterNameOprType = buildOperatorExpression({
            filterOperationType: filterOperationType,
            propertyPath: '',
            isListFilterArgument: false
          });
          return `(${nullFieldPredicate}${propertyPath}.${filterName} ${filterNameOprType} ${listVariable}.${filterName})`;
        }
      }
    );
    translation = `(${generalizedComparisonPredicates.join(' AND ')})`;
    if (filterOperationType === 'not') {
      translation = `NOT${translation}`;
    }
  } else {
    translation = `(${nullFieldPredicate}${operatorExpression} ${cypherTypeConstructor}(${listVariable}))`;
  }
  if (isListFilterArgument) {
    translation = buildPredicateFunction({
      predicateListVariable: parameterPath,
      listElementVariable: listVariable,
      rootPredicateFunction,
      predicates: translation
    });
  }
  return translation;
};

const buildNeo4jTypePredicate = ({
  fieldName,
  filterOperationField,
  filterOperationType,
  filterValue,
  parameterPath,
  variableName,
  nullFieldPredicate,
  rootPredicateFunction,
  cypherTypeConstructor,
  parentIsListArgument,
  isTemporalFilter,
  isSpatialFilter
}) => {
  const isListFilterArgument =
    filterOperationType === 'in' || filterOperationType === 'not_in';
  // ex: project -> person_filter_project
  let listVariable = parameterPath;
  // ex: $filter.datetime_in -> _datetime_in
  if (isListFilterArgument) listVariable = `_${fieldName}`;
  const safeVariableName = safeVar(variableName);
  let propertyPath = `${safeVariableName}.${filterOperationField}`;
  const operatorExpression = buildOperatorExpression({
    filterOperationType,
    propertyPath,
    isListFilterArgument,
    parameterPath
  });
  const translation = buildNeo4jTypeTranslation({
    filterOperationType,
    listVariable,
    isTemporalFilter,
    isSpatialFilter,
    parentIsListArgument,
    isListFilterArgument,
    filterValue,
    nullFieldPredicate,
    propertyPath,
    cypherTypeConstructor,
    operatorExpression,
    parameterPath,
    rootPredicateFunction
  });
  return translation;
};

export const translateListArguments = ({
  schemaType,
  fieldArgs,
  filterParams,
  safeVariableName,
  resolveInfo
}) => {
  const arrayPredicates = [];
  fieldArgs.forEach(fieldArgument => {
    const argumentName = fieldArgument.name.value;
    const param = filterParams[argumentName];
    const isGeneratedListArgument = argumentName === OrderingArgument.ORDER_BY;
    const usesArgument = param !== undefined;
    if (
      usesArgument &&
      isListTypeField({ field: fieldArgument }) &&
      !isGeneratedListArgument
    ) {
      const filterValue = param.value !== undefined ? param.value : param;
      const indexedParam = filterParams[argumentName];
      const paramIndex = indexedParam.index;
      const field = schemaType.getFields()[argumentName];
      const listVariable = `${safeVariableName}.${safeVar(argumentName)}`;
      let paramPath = `$${argumentName}`;
      // Possibly use the already generated index used when naming nested parameters
      if (paramIndex >= 1) paramPath = `$${paramIndex}_${argumentName}`;
      let translation = '';
      if (field) {
        // list argument matches the name of a field
        const type = fieldArgument.type;
        const unwrappedType = unwrapNamedType({ type });
        const typeName = unwrappedType.name;
        const fieldType = resolveInfo.schema.getType(typeName);
        const isNeo4jType = isNeo4jTypeArgument({ fieldArgument });
        if (isScalarType(fieldType) || isEnumType(fieldType) || isNeo4jType) {
          let whereClause = '';
          if (
            isListTypeField({ field: field.astNode }) &&
            Array.isArray(filterValue)
          ) {
            // The matching field is also a list
            translation = translateListArgument({
              typeName,
              filterValue,
              isNeo4jType,
              listVariable,
              paramPath
            });
          } else {
            // the matching field is not also a list
            if (isNeo4jType) {
              whereClause = translateCustomTypeListArgument({
                typeName,
                propertyVariable: listVariable,
                filterValue
              });
              translation = cypherList({
                listVariable: paramPath,
                whereClause
              });
            } else
              translation = cypherList({
                variable: listVariable,
                listVariable: paramPath
              });
          }
        }
      } else {
        // list argument does not match a field on the queried type
        translation = cypherList({
          variable: listVariable,
          listVariable: paramPath
        });
      }
      arrayPredicates.push(translation);
    }
  });
  return arrayPredicates;
};

const translateListArgument = ({
  typeName,
  filterValue,
  filterOperationType,
  isNeo4jType,
  listVariable,
  paramPath
}) => {
  const parameterPath = 'value';
  const propertyPath = 'prop';
  let whereClause = '';
  let translation = '';
  if (filterValue.length) {
    // When a list is evaludated as a predicate, an empty list is false
    // So we use list comprehensions to filter list properties
    if (isNeo4jType) {
      // The deeper scope of custom neo4j temporal and spatial types
      // require another layer of iteration
      whereClause = translateCustomTypeListArgument({
        typeName,
        filterValue,
        filterOperationType
      });
      if (filterOperationType) {
        if (filterOperationType === 'not') {
          const propertyList = cypherList({
            variable: propertyPath,
            listVariable
          });
          whereClause = `[${propertyList} WHERE ${whereClause}]`;
        } else {
          whereClause = cypherList({
            variable: propertyPath,
            listVariable,
            whereClause
          });
        }
      } else {
        whereClause = cypherList({
          variable: propertyPath,
          listVariable,
          whereClause
        });
      }
      if (filterOperationType === 'not') {
        const parameterList = cypherList({
          listVariable: paramPath
        });
        translation = `NONE(${parameterList} WHERE ${whereClause})`;
      } else {
        translation = cypherList({ listVariable: paramPath, whereClause });
      }
    } else {
      if (filterOperationType) {
        let innerOperation = filterOperationType;
        // negated list filters are wrapped with NONE rather
        // than using NOT on the list comprehension predicate
        if (innerOperation === 'not') innerOperation = '';
        const operatorExpression = buildOperatorExpression({
          filterOperationType: innerOperation,
          propertyPath,
          parameterPath
        });
        whereClause = `${operatorExpression} ${parameterPath}`;
        whereClause = cypherList({
          variable: propertyPath,
          listVariable,
          whereClause
        });
      } else {
        whereClause = cypherList({ listVariable });
      }
      if (filterOperationType === 'not') {
        const propertyList = cypherList({ listVariable: paramPath });
        translation = `NONE(${propertyList} WHERE ${whereClause})`;
      } else {
        translation = cypherList({ listVariable: paramPath, whereClause });
      }
    }
  } else {
    let sizeOperator = `=`;
    if (filterOperationType === 'not') sizeOperator = `>`;
    translation = `(size(${listVariable}) ${sizeOperator} 0)`;
  }
  return translation;
};

const translateCustomTypeListArgument = ({
  typeName,
  variable = 'value',
  propertyVariable = 'prop',
  filterValue = [],
  filterOperationType = ''
}) => {
  let translation = '';
  if (isSpatialDistanceInputType({ filterOperationType })) {
    // exception to ignore the inner fields of the distance filter input type
    const operatorExpression = buildOperatorExpression({
      filterOperationType,
      propertyPath: propertyVariable,
      parameterPath: variable
    });
    translation = `(${operatorExpression}${variable}.distance)`;
  } else {
    // map all unique inner field selections of the given custom property type
    const uniqueFilterMap = filterValue.reduce((booleanMap, filter) => {
      Object.keys(filter).forEach(key => {
        booleanMap[key] = true;
      });
      return booleanMap;
    }, {});
    // Builds a single predicate used for comparing a list of a custom type (DateTime, etc.)
    // to a matching list property containing values of that type.
    translation = Object.keys(uniqueFilterMap)
      .map(filterName => {
        const isTemporalFormatted = filterName === 'formatted';
        // short-circuit evaluate to let differences in selected fields pass through
        const nullFieldPredicate = `${variable}.${filterName} IS NULL OR `;
        let propertyPath = '';
        // the path to the argument value of to compare against, e.g. value.year, value.x
        let parameterPath = `${variable}.${filterName}`;
        if (isTemporalFormatted) {
          propertyPath = `${propertyVariable}`;
          let typeConstructor = decideNeo4jTypeConstructor(typeName);
          if (!typeConstructor) {
            // list filter arguments pass the type definition corresponding to
            // generated input types, _Neo4jDateTime vs _Neo4jDateTimeInput
            // further generalization of constructor selection can clean this up
            const [
              isTemporalFilter,
              isSpatialFilter,
              cypherTypeConstructor
            ] = decideNeo4jTypeFilter({
              filterOperationType,
              typeName
            });
            typeConstructor = cypherTypeConstructor;
          }
          if (typeConstructor) {
            parameterPath = `${typeConstructor}(${parameterPath})`;
          }
        } else {
          // the path to an inner field of the matching property
          // being compared, e.g. prop.year, prop.x
          propertyPath = `${propertyVariable}.${filterName}`;
        }
        if (filterOperationType === 'not') filterOperationType = '';
        // builds the left hand side of the comparison predicate for list filters
        const operatorExpression = buildOperatorExpression({
          filterOperationType,
          propertyPath,
          parameterPath
        });
        // default comparison operator is =
        return `(${nullFieldPredicate}${operatorExpression} ${parameterPath})`;
      })
      .join(' AND ');
  }
  return `(${translation})`;
};

const cypherList = ({
  variable = 'value',
  listVariable = '',
  whereClause = '',
  filterClause = ''
}) => {
  if (whereClause || filterClause) {
    whereClause = whereClause ? ` WHERE ${whereClause}` : '';
    filterClause = filterClause ? ` ${filterClause}` : '';
    listVariable = `${listVariable}${whereClause}${filterClause}`;
    return `[${variable} IN ${listVariable}]`;
  }
  return `${variable} IN ${listVariable}`;
};
