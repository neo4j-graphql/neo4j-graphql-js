import {
  print,
  parse,
  isScalarType,
  GraphQLList,
  isEnumType,
  isListType
} from 'graphql';
import { ApolloError } from 'apollo-server';
import {
  buildSelectionSet,
  buildFieldSelection,
  buildName,
  buildVariableDefinition,
  buildVariable,
  buildArgument
} from './augment/ast';
import { checkRequestError } from './auth';
import Debug from 'debug';
import { neo4jgraphql } from './index';

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

export const executeFederatedOperation = async ({
  object,
  params,
  context,
  resolveInfo,
  debugFlag
}) => {
  const requestError = checkRequestError(context);
  if (requestError) throw new Error(requestError);
  const [typeName, parentTypeData] = decideTypeName({
    object,
    resolveInfo
  });
  const schema = resolveInfo.schema;
  const entityType = schema.getType(typeName);
  const operationResolveInfo = buildOperation({
    object,
    params,
    context,
    parentTypeData,
    resolveInfo,
    entityType,
    typeName,
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
  return decideOperationPayload({
    data,
    object,
    entityType,
    typeName,
    resolveInfo,
    debugFlag
  });
};

const buildOperation = ({
  object,
  params,
  resolveInfo,
  entityType,
  schema,
  typeName
}) => {
  const [
    keyFieldArguments,
    variableDefinitions,
    variableValues
  ] = buildArguments({
    entityType,
    object,
    // params,
    resolveInfo
  });
  const source = buildSource({
    typeName,
    variableDefinitions,
    keyFieldArguments,
    resolveInfo
  });
  const operationResolveInfo = buildResolveInfo({
    typeName,
    entityType,
    source,
    variableValues,
    schema
  });
  return operationResolveInfo;
};

export const isFederatedOperation = ({ resolveInfo = {} }) => {
  const operation = resolveInfo.operation ? resolveInfo.operation : {};
  const selections = operation ? operation.selectionSet.selections : [];
  const firstField = selections.length ? selections[0] : {};
  const fieldName = firstField ? firstField.name.value : '';
  const isEntitySelection = fieldName === SERVICE_FIELDS.ENTITIES;
  let isFederated = false;
  // Both root and nested reference resolvers recieve a selection
  // set that initially selects the _entities field
  if (isEntitySelection) {
    if (resolveInfo.fieldName === SERVICE_FIELDS.ENTITIES) {
      // If _entities is also the .fieldName value, then this is a root query
      isFederated = true;
    }
  }
  return isFederated;
};

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

const decideTypeName = ({ object = {}, resolveInfo }) => {
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

const buildArguments = ({
  entityType,
  object,
  // params,
  resolveInfo
}) => {
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
        const hasKeyFieldArgument = object[name] !== undefined;
        if (hasKeyFieldArgument) {
          if (hasKeyFieldArgument) {
            const serviceVariableName = `${SERVICE_VARIABLE}${name}`;
            keyVariableValues[serviceVariableName] = object[name];
            name = serviceVariableName;
          }
          keyFieldArguments.push(
            buildArgument({
              name: buildName({
                name
              }),
              value: buildName({
                name: `$${name}`
              })
            })
          );
          keyVariableDefinitions.push(
            buildVariableDefinition({
              variable: buildVariable({
                name: buildName({
                  name
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
  // Prefer using the value, if any, provided in any params
  // built in the prior __referenceResolver
  const mergedVariableValues = {
    ...keyVariableValues,
    ...variableValues
    // ...params
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
  typeName,
  entityType,
  source,
  variableValues,
  schema
}) => {
  const fieldName = typeName;
  const path = { key: typeName };
  // Assume a list query and extract in decideOperationPayload
  const returnType = new GraphQLList(entityType);
  const parsedSource = parse(source);
  const operation = parsedSource.definitions[0];
  const fieldNodes = operation.selectionSet.selections;
  return {
    fieldName,
    fieldNodes,
    returnType,
    path,
    schema,
    operation,
    variableValues
    // Unused resolveInfo properties
    // parentType: undefined,
    // fragments: undefined,
    // rootValue: undefined
  };
};

const buildSource = ({
  typeName,
  variableDefinitions = [],
  keyFieldArguments,
  resolveInfo
}) => {
  const selectionSet = getSelectionSet({
    typeName,
    keyFieldArguments,
    resolveInfo
  });
  return `query ${NEO4j_GRAPHQL_SERVICE}${
    variableDefinitions.length ? `(${print(variableDefinitions)})` : ''
  } ${print(selectionSet)}`;
};

const decideOperationPayload = ({ data }) => {
  const dataExists = data !== undefined;
  const isListData = dataExists && Array.isArray(data);
  if (dataExists && isListData && data.length) {
    data = data[0];
  }
  return data;
};
