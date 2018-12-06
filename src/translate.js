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
  filterNullParams,
  getOuterSkipLimit,
  getQueryCypherDirective,
  getMutationArguments,
  possiblySetFirstId,
  buildCypherParameters,
  temporalPredicateClauses,
  getQueryArguments,
  getTemporalArguments,
  initializeMutationParams,
  getMutationCypherDirective
} from './utils';
import { getNamedType } from 'graphql';
import { buildCypherSelection } from './selections';

export const customCypherField = ({
  customCypher,
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
  queryParams,
  subSelection,
  skipLimit,
  commaIfTail,
  tailParams
}) => {
  return {
    initial: `${initial}${fieldName}: ${
      !isArrayType(fieldType) ? 'head(' : ''
    }[(${safeVar(variableName)})${
      relDirection === 'in' || relDirection === 'IN' ? '<' : ''
    }-[:${safeLabel(relType)}]-${
      relDirection === 'out' || relDirection === 'OUT' ? '>' : ''
    }(${safeVar(nestedVariable)}:${safeLabel(
      isInlineFragment ? interfaceLabel : innerSchemaType.name
    )}${queryParams}) | ${nestedVariable} {${
      isInlineFragment
        ? 'FRAGMENT_TYPE: "' + interfaceLabel + '",' + subSelection[0]
        : subSelection[0]
    }}]${!isArrayType(fieldType) ? ')' : ''}${skipLimit} ${commaIfTail}`,
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
  queryParams
}) => {
  if (innerSchemaTypeRelation.from === innerSchemaTypeRelation.to) {
    return {
      initial: `${initial}${fieldName}: {${
        subSelection[0]
      }}${skipLimit} ${commaIfTail}`,
      ...tailParams
    };
  }
  return {
    initial: `${initial}${fieldName}: ${
      !isArrayType(fieldType) ? 'head(' : ''
    }[(${safeVar(variableName)})${
      schemaType.name === innerSchemaTypeRelation.to ? '<' : ''
    }-[${safeVar(nestedVariable + '_relation')}:${safeLabel(
      innerSchemaTypeRelation.name
    )}${queryParams}]-${
      schemaType.name === innerSchemaTypeRelation.from ? '>' : ''
    }(:${safeLabel(
      schemaType.name === innerSchemaTypeRelation.from
        ? innerSchemaTypeRelation.to
        : innerSchemaTypeRelation.from
    )}) | ${nestedVariable}_relation {${subSelection[0]}}]${
      !isArrayType(fieldType) ? ')' : ''
    }${skipLimit} ${commaIfTail}`,
    ...tailParams
  };
};

export const nodeTypeFieldOnRelationType = ({
  fieldInfo,
  rootVariableNames,
  schemaTypeRelation,
  innerSchemaType,
  isInlineFragment,
  interfaceLabel
}) => {
  if (rootVariableNames) {
    // Special case used by relation mutation payloads
    // rootVariableNames is persisted for sibling directed fields
    return relationTypeMutationPayloadField({
      ...fieldInfo,
      rootVariableNames
    });
  } else {
    // Normal case of schemaType with a relationship directive
    return directedFieldOnReflexiveRelationType({
      ...fieldInfo,
      schemaTypeRelation,
      innerSchemaType,
      isInlineFragment,
      interfaceLabel
    });
  }
};

const relationTypeMutationPayloadField = ({
  initial,
  fieldName,
  variableName,
  subSelection,
  skipLimit,
  commaIfTail,
  tailParams,
  rootVariableNames
}) => {
  const safeVariableName = safeVar(variableName);
  return {
    initial: `${initial}${fieldName}: ${safeVariableName} {${
      subSelection[0]
    }}${skipLimit} ${commaIfTail}`,
    ...tailParams,
    rootVariableNames,
    variableName:
      fieldName === 'from' ? rootVariableNames.to : rootVariableNames.from
  };
};

