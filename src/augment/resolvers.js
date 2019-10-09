import { neo4jgraphql } from '../index';
import { OperationType } from '../augment/types/types';

export const augmentResolvers = (augmentedTypeMap, resolvers, config) => {
  let queryResolvers =
    resolvers && resolvers[OperationType.QUERY]
      ? resolvers[OperationType.QUERY]
      : {};
  const queryType = augmentedTypeMap[OperationType.QUERY];
  if (queryType) {
    queryResolvers = possiblyAddResolvers(queryType, queryResolvers, config);
    if (Object.keys(queryResolvers).length > 0) {
      resolvers[OperationType.QUERY] = queryResolvers;
    }
  }
  let mutationResolvers =
    resolvers && resolvers[OperationType.MUTATION]
      ? resolvers[OperationType.MUTATION]
      : {};
  const mutationType = augmentedTypeMap[OperationType.MUTATION];
  if (mutationType) {
    mutationResolvers = possiblyAddResolvers(
      mutationType,
      mutationResolvers,
      config
    );
    if (Object.keys(mutationResolvers).length > 0) {
      resolvers[OperationType.MUTATION] = mutationResolvers;
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
    if (acc[operationName] === undefined) {
      acc[operationName] = function(...args) {
        return neo4jgraphql(...args, config.debug);
      };
    }
    return acc;
  }, resolvers);
};

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
