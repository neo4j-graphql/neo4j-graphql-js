import { parse, isScalarType, GraphQLList, isEnumType } from 'graphql';
import { ApolloError } from 'apollo-server-errors';
import {
  buildSelectionSet,
  buildFieldSelection,
  buildName,
  buildVariableDefinition,
  buildVariable,
  buildArgument,
  buildOperationDefinition
} from './augment/ast';
import { checkRequestError } from './auth';
import { neo4jgraphql } from './index';

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

const REFERENCE_RESOLVER_NAME = '__resolveReference';

export const executeFederatedOperation = async ({
  object,
  params,
  context,
  resolveInfo,
  debugFlag
}) => {
  const requestError = checkRequestError(context);
  if (requestError) throw new Error(requestError);
  const [typeName, parentTypeData] = parseRepresentation({
    object,
    resolveInfo
  });
  const schema = resolveInfo.schema;
  const entityType = schema.getType(typeName);
  const operationResolveInfo = buildResolveInfo({
    parentTypeData,
    typeName,
    entityType,
    resolveInfo,
    schema
  });
  const operationContext = setOperationContext({
    typeName,
    parentTypeData,
    params,
    context,
    resolveInfo
  });
  const data = await neo4jgraphql(
    {},
    params,
    operationContext,
    operationResolveInfo,
    debugFlag
  );
  return decideOperationPayload({ data });
};

export const isFederatedOperation = ({ resolveInfo = {} }) =>
  resolveInfo.fieldName === SERVICE_FIELDS.ENTITIES;

export const setCompoundKeyFilter = ({ params = {}, compoundKeys = {} }) => {
  if (Object.keys(compoundKeys).length) {
    const filterArgument = Object.entries(compoundKeys).reduce(
      (filterArgument, [fieldName, value]) => {
        // compound key for a list field of an object type uses AND filter
        if (Array.isArray(value)) {
          filterArgument[fieldName] = {
            AND: value
          };
        } else {
          filterArgument[fieldName] = value;
        }
        return filterArgument;
      },
      {}
    );
    params['filter'] = filterArgument;
  }
  return params;
};

export const getFederatedOperationData = ({ context }) => {
  const [entityKeys, requiredData, params] = context[CONTEXT_KEYS_PATH] || {};
  const compoundKeys = {};
  const scalarKeys = {};
  Object.entries(entityKeys).forEach(([serviceParam, value]) => {
    if (typeof value === 'object') {
      compoundKeys[serviceParam] = value;
    } else {
      scalarKeys[serviceParam] = value;
    }
  });
  return {
    scalarKeys,
    compoundKeys,
    requiredData,
    params
  };
};

const setOperationContext = ({
  typeName,
  context = {},
  parentTypeData = {},
  params = {},
  resolveInfo
}) => {
  const entityType = resolveInfo.schema.getType(typeName);
  const extensionASTNodes = entityType.extensionASTNodes;
  const keyFieldMap = buildTypeExtensionKeyFieldMap({
    entityType,
    extensionASTNodes
  });
  const requiredFieldMap = getTypeExtensionRequiredFieldMap({
    parentTypeData,
    keyFieldMap
  });
  const [keyData, requiredData] = Object.entries(parentTypeData).reduce(
    ([keyData, requiredData], [name, value]) => {
      if (keyFieldMap[name]) {
        keyData[name] = value;
      } else if (requiredFieldMap[name]) {
        requiredData[name] = value;
      }
      return [keyData, requiredData];
    },
    [{}, {}]
  );
  context[CONTEXT_KEYS_PATH] = [keyData, requiredData, params];
  return context;
};

const parseRepresentation = ({ object = {}, resolveInfo }) => {
  let { [INTROSPECTION_FIELD.TYPENAME]: typeName, ...fieldData } = object;
  if (!typeName) {
    // Set default
    typeName = getEntityTypeName({
      resolveInfo
    });
  }
  // Error if still no typeName
  if (typeName === undefined) {
    throw new ApolloError('Missing __typename key');
  }
  // Prepare provided key and required field data
  // for translation, removing nulls
  const parentTypeData = getDefinedKeys({
    fieldData
  });
  return [typeName, parentTypeData];
};

