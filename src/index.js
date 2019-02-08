import {
  extractQueryResult,
  isMutation,
  typeIdentifiers,
  extractTypeMapFromTypeDefs,
  addDirectiveDeclarations,
  printTypeMap,
  getQuerySelections,
  getMutationSelections
} from './utils';
import {
  extractTypeMapFromSchema,
  extractResolversFromSchema,
  augmentedSchema,
  makeAugmentedExecutableSchema,
  addTemporalTypes
} from './augment';
import { checkRequestError } from './auth';
import { translateMutation, translateQuery } from './translate';

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
}

export function cypherQuery(
  { first = -1, offset = 0, _id, orderBy, ...otherParams },
  context,
  resolveInfo
) {
  const { typeName, variableName } = typeIdentifiers(resolveInfo.returnType);
  const schemaType = resolveInfo.schema.getType(typeName);
  const selections = getQuerySelections(resolveInfo);
  return translateQuery({
    resolveInfo,
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
}

export function cypherMutation(
  { first = -1, offset = 0, _id, orderBy, ...otherParams },
  context,
  resolveInfo
) {
  const { typeName, variableName } = typeIdentifiers(resolveInfo.returnType);
  const schemaType = resolveInfo.schema.getType(typeName);
  const selections = getMutationSelections(resolveInfo);
  return translateMutation({
    resolveInfo,
    schemaType,
    selections,
    variableName,
    typeName,
    first,
    offset,
    otherParams
  });
}

export const augmentSchema = (
  schema,
  config = {
    query: true,
    mutation: true,
    temporal: true,
    debug: true
  }
) => {
  const typeMap = extractTypeMapFromSchema(schema);
  const resolvers = extractResolversFromSchema(schema);
  return augmentedSchema(typeMap, resolvers, config);
};

export const makeAugmentedSchema = ({
  schema,
  typeDefs,
  resolvers = {},
  logger,
  allowUndefinedInResolve = false,
  resolverValidationOptions = {},
  directiveResolvers = null,
  schemaDirectives = null,
  parseOptions = {},
  inheritResolversFromInterfaces = false,
  config = {
    query: true,
    mutation: true,
    temporal: true,
    debug: true
  }
}) => {
  if (schema) {
    return augmentSchema(schema, config);
  }
  if (!typeDefs) throw new Error('Must provide typeDefs');
  return makeAugmentedExecutableSchema({
    typeDefs,
    resolvers,
    logger,
    allowUndefinedInResolve,
    resolverValidationOptions,
    directiveResolvers,
    schemaDirectives,
    parseOptions,
    inheritResolversFromInterfaces,
    config
  });
};

export const augmentTypeDefs = (typeDefs, config) => {
  let typeMap = extractTypeMapFromTypeDefs(typeDefs);
  // overwrites any provided declarations of system directives
  typeMap = addDirectiveDeclarations(typeMap);
  // adds managed types; tepmoral, spatial, etc.
  typeMap = addTemporalTypes(typeMap, config);
  return printTypeMap(typeMap);
};
