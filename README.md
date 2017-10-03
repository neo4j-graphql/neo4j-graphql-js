![](https://circleci.com/gh/neo4j-graphql/neo4j-graphql-js.svg?style=shield&circle-token=d01ffa752fbeb43585631c78370f7dd40528fbd3)

# neo4j-graphql-js

A GraphQL to Cypher query execution layer for Neo4j and JavaScript GraphQL implementations.

*neo4j-graphql-js is in early development. There are rough edges and APIs may change. Please file issues for any bugs that you find or feature reqeuests.*

## What is `neo4j-graphql-js`

A package to make it easier to use GraphQL and Neo4j together. `neo4j-graphql-js` translates GraphQL queries to a single Cypher query, eliminating the need to write queries in GraphQL resolvers. It also exposes the Cypher query language through GraphQL via the `@cypher` schema directive.

### Goals

* Translate GraphQL queries to Cypher to simply the process of writing GraphQL resolvers
* Allow for custom logic by overriding of any resolver function
* Work with `graphl-tools`, `graphql-js`, and `apollo-server`
* Support GraphQL servers that need to resolve data from multiple data services/databases
* Expose the power of Cypher through GraphQL via the `@cypher` directive

## `@cypher` directive

GraphQL is fairly limited when it comes to expressing complex queries such as filtering, or aggregations. We expose the graph querying language Cypher through GraphQL via the `@cypher` directive. Annotate a field in your schema with the `@cypher` directive to map the results of that query to the annotated GraphQL field. For example:

~~~
type Movie {
  movieId: ID!
  title: String
  year: Int
  plot: String

  similar(first: Int = 3, offset: Int = 0): [Movie] @cypher(statement: "WITH {this} AS this MATCH (this)-->(:Genre)<--(o:Movie) RETURN o ORDER BY COUNT(*) DESC")
}
~~~

The field `similar` will be resolved using the Cypher query

~~~
MATCH (this)-->(:Genre)<--(o:Movie) RETURN o ORDER BY COUNT(*) DESC
~~~

to find movies with overlapping Genres. See the [examples](https://github.com/neo4j-graphql/neo4j-graphql-js/tree/master/example/graphql-tools) for more information.

## Test

We use the `ava` test runner.

~~~
npm install
npm build
npm test
~~~

Currently we only have simple unit tests verifying generated Cypher as translated from GraphQL queries and schema. More complete tests and CI integration coming soon.

## Examples

See [example/graphql-tools/movies.js](https://github.com/neo4j-graphql/neo4j-graphql-js/tree/master/example/graphql-tools)

## Features

- [x] translate basic GraphQL queries to Cypher
- [x] `first` and `offset` arguments for
- [x] `@cypher` directive for mapping
- [ ] Handle enumeration types
- [ ] Handle interface types
- [ ] Handle fragments
- [ ] Handle named fragments
- [ ] Ordering
- [ ] Example with `graphql-js`
- [ ] Example with `apollo-server`
- [ ] Example with Apollo Launchpad