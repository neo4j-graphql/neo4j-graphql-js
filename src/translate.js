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
  getTemporalArguments,
  temporalPredicateClauses,
  isTemporalType,
  isTemporalInputType,
  isGraphqlScalarType,
  isGraphqlInterfaceType,
  innerType,
  relationDirective,
  typeIdentifiers,
  decideTemporalConstructor,
  getAdditionalLabels
} from './utils';
import {
  getNamedType,
  isScalarType,
  isEnumType,
  isObjectType,
  isInputType,
  isListType
} from 'graphql';
import { buildCypherSelection } from './selections';
import _ from 'lodash';
import { v1 as neo4j } from 'neo4j-driver';

export const customCypherField = ({
  customCypher,
  cypherParams,
  paramIndex,
  schemaTypeRelation,
  initial,
  fieldName,
  fieldType,
  nestedVariable,
  variableName,
  headSelection,
  schemaType,
  resolveInfo,
  subSelection,
  skipLimit,
  commaIfTail,
  tailParams
}) => {
  if (schemaTypeRelation) {
    variableName = `${variableName}_relation`;
  }
  const fieldIsList = !!fieldType.ofType;
  const fieldIsInterfaceType =
    fieldIsList &&
    fieldType.ofType.astNode &&
    fieldType.ofType.astNode.kind === 'InterfaceTypeDefinition';
  // similar: [ x IN apoc.cypher.runFirstColumn("WITH {this} AS this MATCH (this)--(:Genre)--(o:Movie) RETURN o", {this: movie}, true) |x {.title}][1..2])

  // For @cypher fields with object payload types, customCypherField is
  // called after the recursive call to compute a subSelection. But recurse()
  // increments paramIndex. So here we need to decrement it in order to map
  // appropriately to the indexed keys produced in getFilterParams()
  const cypherFieldParamsIndex = paramIndex - 1;
  return {
    initial: `${initial}${fieldName}: ${
      fieldIsList ? '' : 'head('
    }[ ${nestedVariable} IN apoc.cypher.runFirstColumn("${customCypher}", {${cypherDirectiveArgs(
      variableName,
      headSelection,
      cypherParams,
      schemaType,
      resolveInfo,
      cypherFieldParamsIndex
    )}}, true) | ${nestedVariable} {${
      fieldIsInterfaceType ? `FRAGMENT_TYPE: labels(${nestedVariable})[0],` : ''
    }${subSelection[0]}}]${fieldIsList ? '' : ')'}${skipLimit} ${commaIfTail}`,
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
  isInlineFragment,
  innerSchemaType,
  paramIndex,
  fieldArgs,
  filterParams,
  selectionFilters,
  temporalArgs,
  selections,
  schemaType,
  subSelection,
  skipLimit,
  commaIfTail,
  tailParams,
  temporalClauses,
  resolveInfo,
  cypherParams
}) => {
  const safeVariableName = safeVar(nestedVariable);
  const allParams = innerFilterParams(filterParams, temporalArgs);
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
  const arrayPredicates = _.map(arrayFilterParams, (value, key) => {
    const param = _.find(allParams, param => param.key === key);
    return `${safeVariableName}.${safeVar(key)} IN $${
      param.value.index
    }_${key}`;
  });
  const whereClauses = [
    ...temporalClauses,
    ...arrayPredicates,
    ...filterPredicates
  ];
  const orderByParam = filterParams['orderBy'];
  const temporalOrdering = temporalOrderingFieldExists(
    schemaType,
    filterParams
  );
  return {
    selection: {
      initial: `${initial}${fieldName}: ${
        !isArrayType(fieldType) ? 'head(' : ''
      }${
        orderByParam
          ? temporalOrdering
            ? `[sortedElement IN apoc.coll.sortMulti(`
            : `apoc.coll.sortMulti(`
          : ''
      }[(${safeVar(variableName)})${
        relDirection === 'in' || relDirection === 'IN' ? '<' : ''
      }-[:${safeLabel([relType])}]-${
        relDirection === 'out' || relDirection === 'OUT' ? '>' : ''
      }(${safeVariableName}${
        !isInlineFragment
          ? `:${safeLabel([
              innerSchemaType.name,
              ...getAdditionalLabels(
                resolveInfo.schema.getType(innerSchemaType.name),
                cypherParams
              )
            ])}`
          : ''
      }${queryParams})${
        whereClauses.length > 0 ? ` WHERE ${whereClauses.join(' AND ')}` : ''
      } | ${nestedVariable} {${
        isInlineFragment
          ? `FRAGMENT_TYPE: labels(${nestedVariable})[0]${
              subSelection[0] ? `, ${subSelection[0]}` : ''
            }`
          : subSelection[0]
      }}]${
        orderByParam
          ? `, [${buildSortMultiArgs(orderByParam)}])${
              temporalOrdering
                ? ` | sortedElement { .*,  ${temporalTypeSelections(
                    selections,
                    innerSchemaType
                  )}}]`
                : ``
            }`
          : ''
      }${!isArrayType(fieldType) ? ')' : ''}${skipLimit} ${commaIfTail}`,
      ...tailParams
    },
    subSelection
  };
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
  temporalArgs,
  resolveInfo,
  selectionFilters,
  paramIndex,
  fieldArgs,
  cypherParams
}) => {
  if (innerSchemaTypeRelation.from === innerSchemaTypeRelation.to) {
    return {
      selection: {
        initial: `${initial}${fieldName}: {${
          subSelection[0]
        }}${skipLimit} ${commaIfTail}`,
        ...tailParams
      },
      subSelection
    };
  }
  const relationshipVariableName = `${nestedVariable}_relation`;
  const temporalClauses = temporalPredicateClauses(
    filterParams,
    relationshipVariableName,
    temporalArgs
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

  const whereClauses = [...temporalClauses, ...filterPredicates];
  return {
    selection: {
      initial: `${initial}${fieldName}: ${
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
      }${skipLimit} ${commaIfTail}`,
      ...tailParams
    },
    subSelection
  };
};

export const nodeTypeFieldOnRelationType = ({
  fieldInfo,
  schemaTypeRelation,
  innerSchemaType,
  isInlineFragment,
  paramIndex,
  schemaType,
  filterParams,
  temporalArgs,
  parentSelectionInfo,
  resolveInfo,
  selectionFilters,
  fieldArgs,
  cypherParams
}) => {
  if (
    isRootSelection({
      selectionInfo: parentSelectionInfo,
      rootType: 'relationship'
    }) &&
    isRelationTypeDirectedField(fieldInfo.fieldName)
  ) {
    return {
      selection: relationTypeMutationPayloadField({
        ...fieldInfo,
        parentSelectionInfo
      }),
      subSelection: fieldInfo.subSelection
    };
  }
  // Normal case of schemaType with a relationship directive
  return directedNodeTypeFieldOnRelationType({
    ...fieldInfo,
    schemaTypeRelation,
    innerSchemaType,
    isInlineFragment,
    paramIndex,
    schemaType,
    filterParams,
    temporalArgs,
    resolveInfo,
    selectionFilters,
    fieldArgs,
    cypherParams
  });
};

const relationTypeMutationPayloadField = ({
  initial,
  fieldName,
  variableName,
  subSelection,
  skipLimit,
  commaIfTail,
  tailParams,
  parentSelectionInfo
}) => {
  const safeVariableName = safeVar(variableName);
  return {
    initial: `${initial}${fieldName}: ${safeVariableName} {${
      subSelection[0]
    }}${skipLimit} ${commaIfTail}`,
    ...tailParams,
    variableName:
      fieldName === 'from' ? parentSelectionInfo.to : parentSelectionInfo.from
  };
};

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
  isInlineFragment,
  filterParams,
  temporalArgs,
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
      const temporalClauses = temporalPredicateClauses(
        filterParams,
        temporalFieldRelationshipVariableName,
        temporalArgs
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
      const whereClauses = [...temporalClauses, ...filterPredicates];
      return {
        selection: {
          initial: `${initial}${fieldName}: ${
            !isArrayType(fieldType) ? 'head(' : ''
          }[(${safeVar(variableName)})${isFromField ? '<' : ''}-[${safeVar(
            relationshipVariableName
          )}:${safeLabel(relType)}${queryParams}]-${
            isToField ? '>' : ''
          }(${safeVar(nestedVariable)}${
            !isInlineFragment
              ? `:${safeLabel([
                  fromTypeName,
                  ...getAdditionalLabels(
                    resolveInfo.schema.getType(fromTypeName),
                    cypherParams
                  )
                ])}`
              : ''
          }) ${
            whereClauses.length > 0
              ? `WHERE ${whereClauses.join(' AND ')} `
              : ''
          }| ${relationshipVariableName} {${
            isInlineFragment
              ? `FRAGMENT_TYPE: labels(${nestedVariable})[0]${
                  subSelection[0] ? `, ${subSelection[0]}` : ''
                }`
              : subSelection[0]
          }}]${!isArrayType(fieldType) ? ')' : ''}${skipLimit} ${commaIfTail}`,
          ...tailParams
        },
        subSelection
      };
    } else {
      // Case of a renamed directed field
      // e.g., 'from: Movie' -> 'Movie: Movie'
      return {
        selection: {
          initial: `${initial}${fieldName}: ${variableName} {${
            subSelection[0]
          }}${skipLimit} ${commaIfTail}`,
          ...tailParams
        },
        subSelection
      };
    }
  } else {
    variableName = variableName + '_relation';
    return {
      selection: {
        initial: `${initial}${fieldName}: ${
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
          !isInlineFragment
            ? safeLabel([
                innerSchemaType.name,
                ...getAdditionalLabels(
                  resolveInfo.schema.getType(innerSchemaType.name),
                  cypherParams
                )
              ])
            : ''
        }${queryParams}) | ${nestedVariable} {${
          isInlineFragment
            ? `FRAGMENT_TYPE: labels(${nestedVariable})[0]${
                subSelection[0] ? `, ${subSelection[0]}` : ''
              }`
            : subSelection[0]
        }}]${!isArrayType(fieldType) ? ')' : ''}${skipLimit} ${commaIfTail}`,
        ...tailParams
      },
      subSelection
    };
  }
};

