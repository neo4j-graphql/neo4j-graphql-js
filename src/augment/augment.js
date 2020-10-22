import {
  Kind,
  parse,
  print,
  isTypeDefinitionNode,
  isTypeExtensionNode
} from 'graphql';
import { makeExecutableSchema } from 'graphql-tools';
import { buildDocument } from './ast';
import {
  initializeOperationTypes,
  augmentSchemaType,
  augmentTypes,
  transformNeo4jTypes,
  regenerateSchemaType,
  isSchemaDocument
} from './types/types';
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
  schemaTransforms = [],
  parseOptions,
  inheritResolversFromInterfaces,
  config
}) => {
  config = setDefaultConfig({ config });
  const isParsedTypeDefs = isSchemaDocument({ definition: typeDefs });
  let definitions = [];
  if (isParsedTypeDefs) {
    // Print if we recieved parsed type definitions in a GraphQL Document
    definitions = typeDefs.definitions;
  } else {
    // Otherwise parse the SDL and get its definitions
    definitions = parse(typeDefs).definitions;
  }
  let generatedTypeMap = {};
  let [
    typeDefinitionMap,
    typeExtensionDefinitionMap,
    directiveDefinitionMap,
    operationTypeMap,
    schemaTypeDefinition
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
    directiveDefinitionMap,
    schemaTypeDefinition
  });
  const transformedDefinitions = transformNeo4jTypes({
    definitions: mergedDefinitions,
    config
  });
  const documentAST = buildDocument({
    definitions: transformedDefinitions
  });
  const augmentedResolvers = augmentResolvers({
    generatedTypeMap,
    operationTypeMap,
    typeExtensionDefinitionMap,
    resolvers,
    config
  });
  if (config.isFederated === true) {
    return {
      typeDefs: documentAST,
      resolvers: augmentedResolvers
    };
  }
  resolverValidationOptions.requireResolversForResolveType = false;
  return makeExecutableSchema({
    typeDefs: print(documentAST),
    resolvers: augmentedResolvers,
    logger,
    allowUndefinedInResolve,
    resolverValidationOptions,
    directiveResolvers,
    schemaDirectives,
    schemaTransforms,
    parseOptions,
    inheritResolversFromInterfaces
  });
};

/**
 * The main export for augmnetation a schema
 */
export const augmentedSchema = (schema, config) => {
  config = setDefaultConfig({ config });
  const definitions = extractSchemaDefinitions({ schema });
  let [
    typeDefinitionMap,
    typeExtensionDefinitionMap,
    directiveDefinitionMap,
    operationTypeMap,
    schemaTypeDefinition
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
    directiveDefinitionMap,
    schemaTypeDefinition
  });
  const transformedDefinitions = transformNeo4jTypes({
    definitions: mergedDefinitions,
    config
  });
  const documentAST = buildDocument({
    definitions: transformedDefinitions
  });
  const resolvers = extractResolversFromSchema(schema);
  const augmentedResolvers = augmentResolvers({
    generatedTypeMap,
    operationTypeMap,
    typeExtensionDefinitionMap,
    resolvers,
    config
  });
  if (config.isFederated === true) {
    return {
      typeDefs: documentAST,
      resolvers: augmentedResolvers
    };
  }
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
  let schemaTypeDefinition = undefined;
  definitions.forEach(def => {
    if (def.kind === Kind.SCHEMA_DEFINITION) {
      schemaTypeDefinition = def;
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
    typeExtensionDefinitionMap,
    schemaTypeDefinition,
    config
  });
  return [
    typeMap,
    typeExtensionDefinitionMap,
    directiveDefinitionMap,
    operationTypeMap,
    schemaTypeDefinition
  ];
};

/**
 * Merges back together all type definition maps used in augmentation
 */
export const mergeDefinitionMaps = ({
  generatedTypeMap = {},
  typeExtensionDefinitionMap = {},
  operationTypeMap = {},
  directiveDefinitionMap = {},
  schemaTypeDefinition
}) => {
  let typeExtensions = Object.values(typeExtensionDefinitionMap);
  if (typeExtensions) {
    typeExtensions = typeExtensions.reduce((typeExtensions, extensions) => {
      typeExtensions.push(...extensions);
      return typeExtensions;
    }, []);
  }
  let definitions = Object.values({
    ...generatedTypeMap,
    ...directiveDefinitionMap
  });
  definitions.push(...typeExtensions);
  definitions = augmentSchemaType({
    definitions,
    schemaTypeDefinition,
    operationTypeMap
  });
  return definitions;
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

// An enum containing the names of the augmentation config keys
const APIConfiguration = {
  QUERY: 'query',
  MUTATION: 'mutation',
  TEMPORAL: 'temporal',
  SPATIAL: 'spatial'
};

/**
 * Builds the default values in a given configuration object
 */
export const setDefaultConfig = ({ config = {} }) => {
  const configKeys = Object.keys(config);
  Object.values(APIConfiguration).forEach(configKey => {
    if (!configKeys.find(providedKey => providedKey === configKey)) {
      config[configKey] = true;
    }
  });
  return config;
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
 * Extracts type definitions from a schema and regenerates the schema type
 */
export const extractSchemaDefinitions = ({ schema = {} }) => {
  const typeMap = schema.getTypeMap();
  let definitions = Object.values({
    ...schema.getDirectives(),
    ...typeMap
  }).reduce((astNodes, definition) => {
    const astNode = definition.astNode;
    if (astNode) {
      astNodes.push(astNode);
      // Extract embedded type extensions
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