const directedFieldOnReflexiveRelationType = ({
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
  interfaceLabel
}) => {
  const relType = schemaTypeRelation.name;
  const fromTypeName = schemaTypeRelation.from;
  const toTypeName = schemaTypeRelation.to;
  const isFromField = fieldName === fromTypeName || fieldName === 'from';
  const isToField = fieldName === toTypeName || fieldName === 'to';
  const relationshipVariableName = `${variableName}_${
    isFromField ? 'from' : 'to'
  }_relation`;
  // Since the translations are significantly different,
  // we first check whether the relationship is reflexive
  if (fromTypeName === toTypeName) {
    if (fieldName === 'from' || fieldName === 'to') {
      return {
        initial: `${initial}${fieldName}: ${
          !isArrayType(fieldType) ? 'head(' : ''
        }[(${safeVar(variableName)})${isFromField ? '<' : ''}-[${safeVar(
          relationshipVariableName
        )}:${safeLabel(relType)}${queryParams}]-${
          isToField ? '>' : ''
        }(${safeVar(nestedVariable)}:${safeLabel(
          isInlineFragment ? interfaceLabel : fromTypeName
        )}) | ${relationshipVariableName} {${
          isInlineFragment
            ? 'FRAGMENT_TYPE: "' + interfaceLabel + '",' + subSelection[0]
            : subSelection[0]
        }}]${!isArrayType(fieldType) ? ')' : ''}${skipLimit} ${commaIfTail}`,
        ...tailParams
      };
    } else {
      // Case of a renamed directed field
      return {
        initial: `${initial}${fieldName}: ${variableName} {${
          subSelection[0]
        }}${skipLimit} ${commaIfTail}`,
        ...tailParams
      };
    }
  }
  // Related node types are different
  return {
    initial: `${initial}${fieldName}: ${
      !isArrayType(fieldType) ? 'head(' : ''
    }[(:${safeLabel(isFromField ? toTypeName : fromTypeName)})${
      isFromField ? '<' : ''
    }-[${safeVar(variableName + '_relation')}]-${
      isToField ? '>' : ''
    }(${safeVar(nestedVariable)}:${safeLabel(
      isInlineFragment ? interfaceLabel : innerSchemaType.name
    )}${queryParams}) | ${nestedVariable} {${
      isInlineFragment
        ? 'FRAGMENT_TYPE: "' + interfaceLabel + '",' + subSelection[0]
        : subSelection[0]
    }}]${!isArrayType(fieldType) ? ')' : ''}${skipLimit} ${commaIfTail}`,
    ...tailParams
  };
};

export const temporalField = ({
  initial,
  fieldName, 
  commaIfTail,
  parentSchemaType, 
  parentFieldName,
  parentVariableName,
  tailParams
}) => {
  return {
    initial: `${initial} ${fieldName}: ${
      fieldName === "formatted" 
        ? `toString(${safeVar(parentVariableName)}.${parentFieldName}) ${commaIfTail}` 
        : `${safeVar(parentVariableName)}.${parentFieldName}.${fieldName} ${commaIfTail}`
    }`,
    parentSchemaType, 
    parentFieldName,
    parentVariableName,
    ...tailParams
  };
}

export const temporalType = ({
  initial,
  fieldName,
  subSelection,
  commaIfTail,
  tailParams
}) => {
  return {
    initial: `${initial}${fieldName}: {${subSelection[0]}}${commaIfTail}`,
    ...tailParams
  }  
}

// Query API root operation branch
export const translateQuery = ({
  resolveInfo,
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
  const [nullParams, nonNullParams] = filterNullParams({ offset, first, otherParams });
  const filterParams = getFilterParams(nonNullParams);
  const queryArgs = getQueryArguments(resolveInfo);
  const temporalArgs = getTemporalArguments(queryArgs);
  const queryParams = innerFilterParams(filterParams, temporalArgs);
  const safeVariableName = safeVar(variableName);
  const temporalClauses = temporalPredicateClauses(filterParams, safeVariableName, temporalArgs);
  const outerSkipLimit = getOuterSkipLimit(first);
  const orderByValue = computeOrderBy(resolveInfo, selections);
  const queryTypeCypherDirective = getQueryCypherDirective(resolveInfo);
  if (queryTypeCypherDirective) {
    return customQuery({
      resolveInfo,
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
      _id
    });
  }
}

// Custom read operation
const customQuery = ({
  resolveInfo,
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
    selections,
    variableName,
    schemaType,
    resolveInfo,
    paramIndex: 1
  });
  const params = { ...nonNullParams, ...subParams };
  // QueryType with a @cypher directive
  const cypherQueryArg = queryTypeCypherDirective.arguments.find(x => {
    return x.name.value === 'statement';
  });
  const query = `WITH apoc.cypher.runFirstColumn("${
    cypherQueryArg.value.value
  }", ${argString}, True) AS x UNWIND x AS ${safeVariableName}
    RETURN ${safeVariableName} {${subQuery}} AS ${safeVariableName}${orderByValue} ${outerSkipLimit}`;
  return [query, params];
}

