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

const buildFederatedOperation = ({
  object,
  params,
  resolveInfo,
  entityType,
  schema,
  typeName,
  hasCustomTypeName,
  isBaseTypeOperation,
  isExtendedTypeOperation
}) => {
  const [
    keyFieldArguments,
    variableDefinitions,
    variableValues
  ] = buildEntityQueryArguments({
    entityType,
    object,
    // params,
    resolveInfo
  });
  const selectionSet = buildEntityQuerySelectionSet({
    typeName,
    entityType,
    hasCustomTypeName,
    keyFieldArguments,
    isBaseTypeOperation,
    isExtendedTypeOperation,
    resolveInfo
  });
  const source = printEntityQuerySource({
    variableDefinitions,
    selectionSet
  });
  const fieldName = typeName;
  const path = {
    key: typeName,
    prev: undefined
  };
  const returnType = new GraphQLList(entityType);
  const parsedSource = parse(source);
  const operation = parsedSource.definitions[0];
  const fieldNodes = operation.selectionSet.selections;
  const operationResolveInfo = {
    fieldName,
    fieldNodes,
    returnType,
    path,
    schema,
    operation,
    variableValues
    // parentType: undefined,
    // fragments: undefined,
    // rootValue: undefined
  };
  return operationResolveInfo;
};

