// Type definitions for neo4j-graphql-js
// Project: https://github.com/neo4j-graphql/neo4j-graphql-js
// Definitions by: Nopzen <https://github.com/nopzen>
// Definitions: https://github.com/neo4j-graphql/neo4j-graphql-js.git
// TypeScript Version: 3.8

/* eslint no-unused-vars: "off" */

declare module 'neo4j-graphql-js' {
    import { Driver } from 'neo4j-driver';
    import { GraphQLSchema, GraphQLFieldResolver, GraphQLResolveInfo, ExecutionResult, DocumentNode } from 'graphql';
    import { IResolvers } from 'graphql-tools';

    /**
     * makeAugmentedSchema
     * @description Wraps {@link https://www.apollographql.com/docs/apollo-server/api/apollo-server/#makeExecutableSchema|makeExecutableSchema} to create a GraphQL schema from GraphQL type definitions (SDL). Will generate Query and Mutation types for the provided type definitions and attach `neo4jgraphql` as the resolver for these queries and mutations. Either a schema or typeDefs must be provided. `resolvers` can optionally be implemented to override any of the generated Query/Mutation fields. Additional options are passed through to `makeExecutableSchema`.
     *
     * @param {makeAugmentedSchemaOptions} options
     */
    export function makeAugmentedSchema(options: makeAugmentedSchemaOptions): GraphQLSchema;

    /**
     * neo4jgraphql
     * @description This function's signature matches that of {@link https://graphql.org/learn/execution/#root-fields-resolvers|GraphQL resolver functions}. and thus the parameters match the parameters passed into resolve by GraphQL implementations like graphql-js.
     *
     * It can be called within a resolver to generate a Cypher query and handle the database call to Neo4j to completely resolve the GraphQL request. Alternatively, use `cypherQuery` or `cypherMutation` within a resolver to only generate the Cypher query and handle the database call yourself.
     * @param {object} object                   The previous object being resolved. Rarely used for a field on the root Query type.
     * @param {RequestArguments} args           The arguments provided to the field in the GraphQL query.
     * @param {Neo4jContext} context            Value provided to every resolver and hold contextual information about the request, such as the currently logged in user, or access to a database. neo4j-graphql-js assumes a neo4j-javascript-driver instance exists in this object, under the key driver.
     * @param {GraphQLResolveInfo} resolveInfo  Holds field-specific information relevant to the current query as well as the GraphQL schema.
     * @param {boolean} debug                   Specifies whether to log the generated Cypher queries for each GraphQL request. Logging is enabled by default.
     */
    export function neo4jgraphql(
        object: any,
        args: RequestArguments,
        context: Neo4jContext,
        resolveInfo: GraphQLResolveInfo,
        debug?: boolean,
    ): ExecutionResult;

    /**
     * augmentSchema
     * @description Takes an existing GraphQL schema object and adds neo4j-graphql-js specific enhancements, including auto-generated mutations and queries, and ordering and pagination fields. {@link https://grandstack.io/docs/neo4j-graphql-js|See this guide} for more information.
     *
     * @param {GraphQLSchema} schema
     * @param {AugmentSchemaConfig} config
     */
    export function augmentSchema(schema: GraphQLSchema, config: AugmentSchemaConfig): GraphQLSchema;

    type AssertSchemaOptions = {
      schema: GraphQLSchema,
      driver: Driver,
      debug?: boolean
      dropExisting?: boolean
    }

    /**
     * assertSchema
     * @description This function uses the `@id`, `@unique` and `@index` schema directives present in the Graphql type definitions, along with `apoc.schema.assert()`, to add any database constraints and indexes.
     * @param {AssertSchemaOptions} options 
     */
    export function assertSchema(options: AssertSchemaOptions): void;

    /**
     * cypherQuery
     * @description Generates a Cypher query (and associated parameters) to resolve a given GraphQL request (for a Query). Use this function when you want to handle the database call yourself, use neo4jgraphql for automated database call support.
     *
     * @param {RequestArguments} args
     * @param {object} context
     * @param {GraphQLResolveInfo} resolveInfo
     */

    export function cypherQuery(args: RequestArguments, context: any, resolveInfo: GraphQLResolveInfo): CypherResult;

