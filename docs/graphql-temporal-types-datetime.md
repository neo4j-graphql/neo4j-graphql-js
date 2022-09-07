# GraphQL Temporal Types (DateTime)

> Temporal types are available in Neo4j v3.4+ Read more about [using temporal types](https://neo4j.com/docs/cypher-manual/current/syntax/temporal/) and [functions](https://neo4j.com/docs/cypher-manual/current/functions/temporal/) in Neo4j in the docs and [in this post](https://www.adamcowley.co.uk/neo4j/temporal-native-dates/).

Neo4j supports native temporal types as properties on nodes and relationships. These types include Date, DateTime, and LocalDateTime. With neo4j-graphql.js you can use these temporal types in your GraphQL schema. Just use them in your SDL type definitions.

## Temporal Types In SDL

neo4j-graphql.js makes available the following temporal types for use in your GraphQL type definitions: `Date`, `DateTime`, and `LocalDateTime`. You can use the temporal types in a field definition in your GraphQL type like this:

```graphql
type Movie {
  id: ID!
  title: String
  published: DateTime
}
```

## Using Temporal Fields In Queries

Temporal types expose their date components (such as day, month, year, hour, etc) as fields, as well as a `formatted` field which is the [ISO 8601](https://en.wikipedia.org/wiki/ISO_8601) string representation of the temporal value. The specific fields available vary depending on which temporal is used, but generally conform to [those specified here](https://neo4j.com/docs/cypher-manual/current/syntax/temporal/). For example:

_GraphQL query_

```graphql
{
  Movie(title: "River Runs Through It, A") {
    title
    published {
      day
      month
      year
      hour
      minute
      second
      formatted
    }
  }
}
```

_GraphQL result_

```json
{
  "data": {
    "Movie": [
      {
        "title": "River Runs Through It, A",
        "published": {
          "day": 9,
          "month": 10,
          "year": 1992,
          "hour": 0,
          "minute": 0,
          "second": 0,
          "formatted": "1992-10-09T00:00:00Z"
        }
      }
    ]
  }
}
```

### Temporal Query Arguments

As part of the [schema augmentation process](graphql-schema-generation-augmentation.mdx) temporal input types are added to the schema and can be used as query arguments. For example, given the type definition:

```graphql
type Movie {
  movieId: ID!
  title: String
  released: Date
}
```

the following query will be generated for the `Movie` type:

```graphql
Movie (
  movieId: ID!
  title: String
  released: _Neo4jDate
  _id: String
  first: Int
  offset: Int
  orderBy: _MovieOrdering
)
```

and the type `_Neo4jDateInput` added to the schema:

```graphql
type _Neo4jDateTimeInput {
  year: Int
  month: Int
  day: Int
  formatted: String
}
```

At query time, either specify the individual components (year, month, day, etc) or the `formatted` field, which is the [ISO 8601](https://en.wikipedia.org/wiki/ISO_8601) representation. For example, to query for all movies with a release date of October 10th, 1992:

```graphql
{
  Movie(released: { year: 1992, month: 10, day: 9 }) {
    title
  }
}
```

or equivalently:

```graphql
{
  Movie(released: { formatted: "1992-10-09" }) {
    title
  }
}
```

## Using Temporal Fields In Mutations

As part of the [schema augmentation process](#schema-augmentation) temporal input types are created and used for the auto-generated create, update, delete mutations using the type definitions specified for the GraphQL schema. These temporal input types also include fields for each component of the temporal type (day, month, year, hour, etc) as well as `formatted`, the [ISO 8601](https://en.wikipedia.org/wiki/ISO_8601) representation. When used in a mutation, specify either the individual components **or** the `formatted` field, but not both.

For example, this mutation:

```graphql
mutation {
  CreateMovie(
    title: "River Runs Through It, A"
    published: { year: 1992, month: 10, day: 9 }
  ) {
    title
    published {
      formatted
    }
  }
}
```

is equivalent to this version, using the `formatted` field instead

```graphql
mutation {
  CreateMovie(
    title: "River Runs Through It, A"
    published: { formatted: "1992-10-09T00:00:00Z" }
  ) {
    title
    published {
      formatted
    }
  }
}
```

The input types for temporals generally correspond to the fields used for specifying temporal instants in Neo4j [described here](https://neo4j.com/docs/cypher-manual/current/syntax/temporal/#cypher-temporal-specifying-temporal-instants).

## Resources

- Blog post: [Using Native DateTime Types With GRANDstack](https://blog.grandstack.io/using-native-datetime-types-with-grandstack-e126728fb2a0) - Leverage Neo4j’s Temporal Types In Your GraphQL Schema With neo4j-graphql.js
