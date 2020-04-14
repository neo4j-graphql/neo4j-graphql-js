import { parse, print } from 'graphql';
import Neo4jSchemaTree from './neo4j-schema/Neo4jSchemaTree';
import graphQLMapper from './neo4j-schema/graphQLMapper';
import { checkRequestError } from './auth';
import { translateMutation, translateQuery } from './translate';
import Debug from 'debug';
import {
  extractQueryResult,
  isMutation,
  typeIdentifiers,
  getPayloadSelections
} from './utils';
import {
  augmentedSchema,
  makeAugmentedExecutableSchema,
  mapDefinitions,
  mergeDefinitionMaps
} from './augment/augment';
import { augmentTypes, transformNeo4jTypes } from './augment/types/types';
import { buildDocument } from './augment/ast';
import { augmentDirectiveDefinitions } from './augment/directives';
import {
  isFederatedOperation,
  buildFederatedOperation,
  executeFederatedOperation,
  decideOperationTypeName,
  getEntityQueryField
} from './federation';

const neo4jGraphQLVersion = require('../package.json').version;

const debug = Debug('neo4j-graphql-js');

export async function neo4jgraphql(
  object,
  params,
  context,
  resolveInfo,
  debugFlag
) {
  const [isRootOperation, isRelationshipOperation] = isFederatedOperation({
    resolveInfo
  });
  if (isRootOperation || isRelationshipOperation) {
    let [typeName, serviceKeys, hasCustomTypeName] = decideOperationTypeName({
      object,
      resolveInfo,
      isRootOperation,
      isRelationshipOperation
    });

    const operationField = getEntityQueryField({
      typeName,
      resolveInfo,
      isRootOperation,
      isRelationshipOperation
    });
    const federatedOperation = buildFederatedOperation({
      object,
      params,
      context,
      serviceKeys,
      resolveInfo,
      typeName,
      operationField,
      hasCustomTypeName,
      isRootOperation,
      isRelationshipOperation
    });
    return await executeFederatedOperation({
      typeName,
      operationField,
      isRootOperation,
      isRelationshipOperation,
      federatedOperation,
      hasCustomTypeName,
      resolveInfo,
      debugFlag
    });
  } else {
    // throw error if context.req.error exists
    if (checkRequestError(context)) {
      throw new Error(checkRequestError(context));
    }

    if (!context.driver) {
      throw new Error(
        "No Neo4j JavaScript driver instance provided. Please ensure a Neo4j JavaScript driver instance is injected into the context object at the key 'driver'."
      );
    }

    let query;
    let cypherParams;

    const cypherFunction = isMutation(resolveInfo)
      ? cypherMutation
      : cypherQuery;
    [query, cypherParams] = cypherFunction(
      params,
      context,
      resolveInfo,
      debugFlag
    );

    if (debugFlag) {
      console.log(`
  Deprecation Warning: Remove \`debug\` parameter and use an environment variable
  instead: \`DEBUG=neo4j-graphql-js\`.
      `);
      console.log(query);
      console.log(JSON.stringify(cypherParams, null, 2));
    }

    debug('%s', query);
    debug('%s', JSON.stringify(cypherParams, null, 2));

    context.driver._userAgent = `neo4j-graphql-js/${neo4jGraphQLVersion}`;

    let session;

    if (context.neo4jDatabase) {
      // database is specified in context object
      try {
        // connect to the specified database
        // must be using 4.x version of driver
        session = context.driver.session({
          database: context.neo4jDatabase
        });
      } catch (e) {
        // error - not using a 4.x version of driver!
        // fall back to default database
        session = context.driver.session();
      }
    } else {
      // no database specified
      session = context.driver.session();
    }

    let result;

    try {
      if (isMutation(resolveInfo)) {
        result = await session.writeTransaction(tx => {
          return tx.run(query, cypherParams);
        });
      } else {
        result = await session.readTransaction(tx => {
          return tx.run(query, cypherParams);
        });
      }
    } finally {
      session.close();
    }
    return extractQueryResult(result, resolveInfo.returnType);
  }
}

export function cypherQuery(
  { first = -1, offset = 0, _id, orderBy, ...otherParams },
  context,
  resolveInfo
) {
  const { typeName, variableName } = typeIdentifiers(resolveInfo.returnType);
  const schemaType = resolveInfo.schema.getType(typeName);
  const selections = getPayloadSelections(resolveInfo);
  return translateQuery({
    resolveInfo,
    context,
    schemaType,
    selections,
    variableName,
    typeName,
    first,
    offset,
    _id,
    orderBy,
    otherParams
  });
}

export function cypherMutation(
  { first = -1, offset = 0, _id, orderBy, ...otherParams },
  context,
  resolveInfo
) {
  const { typeName, variableName } = typeIdentifiers(resolveInfo.returnType);
  const schemaType = resolveInfo.schema.getType(typeName);
  const selections = getPayloadSelections(resolveInfo);
  return translateMutation({
    resolveInfo,
    context,
    schemaType,
    selections,
    variableName,
    typeName,
    first,
    offset,
    otherParams
  });
}

export const augmentTypeDefs = (typeDefs, config = {}) => {
  config.query = false;
  config.mutation = false;
  if (config.isFederated === undefined) config.isFederated = false;
  const definitions = parse(typeDefs).definitions;
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
  [typeDefinitionMap, directiveDefinitionMap] = augmentDirectiveDefinitions({
    typeDefinitionMap: generatedTypeMap,
    directiveDefinitionMap,
    config
  });
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
  typeDefs = print(documentAST);
  return typeDefs;
};

export const augmentSchema = (schema, config) => {
  return augmentedSchema(schema, config);
};

export const makeAugmentedSchema = ({
  schema,
  typeDefs,
  resolvers = {},
  logger,
  allowUndefinedInResolve = false,
  resolverValidationOptions = {},
  directiveResolvers = null,
  schemaDirectives = {},
  parseOptions = {},
  inheritResolversFromInterfaces = false,
  config
}) => {
  if (schema) {
    return augmentedSchema(schema, config);
  }
  if (!typeDefs) throw new Error('Must provide typeDefs');
  return makeAugmentedExecutableSchema({
    typeDefs,
    resolvers,
    logger,
    allowUndefinedInResolve,
    resolverValidationOptions,
    directiveResolvers,
    schemaDirectives,
    parseOptions,
    inheritResolversFromInterfaces,
    config
  });
};

/**
 * Infer a GraphQL schema by inspecting the contents of a Neo4j instance.
 * @param {} driver
 * @returns a GraphQL schema.
 */
export const inferSchema = (driver, config = {}) => {
  const tree = new Neo4jSchemaTree(driver, config);

  return tree.initialize().then(graphQLMapper);
};

export const cypher = (statement, ...substitutions) => {
  // Get the array of string literals
  const literals = statement.raw;
  // Add each substitution inbetween all
  const composed = substitutions.reduce((composed, substitution, index) => {
    // Add the string literal
    composed.push(literals[index]);
    // Add the substution proceeding it
    composed.push(substitution);
    return composed;
  }, []);
  // Add the last literal
  composed.push(literals[literals.length - 1]);
  return `statement: """${composed.join('')}"""`;
};
