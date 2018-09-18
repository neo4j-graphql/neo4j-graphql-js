import { makeExecutableSchema } from 'graphql-tools';
import { parse } from 'graphql';
import {
  printTypeMap
} from './utils';
import { 
  augmentTypeMap,
  augmentResolvers
} from "./augment";

export const augmentedSchema = (typeMap, queryResolvers, mutationResolvers) => {
  const augmentedTypeMap = augmentTypeMap(typeMap);
  const augmentedResolvers = augmentResolvers(queryResolvers, mutationResolvers, augmentedTypeMap);
  // TODO extract and persist logger and schemaDirectives, at least
  return makeExecutableSchema({
    typeDefs: printTypeMap(augmentedTypeMap),
    resolvers: augmentedResolvers,
    resolverValidationOptions: {
      requireResolversForResolveType: false
    }
  });
}

export const makeAugmentedExecutableSchema = ({
  typeDefs,
  resolvers,
  logger,
  allowUndefinedInResolve,
  resolverValidationOptions,
  directiveResolvers,
  schemaDirectives,
  parseOptions,
  inheritResolversFromInterfaces
}) => {
  const typeMap = extractTypeMapFromTypeDefs(typeDefs);
  const augmentedTypeMap = augmentTypeMap(typeMap);
  const queryResolvers = resolvers && resolvers.Query ? resolvers.Query : {};
  const mutationResolvers = resolvers && resolvers.Mutation ? resolvers.Mutation : {};
  const augmentedResolvers = augmentResolvers(queryResolvers, mutationResolvers, augmentedTypeMap);
  resolverValidationOptions.requireResolversForResolveType = false;
  return makeExecutableSchema({
    typeDefs: printTypeMap(augmentedTypeMap),
    resolvers: augmentedResolvers,
    logger: logger,
    allowUndefinedInResolve: allowUndefinedInResolve,
    resolverValidationOptions: resolverValidationOptions,
    directiveResolvers: directiveResolvers,
    schemaDirectives: schemaDirectives,
    parseOptions: parseOptions,
    inheritResolversFromInterfaces: inheritResolversFromInterfaces
  });
}

const extractTypeMapFromTypeDefs = (typeDefs) => {
  // TODO: accept alternative typeDefs formats (arr of strings, ast, etc.)
  // into a single string for parse, add validatation
  const astNodes = parse(typeDefs).definitions;
  return astNodes.reduce( (acc, t) => {
    acc[t.name.value] = t;
    return acc;
  }, {});
}

export const extractTypeMapFromSchema = (schema) => {
  const typeMap = schema.getTypeMap();
  let astNode = {};
  return Object.keys(typeMap).reduce( (acc, t) => {
    astNode = typeMap[t].astNode;
    if(astNode !== undefined) {
      acc[astNode.name.value] = astNode;
    }
    return acc;
  }, {});
}

export const extractResolvers = (operationType) => {
  const operationTypeFields = operationType ? operationType.getFields() : {};
  const operations = Object.keys(operationTypeFields);
  let resolver = {};
  return operations.length > 0
    ? operations.reduce((acc, t) => {
        resolver = operationTypeFields[t].resolve;
        if(resolver !== undefined) acc[t] = resolver;
        return acc;
      }, {})
    : {};
}
