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
  isGraphqlScalarType
} from './utils';
import { getNamedType } from 'graphql';
import { buildCypherSelection } from './selections';
import _ from 'lodash';

export const customCypherField = ({
  customCypher,
  cypherParams,
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
  return {
    initial: `${initial}${fieldName}: ${
      fieldIsList ? '' : 'head('
    }[ ${nestedVariable} IN apoc.cypher.runFirstColumn("${customCypher}", ${cypherDirectiveArgs(
      variableName,
      cypherParams,
      headSelection,
      schemaType,
      resolveInfo
    )}, true) | ${nestedVariable} {${subSelection[0]}}]${
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
  filterParams,
  temporalArgs,
  selections,
  schemaType,
  subSelection,
  skipLimit,
  commaIfTail,
  tailParams,
  temporalClauses
}) => {
  const arrayFilterParams = _.pickBy(
    filterParams,
    (param, keyName) => Array.isArray(param.value) && !('orderBy' === keyName)
  );
  const allParams = innerFilterParams(filterParams, temporalArgs);
  const queryParams = paramsToString(
    _.filter(allParams, param => !Array.isArray(param.value))
  );
  const safeVariableName = safeVar(nestedVariable);
  const arrayPredicates = _.map(arrayFilterParams, (value, key) => {
    const param = _.find(allParams, param => param.key === key);
    return `${safeVariableName}.${safeVar(key)} IN $${
      param.value.index
    }_${key}`;
  });
  const whereClauses = [...temporalClauses, ...arrayPredicates];
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
      whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : ''
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
  const outerSkipLimit = getOuterSkipLimit(first);
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
  } ${outerSkipLimit}`;
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
    ...nullFieldPredicates,
    ...temporalClauses,
    ...arrayPredicates
  ]
    .filter(predicate => !!predicate)
    .join(' AND ');
  const predicate = predicateClauses ? `WHERE ${predicateClauses} ` : '';

  const query =
    `MATCH (${safeVariableName}:${safeLabelName} ${argString}) ${predicate}` +
    `RETURN ${safeVariableName} {${subQuery}} AS ${safeVariableName}${orderByValue} ${outerSkipLimit}`;

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
  const outerSkipLimit = getOuterSkipLimit(first);
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
    paramIndex: 1
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
      ? `{${subQuery}} AS ${safeVariableName}${orderByValue} ${outerSkipLimit}`
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
      MATCH (${fromVariable}:${fromLabel} ${
    fromTemporalClauses && fromTemporalClauses.length > 0
      ? // uses either a WHERE clause for managed type primary keys (temporal, etc.)
        `) WHERE ${fromTemporalClauses.join(' AND ')} `
      : // or a an internal matching clause for normal, scalar property primary keys
        // NOTE this will need to change if we at some point allow for multi field node selection
        `{${fromParam}: $from.${fromParam}})`
  }
      MATCH (${toVariable}:${toLabel} ${
    toTemporalClauses && toTemporalClauses.length > 0
      ? `) WHERE ${toTemporalClauses.join(' AND ')} `
      : `{${toParam}: $to.${toParam}})`
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
      MATCH (${fromVariable}:${fromLabel} ${
    fromTemporalClauses && fromTemporalClauses.length > 0
      ? // uses either a WHERE clause for managed type primary keys (temporal, etc.)
        `) WHERE ${fromTemporalClauses.join(' AND ')} `
      : // or a an internal matching clause for normal, scalar property primary keys
        `{${fromParam}: $from.${fromParam}})`
  }
      MATCH (${toVariable}:${toLabel} ${
    toTemporalClauses && toTemporalClauses.length > 0
      ? `) WHERE ${toTemporalClauses.join(' AND ')} `
      : `{${toParam}: $to.${toParam}})`
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
