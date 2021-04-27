# neo4j-graphql.js User Guide

## What is `neo4j-graphql-js`

A package to make it easier to use GraphQL and [Neo4j](https://neo4j.com/) together. `neo4j-graphql-js` translates GraphQL queries to a single [Cypher](https://neo4j.com/developer/cypher/) query, eliminating the need to write queries in GraphQL resolvers and for batching queries. It also exposes the Cypher query language through GraphQL via the `@cypher` schema directive.

### Goals of neo4j-graphql.js

- Translate GraphQL queries to Cypher to simplify the process of writing GraphQL resolvers
- Allow for custom logic by overriding of any resolver function
- Work with `graphql-tools`, `graphql-js`, and `apollo-server`
- Support GraphQL servers that need to resolve data from multiple data services/databases
- Expose the power of Cypher through GraphQL via the `@cypher` directive

## How it works

`neo4j-graphql-js` aims to simplify the process of building GraphQL APIs backed by Neo4j, embracing the paradigm of GraphQL First Development. Specifically,

- The Neo4j datamodel is defined by a GraphQL schema.
- Inside resolver functions, GraphQL queries are translated to Cypher queries and can be sent to a Neo4j database by including a Neo4j driver instance in the context object of the GraphQL request.
- Any resolver can be overridden by a custom resolver function implementation to allow for custom logic
- Optionally, GraphQL fields can be resolved by a user defined Cypher query through the use of the `@cypher` schema directive.

### Start with a GraphQL schema

GraphQL First Development is all about starting with a well defined GraphQL schema. Here we'll use the GraphQL schema IDL syntax, compatible with graphql-tools (and other libraries) to define a simple schema:

```js
const typeDefs = `
type Movie {
  movieId: ID!
  title: String
  year: Int
  plot: String
  poster: String
  imdbRating: Float
  similar(first: Int = 3, offset: Int = 0): [Movie] @cypher(statement: "MATCH (this)-[:IN_GENRE]->(:Genre)<-[:IN_GENRE]-(o:Movie) RETURN o")
  degree: Int @cypher(statement: "RETURN SIZE((this)-->())")
  actors(first: Int = 3, offset: Int = 0): [Actor] @relation(name: "ACTED_IN", direction:IN)
}

type Actor {
  id: ID!
  name: String
  movies: [Movie]
}


type Query {
  Movie(id: ID, title: String, year: Int, imdbRating: Float, first: Int, offset: Int): [Movie]
}
`;
```

We define two types, `Movie` and `Actor` as well as a top level Query `Movie` which becomes our entry point. This looks like a standard GraphQL schema, except for the use of two directives `@relation` and `@cypher`. In GraphQL directives allow us to annotate fields and provide an extension point for GraphQL. See [GraphQL Schema Directive](graphql-schema-directives.mdx) for an overview of all GraphQL schema directives exposed in `neo4j-graphql.js`

- `@cypher` directive - maps the specified Cypher query to the value of the field. In the Cypher query, `this` is bound to the current object being resolved. See [Adding Custom Logic](graphql-custom-logic.mdx#the-cypher-graphql-schema-directive) for more information and examples of the `@cypher` GraphQL schema directive.
- `@relation` directive - used to indicate relationships in the data model. The `name` argument specifies the relationship type, and `direction` indicates the direction of the relationship (`IN` for incoming relationships, `OUT` for outgoing relationships, or `BOTH` to match both directions). See the [GraphQL Schema Design Guide](guide-graphql-schema-design.mdx) for more information and examples.

### Translate GraphQL To Cypher

Inside each resolver, use `neo4j-graphql()` to generate the Cypher required to resolve the GraphQL query, passing through the query arguments, context and resolveInfo objects.

```js
import { neo4jgraphql } from 'neo4j-graphql-js';

const resolvers = {
  // entry point to GraphQL service
  Query: {
    Movie(object, params, ctx, resolveInfo) {
      return neo4jgraphql(object, params, ctx, resolveInfo);
    }
  }
};
```

GraphQL to Cypher translation works by inspecting the GraphQL schema, the GraphQL query and arguments. For example, this simple GraphQL query

```graphql
{
  Movie(title: "River Runs Through It, A") {
    title
    year
    imdbRating
  }
}
```

is translated into the Cypher query

```cypher
MATCH (movie:Movie {title:"River Runs Through It, A"})
RETURN movie { .title , .year , .imdbRating } AS movie
SKIP 0
```

A slightly more complicated traversal

```graphql
{
  Movie(title: "River Runs Through It, A") {
    title
    year
    imdbRating
    actors {
      name
    }
  }
}
```

becomes

```cypher
MATCH (movie:Movie {title:"River Runs Through It, A"})
RETURN movie { .title , .year , .imdbRating,
  actors: [(movie)<-[ACTED_IN]-(movie_actors:Actor) | movie_actors { .name }] }
AS movie
SKIP 0
```

## `@cypher` directive

> The `@cypher` directive feature has a dependency on the APOC procedure library, to enable subqueries. If you'd like to make use of the `@cypher` feature you'll need to install the [APOC procedure library](https://github.com/neo4j-contrib/neo4j-apoc-procedures#installation-with-neo4j-desktop).

GraphQL is fairly limited when it comes to expressing complex queries such as filtering, or aggregations. We expose the graph querying language Cypher through GraphQL via the `@cypher` directive. Annotate a field in your schema with the `@cypher` directive to map the results of that query to the annotated GraphQL field. For example:

```graphql
type Movie {
  movieId: ID!
  title: String
  year: Int
  plot: String
  similar(first: Int = 3, offset: Int = 0): [Movie]
    @cypher(
      statement: "MATCH (this)-[:IN_GENRE]->(:Genre)<-[:IN_GENRE]-(o:Movie) RETURN o ORDER BY COUNT(*) DESC"
    )
}
```

The field `similar` will be resolved using the Cypher query

```cypher
MATCH (this)-[:IN_GENRE]->(:Genre)<-[:IN_GENRE]-(o:Movie) RETURN o ORDER BY COUNT(*) DESC
```

to find movies with overlapping Genres.

Querying a GraphQL field marked with a `@cypher` directive executes that query as a subquery:

_GraphQL:_

```graphql
{
  Movie(title: "River Runs Through It, A") {
    title
    year
    imdbRating
    actors {
      name
    }
    similar(first: 3) {
      title
    }
  }
}
```

_Cypher:_

```cypher
MATCH (movie:Movie {title:"River Runs Through It, A"})
RETURN movie { .title , .year , .imdbRating,
  actors: [(movie)<-[ACTED_IN]-(movie_actors:Actor) | movie_actors { .name }],
  similar: [ x IN apoc.cypher.runFirstColumn("
        WITH {this} AS this
        MATCH (this)-[:IN_GENRE]->(:Genre)<-[:IN_GENRE]-(o:Movie)
        RETURN o",
        {this: movie}, true) | x { .title }][..3]
} AS movie
SKIP 0
```

> This means that the entire GraphQL request is still resolved with a single Cypher query, and thus a single round trip to the database.

## Query Neo4j

Inject a Neo4j driver instance in the context of each GraphQL request and `neo4j-graphql-js` will query the Neo4j database and return the results to resolve the GraphQL query.

```js
let driver;

function context(headers, secrets) {
  if (!driver) {
    driver = neo4j.driver(
      'bolt://localhost:7687',
      neo4j.auth.basic('neo4j', 'letmein')
    );
  }
  return { driver };
}
```

```js
server.use(
  '/graphql',
  bodyParser.json(),
  graphqlExpress(request => ({
    schema,
    rootValue,
    context: context(request.headers, process.env)
  }))
);
```

## Resources

- Blog post: [Five Common GraphQL Problems and How Neo4j-GraphQL Aims To Solve Them](https://blog.grandstack.io/five-common-graphql-problems-and-how-neo4j-graphql-aims-to-solve-them-e9a8999c8d43) - Digging Into the Goals of A Neo4j-GraphQL Integration
