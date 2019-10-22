import {
  Kind,
  parse,
  print,
  isTypeDefinitionNode,
  isTypeExtensionNode
} from 'graphql';
import { makeExecutableSchema } from 'graphql-tools';
import {
  buildDocument,
  buildOperationType,
  buildSchemaDefinition,
  buildName,
  buildNamedType,
  buildObjectType
} from './ast';
import {
  OperationType,
  isNodeType,
  augmentTypes,
  transformNeo4jTypes
} from './types/types';
import { unwrapNamedType } from './fields';
import { augmentDirectiveDefinitions } from './directives';
import { extractResolversFromSchema, augmentResolvers } from './resolvers';
import { addAuthDirectiveImplementations } from '../auth';

/**
 * The main export for augmenting an SDL document
 */
export const makeAugmentedExecutableSchema = ({
  typeDefs,
  resolvers,
  logger,
  allowUndefinedInResolve,
  resolverValidationOptions,
  directiveResolvers,
  schemaDirectives = {},
  parseOptions,
  inheritResolversFromInterfaces,
  config
}) => {
  const definitions = parse(typeDefs).definitions;
  let generatedTypeMap = {};
  let [
    typeDefinitionMap,
    typeExtensionDefinitionMap,
    directiveDefinitionMap,
    operationTypeMap
  ] = mapDefinitions({
    definitions,
    config
  });
  [
    typeExtensionDefinitionMap,
    generatedTypeMap,
    operationTypeMap
  ] = augmentTypes({
    typeDefinitionMap,
    typeExtensionDefinitionMap,
    generatedTypeMap,
    operationTypeMap,
    config
  });
  [generatedTypeMap, directiveDefinitionMap] = augmentDirectiveDefinitions({
    typeDefinitionMap: generatedTypeMap,
    directiveDefinitionMap,
    config
  });
  schemaDirectives = addAuthDirectiveImplementations(
    schemaDirectives,
    generatedTypeMap,
    config
  );
  const mergedDefinitions = mergeDefinitionMaps({
    generatedTypeMap,
    typeExtensionDefinitionMap,
    operationTypeMap,
    directiveDefinitionMap
  });
  const transformedDefinitions = transformNeo4jTypes({
    definitions: mergedDefinitions,
    config
  });
  const documentAST = buildDocument({
    definitions: transformedDefinitions
  });
  const augmentedResolvers = augmentResolvers(
    generatedTypeMap,
    operationTypeMap,
    resolvers,
    config
  );
  resolverValidationOptions.requireResolversForResolveType = false;
  return makeExecutableSchema({
    typeDefs: print(documentAST),
    resolvers: augmentedResolvers,
    logger,
    allowUndefinedInResolve,
    resolverValidationOptions,
    directiveResolvers,
    schemaDirectives,
    parseOptions,
    inheritResolversFromInterfaces
  });
};

/**
 * The main export for augmnetation a schema
 */
export const augmentedSchema = (schema, config) => {
  const definitions = extractSchemaDefinitions({ schema });
  let [
    typeDefinitionMap,
    typeExtensionDefinitionMap,
    directiveDefinitionMap,
    operationTypeMap
  ] = mapDefinitions({
    definitions,
    config
  });
  let generatedTypeMap = {};
  [
    typeExtensionDefinitionMap,
    generatedTypeMap,
    operationTypeMap
  ] = augmentTypes({
    typeDefinitionMap,
    typeExtensionDefinitionMap,
    generatedTypeMap,
    operationTypeMap,
    config
  });
  [generatedTypeMap, directiveDefinitionMap] = augmentDirectiveDefinitions({
    typeDefinitionMap: generatedTypeMap,
    directiveDefinitionMap,
    config
  });
  let schemaDirectives = {};
  schemaDirectives = addAuthDirectiveImplementations(
    schemaDirectives,
    generatedTypeMap,
    config
  );
  const mergedDefinitions = mergeDefinitionMaps({
    generatedTypeMap,
    typeExtensionDefinitionMap,
    operationTypeMap,
    directiveDefinitionMap
  });
  const transformedDefinitions = transformNeo4jTypes({
    definitions: mergedDefinitions,
    config
  });
  const documentAST = buildDocument({
    definitions: transformedDefinitions
  });
  const resolvers = extractResolversFromSchema(schema);
  const augmentedResolvers = augmentResolvers(
    generatedTypeMap,
    operationTypeMap,
    resolvers,
    config
  );
  return makeExecutableSchema({
    typeDefs: print(documentAST),
    resolvers: augmentedResolvers,
    resolverValidationOptions: {
      requireResolversForResolveType: false
    },
    schemaDirectives
  });
};

