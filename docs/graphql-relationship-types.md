# GraphQL Relationship Types

## Defining relationships in SDL

GraphQL types can reference other types. When defining your schema, use the `@relation` GraphQL schema directive on the fields that reference other types. For example:

```graphql
type Movie {
  title: String
  year: Int
  genres: [Genre] @relation(name: "IN_GENRE", direction: OUT)
}

type Genre {
  name: String
  movies: [Movie] @relation(name: "IN_GENRE", direction: IN)
}
```

### Querying Relationship Fields

Relationship fields can be queried as object fields in GraphQL by including the fields in the selection set. For example, here we query genres connected to a movie node:

<div className={styles.graphiqlcontainer}>
  <GraphiQLSnippet
    endpoint="https://movies.grandstack.io"
    query={`{
  Movie(first: 1) {
    title
    genres {
      name
    }
  }
}`} />
</div>

## Relationships with properties

The above example (annotating a field with `@relation`) works for simple relationships without properties, but does not allow for modeling relationship properties. Imagine that we have users who can rate movies, and we want to store their rating and timestamp as a property on a relationship connecting the user and movie. We can represent this by promoting the relationship to a type and moving the `@relation` directive to annotate this new type:

```graphql
type Movie {
  title: String
  year: Int
  ratings: [Rated]
}

type User {
  userId: ID
  name: String
  rated: [Rated]
}

type Rated @relation(name: "RATED") {
  from: User
  to: Movie
  rating: Float
  created: DateTime
}
```

This approach of an optional relationship type allows for keeping the schema simple when we don't need relationship properties, but having the flexibility of handling relationship properties when we want to model them.

### Querying Relationship Types

When queries are generated (through [`augmentSchema`](neo4j-graphql-js-api.mdx#augmentschemaschema-graphqlschema) or [`makeAugmentedSchema`](neo4j-graphql-js-api.mdx#makeaugmentedschemaoptions-graphqlschema)) fields referencing a relationship type are replaced with a special payload type that contains the relationship properties and the type reference. For example:

```graphql
type _MovieRatings {
  created: _Neo4jDateTime
  rating: Float
  User: User
}
```

Here we query for a user and their movie ratings, selecting the `rating` and `created` fields from the relationship type, as well as the movie node connected to the relationship.

<div className={styles.graphiqlcontainer}>
  <GraphiQLSnippet
    endpoint="https://movies.grandstack.io"
    query={`{
  User(first: 1) {
    name
    rated {
      Movie {
        title
      }
      rating
      created {
        formatted
      }
    }
  }
}`} />
</div>

## Field names for related nodes

There are two valid ways to express which fields of a `@relation` type refer to its [source and target node](https://neo4j.com/docs/getting-started/current/graphdb-concepts/#graphdb-relationship-types) types. The `Rated` relationship type above defines `from` and `to` fields. Semantically specific names can be provided for the source and target node fields to the `from` and `to` arguments of the `@relation` type directive.

```graphql
type Rated @relation(name: "RATED", from: "user", to: "movie") {
  user: User
  movie: Movie
  rating: Float
  created: DateTime
}
```

## Default relationship name

If the `name` argument of the `@relation` type directive is not provided, then its default is generated during schema augmentation to be the conversion of the type name to Snake case.

```graphql
type UserRated
  @relation(from: "user", to: "movie") { # name: "USER_RATED"
  user: User
  movie: Movie
  rating: Float
  created: DateTime
}
```

## Relationship mutations

See the [generated mutations](graphql-schema-generation-augmentation.mdx#generated-mutations) section for information on the mutations generated for relationship types.
