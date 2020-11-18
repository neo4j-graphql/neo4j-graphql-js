import test from 'ava';
import { gql } from 'apollo-server';
import { makeAugmentedSchema } from '../../../src/index';
import { testSchema } from '../../helpers/experimental/testSchema';
import { compareSchema } from '../../helpers/augmentSchemaTestHelpers';

test.cb('Test augmented schema', t => {
  const parseTypeDefs = gql`
    ${testSchema}
  `;
  const sourceSchema = makeAugmentedSchema({
    typeDefs: parseTypeDefs,
    config: {
      auth: true,
      experimental: true
    }
  });

  const expectedSchema = /* GraphQL */ `
    type _AddUserLikedPayload
      @relation(name: "RATING", from: "User", to: "Movie") {
      "Field for the User node this RATING [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from."
      from: User
      "Field for the Movie node this RATING [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to."
      to: Movie
    }

    type _RemoveUserLikedPayload
      @relation(name: "RATING", from: "User", to: "Movie") {
      "Field for the User node this RATING [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from."
      from: User
      "Field for the Movie node this RATING [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to."
      to: Movie
    }

    type _MergeUserLikedPayload
      @relation(name: "RATING", from: "User", to: "Movie") {
      "Field for the User node this RATING [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from."
      from: User
      "Field for the Movie node this RATING [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to."
      to: Movie
    }

    type _UserRated @relation(name: "RATING", from: "User", to: "Movie") {
      rating: Int!
      "Generated field for querying the Neo4j [system id](https://neo4j.com/docs/cypher-manual/current/functions/scalar/#functions-id) of this relationship."
      _id: String
      "Field for the Movie node this RATING [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to."
      movie: Movie
    }

    input _UserRatingFilter {
      AND: [_UserRatingFilter!]
      OR: [_UserRatingFilter!]
      rating: Int
      rating_not: Int
      rating_in: [Int!]
      rating_not_in: [Int!]
      rating_lt: Int
      rating_lte: Int
      rating_gt: Int
      rating_gte: Int
      movie: _MovieFilter
    }

    enum _RatingOrdering {
      rating_asc
      rating_desc
      _id_asc
      _id_desc
    }

    input _RatingInput {
      rating: Int!
    }

    type _AddUserRatedPayload
      @relation(name: "RATING", from: "User", to: "Movie") {
      "Field for the User node this RATING [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from."
      user: User
      "Field for the Movie node this RATING [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to."
      movie: Movie
      rating: Int!
      "Generated field for querying the Neo4j [system id](https://neo4j.com/docs/cypher-manual/current/functions/scalar/#functions-id) of this relationship."
      _id: String
    }

    type _RemoveUserRatedPayload
      @relation(name: "RATING", from: "User", to: "Movie") {
      "Field for the User node this RATING [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from."
      user: User
      "Field for the Movie node this RATING [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to."
      movie: Movie
    }

    type _UpdateUserRatedPayload
      @relation(name: "RATING", from: "User", to: "Movie") {
      "Field for the User node this RATING [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from."
      user: User
      "Field for the Movie node this RATING [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to."
      movie: Movie
      rating: Int!
      "Generated field for querying the Neo4j [system id](https://neo4j.com/docs/cypher-manual/current/functions/scalar/#functions-id) of this relationship."
      _id: String
    }

    type _MergeUserRatedPayload
      @relation(name: "RATING", from: "User", to: "Movie") {
      "Field for the User node this RATING [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from."
      user: User
      "Field for the Movie node this RATING [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to."
      movie: Movie
      rating: Int!
      "Generated field for querying the Neo4j [system id](https://neo4j.com/docs/cypher-manual/current/functions/scalar/#functions-id) of this relationship."
      _id: String
    }

    input _UserCreate {
      idField: ID
      name: String
      names: [String]
      birthday: _Neo4jDateTimeInput
      birthdays: [_Neo4jDateTimeInput]
      uniqueString: String!
      indexedInt: Int
      extensionString: String!
    }

    input _UserUpdate {
      idField: ID
      name: String
      names: [String]
      birthday: _Neo4jDateTimeInput
      birthdays: [_Neo4jDateTimeInput]
      uniqueString: String
      indexedInt: Int
      extensionString: String
    }

    input _UserWhere {
      AND: [_UserWhere!]
      OR: [_UserWhere!]
      idField: ID
      idField_not: ID
      idField_in: [ID!]
      idField_not_in: [ID!]
      idField_contains: ID
      idField_not_contains: ID
      idField_starts_with: ID
      idField_not_starts_with: ID
      idField_ends_with: ID
      idField_not_ends_with: ID
      uniqueString: String
      uniqueString_not: String
      uniqueString_in: [String!]
      uniqueString_not_in: [String!]
      uniqueString_contains: String
      uniqueString_not_contains: String
      uniqueString_starts_with: String
      uniqueString_not_starts_with: String
      uniqueString_ends_with: String
      uniqueString_not_ends_with: String
      indexedInt: Int
      indexedInt_not: Int
      indexedInt_in: [Int!]
      indexedInt_not_in: [Int!]
      indexedInt_lt: Int
      indexedInt_lte: Int
      indexedInt_gt: Int
      indexedInt_gte: Int
    }

    input _UserKeys {
      idField: ID
      uniqueString: String
      indexedInt: Int
    }

    enum _UserOrdering {
      idField_asc
      idField_desc
      name_asc
      name_desc
      birthday_asc
      birthday_desc
      uniqueString_asc
      uniqueString_desc
      indexedInt_asc
      indexedInt_desc
      extensionString_asc
      extensionString_desc
      _id_asc
      _id_desc
    }

    input _UserFilter {
      AND: [_UserFilter!]
      OR: [_UserFilter!]
      idField: ID
      idField_not: ID
      idField_in: [ID!]
      idField_not_in: [ID!]
      idField_contains: ID
      idField_not_contains: ID
      idField_starts_with: ID
      idField_not_starts_with: ID
      idField_ends_with: ID
      idField_not_ends_with: ID
      name: String
      name_not: String
      name_in: [String!]
      name_not_in: [String!]
      name_contains: String
      name_not_contains: String
      name_starts_with: String
      name_not_starts_with: String
      name_ends_with: String
      name_not_ends_with: String
      names: [String!]
      names_not: [String!]
      names_contains: [String!]
      names_not_contains: [String!]
      names_starts_with: [String!]
      names_not_starts_with: [String!]
      names_ends_with: [String!]
      names_not_ends_with: [String!]
      birthday: _Neo4jDateTimeInput
      birthday_not: _Neo4jDateTimeInput
      birthday_in: [_Neo4jDateTimeInput!]
      birthday_not_in: [_Neo4jDateTimeInput!]
      birthday_lt: _Neo4jDateTimeInput
      birthday_lte: _Neo4jDateTimeInput
      birthday_gt: _Neo4jDateTimeInput
      birthday_gte: _Neo4jDateTimeInput
      birthdays: [_Neo4jDateTimeInput!]
      birthdays_not: [_Neo4jDateTimeInput!]
      birthdays_lt: [_Neo4jDateTimeInput!]
      birthdays_lte: [_Neo4jDateTimeInput!]
      birthdays_gt: [_Neo4jDateTimeInput!]
      birthdays_gte: [_Neo4jDateTimeInput!]
      uniqueString: String
      uniqueString_not: String
      uniqueString_in: [String!]
      uniqueString_not_in: [String!]
      uniqueString_contains: String
      uniqueString_not_contains: String
      uniqueString_starts_with: String
      uniqueString_not_starts_with: String
      uniqueString_ends_with: String
      uniqueString_not_ends_with: String
      indexedInt: Int
      indexedInt_not: Int
      indexedInt_in: [Int!]
      indexedInt_not_in: [Int!]
      indexedInt_lt: Int
      indexedInt_lte: Int
      indexedInt_gt: Int
      indexedInt_gte: Int
      liked: _MovieFilter
      liked_not: _MovieFilter
      liked_in: [_MovieFilter!]
      liked_not_in: [_MovieFilter!]
      liked_some: _MovieFilter
      liked_none: _MovieFilter
      liked_single: _MovieFilter
      liked_every: _MovieFilter
      rated: _UserRatingFilter
      rated_not: _UserRatingFilter
      rated_in: [_UserRatingFilter!]
      rated_not_in: [_UserRatingFilter!]
      rated_some: _UserRatingFilter
      rated_none: _UserRatingFilter
      rated_single: _UserRatingFilter
      rated_every: _UserRatingFilter
      extensionString: String
      extensionString_not: String
      extensionString_in: [String!]
      extensionString_not_in: [String!]
      extensionString_contains: String
      extensionString_not_contains: String
      extensionString_starts_with: String
      extensionString_not_starts_with: String
      extensionString_ends_with: String
      extensionString_not_ends_with: String
    }

    type User {
      idField: ID! @id
      name: String
      names: [String]
      birthday: _Neo4jDateTime
      birthdays: [_Neo4jDateTime]
      uniqueString: String! @unique
      indexedInt: Int @index
      liked(
        first: Int
        offset: Int
        orderBy: [_MovieOrdering]
        filter: _MovieFilter
      ): [Movie!]! @relation(name: "RATING", direction: OUT)
      rated(
        first: Int
        offset: Int
        orderBy: [_RatingOrdering]
        filter: _UserRatingFilter
      ): [_UserRated]
      "Generated field for querying the Neo4j [system id](https://neo4j.com/docs/cypher-manual/current/functions/scalar/#functions-id) of this node."
      _id: String
    }

    type Rating @relation(from: "user", to: "movie") {
      user: User
      rating: Int!
      movie: Movie
    }

    type _AddMovieLikedByPayload
      @relation(name: "RATING", from: "User", to: "Movie") {
      "Field for the User node this RATING [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from."
      from: User
      "Field for the Movie node this RATING [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to."
      to: Movie
    }

    type _RemoveMovieLikedByPayload
      @relation(name: "RATING", from: "User", to: "Movie") {
      "Field for the User node this RATING [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from."
      from: User
      "Field for the Movie node this RATING [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to."
      to: Movie
    }

    type _MergeMovieLikedByPayload
      @relation(name: "RATING", from: "User", to: "Movie") {
      "Field for the User node this RATING [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from."
      from: User
      "Field for the Movie node this RATING [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to."
      to: Movie
    }

    type _MovieRatedBy @relation(name: "RATING", from: "User", to: "Movie") {
      rating: Int!
      "Generated field for querying the Neo4j [system id](https://neo4j.com/docs/cypher-manual/current/functions/scalar/#functions-id) of this relationship."
      _id: String
      "Field for the User node this RATING [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from."
      user: User
    }

    input _MovieRatingFilter {
      AND: [_MovieRatingFilter!]
      OR: [_MovieRatingFilter!]
      rating: Int
      rating_not: Int
      rating_in: [Int!]
      rating_not_in: [Int!]
      rating_lt: Int
      rating_lte: Int
      rating_gt: Int
      rating_gte: Int
      user: _UserFilter
    }

    type _AddMovieRatedByPayload
      @relation(name: "RATING", from: "User", to: "Movie") {
      "Field for the User node this RATING [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from."
      user: User
      "Field for the Movie node this RATING [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to."
      movie: Movie
      rating: Int!
      "Generated field for querying the Neo4j [system id](https://neo4j.com/docs/cypher-manual/current/functions/scalar/#functions-id) of this relationship."
      _id: String
    }

    type _RemoveMovieRatedByPayload
      @relation(name: "RATING", from: "User", to: "Movie") {
      "Field for the User node this RATING [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from."
      user: User
      "Field for the Movie node this RATING [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to."
      movie: Movie
    }

    type _UpdateMovieRatedByPayload
      @relation(name: "RATING", from: "User", to: "Movie") {
      "Field for the User node this RATING [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from."
      user: User
      "Field for the Movie node this RATING [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to."
      movie: Movie
      rating: Int!
      "Generated field for querying the Neo4j [system id](https://neo4j.com/docs/cypher-manual/current/functions/scalar/#functions-id) of this relationship."
      _id: String
    }

    type _MergeMovieRatedByPayload
      @relation(name: "RATING", from: "User", to: "Movie") {
      "Field for the User node this RATING [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from."
      user: User
      "Field for the Movie node this RATING [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to."
      movie: Movie
      rating: Int!
      "Generated field for querying the Neo4j [system id](https://neo4j.com/docs/cypher-manual/current/functions/scalar/#functions-id) of this relationship."
      _id: String
    }

    input _MovieCreate {
      id: ID
      title: String!
      genre: MovieGenre
    }

    input _MovieUpdate {
      id: ID
      title: String
      genre: MovieGenre
    }

    input _MovieWhere {
      AND: [_MovieWhere!]
      OR: [_MovieWhere!]
      id: ID
      id_not: ID
      id_in: [ID!]
      id_not_in: [ID!]
      id_contains: ID
      id_not_contains: ID
      id_starts_with: ID
      id_not_starts_with: ID
      id_ends_with: ID
      id_not_ends_with: ID
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
      genre: MovieGenre
      genre_not: MovieGenre
      genre_in: [MovieGenre!]
      genre_not_in: [MovieGenre!]
    }

    input _MovieKeys {
      id: ID
      title: String
      genre: MovieGenre
    }

    enum _MovieOrdering {
      id_asc
      id_desc
      title_asc
      title_desc
      genre_asc
      genre_desc
      _id_asc
      _id_desc
    }

    input _MovieFilter {
      AND: [_MovieFilter!]
      OR: [_MovieFilter!]
      id: ID
      id_not: ID
      id_in: [ID!]
      id_not_in: [ID!]
      id_contains: ID
      id_not_contains: ID
      id_starts_with: ID
      id_not_starts_with: ID
      id_ends_with: ID
      id_not_ends_with: ID
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
      genre: MovieGenre
      genre_not: MovieGenre
      genre_in: [MovieGenre!]
      genre_not_in: [MovieGenre!]
      likedBy: _UserFilter
      likedBy_not: _UserFilter
      likedBy_in: [_UserFilter!]
      likedBy_not_in: [_UserFilter!]
      likedBy_some: _UserFilter
      likedBy_none: _UserFilter
      likedBy_single: _UserFilter
      likedBy_every: _UserFilter
      ratedBy: _MovieRatingFilter
      ratedBy_not: _MovieRatingFilter
      ratedBy_in: [_MovieRatingFilter!]
      ratedBy_not_in: [_MovieRatingFilter!]
      ratedBy_some: _MovieRatingFilter
      ratedBy_none: _MovieRatingFilter
      ratedBy_single: _MovieRatingFilter
      ratedBy_every: _MovieRatingFilter
    }

    type Movie {
      id: ID! @id
      title: String! @unique
      genre: MovieGenre @index
      likedBy(
        first: Int
        offset: Int
        orderBy: [_UserOrdering]
        filter: _UserFilter
      ): [User!]! @relation(name: "RATING", direction: IN)
      ratedBy(
        first: Int
        offset: Int
        orderBy: [_RatingOrdering]
        filter: _MovieRatingFilter
      ): [_MovieRatedBy]
      "Generated field for querying the Neo4j [system id](https://neo4j.com/docs/cypher-manual/current/functions/scalar/#functions-id) of this node."
      _id: String
    }

    enum MovieGenre {
      Action
      Mystery
      Scary
    }

    enum Role {
      reader
      user
      admin
    }

    "Generated Time input object for Neo4j [Temporal field arguments](https://grandstack.io/docs/graphql-temporal-types-datetime/#temporal-query-arguments)."
    input _Neo4jTimeInput {
      hour: Int
      minute: Int
      second: Int
      millisecond: Int
      microsecond: Int
      nanosecond: Int
      timezone: String
      "Creates a Neo4j [Temporal](https://grandstack.io/docs/graphql-temporal-types-datetime/#using-temporal-fields-in-mutations) Time value using a [String format](https://neo4j.com/docs/cypher-manual/current/functions/temporal/time/#functions-time-create-string)."
      formatted: String
    }

    "Generated Time object type for Neo4j [Temporal fields](https://grandstack.io/docs/graphql-temporal-types-datetime#using-temporal-fields-in-queries)."
    type _Neo4jTime {
      hour: Int
      minute: Int
      second: Int
      millisecond: Int
      microsecond: Int
      nanosecond: Int
      timezone: String
      "Outputs a Neo4j [Temporal](https://grandstack.io/docs/graphql-temporal-types-datetime#using-temporal-fields-in-queries) Time value as a String type by using the [toString](https://neo4j.com/docs/cypher-manual/current/functions/string/#functions-tostring) Cypher function."
      formatted: String
    }

    "Generated Date input object for Neo4j [Temporal field arguments](https://grandstack.io/docs/graphql-temporal-types-datetime/#temporal-query-arguments)."
    input _Neo4jDateInput {
      year: Int
      month: Int
      day: Int
      "Creates a Neo4j [Temporal](https://grandstack.io/docs/graphql-temporal-types-datetime/#using-temporal-fields-in-mutations) Date value using a [String format](https://neo4j.com/docs/cypher-manual/current/functions/temporal/date/#functions-date-create-string)."
      formatted: String
    }

    "Generated Date object type for Neo4j [Temporal fields](https://grandstack.io/docs/graphql-temporal-types-datetime#using-temporal-fields-in-queries)."
    type _Neo4jDate {
      year: Int
      month: Int
      day: Int
      "Outputs a Neo4j [Temporal](https://grandstack.io/docs/graphql-temporal-types-datetime#using-temporal-fields-in-queries) Date value as a String type by using the [toString](https://neo4j.com/docs/cypher-manual/current/functions/string/#functions-tostring) Cypher function."
      formatted: String
    }

    "Generated DateTime input object for Neo4j [Temporal field arguments](https://grandstack.io/docs/graphql-temporal-types-datetime/#temporal-query-arguments)."
    input _Neo4jDateTimeInput {
      year: Int
      month: Int
      day: Int
      hour: Int
      minute: Int
      second: Int
      millisecond: Int
      microsecond: Int
      nanosecond: Int
      timezone: String
      "Creates a Neo4j [Temporal](https://grandstack.io/docs/graphql-temporal-types-datetime/#using-temporal-fields-in-mutations) DateTime value using a [String format](https://neo4j.com/docs/cypher-manual/current/functions/temporal/datetime/#functions-datetime-create-string)."
      formatted: String
    }

    "Generated DateTime object type for Neo4j [Temporal fields](https://grandstack.io/docs/graphql-temporal-types-datetime#using-temporal-fields-in-queries)."
    type _Neo4jDateTime {
      year: Int
      month: Int
      day: Int
      hour: Int
      minute: Int
      second: Int
      millisecond: Int
      microsecond: Int
      nanosecond: Int
      timezone: String
      "Outputs a Neo4j [Temporal](https://grandstack.io/docs/graphql-temporal-types-datetime#using-temporal-fields-in-queries) DateTime value as a String type by using the [toString](https://neo4j.com/docs/cypher-manual/current/functions/string/#functions-tostring) Cypher function."
      formatted: String
    }

    "Generated LocalTime input object for Neo4j [Temporal field arguments](https://grandstack.io/docs/graphql-temporal-types-datetime/#temporal-query-arguments)."
    input _Neo4jLocalTimeInput {
      hour: Int
      minute: Int
      second: Int
      millisecond: Int
      microsecond: Int
      nanosecond: Int
      "Creates a Neo4j [Temporal](https://grandstack.io/docs/graphql-temporal-types-datetime/#using-temporal-fields-in-mutations) LocalTime value using a [String format](https://neo4j.com/docs/cypher-manual/current/functions/temporal/localtime/#functions-localtime-create-string)."
      formatted: String
    }

    "Generated LocalTime object type for Neo4j [Temporal fields](https://grandstack.io/docs/graphql-temporal-types-datetime#using-temporal-fields-in-queries)."
    type _Neo4jLocalTime {
      hour: Int
      minute: Int
      second: Int
      millisecond: Int
      microsecond: Int
      nanosecond: Int
      "Outputs a Neo4j [Temporal](https://grandstack.io/docs/graphql-temporal-types-datetime#using-temporal-fields-in-queries) LocalTime value as a String type by using the [toString](https://neo4j.com/docs/cypher-manual/current/functions/string/#functions-tostring) Cypher function."
      formatted: String
    }

    "Generated LocalDateTime input object for Neo4j [Temporal field arguments](https://grandstack.io/docs/graphql-temporal-types-datetime/#temporal-query-arguments)."
    input _Neo4jLocalDateTimeInput {
      year: Int
      month: Int
      day: Int
      hour: Int
      minute: Int
      second: Int
      millisecond: Int
      microsecond: Int
      nanosecond: Int
      "Creates a Neo4j [Temporal](https://grandstack.io/docs/graphql-temporal-types-datetime/#using-temporal-fields-in-mutations) LocalDateTime value using a [String format](https://neo4j.com/docs/cypher-manual/current/functions/temporal/localdatetime/#functions-localdatetime-create-string)."
      formatted: String
    }

    "Generated LocalDateTime object type for Neo4j [Temporal fields](https://grandstack.io/docs/graphql-temporal-types-datetime#using-temporal-fields-in-queries)."
    type _Neo4jLocalDateTime {
      year: Int
      month: Int
      day: Int
      hour: Int
      minute: Int
      second: Int
      millisecond: Int
      microsecond: Int
      nanosecond: Int
      "Outputs a Neo4j [Temporal](https://grandstack.io/docs/graphql-temporal-types-datetime#using-temporal-fields-in-queries) LocalDateTime value as a String type by using the [toString](https://neo4j.com/docs/cypher-manual/current/functions/string/#functions-tostring) Cypher function."
      formatted: String
    }

    input _Neo4jPointDistanceFilter {
      point: _Neo4jPointInput!
      distance: Float!
    }

    "Generated Point input object for Neo4j [Spatial field arguments](https://grandstack.io/docs/graphql-spatial-types/#point-query-arguments)."
    input _Neo4jPointInput {
      x: Float
      y: Float
      z: Float
      longitude: Float
      latitude: Float
      height: Float
      crs: String
      srid: Int
    }

    "Generated Point object type for Neo4j [Spatial fields](https://grandstack.io/docs/graphql-spatial-types#using-point-in-queries)."
    type _Neo4jPoint {
      x: Float
      y: Float
      z: Float
      longitude: Float
      latitude: Float
      height: Float
      crs: String
      srid: Int
    }

    enum _RelationDirections {
      IN
      OUT
    }

    directive @cypher(
      statement: String
    ) on FIELD_DEFINITION | INPUT_FIELD_DEFINITION

    directive @relation(
      name: String
      direction: _RelationDirections
      from: String
      to: String
    ) on FIELD_DEFINITION | OBJECT

    directive @additionalLabels(labels: [String]) on OBJECT

    directive @MutationMeta(
      relationship: String
      from: String
      to: String
    ) on FIELD_DEFINITION

    directive @neo4j_ignore on FIELD_DEFINITION

    directive @id on FIELD_DEFINITION

    directive @unique on FIELD_DEFINITION

    directive @index on FIELD_DEFINITION

    directive @isAuthenticated on OBJECT | FIELD_DEFINITION

    directive @hasRole(roles: [Role]) on OBJECT | FIELD_DEFINITION

    directive @hasScope(scopes: [String]) on OBJECT | FIELD_DEFINITION

    extend type User {
      extensionString: String!
    }

    type Query {
      "[Generated query](https://grandstack.io/docs/graphql-schema-generation-augmentation#generated-queries) for User type nodes."
      User(
        idField: ID
        name: String
        names: [String]
        birthday: _Neo4jDateTimeInput
        birthdays: [_Neo4jDateTimeInput]
        uniqueString: String
        indexedInt: Int
        extensionString: String
        _id: String
        first: Int
        offset: Int
        orderBy: [_UserOrdering]
        filter: _UserFilter
      ): [User] @hasScope(scopes: ["User: Read", "read:user"])
      "[Generated query](https://grandstack.io/docs/graphql-schema-generation-augmentation#generated-queries) for Movie type nodes."
      Movie(
        id: ID
        title: String
        genre: MovieGenre
        _id: String
        first: Int
        offset: Int
        orderBy: [_MovieOrdering]
        filter: _MovieFilter
      ): [Movie] @hasScope(scopes: ["Movie: Read", "read:movie"])
    }

    type Mutation {
      "[Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##add--remove-relationship) for [creating](https://neo4j.com/docs/cypher-manual/4.1/clauses/create/#create-relationships) the RATING relationship."
      AddUserLiked(from: _UserWhere!, to: _MovieWhere!): _AddUserLikedPayload
        @MutationMeta(relationship: "RATING", from: "User", to: "Movie")
        @hasScope(
          scopes: [
            "User: Create"
            "create:user"
            "Movie: Create"
            "create:movie"
          ]
        )
      "[Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##add--remove-relationship) for [deleting](https://neo4j.com/docs/cypher-manual/4.1/clauses/delete/#delete-delete-relationships-only) the RATING relationship."
      RemoveUserLiked(
        from: _UserWhere!
        to: _MovieWhere!
      ): _RemoveUserLikedPayload
        @MutationMeta(relationship: "RATING", from: "User", to: "Movie")
        @hasScope(
          scopes: [
            "User: Delete"
            "delete:user"
            "Movie: Delete"
            "delete:movie"
          ]
        )
      "[Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##merge-relationship) for [merging](https://neo4j.com/docs/cypher-manual/4.1/clauses/merge/#query-merge-relationships) the RATING relationship."
      MergeUserLiked(
        from: _UserWhere!
        to: _MovieWhere!
      ): _MergeUserLikedPayload
        @MutationMeta(relationship: "RATING", from: "User", to: "Movie")
        @hasScope(
          scopes: ["User: Merge", "merge:user", "Movie: Merge", "merge:movie"]
        )
      "[Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##add--remove-relationship) for [creating](https://neo4j.com/docs/cypher-manual/4.1/clauses/create/#create-relationships) the RATING relationship."
      AddUserRated(
        user: _UserWhere!
        movie: _MovieWhere!
        data: _RatingInput!
      ): _AddUserRatedPayload
        @MutationMeta(relationship: "RATING", from: "User", to: "Movie")
        @hasScope(
          scopes: [
            "User: Create"
            "create:user"
            "Movie: Create"
            "create:movie"
          ]
        )
      "[Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##add--remove-relationship) for [deleting](https://neo4j.com/docs/cypher-manual/4.1/clauses/delete/#delete-delete-relationships-only) the RATING relationship."
      RemoveUserRated(
        user: _UserWhere!
        movie: _MovieWhere!
      ): _RemoveUserRatedPayload
        @MutationMeta(relationship: "RATING", from: "User", to: "Movie")
        @hasScope(
          scopes: [
            "User: Delete"
            "delete:user"
            "Movie: Delete"
            "delete:movie"
          ]
        )
      "[Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##update-relationship) for [updating](https://neo4j.com/docs/cypher-manual/4.1/clauses/set/#set-update-a-property) the RATING relationship."
      UpdateUserRated(
        user: _UserWhere!
        movie: _MovieWhere!
        data: _RatingInput!
      ): _UpdateUserRatedPayload
        @MutationMeta(relationship: "RATING", from: "User", to: "Movie")
        @hasScope(
          scopes: [
            "User: Update"
            "update:user"
            "Movie: Update"
            "update:movie"
          ]
        )
      "[Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##merge-relationship) for [merging](https://neo4j.com/docs/cypher-manual/4.1/clauses/merge/#query-merge-relationships) the RATING relationship."
      MergeUserRated(
        user: _UserWhere!
        movie: _MovieWhere!
        data: _RatingInput!
      ): _MergeUserRatedPayload
        @MutationMeta(relationship: "RATING", from: "User", to: "Movie")
        @hasScope(
          scopes: ["User: Merge", "merge:user", "Movie: Merge", "merge:movie"]
        )
      "[Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/#create) for [creating](https://neo4j.com/docs/cypher-manual/4.1/clauses/create/#create-nodes) a User node."
      CreateUser(data: _UserCreate!): User
        @hasScope(scopes: ["User: Create", "create:user"])
      "[Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/#update) for [updating](https://neo4j.com/docs/cypher-manual/4.1/clauses/set/#set-update-a-property) a User node."
      UpdateUser(where: _UserWhere!, data: _UserUpdate!): User
        @hasScope(scopes: ["User: Update", "update:user"])
      "[Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/#delete) for [deleting](https://neo4j.com/docs/cypher-manual/4.1/clauses/delete/#delete-delete-single-node) a User node."
      DeleteUser(where: _UserWhere!): User
        @hasScope(scopes: ["User: Delete", "delete:user"])
      "[Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/#merge) for [merging](https://neo4j.com/docs/cypher-manual/4.1/clauses/merge/#query-merge-node-derived) a User node."
      MergeUser(where: _UserKeys!, data: _UserCreate!): User
        @hasScope(scopes: ["User: Merge", "merge:user"])
      "[Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##add--remove-relationship) for [creating](https://neo4j.com/docs/cypher-manual/4.1/clauses/create/#create-relationships) the RATING relationship."
      AddMovieLikedBy(
        from: _UserWhere!
        to: _MovieWhere!
      ): _AddMovieLikedByPayload
        @MutationMeta(relationship: "RATING", from: "User", to: "Movie")
        @hasScope(
          scopes: [
            "User: Create"
            "create:user"
            "Movie: Create"
            "create:movie"
          ]
        )
      "[Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##add--remove-relationship) for [deleting](https://neo4j.com/docs/cypher-manual/4.1/clauses/delete/#delete-delete-relationships-only) the RATING relationship."
      RemoveMovieLikedBy(
        from: _UserWhere!
        to: _MovieWhere!
      ): _RemoveMovieLikedByPayload
        @MutationMeta(relationship: "RATING", from: "User", to: "Movie")
        @hasScope(
          scopes: [
            "User: Delete"
            "delete:user"
            "Movie: Delete"
            "delete:movie"
          ]
        )
      "[Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##merge-relationship) for [merging](https://neo4j.com/docs/cypher-manual/4.1/clauses/merge/#query-merge-relationships) the RATING relationship."
      MergeMovieLikedBy(
        from: _UserWhere!
        to: _MovieWhere!
      ): _MergeMovieLikedByPayload
        @MutationMeta(relationship: "RATING", from: "User", to: "Movie")
        @hasScope(
          scopes: ["User: Merge", "merge:user", "Movie: Merge", "merge:movie"]
        )
      "[Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##add--remove-relationship) for [creating](https://neo4j.com/docs/cypher-manual/4.1/clauses/create/#create-relationships) the RATING relationship."
      AddMovieRatedBy(
        user: _UserWhere!
        movie: _MovieWhere!
        data: _RatingInput!
      ): _AddMovieRatedByPayload
        @MutationMeta(relationship: "RATING", from: "User", to: "Movie")
        @hasScope(
          scopes: [
            "User: Create"
            "create:user"
            "Movie: Create"
            "create:movie"
          ]
        )
      "[Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##add--remove-relationship) for [deleting](https://neo4j.com/docs/cypher-manual/4.1/clauses/delete/#delete-delete-relationships-only) the RATING relationship."
      RemoveMovieRatedBy(
        user: _UserWhere!
        movie: _MovieWhere!
      ): _RemoveMovieRatedByPayload
        @MutationMeta(relationship: "RATING", from: "User", to: "Movie")
        @hasScope(
          scopes: [
            "User: Delete"
            "delete:user"
            "Movie: Delete"
            "delete:movie"
          ]
        )
      "[Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##update-relationship) for [updating](https://neo4j.com/docs/cypher-manual/4.1/clauses/set/#set-update-a-property) the RATING relationship."
      UpdateMovieRatedBy(
        user: _UserWhere!
        movie: _MovieWhere!
        data: _RatingInput!
      ): _UpdateMovieRatedByPayload
        @MutationMeta(relationship: "RATING", from: "User", to: "Movie")
        @hasScope(
          scopes: [
            "User: Update"
            "update:user"
            "Movie: Update"
            "update:movie"
          ]
        )
      "[Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##merge-relationship) for [merging](https://neo4j.com/docs/cypher-manual/4.1/clauses/merge/#query-merge-relationships) the RATING relationship."
      MergeMovieRatedBy(
        user: _UserWhere!
        movie: _MovieWhere!
        data: _RatingInput!
      ): _MergeMovieRatedByPayload
        @MutationMeta(relationship: "RATING", from: "User", to: "Movie")
        @hasScope(
          scopes: ["User: Merge", "merge:user", "Movie: Merge", "merge:movie"]
        )
      "[Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/#create) for [creating](https://neo4j.com/docs/cypher-manual/4.1/clauses/create/#create-nodes) a Movie node."
      CreateMovie(data: _MovieCreate!): Movie
        @hasScope(scopes: ["Movie: Create", "create:movie"])
      "[Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/#update) for [updating](https://neo4j.com/docs/cypher-manual/4.1/clauses/set/#set-update-a-property) a Movie node."
      UpdateMovie(where: _MovieWhere!, data: _MovieUpdate!): Movie
        @hasScope(scopes: ["Movie: Update", "update:movie"])
      "[Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/#delete) for [deleting](https://neo4j.com/docs/cypher-manual/4.1/clauses/delete/#delete-delete-single-node) a Movie node."
      DeleteMovie(where: _MovieWhere!): Movie
        @hasScope(scopes: ["Movie: Delete", "delete:movie"])
      "[Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/#merge) for [merging](https://neo4j.com/docs/cypher-manual/4.1/clauses/merge/#query-merge-node-derived) a Movie node."
      MergeMovie(where: _MovieKeys!, data: _MovieCreate!): Movie
        @hasScope(scopes: ["Movie: Merge", "merge:movie"])
    }

    schema {
      query: Query
      mutation: Mutation
    }
  `;

  compareSchema({
    test: t,
    sourceSchema,
    expectedSchema
  });
  t.end();
});