/**
 * Builds separate type definition maps for use in augmentation
 */
export const mapDefinitions = ({ definitions = [], config = {} }) => {
  const typeExtensionDefinitionMap = {};
  const directiveDefinitionMap = {};
  let typeDefinitionMap = {};
  let schemaDefinitionNode = undefined;
  definitions.forEach(def => {
    if (def.kind === Kind.SCHEMA_DEFINITION) {
      schemaDefinitionNode = def;
      typeDefinitionMap[`schema`] = def;
    } else if (isTypeDefinitionNode(def)) {
      const name = def.name.value;
      typeDefinitionMap[name] = def;
    } else if (isTypeExtensionNode(def)) {
      const name = def.name.value;
      if (!typeExtensionDefinitionMap[name]) {
        typeExtensionDefinitionMap[name] = [];
      }
      typeExtensionDefinitionMap[name].push(def);
    } else if (def.kind === Kind.DIRECTIVE_DEFINITION) {
      const name = def.name.value;
      directiveDefinitionMap[name] = def;
    }
  });
  const [typeMap, operationTypeMap] = initializeOperationTypes({
    typeDefinitionMap,
    schemaDefinitionNode,
    config
  });
  return [
    typeMap,
    typeExtensionDefinitionMap,
    directiveDefinitionMap,
    operationTypeMap
  ];
};

/**
 * Merges back together all type definition maps used in augmentation
 */
export const mergeDefinitionMaps = ({
  generatedTypeMap = {},
  typeExtensionDefinitionMap = {},
  operationTypeMap = {},
  directiveDefinitionMap = {}
}) => {
  const typeExtensions = Object.values(typeExtensionDefinitionMap);
  if (typeExtensions) {
    typeExtensionDefinitionMap = typeExtensions.reduce(
      (typeExtensions, extensions) => {
        typeExtensions.push(...extensions);
        return typeExtensions;
      },
      []
    );
  }
  return Object.values({
    ...generatedTypeMap,
    ...typeExtensionDefinitionMap,
    ...operationTypeMap,
    ...directiveDefinitionMap
  });
};

/**
 * Given a type name, checks whether it is excluded from
 * the Query or Mutation API
 */
export const shouldAugmentType = (config, operationTypeName, typeName) => {
  return typeof config[operationTypeName] === 'boolean'
    ? config[operationTypeName]
    : // here .exclude should be an object,
    // set at the end of excludeIgnoredTypes
    typeName
    ? !getExcludedTypes(config, operationTypeName).some(
        excludedType => excludedType === typeName
      )
    : false;
};

/**
 * Given the type names of the nodes of a relationship, checks
 * whether the relationship is excluded from the API by way of
 * both related nodes being excluded
 */
export const shouldAugmentRelationshipField = (
  config,
  operationTypeName,
  fromName,
  toName
) => {
  return (
    shouldAugmentType(config, operationTypeName, fromName) &&
    shouldAugmentType(config, operationTypeName, toName)
  );
};

/**
 * Prints the AST of a GraphQL SDL Document containing definitions
 * extracted from a given schema, along with no loss of directives and a
 * regenerated schema type
 */
export const printSchemaDocument = ({ schema }) => {
  return print(
    buildDocument({
      definitions: extractSchemaDefinitions({ schema })
    })
  );
};

/**
 * Builds any operation types that do not exist but should
 */
const initializeOperationTypes = ({
  typeDefinitionMap,
  schemaDefinitionNode,
  config = {}
}) => {
  let queryTypeName = OperationType.QUERY;
  let mutationTypeName = OperationType.MUTATION;
  let subscriptionTypeName = OperationType.SUBSCRIPTION;
  if (schemaDefinitionNode) {
    const operationTypes = schemaDefinitionNode.operationTypes;
    operationTypes.forEach(definition => {
      const operation = definition.operation;
      const unwrappedType = unwrapNamedType({ type: definition.type });
      if (operation === queryTypeName.toLowerCase()) {
        queryTypeName = unwrappedType.name;
      } else if (operation === mutationTypeName.toLowerCase()) {
        mutationTypeName = unwrappedType.name;
      } else if (operation === subscriptionTypeName.toLowerCase()) {
        subscriptionTypeName = unwrappedType.name;
      }
    });
  }
  typeDefinitionMap = initializeOperationType({
    typeName: queryTypeName,
    typeDefinitionMap,
    config
  });
  typeDefinitionMap = initializeOperationType({
    typeName: mutationTypeName,
    typeDefinitionMap,
    config
  });
  typeDefinitionMap = initializeOperationType({
    typeName: subscriptionTypeName,
    typeDefinitionMap,
    config
  });
  return buildAugmentationTypeMaps({
    typeDefinitionMap,
    queryTypeName,
    mutationTypeName,
    subscriptionTypeName
  });
};

