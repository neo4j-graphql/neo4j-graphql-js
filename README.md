> ⚠️ NOTE: This project is no longer actively maintained. Please consider using the [official Neo4j GraphQL Library.](https://neo4j.com/docs/graphql-manual/current/)

[![CI status](https://circleci.com/gh/neo4j-graphql/neo4j-graphql-js.svg?style=shield&circle-token=d01ffa752fbeb43585631c78370f7dd40528fbd3)](https://circleci.com/gh/neo4j-graphql/neo4j-graphql-js) [![npm version](https://badge.fury.io/js/neo4j-graphql-js.svg)](https://badge.fury.io/js/neo4j-graphql-js) [![Docs link](https://img.shields.io/badge/Docs-GRANDstack.io-brightgreen.svg)](https://github.com/neo4j-graphql/neo4j-graphql-js/tree/master/docs)

# neo4j-graphql.js

A GraphQL to Cypher query execution layer for Neo4j and JavaScript GraphQL implementations.

- [Read the docs](https://github.com/neo4j-graphql/neo4j-graphql-js/tree/master/docs)
- [Read the changelog](https://github.com/neo4j-graphql/neo4j-graphql-js/blob/master/CHANGELOG.md)

neo4j-graphql.js is facilitated by [Neo4j Labs](https://neo4j.com/labs/).

## Installation and usage

Install

```
npm install --save neo4j-graphql-js
```

### Usage

Start with GraphQL type definitions:

```javascript
const typeDefs = `
type Movie {
    title: String
    year: Int
    imdbRating: Float
    genres: [Genre] @relation(name: "IN_GENRE", direction: "OUT")
}
type Genre {
    name: String
    movies: [Movie] @relation(name: "IN_GENRE", direction: "IN")
}
`;
```

Create an executable schema with auto-generated resolvers for Query and Mutation types, ordering, pagination, and support for computed fields defined using the `@cypher` GraphQL schema directive:

```javascript
import { makeAugmentedSchema } from 'neo4j-graphql-js';

const schema = makeAugmentedSchema({ typeDefs });
```

Create a neo4j-javascript-driver instance:

```javascript
import { v1 as neo4j } from 'neo4j-driver';

const driver = neo4j.driver(
  'bolt://localhost:7687',
  neo4j.auth.basic('neo4j', 'letmein')
);
```

Use your favorite JavaScript GraphQL server implementation to serve your GraphQL schema, injecting the Neo4j driver instance into the context so your data can be resolved in Neo4j:

```javascript
import { ApolloServer } from 'apollo-server';

const server = new ApolloServer({ schema, context: { driver } });

server.listen(3003, '0.0.0.0').then(({ url }) => {
  console.log(`GraphQL API ready at ${url}`);
});
```

If you don't want auto-generated resolvers, you can also call `neo4jgraphql()` in your GraphQL resolver. Your GraphQL query will be translated to Cypher and the query passed to Neo4j.

```js
import { neo4jgraphql } from 'neo4j-graphql-js';

const resolvers = {
  Query: {
    Movie(object, params, ctx, resolveInfo) {
      return neo4jgraphql(object, params, ctx, resolveInfo);
    }
  }
};
```

## What is `neo4j-graphql.js`

A package to make it easier to use GraphQL and [Neo4j](https://neo4j.com/) together. `neo4j-graphql.js` translates GraphQL queries to a single [Cypher](https://neo4j.com/developer/cypher/) query, eliminating the need to write queries in GraphQL resolvers and for batching queries. It also exposes the Cypher query language through GraphQL via the `@cypher` schema directive.

### Goals

- Translate GraphQL queries to Cypher to simplify the process of writing GraphQL resolvers
- Allow for custom logic by overriding of any resolver function
- Work with `graphql-tools`, `graphql-js`, and `apollo-server`
- Support GraphQL servers that need to resolve data from multiple data services/databases
- Expose the power of Cypher through GraphQL via the `@cypher` directive

## Benefits

- Send a single query to the database
- No need to write queries for each resolver
- Exposes the power of the Cypher query language through GraphQL

## Contributing

See our [detailed contribution guidelines](./CONTRIBUTING.md).

## Examples

See [/examples](https://github.com/neo4j-graphql/neo4j-graphql-js/tree/master/example/apollo-server)

## [Documentation](docs/)

Full docs can be found in [docs/](docs/)

## Debugging and Tuning

You can log out the generated cypher statements with an environment variable:

```
DEBUG=neo4j-graphql-js node yourcode.js
```

This helps to debug and optimize your database statements. E.g. visit your Neo4J
browser console at http://localhost:7474/browser/ and paste the following:

```
:params :params { offset: 0, first: 12, filter: {}, cypherParams: { currentUserId: '42' } }
```

and now profile the generated query:

```
EXPLAIN MATCH (`post`:`Post`) WITH `post` ORDER BY post.createdAt DESC RETURN `post` { .id , .title } AS `post`
```

You can learn more by typing:

```
:help EXPLAIN
:help params
```