// Generated API
const nodeQuery = ({
  resolveInfo,
  schemaType,
  argString,
  selections,
  variableName,
  typeName,
  temporalClauses,
  orderByValue,
  outerSkipLimit,
  nullParams,
  nonNullParams,
  _id
}) => {
  const safeVariableName = safeVar(variableName);
  const safeLabelName = safeLabel(typeName);
  const [subQuery, subParams] = buildCypherSelection({
    initial: '',
    selections,
    variableName,
    schemaType,
    resolveInfo,
    paramIndex: 1
  });
  const params = { ...nonNullParams, ...subParams };
  // FIXME: support IN for multiple values -> WHERE
  const idWherePredicate =
    typeof _id !== 'undefined' ? `ID(${safeVariableName})=${_id}` : '';
  const nullFieldPredicates = Object.keys(nullParams).map(
    key => `${variableName}.${key} IS NULL`
  );
  const predicateClauses = [idWherePredicate, ...nullFieldPredicates, ...temporalClauses]
    .filter(predicate => !!predicate)
    .join(' AND ');
  const predicate = predicateClauses ? `WHERE ${predicateClauses} ` : '';
  const query =
    `MATCH (${safeVariableName}:${safeLabelName} ${argString}) ${predicate}` +
    `RETURN ${safeVariableName} {${subQuery}} AS ${safeVariableName}${orderByValue} ${outerSkipLimit}`;
  return [query, params];
}

// Mutation API root operation branch
export const translateMutation = ({
  resolveInfo,
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
}

// Custom write operation
const customMutation = ({
  params,
  mutationTypeCypherDirective, 
  selections,
  variableName,
  schemaType,
  resolveInfo,
  orderByValue,
  outerSkipLimit
}) => {
  const safeVariableName = safeVar(variableName);
  // FIXME: support IN for multiple values -> WHERE
  const argString = innerFilterParams(
    getFilterParams(params.params || params)
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
  params = { ...params, ...subParams };
  const query = `CALL apoc.cypher.doIt("${cypherQueryArg.value.value}", ${argString}) YIELD value
    WITH apoc.map.values(value, [keys(value)[0]])[0] AS ${safeVariableName}
    RETURN ${safeVariableName} {${subQuery}} AS ${safeVariableName}${orderByValue} ${outerSkipLimit}`;
  return [query, params];
}

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
}

const splitSelectionParameters = (params, primaryKeyArgName, paramKey) => {
  const paramKeys = paramKey ? Object.keys(params[paramKey]) : Object.keys(params); 
  const [primaryKeyParam, updateParams] = paramKeys.reduce((acc, t) => { 
    if(t === primaryKeyArgName) {
      if(paramKey) {
        acc[0][t] = params[paramKey][t];        
      }
      else {
        acc[0][t] = params[t];
      }
    }
    else {
      if(paramKey) {
        if(acc[1][paramKey] === undefined) acc[1][paramKey] = {};
        acc[1][paramKey][t] = params[paramKey][t];
      }
      else {
        acc[1][t] = params[t];
      }
    }
    return acc; 
  }, [{}, {}]);
  const first = params.first;
  const offset = params.offset;
  if(first !== undefined) updateParams['first'] = first;
  if(offset !== undefined) updateParams['offset'] = offset;
  return [primaryKeyParam, updateParams];
}
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
  const [primaryKeyParam, updateParams] = splitSelectionParameters(params, primaryKeyArgName, "params");
  const temporalClauses = temporalPredicateClauses(primaryKeyParam, safeVariableName, temporalArgs, "params");
  const predicateClauses = [...temporalClauses]
    .filter(predicate => !!predicate)
    .join(' AND ');
  const predicate = predicateClauses 
    ? `WHERE ${predicateClauses} ` 
    : '';
  let [preparedParams, paramUpdateStatements] = buildCypherParameters({
    args,
    params: updateParams,
    paramKey: "params"
  });
  let query = `MATCH (${safeVariableName}:${safeLabelName}${
    predicate !== ''
      ? `) ${predicate} `
      : `{${primaryKeyArgName}: $params.${primaryKeyArgName}})`
    }
  `;
  if(paramUpdateStatements.length > 0) {
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
}

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
  const temporalClauses = temporalPredicateClauses(primaryKeyParam, safeVariableName, temporalArgs);
  let [preparedParams] = buildCypherParameters({args, params});
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
  // preparedParams[primaryKeyArgName] = primaryKeyParam[primaryKeyArgName];
  params = { ...preparedParams, ...subParams };
  const deletionVariableName = safeVar(`${variableName}_toDelete`);
  // Cannot execute a map projection on a deleted node in Neo4j
  // so the projection is executed and aliased before the delete
