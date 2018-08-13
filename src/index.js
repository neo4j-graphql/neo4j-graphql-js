import filter from 'lodash/filter';
import {
  computeOrderBy,
  extractQueryResult,
  extractSelections,
  getFilterParams,
  innerFilterParams,
  isAddMutation,
  isCreateMutation,
  isUpdateMutation,
  isRemoveMutation,
  isDeleteMutation,
  isMutation,
  lowFirstLetter,
  typeIdentifiers
} from './utils';
import { buildCypherSelection } from './selections';
import {
  extractAstNodesFromSchema,
  augmentTypeDefs,
  createOperationMap,
  makeAugmentedSchema
} from './augmentSchema';
import { checkRequestError } from './auth';

export async function neo4jgraphql(
  object,
  params,
  context,
  resolveInfo,
  debug = true
) {
  // throw error if context.req.error exists
  if (checkRequestError(context)) {
    throw new Error(checkRequestError(context));
  }

  let query;
  let cypherParams;

  const cypherFunction = isMutation(resolveInfo) ? cypherMutation : cypherQuery;
  [query, cypherParams] = cypherFunction(params, context, resolveInfo);

  if (debug) {
    console.log(query);
    console.log(cypherParams);
  }

  const session = context.driver.session();
  let result;

  try {
    result = await session.run(query, cypherParams);
  } finally {
    session.close();
  }
  return extractQueryResult(result, resolveInfo.returnType);
}

const getOuterSkipLimit = first =>
  `SKIP $offset${first > -1 ? ' LIMIT $first' : ''}`;

export function cypherQuery(
  { first = -1, offset = 0, _id, orderBy, ...otherParams },
  context,
  resolveInfo
) {
  const { typeName, variableName } = typeIdentifiers(resolveInfo.returnType);
  const schemaType = resolveInfo.schema.getType(typeName);

  const filteredFieldNodes = filter(
    resolveInfo.fieldNodes,
    n => n.name.value === resolveInfo.fieldName
  );

  // FIXME: how to handle multiple fieldNode matches
  const selections = extractSelections(
    filteredFieldNodes[0].selectionSet.selections,
    resolveInfo.fragments
  );

  const [nullParams, nonNullParams] = Object.entries({
    ...{ offset, first },
    ...otherParams
  }).reduce(
    ([nulls, nonNulls], [key, value]) => {
      if (value === null) {
        nulls[key] = value;
      } else {
        nonNulls[key] = value;
      }
      return [nulls, nonNulls];
    },
    [{}, {}]
  );
  const argString = innerFilterParams(getFilterParams(nonNullParams));

  const outerSkipLimit = getOuterSkipLimit(first);
  const orderByValue = computeOrderBy(resolveInfo, selections);

  let query;

  //TODO: wrap in try catch
  const queryTypeCypherDirective = resolveInfo.schema
    .getQueryType()
    .getFields()
    [resolveInfo.fieldName].astNode.directives.find(x => {
      return x.name.value === 'cypher';
    });

  const [subQuery, subParams] = buildCypherSelection({
    initial: '',
    selections,
    variableName,
    schemaType,
    resolveInfo,
    paramIndex: 1
  });

  if (queryTypeCypherDirective) {
    // QueryType with a @cypher directive
    const cypherQueryArg = queryTypeCypherDirective.arguments.find(x => {
      return x.name.value === 'statement';
    });

    query = `WITH apoc.cypher.runFirstColumn("${
      cypherQueryArg.value.value
    }", ${argString}, True) AS x UNWIND x AS ${variableName}
    RETURN ${variableName} {${subQuery}} AS ${variableName}${orderByValue} ${outerSkipLimit}`;
  } else {
    // No @cypher directive on QueryType

    // FIXME: support IN for multiple values -> WHERE
    const idWherePredicate =
      typeof _id !== 'undefined' ? `ID(${variableName})=${_id}` : '';
    const nullFieldPredicates = Object.keys(nullParams).map(
      key => `${variableName}.${key} IS NULL`
    );
    const predicateClauses = [idWherePredicate, ...nullFieldPredicates]
      .filter(predicate => !!predicate)
      .join(' AND ');
    const predicate = predicateClauses ? `WHERE ${predicateClauses} ` : '';

    query =
      `MATCH (${variableName}:${typeName} ${argString}) ${predicate}` +
      // ${variableName} { ${selection} } as ${variableName}`;
      `RETURN ${variableName} {${subQuery}} AS ${variableName}${orderByValue} ${outerSkipLimit}`;
  }

  return [query, { ...nonNullParams, ...subParams }];
}

