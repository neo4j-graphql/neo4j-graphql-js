import {
  isArrayType,
  cypherDirectiveArgs,
  safeLabel,
  safeVar,
  getFilterParams,
  lowFirstLetter,
  isAddMutation,
  isCreateMutation,
  isUpdateMutation,
  isRemoveMutation,
  isMergeMutation,
  isDeleteMutation,
  computeOrderBy,
  innerFilterParams,
  paramsToString,
  filterNullParams,
  getOuterSkipLimit,
  getQueryCypherDirective,
  getMutationArguments,
  possiblySetFirstId,
  buildCypherParameters,
  getQueryArguments,
  initializeMutationParams,
  getMutationCypherDirective,
  isNodeType,
  getRelationTypeDirective,
  isRelationTypeDirectedField,
  isRelationTypePayload,
  isRootSelection,
  splitSelectionParameters,
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
  isGraphqlObjectType
} from './utils';
import {
  getNamedType,
  isScalarType,
  isEnumType,
  isObjectType,
  isInterfaceType,
  Kind
} from 'graphql';
import {
  buildCypherSelection,
  isFragmentedSelection,
  getDerivedTypes,
  getUnionDerivedTypes,
  mergeSelectionFragments
} from './selections';
import _ from 'lodash';
import neo4j from 'neo4j-driver';
import {
  isUnionTypeDefinition,
  isUnionTypeExtensionDefinition
} from './augment/types/types';
import {
  getFederatedOperationData,
  setCompoundKeyFilter,
  NEO4j_GRAPHQL_SERVICE
} from './federation';
import { unwrapNamedType } from './augment/fields';

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
  selections,
  schemaType,
  subSelection,
  skipLimit,
  commaIfTail,
  tailParams,
  resolveInfo,
  cypherParams
}) => {
  const safeVariableName = safeVar(nestedVariable);
  const allParams = innerFilterParams(filterParams, neo4jTypeArgs);
  const queryParams = paramsToString(
    _.filter(allParams, param => !Array.isArray(param.value))
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

  const arrayFilterParams = _.pickBy(
    filterParams,
    (param, keyName) => Array.isArray(param.value) && !('orderBy' === keyName)
  );
  const neo4jTypeClauses = neo4jTypePredicateClauses(
    filterParams,
    nestedVariable,
    neo4jTypeArgs
  );
  const arrayPredicates = _.map(arrayFilterParams, (value, key) => {
    const param = _.find(allParams, param => param.key === key);
    return `${safeVariableName}.${safeVar(key)} IN $${
      param.value.index
    }_${key}`;
  });

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

  subSelection[1] = { ...subSelection[1] };

  let whereClauses = [
    labelPredicate,
    ...neo4jTypeClauses,
    ...arrayPredicates,
    ...filterPredicates
  ].filter(predicate => !!predicate);
  const orderByParam = filterParams['orderBy'];
  const temporalOrdering = temporalOrderingFieldExists(
    schemaType,
    filterParams
  );

  tailParams.initial = `${initial}${fieldName}: ${
    !isArrayType(fieldType) ? 'head(' : ''
  }${
    orderByParam
      ? temporalOrdering
        ? `[sortedElement IN apoc.coll.sortMulti(`
        : `apoc.coll.sortMulti(`
      : ''
  }[(${safeVar(variableName)})${
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
  } | ${mapProjection}]${
    orderByParam
      ? `, [${buildSortMultiArgs(orderByParam)}])${
          temporalOrdering
            ? ` | sortedElement { .*,  ${neo4jTypeOrderingClauses(
                selections,
                innerSchemaType
              )}}]`
            : ``
        }`
      : ''
  }${!isArrayType(fieldType) ? ')' : ''}${skipLimit} ${commaIfTail}`;
  return [tailParams, subSelection];
};

export const relationTypeFieldOnNodeType = ({
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
}) => {
  if (innerSchemaTypeRelation.from === innerSchemaTypeRelation.to) {
    tailParams.initial = `${initial}${fieldName}: {${subSelection[0]}}${skipLimit} ${commaIfTail}`;
    return [tailParams, subSelection];
  }
  const relationshipVariableName = `${nestedVariable}_relation`;
  const neo4jTypeClauses = neo4jTypePredicateClauses(
    filterParams,
    relationshipVariableName,
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

  const whereClauses = [...neo4jTypeClauses, ...filterPredicates];

  tailParams.initial = `${initial}${fieldName}: ${
    !isArrayType(fieldType) ? 'head(' : ''
  }[(${safeVar(variableName)})${
    schemaType.name === innerSchemaTypeRelation.to ? '<' : ''
  }-[${safeVar(relationshipVariableName)}:${safeLabel(
    innerSchemaTypeRelation.name
  )}${queryParams}]-${
    schemaType.name === innerSchemaTypeRelation.from ? '>' : ''
  }(:${safeLabel(
    schemaType.name === innerSchemaTypeRelation.from
      ? [
          innerSchemaTypeRelation.to,
          ...getAdditionalLabels(
            resolveInfo.schema.getType(innerSchemaTypeRelation.to),
            cypherParams
          )
        ]
      : [
          innerSchemaTypeRelation.from,
          ...getAdditionalLabels(
            resolveInfo.schema.getType(innerSchemaTypeRelation.from),
            cypherParams
          )
        ]
  )}) ${
    whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')} ` : ''
  }| ${relationshipVariableName} {${subSelection[0]}}]${
    !isArrayType(fieldType) ? ')' : ''
  }${skipLimit} ${commaIfTail}`;
  return [tailParams, subSelection];
};

export const nodeTypeFieldOnRelationType = ({
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
}) => {
  const safeVariableName = safeVar(variableName);
  if (
    isRootSelection({
      selectionInfo: parentSelectionInfo,
      rootType: 'relationship'
    }) &&
    isRelationTypeDirectedField(fieldName)
  ) {
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
    const translationParams = relationTypeMutationPayloadField({
      initial,
      fieldName,
      mapProjection,
      skipLimit,
      commaIfTail,
      tailParams,
      parentSelectionInfo
    });
    return [translationParams, subSelection];
  }
  // Normal case of schemaType with a relationship directive
  return directedNodeTypeFieldOnRelationType({
    initial,
    fieldName,
    fieldType,
    variableName,
    queryParams,
    nestedVariable,
    subSelection,
    skipLimit,
    commaIfTail,
    tailParams,
    schemaTypeRelation,
    innerSchemaType,
    isInterfaceTypeField,
    filterParams,
    neo4jTypeArgs,
    paramIndex,
    resolveInfo,
    selectionFilters,
    fieldArgs,
    cypherParams
  });
};

const relationTypeMutationPayloadField = ({
  initial,
  fieldName,
  mapProjection,
  skipLimit,
  commaIfTail,
  tailParams,
  parentSelectionInfo
}) => {
  return {
    initial: `${initial}${fieldName}: ${mapProjection}${skipLimit} ${commaIfTail}`,
    ...tailParams,
    variableName:
      fieldName === 'from' ? parentSelectionInfo.to : parentSelectionInfo.from
  };
};

// TODO refactor
const directedNodeTypeFieldOnRelationType = ({
  initial,
  fieldName,
  fieldType,
  variableName,
  queryParams,
  nestedVariable,
  subSelection,
  skipLimit,
  commaIfTail,
  tailParams,
  schemaTypeRelation,
  innerSchemaType,
  isInterfaceTypeField,
  filterParams,
  neo4jTypeArgs,
  paramIndex,
  resolveInfo,
  selectionFilters,
  fieldArgs,
  cypherParams
}) => {
  const relType = schemaTypeRelation.name;
  const fromTypeName = schemaTypeRelation.from;
  const toTypeName = schemaTypeRelation.to;
  const isFromField = fieldName === fromTypeName || fieldName === 'from';
  const isToField = fieldName === toTypeName || fieldName === 'to';
  // Since the translations are significantly different,
  // we first check whether the relationship is reflexive
  if (fromTypeName === toTypeName) {
    const relationshipVariableName = `${variableName}_${
      isFromField ? 'from' : 'to'
    }_relation`;
    if (isRelationTypeDirectedField(fieldName)) {
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
      const whereClauses = [...neo4jTypeClauses, ...filterPredicates];
      tailParams.initial = `${initial}${fieldName}: ${
        !isArrayType(fieldType) ? 'head(' : ''
      }[(${safeVar(variableName)})${isFromField ? '<' : ''}-[${safeVar(
        relationshipVariableName
      )}:${safeLabel(relType)}${queryParams}]-${isToField ? '>' : ''}(${safeVar(
        nestedVariable
      )}${
        !isInterfaceTypeField
          ? `:${safeLabel([
              fromTypeName,
              ...getAdditionalLabels(
                resolveInfo.schema.getType(fromTypeName),
                cypherParams
              )
            ])}`
          : ''
      }) ${
        whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')} ` : ''
      }| ${relationshipVariableName} {${
        // TODO switch to using buildMapProjection to support fragments
        isInterfaceTypeField
          ? `${fragmentType(nestedVariable, innerSchemaType.name)}${
              subSelection[0] ? `, ${subSelection[0]}` : ''
            }`
          : subSelection[0]
      }}]${!isArrayType(fieldType) ? ')' : ''}${skipLimit} ${commaIfTail}`;
      return [tailParams, subSelection];
    } else {
      tailParams.initial = `${initial}${fieldName}: ${variableName} {${subSelection[0]}}${skipLimit} ${commaIfTail}`;
      // Case of a renamed directed field
      // e.g., 'from: Movie' -> 'Movie: Movie'
      return [tailParams, subSelection];
    }
  } else {
    variableName = variableName + '_relation';
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
    )})${isFromField ? '<' : ''}-[${safeVar(variableName)}]-${
      isToField ? '>' : ''
    }(${safeVar(nestedVariable)}:${
      !isInterfaceTypeField
        ? safeLabel([
            innerSchemaType.name,
            ...getAdditionalLabels(
              resolveInfo.schema.getType(innerSchemaType.name),
              cypherParams
            )
          ])
        : ''
    }${queryParams}) | ${nestedVariable} {${
      // TODO switch to using buildMapProjection to support fragments
      isInterfaceTypeField
        ? `${fragmentType(nestedVariable, innerSchemaType.name)}${
            subSelection[0] ? `, ${subSelection[0]}` : ''
          }`
        : subSelection[0]
    }}]${!isArrayType(fieldType) ? ')' : ''}${skipLimit} ${commaIfTail}`;
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
    if (
      isRootSelection({
        selectionInfo: secondParentSelectionInfo,
        rootType: 'relationship'
      })
    ) {
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
  const safeVariableName = safeVar(variableName);
  const relationshipVariableSuffix = `relation`;
  let fieldIsArray = isArrayType(fieldType);
  if (!isNodeType(schemaType.astNode)) {
    if (
      isRelationTypePayload(schemaType) &&
      schemaTypeRelation.from === schemaTypeRelation.to
    ) {
      variableName = `${nestedVariable}_${relationshipVariableSuffix}`;
    } else {
      if (fieldIsArray) {
        if (
          isRootSelection({
            selectionInfo: parentSelectionInfo,
            rootType: 'relationship'
          })
        ) {
          variableName = `${parentVariableName}_${relationshipVariableSuffix}`;
        } else {
          variableName = `${variableName}_${relationshipVariableSuffix}`;
        }
      } else {
        variableName = `${nestedVariable}_${relationshipVariableSuffix}`;
      }
    }
  }
  return {
    initial: `${initial}${fieldName}: ${
      fieldIsArray
        ? `reduce(a = [], INSTANCE IN ${variableName}.${fieldName} | a + {${subSelection[0]}})${commaIfTail}`
        : temporalOrderingFieldExists(parentSchemaType, parentFilterParams)
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
  const isFragmentedInterfaceType = isInterfaceType && usesFragments;
  const isFragmentedObjectType = isObjectType && usesFragments;
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
  // TODO refactor
  if (hasOnlySchemaTypeFragments) usesFragments = false;
  if (queryTypeCypherDirective) {
    return customQuery({
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
    return nodeQuery({
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
  const isFragmentedInterfaceType = isInterfaceType && usesFragments;
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
    // TODO refactor above branch now that more specific branching was needed
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

const getCypherParams = context => {
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
  // FIXME: fix subselection translation for temporal type payload
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

  const arrayParams = _.pickBy(filterParams, Array.isArray);
  const args = innerFilterParams(filterParams, neo4jTypeArgs);

  const argString = paramsToString(
    _.filter(args, arg => !Array.isArray(arg.value))
  );

  const idWherePredicate =
    typeof _id !== 'undefined' ? `ID(${safeVariableName})=${_id}` : '';

  const nullFieldPredicates = Object.keys(nullParams).map(
    key => `${variableName}.${key} IS NULL`
  );

  const arrayPredicates = _.map(
    arrayParams,
    (value, key) => `${safeVariableName}.${safeVar(key)} IN $${key}`
  );

  const fragmentTypeParams = derivedTypesParams({
    isInterfaceType,
    isUnionType,
    schema: resolveInfo.schema,
    schemaTypeName: schemaType.name,
    usesFragments
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

  const predicateClauses = [
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

  let query = `MATCH (${safeVariableName}:${safeLabelName}${
    argString ? ` ${argString}` : ''
  }) ${predicate}${
    optimization.earlyOrderBy ? `WITH ${safeVariableName}${orderByClause}` : ''
  }RETURN ${mapProjection} AS ${safeVariableName}${
    optimization.earlyOrderBy ? '' : orderByClause
  }${outerSkipLimit}`;

  return [query, { ...params, ...fragmentTypeParams }];
};

const buildMapProjection = ({
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

const getUnionLabels = ({ typeName = '', typeMap = {} }) => {
  const unionLabels = [];
  Object.keys(typeMap).map(key => {
    const definition = typeMap[key];
    const astNode = definition.astNode;
    if (isUnionTypeDefinition({ definition: astNode })) {
      const types = definition.getTypes();
      const unionTypeName = definition.name;
      if (types.find(type => type.name === typeName)) {
        unionLabels.push(unionTypeName);
      }
    }
  });
  return unionLabels;
};

// Mutation API root operation branch
export const translateMutation = ({
  resolveInfo,
  context,
  first,
  offset,
  otherParams
}) => {
  const typeMap = resolveInfo.schema.getTypeMap();
  const { typeName, variableName } = typeIdentifiers(resolveInfo.returnType);
  const schemaType = resolveInfo.schema.getType(typeName);
  const selections = getPayloadSelections(resolveInfo);
  const outerSkipLimit = getOuterSkipLimit(first, offset);
  const orderByValue = computeOrderBy(resolveInfo, schemaType);
  const additionalNodeLabels = getAdditionalLabels(
    schemaType,
    getCypherParams(context)
  );
  const mutationTypeCypherDirective = getMutationCypherDirective(resolveInfo);
  const mutationMeta = resolveInfo.schema
    .getMutationType()
    .getFields()
    [resolveInfo.fieldName].astNode.directives.find(x => {
      return x.name.value === 'MutationMeta';
    });

  const params = initializeMutationParams({
    mutationMeta,
    resolveInfo,
    mutationTypeCypherDirective,
    first,
    otherParams,
    offset
  });

  const isInterfaceType = isGraphqlInterfaceType(schemaType);
  const isObjectType = isGraphqlObjectType(schemaType);
  const isUnionType = isGraphqlUnionType(schemaType);

  const usesFragments = isFragmentedSelection({ selections });
  const isFragmentedObjectType = isObjectType && usesFragments;

  const interfaceLabels =
    typeof schemaType.getInterfaces === 'function'
      ? schemaType.getInterfaces().map(i => i.name)
      : [];

  const unionLabels = getUnionLabels({ typeName, typeMap });
  const additionalLabels = [
    ...additionalNodeLabels,
    ...interfaceLabels,
    ...unionLabels
  ];

  const [schemaTypeFields, derivedTypeMap] = mergeSelectionFragments({
    schemaType,
    selections,
    isFragmentedObjectType,
    isUnionType,
    typeMap,
    resolveInfo
  });
  if (mutationTypeCypherDirective) {
    return customMutation({
      resolveInfo,
      schemaType,
      schemaTypeFields,
      derivedTypeMap,
      isObjectType,
      isInterfaceType,
      isUnionType,
      usesFragments,
      selections,
      params,
      context,
      mutationTypeCypherDirective,
      variableName,
      orderByValue,
      outerSkipLimit
    });
  } else if (isCreateMutation(resolveInfo)) {
    return nodeCreate({
      resolveInfo,
      schemaType,
      selections,
      params,
      variableName,
      typeName,
      additionalLabels
    });
  } else if (isDeleteMutation(resolveInfo)) {
    return nodeDelete({
      resolveInfo,
      schemaType,
      selections,
      params,
      variableName,
      typeName
    });
  } else if (isAddMutation(resolveInfo)) {
    return relationshipCreate({
      resolveInfo,
      schemaType,
      selections,
      params,
      context
    });
  } else if (isUpdateMutation(resolveInfo) || isMergeMutation(resolveInfo)) {
    /**
     * TODO: Once we are no longer using the @MutationMeta directive
     * on relationship mutations, we will need to more directly identify
     * whether this Merge mutation if for a node or relationship
     */
    if (mutationMeta) {
      return relationshipMergeOrUpdate({
        mutationMeta,
        resolveInfo,
        selections,
        schemaType,
        params,
        context
      });
    } else {
      return nodeMergeOrUpdate({
        resolveInfo,
        variableName,
        typeName,
        selections,
        schemaType,
        additionalLabels,
        params
      });
    }
  } else if (isRemoveMutation(resolveInfo)) {
    return relationshipDelete({
      resolveInfo,
      schemaType,
      selections,
      params,
      context
    });
  } else {
    // throw error - don't know how to handle this type of mutation
    throw new Error(
      'Do not know how to handle this type of mutation. Mutation does not follow naming convention.'
    );
  }
};

// Custom write operation
const customMutation = ({
  params,
  context,
  mutationTypeCypherDirective,
  selections,
  variableName,
  schemaType,
  schemaTypeFields,
  derivedTypeMap,
  isObjectType,
  isInterfaceType,
  isUnionType,
  usesFragments,
  resolveInfo,
  orderByValue,
  outerSkipLimit
}) => {
  const cypherParams = getCypherParams(context);
  const safeVariableName = safeVar(variableName);
  // FIXME: support IN for multiple values -> WHERE
  const argString = paramsToString(
    innerFilterParams(
      getFilterParams(params.params || params),
      null,
      null,
      true
    ),
    cypherParams
  );
  const cypherQueryArg = mutationTypeCypherDirective.arguments.find(x => {
    return x.name.value === 'statement';
  });
  const [subQuery, subParams] = buildCypherSelection({
    selections,
    variableName,
    schemaType,
    resolveInfo,
    cypherParams
  });
  const isScalarType = isGraphqlScalarType(schemaType);
  const isNeo4jTypeOutput = isNeo4jType(schemaType.name);
  const isScalarField = isNeo4jTypeOutput || isScalarType;
  const { cypherPart: orderByClause } = orderByValue;
  const listVariable = `apoc.map.values(value, [keys(value)[0]])[0] `;
  const [mapProjection, labelPredicate] = buildMapProjection({
    isComputedMutation: true,
    listVariable,
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
  let query = '';
  // TODO refactor
  if (labelPredicate) {
    query = `CALL apoc.cypher.doIt("${
      cypherQueryArg.value.value
    }", ${argString}) YIELD value
    ${!isScalarField ? labelPredicate : ''}AS ${safeVariableName}
    RETURN ${
      !isScalarField
        ? `${mapProjection} AS ${safeVariableName}${orderByClause}${outerSkipLimit}`
        : ''
    }`;
  } else {
    query = `CALL apoc.cypher.doIt("${
      cypherQueryArg.value.value
    }", ${argString}) YIELD value
    WITH ${listVariable}AS ${safeVariableName}
    RETURN ${safeVariableName} ${
      !isScalarField
        ? `{${
            isInterfaceType
              ? `${fragmentType(safeVariableName, schemaType.name)},`
              : ''
          }${subQuery}} AS ${safeVariableName}${orderByClause}${outerSkipLimit}`
        : ''
    }`;
  }
  const fragmentTypeParams = derivedTypesParams({
    isInterfaceType,
    isUnionType,
    schema: resolveInfo.schema,
    schemaTypeName: schemaType.name,
    usesFragments
  });
  params = { ...params, ...subParams, ...fragmentTypeParams };
  if (cypherParams) {
    params['cypherParams'] = cypherParams;
  }
  return [query, { ...params }];
};

// Generated API
// Node Create - Update - Delete
const nodeCreate = ({
  variableName,
  typeName,
  selections,
  schemaType,
  resolveInfo,
  additionalLabels,
  params
}) => {
  const safeVariableName = safeVar(variableName);
  const safeLabelName = safeLabel([typeName, ...additionalLabels]);
  let statements = [];
  const args = getMutationArguments(resolveInfo);
  statements = possiblySetFirstId({
    args,
    statements,
    params: params.params
  });
  const [preparedParams, paramStatements] = buildCypherParameters({
    args,
    statements,
    params,
    paramKey: 'params',
    resolveInfo
  });

  const [subQuery, subParams] = buildCypherSelection({
    selections,
    variableName,
    schemaType,
    resolveInfo
  });

  params = { ...preparedParams, ...subParams };
  const query = `
    CREATE (${safeVariableName}:${safeLabelName} {${paramStatements.join(',')}})
    RETURN ${safeVariableName} {${subQuery}} AS ${safeVariableName}
  `;
  return [query, params];
};

const nodeDelete = ({
  resolveInfo,
  selections,
  variableName,
  typeName,
  schemaType,
  params
}) => {
  const safeVariableName = safeVar(variableName);
  const safeLabelName = safeLabel(typeName);
  const args = getMutationArguments(resolveInfo);
  const primaryKeyArg = args[0];
  const primaryKeyArgName = primaryKeyArg.name.value;
  const neo4jTypeArgs = getNeo4jTypeArguments(args);
  const [primaryKeyParam] = splitSelectionParameters(params, primaryKeyArgName);
  const neo4jTypeClauses = neo4jTypePredicateClauses(
    primaryKeyParam,
    safeVariableName,
    neo4jTypeArgs
  );
  let [preparedParams] = buildCypherParameters({ args, params, resolveInfo });
  let query = `MATCH (${safeVariableName}:${safeLabelName}${
    neo4jTypeClauses.length > 0
      ? `) WHERE ${neo4jTypeClauses.join(' AND ')}`
      : ` {${primaryKeyArgName}: $${primaryKeyArgName}})`
  }`;
  const [subQuery, subParams] = buildCypherSelection({
    selections,
    variableName,
    schemaType,
    resolveInfo
  });
  params = { ...preparedParams, ...subParams };
  const deletionVariableName = safeVar(`${variableName}_toDelete`);
  // Cannot execute a map projection on a deleted node in Neo4j
  // so the projection is executed and aliased before the delete
  query += `
WITH ${safeVariableName} AS ${deletionVariableName}, ${safeVariableName} {${subQuery}} AS ${safeVariableName}
DETACH DELETE ${deletionVariableName}
RETURN ${safeVariableName}`;
  return [query, params];
};

// Relation Add / Remove
const relationshipCreate = ({
  resolveInfo,
  selections,
  schemaType,
  params,
  context
}) => {
  let mutationMeta, relationshipNameArg, fromTypeArg, toTypeArg;
  try {
    mutationMeta = resolveInfo.schema
      .getMutationType()
      .getFields()
      [resolveInfo.fieldName].astNode.directives.find(x => {
        return x.name.value === 'MutationMeta';
      });
  } catch (e) {
    throw new Error(
      'Missing required MutationMeta directive on add relationship directive'
    );
  }

  try {
    relationshipNameArg = mutationMeta.arguments.find(x => {
      return x.name.value === 'relationship';
    });
    fromTypeArg = mutationMeta.arguments.find(x => {
      return x.name.value === 'from';
    });
    toTypeArg = mutationMeta.arguments.find(x => {
      return x.name.value === 'to';
    });
  } catch (e) {
    throw new Error(
      'Missing required argument in MutationMeta directive (relationship, from, or to)'
    );
  }

  //TODO: need to handle one-to-one and one-to-many
  const args = getMutationArguments(resolveInfo);
  const typeMap = resolveInfo.schema.getTypeMap();
  const cypherParams = getCypherParams(context);
  const fromType = fromTypeArg.value.value;
  const fromVar = `${lowFirstLetter(fromType)}_from`;
  const fromInputArg = args.find(e => e.name.value === 'from').type;
  const fromInputAst =
    typeMap[getNamedType(fromInputArg).type.name.value].astNode;
  const fromFields = fromInputAst.fields;
  const fromParam = fromFields[0].name.value;
  const fromNodeNeo4jTypeArgs = getNeo4jTypeArguments(fromFields);

  const toType = toTypeArg.value.value;
  const toVar = `${lowFirstLetter(toType)}_to`;
  const toInputArg = args.find(e => e.name.value === 'to').type;
  const toInputAst = typeMap[getNamedType(toInputArg).type.name.value].astNode;
  const toFields = toInputAst.fields;
  const toParam = toFields[0].name.value;
  const toNodeNeo4jTypeArgs = getNeo4jTypeArguments(toFields);

  const relationshipName = relationshipNameArg.value.value;
  const lowercased = relationshipName.toLowerCase();
  const dataInputArg = args.find(e => e.name.value === 'data');
  const dataInputAst = dataInputArg
    ? typeMap[getNamedType(dataInputArg.type).type.name.value].astNode
    : undefined;
  const dataFields = dataInputAst ? dataInputAst.fields : [];

  const [preparedParams, paramStatements] = buildCypherParameters({
    args: dataFields,
    params,
    paramKey: 'data',
    resolveInfo
  });
  const schemaTypeName = safeVar(schemaType);
  const fromVariable = safeVar(fromVar);
  const fromAdditionalLabels = getAdditionalLabels(
    resolveInfo.schema.getType(fromType),
    cypherParams
  );
  const fromLabel = safeLabel([fromType, ...fromAdditionalLabels]);
  const toVariable = safeVar(toVar);
  const toAdditionalLabels = getAdditionalLabels(
    resolveInfo.schema.getType(toType),
    cypherParams
  );
  const toLabel = safeLabel([toType, ...toAdditionalLabels]);
  const relationshipVariable = safeVar(lowercased + '_relation');
  const relationshipLabel = safeLabel(relationshipName);
  const fromNodeNeo4jTypeClauses = neo4jTypePredicateClauses(
    preparedParams.from,
    fromVariable,
    fromNodeNeo4jTypeArgs,
    'from'
  );
  const toNodeNeo4jTypeClauses = neo4jTypePredicateClauses(
    preparedParams.to,
    toVariable,
    toNodeNeo4jTypeArgs,
    'to'
  );
  const [subQuery, subParams] = buildCypherSelection({
    selections,
    schemaType,
    resolveInfo,
    parentSelectionInfo: {
      rootType: 'relationship',
      from: fromVar,
      to: toVar,
      variableName: lowercased
    },
    variableName: schemaType.name === fromType ? `${toVar}` : `${fromVar}`,
    cypherParams: getCypherParams(context)
  });
  params = { ...preparedParams, ...subParams };
  let query = `
      MATCH (${fromVariable}:${fromLabel}${
    fromNodeNeo4jTypeClauses && fromNodeNeo4jTypeClauses.length > 0
      ? // uses either a WHERE clause for managed type primary keys (temporal, etc.)
        `) WHERE ${fromNodeNeo4jTypeClauses.join(' AND ')} `
      : // or a an internal matching clause for normal, scalar property primary keys
        // NOTE this will need to change if we at some point allow for multi field node selection
        ` {${fromParam}: $from.${fromParam}})`
  }
      MATCH (${toVariable}:${toLabel}${
    toNodeNeo4jTypeClauses && toNodeNeo4jTypeClauses.length > 0
      ? `) WHERE ${toNodeNeo4jTypeClauses.join(' AND ')} `
      : ` {${toParam}: $to.${toParam}})`
  }
      CREATE (${fromVariable})-[${relationshipVariable}:${relationshipLabel}${
    paramStatements.length > 0 ? ` {${paramStatements.join(',')}}` : ''
  }]->(${toVariable})
      RETURN ${relationshipVariable} { ${subQuery} } AS ${schemaTypeName};
    `;
  return [query, params];
};

const relationshipDelete = ({
  resolveInfo,
  selections,
  schemaType,
  params,
  context
}) => {
  let mutationMeta, relationshipNameArg, fromTypeArg, toTypeArg;
  try {
    mutationMeta = resolveInfo.schema
      .getMutationType()
      .getFields()
      [resolveInfo.fieldName].astNode.directives.find(x => {
        return x.name.value === 'MutationMeta';
      });
  } catch (e) {
    throw new Error(
      'Missing required MutationMeta directive on add relationship directive'
    );
  }

  try {
    relationshipNameArg = mutationMeta.arguments.find(x => {
      return x.name.value === 'relationship';
    });
    fromTypeArg = mutationMeta.arguments.find(x => {
      return x.name.value === 'from';
    });
    toTypeArg = mutationMeta.arguments.find(x => {
      return x.name.value === 'to';
    });
  } catch (e) {
    throw new Error(
      'Missing required argument in MutationMeta directive (relationship, from, or to)'
    );
  }

  //TODO: need to handle one-to-one and one-to-many
  const args = getMutationArguments(resolveInfo);
  const typeMap = resolveInfo.schema.getTypeMap();
  const cypherParams = getCypherParams(context);

  const fromType = fromTypeArg.value.value;
  const fromVar = `${lowFirstLetter(fromType)}_from`;
  const fromInputArg = args.find(e => e.name.value === 'from').type;
  const fromInputAst =
    typeMap[getNamedType(fromInputArg).type.name.value].astNode;
  const fromFields = fromInputAst.fields;
  const fromParam = fromFields[0].name.value;
  const fromNodeNeo4jTypeArgs = getNeo4jTypeArguments(fromFields);

  const toType = toTypeArg.value.value;
  const toVar = `${lowFirstLetter(toType)}_to`;
  const toInputArg = args.find(e => e.name.value === 'to').type;
  const toInputAst = typeMap[getNamedType(toInputArg).type.name.value].astNode;
  const toFields = toInputAst.fields;
  const toParam = toFields[0].name.value;
  const toNodeNeo4jTypeArgs = getNeo4jTypeArguments(toFields);

  const relationshipName = relationshipNameArg.value.value;

  const schemaTypeName = safeVar(schemaType);
  const fromVariable = safeVar(fromVar);
  const fromAdditionalLabels = getAdditionalLabels(
    resolveInfo.schema.getType(fromType),
    cypherParams
  );
  const fromLabel = safeLabel([fromType, ...fromAdditionalLabels]);
  const toVariable = safeVar(toVar);
  const toAdditionalLabels = getAdditionalLabels(
    resolveInfo.schema.getType(toType),
    cypherParams
  );
  const toLabel = safeLabel([toType, ...toAdditionalLabels]);
  const relationshipVariable = safeVar(fromVar + toVar);
  const relationshipLabel = safeLabel(relationshipName);
  const fromRootVariable = safeVar('_' + fromVar);
  const toRootVariable = safeVar('_' + toVar);
  const fromNodeNeo4jTypeClauses = neo4jTypePredicateClauses(
    params.from,
    fromVariable,
    fromNodeNeo4jTypeArgs,
    'from'
  );
  const toNodeNeo4jTypeClauses = neo4jTypePredicateClauses(
    params.to,
    toVariable,
    toNodeNeo4jTypeArgs,
    'to'
  );
  // TODO cleaner semantics: remove use of _ prefixes in root variableNames and variableName
  const [subQuery, subParams] = buildCypherSelection({
    selections,
    schemaType,
    resolveInfo,
    parentSelectionInfo: {
      rootType: 'relationship',
      from: `_${fromVar}`,
      to: `_${toVar}`
    },
    variableName: schemaType.name === fromType ? `_${toVar}` : `_${fromVar}`,
    cypherParams: getCypherParams(context)
  });
  params = { ...params, ...subParams };
  let query = `
      MATCH (${fromVariable}:${fromLabel}${
    fromNodeNeo4jTypeClauses && fromNodeNeo4jTypeClauses.length > 0
      ? // uses either a WHERE clause for managed type primary keys (temporal, etc.)
        `) WHERE ${fromNodeNeo4jTypeClauses.join(' AND ')} `
      : // or a an internal matching clause for normal, scalar property primary keys
        ` {${fromParam}: $from.${fromParam}})`
  }
      MATCH (${toVariable}:${toLabel}${
    toNodeNeo4jTypeClauses && toNodeNeo4jTypeClauses.length > 0
      ? `) WHERE ${toNodeNeo4jTypeClauses.join(' AND ')} `
      : ` {${toParam}: $to.${toParam}})`
  }
      OPTIONAL MATCH (${fromVariable})-[${relationshipVariable}:${relationshipLabel}]->(${toVariable})
      DELETE ${relationshipVariable}
      WITH COUNT(*) AS scope, ${fromVariable} AS ${fromRootVariable}, ${toVariable} AS ${toRootVariable}
      RETURN {${subQuery}} AS ${schemaTypeName};
    `;
  return [query, params];
};

const relationshipMergeOrUpdate = ({
  mutationMeta,
  resolveInfo,
  selections,
  schemaType,
  params,
  context
}) => {
  let query = '';
  let relationshipNameArg = undefined;
  let fromTypeArg = undefined;
  let toTypeArg = undefined;
  try {
    relationshipNameArg = mutationMeta.arguments.find(x => {
      return x.name.value === 'relationship';
    });
    fromTypeArg = mutationMeta.arguments.find(x => {
      return x.name.value === 'from';
    });
    toTypeArg = mutationMeta.arguments.find(x => {
      return x.name.value === 'to';
    });
  } catch (e) {
    throw new Error(
      'Missing required argument in MutationMeta directive (relationship, from, or to)'
    );
  }
  if (relationshipNameArg && fromTypeArg && toTypeArg) {
    //TODO: need to handle one-to-one and one-to-many
    const args = getMutationArguments(resolveInfo);
    const typeMap = resolveInfo.schema.getTypeMap();
    const cypherParams = getCypherParams(context);
    const fromType = fromTypeArg.value.value;
    const fromVar = `${lowFirstLetter(fromType)}_from`;
    const fromInputArg = args.find(e => e.name.value === 'from').type;
    const fromInputAst =
      typeMap[getNamedType(fromInputArg).type.name.value].astNode;
    const fromFields = fromInputAst.fields;
    const fromParam = fromFields[0].name.value;
    const fromNodeNeo4jTypeArgs = getNeo4jTypeArguments(fromFields);

    const toType = toTypeArg.value.value;
    const toVar = `${lowFirstLetter(toType)}_to`;
    const toInputArg = args.find(e => e.name.value === 'to').type;
    const toInputAst =
      typeMap[getNamedType(toInputArg).type.name.value].astNode;
    const toFields = toInputAst.fields;
    const toParam = toFields[0].name.value;
    const toNodeNeo4jTypeArgs = getNeo4jTypeArguments(toFields);

    const relationshipName = relationshipNameArg.value.value;
    const lowercased = relationshipName.toLowerCase();
    const dataInputArg = args.find(e => e.name.value === 'data');
    const dataInputAst = dataInputArg
      ? typeMap[getNamedType(dataInputArg.type).type.name.value].astNode
      : undefined;
    const dataFields = dataInputAst ? dataInputAst.fields : [];

    const [preparedParams, paramStatements] = buildCypherParameters({
      args: dataFields,
      params,
      paramKey: 'data',
      resolveInfo
    });
    const schemaTypeName = safeVar(schemaType);
    const fromVariable = safeVar(fromVar);
    const fromAdditionalLabels = getAdditionalLabels(
      resolveInfo.schema.getType(fromType),
      cypherParams
    );
    const fromLabel = safeLabel([fromType, ...fromAdditionalLabels]);
    const toVariable = safeVar(toVar);
    const toAdditionalLabels = getAdditionalLabels(
      resolveInfo.schema.getType(toType),
      cypherParams
    );
    const toLabel = safeLabel([toType, ...toAdditionalLabels]);
    const relationshipVariable = safeVar(lowercased + '_relation');
    const relationshipLabel = safeLabel(relationshipName);
    const fromNodeNeo4jTypeClauses = neo4jTypePredicateClauses(
      preparedParams.from,
      fromVariable,
      fromNodeNeo4jTypeArgs,
      'from'
    );
    const toNodeNeo4jTypeClauses = neo4jTypePredicateClauses(
      preparedParams.to,
      toVariable,
      toNodeNeo4jTypeArgs,
      'to'
    );
    const [subQuery, subParams] = buildCypherSelection({
      selections,
      schemaType,
      resolveInfo,
      parentSelectionInfo: {
        rootType: 'relationship',
        from: fromVar,
        to: toVar,
        variableName: lowercased
      },
      variableName: schemaType.name === fromType ? `${toVar}` : `${fromVar}`,
      cypherParams: getCypherParams(context)
    });
    let cypherOperation = '';
    if (isMergeMutation(resolveInfo)) {
      cypherOperation = 'MERGE';
    } else if (isUpdateMutation(resolveInfo)) {
      cypherOperation = 'MATCH';
    }
    params = { ...preparedParams, ...subParams };
    query = `
      MATCH (${fromVariable}:${fromLabel}${
      fromNodeNeo4jTypeClauses && fromNodeNeo4jTypeClauses.length > 0
        ? // uses either a WHERE clause for managed type primary keys (temporal, etc.)
          `) WHERE ${fromNodeNeo4jTypeClauses.join(' AND ')} `
        : // or a an internal matching clause for normal, scalar property primary keys
          // NOTE this will need to change if we at some point allow for multi field node selection
          ` {${fromParam}: $from.${fromParam}})`
    }
      MATCH (${toVariable}:${toLabel}${
      toNodeNeo4jTypeClauses && toNodeNeo4jTypeClauses.length > 0
        ? `) WHERE ${toNodeNeo4jTypeClauses.join(' AND ')} `
        : ` {${toParam}: $to.${toParam}})`
    }
      ${cypherOperation} (${fromVariable})-[${relationshipVariable}:${relationshipLabel}]->(${toVariable})${
      paramStatements.length > 0
        ? `
      SET ${relationshipVariable} += {${paramStatements.join(',')}} `
        : ''
    }
      RETURN ${relationshipVariable} { ${subQuery} } AS ${schemaTypeName};
    `;
  }
  return [query, params];
};

const nodeMergeOrUpdate = ({
  resolveInfo,
  variableName,
  typeName,
  selections,
  schemaType,
  additionalLabels,
  params
}) => {
  const safeVariableName = safeVar(variableName);
  const args = getMutationArguments(resolveInfo);
  const primaryKeyArg = args[0];
  const primaryKeyArgName = primaryKeyArg.name.value;
  const neo4jTypeArgs = getNeo4jTypeArguments(args);
  const [primaryKeyParam, updateParams] = splitSelectionParameters(
    params,
    primaryKeyArgName,
    'params'
  );
  const neo4jTypeClauses = neo4jTypePredicateClauses(
    primaryKeyParam,
    safeVariableName,
    neo4jTypeArgs,
    'params'
  );
  const predicateClauses = [...neo4jTypeClauses]
    .filter(predicate => !!predicate)
    .join(' AND ');
  const predicate = predicateClauses ? `WHERE ${predicateClauses} ` : '';
  let [preparedParams, paramUpdateStatements] = buildCypherParameters({
    args,
    params: updateParams,
    paramKey: 'params',
    resolveInfo
  });
  let cypherOperation = '';
  let safeLabelName = safeLabel(typeName);
  if (isMergeMutation(resolveInfo)) {
    safeLabelName = safeLabel([typeName, ...additionalLabels]);
    cypherOperation = 'MERGE';
  } else if (isUpdateMutation(resolveInfo)) {
    cypherOperation = 'MATCH';
  }
  let query = `${cypherOperation} (${safeVariableName}:${safeLabelName}${
    predicate !== ''
      ? `) ${predicate} `
      : `{${primaryKeyArgName}: $params.${primaryKeyArgName}})`
  }
  `;
  if (paramUpdateStatements.length > 0) {
    query += `SET ${safeVariableName} += {${paramUpdateStatements.join(',')}} `;
  }
  const [subQuery, subParams] = buildCypherSelection({
    selections,
    variableName,
    schemaType,
    resolveInfo
  });
  preparedParams.params[primaryKeyArgName] = primaryKeyParam[primaryKeyArgName];
  params = { ...preparedParams, ...subParams };
  query += `RETURN ${safeVariableName} {${subQuery}} AS ${safeVariableName}`;
  return [query, params];
};

const neo4jTypeOrderingClauses = (selections, innerSchemaType) => {
  const selectedTypes =
    selections && selections[0] && selections[0].selectionSet
      ? selections[0].selectionSet.selections
      : [];
  return selectedTypes
    .reduce((temporalTypeFields, innerSelection) => {
      // name of temporal type field
      const fieldName = innerSelection.name.value;
      const fieldTypeName = getFieldTypeName(innerSchemaType, fieldName);
      if (isTemporalType(fieldTypeName)) {
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
};

const getFieldTypeName = (schemaType, fieldName) => {
  // TODO handle for fragments?
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

const processFilterArgument = ({
  fieldArgs,
  isFederatedOperation,
  schemaType,
  variableName,
  resolveInfo,
  params,
  paramIndex,
  rootIsRelationType = false
}) => {
  const filterArg = fieldArgs.find(e => e.name.value === 'filter');
  const filterValue = Object.keys(params).length ? params['filter'] : undefined;
  const filterParamKey = paramIndex > 1 ? `${paramIndex - 1}_filter` : `filter`;
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
      filterFieldMap,
      filterCypherParam,
      rootIsRelationType,
      variableName,
      schemaType,
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
  filterOperationType,
  filterValue,
  parentFieldName
}) => {
  const serializedFilterParam = serializeNeo4jTypeParam({
    filterValue,
    filterOperationType,
    parentFieldName
  });
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
      filterOperationType !== 'not_in'
    ) {
      serializedValue = filter['formatted'];
    } else {
      serializedValue = Object.entries(filter).reduce(
        (serialized, [key, value]) => {
          if (Number.isInteger(value)) value = neo4j.int(value);
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
  filterFieldMap,
  filterCypherParam,
  variableName,
  rootIsRelationType,
  schemaType,
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
        rootIsRelationType,
        variableName,
        schemaType,
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
  isListFilterArgument,
  filterValue,
  fieldName,
  rootIsRelationType,
  variableName,
  filterParam,
  parentSchemaType,
  schemaType,
  schema
}) => {
  // parse field name into prefix (ex: name, company) and
  // possible suffix identifying operation type (ex: _gt, _in)
  const parsedFilterName = parseFilterArgumentName(fieldName);
  const filterOperationField = parsedFilterName.name;
  const filterOperationType = parsedFilterName.type;
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
      isListFilterArgument,
      filterOperationField,
      filterOperationType,
      filterValue,
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
      filterOperationField,
      filterOperationType,
      filterValue,
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
  isListFilterArgument,
  filterOperationField,
  filterOperationType,
  filterValue,
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
  filterOperationField,
  filterOperationType,
  filterValue,
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
          variableName,
          filterOperationField,
          filterOperationType,
          fieldName,
          filterParam,
          parameterPath,
          parentParamPath,
          isListFilterArgument,
          nullFieldPredicate
        });
      } else if (isRelation || isRelationType || isRelationTypeNode) {
        return translateRelationFilter({
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
      if (fieldName === 'from') {
        isReflexiveTypeDirectedField = true;
        relDirection = 'IN';
      } else if (fieldName === 'to') {
        isReflexiveTypeDirectedField = true;
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
      const filteredType =
        innerSchemaType && innerSchemaType.name ? innerSchemaType.name : '';
      // then the connecting node type field on a relationship type filter
      // may be incoming or outgoing; thisType could be .from or .to
      if (filteredType === thisType) {
        // then a filter argument for the incoming direction is being used
        // when querying the node type it goes out from
        thisType = relatedType;
        relatedType = filteredType;
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
  parentFieldName,
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
  return Object.entries(filterValue)
    .reduce((predicates, [name, value]) => {
      name = deserializeFilterFieldName(name);
      const predicate = translateFilterArgument({
        parentParamPath: listVariable,
        fieldName: name,
        filterValue: value,
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
  variableName,
  filterOperationField,
  filterOperationType,
  fieldName,
  filterParam,
  parameterPath,
  parentParamPath,
  isListFilterArgument,
  nullFieldPredicate
}) => {
  const safeVariableName = safeVar(variableName);
  let propertyPath = `${safeVariableName}.${filterOperationField}`;
  let predicate = '';
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
  const rootPredicateFunction = decidePredicateFunction({
    isRelationTypeNode,
    filterOperationField,
    filterOperationType
  });
  predicate = buildNeo4jTypePredicate({
    fieldName,
    filterOperationField,
    filterOperationType,
    filterValue,
    parameterPath,
    variableName,
    nullFieldPredicate,
    rootPredicateFunction,
    cypherTypeConstructor,
    isTemporalFilter,
    isSpatialFilter
  });
  return predicate;
};

const buildNeo4jTypeTranslation = ({
  filterOperationType,
  listVariable,
  isTemporalFilter,
  isSpatialFilter,
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
    (isIdentityFilter || isListFilterArgument)
  ) {
    const generalizedComparisonPredicates = Object.keys(filterValue).map(
      filterName => {
        const isTemporalFormatted =
          isTemporalFilter && filterName === 'formatted';
        if (nullFieldPredicate || isListFilterArgument) {
          nullFieldPredicate = `${listVariable}.${filterName} IS NULL OR `;
        }
        if (isTemporalFormatted) {
          return `(${nullFieldPredicate}${propertyPath} = ${cypherTypeConstructor}(${listVariable}.${filterName}))`;
        } else {
          return `(${nullFieldPredicate}${propertyPath}.${filterName} = ${listVariable}.${filterName})`;
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