const getEntityTypeName = ({ resolveInfo = {} }) => {
  const operation = resolveInfo.operation || {};
  const rootSelection = operation.selectionSet
    ? operation.selectionSet.selections[0]
    : {};
  const entityFragment = rootSelection.selectionSet
    ? rootSelection.selectionSet.selections[0]
    : {};
  const typeCondition = entityFragment
    ? entityFragment.typeCondition.name.value
    : undefined;
  return typeCondition;
};

const getDefinedKeys = ({ fieldData = {}, parentTypeData = {} }) => {
  Object.entries(fieldData).forEach(([key, value]) => {
    const isList = Array.isArray(value);
    const isNotEmptyList = !isList || value.length;
    if (
      key !== INTROSPECTION_FIELD.TYPENAME &&
      value !== null &&
      isNotEmptyList
    ) {
      // When no value is returned for a field in a compound key
      // it's value is null and should be removed to prevent a
      // _not filter translation
      if (!isList && typeof value === 'object') {
        const definedKeys = getDefinedKeys({
          fieldData: value
        });
        // Keep it if at least one key has a valid value
        if (definedKeys && Object.values(definedKeys).length) {
          parentTypeData[key] = definedKeys;
        }
      } else {
        parentTypeData[key] = value;
      }
    }
  });
  return parentTypeData;
};

const buildTypeExtensionKeyFieldMap = ({
  extensionASTNodes = [],
  entityType = {}
}) => {
  const entityTypeAst = entityType.astNode;
  const entityTypeDirectives = entityTypeAst.directives || [];
  let keyFieldMap = getFederationDirectiveFields({
    directives: entityTypeDirectives,
    directiveName: 'key'
  });
  extensionASTNodes.map(type => {
    const directives = type.directives;
    keyFieldMap = getFederationDirectiveFields({
      directives,
      keyFieldMap,
      directiveName: 'key'
    });
  });
  return keyFieldMap;
};

const getTypeExtensionRequiredFieldMap = ({
  parentTypeData = {},
  keyFieldMap = {}
}) => {
  // Infers that any entity field value which is not a key
  // is provided given the use of a @requires directive
  let requiredFieldMap = {};
  Object.keys(parentTypeData).forEach(fieldName => {
    if (keyFieldMap[fieldName] === undefined) {
      requiredFieldMap[fieldName] = true;
    }
  });
  return requiredFieldMap;
};

const getFederationDirectiveFields = ({
  directives = [],
  keyFieldMap = {},
  directiveName = ''
}) => {
  directives.forEach(directive => {
    const name = directive.name.value;
    if (name === directiveName) {
      const fields = directive.arguments.find(
        arg => arg.name.value === 'fields'
      );
      if (fields) {
        const fieldsArgument = fields.value.value;
        const parsedKeyFields = parse(`{ ${fieldsArgument} }`);
        const definitions = parsedKeyFields.definitions;
        const selections = definitions[0].selectionSet.selections;
        selections.forEach(field => {
          const name = field.name.value;
          keyFieldMap[name] = true;
        });
      }
    }
  });
  return keyFieldMap;
};

