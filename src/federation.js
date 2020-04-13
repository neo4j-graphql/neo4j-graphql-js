import { print, graphql, Kind } from 'graphql';
import { ApolloError } from 'apollo-server';
import {
  buildSelectionSet,
  buildFieldSelection,
  buildName,
  buildNamedType,
  buildVariableDefinition,
  buildVariable
} from './augment/ast';
import { unwrapNamedType, TypeWrappers } from './augment/fields';
import { innerType } from './utils';
import { checkRequestError } from './auth';
import Debug from 'debug';

const debug = Debug('neo4j-graphql-js');

export const NEO4j_GRAPHQL_SERVICE = 'Neo4jGraphQLService';

const CONTEXT_KEYS_PATH = `__${NEO4j_GRAPHQL_SERVICE}`;

const SERVICE_VARIABLE = '_SERVICE_';

const SERVICE_FIELDS = {
  ENTITIES: '_entities'
};

const SERVICE_FIELD_ARGUMENTS = {
  REPRESENTATIONS: 'representations'
};

const INTROSPECTION_FIELD = {
  TYPENAME: '__typename'
};

export const buildFederatedOperation = ({
  object,
  params = {},
  context,
  serviceKeys,
  resolveInfo,
  typeName,
  operationField,
  hasCustomTypeName,
  isRootOperation,
  isRelationshipOperation
}) => {
  const requestError = checkRequestError(context);
  if (requestError) throw new Error(requestError);
  const [source, variableValues] = buildEntityQuery({
    typeName,
    object,
    params,
    hasCustomTypeName,
    isRootOperation,
    isRelationshipOperation,
    operationField,
    resolveInfo
  });
  const contextValue = setContextKeyParams({
    context,
    serviceKeys,
    params
  });
  return {
    schema: resolveInfo.schema,
    source,
    contextValue,
    variableValues
  };
};

export const executeFederatedOperation = async ({
  typeName,
  operationField = {},
  isRootOperation,
  isRelationshipOperation,
  federatedOperation = {},
  hasCustomTypeName,
  resolveInfo,
  // FIXME temporary
  debugFlag = true
}) => {
  const astNode = operationField.astNode;
  const type = astNode ? astNode.type : {};
  const unwrappedType = unwrapNamedType({ type });
  const typeWrappers = unwrappedType.wrappers;
  const isListTypeEntityQuery = typeWrappers[TypeWrappers.LIST_TYPE];
  const source = federatedOperation.source;
  const variableValues = federatedOperation.variableValues;

  if (debugFlag) {
    console.log(source);
    console.log(JSON.stringify(variableValues, null, 2));
  }
  debug('%s', source);
  debug('%s', JSON.stringify(variableValues, null, 2));

  return await graphql(federatedOperation).then(({ data, errors }) => {
    if (errors && errors[0]) throw new ApolloError(errors);
    return decideFederatedOperationPayload({
      data,
      typeName,
      isRootOperation,
      isRelationshipOperation,
      isListTypeEntityQuery,
      hasCustomTypeName,
      resolveInfo,
      debugFlag
    });
  });
};

export const isFederatedOperation = ({ resolveInfo = {} }) => {
  const operation = resolveInfo.operation ? resolveInfo.operation : {};
  const selections = operation ? operation.selectionSet.selections : [];
  const firstField = selections.length ? selections[0] : {};
  const fieldName = firstField ? firstField.name.value : '';
  const isEntitySelection = fieldName === SERVICE_FIELDS.ENTITIES;
  let isRootOperation = false;
  let isRelationshipOperation = false;
  // Both root and nested reference resolvers recieve a selection
  // set that initially selects the _entities field
  if (isEntitySelection) {
    if (resolveInfo.fieldName === SERVICE_FIELDS.ENTITIES) {
      // If _entities is also the .fieldName value, then this is a root query
      isRootOperation = true;
    } else {
      // Otherwise, the fieldName is a relationship field in an extension
      // of a type from another service
      isRelationshipOperation = true;
    }
  }
  return [isRootOperation, isRelationshipOperation];
};

