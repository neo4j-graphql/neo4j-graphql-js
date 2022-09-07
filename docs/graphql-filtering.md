# Complex GraphQL Filtering

A `filter` argument is added to field arguments, as well as input types used to support them.

> Filtering is currently supported for scalar fields, enums, `@relation` fields and types. Filtering on `@cypher` directive fields is not yet supported.

## `filter` Argument

The auto-generated `filter` argument is used to support complex filtering in queries. For example, to filter for Movies released before 1920:

```graphql
{
  Movie(filter: { year_lt: 1920 }) {
    title
    year
  }
}
```

## Nested Filter

To filter based on the results of nested fields applied to the root, simply nest the filters used. For example, to search for movies whose title starts with "River" and has at least one actor whose name starts with "Brad":

```graphql
{
  Movie(
    filter: {
      title_starts_with: "River"
      actors_some: { name_contains: "Brad" }
    }
  ) {
    title
  }
}
```

## Logical Operators: `AND`, `OR`

Filters can be wrapped in logical operations `AND` and `OR`. For example, to find movies that were released before 1920 or have a title that contains "River Runs":

```graphql
{
  Movie(filter: { OR: [{ year_lt: 1920 }, { title_contains: "River Runs" }] }) {
    title
    year
  }
}
```

These logical operators can be nested as well. For example, find movies that there were released before 1920 or have a title that contains "River" and belong to the genre "Drama":

```graphql
{
  Movie(
    filter: {
      OR: [
        { year_lt: 1920 }
        {
          AND: [{ title_contains: "River" }, { genres_some: { name: "Drama" } }]
        }
      ]
    }
  ) {
    title
    year
    genres {
      name
    }
  }
}
```

## Regular Expressions: `regexp`

