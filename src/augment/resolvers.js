import { neo4jgraphql } from '../index';
import { OperationType } from '../augment/types/types';

/**
 * The main export for the generation of resolvers for the
 * Query and Mutation API. Prevent overwriting.
 */
export const augmentResolvers = (
  augmentedTypeMap,
  operationTypeMap,
  resolvers,
  config
) => {
  // Persist and generate Query resolvers
  let queryTypeName = OperationType.QUERY;
  const queryType = operationTypeMap[queryTypeName];
  if (queryType) {
    queryTypeName = queryType.name.value;
    let queryResolvers =
      resolvers && resolvers[queryTypeName] ? resolvers[queryTypeName] : {};
    queryResolvers = possiblyAddResolvers(queryType, queryResolvers, config);
    if (Object.keys(queryResolvers).length > 0) {
      resolvers[queryTypeName] = queryResolvers;
    }
  }
  // Persist and generate Mutation resolvers
  let mutationTypeName = OperationType.MUTATION;
  const mutationType = operationTypeMap[mutationTypeName];
  if (mutationType) {
    mutationTypeName = mutationType.name.value;
    let mutationResolvers =
      resolvers && resolvers[mutationTypeName]
        ? resolvers[mutationTypeName]
        : {};
    mutationResolvers = possiblyAddResolvers(
      mutationType,
      mutationResolvers,
      config
    );
    if (Object.keys(mutationResolvers).length > 0) {
      resolvers[mutationTypeName] = mutationResolvers;
    }
  }
  // Persist Subscription resolvers
  let subscriptionTypeName = OperationType.SUBSCRIPTION;
  const subscriptionType = operationTypeMap[subscriptionTypeName];
  if (subscriptionType) {
    subscriptionTypeName = subscriptionType.name.value;
    let subscriptionResolvers =
      resolvers && resolvers[subscriptionTypeName]
        ? resolvers[subscriptionTypeName]
        : {};
    if (Object.keys(subscriptionResolvers).length > 0) {
      resolvers[subscriptionTypeName] = subscriptionResolvers;
    }
  }
  // must implement __resolveInfo for every Interface type
  // we use "FRAGMENT_TYPE" key to identify the Interface implementation
  // type at runtime, so grab this value
  const interfaceTypes = Object.keys(augmentedTypeMap).filter(
    e => augmentedTypeMap[e].kind === 'InterfaceTypeDefinition'
  );
  interfaceTypes.map(e => {
    resolvers[e] = {};

    resolvers[e]['__resolveType'] = (obj, context, info) => {
      return obj['FRAGMENT_TYPE'];
    };
  });
  return resolvers;
};

/**
 * Generates resolvers for a given operation type, if
 * any fields exist, for any resolver not provided
 */
const possiblyAddResolvers = (operationType, resolvers, config) => {
  let operationName = '';
  const fields = operationType ? operationType.fields : [];
  const operationTypeMap = fields.reduce((acc, t) => {
    acc[t.name.value] = t;
    return acc;
  }, {});
  return Object.keys(operationTypeMap).reduce((acc, t) => {
    // if no resolver provided for this operation type field
    operationName = operationTypeMap[t].name.value;
    // If not provided
    if (acc[operationName] === undefined) {
      acc[operationName] = function(...args) {
        return neo4jgraphql(...args, config.debug);
      };
    }
    return acc;
  }, resolvers);
};

/**
 * Extracts resolvers from a schema
 */
export const extractResolversFromSchema = schema => {
  const _typeMap = schema && schema._typeMap ? schema._typeMap : {};
  const types = Object.keys(_typeMap);
  let type = {};
  let schemaTypeResolvers = {};
  return types.reduce((acc, t) => {
    // prevent extraction from schema introspection system keys
    if (
      t !== '__Schema' &&
      t !== '__Type' &&
      t !== '__TypeKind' &&
      t !== '__Field' &&
      t !== '__InputValue' &&
      t !== '__EnumValue' &&
      t !== '__Directive'
    ) {
      type = _typeMap[t];
      // resolvers are stored on the field level at a .resolve key
      schemaTypeResolvers = extractFieldResolversFromSchemaType(type);
      // do not add unless there exists at least one field resolver for type
      if (schemaTypeResolvers) {
        acc[t] = schemaTypeResolvers;
      }
    }
    return acc;
  }, {});
};

/**
 * Extracts field resolvers from a given type taken
 * from a schema
 */
const extractFieldResolversFromSchemaType = type => {
  const fields = type._fields;
  const fieldKeys = fields ? Object.keys(fields) : [];
  const fieldResolvers =
    fieldKeys.length > 0
      ? fieldKeys.reduce((acc, t) => {
          // do not add entry for this field unless it has resolver
          if (fields[t].resolve !== undefined) {
            acc[t] = fields[t].resolve;
          }
          return acc;
        }, {})
      : undefined;
  // do not return value unless there exists at least 1 field resolver
  return fieldResolvers && Object.keys(fieldResolvers).length > 0
    ? fieldResolvers
    : undefined;
};
