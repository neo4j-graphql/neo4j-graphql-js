import { extractTypeMapFromTypeDefs, printTypeMap } from './utils';
import {
  extractTypeMapFromSchema,
  extractResolversFromSchema,
  augmentedSchema,
  makeAugmentedExecutableSchema,
  addTemporalTypes
} from './augment';
import { addDirectiveDeclarations } from './auth';

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
  schemaDirectives = {},
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
  typeMap = addDirectiveDeclarations(typeMap, config);
  // adds managed types; tepmoral, spatial, etc.
  typeMap = addTemporalTypes(typeMap, config);
  return printTypeMap(typeMap);
};
