import { makeExecutableSchema } from 'graphql-tools';
import {
  printTypeMap,
  extractTypeMapFromTypeDefs
} from './utils';
import { 
  augmentTypeMap,
  augmentResolvers
} from "./augment";

export const augmentedSchema = (typeMap, resolvers, config) => {
  const augmentedTypeMap = augmentTypeMap(typeMap, config);
  const augmentedResolvers = augmentResolvers(augmentedTypeMap, resolvers, config);
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
  inheritResolversFromInterfaces, 
  config
}) => {
  const typeMap = extractTypeMapFromTypeDefs(typeDefs);
  const augmentedTypeMap = augmentTypeMap(typeMap, config);
  const augmentedResolvers = augmentResolvers(augmentedTypeMap, resolvers, config);
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

export const extractTypeMapFromSchema = (schema) => {
  const typeMap = schema.getTypeMap();
  const directives = schema.getDirectives();
  const types = { ...typeMap, ...directives };
  let astNode = {};
  return Object.keys(types).reduce( (acc, t) => {
    astNode = types[t].astNode;
    if(astNode !== undefined) {
      acc[astNode.name.value] = astNode;
    }
    return acc;
  }, {});
}

export const extractResolversFromSchema = (schema) => {
  const _typeMap = schema && schema._typeMap ? schema._typeMap : {};
  const types = Object.keys(_typeMap);
  let type = {};
  let schemaTypeResolvers = {};
  return types.reduce( (acc, t) => {
    // prevent extraction from schema introspection system keys
    if(t !== "__Schema"
    && t !== "__Type" 
    && t !== "__TypeKind"
    && t !== "__Field" 
    && t !== "__InputValue"
    && t !== "__EnumValue"
    && t !== "__Directive") {
      type = _typeMap[t];
      // resolvers are stored on the field level at a .resolve key
      schemaTypeResolvers = extractFieldResolversFromSchemaType(type);
      // do not add unless there exists at least one field resolver for type
      if(schemaTypeResolvers) {
        acc[t] = schemaTypeResolvers;
      }
    }
    return acc;
  }, {})
}

const extractFieldResolversFromSchemaType = (type) => {
  const fields = type._fields;
  const fieldKeys = fields ? Object.keys(fields) : [];
  const fieldResolvers = fieldKeys.length > 0 
    ? fieldKeys.reduce( (acc, t) => {
        // do not add entry for this field unless it has resolver
        if(fields[t].resolve !== undefined) {
          acc[t] = fields[t].resolve;
        }
        return acc;
      }, {}) 
    : undefined;
  // do not return value unless there exists at least 1 field resolver
  return fieldResolvers && Object.keys(fieldResolvers).length > 0 
    ? fieldResolvers
    : undefined;
}