The Cypher [regular expression](https://neo4j.com/docs/cypher-manual/current/clauses/where/#query-where-regex) filter is generated for `ID` and `String` type fields. The value provided should follow the [Java syntax](https://docs.oracle.com/javase/7/docs/api/java/util/regex/Pattern.html) for regular expressions.

For example, to find movies where the `title` property has the value `river` (case-insensitive):

```graphql
{
  Movie(filter: { title_regexp: "(?i)river.*" }) {
    title
    year
  }
}
```

## Filtering In Selections

Filters can be used in not only the root query argument, but also throughout the selection set. For example, search for all movies that contain the string "River", and when returning the genres of the these movies only return genres with the name "Drama":

```graphql
{
  Movie(filter: { title_contains: "River" }) {
    title
    genres(filter: { name: "Drama" }) {
      name
    }
  }
}
```

## DateTime Filtering

Filtering can be applied to GraphQL temporal fields, using the temporal input types described in the [Temporal Types (DateTime) section](graphql-temporal-types-datetime.mdx#using-temporal-fields-in-mutations). For example, filter for reviews created before January 1, 2015:

```graphql
{
  User(first: 1) {
    rated(filter: { created_lt: { year: 2015, month: 1, day: 1 } }) {
      rating
      created {
        formatted
      }
    }
  }
}
```

## Spatial Filtering

When querying using point data, often we want to find things that are close to other things. For example, what businesses are within 1.5km of me?

For points using the Geographic coordinate reference system (latitude and longitude) `distance` is measured in meters.

## Filter Criteria

The filter criteria available depends on the type of the field and are added to the generated input type prefixed by the name of the field and suffixed with the criteria. For example, given the following type definitions:

```graphql
enum RATING {
  G
  PG
  PG13
  R
}

type Movie {
  movieId: ID!
  title: String
  year: Int
  rating: RATING
  available: Boolean
  actors: [Actor] @relation(name: "ACTED_IN", direction: IN)
  reviews: [UserReview]
}

type Actor {
  name: String
}

type User {
  name: String
  rated: UserReview
}

type UserReview @relation(name: "RATED") {
  from: User
  to: Movie
  rating: Float
  createdAt: DateTime
}

type Business {
  id: ID!
  name: String
  location: Point
}
```

the following filtering criteria is available, through the generated `filter` input type.

_This table shows the fields available on the generated `filter` input type, and a brief explanation of each filter criteria._

|                         | Field                   | Type                        | Explanation                                                                                                                                                             |
| ----------------------- | ----------------------- | --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Logical operators**   |                         |                             |                                                                                                                                                                         |
|                         | `AND`                   | `[_MovieFilter]`            | Use to apply logical AND to a list of filters, typically used when nested with OR operators                                                                             |
|                         | `OR`                    | `[_MovieFilter]`            | Use to apply logical OR to a list of filters.                                                                                                                           |
| **ID fields**           |                         |                             |                                                                                                                                                                         |
|                         | `movieId`               | `ID`                        | Matches nodes when value is an exact match                                                                                                                              |
|                         | `movieId_not`           | `ID`                        | Matches nodes when value is not an exact match                                                                                                                          |
|                         | `movieId_in`            | `[ID!]`                     | Matches nodes based on equality of at least one value in list of values                                                                                                 |
|                         | `movieId_not_in`        | `[ID!]`                     | Matches nodes based on inequality of all values in list of values                                                                                                       |
|                         | `movieId_regexp`        | `String`                    | Matches nodes given provided [regular expression](https://neo4j.com/docs/cypher-manual/current/clauses/where/#query-where-regex)                                        |
| **String fields**       |                         |                             |                                                                                                                                                                         |
|                         | `title`                 | `String`                    | Matches nodes based on equality of value                                                                                                                                |
|                         | `title_not`             | `String`                    | Matches nodes based on inequality of value                                                                                                                              |
|                         | `title_in`              | `[String!]`                 | Matches nodes based on equality of at least one value in list                                                                                                           |
|                         | `title_not_in`          | `[String!]`                 | Matches nodes based on inequality of all values in list                                                                                                                 |
|                         | `title_regexp`          | `String`                    | Matches nodes given provided [regular expression](https://neo4j.com/docs/cypher-manual/current/clauses/where/#query-where-regex)                                        |
|                         | `title_contains`        | `String`                    | Matches nodes when value contains given substring                                                                                                                       |
|                         | `title_not_contains`    | `String`                    | Matches nodes when value does not contain given substring                                                                                                               |
|                         | `title_starts_with`     | `String`                    | Matches nodes when value starts with given substring                                                                                                                    |
|                         | `title_not_starts_with` | `String`                    | Matches nodes when value does not start with given substring                                                                                                            |
|                         | `title_ends_with`       | `String`                    | Matches nodes when value ends with given substring                                                                                                                      |
|                         | `title_not_ends_with`   | `String`                    | Matches nodes when value does not end with given substring                                                                                                              |
| **Numeric fields**      |                         |                             | _Similar behavior for float fields_                                                                                                                                     |
|                         | `year`                  | `Int`                       | Matches nodes when value is an exact match                                                                                                                              |
|                         | `year_not`              | `Int`                       | Matches nodes based on inequality of value                                                                                                                              |
|                         | `year_in`               | `[Int!]`                    | Matches nodes based on equality of at least one value in list                                                                                                           |
|                         | `year_not_in`           | `[Int!]`                    | Matches nodes based on inequality of all values in list                                                                                                                 |
|                         | `year_lt`               | `Int`                       | Matches nodes when value is less than given integer                                                                                                                     |
|                         | `year_lte`              | `Int`                       | Matches nodes when value is less than or equal to given integer                                                                                                         |
|                         | `year_gt`               | `Int`                       | Matches nodes when value is greater than given integer                                                                                                                  |
|                         | `year_gte`              | `Int`                       | Matches nodes when value is greater than or equal to given integer                                                                                                      |
| **Enum fields**         |                         |                             |                                                                                                                                                                         |
|                         | `rating`                | `RATING_ENUM`               | Matches nodes based on enum value                                                                                                                                       |
|                         | `rating_not`            | `RATING_ENUM`               | Matches nodes based on inequality of enum value                                                                                                                         |
|                         | `rating_in`             | `[RATING_ENUM!]`            | Matches nodes based on equality of at least one enum value in list                                                                                                      |
|                         | `rating_not_in`         | `[RATING_ENUM!]`            | Matches nodes based on inequality of all values in list                                                                                                                 |
| **Boolean fields**      |                         |                             |
|                         | `available`             | `Boolean`                   | Matches nodes based on value                                                                                                                                            |
|                         | `available_not`         | `Boolean`                   | Matches nodes base on inequality of value                                                                                                                               |
| **Relationship fields** |                         |                             | _Use a relationship field filter to apply a nested filter to matches at the root level_                                                                                 |
|                         | `actors`                | `_ActorFilter`              | Matches nodes based on a filter of the related node                                                                                                                     |
|                         | `actors_not`            | `_ActorFilter`              | Matches nodes when a filter of the related node is not a match                                                                                                          |
|                         | `actors_in`             | `[_ActorFilter!]`           | Matches nodes when the filter matches at least one of the related nodes                                                                                                 |
|                         | `actors_not_in`         | `[_ActorFilter!]`           | Matches nodes when the filter matches none of the related nodes                                                                                                         |
|                         | `actors_some`           | `_ActorFilter`              | Matches nodes when at least one of the related nodes is a match                                                                                                         |
|                         | `actors_none`           | `_ActorFilter`              | Matches nodes when none of the related nodes are a match                                                                                                                |
|                         | `actors_single`         | `_ActorFilter`              | Matches nodes when exactly one of the related nodes is a match                                                                                                          |
|                         | `actors_every`          | `_ActorFilter`              | Matches nodes when all related nodes are a match                                                                                                                        |
| **Temporal fields**     |                         |                             | _Temporal filters use the temporal inputs described in the [Temporal Types (DateTime) section](graphql-temporal-types-datetime.mdx#using-temporal-fields-in-mutations)_ |
|                         | `createdAt`             | `_Neo4jDateTimeInput`       | Matches when date is an exact match                                                                                                                                     |
|                         | `createdAt_not`         | `_Neo4jDateTimeInput`       | Matches based on inequality of value                                                                                                                                    |
|                         | `createdAt_in`          | `[_Neo4jDateTimeInput]`     | Matches based on equality of at least one value in list                                                                                                                 |
|                         | `createdAt_not_in`      | `[_Neo4jDateTimeInput]`     | Matches based on inequality of all values in list                                                                                                                       |
|                         | `createdAt_lt`          | `_Neo4jDateTimeInput`       | Matches when value is less than given DateTime                                                                                                                          |
|                         | `createdAt_lte`         | `_Neo4jDateTimeInput`       | Matches when value is less than or equal to given DateTime                                                                                                              |
|                         | `createdAt_gt`          | `_Neo4jDateTimeInput`       | Matches when value is greater than given DateTime                                                                                                                       |
|                         | `cratedAt_gte`          | `_Neo4jDateTimeInput`       | Matches when value is greater than or equal to given DateTime                                                                                                           |
| **Spatial fields**      |                         |                             | _Spatial filers use the point inputs described in the [Spatial Types section](graphql-spatial-types.mdx)_                                                               |
|                         | `location`              | `_Neo4jPointInput`          | Matches point property exactly                                                                                                                                          |
|                         | `location_not`          | `_Neo4jPointInput`          | Matches based on inequality of point values                                                                                                                             |
|                         | `location_distance`     | `_Neo4jPointDistanceFilter` | Matches based on computed distance of location to provided point                                                                                                        |
|                         | `location_distance_lt`  | `_Neo4jPointDistanceFilter` | Matches when computed distance of location to provided point is less than distance specified                                                                            |
|                         | `location_distance_lte` | `_Neo4jPointDistanceFilter` | Matches when computed distance of location to provided point is less than or equal to distance specified                                                                |
|                         | `location_distance_gt`  | `_Neo4jPointDistanceFilter` | Matches when computed distance of location to provided point is greater than distance specified                                                                         |
|                         | `location_distance_gte` | `_Neo4jPointDistanceFilter` | Matches when computed distance of location to provided point is greater than or equal to distance specified                                                             |

See the [filtering tests](https://github.com/neo4j-graphql/neo4j-graphql-js/blob/master/test/helpers/tck/filterTck.md) for more examples of the use of filters.

## Resources

- Blog post: [Complex GraphQL Filtering With neo4j-graphql.js](https://blog.grandstack.io/complex-graphql-filtering-with-neo4j-graphql-js-aef19ad06c3e) - Use filtering in your GraphQL queries without writing any resolvers
