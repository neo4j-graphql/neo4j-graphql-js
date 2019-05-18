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
  getRelationTypeDirectiveArgs,
  isRelationTypeDirectedField,
  isRelationTypePayload,
  isRootSelection,
  splitSelectionParameters,
  getTemporalArguments,
  temporalPredicateClauses,
  isTemporalType,
  isGraphqlScalarType,
  innerType,
  relationDirective,
  typeIdentifiers
} from './utils';
import {
  getNamedType,
  isScalarType,
  isEnumType,
  isInputType,
  isListType
} from 'graphql';
import { buildCypherSelection } from './selections';
import _ from 'lodash';

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
    )}}, true) | ${nestedVariable} {${subSelection[0]}}]${
      fieldIsList ? '' : ')'
    }${skipLimit} ${commaIfTail}`,
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
  interfaceLabel,
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
  resolveInfo
}) => {
  const safeVariableName = safeVar(nestedVariable);
  const allParams = innerFilterParams(filterParams, temporalArgs);
  const queryParams = paramsToString(
    _.filter(allParams, param => !Array.isArray(param.value))
  );
  // build predicates for filter argument if provided
  const filterPredicates = buildFilterPredicates(
    fieldArgs,
    innerSchemaType,
    nestedVariable,
    resolveInfo,
    selectionFilters,
    paramIndex
  );
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
    }-[:${safeLabel(relType)}]-${
      relDirection === 'out' || relDirection === 'OUT' ? '>' : ''
    }(${safeVariableName}:${safeLabel(
      isInlineFragment ? interfaceLabel : innerSchemaType.name
    )}${queryParams})${
      whereClauses.length > 0 ? ` WHERE ${whereClauses.join(' AND ')}` : ''
    } | ${nestedVariable} {${
      isInlineFragment
        ? 'FRAGMENT_TYPE: "' + interfaceLabel + '",' + subSelection[0]
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
  nestedVariable,
  queryParams,
  filterParams,
  temporalArgs
}) => {
  if (innerSchemaTypeRelation.from === innerSchemaTypeRelation.to) {
    return {
      initial: `${initial}${fieldName}: {${
        subSelection[0]
      }}${skipLimit} ${commaIfTail}`,
      ...tailParams
    };
  }
  const relationshipVariableName = `${nestedVariable}_relation`;
  const temporalClauses = temporalPredicateClauses(
    filterParams,
    relationshipVariableName,
    temporalArgs
  );
  return {
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
        ? innerSchemaTypeRelation.to
        : innerSchemaTypeRelation.from
    )}) ${
      temporalClauses.length > 0
        ? `WHERE ${temporalClauses.join(' AND ')} `
        : ''
    }| ${relationshipVariableName} {${subSelection[0]}}]${
      !isArrayType(fieldType) ? ')' : ''
    }${skipLimit} ${commaIfTail}`,
    ...tailParams
  };
};

