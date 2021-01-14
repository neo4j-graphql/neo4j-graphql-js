import test from 'ava';
import { makeAugmentedSchema } from '../../src/index';
import { testSchema } from '../helpers/testSchema';
import { gql } from 'apollo-server';
import { buildSchema } from 'graphql';
import { diff } from '@graphql-inspector/core';

test.cb('Test augmented schema', t => {
  const parseTypeDefs = gql`
    ${testSchema}
  `;

  const sourceSchema = makeAugmentedSchema({
    typeDefs: parseTypeDefs,
    config: {
      query: {
        exclude: ['NodeTypeMutationTest']
      },
      auth: true
    }
  });

  const expectedTypeDefs = /* GraphQL */ `
    schema {
      query: QueryA
      subscription: SubscriptionC
      mutation: Mutation
    }
    type _AddMovieExtensionNodePayload
      @relation(name: "IN_GENRE", from: "Movie", to: "Genre") {
      """
      Field for the Movie node this IN_GENRE [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      from: Movie
      """
      Field for the Genre node this IN_GENRE [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      to: Genre
    }
    type _RemoveMovieExtensionNodePayload
      @relation(name: "IN_GENRE", from: "Movie", to: "Genre") {
      """
      Field for the Movie node this IN_GENRE [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      from: Movie
      """
      Field for the Genre node this IN_GENRE [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      to: Genre
    }
    type _MergeMovieExtensionNodePayload
      @relation(name: "IN_GENRE", from: "Movie", to: "Genre") {
      """
      Field for the Movie node this IN_GENRE [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      from: Movie
      """
      Field for the Genre node this IN_GENRE [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      to: Genre
    }
    type _AddMovieGenresPayload
      @relation(name: "IN_GENRE", from: "Movie", to: "Genre") {
      """
      Field for the Movie node this IN_GENRE [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      from: Movie
      """
      Field for the Genre node this IN_GENRE [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      to: Genre
    }
    type _RemoveMovieGenresPayload
      @relation(name: "IN_GENRE", from: "Movie", to: "Genre") {
      """
      Field for the Movie node this IN_GENRE [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      from: Movie
      """
      Field for the Genre node this IN_GENRE [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      to: Genre
    }
    type _MergeMovieGenresPayload
      @relation(name: "IN_GENRE", from: "Movie", to: "Genre") {
      """
      Field for the Movie node this IN_GENRE [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      from: Movie
      """
      Field for the Genre node this IN_GENRE [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      to: Genre
    }
    type _AddMovieActorsPayload
      @relation(name: "ACTED_IN", from: "Actor", to: "Movie") {
      """
      Field for the Actor node this ACTED_IN [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      from: Actor
      """
      Field for the Movie node this ACTED_IN [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      to: Movie
    }
    type _RemoveMovieActorsPayload
      @relation(name: "ACTED_IN", from: "Actor", to: "Movie") {
      """
      Field for the Actor node this ACTED_IN [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      from: Actor
      """
      Field for the Movie node this ACTED_IN [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      to: Movie
    }
    type _MergeMovieActorsPayload
      @relation(name: "ACTED_IN", from: "Actor", to: "Movie") {
      """
      Field for the Actor node this ACTED_IN [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      from: Actor
      """
      Field for the Movie node this ACTED_IN [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      to: Movie
    }
    type _AddMovieFilmedInPayload
      @relation(name: "FILMED_IN", from: "Movie", to: "State") {
      """
      Field for the Movie node this FILMED_IN [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      from: Movie
      """
      Field for the State node this FILMED_IN [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      to: State
    }
    type _RemoveMovieFilmedInPayload
      @relation(name: "FILMED_IN", from: "Movie", to: "State") {
      """
      Field for the Movie node this FILMED_IN [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      from: Movie
      """
      Field for the State node this FILMED_IN [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      to: State
    }
    type _MergeMovieFilmedInPayload
      @relation(name: "FILMED_IN", from: "Movie", to: "State") {
      """
      Field for the Movie node this FILMED_IN [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      from: Movie
      """
      Field for the State node this FILMED_IN [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      to: State
    }
    type _MovieRatings @relation(name: "RATED", from: "User", to: "Movie") {
      currentUserId(strArg: String): String
        @cypher(
          statement: "RETURN $cypherParams.currentUserId AS cypherParamsUserId"
        )
      rating: Int
      ratings: [Int]
      time: _Neo4jTime
      date: _Neo4jDate
      datetime: _Neo4jDateTime
      localtime: _Neo4jLocalTime
      localdatetime: _Neo4jLocalDateTime
      datetimes: [_Neo4jDateTime]
      location: _Neo4jPoint
      """
      Generated field for querying the Neo4j [system id](https://neo4j.com/docs/cypher-manual/current/functions/scalar/#functions-id) of this relationship.
      """
      _id: String
      """
      Field for the User node this RATED [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      User: User
    }
    input _MovieRatedFilter {
      AND: [_MovieRatedFilter!]
      OR: [_MovieRatedFilter!]
      rating: Int
      rating_not: Int
      rating_in: [Int!]
      rating_not_in: [Int!]
      rating_lt: Int
      rating_lte: Int
      rating_gt: Int
      rating_gte: Int
      ratings: [Int!]
      ratings_not: [Int!]
      ratings_lt: [Int!]
      ratings_lte: [Int!]
      ratings_gt: [Int!]
      ratings_gte: [Int!]
      time: _Neo4jTimeInput
      time_not: _Neo4jTimeInput
      time_in: [_Neo4jTimeInput!]
      time_not_in: [_Neo4jTimeInput!]
      time_lt: _Neo4jTimeInput
      time_lte: _Neo4jTimeInput
      time_gt: _Neo4jTimeInput
      time_gte: _Neo4jTimeInput
      date: _Neo4jDateInput
      date_not: _Neo4jDateInput
      date_in: [_Neo4jDateInput!]
      date_not_in: [_Neo4jDateInput!]
      date_lt: _Neo4jDateInput
      date_lte: _Neo4jDateInput
      date_gt: _Neo4jDateInput
      date_gte: _Neo4jDateInput
      datetime: _Neo4jDateTimeInput
      datetime_not: _Neo4jDateTimeInput
      datetime_in: [_Neo4jDateTimeInput!]
      datetime_not_in: [_Neo4jDateTimeInput!]
      datetime_lt: _Neo4jDateTimeInput
      datetime_lte: _Neo4jDateTimeInput
      datetime_gt: _Neo4jDateTimeInput
      datetime_gte: _Neo4jDateTimeInput
      localtime: _Neo4jLocalTimeInput
      localtime_not: _Neo4jLocalTimeInput
      localtime_in: [_Neo4jLocalTimeInput!]
      localtime_not_in: [_Neo4jLocalTimeInput!]
      localtime_lt: _Neo4jLocalTimeInput
      localtime_lte: _Neo4jLocalTimeInput
      localtime_gt: _Neo4jLocalTimeInput
      localtime_gte: _Neo4jLocalTimeInput
      localdatetime: _Neo4jLocalDateTimeInput
      localdatetime_not: _Neo4jLocalDateTimeInput
      localdatetime_in: [_Neo4jLocalDateTimeInput!]
      localdatetime_not_in: [_Neo4jLocalDateTimeInput!]
      localdatetime_lt: _Neo4jLocalDateTimeInput
      localdatetime_lte: _Neo4jLocalDateTimeInput
      localdatetime_gt: _Neo4jLocalDateTimeInput
      localdatetime_gte: _Neo4jLocalDateTimeInput
      datetimes: [_Neo4jDateTimeInput!]
      datetimes_not: [_Neo4jDateTimeInput!]
      datetimes_lt: [_Neo4jDateTimeInput!]
      datetimes_lte: [_Neo4jDateTimeInput!]
      datetimes_gt: [_Neo4jDateTimeInput!]
      datetimes_gte: [_Neo4jDateTimeInput!]
      location: _Neo4jPointInput
      location_not: _Neo4jPointInput
      location_distance: _Neo4jPointDistanceFilter
      location_distance_lt: _Neo4jPointDistanceFilter
      location_distance_lte: _Neo4jPointDistanceFilter
      location_distance_gt: _Neo4jPointDistanceFilter
      location_distance_gte: _Neo4jPointDistanceFilter
      User: _UserFilter
    }
    enum _RatedOrdering {
      currentUserId_asc
      currentUserId_desc
      rating_asc
      rating_desc
      time_asc
      time_desc
      date_asc
      date_desc
      datetime_asc
      datetime_desc
      localtime_asc
      localtime_desc
      localdatetime_asc
      localdatetime_desc
      _id_asc
      _id_desc
    }
    input _RatedInput {
      rating: Int
      ratings: [Int]
      time: _Neo4jTimeInput
      date: _Neo4jDateInput
      datetime: _Neo4jDateTimeInput
      localtime: _Neo4jLocalTimeInput
      localdatetime: _Neo4jLocalDateTimeInput
      datetimes: [_Neo4jDateTimeInput]
      location: _Neo4jPointInput
    }
    type _AddMovieRatingsPayload
      @relation(name: "RATED", from: "User", to: "Movie") {
      """
      Field for the User node this RATED [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      from: User
      """
      Field for the Movie node this RATED [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      to: Movie
      currentUserId: String
        @cypher(
          statement: "RETURN $cypherParams.currentUserId AS cypherParamsUserId"
        )
      rating: Int
      ratings: [Int]
      time: _Neo4jTime
      date: _Neo4jDate
      datetime: _Neo4jDateTime
      localtime: _Neo4jLocalTime
      localdatetime: _Neo4jLocalDateTime
      datetimes: [_Neo4jDateTime]
      location: _Neo4jPoint
      """
      Generated field for querying the Neo4j [system id](https://neo4j.com/docs/cypher-manual/current/functions/scalar/#functions-id) of this relationship.
      """
      _id: String
    }
    type _RemoveMovieRatingsPayload
      @relation(name: "RATED", from: "User", to: "Movie") {
      """
      Field for the User node this RATED [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      from: User
      """
      Field for the Movie node this RATED [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      to: Movie
    }
    type _UpdateMovieRatingsPayload
      @relation(name: "RATED", from: "User", to: "Movie") {
      """
      Field for the User node this RATED [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      from: User
      """
      Field for the Movie node this RATED [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      to: Movie
      currentUserId: String
        @cypher(
          statement: "RETURN $cypherParams.currentUserId AS cypherParamsUserId"
        )
      rating: Int
      ratings: [Int]
      time: _Neo4jTime
      date: _Neo4jDate
      datetime: _Neo4jDateTime
      localtime: _Neo4jLocalTime
      localdatetime: _Neo4jLocalDateTime
      datetimes: [_Neo4jDateTime]
      location: _Neo4jPoint
      """
      Generated field for querying the Neo4j [system id](https://neo4j.com/docs/cypher-manual/current/functions/scalar/#functions-id) of this relationship.
      """
      _id: String
    }
    type _MergeMovieRatingsPayload
      @relation(name: "RATED", from: "User", to: "Movie") {
      """
      Field for the User node this RATED [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      from: User
      """
      Field for the Movie node this RATED [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      to: Movie
      currentUserId: String
        @cypher(
          statement: "RETURN $cypherParams.currentUserId AS cypherParamsUserId"
        )
      rating: Int
      ratings: [Int]
      time: _Neo4jTime
      date: _Neo4jDate
      datetime: _Neo4jDateTime
      localtime: _Neo4jLocalTime
      localdatetime: _Neo4jLocalDateTime
      datetimes: [_Neo4jDateTime]
      location: _Neo4jPoint
      """
      Generated field for querying the Neo4j [system id](https://neo4j.com/docs/cypher-manual/current/functions/scalar/#functions-id) of this relationship.
      """
      _id: String
    }
    type _MovieRatingsNoProps
      @relation(name: "RATED_NO_PROPS", from: "User", to: "Movie") {
      """
      Generated field for querying the Neo4j [system id](https://neo4j.com/docs/cypher-manual/current/functions/scalar/#functions-id) of this relationship.
      """
      _id: String
      """
      Field for the User node this RATED_NO_PROPS [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      User: User
    }
    input _MovieRatedNoPropsFilter {
      AND: [_MovieRatedNoPropsFilter!]
      OR: [_MovieRatedNoPropsFilter!]
      User: _UserFilter
    }
    enum _RatedNoPropsOrdering {
      _id_asc
      _id_desc
    }
    type _AddMovieRatingsNoPropsPayload
      @relation(name: "RATED_NO_PROPS", from: "User", to: "Movie") {
      """
      Field for the User node this RATED_NO_PROPS [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      from: User
      """
      Field for the Movie node this RATED_NO_PROPS [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      to: Movie
      """
      Generated field for querying the Neo4j [system id](https://neo4j.com/docs/cypher-manual/current/functions/scalar/#functions-id) of this relationship.
      """
      _id: String
    }
    type _RemoveMovieRatingsNoPropsPayload
      @relation(name: "RATED_NO_PROPS", from: "User", to: "Movie") {
      """
      Field for the User node this RATED_NO_PROPS [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      from: User
      """
      Field for the Movie node this RATED_NO_PROPS [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      to: Movie
    }
    type _MergeMovieRatingsNoPropsPayload
      @relation(name: "RATED_NO_PROPS", from: "User", to: "Movie") {
      """
      Field for the User node this RATED_NO_PROPS [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      from: User
      """
      Field for the Movie node this RATED_NO_PROPS [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      to: Movie
      """
      Generated field for querying the Neo4j [system id](https://neo4j.com/docs/cypher-manual/current/functions/scalar/#functions-id) of this relationship.
      """
      _id: String
    }
    type _MovieRatingsCustomFrom
      @relation(name: "RATED_CUSTOM_FROM", from: "User", to: "Movie") {
      currentUserId(strArg: String): String
        @cypher(
          statement: "RETURN $cypherParams.currentUserId AS cypherParamsUserId"
        )
      rating: Int
      ratings: [Int]
      time: _Neo4jTime
      date: _Neo4jDate
      datetime: _Neo4jDateTime
      localtime: _Neo4jLocalTime
      localdatetime: _Neo4jLocalDateTime
      datetimes: [_Neo4jDateTime]
      location: _Neo4jPoint
      """
      Generated field for querying the Neo4j [system id](https://neo4j.com/docs/cypher-manual/current/functions/scalar/#functions-id) of this relationship.
      """
      _id: String
      """
      Field for the User node this RATED_CUSTOM_FROM [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      ratedBy: User
    }
    input _MovieRatedCustomFromFilter {
      AND: [_MovieRatedCustomFromFilter!]
      OR: [_MovieRatedCustomFromFilter!]
      rating: Int
      rating_not: Int
      rating_in: [Int!]
      rating_not_in: [Int!]
      rating_lt: Int
      rating_lte: Int
      rating_gt: Int
      rating_gte: Int
      ratings: [Int!]
      ratings_not: [Int!]
      ratings_lt: [Int!]
      ratings_lte: [Int!]
      ratings_gt: [Int!]
      ratings_gte: [Int!]
      time: _Neo4jTimeInput
      time_not: _Neo4jTimeInput
      time_in: [_Neo4jTimeInput!]
      time_not_in: [_Neo4jTimeInput!]
      time_lt: _Neo4jTimeInput
      time_lte: _Neo4jTimeInput
      time_gt: _Neo4jTimeInput
      time_gte: _Neo4jTimeInput
      date: _Neo4jDateInput
      date_not: _Neo4jDateInput
      date_in: [_Neo4jDateInput!]
      date_not_in: [_Neo4jDateInput!]
      date_lt: _Neo4jDateInput
      date_lte: _Neo4jDateInput
      date_gt: _Neo4jDateInput
      date_gte: _Neo4jDateInput
      datetime: _Neo4jDateTimeInput
      datetime_not: _Neo4jDateTimeInput
      datetime_in: [_Neo4jDateTimeInput!]
      datetime_not_in: [_Neo4jDateTimeInput!]
      datetime_lt: _Neo4jDateTimeInput
      datetime_lte: _Neo4jDateTimeInput
      datetime_gt: _Neo4jDateTimeInput
      datetime_gte: _Neo4jDateTimeInput
      localtime: _Neo4jLocalTimeInput
      localtime_not: _Neo4jLocalTimeInput
      localtime_in: [_Neo4jLocalTimeInput!]
      localtime_not_in: [_Neo4jLocalTimeInput!]
      localtime_lt: _Neo4jLocalTimeInput
      localtime_lte: _Neo4jLocalTimeInput
      localtime_gt: _Neo4jLocalTimeInput
      localtime_gte: _Neo4jLocalTimeInput
      localdatetime: _Neo4jLocalDateTimeInput
      localdatetime_not: _Neo4jLocalDateTimeInput
      localdatetime_in: [_Neo4jLocalDateTimeInput!]
      localdatetime_not_in: [_Neo4jLocalDateTimeInput!]
      localdatetime_lt: _Neo4jLocalDateTimeInput
      localdatetime_lte: _Neo4jLocalDateTimeInput
      localdatetime_gt: _Neo4jLocalDateTimeInput
      localdatetime_gte: _Neo4jLocalDateTimeInput
      datetimes: [_Neo4jDateTimeInput!]
      datetimes_not: [_Neo4jDateTimeInput!]
      datetimes_lt: [_Neo4jDateTimeInput!]
      datetimes_lte: [_Neo4jDateTimeInput!]
      datetimes_gt: [_Neo4jDateTimeInput!]
      datetimes_gte: [_Neo4jDateTimeInput!]
      location: _Neo4jPointInput
      location_not: _Neo4jPointInput
      location_distance: _Neo4jPointDistanceFilter
      location_distance_lt: _Neo4jPointDistanceFilter
      location_distance_lte: _Neo4jPointDistanceFilter
      location_distance_gt: _Neo4jPointDistanceFilter
      location_distance_gte: _Neo4jPointDistanceFilter
      ratedBy: _UserFilter
    }
    enum _RatedCustomFromOrdering {
      currentUserId_asc
      currentUserId_desc
      rating_asc
      rating_desc
      time_asc
      time_desc
      date_asc
      date_desc
      datetime_asc
      datetime_desc
      localtime_asc
      localtime_desc
      localdatetime_asc
      localdatetime_desc
      _id_asc
      _id_desc
    }
    input _RatedCustomFromInput {
      rating: Int
      ratings: [Int]
      time: _Neo4jTimeInput
      date: _Neo4jDateInput
      datetime: _Neo4jDateTimeInput
      localtime: _Neo4jLocalTimeInput
      localdatetime: _Neo4jLocalDateTimeInput
      datetimes: [_Neo4jDateTimeInput]
      location: _Neo4jPointInput
    }
    type _AddMovieRatingsCustomFromPayload
      @relation(name: "RATED_CUSTOM_FROM", from: "User", to: "Movie") {
      """
      Field for the User node this RATED_CUSTOM_FROM [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      ratedBy: User
      """
      Field for the Movie node this RATED_CUSTOM_FROM [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      to: Movie
      currentUserId: String
        @cypher(
          statement: "RETURN $cypherParams.currentUserId AS cypherParamsUserId"
        )
      rating: Int
      ratings: [Int]
      time: _Neo4jTime
      date: _Neo4jDate
      datetime: _Neo4jDateTime
      localtime: _Neo4jLocalTime
      localdatetime: _Neo4jLocalDateTime
      datetimes: [_Neo4jDateTime]
      location: _Neo4jPoint
      """
      Generated field for querying the Neo4j [system id](https://neo4j.com/docs/cypher-manual/current/functions/scalar/#functions-id) of this relationship.
      """
      _id: String
    }
    type _RemoveMovieRatingsCustomFromPayload
      @relation(name: "RATED_CUSTOM_FROM", from: "User", to: "Movie") {
      """
      Field for the User node this RATED_CUSTOM_FROM [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      ratedBy: User
      """
      Field for the Movie node this RATED_CUSTOM_FROM [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      to: Movie
    }
    type _UpdateMovieRatingsCustomFromPayload
      @relation(name: "RATED_CUSTOM_FROM", from: "User", to: "Movie") {
      """
      Field for the User node this RATED_CUSTOM_FROM [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      ratedBy: User
      """
      Field for the Movie node this RATED_CUSTOM_FROM [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      to: Movie
      currentUserId: String
        @cypher(
          statement: "RETURN $cypherParams.currentUserId AS cypherParamsUserId"
        )
      rating: Int
      ratings: [Int]
      time: _Neo4jTime
      date: _Neo4jDate
      datetime: _Neo4jDateTime
      localtime: _Neo4jLocalTime
      localdatetime: _Neo4jLocalDateTime
      datetimes: [_Neo4jDateTime]
      location: _Neo4jPoint
      """
      Generated field for querying the Neo4j [system id](https://neo4j.com/docs/cypher-manual/current/functions/scalar/#functions-id) of this relationship.
      """
      _id: String
    }
    type _MergeMovieRatingsCustomFromPayload
      @relation(name: "RATED_CUSTOM_FROM", from: "User", to: "Movie") {
      """
      Field for the User node this RATED_CUSTOM_FROM [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      ratedBy: User
      """
      Field for the Movie node this RATED_CUSTOM_FROM [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      to: Movie
      currentUserId: String
        @cypher(
          statement: "RETURN $cypherParams.currentUserId AS cypherParamsUserId"
        )
      rating: Int
      ratings: [Int]
      time: _Neo4jTime
      date: _Neo4jDate
      datetime: _Neo4jDateTime
      localtime: _Neo4jLocalTime
      localdatetime: _Neo4jLocalDateTime
      datetimes: [_Neo4jDateTime]
      location: _Neo4jPoint
      """
      Generated field for querying the Neo4j [system id](https://neo4j.com/docs/cypher-manual/current/functions/scalar/#functions-id) of this relationship.
      """
      _id: String
    }
    type _MovieRatingsCustomTo
      @relation(name: "RATED_CUSTOM_TO", from: "User", to: "Movie") {
      currentUserId(strArg: String): String
        @cypher(
          statement: "RETURN $cypherParams.currentUserId AS cypherParamsUserId"
        )
      rating: Int
      ratings: [Int]
      time: _Neo4jTime
      date: _Neo4jDate
      datetime: _Neo4jDateTime
      localtime: _Neo4jLocalTime
      localdatetime: _Neo4jLocalDateTime
      datetimes: [_Neo4jDateTime]
      location: _Neo4jPoint
      """
      Generated field for querying the Neo4j [system id](https://neo4j.com/docs/cypher-manual/current/functions/scalar/#functions-id) of this relationship.
      """
      _id: String
      """
      Field for the User node this RATED_CUSTOM_TO [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      User: User
    }
    input _MovieRatedCustomToFilter {
      AND: [_MovieRatedCustomToFilter!]
      OR: [_MovieRatedCustomToFilter!]
      rating: Int
      rating_not: Int
      rating_in: [Int!]
      rating_not_in: [Int!]
      rating_lt: Int
      rating_lte: Int
      rating_gt: Int
      rating_gte: Int
      ratings: [Int!]
      ratings_not: [Int!]
      ratings_lt: [Int!]
      ratings_lte: [Int!]
      ratings_gt: [Int!]
      ratings_gte: [Int!]
      time: _Neo4jTimeInput
      time_not: _Neo4jTimeInput
      time_in: [_Neo4jTimeInput!]
      time_not_in: [_Neo4jTimeInput!]
      time_lt: _Neo4jTimeInput
      time_lte: _Neo4jTimeInput
      time_gt: _Neo4jTimeInput
      time_gte: _Neo4jTimeInput
      date: _Neo4jDateInput
      date_not: _Neo4jDateInput
      date_in: [_Neo4jDateInput!]
      date_not_in: [_Neo4jDateInput!]
      date_lt: _Neo4jDateInput
      date_lte: _Neo4jDateInput
      date_gt: _Neo4jDateInput
      date_gte: _Neo4jDateInput
      datetime: _Neo4jDateTimeInput
      datetime_not: _Neo4jDateTimeInput
      datetime_in: [_Neo4jDateTimeInput!]
      datetime_not_in: [_Neo4jDateTimeInput!]
      datetime_lt: _Neo4jDateTimeInput
      datetime_lte: _Neo4jDateTimeInput
      datetime_gt: _Neo4jDateTimeInput
      datetime_gte: _Neo4jDateTimeInput
      localtime: _Neo4jLocalTimeInput
      localtime_not: _Neo4jLocalTimeInput
      localtime_in: [_Neo4jLocalTimeInput!]
      localtime_not_in: [_Neo4jLocalTimeInput!]
      localtime_lt: _Neo4jLocalTimeInput
      localtime_lte: _Neo4jLocalTimeInput
      localtime_gt: _Neo4jLocalTimeInput
      localtime_gte: _Neo4jLocalTimeInput
      localdatetime: _Neo4jLocalDateTimeInput
      localdatetime_not: _Neo4jLocalDateTimeInput
      localdatetime_in: [_Neo4jLocalDateTimeInput!]
      localdatetime_not_in: [_Neo4jLocalDateTimeInput!]
      localdatetime_lt: _Neo4jLocalDateTimeInput
      localdatetime_lte: _Neo4jLocalDateTimeInput
      localdatetime_gt: _Neo4jLocalDateTimeInput
      localdatetime_gte: _Neo4jLocalDateTimeInput
      datetimes: [_Neo4jDateTimeInput!]
      datetimes_not: [_Neo4jDateTimeInput!]
      datetimes_lt: [_Neo4jDateTimeInput!]
      datetimes_lte: [_Neo4jDateTimeInput!]
      datetimes_gt: [_Neo4jDateTimeInput!]
      datetimes_gte: [_Neo4jDateTimeInput!]
      location: _Neo4jPointInput
      location_not: _Neo4jPointInput
      location_distance: _Neo4jPointDistanceFilter
      location_distance_lt: _Neo4jPointDistanceFilter
      location_distance_lte: _Neo4jPointDistanceFilter
      location_distance_gt: _Neo4jPointDistanceFilter
      location_distance_gte: _Neo4jPointDistanceFilter
      User: _UserFilter
    }
    enum _RatedCustomToOrdering {
      currentUserId_asc
      currentUserId_desc
      rating_asc
      rating_desc
      time_asc
      time_desc
      date_asc
      date_desc
      datetime_asc
      datetime_desc
      localtime_asc
      localtime_desc
      localdatetime_asc
      localdatetime_desc
      _id_asc
      _id_desc
    }
    input _RatedCustomToInput {
      rating: Int
      ratings: [Int]
      time: _Neo4jTimeInput
      date: _Neo4jDateInput
      datetime: _Neo4jDateTimeInput
      localtime: _Neo4jLocalTimeInput
      localdatetime: _Neo4jLocalDateTimeInput
      datetimes: [_Neo4jDateTimeInput]
      location: _Neo4jPointInput
    }
    type _AddMovieRatingsCustomToPayload
      @relation(name: "RATED_CUSTOM_TO", from: "User", to: "Movie") {
      """
      Field for the User node this RATED_CUSTOM_TO [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      from: User
      """
      Field for the Movie node this RATED_CUSTOM_TO [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      movie: Movie
      currentUserId: String
        @cypher(
          statement: "RETURN $cypherParams.currentUserId AS cypherParamsUserId"
        )
      rating: Int
      ratings: [Int]
      time: _Neo4jTime
      date: _Neo4jDate
      datetime: _Neo4jDateTime
      localtime: _Neo4jLocalTime
      localdatetime: _Neo4jLocalDateTime
      datetimes: [_Neo4jDateTime]
      location: _Neo4jPoint
      """
      Generated field for querying the Neo4j [system id](https://neo4j.com/docs/cypher-manual/current/functions/scalar/#functions-id) of this relationship.
      """
      _id: String
    }
    type _RemoveMovieRatingsCustomToPayload
      @relation(name: "RATED_CUSTOM_TO", from: "User", to: "Movie") {
      """
      Field for the User node this RATED_CUSTOM_TO [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      from: User
      """
      Field for the Movie node this RATED_CUSTOM_TO [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      movie: Movie
    }
    type _UpdateMovieRatingsCustomToPayload
      @relation(name: "RATED_CUSTOM_TO", from: "User", to: "Movie") {
      """
      Field for the User node this RATED_CUSTOM_TO [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      from: User
      """
      Field for the Movie node this RATED_CUSTOM_TO [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      movie: Movie
      currentUserId: String
        @cypher(
          statement: "RETURN $cypherParams.currentUserId AS cypherParamsUserId"
        )
      rating: Int
      ratings: [Int]
      time: _Neo4jTime
      date: _Neo4jDate
      datetime: _Neo4jDateTime
      localtime: _Neo4jLocalTime
      localdatetime: _Neo4jLocalDateTime
      datetimes: [_Neo4jDateTime]
      location: _Neo4jPoint
      """
      Generated field for querying the Neo4j [system id](https://neo4j.com/docs/cypher-manual/current/functions/scalar/#functions-id) of this relationship.
      """
      _id: String
    }
    type _MergeMovieRatingsCustomToPayload
      @relation(name: "RATED_CUSTOM_TO", from: "User", to: "Movie") {
      """
      Field for the User node this RATED_CUSTOM_TO [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      from: User
      """
      Field for the Movie node this RATED_CUSTOM_TO [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      movie: Movie
      currentUserId: String
        @cypher(
          statement: "RETURN $cypherParams.currentUserId AS cypherParamsUserId"
        )
      rating: Int
      ratings: [Int]
      time: _Neo4jTime
      date: _Neo4jDate
      datetime: _Neo4jDateTime
      localtime: _Neo4jLocalTime
      localdatetime: _Neo4jLocalDateTime
      datetimes: [_Neo4jDateTime]
      location: _Neo4jPoint
      """
      Generated field for querying the Neo4j [system id](https://neo4j.com/docs/cypher-manual/current/functions/scalar/#functions-id) of this relationship.
      """
      _id: String
    }
    type _MovieRatingsCustomFromTo
      @relation(name: "RATED_CUSTOM_FROM_TO", from: "User", to: "Movie") {
      from: String
      currentUserId(strArg: String): String
        @cypher(
          statement: "RETURN $cypherParams.currentUserId AS cypherParamsUserId"
        )
      rating: Int
      ratings: [Int]
      time: _Neo4jTime
      date: _Neo4jDate
      datetime: _Neo4jDateTime
      localtime: _Neo4jLocalTime
      localdatetime: _Neo4jLocalDateTime
      datetimes: [_Neo4jDateTime]
      location: _Neo4jPoint
      """
      Generated field for querying the Neo4j [system id](https://neo4j.com/docs/cypher-manual/current/functions/scalar/#functions-id) of this relationship.
      """
      _id: String
      to: Int
      """
      Field for the User node this RATED_CUSTOM_FROM_TO [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      ratedBy: User
    }
    input _MovieRatedCustomFromToFilter {
      AND: [_MovieRatedCustomFromToFilter!]
      OR: [_MovieRatedCustomFromToFilter!]
      from: String
      from_not: String
      from_in: [String!]
      from_not_in: [String!]
      from_regexp: String
      from_contains: String
      from_not_contains: String
      from_starts_with: String
      from_not_starts_with: String
      from_ends_with: String
      from_not_ends_with: String
      rating: Int
      rating_not: Int
      rating_in: [Int!]
      rating_not_in: [Int!]
      rating_lt: Int
      rating_lte: Int
      rating_gt: Int
      rating_gte: Int
      ratings: [Int!]
      ratings_not: [Int!]
      ratings_lt: [Int!]
      ratings_lte: [Int!]
      ratings_gt: [Int!]
      ratings_gte: [Int!]
      time: _Neo4jTimeInput
      time_not: _Neo4jTimeInput
      time_in: [_Neo4jTimeInput!]
      time_not_in: [_Neo4jTimeInput!]
      time_lt: _Neo4jTimeInput
      time_lte: _Neo4jTimeInput
      time_gt: _Neo4jTimeInput
      time_gte: _Neo4jTimeInput
      date: _Neo4jDateInput
      date_not: _Neo4jDateInput
      date_in: [_Neo4jDateInput!]
      date_not_in: [_Neo4jDateInput!]
      date_lt: _Neo4jDateInput
      date_lte: _Neo4jDateInput
      date_gt: _Neo4jDateInput
      date_gte: _Neo4jDateInput
      datetime: _Neo4jDateTimeInput
      datetime_not: _Neo4jDateTimeInput
      datetime_in: [_Neo4jDateTimeInput!]
      datetime_not_in: [_Neo4jDateTimeInput!]
      datetime_lt: _Neo4jDateTimeInput
      datetime_lte: _Neo4jDateTimeInput
      datetime_gt: _Neo4jDateTimeInput
      datetime_gte: _Neo4jDateTimeInput
      localtime: _Neo4jLocalTimeInput
      localtime_not: _Neo4jLocalTimeInput
      localtime_in: [_Neo4jLocalTimeInput!]
      localtime_not_in: [_Neo4jLocalTimeInput!]
      localtime_lt: _Neo4jLocalTimeInput
      localtime_lte: _Neo4jLocalTimeInput
      localtime_gt: _Neo4jLocalTimeInput
      localtime_gte: _Neo4jLocalTimeInput
      localdatetime: _Neo4jLocalDateTimeInput
      localdatetime_not: _Neo4jLocalDateTimeInput
      localdatetime_in: [_Neo4jLocalDateTimeInput!]
      localdatetime_not_in: [_Neo4jLocalDateTimeInput!]
      localdatetime_lt: _Neo4jLocalDateTimeInput
      localdatetime_lte: _Neo4jLocalDateTimeInput
      localdatetime_gt: _Neo4jLocalDateTimeInput
      localdatetime_gte: _Neo4jLocalDateTimeInput
      datetimes: [_Neo4jDateTimeInput!]
      datetimes_not: [_Neo4jDateTimeInput!]
      datetimes_lt: [_Neo4jDateTimeInput!]
      datetimes_lte: [_Neo4jDateTimeInput!]
      datetimes_gt: [_Neo4jDateTimeInput!]
      datetimes_gte: [_Neo4jDateTimeInput!]
      location: _Neo4jPointInput
      location_not: _Neo4jPointInput
      location_distance: _Neo4jPointDistanceFilter
      location_distance_lt: _Neo4jPointDistanceFilter
      location_distance_lte: _Neo4jPointDistanceFilter
      location_distance_gt: _Neo4jPointDistanceFilter
      location_distance_gte: _Neo4jPointDistanceFilter
      to: Int
      to_not: Int
      to_in: [Int!]
      to_not_in: [Int!]
      to_lt: Int
      to_lte: Int
      to_gt: Int
      to_gte: Int
      ratedBy: _UserFilter
    }
    enum _RatedCustomFromToOrdering {
      from_asc
      from_desc
      currentUserId_asc
      currentUserId_desc
      rating_asc
      rating_desc
      time_asc
      time_desc
      date_asc
      date_desc
      datetime_asc
      datetime_desc
      localtime_asc
      localtime_desc
      localdatetime_asc
      localdatetime_desc
      _id_asc
      _id_desc
      to_asc
      to_desc
    }
    input _RatedCustomFromToInput {
      from: String
      rating: Int
      ratings: [Int]
      time: _Neo4jTimeInput
      date: _Neo4jDateInput
      datetime: _Neo4jDateTimeInput
      localtime: _Neo4jLocalTimeInput
      localdatetime: _Neo4jLocalDateTimeInput
      datetimes: [_Neo4jDateTimeInput]
      location: _Neo4jPointInput
      to: Int
    }
    type _AddMovieRatingsCustomFromToPayload
      @relation(name: "RATED_CUSTOM_FROM_TO", from: "User", to: "Movie") {
      """
      Field for the User node this RATED_CUSTOM_FROM_TO [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      ratedBy: User
      """
      Field for the Movie node this RATED_CUSTOM_FROM_TO [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      movie: Movie
      from: String
      currentUserId: String
        @cypher(
          statement: "RETURN $cypherParams.currentUserId AS cypherParamsUserId"
        )
      rating: Int
      ratings: [Int]
      time: _Neo4jTime
      date: _Neo4jDate
      datetime: _Neo4jDateTime
      localtime: _Neo4jLocalTime
      localdatetime: _Neo4jLocalDateTime
      datetimes: [_Neo4jDateTime]
      location: _Neo4jPoint
      """
      Generated field for querying the Neo4j [system id](https://neo4j.com/docs/cypher-manual/current/functions/scalar/#functions-id) of this relationship.
      """
      _id: String
      to: Int
    }
    type _RemoveMovieRatingsCustomFromToPayload
      @relation(name: "RATED_CUSTOM_FROM_TO", from: "User", to: "Movie") {
      """
      Field for the User node this RATED_CUSTOM_FROM_TO [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      ratedBy: User
      """
      Field for the Movie node this RATED_CUSTOM_FROM_TO [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      movie: Movie
    }
    type _UpdateMovieRatingsCustomFromToPayload
      @relation(name: "RATED_CUSTOM_FROM_TO", from: "User", to: "Movie") {
      """
      Field for the User node this RATED_CUSTOM_FROM_TO [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      ratedBy: User
      """
      Field for the Movie node this RATED_CUSTOM_FROM_TO [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      movie: Movie
      from: String
      currentUserId: String
        @cypher(
          statement: "RETURN $cypherParams.currentUserId AS cypherParamsUserId"
        )
      rating: Int
      ratings: [Int]
      time: _Neo4jTime
      date: _Neo4jDate
      datetime: _Neo4jDateTime
      localtime: _Neo4jLocalTime
      localdatetime: _Neo4jLocalDateTime
      datetimes: [_Neo4jDateTime]
      location: _Neo4jPoint
      """
      Generated field for querying the Neo4j [system id](https://neo4j.com/docs/cypher-manual/current/functions/scalar/#functions-id) of this relationship.
      """
      _id: String
      to: Int
    }
    type _MergeMovieRatingsCustomFromToPayload
      @relation(name: "RATED_CUSTOM_FROM_TO", from: "User", to: "Movie") {
      """
      Field for the User node this RATED_CUSTOM_FROM_TO [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      ratedBy: User
      """
      Field for the Movie node this RATED_CUSTOM_FROM_TO [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      movie: Movie
      from: String
      currentUserId: String
        @cypher(
          statement: "RETURN $cypherParams.currentUserId AS cypherParamsUserId"
        )
      rating: Int
      ratings: [Int]
      time: _Neo4jTime
      date: _Neo4jDate
      datetime: _Neo4jDateTime
      localtime: _Neo4jLocalTime
      localdatetime: _Neo4jLocalDateTime
      datetimes: [_Neo4jDateTime]
      location: _Neo4jPoint
      """
      Generated field for querying the Neo4j [system id](https://neo4j.com/docs/cypher-manual/current/functions/scalar/#functions-id) of this relationship.
      """
      _id: String
      to: Int
    }
    input _MovieInput {
      movieId: ID!
    }
    enum _MovieOrdering {
      _id_asc
      _id_desc
      movieId_asc
      movieId_desc
      title_asc
      title_desc
      someprefix_title_with_underscores_asc
      someprefix_title_with_underscores_desc
      year_asc
      year_desc
      released_asc
      released_desc
      plot_asc
      plot_desc
      poster_asc
      poster_desc
      imdbRating_asc
      imdbRating_desc
      degree_asc
      degree_desc
      avgStars_asc
      avgStars_desc
      scaleRating_asc
      scaleRating_desc
      scaleRatingFloat_asc
      scaleRatingFloat_desc
      currentUserId_asc
      currentUserId_desc
      extensionScalar_asc
      extensionScalar_desc
    }
    input _MovieFilter {
      AND: [_MovieFilter!]
      OR: [_MovieFilter!]
      movieId: ID
      movieId_not: ID
      movieId_in: [ID!]
      movieId_not_in: [ID!]
      movieId_regexp: ID
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
      title_regexp: String
      title_contains: String
      title_not_contains: String
      title_starts_with: String
      title_not_starts_with: String
      title_ends_with: String
      title_not_ends_with: String
      someprefix_title_with_underscores: String
      someprefix_title_with_underscores_not: String
      someprefix_title_with_underscores_in: [String!]
      someprefix_title_with_underscores_not_in: [String!]
      someprefix_title_with_underscores_regexp: String
      someprefix_title_with_underscores_contains: String
      someprefix_title_with_underscores_not_contains: String
      someprefix_title_with_underscores_starts_with: String
      someprefix_title_with_underscores_not_starts_with: String
      someprefix_title_with_underscores_ends_with: String
      someprefix_title_with_underscores_not_ends_with: String
      year: Int
      year_not: Int
      year_in: [Int!]
      year_not_in: [Int!]
      year_lt: Int
      year_lte: Int
      year_gt: Int
      year_gte: Int
      released: _Neo4jDateTimeInput
      released_not: _Neo4jDateTimeInput
      released_in: [_Neo4jDateTimeInput!]
      released_not_in: [_Neo4jDateTimeInput!]
      released_lt: _Neo4jDateTimeInput
      released_lte: _Neo4jDateTimeInput
      released_gt: _Neo4jDateTimeInput
      released_gte: _Neo4jDateTimeInput
      plot: String
      plot_not: String
      plot_in: [String!]
      plot_not_in: [String!]
      plot_regexp: String
      plot_contains: String
      plot_not_contains: String
      plot_starts_with: String
      plot_not_starts_with: String
      plot_ends_with: String
      plot_not_ends_with: String
      poster: String
      poster_not: String
      poster_in: [String!]
      poster_not_in: [String!]
      poster_regexp: String
      poster_contains: String
      poster_not_contains: String
      poster_starts_with: String
      poster_not_starts_with: String
      poster_ends_with: String
      poster_not_ends_with: String
      imdbRating: Float
      imdbRating_not: Float
      imdbRating_in: [Float!]
      imdbRating_not_in: [Float!]
      imdbRating_lt: Float
      imdbRating_lte: Float
      imdbRating_gt: Float
      imdbRating_gte: Float
      genres: _GenreFilter
      genres_not: _GenreFilter
      genres_in: [_GenreFilter!]
      genres_not_in: [_GenreFilter!]
      genres_some: _GenreFilter
      genres_none: _GenreFilter
      genres_single: _GenreFilter
      genres_every: _GenreFilter
      actors: _ActorFilter
      actors_not: _ActorFilter
      actors_in: [_ActorFilter!]
      actors_not_in: [_ActorFilter!]
      actors_some: _ActorFilter
      actors_none: _ActorFilter
      actors_single: _ActorFilter
      actors_every: _ActorFilter
      avgStars: Float
      avgStars_not: Float
      avgStars_in: [Float!]
      avgStars_not_in: [Float!]
      avgStars_lt: Float
      avgStars_lte: Float
      avgStars_gt: Float
      avgStars_gte: Float
      filmedIn: _StateFilter
      filmedIn_not: _StateFilter
      filmedIn_in: [_StateFilter!]
      filmedIn_not_in: [_StateFilter!]
      location: _Neo4jPointInput
      location_not: _Neo4jPointInput
      location_distance: _Neo4jPointDistanceFilter
      location_distance_lt: _Neo4jPointDistanceFilter
      location_distance_lte: _Neo4jPointDistanceFilter
      location_distance_gt: _Neo4jPointDistanceFilter
      location_distance_gte: _Neo4jPointDistanceFilter
      locations: [_Neo4jPointInput!]
      locations_not: [_Neo4jPointInput!]
      locations_distance: [_Neo4jPointDistanceFilter!]
      locations_distance_lt: [_Neo4jPointDistanceFilter!]
      locations_distance_lte: [_Neo4jPointDistanceFilter!]
      locations_distance_gt: [_Neo4jPointDistanceFilter!]
      locations_distance_gte: [_Neo4jPointDistanceFilter!]
      ratings: _MovieRatedFilter
      ratings_not: _MovieRatedFilter
      ratings_in: [_MovieRatedFilter!]
      ratings_not_in: [_MovieRatedFilter!]
      ratings_some: _MovieRatedFilter
      ratings_none: _MovieRatedFilter
      ratings_single: _MovieRatedFilter
      ratings_every: _MovieRatedFilter
      ratingsNoProps: _MovieRatedNoPropsFilter
      ratingsNoProps_not: _MovieRatedNoPropsFilter
      ratingsNoProps_in: [_MovieRatedNoPropsFilter!]
      ratingsNoProps_not_in: [_MovieRatedNoPropsFilter!]
      ratingsNoProps_some: _MovieRatedNoPropsFilter
      ratingsNoProps_none: _MovieRatedNoPropsFilter
      ratingsNoProps_single: _MovieRatedNoPropsFilter
      ratingsNoProps_every: _MovieRatedNoPropsFilter
      ratingsCustomFrom: _MovieRatedCustomFromFilter
      ratingsCustomFrom_not: _MovieRatedCustomFromFilter
      ratingsCustomFrom_in: [_MovieRatedCustomFromFilter!]
      ratingsCustomFrom_not_in: [_MovieRatedCustomFromFilter!]
      ratingsCustomFrom_some: _MovieRatedCustomFromFilter
      ratingsCustomFrom_none: _MovieRatedCustomFromFilter
      ratingsCustomFrom_single: _MovieRatedCustomFromFilter
      ratingsCustomFrom_every: _MovieRatedCustomFromFilter
      ratingsCustomTo: _MovieRatedCustomToFilter
      ratingsCustomTo_not: _MovieRatedCustomToFilter
      ratingsCustomTo_in: [_MovieRatedCustomToFilter!]
      ratingsCustomTo_not_in: [_MovieRatedCustomToFilter!]
      ratingsCustomTo_some: _MovieRatedCustomToFilter
      ratingsCustomTo_none: _MovieRatedCustomToFilter
      ratingsCustomTo_single: _MovieRatedCustomToFilter
      ratingsCustomTo_every: _MovieRatedCustomToFilter
      ratingsCustomFromTo: _MovieRatedCustomFromToFilter
      ratingsCustomFromTo_not: _MovieRatedCustomFromToFilter
      ratingsCustomFromTo_in: [_MovieRatedCustomFromToFilter!]
      ratingsCustomFromTo_not_in: [_MovieRatedCustomFromToFilter!]
      ratingsCustomFromTo_some: _MovieRatedCustomFromToFilter
      ratingsCustomFromTo_none: _MovieRatedCustomFromToFilter
      ratingsCustomFromTo_single: _MovieRatedCustomFromToFilter
      ratingsCustomFromTo_every: _MovieRatedCustomFromToFilter
      years: [Int!]
      years_not: [Int!]
      years_lt: [Int!]
      years_lte: [Int!]
      years_gt: [Int!]
      years_gte: [Int!]
      titles: [String!]
      titles_not: [String!]
      titles_regexp: String
      titles_contains: [String!]
      titles_not_contains: [String!]
      titles_starts_with: [String!]
      titles_not_starts_with: [String!]
      titles_ends_with: [String!]
      titles_not_ends_with: [String!]
      imdbRatings: [Float!]
      imdbRatings_not: [Float!]
      imdbRatings_lt: [Float!]
      imdbRatings_lte: [Float!]
      imdbRatings_gt: [Float!]
      imdbRatings_gte: [Float!]
      releases: [_Neo4jDateTimeInput!]
      releases_not: [_Neo4jDateTimeInput!]
      releases_lt: [_Neo4jDateTimeInput!]
      releases_lte: [_Neo4jDateTimeInput!]
      releases_gt: [_Neo4jDateTimeInput!]
      releases_gte: [_Neo4jDateTimeInput!]
      booleans: [Boolean!]
      booleans_not: [Boolean!]
      enums: [BookGenre!]
      enums_not: [BookGenre!]
      interfaceNoScalars: _InterfaceNoScalarsFilter
      interfaceNoScalars_not: _InterfaceNoScalarsFilter
      interfaceNoScalars_in: [_InterfaceNoScalarsFilter!]
      interfaceNoScalars_not_in: [_InterfaceNoScalarsFilter!]
      interfaceNoScalars_some: _InterfaceNoScalarsFilter
      interfaceNoScalars_none: _InterfaceNoScalarsFilter
      interfaceNoScalars_single: _InterfaceNoScalarsFilter
      interfaceNoScalars_every: _InterfaceNoScalarsFilter
      extensionScalar: String
      extensionScalar_not: String
      extensionScalar_in: [String!]
      extensionScalar_not_in: [String!]
      extensionScalar_regexp: String
      extensionScalar_contains: String
      extensionScalar_not_contains: String
      extensionScalar_starts_with: String
      extensionScalar_not_starts_with: String
      extensionScalar_ends_with: String
      extensionScalar_not_ends_with: String
      extensionNode: _GenreFilter
      extensionNode_not: _GenreFilter
      extensionNode_in: [_GenreFilter!]
      extensionNode_not_in: [_GenreFilter!]
      extensionNode_some: _GenreFilter
      extensionNode_none: _GenreFilter
      extensionNode_single: _GenreFilter
      extensionNode_every: _GenreFilter
    }
    input _MovieSearch {
      MovieSearch: String
      MovieSearchID: String
      threshold: Float
    }
    """
    Object type line description
    """
    type Movie
      @additionalLabels(
        labels: ["u_<%= $cypherParams.userId %>", "newMovieLabel"]
      ) {
      """
      Generated field for querying the Neo4j [system id](https://neo4j.com/docs/cypher-manual/current/functions/scalar/#functions-id) of this node.
      """
      _id: String
      """
      Field line description
      """
      movieId: ID! @id @search(index: "MovieSearchID")
      """
      Field
      block
      description
      """
      title: String @search
      someprefix_title_with_underscores: String
      year: Int
      released: _Neo4jDateTime
      plot: String @search
      poster: String
      imdbRating: Float
      """
      @relation field line description
      """
      genres(
        first: Int
        offset: Int
        orderBy: [_GenreOrdering]
        filter: _GenreFilter
      ): [Genre] @relation(name: "IN_GENRE", direction: "OUT")
      similar(
        first: Int = 3
        offset: Int = 0
        orderBy: [_MovieOrdering]
      ): [Movie]
        @cypher(
          statement: "WITH {this} AS this MATCH (this)--(:Genre)--(o:Movie) RETURN o"
        )
      mostSimilar: Movie @cypher(statement: "WITH {this} AS this RETURN this")
      degree: Int
        @cypher(statement: "WITH {this} AS this RETURN SIZE((this)--())")
      actors(
        first: Int = 3
        offset: Int = 0
        name: String
        names: [String]
        strings: [String]
        datetimes: [_Neo4jDateTimeInput]
        orderBy: [_ActorOrdering]
        filter: _ActorFilter
      ): [Actor] @relation(name: "ACTED_IN", direction: "IN")
      avgStars: Float
      filmedIn(filter: _StateFilter): State
        @relation(name: "FILMED_IN", direction: "OUT")
      location: _Neo4jPoint
      locations: [_Neo4jPoint]
      scaleRating(scale: Int = 3): Float
        @cypher(statement: "WITH $this AS this RETURN $scale * this.imdbRating")
      scaleRatingFloat(scale: Float = 1.5): Float
        @cypher(statement: "WITH $this AS this RETURN $scale * this.imdbRating")
      actorMovies(first: Int, offset: Int, orderBy: [_MovieOrdering]): [Movie]
        @cypher(
          statement: "MATCH (this)-[:ACTED_IN*2]-(other:Movie) RETURN other"
        )
      """
      @relation type field line description
      """
      ratings(
        rating: Int
        time: _Neo4jTimeInput
        date: _Neo4jDateInput
        datetime: _Neo4jDateTimeInput
        localtime: _Neo4jLocalTimeInput
        localdatetime: _Neo4jLocalDateTimeInput
        location: _Neo4jPointInput
        ratings: [Int]
        datetimes: [_Neo4jDateTimeInput]
        first: Int
        offset: Int
        orderBy: [_RatedOrdering]
        filter: _MovieRatedFilter
      ): [_MovieRatings]
      ratingsNoProps(
        first: Int
        offset: Int
        filter: _MovieRatedNoPropsFilter
      ): [_MovieRatingsNoProps]
      ratingsCustomFrom(
        rating: Int
        time: _Neo4jTimeInput
        date: _Neo4jDateInput
        datetime: _Neo4jDateTimeInput
        localtime: _Neo4jLocalTimeInput
        localdatetime: _Neo4jLocalDateTimeInput
        location: _Neo4jPointInput
        ratings: [Int]
        datetimes: [_Neo4jDateTimeInput]
        first: Int
        offset: Int
        orderBy: [_RatedCustomFromOrdering]
        filter: _MovieRatedCustomFromFilter
      ): [_MovieRatingsCustomFrom]
      ratingsCustomTo(
        rating: Int
        time: _Neo4jTimeInput
        date: _Neo4jDateInput
        datetime: _Neo4jDateTimeInput
        localtime: _Neo4jLocalTimeInput
        localdatetime: _Neo4jLocalDateTimeInput
        location: _Neo4jPointInput
        ratings: [Int]
        datetimes: [_Neo4jDateTimeInput]
        first: Int
        offset: Int
        orderBy: [_RatedCustomToOrdering]
        filter: _MovieRatedCustomToFilter
      ): [_MovieRatingsCustomTo]
      ratingsCustomFromTo(
        rating: Int
        time: _Neo4jTimeInput
        date: _Neo4jDateInput
        datetime: _Neo4jDateTimeInput
        localtime: _Neo4jLocalTimeInput
        localdatetime: _Neo4jLocalDateTimeInput
        location: _Neo4jPointInput
        ratings: [Int]
        datetimes: [_Neo4jDateTimeInput]
        from: String
        to: Int
        first: Int
        offset: Int
        orderBy: [_RatedCustomFromToOrdering]
        filter: _MovieRatedCustomFromToFilter
      ): [_MovieRatingsCustomFromTo]
      years: [Int]
      titles: [String]
      imdbRatings: [Float]
      """
      Temporal type field line description
      """
      releases: [_Neo4jDateTime]
      booleans: [Boolean]
      enums: [BookGenre]
      """
      Ignored field line description
      """
      customField: String @neo4j_ignore
      currentUserId(strArg: String): String
        @cypher(
          statement: "RETURN $cypherParams.currentUserId AS cypherParamsUserId"
        )
      """
      Object type extension field line description
      """
      interfaceNoScalars(
        orderBy: _InterfaceNoScalarsOrdering
        first: Int
        offset: Int
        filter: _InterfaceNoScalarsFilter
      ): [InterfaceNoScalars]
        @relation(name: "INTERFACE_NO_SCALARS", direction: OUT)
      extensionScalar: String @search
      extensionNode(
        first: Int
        offset: Int
        orderBy: [_GenreOrdering]
        filter: _GenreFilter
      ): [Genre] @relation(name: "IN_GENRE", direction: "OUT")
    }
    type _AddGenreMoviesPayload
      @relation(name: "IN_GENRE", from: "Movie", to: "Genre") {
      """
      Field for the Movie node this IN_GENRE [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      from: Movie
      """
      Field for the Genre node this IN_GENRE [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      to: Genre
    }
    type _RemoveGenreMoviesPayload
      @relation(name: "IN_GENRE", from: "Movie", to: "Genre") {
      """
      Field for the Movie node this IN_GENRE [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      from: Movie
      """
      Field for the Genre node this IN_GENRE [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      to: Genre
    }
    type _MergeGenreMoviesPayload
      @relation(name: "IN_GENRE", from: "Movie", to: "Genre") {
      """
      Field for the Movie node this IN_GENRE [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      from: Movie
      """
      Field for the Genre node this IN_GENRE [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      to: Genre
    }
    type _GenreInterfacedRelationshipType
      @relation(
        name: "INTERFACED_RELATIONSHIP_TYPE"
        from: "Person"
        to: "Genre"
      ) {
      string: String!
      boolean: Boolean
      """
      Generated field for querying the Neo4j [system id](https://neo4j.com/docs/cypher-manual/current/functions/scalar/#functions-id) of this relationship.
      """
      _id: String
      """
      Field for the Person node this INTERFACED_RELATIONSHIP_TYPE [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      Person: Person
    }
    enum _InterfacedRelationshipTypeOrdering {
      string_asc
      string_desc
      boolean_asc
      boolean_desc
      _id_asc
      _id_desc
    }
    input _InterfacedRelationshipTypeInput {
      string: String!
      boolean: Boolean
    }
    type _AddGenreInterfacedRelationshipTypePayload
      @relation(
        name: "INTERFACED_RELATIONSHIP_TYPE"
        from: "Person"
        to: "Genre"
      ) {
      """
      Field for the Person node this INTERFACED_RELATIONSHIP_TYPE [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      from: Person
      """
      Field for the Genre node this INTERFACED_RELATIONSHIP_TYPE [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      to: Genre
      string: String!
      boolean: Boolean
      """
      Generated field for querying the Neo4j [system id](https://neo4j.com/docs/cypher-manual/current/functions/scalar/#functions-id) of this relationship.
      """
      _id: String
    }
    type _RemoveGenreInterfacedRelationshipTypePayload
      @relation(
        name: "INTERFACED_RELATIONSHIP_TYPE"
        from: "Person"
        to: "Genre"
      ) {
      """
      Field for the Person node this INTERFACED_RELATIONSHIP_TYPE [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      from: Person
      """
      Field for the Genre node this INTERFACED_RELATIONSHIP_TYPE [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      to: Genre
    }
    type _UpdateGenreInterfacedRelationshipTypePayload
      @relation(
        name: "INTERFACED_RELATIONSHIP_TYPE"
        from: "Person"
        to: "Genre"
      ) {
      """
      Field for the Person node this INTERFACED_RELATIONSHIP_TYPE [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      from: Person
      """
      Field for the Genre node this INTERFACED_RELATIONSHIP_TYPE [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      to: Genre
      string: String!
      boolean: Boolean
      """
      Generated field for querying the Neo4j [system id](https://neo4j.com/docs/cypher-manual/current/functions/scalar/#functions-id) of this relationship.
      """
      _id: String
    }
    type _MergeGenreInterfacedRelationshipTypePayload
      @relation(
        name: "INTERFACED_RELATIONSHIP_TYPE"
        from: "Person"
        to: "Genre"
      ) {
      """
      Field for the Person node this INTERFACED_RELATIONSHIP_TYPE [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      from: Person
      """
      Field for the Genre node this INTERFACED_RELATIONSHIP_TYPE [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      to: Genre
      string: String!
      boolean: Boolean
      """
      Generated field for querying the Neo4j [system id](https://neo4j.com/docs/cypher-manual/current/functions/scalar/#functions-id) of this relationship.
      """
      _id: String
    }
    input _GenreInput {
      name: String!
    }
    type Genre {
      """
      Generated field for querying the Neo4j [system id](https://neo4j.com/docs/cypher-manual/current/functions/scalar/#functions-id) of this node.
      """
      _id: String
      name: String
      movies(
        first: Int = 3
        offset: Int = 0
        orderBy: [_MovieOrdering]
        filter: _MovieFilter
      ): [Movie] @relation(name: "IN_GENRE", direction: "IN")
      highestRatedMovie: Movie
        @cypher(
          statement: "MATCH (m:Movie)-[:IN_GENRE]->(this) RETURN m ORDER BY m.imdbRating DESC LIMIT 1"
        )
      interfacedRelationshipType(
        first: Int
        offset: Int
        orderBy: [_InterfacedRelationshipTypeOrdering]
        filter: _GenreInterfacedRelationshipTypeFilter
      ): [_GenreInterfacedRelationshipType]
    }
    input _StateInput {
      name: String!
    }
    enum _StateOrdering {
      name_asc
      name_desc
      id_asc
      id_desc
      _id_asc
      _id_desc
    }
    input _StateFilter {
      AND: [_StateFilter!]
      OR: [_StateFilter!]
      name: String
      name_not: String
      name_in: [String!]
      name_not_in: [String!]
      name_regexp: String
      name_contains: String
      name_not_contains: String
      name_starts_with: String
      name_not_starts_with: String
      name_ends_with: String
      name_not_ends_with: String
      id: ID
      id_not: ID
      id_in: [ID!]
      id_not_in: [ID!]
      id_regexp: ID
      id_contains: ID
      id_not_contains: ID
      id_starts_with: ID
      id_not_starts_with: ID
      id_ends_with: ID
      id_not_ends_with: ID
    }
    type State {
      customField: String @neo4j_ignore
      name: String! @index
      id: ID
      """
      Generated field for querying the Neo4j [system id](https://neo4j.com/docs/cypher-manual/current/functions/scalar/#functions-id) of this node.
      """
      _id: String
    }
    type _PersonInterfacedRelationshipType
      @relation(
        name: "INTERFACED_RELATIONSHIP_TYPE"
        from: "Person"
        to: "Genre"
      ) {
      string: String!
      boolean: Boolean
      """
      Generated field for querying the Neo4j [system id](https://neo4j.com/docs/cypher-manual/current/functions/scalar/#functions-id) of this relationship.
      """
      _id: String
      """
      Field for the Genre node this INTERFACED_RELATIONSHIP_TYPE [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      Genre: Genre
    }
    type _AddPersonInterfacedRelationshipTypePayload
      @relation(
        name: "INTERFACED_RELATIONSHIP_TYPE"
        from: "Person"
        to: "Genre"
      ) {
      """
      Field for the Person node this INTERFACED_RELATIONSHIP_TYPE [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      from: Person
      """
      Field for the Genre node this INTERFACED_RELATIONSHIP_TYPE [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      to: Genre
      string: String!
      boolean: Boolean
      """
      Generated field for querying the Neo4j [system id](https://neo4j.com/docs/cypher-manual/current/functions/scalar/#functions-id) of this relationship.
      """
      _id: String
    }
    type _RemovePersonInterfacedRelationshipTypePayload
      @relation(
        name: "INTERFACED_RELATIONSHIP_TYPE"
        from: "Person"
        to: "Genre"
      ) {
      """
      Field for the Person node this INTERFACED_RELATIONSHIP_TYPE [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      from: Person
      """
      Field for the Genre node this INTERFACED_RELATIONSHIP_TYPE [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      to: Genre
    }
    type _UpdatePersonInterfacedRelationshipTypePayload
      @relation(
        name: "INTERFACED_RELATIONSHIP_TYPE"
        from: "Person"
        to: "Genre"
      ) {
      """
      Field for the Person node this INTERFACED_RELATIONSHIP_TYPE [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      from: Person
      """
      Field for the Genre node this INTERFACED_RELATIONSHIP_TYPE [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      to: Genre
      string: String!
      boolean: Boolean
      """
      Generated field for querying the Neo4j [system id](https://neo4j.com/docs/cypher-manual/current/functions/scalar/#functions-id) of this relationship.
      """
      _id: String
    }
    type _MergePersonInterfacedRelationshipTypePayload
      @relation(
        name: "INTERFACED_RELATIONSHIP_TYPE"
        from: "Person"
        to: "Genre"
      ) {
      """
      Field for the Person node this INTERFACED_RELATIONSHIP_TYPE [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      from: Person
      """
      Field for the Genre node this INTERFACED_RELATIONSHIP_TYPE [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      to: Genre
      string: String!
      boolean: Boolean
      """
      Generated field for querying the Neo4j [system id](https://neo4j.com/docs/cypher-manual/current/functions/scalar/#functions-id) of this relationship.
      """
      _id: String
    }
    type _PersonReflexiveInterfacedRelationshipTypeDirections
      @relation(
        name: "REFLEXIVE_INTERFACED_RELATIONSHIP_TYPE"
        from: "Person"
        to: "Person"
      ) {
      """
      Field for the Person node this REFLEXIVE_INTERFACED_RELATIONSHIP_TYPE [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      from(
        first: Int
        offset: Int
        orderBy: [_ReflexiveInterfacedRelationshipTypeOrdering]
        filter: _ReflexiveInterfacedRelationshipTypeFilter
      ): [_PersonReflexiveInterfacedRelationshipType]
      """
      Field for the Person node this REFLEXIVE_INTERFACED_RELATIONSHIP_TYPE [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      to(
        first: Int
        offset: Int
        orderBy: [_ReflexiveInterfacedRelationshipTypeOrdering]
        filter: _ReflexiveInterfacedRelationshipTypeFilter
      ): [_PersonReflexiveInterfacedRelationshipType]
    }
    type _PersonReflexiveInterfacedRelationshipType
      @relation(
        name: "REFLEXIVE_INTERFACED_RELATIONSHIP_TYPE"
        from: "Person"
        to: "Person"
      ) {
      boolean: Boolean
      """
      Generated field for querying the Neo4j [system id](https://neo4j.com/docs/cypher-manual/current/functions/scalar/#functions-id) of this relationship.
      """
      _id: String
      """
      Field for the Person node this REFLEXIVE_INTERFACED_RELATIONSHIP_TYPE [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      Person: Person
    }
    input _ReflexiveInterfacedRelationshipTypeDirectionsFilter {
      from: _ReflexiveInterfacedRelationshipTypeFilter
      to: _ReflexiveInterfacedRelationshipTypeFilter
    }
    enum _ReflexiveInterfacedRelationshipTypeOrdering {
      boolean_asc
      boolean_desc
      _id_asc
      _id_desc
    }
    input _ReflexiveInterfacedRelationshipTypeInput {
      boolean: Boolean
    }
    type _AddPersonReflexiveInterfacedRelationshipTypePayload
      @relation(
        name: "REFLEXIVE_INTERFACED_RELATIONSHIP_TYPE"
        from: "Person"
        to: "Person"
      ) {
      """
      Field for the Person node this REFLEXIVE_INTERFACED_RELATIONSHIP_TYPE [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      from: Person
      """
      Field for the Person node this REFLEXIVE_INTERFACED_RELATIONSHIP_TYPE [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      to: Person
      boolean: Boolean
      """
      Generated field for querying the Neo4j [system id](https://neo4j.com/docs/cypher-manual/current/functions/scalar/#functions-id) of this relationship.
      """
      _id: String
    }
    type _RemovePersonReflexiveInterfacedRelationshipTypePayload
      @relation(
        name: "REFLEXIVE_INTERFACED_RELATIONSHIP_TYPE"
        from: "Person"
        to: "Person"
      ) {
      """
      Field for the Person node this REFLEXIVE_INTERFACED_RELATIONSHIP_TYPE [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      from: Person
      """
      Field for the Person node this REFLEXIVE_INTERFACED_RELATIONSHIP_TYPE [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      to: Person
    }
    type _UpdatePersonReflexiveInterfacedRelationshipTypePayload
      @relation(
        name: "REFLEXIVE_INTERFACED_RELATIONSHIP_TYPE"
        from: "Person"
        to: "Person"
      ) {
      """
      Field for the Person node this REFLEXIVE_INTERFACED_RELATIONSHIP_TYPE [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      from: Person
      """
      Field for the Person node this REFLEXIVE_INTERFACED_RELATIONSHIP_TYPE [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      to: Person
      boolean: Boolean
      """
      Generated field for querying the Neo4j [system id](https://neo4j.com/docs/cypher-manual/current/functions/scalar/#functions-id) of this relationship.
      """
      _id: String
    }
    type _MergePersonReflexiveInterfacedRelationshipTypePayload
      @relation(
        name: "REFLEXIVE_INTERFACED_RELATIONSHIP_TYPE"
        from: "Person"
        to: "Person"
      ) {
      """
      Field for the Person node this REFLEXIVE_INTERFACED_RELATIONSHIP_TYPE [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      from: Person
      """
      Field for the Person node this REFLEXIVE_INTERFACED_RELATIONSHIP_TYPE [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      to: Person
      boolean: Boolean
      """
      Generated field for querying the Neo4j [system id](https://neo4j.com/docs/cypher-manual/current/functions/scalar/#functions-id) of this relationship.
      """
      _id: String
    }
    input _PersonInput {
      userId: ID!
    }
    """
    Interface type
    block description
    """
    interface Person {
      name: String
      interfacedRelationshipType(
        first: Int
        offset: Int
        orderBy: [_InterfacedRelationshipTypeOrdering]
        filter: _PersonInterfacedRelationshipTypeFilter
      ): [_PersonInterfacedRelationshipType]
      userId: ID! @id
      reflexiveInterfacedRelationshipType: _PersonReflexiveInterfacedRelationshipTypeDirections
      extensionScalar: String
    }
    type ReflexiveInterfacedRelationshipType
      @relation(name: "REFLEXIVE_INTERFACED_RELATIONSHIP_TYPE") {
      from: Person!
      boolean: Boolean
      to: Person!
    }
    type InterfacedRelationshipType
      @relation(name: "INTERFACED_RELATIONSHIP_TYPE") {
      from: Person!
      string: String!
      boolean: Boolean
      to: Genre!
    }
    """
    Enum type line description
    """
    enum _PersonOrdering {
      """
      Enum value line description
      """
      userId_asc
      """
      Enum value
      block
      description
      """
      userId_desc
      name_asc
      name_desc
    }
    """
    Custom filtering input type
    block description
    """
    input _PersonFilter {
      AND: [_PersonFilter!]
      OR: [_PersonFilter!]
      userId: ID
      userId_not: ID
      userId_in: [ID!]
      userId_not_in: [ID!]
      userId_contains: ID
      userId_not_contains: ID
      userId_starts_with: ID
      userId_not_starts_with: ID
      userId_ends_with: ID
      userId_not_ends_with: ID
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
      interfacedRelationshipType: _PersonInterfacedRelationshipTypeFilter
      interfacedRelationshipType_not: _PersonInterfacedRelationshipTypeFilter
      interfacedRelationshipType_in: [_PersonInterfacedRelationshipTypeFilter!]
      interfacedRelationshipType_not_in: [_PersonInterfacedRelationshipTypeFilter!]
      interfacedRelationshipType_some: _PersonInterfacedRelationshipTypeFilter
      interfacedRelationshipType_none: _PersonInterfacedRelationshipTypeFilter
      interfacedRelationshipType_single: _PersonInterfacedRelationshipTypeFilter
      interfacedRelationshipType_every: _PersonInterfacedRelationshipTypeFilter
      reflexiveInterfacedRelationshipType: _ReflexiveInterfacedRelationshipTypeDirectionsFilter
      reflexiveInterfacedRelationshipType_not: _ReflexiveInterfacedRelationshipTypeDirectionsFilter
      reflexiveInterfacedRelationshipType_in: [_ReflexiveInterfacedRelationshipTypeDirectionsFilter!]
      reflexiveInterfacedRelationshipType_not_in: [_ReflexiveInterfacedRelationshipTypeDirectionsFilter!]
      reflexiveInterfacedRelationshipType_some: _ReflexiveInterfacedRelationshipTypeDirectionsFilter
      reflexiveInterfacedRelationshipType_none: _ReflexiveInterfacedRelationshipTypeDirectionsFilter
      reflexiveInterfacedRelationshipType_single: _ReflexiveInterfacedRelationshipTypeDirectionsFilter
      reflexiveInterfacedRelationshipType_every: _ReflexiveInterfacedRelationshipTypeDirectionsFilter
      extensionScalar: String
      extensionScalar_not: String
      extensionScalar_in: [String!]
      extensionScalar_not_in: [String!]
      extensionScalar_contains: String
      extensionScalar_not_contains: String
      extensionScalar_starts_with: String
      extensionScalar_not_starts_with: String
      extensionScalar_ends_with: String
      extensionScalar_not_ends_with: String
    }
    input _PersonInterfacedRelationshipTypeFilter {
      AND: [_PersonInterfacedRelationshipTypeFilter!]
      OR: [_PersonInterfacedRelationshipTypeFilter!]
      string: String
      string_not: String
      string_in: [String!]
      string_not_in: [String!]
      string_contains: String
      string_not_contains: String
      string_starts_with: String
      string_not_starts_with: String
      string_ends_with: String
      string_not_ends_with: String
      boolean: Boolean
      boolean_not: Boolean
      Genre: _GenreFilter
    }
    input _GenreFilter {
      AND: [_GenreFilter!]
      OR: [_GenreFilter!]
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
      interfacedRelationshipType: _GenreInterfacedRelationshipTypeFilter
      interfacedRelationshipType_not: _GenreInterfacedRelationshipTypeFilter
      interfacedRelationshipType_in: [_GenreInterfacedRelationshipTypeFilter!]
      interfacedRelationshipType_not_in: [_GenreInterfacedRelationshipTypeFilter!]
      interfacedRelationshipType_some: _GenreInterfacedRelationshipTypeFilter
      interfacedRelationshipType_none: _GenreInterfacedRelationshipTypeFilter
      interfacedRelationshipType_single: _GenreInterfacedRelationshipTypeFilter
      interfacedRelationshipType_every: _GenreInterfacedRelationshipTypeFilter
    }
    input _GenreInterfacedRelationshipTypeFilter {
      AND: [_GenreInterfacedRelationshipTypeFilter!]
      OR: [_GenreInterfacedRelationshipTypeFilter!]
      string: String
      string_not: String
      string_in: [String!]
      string_not_in: [String!]
      string_contains: String
      string_not_contains: String
      string_starts_with: String
      string_not_starts_with: String
      string_ends_with: String
      string_not_ends_with: String
      boolean: Boolean
      boolean_not: Boolean
      Person: _PersonFilter
    }
    input _ReflexiveInterfacedRelationshipTypeFilter {
      AND: [_ReflexiveInterfacedRelationshipTypeFilter!]
      OR: [_ReflexiveInterfacedRelationshipTypeFilter!]
      boolean: Boolean
      boolean_not: Boolean
      Person: _PersonFilter
    }
    type _AddActorMoviesPayload
      @relation(name: "ACTED_IN", from: "Actor", to: "Movie") {
      """
      Field for the Actor node this ACTED_IN [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      from: Actor
      """
      Field for the Movie node this ACTED_IN [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      to: Movie
    }
    type _RemoveActorMoviesPayload
      @relation(name: "ACTED_IN", from: "Actor", to: "Movie") {
      """
      Field for the Actor node this ACTED_IN [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      from: Actor
      """
      Field for the Movie node this ACTED_IN [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      to: Movie
    }
    type _MergeActorMoviesPayload
      @relation(name: "ACTED_IN", from: "Actor", to: "Movie") {
      """
      Field for the Actor node this ACTED_IN [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      from: Actor
      """
      Field for the Movie node this ACTED_IN [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      to: Movie
    }
    type _AddActorKnowsPayload
      @relation(name: "KNOWS", from: "Actor", to: "Person") {
      """
      Field for the Actor node this KNOWS [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      from: Actor
      """
      Field for the Person node this KNOWS [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      to: Person
    }
    type _RemoveActorKnowsPayload
      @relation(name: "KNOWS", from: "Actor", to: "Person") {
      """
      Field for the Actor node this KNOWS [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      from: Actor
      """
      Field for the Person node this KNOWS [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      to: Person
    }
    type _MergeActorKnowsPayload
      @relation(name: "KNOWS", from: "Actor", to: "Person") {
      """
      Field for the Actor node this KNOWS [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      from: Actor
      """
      Field for the Person node this KNOWS [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      to: Person
    }
    type _AddActorInterfacedRelationshipTypePayload
      @relation(
        name: "INTERFACED_RELATIONSHIP_TYPE"
        from: "Person"
        to: "Genre"
      ) {
      """
      Field for the Person node this INTERFACED_RELATIONSHIP_TYPE [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      from: Person
      """
      Field for the Genre node this INTERFACED_RELATIONSHIP_TYPE [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      to: Genre
      string: String!
      boolean: Boolean
      """
      Generated field for querying the Neo4j [system id](https://neo4j.com/docs/cypher-manual/current/functions/scalar/#functions-id) of this relationship.
      """
      _id: String
    }
    type _RemoveActorInterfacedRelationshipTypePayload
      @relation(
        name: "INTERFACED_RELATIONSHIP_TYPE"
        from: "Person"
        to: "Genre"
      ) {
      """
      Field for the Person node this INTERFACED_RELATIONSHIP_TYPE [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      from: Person
      """
      Field for the Genre node this INTERFACED_RELATIONSHIP_TYPE [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      to: Genre
    }
    type _UpdateActorInterfacedRelationshipTypePayload
      @relation(
        name: "INTERFACED_RELATIONSHIP_TYPE"
        from: "Person"
        to: "Genre"
      ) {
      """
      Field for the Person node this INTERFACED_RELATIONSHIP_TYPE [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      from: Person
      """
      Field for the Genre node this INTERFACED_RELATIONSHIP_TYPE [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      to: Genre
      string: String!
      boolean: Boolean
      """
      Generated field for querying the Neo4j [system id](https://neo4j.com/docs/cypher-manual/current/functions/scalar/#functions-id) of this relationship.
      """
      _id: String
    }
    type _MergeActorInterfacedRelationshipTypePayload
      @relation(
        name: "INTERFACED_RELATIONSHIP_TYPE"
        from: "Person"
        to: "Genre"
      ) {
      """
      Field for the Person node this INTERFACED_RELATIONSHIP_TYPE [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      from: Person
      """
      Field for the Genre node this INTERFACED_RELATIONSHIP_TYPE [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      to: Genre
      string: String!
      boolean: Boolean
      """
      Generated field for querying the Neo4j [system id](https://neo4j.com/docs/cypher-manual/current/functions/scalar/#functions-id) of this relationship.
      """
      _id: String
    }
    type _AddActorReflexiveInterfacedRelationshipTypePayload
      @relation(
        name: "REFLEXIVE_INTERFACED_RELATIONSHIP_TYPE"
        from: "Person"
        to: "Person"
      ) {
      """
      Field for the Person node this REFLEXIVE_INTERFACED_RELATIONSHIP_TYPE [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      from: Person
      """
      Field for the Person node this REFLEXIVE_INTERFACED_RELATIONSHIP_TYPE [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      to: Person
      boolean: Boolean
      """
      Generated field for querying the Neo4j [system id](https://neo4j.com/docs/cypher-manual/current/functions/scalar/#functions-id) of this relationship.
      """
      _id: String
    }
    type _RemoveActorReflexiveInterfacedRelationshipTypePayload
      @relation(
        name: "REFLEXIVE_INTERFACED_RELATIONSHIP_TYPE"
        from: "Person"
        to: "Person"
      ) {
      """
      Field for the Person node this REFLEXIVE_INTERFACED_RELATIONSHIP_TYPE [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      from: Person
      """
      Field for the Person node this REFLEXIVE_INTERFACED_RELATIONSHIP_TYPE [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      to: Person
    }
    type _UpdateActorReflexiveInterfacedRelationshipTypePayload
      @relation(
        name: "REFLEXIVE_INTERFACED_RELATIONSHIP_TYPE"
        from: "Person"
        to: "Person"
      ) {
      """
      Field for the Person node this REFLEXIVE_INTERFACED_RELATIONSHIP_TYPE [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      from: Person
      """
      Field for the Person node this REFLEXIVE_INTERFACED_RELATIONSHIP_TYPE [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      to: Person
      boolean: Boolean
      """
      Generated field for querying the Neo4j [system id](https://neo4j.com/docs/cypher-manual/current/functions/scalar/#functions-id) of this relationship.
      """
      _id: String
    }
    type _MergeActorReflexiveInterfacedRelationshipTypePayload
      @relation(
        name: "REFLEXIVE_INTERFACED_RELATIONSHIP_TYPE"
        from: "Person"
        to: "Person"
      ) {
      """
      Field for the Person node this REFLEXIVE_INTERFACED_RELATIONSHIP_TYPE [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      from: Person
      """
      Field for the Person node this REFLEXIVE_INTERFACED_RELATIONSHIP_TYPE [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      to: Person
      boolean: Boolean
      """
      Generated field for querying the Neo4j [system id](https://neo4j.com/docs/cypher-manual/current/functions/scalar/#functions-id) of this relationship.
      """
      _id: String
    }
    input _ActorInput {
      userId: ID!
    }
    enum _ActorOrdering {
      userId_asc
      userId_desc
      name_asc
      name_desc
      extensionScalar_asc
      extensionScalar_desc
      _id_asc
      _id_desc
    }
    input _ActorFilter {
      AND: [_ActorFilter!]
      OR: [_ActorFilter!]
      userId: ID
      userId_not: ID
      userId_in: [ID!]
      userId_not_in: [ID!]
      userId_regexp: ID
      userId_contains: ID
      userId_not_contains: ID
      userId_starts_with: ID
      userId_not_starts_with: ID
      userId_ends_with: ID
      userId_not_ends_with: ID
      name: String
      name_not: String
      name_in: [String!]
      name_not_in: [String!]
      name_regexp: String
      name_contains: String
      name_not_contains: String
      name_starts_with: String
      name_not_starts_with: String
      name_ends_with: String
      name_not_ends_with: String
      movies: _MovieFilter
      movies_not: _MovieFilter
      movies_in: [_MovieFilter!]
      movies_not_in: [_MovieFilter!]
      movies_some: _MovieFilter
      movies_none: _MovieFilter
      movies_single: _MovieFilter
      movies_every: _MovieFilter
      knows: _PersonFilter
      knows_not: _PersonFilter
      knows_in: [_PersonFilter!]
      knows_not_in: [_PersonFilter!]
      knows_some: _PersonFilter
      knows_none: _PersonFilter
      knows_single: _PersonFilter
      knows_every: _PersonFilter
      extensionScalar: String
      extensionScalar_not: String
      extensionScalar_in: [String!]
      extensionScalar_not_in: [String!]
      extensionScalar_regexp: String
      extensionScalar_contains: String
      extensionScalar_not_contains: String
      extensionScalar_starts_with: String
      extensionScalar_not_starts_with: String
      extensionScalar_ends_with: String
      extensionScalar_not_ends_with: String
      datetimes: [_Neo4jDateTimeInput!]
      datetimes_not: [_Neo4jDateTimeInput!]
      datetimes_lt: [_Neo4jDateTimeInput!]
      datetimes_lte: [_Neo4jDateTimeInput!]
      datetimes_gt: [_Neo4jDateTimeInput!]
      datetimes_gte: [_Neo4jDateTimeInput!]
      strings: [String!]
      strings_not: [String!]
      strings_regexp: String
      strings_contains: [String!]
      strings_not_contains: [String!]
      strings_starts_with: [String!]
      strings_not_starts_with: [String!]
      strings_ends_with: [String!]
      strings_not_ends_with: [String!]
      interfacedRelationshipType: _PersonInterfacedRelationshipTypeFilter
      interfacedRelationshipType_not: _PersonInterfacedRelationshipTypeFilter
      interfacedRelationshipType_in: [_PersonInterfacedRelationshipTypeFilter!]
      interfacedRelationshipType_not_in: [_PersonInterfacedRelationshipTypeFilter!]
      interfacedRelationshipType_some: _PersonInterfacedRelationshipTypeFilter
      interfacedRelationshipType_none: _PersonInterfacedRelationshipTypeFilter
      interfacedRelationshipType_single: _PersonInterfacedRelationshipTypeFilter
      interfacedRelationshipType_every: _PersonInterfacedRelationshipTypeFilter
      reflexiveInterfacedRelationshipType: _ReflexiveInterfacedRelationshipTypeDirectionsFilter
      reflexiveInterfacedRelationshipType_not: _ReflexiveInterfacedRelationshipTypeDirectionsFilter
      reflexiveInterfacedRelationshipType_in: [_ReflexiveInterfacedRelationshipTypeDirectionsFilter!]
      reflexiveInterfacedRelationshipType_not_in: [_ReflexiveInterfacedRelationshipTypeDirectionsFilter!]
      reflexiveInterfacedRelationshipType_some: _ReflexiveInterfacedRelationshipTypeDirectionsFilter
      reflexiveInterfacedRelationshipType_none: _ReflexiveInterfacedRelationshipTypeDirectionsFilter
      reflexiveInterfacedRelationshipType_single: _ReflexiveInterfacedRelationshipTypeDirectionsFilter
      reflexiveInterfacedRelationshipType_every: _ReflexiveInterfacedRelationshipTypeDirectionsFilter
    }
    type Actor implements Person {
      userId: ID!
      name: String
      movies(
        first: Int
        offset: Int
        orderBy: [_MovieOrdering]
        filter: _MovieFilter
      ): [Movie] @relation(name: "ACTED_IN", direction: "OUT")
      knows(
        first: Int
        offset: Int
        orderBy: [_PersonOrdering]
        filter: _PersonFilter
      ): [Person] @relation(name: "KNOWS", direction: "OUT")
      extensionScalar: String
      datetimes: [_Neo4jDateTime]
      strings: [String]
      interfacedRelationshipType(
        first: Int
        offset: Int
        orderBy: [_InterfacedRelationshipTypeOrdering]
        filter: _PersonInterfacedRelationshipTypeFilter
      ): [_PersonInterfacedRelationshipType]
      reflexiveInterfacedRelationshipType: _PersonReflexiveInterfacedRelationshipTypeDirections
      """
      Generated field for querying the Neo4j [system id](https://neo4j.com/docs/cypher-manual/current/functions/scalar/#functions-id) of this node.
      """
      _id: String
    }
    type _AddUserInterfacedRelationshipTypePayload
      @relation(
        name: "INTERFACED_RELATIONSHIP_TYPE"
        from: "Person"
        to: "Genre"
      ) {
      """
      Field for the Person node this INTERFACED_RELATIONSHIP_TYPE [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      from: Person
      """
      Field for the Genre node this INTERFACED_RELATIONSHIP_TYPE [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      to: Genre
      string: String!
      boolean: Boolean
      """
      Generated field for querying the Neo4j [system id](https://neo4j.com/docs/cypher-manual/current/functions/scalar/#functions-id) of this relationship.
      """
      _id: String
    }
    type _RemoveUserInterfacedRelationshipTypePayload
      @relation(
        name: "INTERFACED_RELATIONSHIP_TYPE"
        from: "Person"
        to: "Genre"
      ) {
      """
      Field for the Person node this INTERFACED_RELATIONSHIP_TYPE [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      from: Person
      """
      Field for the Genre node this INTERFACED_RELATIONSHIP_TYPE [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      to: Genre
    }
    type _UpdateUserInterfacedRelationshipTypePayload
      @relation(
        name: "INTERFACED_RELATIONSHIP_TYPE"
        from: "Person"
        to: "Genre"
      ) {
      """
      Field for the Person node this INTERFACED_RELATIONSHIP_TYPE [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      from: Person
      """
      Field for the Genre node this INTERFACED_RELATIONSHIP_TYPE [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      to: Genre
      string: String!
      boolean: Boolean
      """
      Generated field for querying the Neo4j [system id](https://neo4j.com/docs/cypher-manual/current/functions/scalar/#functions-id) of this relationship.
      """
      _id: String
    }
    type _MergeUserInterfacedRelationshipTypePayload
      @relation(
        name: "INTERFACED_RELATIONSHIP_TYPE"
        from: "Person"
        to: "Genre"
      ) {
      """
      Field for the Person node this INTERFACED_RELATIONSHIP_TYPE [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      from: Person
      """
      Field for the Genre node this INTERFACED_RELATIONSHIP_TYPE [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      to: Genre
      string: String!
      boolean: Boolean
      """
      Generated field for querying the Neo4j [system id](https://neo4j.com/docs/cypher-manual/current/functions/scalar/#functions-id) of this relationship.
      """
      _id: String
    }
    type _AddUserReflexiveInterfacedRelationshipTypePayload
      @relation(
        name: "REFLEXIVE_INTERFACED_RELATIONSHIP_TYPE"
        from: "Person"
        to: "Person"
      ) {
      """
      Field for the Person node this REFLEXIVE_INTERFACED_RELATIONSHIP_TYPE [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      from: Person
      """
      Field for the Person node this REFLEXIVE_INTERFACED_RELATIONSHIP_TYPE [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      to: Person
      boolean: Boolean
      """
      Generated field for querying the Neo4j [system id](https://neo4j.com/docs/cypher-manual/current/functions/scalar/#functions-id) of this relationship.
      """
      _id: String
    }
    type _RemoveUserReflexiveInterfacedRelationshipTypePayload
      @relation(
        name: "REFLEXIVE_INTERFACED_RELATIONSHIP_TYPE"
        from: "Person"
        to: "Person"
      ) {
      """
      Field for the Person node this REFLEXIVE_INTERFACED_RELATIONSHIP_TYPE [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      from: Person
      """
      Field for the Person node this REFLEXIVE_INTERFACED_RELATIONSHIP_TYPE [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      to: Person
    }
    type _UpdateUserReflexiveInterfacedRelationshipTypePayload
      @relation(
        name: "REFLEXIVE_INTERFACED_RELATIONSHIP_TYPE"
        from: "Person"
        to: "Person"
      ) {
      """
      Field for the Person node this REFLEXIVE_INTERFACED_RELATIONSHIP_TYPE [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      from: Person
      """
      Field for the Person node this REFLEXIVE_INTERFACED_RELATIONSHIP_TYPE [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      to: Person
      boolean: Boolean
      """
      Generated field for querying the Neo4j [system id](https://neo4j.com/docs/cypher-manual/current/functions/scalar/#functions-id) of this relationship.
      """
      _id: String
    }
    type _MergeUserReflexiveInterfacedRelationshipTypePayload
      @relation(
        name: "REFLEXIVE_INTERFACED_RELATIONSHIP_TYPE"
        from: "Person"
        to: "Person"
      ) {
      """
      Field for the Person node this REFLEXIVE_INTERFACED_RELATIONSHIP_TYPE [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      from: Person
      """
      Field for the Person node this REFLEXIVE_INTERFACED_RELATIONSHIP_TYPE [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      to: Person
      boolean: Boolean
      """
      Generated field for querying the Neo4j [system id](https://neo4j.com/docs/cypher-manual/current/functions/scalar/#functions-id) of this relationship.
      """
      _id: String
    }
    type _UserRated @relation(name: "RATED", from: "User", to: "Movie") {
      currentUserId(strArg: String): String
        @cypher(
          statement: "RETURN $cypherParams.currentUserId AS cypherParamsUserId"
        )
      rating: Int
      ratings: [Int]
      time: _Neo4jTime
      date: _Neo4jDate
      datetime: _Neo4jDateTime
      localtime: _Neo4jLocalTime
      localdatetime: _Neo4jLocalDateTime
      datetimes: [_Neo4jDateTime]
      location: _Neo4jPoint
      """
      Generated field for querying the Neo4j [system id](https://neo4j.com/docs/cypher-manual/current/functions/scalar/#functions-id) of this relationship.
      """
      _id: String
      """
      Field for the Movie node this RATED [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      Movie: Movie
    }
    input _UserRatedFilter {
      AND: [_UserRatedFilter!]
      OR: [_UserRatedFilter!]
      rating: Int
      rating_not: Int
      rating_in: [Int!]
      rating_not_in: [Int!]
      rating_lt: Int
      rating_lte: Int
      rating_gt: Int
      rating_gte: Int
      ratings: [Int!]
      ratings_not: [Int!]
      ratings_lt: [Int!]
      ratings_lte: [Int!]
      ratings_gt: [Int!]
      ratings_gte: [Int!]
      time: _Neo4jTimeInput
      time_not: _Neo4jTimeInput
      time_in: [_Neo4jTimeInput!]
      time_not_in: [_Neo4jTimeInput!]
      time_lt: _Neo4jTimeInput
      time_lte: _Neo4jTimeInput
      time_gt: _Neo4jTimeInput
      time_gte: _Neo4jTimeInput
      date: _Neo4jDateInput
      date_not: _Neo4jDateInput
      date_in: [_Neo4jDateInput!]
      date_not_in: [_Neo4jDateInput!]
      date_lt: _Neo4jDateInput
      date_lte: _Neo4jDateInput
      date_gt: _Neo4jDateInput
      date_gte: _Neo4jDateInput
      datetime: _Neo4jDateTimeInput
      datetime_not: _Neo4jDateTimeInput
      datetime_in: [_Neo4jDateTimeInput!]
      datetime_not_in: [_Neo4jDateTimeInput!]
      datetime_lt: _Neo4jDateTimeInput
      datetime_lte: _Neo4jDateTimeInput
      datetime_gt: _Neo4jDateTimeInput
      datetime_gte: _Neo4jDateTimeInput
      localtime: _Neo4jLocalTimeInput
      localtime_not: _Neo4jLocalTimeInput
      localtime_in: [_Neo4jLocalTimeInput!]
      localtime_not_in: [_Neo4jLocalTimeInput!]
      localtime_lt: _Neo4jLocalTimeInput
      localtime_lte: _Neo4jLocalTimeInput
      localtime_gt: _Neo4jLocalTimeInput
      localtime_gte: _Neo4jLocalTimeInput
      localdatetime: _Neo4jLocalDateTimeInput
      localdatetime_not: _Neo4jLocalDateTimeInput
      localdatetime_in: [_Neo4jLocalDateTimeInput!]
      localdatetime_not_in: [_Neo4jLocalDateTimeInput!]
      localdatetime_lt: _Neo4jLocalDateTimeInput
      localdatetime_lte: _Neo4jLocalDateTimeInput
      localdatetime_gt: _Neo4jLocalDateTimeInput
      localdatetime_gte: _Neo4jLocalDateTimeInput
      datetimes: [_Neo4jDateTimeInput!]
      datetimes_not: [_Neo4jDateTimeInput!]
      datetimes_lt: [_Neo4jDateTimeInput!]
      datetimes_lte: [_Neo4jDateTimeInput!]
      datetimes_gt: [_Neo4jDateTimeInput!]
      datetimes_gte: [_Neo4jDateTimeInput!]
      location: _Neo4jPointInput
      location_not: _Neo4jPointInput
      location_distance: _Neo4jPointDistanceFilter
      location_distance_lt: _Neo4jPointDistanceFilter
      location_distance_lte: _Neo4jPointDistanceFilter
      location_distance_gt: _Neo4jPointDistanceFilter
      location_distance_gte: _Neo4jPointDistanceFilter
      Movie: _MovieFilter
    }
    type _AddUserRatedPayload
      @relation(name: "RATED", from: "User", to: "Movie") {
      """
      Field for the User node this RATED [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      from: User
      """
      Field for the Movie node this RATED [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      to: Movie
      currentUserId: String
        @cypher(
          statement: "RETURN $cypherParams.currentUserId AS cypherParamsUserId"
        )
      rating: Int
      ratings: [Int]
      time: _Neo4jTime
      date: _Neo4jDate
      datetime: _Neo4jDateTime
      localtime: _Neo4jLocalTime
      localdatetime: _Neo4jLocalDateTime
      datetimes: [_Neo4jDateTime]
      location: _Neo4jPoint
      """
      Generated field for querying the Neo4j [system id](https://neo4j.com/docs/cypher-manual/current/functions/scalar/#functions-id) of this relationship.
      """
      _id: String
    }
    type _RemoveUserRatedPayload
      @relation(name: "RATED", from: "User", to: "Movie") {
      """
      Field for the User node this RATED [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      from: User
      """
      Field for the Movie node this RATED [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      to: Movie
    }
    type _UpdateUserRatedPayload
      @relation(name: "RATED", from: "User", to: "Movie") {
      """
      Field for the User node this RATED [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      from: User
      """
      Field for the Movie node this RATED [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      to: Movie
      currentUserId: String
        @cypher(
          statement: "RETURN $cypherParams.currentUserId AS cypherParamsUserId"
        )
      rating: Int
      ratings: [Int]
      time: _Neo4jTime
      date: _Neo4jDate
      datetime: _Neo4jDateTime
      localtime: _Neo4jLocalTime
      localdatetime: _Neo4jLocalDateTime
      datetimes: [_Neo4jDateTime]
      location: _Neo4jPoint
      """
      Generated field for querying the Neo4j [system id](https://neo4j.com/docs/cypher-manual/current/functions/scalar/#functions-id) of this relationship.
      """
      _id: String
    }
    type _MergeUserRatedPayload
      @relation(name: "RATED", from: "User", to: "Movie") {
      """
      Field for the User node this RATED [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      from: User
      """
      Field for the Movie node this RATED [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      to: Movie
      currentUserId: String
        @cypher(
          statement: "RETURN $cypherParams.currentUserId AS cypherParamsUserId"
        )
      rating: Int
      ratings: [Int]
      time: _Neo4jTime
      date: _Neo4jDate
      datetime: _Neo4jDateTime
      localtime: _Neo4jLocalTime
      localdatetime: _Neo4jLocalDateTime
      datetimes: [_Neo4jDateTime]
      location: _Neo4jPoint
      """
      Generated field for querying the Neo4j [system id](https://neo4j.com/docs/cypher-manual/current/functions/scalar/#functions-id) of this relationship.
      """
      _id: String
    }
    type _UserRatedCustomFrom
      @relation(name: "RATED_CUSTOM_FROM", from: "User", to: "Movie") {
      currentUserId(strArg: String): String
        @cypher(
          statement: "RETURN $cypherParams.currentUserId AS cypherParamsUserId"
        )
      rating: Int
      ratings: [Int]
      time: _Neo4jTime
      date: _Neo4jDate
      datetime: _Neo4jDateTime
      localtime: _Neo4jLocalTime
      localdatetime: _Neo4jLocalDateTime
      datetimes: [_Neo4jDateTime]
      location: _Neo4jPoint
      """
      Generated field for querying the Neo4j [system id](https://neo4j.com/docs/cypher-manual/current/functions/scalar/#functions-id) of this relationship.
      """
      _id: String
      """
      Field for the Movie node this RATED_CUSTOM_FROM [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      Movie: Movie
    }
    input _UserRatedCustomFromFilter {
      AND: [_UserRatedCustomFromFilter!]
      OR: [_UserRatedCustomFromFilter!]
      rating: Int
      rating_not: Int
      rating_in: [Int!]
      rating_not_in: [Int!]
      rating_lt: Int
      rating_lte: Int
      rating_gt: Int
      rating_gte: Int
      ratings: [Int!]
      ratings_not: [Int!]
      ratings_lt: [Int!]
      ratings_lte: [Int!]
      ratings_gt: [Int!]
      ratings_gte: [Int!]
      time: _Neo4jTimeInput
      time_not: _Neo4jTimeInput
      time_in: [_Neo4jTimeInput!]
      time_not_in: [_Neo4jTimeInput!]
      time_lt: _Neo4jTimeInput
      time_lte: _Neo4jTimeInput
      time_gt: _Neo4jTimeInput
      time_gte: _Neo4jTimeInput
      date: _Neo4jDateInput
      date_not: _Neo4jDateInput
      date_in: [_Neo4jDateInput!]
      date_not_in: [_Neo4jDateInput!]
      date_lt: _Neo4jDateInput
      date_lte: _Neo4jDateInput
      date_gt: _Neo4jDateInput
      date_gte: _Neo4jDateInput
      datetime: _Neo4jDateTimeInput
      datetime_not: _Neo4jDateTimeInput
      datetime_in: [_Neo4jDateTimeInput!]
      datetime_not_in: [_Neo4jDateTimeInput!]
      datetime_lt: _Neo4jDateTimeInput
      datetime_lte: _Neo4jDateTimeInput
      datetime_gt: _Neo4jDateTimeInput
      datetime_gte: _Neo4jDateTimeInput
      localtime: _Neo4jLocalTimeInput
      localtime_not: _Neo4jLocalTimeInput
      localtime_in: [_Neo4jLocalTimeInput!]
      localtime_not_in: [_Neo4jLocalTimeInput!]
      localtime_lt: _Neo4jLocalTimeInput
      localtime_lte: _Neo4jLocalTimeInput
      localtime_gt: _Neo4jLocalTimeInput
      localtime_gte: _Neo4jLocalTimeInput
      localdatetime: _Neo4jLocalDateTimeInput
      localdatetime_not: _Neo4jLocalDateTimeInput
      localdatetime_in: [_Neo4jLocalDateTimeInput!]
      localdatetime_not_in: [_Neo4jLocalDateTimeInput!]
      localdatetime_lt: _Neo4jLocalDateTimeInput
      localdatetime_lte: _Neo4jLocalDateTimeInput
      localdatetime_gt: _Neo4jLocalDateTimeInput
      localdatetime_gte: _Neo4jLocalDateTimeInput
      datetimes: [_Neo4jDateTimeInput!]
      datetimes_not: [_Neo4jDateTimeInput!]
      datetimes_lt: [_Neo4jDateTimeInput!]
      datetimes_lte: [_Neo4jDateTimeInput!]
      datetimes_gt: [_Neo4jDateTimeInput!]
      datetimes_gte: [_Neo4jDateTimeInput!]
      location: _Neo4jPointInput
      location_not: _Neo4jPointInput
      location_distance: _Neo4jPointDistanceFilter
      location_distance_lt: _Neo4jPointDistanceFilter
      location_distance_lte: _Neo4jPointDistanceFilter
      location_distance_gt: _Neo4jPointDistanceFilter
      location_distance_gte: _Neo4jPointDistanceFilter
      Movie: _MovieFilter
    }
    type _AddUserRatedCustomFromPayload
      @relation(name: "RATED_CUSTOM_FROM", from: "User", to: "Movie") {
      """
      Field for the User node this RATED_CUSTOM_FROM [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      ratedBy: User
      """
      Field for the Movie node this RATED_CUSTOM_FROM [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      to: Movie
      currentUserId: String
        @cypher(
          statement: "RETURN $cypherParams.currentUserId AS cypherParamsUserId"
        )
      rating: Int
      ratings: [Int]
      time: _Neo4jTime
      date: _Neo4jDate
      datetime: _Neo4jDateTime
      localtime: _Neo4jLocalTime
      localdatetime: _Neo4jLocalDateTime
      datetimes: [_Neo4jDateTime]
      location: _Neo4jPoint
      """
      Generated field for querying the Neo4j [system id](https://neo4j.com/docs/cypher-manual/current/functions/scalar/#functions-id) of this relationship.
      """
      _id: String
    }
    type _RemoveUserRatedCustomFromPayload
      @relation(name: "RATED_CUSTOM_FROM", from: "User", to: "Movie") {
      """
      Field for the User node this RATED_CUSTOM_FROM [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      ratedBy: User
      """
      Field for the Movie node this RATED_CUSTOM_FROM [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      to: Movie
    }
    type _UpdateUserRatedCustomFromPayload
      @relation(name: "RATED_CUSTOM_FROM", from: "User", to: "Movie") {
      """
      Field for the User node this RATED_CUSTOM_FROM [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      ratedBy: User
      """
      Field for the Movie node this RATED_CUSTOM_FROM [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      to: Movie
      currentUserId: String
        @cypher(
          statement: "RETURN $cypherParams.currentUserId AS cypherParamsUserId"
        )
      rating: Int
      ratings: [Int]
      time: _Neo4jTime
      date: _Neo4jDate
      datetime: _Neo4jDateTime
      localtime: _Neo4jLocalTime
      localdatetime: _Neo4jLocalDateTime
      datetimes: [_Neo4jDateTime]
      location: _Neo4jPoint
      """
      Generated field for querying the Neo4j [system id](https://neo4j.com/docs/cypher-manual/current/functions/scalar/#functions-id) of this relationship.
      """
      _id: String
    }
    type _MergeUserRatedCustomFromPayload
      @relation(name: "RATED_CUSTOM_FROM", from: "User", to: "Movie") {
      """
      Field for the User node this RATED_CUSTOM_FROM [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      ratedBy: User
      """
      Field for the Movie node this RATED_CUSTOM_FROM [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      to: Movie
      currentUserId: String
        @cypher(
          statement: "RETURN $cypherParams.currentUserId AS cypherParamsUserId"
        )
      rating: Int
      ratings: [Int]
      time: _Neo4jTime
      date: _Neo4jDate
      datetime: _Neo4jDateTime
      localtime: _Neo4jLocalTime
      localdatetime: _Neo4jLocalDateTime
      datetimes: [_Neo4jDateTime]
      location: _Neo4jPoint
      """
      Generated field for querying the Neo4j [system id](https://neo4j.com/docs/cypher-manual/current/functions/scalar/#functions-id) of this relationship.
      """
      _id: String
    }
    type _UserRatedCustomTo
      @relation(name: "RATED_CUSTOM_TO", from: "User", to: "Movie") {
      currentUserId(strArg: String): String
        @cypher(
          statement: "RETURN $cypherParams.currentUserId AS cypherParamsUserId"
        )
      rating: Int
      ratings: [Int]
      time: _Neo4jTime
      date: _Neo4jDate
      datetime: _Neo4jDateTime
      localtime: _Neo4jLocalTime
      localdatetime: _Neo4jLocalDateTime
      datetimes: [_Neo4jDateTime]
      location: _Neo4jPoint
      """
      Generated field for querying the Neo4j [system id](https://neo4j.com/docs/cypher-manual/current/functions/scalar/#functions-id) of this relationship.
      """
      _id: String
      """
      Field for the Movie node this RATED_CUSTOM_TO [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      movie: Movie
    }
    input _UserRatedCustomToFilter {
      AND: [_UserRatedCustomToFilter!]
      OR: [_UserRatedCustomToFilter!]
      rating: Int
      rating_not: Int
      rating_in: [Int!]
      rating_not_in: [Int!]
      rating_lt: Int
      rating_lte: Int
      rating_gt: Int
      rating_gte: Int
      ratings: [Int!]
      ratings_not: [Int!]
      ratings_lt: [Int!]
      ratings_lte: [Int!]
      ratings_gt: [Int!]
      ratings_gte: [Int!]
      time: _Neo4jTimeInput
      time_not: _Neo4jTimeInput
      time_in: [_Neo4jTimeInput!]
      time_not_in: [_Neo4jTimeInput!]
      time_lt: _Neo4jTimeInput
      time_lte: _Neo4jTimeInput
      time_gt: _Neo4jTimeInput
      time_gte: _Neo4jTimeInput
      date: _Neo4jDateInput
      date_not: _Neo4jDateInput
      date_in: [_Neo4jDateInput!]
      date_not_in: [_Neo4jDateInput!]
      date_lt: _Neo4jDateInput
      date_lte: _Neo4jDateInput
      date_gt: _Neo4jDateInput
      date_gte: _Neo4jDateInput
      datetime: _Neo4jDateTimeInput
      datetime_not: _Neo4jDateTimeInput
      datetime_in: [_Neo4jDateTimeInput!]
      datetime_not_in: [_Neo4jDateTimeInput!]
      datetime_lt: _Neo4jDateTimeInput
      datetime_lte: _Neo4jDateTimeInput
      datetime_gt: _Neo4jDateTimeInput
      datetime_gte: _Neo4jDateTimeInput
      localtime: _Neo4jLocalTimeInput
      localtime_not: _Neo4jLocalTimeInput
      localtime_in: [_Neo4jLocalTimeInput!]
      localtime_not_in: [_Neo4jLocalTimeInput!]
      localtime_lt: _Neo4jLocalTimeInput
      localtime_lte: _Neo4jLocalTimeInput
      localtime_gt: _Neo4jLocalTimeInput
      localtime_gte: _Neo4jLocalTimeInput
      localdatetime: _Neo4jLocalDateTimeInput
      localdatetime_not: _Neo4jLocalDateTimeInput
      localdatetime_in: [_Neo4jLocalDateTimeInput!]
      localdatetime_not_in: [_Neo4jLocalDateTimeInput!]
      localdatetime_lt: _Neo4jLocalDateTimeInput
      localdatetime_lte: _Neo4jLocalDateTimeInput
      localdatetime_gt: _Neo4jLocalDateTimeInput
      localdatetime_gte: _Neo4jLocalDateTimeInput
      datetimes: [_Neo4jDateTimeInput!]
      datetimes_not: [_Neo4jDateTimeInput!]
      datetimes_lt: [_Neo4jDateTimeInput!]
      datetimes_lte: [_Neo4jDateTimeInput!]
      datetimes_gt: [_Neo4jDateTimeInput!]
      datetimes_gte: [_Neo4jDateTimeInput!]
      location: _Neo4jPointInput
      location_not: _Neo4jPointInput
      location_distance: _Neo4jPointDistanceFilter
      location_distance_lt: _Neo4jPointDistanceFilter
      location_distance_lte: _Neo4jPointDistanceFilter
      location_distance_gt: _Neo4jPointDistanceFilter
      location_distance_gte: _Neo4jPointDistanceFilter
      movie: _MovieFilter
    }
    type _AddUserRatedCustomToPayload
      @relation(name: "RATED_CUSTOM_TO", from: "User", to: "Movie") {
      """
      Field for the User node this RATED_CUSTOM_TO [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      from: User
      """
      Field for the Movie node this RATED_CUSTOM_TO [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      movie: Movie
      currentUserId: String
        @cypher(
          statement: "RETURN $cypherParams.currentUserId AS cypherParamsUserId"
        )
      rating: Int
      ratings: [Int]
      time: _Neo4jTime
      date: _Neo4jDate
      datetime: _Neo4jDateTime
      localtime: _Neo4jLocalTime
      localdatetime: _Neo4jLocalDateTime
      datetimes: [_Neo4jDateTime]
      location: _Neo4jPoint
      """
      Generated field for querying the Neo4j [system id](https://neo4j.com/docs/cypher-manual/current/functions/scalar/#functions-id) of this relationship.
      """
      _id: String
    }
    type _RemoveUserRatedCustomToPayload
      @relation(name: "RATED_CUSTOM_TO", from: "User", to: "Movie") {
      """
      Field for the User node this RATED_CUSTOM_TO [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      from: User
      """
      Field for the Movie node this RATED_CUSTOM_TO [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      movie: Movie
    }
    type _UpdateUserRatedCustomToPayload
      @relation(name: "RATED_CUSTOM_TO", from: "User", to: "Movie") {
      """
      Field for the User node this RATED_CUSTOM_TO [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      from: User
      """
      Field for the Movie node this RATED_CUSTOM_TO [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      movie: Movie
      currentUserId: String
        @cypher(
          statement: "RETURN $cypherParams.currentUserId AS cypherParamsUserId"
        )
      rating: Int
      ratings: [Int]
      time: _Neo4jTime
      date: _Neo4jDate
      datetime: _Neo4jDateTime
      localtime: _Neo4jLocalTime
      localdatetime: _Neo4jLocalDateTime
      datetimes: [_Neo4jDateTime]
      location: _Neo4jPoint
      """
      Generated field for querying the Neo4j [system id](https://neo4j.com/docs/cypher-manual/current/functions/scalar/#functions-id) of this relationship.
      """
      _id: String
    }
    type _MergeUserRatedCustomToPayload
      @relation(name: "RATED_CUSTOM_TO", from: "User", to: "Movie") {
      """
      Field for the User node this RATED_CUSTOM_TO [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      from: User
      """
      Field for the Movie node this RATED_CUSTOM_TO [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      movie: Movie
      currentUserId: String
        @cypher(
          statement: "RETURN $cypherParams.currentUserId AS cypherParamsUserId"
        )
      rating: Int
      ratings: [Int]
      time: _Neo4jTime
      date: _Neo4jDate
      datetime: _Neo4jDateTime
      localtime: _Neo4jLocalTime
      localdatetime: _Neo4jLocalDateTime
      datetimes: [_Neo4jDateTime]
      location: _Neo4jPoint
      """
      Generated field for querying the Neo4j [system id](https://neo4j.com/docs/cypher-manual/current/functions/scalar/#functions-id) of this relationship.
      """
      _id: String
    }
    type _UserRatedCustomFromTo
      @relation(name: "RATED_CUSTOM_FROM_TO", from: "User", to: "Movie") {
      from: String
      currentUserId(strArg: String): String
        @cypher(
          statement: "RETURN $cypherParams.currentUserId AS cypherParamsUserId"
        )
      rating: Int
      ratings: [Int]
      time: _Neo4jTime
      date: _Neo4jDate
      datetime: _Neo4jDateTime
      localtime: _Neo4jLocalTime
      localdatetime: _Neo4jLocalDateTime
      datetimes: [_Neo4jDateTime]
      location: _Neo4jPoint
      """
      Generated field for querying the Neo4j [system id](https://neo4j.com/docs/cypher-manual/current/functions/scalar/#functions-id) of this relationship.
      """
      _id: String
      to: Int
      """
      Field for the Movie node this RATED_CUSTOM_FROM_TO [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      movie: Movie
    }
    input _UserRatedCustomFromToFilter {
      AND: [_UserRatedCustomFromToFilter!]
      OR: [_UserRatedCustomFromToFilter!]
      from: String
      from_not: String
      from_in: [String!]
      from_not_in: [String!]
      from_regexp: String
      from_contains: String
      from_not_contains: String
      from_starts_with: String
      from_not_starts_with: String
      from_ends_with: String
      from_not_ends_with: String
      rating: Int
      rating_not: Int
      rating_in: [Int!]
      rating_not_in: [Int!]
      rating_lt: Int
      rating_lte: Int
      rating_gt: Int
      rating_gte: Int
      ratings: [Int!]
      ratings_not: [Int!]
      ratings_lt: [Int!]
      ratings_lte: [Int!]
      ratings_gt: [Int!]
      ratings_gte: [Int!]
      time: _Neo4jTimeInput
      time_not: _Neo4jTimeInput
      time_in: [_Neo4jTimeInput!]
      time_not_in: [_Neo4jTimeInput!]
      time_lt: _Neo4jTimeInput
      time_lte: _Neo4jTimeInput
      time_gt: _Neo4jTimeInput
      time_gte: _Neo4jTimeInput
      date: _Neo4jDateInput
      date_not: _Neo4jDateInput
      date_in: [_Neo4jDateInput!]
      date_not_in: [_Neo4jDateInput!]
      date_lt: _Neo4jDateInput
      date_lte: _Neo4jDateInput
      date_gt: _Neo4jDateInput
      date_gte: _Neo4jDateInput
      datetime: _Neo4jDateTimeInput
      datetime_not: _Neo4jDateTimeInput
      datetime_in: [_Neo4jDateTimeInput!]
      datetime_not_in: [_Neo4jDateTimeInput!]
      datetime_lt: _Neo4jDateTimeInput
      datetime_lte: _Neo4jDateTimeInput
      datetime_gt: _Neo4jDateTimeInput
      datetime_gte: _Neo4jDateTimeInput
      localtime: _Neo4jLocalTimeInput
      localtime_not: _Neo4jLocalTimeInput
      localtime_in: [_Neo4jLocalTimeInput!]
      localtime_not_in: [_Neo4jLocalTimeInput!]
      localtime_lt: _Neo4jLocalTimeInput
      localtime_lte: _Neo4jLocalTimeInput
      localtime_gt: _Neo4jLocalTimeInput
      localtime_gte: _Neo4jLocalTimeInput
      localdatetime: _Neo4jLocalDateTimeInput
      localdatetime_not: _Neo4jLocalDateTimeInput
      localdatetime_in: [_Neo4jLocalDateTimeInput!]
      localdatetime_not_in: [_Neo4jLocalDateTimeInput!]
      localdatetime_lt: _Neo4jLocalDateTimeInput
      localdatetime_lte: _Neo4jLocalDateTimeInput
      localdatetime_gt: _Neo4jLocalDateTimeInput
      localdatetime_gte: _Neo4jLocalDateTimeInput
      datetimes: [_Neo4jDateTimeInput!]
      datetimes_not: [_Neo4jDateTimeInput!]
      datetimes_lt: [_Neo4jDateTimeInput!]
      datetimes_lte: [_Neo4jDateTimeInput!]
      datetimes_gt: [_Neo4jDateTimeInput!]
      datetimes_gte: [_Neo4jDateTimeInput!]
      location: _Neo4jPointInput
      location_not: _Neo4jPointInput
      location_distance: _Neo4jPointDistanceFilter
      location_distance_lt: _Neo4jPointDistanceFilter
      location_distance_lte: _Neo4jPointDistanceFilter
      location_distance_gt: _Neo4jPointDistanceFilter
      location_distance_gte: _Neo4jPointDistanceFilter
      to: Int
      to_not: Int
      to_in: [Int!]
      to_not_in: [Int!]
      to_lt: Int
      to_lte: Int
      to_gt: Int
      to_gte: Int
      movie: _MovieFilter
    }
    type _AddUserRatedCustomFromToPayload
      @relation(name: "RATED_CUSTOM_FROM_TO", from: "User", to: "Movie") {
      """
      Field for the User node this RATED_CUSTOM_FROM_TO [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      ratedBy: User
      """
      Field for the Movie node this RATED_CUSTOM_FROM_TO [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      movie: Movie
      from: String
      currentUserId: String
        @cypher(
          statement: "RETURN $cypherParams.currentUserId AS cypherParamsUserId"
        )
      rating: Int
      ratings: [Int]
      time: _Neo4jTime
      date: _Neo4jDate
      datetime: _Neo4jDateTime
      localtime: _Neo4jLocalTime
      localdatetime: _Neo4jLocalDateTime
      datetimes: [_Neo4jDateTime]
      location: _Neo4jPoint
      """
      Generated field for querying the Neo4j [system id](https://neo4j.com/docs/cypher-manual/current/functions/scalar/#functions-id) of this relationship.
      """
      _id: String
      to: Int
    }
    type _RemoveUserRatedCustomFromToPayload
      @relation(name: "RATED_CUSTOM_FROM_TO", from: "User", to: "Movie") {
      """
      Field for the User node this RATED_CUSTOM_FROM_TO [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      ratedBy: User
      """
      Field for the Movie node this RATED_CUSTOM_FROM_TO [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      movie: Movie
    }
    type _UpdateUserRatedCustomFromToPayload
      @relation(name: "RATED_CUSTOM_FROM_TO", from: "User", to: "Movie") {
      """
      Field for the User node this RATED_CUSTOM_FROM_TO [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      ratedBy: User
      """
      Field for the Movie node this RATED_CUSTOM_FROM_TO [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      movie: Movie
      from: String
      currentUserId: String
        @cypher(
          statement: "RETURN $cypherParams.currentUserId AS cypherParamsUserId"
        )
      rating: Int
      ratings: [Int]
      time: _Neo4jTime
      date: _Neo4jDate
      datetime: _Neo4jDateTime
      localtime: _Neo4jLocalTime
      localdatetime: _Neo4jLocalDateTime
      datetimes: [_Neo4jDateTime]
      location: _Neo4jPoint
      """
      Generated field for querying the Neo4j [system id](https://neo4j.com/docs/cypher-manual/current/functions/scalar/#functions-id) of this relationship.
      """
      _id: String
      to: Int
    }
    type _MergeUserRatedCustomFromToPayload
      @relation(name: "RATED_CUSTOM_FROM_TO", from: "User", to: "Movie") {
      """
      Field for the User node this RATED_CUSTOM_FROM_TO [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      ratedBy: User
      """
      Field for the Movie node this RATED_CUSTOM_FROM_TO [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      movie: Movie
      from: String
      currentUserId: String
        @cypher(
          statement: "RETURN $cypherParams.currentUserId AS cypherParamsUserId"
        )
      rating: Int
      ratings: [Int]
      time: _Neo4jTime
      date: _Neo4jDate
      datetime: _Neo4jDateTime
      localtime: _Neo4jLocalTime
      localdatetime: _Neo4jLocalDateTime
      datetimes: [_Neo4jDateTime]
      location: _Neo4jPoint
      """
      Generated field for querying the Neo4j [system id](https://neo4j.com/docs/cypher-manual/current/functions/scalar/#functions-id) of this relationship.
      """
      _id: String
      to: Int
    }
    type _UserFriendsDirections
      @relation(name: "FRIEND_OF", from: "User", to: "User") {
      """
      Field for the User node this FRIEND_OF [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      from(
        since: Int
        time: _Neo4jTimeInput
        date: _Neo4jDateInput
        datetime: _Neo4jDateTimeInput
        localtime: _Neo4jLocalTimeInput
        localdatetime: _Neo4jLocalDateTimeInput
        location: _Neo4jPointInput
        ratings: [String]
        datetimes: [_Neo4jDateTimeInput]
        first: Int
        offset: Int
        orderBy: [_FriendOfOrdering]
        filter: _FriendOfFilter
      ): [_UserFriends]
      """
      Field for the User node this FRIEND_OF [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      to(
        since: Int
        time: _Neo4jTimeInput
        date: _Neo4jDateInput
        datetime: _Neo4jDateTimeInput
        localtime: _Neo4jLocalTimeInput
        localdatetime: _Neo4jLocalDateTimeInput
        location: _Neo4jPointInput
        ratings: [String]
        datetimes: [_Neo4jDateTimeInput]
        first: Int
        offset: Int
        orderBy: [_FriendOfOrdering]
        filter: _FriendOfFilter
      ): [_UserFriends]
    }
    type _UserFriends @relation(name: "FRIEND_OF", from: "User", to: "User") {
      currentUserId: String
        @cypher(
          statement: "RETURN $cypherParams.currentUserId AS cypherParamsUserId"
        )
      since: Int
      time: _Neo4jTime
      date: _Neo4jDate
      datetime: _Neo4jDateTime
      ratings: [String]
      datetimes: [_Neo4jDateTime]
      localtime: _Neo4jLocalTime
      localdatetime: _Neo4jLocalDateTime
      location: _Neo4jPoint
      """
      Generated field for querying the Neo4j [system id](https://neo4j.com/docs/cypher-manual/current/functions/scalar/#functions-id) of this relationship.
      """
      _id: String
      """
      Field for the User node this FRIEND_OF [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      User: User
    }
    input _FriendOfDirectionsFilter {
      from: _FriendOfFilter
      to: _FriendOfFilter
    }
    input _FriendOfFilter {
      AND: [_FriendOfFilter!]
      OR: [_FriendOfFilter!]
      since: Int
      since_not: Int
      since_in: [Int!]
      since_not_in: [Int!]
      since_lt: Int
      since_lte: Int
      since_gt: Int
      since_gte: Int
      time: _Neo4jTimeInput
      time_not: _Neo4jTimeInput
      time_in: [_Neo4jTimeInput!]
      time_not_in: [_Neo4jTimeInput!]
      time_lt: _Neo4jTimeInput
      time_lte: _Neo4jTimeInput
      time_gt: _Neo4jTimeInput
      time_gte: _Neo4jTimeInput
      date: _Neo4jDateInput
      date_not: _Neo4jDateInput
      date_in: [_Neo4jDateInput!]
      date_not_in: [_Neo4jDateInput!]
      date_lt: _Neo4jDateInput
      date_lte: _Neo4jDateInput
      date_gt: _Neo4jDateInput
      date_gte: _Neo4jDateInput
      datetime: _Neo4jDateTimeInput
      datetime_not: _Neo4jDateTimeInput
      datetime_in: [_Neo4jDateTimeInput!]
      datetime_not_in: [_Neo4jDateTimeInput!]
      datetime_lt: _Neo4jDateTimeInput
      datetime_lte: _Neo4jDateTimeInput
      datetime_gt: _Neo4jDateTimeInput
      datetime_gte: _Neo4jDateTimeInput
      ratings: [String!]
      ratings_not: [String!]
      ratings_regexp: String
      ratings_contains: [String!]
      ratings_not_contains: [String!]
      ratings_starts_with: [String!]
      ratings_not_starts_with: [String!]
      ratings_ends_with: [String!]
      ratings_not_ends_with: [String!]
      datetimes: [_Neo4jDateTimeInput!]
      datetimes_not: [_Neo4jDateTimeInput!]
      datetimes_lt: [_Neo4jDateTimeInput!]
      datetimes_lte: [_Neo4jDateTimeInput!]
      datetimes_gt: [_Neo4jDateTimeInput!]
      datetimes_gte: [_Neo4jDateTimeInput!]
      localtime: _Neo4jLocalTimeInput
      localtime_not: _Neo4jLocalTimeInput
      localtime_in: [_Neo4jLocalTimeInput!]
      localtime_not_in: [_Neo4jLocalTimeInput!]
      localtime_lt: _Neo4jLocalTimeInput
      localtime_lte: _Neo4jLocalTimeInput
      localtime_gt: _Neo4jLocalTimeInput
      localtime_gte: _Neo4jLocalTimeInput
      localdatetime: _Neo4jLocalDateTimeInput
      localdatetime_not: _Neo4jLocalDateTimeInput
      localdatetime_in: [_Neo4jLocalDateTimeInput!]
      localdatetime_not_in: [_Neo4jLocalDateTimeInput!]
      localdatetime_lt: _Neo4jLocalDateTimeInput
      localdatetime_lte: _Neo4jLocalDateTimeInput
      localdatetime_gt: _Neo4jLocalDateTimeInput
      localdatetime_gte: _Neo4jLocalDateTimeInput
      location: _Neo4jPointInput
      location_not: _Neo4jPointInput
      location_distance: _Neo4jPointDistanceFilter
      location_distance_lt: _Neo4jPointDistanceFilter
      location_distance_lte: _Neo4jPointDistanceFilter
      location_distance_gt: _Neo4jPointDistanceFilter
      location_distance_gte: _Neo4jPointDistanceFilter
      User: _UserFilter
    }
    enum _FriendOfOrdering {
      currentUserId_asc
      currentUserId_desc
      since_asc
      since_desc
      time_asc
      time_desc
      date_asc
      date_desc
      datetime_asc
      datetime_desc
      localtime_asc
      localtime_desc
      localdatetime_asc
      localdatetime_desc
      _id_asc
      _id_desc
    }
    input _FriendOfInput {
      since: Int
      time: _Neo4jTimeInput
      date: _Neo4jDateInput
      datetime: _Neo4jDateTimeInput
      ratings: [String]
      datetimes: [_Neo4jDateTimeInput]
      localtime: _Neo4jLocalTimeInput
      localdatetime: _Neo4jLocalDateTimeInput
      location: _Neo4jPointInput
    }
    type _AddUserFriendsPayload
      @relation(name: "FRIEND_OF", from: "User", to: "User") {
      """
      Field for the User node this FRIEND_OF [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      from: User
      """
      Field for the User node this FRIEND_OF [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      to: User
      currentUserId: String
        @cypher(
          statement: "RETURN $cypherParams.currentUserId AS cypherParamsUserId"
        )
      since: Int
      time: _Neo4jTime
      date: _Neo4jDate
      datetime: _Neo4jDateTime
      ratings: [String]
      datetimes: [_Neo4jDateTime]
      localtime: _Neo4jLocalTime
      localdatetime: _Neo4jLocalDateTime
      location: _Neo4jPoint
      """
      Generated field for querying the Neo4j [system id](https://neo4j.com/docs/cypher-manual/current/functions/scalar/#functions-id) of this relationship.
      """
      _id: String
    }
    type _RemoveUserFriendsPayload
      @relation(name: "FRIEND_OF", from: "User", to: "User") {
      """
      Field for the User node this FRIEND_OF [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      from: User
      """
      Field for the User node this FRIEND_OF [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      to: User
    }
    type _UpdateUserFriendsPayload
      @relation(name: "FRIEND_OF", from: "User", to: "User") {
      """
      Field for the User node this FRIEND_OF [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      from: User
      """
      Field for the User node this FRIEND_OF [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      to: User
      currentUserId: String
        @cypher(
          statement: "RETURN $cypherParams.currentUserId AS cypherParamsUserId"
        )
      since: Int
      time: _Neo4jTime
      date: _Neo4jDate
      datetime: _Neo4jDateTime
      ratings: [String]
      datetimes: [_Neo4jDateTime]
      localtime: _Neo4jLocalTime
      localdatetime: _Neo4jLocalDateTime
      location: _Neo4jPoint
      """
      Generated field for querying the Neo4j [system id](https://neo4j.com/docs/cypher-manual/current/functions/scalar/#functions-id) of this relationship.
      """
      _id: String
    }
    type _MergeUserFriendsPayload
      @relation(name: "FRIEND_OF", from: "User", to: "User") {
      """
      Field for the User node this FRIEND_OF [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      from: User
      """
      Field for the User node this FRIEND_OF [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      to: User
      currentUserId: String
        @cypher(
          statement: "RETURN $cypherParams.currentUserId AS cypherParamsUserId"
        )
      since: Int
      time: _Neo4jTime
      date: _Neo4jDate
      datetime: _Neo4jDateTime
      ratings: [String]
      datetimes: [_Neo4jDateTime]
      localtime: _Neo4jLocalTime
      localdatetime: _Neo4jLocalDateTime
      location: _Neo4jPoint
      """
      Generated field for querying the Neo4j [system id](https://neo4j.com/docs/cypher-manual/current/functions/scalar/#functions-id) of this relationship.
      """
      _id: String
    }
    type _UserFriendsCustomFromDirections
      @relation(name: "FRIEND_OF_CUSTOM_FROM", from: "User", to: "User") {
      """
      Field for the User node this FRIEND_OF_CUSTOM_FROM [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      friendedBy(
        since: Int
        time: _Neo4jTimeInput
        date: _Neo4jDateInput
        datetime: _Neo4jDateTimeInput
        localtime: _Neo4jLocalTimeInput
        localdatetime: _Neo4jLocalDateTimeInput
        location: _Neo4jPointInput
        ratings: [String]
        datetimes: [_Neo4jDateTimeInput]
        first: Int
        offset: Int
        orderBy: [_FriendOfCustomFromOrdering]
        filter: _FriendOfCustomFromFilter
      ): [_UserFriendsCustomFrom]
      """
      Field for the User node this FRIEND_OF_CUSTOM_FROM [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      to(
        since: Int
        time: _Neo4jTimeInput
        date: _Neo4jDateInput
        datetime: _Neo4jDateTimeInput
        localtime: _Neo4jLocalTimeInput
        localdatetime: _Neo4jLocalDateTimeInput
        location: _Neo4jPointInput
        ratings: [String]
        datetimes: [_Neo4jDateTimeInput]
        first: Int
        offset: Int
        orderBy: [_FriendOfCustomFromOrdering]
        filter: _FriendOfCustomFromFilter
      ): [_UserFriendsCustomFrom]
    }
    type _UserFriendsCustomFrom
      @relation(name: "FRIEND_OF_CUSTOM_FROM", from: "User", to: "User") {
      currentUserId: String
        @cypher(
          statement: "RETURN $cypherParams.currentUserId AS cypherParamsUserId"
        )
      since: Int
      time: _Neo4jTime
      date: _Neo4jDate
      datetime: _Neo4jDateTime
      ratings: [String]
      datetimes: [_Neo4jDateTime]
      localtime: _Neo4jLocalTime
      localdatetime: _Neo4jLocalDateTime
      location: _Neo4jPoint
      """
      Generated field for querying the Neo4j [system id](https://neo4j.com/docs/cypher-manual/current/functions/scalar/#functions-id) of this relationship.
      """
      _id: String
      """
      Field for the User node this FRIEND_OF_CUSTOM_FROM [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      User: User
    }
    input _FriendOfCustomFromDirectionsFilter {
      friendedBy: _FriendOfCustomFromFilter
      to: _FriendOfCustomFromFilter
    }
    input _FriendOfCustomFromFilter {
      AND: [_FriendOfCustomFromFilter!]
      OR: [_FriendOfCustomFromFilter!]
      since: Int
      since_not: Int
      since_in: [Int!]
      since_not_in: [Int!]
      since_lt: Int
      since_lte: Int
      since_gt: Int
      since_gte: Int
      time: _Neo4jTimeInput
      time_not: _Neo4jTimeInput
      time_in: [_Neo4jTimeInput!]
      time_not_in: [_Neo4jTimeInput!]
      time_lt: _Neo4jTimeInput
      time_lte: _Neo4jTimeInput
      time_gt: _Neo4jTimeInput
      time_gte: _Neo4jTimeInput
      date: _Neo4jDateInput
      date_not: _Neo4jDateInput
      date_in: [_Neo4jDateInput!]
      date_not_in: [_Neo4jDateInput!]
      date_lt: _Neo4jDateInput
      date_lte: _Neo4jDateInput
      date_gt: _Neo4jDateInput
      date_gte: _Neo4jDateInput
      datetime: _Neo4jDateTimeInput
      datetime_not: _Neo4jDateTimeInput
      datetime_in: [_Neo4jDateTimeInput!]
      datetime_not_in: [_Neo4jDateTimeInput!]
      datetime_lt: _Neo4jDateTimeInput
      datetime_lte: _Neo4jDateTimeInput
      datetime_gt: _Neo4jDateTimeInput
      datetime_gte: _Neo4jDateTimeInput
      ratings: [String!]
      ratings_not: [String!]
      ratings_regexp: String
      ratings_contains: [String!]
      ratings_not_contains: [String!]
      ratings_starts_with: [String!]
      ratings_not_starts_with: [String!]
      ratings_ends_with: [String!]
      ratings_not_ends_with: [String!]
      datetimes: [_Neo4jDateTimeInput!]
      datetimes_not: [_Neo4jDateTimeInput!]
      datetimes_lt: [_Neo4jDateTimeInput!]
      datetimes_lte: [_Neo4jDateTimeInput!]
      datetimes_gt: [_Neo4jDateTimeInput!]
      datetimes_gte: [_Neo4jDateTimeInput!]
      localtime: _Neo4jLocalTimeInput
      localtime_not: _Neo4jLocalTimeInput
      localtime_in: [_Neo4jLocalTimeInput!]
      localtime_not_in: [_Neo4jLocalTimeInput!]
      localtime_lt: _Neo4jLocalTimeInput
      localtime_lte: _Neo4jLocalTimeInput
      localtime_gt: _Neo4jLocalTimeInput
      localtime_gte: _Neo4jLocalTimeInput
      localdatetime: _Neo4jLocalDateTimeInput
      localdatetime_not: _Neo4jLocalDateTimeInput
      localdatetime_in: [_Neo4jLocalDateTimeInput!]
      localdatetime_not_in: [_Neo4jLocalDateTimeInput!]
      localdatetime_lt: _Neo4jLocalDateTimeInput
      localdatetime_lte: _Neo4jLocalDateTimeInput
      localdatetime_gt: _Neo4jLocalDateTimeInput
      localdatetime_gte: _Neo4jLocalDateTimeInput
      location: _Neo4jPointInput
      location_not: _Neo4jPointInput
      location_distance: _Neo4jPointDistanceFilter
      location_distance_lt: _Neo4jPointDistanceFilter
      location_distance_lte: _Neo4jPointDistanceFilter
      location_distance_gt: _Neo4jPointDistanceFilter
      location_distance_gte: _Neo4jPointDistanceFilter
      User: _UserFilter
    }
    enum _FriendOfCustomFromOrdering {
      currentUserId_asc
      currentUserId_desc
      since_asc
      since_desc
      time_asc
      time_desc
      date_asc
      date_desc
      datetime_asc
      datetime_desc
      localtime_asc
      localtime_desc
      localdatetime_asc
      localdatetime_desc
      _id_asc
      _id_desc
    }
    input _FriendOfCustomFromInput {
      since: Int
      time: _Neo4jTimeInput
      date: _Neo4jDateInput
      datetime: _Neo4jDateTimeInput
      ratings: [String]
      datetimes: [_Neo4jDateTimeInput]
      localtime: _Neo4jLocalTimeInput
      localdatetime: _Neo4jLocalDateTimeInput
      location: _Neo4jPointInput
    }
    type _AddUserFriendsCustomFromPayload
      @relation(name: "FRIEND_OF_CUSTOM_FROM", from: "User", to: "User") {
      """
      Field for the User node this FRIEND_OF_CUSTOM_FROM [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      friendedBy: User
      """
      Field for the User node this FRIEND_OF_CUSTOM_FROM [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      to: User
      currentUserId: String
        @cypher(
          statement: "RETURN $cypherParams.currentUserId AS cypherParamsUserId"
        )
      since: Int
      time: _Neo4jTime
      date: _Neo4jDate
      datetime: _Neo4jDateTime
      ratings: [String]
      datetimes: [_Neo4jDateTime]
      localtime: _Neo4jLocalTime
      localdatetime: _Neo4jLocalDateTime
      location: _Neo4jPoint
      """
      Generated field for querying the Neo4j [system id](https://neo4j.com/docs/cypher-manual/current/functions/scalar/#functions-id) of this relationship.
      """
      _id: String
    }
    type _RemoveUserFriendsCustomFromPayload
      @relation(name: "FRIEND_OF_CUSTOM_FROM", from: "User", to: "User") {
      """
      Field for the User node this FRIEND_OF_CUSTOM_FROM [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      friendedBy: User
      """
      Field for the User node this FRIEND_OF_CUSTOM_FROM [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      to: User
    }
    type _UpdateUserFriendsCustomFromPayload
      @relation(name: "FRIEND_OF_CUSTOM_FROM", from: "User", to: "User") {
      """
      Field for the User node this FRIEND_OF_CUSTOM_FROM [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      friendedBy: User
      """
      Field for the User node this FRIEND_OF_CUSTOM_FROM [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      to: User
      currentUserId: String
        @cypher(
          statement: "RETURN $cypherParams.currentUserId AS cypherParamsUserId"
        )
      since: Int
      time: _Neo4jTime
      date: _Neo4jDate
      datetime: _Neo4jDateTime
      ratings: [String]
      datetimes: [_Neo4jDateTime]
      localtime: _Neo4jLocalTime
      localdatetime: _Neo4jLocalDateTime
      location: _Neo4jPoint
      """
      Generated field for querying the Neo4j [system id](https://neo4j.com/docs/cypher-manual/current/functions/scalar/#functions-id) of this relationship.
      """
      _id: String
    }
    type _MergeUserFriendsCustomFromPayload
      @relation(name: "FRIEND_OF_CUSTOM_FROM", from: "User", to: "User") {
      """
      Field for the User node this FRIEND_OF_CUSTOM_FROM [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      friendedBy: User
      """
      Field for the User node this FRIEND_OF_CUSTOM_FROM [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      to: User
      currentUserId: String
        @cypher(
          statement: "RETURN $cypherParams.currentUserId AS cypherParamsUserId"
        )
      since: Int
      time: _Neo4jTime
      date: _Neo4jDate
      datetime: _Neo4jDateTime
      ratings: [String]
      datetimes: [_Neo4jDateTime]
      localtime: _Neo4jLocalTime
      localdatetime: _Neo4jLocalDateTime
      location: _Neo4jPoint
      """
      Generated field for querying the Neo4j [system id](https://neo4j.com/docs/cypher-manual/current/functions/scalar/#functions-id) of this relationship.
      """
      _id: String
    }
    type _UserFriendsCustomToDirections
      @relation(name: "FRIEND_OF_CUSTOM_TO", from: "User", to: "User") {
      """
      Field for the User node this FRIEND_OF_CUSTOM_TO [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      from(
        since: Int
        time: _Neo4jTimeInput
        date: _Neo4jDateInput
        datetime: _Neo4jDateTimeInput
        localtime: _Neo4jLocalTimeInput
        localdatetime: _Neo4jLocalDateTimeInput
        location: _Neo4jPointInput
        ratings: [String]
        datetimes: [_Neo4jDateTimeInput]
        first: Int
        offset: Int
        orderBy: [_FriendOfCustomToOrdering]
        filter: _FriendOfCustomToFilter
      ): [_UserFriendsCustomTo]
      """
      Field for the User node this FRIEND_OF_CUSTOM_TO [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      friended(
        since: Int
        time: _Neo4jTimeInput
        date: _Neo4jDateInput
        datetime: _Neo4jDateTimeInput
        localtime: _Neo4jLocalTimeInput
        localdatetime: _Neo4jLocalDateTimeInput
        location: _Neo4jPointInput
        ratings: [String]
        datetimes: [_Neo4jDateTimeInput]
        first: Int
        offset: Int
        orderBy: [_FriendOfCustomToOrdering]
        filter: _FriendOfCustomToFilter
      ): [_UserFriendsCustomTo]
    }
    type _UserFriendsCustomTo
      @relation(name: "FRIEND_OF_CUSTOM_TO", from: "User", to: "User") {
      currentUserId: String
        @cypher(
          statement: "RETURN $cypherParams.currentUserId AS cypherParamsUserId"
        )
      since: Int
      time: _Neo4jTime
      date: _Neo4jDate
      datetime: _Neo4jDateTime
      ratings: [String]
      datetimes: [_Neo4jDateTime]
      localtime: _Neo4jLocalTime
      localdatetime: _Neo4jLocalDateTime
      location: _Neo4jPoint
      """
      Generated field for querying the Neo4j [system id](https://neo4j.com/docs/cypher-manual/current/functions/scalar/#functions-id) of this relationship.
      """
      _id: String
      """
      Field for the User node this FRIEND_OF_CUSTOM_TO [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      User: User
    }
    input _FriendOfCustomToDirectionsFilter {
      from: _FriendOfCustomToFilter
      friended: _FriendOfCustomToFilter
    }
    input _FriendOfCustomToFilter {
      AND: [_FriendOfCustomToFilter!]
      OR: [_FriendOfCustomToFilter!]
      since: Int
      since_not: Int
      since_in: [Int!]
      since_not_in: [Int!]
      since_lt: Int
      since_lte: Int
      since_gt: Int
      since_gte: Int
      time: _Neo4jTimeInput
      time_not: _Neo4jTimeInput
      time_in: [_Neo4jTimeInput!]
      time_not_in: [_Neo4jTimeInput!]
      time_lt: _Neo4jTimeInput
      time_lte: _Neo4jTimeInput
      time_gt: _Neo4jTimeInput
      time_gte: _Neo4jTimeInput
      date: _Neo4jDateInput
      date_not: _Neo4jDateInput
      date_in: [_Neo4jDateInput!]
      date_not_in: [_Neo4jDateInput!]
      date_lt: _Neo4jDateInput
      date_lte: _Neo4jDateInput
      date_gt: _Neo4jDateInput
      date_gte: _Neo4jDateInput
      datetime: _Neo4jDateTimeInput
      datetime_not: _Neo4jDateTimeInput
      datetime_in: [_Neo4jDateTimeInput!]
      datetime_not_in: [_Neo4jDateTimeInput!]
      datetime_lt: _Neo4jDateTimeInput
      datetime_lte: _Neo4jDateTimeInput
      datetime_gt: _Neo4jDateTimeInput
      datetime_gte: _Neo4jDateTimeInput
      ratings: [String!]
      ratings_not: [String!]
      ratings_regexp: String
      ratings_contains: [String!]
      ratings_not_contains: [String!]
      ratings_starts_with: [String!]
      ratings_not_starts_with: [String!]
      ratings_ends_with: [String!]
      ratings_not_ends_with: [String!]
      datetimes: [_Neo4jDateTimeInput!]
      datetimes_not: [_Neo4jDateTimeInput!]
      datetimes_lt: [_Neo4jDateTimeInput!]
      datetimes_lte: [_Neo4jDateTimeInput!]
      datetimes_gt: [_Neo4jDateTimeInput!]
      datetimes_gte: [_Neo4jDateTimeInput!]
      localtime: _Neo4jLocalTimeInput
      localtime_not: _Neo4jLocalTimeInput
      localtime_in: [_Neo4jLocalTimeInput!]
      localtime_not_in: [_Neo4jLocalTimeInput!]
      localtime_lt: _Neo4jLocalTimeInput
      localtime_lte: _Neo4jLocalTimeInput
      localtime_gt: _Neo4jLocalTimeInput
      localtime_gte: _Neo4jLocalTimeInput
      localdatetime: _Neo4jLocalDateTimeInput
      localdatetime_not: _Neo4jLocalDateTimeInput
      localdatetime_in: [_Neo4jLocalDateTimeInput!]
      localdatetime_not_in: [_Neo4jLocalDateTimeInput!]
      localdatetime_lt: _Neo4jLocalDateTimeInput
      localdatetime_lte: _Neo4jLocalDateTimeInput
      localdatetime_gt: _Neo4jLocalDateTimeInput
      localdatetime_gte: _Neo4jLocalDateTimeInput
      location: _Neo4jPointInput
      location_not: _Neo4jPointInput
      location_distance: _Neo4jPointDistanceFilter
      location_distance_lt: _Neo4jPointDistanceFilter
      location_distance_lte: _Neo4jPointDistanceFilter
      location_distance_gt: _Neo4jPointDistanceFilter
      location_distance_gte: _Neo4jPointDistanceFilter
      User: _UserFilter
    }
    enum _FriendOfCustomToOrdering {
      currentUserId_asc
      currentUserId_desc
      since_asc
      since_desc
      time_asc
      time_desc
      date_asc
      date_desc
      datetime_asc
      datetime_desc
      localtime_asc
      localtime_desc
      localdatetime_asc
      localdatetime_desc
      _id_asc
      _id_desc
    }
    input _FriendOfCustomToInput {
      since: Int
      time: _Neo4jTimeInput
      date: _Neo4jDateInput
      datetime: _Neo4jDateTimeInput
      ratings: [String]
      datetimes: [_Neo4jDateTimeInput]
      localtime: _Neo4jLocalTimeInput
      localdatetime: _Neo4jLocalDateTimeInput
      location: _Neo4jPointInput
    }
    type _AddUserFriendsCustomToPayload
      @relation(name: "FRIEND_OF_CUSTOM_TO", from: "User", to: "User") {
      """
      Field for the User node this FRIEND_OF_CUSTOM_TO [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      from: User
      """
      Field for the User node this FRIEND_OF_CUSTOM_TO [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      friended: User
      currentUserId: String
        @cypher(
          statement: "RETURN $cypherParams.currentUserId AS cypherParamsUserId"
        )
      since: Int
      time: _Neo4jTime
      date: _Neo4jDate
      datetime: _Neo4jDateTime
      ratings: [String]
      datetimes: [_Neo4jDateTime]
      localtime: _Neo4jLocalTime
      localdatetime: _Neo4jLocalDateTime
      location: _Neo4jPoint
      """
      Generated field for querying the Neo4j [system id](https://neo4j.com/docs/cypher-manual/current/functions/scalar/#functions-id) of this relationship.
      """
      _id: String
    }
    type _RemoveUserFriendsCustomToPayload
      @relation(name: "FRIEND_OF_CUSTOM_TO", from: "User", to: "User") {
      """
      Field for the User node this FRIEND_OF_CUSTOM_TO [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      from: User
      """
      Field for the User node this FRIEND_OF_CUSTOM_TO [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      friended: User
    }
    type _UpdateUserFriendsCustomToPayload
      @relation(name: "FRIEND_OF_CUSTOM_TO", from: "User", to: "User") {
      """
      Field for the User node this FRIEND_OF_CUSTOM_TO [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      from: User
      """
      Field for the User node this FRIEND_OF_CUSTOM_TO [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      friended: User
      currentUserId: String
        @cypher(
          statement: "RETURN $cypherParams.currentUserId AS cypherParamsUserId"
        )
      since: Int
      time: _Neo4jTime
      date: _Neo4jDate
      datetime: _Neo4jDateTime
      ratings: [String]
      datetimes: [_Neo4jDateTime]
      localtime: _Neo4jLocalTime
      localdatetime: _Neo4jLocalDateTime
      location: _Neo4jPoint
      """
      Generated field for querying the Neo4j [system id](https://neo4j.com/docs/cypher-manual/current/functions/scalar/#functions-id) of this relationship.
      """
      _id: String
    }
    type _MergeUserFriendsCustomToPayload
      @relation(name: "FRIEND_OF_CUSTOM_TO", from: "User", to: "User") {
      """
      Field for the User node this FRIEND_OF_CUSTOM_TO [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      from: User
      """
      Field for the User node this FRIEND_OF_CUSTOM_TO [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      friended: User
      currentUserId: String
        @cypher(
          statement: "RETURN $cypherParams.currentUserId AS cypherParamsUserId"
        )
      since: Int
      time: _Neo4jTime
      date: _Neo4jDate
      datetime: _Neo4jDateTime
      ratings: [String]
      datetimes: [_Neo4jDateTime]
      localtime: _Neo4jLocalTime
      localdatetime: _Neo4jLocalDateTime
      location: _Neo4jPoint
      """
      Generated field for querying the Neo4j [system id](https://neo4j.com/docs/cypher-manual/current/functions/scalar/#functions-id) of this relationship.
      """
      _id: String
    }
    type _UserFriendsCustomFromToDirections
      @relation(name: "FRIEND_OF_CUSTOM_FROM_TO", from: "User", to: "User") {
      """
      Field for the User node this FRIEND_OF_CUSTOM_FROM_TO [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      friendedBy(
        since: Int
        time: _Neo4jTimeInput
        date: _Neo4jDateInput
        datetime: _Neo4jDateTimeInput
        localtime: _Neo4jLocalTimeInput
        localdatetime: _Neo4jLocalDateTimeInput
        location: _Neo4jPointInput
        ratings: [String]
        datetimes: [_Neo4jDateTimeInput]
        from: String
        to: Int
        first: Int
        offset: Int
        orderBy: [_FriendOfCustomFromToOrdering]
        filter: _FriendOfCustomFromToFilter
      ): [_UserFriendsCustomFromTo]
      """
      Field for the User node this FRIEND_OF_CUSTOM_FROM_TO [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      friended(
        since: Int
        time: _Neo4jTimeInput
        date: _Neo4jDateInput
        datetime: _Neo4jDateTimeInput
        localtime: _Neo4jLocalTimeInput
        localdatetime: _Neo4jLocalDateTimeInput
        location: _Neo4jPointInput
        ratings: [String]
        datetimes: [_Neo4jDateTimeInput]
        from: String
        to: Int
        first: Int
        offset: Int
        orderBy: [_FriendOfCustomFromToOrdering]
        filter: _FriendOfCustomFromToFilter
      ): [_UserFriendsCustomFromTo]
    }
    type _UserFriendsCustomFromTo
      @relation(name: "FRIEND_OF_CUSTOM_FROM_TO", from: "User", to: "User") {
      from: String
      currentUserId: String
        @cypher(
          statement: "RETURN $cypherParams.currentUserId AS cypherParamsUserId"
        )
      since: Int
      time: _Neo4jTime
      date: _Neo4jDate
      datetime: _Neo4jDateTime
      ratings: [String]
      datetimes: [_Neo4jDateTime]
      localtime: _Neo4jLocalTime
      localdatetime: _Neo4jLocalDateTime
      location: _Neo4jPoint
      to: Int
      """
      Generated field for querying the Neo4j [system id](https://neo4j.com/docs/cypher-manual/current/functions/scalar/#functions-id) of this relationship.
      """
      _id: String
      """
      Field for the User node this FRIEND_OF_CUSTOM_FROM_TO [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      User: User
    }
    input _FriendOfCustomFromToDirectionsFilter {
      friendedBy: _FriendOfCustomFromToFilter
      friended: _FriendOfCustomFromToFilter
    }
    input _FriendOfCustomFromToFilter {
      AND: [_FriendOfCustomFromToFilter!]
      OR: [_FriendOfCustomFromToFilter!]
      from: String
      from_not: String
      from_in: [String!]
      from_not_in: [String!]
      from_regexp: String
      from_contains: String
      from_not_contains: String
      from_starts_with: String
      from_not_starts_with: String
      from_ends_with: String
      from_not_ends_with: String
      since: Int
      since_not: Int
      since_in: [Int!]
      since_not_in: [Int!]
      since_lt: Int
      since_lte: Int
      since_gt: Int
      since_gte: Int
      time: _Neo4jTimeInput
      time_not: _Neo4jTimeInput
      time_in: [_Neo4jTimeInput!]
      time_not_in: [_Neo4jTimeInput!]
      time_lt: _Neo4jTimeInput
      time_lte: _Neo4jTimeInput
      time_gt: _Neo4jTimeInput
      time_gte: _Neo4jTimeInput
      date: _Neo4jDateInput
      date_not: _Neo4jDateInput
      date_in: [_Neo4jDateInput!]
      date_not_in: [_Neo4jDateInput!]
      date_lt: _Neo4jDateInput
      date_lte: _Neo4jDateInput
      date_gt: _Neo4jDateInput
      date_gte: _Neo4jDateInput
      datetime: _Neo4jDateTimeInput
      datetime_not: _Neo4jDateTimeInput
      datetime_in: [_Neo4jDateTimeInput!]
      datetime_not_in: [_Neo4jDateTimeInput!]
      datetime_lt: _Neo4jDateTimeInput
      datetime_lte: _Neo4jDateTimeInput
      datetime_gt: _Neo4jDateTimeInput
      datetime_gte: _Neo4jDateTimeInput
      ratings: [String!]
      ratings_not: [String!]
      ratings_regexp: String
      ratings_contains: [String!]
      ratings_not_contains: [String!]
      ratings_starts_with: [String!]
      ratings_not_starts_with: [String!]
      ratings_ends_with: [String!]
      ratings_not_ends_with: [String!]
      datetimes: [_Neo4jDateTimeInput!]
      datetimes_not: [_Neo4jDateTimeInput!]
      datetimes_lt: [_Neo4jDateTimeInput!]
      datetimes_lte: [_Neo4jDateTimeInput!]
      datetimes_gt: [_Neo4jDateTimeInput!]
      datetimes_gte: [_Neo4jDateTimeInput!]
      localtime: _Neo4jLocalTimeInput
      localtime_not: _Neo4jLocalTimeInput
      localtime_in: [_Neo4jLocalTimeInput!]
      localtime_not_in: [_Neo4jLocalTimeInput!]
      localtime_lt: _Neo4jLocalTimeInput
      localtime_lte: _Neo4jLocalTimeInput
      localtime_gt: _Neo4jLocalTimeInput
      localtime_gte: _Neo4jLocalTimeInput
      localdatetime: _Neo4jLocalDateTimeInput
      localdatetime_not: _Neo4jLocalDateTimeInput
      localdatetime_in: [_Neo4jLocalDateTimeInput!]
      localdatetime_not_in: [_Neo4jLocalDateTimeInput!]
      localdatetime_lt: _Neo4jLocalDateTimeInput
      localdatetime_lte: _Neo4jLocalDateTimeInput
      localdatetime_gt: _Neo4jLocalDateTimeInput
      localdatetime_gte: _Neo4jLocalDateTimeInput
      location: _Neo4jPointInput
      location_not: _Neo4jPointInput
      location_distance: _Neo4jPointDistanceFilter
      location_distance_lt: _Neo4jPointDistanceFilter
      location_distance_lte: _Neo4jPointDistanceFilter
      location_distance_gt: _Neo4jPointDistanceFilter
      location_distance_gte: _Neo4jPointDistanceFilter
      to: Int
      to_not: Int
      to_in: [Int!]
      to_not_in: [Int!]
      to_lt: Int
      to_lte: Int
      to_gt: Int
      to_gte: Int
      User: _UserFilter
    }
    enum _FriendOfCustomFromToOrdering {
      from_asc
      from_desc
      currentUserId_asc
      currentUserId_desc
      since_asc
      since_desc
      time_asc
      time_desc
      date_asc
      date_desc
      datetime_asc
      datetime_desc
      localtime_asc
      localtime_desc
      localdatetime_asc
      localdatetime_desc
      to_asc
      to_desc
      _id_asc
      _id_desc
    }
    input _FriendOfCustomFromToInput {
      from: String
      since: Int
      time: _Neo4jTimeInput
      date: _Neo4jDateInput
      datetime: _Neo4jDateTimeInput
      ratings: [String]
      datetimes: [_Neo4jDateTimeInput]
      localtime: _Neo4jLocalTimeInput
      localdatetime: _Neo4jLocalDateTimeInput
      location: _Neo4jPointInput
      to: Int
    }
    type _AddUserFriendsCustomFromToPayload
      @relation(name: "FRIEND_OF_CUSTOM_FROM_TO", from: "User", to: "User") {
      """
      Field for the User node this FRIEND_OF_CUSTOM_FROM_TO [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      friendedBy: User
      """
      Field for the User node this FRIEND_OF_CUSTOM_FROM_TO [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      friended: User
      from: String
      currentUserId: String
        @cypher(
          statement: "RETURN $cypherParams.currentUserId AS cypherParamsUserId"
        )
      since: Int
      time: _Neo4jTime
      date: _Neo4jDate
      datetime: _Neo4jDateTime
      ratings: [String]
      datetimes: [_Neo4jDateTime]
      localtime: _Neo4jLocalTime
      localdatetime: _Neo4jLocalDateTime
      location: _Neo4jPoint
      to: Int
      """
      Generated field for querying the Neo4j [system id](https://neo4j.com/docs/cypher-manual/current/functions/scalar/#functions-id) of this relationship.
      """
      _id: String
    }
    type _RemoveUserFriendsCustomFromToPayload
      @relation(name: "FRIEND_OF_CUSTOM_FROM_TO", from: "User", to: "User") {
      """
      Field for the User node this FRIEND_OF_CUSTOM_FROM_TO [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      friendedBy: User
      """
      Field for the User node this FRIEND_OF_CUSTOM_FROM_TO [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      friended: User
    }
    type _UpdateUserFriendsCustomFromToPayload
      @relation(name: "FRIEND_OF_CUSTOM_FROM_TO", from: "User", to: "User") {
      """
      Field for the User node this FRIEND_OF_CUSTOM_FROM_TO [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      friendedBy: User
      """
      Field for the User node this FRIEND_OF_CUSTOM_FROM_TO [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      friended: User
      from: String
      currentUserId: String
        @cypher(
          statement: "RETURN $cypherParams.currentUserId AS cypherParamsUserId"
        )
      since: Int
      time: _Neo4jTime
      date: _Neo4jDate
      datetime: _Neo4jDateTime
      ratings: [String]
      datetimes: [_Neo4jDateTime]
      localtime: _Neo4jLocalTime
      localdatetime: _Neo4jLocalDateTime
      location: _Neo4jPoint
      to: Int
      """
      Generated field for querying the Neo4j [system id](https://neo4j.com/docs/cypher-manual/current/functions/scalar/#functions-id) of this relationship.
      """
      _id: String
    }
    type _MergeUserFriendsCustomFromToPayload
      @relation(name: "FRIEND_OF_CUSTOM_FROM_TO", from: "User", to: "User") {
      """
      Field for the User node this FRIEND_OF_CUSTOM_FROM_TO [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      friendedBy: User
      """
      Field for the User node this FRIEND_OF_CUSTOM_FROM_TO [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      friended: User
      from: String
      currentUserId: String
        @cypher(
          statement: "RETURN $cypherParams.currentUserId AS cypherParamsUserId"
        )
      since: Int
      time: _Neo4jTime
      date: _Neo4jDate
      datetime: _Neo4jDateTime
      ratings: [String]
      datetimes: [_Neo4jDateTime]
      localtime: _Neo4jLocalTime
      localdatetime: _Neo4jLocalDateTime
      location: _Neo4jPoint
      to: Int
      """
      Generated field for querying the Neo4j [system id](https://neo4j.com/docs/cypher-manual/current/functions/scalar/#functions-id) of this relationship.
      """
      _id: String
    }
    type _AddUserFavoritesPayload
      @relation(name: "FAVORITED", from: "User", to: "Movie") {
      """
      Field for the User node this FAVORITED [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      from: User
      """
      Field for the Movie node this FAVORITED [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      to: Movie
    }
    type _RemoveUserFavoritesPayload
      @relation(name: "FAVORITED", from: "User", to: "Movie") {
      """
      Field for the User node this FAVORITED [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      from: User
      """
      Field for the Movie node this FAVORITED [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      to: Movie
    }
    type _MergeUserFavoritesPayload
      @relation(name: "FAVORITED", from: "User", to: "Movie") {
      """
      Field for the User node this FAVORITED [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      from: User
      """
      Field for the Movie node this FAVORITED [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      to: Movie
    }
    input _UserInput {
      userId: ID!
    }
    enum _UserOrdering {
      userId_asc
      userId_desc
      name_asc
      name_desc
      currentUserId_asc
      currentUserId_desc
      extensionScalar_asc
      extensionScalar_desc
      _id_asc
      _id_desc
    }
    input _UserFilter {
      AND: [_UserFilter!]
      OR: [_UserFilter!]
      userId: ID
      userId_not: ID
      userId_in: [ID!]
      userId_not_in: [ID!]
      userId_regexp: ID
      userId_contains: ID
      userId_not_contains: ID
      userId_starts_with: ID
      userId_not_starts_with: ID
      userId_ends_with: ID
      userId_not_ends_with: ID
      name: String
      name_not: String
      name_in: [String!]
      name_not_in: [String!]
      name_regexp: String
      name_contains: String
      name_not_contains: String
      name_starts_with: String
      name_not_starts_with: String
      name_ends_with: String
      name_not_ends_with: String
      interfacedRelationshipType: _PersonInterfacedRelationshipTypeFilter
      interfacedRelationshipType_not: _PersonInterfacedRelationshipTypeFilter
      interfacedRelationshipType_in: [_PersonInterfacedRelationshipTypeFilter!]
      interfacedRelationshipType_not_in: [_PersonInterfacedRelationshipTypeFilter!]
      interfacedRelationshipType_some: _PersonInterfacedRelationshipTypeFilter
      interfacedRelationshipType_none: _PersonInterfacedRelationshipTypeFilter
      interfacedRelationshipType_single: _PersonInterfacedRelationshipTypeFilter
      interfacedRelationshipType_every: _PersonInterfacedRelationshipTypeFilter
      reflexiveInterfacedRelationshipType: _ReflexiveInterfacedRelationshipTypeDirectionsFilter
      reflexiveInterfacedRelationshipType_not: _ReflexiveInterfacedRelationshipTypeDirectionsFilter
      reflexiveInterfacedRelationshipType_in: [_ReflexiveInterfacedRelationshipTypeDirectionsFilter!]
      reflexiveInterfacedRelationshipType_not_in: [_ReflexiveInterfacedRelationshipTypeDirectionsFilter!]
      reflexiveInterfacedRelationshipType_some: _ReflexiveInterfacedRelationshipTypeDirectionsFilter
      reflexiveInterfacedRelationshipType_none: _ReflexiveInterfacedRelationshipTypeDirectionsFilter
      reflexiveInterfacedRelationshipType_single: _ReflexiveInterfacedRelationshipTypeDirectionsFilter
      reflexiveInterfacedRelationshipType_every: _ReflexiveInterfacedRelationshipTypeDirectionsFilter
      rated: _UserRatedFilter
      rated_not: _UserRatedFilter
      rated_in: [_UserRatedFilter!]
      rated_not_in: [_UserRatedFilter!]
      rated_some: _UserRatedFilter
      rated_none: _UserRatedFilter
      rated_single: _UserRatedFilter
      rated_every: _UserRatedFilter
      ratedCustomFrom: _UserRatedCustomFromFilter
      ratedCustomFrom_not: _UserRatedCustomFromFilter
      ratedCustomFrom_in: [_UserRatedCustomFromFilter!]
      ratedCustomFrom_not_in: [_UserRatedCustomFromFilter!]
      ratedCustomFrom_some: _UserRatedCustomFromFilter
      ratedCustomFrom_none: _UserRatedCustomFromFilter
      ratedCustomFrom_single: _UserRatedCustomFromFilter
      ratedCustomFrom_every: _UserRatedCustomFromFilter
      ratedCustomTo: _UserRatedCustomToFilter
      ratedCustomTo_not: _UserRatedCustomToFilter
      ratedCustomTo_in: [_UserRatedCustomToFilter!]
      ratedCustomTo_not_in: [_UserRatedCustomToFilter!]
      ratedCustomTo_some: _UserRatedCustomToFilter
      ratedCustomTo_none: _UserRatedCustomToFilter
      ratedCustomTo_single: _UserRatedCustomToFilter
      ratedCustomTo_every: _UserRatedCustomToFilter
      ratedCustomFromTo: _UserRatedCustomFromToFilter
      ratedCustomFromTo_not: _UserRatedCustomFromToFilter
      ratedCustomFromTo_in: [_UserRatedCustomFromToFilter!]
      ratedCustomFromTo_not_in: [_UserRatedCustomFromToFilter!]
      ratedCustomFromTo_some: _UserRatedCustomFromToFilter
      ratedCustomFromTo_none: _UserRatedCustomFromToFilter
      ratedCustomFromTo_single: _UserRatedCustomFromToFilter
      ratedCustomFromTo_every: _UserRatedCustomFromToFilter
      friends: _FriendOfDirectionsFilter
      friends_not: _FriendOfDirectionsFilter
      friends_in: [_FriendOfDirectionsFilter!]
      friends_not_in: [_FriendOfDirectionsFilter!]
      friends_some: _FriendOfDirectionsFilter
      friends_none: _FriendOfDirectionsFilter
      friends_single: _FriendOfDirectionsFilter
      friends_every: _FriendOfDirectionsFilter
      friendsCustomFrom: _FriendOfCustomFromDirectionsFilter
      friendsCustomFrom_not: _FriendOfCustomFromDirectionsFilter
      friendsCustomFrom_in: [_FriendOfCustomFromDirectionsFilter!]
      friendsCustomFrom_not_in: [_FriendOfCustomFromDirectionsFilter!]
      friendsCustomFrom_some: _FriendOfCustomFromDirectionsFilter
      friendsCustomFrom_none: _FriendOfCustomFromDirectionsFilter
      friendsCustomFrom_single: _FriendOfCustomFromDirectionsFilter
      friendsCustomFrom_every: _FriendOfCustomFromDirectionsFilter
      friendsCustomTo: _FriendOfCustomToDirectionsFilter
      friendsCustomTo_not: _FriendOfCustomToDirectionsFilter
      friendsCustomTo_in: [_FriendOfCustomToDirectionsFilter!]
      friendsCustomTo_not_in: [_FriendOfCustomToDirectionsFilter!]
      friendsCustomTo_some: _FriendOfCustomToDirectionsFilter
      friendsCustomTo_none: _FriendOfCustomToDirectionsFilter
      friendsCustomTo_single: _FriendOfCustomToDirectionsFilter
      friendsCustomTo_every: _FriendOfCustomToDirectionsFilter
      friendsCustomFromTo: _FriendOfCustomFromToDirectionsFilter
      friendsCustomFromTo_not: _FriendOfCustomFromToDirectionsFilter
      friendsCustomFromTo_in: [_FriendOfCustomFromToDirectionsFilter!]
      friendsCustomFromTo_not_in: [_FriendOfCustomFromToDirectionsFilter!]
      friendsCustomFromTo_some: _FriendOfCustomFromToDirectionsFilter
      friendsCustomFromTo_none: _FriendOfCustomFromToDirectionsFilter
      friendsCustomFromTo_single: _FriendOfCustomFromToDirectionsFilter
      friendsCustomFromTo_every: _FriendOfCustomFromToDirectionsFilter
      favorites: _MovieFilter
      favorites_not: _MovieFilter
      favorites_in: [_MovieFilter!]
      favorites_not_in: [_MovieFilter!]
      favorites_some: _MovieFilter
      favorites_none: _MovieFilter
      favorites_single: _MovieFilter
      favorites_every: _MovieFilter
      extensionScalar: String
      extensionScalar_not: String
      extensionScalar_in: [String!]
      extensionScalar_not_in: [String!]
      extensionScalar_regexp: String
      extensionScalar_contains: String
      extensionScalar_not_contains: String
      extensionScalar_starts_with: String
      extensionScalar_not_starts_with: String
      extensionScalar_ends_with: String
      extensionScalar_not_ends_with: String
    }
    type User implements Person {
      userId: ID!
      name: String
      interfacedRelationshipType(
        first: Int
        offset: Int
        orderBy: [_InterfacedRelationshipTypeOrdering]
        filter: _PersonInterfacedRelationshipTypeFilter
      ): [_PersonInterfacedRelationshipType]
      reflexiveInterfacedRelationshipType: _PersonReflexiveInterfacedRelationshipTypeDirections
      currentUserId(strArg: String = "Neo4j", strInputArg: strInput): String
        @cypher(
          statement: "RETURN $cypherParams.currentUserId AS cypherParamsUserId"
        )
      rated(
        rating: Int
        time: _Neo4jTimeInput
        date: _Neo4jDateInput
        datetime: _Neo4jDateTimeInput
        localtime: _Neo4jLocalTimeInput
        localdatetime: _Neo4jLocalDateTimeInput
        location: _Neo4jPointInput
        first: Int
        offset: Int
        orderBy: [_RatedOrdering]
        filter: _UserRatedFilter
      ): [_UserRated]
      ratedCustomFrom(
        rating: Int
        time: _Neo4jTimeInput
        date: _Neo4jDateInput
        datetime: _Neo4jDateTimeInput
        localtime: _Neo4jLocalTimeInput
        localdatetime: _Neo4jLocalDateTimeInput
        location: _Neo4jPointInput
        first: Int
        offset: Int
        orderBy: [_RatedCustomFromOrdering]
        filter: _UserRatedCustomFromFilter
      ): [_UserRatedCustomFrom]
      ratedCustomTo(
        rating: Int
        time: _Neo4jTimeInput
        date: _Neo4jDateInput
        datetime: _Neo4jDateTimeInput
        localtime: _Neo4jLocalTimeInput
        localdatetime: _Neo4jLocalDateTimeInput
        location: _Neo4jPointInput
        first: Int
        offset: Int
        orderBy: [_RatedCustomToOrdering]
        filter: _UserRatedCustomToFilter
      ): [_UserRatedCustomTo]
      ratedCustomFromTo(
        rating: Int
        time: _Neo4jTimeInput
        date: _Neo4jDateInput
        datetime: _Neo4jDateTimeInput
        localtime: _Neo4jLocalTimeInput
        localdatetime: _Neo4jLocalDateTimeInput
        location: _Neo4jPointInput
        from: String
        to: Int
        first: Int
        offset: Int
        orderBy: [_RatedCustomFromToOrdering]
        filter: _UserRatedCustomFromToFilter
      ): [_UserRatedCustomFromTo]
      friends: _UserFriendsDirections
      friendsCustomFrom: _UserFriendsCustomFromDirections
      friendsCustomTo: _UserFriendsCustomToDirections
      friendsCustomFromTo: _UserFriendsCustomFromToDirections
      favorites(
        first: Int
        offset: Int
        orderBy: [_MovieOrdering]
        filter: _MovieFilter
      ): [Movie] @relation(name: "FAVORITED", direction: "OUT")
      movieSearch(first: Int, offset: Int): [MovieSearch]
      computedMovieSearch(first: Int, offset: Int): [MovieSearch]
        @cypher(statement: "MATCH (ms:MovieSearch) RETURN ms")
      extensionScalar: String
      """
      Generated field for querying the Neo4j [system id](https://neo4j.com/docs/cypher-manual/current/functions/scalar/#functions-id) of this node.
      """
      _id: String
    }
    type FriendOf @relation {
      from: User
      currentUserId: String
        @cypher(
          statement: "RETURN $cypherParams.currentUserId AS cypherParamsUserId"
        )
      since: Int
      time: _Neo4jTime
      date: _Neo4jDate
      datetime: _Neo4jDateTime
      ratings: [String]
      datetimes: [_Neo4jDateTime]
      localtime: _Neo4jLocalTime
      localdatetime: _Neo4jLocalDateTime
      location: _Neo4jPoint
      to: User
    }
    type FriendOfCustomFrom @relation(from: "friendedBy") {
      friendedBy: User
      currentUserId: String
        @cypher(
          statement: "RETURN $cypherParams.currentUserId AS cypherParamsUserId"
        )
      since: Int
      time: _Neo4jTime
      date: _Neo4jDate
      datetime: _Neo4jDateTime
      ratings: [String]
      datetimes: [_Neo4jDateTime]
      localtime: _Neo4jLocalTime
      localdatetime: _Neo4jLocalDateTime
      location: _Neo4jPoint
      to: User
    }
    type FriendOfCustomTo @relation(to: "friended") {
      from: User
      currentUserId: String
        @cypher(
          statement: "RETURN $cypherParams.currentUserId AS cypherParamsUserId"
        )
      since: Int
      time: _Neo4jTime
      date: _Neo4jDate
      datetime: _Neo4jDateTime
      ratings: [String]
      datetimes: [_Neo4jDateTime]
      localtime: _Neo4jLocalTime
      localdatetime: _Neo4jLocalDateTime
      location: _Neo4jPoint
      friended: User
    }
    type FriendOfCustomFromTo @relation(from: "friendedBy", to: "friended") {
      friendedBy: User
      from: String
      currentUserId: String
        @cypher(
          statement: "RETURN $cypherParams.currentUserId AS cypherParamsUserId"
        )
      since: Int
      time: _Neo4jTime
      date: _Neo4jDate
      datetime: _Neo4jDateTime
      ratings: [String]
      datetimes: [_Neo4jDateTime]
      localtime: _Neo4jLocalTime
      localdatetime: _Neo4jLocalDateTime
      location: _Neo4jPoint
      friended: User
      to: Int
    }
    type Rated @relation {
      from: User
      currentUserId(strArg: String): String
        @cypher(
          statement: "RETURN $cypherParams.currentUserId AS cypherParamsUserId"
        )
      rating: Int
      ratings: [Int]
      time: _Neo4jTime
      date: _Neo4jDate
      datetime: _Neo4jDateTime
      localtime: _Neo4jLocalTime
      localdatetime: _Neo4jLocalDateTime
      datetimes: [_Neo4jDateTime]
      location: _Neo4jPoint
      _id: String
      to: Movie
    }
    type RatedNoProps @relation {
      from: User
      to: Movie
    }
    type RatedCustomFrom @relation(from: "ratedBy") {
      ratedBy: User
      currentUserId(strArg: String): String
        @cypher(
          statement: "RETURN $cypherParams.currentUserId AS cypherParamsUserId"
        )
      rating: Int
      ratings: [Int]
      time: _Neo4jTime
      date: _Neo4jDate
      datetime: _Neo4jDateTime
      localtime: _Neo4jLocalTime
      localdatetime: _Neo4jLocalDateTime
      datetimes: [_Neo4jDateTime]
      location: _Neo4jPoint
      _id: String
      to: Movie
    }
    type RatedCustomTo @relation(to: "movie") {
      from: User
      currentUserId(strArg: String): String
        @cypher(
          statement: "RETURN $cypherParams.currentUserId AS cypherParamsUserId"
        )
      rating: Int
      ratings: [Int]
      time: _Neo4jTime
      date: _Neo4jDate
      datetime: _Neo4jDateTime
      localtime: _Neo4jLocalTime
      localdatetime: _Neo4jLocalDateTime
      datetimes: [_Neo4jDateTime]
      location: _Neo4jPoint
      _id: String
      movie: Movie
    }
    type RatedCustomFromTo @relation(from: "ratedBy", to: "movie") {
      ratedBy: User
      from: String
      currentUserId(strArg: String): String
        @cypher(
          statement: "RETURN $cypherParams.currentUserId AS cypherParamsUserId"
        )
      rating: Int
      ratings: [Int]
      time: _Neo4jTime
      date: _Neo4jDate
      datetime: _Neo4jDateTime
      localtime: _Neo4jLocalTime
      localdatetime: _Neo4jLocalDateTime
      datetimes: [_Neo4jDateTime]
      location: _Neo4jPoint
      _id: String
      to: Int
      movie: Movie
    }
    enum BookGenre {
      Mystery
      Science
      Math
    }
    input _BookInput {
      genre: BookGenre!
    }
    enum _BookOrdering {
      genre_asc
      genre_desc
      _id_asc
      _id_desc
    }
    input _BookFilter {
      AND: [_BookFilter!]
      OR: [_BookFilter!]
      genre: BookGenre
      genre_not: BookGenre
      genre_in: [BookGenre!]
      genre_not_in: [BookGenre!]
    }
    type Book {
      genre: BookGenre
      """
      Generated field for querying the Neo4j [system id](https://neo4j.com/docs/cypher-manual/current/functions/scalar/#functions-id) of this node.
      """
      _id: String
    }
    input _NodeTypeMutationTestInput {
      NodeTypeMutationTest: BookGenre!
    }
    type NodeTypeMutationTest {
      NodeTypeMutationTest: BookGenre
    }
    """
    Custom ordering enum type
    block description
    """
    enum _GenreOrdering {
      name_desc
      name_asc
    }
    input _currentUserIdInput {
      userId: String!
    }
    enum _currentUserIdOrdering {
      userId_asc
      userId_desc
      _id_asc
      _id_desc
    }
    input _currentUserIdFilter {
      AND: [_currentUserIdFilter!]
      OR: [_currentUserIdFilter!]
      userId: String
      userId_not: String
      userId_in: [String!]
      userId_not_in: [String!]
      userId_regexp: String
      userId_contains: String
      userId_not_contains: String
      userId_starts_with: String
      userId_not_starts_with: String
      userId_ends_with: String
      userId_not_ends_with: String
    }
    type currentUserId {
      userId: String
      """
      Generated field for querying the Neo4j [system id](https://neo4j.com/docs/cypher-manual/current/functions/scalar/#functions-id) of this node.
      """
      _id: String
    }
    type _AddTemporalNodeTemporalNodesPayload
      @relation(name: "TEMPORAL", from: "TemporalNode", to: "TemporalNode") {
      """
      Field for the TemporalNode node this TEMPORAL [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      from: TemporalNode
      """
      Field for the TemporalNode node this TEMPORAL [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      to: TemporalNode
    }
    type _RemoveTemporalNodeTemporalNodesPayload
      @relation(name: "TEMPORAL", from: "TemporalNode", to: "TemporalNode") {
      """
      Field for the TemporalNode node this TEMPORAL [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      from: TemporalNode
      """
      Field for the TemporalNode node this TEMPORAL [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      to: TemporalNode
    }
    type _MergeTemporalNodeTemporalNodesPayload
      @relation(name: "TEMPORAL", from: "TemporalNode", to: "TemporalNode") {
      """
      Field for the TemporalNode node this TEMPORAL [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      from: TemporalNode
      """
      Field for the TemporalNode node this TEMPORAL [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      to: TemporalNode
    }
    input _TemporalNodeInput {
      name: String!
    }
    enum _TemporalNodeOrdering {
      datetime_asc
      datetime_desc
      name_asc
      name_desc
      time_asc
      time_desc
      date_asc
      date_desc
      localtime_asc
      localtime_desc
      localdatetime_asc
      localdatetime_desc
      computedTimestamp_asc
      computedTimestamp_desc
      _id_asc
      _id_desc
    }
    input _TemporalNodeFilter {
      AND: [_TemporalNodeFilter!]
      OR: [_TemporalNodeFilter!]
      datetime: _Neo4jDateTimeInput
      datetime_not: _Neo4jDateTimeInput
      datetime_in: [_Neo4jDateTimeInput!]
      datetime_not_in: [_Neo4jDateTimeInput!]
      datetime_lt: _Neo4jDateTimeInput
      datetime_lte: _Neo4jDateTimeInput
      datetime_gt: _Neo4jDateTimeInput
      datetime_gte: _Neo4jDateTimeInput
      name: String
      name_not: String
      name_in: [String!]
      name_not_in: [String!]
      name_regexp: String
      name_contains: String
      name_not_contains: String
      name_starts_with: String
      name_not_starts_with: String
      name_ends_with: String
      name_not_ends_with: String
      time: _Neo4jTimeInput
      time_not: _Neo4jTimeInput
      time_in: [_Neo4jTimeInput!]
      time_not_in: [_Neo4jTimeInput!]
      time_lt: _Neo4jTimeInput
      time_lte: _Neo4jTimeInput
      time_gt: _Neo4jTimeInput
      time_gte: _Neo4jTimeInput
      date: _Neo4jDateInput
      date_not: _Neo4jDateInput
      date_in: [_Neo4jDateInput!]
      date_not_in: [_Neo4jDateInput!]
      date_lt: _Neo4jDateInput
      date_lte: _Neo4jDateInput
      date_gt: _Neo4jDateInput
      date_gte: _Neo4jDateInput
      localtime: _Neo4jLocalTimeInput
      localtime_not: _Neo4jLocalTimeInput
      localtime_in: [_Neo4jLocalTimeInput!]
      localtime_not_in: [_Neo4jLocalTimeInput!]
      localtime_lt: _Neo4jLocalTimeInput
      localtime_lte: _Neo4jLocalTimeInput
      localtime_gt: _Neo4jLocalTimeInput
      localtime_gte: _Neo4jLocalTimeInput
      localdatetime: _Neo4jLocalDateTimeInput
      localdatetime_not: _Neo4jLocalDateTimeInput
      localdatetime_in: [_Neo4jLocalDateTimeInput!]
      localdatetime_not_in: [_Neo4jLocalDateTimeInput!]
      localdatetime_lt: _Neo4jLocalDateTimeInput
      localdatetime_lte: _Neo4jLocalDateTimeInput
      localdatetime_gt: _Neo4jLocalDateTimeInput
      localdatetime_gte: _Neo4jLocalDateTimeInput
      localdatetimes: [_Neo4jLocalDateTimeInput!]
      localdatetimes_not: [_Neo4jLocalDateTimeInput!]
      localdatetimes_lt: [_Neo4jLocalDateTimeInput!]
      localdatetimes_lte: [_Neo4jLocalDateTimeInput!]
      localdatetimes_gt: [_Neo4jLocalDateTimeInput!]
      localdatetimes_gte: [_Neo4jLocalDateTimeInput!]
      temporalNodes: _TemporalNodeFilter
      temporalNodes_not: _TemporalNodeFilter
      temporalNodes_in: [_TemporalNodeFilter!]
      temporalNodes_not_in: [_TemporalNodeFilter!]
      temporalNodes_some: _TemporalNodeFilter
      temporalNodes_none: _TemporalNodeFilter
      temporalNodes_single: _TemporalNodeFilter
      temporalNodes_every: _TemporalNodeFilter
    }
    type TemporalNode {
      datetime: _Neo4jDateTime
      name: String
      time: _Neo4jTime
      date: _Neo4jDate
      localtime: _Neo4jLocalTime
      localdatetime: _Neo4jLocalDateTime
      localdatetimes: [_Neo4jLocalDateTime]
      computedTimestamp: String
        @cypher(statement: "RETURN toString(datetime())")
      temporalNodes(
        time: _Neo4jTimeInput
        date: _Neo4jDateInput
        datetime: _Neo4jDateTimeInput
        localtime: _Neo4jLocalTimeInput
        localdatetime: _Neo4jLocalDateTimeInput
        first: Int
        offset: Int
        orderBy: [_TemporalNodeOrdering]
        filter: _TemporalNodeFilter
      ): [TemporalNode] @relation(name: "TEMPORAL", direction: OUT)
      """
      Generated field for querying the Neo4j [system id](https://neo4j.com/docs/cypher-manual/current/functions/scalar/#functions-id) of this node.
      """
      _id: String
    }
    type _AddSpatialNodeSpatialNodesPayload
      @relation(name: "SPATIAL", from: "SpatialNode", to: "SpatialNode") {
      """
      Field for the SpatialNode node this SPATIAL [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      from: SpatialNode
      """
      Field for the SpatialNode node this SPATIAL [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      to: SpatialNode
    }
    type _RemoveSpatialNodeSpatialNodesPayload
      @relation(name: "SPATIAL", from: "SpatialNode", to: "SpatialNode") {
      """
      Field for the SpatialNode node this SPATIAL [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      from: SpatialNode
      """
      Field for the SpatialNode node this SPATIAL [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      to: SpatialNode
    }
    type _MergeSpatialNodeSpatialNodesPayload
      @relation(name: "SPATIAL", from: "SpatialNode", to: "SpatialNode") {
      """
      Field for the SpatialNode node this SPATIAL [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      from: SpatialNode
      """
      Field for the SpatialNode node this SPATIAL [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      to: SpatialNode
    }
    input _SpatialNodeInput {
      id: ID!
    }
    enum _SpatialNodeOrdering {
      id_asc
      id_desc
      _id_asc
      _id_desc
    }
    input _SpatialNodeFilter {
      AND: [_SpatialNodeFilter!]
      OR: [_SpatialNodeFilter!]
      id: ID
      id_not: ID
      id_in: [ID!]
      id_not_in: [ID!]
      id_regexp: ID
      id_contains: ID
      id_not_contains: ID
      id_starts_with: ID
      id_not_starts_with: ID
      id_ends_with: ID
      id_not_ends_with: ID
      point: _Neo4jPointInput
      point_not: _Neo4jPointInput
      point_distance: _Neo4jPointDistanceFilter
      point_distance_lt: _Neo4jPointDistanceFilter
      point_distance_lte: _Neo4jPointDistanceFilter
      point_distance_gt: _Neo4jPointDistanceFilter
      point_distance_gte: _Neo4jPointDistanceFilter
      spatialNodes: _SpatialNodeFilter
      spatialNodes_not: _SpatialNodeFilter
      spatialNodes_in: [_SpatialNodeFilter!]
      spatialNodes_not_in: [_SpatialNodeFilter!]
      spatialNodes_some: _SpatialNodeFilter
      spatialNodes_none: _SpatialNodeFilter
      spatialNodes_single: _SpatialNodeFilter
      spatialNodes_every: _SpatialNodeFilter
    }
    type SpatialNode {
      id: ID!
      point: _Neo4jPoint
      spatialNodes(
        point: _Neo4jPointInput
        first: Int
        offset: Int
        orderBy: [_SpatialNodeOrdering]
        filter: _SpatialNodeFilter
      ): [SpatialNode] @relation(name: "SPATIAL", direction: OUT)
      """
      Generated field for querying the Neo4j [system id](https://neo4j.com/docs/cypher-manual/current/functions/scalar/#functions-id) of this node.
      """
      _id: String
    }
    type ignoredType {
      ignoredField: String @neo4j_ignore
    }
    """
    Custom scalar type line description
    """
    scalar Time
    scalar Date
    scalar DateTime
    scalar LocalTime
    scalar LocalDateTime
    """
    Input object type line description
    """
    input strInput {
      """
      Input field line description
      """
      strArg: String
      extensionArg: String
    }
    enum Role {
      reader
      user
      admin
    }
    type _AddCasedTypeStatePayload
      @relation(name: "FILMED_IN", from: "CasedType", to: "State") {
      """
      Field for the CasedType node this FILMED_IN [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      from: CasedType
      """
      Field for the State node this FILMED_IN [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      to: State
    }
    type _RemoveCasedTypeStatePayload
      @relation(name: "FILMED_IN", from: "CasedType", to: "State") {
      """
      Field for the CasedType node this FILMED_IN [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      from: CasedType
      """
      Field for the State node this FILMED_IN [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      to: State
    }
    type _MergeCasedTypeStatePayload
      @relation(name: "FILMED_IN", from: "CasedType", to: "State") {
      """
      Field for the CasedType node this FILMED_IN [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      from: CasedType
      """
      Field for the State node this FILMED_IN [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      to: State
    }
    input _CasedTypeInput {
      name: String!
    }
    enum _CasedTypeOrdering {
      name_asc
      name_desc
      _id_asc
      _id_desc
    }
    input _CasedTypeFilter {
      AND: [_CasedTypeFilter!]
      OR: [_CasedTypeFilter!]
      name: String
      name_not: String
      name_in: [String!]
      name_not_in: [String!]
      name_regexp: String
      name_contains: String
      name_not_contains: String
      name_starts_with: String
      name_not_starts_with: String
      name_ends_with: String
      name_not_ends_with: String
      state: _StateFilter
      state_not: _StateFilter
      state_in: [_StateFilter!]
      state_not_in: [_StateFilter!]
    }
    type CasedType {
      name: String
      state(filter: _StateFilter): State
        @relation(name: "FILMED_IN", direction: "OUT")
      """
      Generated field for querying the Neo4j [system id](https://neo4j.com/docs/cypher-manual/current/functions/scalar/#functions-id) of this node.
      """
      _id: String
    }
    input _InterfaceNoScalarsFilter {
      AND: [_InterfaceNoScalarsFilter!]
      OR: [_InterfaceNoScalarsFilter!]
      movies: _MovieFilter
      movies_not: _MovieFilter
      movies_in: [_MovieFilter!]
      movies_not_in: [_MovieFilter!]
      movies_some: _MovieFilter
      movies_none: _MovieFilter
      movies_single: _MovieFilter
      movies_every: _MovieFilter
    }
    interface InterfaceNoScalars {
      movies(
        first: Int
        offset: Int
        orderBy: [_MovieOrdering]
        filter: _MovieFilter
      ): [Movie] @relation(name: "MOVIES", direction: OUT)
    }
    enum _InterfaceNoScalarsOrdering {
      movies_asc
    }
    input _CameraFilter {
      AND: [_CameraFilter!]
      OR: [_CameraFilter!]
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
      type: String
      type_not: String
      type_in: [String!]
      type_not_in: [String!]
      type_contains: String
      type_not_contains: String
      type_starts_with: String
      type_not_starts_with: String
      type_ends_with: String
      type_not_ends_with: String
      make: String
      make_not: String
      make_in: [String!]
      make_not_in: [String!]
      make_contains: String
      make_not_contains: String
      make_starts_with: String
      make_not_starts_with: String
      make_ends_with: String
      make_not_ends_with: String
      weight: Int
      weight_not: Int
      weight_in: [Int!]
      weight_not_in: [Int!]
      weight_lt: Int
      weight_lte: Int
      weight_gt: Int
      weight_gte: Int
      operators: _PersonFilter
      operators_not: _PersonFilter
      operators_in: [_PersonFilter!]
      operators_not_in: [_PersonFilter!]
      operators_some: _PersonFilter
      operators_none: _PersonFilter
      operators_single: _PersonFilter
      operators_every: _PersonFilter
    }
    type _AddCameraOperatorsPayload
      @relation(name: "cameras", from: "Person", to: "Camera") {
      """
      Field for the Person node this cameras [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      from: Person
      """
      Field for the Camera node this cameras [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      to: Camera
    }
    type _RemoveCameraOperatorsPayload
      @relation(name: "cameras", from: "Person", to: "Camera") {
      """
      Field for the Person node this cameras [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      from: Person
      """
      Field for the Camera node this cameras [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      to: Camera
    }
    type _MergeCameraOperatorsPayload
      @relation(name: "cameras", from: "Person", to: "Camera") {
      """
      Field for the Person node this cameras [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      from: Person
      """
      Field for the Camera node this cameras [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      to: Camera
    }
    type _AddCameraReflexiveInterfaceRelationshipPayload
      @relation(
        name: "REFLEXIVE_INTERFACE_RELATIONSHIP"
        from: "Camera"
        to: "Camera"
      ) {
      """
      Field for the Camera node this REFLEXIVE_INTERFACE_RELATIONSHIP [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      from: Camera
      """
      Field for the Camera node this REFLEXIVE_INTERFACE_RELATIONSHIP [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      to: Camera
    }
    type _RemoveCameraReflexiveInterfaceRelationshipPayload
      @relation(
        name: "REFLEXIVE_INTERFACE_RELATIONSHIP"
        from: "Camera"
        to: "Camera"
      ) {
      """
      Field for the Camera node this REFLEXIVE_INTERFACE_RELATIONSHIP [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      from: Camera
      """
      Field for the Camera node this REFLEXIVE_INTERFACE_RELATIONSHIP [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      to: Camera
    }
    type _MergeCameraReflexiveInterfaceRelationshipPayload
      @relation(
        name: "REFLEXIVE_INTERFACE_RELATIONSHIP"
        from: "Camera"
        to: "Camera"
      ) {
      """
      Field for the Camera node this REFLEXIVE_INTERFACE_RELATIONSHIP [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      from: Camera
      """
      Field for the Camera node this REFLEXIVE_INTERFACE_RELATIONSHIP [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      to: Camera
    }
    input _CameraInput {
      id: ID!
    }
    interface Camera {
      type: String
      id: ID! @unique
      make: String
      weight: Int
      operators(
        first: Int
        offset: Int
        orderBy: [_PersonOrdering]
        filter: _PersonFilter
      ): [Person] @relation(name: "cameras", direction: IN)
      computedOperators(
        name: String
        first: Int
        offset: Int
        orderBy: [_PersonOrdering]
      ): [Person]
        @cypher(statement: "MATCH (this)<-[:cameras]-(p:Person) RETURN p")
      reflexiveInterfaceRelationship(
        first: Int
        offset: Int
        orderBy: [_CameraOrdering]
        filter: _CameraFilter
      ): [Camera]
        @relation(name: "REFLEXIVE_INTERFACE_RELATIONSHIP", direction: OUT)
    }
    enum _CameraOrdering {
      id_asc
      id_desc
      type_asc
      type_desc
      make_asc
      make_desc
      weight_asc
      weight_desc
    }
    type _AddOldCameraOperatorsPayload
      @relation(name: "cameras", from: "Person", to: "OldCamera") {
      """
      Field for the Person node this cameras [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      from: Person
      """
      Field for the OldCamera node this cameras [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      to: OldCamera
    }
    type _RemoveOldCameraOperatorsPayload
      @relation(name: "cameras", from: "Person", to: "OldCamera") {
      """
      Field for the Person node this cameras [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      from: Person
      """
      Field for the OldCamera node this cameras [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      to: OldCamera
    }
    type _MergeOldCameraOperatorsPayload
      @relation(name: "cameras", from: "Person", to: "OldCamera") {
      """
      Field for the Person node this cameras [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      from: Person
      """
      Field for the OldCamera node this cameras [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      to: OldCamera
    }
    type _AddOldCameraReflexiveInterfaceRelationshipPayload
      @relation(
        name: "REFLEXIVE_INTERFACE_RELATIONSHIP"
        from: "OldCamera"
        to: "Camera"
      ) {
      """
      Field for the OldCamera node this REFLEXIVE_INTERFACE_RELATIONSHIP [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      from: OldCamera
      """
      Field for the Camera node this REFLEXIVE_INTERFACE_RELATIONSHIP [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      to: Camera
    }
    type _RemoveOldCameraReflexiveInterfaceRelationshipPayload
      @relation(
        name: "REFLEXIVE_INTERFACE_RELATIONSHIP"
        from: "OldCamera"
        to: "Camera"
      ) {
      """
      Field for the OldCamera node this REFLEXIVE_INTERFACE_RELATIONSHIP [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      from: OldCamera
      """
      Field for the Camera node this REFLEXIVE_INTERFACE_RELATIONSHIP [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      to: Camera
    }
    type _MergeOldCameraReflexiveInterfaceRelationshipPayload
      @relation(
        name: "REFLEXIVE_INTERFACE_RELATIONSHIP"
        from: "OldCamera"
        to: "Camera"
      ) {
      """
      Field for the OldCamera node this REFLEXIVE_INTERFACE_RELATIONSHIP [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      from: OldCamera
      """
      Field for the Camera node this REFLEXIVE_INTERFACE_RELATIONSHIP [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      to: Camera
    }
    input _OldCameraInput {
      id: ID!
    }
    enum _OldCameraOrdering {
      type_asc
      type_desc
      id_asc
      id_desc
      make_asc
      make_desc
      weight_asc
      weight_desc
      smell_asc
      smell_desc
      _id_asc
      _id_desc
    }
    input _OldCameraFilter {
      AND: [_OldCameraFilter!]
      OR: [_OldCameraFilter!]
      type: String
      type_not: String
      type_in: [String!]
      type_not_in: [String!]
      type_regexp: String
      type_contains: String
      type_not_contains: String
      type_starts_with: String
      type_not_starts_with: String
      type_ends_with: String
      type_not_ends_with: String
      id: ID
      id_not: ID
      id_in: [ID!]
      id_not_in: [ID!]
      id_regexp: ID
      id_contains: ID
      id_not_contains: ID
      id_starts_with: ID
      id_not_starts_with: ID
      id_ends_with: ID
      id_not_ends_with: ID
      make: String
      make_not: String
      make_in: [String!]
      make_not_in: [String!]
      make_regexp: String
      make_contains: String
      make_not_contains: String
      make_starts_with: String
      make_not_starts_with: String
      make_ends_with: String
      make_not_ends_with: String
      weight: Int
      weight_not: Int
      weight_in: [Int!]
      weight_not_in: [Int!]
      weight_lt: Int
      weight_lte: Int
      weight_gt: Int
      weight_gte: Int
      smell: String
      smell_not: String
      smell_in: [String!]
      smell_not_in: [String!]
      smell_regexp: String
      smell_contains: String
      smell_not_contains: String
      smell_starts_with: String
      smell_not_starts_with: String
      smell_ends_with: String
      smell_not_ends_with: String
      operators: _PersonFilter
      operators_not: _PersonFilter
      operators_in: [_PersonFilter!]
      operators_not_in: [_PersonFilter!]
      operators_some: _PersonFilter
      operators_none: _PersonFilter
      operators_single: _PersonFilter
      operators_every: _PersonFilter
      reflexiveInterfaceRelationship: _CameraFilter
      reflexiveInterfaceRelationship_not: _CameraFilter
      reflexiveInterfaceRelationship_in: [_CameraFilter!]
      reflexiveInterfaceRelationship_not_in: [_CameraFilter!]
      reflexiveInterfaceRelationship_some: _CameraFilter
      reflexiveInterfaceRelationship_none: _CameraFilter
      reflexiveInterfaceRelationship_single: _CameraFilter
      reflexiveInterfaceRelationship_every: _CameraFilter
    }
    type OldCamera implements Camera {
      type: String
      id: ID! @unique
      make: String
      weight: Int
      smell: String
      operators(
        first: Int
        offset: Int
        orderBy: [_PersonOrdering]
        filter: _PersonFilter
      ): [Person] @relation(name: "cameras", direction: IN)
      computedOperators(
        name: String
        first: Int
        offset: Int
        orderBy: [_PersonOrdering]
      ): [Person]
        @cypher(statement: "MATCH (this)<-[:cameras]-(p:Person) RETURN p")
      reflexiveInterfaceRelationship(
        first: Int
        offset: Int
        orderBy: [_CameraOrdering]
        filter: _CameraFilter
      ): [Camera]
        @relation(name: "REFLEXIVE_INTERFACE_RELATIONSHIP", direction: OUT)
      """
      Generated field for querying the Neo4j [system id](https://neo4j.com/docs/cypher-manual/current/functions/scalar/#functions-id) of this node.
      """
      _id: String
    }
    type _AddNewCameraOperatorsPayload
      @relation(name: "cameras", from: "Person", to: "NewCamera") {
      """
      Field for the Person node this cameras [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      from: Person
      """
      Field for the NewCamera node this cameras [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      to: NewCamera
    }
    type _RemoveNewCameraOperatorsPayload
      @relation(name: "cameras", from: "Person", to: "NewCamera") {
      """
      Field for the Person node this cameras [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      from: Person
      """
      Field for the NewCamera node this cameras [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      to: NewCamera
    }
    type _MergeNewCameraOperatorsPayload
      @relation(name: "cameras", from: "Person", to: "NewCamera") {
      """
      Field for the Person node this cameras [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      from: Person
      """
      Field for the NewCamera node this cameras [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      to: NewCamera
    }
    type _AddNewCameraReflexiveInterfaceRelationshipPayload
      @relation(
        name: "REFLEXIVE_INTERFACE_RELATIONSHIP"
        from: "NewCamera"
        to: "Camera"
      ) {
      """
      Field for the NewCamera node this REFLEXIVE_INTERFACE_RELATIONSHIP [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      from: NewCamera
      """
      Field for the Camera node this REFLEXIVE_INTERFACE_RELATIONSHIP [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      to: Camera
    }
    type _RemoveNewCameraReflexiveInterfaceRelationshipPayload
      @relation(
        name: "REFLEXIVE_INTERFACE_RELATIONSHIP"
        from: "NewCamera"
        to: "Camera"
      ) {
      """
      Field for the NewCamera node this REFLEXIVE_INTERFACE_RELATIONSHIP [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      from: NewCamera
      """
      Field for the Camera node this REFLEXIVE_INTERFACE_RELATIONSHIP [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      to: Camera
    }
    type _MergeNewCameraReflexiveInterfaceRelationshipPayload
      @relation(
        name: "REFLEXIVE_INTERFACE_RELATIONSHIP"
        from: "NewCamera"
        to: "Camera"
      ) {
      """
      Field for the NewCamera node this REFLEXIVE_INTERFACE_RELATIONSHIP [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      from: NewCamera
      """
      Field for the Camera node this REFLEXIVE_INTERFACE_RELATIONSHIP [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      to: Camera
    }
    input _NewCameraInput {
      id: ID!
    }
    enum _NewCameraOrdering {
      type_asc
      type_desc
      id_asc
      id_desc
      make_asc
      make_desc
      weight_asc
      weight_desc
      _id_asc
      _id_desc
    }
    input _NewCameraFilter {
      AND: [_NewCameraFilter!]
      OR: [_NewCameraFilter!]
      type: String
      type_not: String
      type_in: [String!]
      type_not_in: [String!]
      type_regexp: String
      type_contains: String
      type_not_contains: String
      type_starts_with: String
      type_not_starts_with: String
      type_ends_with: String
      type_not_ends_with: String
      id: ID
      id_not: ID
      id_in: [ID!]
      id_not_in: [ID!]
      id_regexp: ID
      id_contains: ID
      id_not_contains: ID
      id_starts_with: ID
      id_not_starts_with: ID
      id_ends_with: ID
      id_not_ends_with: ID
      make: String
      make_not: String
      make_in: [String!]
      make_not_in: [String!]
      make_regexp: String
      make_contains: String
      make_not_contains: String
      make_starts_with: String
      make_not_starts_with: String
      make_ends_with: String
      make_not_ends_with: String
      weight: Int
      weight_not: Int
      weight_in: [Int!]
      weight_not_in: [Int!]
      weight_lt: Int
      weight_lte: Int
      weight_gt: Int
      weight_gte: Int
      features: [String!]
      features_not: [String!]
      features_regexp: String
      features_contains: [String!]
      features_not_contains: [String!]
      features_starts_with: [String!]
      features_not_starts_with: [String!]
      features_ends_with: [String!]
      features_not_ends_with: [String!]
      operators: _PersonFilter
      operators_not: _PersonFilter
      operators_in: [_PersonFilter!]
      operators_not_in: [_PersonFilter!]
      operators_some: _PersonFilter
      operators_none: _PersonFilter
      operators_single: _PersonFilter
      operators_every: _PersonFilter
      reflexiveInterfaceRelationship: _CameraFilter
      reflexiveInterfaceRelationship_not: _CameraFilter
      reflexiveInterfaceRelationship_in: [_CameraFilter!]
      reflexiveInterfaceRelationship_not_in: [_CameraFilter!]
      reflexiveInterfaceRelationship_some: _CameraFilter
      reflexiveInterfaceRelationship_none: _CameraFilter
      reflexiveInterfaceRelationship_single: _CameraFilter
      reflexiveInterfaceRelationship_every: _CameraFilter
    }
    type NewCamera implements Camera {
      type: String
      id: ID! @unique
      make: String
      weight: Int
      features: [String]
      operators(
        first: Int
        offset: Int
        orderBy: [_PersonOrdering]
        filter: _PersonFilter
      ): [Person] @relation(name: "cameras", direction: IN)
      computedOperators(
        name: String
        first: Int
        offset: Int
        orderBy: [_PersonOrdering]
      ): [Person]
        @cypher(statement: "MATCH (this)<-[:cameras]-(p:Person) RETURN p")
      reflexiveInterfaceRelationship(
        first: Int
        offset: Int
        orderBy: [_CameraOrdering]
        filter: _CameraFilter
      ): [Camera]
        @relation(name: "REFLEXIVE_INTERFACE_RELATIONSHIP", direction: OUT)
      """
      Generated field for querying the Neo4j [system id](https://neo4j.com/docs/cypher-manual/current/functions/scalar/#functions-id) of this node.
      """
      _id: String
    }
    """
    Union type
    block description
    """
    union MovieSearch = Movie | Genre | Book | Actor | OldCamera
    type _AddCameraManFavoriteCameraPayload
      @relation(name: "favoriteCamera", from: "CameraMan", to: "Camera") {
      """
      Field for the CameraMan node this favoriteCamera [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      from: CameraMan
      """
      Field for the Camera node this favoriteCamera [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      to: Camera
    }
    type _RemoveCameraManFavoriteCameraPayload
      @relation(name: "favoriteCamera", from: "CameraMan", to: "Camera") {
      """
      Field for the CameraMan node this favoriteCamera [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      from: CameraMan
      """
      Field for the Camera node this favoriteCamera [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      to: Camera
    }
    type _MergeCameraManFavoriteCameraPayload
      @relation(name: "favoriteCamera", from: "CameraMan", to: "Camera") {
      """
      Field for the CameraMan node this favoriteCamera [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      from: CameraMan
      """
      Field for the Camera node this favoriteCamera [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      to: Camera
    }
    type _AddCameraManCamerasPayload
      @relation(name: "cameras", from: "CameraMan", to: "Camera") {
      """
      Field for the CameraMan node this cameras [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      from: CameraMan
      """
      Field for the Camera node this cameras [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      to: Camera
    }
    type _RemoveCameraManCamerasPayload
      @relation(name: "cameras", from: "CameraMan", to: "Camera") {
      """
      Field for the CameraMan node this cameras [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      from: CameraMan
      """
      Field for the Camera node this cameras [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      to: Camera
    }
    type _MergeCameraManCamerasPayload
      @relation(name: "cameras", from: "CameraMan", to: "Camera") {
      """
      Field for the CameraMan node this cameras [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      from: CameraMan
      """
      Field for the Camera node this cameras [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      to: Camera
    }
    type _AddCameraManCameraBuddyPayload
      @relation(name: "cameraBuddy", from: "CameraMan", to: "Person") {
      """
      Field for the CameraMan node this cameraBuddy [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      from: CameraMan
      """
      Field for the Person node this cameraBuddy [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      to: Person
    }
    type _RemoveCameraManCameraBuddyPayload
      @relation(name: "cameraBuddy", from: "CameraMan", to: "Person") {
      """
      Field for the CameraMan node this cameraBuddy [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      from: CameraMan
      """
      Field for the Person node this cameraBuddy [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      to: Person
    }
    type _MergeCameraManCameraBuddyPayload
      @relation(name: "cameraBuddy", from: "CameraMan", to: "Person") {
      """
      Field for the CameraMan node this cameraBuddy [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      from: CameraMan
      """
      Field for the Person node this cameraBuddy [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      to: Person
    }
    type _AddCameraManInterfacedRelationshipTypePayload
      @relation(
        name: "INTERFACED_RELATIONSHIP_TYPE"
        from: "Person"
        to: "Genre"
      ) {
      """
      Field for the Person node this INTERFACED_RELATIONSHIP_TYPE [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      from: Person
      """
      Field for the Genre node this INTERFACED_RELATIONSHIP_TYPE [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      to: Genre
      string: String!
      boolean: Boolean
      """
      Generated field for querying the Neo4j [system id](https://neo4j.com/docs/cypher-manual/current/functions/scalar/#functions-id) of this relationship.
      """
      _id: String
    }
    type _RemoveCameraManInterfacedRelationshipTypePayload
      @relation(
        name: "INTERFACED_RELATIONSHIP_TYPE"
        from: "Person"
        to: "Genre"
      ) {
      """
      Field for the Person node this INTERFACED_RELATIONSHIP_TYPE [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      from: Person
      """
      Field for the Genre node this INTERFACED_RELATIONSHIP_TYPE [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      to: Genre
    }
    type _UpdateCameraManInterfacedRelationshipTypePayload
      @relation(
        name: "INTERFACED_RELATIONSHIP_TYPE"
        from: "Person"
        to: "Genre"
      ) {
      """
      Field for the Person node this INTERFACED_RELATIONSHIP_TYPE [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      from: Person
      """
      Field for the Genre node this INTERFACED_RELATIONSHIP_TYPE [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      to: Genre
      string: String!
      boolean: Boolean
      """
      Generated field for querying the Neo4j [system id](https://neo4j.com/docs/cypher-manual/current/functions/scalar/#functions-id) of this relationship.
      """
      _id: String
    }
    type _MergeCameraManInterfacedRelationshipTypePayload
      @relation(
        name: "INTERFACED_RELATIONSHIP_TYPE"
        from: "Person"
        to: "Genre"
      ) {
      """
      Field for the Person node this INTERFACED_RELATIONSHIP_TYPE [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      from: Person
      """
      Field for the Genre node this INTERFACED_RELATIONSHIP_TYPE [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      to: Genre
      string: String!
      boolean: Boolean
      """
      Generated field for querying the Neo4j [system id](https://neo4j.com/docs/cypher-manual/current/functions/scalar/#functions-id) of this relationship.
      """
      _id: String
    }
    type _AddCameraManReflexiveInterfacedRelationshipTypePayload
      @relation(
        name: "REFLEXIVE_INTERFACED_RELATIONSHIP_TYPE"
        from: "Person"
        to: "Person"
      ) {
      """
      Field for the Person node this REFLEXIVE_INTERFACED_RELATIONSHIP_TYPE [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      from: Person
      """
      Field for the Person node this REFLEXIVE_INTERFACED_RELATIONSHIP_TYPE [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      to: Person
      boolean: Boolean
      """
      Generated field for querying the Neo4j [system id](https://neo4j.com/docs/cypher-manual/current/functions/scalar/#functions-id) of this relationship.
      """
      _id: String
    }
    type _RemoveCameraManReflexiveInterfacedRelationshipTypePayload
      @relation(
        name: "REFLEXIVE_INTERFACED_RELATIONSHIP_TYPE"
        from: "Person"
        to: "Person"
      ) {
      """
      Field for the Person node this REFLEXIVE_INTERFACED_RELATIONSHIP_TYPE [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      from: Person
      """
      Field for the Person node this REFLEXIVE_INTERFACED_RELATIONSHIP_TYPE [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      to: Person
    }
    type _UpdateCameraManReflexiveInterfacedRelationshipTypePayload
      @relation(
        name: "REFLEXIVE_INTERFACED_RELATIONSHIP_TYPE"
        from: "Person"
        to: "Person"
      ) {
      """
      Field for the Person node this REFLEXIVE_INTERFACED_RELATIONSHIP_TYPE [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      from: Person
      """
      Field for the Person node this REFLEXIVE_INTERFACED_RELATIONSHIP_TYPE [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      to: Person
      boolean: Boolean
      """
      Generated field for querying the Neo4j [system id](https://neo4j.com/docs/cypher-manual/current/functions/scalar/#functions-id) of this relationship.
      """
      _id: String
    }
    type _MergeCameraManReflexiveInterfacedRelationshipTypePayload
      @relation(
        name: "REFLEXIVE_INTERFACED_RELATIONSHIP_TYPE"
        from: "Person"
        to: "Person"
      ) {
      """
      Field for the Person node this REFLEXIVE_INTERFACED_RELATIONSHIP_TYPE [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      from: Person
      """
      Field for the Person node this REFLEXIVE_INTERFACED_RELATIONSHIP_TYPE [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      to: Person
      boolean: Boolean
      """
      Generated field for querying the Neo4j [system id](https://neo4j.com/docs/cypher-manual/current/functions/scalar/#functions-id) of this relationship.
      """
      _id: String
    }
    input _CameraManInput {
      userId: ID!
    }
    enum _CameraManOrdering {
      userId_asc
      userId_desc
      name_asc
      name_desc
      extensionScalar_asc
      extensionScalar_desc
      _id_asc
      _id_desc
    }
    input _CameraManFilter {
      AND: [_CameraManFilter!]
      OR: [_CameraManFilter!]
      userId: ID
      userId_not: ID
      userId_in: [ID!]
      userId_not_in: [ID!]
      userId_regexp: ID
      userId_contains: ID
      userId_not_contains: ID
      userId_starts_with: ID
      userId_not_starts_with: ID
      userId_ends_with: ID
      userId_not_ends_with: ID
      name: String
      name_not: String
      name_in: [String!]
      name_not_in: [String!]
      name_regexp: String
      name_contains: String
      name_not_contains: String
      name_starts_with: String
      name_not_starts_with: String
      name_ends_with: String
      name_not_ends_with: String
      favoriteCamera: _CameraFilter
      favoriteCamera_not: _CameraFilter
      favoriteCamera_in: [_CameraFilter!]
      favoriteCamera_not_in: [_CameraFilter!]
      cameras: _CameraFilter
      cameras_not: _CameraFilter
      cameras_in: [_CameraFilter!]
      cameras_not_in: [_CameraFilter!]
      cameras_some: _CameraFilter
      cameras_none: _CameraFilter
      cameras_single: _CameraFilter
      cameras_every: _CameraFilter
      cameraBuddy: _PersonFilter
      cameraBuddy_not: _PersonFilter
      cameraBuddy_in: [_PersonFilter!]
      cameraBuddy_not_in: [_PersonFilter!]
      extensionScalar: String
      extensionScalar_not: String
      extensionScalar_in: [String!]
      extensionScalar_not_in: [String!]
      extensionScalar_regexp: String
      extensionScalar_contains: String
      extensionScalar_not_contains: String
      extensionScalar_starts_with: String
      extensionScalar_not_starts_with: String
      extensionScalar_ends_with: String
      extensionScalar_not_ends_with: String
      interfacedRelationshipType: _PersonInterfacedRelationshipTypeFilter
      interfacedRelationshipType_not: _PersonInterfacedRelationshipTypeFilter
      interfacedRelationshipType_in: [_PersonInterfacedRelationshipTypeFilter!]
      interfacedRelationshipType_not_in: [_PersonInterfacedRelationshipTypeFilter!]
      interfacedRelationshipType_some: _PersonInterfacedRelationshipTypeFilter
      interfacedRelationshipType_none: _PersonInterfacedRelationshipTypeFilter
      interfacedRelationshipType_single: _PersonInterfacedRelationshipTypeFilter
      interfacedRelationshipType_every: _PersonInterfacedRelationshipTypeFilter
      reflexiveInterfacedRelationshipType: _ReflexiveInterfacedRelationshipTypeDirectionsFilter
      reflexiveInterfacedRelationshipType_not: _ReflexiveInterfacedRelationshipTypeDirectionsFilter
      reflexiveInterfacedRelationshipType_in: [_ReflexiveInterfacedRelationshipTypeDirectionsFilter!]
      reflexiveInterfacedRelationshipType_not_in: [_ReflexiveInterfacedRelationshipTypeDirectionsFilter!]
      reflexiveInterfacedRelationshipType_some: _ReflexiveInterfacedRelationshipTypeDirectionsFilter
      reflexiveInterfacedRelationshipType_none: _ReflexiveInterfacedRelationshipTypeDirectionsFilter
      reflexiveInterfacedRelationshipType_single: _ReflexiveInterfacedRelationshipTypeDirectionsFilter
      reflexiveInterfacedRelationshipType_every: _ReflexiveInterfacedRelationshipTypeDirectionsFilter
    }
    type CameraMan implements Person {
      userId: ID!
      name: String
      favoriteCamera(filter: _CameraFilter): Camera
        @relation(name: "favoriteCamera", direction: "OUT")
      heaviestCamera(
        first: Int
        offset: Int
        orderBy: [_CameraOrdering]
      ): [Camera]
        @cypher(
          statement: "MATCH (c: Camera)--(this) RETURN c ORDER BY c.weight DESC LIMIT 1"
        )
      cameras(
        first: Int
        offset: Int
        orderBy: [_CameraOrdering]
        filter: _CameraFilter
      ): [Camera!]! @relation(name: "cameras", direction: "OUT")
      cameraBuddy(filter: _PersonFilter): Person
        @relation(name: "cameraBuddy", direction: "OUT")
      extensionScalar: String
      interfacedRelationshipType(
        first: Int
        offset: Int
        orderBy: [_InterfacedRelationshipTypeOrdering]
        filter: _PersonInterfacedRelationshipTypeFilter
      ): [_PersonInterfacedRelationshipType]
      reflexiveInterfacedRelationshipType: _PersonReflexiveInterfacedRelationshipTypeDirections
      """
      Generated field for querying the Neo4j [system id](https://neo4j.com/docs/cypher-manual/current/functions/scalar/#functions-id) of this node.
      """
      _id: String
    }
    type _AddUniqueNodeTestRelationPayload
      @relation(
        name: "TEST_RELATION"
        from: "UniqueNode"
        to: "UniqueStringNode"
      ) {
      """
      Field for the UniqueNode node this TEST_RELATION [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      from: UniqueNode
      """
      Field for the UniqueStringNode node this TEST_RELATION [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      to: UniqueStringNode
    }
    type _RemoveUniqueNodeTestRelationPayload
      @relation(
        name: "TEST_RELATION"
        from: "UniqueNode"
        to: "UniqueStringNode"
      ) {
      """
      Field for the UniqueNode node this TEST_RELATION [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      from: UniqueNode
      """
      Field for the UniqueStringNode node this TEST_RELATION [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      to: UniqueStringNode
    }
    type _MergeUniqueNodeTestRelationPayload
      @relation(
        name: "TEST_RELATION"
        from: "UniqueNode"
        to: "UniqueStringNode"
      ) {
      """
      Field for the UniqueNode node this TEST_RELATION [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      from: UniqueNode
      """
      Field for the UniqueStringNode node this TEST_RELATION [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      to: UniqueStringNode
    }
    input _UniqueNodeInput {
      id: ID!
    }
    enum _UniqueNodeOrdering {
      string_asc
      string_desc
      id_asc
      id_desc
      anotherId_asc
      anotherId_desc
      _id_asc
      _id_desc
    }
    input _UniqueNodeFilter {
      AND: [_UniqueNodeFilter!]
      OR: [_UniqueNodeFilter!]
      string: String
      string_not: String
      string_in: [String!]
      string_not_in: [String!]
      string_regexp: String
      string_contains: String
      string_not_contains: String
      string_starts_with: String
      string_not_starts_with: String
      string_ends_with: String
      string_not_ends_with: String
      id: ID
      id_not: ID
      id_in: [ID!]
      id_not_in: [ID!]
      id_regexp: ID
      id_contains: ID
      id_not_contains: ID
      id_starts_with: ID
      id_not_starts_with: ID
      id_ends_with: ID
      id_not_ends_with: ID
      anotherId: ID
      anotherId_not: ID
      anotherId_in: [ID!]
      anotherId_not_in: [ID!]
      anotherId_regexp: ID
      anotherId_contains: ID
      anotherId_not_contains: ID
      anotherId_starts_with: ID
      anotherId_not_starts_with: ID
      anotherId_ends_with: ID
      anotherId_not_ends_with: ID
      testRelation: _UniqueStringNodeFilter
      testRelation_not: _UniqueStringNodeFilter
      testRelation_in: [_UniqueStringNodeFilter!]
      testRelation_not_in: [_UniqueStringNodeFilter!]
      testRelation_some: _UniqueStringNodeFilter
      testRelation_none: _UniqueStringNodeFilter
      testRelation_single: _UniqueStringNodeFilter
      testRelation_every: _UniqueStringNodeFilter
    }
    type UniqueNode {
      string: String @unique
      id: ID @id
      anotherId: ID @index
      testRelation(
        first: Int
        offset: Int
        orderBy: [_UniqueStringNodeOrdering]
        filter: _UniqueStringNodeFilter
      ): [UniqueStringNode] @relation(name: "TEST_RELATION", direction: OUT)
      """
      Generated field for querying the Neo4j [system id](https://neo4j.com/docs/cypher-manual/current/functions/scalar/#functions-id) of this node.
      """
      _id: String
    }
    type _AddUniqueStringNodeTestRelationPayload
      @relation(
        name: "TEST_RELATION"
        from: "UniqueNode"
        to: "UniqueStringNode"
      ) {
      """
      Field for the UniqueNode node this TEST_RELATION [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      from: UniqueNode
      """
      Field for the UniqueStringNode node this TEST_RELATION [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      to: UniqueStringNode
    }
    type _RemoveUniqueStringNodeTestRelationPayload
      @relation(
        name: "TEST_RELATION"
        from: "UniqueNode"
        to: "UniqueStringNode"
      ) {
      """
      Field for the UniqueNode node this TEST_RELATION [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      from: UniqueNode
      """
      Field for the UniqueStringNode node this TEST_RELATION [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      to: UniqueStringNode
    }
    type _MergeUniqueStringNodeTestRelationPayload
      @relation(
        name: "TEST_RELATION"
        from: "UniqueNode"
        to: "UniqueStringNode"
      ) {
      """
      Field for the UniqueNode node this TEST_RELATION [relationship](https://grandstack.io/docs/graphql-relationship-types) is coming from.
      """
      from: UniqueNode
      """
      Field for the UniqueStringNode node this TEST_RELATION [relationship](https://grandstack.io/docs/graphql-relationship-types) is going to.
      """
      to: UniqueStringNode
    }
    input _UniqueStringNodeInput {
      uniqueString: String!
    }
    enum _UniqueStringNodeOrdering {
      id_asc
      id_desc
      uniqueString_asc
      uniqueString_desc
      _id_asc
      _id_desc
    }
    input _UniqueStringNodeFilter {
      AND: [_UniqueStringNodeFilter!]
      OR: [_UniqueStringNodeFilter!]
      id: ID
      id_not: ID
      id_in: [ID!]
      id_not_in: [ID!]
      id_regexp: ID
      id_contains: ID
      id_not_contains: ID
      id_starts_with: ID
      id_not_starts_with: ID
      id_ends_with: ID
      id_not_ends_with: ID
      uniqueString: String
      uniqueString_not: String
      uniqueString_in: [String!]
      uniqueString_not_in: [String!]
      uniqueString_regexp: String
      uniqueString_contains: String
      uniqueString_not_contains: String
      uniqueString_starts_with: String
      uniqueString_not_starts_with: String
      uniqueString_ends_with: String
      uniqueString_not_ends_with: String
      testRelation: _UniqueNodeFilter
      testRelation_not: _UniqueNodeFilter
      testRelation_in: [_UniqueNodeFilter!]
      testRelation_not_in: [_UniqueNodeFilter!]
      testRelation_some: _UniqueNodeFilter
      testRelation_none: _UniqueNodeFilter
      testRelation_single: _UniqueNodeFilter
      testRelation_every: _UniqueNodeFilter
    }
    type UniqueStringNode {
      id: ID!
      """
      Generated field for querying the Neo4j [system id](https://neo4j.com/docs/cypher-manual/current/functions/scalar/#functions-id) of this node.
      """
      _id: String
      uniqueString: String @unique
      testRelation(
        first: Int
        offset: Int
        orderBy: [_UniqueNodeOrdering]
        filter: _UniqueNodeFilter
      ): [UniqueNode] @relation(name: "TEST_RELATION", direction: IN)
    }
    """
    Generated Time input object for Neo4j [Temporal field arguments](https://grandstack.io/docs/graphql-temporal-types-datetime/#temporal-query-arguments).
    """
    input _Neo4jTimeInput {
      hour: Int
      minute: Int
      second: Int
      millisecond: Int
      microsecond: Int
      nanosecond: Int
      timezone: String
      """
      Creates a Neo4j [Temporal](https://grandstack.io/docs/graphql-temporal-types-datetime/#using-temporal-fields-in-mutations) Time value using a [String format](https://neo4j.com/docs/cypher-manual/current/functions/temporal/time/#functions-time-create-string).
      """
      formatted: String
    }
    """
    Generated Time object type for Neo4j [Temporal fields](https://grandstack.io/docs/graphql-temporal-types-datetime#using-temporal-fields-in-queries).
    """
    type _Neo4jTime {
      hour: Int
      minute: Int
      second: Int
      millisecond: Int
      microsecond: Int
      nanosecond: Int
      timezone: String
      """
      Outputs a Neo4j [Temporal](https://grandstack.io/docs/graphql-temporal-types-datetime#using-temporal-fields-in-queries) Time value as a String type by using the [toString](https://neo4j.com/docs/cypher-manual/current/functions/string/#functions-tostring) Cypher function.
      """
      formatted: String
    }
    """
    Generated Date input object for Neo4j [Temporal field arguments](https://grandstack.io/docs/graphql-temporal-types-datetime/#temporal-query-arguments).
    """
    input _Neo4jDateInput {
      year: Int
      month: Int
      day: Int
      """
      Creates a Neo4j [Temporal](https://grandstack.io/docs/graphql-temporal-types-datetime/#using-temporal-fields-in-mutations) Date value using a [String format](https://neo4j.com/docs/cypher-manual/current/functions/temporal/date/#functions-date-create-string).
      """
      formatted: String
    }
    """
    Generated Date object type for Neo4j [Temporal fields](https://grandstack.io/docs/graphql-temporal-types-datetime#using-temporal-fields-in-queries).
    """
    type _Neo4jDate {
      year: Int
      month: Int
      day: Int
      """
      Outputs a Neo4j [Temporal](https://grandstack.io/docs/graphql-temporal-types-datetime#using-temporal-fields-in-queries) Date value as a String type by using the [toString](https://neo4j.com/docs/cypher-manual/current/functions/string/#functions-tostring) Cypher function.
      """
      formatted: String
    }
    """
    Generated DateTime input object for Neo4j [Temporal field arguments](https://grandstack.io/docs/graphql-temporal-types-datetime/#temporal-query-arguments).
    """
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
      """
      Creates a Neo4j [Temporal](https://grandstack.io/docs/graphql-temporal-types-datetime/#using-temporal-fields-in-mutations) DateTime value using a [String format](https://neo4j.com/docs/cypher-manual/current/functions/temporal/datetime/#functions-datetime-create-string).
      """
      formatted: String
    }
    """
    Generated DateTime object type for Neo4j [Temporal fields](https://grandstack.io/docs/graphql-temporal-types-datetime#using-temporal-fields-in-queries).
    """
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
      """
      Outputs a Neo4j [Temporal](https://grandstack.io/docs/graphql-temporal-types-datetime#using-temporal-fields-in-queries) DateTime value as a String type by using the [toString](https://neo4j.com/docs/cypher-manual/current/functions/string/#functions-tostring) Cypher function.
      """
      formatted: String
    }
    """
    Generated LocalTime input object for Neo4j [Temporal field arguments](https://grandstack.io/docs/graphql-temporal-types-datetime/#temporal-query-arguments).
    """
    input _Neo4jLocalTimeInput {
      hour: Int
      minute: Int
      second: Int
      millisecond: Int
      microsecond: Int
      nanosecond: Int
      """
      Creates a Neo4j [Temporal](https://grandstack.io/docs/graphql-temporal-types-datetime/#using-temporal-fields-in-mutations) LocalTime value using a [String format](https://neo4j.com/docs/cypher-manual/current/functions/temporal/localtime/#functions-localtime-create-string).
      """
      formatted: String
    }
    """
    Generated LocalTime object type for Neo4j [Temporal fields](https://grandstack.io/docs/graphql-temporal-types-datetime#using-temporal-fields-in-queries).
    """
    type _Neo4jLocalTime {
      hour: Int
      minute: Int
      second: Int
      millisecond: Int
      microsecond: Int
      nanosecond: Int
      """
      Outputs a Neo4j [Temporal](https://grandstack.io/docs/graphql-temporal-types-datetime#using-temporal-fields-in-queries) LocalTime value as a String type by using the [toString](https://neo4j.com/docs/cypher-manual/current/functions/string/#functions-tostring) Cypher function.
      """
      formatted: String
    }
    """
    Generated LocalDateTime input object for Neo4j [Temporal field arguments](https://grandstack.io/docs/graphql-temporal-types-datetime/#temporal-query-arguments).
    """
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
      """
      Creates a Neo4j [Temporal](https://grandstack.io/docs/graphql-temporal-types-datetime/#using-temporal-fields-in-mutations) LocalDateTime value using a [String format](https://neo4j.com/docs/cypher-manual/current/functions/temporal/localdatetime/#functions-localdatetime-create-string).
      """
      formatted: String
    }
    """
    Generated LocalDateTime object type for Neo4j [Temporal fields](https://grandstack.io/docs/graphql-temporal-types-datetime#using-temporal-fields-in-queries).
    """
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
      """
      Outputs a Neo4j [Temporal](https://grandstack.io/docs/graphql-temporal-types-datetime#using-temporal-fields-in-queries) LocalDateTime value as a String type by using the [toString](https://neo4j.com/docs/cypher-manual/current/functions/string/#functions-tostring) Cypher function.
      """
      formatted: String
    }
    input _Neo4jPointDistanceFilter {
      point: _Neo4jPointInput!
      distance: Float!
    }
    """
    Generated Point input object for Neo4j [Spatial field arguments](https://grandstack.io/docs/graphql-spatial-types/#point-query-arguments).
    """
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
    """
    Generated Point object type for Neo4j [Spatial fields](https://grandstack.io/docs/graphql-spatial-types#using-point-in-queries).
    """
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
    """
    Query type line description
    """
    type QueryA {
      """
      Query field
      block
      description
      """
      MoviesByYear(
        year: Int
        first: Int
        offset: Int
        orderBy: [_MovieOrdering]
        filter: _MovieFilter
      ): [Movie]
      MoviesByYears(
        year: [Int]
        released: [_Neo4jDateTimeInput]
        first: Int
        offset: Int
        orderBy: [_MovieOrdering]
        filter: _MovieFilter
      ): [Movie]
      MovieById(movieId: ID!, filter: _MovieFilter): Movie
      MovieBy_Id(_id: String!, filter: _MovieFilter): Movie
      GenresBySubstring(
        substring: String
        first: Int
        offset: Int
        orderBy: [_GenreOrdering]
      ): [Genre]
        @cypher(
          statement: "MATCH (g:Genre) WHERE toLower(g.name) CONTAINS toLower($substring) RETURN g"
        )
      """
      Object type query field line description
      """
      State(
        first: Int
        offset: Int
        orderBy: [_StateOrdering]
        filter: _StateFilter
      ): [State]
      User(
        userId: ID
        name: String
        _id: String
        first: Int
        offset: Int
        orderBy: [_UserOrdering]
        filter: _UserFilter
      ): [User]
      Books(
        first: Int
        offset: Int
        orderBy: [_BookOrdering]
        filter: _BookFilter
      ): [Book]
      currentUserId: String
        @cypher(
          statement: "RETURN $cypherParams.currentUserId AS currentUserId"
        )
      computedBoolean: Boolean @cypher(statement: "RETURN true")
      computedFloat: Float @cypher(statement: "RETURN 3.14")
      computedInt: Int @cypher(statement: "RETURN 1")
      computedIntList: [Int]
        @cypher(statement: "UNWIND [1, 2, 3] AS intList RETURN intList")
      computedStringList: [String]
        @cypher(
          statement: "UNWIND ['hello', 'world'] AS stringList RETURN stringList"
        )
      computedTemporal: _Neo4jDateTime
        @cypher(
          statement: "WITH datetime() AS now RETURN { year: now.year, month: now.month , day: now.day , hour: now.hour , minute: now.minute , second: now.second , millisecond: now.millisecond , microsecond: now.microsecond , nanosecond: now.nanosecond , timezone: now.timezone , formatted: toString(now) }"
        )
      computedSpatial: _Neo4jPoint
        @cypher(
          statement: "WITH point({ x: 10, y: 20, z: 15 }) AS instance RETURN { x: instance.x, y: instance.y, z: instance.z, crs: instance.crs }"
        )
      computedObjectWithCypherParams: currentUserId
        @cypher(statement: "RETURN { userId: $cypherParams.currentUserId }")
      customWithArguments(strArg: String, strInputArg: strInput): String
        @cypher(statement: "RETURN $strInputArg.strArg")
      CasedType(
        first: Int
        offset: Int
        orderBy: [_CasedTypeOrdering]
        filter: _CasedTypeFilter
      ): [CasedType]
      """
      Interface type query field line description
      """
      Camera(
        type: String
        first: Int
        orderBy: [_CameraOrdering]
        filter: _CameraFilter
        offset: Int
      ): [Camera]
      Person(
        userId: ID
        name: String
        extensionScalar: String
        _id: String
        first: Int
        offset: Int
        orderBy: [_PersonOrdering]
        filter: _PersonFilter
      ): [Person]
      InterfaceNoScalars(
        orderBy: _InterfaceNoScalarsOrdering
        first: Int
        offset: Int
        filter: _InterfaceNoScalarsFilter
      ): [InterfaceNoScalars]
      CustomCameras(
        first: Int
        offset: Int
        orderBy: [_CameraOrdering]
      ): [Camera] @cypher(statement: "MATCH (c:Camera) RETURN c")
      CustomCamera: Camera @cypher(statement: "MATCH (c:Camera) RETURN c")
      """
      [Generated query](https://grandstack.io/docs/graphql-schema-generation-augmentation#generated-queries) for Movie type nodes.
      """
      Movie(
        _id: String
        movieId: ID
        title: String
        someprefix_title_with_underscores: String
        year: Int
        released: _Neo4jDateTimeInput
        plot: String
        poster: String
        imdbRating: Float
        avgStars: Float
        location: _Neo4jPointInput
        locations: [_Neo4jPointInput]
        years: [Int]
        titles: [String]
        imdbRatings: [Float]
        releases: [_Neo4jDateTimeInput]
        booleans: [Boolean]
        enums: [BookGenre]
        extensionScalar: String
        first: Int
        offset: Int
        orderBy: [_MovieOrdering]
        filter: _MovieFilter
        search: _MovieSearch
      ): [Movie] @hasScope(scopes: ["Movie: Read", "read:movie"])
      """
      [Generated query](https://grandstack.io/docs/graphql-schema-generation-augmentation#generated-queries) for Genre type nodes.
      """
      Genre(
        _id: String
        name: String
        first: Int
        offset: Int
        orderBy: [_GenreOrdering]
        filter: _GenreFilter
      ): [Genre] @hasScope(scopes: ["Genre: Read", "read:genre"])
      """
      [Generated query](https://grandstack.io/docs/graphql-schema-generation-augmentation#generated-queries) for Actor type nodes.
      """
      Actor(
        userId: ID
        name: String
        extensionScalar: String
        datetimes: [_Neo4jDateTimeInput]
        strings: [String]
        _id: String
        first: Int
        offset: Int
        orderBy: [_ActorOrdering]
        filter: _ActorFilter
      ): [Actor] @hasScope(scopes: ["Actor: Read", "read:actor"])
      """
      [Generated query](https://grandstack.io/docs/graphql-schema-generation-augmentation#generated-queries) for Book type nodes.
      """
      Book(
        genre: BookGenre
        _id: String
        first: Int
        offset: Int
        orderBy: [_BookOrdering]
        filter: _BookFilter
      ): [Book] @hasScope(scopes: ["Book: Read", "read:book"])
      """
      [Generated query](https://grandstack.io/docs/graphql-schema-generation-augmentation#generated-queries) for TemporalNode type nodes.
      """
      TemporalNode(
        datetime: _Neo4jDateTimeInput
        name: String
        time: _Neo4jTimeInput
        date: _Neo4jDateInput
        localtime: _Neo4jLocalTimeInput
        localdatetime: _Neo4jLocalDateTimeInput
        localdatetimes: [_Neo4jLocalDateTimeInput]
        _id: String
        first: Int
        offset: Int
        orderBy: [_TemporalNodeOrdering]
        filter: _TemporalNodeFilter
      ): [TemporalNode]
        @hasScope(scopes: ["TemporalNode: Read", "read:temporalnode"])
      """
      [Generated query](https://grandstack.io/docs/graphql-schema-generation-augmentation#generated-queries) for SpatialNode type nodes.
      """
      SpatialNode(
        id: ID
        point: _Neo4jPointInput
        _id: String
        first: Int
        offset: Int
        orderBy: [_SpatialNodeOrdering]
        filter: _SpatialNodeFilter
      ): [SpatialNode]
        @hasScope(scopes: ["SpatialNode: Read", "read:spatialnode"])
      """
      [Generated query](https://grandstack.io/docs/graphql-schema-generation-augmentation#generated-queries) for OldCamera type nodes.
      """
      OldCamera(
        type: String
        id: ID
        make: String
        weight: Int
        smell: String
        _id: String
        first: Int
        offset: Int
        orderBy: [_OldCameraOrdering]
        filter: _OldCameraFilter
      ): [OldCamera] @hasScope(scopes: ["OldCamera: Read", "read:oldcamera"])
      """
      [Generated query](https://grandstack.io/docs/graphql-schema-generation-augmentation#generated-queries) for NewCamera type nodes.
      """
      NewCamera(
        type: String
        id: ID
        make: String
        weight: Int
        features: [String]
        _id: String
        first: Int
        offset: Int
        orderBy: [_NewCameraOrdering]
        filter: _NewCameraFilter
      ): [NewCamera] @hasScope(scopes: ["NewCamera: Read", "read:newcamera"])
      """
      [Generated query](https://grandstack.io/docs/graphql-schema-generation-augmentation#generated-queries) for CameraMan type nodes.
      """
      CameraMan(
        userId: ID
        name: String
        extensionScalar: String
        _id: String
        first: Int
        offset: Int
        orderBy: [_CameraManOrdering]
        filter: _CameraManFilter
      ): [CameraMan] @hasScope(scopes: ["CameraMan: Read", "read:cameraman"])
      """
      [Generated query](https://grandstack.io/docs/graphql-schema-generation-augmentation#generated-queries) for UniqueNode type nodes.
      """
      UniqueNode(
        string: String
        id: ID
        anotherId: ID
        _id: String
        first: Int
        offset: Int
        orderBy: [_UniqueNodeOrdering]
        filter: _UniqueNodeFilter
      ): [UniqueNode] @hasScope(scopes: ["UniqueNode: Read", "read:uniquenode"])
      """
      [Generated query](https://grandstack.io/docs/graphql-schema-generation-augmentation#generated-queries) for UniqueStringNode type nodes.
      """
      UniqueStringNode(
        id: ID
        uniqueString: String
        _id: String
        first: Int
        offset: Int
        orderBy: [_UniqueStringNodeOrdering]
        filter: _UniqueStringNodeFilter
      ): [UniqueStringNode]
        @hasScope(scopes: ["UniqueStringNode: Read", "read:uniquestringnode"])
      MovieSearch(first: Int, offset: Int): [MovieSearch]
      computedMovieSearch(first: Int, offset: Int): [MovieSearch]
        @cypher(statement: "MATCH (ms:MovieSearch) RETURN ms")
    }
    """
    Mutation  type line description
    """
    type Mutation {
      """
      Mutation  field line description
      """
      currentUserId: String
        @cypher(statement: "RETURN $cypherParams.currentUserId")
      """
      Mutation  field
      block
      description
      """
      computedObjectWithCypherParams: currentUserId
        @cypher(statement: "RETURN { userId: $cypherParams.currentUserId }")
      computedTemporal: _Neo4jDateTime
        @cypher(
          statement: "WITH datetime() AS now RETURN { year: now.year, month: now.month , day: now.day , hour: now.hour , minute: now.minute , second: now.second , millisecond: now.millisecond , microsecond: now.microsecond , nanosecond: now.nanosecond , timezone: now.timezone , formatted: toString(now) }"
        )
      computedSpatial: _Neo4jPoint
        @cypher(
          statement: "WITH point({ x: 10, y: 20, z: 15 }) AS instance RETURN { x: instance.x, y: instance.y, z: instance.z, crs: instance.crs }"
        )
      computedStringList: [String]
        @cypher(
          statement: "UNWIND ['hello', 'world'] AS stringList RETURN stringList"
        )
      customWithArguments(
        """
        Mutation field argument
        block description
        """
        strArg: String
        strInputArg: strInput
      ): String @cypher(statement: "RETURN $strInputArg.strArg")
      testPublish: Boolean @neo4j_ignore
      computedMovieSearch: [MovieSearch]
        @cypher(statement: "MATCH (ms:MovieSearch) RETURN ms")
      customCreateNode(
        integer: Int
        datetime: _Neo4jDateTimeInput
        integers: [Int]
        datetimes: [_Neo4jDateTimeInput]
        point: _Neo4jPointInput
        points: [_Neo4jPointInput]
      ): Boolean
        @cypher(
          statement: "CREATE (n:Node { integer: $integer, datetime: datetime($datetime), point: point($point), integers: $integers, datetimes: [value IN $datetimes | datetime(value)], points: [value IN $points | point(value)] }) RETURN TRUE"
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##add--remove-relationship) for [creating](https://neo4j.com/docs/cypher-manual/4.1/clauses/create/#create-relationships) the IN_GENRE relationship.
      """
      AddMovieExtensionNode(
        from: _MovieInput!
        to: _GenreInput!
      ): _AddMovieExtensionNodePayload
        @MutationMeta(relationship: "IN_GENRE", from: "Movie", to: "Genre")
        @hasScope(
          scopes: [
            "Movie: Create"
            "create:movie"
            "Genre: Create"
            "create:genre"
          ]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##add--remove-relationship) for [deleting](https://neo4j.com/docs/cypher-manual/4.1/clauses/delete/#delete-delete-relationships-only) the IN_GENRE relationship.
      """
      RemoveMovieExtensionNode(
        from: _MovieInput!
        to: _GenreInput!
      ): _RemoveMovieExtensionNodePayload
        @MutationMeta(relationship: "IN_GENRE", from: "Movie", to: "Genre")
        @hasScope(
          scopes: [
            "Movie: Delete"
            "delete:movie"
            "Genre: Delete"
            "delete:genre"
          ]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##merge-relationship) for [merging](https://neo4j.com/docs/cypher-manual/4.1/clauses/merge/#query-merge-relationships) the IN_GENRE relationship.
      """
      MergeMovieExtensionNode(
        from: _MovieInput!
        to: _GenreInput!
      ): _MergeMovieExtensionNodePayload
        @MutationMeta(relationship: "IN_GENRE", from: "Movie", to: "Genre")
        @hasScope(
          scopes: ["Movie: Merge", "merge:movie", "Genre: Merge", "merge:genre"]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##add--remove-relationship) for [creating](https://neo4j.com/docs/cypher-manual/4.1/clauses/create/#create-relationships) the IN_GENRE relationship.
      """
      AddMovieGenres(
        from: _MovieInput!
        to: _GenreInput!
      ): _AddMovieGenresPayload
        @MutationMeta(relationship: "IN_GENRE", from: "Movie", to: "Genre")
        @hasScope(
          scopes: [
            "Movie: Create"
            "create:movie"
            "Genre: Create"
            "create:genre"
          ]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##add--remove-relationship) for [deleting](https://neo4j.com/docs/cypher-manual/4.1/clauses/delete/#delete-delete-relationships-only) the IN_GENRE relationship.
      """
      RemoveMovieGenres(
        from: _MovieInput!
        to: _GenreInput!
      ): _RemoveMovieGenresPayload
        @MutationMeta(relationship: "IN_GENRE", from: "Movie", to: "Genre")
        @hasScope(
          scopes: [
            "Movie: Delete"
            "delete:movie"
            "Genre: Delete"
            "delete:genre"
          ]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##merge-relationship) for [merging](https://neo4j.com/docs/cypher-manual/4.1/clauses/merge/#query-merge-relationships) the IN_GENRE relationship.
      """
      MergeMovieGenres(
        from: _MovieInput!
        to: _GenreInput!
      ): _MergeMovieGenresPayload
        @MutationMeta(relationship: "IN_GENRE", from: "Movie", to: "Genre")
        @hasScope(
          scopes: ["Movie: Merge", "merge:movie", "Genre: Merge", "merge:genre"]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##add--remove-relationship) for [creating](https://neo4j.com/docs/cypher-manual/4.1/clauses/create/#create-relationships) the ACTED_IN relationship.
      """
      AddMovieActors(
        from: _ActorInput!
        to: _MovieInput!
      ): _AddMovieActorsPayload
        @MutationMeta(relationship: "ACTED_IN", from: "Actor", to: "Movie")
        @hasScope(
          scopes: [
            "Actor: Create"
            "create:actor"
            "Movie: Create"
            "create:movie"
          ]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##add--remove-relationship) for [deleting](https://neo4j.com/docs/cypher-manual/4.1/clauses/delete/#delete-delete-relationships-only) the ACTED_IN relationship.
      """
      RemoveMovieActors(
        from: _ActorInput!
        to: _MovieInput!
      ): _RemoveMovieActorsPayload
        @MutationMeta(relationship: "ACTED_IN", from: "Actor", to: "Movie")
        @hasScope(
          scopes: [
            "Actor: Delete"
            "delete:actor"
            "Movie: Delete"
            "delete:movie"
          ]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##merge-relationship) for [merging](https://neo4j.com/docs/cypher-manual/4.1/clauses/merge/#query-merge-relationships) the ACTED_IN relationship.
      """
      MergeMovieActors(
        from: _ActorInput!
        to: _MovieInput!
      ): _MergeMovieActorsPayload
        @MutationMeta(relationship: "ACTED_IN", from: "Actor", to: "Movie")
        @hasScope(
          scopes: ["Actor: Merge", "merge:actor", "Movie: Merge", "merge:movie"]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##add--remove-relationship) for [creating](https://neo4j.com/docs/cypher-manual/4.1/clauses/create/#create-relationships) the FILMED_IN relationship.
      """
      AddMovieFilmedIn(
        from: _MovieInput!
        to: _StateInput!
      ): _AddMovieFilmedInPayload
        @MutationMeta(relationship: "FILMED_IN", from: "Movie", to: "State")
        @hasScope(
          scopes: [
            "Movie: Create"
            "create:movie"
            "State: Create"
            "create:state"
          ]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##add--remove-relationship) for [deleting](https://neo4j.com/docs/cypher-manual/4.1/clauses/delete/#delete-delete-relationships-only) the FILMED_IN relationship.
      """
      RemoveMovieFilmedIn(
        from: _MovieInput!
        to: _StateInput!
      ): _RemoveMovieFilmedInPayload
        @MutationMeta(relationship: "FILMED_IN", from: "Movie", to: "State")
        @hasScope(
          scopes: [
            "Movie: Delete"
            "delete:movie"
            "State: Delete"
            "delete:state"
          ]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##merge-relationship) for [merging](https://neo4j.com/docs/cypher-manual/4.1/clauses/merge/#query-merge-relationships) the FILMED_IN relationship.
      """
      MergeMovieFilmedIn(
        from: _MovieInput!
        to: _StateInput!
      ): _MergeMovieFilmedInPayload
        @MutationMeta(relationship: "FILMED_IN", from: "Movie", to: "State")
        @hasScope(
          scopes: ["Movie: Merge", "merge:movie", "State: Merge", "merge:state"]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##add--remove-relationship) for [creating](https://neo4j.com/docs/cypher-manual/4.1/clauses/create/#create-relationships) the RATED relationship.
      """
      AddMovieRatings(
        from: _UserInput!
        to: _MovieInput!
        data: _RatedInput!
      ): _AddMovieRatingsPayload
        @MutationMeta(relationship: "RATED", from: "User", to: "Movie")
        @hasScope(
          scopes: [
            "User: Create"
            "create:user"
            "Movie: Create"
            "create:movie"
          ]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##add--remove-relationship) for [deleting](https://neo4j.com/docs/cypher-manual/4.1/clauses/delete/#delete-delete-relationships-only) the RATED relationship.
      """
      RemoveMovieRatings(
        from: _UserInput!
        to: _MovieInput!
      ): _RemoveMovieRatingsPayload
        @MutationMeta(relationship: "RATED", from: "User", to: "Movie")
        @hasScope(
          scopes: [
            "User: Delete"
            "delete:user"
            "Movie: Delete"
            "delete:movie"
          ]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##update-relationship) for [updating](https://neo4j.com/docs/cypher-manual/4.1/clauses/set/#set-update-a-property) the RATED relationship.
      """
      UpdateMovieRatings(
        from: _UserInput!
        to: _MovieInput!
        data: _RatedInput!
      ): _UpdateMovieRatingsPayload
        @MutationMeta(relationship: "RATED", from: "User", to: "Movie")
        @hasScope(
          scopes: [
            "User: Update"
            "update:user"
            "Movie: Update"
            "update:movie"
          ]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##merge-relationship) for [merging](https://neo4j.com/docs/cypher-manual/4.1/clauses/merge/#query-merge-relationships) the RATED relationship.
      """
      MergeMovieRatings(
        from: _UserInput!
        to: _MovieInput!
        data: _RatedInput!
      ): _MergeMovieRatingsPayload
        @MutationMeta(relationship: "RATED", from: "User", to: "Movie")
        @hasScope(
          scopes: ["User: Merge", "merge:user", "Movie: Merge", "merge:movie"]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##add--remove-relationship) for [creating](https://neo4j.com/docs/cypher-manual/4.1/clauses/create/#create-relationships) the RATED_NO_PROPS relationship.
      """
      AddMovieRatingsNoProps(
        from: _UserInput!
        to: _MovieInput!
      ): _AddMovieRatingsNoPropsPayload
        @MutationMeta(relationship: "RATED_NO_PROPS", from: "User", to: "Movie")
        @hasScope(
          scopes: [
            "User: Create"
            "create:user"
            "Movie: Create"
            "create:movie"
          ]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##add--remove-relationship) for [deleting](https://neo4j.com/docs/cypher-manual/4.1/clauses/delete/#delete-delete-relationships-only) the RATED_NO_PROPS relationship.
      """
      RemoveMovieRatingsNoProps(
        from: _UserInput!
        to: _MovieInput!
      ): _RemoveMovieRatingsNoPropsPayload
        @MutationMeta(relationship: "RATED_NO_PROPS", from: "User", to: "Movie")
        @hasScope(
          scopes: [
            "User: Delete"
            "delete:user"
            "Movie: Delete"
            "delete:movie"
          ]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##merge-relationship) for [merging](https://neo4j.com/docs/cypher-manual/4.1/clauses/merge/#query-merge-relationships) the RATED_NO_PROPS relationship.
      """
      MergeMovieRatingsNoProps(
        from: _UserInput!
        to: _MovieInput!
      ): _MergeMovieRatingsNoPropsPayload
        @MutationMeta(relationship: "RATED_NO_PROPS", from: "User", to: "Movie")
        @hasScope(
          scopes: ["User: Merge", "merge:user", "Movie: Merge", "merge:movie"]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##add--remove-relationship) for [creating](https://neo4j.com/docs/cypher-manual/4.1/clauses/create/#create-relationships) the RATED_CUSTOM_FROM relationship.
      """
      AddMovieRatingsCustomFrom(
        ratedBy: _UserInput!
        to: _MovieInput!
        data: _RatedCustomFromInput!
      ): _AddMovieRatingsCustomFromPayload
        @MutationMeta(
          relationship: "RATED_CUSTOM_FROM"
          from: "User"
          to: "Movie"
        )
        @hasScope(
          scopes: [
            "User: Create"
            "create:user"
            "Movie: Create"
            "create:movie"
          ]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##add--remove-relationship) for [deleting](https://neo4j.com/docs/cypher-manual/4.1/clauses/delete/#delete-delete-relationships-only) the RATED_CUSTOM_FROM relationship.
      """
      RemoveMovieRatingsCustomFrom(
        ratedBy: _UserInput!
        to: _MovieInput!
      ): _RemoveMovieRatingsCustomFromPayload
        @MutationMeta(
          relationship: "RATED_CUSTOM_FROM"
          from: "User"
          to: "Movie"
        )
        @hasScope(
          scopes: [
            "User: Delete"
            "delete:user"
            "Movie: Delete"
            "delete:movie"
          ]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##update-relationship) for [updating](https://neo4j.com/docs/cypher-manual/4.1/clauses/set/#set-update-a-property) the RATED_CUSTOM_FROM relationship.
      """
      UpdateMovieRatingsCustomFrom(
        ratedBy: _UserInput!
        to: _MovieInput!
        data: _RatedCustomFromInput!
      ): _UpdateMovieRatingsCustomFromPayload
        @MutationMeta(
          relationship: "RATED_CUSTOM_FROM"
          from: "User"
          to: "Movie"
        )
        @hasScope(
          scopes: [
            "User: Update"
            "update:user"
            "Movie: Update"
            "update:movie"
          ]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##merge-relationship) for [merging](https://neo4j.com/docs/cypher-manual/4.1/clauses/merge/#query-merge-relationships) the RATED_CUSTOM_FROM relationship.
      """
      MergeMovieRatingsCustomFrom(
        ratedBy: _UserInput!
        to: _MovieInput!
        data: _RatedCustomFromInput!
      ): _MergeMovieRatingsCustomFromPayload
        @MutationMeta(
          relationship: "RATED_CUSTOM_FROM"
          from: "User"
          to: "Movie"
        )
        @hasScope(
          scopes: ["User: Merge", "merge:user", "Movie: Merge", "merge:movie"]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##add--remove-relationship) for [creating](https://neo4j.com/docs/cypher-manual/4.1/clauses/create/#create-relationships) the RATED_CUSTOM_TO relationship.
      """
      AddMovieRatingsCustomTo(
        from: _UserInput!
        movie: _MovieInput!
        data: _RatedCustomToInput!
      ): _AddMovieRatingsCustomToPayload
        @MutationMeta(
          relationship: "RATED_CUSTOM_TO"
          from: "User"
          to: "Movie"
        )
        @hasScope(
          scopes: [
            "User: Create"
            "create:user"
            "Movie: Create"
            "create:movie"
          ]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##add--remove-relationship) for [deleting](https://neo4j.com/docs/cypher-manual/4.1/clauses/delete/#delete-delete-relationships-only) the RATED_CUSTOM_TO relationship.
      """
      RemoveMovieRatingsCustomTo(
        from: _UserInput!
        movie: _MovieInput!
      ): _RemoveMovieRatingsCustomToPayload
        @MutationMeta(
          relationship: "RATED_CUSTOM_TO"
          from: "User"
          to: "Movie"
        )
        @hasScope(
          scopes: [
            "User: Delete"
            "delete:user"
            "Movie: Delete"
            "delete:movie"
          ]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##update-relationship) for [updating](https://neo4j.com/docs/cypher-manual/4.1/clauses/set/#set-update-a-property) the RATED_CUSTOM_TO relationship.
      """
      UpdateMovieRatingsCustomTo(
        from: _UserInput!
        movie: _MovieInput!
        data: _RatedCustomToInput!
      ): _UpdateMovieRatingsCustomToPayload
        @MutationMeta(
          relationship: "RATED_CUSTOM_TO"
          from: "User"
          to: "Movie"
        )
        @hasScope(
          scopes: [
            "User: Update"
            "update:user"
            "Movie: Update"
            "update:movie"
          ]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##merge-relationship) for [merging](https://neo4j.com/docs/cypher-manual/4.1/clauses/merge/#query-merge-relationships) the RATED_CUSTOM_TO relationship.
      """
      MergeMovieRatingsCustomTo(
        from: _UserInput!
        movie: _MovieInput!
        data: _RatedCustomToInput!
      ): _MergeMovieRatingsCustomToPayload
        @MutationMeta(
          relationship: "RATED_CUSTOM_TO"
          from: "User"
          to: "Movie"
        )
        @hasScope(
          scopes: ["User: Merge", "merge:user", "Movie: Merge", "merge:movie"]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##add--remove-relationship) for [creating](https://neo4j.com/docs/cypher-manual/4.1/clauses/create/#create-relationships) the RATED_CUSTOM_FROM_TO relationship.
      """
      AddMovieRatingsCustomFromTo(
        ratedBy: _UserInput!
        movie: _MovieInput!
        data: _RatedCustomFromToInput!
      ): _AddMovieRatingsCustomFromToPayload
        @MutationMeta(
          relationship: "RATED_CUSTOM_FROM_TO"
          from: "User"
          to: "Movie"
        )
        @hasScope(
          scopes: [
            "User: Create"
            "create:user"
            "Movie: Create"
            "create:movie"
          ]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##add--remove-relationship) for [deleting](https://neo4j.com/docs/cypher-manual/4.1/clauses/delete/#delete-delete-relationships-only) the RATED_CUSTOM_FROM_TO relationship.
      """
      RemoveMovieRatingsCustomFromTo(
        ratedBy: _UserInput!
        movie: _MovieInput!
      ): _RemoveMovieRatingsCustomFromToPayload
        @MutationMeta(
          relationship: "RATED_CUSTOM_FROM_TO"
          from: "User"
          to: "Movie"
        )
        @hasScope(
          scopes: [
            "User: Delete"
            "delete:user"
            "Movie: Delete"
            "delete:movie"
          ]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##update-relationship) for [updating](https://neo4j.com/docs/cypher-manual/4.1/clauses/set/#set-update-a-property) the RATED_CUSTOM_FROM_TO relationship.
      """
      UpdateMovieRatingsCustomFromTo(
        ratedBy: _UserInput!
        movie: _MovieInput!
        data: _RatedCustomFromToInput!
      ): _UpdateMovieRatingsCustomFromToPayload
        @MutationMeta(
          relationship: "RATED_CUSTOM_FROM_TO"
          from: "User"
          to: "Movie"
        )
        @hasScope(
          scopes: [
            "User: Update"
            "update:user"
            "Movie: Update"
            "update:movie"
          ]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##merge-relationship) for [merging](https://neo4j.com/docs/cypher-manual/4.1/clauses/merge/#query-merge-relationships) the RATED_CUSTOM_FROM_TO relationship.
      """
      MergeMovieRatingsCustomFromTo(
        ratedBy: _UserInput!
        movie: _MovieInput!
        data: _RatedCustomFromToInput!
      ): _MergeMovieRatingsCustomFromToPayload
        @MutationMeta(
          relationship: "RATED_CUSTOM_FROM_TO"
          from: "User"
          to: "Movie"
        )
        @hasScope(
          scopes: ["User: Merge", "merge:user", "Movie: Merge", "merge:movie"]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/#create) for [creating](https://neo4j.com/docs/cypher-manual/4.1/clauses/create/#create-nodes) a Movie node.
      """
      CreateMovie(
        movieId: ID
        title: String
        someprefix_title_with_underscores: String
        year: Int
        released: _Neo4jDateTimeInput
        plot: String
        poster: String
        imdbRating: Float
        avgStars: Float
        location: _Neo4jPointInput
        locations: [_Neo4jPointInput]
        years: [Int]
        titles: [String]
        imdbRatings: [Float]
        releases: [_Neo4jDateTimeInput]
        booleans: [Boolean]
        enums: [BookGenre]
        extensionScalar: String
      ): Movie @hasScope(scopes: ["Movie: Create", "create:movie"])
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/#update) for [updating](https://neo4j.com/docs/cypher-manual/4.1/clauses/set/#set-update-a-property) a Movie node.
      """
      UpdateMovie(
        movieId: ID!
        title: String
        someprefix_title_with_underscores: String
        year: Int
        released: _Neo4jDateTimeInput
        plot: String
        poster: String
        imdbRating: Float
        avgStars: Float
        location: _Neo4jPointInput
        locations: [_Neo4jPointInput]
        years: [Int]
        titles: [String]
        imdbRatings: [Float]
        releases: [_Neo4jDateTimeInput]
        booleans: [Boolean]
        enums: [BookGenre]
        extensionScalar: String
      ): Movie @hasScope(scopes: ["Movie: Update", "update:movie"])
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/#delete) for [deleting](https://neo4j.com/docs/cypher-manual/4.1/clauses/delete/#delete-delete-single-node) a Movie node.
      """
      DeleteMovie(movieId: ID!): Movie
        @hasScope(scopes: ["Movie: Delete", "delete:movie"])
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/#merge) for [merging](https://neo4j.com/docs/cypher-manual/4.1/clauses/merge/#query-merge-node-derived) a Movie node.
      """
      MergeMovie(
        movieId: ID!
        title: String
        someprefix_title_with_underscores: String
        year: Int
        released: _Neo4jDateTimeInput
        plot: String
        poster: String
        imdbRating: Float
        avgStars: Float
        location: _Neo4jPointInput
        locations: [_Neo4jPointInput]
        years: [Int]
        titles: [String]
        imdbRatings: [Float]
        releases: [_Neo4jDateTimeInput]
        booleans: [Boolean]
        enums: [BookGenre]
        extensionScalar: String
      ): Movie @hasScope(scopes: ["Movie: Merge", "merge:movie"])
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##add--remove-relationship) for [creating](https://neo4j.com/docs/cypher-manual/4.1/clauses/create/#create-relationships) the IN_GENRE relationship.
      """
      AddGenreMovies(
        from: _MovieInput!
        to: _GenreInput!
      ): _AddGenreMoviesPayload
        @MutationMeta(relationship: "IN_GENRE", from: "Movie", to: "Genre")
        @hasScope(
          scopes: [
            "Movie: Create"
            "create:movie"
            "Genre: Create"
            "create:genre"
          ]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##add--remove-relationship) for [deleting](https://neo4j.com/docs/cypher-manual/4.1/clauses/delete/#delete-delete-relationships-only) the IN_GENRE relationship.
      """
      RemoveGenreMovies(
        from: _MovieInput!
        to: _GenreInput!
      ): _RemoveGenreMoviesPayload
        @MutationMeta(relationship: "IN_GENRE", from: "Movie", to: "Genre")
        @hasScope(
          scopes: [
            "Movie: Delete"
            "delete:movie"
            "Genre: Delete"
            "delete:genre"
          ]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##merge-relationship) for [merging](https://neo4j.com/docs/cypher-manual/4.1/clauses/merge/#query-merge-relationships) the IN_GENRE relationship.
      """
      MergeGenreMovies(
        from: _MovieInput!
        to: _GenreInput!
      ): _MergeGenreMoviesPayload
        @MutationMeta(relationship: "IN_GENRE", from: "Movie", to: "Genre")
        @hasScope(
          scopes: ["Movie: Merge", "merge:movie", "Genre: Merge", "merge:genre"]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##add--remove-relationship) for [creating](https://neo4j.com/docs/cypher-manual/4.1/clauses/create/#create-relationships) the INTERFACED_RELATIONSHIP_TYPE relationship.
      """
      AddGenreInterfacedRelationshipType(
        from: _PersonInput!
        to: _GenreInput!
        data: _InterfacedRelationshipTypeInput!
      ): _AddGenreInterfacedRelationshipTypePayload
        @MutationMeta(
          relationship: "INTERFACED_RELATIONSHIP_TYPE"
          from: "Person"
          to: "Genre"
        )
        @hasScope(
          scopes: [
            "Person: Create"
            "create:person"
            "Genre: Create"
            "create:genre"
          ]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##add--remove-relationship) for [deleting](https://neo4j.com/docs/cypher-manual/4.1/clauses/delete/#delete-delete-relationships-only) the INTERFACED_RELATIONSHIP_TYPE relationship.
      """
      RemoveGenreInterfacedRelationshipType(
        from: _PersonInput!
        to: _GenreInput!
      ): _RemoveGenreInterfacedRelationshipTypePayload
        @MutationMeta(
          relationship: "INTERFACED_RELATIONSHIP_TYPE"
          from: "Person"
          to: "Genre"
        )
        @hasScope(
          scopes: [
            "Person: Delete"
            "delete:person"
            "Genre: Delete"
            "delete:genre"
          ]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##update-relationship) for [updating](https://neo4j.com/docs/cypher-manual/4.1/clauses/set/#set-update-a-property) the INTERFACED_RELATIONSHIP_TYPE relationship.
      """
      UpdateGenreInterfacedRelationshipType(
        from: _PersonInput!
        to: _GenreInput!
        data: _InterfacedRelationshipTypeInput!
      ): _UpdateGenreInterfacedRelationshipTypePayload
        @MutationMeta(
          relationship: "INTERFACED_RELATIONSHIP_TYPE"
          from: "Person"
          to: "Genre"
        )
        @hasScope(
          scopes: [
            "Person: Update"
            "update:person"
            "Genre: Update"
            "update:genre"
          ]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##merge-relationship) for [merging](https://neo4j.com/docs/cypher-manual/4.1/clauses/merge/#query-merge-relationships) the INTERFACED_RELATIONSHIP_TYPE relationship.
      """
      MergeGenreInterfacedRelationshipType(
        from: _PersonInput!
        to: _GenreInput!
        data: _InterfacedRelationshipTypeInput!
      ): _MergeGenreInterfacedRelationshipTypePayload
        @MutationMeta(
          relationship: "INTERFACED_RELATIONSHIP_TYPE"
          from: "Person"
          to: "Genre"
        )
        @hasScope(
          scopes: [
            "Person: Merge"
            "merge:person"
            "Genre: Merge"
            "merge:genre"
          ]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/#create) for [creating](https://neo4j.com/docs/cypher-manual/4.1/clauses/create/#create-nodes) a Genre node.
      """
      CreateGenre(name: String): Genre
        @hasScope(scopes: ["Genre: Create", "create:genre"])
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/#delete) for [deleting](https://neo4j.com/docs/cypher-manual/4.1/clauses/delete/#delete-delete-single-node) a Genre node.
      """
      DeleteGenre(name: String!): Genre
        @hasScope(scopes: ["Genre: Delete", "delete:genre"])
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/#merge) for [merging](https://neo4j.com/docs/cypher-manual/4.1/clauses/merge/#query-merge-node-derived) a Genre node.
      """
      MergeGenre(name: String!): Genre
        @hasScope(scopes: ["Genre: Merge", "merge:genre"])
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/#create) for [creating](https://neo4j.com/docs/cypher-manual/4.1/clauses/create/#create-nodes) a State node.
      """
      CreateState(name: String!, id: ID): State
        @hasScope(scopes: ["State: Create", "create:state"])
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/#update) for [updating](https://neo4j.com/docs/cypher-manual/4.1/clauses/set/#set-update-a-property) a State node.
      """
      UpdateState(name: String!, id: ID): State
        @hasScope(scopes: ["State: Update", "update:state"])
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/#delete) for [deleting](https://neo4j.com/docs/cypher-manual/4.1/clauses/delete/#delete-delete-single-node) a State node.
      """
      DeleteState(name: String!): State
        @hasScope(scopes: ["State: Delete", "delete:state"])
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/#merge) for [merging](https://neo4j.com/docs/cypher-manual/4.1/clauses/merge/#query-merge-node-derived) a State node.
      """
      MergeState(name: String!, id: ID): State
        @hasScope(scopes: ["State: Merge", "merge:state"])
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##add--remove-relationship) for [creating](https://neo4j.com/docs/cypher-manual/4.1/clauses/create/#create-relationships) the INTERFACED_RELATIONSHIP_TYPE relationship.
      """
      AddPersonInterfacedRelationshipType(
        from: _PersonInput!
        to: _GenreInput!
        data: _InterfacedRelationshipTypeInput!
      ): _AddPersonInterfacedRelationshipTypePayload
        @MutationMeta(
          relationship: "INTERFACED_RELATIONSHIP_TYPE"
          from: "Person"
          to: "Genre"
        )
        @hasScope(
          scopes: [
            "Person: Create"
            "create:person"
            "Genre: Create"
            "create:genre"
          ]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##add--remove-relationship) for [deleting](https://neo4j.com/docs/cypher-manual/4.1/clauses/delete/#delete-delete-relationships-only) the INTERFACED_RELATIONSHIP_TYPE relationship.
      """
      RemovePersonInterfacedRelationshipType(
        from: _PersonInput!
        to: _GenreInput!
      ): _RemovePersonInterfacedRelationshipTypePayload
        @MutationMeta(
          relationship: "INTERFACED_RELATIONSHIP_TYPE"
          from: "Person"
          to: "Genre"
        )
        @hasScope(
          scopes: [
            "Person: Delete"
            "delete:person"
            "Genre: Delete"
            "delete:genre"
          ]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##update-relationship) for [updating](https://neo4j.com/docs/cypher-manual/4.1/clauses/set/#set-update-a-property) the INTERFACED_RELATIONSHIP_TYPE relationship.
      """
      UpdatePersonInterfacedRelationshipType(
        from: _PersonInput!
        to: _GenreInput!
        data: _InterfacedRelationshipTypeInput!
      ): _UpdatePersonInterfacedRelationshipTypePayload
        @MutationMeta(
          relationship: "INTERFACED_RELATIONSHIP_TYPE"
          from: "Person"
          to: "Genre"
        )
        @hasScope(
          scopes: [
            "Person: Update"
            "update:person"
            "Genre: Update"
            "update:genre"
          ]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##merge-relationship) for [merging](https://neo4j.com/docs/cypher-manual/4.1/clauses/merge/#query-merge-relationships) the INTERFACED_RELATIONSHIP_TYPE relationship.
      """
      MergePersonInterfacedRelationshipType(
        from: _PersonInput!
        to: _GenreInput!
        data: _InterfacedRelationshipTypeInput!
      ): _MergePersonInterfacedRelationshipTypePayload
        @MutationMeta(
          relationship: "INTERFACED_RELATIONSHIP_TYPE"
          from: "Person"
          to: "Genre"
        )
        @hasScope(
          scopes: [
            "Person: Merge"
            "merge:person"
            "Genre: Merge"
            "merge:genre"
          ]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##add--remove-relationship) for [creating](https://neo4j.com/docs/cypher-manual/4.1/clauses/create/#create-relationships) the REFLEXIVE_INTERFACED_RELATIONSHIP_TYPE relationship.
      """
      AddPersonReflexiveInterfacedRelationshipType(
        from: _PersonInput!
        to: _PersonInput!
        data: _ReflexiveInterfacedRelationshipTypeInput!
      ): _AddPersonReflexiveInterfacedRelationshipTypePayload
        @MutationMeta(
          relationship: "REFLEXIVE_INTERFACED_RELATIONSHIP_TYPE"
          from: "Person"
          to: "Person"
        )
        @hasScope(
          scopes: [
            "Person: Create"
            "create:person"
            "Person: Create"
            "create:person"
          ]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##add--remove-relationship) for [deleting](https://neo4j.com/docs/cypher-manual/4.1/clauses/delete/#delete-delete-relationships-only) the REFLEXIVE_INTERFACED_RELATIONSHIP_TYPE relationship.
      """
      RemovePersonReflexiveInterfacedRelationshipType(
        from: _PersonInput!
        to: _PersonInput!
      ): _RemovePersonReflexiveInterfacedRelationshipTypePayload
        @MutationMeta(
          relationship: "REFLEXIVE_INTERFACED_RELATIONSHIP_TYPE"
          from: "Person"
          to: "Person"
        )
        @hasScope(
          scopes: [
            "Person: Delete"
            "delete:person"
            "Person: Delete"
            "delete:person"
          ]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##update-relationship) for [updating](https://neo4j.com/docs/cypher-manual/4.1/clauses/set/#set-update-a-property) the REFLEXIVE_INTERFACED_RELATIONSHIP_TYPE relationship.
      """
      UpdatePersonReflexiveInterfacedRelationshipType(
        from: _PersonInput!
        to: _PersonInput!
        data: _ReflexiveInterfacedRelationshipTypeInput!
      ): _UpdatePersonReflexiveInterfacedRelationshipTypePayload
        @MutationMeta(
          relationship: "REFLEXIVE_INTERFACED_RELATIONSHIP_TYPE"
          from: "Person"
          to: "Person"
        )
        @hasScope(
          scopes: [
            "Person: Update"
            "update:person"
            "Person: Update"
            "update:person"
          ]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##merge-relationship) for [merging](https://neo4j.com/docs/cypher-manual/4.1/clauses/merge/#query-merge-relationships) the REFLEXIVE_INTERFACED_RELATIONSHIP_TYPE relationship.
      """
      MergePersonReflexiveInterfacedRelationshipType(
        from: _PersonInput!
        to: _PersonInput!
        data: _ReflexiveInterfacedRelationshipTypeInput!
      ): _MergePersonReflexiveInterfacedRelationshipTypePayload
        @MutationMeta(
          relationship: "REFLEXIVE_INTERFACED_RELATIONSHIP_TYPE"
          from: "Person"
          to: "Person"
        )
        @hasScope(
          scopes: [
            "Person: Merge"
            "merge:person"
            "Person: Merge"
            "merge:person"
          ]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##add--remove-relationship) for [creating](https://neo4j.com/docs/cypher-manual/4.1/clauses/create/#create-relationships) the ACTED_IN relationship.
      """
      AddActorMovies(
        from: _ActorInput!
        to: _MovieInput!
      ): _AddActorMoviesPayload
        @MutationMeta(relationship: "ACTED_IN", from: "Actor", to: "Movie")
        @hasScope(
          scopes: [
            "Actor: Create"
            "create:actor"
            "Movie: Create"
            "create:movie"
          ]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##add--remove-relationship) for [deleting](https://neo4j.com/docs/cypher-manual/4.1/clauses/delete/#delete-delete-relationships-only) the ACTED_IN relationship.
      """
      RemoveActorMovies(
        from: _ActorInput!
        to: _MovieInput!
      ): _RemoveActorMoviesPayload
        @MutationMeta(relationship: "ACTED_IN", from: "Actor", to: "Movie")
        @hasScope(
          scopes: [
            "Actor: Delete"
            "delete:actor"
            "Movie: Delete"
            "delete:movie"
          ]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##merge-relationship) for [merging](https://neo4j.com/docs/cypher-manual/4.1/clauses/merge/#query-merge-relationships) the ACTED_IN relationship.
      """
      MergeActorMovies(
        from: _ActorInput!
        to: _MovieInput!
      ): _MergeActorMoviesPayload
        @MutationMeta(relationship: "ACTED_IN", from: "Actor", to: "Movie")
        @hasScope(
          scopes: ["Actor: Merge", "merge:actor", "Movie: Merge", "merge:movie"]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##add--remove-relationship) for [creating](https://neo4j.com/docs/cypher-manual/4.1/clauses/create/#create-relationships) the KNOWS relationship.
      """
      AddActorKnows(
        from: _ActorInput!
        to: _PersonInput!
      ): _AddActorKnowsPayload
        @MutationMeta(relationship: "KNOWS", from: "Actor", to: "Person")
        @hasScope(
          scopes: [
            "Actor: Create"
            "create:actor"
            "Person: Create"
            "create:person"
          ]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##add--remove-relationship) for [deleting](https://neo4j.com/docs/cypher-manual/4.1/clauses/delete/#delete-delete-relationships-only) the KNOWS relationship.
      """
      RemoveActorKnows(
        from: _ActorInput!
        to: _PersonInput!
      ): _RemoveActorKnowsPayload
        @MutationMeta(relationship: "KNOWS", from: "Actor", to: "Person")
        @hasScope(
          scopes: [
            "Actor: Delete"
            "delete:actor"
            "Person: Delete"
            "delete:person"
          ]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##merge-relationship) for [merging](https://neo4j.com/docs/cypher-manual/4.1/clauses/merge/#query-merge-relationships) the KNOWS relationship.
      """
      MergeActorKnows(
        from: _ActorInput!
        to: _PersonInput!
      ): _MergeActorKnowsPayload
        @MutationMeta(relationship: "KNOWS", from: "Actor", to: "Person")
        @hasScope(
          scopes: [
            "Actor: Merge"
            "merge:actor"
            "Person: Merge"
            "merge:person"
          ]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##add--remove-relationship) for [creating](https://neo4j.com/docs/cypher-manual/4.1/clauses/create/#create-relationships) the INTERFACED_RELATIONSHIP_TYPE relationship.
      """
      AddActorInterfacedRelationshipType(
        from: _PersonInput!
        to: _GenreInput!
        data: _InterfacedRelationshipTypeInput!
      ): _AddActorInterfacedRelationshipTypePayload
        @MutationMeta(
          relationship: "INTERFACED_RELATIONSHIP_TYPE"
          from: "Person"
          to: "Genre"
        )
        @hasScope(
          scopes: [
            "Person: Create"
            "create:person"
            "Genre: Create"
            "create:genre"
          ]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##add--remove-relationship) for [deleting](https://neo4j.com/docs/cypher-manual/4.1/clauses/delete/#delete-delete-relationships-only) the INTERFACED_RELATIONSHIP_TYPE relationship.
      """
      RemoveActorInterfacedRelationshipType(
        from: _PersonInput!
        to: _GenreInput!
      ): _RemoveActorInterfacedRelationshipTypePayload
        @MutationMeta(
          relationship: "INTERFACED_RELATIONSHIP_TYPE"
          from: "Person"
          to: "Genre"
        )
        @hasScope(
          scopes: [
            "Person: Delete"
            "delete:person"
            "Genre: Delete"
            "delete:genre"
          ]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##update-relationship) for [updating](https://neo4j.com/docs/cypher-manual/4.1/clauses/set/#set-update-a-property) the INTERFACED_RELATIONSHIP_TYPE relationship.
      """
      UpdateActorInterfacedRelationshipType(
        from: _PersonInput!
        to: _GenreInput!
        data: _InterfacedRelationshipTypeInput!
      ): _UpdateActorInterfacedRelationshipTypePayload
        @MutationMeta(
          relationship: "INTERFACED_RELATIONSHIP_TYPE"
          from: "Person"
          to: "Genre"
        )
        @hasScope(
          scopes: [
            "Person: Update"
            "update:person"
            "Genre: Update"
            "update:genre"
          ]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##merge-relationship) for [merging](https://neo4j.com/docs/cypher-manual/4.1/clauses/merge/#query-merge-relationships) the INTERFACED_RELATIONSHIP_TYPE relationship.
      """
      MergeActorInterfacedRelationshipType(
        from: _PersonInput!
        to: _GenreInput!
        data: _InterfacedRelationshipTypeInput!
      ): _MergeActorInterfacedRelationshipTypePayload
        @MutationMeta(
          relationship: "INTERFACED_RELATIONSHIP_TYPE"
          from: "Person"
          to: "Genre"
        )
        @hasScope(
          scopes: [
            "Person: Merge"
            "merge:person"
            "Genre: Merge"
            "merge:genre"
          ]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##add--remove-relationship) for [creating](https://neo4j.com/docs/cypher-manual/4.1/clauses/create/#create-relationships) the REFLEXIVE_INTERFACED_RELATIONSHIP_TYPE relationship.
      """
      AddActorReflexiveInterfacedRelationshipType(
        from: _PersonInput!
        to: _PersonInput!
        data: _ReflexiveInterfacedRelationshipTypeInput!
      ): _AddActorReflexiveInterfacedRelationshipTypePayload
        @MutationMeta(
          relationship: "REFLEXIVE_INTERFACED_RELATIONSHIP_TYPE"
          from: "Person"
          to: "Person"
        )
        @hasScope(
          scopes: [
            "Person: Create"
            "create:person"
            "Person: Create"
            "create:person"
          ]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##add--remove-relationship) for [deleting](https://neo4j.com/docs/cypher-manual/4.1/clauses/delete/#delete-delete-relationships-only) the REFLEXIVE_INTERFACED_RELATIONSHIP_TYPE relationship.
      """
      RemoveActorReflexiveInterfacedRelationshipType(
        from: _PersonInput!
        to: _PersonInput!
      ): _RemoveActorReflexiveInterfacedRelationshipTypePayload
        @MutationMeta(
          relationship: "REFLEXIVE_INTERFACED_RELATIONSHIP_TYPE"
          from: "Person"
          to: "Person"
        )
        @hasScope(
          scopes: [
            "Person: Delete"
            "delete:person"
            "Person: Delete"
            "delete:person"
          ]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##update-relationship) for [updating](https://neo4j.com/docs/cypher-manual/4.1/clauses/set/#set-update-a-property) the REFLEXIVE_INTERFACED_RELATIONSHIP_TYPE relationship.
      """
      UpdateActorReflexiveInterfacedRelationshipType(
        from: _PersonInput!
        to: _PersonInput!
        data: _ReflexiveInterfacedRelationshipTypeInput!
      ): _UpdateActorReflexiveInterfacedRelationshipTypePayload
        @MutationMeta(
          relationship: "REFLEXIVE_INTERFACED_RELATIONSHIP_TYPE"
          from: "Person"
          to: "Person"
        )
        @hasScope(
          scopes: [
            "Person: Update"
            "update:person"
            "Person: Update"
            "update:person"
          ]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##merge-relationship) for [merging](https://neo4j.com/docs/cypher-manual/4.1/clauses/merge/#query-merge-relationships) the REFLEXIVE_INTERFACED_RELATIONSHIP_TYPE relationship.
      """
      MergeActorReflexiveInterfacedRelationshipType(
        from: _PersonInput!
        to: _PersonInput!
        data: _ReflexiveInterfacedRelationshipTypeInput!
      ): _MergeActorReflexiveInterfacedRelationshipTypePayload
        @MutationMeta(
          relationship: "REFLEXIVE_INTERFACED_RELATIONSHIP_TYPE"
          from: "Person"
          to: "Person"
        )
        @hasScope(
          scopes: [
            "Person: Merge"
            "merge:person"
            "Person: Merge"
            "merge:person"
          ]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/#create) for [creating](https://neo4j.com/docs/cypher-manual/4.1/clauses/create/#create-nodes) a Actor node.
      """
      CreateActor(
        userId: ID
        name: String
        extensionScalar: String
        datetimes: [_Neo4jDateTimeInput]
        strings: [String]
      ): Actor @hasScope(scopes: ["Actor: Create", "create:actor"])
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/#update) for [updating](https://neo4j.com/docs/cypher-manual/4.1/clauses/set/#set-update-a-property) a Actor node.
      """
      UpdateActor(
        userId: ID!
        name: String
        extensionScalar: String
        datetimes: [_Neo4jDateTimeInput]
        strings: [String]
      ): Actor @hasScope(scopes: ["Actor: Update", "update:actor"])
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/#delete) for [deleting](https://neo4j.com/docs/cypher-manual/4.1/clauses/delete/#delete-delete-single-node) a Actor node.
      """
      DeleteActor(userId: ID!): Actor
        @hasScope(scopes: ["Actor: Delete", "delete:actor"])
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/#merge) for [merging](https://neo4j.com/docs/cypher-manual/4.1/clauses/merge/#query-merge-node-derived) a Actor node.
      """
      MergeActor(
        userId: ID!
        name: String
        extensionScalar: String
        datetimes: [_Neo4jDateTimeInput]
        strings: [String]
      ): Actor @hasScope(scopes: ["Actor: Merge", "merge:actor"])
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##add--remove-relationship) for [creating](https://neo4j.com/docs/cypher-manual/4.1/clauses/create/#create-relationships) the INTERFACED_RELATIONSHIP_TYPE relationship.
      """
      AddUserInterfacedRelationshipType(
        from: _PersonInput!
        to: _GenreInput!
        data: _InterfacedRelationshipTypeInput!
      ): _AddUserInterfacedRelationshipTypePayload
        @MutationMeta(
          relationship: "INTERFACED_RELATIONSHIP_TYPE"
          from: "Person"
          to: "Genre"
        )
        @hasScope(
          scopes: [
            "Person: Create"
            "create:person"
            "Genre: Create"
            "create:genre"
          ]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##add--remove-relationship) for [deleting](https://neo4j.com/docs/cypher-manual/4.1/clauses/delete/#delete-delete-relationships-only) the INTERFACED_RELATIONSHIP_TYPE relationship.
      """
      RemoveUserInterfacedRelationshipType(
        from: _PersonInput!
        to: _GenreInput!
      ): _RemoveUserInterfacedRelationshipTypePayload
        @MutationMeta(
          relationship: "INTERFACED_RELATIONSHIP_TYPE"
          from: "Person"
          to: "Genre"
        )
        @hasScope(
          scopes: [
            "Person: Delete"
            "delete:person"
            "Genre: Delete"
            "delete:genre"
          ]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##update-relationship) for [updating](https://neo4j.com/docs/cypher-manual/4.1/clauses/set/#set-update-a-property) the INTERFACED_RELATIONSHIP_TYPE relationship.
      """
      UpdateUserInterfacedRelationshipType(
        from: _PersonInput!
        to: _GenreInput!
        data: _InterfacedRelationshipTypeInput!
      ): _UpdateUserInterfacedRelationshipTypePayload
        @MutationMeta(
          relationship: "INTERFACED_RELATIONSHIP_TYPE"
          from: "Person"
          to: "Genre"
        )
        @hasScope(
          scopes: [
            "Person: Update"
            "update:person"
            "Genre: Update"
            "update:genre"
          ]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##merge-relationship) for [merging](https://neo4j.com/docs/cypher-manual/4.1/clauses/merge/#query-merge-relationships) the INTERFACED_RELATIONSHIP_TYPE relationship.
      """
      MergeUserInterfacedRelationshipType(
        from: _PersonInput!
        to: _GenreInput!
        data: _InterfacedRelationshipTypeInput!
      ): _MergeUserInterfacedRelationshipTypePayload
        @MutationMeta(
          relationship: "INTERFACED_RELATIONSHIP_TYPE"
          from: "Person"
          to: "Genre"
        )
        @hasScope(
          scopes: [
            "Person: Merge"
            "merge:person"
            "Genre: Merge"
            "merge:genre"
          ]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##add--remove-relationship) for [creating](https://neo4j.com/docs/cypher-manual/4.1/clauses/create/#create-relationships) the REFLEXIVE_INTERFACED_RELATIONSHIP_TYPE relationship.
      """
      AddUserReflexiveInterfacedRelationshipType(
        from: _PersonInput!
        to: _PersonInput!
        data: _ReflexiveInterfacedRelationshipTypeInput!
      ): _AddUserReflexiveInterfacedRelationshipTypePayload
        @MutationMeta(
          relationship: "REFLEXIVE_INTERFACED_RELATIONSHIP_TYPE"
          from: "Person"
          to: "Person"
        )
        @hasScope(
          scopes: [
            "Person: Create"
            "create:person"
            "Person: Create"
            "create:person"
          ]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##add--remove-relationship) for [deleting](https://neo4j.com/docs/cypher-manual/4.1/clauses/delete/#delete-delete-relationships-only) the REFLEXIVE_INTERFACED_RELATIONSHIP_TYPE relationship.
      """
      RemoveUserReflexiveInterfacedRelationshipType(
        from: _PersonInput!
        to: _PersonInput!
      ): _RemoveUserReflexiveInterfacedRelationshipTypePayload
        @MutationMeta(
          relationship: "REFLEXIVE_INTERFACED_RELATIONSHIP_TYPE"
          from: "Person"
          to: "Person"
        )
        @hasScope(
          scopes: [
            "Person: Delete"
            "delete:person"
            "Person: Delete"
            "delete:person"
          ]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##update-relationship) for [updating](https://neo4j.com/docs/cypher-manual/4.1/clauses/set/#set-update-a-property) the REFLEXIVE_INTERFACED_RELATIONSHIP_TYPE relationship.
      """
      UpdateUserReflexiveInterfacedRelationshipType(
        from: _PersonInput!
        to: _PersonInput!
        data: _ReflexiveInterfacedRelationshipTypeInput!
      ): _UpdateUserReflexiveInterfacedRelationshipTypePayload
        @MutationMeta(
          relationship: "REFLEXIVE_INTERFACED_RELATIONSHIP_TYPE"
          from: "Person"
          to: "Person"
        )
        @hasScope(
          scopes: [
            "Person: Update"
            "update:person"
            "Person: Update"
            "update:person"
          ]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##merge-relationship) for [merging](https://neo4j.com/docs/cypher-manual/4.1/clauses/merge/#query-merge-relationships) the REFLEXIVE_INTERFACED_RELATIONSHIP_TYPE relationship.
      """
      MergeUserReflexiveInterfacedRelationshipType(
        from: _PersonInput!
        to: _PersonInput!
        data: _ReflexiveInterfacedRelationshipTypeInput!
      ): _MergeUserReflexiveInterfacedRelationshipTypePayload
        @MutationMeta(
          relationship: "REFLEXIVE_INTERFACED_RELATIONSHIP_TYPE"
          from: "Person"
          to: "Person"
        )
        @hasScope(
          scopes: [
            "Person: Merge"
            "merge:person"
            "Person: Merge"
            "merge:person"
          ]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##add--remove-relationship) for [creating](https://neo4j.com/docs/cypher-manual/4.1/clauses/create/#create-relationships) the RATED relationship.
      """
      AddUserRated(
        from: _UserInput!
        to: _MovieInput!
        data: _RatedInput!
      ): _AddUserRatedPayload
        @MutationMeta(relationship: "RATED", from: "User", to: "Movie")
        @hasScope(
          scopes: [
            "User: Create"
            "create:user"
            "Movie: Create"
            "create:movie"
          ]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##add--remove-relationship) for [deleting](https://neo4j.com/docs/cypher-manual/4.1/clauses/delete/#delete-delete-relationships-only) the RATED relationship.
      """
      RemoveUserRated(
        from: _UserInput!
        to: _MovieInput!
      ): _RemoveUserRatedPayload
        @MutationMeta(relationship: "RATED", from: "User", to: "Movie")
        @hasScope(
          scopes: [
            "User: Delete"
            "delete:user"
            "Movie: Delete"
            "delete:movie"
          ]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##update-relationship) for [updating](https://neo4j.com/docs/cypher-manual/4.1/clauses/set/#set-update-a-property) the RATED relationship.
      """
      UpdateUserRated(
        from: _UserInput!
        to: _MovieInput!
        data: _RatedInput!
      ): _UpdateUserRatedPayload
        @MutationMeta(relationship: "RATED", from: "User", to: "Movie")
        @hasScope(
          scopes: [
            "User: Update"
            "update:user"
            "Movie: Update"
            "update:movie"
          ]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##merge-relationship) for [merging](https://neo4j.com/docs/cypher-manual/4.1/clauses/merge/#query-merge-relationships) the RATED relationship.
      """
      MergeUserRated(
        from: _UserInput!
        to: _MovieInput!
        data: _RatedInput!
      ): _MergeUserRatedPayload
        @MutationMeta(relationship: "RATED", from: "User", to: "Movie")
        @hasScope(
          scopes: ["User: Merge", "merge:user", "Movie: Merge", "merge:movie"]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##add--remove-relationship) for [creating](https://neo4j.com/docs/cypher-manual/4.1/clauses/create/#create-relationships) the RATED_CUSTOM_FROM relationship.
      """
      AddUserRatedCustomFrom(
        ratedBy: _UserInput!
        to: _MovieInput!
        data: _RatedCustomFromInput!
      ): _AddUserRatedCustomFromPayload
        @MutationMeta(
          relationship: "RATED_CUSTOM_FROM"
          from: "User"
          to: "Movie"
        )
        @hasScope(
          scopes: [
            "User: Create"
            "create:user"
            "Movie: Create"
            "create:movie"
          ]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##add--remove-relationship) for [deleting](https://neo4j.com/docs/cypher-manual/4.1/clauses/delete/#delete-delete-relationships-only) the RATED_CUSTOM_FROM relationship.
      """
      RemoveUserRatedCustomFrom(
        ratedBy: _UserInput!
        to: _MovieInput!
      ): _RemoveUserRatedCustomFromPayload
        @MutationMeta(
          relationship: "RATED_CUSTOM_FROM"
          from: "User"
          to: "Movie"
        )
        @hasScope(
          scopes: [
            "User: Delete"
            "delete:user"
            "Movie: Delete"
            "delete:movie"
          ]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##update-relationship) for [updating](https://neo4j.com/docs/cypher-manual/4.1/clauses/set/#set-update-a-property) the RATED_CUSTOM_FROM relationship.
      """
      UpdateUserRatedCustomFrom(
        ratedBy: _UserInput!
        to: _MovieInput!
        data: _RatedCustomFromInput!
      ): _UpdateUserRatedCustomFromPayload
        @MutationMeta(
          relationship: "RATED_CUSTOM_FROM"
          from: "User"
          to: "Movie"
        )
        @hasScope(
          scopes: [
            "User: Update"
            "update:user"
            "Movie: Update"
            "update:movie"
          ]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##merge-relationship) for [merging](https://neo4j.com/docs/cypher-manual/4.1/clauses/merge/#query-merge-relationships) the RATED_CUSTOM_FROM relationship.
      """
      MergeUserRatedCustomFrom(
        ratedBy: _UserInput!
        to: _MovieInput!
        data: _RatedCustomFromInput!
      ): _MergeUserRatedCustomFromPayload
        @MutationMeta(
          relationship: "RATED_CUSTOM_FROM"
          from: "User"
          to: "Movie"
        )
        @hasScope(
          scopes: ["User: Merge", "merge:user", "Movie: Merge", "merge:movie"]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##add--remove-relationship) for [creating](https://neo4j.com/docs/cypher-manual/4.1/clauses/create/#create-relationships) the RATED_CUSTOM_TO relationship.
      """
      AddUserRatedCustomTo(
        from: _UserInput!
        movie: _MovieInput!
        data: _RatedCustomToInput!
      ): _AddUserRatedCustomToPayload
        @MutationMeta(
          relationship: "RATED_CUSTOM_TO"
          from: "User"
          to: "Movie"
        )
        @hasScope(
          scopes: [
            "User: Create"
            "create:user"
            "Movie: Create"
            "create:movie"
          ]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##add--remove-relationship) for [deleting](https://neo4j.com/docs/cypher-manual/4.1/clauses/delete/#delete-delete-relationships-only) the RATED_CUSTOM_TO relationship.
      """
      RemoveUserRatedCustomTo(
        from: _UserInput!
        movie: _MovieInput!
      ): _RemoveUserRatedCustomToPayload
        @MutationMeta(
          relationship: "RATED_CUSTOM_TO"
          from: "User"
          to: "Movie"
        )
        @hasScope(
          scopes: [
            "User: Delete"
            "delete:user"
            "Movie: Delete"
            "delete:movie"
          ]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##update-relationship) for [updating](https://neo4j.com/docs/cypher-manual/4.1/clauses/set/#set-update-a-property) the RATED_CUSTOM_TO relationship.
      """
      UpdateUserRatedCustomTo(
        from: _UserInput!
        movie: _MovieInput!
        data: _RatedCustomToInput!
      ): _UpdateUserRatedCustomToPayload
        @MutationMeta(
          relationship: "RATED_CUSTOM_TO"
          from: "User"
          to: "Movie"
        )
        @hasScope(
          scopes: [
            "User: Update"
            "update:user"
            "Movie: Update"
            "update:movie"
          ]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##merge-relationship) for [merging](https://neo4j.com/docs/cypher-manual/4.1/clauses/merge/#query-merge-relationships) the RATED_CUSTOM_TO relationship.
      """
      MergeUserRatedCustomTo(
        from: _UserInput!
        movie: _MovieInput!
        data: _RatedCustomToInput!
      ): _MergeUserRatedCustomToPayload
        @MutationMeta(
          relationship: "RATED_CUSTOM_TO"
          from: "User"
          to: "Movie"
        )
        @hasScope(
          scopes: ["User: Merge", "merge:user", "Movie: Merge", "merge:movie"]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##add--remove-relationship) for [creating](https://neo4j.com/docs/cypher-manual/4.1/clauses/create/#create-relationships) the RATED_CUSTOM_FROM_TO relationship.
      """
      AddUserRatedCustomFromTo(
        ratedBy: _UserInput!
        movie: _MovieInput!
        data: _RatedCustomFromToInput!
      ): _AddUserRatedCustomFromToPayload
        @MutationMeta(
          relationship: "RATED_CUSTOM_FROM_TO"
          from: "User"
          to: "Movie"
        )
        @hasScope(
          scopes: [
            "User: Create"
            "create:user"
            "Movie: Create"
            "create:movie"
          ]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##add--remove-relationship) for [deleting](https://neo4j.com/docs/cypher-manual/4.1/clauses/delete/#delete-delete-relationships-only) the RATED_CUSTOM_FROM_TO relationship.
      """
      RemoveUserRatedCustomFromTo(
        ratedBy: _UserInput!
        movie: _MovieInput!
      ): _RemoveUserRatedCustomFromToPayload
        @MutationMeta(
          relationship: "RATED_CUSTOM_FROM_TO"
          from: "User"
          to: "Movie"
        )
        @hasScope(
          scopes: [
            "User: Delete"
            "delete:user"
            "Movie: Delete"
            "delete:movie"
          ]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##update-relationship) for [updating](https://neo4j.com/docs/cypher-manual/4.1/clauses/set/#set-update-a-property) the RATED_CUSTOM_FROM_TO relationship.
      """
      UpdateUserRatedCustomFromTo(
        ratedBy: _UserInput!
        movie: _MovieInput!
        data: _RatedCustomFromToInput!
      ): _UpdateUserRatedCustomFromToPayload
        @MutationMeta(
          relationship: "RATED_CUSTOM_FROM_TO"
          from: "User"
          to: "Movie"
        )
        @hasScope(
          scopes: [
            "User: Update"
            "update:user"
            "Movie: Update"
            "update:movie"
          ]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##merge-relationship) for [merging](https://neo4j.com/docs/cypher-manual/4.1/clauses/merge/#query-merge-relationships) the RATED_CUSTOM_FROM_TO relationship.
      """
      MergeUserRatedCustomFromTo(
        ratedBy: _UserInput!
        movie: _MovieInput!
        data: _RatedCustomFromToInput!
      ): _MergeUserRatedCustomFromToPayload
        @MutationMeta(
          relationship: "RATED_CUSTOM_FROM_TO"
          from: "User"
          to: "Movie"
        )
        @hasScope(
          scopes: ["User: Merge", "merge:user", "Movie: Merge", "merge:movie"]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##add--remove-relationship) for [creating](https://neo4j.com/docs/cypher-manual/4.1/clauses/create/#create-relationships) the FRIEND_OF relationship.
      """
      AddUserFriends(
        from: _UserInput!
        to: _UserInput!
        data: _FriendOfInput!
      ): _AddUserFriendsPayload
        @MutationMeta(relationship: "FRIEND_OF", from: "User", to: "User")
        @hasScope(
          scopes: ["User: Create", "create:user", "User: Create", "create:user"]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##add--remove-relationship) for [deleting](https://neo4j.com/docs/cypher-manual/4.1/clauses/delete/#delete-delete-relationships-only) the FRIEND_OF relationship.
      """
      RemoveUserFriends(
        from: _UserInput!
        to: _UserInput!
      ): _RemoveUserFriendsPayload
        @MutationMeta(relationship: "FRIEND_OF", from: "User", to: "User")
        @hasScope(
          scopes: ["User: Delete", "delete:user", "User: Delete", "delete:user"]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##update-relationship) for [updating](https://neo4j.com/docs/cypher-manual/4.1/clauses/set/#set-update-a-property) the FRIEND_OF relationship.
      """
      UpdateUserFriends(
        from: _UserInput!
        to: _UserInput!
        data: _FriendOfInput!
      ): _UpdateUserFriendsPayload
        @MutationMeta(relationship: "FRIEND_OF", from: "User", to: "User")
        @hasScope(
          scopes: ["User: Update", "update:user", "User: Update", "update:user"]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##merge-relationship) for [merging](https://neo4j.com/docs/cypher-manual/4.1/clauses/merge/#query-merge-relationships) the FRIEND_OF relationship.
      """
      MergeUserFriends(
        from: _UserInput!
        to: _UserInput!
        data: _FriendOfInput!
      ): _MergeUserFriendsPayload
        @MutationMeta(relationship: "FRIEND_OF", from: "User", to: "User")
        @hasScope(
          scopes: ["User: Merge", "merge:user", "User: Merge", "merge:user"]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##add--remove-relationship) for [creating](https://neo4j.com/docs/cypher-manual/4.1/clauses/create/#create-relationships) the FRIEND_OF_CUSTOM_FROM relationship.
      """
      AddUserFriendsCustomFrom(
        friendedBy: _UserInput!
        to: _UserInput!
        data: _FriendOfCustomFromInput!
      ): _AddUserFriendsCustomFromPayload
        @MutationMeta(
          relationship: "FRIEND_OF_CUSTOM_FROM"
          from: "User"
          to: "User"
        )
        @hasScope(
          scopes: ["User: Create", "create:user", "User: Create", "create:user"]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##add--remove-relationship) for [deleting](https://neo4j.com/docs/cypher-manual/4.1/clauses/delete/#delete-delete-relationships-only) the FRIEND_OF_CUSTOM_FROM relationship.
      """
      RemoveUserFriendsCustomFrom(
        friendedBy: _UserInput!
        to: _UserInput!
      ): _RemoveUserFriendsCustomFromPayload
        @MutationMeta(
          relationship: "FRIEND_OF_CUSTOM_FROM"
          from: "User"
          to: "User"
        )
        @hasScope(
          scopes: ["User: Delete", "delete:user", "User: Delete", "delete:user"]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##update-relationship) for [updating](https://neo4j.com/docs/cypher-manual/4.1/clauses/set/#set-update-a-property) the FRIEND_OF_CUSTOM_FROM relationship.
      """
      UpdateUserFriendsCustomFrom(
        friendedBy: _UserInput!
        to: _UserInput!
        data: _FriendOfCustomFromInput!
      ): _UpdateUserFriendsCustomFromPayload
        @MutationMeta(
          relationship: "FRIEND_OF_CUSTOM_FROM"
          from: "User"
          to: "User"
        )
        @hasScope(
          scopes: ["User: Update", "update:user", "User: Update", "update:user"]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##merge-relationship) for [merging](https://neo4j.com/docs/cypher-manual/4.1/clauses/merge/#query-merge-relationships) the FRIEND_OF_CUSTOM_FROM relationship.
      """
      MergeUserFriendsCustomFrom(
        friendedBy: _UserInput!
        to: _UserInput!
        data: _FriendOfCustomFromInput!
      ): _MergeUserFriendsCustomFromPayload
        @MutationMeta(
          relationship: "FRIEND_OF_CUSTOM_FROM"
          from: "User"
          to: "User"
        )
        @hasScope(
          scopes: ["User: Merge", "merge:user", "User: Merge", "merge:user"]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##add--remove-relationship) for [creating](https://neo4j.com/docs/cypher-manual/4.1/clauses/create/#create-relationships) the FRIEND_OF_CUSTOM_TO relationship.
      """
      AddUserFriendsCustomTo(
        from: _UserInput!
        friended: _UserInput!
        data: _FriendOfCustomToInput!
      ): _AddUserFriendsCustomToPayload
        @MutationMeta(
          relationship: "FRIEND_OF_CUSTOM_TO"
          from: "User"
          to: "User"
        )
        @hasScope(
          scopes: ["User: Create", "create:user", "User: Create", "create:user"]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##add--remove-relationship) for [deleting](https://neo4j.com/docs/cypher-manual/4.1/clauses/delete/#delete-delete-relationships-only) the FRIEND_OF_CUSTOM_TO relationship.
      """
      RemoveUserFriendsCustomTo(
        from: _UserInput!
        friended: _UserInput!
      ): _RemoveUserFriendsCustomToPayload
        @MutationMeta(
          relationship: "FRIEND_OF_CUSTOM_TO"
          from: "User"
          to: "User"
        )
        @hasScope(
          scopes: ["User: Delete", "delete:user", "User: Delete", "delete:user"]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##update-relationship) for [updating](https://neo4j.com/docs/cypher-manual/4.1/clauses/set/#set-update-a-property) the FRIEND_OF_CUSTOM_TO relationship.
      """
      UpdateUserFriendsCustomTo(
        from: _UserInput!
        friended: _UserInput!
        data: _FriendOfCustomToInput!
      ): _UpdateUserFriendsCustomToPayload
        @MutationMeta(
          relationship: "FRIEND_OF_CUSTOM_TO"
          from: "User"
          to: "User"
        )
        @hasScope(
          scopes: ["User: Update", "update:user", "User: Update", "update:user"]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##merge-relationship) for [merging](https://neo4j.com/docs/cypher-manual/4.1/clauses/merge/#query-merge-relationships) the FRIEND_OF_CUSTOM_TO relationship.
      """
      MergeUserFriendsCustomTo(
        from: _UserInput!
        friended: _UserInput!
        data: _FriendOfCustomToInput!
      ): _MergeUserFriendsCustomToPayload
        @MutationMeta(
          relationship: "FRIEND_OF_CUSTOM_TO"
          from: "User"
          to: "User"
        )
        @hasScope(
          scopes: ["User: Merge", "merge:user", "User: Merge", "merge:user"]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##add--remove-relationship) for [creating](https://neo4j.com/docs/cypher-manual/4.1/clauses/create/#create-relationships) the FRIEND_OF_CUSTOM_FROM_TO relationship.
      """
      AddUserFriendsCustomFromTo(
        friendedBy: _UserInput!
        friended: _UserInput!
        data: _FriendOfCustomFromToInput!
      ): _AddUserFriendsCustomFromToPayload
        @MutationMeta(
          relationship: "FRIEND_OF_CUSTOM_FROM_TO"
          from: "User"
          to: "User"
        )
        @hasScope(
          scopes: ["User: Create", "create:user", "User: Create", "create:user"]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##add--remove-relationship) for [deleting](https://neo4j.com/docs/cypher-manual/4.1/clauses/delete/#delete-delete-relationships-only) the FRIEND_OF_CUSTOM_FROM_TO relationship.
      """
      RemoveUserFriendsCustomFromTo(
        friendedBy: _UserInput!
        friended: _UserInput!
      ): _RemoveUserFriendsCustomFromToPayload
        @MutationMeta(
          relationship: "FRIEND_OF_CUSTOM_FROM_TO"
          from: "User"
          to: "User"
        )
        @hasScope(
          scopes: ["User: Delete", "delete:user", "User: Delete", "delete:user"]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##update-relationship) for [updating](https://neo4j.com/docs/cypher-manual/4.1/clauses/set/#set-update-a-property) the FRIEND_OF_CUSTOM_FROM_TO relationship.
      """
      UpdateUserFriendsCustomFromTo(
        friendedBy: _UserInput!
        friended: _UserInput!
        data: _FriendOfCustomFromToInput!
      ): _UpdateUserFriendsCustomFromToPayload
        @MutationMeta(
          relationship: "FRIEND_OF_CUSTOM_FROM_TO"
          from: "User"
          to: "User"
        )
        @hasScope(
          scopes: ["User: Update", "update:user", "User: Update", "update:user"]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##merge-relationship) for [merging](https://neo4j.com/docs/cypher-manual/4.1/clauses/merge/#query-merge-relationships) the FRIEND_OF_CUSTOM_FROM_TO relationship.
      """
      MergeUserFriendsCustomFromTo(
        friendedBy: _UserInput!
        friended: _UserInput!
        data: _FriendOfCustomFromToInput!
      ): _MergeUserFriendsCustomFromToPayload
        @MutationMeta(
          relationship: "FRIEND_OF_CUSTOM_FROM_TO"
          from: "User"
          to: "User"
        )
        @hasScope(
          scopes: ["User: Merge", "merge:user", "User: Merge", "merge:user"]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##add--remove-relationship) for [creating](https://neo4j.com/docs/cypher-manual/4.1/clauses/create/#create-relationships) the FAVORITED relationship.
      """
      AddUserFavorites(
        from: _UserInput!
        to: _MovieInput!
      ): _AddUserFavoritesPayload
        @MutationMeta(relationship: "FAVORITED", from: "User", to: "Movie")
        @hasScope(
          scopes: [
            "User: Create"
            "create:user"
            "Movie: Create"
            "create:movie"
          ]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##add--remove-relationship) for [deleting](https://neo4j.com/docs/cypher-manual/4.1/clauses/delete/#delete-delete-relationships-only) the FAVORITED relationship.
      """
      RemoveUserFavorites(
        from: _UserInput!
        to: _MovieInput!
      ): _RemoveUserFavoritesPayload
        @MutationMeta(relationship: "FAVORITED", from: "User", to: "Movie")
        @hasScope(
          scopes: [
            "User: Delete"
            "delete:user"
            "Movie: Delete"
            "delete:movie"
          ]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##merge-relationship) for [merging](https://neo4j.com/docs/cypher-manual/4.1/clauses/merge/#query-merge-relationships) the FAVORITED relationship.
      """
      MergeUserFavorites(
        from: _UserInput!
        to: _MovieInput!
      ): _MergeUserFavoritesPayload
        @MutationMeta(relationship: "FAVORITED", from: "User", to: "Movie")
        @hasScope(
          scopes: ["User: Merge", "merge:user", "Movie: Merge", "merge:movie"]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/#create) for [creating](https://neo4j.com/docs/cypher-manual/4.1/clauses/create/#create-nodes) a User node.
      """
      CreateUser(userId: ID, name: String, extensionScalar: String): User
        @hasScope(scopes: ["User: Create", "create:user"])
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/#update) for [updating](https://neo4j.com/docs/cypher-manual/4.1/clauses/set/#set-update-a-property) a User node.
      """
      UpdateUser(userId: ID!, name: String, extensionScalar: String): User
        @hasScope(scopes: ["User: Update", "update:user"])
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/#delete) for [deleting](https://neo4j.com/docs/cypher-manual/4.1/clauses/delete/#delete-delete-single-node) a User node.
      """
      DeleteUser(userId: ID!): User
        @hasScope(scopes: ["User: Delete", "delete:user"])
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/#merge) for [merging](https://neo4j.com/docs/cypher-manual/4.1/clauses/merge/#query-merge-node-derived) a User node.
      """
      MergeUser(userId: ID!, name: String, extensionScalar: String): User
        @hasScope(scopes: ["User: Merge", "merge:user"])
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/#create) for [creating](https://neo4j.com/docs/cypher-manual/4.1/clauses/create/#create-nodes) a Book node.
      """
      CreateBook(genre: BookGenre): Book
        @hasScope(scopes: ["Book: Create", "create:book"])
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/#delete) for [deleting](https://neo4j.com/docs/cypher-manual/4.1/clauses/delete/#delete-delete-single-node) a Book node.
      """
      DeleteBook(genre: BookGenre!): Book
        @hasScope(scopes: ["Book: Delete", "delete:book"])
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/#merge) for [merging](https://neo4j.com/docs/cypher-manual/4.1/clauses/merge/#query-merge-node-derived) a Book node.
      """
      MergeBook(genre: BookGenre!): Book
        @hasScope(scopes: ["Book: Merge", "merge:book"])
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/#create) for [creating](https://neo4j.com/docs/cypher-manual/4.1/clauses/create/#create-nodes) a NodeTypeMutationTest node.
      """
      CreateNodeTypeMutationTest(
        NodeTypeMutationTest: BookGenre
      ): NodeTypeMutationTest
        @hasScope(
          scopes: [
            "NodeTypeMutationTest: Create"
            "create:nodetypemutationtest"
          ]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/#delete) for [deleting](https://neo4j.com/docs/cypher-manual/4.1/clauses/delete/#delete-delete-single-node) a NodeTypeMutationTest node.
      """
      DeleteNodeTypeMutationTest(
        NodeTypeMutationTest: BookGenre!
      ): NodeTypeMutationTest
        @hasScope(
          scopes: [
            "NodeTypeMutationTest: Delete"
            "delete:nodetypemutationtest"
          ]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/#merge) for [merging](https://neo4j.com/docs/cypher-manual/4.1/clauses/merge/#query-merge-node-derived) a NodeTypeMutationTest node.
      """
      MergeNodeTypeMutationTest(
        NodeTypeMutationTest: BookGenre!
      ): NodeTypeMutationTest
        @hasScope(
          scopes: ["NodeTypeMutationTest: Merge", "merge:nodetypemutationtest"]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/#create) for [creating](https://neo4j.com/docs/cypher-manual/4.1/clauses/create/#create-nodes) a currentUserId node.
      """
      CreatecurrentUserId(userId: String): currentUserId
        @hasScope(scopes: ["currentUserId: Create", "create:currentuserid"])
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/#delete) for [deleting](https://neo4j.com/docs/cypher-manual/4.1/clauses/delete/#delete-delete-single-node) a currentUserId node.
      """
      DeletecurrentUserId(userId: String!): currentUserId
        @hasScope(scopes: ["currentUserId: Delete", "delete:currentuserid"])
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/#merge) for [merging](https://neo4j.com/docs/cypher-manual/4.1/clauses/merge/#query-merge-node-derived) a currentUserId node.
      """
      MergecurrentUserId(userId: String!): currentUserId
        @hasScope(scopes: ["currentUserId: Merge", "merge:currentuserid"])
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##add--remove-relationship) for [creating](https://neo4j.com/docs/cypher-manual/4.1/clauses/create/#create-relationships) the TEMPORAL relationship.
      """
      AddTemporalNodeTemporalNodes(
        from: _TemporalNodeInput!
        to: _TemporalNodeInput!
      ): _AddTemporalNodeTemporalNodesPayload
        @MutationMeta(
          relationship: "TEMPORAL"
          from: "TemporalNode"
          to: "TemporalNode"
        )
        @hasScope(
          scopes: [
            "TemporalNode: Create"
            "create:temporalnode"
            "TemporalNode: Create"
            "create:temporalnode"
          ]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##add--remove-relationship) for [deleting](https://neo4j.com/docs/cypher-manual/4.1/clauses/delete/#delete-delete-relationships-only) the TEMPORAL relationship.
      """
      RemoveTemporalNodeTemporalNodes(
        from: _TemporalNodeInput!
        to: _TemporalNodeInput!
      ): _RemoveTemporalNodeTemporalNodesPayload
        @MutationMeta(
          relationship: "TEMPORAL"
          from: "TemporalNode"
          to: "TemporalNode"
        )
        @hasScope(
          scopes: [
            "TemporalNode: Delete"
            "delete:temporalnode"
            "TemporalNode: Delete"
            "delete:temporalnode"
          ]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##merge-relationship) for [merging](https://neo4j.com/docs/cypher-manual/4.1/clauses/merge/#query-merge-relationships) the TEMPORAL relationship.
      """
      MergeTemporalNodeTemporalNodes(
        from: _TemporalNodeInput!
        to: _TemporalNodeInput!
      ): _MergeTemporalNodeTemporalNodesPayload
        @MutationMeta(
          relationship: "TEMPORAL"
          from: "TemporalNode"
          to: "TemporalNode"
        )
        @hasScope(
          scopes: [
            "TemporalNode: Merge"
            "merge:temporalnode"
            "TemporalNode: Merge"
            "merge:temporalnode"
          ]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/#create) for [creating](https://neo4j.com/docs/cypher-manual/4.1/clauses/create/#create-nodes) a TemporalNode node.
      """
      CreateTemporalNode(
        datetime: _Neo4jDateTimeInput
        name: String
        time: _Neo4jTimeInput
        date: _Neo4jDateInput
        localtime: _Neo4jLocalTimeInput
        localdatetime: _Neo4jLocalDateTimeInput
        localdatetimes: [_Neo4jLocalDateTimeInput]
      ): TemporalNode
        @hasScope(scopes: ["TemporalNode: Create", "create:temporalnode"])
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/#update) for [updating](https://neo4j.com/docs/cypher-manual/4.1/clauses/set/#set-update-a-property) a TemporalNode node.
      """
      UpdateTemporalNode(
        datetime: _Neo4jDateTimeInput
        name: String!
        time: _Neo4jTimeInput
        date: _Neo4jDateInput
        localtime: _Neo4jLocalTimeInput
        localdatetime: _Neo4jLocalDateTimeInput
        localdatetimes: [_Neo4jLocalDateTimeInput]
      ): TemporalNode
        @hasScope(scopes: ["TemporalNode: Update", "update:temporalnode"])
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/#delete) for [deleting](https://neo4j.com/docs/cypher-manual/4.1/clauses/delete/#delete-delete-single-node) a TemporalNode node.
      """
      DeleteTemporalNode(name: String!): TemporalNode
        @hasScope(scopes: ["TemporalNode: Delete", "delete:temporalnode"])
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/#merge) for [merging](https://neo4j.com/docs/cypher-manual/4.1/clauses/merge/#query-merge-node-derived) a TemporalNode node.
      """
      MergeTemporalNode(
        datetime: _Neo4jDateTimeInput
        name: String!
        time: _Neo4jTimeInput
        date: _Neo4jDateInput
        localtime: _Neo4jLocalTimeInput
        localdatetime: _Neo4jLocalDateTimeInput
        localdatetimes: [_Neo4jLocalDateTimeInput]
      ): TemporalNode
        @hasScope(scopes: ["TemporalNode: Merge", "merge:temporalnode"])
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##add--remove-relationship) for [creating](https://neo4j.com/docs/cypher-manual/4.1/clauses/create/#create-relationships) the SPATIAL relationship.
      """
      AddSpatialNodeSpatialNodes(
        from: _SpatialNodeInput!
        to: _SpatialNodeInput!
      ): _AddSpatialNodeSpatialNodesPayload
        @MutationMeta(
          relationship: "SPATIAL"
          from: "SpatialNode"
          to: "SpatialNode"
        )
        @hasScope(
          scopes: [
            "SpatialNode: Create"
            "create:spatialnode"
            "SpatialNode: Create"
            "create:spatialnode"
          ]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##add--remove-relationship) for [deleting](https://neo4j.com/docs/cypher-manual/4.1/clauses/delete/#delete-delete-relationships-only) the SPATIAL relationship.
      """
      RemoveSpatialNodeSpatialNodes(
        from: _SpatialNodeInput!
        to: _SpatialNodeInput!
      ): _RemoveSpatialNodeSpatialNodesPayload
        @MutationMeta(
          relationship: "SPATIAL"
          from: "SpatialNode"
          to: "SpatialNode"
        )
        @hasScope(
          scopes: [
            "SpatialNode: Delete"
            "delete:spatialnode"
            "SpatialNode: Delete"
            "delete:spatialnode"
          ]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##merge-relationship) for [merging](https://neo4j.com/docs/cypher-manual/4.1/clauses/merge/#query-merge-relationships) the SPATIAL relationship.
      """
      MergeSpatialNodeSpatialNodes(
        from: _SpatialNodeInput!
        to: _SpatialNodeInput!
      ): _MergeSpatialNodeSpatialNodesPayload
        @MutationMeta(
          relationship: "SPATIAL"
          from: "SpatialNode"
          to: "SpatialNode"
        )
        @hasScope(
          scopes: [
            "SpatialNode: Merge"
            "merge:spatialnode"
            "SpatialNode: Merge"
            "merge:spatialnode"
          ]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/#create) for [creating](https://neo4j.com/docs/cypher-manual/4.1/clauses/create/#create-nodes) a SpatialNode node.
      """
      CreateSpatialNode(id: ID, point: _Neo4jPointInput): SpatialNode
        @hasScope(scopes: ["SpatialNode: Create", "create:spatialnode"])
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/#update) for [updating](https://neo4j.com/docs/cypher-manual/4.1/clauses/set/#set-update-a-property) a SpatialNode node.
      """
      UpdateSpatialNode(id: ID!, point: _Neo4jPointInput): SpatialNode
        @hasScope(scopes: ["SpatialNode: Update", "update:spatialnode"])
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/#delete) for [deleting](https://neo4j.com/docs/cypher-manual/4.1/clauses/delete/#delete-delete-single-node) a SpatialNode node.
      """
      DeleteSpatialNode(id: ID!): SpatialNode
        @hasScope(scopes: ["SpatialNode: Delete", "delete:spatialnode"])
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/#merge) for [merging](https://neo4j.com/docs/cypher-manual/4.1/clauses/merge/#query-merge-node-derived) a SpatialNode node.
      """
      MergeSpatialNode(id: ID!, point: _Neo4jPointInput): SpatialNode
        @hasScope(scopes: ["SpatialNode: Merge", "merge:spatialnode"])
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##add--remove-relationship) for [creating](https://neo4j.com/docs/cypher-manual/4.1/clauses/create/#create-relationships) the FILMED_IN relationship.
      """
      AddCasedTypeState(
        from: _CasedTypeInput!
        to: _StateInput!
      ): _AddCasedTypeStatePayload
        @MutationMeta(relationship: "FILMED_IN", from: "CasedType", to: "State")
        @hasScope(
          scopes: [
            "CasedType: Create"
            "create:casedtype"
            "State: Create"
            "create:state"
          ]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##add--remove-relationship) for [deleting](https://neo4j.com/docs/cypher-manual/4.1/clauses/delete/#delete-delete-relationships-only) the FILMED_IN relationship.
      """
      RemoveCasedTypeState(
        from: _CasedTypeInput!
        to: _StateInput!
      ): _RemoveCasedTypeStatePayload
        @MutationMeta(relationship: "FILMED_IN", from: "CasedType", to: "State")
        @hasScope(
          scopes: [
            "CasedType: Delete"
            "delete:casedtype"
            "State: Delete"
            "delete:state"
          ]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##merge-relationship) for [merging](https://neo4j.com/docs/cypher-manual/4.1/clauses/merge/#query-merge-relationships) the FILMED_IN relationship.
      """
      MergeCasedTypeState(
        from: _CasedTypeInput!
        to: _StateInput!
      ): _MergeCasedTypeStatePayload
        @MutationMeta(relationship: "FILMED_IN", from: "CasedType", to: "State")
        @hasScope(
          scopes: [
            "CasedType: Merge"
            "merge:casedtype"
            "State: Merge"
            "merge:state"
          ]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/#create) for [creating](https://neo4j.com/docs/cypher-manual/4.1/clauses/create/#create-nodes) a CasedType node.
      """
      CreateCasedType(name: String): CasedType
        @hasScope(scopes: ["CasedType: Create", "create:casedtype"])
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/#delete) for [deleting](https://neo4j.com/docs/cypher-manual/4.1/clauses/delete/#delete-delete-single-node) a CasedType node.
      """
      DeleteCasedType(name: String!): CasedType
        @hasScope(scopes: ["CasedType: Delete", "delete:casedtype"])
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/#merge) for [merging](https://neo4j.com/docs/cypher-manual/4.1/clauses/merge/#query-merge-node-derived) a CasedType node.
      """
      MergeCasedType(name: String!): CasedType
        @hasScope(scopes: ["CasedType: Merge", "merge:casedtype"])
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##add--remove-relationship) for [creating](https://neo4j.com/docs/cypher-manual/4.1/clauses/create/#create-relationships) the cameras relationship.
      """
      AddCameraOperators(
        from: _PersonInput!
        to: _CameraInput!
      ): _AddCameraOperatorsPayload
        @MutationMeta(relationship: "cameras", from: "Person", to: "Camera")
        @hasScope(
          scopes: [
            "Person: Create"
            "create:person"
            "Camera: Create"
            "create:camera"
          ]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##add--remove-relationship) for [deleting](https://neo4j.com/docs/cypher-manual/4.1/clauses/delete/#delete-delete-relationships-only) the cameras relationship.
      """
      RemoveCameraOperators(
        from: _PersonInput!
        to: _CameraInput!
      ): _RemoveCameraOperatorsPayload
        @MutationMeta(relationship: "cameras", from: "Person", to: "Camera")
        @hasScope(
          scopes: [
            "Person: Delete"
            "delete:person"
            "Camera: Delete"
            "delete:camera"
          ]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##merge-relationship) for [merging](https://neo4j.com/docs/cypher-manual/4.1/clauses/merge/#query-merge-relationships) the cameras relationship.
      """
      MergeCameraOperators(
        from: _PersonInput!
        to: _CameraInput!
      ): _MergeCameraOperatorsPayload
        @MutationMeta(relationship: "cameras", from: "Person", to: "Camera")
        @hasScope(
          scopes: [
            "Person: Merge"
            "merge:person"
            "Camera: Merge"
            "merge:camera"
          ]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##add--remove-relationship) for [creating](https://neo4j.com/docs/cypher-manual/4.1/clauses/create/#create-relationships) the REFLEXIVE_INTERFACE_RELATIONSHIP relationship.
      """
      AddCameraReflexiveInterfaceRelationship(
        from: _CameraInput!
        to: _CameraInput!
      ): _AddCameraReflexiveInterfaceRelationshipPayload
        @MutationMeta(
          relationship: "REFLEXIVE_INTERFACE_RELATIONSHIP"
          from: "Camera"
          to: "Camera"
        )
        @hasScope(
          scopes: [
            "Camera: Create"
            "create:camera"
            "Camera: Create"
            "create:camera"
          ]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##add--remove-relationship) for [deleting](https://neo4j.com/docs/cypher-manual/4.1/clauses/delete/#delete-delete-relationships-only) the REFLEXIVE_INTERFACE_RELATIONSHIP relationship.
      """
      RemoveCameraReflexiveInterfaceRelationship(
        from: _CameraInput!
        to: _CameraInput!
      ): _RemoveCameraReflexiveInterfaceRelationshipPayload
        @MutationMeta(
          relationship: "REFLEXIVE_INTERFACE_RELATIONSHIP"
          from: "Camera"
          to: "Camera"
        )
        @hasScope(
          scopes: [
            "Camera: Delete"
            "delete:camera"
            "Camera: Delete"
            "delete:camera"
          ]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##merge-relationship) for [merging](https://neo4j.com/docs/cypher-manual/4.1/clauses/merge/#query-merge-relationships) the REFLEXIVE_INTERFACE_RELATIONSHIP relationship.
      """
      MergeCameraReflexiveInterfaceRelationship(
        from: _CameraInput!
        to: _CameraInput!
      ): _MergeCameraReflexiveInterfaceRelationshipPayload
        @MutationMeta(
          relationship: "REFLEXIVE_INTERFACE_RELATIONSHIP"
          from: "Camera"
          to: "Camera"
        )
        @hasScope(
          scopes: [
            "Camera: Merge"
            "merge:camera"
            "Camera: Merge"
            "merge:camera"
          ]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##add--remove-relationship) for [creating](https://neo4j.com/docs/cypher-manual/4.1/clauses/create/#create-relationships) the cameras relationship.
      """
      AddOldCameraOperators(
        from: _PersonInput!
        to: _OldCameraInput!
      ): _AddOldCameraOperatorsPayload
        @MutationMeta(relationship: "cameras", from: "Person", to: "OldCamera")
        @hasScope(
          scopes: [
            "Person: Create"
            "create:person"
            "OldCamera: Create"
            "create:oldcamera"
          ]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##add--remove-relationship) for [deleting](https://neo4j.com/docs/cypher-manual/4.1/clauses/delete/#delete-delete-relationships-only) the cameras relationship.
      """
      RemoveOldCameraOperators(
        from: _PersonInput!
        to: _OldCameraInput!
      ): _RemoveOldCameraOperatorsPayload
        @MutationMeta(relationship: "cameras", from: "Person", to: "OldCamera")
        @hasScope(
          scopes: [
            "Person: Delete"
            "delete:person"
            "OldCamera: Delete"
            "delete:oldcamera"
          ]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##merge-relationship) for [merging](https://neo4j.com/docs/cypher-manual/4.1/clauses/merge/#query-merge-relationships) the cameras relationship.
      """
      MergeOldCameraOperators(
        from: _PersonInput!
        to: _OldCameraInput!
      ): _MergeOldCameraOperatorsPayload
        @MutationMeta(relationship: "cameras", from: "Person", to: "OldCamera")
        @hasScope(
          scopes: [
            "Person: Merge"
            "merge:person"
            "OldCamera: Merge"
            "merge:oldcamera"
          ]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##add--remove-relationship) for [creating](https://neo4j.com/docs/cypher-manual/4.1/clauses/create/#create-relationships) the REFLEXIVE_INTERFACE_RELATIONSHIP relationship.
      """
      AddOldCameraReflexiveInterfaceRelationship(
        from: _OldCameraInput!
        to: _CameraInput!
      ): _AddOldCameraReflexiveInterfaceRelationshipPayload
        @MutationMeta(
          relationship: "REFLEXIVE_INTERFACE_RELATIONSHIP"
          from: "OldCamera"
          to: "Camera"
        )
        @hasScope(
          scopes: [
            "OldCamera: Create"
            "create:oldcamera"
            "Camera: Create"
            "create:camera"
          ]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##add--remove-relationship) for [deleting](https://neo4j.com/docs/cypher-manual/4.1/clauses/delete/#delete-delete-relationships-only) the REFLEXIVE_INTERFACE_RELATIONSHIP relationship.
      """
      RemoveOldCameraReflexiveInterfaceRelationship(
        from: _OldCameraInput!
        to: _CameraInput!
      ): _RemoveOldCameraReflexiveInterfaceRelationshipPayload
        @MutationMeta(
          relationship: "REFLEXIVE_INTERFACE_RELATIONSHIP"
          from: "OldCamera"
          to: "Camera"
        )
        @hasScope(
          scopes: [
            "OldCamera: Delete"
            "delete:oldcamera"
            "Camera: Delete"
            "delete:camera"
          ]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##merge-relationship) for [merging](https://neo4j.com/docs/cypher-manual/4.1/clauses/merge/#query-merge-relationships) the REFLEXIVE_INTERFACE_RELATIONSHIP relationship.
      """
      MergeOldCameraReflexiveInterfaceRelationship(
        from: _OldCameraInput!
        to: _CameraInput!
      ): _MergeOldCameraReflexiveInterfaceRelationshipPayload
        @MutationMeta(
          relationship: "REFLEXIVE_INTERFACE_RELATIONSHIP"
          from: "OldCamera"
          to: "Camera"
        )
        @hasScope(
          scopes: [
            "OldCamera: Merge"
            "merge:oldcamera"
            "Camera: Merge"
            "merge:camera"
          ]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/#create) for [creating](https://neo4j.com/docs/cypher-manual/4.1/clauses/create/#create-nodes) a OldCamera node.
      """
      CreateOldCamera(
        type: String
        id: ID
        make: String
        weight: Int
        smell: String
      ): OldCamera @hasScope(scopes: ["OldCamera: Create", "create:oldcamera"])
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/#update) for [updating](https://neo4j.com/docs/cypher-manual/4.1/clauses/set/#set-update-a-property) a OldCamera node.
      """
      UpdateOldCamera(
        type: String
        id: ID!
        make: String
        weight: Int
        smell: String
      ): OldCamera @hasScope(scopes: ["OldCamera: Update", "update:oldcamera"])
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/#delete) for [deleting](https://neo4j.com/docs/cypher-manual/4.1/clauses/delete/#delete-delete-single-node) a OldCamera node.
      """
      DeleteOldCamera(id: ID!): OldCamera
        @hasScope(scopes: ["OldCamera: Delete", "delete:oldcamera"])
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/#merge) for [merging](https://neo4j.com/docs/cypher-manual/4.1/clauses/merge/#query-merge-node-derived) a OldCamera node.
      """
      MergeOldCamera(
        type: String
        id: ID!
        make: String
        weight: Int
        smell: String
      ): OldCamera @hasScope(scopes: ["OldCamera: Merge", "merge:oldcamera"])
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##add--remove-relationship) for [creating](https://neo4j.com/docs/cypher-manual/4.1/clauses/create/#create-relationships) the cameras relationship.
      """
      AddNewCameraOperators(
        from: _PersonInput!
        to: _NewCameraInput!
      ): _AddNewCameraOperatorsPayload
        @MutationMeta(relationship: "cameras", from: "Person", to: "NewCamera")
        @hasScope(
          scopes: [
            "Person: Create"
            "create:person"
            "NewCamera: Create"
            "create:newcamera"
          ]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##add--remove-relationship) for [deleting](https://neo4j.com/docs/cypher-manual/4.1/clauses/delete/#delete-delete-relationships-only) the cameras relationship.
      """
      RemoveNewCameraOperators(
        from: _PersonInput!
        to: _NewCameraInput!
      ): _RemoveNewCameraOperatorsPayload
        @MutationMeta(relationship: "cameras", from: "Person", to: "NewCamera")
        @hasScope(
          scopes: [
            "Person: Delete"
            "delete:person"
            "NewCamera: Delete"
            "delete:newcamera"
          ]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##merge-relationship) for [merging](https://neo4j.com/docs/cypher-manual/4.1/clauses/merge/#query-merge-relationships) the cameras relationship.
      """
      MergeNewCameraOperators(
        from: _PersonInput!
        to: _NewCameraInput!
      ): _MergeNewCameraOperatorsPayload
        @MutationMeta(relationship: "cameras", from: "Person", to: "NewCamera")
        @hasScope(
          scopes: [
            "Person: Merge"
            "merge:person"
            "NewCamera: Merge"
            "merge:newcamera"
          ]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##add--remove-relationship) for [creating](https://neo4j.com/docs/cypher-manual/4.1/clauses/create/#create-relationships) the REFLEXIVE_INTERFACE_RELATIONSHIP relationship.
      """
      AddNewCameraReflexiveInterfaceRelationship(
        from: _NewCameraInput!
        to: _CameraInput!
      ): _AddNewCameraReflexiveInterfaceRelationshipPayload
        @MutationMeta(
          relationship: "REFLEXIVE_INTERFACE_RELATIONSHIP"
          from: "NewCamera"
          to: "Camera"
        )
        @hasScope(
          scopes: [
            "NewCamera: Create"
            "create:newcamera"
            "Camera: Create"
            "create:camera"
          ]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##add--remove-relationship) for [deleting](https://neo4j.com/docs/cypher-manual/4.1/clauses/delete/#delete-delete-relationships-only) the REFLEXIVE_INTERFACE_RELATIONSHIP relationship.
      """
      RemoveNewCameraReflexiveInterfaceRelationship(
        from: _NewCameraInput!
        to: _CameraInput!
      ): _RemoveNewCameraReflexiveInterfaceRelationshipPayload
        @MutationMeta(
          relationship: "REFLEXIVE_INTERFACE_RELATIONSHIP"
          from: "NewCamera"
          to: "Camera"
        )
        @hasScope(
          scopes: [
            "NewCamera: Delete"
            "delete:newcamera"
            "Camera: Delete"
            "delete:camera"
          ]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##merge-relationship) for [merging](https://neo4j.com/docs/cypher-manual/4.1/clauses/merge/#query-merge-relationships) the REFLEXIVE_INTERFACE_RELATIONSHIP relationship.
      """
      MergeNewCameraReflexiveInterfaceRelationship(
        from: _NewCameraInput!
        to: _CameraInput!
      ): _MergeNewCameraReflexiveInterfaceRelationshipPayload
        @MutationMeta(
          relationship: "REFLEXIVE_INTERFACE_RELATIONSHIP"
          from: "NewCamera"
          to: "Camera"
        )
        @hasScope(
          scopes: [
            "NewCamera: Merge"
            "merge:newcamera"
            "Camera: Merge"
            "merge:camera"
          ]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/#create) for [creating](https://neo4j.com/docs/cypher-manual/4.1/clauses/create/#create-nodes) a NewCamera node.
      """
      CreateNewCamera(
        type: String
        id: ID
        make: String
        weight: Int
        features: [String]
      ): NewCamera @hasScope(scopes: ["NewCamera: Create", "create:newcamera"])
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/#update) for [updating](https://neo4j.com/docs/cypher-manual/4.1/clauses/set/#set-update-a-property) a NewCamera node.
      """
      UpdateNewCamera(
        type: String
        id: ID!
        make: String
        weight: Int
        features: [String]
      ): NewCamera @hasScope(scopes: ["NewCamera: Update", "update:newcamera"])
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/#delete) for [deleting](https://neo4j.com/docs/cypher-manual/4.1/clauses/delete/#delete-delete-single-node) a NewCamera node.
      """
      DeleteNewCamera(id: ID!): NewCamera
        @hasScope(scopes: ["NewCamera: Delete", "delete:newcamera"])
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/#merge) for [merging](https://neo4j.com/docs/cypher-manual/4.1/clauses/merge/#query-merge-node-derived) a NewCamera node.
      """
      MergeNewCamera(
        type: String
        id: ID!
        make: String
        weight: Int
        features: [String]
      ): NewCamera @hasScope(scopes: ["NewCamera: Merge", "merge:newcamera"])
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##add--remove-relationship) for [creating](https://neo4j.com/docs/cypher-manual/4.1/clauses/create/#create-relationships) the favoriteCamera relationship.
      """
      AddCameraManFavoriteCamera(
        from: _CameraManInput!
        to: _CameraInput!
      ): _AddCameraManFavoriteCameraPayload
        @MutationMeta(
          relationship: "favoriteCamera"
          from: "CameraMan"
          to: "Camera"
        )
        @hasScope(
          scopes: [
            "CameraMan: Create"
            "create:cameraman"
            "Camera: Create"
            "create:camera"
          ]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##add--remove-relationship) for [deleting](https://neo4j.com/docs/cypher-manual/4.1/clauses/delete/#delete-delete-relationships-only) the favoriteCamera relationship.
      """
      RemoveCameraManFavoriteCamera(
        from: _CameraManInput!
        to: _CameraInput!
      ): _RemoveCameraManFavoriteCameraPayload
        @MutationMeta(
          relationship: "favoriteCamera"
          from: "CameraMan"
          to: "Camera"
        )
        @hasScope(
          scopes: [
            "CameraMan: Delete"
            "delete:cameraman"
            "Camera: Delete"
            "delete:camera"
          ]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##merge-relationship) for [merging](https://neo4j.com/docs/cypher-manual/4.1/clauses/merge/#query-merge-relationships) the favoriteCamera relationship.
      """
      MergeCameraManFavoriteCamera(
        from: _CameraManInput!
        to: _CameraInput!
      ): _MergeCameraManFavoriteCameraPayload
        @MutationMeta(
          relationship: "favoriteCamera"
          from: "CameraMan"
          to: "Camera"
        )
        @hasScope(
          scopes: [
            "CameraMan: Merge"
            "merge:cameraman"
            "Camera: Merge"
            "merge:camera"
          ]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##add--remove-relationship) for [creating](https://neo4j.com/docs/cypher-manual/4.1/clauses/create/#create-relationships) the cameras relationship.
      """
      AddCameraManCameras(
        from: _CameraManInput!
        to: _CameraInput!
      ): _AddCameraManCamerasPayload
        @MutationMeta(relationship: "cameras", from: "CameraMan", to: "Camera")
        @hasScope(
          scopes: [
            "CameraMan: Create"
            "create:cameraman"
            "Camera: Create"
            "create:camera"
          ]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##add--remove-relationship) for [deleting](https://neo4j.com/docs/cypher-manual/4.1/clauses/delete/#delete-delete-relationships-only) the cameras relationship.
      """
      RemoveCameraManCameras(
        from: _CameraManInput!
        to: _CameraInput!
      ): _RemoveCameraManCamerasPayload
        @MutationMeta(relationship: "cameras", from: "CameraMan", to: "Camera")
        @hasScope(
          scopes: [
            "CameraMan: Delete"
            "delete:cameraman"
            "Camera: Delete"
            "delete:camera"
          ]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##merge-relationship) for [merging](https://neo4j.com/docs/cypher-manual/4.1/clauses/merge/#query-merge-relationships) the cameras relationship.
      """
      MergeCameraManCameras(
        from: _CameraManInput!
        to: _CameraInput!
      ): _MergeCameraManCamerasPayload
        @MutationMeta(relationship: "cameras", from: "CameraMan", to: "Camera")
        @hasScope(
          scopes: [
            "CameraMan: Merge"
            "merge:cameraman"
            "Camera: Merge"
            "merge:camera"
          ]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##add--remove-relationship) for [creating](https://neo4j.com/docs/cypher-manual/4.1/clauses/create/#create-relationships) the cameraBuddy relationship.
      """
      AddCameraManCameraBuddy(
        from: _CameraManInput!
        to: _PersonInput!
      ): _AddCameraManCameraBuddyPayload
        @MutationMeta(
          relationship: "cameraBuddy"
          from: "CameraMan"
          to: "Person"
        )
        @hasScope(
          scopes: [
            "CameraMan: Create"
            "create:cameraman"
            "Person: Create"
            "create:person"
          ]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##add--remove-relationship) for [deleting](https://neo4j.com/docs/cypher-manual/4.1/clauses/delete/#delete-delete-relationships-only) the cameraBuddy relationship.
      """
      RemoveCameraManCameraBuddy(
        from: _CameraManInput!
        to: _PersonInput!
      ): _RemoveCameraManCameraBuddyPayload
        @MutationMeta(
          relationship: "cameraBuddy"
          from: "CameraMan"
          to: "Person"
        )
        @hasScope(
          scopes: [
            "CameraMan: Delete"
            "delete:cameraman"
            "Person: Delete"
            "delete:person"
          ]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##merge-relationship) for [merging](https://neo4j.com/docs/cypher-manual/4.1/clauses/merge/#query-merge-relationships) the cameraBuddy relationship.
      """
      MergeCameraManCameraBuddy(
        from: _CameraManInput!
        to: _PersonInput!
      ): _MergeCameraManCameraBuddyPayload
        @MutationMeta(
          relationship: "cameraBuddy"
          from: "CameraMan"
          to: "Person"
        )
        @hasScope(
          scopes: [
            "CameraMan: Merge"
            "merge:cameraman"
            "Person: Merge"
            "merge:person"
          ]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##add--remove-relationship) for [creating](https://neo4j.com/docs/cypher-manual/4.1/clauses/create/#create-relationships) the INTERFACED_RELATIONSHIP_TYPE relationship.
      """
      AddCameraManInterfacedRelationshipType(
        from: _PersonInput!
        to: _GenreInput!
        data: _InterfacedRelationshipTypeInput!
      ): _AddCameraManInterfacedRelationshipTypePayload
        @MutationMeta(
          relationship: "INTERFACED_RELATIONSHIP_TYPE"
          from: "Person"
          to: "Genre"
        )
        @hasScope(
          scopes: [
            "Person: Create"
            "create:person"
            "Genre: Create"
            "create:genre"
          ]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##add--remove-relationship) for [deleting](https://neo4j.com/docs/cypher-manual/4.1/clauses/delete/#delete-delete-relationships-only) the INTERFACED_RELATIONSHIP_TYPE relationship.
      """
      RemoveCameraManInterfacedRelationshipType(
        from: _PersonInput!
        to: _GenreInput!
      ): _RemoveCameraManInterfacedRelationshipTypePayload
        @MutationMeta(
          relationship: "INTERFACED_RELATIONSHIP_TYPE"
          from: "Person"
          to: "Genre"
        )
        @hasScope(
          scopes: [
            "Person: Delete"
            "delete:person"
            "Genre: Delete"
            "delete:genre"
          ]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##update-relationship) for [updating](https://neo4j.com/docs/cypher-manual/4.1/clauses/set/#set-update-a-property) the INTERFACED_RELATIONSHIP_TYPE relationship.
      """
      UpdateCameraManInterfacedRelationshipType(
        from: _PersonInput!
        to: _GenreInput!
        data: _InterfacedRelationshipTypeInput!
      ): _UpdateCameraManInterfacedRelationshipTypePayload
        @MutationMeta(
          relationship: "INTERFACED_RELATIONSHIP_TYPE"
          from: "Person"
          to: "Genre"
        )
        @hasScope(
          scopes: [
            "Person: Update"
            "update:person"
            "Genre: Update"
            "update:genre"
          ]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##merge-relationship) for [merging](https://neo4j.com/docs/cypher-manual/4.1/clauses/merge/#query-merge-relationships) the INTERFACED_RELATIONSHIP_TYPE relationship.
      """
      MergeCameraManInterfacedRelationshipType(
        from: _PersonInput!
        to: _GenreInput!
        data: _InterfacedRelationshipTypeInput!
      ): _MergeCameraManInterfacedRelationshipTypePayload
        @MutationMeta(
          relationship: "INTERFACED_RELATIONSHIP_TYPE"
          from: "Person"
          to: "Genre"
        )
        @hasScope(
          scopes: [
            "Person: Merge"
            "merge:person"
            "Genre: Merge"
            "merge:genre"
          ]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##add--remove-relationship) for [creating](https://neo4j.com/docs/cypher-manual/4.1/clauses/create/#create-relationships) the REFLEXIVE_INTERFACED_RELATIONSHIP_TYPE relationship.
      """
      AddCameraManReflexiveInterfacedRelationshipType(
        from: _PersonInput!
        to: _PersonInput!
        data: _ReflexiveInterfacedRelationshipTypeInput!
      ): _AddCameraManReflexiveInterfacedRelationshipTypePayload
        @MutationMeta(
          relationship: "REFLEXIVE_INTERFACED_RELATIONSHIP_TYPE"
          from: "Person"
          to: "Person"
        )
        @hasScope(
          scopes: [
            "Person: Create"
            "create:person"
            "Person: Create"
            "create:person"
          ]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##add--remove-relationship) for [deleting](https://neo4j.com/docs/cypher-manual/4.1/clauses/delete/#delete-delete-relationships-only) the REFLEXIVE_INTERFACED_RELATIONSHIP_TYPE relationship.
      """
      RemoveCameraManReflexiveInterfacedRelationshipType(
        from: _PersonInput!
        to: _PersonInput!
      ): _RemoveCameraManReflexiveInterfacedRelationshipTypePayload
        @MutationMeta(
          relationship: "REFLEXIVE_INTERFACED_RELATIONSHIP_TYPE"
          from: "Person"
          to: "Person"
        )
        @hasScope(
          scopes: [
            "Person: Delete"
            "delete:person"
            "Person: Delete"
            "delete:person"
          ]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##update-relationship) for [updating](https://neo4j.com/docs/cypher-manual/4.1/clauses/set/#set-update-a-property) the REFLEXIVE_INTERFACED_RELATIONSHIP_TYPE relationship.
      """
      UpdateCameraManReflexiveInterfacedRelationshipType(
        from: _PersonInput!
        to: _PersonInput!
        data: _ReflexiveInterfacedRelationshipTypeInput!
      ): _UpdateCameraManReflexiveInterfacedRelationshipTypePayload
        @MutationMeta(
          relationship: "REFLEXIVE_INTERFACED_RELATIONSHIP_TYPE"
          from: "Person"
          to: "Person"
        )
        @hasScope(
          scopes: [
            "Person: Update"
            "update:person"
            "Person: Update"
            "update:person"
          ]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##merge-relationship) for [merging](https://neo4j.com/docs/cypher-manual/4.1/clauses/merge/#query-merge-relationships) the REFLEXIVE_INTERFACED_RELATIONSHIP_TYPE relationship.
      """
      MergeCameraManReflexiveInterfacedRelationshipType(
        from: _PersonInput!
        to: _PersonInput!
        data: _ReflexiveInterfacedRelationshipTypeInput!
      ): _MergeCameraManReflexiveInterfacedRelationshipTypePayload
        @MutationMeta(
          relationship: "REFLEXIVE_INTERFACED_RELATIONSHIP_TYPE"
          from: "Person"
          to: "Person"
        )
        @hasScope(
          scopes: [
            "Person: Merge"
            "merge:person"
            "Person: Merge"
            "merge:person"
          ]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/#create) for [creating](https://neo4j.com/docs/cypher-manual/4.1/clauses/create/#create-nodes) a CameraMan node.
      """
      CreateCameraMan(
        userId: ID
        name: String
        extensionScalar: String
      ): CameraMan @hasScope(scopes: ["CameraMan: Create", "create:cameraman"])
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/#update) for [updating](https://neo4j.com/docs/cypher-manual/4.1/clauses/set/#set-update-a-property) a CameraMan node.
      """
      UpdateCameraMan(
        userId: ID!
        name: String
        extensionScalar: String
      ): CameraMan @hasScope(scopes: ["CameraMan: Update", "update:cameraman"])
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/#delete) for [deleting](https://neo4j.com/docs/cypher-manual/4.1/clauses/delete/#delete-delete-single-node) a CameraMan node.
      """
      DeleteCameraMan(userId: ID!): CameraMan
        @hasScope(scopes: ["CameraMan: Delete", "delete:cameraman"])
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/#merge) for [merging](https://neo4j.com/docs/cypher-manual/4.1/clauses/merge/#query-merge-node-derived) a CameraMan node.
      """
      MergeCameraMan(
        userId: ID!
        name: String
        extensionScalar: String
      ): CameraMan @hasScope(scopes: ["CameraMan: Merge", "merge:cameraman"])
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##add--remove-relationship) for [creating](https://neo4j.com/docs/cypher-manual/4.1/clauses/create/#create-relationships) the TEST_RELATION relationship.
      """
      AddUniqueNodeTestRelation(
        from: _UniqueNodeInput!
        to: _UniqueStringNodeInput!
      ): _AddUniqueNodeTestRelationPayload
        @MutationMeta(
          relationship: "TEST_RELATION"
          from: "UniqueNode"
          to: "UniqueStringNode"
        )
        @hasScope(
          scopes: [
            "UniqueNode: Create"
            "create:uniquenode"
            "UniqueStringNode: Create"
            "create:uniquestringnode"
          ]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##add--remove-relationship) for [deleting](https://neo4j.com/docs/cypher-manual/4.1/clauses/delete/#delete-delete-relationships-only) the TEST_RELATION relationship.
      """
      RemoveUniqueNodeTestRelation(
        from: _UniqueNodeInput!
        to: _UniqueStringNodeInput!
      ): _RemoveUniqueNodeTestRelationPayload
        @MutationMeta(
          relationship: "TEST_RELATION"
          from: "UniqueNode"
          to: "UniqueStringNode"
        )
        @hasScope(
          scopes: [
            "UniqueNode: Delete"
            "delete:uniquenode"
            "UniqueStringNode: Delete"
            "delete:uniquestringnode"
          ]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##merge-relationship) for [merging](https://neo4j.com/docs/cypher-manual/4.1/clauses/merge/#query-merge-relationships) the TEST_RELATION relationship.
      """
      MergeUniqueNodeTestRelation(
        from: _UniqueNodeInput!
        to: _UniqueStringNodeInput!
      ): _MergeUniqueNodeTestRelationPayload
        @MutationMeta(
          relationship: "TEST_RELATION"
          from: "UniqueNode"
          to: "UniqueStringNode"
        )
        @hasScope(
          scopes: [
            "UniqueNode: Merge"
            "merge:uniquenode"
            "UniqueStringNode: Merge"
            "merge:uniquestringnode"
          ]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/#create) for [creating](https://neo4j.com/docs/cypher-manual/4.1/clauses/create/#create-nodes) a UniqueNode node.
      """
      CreateUniqueNode(string: String, id: ID, anotherId: ID): UniqueNode
        @hasScope(scopes: ["UniqueNode: Create", "create:uniquenode"])
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/#update) for [updating](https://neo4j.com/docs/cypher-manual/4.1/clauses/set/#set-update-a-property) a UniqueNode node.
      """
      UpdateUniqueNode(string: String, id: ID!, anotherId: ID): UniqueNode
        @hasScope(scopes: ["UniqueNode: Update", "update:uniquenode"])
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/#delete) for [deleting](https://neo4j.com/docs/cypher-manual/4.1/clauses/delete/#delete-delete-single-node) a UniqueNode node.
      """
      DeleteUniqueNode(id: ID!): UniqueNode
        @hasScope(scopes: ["UniqueNode: Delete", "delete:uniquenode"])
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/#merge) for [merging](https://neo4j.com/docs/cypher-manual/4.1/clauses/merge/#query-merge-node-derived) a UniqueNode node.
      """
      MergeUniqueNode(string: String, id: ID!, anotherId: ID): UniqueNode
        @hasScope(scopes: ["UniqueNode: Merge", "merge:uniquenode"])
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##add--remove-relationship) for [creating](https://neo4j.com/docs/cypher-manual/4.1/clauses/create/#create-relationships) the TEST_RELATION relationship.
      """
      AddUniqueStringNodeTestRelation(
        from: _UniqueNodeInput!
        to: _UniqueStringNodeInput!
      ): _AddUniqueStringNodeTestRelationPayload
        @MutationMeta(
          relationship: "TEST_RELATION"
          from: "UniqueNode"
          to: "UniqueStringNode"
        )
        @hasScope(
          scopes: [
            "UniqueNode: Create"
            "create:uniquenode"
            "UniqueStringNode: Create"
            "create:uniquestringnode"
          ]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##add--remove-relationship) for [deleting](https://neo4j.com/docs/cypher-manual/4.1/clauses/delete/#delete-delete-relationships-only) the TEST_RELATION relationship.
      """
      RemoveUniqueStringNodeTestRelation(
        from: _UniqueNodeInput!
        to: _UniqueStringNodeInput!
      ): _RemoveUniqueStringNodeTestRelationPayload
        @MutationMeta(
          relationship: "TEST_RELATION"
          from: "UniqueNode"
          to: "UniqueStringNode"
        )
        @hasScope(
          scopes: [
            "UniqueNode: Delete"
            "delete:uniquenode"
            "UniqueStringNode: Delete"
            "delete:uniquestringnode"
          ]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/##merge-relationship) for [merging](https://neo4j.com/docs/cypher-manual/4.1/clauses/merge/#query-merge-relationships) the TEST_RELATION relationship.
      """
      MergeUniqueStringNodeTestRelation(
        from: _UniqueNodeInput!
        to: _UniqueStringNodeInput!
      ): _MergeUniqueStringNodeTestRelationPayload
        @MutationMeta(
          relationship: "TEST_RELATION"
          from: "UniqueNode"
          to: "UniqueStringNode"
        )
        @hasScope(
          scopes: [
            "UniqueNode: Merge"
            "merge:uniquenode"
            "UniqueStringNode: Merge"
            "merge:uniquestringnode"
          ]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/#create) for [creating](https://neo4j.com/docs/cypher-manual/4.1/clauses/create/#create-nodes) a UniqueStringNode node.
      """
      CreateUniqueStringNode(id: ID!, uniqueString: String): UniqueStringNode
        @hasScope(
          scopes: ["UniqueStringNode: Create", "create:uniquestringnode"]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/#update) for [updating](https://neo4j.com/docs/cypher-manual/4.1/clauses/set/#set-update-a-property) a UniqueStringNode node.
      """
      UpdateUniqueStringNode(id: ID, uniqueString: String!): UniqueStringNode
        @hasScope(
          scopes: ["UniqueStringNode: Update", "update:uniquestringnode"]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/#delete) for [deleting](https://neo4j.com/docs/cypher-manual/4.1/clauses/delete/#delete-delete-single-node) a UniqueStringNode node.
      """
      DeleteUniqueStringNode(uniqueString: String!): UniqueStringNode
        @hasScope(
          scopes: ["UniqueStringNode: Delete", "delete:uniquestringnode"]
        )
      """
      [Generated mutation](https://grandstack.io/docs/graphql-schema-generation-augmentation/#merge) for [merging](https://neo4j.com/docs/cypher-manual/4.1/clauses/merge/#query-merge-node-derived) a UniqueStringNode node.
      """
      MergeUniqueStringNode(id: ID, uniqueString: String!): UniqueStringNode
        @hasScope(scopes: ["UniqueStringNode: Merge", "merge:uniquestringnode"])
      CustomCamera: Camera
        @cypher(
          statement: "CREATE (newCamera:Camera:NewCamera {id: apoc.create.uuid(), type: 'macro'}) RETURN newCamera"
        )
      CustomCameras: [Camera]
        @cypher(
          statement: "CREATE (newCamera:Camera:NewCamera {id: apoc.create.uuid(), type: 'macro', features: ['selfie', 'zoom']}) CREATE (oldCamera:Camera:OldCamera {id: apoc.create.uuid(), type: 'floating', smell: 'rusty' }) RETURN [newCamera, oldCamera]"
        )
    }
    type SubscriptionC {
      testSubscribe: Boolean
    }
    """
    Directive definition
    block
    description
    """
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
    directive @search(index: String) on FIELD_DEFINITION
    directive @isAuthenticated on OBJECT | FIELD_DEFINITION
    directive @hasRole(roles: [Role]) on OBJECT | FIELD_DEFINITION
    directive @hasScope(scopes: [String]) on OBJECT | FIELD_DEFINITION
  `;

  const expectedSchema = buildSchema(expectedTypeDefs);
  const differences = diff(sourceSchema, expectedSchema);
  if (differences.length) {
    console.log('differences: ', differences);
    t.fail();
  } else {
    t.pass();
  }
  t.end();
});
