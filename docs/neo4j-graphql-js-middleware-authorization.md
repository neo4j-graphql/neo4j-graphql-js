# GraphQL Authorization And Middleware

This guide discusses some of the ways to address authentication and authorization when using `neo4j-graphql-js` and will evolve as new auth-specific features are added.

## GraphQL Authorization Schema Directives

Schema directives can be used to define authorization logic. By default, we use the [`graphql-auth-directives`](https://www.npmjs.com/package/graphql-auth-directives) library to add authorization schema directives that can then be used in the schema. `graphql-auth-directives` work with JSON Web Tokens (JWT), and assumes a JWT is included in the GraphQL request header. The claims contained in the JWT (roles, scopes, etc) are used to validate the GraphQL request, protecting resources in the following ways:

### `isAuthenticated`

The `isAuthenticated` schema directive can be used on types or fields. The request must be authenticated to access the resource (in other words, the request must contain a valid signed JWT). `@isAuthenticated` can be used on a type definition, applying the authorization rule to the entire object, for example:

```graphql
type Movie @isAuthenticated {
  movieId: ID!
  title: String
  plot: String
}
```

We could also annotate individual fields, in this case restricting only the `plot` field:

```graphql
type Movie {
  movieId: ID!
  title: String
  plot: String @isAuthenticated
  views: Int
}
```

### `hasRole`

The `hasRole` schema directive can be used on types or fields and indicates that:

1. a request must contain a valid signed JWT, and
1. the `roles` claim in the JWT must include the role specified in the schema directive.

Valid roles should be defined in a GraphQL enum. For example:

```graphql
enum Role {
  reader
  user
  admin
}

type Movie @hasRole(roles: [admin]) {
  movieId: ID!
  title: String
  plot: String
  views: Int
}
```

### `hasScope`

The `hasScope` schema directive can be used on Query or Mutation fields and indicates that

1. a request must contain a valid signed JWT, and
1. the `scope` claim in the JWT includes at least one of the required scopes in the directive

```graphql
type Mutation {
  CreateMovie(movieId: ID!, title: String, plot: String, views: Int): Movie
    @hasScope(scopes: ["Movie:Create"])
}
```

The `hasScope` directive can be used on custom queries and mutations with `@cypher` directive, as well as on the auto-generated queries and mutations (see next section)

```graphql
type Mutation {
  IncrementView(movieId: ID!): Movie
    @hasScope(scopes: ["Movie:Update"])
    @cypher(
      statement: """
      MATCH (m:Movie {movieId: $movieId})
      SET m.views = m.views + 1
      """
    )
}
```

### Configuring schema directives

To make use of the directives from `graphql-auth-directives` you must

1. Set the `JWT_SECRET` environment variable
1. Enable the auth directives in the config object passed to `makeAugmentedSchema` or `augmentSchema`

#### Environment variables used to configure JWT

You must set the `JWT_SECRET` environment variable:

```shell
export JWT_SECRET=<YOUR_JWT_SECRET_KEY_HERE>
```

By default `@hasRole` will validate the `roles`, `role`, `Roles`, or `Role` claim (whichever is found first). You can override this by setting `AUTH_DIRECTIVES_ROLE_KEY` environment variable. For example, if your role claim is stored in the JWT like this

```json
"https://grandstack.io/roles": [
    "admin"
]
```

then declare a value for `AUTH_DIRECTIVES_ROLE_KEY` environment variable:

```shell
export AUTH_DIRECTIVES_ROLE_KEY=https://grandstack.io/roles
```

#### Enabling Auth Directives

By default the auth directives are disabled and must be explicitly enabled in the config object passed to `makeAugmentedSchema` or `augmenteSchema`.

If enabled, authorization directives are declared and can be used in the schema. If `@hasScope` is enabled it is automatically added to all generated query and mutation fields. To enable authorization schema directives (`@isAuthenticated`, `@hasRole`, `@hasScope`), pass values for the `auth` key in the `config` object. For example:

```js
import { makeAugmentedSchema } from 'neo4j-graphql-js';

const schema = makeAugmentedSchema({
  tyepDefs,
  config: {
    auth: {
      isAuthenticated: true,
      hasRole: true
    }
  }
});
```

With this configuration, the `isAuthenticated` and `hasRole` directives will be available to be used in the schema, but not the `hasScope` directive.

#### Attaching Directives To Auto-Generated Queries and Mutations

Since neo4j-graphql.js automatically adds Query and Mutation types to the schema, these auto-generated fields cannot be annotated by the user with directives. To enable authorization on the auto-generated queries and mutations, simply enable the `hasScope` directive and it will be added to the generated CRUD API with the appropriate scope for each operation. For example:

```js
import { makeAugmentedSchema } from 'neo4j-graphql-js';

const schema = makeAugmentedSchema({
  tyepDefs,
  config: {
    auth: {
      hasScope: true
    }
  }
});
```

#### Attaching Custom Authorization Schema Directives

In some use cases, different authentication and authorization logic is required to that provided by `graphql-auth-directives`. For example, you may use middleware to validate bearer tokens and insert scopes into the context obect. It is possible to leverage the schema augmentation functionality afforded by the `config.auth` options whilst providing your own directives to attach. First create your own directive (the default [`graphql-auth-directives` repository](https://github.com/grand-stack/graphql-auth-directives) offers a working template) and then include them in the config object passed to `makeAugmentedSchema` or `augmentSchema`. For example, to override the `@hasScope` directive:

```js
import { makeAugmentedSchema } from 'neo4j-graphql-js';
import { MyHasScopeDirective } from './my-directives';

const schema = makeAugmentedSchema({
  tyepDefs,
  config: {
    auth: {
      hasScope: true
    }
  },
  schemaDirectives: {
    hasScope: MyHasScopeDirective
  }
});
```

## Cypher Parameters From Context

Another approach to implementing authorization logic is to access values from the context object in a Cypher query used in a `@cypher` directive. This is useful for example, to access authenticated user information that may be stored in a request token or added to the request object via middleware. Any parameters in the `cypherParams` object in the context are passed with the Cypher query and can be used as Cypher parameters.

For example:

```graphql
type Query {
  currentUser: User
    @cypher(
      statement: """
      MATCH (u:User {id: $cypherParams.currentUserId})
      RETURN u
      """
    )
}
```

Here is an example of how to add values to the `cypherParams` in the context using ApolloServer:

```js
const server = new ApolloServer({
  context: ({ req }) => ({
    driver,
    cypherParams: {
      currentUserId: req.user.id
    }
  })
});
```

## Inspect Context In Resolver

A common pattern for dealing with authentication / authorization in GraphQL is to inspect an authorization token or a user object injected into the context in a resolver function to ensure the authenticated user is appropirately authorized to request the data. This can be done in `neo4j-graphql-js` by implementing your own resolver function(s) and calling [`neo4jgraphql`](neo4j-graphql-js-api.mdx#neo4jgraphqlobject-params-context-resolveinfo-debug-executionresult-https-graphqlorg-graphql-js-execution-execute) after inspecting the token / user object.

First, ensure the appropriate data is injected into the context object. In this case we inject the entire `request` object, which in our case will contain a `user` object (which comes from some authorization middleware in our application, such as passport.js):

```js
const server = new ApolloServer({
  schema: augmentedSchema,
  context: ({ req }) => {
    return {
      driver,
      req
    };
  }
});
```

Then in our resolver, we check for the existence of our user object. If `req.user` is not present then we return an error as the request is not authenticated, if `req.user` is present then we know the request is authenticated and resolve the data with a call to `neo4jgraphql`:

```js
const resolvers = {
  // root entry point to GraphQL service
  Query: {
    Movie(object, params, ctx, resolveInfo) {
      if (!ctx.req.user) {
        throw new Error('request not authenticated');
      } else {
        return neo4jgraphql(object, params, ctx, resolveInfo);
      }
    }
  }
};
```

This resolver object can then be attached to the GraphQL schema using [`makeAugmentedSchema`](neo4j-graphql-js-api.mdx#makeaugmentedschemaoptions-graphqlschema)

We can apply this same strategy to check for user scopes, inspect scopes on a JWT, etc.

## Aditional Schema Directives

### `@additionalLabels`

The `additionalLabels` schema directive can only be used on types for adding additional labels on the nodes. Use this if you need extra labels on you nodes or if you want to implement a kind of "multi-tenancy" graph that isolates the subgraph with different labels. The directive accept an array of strings that can be combined with `cypherParams` variables.

Adding 2 labels to the Movie type; 1 static label and 1 dynamic label that uses fields from `cypherParams`. For example:

```graphql
type Movie
  @additionalLabels(
    labels: ["u_<%= $cypherParams.userId %>", "newMovieLabel"]
  ) {
  movieId: ID!
  title: String
  plot: String
  views: Int
}
```

This will add the labels "newMovieLabel" and "u_1234" on the query when creating/updating/querying the database. This does not work if there exist a `@cypher` directive on the type.

## Middleware

Middleware is often useful for features such as authentication / authorization. You can use middleware with neo4j-graphql-js by injecting the request object after middleware has been applied into the context. For example:

```js
const server = new ApolloServer({
  schema: augmentedSchema,
  // inject the request object into the context to support middleware
  // inject the Neo4j driver instance to handle database call
  context: ({ req }) => {
    return {
      driver,
      req
    };
  }
});
```

This request object will then be available inside your GraphQL resolver function. You can inspect the context/request object in your resolver to verify auth before calling `neo4jgraphql`. Also, `neo4jgraphql` will check for the existence of:

- `context.req.error`
- `context.error`

and will throw an error if any of the above are defined.

Full example:

```js
import { makeAugmentedSchema } from 'neo4j-graphql-js';
import { ApolloServer } from 'apollo-server-express';
import express from 'express';
import bodyParser from 'body-parser';
import { makeExecutableSchema } from 'apollo-server';
import { v1 as neo4j } from 'neo4j-driver';
import { typeDefs } from './movies-schema';

const schema = makeAugmentedSchema({
  typeDefs
});

// Add auto-generated mutations
const schema = augmentSchema(schema);

const driver = neo4j.driver(
  process.env.NEO4J_URI || 'bolt://localhost:7687',
  neo4j.auth.basic(
    process.env.NEO4J_USER || 'neo4j',
    process.env.NEO4J_PASSWORD || 'letmein'
  )
);

const app = express();
app.use(bodyParser.json());

const checkErrorHeaderMiddleware = async (req, res, next) => {
  req.error = req.headers['x-error'];
  next();
};

app.use('*', checkErrorHeaderMiddleware);

const server = new ApolloServer({
  schema: schema,
  // inject the request object into the context to support middleware
  // inject the Neo4j driver instance to handle database call
  context: ({ req }) => {
    return {
      driver,
      req
    };
  }
});

server.applyMiddleware({ app, path: '/' });
app.listen(3000, '0.0.0.0');
```

## Passing A Neo4j Driver Bookmark

To support [causal consistency chaining](https://neo4j.com/docs/operations-manual/4.1/clustering/introduction/) for Neo4j clusters where a system other than neo4j-graphql.js has been sending writes to the database cluster, optionally a neo4j driver bookmark may be added to the context object in the `neo4jBooksmarks` key.

For example, to set the context.neo4jBookmarks value from a request header (in this case headers.neo4jbookmarks) using Apollo Server:

```js
const server = new ApolloServer({
  schema,
  context: ({ req }) => {
    return {
      driver,
      neo4jBookmarks: req.headers['neo4jbookmark']
    };
  }
});
```

## Resources

- Blog post: [Authorization In GraphQL Using Custom Schema Directives](https://blog.grandstack.io/authorization-in-graphql-using-custom-schema-directives-eafa6f5b4658) - With Apollo’s graphql-tools, Auth0 JWTs, and neo4j-graphql.js
