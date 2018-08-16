[![CI status](https://circleci.com/gh/neo4j-graphql/neo4j-graphql-js.svg?style=shield&circle-token=d01ffa752fbeb43585631c78370f7dd40528fbd3)](https://circleci.com/gh/neo4j-graphql/neo4j-graphql-js) [![npm version](https://badge.fury.io/js/neo4j-graphql-js.svg)](https://badge.fury.io/js/neo4j-graphql-js) [![Docs link](https://img.shields.io/badge/Docs-GRANDstack.io-brightgreen.svg)](http://grandstack.io/docs/neo4j-graphql-js.html)

# neo4j-graphql-js

A GraphQL to Cypher query execution layer for Neo4j and JavaScript GraphQL implementations.

- [Read the docs](https://grandstack.io/docs/neo4j-graphql-js.html)
- [Read the changelog](https://github.com/neo4j-graphql/neo4j-graphql-js/blob/master/CHANGELOG.md)

_neo4j-graphql-js is in early development. There are rough edges and APIs may change. Please file issues for any bugs that you find or feature requests._

## Installation and usage

Install

```
npm install --save neo4j-graphql-js
```

Then call `neo4jgraphql()` in your GraphQL resolver. Your GraphQL query will be translated to Cypher and the query passed to Neo4j.

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

## What is `neo4j-graphql-js`

A package to make it easier to use GraphQL and [Neo4j](https://neo4j.com/) together. `neo4j-graphql-js` translates GraphQL queries to a single [Cypher](https://neo4j.com/developer/cypher/) query, eliminating the need to write queries in GraphQL resolvers and for batching queries. It also exposes the Cypher query language through GraphQL via the `@cypher` schema directive.

### Goals

- Translate GraphQL queries to Cypher to simplify the process of writing GraphQL resolvers
- Allow for custom logic by overriding of any resolver function
- Work with `graphl-tools`, `graphql-js`, and `apollo-server`
- Support GraphQL servers that need to resolve data from multiple data services/databases
- Expose the power of Cypher through GraphQL via the `@cypher` directive

## Benefits

- Send a single query to the database
- No need to write queries for each resolver
- Exposes the power of the Cypher query langauge through GraphQL

## Test

We use the `ava` test runner.

```
npm install
npm build
npm test
```

The `npm test` script will run unit tests that check GraphQL -> Cypher translation and the schema augmentation features and can be easily run locally without a test environment. Full integration tests can be found in `/test` and are [run on CircleCI](https://circleci.com/gh/neo4j-graphql/neo4j-graphql-js) as part of the CI process.

## Examples

See [/examples](https://github.com/neo4j-graphql/neo4j-graphql-js/tree/master/example/apollo-server)

## [Documentation](http://grandstack.io/docs/neo4j-graphql-js.html)

Full docs can be found on [GRANDstack.io/docs](http://grandstack.io/docs/neo4j-graphql-js.html)
