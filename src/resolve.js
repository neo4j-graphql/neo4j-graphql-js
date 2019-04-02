const {
  extractQueryResult,
  isMutation,
  typeIdentifiers,
  getPayloadSelections
} = require('./utils');
const { checkRequestError } = require('./auth');
const { translateMutation, translateQuery } = require('./translate');

var neo4jgraphql = async function(
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
    if (isMutation(resolveInfo)) {
      result = await session.writeTransaction(tx => {
        return tx.run(query, cypherParams);
      });
    } else {
      result = await session.readTransaction(tx => {
        return tx.run(query, cypherParams);
      });
    }
  } finally {
    session.close();
  }
  return extractQueryResult(result, resolveInfo.returnType);
};

var cypherQuery = function(
  { first = -1, offset = 0, _id, orderBy, ...otherParams },
  context,
  resolveInfo
) {
  const { typeName, variableName } = typeIdentifiers(resolveInfo.returnType);
  const schemaType = resolveInfo.schema.getType(typeName);
  const selections = getPayloadSelections(resolveInfo);
  return translateQuery({
    resolveInfo,
    context,
    schemaType,
    selections,
    variableName,
    typeName,
    first,
    offset,
    _id,
    orderBy,
    otherParams
  });
};

var cypherMutation = function(
  { first = -1, offset = 0, _id, orderBy, ...otherParams },
  context,
  resolveInfo
) {
  const { typeName, variableName } = typeIdentifiers(resolveInfo.returnType);
  const schemaType = resolveInfo.schema.getType(typeName);
  const selections = getPayloadSelections(resolveInfo);
  return translateMutation({
    resolveInfo,
    context,
    schemaType,
    selections,
    variableName,
    typeName,
    first,
    offset,
    otherParams
  });
};

module.exports = {
  neo4jgraphql,
  cypherQuery,
  cypherMutation
};