query += `
WITH ${safeVariableName} AS ${deletionVariableName}, ${safeVariableName} {${subQuery}} AS ${safeVariableName}
DETACH DELETE ${deletionVariableName}
RETURN ${safeVariableName}`;
  return [query, params];
}

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
  const fromInputAst = typeMap[getNamedType(fromInputArg).type.name.value].astNode;
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
    paramKey: "data"
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
    "from"
  );
  const toTemporalClauses = temporalPredicateClauses(
    preparedParams.to, 
    toVariable, 
    toTemporalArgs, 
    "to"
  );
  const [subQuery, subParams] = buildCypherSelection({
    initial: '',
    selections,
    schemaType,
    resolveInfo,
    paramIndex: 1,
    rootVariableNames: {
      from: `${fromVar}`,
      to: `${toVar}`,
    },
    variableName: schemaType.name === fromType ? `${toVar}` : `${fromVar}`
  });
  params = { ...preparedParams, ...subParams };
  let query = `
      MATCH (${fromVariable}:${fromLabel} ${
        fromTemporalClauses && fromTemporalClauses.length > 0
        // uses either a WHERE clause for managed type primary keys (temporal, etc.)
          ? `) WHERE ${fromTemporalClauses.join(' AND ')} `
          // or a an internal matching clause for normal, scalar property primary keys
          // NOTE this will need to change if we at some point allow for multi field node selection
          : `{${fromParam}: $from.${fromParam}})` 
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
}

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
  const fromInputAst = typeMap[getNamedType(fromInputArg).type.name.value].astNode;
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
    "from"
  );
  const toTemporalClauses = temporalPredicateClauses(
    params.to, 
    toVariable, 
    toTemporalArgs, 
    "to"
  );
  // TODO cleaner semantics: remove use of _ prefixes in root variableNames and variableName
  const [subQuery, subParams] = buildCypherSelection({
    initial: '',
    selections,
    variableName,
    schemaType,
    resolveInfo,
    paramIndex: 1,
    rootVariableNames: {
      from: `_${fromVar}`,
      to: `_${toVar}`
    },
    variableName: schemaType.name === fromType ? `_${toVar}` : `_${fromVar}`
  });
  params = { ...params, ...subParams };
  // TODO create builder functions for selection clauses below for both relation mutations
  let query = `
      MATCH (${fromVariable}:${fromLabel} ${
        fromTemporalClauses && fromTemporalClauses.length > 0
        // uses either a WHERE clause for managed type primary keys (temporal, etc.)
          ? `) WHERE ${fromTemporalClauses.join(' AND ')} `
          // or a an internal matching clause for normal, scalar property primary keys
          : `{${fromParam}: $from.${fromParam}})` 
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
}
