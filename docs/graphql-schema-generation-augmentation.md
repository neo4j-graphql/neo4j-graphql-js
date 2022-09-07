# GraphQL Schema Generation And Augmentation

`neo4j-graphql.js` can create an executable GraphQL schema from GraphQL type definitions or augment an existing GraphQL schema, adding

- auto-generated mutations and queries (including resolvers)
- ordering and pagination fields
- filter fields

## Usage

To add these augmentations to the schema use either the [`augmentSchema`](neo4j-graphql-js-api.mdx#augmentschemaschema-graphqlschema) or [`makeAugmentedSchema`](neo4j-graphql-js-api.mdx#makeaugmentedschemaoptions-graphqlschema) functions exported from `neo4j-graphql-js`.

**`makeAugmentedSchema`** - _generate executable schema from GraphQL type definitions only_

```js
import { makeAugmentedSchema } from 'neo4j-graphql-js';

const typeDefs = `
type Movie {
    movieId: ID!
    title: String @search
    year: Int
    imdbRating: Float
    genres: [Genre] @relation(name: "IN_GENRE", direction: OUT)
    similar: [Movie] @cypher(
        statement: """MATCH (this)<-[:RATED]-(:User)-[:RATED]->(s:Movie) 
                      WITH s, COUNT(*) AS score 
                      RETURN s ORDER BY score DESC LIMIT {first}""")
}

type Genre {
    name: String
    movies: [Movie] @relation(name: "IN_GENRE", direction: IN)
}`;

const schema = makeAugmentedSchema({ typeDefs });
```

**`augmentSchema`** - _when you already have a GraphQL schema object_

```js
import { augmentSchema } from 'neo4j-graphql-js';
import { makeExecutableSchema } from 'apollo-server';
import { typeDefs, resolvers } from './movies-schema';

const schema = makeExecutableSchema({
  typeDefs,
  resolvers
});

const augmentedSchema = augmentSchema(schema);
```

## Generated Queries

Based on the type definitions provided, fields are added to the Query type for each type defined. For example, the following queries are added based on the type definitions above:

```graphql
Movie(
  movieID: ID!
  title: String
  year: Int
  imdbRating: Float
  _id: Int
  first: Int
  offset: Int
  orderBy: _MovieOrdering
): [Movie]
```

```graphql
Genre(
  name: String
  _id: Int
  first: Int
  offset: Int
  orderBy: _GenreOrdering
): [Genre]
```

## Generated Mutations

Create, update, delete, and add relationship mutations are also generated for each type. For example:

### Create

```graphql
CreateMovie(
  movieId: ID!
  title: String
  year: Int
  imdbRating: Float
): Movie
```

> If an `ID` typed field is specified in the type definition, but not provided when the create mutation is executed then a random UUID will be generated and stored in the database.

### Update

```graphql
UpdateMovie(
  movieId: ID!
  title: String!
  year: Int
  imdbRating: Float
): Movie
```

### Delete

```graphql
DeleteMovie(
  movieId: ID!
): Movie
```

### Merge

> In Neo4j, the `MERGE` clause ensures that a pattern exists in the graph. Either the pattern already exists, or it needs to be created. See the [Cypher manual](https://neo4j.com/docs/cypher-manual/current/clauses/merge/) for more information.

```graphql
MergeMovie(
  movieId: ID!
  title: String
  year: Int
  imdbRating: Float
)
```

### Add / Remove Relationship

Input types are used for relationship mutations.

_Add a relationship with no properties:_

```graphql
AddMovieGenres(
  from: _MovieInput!
  to: _GenreInput!
): _AddMovieGenresPayload
```

and return a special payload type specific to the relationship:

```graphql
type _AddMovieGenresPayload {
  from: Movie
  to: Genre
}
```

Relationship types with properties have an additional `data` parameter for specifying relationship properties:

```graphql
AddMovieRatings(
  from: _UserInput!
  to: _MovieInput!
  data: _RatedInput!
): _AddMovieRatingsPayload

type _RatedInput {
  timestamp: Int
  rating: Float
}
```

### Remove relationship:

```graphql
RemoveMovieGenres(
  from: _MovieInput!
  to: _GenreInput!
): _RemoveMovieGenresPayload
```

### Merge relationship:

```graphql
MergeMovieGenres(
  from: _MovieInput!
  to: _GenreInput!
):  _MergeMovieGenresPayload
```

### Update relationship

Used to update properties on a relationship type.

```graphql
UpdateUserRated(
  from: _UserInput!
  to: _MovieInput!
  data: _RatedInput!
): _UpdateUserRatedPayload
```

> See [the relationship types](#relationship-types) section for more information, including how to declare these types in the schema and the relationship type query API.

### Experimental API

When the `config.experimental` boolean flag is true, [input objects](https://spec.graphql.org/June2018/#sec-Input-Objects) are generated for node property selection and input.

```js
config: {
  experimental: true;
}
```

For the following variant of the above schema, using the `@id`, `@unique`, and `@index` directives on the `Movie` type:

```graphql
type Movie {
  movieId: ID! @id
  title: String! @unique
  year: Int @index
  imdbRating: Float
  genres: [Genre] @relation(name: "IN_GENRE", direction: OUT)
  similar: [Movie]
    @cypher(
      statement: """
      MATCH (this)<-[:RATED]-(:User)-[:RATED]->(s:Movie)
      WITH s, COUNT(*) AS score
      RETURN s ORDER BY score DESC LIMIT {first}
      """
    )
}

type Genre {
  name: String @id
  movies: [Movie] @relation(name: "IN_GENRE", direction: IN)
}
```

This alternative API would be generated for the `Movie` type:

```graphql
type Mutation {
  # Node mutations
  CreateMovie(data: _MovieCreate!): Movie
  UpdateMovie(where: _MovieWhere!, data: _MovieUpdate!): Movie
  DeleteMovie(where: _MovieWhere!): Movie
  # Relationship mutations
  AddMovieGenres(from: _MovieWhere!, to: _GenreWhere!): _AddMovieGenresPayload
  RemoveMovieGenres(
    from: _MovieWhere!
    to: _GenreWhere!
  ): _RemoveMovieGenresPayload
  MergeMovieGenres(
    from: _MovieWhere!
    to: _GenreWhere!
  ): _MergeMovieGenresPayload
}
```

For a node type such as `Movie`, this API design generates an input object for a node selection `where` argument and an input object for a `data` node property input argument. Complex [filtering arguments](https://grandstack.io/docs/graphql-filtering), similar to those used for the `filter` argument in the query API, are generated for each key field (`@id`, `@unique`, and `@index`) on the `Movie` type:

#### Property Selection

```graphql
input _MovieWhere {
  AND: [_MovieWhere!]
  OR: [_MovieWhere!]
  movieId: ID
  movieId_not: ID
  movieId_in: [ID!]
  movieId_not_in: [ID!]
  movieId_contains: ID
  movieId_not_contains: ID
  movieId_starts_with: ID
  movieId_not_starts_with: ID
  movieId_ends_with: ID
  movieId_not_ends_with: ID
  title: String
  title_not: String
  title_in: [String!]
  title_not_in: [String!]
  title_contains: String
  title_not_contains: String
  title_starts_with: String
  title_not_starts_with: String
  title_ends_with: String
  title_not_ends_with: String
  year: Int
  year_not: Int
  year_in: [Int!]
  year_not_in: [Int!]
  year_lt: Int
  year_lte: Int
  year_gt: Int
  year_gte: Int
}
```

#### Property Creation

```graphql
input _MovieCreate {
  movieId: ID
  title: String!
  year: Int
  imdbRating: Float!
}
```

#### Create

Similar to non-experimental API, when no value is provided for the `@id` field of a created node type, that field recieves an auto-generated value using [apoc.create.uuid()](https://neo4j.com/labs/apoc/4.1/graph-updates/uuid/#manual-uuids):

```graphql
mutation {
  CreateMovie(data: { title: "abc", imdbRating: 10, year: 2020 }) {
    movieId
  }
}
```

```js
{
  "data": {
    "CreateMovie": {
      "movieId": "1a2afaa0-5c74-436f-90be-57c4cbb791b0"
    }
  }
}
```

#### Property Update

```graphql
input _MovieUpdate {
  movieId: ID
  title: String
  year: Int
  imdbRating: Float
}
```

#### Update

This mutation API allows for updating key field values:

```graphql
mutation {
  UpdateMovie(where: { title: "abc", year: 2020 }, data: { year: 2021 }) {
    movieId
  }
}
```

#### Delete

```graphql
mutation {
  DeleteMovie(where: { year: 2020 }) {
    movieId
  }
}
```

#### Merge

Because the Cypher `MERGE` clause cannot be combined with `WHERE`, node merge operations can use multiple key fields for node selection, but do not have complex filtering options:

```graphql
type Mutation {
  MergeMovie(where: _MovieKeys!, data: _MovieCreate!): Movie
}
```

```graphql
input _MovieKeys {
  movieId: ID
  title: String
  year: Int
}
```

```graphql
mutation {
  MergeMovie(
    where: { movieId: "123" }
    data: { title: "abc", imdbRating: 10, year: 2021 }
  ) {
    movieId
  }
}
```

In the above `MergeMovie` mutation, a value is provided for the `movieId` argument, which is an `@id` key field on the `Movie` type. Similar to node creation, the `apoc.create.uuid` procedure is used to generate a value for an `@id` key, but only when first creating a node (using the Cypher `ON CREATE` clause of `MERGE`) and if no value is provided in both the `where` and `data` arguments:

```graphql
mutation {
  MergeMovie(where: { year: 2021 }, data: { imdbRating: 10, title: "abc" }) {
    movieId
  }
}
```

```js
{
  "data": {
    "MergeMovie": {
      "movieId": "fd44cd00-1ba1-4da8-894d-d38ba8e5513b"
    }
  }
}
```

## Ordering

`neo4j-graphql-js` supports ordering results through the use of an `orderBy` parameter. The augment schema process will add `orderBy` to fields as well as appropriate ordering enum types (where values are a combination of each field and `_asc` for ascending order and `_desc` for descending order). For example:

```graphql
enum _MovieOrdering {
  title_asc
  title_desc
  year_asc
  year_desc
  imdbRating_asc
  imdbRating_desc
  _id_asc
  _id_desc
}
```

## Pagination

`neo4j-graphql-js` support pagination through the use of `first` and `offset` parameters. These parameters are added to the appropriate fields as part of the schema augmentation process.

## Filtering

The auto-generated `filter` argument is used to support complex field level filtering in queries.

See [the Complex GraphQL Filtering section](graphql-filtering.mdx) for details.

## Full-text Search

The auto-generated `search` argument is used to support using [full-text search](https://neo4j.com/docs/cypher-manual/current/administration/indexes-for-full-text-search/#administration-indexes-fulltext-search-introduction) indexes set using [searchSchema](https://grandstack.io/docs/neo4j-graphql-js-api#searchschemaoptionsnull) with [@search directive](https://grandstack.io/docs/graphql-schema-directives) fields.

In our example schema, no value is provided to the `index` argument of the `@search` directive on the `title` field of the `Movie` node type. So a default name of `MovieSearch` is used.

The below example would query the `MovieSearch` search index for the value `river` (case-insensitive) on the `title` property of `Movie` type nodes. Only matching nodes with a score at or above the `threshold` argument would be returned.

```graphql
query {
  Movie(search: { MovieSearch: "river", threshold: 97.5 }) {
    title
  }
}
```

When the `search` argument is used, the query selects from the results of calling the [db.index.fulltext.queryNodes](https://neo4j.com/docs/cypher-manual/current/administration/indexes-for-full-text-search/#administration-indexes-fulltext-search-query) procedure:

```js
CALL db.index.fulltext.queryNodes("MovieSearch", "river")
YIELD node AS movie, score  WHERE score >= 97.5
```

The remaining translation of the query is then applied to the yielded nodes. If a value for the `Float` type `threshold` argument is provided, only matching nodes with a resulting `score` at or above it will be returned.

The `search` argument is not yet available on relationship fields and using multiple named search index arguments at once is not supported.

## Type Extensions

The GraphQL [specification](https://spec.graphql.org/June2018/#sec-Type-Extensions) describes using the `extend` keyword to represent a type which has been extended from another type. The following subsections describe the available behaviors, such as extending an object type to represent additional fields. When using schema augmentation, type extensions are applied when building the fields and types used for the generated Query and Mutation API.

### Schema

The [schema](https://spec.graphql.org/June2018/#sec-Schema-Extension) type can be extended with operation types.

```graphql
schema {
  query: Query
}
extend schema {
  mutation: Mutation
}
```

### Scalars

[Scalar](https://spec.graphql.org/June2018/#ScalarTypeExtension) types can be extended with additional directives.

```graphql
scalar myScalar

extend scalar myScalar @myDirective
```

### Objects & Interfaces

[Object](https://spec.graphql.org/June2018/#ObjectTypeExtension) and [interface](https://spec.graphql.org/June2018/#InterfaceTypeExtension) types can be extended with additional fields and directives. Objects can also be extended to implement interfaces.

##### Fields

```graphql
type Movie {
  movieId: ID!
  title: String
  year: Int
  imdbRating: Float
}

extend type Movie {
  genres: [Genre] @relation(name: "IN_GENRE", direction: OUT)
  similar: [Movie]
    @cypher(
      statement: """
      MATCH (this)<-[:RATED]-(:User)-[:RATED]->(s:Movie)
      WITH s, COUNT(*) AS score
      RETURN s ORDER BY score DESC LIMIT {first}
      """
    )
}
```

##### Directives

```graphql
type Movie {
  movieId: ID!
}

extend type Movie @additionalLabels(labels: ["newMovieLabel"])
```

##### Operation types

```graphql
type Query {
  Movie: [Movie]
}

extend type Query {
  customMovie: Movie
}
```

##### Implementing interfaces

```graphql
interface Person {
  userId: ID!
  name: String
}

type Actor {
  userId: ID!
  name: String
}

extend type Actor implements Person
```

### Unions

A [union](https://spec.graphql.org/June2018/#sec-Union-Extensions) type can be extended with additional member types or directives.

```graphql
union MovieSearch = Movie | Genre | Book

extend union MovieSearch = Actor | OldCamera
```

### Enums

[Enum](https://spec.graphql.org/June2018/#EnumTypeExtension) types can be extended with additional values or directives.

```graphql
enum BookGenre {
  Mystery
  Science
}

extend enum BookGenre {
  Math
}
```

### Input Objects

[Input object](https://spec.graphql.org/June2018/#InputObjectTypeExtension) types can be extended with additional input fields or directives.

```graphql
input CustomMutationInput {
  title: String
}

extend input CustomMutationInput {
  year: Int
  imdbRating: Float
}
```

## Configuring Schema Augmentation

You may not want to generate Query and Mutation fields for all types included in your type definitions, or you may not want to generate a Mutation type at all. Both `augmentSchema` and `makeAugmentedSchema` can be passed an optional configuration object to specify which types should be included in queries and mutations.

### Disabling Auto-generated Queries and Mutations

By default, both Query and Mutation types are auto-generated from type definitions and will include fields for all types in the schema. An optional `config` object can be passed to disable generating either the Query or Mutation type.

Using `makeAugmentedSchema`, disable generating the Mutation type:

```js
import { makeAugmentedSchema } from "neo4j-graphql-js";

const schema = makeAugmentedSchema({
  typeDefs,
  config: {
    query: true, // default
    mutation: false
  }
}
```

Using `augmentSchema`, disable auto-generating mutations:

```js
import { augmentSchema } from 'neo4j-graphql-js';

const augmentedSchema = augmentSchema(schema, {
  query: true, //default
  mutation: false
});
```

### Excluding Types

To exclude specific types from being included in the generated Query and Mutation types, pass those type names in to the config object under `exclude`. For example:

```js
import { makeAugmentedSchema } from 'neo4j-graphql-js';

const schema = makeAugmentedSchema({
  typeDefs,
  config: {
    query: {
      exclude: ['MyCustomPayload']
    },
    mutation: {
      exclude: ['MyCustomPayload']
    }
  }
});
```

See the API Reference for [`augmentSchema`](neo4j-graphql-js-api.mdx#augmentschemaschema-graphqlschema) and [`makeAugmentedSchema`](neo4j-graphql-js-api.mdx#makeaugmentedschemaoptions-graphqlschema) for more information.

### Excluding relationships

To exclude specific relationships between types from being resolved using the generated neo4j resolver, use the `@neo4j_ignore` directive. This is useful when combining other data sources with your neo4j graph. Used alongside excluding types from augmentation, it allows data related to graph nodes to be blended with eth neo4j result. For example:

```graphql
type IMDBReview {
  rating: Int
  text: String
}

extend type Movie {
  imdbUrl: String
  imdbReviews: [IMDBReview] @neo4j_ignore
}
```

```js
const schema = makeAugmentedSchema({
    resolvers: {
        Movie: {
            imdbReviews: ({imdbURL}) => // fetch data from IMDB and return JSON result
        }
    }
    config: {query: {exclude: ['IMDBReview']}}
])
```

## Resources

- Blog post: [GraphQL API Configuration With neo4j-graphql.js](https://blog.grandstack.io/graphql-api-configuration-with-neo4j-graphql-js-bf7a1331c793) - Excluding Types From The Auto-Generated GraphQL Schema
