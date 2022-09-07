# Using Multiple Neo4j Databases

> This section describes how to use multiple Neo4j databases with neo4j-graphql.js. Multiple active databases is a feature available in Neo4j v4.x

Neo4j supports multiple active databases. This feature is often used to support multi-tenancy use cases. Multiple databases can be used with neo4j-graphql.js by specifying a value in the GraphQL resolver context. If no value is specified for `context.neo4jDatabase` then the default database is used (as specified in `neo4j.conf`)

You can read more about managing and working with multiple databases in Neo4j in the manual [here.](https://neo4j.com/docs/operations-manual/current/manage-databases/introduction/)

## Specifying The Neo4j Database

The Neo4j database to be used is specified in the GraphQL resolver context object. The context object is passed to each resolver and neo4j-graphql.js at a minimum expects a Neo4j JavaScript driver instance under the `driver` key.

To specify the Neo4j database to be used, provide a value in the context object, under the key `neo4jDatabase` that evaluates to a string representing the desired database. If no value is provided then the default Neo4j database will be used.

For example, with Apollo Server, here we provide the database name `sanmateo`:

```js
const neo4j = require('neo4j-driver');
const { ApolloServer } = require('apollo-server');

const driver = neo4j.driver(
  'neo4j://localhost:7687',
  neo4j.auth.basic('neo4j', 'letmein')
);

const server = new ApolloServer({
  schema,
  context: { driver, neo4jDatabase: 'sanmateo' }
});

server.listen(3004, '0.0.0.0').then(({ url }) => {
  console.log(`GraphQL API ready at ${url}`);
});
```

## Specifying The Neo4j Database In A Request Header

We can also use a function to define the context object. This allows us to use a value from the request header or some middleware process to specify the Neo4j database.

Here we use the value of the request header `x-database` for the Neo4j database:

```js
const neo4j = require('neo4j-driver');
const { ApolloServer } = require('apollo-server');

const driver = neo4j.driver(
  'neo4j://localhost:7687',
  neo4j.auth.basic('neo4j', 'letmein')
);

const server = new ApolloServer({
  schema,
  context: ({ req }) => {
    return { driver, neo4jDatabase: req.header['x-database'] };
  }
});

server.listen(3004, '0.0.0.0').then(({ url }) => {
  console.log(`GraphQL API ready at ${url}`);
});
```

## Resources

- [Multi-Tenant GraphQL With Neo4j 4.0](https://blog.grandstack.io/multitenant-graphql-with-neo4j-4-0-4a1b2b4dada4) A Look At Using Neo4j 4.0 Multidatabase With neo4j-graphql.js
