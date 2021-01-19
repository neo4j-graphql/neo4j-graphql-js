import { parse, print } from 'graphql';
import Neo4jSchemaTree from './neo4j-schema/Neo4jSchemaTree';
import graphQLMapper from './neo4j-schema/graphQLMapper';
import { checkRequestError } from './auth';
import { translateQuery } from './translate/translate';
import { translateMutation } from './translate/mutation';
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
import {
  augmentTypes,
  transformNeo4jTypes,
  isSchemaDocument
} from './augment/types/types';
import { buildDocument } from './augment/ast';
import { augmentDirectiveDefinitions } from './augment/directives';
import { isFederatedOperation, executeFederatedOperation } from './federation';
import { schemaAssert } from './schemaAssert';
import { schemaSearch } from './schemaSearch';

const neo4jGraphQLVersion = require('../package.json').version;

const debug = Debug('neo4j-graphql-js');

export async function neo4jgraphql(
  object,
  params,
  context,
  resolveInfo,
  debugFlag
) {
  if (isFederatedOperation({ resolveInfo })) {
    return await executeFederatedOperation({
      object,
      params,
      context,
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

    const buildSessionParams = ctx => {
      let paramObj = {};

      if (ctx.neo4jDatabase) {
        paramObj['database'] = ctx.neo4jDatabase;
      }

      if (ctx.neo4jBookmarks) {
        paramObj['bookmarks'] = ctx.neo4jBookmarks;
      }
      return paramObj;
    };

    if (context.neo4jDatabase || context.neo4jBookmarks) {
      const sessionParams = buildSessionParams(context);

      try {
        // connect to the specified database and/or use bookmarks
        // must be using 4.x version of driver
        session = context.driver.session(sessionParams);
      } catch (e) {
        // throw error if bookmark is specified as failure is better than ignoring user provided bookmark
        if (context.neo4jBookmarks) {
          throw new Error(
            `context.neo4jBookmarks specified, but unable to set bookmark in session object: ${e.message}`
          );
        } else {
          // error - not using a 4.x version of driver!
          // fall back to default database
          session = context.driver.session();
        }
      }
    } else {
      // no database or bookmark specified
      session = context.driver.session();
    }

    let result;

    try {
      if (isMutation(resolveInfo)) {
        result = await session.writeTransaction(async tx => {
          const result = await tx.run(query, cypherParams);
          return extractQueryResult(result, resolveInfo.returnType);
        });
      } else {
        result = await session.readTransaction(async tx => {
          const result = await tx.run(query, cypherParams);
          return extractQueryResult(result, resolveInfo.returnType);
        });
      }
    } finally {
      session.close();
    }
    return result;
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
  if (config.isFederated === true) {
    return documentAST;
  }
  return print(documentAST);
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
  schemaTransforms = [],
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
    schemaTransforms,
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

export const assertSchema = ({
  driver,
  schema,
  dropExisting = true,
  debug = false
}) => {
  const statement = schemaAssert({ schema, dropExisting });
  const executeQuery = driver => {
    const session = driver.session();
    return session
      .writeTransaction(tx =>
        tx.run(statement).then(result => {
          if (debug === true) {
            const recordsJSON = result.records.map(record => record.toObject());
            recordsJSON.sort((lhs, rhs) => lhs.label < rhs.label);
            console.table(recordsJSON);
          }
          return result;
        })
      )
      .finally(() => session.close());
  };
  return executeQuery(driver).catch(error => {
    console.error(error);
  });
};

export const searchSchema = async ({
  driver,
  schema,
  debug = false,
  sessionParams = {}
}) => {
  const session = driver.session(sessionParams);

  // drop all search indexes, given they cannot be updated via a second CALL to createNodeIndex
  const dropStatement = `
  CALL db.indexes() YIELD name, provider WHERE provider = "fulltext-1.0"
  CALL db.index.fulltext.drop(name)
  RETURN TRUE
  `;
  const createStatement = schemaSearch({ schema });
  const dropResult = await session.writeTransaction(tx =>
    tx.run(dropStatement).then(result => {
      if (debug === true) {
        console.log(
          `\n[searchSchema] Search indexes dropped using Cypher:${dropStatement}`
        );
      }
      return true;
    })
  );

  if (dropResult) {
    if (createStatement) {
      return await session
        .writeTransaction(tx =>
          tx.run(createStatement).then(result => {
            if (debug === true) {
              console.log(
                `[searchSchema] Search indexes created using Cypher:\n${createStatement}\n`
              );
            }
            return true;
          })
        )
        .finally(() => session.close());
    } else {
      if (debug === true) {
        console.log(
          '[searchSchema] There were no @search directive fields discovered in the schema.\n'
        );
      }
      return true;
    }
  } else {
    session.close();
  }
  return false;
};