/**
 * Builds an operation type if it does not exist but should
 */
const initializeOperationType = ({
  typeName = '',
  typeDefinitionMap = {},
  config = {}
}) => {
  const typeNameLower = typeName.toLowerCase();
  const types = Object.keys(typeDefinitionMap);
  let operationType = typeDefinitionMap[typeName];
  if (
    hasNonExcludedNodeType(types, typeDefinitionMap, typeNameLower, config) &&
    !operationType &&
    config[typeNameLower]
  ) {
    operationType = buildObjectType({
      name: buildName({ name: typeName })
    });
  }
  if (operationType) typeDefinitionMap[typeName] = operationType;
  return typeDefinitionMap;
};

/**
 * Ensures that an operation type is only generated if an operation
 * field would be generated - should be able to factor out
 */
const hasNonExcludedNodeType = (types, typeMap, rootType, config) => {
  return types.find(e => {
    const type = typeMap[e];
    const typeName = type.name ? type.name.value : '';
    if (typeName) {
      return (
        isNodeType({ definition: type }) &&
        shouldAugmentType(config, rootType, typeName)
      );
    }
  });
};

/**
 * Builds a typeDefinitionMap that excludes operation types, instead placing them
 * within an operationTypeMap
 */
const buildAugmentationTypeMaps = ({
  typeDefinitionMap = {},
  queryTypeName,
  mutationTypeName,
  subscriptionTypeName
}) => {
  return Object.entries(typeDefinitionMap).reduce(
    ([augmentationTypeMap, operationTypeMap], [typeName, definition]) => {
      if (typeName === queryTypeName) {
        operationTypeMap[OperationType.QUERY] = definition;
      } else if (typeName === mutationTypeName) {
        operationTypeMap[OperationType.MUTATION] = definition;
      } else if (typeName === subscriptionTypeName) {
        operationTypeMap[OperationType.SUBSCRIPTION] = definition;
      } else {
        augmentationTypeMap[typeName] = definition;
      }
      return [augmentationTypeMap, operationTypeMap];
    },
    [{}, {}]
  );
};

/**
 * Extracts type definitions from a schema and regenerates the schema type
 */
const extractSchemaDefinitions = ({ schema = {} }) => {
  let definitions = Object.values({
    ...schema.getDirectives(),
    ...schema.getTypeMap()
  }).reduce((astNodes, definition) => {
    const astNode = definition.astNode;
    if (astNode) {
      astNodes.push(astNode);
      const extensionASTNodes = definition.extensionASTNodes;
      if (extensionASTNodes) {
        astNodes.push(...extensionASTNodes);
      }
    }
    return astNodes;
  }, []);
  definitions = regenerateSchemaType({ schema, definitions });
  return definitions;
};

/**
 * Regenerates the schema type definition using any existing operation types
 */
const regenerateSchemaType = ({ schema = {}, definitions = [] }) => {
  const operationTypes = [];
  Object.values(OperationType).forEach(name => {
    let operationType = undefined;
    if (name === OperationType.QUERY) operationType = schema.getQueryType();
    else if (name === OperationType.MUTATION)
      operationType = schema.getMutationType();
    else if (name === OperationType.SUBSCRIPTION)
      operationType = schema.getSubscriptionType();
    if (operationType) {
      operationTypes.push(
        buildOperationType({
          operation: name.toLowerCase(),
          type: buildNamedType({ name: operationType.name })
        })
      );
    }
  });
  if (operationTypes.length) {
    definitions.push(
      buildSchemaDefinition({
        operationTypes
      })
    );
  }
  return definitions;
};

/**
 * Getter for an array of type names excludes from an operation type
 */
const getExcludedTypes = (config, operationTypeName) => {
  return config &&
    operationTypeName &&
    config[operationTypeName] &&
    typeof config[operationTypeName] === 'object' &&
    config[operationTypeName].exclude
    ? config[operationTypeName].exclude
    : [];
};
