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
  isNodeType,
  buildNeo4jTypes,
  transformNeo4jTypes,
  initializeOperationTypes
} from './types/types';
import { augmentNodeType } from './types/node/node';
import { augmentDirectiveDefinitions } from './directives';
import { extractResolversFromSchema, augmentResolvers } from './resolvers';
import { addAuthDirectiveImplementations } from '../auth';

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

export const augmentTypes = ({
  typeDefinitionMap,
  typeExtensionDefinitionMap,
  generatedTypeMap,
  operationTypeMap = {},
  config = {}
}) => {
  Object.entries({
    ...typeDefinitionMap,
    ...operationTypeMap
  }).forEach(([typeName, definition]) => {
    if (isNodeType({ definition })) {
      [definition, generatedTypeMap, operationTypeMap] = augmentNodeType({
        typeName,
        definition,
        typeDefinitionMap,
        generatedTypeMap,
        operationTypeMap,
        config
      });
      generatedTypeMap[typeName] = definition;
    } else {
      generatedTypeMap[typeName] = definition;
    }
    return definition;
  });
  generatedTypeMap = buildNeo4jTypes({
    generatedTypeMap,
    config
  });
  return [typeExtensionDefinitionMap, generatedTypeMap, operationTypeMap];
};

export const mapDefinitions = ({ definitions = [], config = {} }) => {
  const typeExtensionDefinitionMap = {};
  const directiveDefinitionMap = {};
  let typeDefinitionMap = {};
  let operationTypeMap = {};
  // TODO Use to get operation type names
  // let schemaDefinitionNode = {};
  definitions.forEach(def => {
    const name = def.name.value;
    if (def.kind === Kind.SCHEMA_DEFINITION) {
      // schemaDefinitionNode = def;
      typeDefinitionMap[name] = def;
    } else if (isTypeDefinitionNode(def)) {
      typeDefinitionMap[name] = def;
    } else if (isTypeExtensionNode(def)) {
      if (!typeExtensionDefinitionMap[name]) {
        typeExtensionDefinitionMap[name] = [];
      }
      typeExtensionDefinitionMap[name].push(def);
    } else if (def.kind === Kind.DIRECTIVE_DEFINITION) {
      directiveDefinitionMap[name] = def;
    }
  });
  [typeDefinitionMap, operationTypeMap] = initializeOperationTypes({
    typeDefinitionMap,
    config
  });
  return [
    typeDefinitionMap,
    typeExtensionDefinitionMap,
    directiveDefinitionMap,
    operationTypeMap
  ];
};

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

export const extractSchemaDefinitions = ({ schema = {} }) =>
  Object.values({
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

export const printSchemaDocument = ({ schema }) =>
  print(
    buildDocument({
      definitions: extractSchemaDefinitions({ schema })
    })
  );

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

export const shouldAugmentRelationshipField = (
  config,
  operationTypeName,
  fromName,
  toName
) =>
  shouldAugmentType(config, operationTypeName, fromName) &&
  shouldAugmentType(config, operationTypeName, toName);

const getExcludedTypes = (config, operationTypeName) => {
  return config &&
    operationTypeName &&
    config[operationTypeName] &&
    typeof config[operationTypeName] === 'object' &&
    config[operationTypeName].exclude
    ? config[operationTypeName].exclude
    : [];
};
