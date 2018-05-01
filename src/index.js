import filter from 'lodash/filter';
import {
  cypherDirectiveArgs,
  isMutation,
  isAddRelationshipMutation,
  typeIdentifiers,
  isGraphqlScalarType,
  isArrayType,
  lowFirstLetter,
  innerType,
  cypherDirective,
  relationDirective,
  innerFilterParams,
  extractQueryResult,
  computeSkipLimit,
  extractSelections
} from './utils';

export async function neo4jgraphql(
  object,
  params,
  context,
  resolveInfo,
  debug = false
) {
  let query;

  if (isMutation(resolveInfo)) {
    query = cypherMutation(params, context, resolveInfo);
    if (!isAddRelationshipMutation(resolveInfo)) {
      params = { params: params };
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

export function cypherQuery(
  { first = -1, offset = 0, _id, ...otherParams },
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

  // FIXME: support IN for multiple values -> WHERE
  const argString = JSON.stringify(otherParams).replace(
    /\"([^(\")"]+)\":/g,
    '$1:'
  );

  const idWherePredicate =
    typeof _id !== 'undefined' ? `WHERE ID(${variableName})=${_id} ` : '';
  const outerSkipLimit = `SKIP ${offset}${first > -1 ? ' LIMIT ' + first : ''}`;

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
    })}} AS ${variableName} ${outerSkipLimit}`;
  } else {
    // No @cypher directive on QueryType
    query =
      `MATCH (${variableName}:${typeName} ${argString}) ${idWherePredicate}` +
      // ${variableName} { ${selection} } as ${variableName}`;
      `RETURN ${variableName} {${buildCypherSelection({
        initial: '',
        selections,
        variableName,
        schemaType,
        resolveInfo
      })}} AS ${variableName} ${outerSkipLimit}`;
  }

  return query;
}

export function cypherMutation(
  { first = -1, offset = 0, _id, ...otherParams },
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
  const selections = extractSelections(
    filteredFieldNodes[0].selectionSet.selections,
    resolveInfo.fragments
  );

  // FIXME: support IN for multiple values -> WHERE
  const argString = JSON.stringify(otherParams).replace(
    /\"([^(\")"]+)\":/g,
    '$1:'
  );

  const idWherePredicate =
    typeof _id !== 'undefined' ? `WHERE ID(${variableName})=${_id} ` : '';
  const outerSkipLimit = `SKIP ${offset}${first > -1 ? ' LIMIT ' + first : ''}`;

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
    })}} AS ${variableName} ${outerSkipLimit}`;
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
      fromParam = resolveInfo.schema.getMutationType().getFields()[
        resolveInfo.fieldName
      ].astNode.arguments[0].name.value,
      toParam = resolveInfo.schema.getMutationType().getFields()[
        resolveInfo.fieldName
      ].astNode.arguments[1].name.value;

    let query = `MATCH (${fromVar}:${fromType} {${fromParam}: $${fromParam}})
       MATCH (${toVar}:${toType} {${toParam}: $${toParam}})
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

function buildCypherSelection({
  initial,
  selections,
  variableName,
  schemaType,
  resolveInfo
}) {
  if (!selections.length) {
    return initial;
  }

  const [headSelection, ...tailSelections] = selections;

  const tailParams = {
    selections: tailSelections,
    variableName,
    schemaType,
    resolveInfo
  };

  const fieldName = headSelection.name.value;
  const commaIfTail = tailSelections.length > 0 ? ',' : '';

  // Schema meta fields(__schema, __typename, etc)
  if (!schemaType.getFields()[fieldName]) {
    return buildCypherSelection({
      initial: tailSelections.length
        ? initial
        : initial.substring(0, initial.lastIndexOf(',')),
      ...tailParams
    });
  }

  const fieldType = schemaType.getFields()[fieldName].type;
  const innerSchemaType = innerType(fieldType); // for target "type" aka label
  const { statement: customCypher } = cypherDirective(schemaType, fieldName);

  // Database meta fields(_id)
  if (fieldName === '_id') {
    return buildCypherSelection({
      initial: `${initial}${fieldName}: ID(${variableName})${commaIfTail}`,
      ...tailParams
    });
  }

  // Main control flow
  if (isGraphqlScalarType(innerSchemaType)) {
    if (customCypher) {
      return buildCypherSelection({
        initial: `${initial}${fieldName}: apoc.cypher.runFirstColumn("${customCypher}", ${cypherDirectiveArgs(
          variableName,
          headSelection,
          schemaType,
          resolveInfo
        )}, false)${commaIfTail}`,
        ...tailParams
      });
    }

    // graphql scalar type, no custom cypher statement
    return buildCypherSelection({
      initial: `${initial} .${fieldName} ${commaIfTail}`,
      ...tailParams
    });
  }

  // We have a graphql object type

  const nestedVariable = variableName + '_' + fieldName;
  const skipLimit = computeSkipLimit(headSelection, resolveInfo.variableValues);

  const nestedParams = {
    initial: '',
    selections: headSelection.selectionSet.selections,
    variableName: nestedVariable,
    schemaType: innerSchemaType,
    resolveInfo
  };

  if (customCypher) {
    // similar: [ x IN apoc.cypher.runFirstColumn("WITH {this} AS this MATCH (this)--(:Genre)--(o:Movie) RETURN o", {this: movie}, true) |x {.title}][1..2])
    const fieldIsList = !!fieldType.ofType;

    return buildCypherSelection({
      initial: `${initial}${fieldName}: ${
        fieldIsList ? '' : 'head('
      }[ ${nestedVariable} IN apoc.cypher.runFirstColumn("${customCypher}", ${cypherDirectiveArgs(
        variableName,
        headSelection,
        schemaType,
        resolveInfo
      )}, true) | ${nestedVariable} {${buildCypherSelection({
        ...nestedParams
      })}}]${fieldIsList ? '' : ')'}${skipLimit} ${commaIfTail}`,
      ...tailParams
    });
  }

  // graphql object type, no custom cypher

  const { name: relType, direction: relDirection } = relationDirective(
    schemaType,
    fieldName
  );

  const queryParams = innerFilterParams(selections);

  return buildCypherSelection({
    initial: `${initial}${fieldName}: ${
      !isArrayType(fieldType) ? 'head(' : ''
    }[(${variableName})${
      relDirection === 'in' || relDirection === 'IN' ? '<' : ''
    }-[:${relType}]-${
      relDirection === 'out' || relDirection === 'OUT' ? '>' : ''
    }(${nestedVariable}:${
      innerSchemaType.name
    }${queryParams}) | ${nestedVariable} {${buildCypherSelection({
      ...nestedParams
    })}}]${!isArrayType(fieldType) ? ')' : ''}${skipLimit} ${commaIfTail}`,
    ...tailParams
  });
}