export const executeFederatedOperation = async ({
  object,
  params,
  context,
  resolveInfo,
  isBaseTypeOperation,
  isExtendedTypeOperation,
  debugFlag
}) => {
  const requestError = checkRequestError(context);
  if (requestError) throw new Error(requestError);
  const [typeName, parentTypeData, hasCustomTypeName] = decideOperationTypeName(
    {
      object,
      resolveInfo,
      isBaseTypeOperation,
      isExtendedTypeOperation
    }
  );
  const schema = resolveInfo.schema;
  const entityType = schema.getType(typeName);
  const operationResolveInfo = buildFederatedOperation({
    object,
    params,
    context,
    parentTypeData,
    resolveInfo,
    entityType,
    typeName,
    schema,
    hasCustomTypeName,
    isBaseTypeOperation,
    isExtendedTypeOperation
  });
  const operationContext = setContextKeyParams({
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
  return decideFederatedOperationPayload({
    data,
    object,
    entityType,
    typeName,
    isBaseTypeOperation,
    isExtendedTypeOperation,
    hasCustomTypeName,
    resolveInfo,
    debugFlag
  });
};

export const isFederatedOperation = ({ resolveInfo = {} }) => {
  const operation = resolveInfo.operation ? resolveInfo.operation : {};
  const selections = operation ? operation.selectionSet.selections : [];
  const firstField = selections.length ? selections[0] : {};
  const fieldName = firstField ? firstField.name.value : '';
  const isEntitySelection = fieldName === SERVICE_FIELDS.ENTITIES;
  let isBaseTypeOperation = false;
  let isExtendedTypeOperation = false;
  // Both root and nested reference resolvers recieve a selection
  // set that initially selects the _entities field
  if (isEntitySelection) {
    if (resolveInfo.fieldName === SERVICE_FIELDS.ENTITIES) {
      // If _entities is also the .fieldName value, then this is a root query
      isBaseTypeOperation = true;
    } else {
      // Otherwise, the fieldName is a relationship field in an extension
      // of a type from another service
      isExtendedTypeOperation = true;
    }
  }
  return [isBaseTypeOperation, isExtendedTypeOperation];
};

export const isNonLocalType = ({ generatedTypeMap = {}, typeName = '' }) => {
  return generatedTypeMap[typeName] === undefined;
};

export const decideOperationTypeName = ({
  object = {},
  resolveInfo,
  isBaseTypeOperation,
  isExtendedTypeOperation
}) => {
  let { [INTROSPECTION_FIELD.TYPENAME]: typeName, ...fieldData } = object;
  let hasCustomTypeName = false;
  const parentTypeName = resolveInfo.parentType.name;
  if (isExtendedTypeOperation) {
    if (!typeName) {
      // Set default
      typeName = parentTypeName;
    }
  } else if (isBaseTypeOperation) {
    if (!typeName) {
      // Set default
      typeName = getEntityQueryType({
        resolveInfo
      });
    }
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

  return [typeName, parentTypeData, hasCustomTypeName];
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

const getEntityQueryType = ({ resolveInfo = {} }) => {
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

const setContextKeyParams = ({
  typeName,
  context = {},
  parentTypeData = {},
  params = {},
  resolveInfo
}) => {
  const entityType = resolveInfo.schema.getType(typeName);
  const extensionASTNodes = entityType.extensionASTNodes;
  const keyFieldMap = getTypeExtensionKeyFieldMap({
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

const getContextKeyParams = ({ context = {} }) =>
  context[CONTEXT_KEYS_PATH] || {};

export const getFederatedOperationData = ({ context }) => {
  const [entityKeys, requiredData, params] = getContextKeyParams({ context });
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
  return {
    scalarKeys,
    compoundKeys,
    requiredData,
    params
  };
};

const getTypeExtensionKeyFieldMap = ({
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

export const setEntityQueryFilter = ({ params = {}, compoundKeys = {} }) => {
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

const buildEntityQueryArguments = ({
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

const buildEntityQuerySelectionSet = ({
  typeName,
  keyFieldArguments,
  isBaseTypeOperation,
  isExtendedTypeOperation,
  resolveInfo
}) => {
  let selectionSet = resolveInfo.fieldNodes[0].selectionSet;
  if (selectionSet) {
    if (isBaseTypeOperation) {
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
    } else if (isExtendedTypeOperation) {
      selectionSet =
        resolveInfo.operation.selectionSet.selections[0].selectionSet;
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
  } else {
    // Scalar fields won't have a selection set
    selectionSet = buildSelectionSet({
      selections: [
        buildFieldSelection({
          name: buildName({
            name: typeName
          }),
          args: keyFieldArguments,
          selectionSet: buildFieldSelection({
            name: buildName({
              name: ''
            }),
            selectionSet: buildSelectionSet({
              selections: resolveInfo.fieldNodes
            })
          })
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
  object,
  entityType,
  isBaseTypeOperation,
  isExtendedTypeOperation,
  hasCustomTypeName,
  resolveInfo
}) => {
  const dataExists = data !== undefined;
  const isListData = dataExists && Array.isArray(data);
  if (dataExists) {
    if (isBaseTypeOperation) {
      data = decideRootOperationData({
        data,
        isListData
      });
    } else if (isExtendedTypeOperation) {
      data = decideRealationshipOperationData({
        object,
        data,
        entityType,
        hasCustomTypeName,
        resolveInfo,
        isListData
      });
    }
  }
  return data;
};

const decideRootOperationData = ({ data, isListData }) => {
  if (isListData && data.length) {
    // Get only the first element of a list, because the other service
    // expects a unique lookup for each provided representation
    data = data[0];
  }
  return data;
};

const decideRealationshipOperationData = ({
  data,
  entityType,
  resolveInfo,
  isListData
}) => {
  const relationshipFieldName = resolveInfo.fieldName;
  const entityFields = entityType.getFields();
  const operationField = entityFields[relationshipFieldName];
  const fieldType = operationField.type;
  const isListTypeEntityQuery = isListType(fieldType);
  // FOr now, every translation assumes list
  if (isListData) {
    if (data.length) {
      const relationshipData = data[0][relationshipFieldName];
      if (relationshipData) {
        data = relationshipData;
      }
    } else {
      return null;
    }
  } else {
    data = data[relationshipFieldName];
  }
  if (!isListTypeEntityQuery) {
    // The queried field was not a list, but since we assume a list
    // for the entity query translation, we need to just return the
    // first element
    const nestedData = data[0];
    if (nestedData !== undefined) {
      const relationshipData = nestedData[relationshipFieldName];
      if (relationshipData !== undefined) {
        data = relationshipData;
      }
    }
  }
  return data;
};