export const decideOperationTypeName = ({
  object = {},
  resolveInfo,
  isRootOperation,
  isRelationshipOperation
}) => {
  let { [INTROSPECTION_FIELD.TYPENAME]: typeName, ...keys } = object;
  if (!typeName) throw new ApolloError('Missing __typename key');
  let hasCustomTypeName = false;
  if (isRelationshipOperation) {
    // Because __typename is normally the parent type name, check
    // resolveInfo.parentType to see if it still is
    const relationshipFieldTypeName = innerType(
      resolveInfo.returnType
    ).toString();
    const parentTypeName = resolveInfo.parentType.name;
    if (typeName === parentTypeName) {
      // A custom __typename has not been provided, so the normal behavior
      // is to resolve the output type of the relationship field
      typeName = relationshipFieldTypeName;
    } else {
      // else a custom __typename has been provided, so it will pass through
      // hasCustomTypeName is marked true here for later deciding
      // the selection set to extract
      hasCustomTypeName = true;
    }
    // else a custom typename has been provided
  }
  // FIXME move recursive helper and remove all null values in nested compound / object keys
  // Remove any null keys
  const nonNullKeys = {};
  Object.entries(keys).forEach(([key, value]) => {
    if (key !== INTROSPECTION_FIELD.TYPENAME && value !== null) {
      nonNullKeys[key] = value;
    }
  });
  return [typeName, nonNullKeys, hasCustomTypeName];
};

const setContextKeyParams = ({
  context = {},
  serviceKeys = {},
  params = {}
}) => {
  context[CONTEXT_KEYS_PATH] = {
    ...serviceKeys,
    ...params
  };
  return context;
};

const getContextKeyParams = ({ context = {} }) =>
  context[CONTEXT_KEYS_PATH] || {};

export const getEntityKeys = ({ context }) => {
  const entityKeys = getContextKeyParams({ context });
  const compoundKeys = {};
  const scalarKeys = Object.entries(entityKeys).reduce(
    (scalarKeys, [serviceParam, value]) => {
      if (typeof value === 'object') {
        compoundKeys[serviceParam] = value;
      } else {
        scalarKeys[serviceParam] = value;
      }
      return scalarKeys;
    },
    {}
  );
  return [scalarKeys, compoundKeys];
};

export const setEntityQueryFilter = ({ params = {}, compoundKeys = {} }) => {
  if (Object.keys(compoundKeys).length) {
    // FIXME examine merging compound keys with a delegated relationship field filter,
    //       or an imperatively added filter param argument to neo4jgraphql in a reference
    //       resolver, preferencing any values provided by a user argument
    // if(!params['filter']) {
    params['filter'] = compoundKeys;
    // }
  }
  return params;
};

const buildEntityQuery = ({
  typeName,
  object,
  params,
  hasCustomTypeName,
  isRootOperation,
  isRelationshipOperation,
  operationField,
  resolveInfo
}) => {
  const [
    keyFieldArguments,
    variableDefinitions,
    variableValues
  ] = buildEntityQueryArguments({
    object,
    params,
    resolveInfo,
    operationField
  });
  const selectionSet = buildEntityQuerySelectionSet({
    typeName,
    hasCustomTypeName,
    keyFieldArguments,
    isRootOperation,
    isRelationshipOperation,
    resolveInfo
  });
  const source = printEntityQuerySource({
    variableDefinitions,
    selectionSet
  });
  return [source, variableValues];
};

// TODO explain some lines
const buildEntityQueryArguments = ({
  object,
  params,
  resolveInfo,
  operationField
}) => {
  const {
    [SERVICE_FIELD_ARGUMENTS.REPRESENTATIONS]: representations,
    ...variableValues
  } = resolveInfo.variableValues;

  const operation = resolveInfo.operation;
  const variableDefinitions = operation.variableDefinitions.filter(
    ({ variable }) => {
      return variable.name.value !== SERVICE_FIELD_ARGUMENTS.REPRESENTATIONS;
    }
  );
  const [
    keyFieldArguments,
    keyVariableDefinitions,
    keyVariableValues
  ] = operationField.args.reduce(
    ([keyFieldArguments, keyVariableDefinitions, keyVariableValues], arg) => {
      const astNode = arg.astNode;
      let name = astNode.name.value;
      const hasKeyFieldArgument = object[name] !== undefined;
      const hasCustomFieldArgument = params[name] !== undefined;
      if (hasKeyFieldArgument || hasCustomFieldArgument) {
        if (hasKeyFieldArgument) {
          const serviceVariableName = `${SERVICE_VARIABLE}${name}`;
          keyVariableValues[serviceVariableName] = object[name];
          name = serviceVariableName;
        }
        keyFieldArguments.push({
          ...astNode,
          type: buildNamedType({
            name: `$${name}`
          })
        });
        keyVariableDefinitions.push(
          buildVariableDefinition({
            variable: buildVariable({
              name: buildName({
                name
              })
            }),
            type: astNode.type
          })
        );
      }
      return [keyFieldArguments, keyVariableDefinitions, keyVariableValues];
    },
    [[], [], {}]
  );

  // Prefer using the value, if any, provided in any params
  // built in the prior __referenceResolver
  const mergedVariableValues = {
    ...keyVariableValues,
    ...variableValues,
    ...params
  };
  variableDefinitions.unshift(...keyVariableDefinitions);
  return [keyFieldArguments, variableDefinitions, mergedVariableValues];
};

