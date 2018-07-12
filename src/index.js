import filter from 'lodash/filter';
import {
  isMutation,
  isAddRelationshipMutation,
  typeIdentifiers,
  lowFirstLetter,
  extractQueryResult,
  extractSelections,
  fixParamsForAddRelationshipMutation,
  computeOrderBy
} from './utils';
import { buildCypherSelection } from './selections';
import {
  addIdFieldToSchema,
  addOrderByToSchema,
  addMutationsToSchema
} from './augmentSchema';

export async function neo4jgraphql(
  object,
  params,
  context,
  resolveInfo,
  debug = true
) {
  let query;

  if (isMutation(resolveInfo)) {
    query = cypherMutation(params, context, resolveInfo);
    if (isAddRelationshipMutation(resolveInfo)) {
      //params = fixParamsForAddRelationshipMutation(params, resolveInfo);
    } else {
      params = { params };
    }
  } else {
    query = cypherQuery(params, context, resolveInfo);
  }

  if (debug) {
    console.log(query);
    console.log(params);
  }

  const session = context.driver.session();
  const result = await session.run(query, params);
  return extractQueryResult(result, resolveInfo.returnType);
}

const JSON_TO_PARAM_REGEX = /\"([^(\")"]+)\":/g;

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

  const [nullParams, nonNullParams] = Object.entries(otherParams).reduce(
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
  const argString = JSON.stringify(nonNullParams).replace(
    JSON_TO_PARAM_REGEX,
    '$1:'
  );
  const outerSkipLimit = `SKIP ${offset}${first > -1 ? ' LIMIT ' + first : ''}`;
  const orderByValue = computeOrderBy(resolveInfo, selections);

  let query;

  //TODO: wrap in try catch
  const queryTypeCypherDirective = resolveInfo.schema
    .getQueryType()
    .getFields()
    [resolveInfo.fieldName].astNode.directives.filter(x => {
      return x.name.value === 'cypher';
    })[0];

  if (queryTypeCypherDirective) {
    // QueryType with a @cypher directive
    const cypherQueryArg = queryTypeCypherDirective.arguments.filter(x => {
      return x.name.value === 'statement';
    })[0];

    query = `WITH apoc.cypher.runFirstColumn("${
      cypherQueryArg.value.value
    }", ${argString}, True) AS x UNWIND x AS ${variableName}
    RETURN ${variableName} {${buildCypherSelection({
      initial: '',
      selections,
      variableName,
      schemaType,
      resolveInfo
    })}} AS ${variableName}${orderByValue} ${outerSkipLimit}`;
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
      `RETURN ${variableName} {${buildCypherSelection({
        initial: '',
        selections,
        variableName,
        schemaType,
        resolveInfo
      })}} AS ${variableName}${orderByValue} ${outerSkipLimit}`;
  }

  return query;
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

  // FIXME: support IN for multiple values -> WHERE
  const argString = JSON.stringify(otherParams).replace(
    /\"([^(\")"]+)\":/g,
    '$1:'
  );

  const idWherePredicate =
    typeof _id !== 'undefined' ? `WHERE ID(${variableName})=${_id} ` : '';
  const outerSkipLimit = `SKIP ${offset}${first > -1 ? ' LIMIT ' + first : ''}`;
  const orderByValue = computeOrderBy(resolveInfo, selections);

  let query;
  const mutationTypeCypherDirective = resolveInfo.schema
    .getMutationType()
    .getFields()
    [resolveInfo.fieldName].astNode.directives.filter(x => {
      return x.name.value === 'cypher';
    })[0];

  if (mutationTypeCypherDirective) {
    const cypherQueryArg = mutationTypeCypherDirective.arguments.filter(x => {
      return x.name.value === 'statement';
    })[0];

    query = `CALL apoc.cypher.doIt("${
      cypherQueryArg.value.value
    }", ${argString}) YIELD value
    WITH apoc.map.values(value, [keys(value)[0]])[0] AS ${variableName}
    RETURN ${variableName} {${buildCypherSelection({
      initial: '',
      selections,
      variableName,
      schemaType,
      resolveInfo
    })}} AS ${variableName}${orderByValue} ${outerSkipLimit}`;
  } else if (
    resolveInfo.fieldName.startsWith('Create') ||
    resolveInfo.fieldName.startsWith('create')
  ) {
    // CREATE node
    // TODO: handle for create relationship
    // TODO: update / delete
    // TODO: augment schema
    query = `CREATE (${variableName}:${typeName}) `;
    query += `SET ${variableName} = $params `;
    //query += `RETURN ${variable}`;
    query +=
      `RETURN ${variableName} {` +
      buildCypherSelection({
        initial: ``,
        selections,
        variableName,
        schemaType,
        resolveInfo
      });
    query += `} AS ${variableName}`;
  } else if (
    resolveInfo.fieldName.startsWith('Add') ||
    resolveInfo.fieldName.startsWith('add')
  ) {
    let mutationMeta, relationshipNameArg, fromTypeArg, toTypeArg;

    try {
      mutationMeta = resolveInfo.schema
        .getMutationType()
        .getFields()
        [resolveInfo.fieldName].astNode.directives.filter(x => {
          return x.name.value === 'MutationMeta';
        })[0];
    } catch (e) {
      throw new Error(
        'Missing required MutationMeta directive on add relationship directive'
      );
    }

    try {
      relationshipNameArg = mutationMeta.arguments.filter(x => {
        return x.name.value === 'relationship';
      })[0];

      fromTypeArg = mutationMeta.arguments.filter(x => {
        return x.name.value === 'from';
      })[0];

      toTypeArg = mutationMeta.arguments.filter(x => {
        return x.name.value === 'to';
      })[0];
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

    let query = `MATCH (${fromVar}:${fromType} {${fromParam}: $${
      resolveInfo.schema.getMutationType().getFields()[resolveInfo.fieldName]
        .astNode.arguments[0].name.value
    }})
       MATCH (${toVar}:${toType} {${toParam}: $${
      resolveInfo.schema.getMutationType().getFields()[resolveInfo.fieldName]
        .astNode.arguments[1].name.value
    }})
      CREATE (${fromVar})-[:${relationshipName}]->(${toVar})
      RETURN ${fromVar} {${buildCypherSelection({
      initial: '',
      selections,
      variableName,
      schemaType,
      resolveInfo
    })}} AS ${fromVar};`;

    return query;
  } else {
    // throw error - don't know how to handle this type of mutation
    throw new Error('Mutation does not follow naming convention.');
  }
  return query;
}

export function augmentSchema(schema) {
  // FIXME: better composable API for schema augmentation
  schema = addMutationsToSchema(schema);
  schema = addIdFieldToSchema(schema);

  // FIXME: adding order by fields to the query types doesn't
  //        quite work yet so don't include those in schema augmentation yet
  //schema = addOrderByToSchema(schema);

  return schema;
}