export function cypherMutation(
  { first = -1, offset = 0, _id, orderBy, ...otherParams },
  context,
  resolveInfo
) {
  // FIXME: lots of duplication here with cypherQuery, extract into util module

  const { typeName, variableName } = typeIdentifiers(resolveInfo.returnType);
  const schemaType = resolveInfo.schema.getType(typeName);

  const filteredFieldNodes = filter(
    resolveInfo.fieldNodes,
    n => n.name.value === resolveInfo.fieldName
  );

  // FIXME: how to handle multiple fieldNode matches
  let selections = extractSelections(
    filteredFieldNodes[0].selectionSet.selections,
    resolveInfo.fragments
  );

  if (selections.length === 0) {
    // FIXME: why aren't the selections found in the filteredFieldNode?
    selections = extractSelections(
      resolveInfo.operation.selectionSet.selections,
      resolveInfo.fragments
    );
  }

  const outerSkipLimit = getOuterSkipLimit(first);
  const orderByValue = computeOrderBy(resolveInfo, selections);

  let query;
  const mutationTypeCypherDirective = resolveInfo.schema
    .getMutationType()
    .getFields()
    [resolveInfo.fieldName].astNode.directives.find(x => {
      return x.name.value === 'cypher';
    });

  let params =
    (isCreateMutation(resolveInfo) || isUpdateMutation(resolveInfo)) &&
    !mutationTypeCypherDirective
      ? { params: otherParams, ...{ first, offset } }
      : { ...otherParams, ...{ first, offset } };

  if (mutationTypeCypherDirective) {
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

    query = `CALL apoc.cypher.doIt("${
      cypherQueryArg.value.value
    }", ${argString}) YIELD value
    WITH apoc.map.values(value, [keys(value)[0]])[0] AS ${variableName}
    RETURN ${variableName} {${subQuery}} AS ${variableName}${orderByValue} ${outerSkipLimit}`;
  } else if (isCreateMutation(resolveInfo)) {
    query = `CREATE (${variableName}:${typeName}) `;
    query += `SET ${variableName} = $params `;
    //query += `RETURN ${variable}`;

    const [subQuery, subParams] = buildCypherSelection({
      initial: ``,
      selections,
      variableName,
      schemaType,
      resolveInfo,
      paramIndex: 1
    });
    params = { ...params, ...subParams };

    query += `RETURN ${variableName} {${subQuery}} AS ${variableName}`;
  } else if (isAddMutation(resolveInfo)) {
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

    const fromType = fromTypeArg.value.value,
      toType = toTypeArg.value.value,
      fromVar = lowFirstLetter(fromType),
      toVar = lowFirstLetter(toType),
      relationshipName = relationshipNameArg.value.value,
      fromParam = resolveInfo.schema
        .getMutationType()
        .getFields()
        [resolveInfo.fieldName].astNode.arguments[0].name.value.substr(
          fromVar.length
        ),
      toParam = resolveInfo.schema
        .getMutationType()
        .getFields()
        [resolveInfo.fieldName].astNode.arguments[1].name.value.substr(
          toVar.length
        );

    const [subQuery, subParams] = buildCypherSelection({
      initial: '',
      selections,
      variableName,
      schemaType,
      resolveInfo,
      paramIndex: 1
    });
    params = { ...params, ...subParams };

    query = `MATCH (${fromVar}:${fromType} {${fromParam}: $${
      resolveInfo.schema.getMutationType().getFields()[resolveInfo.fieldName]
        .astNode.arguments[0].name.value
    }})
       MATCH (${toVar}:${toType} {${toParam}: $${
      resolveInfo.schema.getMutationType().getFields()[resolveInfo.fieldName]
        .astNode.arguments[1].name.value
    }})
      CREATE (${fromVar})-[:${relationshipName}]->(${toVar})
      RETURN ${fromVar} {${subQuery}} AS ${fromVar};`;
  } else if (isUpdateMutation(resolveInfo)) {
    const idParam = resolveInfo.schema.getMutationType().getFields()[
      resolveInfo.fieldName
    ].astNode.arguments[0].name.value;

    query = `MATCH (${variableName}:${typeName} {${idParam}: $params.${
      resolveInfo.schema.getMutationType().getFields()[resolveInfo.fieldName]
        .astNode.arguments[0].name.value
    }}) `;
    query += `SET ${variableName} += $params `;

    const [subQuery, subParams] = buildCypherSelection({
      initial: ``,
      selections,
      variableName,
      schemaType,
      resolveInfo,
      paramIndex: 1
    });
    params = { ...params, ...subParams };

    query += `RETURN ${variableName} {${subQuery}} AS ${variableName}`;
  } else if (isDeleteMutation(resolveInfo)) {
    const idParam = resolveInfo.schema.getMutationType().getFields()[
      resolveInfo.fieldName
    ].astNode.arguments[0].name.value;

    const [subQuery, subParams] = buildCypherSelection({
      initial: ``,
      selections,
      variableName,
      schemaType,
      resolveInfo,
      paramIndex: 1
    });
    params = { ...params, ...subParams };

    // Cannot execute a map projection on a deleted node in Neo4j
    // so the projection is executed and aliased before the delete
    query = `MATCH (${variableName}:${typeName} {${idParam}: $${
      resolveInfo.schema.getMutationType().getFields()[resolveInfo.fieldName]
        .astNode.arguments[0].name.value
    }})
WITH ${variableName} AS ${variableName +
      '_toDelete'}, ${variableName} {${subQuery}} AS ${variableName}
DETACH DELETE ${variableName + '_toDelete'}
RETURN ${variableName}`;
  } else if (isRemoveMutation(resolveInfo)) {
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

    const fromType = fromTypeArg.value.value,
      toType = toTypeArg.value.value,
      fromVar = lowFirstLetter(fromType),
      toVar = lowFirstLetter(toType),
      relationshipName = relationshipNameArg.value.value,
      fromParam = resolveInfo.schema
        .getMutationType()
        .getFields()
        [resolveInfo.fieldName].astNode.arguments[0].name.value.substr(
          fromVar.length
        ),
      toParam = resolveInfo.schema
        .getMutationType()
        .getFields()
        [resolveInfo.fieldName].astNode.arguments[1].name.value.substr(
          toVar.length
        );

    const [subQuery, subParams] = buildCypherSelection({
      initial: '',
      selections,
      variableName,
      schemaType,
      resolveInfo,
      paramIndex: 1
    });
    params = { ...params, ...subParams };

    query = `MATCH (${fromVar}:${fromType} {${fromParam}: $${
      resolveInfo.schema.getMutationType().getFields()[resolveInfo.fieldName]
        .astNode.arguments[0].name.value
    }})
MATCH (${toVar}:${toType} {${toParam}: $${
      resolveInfo.schema.getMutationType().getFields()[resolveInfo.fieldName]
        .astNode.arguments[1].name.value
    }})
OPTIONAL MATCH (${fromVar})-[${fromVar + toVar}:${relationshipName}]->(${toVar})
DELETE ${fromVar + toVar}
RETURN ${fromVar} {${subQuery}} AS ${fromVar};`;
  } else {
    // throw error - don't know how to handle this type of mutation
    throw new Error(
      'Do not know how to handle this type of mutation. Mutation does not follow naming convention.'
    );
  }
  return [query, params];
}

export const augmentSchema = (schema) => {
  const typeMap = extractAstNodesFromSchema(schema);
  const mutationMap = createOperationMap(typeMap.Mutation);
  const queryMap = createOperationMap(typeMap.Query);
  const augmentedTypeMap = augmentTypeDefs(typeMap);
  return makeAugmentedSchema(schema, augmentedTypeMap, queryMap, mutationMap);
}