    /**
     * cypherMutation
     * @description Similar to `cypherQuery`, but for mutations. Generates a Cypher query (and associated parameters) to resolve a given GraphQL request (for a Mutation). Use this function when you want to handle the database call yourself, use neo4jgraphql for automated database call support.
     *
     * @param {RequestArguments} args
     * @param {object} context
     * @param {GraphQLResolveInfo} resolveInfo
     */
    export function cypherMutation(args: RequestArguments, context: any, resolveInfo: GraphQLResolveInfo): CypherResult;

    /**
     * inferrerSchema
     * @description Used to generate GraphQL type definitions from an existing Neo4j database by inspecting the data stored in the database. When used in combination with makeAugmentedSchema this can be used to generate a GraphQL CRUD API on top of an existing Neo4j database without writing any resolvers or GraphQL type definitions. See {@link https://github.com/neo4j-graphql/neo4j-graphql-js/blob/master/example/autogenerated/autogen.js|example/autogenerated/autogen.js} for an example of using `inferSchema` and `makeAugmentedSchema` with Apollo Server.
     *
     * @param {Driver} driver A neo4j js driver
     * @param {InferSchemaOptions} options
     */
    export function inferSchema(driver: Driver, options: InferSchemaOptions): Promise<InferSchemaPromise>;

    type Neo4jContext<T = Record<string, any>> = T & {
        driver: Driver;
    };

    /**
     * InferrerSchemaOptions
     * @param {boolean} alwaysIncludeRelationships specifies whether relationships should always be included in the type definitions as {@link https://grandstack.io/docs/neo4j-graphql-js#relationship-types|relationship types}, even if the relationships do not have properties.
     */
    interface InferSchemaOptions {
        alwaysIncludeRelationships: boolean;
    }

    /**
     * InferSchemaPromise
     * @param {string} typeDefs a string representation of the generated GraphQL type definitions in Schema Definition Language (SDL) format, inferred from the existing Neo4j database.
     */
    interface InferSchemaPromise {
        typeDefs: string;
    }

    type CypherResult = [string, { [key: string]: any }];

    interface RequestArguments {
        [key: string]: any;
    }

    interface AugmentSchemaResolvers {
        [key: string]: GraphQLFieldResolver<any, any, { [argName: string]: any }>;
    }

    interface AugmentSchemaLogger {
        log: (msg: string) => void;
    }

    interface AugmentSchemaParseOptions {
        [key: string]: any;
    }

    /**
     * AugmentSchemaResolverValidationOptions
     * @param {boolean} requireResolversForArgs will cause `makeExecutableSchema` to throw an error if no resolver is defined for a field that has arguments.
     * @param {boolean} requireResolversForNonScalar will cause makeExecutableSchema to throw an error if a non-scalar field has no resolver defined. Setting this to `true` can be helpful in catching errors, but defaults to `false` to avoid confusing behavior for those coming from other GraphQL libraries.
     * @param {boolean} requireResolversForAllFields asserts that _all_ fields have valid resolvers.
     * @param {boolean} requireResolversForResolveType will require a _resolveType()_ method for Interface and Union types. This can be passed in with the field resolvers as *__resolveType()*. False to disable the warning.
     * @param {boolean} allowResolversNotInSchema turns off the functionality which throws errors when resolvers are found which are not present in the schema. Defaults to `false`, to help catch common errors.
     */
    interface AugmentSchemaResolverValidationOptions {
        requireResolversForArgs: boolean;
        requireResolversForNonScalar: boolean;
        requireResolversForAllFields: boolean;
        requireResolversForResolveType: boolean;
        allowResolversNotInSchema: boolean;
    }

    type AugmentSchemaTransform = (schema: GraphQLSchema) => GraphQLSchema
    interface AugmentSchemaDirectives {
        [key: string]: (next: Promise<any>, src: any, args: RequestArguments, context: any) => Promise<any>;
    }

    type DirectiveResolvers = Record<string, () => any>;

    /**
     * AugmentSchemaAuthConfig
     * @param {boolean} isAuthenticated   enables `@isAuthenticated` directive, **Optional, defaults to true**
     * @param {boolean} hasRole           enables `@hasRole` directive, **Optional, defaults to true**
     * @param {boolean} hasScope          enables `@hasScope` directive, **Optional, defaults to true**
     */
    interface AugmentSchemaAuthConfig {
        isAuthenticated?: boolean;
        hasRole?: boolean;
        hasScope?: boolean;
    }

