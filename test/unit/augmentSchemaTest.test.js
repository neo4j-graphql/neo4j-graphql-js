import test from 'ava';
import { augmentedSchema } from '../helpers/cypherTestHelpers';
import { printSchema } from 'graphql';

test.cb('Test augmented schema', t => {
  let schema = augmentedSchema();
  let expectedSchema = `directive @cypher(statement: String) on FIELD_DEFINITION

directive @relation(name: String, direction: _RelationDirections, from: String, to: String) on FIELD_DEFINITION | OBJECT

directive @MutationMeta(relationship: String, from: String, to: String) on FIELD_DEFINITION

directive @neo4j_ignore on FIELD_DEFINITION

directive @isAuthenticated on OBJECT | FIELD_DEFINITION

directive @hasRole(roles: [Role]) on OBJECT | FIELD_DEFINITION

directive @hasScope(scopes: [String]) on OBJECT | FIELD_DEFINITION

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

input _ActorInput {
  userId: ID!
}

enum _ActorOrdering {
  userId_asc
  userId_desc
  name_asc
  name_desc
  _id_asc
  _id_desc
}

type _AddActorMoviesPayload {
  from: Actor
  to: Movie
}

type _AddGenreMoviesPayload {
  from: Movie
  to: Genre
}

type _AddMovieActorsPayload {
  from: Actor
  to: Movie
}

type _AddMovieFilmedInPayload {
  from: Movie
  to: State
}

type _AddMovieGenresPayload {
  from: Movie
  to: Genre
}

type _AddMovieRatingsPayload {
  from: User
  to: Movie
  currentUserId: String
  rating: Int
  ratings: [Int]
  time: _Neo4jTime
  date: _Neo4jDate
  datetime: _Neo4jDateTime
  localtime: _Neo4jLocalTime
  localdatetime: _Neo4jLocalDateTime
  datetimes: [_Neo4jDateTime]
}

type _AddTemporalNodeTemporalNodesPayload {
  from: TemporalNode
  to: TemporalNode
}

type _AddUserFavoritesPayload {
  from: User
  to: Movie
}

type _AddUserFriendsPayload {
  from: User
  to: User
  currentUserId: String
  since: Int
  time: _Neo4jTime
  date: _Neo4jDate
  datetime: _Neo4jDateTime
  datetimes: [_Neo4jDateTime]
  localtime: _Neo4jLocalTime
  localdatetime: _Neo4jLocalDateTime
}

type _AddUserRatedPayload {
  from: User
  to: Movie
  currentUserId: String
  rating: Int
  ratings: [Int]
  time: _Neo4jTime
  date: _Neo4jDate
  datetime: _Neo4jDateTime
  localtime: _Neo4jLocalTime
  localdatetime: _Neo4jLocalDateTime
  datetimes: [_Neo4jDateTime]
}

input _BookFilter {
  AND: [_BookFilter!]
  OR: [_BookFilter!]
  genre: BookGenre
  genre_not: BookGenre
  genre_in: [BookGenre!]
  genre_not_in: [BookGenre!]
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

enum _currentUserIdOrdering {
  userId_asc
  userId_desc
  _id_asc
  _id_desc
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
  User: _UserFilter
}

input _FriendOfInput {
  since: Int
  time: _Neo4jTimeInput
  date: _Neo4jDateInput
  datetime: _Neo4jDateTimeInput
  datetimes: [_Neo4jDateTimeInput]
  localtime: _Neo4jLocalTimeInput
  localdatetime: _Neo4jLocalDateTimeInput
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

input _GenreInput {
  name: String!
}

enum _GenreOrdering {
  name_desc
  name_asc
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
  ratings: _MovieRatedFilter
  ratings_not: _MovieRatedFilter
  ratings_in: [_MovieRatedFilter!]
  ratings_not_in: [_MovieRatedFilter!]
  ratings_some: _MovieRatedFilter
  ratings_none: _MovieRatedFilter
  ratings_single: _MovieRatedFilter
  ratings_every: _MovieRatedFilter
}

input _MovieInput {
  movieId: ID!
}

enum _MovieOrdering {
  title_desc
  title_asc
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
  User: _UserFilter
}

type _MovieRatings {
  currentUserId(strArg: String): String
  rating: Int
  ratings: [Int]
  time: _Neo4jTime
  date: _Neo4jDate
  datetime: _Neo4jDateTime
  localtime: _Neo4jLocalTime
  localdatetime: _Neo4jLocalDateTime
  datetimes: [_Neo4jDateTime]
  User: User
}

type _Neo4jDate {
  year: Int
  month: Int
  day: Int
  formatted: String
}

input _Neo4jDateInput {
  year: Int
  month: Int
  day: Int
  formatted: String
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

type _Neo4jLocalTime {
  hour: Int
  minute: Int
  second: Int
  millisecond: Int
  microsecond: Int
  nanosecond: Int
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

input _Neo4jTimeInput {
  hour: Int
  minute: Int
  second: Int
  nanosecond: Int
  millisecond: Int
  microsecond: Int
  timezone: String
  formatted: String
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
}

enum _RelationDirections {
  IN
  OUT
}

type _RemoveActorMoviesPayload {
  from: Actor
  to: Movie
}

type _RemoveGenreMoviesPayload {
  from: Movie
  to: Genre
}

type _RemoveMovieActorsPayload {
  from: Actor
  to: Movie
}

type _RemoveMovieFilmedInPayload {
  from: Movie
  to: State
}

type _RemoveMovieGenresPayload {
  from: Movie
  to: Genre
}

type _RemoveMovieRatingsPayload {
  from: User
  to: Movie
}

type _RemoveTemporalNodeTemporalNodesPayload {
  from: TemporalNode
  to: TemporalNode
}

type _RemoveUserFavoritesPayload {
  from: User
  to: Movie
}

type _RemoveUserFriendsPayload {
  from: User
  to: User
}

type _RemoveUserRatedPayload {
  from: User
  to: Movie
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

input _StateInput {
  name: String!
}

enum _StateOrdering {
  name_asc
  name_desc
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

input _TemporalNodeInput {
  datetime: _Neo4jDateTimeInput!
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

type _UserFriends {
  currentUserId: String
  since: Int
  time: _Neo4jTime
  date: _Neo4jDate
  datetime: _Neo4jDateTime
  datetimes: [_Neo4jDateTime]
  localtime: _Neo4jLocalTime
  localdatetime: _Neo4jLocalDateTime
  User: User
}

type _UserFriendsDirections {
  from(since: Int, time: _Neo4jTimeInput, date: _Neo4jDateInput, datetime: _Neo4jDateTimeInput, localtime: _Neo4jLocalTimeInput, localdatetime: _Neo4jLocalDateTimeInput, filter: _FriendOfFilter): [_UserFriends]
  to(since: Int, time: _Neo4jTimeInput, date: _Neo4jDateInput, datetime: _Neo4jDateTimeInput, localtime: _Neo4jLocalTimeInput, localdatetime: _Neo4jLocalDateTimeInput, filter: _FriendOfFilter): [_UserFriends]
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
  _id_asc
  _id_desc
}

type _UserRated {
  currentUserId(strArg: String): String
  rating: Int
  ratings: [Int]
  time: _Neo4jTime
  date: _Neo4jDate
  datetime: _Neo4jDateTime
  localtime: _Neo4jLocalTime
  localdatetime: _Neo4jLocalDateTime
  datetimes: [_Neo4jDateTime]
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
  Movie: _MovieFilter
}

type Actor implements Person {
  userId: ID!
  name: String
  movies(first: Int, offset: Int, orderBy: [_MovieOrdering], filter: _MovieFilter): [Movie]
  _id: String
}

type Book {
  genre: BookGenre
  _id: String
}

enum BookGenre {
  Mystery
  Science
  Math
}

type currentUserId {
  userId: String
  _id: String
}

scalar Date

scalar DateTime

type FriendOf {
  from: User
  currentUserId: String
  since: Int
  time: _Neo4jTime
  date: _Neo4jDate
  datetime: _Neo4jDateTime
  datetimes: [_Neo4jDateTime]
  localtime: _Neo4jLocalTime
  localdatetime: _Neo4jLocalDateTime
  to: User
}

type Genre {
  _id: String
  name: String
  movies(first: Int = 3, offset: Int = 0, orderBy: [_MovieOrdering], filter: _MovieFilter): [Movie]
  highestRatedMovie: Movie
}

type ignoredType {
  ignoredField: String
}

scalar LocalDateTime

scalar LocalTime

type Movie {
  _id: String
  movieId: ID!
  title: String
  year: Int
  released: _Neo4jDateTime!
  plot: String
  poster: String
  imdbRating: Float
  genres(first: Int, offset: Int, orderBy: [_GenreOrdering], filter: _GenreFilter): [Genre]
  similar(first: Int = 3, offset: Int = 0, orderBy: [_MovieOrdering]): [Movie]
  mostSimilar: Movie
  degree: Int
  actors(first: Int = 3, offset: Int = 0, name: String, names: [String], orderBy: [_ActorOrdering], filter: _ActorFilter): [Actor]
  avgStars: Float
  filmedIn(filter: _StateFilter): State
  scaleRating(scale: Int = 3): Float
  scaleRatingFloat(scale: Float = 1.5): Float
  actorMovies(first: Int, offset: Int, orderBy: [_MovieOrdering]): [Movie]
  ratings(rating: Int, time: _Neo4jTimeInput, date: _Neo4jDateInput, datetime: _Neo4jDateTimeInput, localtime: _Neo4jLocalTimeInput, localdatetime: _Neo4jLocalDateTimeInput, filter: _MovieRatedFilter): [_MovieRatings]
  years: [Int]
  titles: [String]
  imdbRatings: [Float]
  releases: [_Neo4jDateTime]
  customField: String
  currentUserId(strArg: String): String
}

type Mutation {
  currentUserId: String
  computedObjectWithCypherParams: currentUserId
  computedTemporal: _Neo4jDateTime
  computedStringList: [String]
  customWithArguments(strArg: String, strInputArg: strInput): String
  CreateMovie(movieId: ID, title: String, year: Int, released: _Neo4jDateTimeInput!, plot: String, poster: String, imdbRating: Float, avgStars: Float, years: [Int], titles: [String], imdbRatings: [Float], releases: [_Neo4jDateTimeInput]): Movie
  UpdateMovie(movieId: ID!, title: String, year: Int, released: _Neo4jDateTimeInput, plot: String, poster: String, imdbRating: Float, avgStars: Float, years: [Int], titles: [String], imdbRatings: [Float], releases: [_Neo4jDateTimeInput]): Movie
  DeleteMovie(movieId: ID!): Movie
  AddMovieGenres(from: _MovieInput!, to: _GenreInput!): _AddMovieGenresPayload
  RemoveMovieGenres(from: _MovieInput!, to: _GenreInput!): _RemoveMovieGenresPayload
  AddMovieActors(from: _ActorInput!, to: _MovieInput!): _AddMovieActorsPayload
  RemoveMovieActors(from: _ActorInput!, to: _MovieInput!): _RemoveMovieActorsPayload
  AddMovieFilmedIn(from: _MovieInput!, to: _StateInput!): _AddMovieFilmedInPayload
  RemoveMovieFilmedIn(from: _MovieInput!, to: _StateInput!): _RemoveMovieFilmedInPayload
  AddMovieRatings(from: _UserInput!, to: _MovieInput!, data: _RatedInput!): _AddMovieRatingsPayload
  RemoveMovieRatings(from: _UserInput!, to: _MovieInput!): _RemoveMovieRatingsPayload
  CreateGenre(name: String): Genre
  DeleteGenre(name: String!): Genre
  AddGenreMovies(from: _MovieInput!, to: _GenreInput!): _AddGenreMoviesPayload
  RemoveGenreMovies(from: _MovieInput!, to: _GenreInput!): _RemoveGenreMoviesPayload
  CreateActor(userId: ID, name: String): Actor
  UpdateActor(userId: ID!, name: String): Actor
  DeleteActor(userId: ID!): Actor
  AddActorMovies(from: _ActorInput!, to: _MovieInput!): _AddActorMoviesPayload
  RemoveActorMovies(from: _ActorInput!, to: _MovieInput!): _RemoveActorMoviesPayload
  CreateState(name: String!): State
  DeleteState(name: String!): State
  CreateUser(userId: ID, name: String): User
  UpdateUser(userId: ID!, name: String): User
  DeleteUser(userId: ID!): User
  AddUserRated(from: _UserInput!, to: _MovieInput!, data: _RatedInput!): _AddUserRatedPayload
  RemoveUserRated(from: _UserInput!, to: _MovieInput!): _RemoveUserRatedPayload
  AddUserFriends(from: _UserInput!, to: _UserInput!, data: _FriendOfInput!): _AddUserFriendsPayload
  RemoveUserFriends(from: _UserInput!, to: _UserInput!): _RemoveUserFriendsPayload
  AddUserFavorites(from: _UserInput!, to: _MovieInput!): _AddUserFavoritesPayload
  RemoveUserFavorites(from: _UserInput!, to: _MovieInput!): _RemoveUserFavoritesPayload
  CreateBook(genre: BookGenre): Book
  DeleteBook(genre: BookGenre!): Book
  CreatecurrentUserId(userId: String): currentUserId
  DeletecurrentUserId(userId: String!): currentUserId
  CreateTemporalNode(datetime: _Neo4jDateTimeInput, name: String, time: _Neo4jTimeInput, date: _Neo4jDateInput, localtime: _Neo4jLocalTimeInput, localdatetime: _Neo4jLocalDateTimeInput, localdatetimes: [_Neo4jLocalDateTimeInput]): TemporalNode
  UpdateTemporalNode(datetime: _Neo4jDateTimeInput!, name: String, time: _Neo4jTimeInput, date: _Neo4jDateInput, localtime: _Neo4jLocalTimeInput, localdatetime: _Neo4jLocalDateTimeInput, localdatetimes: [_Neo4jLocalDateTimeInput]): TemporalNode
  DeleteTemporalNode(datetime: _Neo4jDateTimeInput!): TemporalNode
  AddTemporalNodeTemporalNodes(from: _TemporalNodeInput!, to: _TemporalNodeInput!): _AddTemporalNodeTemporalNodesPayload
  RemoveTemporalNodeTemporalNodes(from: _TemporalNodeInput!, to: _TemporalNodeInput!): _RemoveTemporalNodeTemporalNodesPayload
}

interface Person {
  userId: ID!
  name: String
}

type Query {
  Movie(_id: String, movieId: ID, title: String, year: Int, released: _Neo4jDateTimeInput, plot: String, poster: String, imdbRating: Float, first: Int, offset: Int, orderBy: [_MovieOrdering], filter: _MovieFilter): [Movie]
  MoviesByYear(year: Int, first: Int, offset: Int, orderBy: [_MovieOrdering], filter: _MovieFilter): [Movie]
  MoviesByYears(year: [Int], first: Int, offset: Int, orderBy: [_MovieOrdering], filter: _MovieFilter): [Movie]
  MovieById(movieId: ID!, filter: _MovieFilter): Movie
  MovieBy_Id(_id: String!, filter: _MovieFilter): Movie
  GenresBySubstring(substring: String, first: Int, offset: Int, orderBy: [_GenreOrdering]): [Genre]
  State(first: Int, offset: Int, orderBy: [_StateOrdering], filter: _StateFilter): [State]
  User(userId: ID, name: String, _id: String, first: Int, offset: Int, orderBy: [_UserOrdering], filter: _UserFilter): [User]
  Books(first: Int, offset: Int, orderBy: [_BookOrdering], filter: _BookFilter): [Book]
  currentUserId: String
  computedBoolean: Boolean
  computedFloat: Float
  computedInt: Int
  computedIntList: [Int]
  computedStringList: [String]
  computedTemporal: _Neo4jDateTime
  computedObjectWithCypherParams: currentUserId
  customWithArguments(strArg: String, strInputArg: strInput): String
  Genre(_id: String, name: String, first: Int, offset: Int, orderBy: [_GenreOrdering], filter: _GenreFilter): [Genre]
  Actor(userId: ID, name: String, _id: String, first: Int, offset: Int, orderBy: [_ActorOrdering], filter: _ActorFilter): [Actor]
  Book(genre: BookGenre, _id: String, first: Int, offset: Int, orderBy: [_BookOrdering], filter: _BookFilter): [Book]
  TemporalNode(datetime: _Neo4jDateTimeInput, name: String, time: _Neo4jTimeInput, date: _Neo4jDateInput, localtime: _Neo4jLocalTimeInput, localdatetime: _Neo4jLocalDateTimeInput, localdatetimes: _Neo4jLocalDateTimeInput, computedTimestamp: String, _id: String, first: Int, offset: Int, orderBy: [_TemporalNodeOrdering], filter: _TemporalNodeFilter): [TemporalNode]
}

type Rated {
  from: User
  currentUserId(strArg: String): String
  rating: Int
  ratings: [Int]
  time: _Neo4jTime
  date: _Neo4jDate
  datetime: _Neo4jDateTime
  localtime: _Neo4jLocalTime
  localdatetime: _Neo4jLocalDateTime
  datetimes: [_Neo4jDateTime]
  to: Movie
}

enum Role {
  reader
  user
  admin
}

type State {
  customField: String
  name: String!
  _id: String
}

input strInput {
  strArg: String
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
  temporalNodes(time: _Neo4jTimeInput, date: _Neo4jDateInput, datetime: _Neo4jDateTimeInput, localtime: _Neo4jLocalTimeInput, localdatetime: _Neo4jLocalDateTimeInput, first: Int, offset: Int, orderBy: [_TemporalNodeOrdering], filter: _TemporalNodeFilter): [TemporalNode]
  _id: String
}

scalar Time

type User implements Person {
  userId: ID!
  name: String
  currentUserId(strArg: String = "Neo4j", strInputArg: strInput): String
  rated(rating: Int, time: _Neo4jTimeInput, date: _Neo4jDateInput, datetime: _Neo4jDateTimeInput, localtime: _Neo4jLocalTimeInput, localdatetime: _Neo4jLocalDateTimeInput, filter: _UserRatedFilter): [_UserRated]
  friends: _UserFriendsDirections
  favorites(first: Int, offset: Int, orderBy: [_MovieOrdering], filter: _MovieFilter): [Movie]
  _id: String
}
`;

  t.is(printSchema(schema), expectedSchema);
  t.end();
});
