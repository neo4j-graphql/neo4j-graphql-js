import test from 'ava';
import { augmentedSchema } from './helpers/cypherTestHelpers';
import { printSchema } from 'graphql';

test.cb('Test augmented schema', t => {
  let schema = augmentedSchema();

  let expectedSchema = `directive @cypher(statement: String) on FIELD_DEFINITION

directive @relation(name: String, direction: _RelationDirections, from: String, to: String) on FIELD_DEFINITION | OBJECT

directive @MutationMeta(relationship: String, from: String, to: String) on FIELD_DEFINITION

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

type _AddUserFriendsPayload {
  from: User
  to: User
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
  rating: Int
  ratings: [Int]
  time: _Neo4jTime
  date: _Neo4jDate
  datetime: _Neo4jDateTime
  localtime: _Neo4jLocalTime
  localdatetime: _Neo4jLocalDateTime
  datetimes: [_Neo4jDateTime]
}

input _BookInput {
  genre: BookGenre!
}

enum _BookOrdering {
  _id_asc
  _id_desc
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

input _GenreInput {
  name: String!
}

enum _GenreOrdering {
  name_desc
  name_asc
}

input _MovieInput {
  movieId: ID!
}

enum _MovieOrdering {
  title_desc
  title_asc
}

type _MovieRatings {
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

type _RemoveUserFriendsPayload {
  from: User
  to: User
}

type _RemoveUserRatedPayload {
  from: User
  to: Movie
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

input _TemporalNodeInput {
  datetime: _Neo4jDateTimeInput!
}

enum _TemporalNodeOrdering {
  name_asc
  name_desc
  _id_asc
  _id_desc
}

type _UserFriends {
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
  from(since: Int, time: _Neo4jTimeInput, date: _Neo4jDateInput, datetime: _Neo4jDateTimeInput, localtime: _Neo4jLocalTimeInput, localdatetime: _Neo4jLocalDateTimeInput): [_UserFriends]
  to(since: Int, time: _Neo4jTimeInput, date: _Neo4jDateInput, datetime: _Neo4jDateTimeInput, localtime: _Neo4jLocalTimeInput, localdatetime: _Neo4jLocalDateTimeInput): [_UserFriends]
}

input _UserInput {
  userId: ID!
}

enum _UserOrdering {
  userId_asc
  userId_desc
  name_asc
  name_desc
  _id_asc
  _id_desc
}

type _UserRated {
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

type Actor implements Person {
  userId: ID!
  name: String
  movies(first: Int, offset: Int, orderBy: _MovieOrdering): [Movie]
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

scalar Date

scalar DateTime

type FriendOf {
  from: User
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
  movies(first: Int = 3, offset: Int = 0, orderBy: _MovieOrdering): [Movie]
  highestRatedMovie: Movie
}

scalar LocalDateTime

scalar LocalTime

type Movie {
  _id: String
  movieId: ID!
  title: String
  year: Int
  released: _Neo4jDateTime
  plot: String
  poster: String
  imdbRating: Float
  genres(first: Int, offset: Int, orderBy: _GenreOrdering): [Genre]
  similar(first: Int = 3, offset: Int = 0, orderBy: _MovieOrdering): [Movie]
  mostSimilar: Movie
  degree: Int
  actors(first: Int = 3, offset: Int = 0, name: String, names: [String], orderBy: _ActorOrdering): [Actor]
  avgStars: Float
  filmedIn: State
  scaleRating(scale: Int = 3): Float
  scaleRatingFloat(scale: Float = 1.5): Float
  actorMovies(first: Int, offset: Int, orderBy: _MovieOrdering): [Movie]
  ratings(rating: Int, time: _Neo4jTimeInput, date: _Neo4jDateInput, datetime: _Neo4jDateTimeInput, localtime: _Neo4jLocalTimeInput, localdatetime: _Neo4jLocalDateTimeInput): [_MovieRatings]
  years: [Int]
  titles: [String]
  imdbRatings: [Float]
  releases: [_Neo4jDateTime]
}

type Mutation {
  CreateMovie(movieId: ID, title: String, year: Int, released: _Neo4jDateTimeInput, plot: String, poster: String, imdbRating: Float, avgStars: Float, years: [Int], titles: [String], imdbRatings: [Float], releases: [_Neo4jDateTimeInput]): Movie
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
  CreateState(name: String): State
  DeleteState(name: String!): State
  CreateUser(userId: ID, name: String): User
  UpdateUser(userId: ID!, name: String): User
  DeleteUser(userId: ID!): User
  AddUserRated(from: _UserInput!, to: _MovieInput!, data: _RatedInput!): _AddUserRatedPayload
  RemoveUserRated(from: _UserInput!, to: _MovieInput!): _RemoveUserRatedPayload
  AddUserFriends(from: _UserInput!, to: _UserInput!, data: _FriendOfInput!): _AddUserFriendsPayload
  RemoveUserFriends(from: _UserInput!, to: _UserInput!): _RemoveUserFriendsPayload
  CreateBook(genre: BookGenre): Book
  DeleteBook(genre: BookGenre!): Book
  CreateTemporalNode(datetime: _Neo4jDateTimeInput, name: String, time: _Neo4jTimeInput, date: _Neo4jDateInput, localtime: _Neo4jLocalTimeInput, localdatetime: _Neo4jLocalDateTimeInput, localdatetimes: [_Neo4jLocalDateTimeInput]): TemporalNode
  UpdateTemporalNode(datetime: _Neo4jDateTimeInput, name: String, time: _Neo4jTimeInput, date: _Neo4jDateInput, localtime: _Neo4jLocalTimeInput, localdatetime: _Neo4jLocalDateTimeInput, localdatetimes: [_Neo4jLocalDateTimeInput]): TemporalNode
  DeleteTemporalNode(datetime: _Neo4jDateTimeInput!): TemporalNode
  AddTemporalNodeTemporalNodes(from: _TemporalNodeInput!, to: _TemporalNodeInput!): _AddTemporalNodeTemporalNodesPayload
  RemoveTemporalNodeTemporalNodes(from: _TemporalNodeInput!, to: _TemporalNodeInput!): _RemoveTemporalNodeTemporalNodesPayload
}

interface Person {
  userId: ID!
  name: String
}

type Query {
  Movie(_id: String, movieId: ID, title: String, year: Int, released: _Neo4jDateTimeInput, plot: String, poster: String, imdbRating: Float, first: Int, offset: Int, orderBy: _MovieOrdering): [Movie]
  MoviesByYear(year: Int, first: Int, offset: Int, orderBy: _MovieOrdering): [Movie]
  MoviesByYears(year: [Int], first: Int, offset: Int, orderBy: _MovieOrdering): [Movie]
  MovieById(movieId: ID!): Movie
  MovieBy_Id(_id: String!): Movie
  GenresBySubstring(substring: String, first: Int, offset: Int, orderBy: _GenreOrdering): [Genre]
  Books(first: Int, offset: Int, orderBy: _BookOrdering): [Book]
  Genre(_id: String, name: String, first: Int, offset: Int, orderBy: _GenreOrdering): [Genre]
  Actor(userId: ID, name: String, _id: String, first: Int, offset: Int, orderBy: _ActorOrdering): [Actor]
  State(name: String, _id: String, first: Int, offset: Int, orderBy: _StateOrdering): [State]
  User(userId: ID, name: String, _id: String, first: Int, offset: Int, orderBy: _UserOrdering): [User]
  Book(genre: BookGenre, _id: String, first: Int, offset: Int, orderBy: _BookOrdering): [Book]
  TemporalNode(datetime: _Neo4jDateTimeInput, name: String, time: _Neo4jTimeInput, date: _Neo4jDateInput, localtime: _Neo4jLocalTimeInput, localdatetime: _Neo4jLocalDateTimeInput, localdatetimes: _Neo4jLocalDateTimeInput, _id: String, first: Int, offset: Int, orderBy: _TemporalNodeOrdering): [TemporalNode]
}

type Rated {
  from: User
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

type State {
  name: String
  _id: String
}

type TemporalNode {
  datetime: _Neo4jDateTime
  name: String
  time: _Neo4jTime
  date: _Neo4jDate
  localtime: _Neo4jLocalTime
  localdatetime: _Neo4jLocalDateTime
  localdatetimes: [_Neo4jLocalDateTime]
  temporalNodes(time: _Neo4jTimeInput, date: _Neo4jDateInput, datetime: _Neo4jDateTimeInput, localtime: _Neo4jLocalTimeInput, localdatetime: _Neo4jLocalDateTimeInput, first: Int, offset: Int, orderBy: _TemporalNodeOrdering): [TemporalNode]
  _id: String
}

scalar Time

type User implements Person {
  userId: ID!
  name: String
  rated(rating: Int, time: _Neo4jTimeInput, date: _Neo4jDateInput, datetime: _Neo4jDateTimeInput, localtime: _Neo4jLocalTimeInput, localdatetime: _Neo4jLocalDateTimeInput): [_UserRated]
  friends: _UserFriendsDirections
  _id: String
}
`;

  t.is(printSchema(schema), expectedSchema);
  t.end();
});