export const getEntityQueryField = ({
  typeName,
  resolveInfo,
  isRootOperation,
  isRelationshipOperation
}) => {
  const schema = resolveInfo.schema;
  let field = {};
  if (isRootOperation) {
    const queryType = schema.getQueryType();
    const queryFields = queryType.getFields();
    field = queryFields[typeName];
  } else if (isRelationshipOperation) {
    const relationshipFieldName = resolveInfo.fieldName;
    // get the field being queried on the extended type in resolveInfo.parentType
    const parentType = resolveInfo.parentType;
    const fields = parentType.getFields();
    field = fields[relationshipFieldName];
  }
  return field;
};

const buildEntityQuerySelectionSet = ({
  typeName,
  hasCustomTypeName,
  keyFieldArguments,
  isRootOperation,
  isRelationshipOperation,
  resolveInfo
}) => {
  let selectionSet = resolveInfo.fieldNodes[0].selectionSet;
  if (isRootOperation) {
    selectionSet = selectionSet.selections[0].selectionSet;
    selectionSet = buildSelectionSet({
      selections: [
        buildFieldSelection({
          name: buildName({
            name: typeName
          }),
          args: keyFieldArguments,
          selectionSet
        })
      ]
    });
  } else if (isRelationshipOperation) {
    if (hasCustomTypeName) {
      selectionSet = buildFieldSelection({
        name: buildName({
          name: ''
        }),
        selectionSet: {
          kind: Kind.SELECTION_SET,
          selections: resolveInfo.fieldNodes
        }
      });
    }
    selectionSet = buildSelectionSet({
      selections: [
        buildFieldSelection({
          name: buildName({
            name: typeName
          }),
          args: keyFieldArguments,
          selectionSet
        })
      ]
    });
  }
  return selectionSet;
};

const printEntityQuerySource = ({
  variableDefinitions = [],
  selectionSet = {}
}) => {
  return `query ${NEO4j_GRAPHQL_SERVICE}${
    variableDefinitions.length ? `(${print(variableDefinitions)})` : ''
  } ${print(selectionSet)}`;
};

const decideFederatedOperationPayload = ({
  data,
  typeName,
  isRootOperation,
  isRelationshipOperation,
  isListTypeEntityQuery,
  hasCustomTypeName,
  resolveInfo,
  debugFlag
}) => {
  let entityData = data[typeName];
  const dataExists = entityData !== undefined;
  const isListData = dataExists && Array.isArray(entityData);
  if (dataExists) {
    if (isRootOperation) {
      entityData = decideRootOperationData({
        entityData,
        isListData
      });
    } else if (isRelationshipOperation) {
      entityData = decideRealationshipOperationData({
        entityData,
        hasCustomTypeName,
        resolveInfo,
        isListTypeEntityQuery,
        isListData
      });
    }
  }
  if (debugFlag) {
    console.log(`Neo4j return for ${typeName}: `);
    console.log(JSON.stringify(entityData, null, 2));
  }
  debug('%s', JSON.stringify(entityData, null, 2));
  return entityData;
};

const decideRootOperationData = ({ entityData, isListData }) => {
  if (isListData && entityData.length) {
    // Get only the first element of a list, because the other service
    // expects a unique lookup for each provided representation
    entityData = entityData[0];
  }
  return entityData;
};

const decideRealationshipOperationData = ({
  entityData,
  hasCustomTypeName,
  resolveInfo,
  isListTypeEntityQuery,
  isListData
}) => {
  if (hasCustomTypeName) {
    const relationshipFieldName = resolveInfo.fieldName;
    // only data for this relationship field was fetched
    if (isListData) {
      if (entityData.length) {
        entityData = entityData[0][relationshipFieldName];
      }
    } else {
      entityData = entityData[relationshipFieldName];
    }
    const relationshipDataExists = entityData !== undefined;
    const isRelationshipListData =
      relationshipDataExists && Array.isArray(entityData);
    if (!isListTypeEntityQuery) {
      if (isRelationshipListData) {
        // in case the queried type extension relationship field is a not list
        // but the field used for translation with a custom typename is a list
        entityData = entityData[0];
      }
    } else {
      // in case the queried type extension relationship field is a list
      // but the field used for translation with a custom typename is a not list
      if (!isRelationshipListData) {
        entityData = [entityData];
      }
    }
  } else {
    if (!isListTypeEntityQuery) {
      entityData = entityData[0];
    }
  }
  // else if list without a custom __typename,
  // return above default of data[typeName]
  return entityData;
};