export const temporalField = ({
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
              ? `toString(TEMPORAL_INSTANCE)`
              : `TEMPORAL_INSTANCE.${fieldName}`
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

export const temporalType = ({
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
  let fieldIsArray = isArrayType(fieldType);
  if (!isNodeType(schemaType.astNode)) {
    if (
      isRelationTypePayload(schemaType) &&
      schemaTypeRelation.from === schemaTypeRelation.to
    ) {
      variableName = `${nestedVariable}_relation`;
    } else {
      if (fieldIsArray) {
        if (
          isRootSelection({
            selectionInfo: parentSelectionInfo,
            rootType: 'relationship'
          })
        ) {
          if (schemaTypeRelation.from === schemaTypeRelation.to) {
            variableName = `${parentVariableName}_relation`;
          } else {
            variableName = `${parentVariableName}_relation`;
          }
        } else {
          variableName = `${variableName}_relation`;
        }
      } else {
        variableName = `${nestedVariable}_relation`;
      }
    }
  }
  return {
    initial: `${initial}${fieldName}: ${
      fieldIsArray
        ? `reduce(a = [], TEMPORAL_INSTANCE IN ${variableName}.${fieldName} | a + {${
            subSelection[0]
          }})${commaIfTail}`
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
  selections,
  variableName,
  typeName,
  schemaType,
  first,
  offset,
  _id,
  orderBy,
  otherParams
}) => {
  const [nullParams, nonNullParams] = filterNullParams({
    offset,
    first,
    otherParams
  });
  const filterParams = getFilterParams(nonNullParams);
  const queryArgs = getQueryArguments(resolveInfo);
  const temporalArgs = getTemporalArguments(queryArgs);
  const queryTypeCypherDirective = getQueryCypherDirective(resolveInfo);
  const cypherParams = getCypherParams(context);
  const queryParams = paramsToString(
    innerFilterParams(
      filterParams,
      temporalArgs,
      null,
      queryTypeCypherDirective ? true : false
    ),
    cypherParams
  );
  const safeVariableName = safeVar(variableName);
  const temporalClauses = temporalPredicateClauses(
    filterParams,
    safeVariableName,
    temporalArgs
  );
  const outerSkipLimit = getOuterSkipLimit(first, offset);
  const orderByValue = computeOrderBy(resolveInfo, schemaType);

  if (queryTypeCypherDirective) {
    return customQuery({
      resolveInfo,
      cypherParams,
      schemaType,
      argString: queryParams,
      selections,
      variableName,
      typeName,
      orderByValue,
      outerSkipLimit,
      queryTypeCypherDirective,
      nonNullParams
    });
  } else {
    const additionalLabels = getAdditionalLabels(schemaType, cypherParams);

    return nodeQuery({
      resolveInfo,
      cypherParams,
      schemaType,
      argString: queryParams,
      selections,
      variableName,
      typeName,
      additionalLabels,
      temporalClauses,
      orderByValue,
      outerSkipLimit,
      nullParams,
      nonNullParams,
      filterParams,
      temporalArgs,
      _id
    });
  }
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
  typeName,
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
  const isInterfaceType = isGraphqlInterfaceType(schemaType);
  const temporalType = isTemporalType(schemaType.name);
  const { cypherPart: orderByClause } = orderByValue;
  const query = `WITH apoc.cypher.runFirstColumn("${
    cypherQueryArg.value.value
  }", ${argString ||
    'null'}, True) AS x UNWIND x AS ${safeVariableName} RETURN ${safeVariableName} ${
    // Don't add subQuery for scalar type payloads
    // FIXME: fix subselection translation for temporal type payload
    !temporalType && !isScalarType
      ? `{${
          isInterfaceType
            ? `FRAGMENT_TYPE: labels(${safeVariableName})[0],`
            : ''
        }${subQuery}} AS ${safeVariableName}${orderByClause}`
      : ''
  }${outerSkipLimit}`;
  return [query, params];
};

// Generated API
const nodeQuery = ({
  resolveInfo,
  cypherParams,
  schemaType,
  selections,
  variableName,
  typeName,
  additionalLabels = [],
  temporalClauses,
  orderByValue,
  outerSkipLimit,
  nullParams,
  nonNullParams,
  filterParams,
  temporalArgs,
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
    paramIndex: rootParamIndex
  });

  const fieldArgs = getQueryArguments(resolveInfo);
  const [filterPredicates, serializedFilter] = processFilterArgument({
    fieldArgs,
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
  const args = innerFilterParams(filterParams, temporalArgs);

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

  const predicateClauses = [
    idWherePredicate,
    ...filterPredicates,
    ...nullFieldPredicates,
    ...temporalClauses,
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
  }RETURN ${safeVariableName} {${subQuery}} AS ${safeVariableName}${
    optimization.earlyOrderBy ? '' : orderByClause
  }${outerSkipLimit}`;

  return [query, params];
};

// Mutation API root operation branch
export const translateMutation = ({
  resolveInfo,
  context,
  schemaType,
  selections,
  variableName,
  typeName,
  first,
  offset,
  otherParams
}) => {
  const outerSkipLimit = getOuterSkipLimit(first, offset);
  const orderByValue = computeOrderBy(resolveInfo, schemaType);
  const additionalNodeLabels = getAdditionalLabels(
    schemaType,
    getCypherParams(context)
  );
  const mutationTypeCypherDirective = getMutationCypherDirective(resolveInfo);
  const params = initializeMutationParams({
    resolveInfo,
    mutationTypeCypherDirective,
    first,
    otherParams,
    offset
  });
  const mutationInfo = {
    params,
    selections,
    schemaType,
    resolveInfo
  };
  if (mutationTypeCypherDirective) {
    return customMutation({
      ...mutationInfo,
      context,
      mutationTypeCypherDirective,
      variableName,
      orderByValue,
      outerSkipLimit
    });
  } else if (isCreateMutation(resolveInfo)) {
    return nodeCreate({
      ...mutationInfo,
      variableName,
      typeName,
      additionalLabels: additionalNodeLabels
    });
  } else if (isUpdateMutation(resolveInfo)) {
    return nodeUpdate({
      ...mutationInfo,
      variableName,
      typeName,
      additionalLabels: additionalNodeLabels
    });
  } else if (isDeleteMutation(resolveInfo)) {
    return nodeDelete({
      ...mutationInfo,
      variableName,
      typeName,
      additionalLabels: additionalNodeLabels
    });
  } else if (isAddMutation(resolveInfo)) {
    return relationshipCreate({
      ...mutationInfo,
      context
    });
  } else if (isRemoveMutation(resolveInfo)) {
    return relationshipDelete({
      ...mutationInfo,
      variableName,
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
  const isInterfaceType = isGraphqlInterfaceType(schemaType);
  const temporalType = isTemporalType(schemaType.name);
  params = { ...params, ...subParams };
  if (cypherParams) {
    params['cypherParams'] = cypherParams;
  }
  const { cypherPart: orderByClause } = orderByValue;
  const query = `CALL apoc.cypher.doIt("${
    cypherQueryArg.value.value
  }", ${argString}) YIELD value
    WITH apoc.map.values(value, [keys(value)[0]])[0] AS ${safeVariableName}
    RETURN ${safeVariableName} ${
    !temporalType && !isScalarType
      ? `{${
          isInterfaceType
            ? `FRAGMENT_TYPE: labels(${safeVariableName})[0],`
            : ''
        }${subQuery}} AS ${safeVariableName}${orderByClause}${outerSkipLimit}`
      : ''
  }`;
  return [query, params];
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
    paramKey: 'params'
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

const nodeUpdate = ({
  resolveInfo,
  variableName,
  typeName,
  selections,
  schemaType,
  additionalLabels,
  params
}) => {
  const safeVariableName = safeVar(variableName);
  const safeLabelName = safeLabel([typeName, ...additionalLabels]);

  const args = getMutationArguments(resolveInfo);
  const primaryKeyArg = args[0];
  const primaryKeyArgName = primaryKeyArg.name.value;
  const temporalArgs = getTemporalArguments(args);
  const [primaryKeyParam, updateParams] = splitSelectionParameters(
    params,
    primaryKeyArgName,
    'params'
  );
  const temporalClauses = temporalPredicateClauses(
    primaryKeyParam,
    safeVariableName,
    temporalArgs,
    'params'
  );
  const predicateClauses = [...temporalClauses]
    .filter(predicate => !!predicate)
    .join(' AND ');
  const predicate = predicateClauses ? `WHERE ${predicateClauses} ` : '';
  let [preparedParams, paramUpdateStatements] = buildCypherParameters({
    args,
    params: updateParams,
    paramKey: 'params'
  });
  let query = `MATCH (${safeVariableName}:${safeLabelName}${
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

const nodeDelete = ({
  resolveInfo,
  selections,
  variableName,
  typeName,
  schemaType,
  additionalLabels,
  params
}) => {
  const safeVariableName = safeVar(variableName);
  const safeLabelName = safeLabel([typeName, ...additionalLabels]);
  const args = getMutationArguments(resolveInfo);
  const primaryKeyArg = args[0];
  const primaryKeyArgName = primaryKeyArg.name.value;
  const temporalArgs = getTemporalArguments(args);
  const [primaryKeyParam] = splitSelectionParameters(params, primaryKeyArgName);
  const temporalClauses = temporalPredicateClauses(
    primaryKeyParam,
    safeVariableName,
    temporalArgs
  );
  let [preparedParams] = buildCypherParameters({ args, params });
  let query = `MATCH (${safeVariableName}:${safeLabelName}${
    temporalClauses.length > 0
      ? `) WHERE ${temporalClauses.join(' AND ')}`
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
  const fromTemporalArgs = getTemporalArguments(fromFields);

  const toType = toTypeArg.value.value;
  const toVar = `${lowFirstLetter(toType)}_to`;
  const toInputArg = args.find(e => e.name.value === 'to').type;
  const toInputAst = typeMap[getNamedType(toInputArg).type.name.value].astNode;
  const toFields = toInputAst.fields;
  const toParam = toFields[0].name.value;
  const toTemporalArgs = getTemporalArguments(toFields);

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
    paramKey: 'data'
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
  const fromTemporalClauses = temporalPredicateClauses(
    preparedParams.from,
    fromVariable,
    fromTemporalArgs,
    'from'
  );
  const toTemporalClauses = temporalPredicateClauses(
    preparedParams.to,
    toVariable,
    toTemporalArgs,
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
    fromTemporalClauses && fromTemporalClauses.length > 0
      ? // uses either a WHERE clause for managed type primary keys (temporal, etc.)
        `) WHERE ${fromTemporalClauses.join(' AND ')} `
      : // or a an internal matching clause for normal, scalar property primary keys
        // NOTE this will need to change if we at some point allow for multi field node selection
        ` {${fromParam}: $from.${fromParam}})`
  }
      MATCH (${toVariable}:${toLabel}${
    toTemporalClauses && toTemporalClauses.length > 0
      ? `) WHERE ${toTemporalClauses.join(' AND ')} `
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
  variableName,
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
  const fromTemporalArgs = getTemporalArguments(fromFields);

  const toType = toTypeArg.value.value;
  const toVar = `${lowFirstLetter(toType)}_to`;
  const toInputArg = args.find(e => e.name.value === 'to').type;
  const toInputAst = typeMap[getNamedType(toInputArg).type.name.value].astNode;
  const toFields = toInputAst.fields;
  const toParam = toFields[0].name.value;
  const toTemporalArgs = getTemporalArguments(toFields);

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
  const fromTemporalClauses = temporalPredicateClauses(
    params.from,
    fromVariable,
    fromTemporalArgs,
    'from'
  );
  const toTemporalClauses = temporalPredicateClauses(
    params.to,
    toVariable,
    toTemporalArgs,
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
    fromTemporalClauses && fromTemporalClauses.length > 0
      ? // uses either a WHERE clause for managed type primary keys (temporal, etc.)
        `) WHERE ${fromTemporalClauses.join(' AND ')} `
      : // or a an internal matching clause for normal, scalar property primary keys
        ` {${fromParam}: $from.${fromParam}})`
  }
      MATCH (${toVariable}:${toLabel}${
    toTemporalClauses && toTemporalClauses.length > 0
      ? `) WHERE ${toTemporalClauses.join(' AND ')} `
      : ` {${toParam}: $to.${toParam}})`
  }
      OPTIONAL MATCH (${fromVariable})-[${relationshipVariable}:${relationshipLabel}]->(${toVariable})
      DELETE ${relationshipVariable}
      WITH COUNT(*) AS scope, ${fromVariable} AS ${fromRootVariable}, ${toVariable} AS ${toRootVariable}
      RETURN {${subQuery}} AS ${schemaTypeName};
    `;
  return [query, params];
};

const temporalTypeSelections = (selections, innerSchemaType) => {
  // TODO use extractSelections instead?
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
      const fieldName = e.substring(0, e.indexOf('_'));
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
      fieldName = e.substring(0, e.indexOf('_'));
      return e.includes('_asc') ? `'^${fieldName}'` : `'${fieldName}'`;
    })
    .join(',');
};

const processFilterArgument = ({
  fieldArgs,
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
  // if field has both a filter argument and argument data is provided
  if (filterArg && filterValue) {
    const schema = resolveInfo.schema;
    const typeName = getNamedType(filterArg).type.name.value;
    const filterSchemaType = schema.getType(typeName);
    // get fields of filter type
    const typeFields = filterSchemaType.getFields();
    const [filterFieldMap, serializedFilterParam] = analyzeFilterArguments({
      filterValue,
      typeFields,
      variableName,
      filterCypherParam,
      schemaType,
      schema
    });
    translations = translateFilterArguments({
      filterFieldMap,
      typeFields,
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
  typeFields,
  variableName,
  filterCypherParam,
  schemaType,
  schema
}) => {
  return Object.entries(filterValue).reduce(
    ([filterFieldMap, serializedParams], [name, value]) => {
      const [serializedValue, fieldMap] = analyzeFilterArgument({
        field: typeFields[name],
        filterValue: value,
        filterValues: filterValue,
        fieldName: name,
        filterParam: filterCypherParam,
        variableName,
        schemaType,
        schema
      });
      const filterParamName = serializeFilterFieldName(name, value);
      filterFieldMap[filterParamName] = fieldMap;
      serializedParams[filterParamName] = serializedValue;
      return [filterFieldMap, serializedParams];
    },
    [{}, {}]
  );
};

const analyzeFilterArgument = ({
  parentFieldName,
  field,
  filterValue,
  fieldName,
  variableName,
  filterParam,
  parentSchemaType,
  schemaType,
  schema
}) => {
  const fieldType = field.type;
  const innerFieldType = innerType(fieldType);
  const typeName = innerFieldType.name;
  const parsedFilterName = parseFilterArgumentName(fieldName);
  let filterOperationField = parsedFilterName.name;
  let filterOperationType = parsedFilterName.type;
  // defaults
  let filterMapValue = true;
  let serializedFilterParam = filterValue;
  if (isScalarType(innerFieldType) || isEnumType(innerFieldType)) {
    if (isExistentialFilter(filterOperationType, filterValue)) {
      serializedFilterParam = true;
      filterMapValue = null;
    }
  } else if (isInputType(innerFieldType)) {
    // check when filterSchemaType the same as schemaTypeField
    const filterSchemaType = schema.getType(typeName);
    const typeFields = filterSchemaType.getFields();
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
        typeFields,
        schema
      });
    } else {
      const schemaTypeField = schemaType.getFields()[filterOperationField];
      const innerSchemaType = innerType(schemaTypeField.type);
      if (isObjectType(innerSchemaType)) {
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
        } else if (isTemporalInputType(typeName)) {
          serializedFilterParam = serializeTemporalParam(filterValue);
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
              typeFields,
              schema
            }
          );
        }
      }
    }
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
  typeFields,
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
        field: typeFields[fieldName],
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

const serializeTemporalParam = filterValue => {
  const isList = Array.isArray(filterValue);
  if (!isList) filterValue = [filterValue];
  let serializedValues = filterValue.reduce((serializedValues, filter) => {
    let serializedValue = {};
    if (filter['formatted']) serializedValue = filter['formatted'];
    else {
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
  typeFields,
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
        field: typeFields[name],
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
  field,
  filterValue,
  fieldName,
  rootIsRelationType,
  variableName,
  filterParam,
  parentSchemaType,
  schemaType,
  schema
}) => {
  const fieldType = field.type;
  const innerFieldType = innerType(fieldType);
  // get name of filter field type (ex: _PersonFilter)
  const typeName = innerFieldType.name;
  // build path for parameter data for current filter field
  const parameterPath = `${
    parentParamPath ? parentParamPath : filterParam
  }.${fieldName}`;
  // parse field name into prefix (ex: name, company) and
  // possible suffix identifying operation type (ex: _gt, _in)
  const parsedFilterName = parseFilterArgumentName(fieldName);
  let filterOperationField = parsedFilterName.name;
  let filterOperationType = parsedFilterName.type;
  // short-circuit evaluation: predicate used to skip a field
  // if processing a list of objects that possibly contain different arguments
  const nullFieldPredicate = decideNullSkippingPredicate({
    parameterPath,
    isListFilterArgument,
    parentParamPath
  });
  let translation = '';
  if (isScalarType(innerFieldType) || isEnumType(innerFieldType)) {
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
  } else if (isInputType(innerFieldType)) {
    translation = translateInputFilter({
      rootIsRelationType,
      isListFilterArgument,
      filterOperationField,
      filterOperationType,
      filterValue,
      variableName,
      fieldName,
      filterParam,
      typeName,
      fieldType,
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
    '_every'
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
  return `${nullFieldPredicate}${buildOperatorExpression(
    filterOperationType,
    propertyPath
  )} ${parameterPath}`;
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

const buildOperatorExpression = (
  filterOperationType,
  propertyPath,
  isListFilterArgument
) => {
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
    case 'lt':
      return `${propertyPath} <`;
    case 'lte':
      return `${propertyPath} <=`;
    case 'gt':
      return `${propertyPath} >`;
    case 'gte':
      return `${propertyPath} >=`;
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
  typeName,
  fieldType,
  schema,
  parentSchemaType,
  schemaType,
  parameterPath,
  parentParamPath,
  parentFieldName,
  nullFieldPredicate
}) => {
  // check when filterSchemaType the same as schemaTypeField
  const filterSchemaType = schema.getType(typeName);
  const typeFields = filterSchemaType.getFields();
  if (fieldName === 'AND' || fieldName === 'OR') {
    return translateLogicalFilter({
      filterValue,
      variableName,
      filterOperationType,
      filterOperationField,
      fieldName,
      filterParam,
      typeFields,
      schema,
      schemaType,
      parameterPath,
      nullFieldPredicate
    });
  } else {
    const schemaTypeField = schemaType.getFields()[filterOperationField];
    const innerSchemaType = innerType(schemaTypeField.type);
    if (isObjectType(innerSchemaType)) {
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
      if (isTemporalInputType(typeName)) {
        const temporalFunction = decideTemporalConstructor(typeName);
        return translateTemporalFilter({
          isRelationTypeNode,
          filterValue,
          variableName,
          filterOperationField,
          filterOperationType,
          fieldName,
          filterParam,
          fieldType,
          parameterPath,
          parentParamPath,
          isListFilterArgument,
          nullFieldPredicate,
          temporalFunction
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
          typeFields,
          fieldType,
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
  typeFields,
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
    typeFields,
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
  typeFields,
  fieldType,
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
  if (isReflexiveTypeDirectedField) {
    // causes the 'from' and 'to' fields on the payload of a reflexive
    // relation type to use the parent field name, ex: 'knows_some'
    // is used for 'from' and 'to' in 'knows_some: { from: {}, to: {} }'
    const parsedFilterName = parseFilterArgumentName(parentFieldName);
    filterOperationField = parsedFilterName.name;
    filterOperationType = parsedFilterName.type;
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
    filterOperationField,
    filterOperationType
  });
  return buildRelationPredicate({
    rootIsRelationType,
    isRelationType,
    isListFilterArgument,
    isReflexiveRelationType,
    isReflexiveTypeDirectedField,
    thisType,
    relatedType,
    schemaType,
    innerSchemaType,
    fieldName,
    fieldType,
    filterOperationType,
    filterValue,
    filterParam,
    typeFields,
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
    [thisType, relatedType, relDirection] = decideRelationTypeDirection(
      schemaType,
      innerRelationTypeDirective
    );
    if (thisType === relatedType) {
      isReflexiveRelationType = true;
      if (fieldName === 'from') {
        isReflexiveTypeDirectedField = true;
        relDirection = 'IN';
      } else if (fieldName === 'to') {
        isReflexiveTypeDirectedField = true;
        relDirection = 'OUT';
      }
    }
    relLabel = innerRelationTypeDirective.name;
  } else if (relationTypeDirective) {
    isRelationTypeNode = true;
    [thisType, relatedType, relDirection] = decideRelationTypeDirection(
      parentSchemaType,
      relationTypeDirective
    );
    relLabel = variableName;
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

const decideRelationTypeDirection = (schemaType, relationTypeDirective) => {
  let fromType = relationTypeDirective.from;
  let toType = relationTypeDirective.to;
  let relDirection = 'OUT';
  if (fromType !== toType) {
    if (schemaType && schemaType.name === toType) {
      const temp = fromType;
      fromType = toType;
      toType = temp;
      relDirection = 'IN';
    }
  }
  return [fromType, toType, relDirection];
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
  fieldType,
  filterOperationType,
  filterValue,
  filterParam,
  typeFields,
  schema,
  parameterPath,
  nullFieldPredicate,
  pathExistencePredicate,
  predicateListVariable,
  rootPredicateFunction
}) => {
  let relationVariable = buildRelationVariable(thisType, relatedType);
  const isRelationList = isListType(fieldType);
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
    typeFields,
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
  const thisTypeVariable = safeVar(thisType.toLowerCase());
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
  typeFields,
  schema,
  isListFilterArgument
}) => {
  return Object.entries(filterValue)
    .reduce((predicates, [name, value]) => {
      name = deserializeFilterFieldName(name);
      const predicate = translateFilterArgument({
        field: typeFields[name],
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

const translateTemporalFilter = ({
  isRelationTypeNode,
  filterValue,
  variableName,
  filterOperationField,
  filterOperationType,
  fieldName,
  filterParam,
  fieldType,
  parameterPath,
  parentParamPath,
  isListFilterArgument,
  nullFieldPredicate,
  temporalFunction
}) => {
  const safeVariableName = safeVar(variableName);
  const propertyPath = `${safeVariableName}.${filterOperationField}`;
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
  return buildTemporalPredicate({
    fieldName,
    fieldType,
    filterValue,
    filterOperationField,
    filterOperationType,
    parameterPath,
    variableName,
    nullFieldPredicate,
    rootPredicateFunction,
    temporalFunction
  });
};

const buildTemporalPredicate = ({
  fieldName,
  fieldType,
  filterOperationField,
  filterOperationType,
  parameterPath,
  variableName,
  nullFieldPredicate,
  rootPredicateFunction,
  temporalFunction
}) => {
  // ex: project -> person_filter_project
  const isListFilterArgument = isListType(fieldType);
  let listVariable = parameterPath;
  // ex: $filter.datetime_in -> _datetime_in
  if (isListFilterArgument) listVariable = `_${fieldName}`;
  const safeVariableName = safeVar(variableName);
  const propertyPath = `${safeVariableName}.${filterOperationField}`;
  const operatorExpression = buildOperatorExpression(
    filterOperationType,
    propertyPath,
    isListFilterArgument
  );
  let translation = `(${nullFieldPredicate}${operatorExpression} ${temporalFunction}(${listVariable}))`;
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
