# neo4j-graphql.js Quickstart

A GraphQL to Cypher query execution layer for Neo4j and JavaScript GraphQL implementations.

## Installation and usage

### Install

```shell
npm install --save neo4j-graphql-js
```

### Usage

Start with GraphQL type definitions:

```js
const typeDefs = `
type Movie {
    title: String
    year: Int
    imdbRating: Float
    genres: [Genre] @relation(name: "IN_GENRE", direction: OUT)
}
type Genre {
    name: String
    movies: [Movie] @relation(name: "IN_GENRE", direction: IN)
}
`;
```

Create an executable GraphQL schema with auto-generated resolvers for Query and Mutation types, ordering, pagination, and support for computed fields defined using the `@cypher` GraphQL schema directive:

```js
import { makeAugmentedSchema } from 'neo4j-graphql-js';

const schema = makeAugmentedSchema({ typeDefs });
```

Create a neo4j-javascript-driver instance:

```js
import neo4j from 'neo4j-driver';

const driver = neo4j.driver(
  'bolt://localhost:7687',
  neo4j.auth.basic('neo4j', 'letmein')
);
```

Use your favorite JavaScript GraphQL server implementation to serve your GraphQL schema, injecting the Neo4j driver instance into the context so your data can be resolved in Neo4j:

```js
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

## Benefits

- Send a single query to the database
- No need to write queries for each resolver
- Exposes the power of the Cypher query language through GraphQL

## Features

- [x] Translate basic GraphQL queries to Cypher
- [x] `first` and `offset` arguments for pagination
- [x] `@cypher` schema directive for exposing Cypher through GraphQL
- [x] Handle fragments
- [x] Ordering
- [x] Filtering
- [x] Handle interface types
- [x] Handle inline fragments
- [x] Native database temporal types (Date, DateTime, LocalDateTime)
- [x] Native Point database type
