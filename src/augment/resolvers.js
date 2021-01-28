import { neo4jgraphql } from '../index';
import { OperationType } from '../augment/types/types';
import {
  generateBaseTypeReferenceResolvers,
  generateNonLocalTypeExtensionReferenceResolvers
} from '../federation';
import {
  DirectiveDefinition,
  getDirective,
  getDirectiveArgument
} from './directives';
import { getResponseKeyFromInfo } from 'graphql-tools';
import { Kind } from 'graphql';

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
        resolvers = generateBaseTypeReferenceResolvers({
          queryResolvers,
          resolvers,
          config
        });
      }
    }
  }

  if (Object.values(typeExtensionDefinitionMap).length) {
    if (isFederated) {
      resolvers = generateNonLocalTypeExtensionReferenceResolvers({
        resolvers,
        generatedTypeMap,
        typeExtensionDefinitionMap,
        queryTypeName,
        mutationTypeName,
        subscriptionTypeName,
        config
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
      isMutationType: true,
      config
    });
    if (Object.keys(mutationResolvers).length > 0) {
      resolvers[mutationTypeName] = mutationResolvers;
    }
  }

  const subscriptionType = operationTypeMap[subscriptionTypeName];
  if (subscriptionType) subscriptionTypeName = subscriptionType.name.value;
  const subscriptionTypeExtensions =
    typeExtensionDefinitionMap[subscriptionTypeName];
  if (
    config['subscription'] &&
    (subscriptionType ||
      (subscriptionTypeExtensions && subscriptionTypeExtensions.length))
  ) {
    const subscriptionResolvers =
      resolvers && resolvers[subscriptionTypeName]
        ? resolvers[subscriptionTypeName]
        : {};
    const fieldMap = getOperationFieldMap({
      operationType: subscriptionType,
      operationTypeExtensions: subscriptionTypeExtensions
    });

    const subscriptionConfig = config.subscription || {};
    const abstractSubscriber = subscriptionConfig.subscribe;
    if (typeof abstractSubscriber === 'function') {
      Object.values(fieldMap).forEach(field => {
        let { name, directives } = field;
        name = name.value;
        const subscriptionDirective = getDirective({
          directives,
          name: DirectiveDefinition.SUBSCRIBE
        });
        if (subscriptionDirective) {
          const eventArg = subscriptionDirective.arguments.find(
            arg => arg.name.value === 'to'
          );
          if (eventArg) {
            const valueKind = eventArg.value.kind;
            const eventNames = [];
            if (valueKind === Kind.LIST) {
              const events = eventArg.value.values.map(value => value.value);
              eventNames.push(...events);
            } else if (valueKind === Kind.STRING) {
              const eventName = eventArg.value.value;
              if (eventName) {
                eventNames.push(eventArg.value.value);
              }
            }
            if (eventNames.length) {
              if (subscriptionResolvers[name] === undefined) {
                subscriptionResolvers[name] = {
                  subscribe: function() {
                    return abstractSubscriber(eventNames);
                  }
                };
              }
            }
          }
        }
      });
    }
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

const getOperationFieldMap = ({
  operationType,
  operationTypeExtensions = []
}) => {
  const fieldMap = {};
  const fields = operationType ? operationType.fields : [];
  fields.forEach(field => {
    fieldMap[field.name.value] = field;
  });
  operationTypeExtensions.forEach(extension => {
    extension.fields.forEach(field => {
      fieldMap[field.name.value] = field;
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
  isMutationType = false,
  config
}) => {
  const fieldMap = getOperationFieldMap({
    operationType,
    operationTypeExtensions
  });
  const subscriptionConfig = config.subscription || {};
  const abstractPublisher = subscriptionConfig.publish;
  if (typeof abstractPublisher === 'function') {
    Object.keys(fieldMap).forEach(name => {
      if (resolvers[name] === undefined) {
        if (isMutationType) {
          // args[3] is resolveInfo
          resolvers[name] = async function(...args) {
            const data = await neo4jgraphql(...args, config.debug);
            publishMutationEvents(args[3], data, abstractPublisher);
            return data;
          };
        } else {
          resolvers[name] = async function(...args) {
            return await neo4jgraphql(...args, config.debug);
          };
        }
      }
    });
  }
  return resolvers;
};

const publishMutationEvents = (resolveInfo, data, abstractPublisher) => {
  const [eventName, subscription] = getEventSubscription(resolveInfo);
  if (eventName && subscription) {
    abstractPublisher(eventName, subscription.name.value, data);
  }
};
const getEventSubscription = resolveInfo => {
  const mutationName = getResponseKeyFromInfo(resolveInfo);
  const schema = resolveInfo.schema;
  const mutationType = schema.getMutationType();
  const mutationField = mutationType.getFields()[mutationName];
  let subscription = undefined;
  let eventName = '';
  // FIXME getResponseKeyFromInfo doesn't work for aliased
  // muttion fields
  if (mutationField) {
    const directives = mutationField.astNode.directives;
    const subscriptionType = schema.getSubscriptionType();
    const publishDirective = directives.find(
      directive => directive.name.value === DirectiveDefinition.PUBLISH
    );
    if (publishDirective) {
      eventName = getDirectiveArgument({
        directive: publishDirective,
        name: 'event'
      });
      // has a publish directive but no event argument,
      // so the default event name is the mutation field name
      if (!eventName) eventName = mutationName;
      if (subscriptionType) {
        const fields = Object.values(subscriptionType.getFields()).map(
          type => type.astNode
        );
        // get the subscription field @subscribe'd to this event
        subscription = getMutationSubscription({ fields, eventName });
      }
    }
  }
  return [eventName, subscription];
};

export const getMutationSubscription = ({ fields = [], eventName }) => {
  return Object.values(fields).find(field => {
    return field.directives.some(directive => {
      if (directive.name.value === DirectiveDefinition.SUBSCRIBE) {
        const eventArg = directive.arguments.find(
          arg => arg.name.value === 'to'
        );
        const valueKind = eventArg.value.kind;
        const eventNames = [];
        if (valueKind === Kind.LIST) {
          const events = eventArg.value.values.map(value => value.value);
          eventNames.push(...events);
        } else if (valueKind === Kind.STRING) {
          eventNames.push(eventArg.value.value);
        }
        return eventNames.includes(eventName);
      }
      return false;
    });
  });
};

export const getPublishedMutation = ({ fields = [], eventName }) => {
  return Object.values(fields).find(field => {
    return field.directives.some(directive => {
      if (directive.name.value === DirectiveDefinition.PUBLISH) {
        return getDirectiveArgument({ directive, name: 'event' }) === eventName;
      }
      return false;
    });
  });
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