    /**
     * AugmentSchemaConfig
     *
     * @param {boolean|object} query      Configure the autogenerated Query fields. Can be enabled/disabled for all types or a list of individual types to exclude can be passed. Commonly used to exclude payload types. **Optional defaults to `true`**
     * @param {boolean|object} mutation   Configure the autogenerated Mutation fields. Can be enabled/disabled for all types or a list of individual types to exclude can be passed. Commonly used to exclude payload types. **Optional, defaults to `true`**
     * @param {boolean} debug             Enable/disable logging of generated Cypher queries and parameters. **Optional, defaults to `true`**
     * @param {boolean} auth              Used to enable authorization schema directives (@isAuthenticated, @hasRole, @hasScope). If enabled, directives from the graphql-auth-directives are declared and can be used in the schema. If @hasScope is enabled it is automatically added to all generated query and mutation fields. See the authorization guide for more information. **Optional, defaults to `false`**
     * @param {boolean} experimental      When the config.experimental boolean flag is true, input objects are generated for node property selection and input.
     */
    interface AugmentSchemaConfig {
        query?: boolean | { exclude: string[] };
        mutation?: boolean | { exclude: string[] };
        debug?: boolean;
        auth?: boolean | AugmentSchemaAuthConfig;
        experimental?: boolean
    }

    /**
     * makeAugmentedSchemaOptions
     * @param {GraphQLSchema} schema                      __optional__ argument, predefined schema takes presidence over a `typeDefs` & `resolvers` combination
     * @param {string}  typeDefs                          __required__ argument, and should be an GraphQL schema language string or array of GraphQL schema language strings or a function that takes no arguments and returns an array of GraphQL schema language strings. The order of the strings in the array is not important, but it must include a schema definition.
     * @param {object}  resolvers                         __optional__ argument, _(empty object by default)_ and should be an object or an array of objects that follow the pattern explained in {@link https://www.graphql-tools.com/docs/resolvers/|article on resolvers}
     * @param {object}  logger                            __optional__ argument, which can be used to print errors to the server console that are usually swallowed by GraphQL. The logger argument should be an object with a log function, eg. `const logger = { log: e => console.log(e) }`
     * @param {object}  parseOptions                      __optional__ argument, which allows customization of parse when specifying `typeDefs` as a string.
     * @param {boolean} allowUndefinedInResolve           __optional__ argument, which is `true` by default. When set to `false`, causes your resolver to throw errors if they return `undefined`, which can help make debugging easier.
     * @param {object} resolverValidationOptions          __optional__ argument, see: _AugmentSchemaResolverValidationOptions_
     * @param {object} directiveResolvers                 __optional__ argument, _(null by default)_ and should be an object that follows the pattern explained in this {@link https://www.graphql-tools.com/docs/directive-resolvers /|article on directive resolvers}
     * @param {object} schemaDirectives                   __optional__ argument, (empty object by default) and can be used to specify the {@link https://www.graphql-tools.com/docs/legacy-schema-directives/|earlier class-based implementation of schema directives}
     * @param {AugmentSchemaTransform[]} schemaTransforms __optional__ argument, (empty array by default) Suport for newer functional `schemaDirectives` see the docs {@link https://www.graphql-tools.com/docs/schema-directives/#at-least-two-strategies/|(At least two strategies)}
     * @param {boolean} inheritResolversFromInterfaces    __optional__ argument, (false by default)  GraphQL Objects that implement interfaces will inherit missing resolvers from their interface types defined in the resolvers object.
     */
    interface makeAugmentedSchemaOptions {
        schema?: GraphQLSchema;
        typeDefs: DocumentNode | string;
        resolvers?: AugmentSchemaResolvers | IResolvers;
        logger?: AugmentSchemaLogger;
        parseOptions?: AugmentSchemaParseOptions;
        config?: AugmentSchemaConfig;
        allowUndefinedInResolve?: boolean;
        resolverValidationOptions?: AugmentSchemaResolverValidationOptions;
        directiveResolvers?: DirectiveResolvers;
        schemaDirectives?: AugmentSchemaDirectives;
        schemaTransforms?: AugmentSchemaTransform[];
        inheritResolversFromInterfaces?: boolean;
    }
}
