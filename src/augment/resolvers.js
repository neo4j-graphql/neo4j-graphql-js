import { neo4jgraphql } from '../index';
import { OperationType } from '../augment/types/types';
import { isNonLocalType } from '../federation';

/**
 * The main export for the generation of resolvers for the
 * Query and Mutation API. Prevent overwriting.
 */
export const augmentResolvers = ({
  generatedTypeMap,
  operationTypeMap,
  typeExtensionDefinitionMap,
  resolvers,
  config = {}
}) => {
  const isFederated = config.isFederated;
  // Persist and generate Query resolvers
  let queryTypeName = OperationType.QUERY;
  let mutationTypeName = OperationType.MUTATION;
  let subscriptionTypeName = OperationType.SUBSCRIPTION;

  const queryType = operationTypeMap[queryTypeName];
  if (queryType) queryTypeName = queryType.name.value;
  const queryTypeExtensions = typeExtensionDefinitionMap[queryTypeName];
  if (queryType || (queryTypeExtensions && queryTypeExtensions.length)) {
    let queryResolvers =
      resolvers && resolvers[queryTypeName] ? resolvers[queryTypeName] : {};
    queryResolvers = possiblyAddResolvers({
      operationType: queryType,
      operationTypeExtensions: queryTypeExtensions,
      resolvers: queryResolvers,
      config,
      isFederated
    });

    if (Object.keys(queryResolvers).length) {
      resolvers[queryTypeName] = queryResolvers;
      if (isFederated) {
        Object.keys(queryResolvers).forEach(typeName => {
          // Initialize type resolver object
          if (resolvers[typeName] === undefined) resolvers[typeName] = {};
          // If not provided
          if (resolvers[typeName]['__resolveReference'] === undefined) {
            resolvers[typeName]['__resolveReference'] = async function(
              object,
              context,
              resolveInfo
            ) {
              return await neo4jgraphql(
                object,
                {},
                context,
                resolveInfo,
                config.debug
              );
            };
          }
        });
      }
    }
  }

  if (Object.values(typeExtensionDefinitionMap).length) {
    if (isFederated) {
      Object.keys(typeExtensionDefinitionMap).forEach(typeName => {
        if (
          typeName !== queryTypeName &&
          typeName !== mutationTypeName &&
          typeName !== subscriptionTypeName
        ) {
          if (
            isNonLocalType({
              generatedTypeMap,
              typeName
            })
          ) {
            // Initialize type resolver object
            if (resolvers[typeName] === undefined) resolvers[typeName] = {};
            // If not provided
            if (resolvers[typeName]['__resolveReference'] === undefined) {
              console.log(
                '\ngenerating reference resolver for nonlocal type: ',
                typeName
              );
              resolvers[typeName]['__resolveReference'] = async function(
                object,
                context,
                resolveInfo
              ) {
                const entityData = await neo4jgraphql(
                  object,
                  {},
                  context,
                  resolveInfo,
                  config.debug
                );
                return {
                  // Data for this entity type possibly previously fetched from other services
                  ...object,
                  // Data now fetched for the fields this service resolves for the entity type
                  ...entityData
                };
              };
            }
          }
        }
      });
    }
  }

  // Persist and generate Mutation resolvers
  const mutationType = operationTypeMap[mutationTypeName];
  if (mutationType) mutationTypeName = mutationType.name.value;
  const mutationTypeExtensions = typeExtensionDefinitionMap[mutationTypeName];
  if (
    mutationType ||
    (mutationTypeExtensions && mutationTypeExtensions.length)
  ) {
    let mutationResolvers =
      resolvers && resolvers[mutationTypeName]
        ? resolvers[mutationTypeName]
        : {};
    mutationResolvers = possiblyAddResolvers({
      operationType: mutationType,
      operationTypeExtensions: mutationTypeExtensions,
      resolvers: mutationResolvers,
      config
    });
    if (Object.keys(mutationResolvers).length > 0) {
      resolvers[mutationTypeName] = mutationResolvers;
    }
  }

  // Persist Subscription resolvers
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
  const derivedTypes = Object.keys(generatedTypeMap).filter(
    e =>
      generatedTypeMap[e].kind === 'InterfaceTypeDefinition' ||
      generatedTypeMap[e].kind === 'UnionTypeDefinition'
  );
  derivedTypes.map(e => {
    resolvers[e] = {};

    resolvers[e]['__resolveType'] = (obj, context, info) => {
      return obj['FRAGMENT_TYPE'];
    };
  });

  return resolvers;
};

const getOperationFieldMap = ({ operationType, operationTypeExtensions }) => {
  const fieldMap = {};
  const fields = operationType ? operationType.fields : [];
  fields.forEach(field => {
    fieldMap[field.name.value] = true;
  });
  operationTypeExtensions.forEach(extension => {
    extension.fields.forEach(field => {
      fieldMap[field.name.value] = true;
    });
  });
  return fieldMap;
};

/**
 * Generates resolvers for a given operation type, if
 * any fields exist, for any resolver not provided
 */
const possiblyAddResolvers = ({
  operationType,
  operationTypeExtensions = [],
  resolvers,
  config
}) => {
  const fieldMap = getOperationFieldMap({
    operationType,
    operationTypeExtensions
  });
  Object.keys(fieldMap).forEach(name => {
    // If not provided
    if (resolvers[name] === undefined) {
      resolvers[name] = async function(...args) {
        return await neo4jgraphql(...args, config.debug);
      };
    }
  });
  return resolvers;
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