const buildArguments = ({ entityType, parentTypeData, resolveInfo }) => {
  const entityFields = entityType.getFields();
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
  ] = Object.values(entityFields).reduce(
    ([keyFieldArguments, keyVariableDefinitions, keyVariableValues], field) => {
      const astNode = field.astNode;
      let name = astNode.name.value;
      const type = astNode.type;
      if (isScalarType(field.type) || isEnumType(field.type)) {
        const hasKeyFieldArgument = parentTypeData[name] !== undefined;
        if (hasKeyFieldArgument) {
          const serviceVariableName = `${SERVICE_VARIABLE}${name}`;
          keyVariableValues[serviceVariableName] = parentTypeData[name];
          keyFieldArguments.push(
            buildArgument({
              name: buildName({
                name
              }),
              value: buildName({
                name: `$${serviceVariableName}`
              })
            })
          );
          // keyVariableDefinitions are not currently used but could be
          // so they're built here for now and we scope the variable name
          keyVariableDefinitions.push(
            buildVariableDefinition({
              variable: buildVariable({
                name: buildName({
                  name: serviceVariableName
                })
              }),
              type
            })
          );
        }
      }
      return [keyFieldArguments, keyVariableDefinitions, keyVariableValues];
    },
    [[], [], {}]
  );
  const mergedVariableValues = {
    ...keyVariableValues,
    ...variableValues
  };
  variableDefinitions.unshift(...keyVariableDefinitions);
  return [keyFieldArguments, variableDefinitions, mergedVariableValues];
};

const getSelectionSet = ({ typeName, keyFieldArguments, resolveInfo }) => {
  let selectionSet = {};
  if (resolveInfo.fieldNodes) {
    selectionSet = resolveInfo.fieldNodes[0].selectionSet;
    // Get the selections inside the fragment provided on the entity type
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
  }
  if (!Object.keys(selectionSet).length) {
    throw new ApolloError(
      `Failed to extract the expected selectionSet for the entity ${typeName}`
    );
  }
  return selectionSet;
};

const buildResolveInfo = ({
  parentTypeData,
  typeName,
  entityType,
  resolveInfo,
  schema
}) => {
  const fieldName = typeName;
  const path = { key: typeName };
  const [
    keyFieldArguments,
    variableDefinitions,
    variableValues
  ] = buildArguments({
    entityType,
    parentTypeData,
    resolveInfo
  });
  const selectionSet = getSelectionSet({
    typeName,
    keyFieldArguments,
    resolveInfo
  });
  const fieldNodes = selectionSet.selections;
  const operation = buildOperationDefinition({
    operation: 'query',
    name: buildName({
      name: NEO4j_GRAPHQL_SERVICE
    }),
    selectionSet,
    variableDefinitions
  });
  // Assume a list query and extract in decideOperationPayload
  const returnType = new GraphQLList(entityType);
  return {
    fieldName,
    fieldNodes,
    returnType,
    path,
    schema,
    operation,
    variableValues
    // Unused by neo4jgraphql translation
    // parentType: undefined,
    // fragments: undefined,
    // rootValue: undefined
  };
};

const decideOperationPayload = ({ data }) => {
  const dataExists = data !== undefined;
  const isListData = dataExists && Array.isArray(data);
  if (dataExists && isListData && data.length) {
    data = data[0];
  }
  return data;
};

export const generateBaseTypeReferenceResolvers = ({
  queryResolvers = {},
  resolvers = {},
  config
}) => {
  Object.keys(queryResolvers).forEach(typeName => {
    // Initialize type resolver object
    if (resolvers[typeName] === undefined) resolvers[typeName] = {};
    // If not provided
    if (resolvers[typeName][REFERENCE_RESOLVER_NAME] === undefined) {
      resolvers[typeName][REFERENCE_RESOLVER_NAME] = async function(
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
  return resolvers;
};

export const generateNonLocalTypeExtensionReferenceResolvers = ({
  resolvers,
  generatedTypeMap,
  typeExtensionDefinitionMap,
  queryTypeName,
  mutationTypeName,
  subscriptionTypeName,
  config
}) => {
  Object.keys(typeExtensionDefinitionMap).forEach(typeName => {
    if (
      typeName !== queryTypeName &&
      typeName !== mutationTypeName &&
      typeName !== subscriptionTypeName
    ) {
      if (generatedTypeMap[typeName] === undefined) {
        // Initialize type resolver object
        if (resolvers[typeName] === undefined) resolvers[typeName] = {};
        // If not provided
        if (resolvers[typeName][REFERENCE_RESOLVER_NAME] === undefined) {
          resolvers[typeName][REFERENCE_RESOLVER_NAME] = async function(
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
  return resolvers;
};
