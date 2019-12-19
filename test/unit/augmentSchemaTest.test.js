import test from 'ava';
import { parse, print } from 'graphql';
import { printSchemaDocument } from '../../src/augment/augment';
import { makeAugmentedSchema } from '../../src/index';
import { testSchema } from '../helpers/testSchema';
import { Kind } from 'graphql/language';

test.cb('Test augmented schema', t => {
  const sourceSchema = makeAugmentedSchema({
    typeDefs: testSchema,
    config: {
      auth: true
    }
  });

  const expectedSchema = /* GraphQL */ `
    directive @cypher(statement: String) on FIELD_DEFINITION

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

    directive @isAuthenticated on OBJECT | FIELD_DEFINITION

    directive @hasRole(roles: [Role]) on OBJECT | FIELD_DEFINITION

    directive @hasScope(scopes: [String]) on OBJECT | FIELD_DEFINITION

    type QueryA {
      Movie(
        _id: String
        movieId: ID
        title: String
        year: Int
        released: _Neo4jDateTimeInput
        plot: String
        poster: String
        imdbRating: Float
        location: _Neo4jPointInput
        first: Int
        offset: Int
        orderBy: [_MovieOrdering]
        filter: _MovieFilter
      ): [Movie]
      MoviesByYear(
        year: Int
        first: Int
        offset: Int
        orderBy: [_MovieOrdering]
        filter: _MovieFilter
      ): [Movie]
      MoviesByYears(
        year: [Int]
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
      Genre(
        _id: String
        name: String
        first: Int
        offset: Int
        orderBy: [_GenreOrdering]
        filter: _GenreFilter
      ): [Genre] @hasScope(scopes: ["Genre: Read"])
      Person(
        userId: ID
        name: String
        _id: String
        first: Int
        offset: Int
        orderBy: [_PersonOrdering]
        filter: _PersonFilter
      ): [Person] @hasScope(scopes: ["Person: Read"])
      Actor(
        userId: ID
        name: String
        _id: String
        first: Int
        offset: Int
        orderBy: [_ActorOrdering]
        filter: _ActorFilter
      ): [Actor] @hasScope(scopes: ["Actor: Read"])
      SuperHero(
        id: ID
        name: String
        created: _Neo4jDateTimeInput
        updated: _Neo4jDateTimeInput
        _id: String
        first: Int
        offset: Int
        orderBy: [_SuperHeroOrdering]
        filter: _SuperHeroFilter
      ): [SuperHero] @hasScope(scopes: ["SuperHero: Read"])
      Power(
        id: ID
        title: String
        _id: String
        first: Int
        offset: Int
        orderBy: [_PowerOrdering]
        filter: _PowerFilter
      ): [Power] @hasScope(scopes: ["Power: Read"])
      Book(
        genre: BookGenre
        _id: String
        first: Int
        offset: Int
        orderBy: [_BookOrdering]
        filter: _BookFilter
      ): [Book] @hasScope(scopes: ["Book: Read"])
      TemporalNode(
        datetime: _Neo4jDateTimeInput
        name: String
        time: _Neo4jTimeInput
        date: _Neo4jDateInput
        localtime: _Neo4jLocalTimeInput
        localdatetime: _Neo4jLocalDateTimeInput
        localdatetimes: _Neo4jLocalDateTimeInput
        computedTimestamp: String
        _id: String
        first: Int
        offset: Int
        orderBy: [_TemporalNodeOrdering]
        filter: _TemporalNodeFilter
      ): [TemporalNode] @hasScope(scopes: ["TemporalNode: Read"])
      SpatialNode(
        id: ID
        point: _Neo4jPointInput
        _id: String
        first: Int
        offset: Int
        orderBy: [_SpatialNodeOrdering]
        filter: _SpatialNodeFilter
      ): [SpatialNode] @hasScope(scopes: ["SpatialNode: Read"])
    }

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
      formatted: String
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
      location_asc
      location_desc
      scaleRating_asc
      scaleRating_desc
      scaleRatingFloat_asc
      scaleRatingFloat_desc
      currentUserId_asc
      currentUserId_desc
    }

    input _MovieFilter {
      AND: [_MovieFilter!]
      OR: [_MovieFilter!]
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
      someprefix_title_with_underscores: String
      someprefix_title_with_underscores_not: String
      someprefix_title_with_underscores_in: [String!]
      someprefix_title_with_underscores_not_in: [String!]
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
      ratings: _MovieRatedFilter
      ratings_not: _MovieRatedFilter
      ratings_in: [_MovieRatedFilter!]
      ratings_not_in: [_MovieRatedFilter!]
      ratings_some: _MovieRatedFilter
      ratings_none: _MovieRatedFilter
      ratings_single: _MovieRatedFilter
      ratings_every: _MovieRatedFilter
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
      movies: _MovieFilter
      movies_not: _MovieFilter
      movies_in: [_MovieFilter!]
      movies_not_in: [_MovieFilter!]
      movies_some: _MovieFilter
      movies_none: _MovieFilter
      movies_single: _MovieFilter
      movies_every: _MovieFilter
    }

    input _ActorFilter {
      AND: [_ActorFilter!]
      OR: [_ActorFilter!]
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
      movies: _MovieFilter
      movies_not: _MovieFilter
      movies_in: [_MovieFilter!]
      movies_not_in: [_MovieFilter!]
      movies_some: _MovieFilter
      movies_none: _MovieFilter
      movies_single: _MovieFilter
      movies_every: _MovieFilter
    }

    input _StateFilter {
      AND: [_StateFilter!]
      OR: [_StateFilter!]
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
      location: _Neo4jPointInput
      location_not: _Neo4jPointInput
      location_distance: _Neo4jPointDistanceFilter
      location_distance_lt: _Neo4jPointDistanceFilter
      location_distance_lte: _Neo4jPointDistanceFilter
      location_distance_gt: _Neo4jPointDistanceFilter
      location_distance_gte: _Neo4jPointDistanceFilter
      User: _UserFilter
    }

    input _Neo4jTimeInput {
      hour: Int
      minute: Int
      second: Int
      millisecond: Int
      microsecond: Int
      nanosecond: Int
      timezone: String
      formatted: String
    }

    input _Neo4jDateInput {
      year: Int
      month: Int
      day: Int
      formatted: String
    }

    input _Neo4jLocalTimeInput {
      hour: Int
      minute: Int
      second: Int
      millisecond: Int
      microsecond: Int
      nanosecond: Int
      formatted: String
    }

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
      formatted: String
    }

    input _UserFilter {
      AND: [_UserFilter!]
      OR: [_UserFilter!]
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
      rated: _UserRatedFilter
      rated_not: _UserRatedFilter
      rated_in: [_UserRatedFilter!]
      rated_not_in: [_UserRatedFilter!]
      rated_some: _UserRatedFilter
      rated_none: _UserRatedFilter
      rated_single: _UserRatedFilter
      rated_every: _UserRatedFilter
      friends: _FriendOfDirectionsFilter
      friends_not: _FriendOfDirectionsFilter
      friends_in: [_FriendOfDirectionsFilter!]
      friends_not_in: [_FriendOfDirectionsFilter!]
      friends_some: _FriendOfDirectionsFilter
      friends_none: _FriendOfDirectionsFilter
      friends_single: _FriendOfDirectionsFilter
      friends_every: _FriendOfDirectionsFilter
      favorites: _MovieFilter
      favorites_not: _MovieFilter
      favorites_in: [_MovieFilter!]
      favorites_not_in: [_MovieFilter!]
      favorites_some: _MovieFilter
      favorites_none: _MovieFilter
      favorites_single: _MovieFilter
      favorites_every: _MovieFilter
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
      location: _Neo4jPointInput
      location_not: _Neo4jPointInput
      location_distance: _Neo4jPointDistanceFilter
      location_distance_lt: _Neo4jPointDistanceFilter
      location_distance_lte: _Neo4jPointDistanceFilter
      location_distance_gt: _Neo4jPointDistanceFilter
      location_distance_gte: _Neo4jPointDistanceFilter
      Movie: _MovieFilter
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

    type Movie
      @additionalLabels(
        labels: ["u_<%= $cypherParams.userId %>", "newMovieLabel"]
      ) {
      _id: String
      movieId: ID!
      title: String @isAuthenticated
      someprefix_title_with_underscores: String
      year: Int
      released: _Neo4jDateTime!
      plot: String
      poster: String
      imdbRating: Float
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
      ratings(
        rating: Int
        time: _Neo4jTimeInput
        date: _Neo4jDateInput
        datetime: _Neo4jDateTimeInput
        localtime: _Neo4jLocalTimeInput
        localdatetime: _Neo4jLocalDateTimeInput
        location: _Neo4jPointInput
        filter: _MovieRatedFilter
      ): [_MovieRatings]
      years: [Int]
      titles: [String]
      imdbRatings: [Float]
      releases: [_Neo4jDateTime]
      customField: String @neo4j_ignore
      currentUserId(strArg: String): String
        @cypher(
          statement: "RETURN $cypherParams.currentUserId AS cypherParamsUserId"
        )
    }

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
      formatted: String
    }

    enum _GenreOrdering {
      name_desc
      name_asc
    }

    type Genre {
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
    }

    enum _ActorOrdering {
      userId_asc
      userId_desc
      name_asc
      name_desc
      _id_asc
      _id_desc
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
      _id: String
    }

    interface Person {
      userId: ID!
      name: String
    }

    type State {
      customField: String @neo4j_ignore
      name: String!
      _id: String
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
      User: User
    }

    type _Neo4jTime {
      hour: Int
      minute: Int
      second: Int
      millisecond: Int
      microsecond: Int
      nanosecond: Int
      timezone: String
      formatted: String
    }

    type _Neo4jDate {
      year: Int
      month: Int
      day: Int
      formatted: String
    }

    type _Neo4jLocalTime {
      hour: Int
      minute: Int
      second: Int
      millisecond: Int
      microsecond: Int
      nanosecond: Int
      formatted: String
    }

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
      formatted: String
    }

    type User implements Person {
      userId: ID!
      name: String
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
        filter: _UserRatedFilter
      ): [_UserRated]
      friends: _UserFriendsDirections
      favorites(
        first: Int
        offset: Int
        orderBy: [_MovieOrdering]
        filter: _MovieFilter
      ): [Movie] @relation(name: "FAVORITED", direction: "OUT")
      _id: String
    }

    input strInput {
      strArg: String
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
      Movie: Movie
    }

    type _UserFriendsDirections
      @relation(name: "FRIEND_OF", from: "User", to: "User") {
      from(
        since: Int
        time: _Neo4jTimeInput
        date: _Neo4jDateInput
        datetime: _Neo4jDateTimeInput
        localtime: _Neo4jLocalTimeInput
        localdatetime: _Neo4jLocalDateTimeInput
        location: _Neo4jPointInput
        filter: _FriendOfFilter
      ): [_UserFriends]
      to(
        since: Int
        time: _Neo4jTimeInput
        date: _Neo4jDateInput
        datetime: _Neo4jDateTimeInput
        localtime: _Neo4jLocalTimeInput
        localdatetime: _Neo4jLocalDateTimeInput
        location: _Neo4jPointInput
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
      datetimes: [_Neo4jDateTime]
      localtime: _Neo4jLocalTime
      localdatetime: _Neo4jLocalDateTime
      location: _Neo4jPoint
      User: User
    }

    enum _StateOrdering {
      name_asc
      name_desc
      _id_asc
      _id_desc
    }

    enum _UserOrdering {
      userId_asc
      userId_desc
      name_asc
      name_desc
      currentUserId_asc
      currentUserId_desc
      _id_asc
      _id_desc
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

    enum BookGenre {
      Mystery
      Science
      Math
    }

    type Book {
      genre: BookGenre
      _id: String
    }

    type currentUserId {
      userId: String
      _id: String
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
      _id: String
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
      _id: String
    }

    type Mutation {
      currentUserId: String
        @cypher(statement: "RETURN $cypherParams.currentUserId")
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
      customWithArguments(strArg: String, strInputArg: strInput): String
        @cypher(statement: "RETURN $strInputArg.strArg")
      testPublish: Boolean @neo4j_ignore
      AddMovieGenres(
        from: _MovieInput!
        to: _GenreInput!
      ): _AddMovieGenresPayload
        @MutationMeta(relationship: "IN_GENRE", from: "Movie", to: "Genre")
        @hasScope(scopes: ["Movie: Create", "Genre: Create"])
      RemoveMovieGenres(
        from: _MovieInput!
        to: _GenreInput!
      ): _RemoveMovieGenresPayload
        @MutationMeta(relationship: "IN_GENRE", from: "Movie", to: "Genre")
        @hasScope(scopes: ["Movie: Delete", "Genre: Delete"])
      MergeMovieGenres(
        from: _MovieInput!
        to: _GenreInput!
      ): _MergeMovieGenresPayload
        @MutationMeta(relationship: "IN_GENRE", from: "Movie", to: "Genre")
        @hasScope(scopes: ["Movie: Merge", "Genre: Merge"])
      AddMovieActors(
        from: _ActorInput!
        to: _MovieInput!
      ): _AddMovieActorsPayload
        @MutationMeta(relationship: "ACTED_IN", from: "Actor", to: "Movie")
        @hasScope(scopes: ["Actor: Create", "Movie: Create"])
      RemoveMovieActors(
        from: _ActorInput!
        to: _MovieInput!
      ): _RemoveMovieActorsPayload
        @MutationMeta(relationship: "ACTED_IN", from: "Actor", to: "Movie")
        @hasScope(scopes: ["Actor: Delete", "Movie: Delete"])
      MergeMovieActors(
        from: _ActorInput!
        to: _MovieInput!
      ): _MergeMovieActorsPayload
        @MutationMeta(relationship: "ACTED_IN", from: "Actor", to: "Movie")
        @hasScope(scopes: ["Actor: Merge", "Movie: Merge"])
      AddMovieFilmedIn(
        from: _MovieInput!
        to: _StateInput!
      ): _AddMovieFilmedInPayload
        @MutationMeta(relationship: "FILMED_IN", from: "Movie", to: "State")
        @hasScope(scopes: ["Movie: Create", "State: Create"])
      RemoveMovieFilmedIn(
        from: _MovieInput!
        to: _StateInput!
      ): _RemoveMovieFilmedInPayload
        @MutationMeta(relationship: "FILMED_IN", from: "Movie", to: "State")
        @hasScope(scopes: ["Movie: Delete", "State: Delete"])
      MergeMovieFilmedIn(
        from: _MovieInput!
        to: _StateInput!
      ): _MergeMovieFilmedInPayload
        @MutationMeta(relationship: "FILMED_IN", from: "Movie", to: "State")
        @hasScope(scopes: ["Movie: Merge", "State: Merge"])
      AddMovieRatings(
        from: _UserInput!
        to: _MovieInput!
        data: _RatedInput!
      ): _AddMovieRatingsPayload
        @MutationMeta(relationship: "RATED", from: "User", to: "Movie")
        @hasScope(scopes: ["User: Create", "Movie: Create"])
      RemoveMovieRatings(
        from: _UserInput!
        to: _MovieInput!
      ): _RemoveMovieRatingsPayload
        @MutationMeta(relationship: "RATED", from: "User", to: "Movie")
        @hasScope(scopes: ["User: Delete", "Movie: Delete"])
      UpdateMovieRatings(
        from: _UserInput!
        to: _MovieInput!
        data: _RatedInput!
      ): _UpdateMovieRatingsPayload
        @MutationMeta(relationship: "RATED", from: "User", to: "Movie")
        @hasScope(scopes: ["User: Update", "Movie: Update"])
      MergeMovieRatings(
        from: _UserInput!
        to: _MovieInput!
        data: _RatedInput!
      ): _MergeMovieRatingsPayload
        @MutationMeta(relationship: "RATED", from: "User", to: "Movie")
        @hasScope(scopes: ["User: Merge", "Movie: Merge"])
      CreateMovie(
        movieId: ID
        title: String
        someprefix_title_with_underscores: String
        year: Int
        released: _Neo4jDateTimeInput!
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
      ): Movie @hasScope(scopes: ["Movie: Create"])
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
      ): Movie @hasScope(scopes: ["Movie: Update"])
      DeleteMovie(movieId: ID!): Movie @hasScope(scopes: ["Movie: Delete"])
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
      ): Movie @hasScope(scopes: ["Movie: Merge"])
      AddGenreMovies(
        from: _MovieInput!
        to: _GenreInput!
      ): _AddGenreMoviesPayload
        @MutationMeta(relationship: "IN_GENRE", from: "Movie", to: "Genre")
        @hasScope(scopes: ["Movie: Create", "Genre: Create"])
      RemoveGenreMovies(
        from: _MovieInput!
        to: _GenreInput!
      ): _RemoveGenreMoviesPayload
        @MutationMeta(relationship: "IN_GENRE", from: "Movie", to: "Genre")
        @hasScope(scopes: ["Movie: Delete", "Genre: Delete"])
      MergeGenreMovies(
        from: _MovieInput!
        to: _GenreInput!
      ): _MergeGenreMoviesPayload
        @MutationMeta(relationship: "IN_GENRE", from: "Movie", to: "Genre")
        @hasScope(scopes: ["Movie: Merge", "Genre: Merge"])
      CreateGenre(name: String): Genre @hasScope(scopes: ["Genre: Create"])
      DeleteGenre(name: String!): Genre @hasScope(scopes: ["Genre: Delete"])
      CreateState(name: String!): State @hasScope(scopes: ["State: Create"])
      DeleteState(name: String!): State @hasScope(scopes: ["State: Delete"])
      AddActorMovies(
        from: _ActorInput!
        to: _MovieInput!
      ): _AddActorMoviesPayload
        @MutationMeta(relationship: "ACTED_IN", from: "Actor", to: "Movie")
        @hasScope(scopes: ["Actor: Create", "Movie: Create"])
      RemoveActorMovies(
        from: _ActorInput!
        to: _MovieInput!
      ): _RemoveActorMoviesPayload
        @MutationMeta(relationship: "ACTED_IN", from: "Actor", to: "Movie")
        @hasScope(scopes: ["Actor: Delete", "Movie: Delete"])
      MergeActorMovies(
        from: _ActorInput!
        to: _MovieInput!
      ): _MergeActorMoviesPayload
        @MutationMeta(relationship: "ACTED_IN", from: "Actor", to: "Movie")
        @hasScope(scopes: ["Actor: Merge", "Movie: Merge"])
      CreateActor(userId: ID, name: String): Actor
        @hasScope(scopes: ["Actor: Create"])
      UpdateActor(userId: ID!, name: String): Actor
        @hasScope(scopes: ["Actor: Update"])
      DeleteActor(userId: ID!): Actor @hasScope(scopes: ["Actor: Delete"])
      MergeActor(userId: ID!, name: String): Actor
        @hasScope(scopes: ["Actor: Merge"])
      AddUserRated(
        from: _UserInput!
        to: _MovieInput!
        data: _RatedInput!
      ): _AddUserRatedPayload
        @MutationMeta(relationship: "RATED", from: "User", to: "Movie")
        @hasScope(scopes: ["User: Create", "Movie: Create"])
      RemoveUserRated(
        from: _UserInput!
        to: _MovieInput!
      ): _RemoveUserRatedPayload
        @MutationMeta(relationship: "RATED", from: "User", to: "Movie")
        @hasScope(scopes: ["User: Delete", "Movie: Delete"])
      UpdateUserRated(
        from: _UserInput!
        to: _MovieInput!
        data: _RatedInput!
      ): _UpdateUserRatedPayload
        @MutationMeta(relationship: "RATED", from: "User", to: "Movie")
        @hasScope(scopes: ["User: Update", "Movie: Update"])
      MergeUserRated(
        from: _UserInput!
        to: _MovieInput!
        data: _RatedInput!
      ): _MergeUserRatedPayload
        @MutationMeta(relationship: "RATED", from: "User", to: "Movie")
        @hasScope(scopes: ["User: Merge", "Movie: Merge"])
      AddUserFriends(
        from: _UserInput!
        to: _UserInput!
        data: _FriendOfInput!
      ): _AddUserFriendsPayload
        @MutationMeta(relationship: "FRIEND_OF", from: "User", to: "User")
        @hasScope(scopes: ["User: Create", "User: Create"])
      RemoveUserFriends(
        from: _UserInput!
        to: _UserInput!
      ): _RemoveUserFriendsPayload
        @MutationMeta(relationship: "FRIEND_OF", from: "User", to: "User")
        @hasScope(scopes: ["User: Delete", "User: Delete"])
      UpdateUserFriends(
        from: _UserInput!
        to: _UserInput!
        data: _FriendOfInput!
      ): _UpdateUserFriendsPayload
        @MutationMeta(relationship: "FRIEND_OF", from: "User", to: "User")
        @hasScope(scopes: ["User: Update", "User: Update"])
      MergeUserFriends(
        from: _UserInput!
        to: _UserInput!
        data: _FriendOfInput!
      ): _MergeUserFriendsPayload
        @MutationMeta(relationship: "FRIEND_OF", from: "User", to: "User")
        @hasScope(scopes: ["User: Merge", "User: Merge"])
      AddUserFavorites(
        from: _UserInput!
        to: _MovieInput!
      ): _AddUserFavoritesPayload
        @MutationMeta(relationship: "FAVORITED", from: "User", to: "Movie")
        @hasScope(scopes: ["User: Create", "Movie: Create"])
      RemoveUserFavorites(
        from: _UserInput!
        to: _MovieInput!
      ): _RemoveUserFavoritesPayload
        @MutationMeta(relationship: "FAVORITED", from: "User", to: "Movie")
        @hasScope(scopes: ["User: Delete", "Movie: Delete"])
      MergeUserFavorites(
        from: _UserInput!
        to: _MovieInput!
      ): _MergeUserFavoritesPayload
        @MutationMeta(relationship: "FAVORITED", from: "User", to: "Movie")
        @hasScope(scopes: ["User: Merge", "Movie: Merge"])
      CreateUser(userId: ID, name: String): User
        @hasScope(scopes: ["User: Create"])
      UpdateUser(userId: ID!, name: String): User
        @hasScope(scopes: ["User: Update"])
      DeleteUser(userId: ID!): User @hasScope(scopes: ["User: Delete"])
      MergeUser(userId: ID!, name: String): User
        @hasScope(scopes: ["User: Merge"])
      CreateSuperHero(
        id: ID
        name: String!
        created: _Neo4jDateTimeInput
        updated: _Neo4jDateTimeInput
      ): SuperHero @hasScope(scopes: ["SuperHero: Create"])
      UpdateSuperHero(
        id: ID!
        name: String
        created: _Neo4jDateTimeInput
        updated: _Neo4jDateTimeInput
      ): SuperHero @hasScope(scopes: ["SuperHero: Update"])
      DeleteSuperHero(id: ID!): SuperHero
        @hasScope(scopes: ["SuperHero: Delete"])
      MergeSuperHero(
        id: ID!
        name: String
        created: _Neo4jDateTimeInput
        updated: _Neo4jDateTimeInput
      ): SuperHero @hasScope(scopes: ["SuperHero: Merge"])
      AddPowerEndowment(
        from: _PowerInput!
        to: _SuperHeroInput!
        data: _EndowmentInput!
      ): _AddPowerEndowmentPayload
        @MutationMeta(
          relationship: "ENDOWED_TO"
          from: "Power"
          to: "SuperHero"
        )
        @hasScope(scopes: ["Power: Create", "SuperHero: Create"])
      RemovePowerEndowment(
        from: _PowerInput!
        to: _SuperHeroInput!
      ): _RemovePowerEndowmentPayload
        @MutationMeta(
          relationship: "ENDOWED_TO"
          from: "Power"
          to: "SuperHero"
        )
        @hasScope(scopes: ["Power: Delete", "SuperHero: Delete"])
      UpdatePowerEndowment(
        from: _PowerInput!
        to: _SuperHeroInput!
        data: _EndowmentInput!
      ): _UpdatePowerEndowmentPayload
        @MutationMeta(
          relationship: "ENDOWED_TO"
          from: "Power"
          to: "SuperHero"
        )
        @hasScope(scopes: ["Power: Update", "SuperHero: Update"])
      MergePowerEndowment(
        from: _PowerInput!
        to: _SuperHeroInput!
        data: _EndowmentInput!
      ): _MergePowerEndowmentPayload
        @MutationMeta(
          relationship: "ENDOWED_TO"
          from: "Power"
          to: "SuperHero"
        )
        @hasScope(scopes: ["Power: Merge", "SuperHero: Merge"])
      CreatePower(id: ID, title: String!): Power
        @hasScope(scopes: ["Power: Create"])
      UpdatePower(id: ID!, title: String): Power
        @hasScope(scopes: ["Power: Update"])
      DeletePower(id: ID!): Power @hasScope(scopes: ["Power: Delete"])
      MergePower(id: ID!, title: String): Power
        @hasScope(scopes: ["Power: Merge"])
      CreateBook(genre: BookGenre): Book @hasScope(scopes: ["Book: Create"])
      DeleteBook(genre: BookGenre!): Book @hasScope(scopes: ["Book: Delete"])
      CreatecurrentUserId(userId: String): currentUserId
        @hasScope(scopes: ["currentUserId: Create"])
      DeletecurrentUserId(userId: String!): currentUserId
        @hasScope(scopes: ["currentUserId: Delete"])
      AddTemporalNodeTemporalNodes(
        from: _TemporalNodeInput!
        to: _TemporalNodeInput!
      ): _AddTemporalNodeTemporalNodesPayload
        @MutationMeta(
          relationship: "TEMPORAL"
          from: "TemporalNode"
          to: "TemporalNode"
        )
        @hasScope(scopes: ["TemporalNode: Create", "TemporalNode: Create"])
      RemoveTemporalNodeTemporalNodes(
        from: _TemporalNodeInput!
        to: _TemporalNodeInput!
      ): _RemoveTemporalNodeTemporalNodesPayload
        @MutationMeta(
          relationship: "TEMPORAL"
          from: "TemporalNode"
          to: "TemporalNode"
        )
        @hasScope(scopes: ["TemporalNode: Delete", "TemporalNode: Delete"])
      MergeTemporalNodeTemporalNodes(
        from: _TemporalNodeInput!
        to: _TemporalNodeInput!
      ): _MergeTemporalNodeTemporalNodesPayload
        @MutationMeta(
          relationship: "TEMPORAL"
          from: "TemporalNode"
          to: "TemporalNode"
        )
        @hasScope(scopes: ["TemporalNode: Merge", "TemporalNode: Merge"])
      CreateTemporalNode(
        datetime: _Neo4jDateTimeInput
        name: String
        time: _Neo4jTimeInput
        date: _Neo4jDateInput
        localtime: _Neo4jLocalTimeInput
        localdatetime: _Neo4jLocalDateTimeInput
        localdatetimes: [_Neo4jLocalDateTimeInput]
      ): TemporalNode @hasScope(scopes: ["TemporalNode: Create"])
      UpdateTemporalNode(
        datetime: _Neo4jDateTimeInput!
        name: String
        time: _Neo4jTimeInput
        date: _Neo4jDateInput
        localtime: _Neo4jLocalTimeInput
        localdatetime: _Neo4jLocalDateTimeInput
        localdatetimes: [_Neo4jLocalDateTimeInput]
      ): TemporalNode @hasScope(scopes: ["TemporalNode: Update"])
      DeleteTemporalNode(datetime: _Neo4jDateTimeInput!): TemporalNode
        @hasScope(scopes: ["TemporalNode: Delete"])
      MergeTemporalNode(
        datetime: _Neo4jDateTimeInput!
        name: String
        time: _Neo4jTimeInput
        date: _Neo4jDateInput
        localtime: _Neo4jLocalTimeInput
        localdatetime: _Neo4jLocalDateTimeInput
        localdatetimes: [_Neo4jLocalDateTimeInput]
      ): TemporalNode @hasScope(scopes: ["TemporalNode: Merge"])
      AddSpatialNodeSpatialNodes(
        from: _SpatialNodeInput!
        to: _SpatialNodeInput!
      ): _AddSpatialNodeSpatialNodesPayload
        @MutationMeta(
          relationship: "SPATIAL"
          from: "SpatialNode"
          to: "SpatialNode"
        )
        @hasScope(scopes: ["SpatialNode: Create", "SpatialNode: Create"])
      RemoveSpatialNodeSpatialNodes(
        from: _SpatialNodeInput!
        to: _SpatialNodeInput!
      ): _RemoveSpatialNodeSpatialNodesPayload
        @MutationMeta(
          relationship: "SPATIAL"
          from: "SpatialNode"
          to: "SpatialNode"
        )
        @hasScope(scopes: ["SpatialNode: Delete", "SpatialNode: Delete"])
      MergeSpatialNodeSpatialNodes(
        from: _SpatialNodeInput!
        to: _SpatialNodeInput!
      ): _MergeSpatialNodeSpatialNodesPayload
        @MutationMeta(
          relationship: "SPATIAL"
          from: "SpatialNode"
          to: "SpatialNode"
        )
        @hasScope(scopes: ["SpatialNode: Merge", "SpatialNode: Merge"])
      CreateSpatialNode(id: ID, point: _Neo4jPointInput): SpatialNode
        @hasScope(scopes: ["SpatialNode: Create"])
      UpdateSpatialNode(id: ID!, point: _Neo4jPointInput): SpatialNode
        @hasScope(scopes: ["SpatialNode: Update"])
      DeleteSpatialNode(id: ID!): SpatialNode
        @hasScope(scopes: ["SpatialNode: Delete"])
      MergeSpatialNode(id: ID!, point: _Neo4jPointInput): SpatialNode
        @hasScope(scopes: ["SpatialNode: Merge"])
      AddCasedTypeState(
        from: _CasedTypeInput!
        to: _StateInput!
      ): _AddCasedTypeStatePayload
        @MutationMeta(relationship: "FILMED_IN", from: "CasedType", to: "State")
        @hasScope(scopes: ["CasedType: Create", "State: Create"])
      RemoveCasedTypeState(
        from: _CasedTypeInput!
        to: _StateInput!
      ): _RemoveCasedTypeStatePayload
        @MutationMeta(relationship: "FILMED_IN", from: "CasedType", to: "State")
        @hasScope(scopes: ["CasedType: Delete", "State: Delete"])
      MergeCasedTypeState(
        from: _CasedTypeInput!
        to: _StateInput!
      ): _MergeCasedTypeStatePayload
        @MutationMeta(relationship: "FILMED_IN", from: "CasedType", to: "State")
        @hasScope(scopes: ["CasedType: Merge", "State: Merge"])
      CreateCasedType(name: String): CasedType
        @hasScope(scopes: ["CasedType: Create"])
      DeleteCasedType(name: String!): CasedType
        @hasScope(scopes: ["CasedType: Delete"])
    }

    input _MovieInput {
      movieId: ID!
    }

    input _GenreInput {
      name: String!
    }

    type _AddMovieGenresPayload
      @relation(name: "IN_GENRE", from: "Movie", to: "Genre") {
      from: Movie
      to: Genre
    }

    type _RemoveMovieGenresPayload
      @relation(name: "IN_GENRE", from: "Movie", to: "Genre") {
      from: Movie
      to: Genre
    }

    input _ActorInput {
      userId: ID!
    }

    type _AddMovieActorsPayload
      @relation(name: "ACTED_IN", from: "Actor", to: "Movie") {
      from: Actor
      to: Movie
    }

    type _RemoveMovieActorsPayload
      @relation(name: "ACTED_IN", from: "Actor", to: "Movie") {
      from: Actor
      to: Movie
    }

    input _StateInput {
      name: String!
    }

    type _AddMovieFilmedInPayload
      @relation(name: "FILMED_IN", from: "Movie", to: "State") {
      from: Movie
      to: State
    }

    type _RemoveMovieFilmedInPayload
      @relation(name: "FILMED_IN", from: "Movie", to: "State") {
      from: Movie
      to: State
    }

    input _UserInput {
      userId: ID!
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
      from: User
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
    }

    type _RemoveMovieRatingsPayload
      @relation(name: "RATED", from: "User", to: "Movie") {
      from: User
      to: Movie
    }

    type _AddGenreMoviesPayload
      @relation(name: "IN_GENRE", from: "Movie", to: "Genre") {
      from: Movie
      to: Genre
    }

    type _RemoveGenreMoviesPayload
      @relation(name: "IN_GENRE", from: "Movie", to: "Genre") {
      from: Movie
      to: Genre
    }

    type _AddActorMoviesPayload
      @relation(name: "ACTED_IN", from: "Actor", to: "Movie") {
      from: Actor
      to: Movie
    }

    type _RemoveActorMoviesPayload
      @relation(name: "ACTED_IN", from: "Actor", to: "Movie") {
      from: Actor
      to: Movie
    }

    type _AddUserRatedPayload
      @relation(name: "RATED", from: "User", to: "Movie") {
      from: User
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
    }

    type _RemoveUserRatedPayload
      @relation(name: "RATED", from: "User", to: "Movie") {
      from: User
      to: Movie
    }

    input _FriendOfInput {
      since: Int
      time: _Neo4jTimeInput
      date: _Neo4jDateInput
      datetime: _Neo4jDateTimeInput
      datetimes: [_Neo4jDateTimeInput]
      localtime: _Neo4jLocalTimeInput
      localdatetime: _Neo4jLocalDateTimeInput
      location: _Neo4jPointInput
    }

    type _AddUserFriendsPayload
      @relation(name: "FRIEND_OF", from: "User", to: "User") {
      from: User
      to: User
      currentUserId: String
        @cypher(
          statement: "RETURN $cypherParams.currentUserId AS cypherParamsUserId"
        )
      since: Int
      time: _Neo4jTime
      date: _Neo4jDate
      datetime: _Neo4jDateTime
      datetimes: [_Neo4jDateTime]
      localtime: _Neo4jLocalTime
      localdatetime: _Neo4jLocalDateTime
      location: _Neo4jPoint
    }

    type _RemoveUserFriendsPayload
      @relation(name: "FRIEND_OF", from: "User", to: "User") {
      from: User
      to: User
    }

    type _AddUserFavoritesPayload
      @relation(name: "FAVORITED", from: "User", to: "Movie") {
      from: User
      to: Movie
    }

    type _RemoveUserFavoritesPayload
      @relation(name: "FAVORITED", from: "User", to: "Movie") {
      from: User
      to: Movie
    }

    input _TemporalNodeInput {
      datetime: _Neo4jDateTimeInput!
    }

    type _AddTemporalNodeTemporalNodesPayload
      @relation(name: "TEMPORAL", from: "TemporalNode", to: "TemporalNode") {
      from: TemporalNode
      to: TemporalNode
    }

    type _RemoveTemporalNodeTemporalNodesPayload
      @relation(name: "TEMPORAL", from: "TemporalNode", to: "TemporalNode") {
      from: TemporalNode
      to: TemporalNode
    }

    input _CasedTypeInput {
      name: String!
    }

    type _AddCasedTypeStatePayload
      @relation(name: "FILMED_IN", from: "CasedType", to: "State") {
      from: CasedType
      to: State
    }

    type _RemoveCasedTypeStatePayload
      @relation(name: "FILMED_IN", from: "CasedType", to: "State") {
      from: CasedType
      to: State
    }

    type SubscriptionC {
      testSubscribe: Boolean
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
      datetimes: [_Neo4jDateTime]
      localtime: _Neo4jLocalTime
      localdatetime: _Neo4jLocalDateTime
      location: _Neo4jPoint
      to: User
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
      to: Movie
    }

    input _BookInput {
      genre: BookGenre!
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
      userId_contains: String
      userId_not_contains: String
      userId_starts_with: String
      userId_not_starts_with: String
      userId_ends_with: String
      userId_not_ends_with: String
    }

    input _currentUserIdInput {
      userId: String!
    }

    type ignoredType {
      ignoredField: String @neo4j_ignore
    }

    scalar Time

    scalar Date

    scalar DateTime

    scalar LocalTime

    scalar LocalDateTime

    enum Role {
      reader
      user
      admin
    }

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

    input _Neo4jPointDistanceFilter {
      point: _Neo4jPointInput!
      distance: Float!
    }

    enum _RelationDirections {
      IN
      OUT
    }

    schema {
      query: QueryA
      mutation: Mutation
      subscription: SubscriptionC
    }
  `;
  compareSchema({
    test: t,
    sourceSchema,
    expectedSchema
  });
  t.end();
});

const compareSchema = ({ test, sourceSchema = {}, expectedSchema = {} }) => {
  const definitions = parse(expectedSchema).definitions;
  // printSchema is no longer used here, as it simplifies out the schema type and all
  // directive instances. printSchemaDocument does not simplify anything out, as it uses
  // the graphql print function instead, along with the regeneration of the schema type
  const printedSourceSchema = printSchemaDocument({ schema: sourceSchema });
  const augmentedDefinitions = parse(printedSourceSchema).definitions;
  definitions.forEach(definition => {
    const kind = definition.kind;
    let augmented = undefined;
    if (kind === Kind.SCHEMA_DEFINITION) {
      augmented = augmentedDefinitions.find(
        def => def.kind === Kind.SCHEMA_DEFINITION
      );
    } else {
      const name = definition.name.value;
      augmented = augmentedDefinitions.find(augmentedDefinition => {
        if (augmentedDefinition.name) {
          if (definition.name.value === augmentedDefinition.name.value) {
            return augmentedDefinition;
          }
        }
      });
      if (!augmented) {
        throw new Error(`${name} is missing from the augmented schema`);
      }
    }
    test.is(print(augmented), print(definition));
  });
};