export const nodeTypeFieldOnRelationType = ({
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
}) => {
  if (
    isRootSelection({
      selectionInfo: parentSelectionInfo,
      rootType: 'relationship'
    }) &&
    isRelationTypeDirectedField(fieldInfo.fieldName)
  ) {
    return relationTypeMutationPayloadField({
      ...fieldInfo,
      parentSelectionInfo
    });
  }
  // Normal case of schemaType with a relationship directive
  return directedNodeTypeFieldOnRelationType({
    ...fieldInfo,
    schemaTypeRelation,
    innerSchemaType,
    isInlineFragment,
    interfaceLabel,
    paramIndex,
    schemaType,
    filterParams,
    temporalArgs
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
  interfaceLabel,
  filterParams,
  temporalArgs
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
      return {
        initial: `${initial}${fieldName}: ${
          !isArrayType(fieldType) ? 'head(' : ''
        }[(${safeVar(variableName)})${isFromField ? '<' : ''}-[${safeVar(
          relationshipVariableName
        )}:${safeLabel(relType)}${queryParams}]-${
          isToField ? '>' : ''
        }(${safeVar(nestedVariable)}:${safeLabel(
          isInlineFragment ? interfaceLabel : fromTypeName
        )}) ${
          temporalClauses.length > 0
            ? `WHERE ${temporalClauses.join(' AND ')} `
            : ''
        }| ${relationshipVariableName} {${
          isInlineFragment
            ? 'FRAGMENT_TYPE: "' + interfaceLabel + '",' + subSelection[0]
            : subSelection[0]
        }}]${!isArrayType(fieldType) ? ')' : ''}${skipLimit} ${commaIfTail}`,
        ...tailParams
      };
    } else {
      // Case of a renamed directed field
      // e.g., 'from: Movie' -> 'Movie: Movie'
      return {
        initial: `${initial}${fieldName}: ${variableName} {${
          subSelection[0]
        }}${skipLimit} ${commaIfTail}`,
        ...tailParams
      };
    }
  } else {
    variableName = variableName + '_relation';
    return {
      initial: `${initial}${fieldName}: ${
        !isArrayType(fieldType) ? 'head(' : ''
      }[(:${safeLabel(isFromField ? toTypeName : fromTypeName)})${
        isFromField ? '<' : ''
      }-[${safeVar(variableName)}]-${isToField ? '>' : ''}(${safeVar(
        nestedVariable
      )}:${safeLabel(
        isInlineFragment ? interfaceLabel : innerSchemaType.name
      )}${queryParams}) | ${nestedVariable} {${
        isInlineFragment
          ? 'FRAGMENT_TYPE: "' + interfaceLabel + '",' + subSelection[0]
          : subSelection[0]
      }}]${!isArrayType(fieldType) ? ')' : ''}${skipLimit} ${commaIfTail}`,
      ...tailParams
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
      const parentSchemaTypeRelation = getRelationTypeDirectiveArgs(
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
  const orderByValue = computeOrderBy(resolveInfo, selections);

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
    return nodeQuery({
      resolveInfo,
      cypherParams,
      schemaType,
      argString: queryParams,
      selections,
      variableName,
      typeName,
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
    initial: '',
    cypherParams,
    selections,
    variableName,
    schemaType,
    resolveInfo,
    paramIndex: 1
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
  const temporalType = isTemporalType(schemaType.name);
  const query = `WITH apoc.cypher.runFirstColumn("${
    cypherQueryArg.value.value
  }", ${argString ||
    'null'}, True) AS x UNWIND x AS ${safeVariableName} RETURN ${safeVariableName} ${
    // Don't add subQuery for scalar type payloads
    // FIXME: fix subselection translation for temporal type payload
    !temporalType && !isScalarType
      ? `{${subQuery}} AS ${safeVariableName}${orderByValue}`
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
  const safeLabelName = safeLabel(typeName);
  const rootParamIndex = 1;
  const [subQuery, subParams] = buildCypherSelection({
    initial: '',
    cypherParams,
    selections,
    variableName,
    schemaType,
    resolveInfo,
    paramIndex: rootParamIndex
  });
  const params = { ...nonNullParams, ...subParams };
  if (cypherParams) {
    params['cypherParams'] = cypherParams;
  }

  // transform null filters in root filter argument
  const filterParam = params['filter'];
  if (filterParam)
    params['filter'] = transformExistentialFilterParams(filterParam);

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

  // build predicates for filter argument if provided
  const fieldArgs = getQueryArguments(resolveInfo);
  const filterPredicates = buildFilterPredicates(
    fieldArgs,
    schemaType,
    variableName,
    resolveInfo,
    nonNullParams,
    rootParamIndex
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

  const query =
    `MATCH (${safeVariableName}:${safeLabelName}${
      argString ? ` ${argString}` : ''
    }) ${predicate}` +
    `RETURN ${safeVariableName} {${subQuery}} AS ${safeVariableName}${orderByValue}${outerSkipLimit}`;

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
  const orderByValue = computeOrderBy(resolveInfo, selections);
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
      typeName
    });
  } else if (isUpdateMutation(resolveInfo)) {
    return nodeUpdate({
      ...mutationInfo,
      variableName,
      typeName
    });
  } else if (isDeleteMutation(resolveInfo)) {
    return nodeDelete({
      ...mutationInfo,
      variableName,
      typeName
    });
  } else if (isAddMutation(resolveInfo)) {
    return relationshipCreate({
      ...mutationInfo
    });
  } else if (isRemoveMutation(resolveInfo)) {
    return relationshipDelete({
      ...mutationInfo,
      variableName
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
    initial: '',
    selections,
    variableName,
    schemaType,
    resolveInfo,
    paramIndex: 1,
    cypherParams
  });
  const isScalarType = isGraphqlScalarType(schemaType);
  const temporalType = isTemporalType(schemaType.name);
  params = { ...params, ...subParams };
  if (cypherParams) {
    params['cypherParams'] = cypherParams;
  }
  const query = `CALL apoc.cypher.doIt("${
    cypherQueryArg.value.value
  }", ${argString}) YIELD value
    WITH apoc.map.values(value, [keys(value)[0]])[0] AS ${safeVariableName}
    RETURN ${safeVariableName} ${
    !temporalType && !isScalarType
      ? `{${subQuery}} AS ${safeVariableName}${orderByValue}${outerSkipLimit}`
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
  params
}) => {
  const safeVariableName = safeVar(variableName);
  const safeLabelName = safeLabel(typeName);
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
    initial: ``,
    selections,
    variableName,
    schemaType,
    resolveInfo,
    paramIndex: 1
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
  params
}) => {
  const safeVariableName = safeVar(variableName);
  const safeLabelName = safeLabel(typeName);
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
    initial: ``,
    selections,
    variableName,
    schemaType,
    resolveInfo,
    paramIndex: 1
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
  params
}) => {
  const safeVariableName = safeVar(variableName);
  const safeLabelName = safeLabel(typeName);
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
    initial: ``,
    selections,
    variableName,
    schemaType,
    resolveInfo,
    paramIndex: 1
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
  params
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
  const fromLabel = safeLabel(fromType);
  const toVariable = safeVar(toVar);
  const toLabel = safeLabel(toType);
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
    initial: '',
    selections,
    schemaType,
    resolveInfo,
    paramIndex: 1,
    parentSelectionInfo: {
      rootType: 'relationship',
      from: fromVar,
      to: toVar,
      variableName: lowercased
    },
    variableName: schemaType.name === fromType ? `${toVar}` : `${fromVar}`
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
  params
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
  const fromLabel = safeLabel(fromType);
  const toVariable = safeVar(toVar);
  const toLabel = safeLabel(toType);
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
    initial: '',
    selections,
    variableName,
    schemaType,
    resolveInfo,
    paramIndex: 1,
    parentSelectionInfo: {
      rootType: 'relationship',
      from: `_${fromVar}`,
      to: `_${toVar}`
    },
    variableName: schemaType.name === fromType ? `_${toVar}` : `_${fromVar}`
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

const buildFilterPredicates = (
  fieldArgs,
  schemaType,
  variableName,
  resolveInfo,
  params,
  paramIndex
) => {
  const filterArg = fieldArgs.find(e => e.name.value === 'filter');
  const filterValue = Object.keys(params).length ? params['filter'] : undefined;
  let filterPredicates = [];
  // if field has both a filter argument and argument data is provided
  if (filterArg && filterValue) {
    const schema = resolveInfo.schema;
    const typeName = getNamedType(filterArg).type.name.value;
    const filterSchemaType = schema.getType(typeName);
    // get fields of filter type
    const typeFields = filterSchemaType.getFields();
    // align with naming scheme of extracted argument Cypher params
    const filterParam =
      paramIndex > 1 ? `$${paramIndex - 1}_filter` : `$filter`;
    // recursively translate argument filterParam relative to schemaType
    filterPredicates = translateFilterArguments(
      schemaType,
      variableName,
      typeFields,
      filterParam,
      schema,
      filterValue
    );
  }
  return filterPredicates;
};

const translateFilterArguments = (
  schemaType,
  variableName,
  typeFields,
  filterParam,
  schema,
  filterValue,
  parentVariableName
) => {
  // root call to translateFilterArgument, recursive calls in buildUniquePredicates
  // translates each provided filter relative to its corresponding field in typeFields
  return Object.entries(filterValue).reduce((predicates, [name, value]) => {
    const predicate = translateFilterArgument({
      parentVariableName,
      field: typeFields[name],
      filterValue: value,
      fieldName: name,
      variableName,
      filterParam,
      schemaType,
      schema
    });
    if (predicate) predicates.push(`(${predicate})`);
    return predicates;
  }, []);
};

const translateFilterArgument = ({
  parentVariableName,
  isListFilterArgument,
  field,
  filterValue,
  fieldName,
  variableName,
  filterParam,
  schemaType,
  schema
}) => {
  const fieldType = field.type;
  const innerFieldType = innerType(fieldType);
  // get name of filter field type (ex: _PersonFilter)
  const typeName = innerFieldType.name;
  // build path for parameter data for current filter field
  const parameterPath = `${
    parentVariableName ? parentVariableName : filterParam
  }.${fieldName}`;
  // parse field name into prefix (ex: name, company) and
  // possible suffix identifying operation type (ex: _gt, _in)
  const parsedFilterName = parseFilterArgumentName(fieldName);
  const filterOperationField = parsedFilterName.name;
  const filterOperationType = parsedFilterName.type;
  // short-circuit evaluation: predicate used to skip a field
  // if processing a list of objects that possibly contain different arguments
  const nullFieldPredicate = decideNullSkippingPredicate({
    parameterPath,
    isListFilterArgument,
    parentVariableName
  });
  if (isScalarType(innerFieldType) || isEnumType(innerFieldType)) {
    // translations of scalar type filters are simply relative
    // to their field name suffix, filterOperationType
    return translateScalarFilter({
      isListFilterArgument,
      filterOperationField,
      filterOperationType,
      filterValue,
      variableName,
      parameterPath,
      parentVariableName,
      filterParam,
      nullFieldPredicate
    });
  } else if (isInputType(innerFieldType)) {
    // translations of input type filters decide arguments for a call to buildPredicateFunction
    return translateInputFilter({
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
      schemaType,
      parameterPath,
      parentVariableName,
      nullFieldPredicate
    });
  }
};

const parseFilterArgumentName = fieldName => {
  const fieldNameParts = fieldName.split('_');
  let filterType = '';
  if (fieldNameParts.length > 1) {
    fieldName = fieldNameParts.shift();
    filterType = fieldNameParts.join('_');
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
  parentVariableName,
  filterParam,
  nullFieldPredicate
}) => {
  const safeVariableName = safeVar(variableName);
  // build path to node/relationship property
  const propertyPath = `${safeVariableName}.${filterOperationField}`;
  if (isExistentialFilter(filterOperationType, filterValue)) {
    return translateNullFilter({
      propertyPath,
      filterOperationField,
      filterOperationType,
      filterParam,
      parentVariableName,
      isListFilterArgument
    });
  }
  // some object arguments in an array filter may differ internally
  // so skip the field predicate if a corresponding value is not provided
  return `${nullFieldPredicate}${buildScalarFilterPredicate(
    filterOperationType,
    propertyPath
  )} ${parameterPath}`;
};

const isExistentialFilter = (type, value) =>
  (!type || type === 'not') && value === null;

const decideNullSkippingPredicate = ({
  parameterPath,
  isListFilterArgument,
  parentVariableName
}) =>
  isListFilterArgument && parentVariableName
    ? `${parameterPath} IS NULL OR `
    : '';

const translateNullFilter = ({
  filterOperationField,
  filterOperationType,
  filterParam,
  propertyPath,
  parentVariableName,
  isListFilterArgument
}) => {
  const isNegationFilter = filterOperationType === 'not';
  // allign with modified parameter names for null filters
  const paramPath = `${
    parentVariableName ? parentVariableName : filterParam
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
    parentVariableName
  });
  return `${nullFieldPredicate}${predicate}`;
};

const buildScalarFilterPredicate = (filterOperationType, propertyPath) => {
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
    default:
      return `${propertyPath} =`;
  }
};

const translateInputFilter = ({
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
  schemaType,
  parameterPath,
  parentVariableName,
  nullFieldPredicate
}) => {
  const filterSchemaType = schema.getType(typeName);
  const typeFields = filterSchemaType.getFields();
  if (filterOperationField === 'AND' || filterOperationField === 'OR') {
    return translateLogicalFilter({
      filterValue,
      variableName,
      filterOperationField,
      fieldName,
      filterParam,
      typeFields,
      schema,
      schemaType,
      parameterPath,
      parentVariableName,
      isListFilterArgument,
      nullFieldPredicate
    });
  } else {
    const { name: relLabel, direction: relDirection } = relationDirective(
      schemaType,
      filterOperationField
    );
    if (relLabel && relDirection) {
      return translateRelationshipFilter({
        relLabel,
        relDirection,
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
        parameterPath,
        parentVariableName,
        isListFilterArgument,
        nullFieldPredicate
      });
    }
  }
};

const translateLogicalFilter = ({
  filterValue,
  variableName,
  filterOperationField,
  fieldName,
  filterParam,
  typeFields,
  schema,
  schemaType,
  parameterPath,
  parentVariableName,
  isListFilterArgument,
  nullFieldPredicate
}) => {
  const listElementVariable = `_${fieldName}`;
  const predicateListVariable = parameterPath;
  // build predicate expressions for all unique arguments within filterValue
  // isListFilterArgument is true here so that nullFieldPredicate is used
  const predicates = buildUniquePredicates({
    schemaType,
    variableName,
    listVariable: listElementVariable,
    filterValue,
    filterParam,
    typeFields,
    schema,
    isListFilterArgument: true
  });
  // decide root predicate function
  const rootPredicateFunction = decidePredicateFunction({
    filterOperationField
  });
  // build root predicate expression
  return buildPredicateFunction({
    listElementVariable,
    parameterPath,
    parentVariableName,
    rootPredicateFunction,
    predicateListVariable,
    predicates,
    isListFilterArgument,
    nullFieldPredicate
  });
};

const translateRelationshipFilter = ({
  relLabel,
  relDirection,
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
  parameterPath,
  parentVariableName,
  isListFilterArgument,
  nullFieldPredicate
}) => {
  // get related type for relationship variables and pattern
  const innerSchemaType = innerType(
    schemaType.getFields()[filterOperationField].type
  );
  // build safe relationship variables
  const {
    typeName: relatedTypeName,
    variableName: relatedTypeNameLow
  } = typeIdentifiers(innerSchemaType);
  // because ALL(n IN [] WHERE n) currently returns true
  // an existence predicate is added to make sure a relationship exists
  // otherwise a node returns when it has 0 such relationships, since the
  // predicate function then evaluates an empty list
  const pathExistencePredicate = buildRelationshipExistencePath(
    variableName,
    relLabel,
    relDirection,
    relatedTypeName
  );
  if (isExistentialFilter(filterOperationType, filterValue)) {
    return translateNullFilter({
      propertyPath: pathExistencePredicate,
      filterOperationField,
      filterOperationType,
      filterParam,
      parentVariableName,
      isListFilterArgument
    });
  }
  const schemaTypeNameLow = schemaType.name.toLowerCase();
  const safeRelVariableName = safeVar(
    `${schemaTypeNameLow}_filter_${relatedTypeNameLow}`
  );
  const safeRelatedTypeNameLow = safeVar(relatedTypeNameLow);
  // build a list comprehension containing path pattern for related type
  const predicateListVariable = buildRelationshipListPattern({
    fromVar: schemaTypeNameLow,
    relVar: safeRelVariableName,
    relLabel: relLabel,
    relDirection: relDirection,
    toVar: relatedTypeNameLow,
    toLabel: relatedTypeName,
    fieldName
  });
  // decide root predicate function
  let rootPredicateFunction = decidePredicateFunction({
    filterOperationField,
    filterOperationType,
    isRelation: true
  });
  let predicates = '';
  if (isListType(fieldType)) {
    const listVariable = `_${fieldName}`;
    predicates = buildUniquePredicates({
      isListFilterArgument: true,
      schemaType: innerSchemaType,
      variableName: relatedTypeNameLow,
      listVariable,
      filterValue,
      filterParam,
      typeFields,
      schema
    });
    // build root predicate to contain nested predicate
    predicates = `${rootPredicateFunction}(${listVariable} IN ${parameterPath} WHERE (${predicates}))`;
    // change root predicate to ALL to act as a boolean
    // evaluation of the above nested rootPredicateFunction
    rootPredicateFunction = 'ALL';
  } else {
    predicates = buildUniquePredicates({
      schemaType: innerSchemaType,
      variableName: relatedTypeNameLow,
      listVariable: parameterPath,
      filterValue,
      filterParam,
      typeFields,
      schema
    });
  }
  return buildPredicateFunction({
    listElementVariable: safeRelatedTypeNameLow,
    parameterPath,
    parentVariableName,
    rootPredicateFunction,
    predicateListVariable,
    predicates,
    pathExistencePredicate,
    isListFilterArgument,
    nullFieldPredicate
  });
};

const buildPredicateFunction = ({
  listElementVariable,
  rootPredicateFunction,
  predicateListVariable,
  predicates,
  pathExistencePredicate,
  nullFieldPredicate
}) => {
  // https://neo4j.com/docs/cypher-manual/current/functions/predicate/
  return `${nullFieldPredicate}${
    pathExistencePredicate ? `EXISTS(${pathExistencePredicate}) AND ` : ''
  }${rootPredicateFunction}(${listElementVariable} IN ${predicateListVariable} WHERE ${predicates})`;
};

const decidePredicateFunction = ({
  filterOperationField,
  filterOperationType,
  isRelation
}) => {
  if (filterOperationField === 'AND') return 'ALL';
  else if (filterOperationField === 'OR') return 'ANY';
  else if (isRelation) {
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

const buildRelationshipListPattern = ({
  fromVar,
  relVar,
  relLabel,
  relDirection,
  toVar,
  toLabel
}) => {
  // prevents related node variable from
  // conflicting with parent variables
  toVar = `_${toVar}`;
  const safeFromVar = safeVar(fromVar);
  const safeToVar = safeVar(toVar);
  // builds a path pattern within a list comprehension
  // that extracts related nodes
  return `[(${safeFromVar})${
    relDirection === 'IN' ? '<' : ''
  }-[${relVar}:${relLabel}]-${
    relDirection === 'OUT' ? '>' : ''
  }(${safeToVar}:${toLabel}) | ${safeToVar}]`;
};

const buildRelationshipExistencePath = (
  fromVar,
  relLabel,
  relDirection,
  toType
) => {
  const safeFromVar = safeVar(fromVar);
  return `(${safeFromVar})${relDirection === 'IN' ? '<' : ''}-[:${relLabel}]-${
    relDirection === 'OUT' ? '>' : ''
  }(:${toType})`;
};

const decideFilterParamName = (name, value) => {
  if (value === null) {
    const parsedFilterName = parseFilterArgumentName(name);
    const filterOperationType = parsedFilterName.type;
    if (!filterOperationType || filterOperationType === 'not') {
      return `_${name}_null`;
    }
  }
  return name;
};

const buildUniquePredicates = ({
  schemaType,
  variableName,
  listVariable,
  filterValue,
  filterParam,
  typeFields,
  schema,
  isListFilterArgument = false
}) => {
  // coercion of object argument to array for general use of reduce
  if (!Array.isArray(filterValue)) filterValue = [filterValue];
  // used to prevent building a duplicate translation when
  // the same filter field is provided in multiple objects
  const translatedFilters = {};
  // recursion: calls translateFilterArgument for every field
  return filterValue
    .reduce((predicates, filter) => {
      Object.entries(filter).forEach(([name, value]) => {
        const filterParamName = decideFilterParamName(name, value);
        if (!translatedFilters[filterParamName]) {
          const predicate = translateFilterArgument({
            isListFilterArgument: isListFilterArgument,
            parentVariableName: listVariable,
            field: typeFields[name],
            filterValue: value,
            fieldName: name,
            variableName,
            filterParam,
            schemaType,
            schema
          });
          if (predicate) {
            translatedFilters[filterParamName] = true;
            predicates.push(`(${predicate})`);
          }
        }
      });
      return predicates;
    }, [])
    .join(' AND ');
};

export const transformExistentialFilterParams = filterParam => {
  return Object.entries(filterParam).reduce((acc, [key, value]) => {
    const parsed = parseFilterArgumentName(key);
    const filterOperationType = parsed.type;
    // align with parameter naming scheme used during translation
    if (isExistentialFilter(filterOperationType, value)) {
      // name: null -> _name_null: true
      // company_not: null -> _company_not_null: true
      key = decideFilterParamName(key, value);
      value = true;
    } else if (typeof value === 'object') {
      // recurse: array filter
      if (Array.isArray(value)) {
        value = value.map(filter => {
          // prevent recursing for scalar list filters
          if (typeof filter === 'object') {
            return transformExistentialFilterParams(filter);
          }
          return filter;
        });
      } else {
        // recurse: object filter
        value = transformExistentialFilterParams(value);
      }
    }
    acc[key] = value;
    return acc;
  }, {});
};
