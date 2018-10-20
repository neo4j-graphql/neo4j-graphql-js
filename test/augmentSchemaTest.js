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
}

type _AddUserFriendsPayload {
  from: User
  to: User
  since: Int
}

type _AddUserRatedPayload {
  from: User
  to: Movie
  rating: Int
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
  User: User
}

input _RatedInput {
  rating: Int
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

type _UserFriends {
  since: Int
  User: User
}

type _UserFriendsDirections {
  from(since: Int): [_UserFriends]
  to(since: Int): [_UserFriends]
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

scalar DateTime

type FriendOf {
  from: User
  since: Int
  to: User
}

type Genre {
  _id: String
  name: String
  movies(first: Int = 3, offset: Int = 0, orderBy: _MovieOrdering): [Movie]
  highestRatedMovie: Movie
}

type Movie {
  _id: String
  movieId: ID!
  title: String
  year: Int
  released: DateTime
  plot: String
  poster: String
  imdbRating: Float
  genres(first: Int, offset: Int, orderBy: _GenreOrdering): [Genre]
  similar(first: Int = 3, offset: Int = 0, orderBy: _MovieOrdering): [Movie]
  mostSimilar: Movie
  degree: Int
  actors(first: Int = 3, offset: Int = 0, name: String, orderBy: _ActorOrdering): [Actor]
  avgStars: Float
  filmedIn: State
  scaleRating(scale: Int = 3): Float
  scaleRatingFloat(scale: Float = 1.5): Float
  actorMovies(first: Int, offset: Int, orderBy: _MovieOrdering): [Movie]
  ratings: [_MovieRatings]
}

type Mutation {
  CreateMovie(movieId: ID, title: String, year: Int, released: DateTime, plot: String, poster: String, imdbRating: Float, avgStars: Float): Movie
  UpdateMovie(movieId: ID!, title: String, year: Int, released: DateTime, plot: String, poster: String, imdbRating: Float, avgStars: Float): Movie
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
}

interface Person {
  userId: ID!
  name: String
}

type Query {
  Movie(_id: String, movieId: ID, title: String, year: Int, plot: String, poster: String, imdbRating: Float, first: Int, offset: Int, orderBy: _MovieOrdering): [Movie]
  MoviesByYear(year: Int, first: Int, offset: Int, orderBy: _MovieOrdering): [Movie]
  MovieById(movieId: ID!): Movie
  MovieBy_Id(_id: String!): Movie
  GenresBySubstring(substring: String, first: Int, offset: Int, orderBy: _GenreOrdering): [Genre]
  Books(first: Int, offset: Int, orderBy: _BookOrdering): [Book]
  Genre(_id: String, name: String, first: Int, offset: Int, orderBy: _GenreOrdering): [Genre]
  Actor(userId: ID, name: String, _id: String, first: Int, offset: Int, orderBy: _ActorOrdering): [Actor]
  State(name: String, _id: String, first: Int, offset: Int, orderBy: _StateOrdering): [State]
  User(userId: ID, name: String, _id: String, first: Int, offset: Int, orderBy: _UserOrdering): [User]
  Book(genre: BookGenre, _id: String, first: Int, offset: Int, orderBy: _BookOrdering): [Book]
}

type Rated {
  from: User
  rating: Int
  to: Movie
}

type State {
  name: String
  _id: String
}

type User implements Person {
  userId: ID!
  name: String
  rated(rating: Int): [_UserRated]
  friends: _UserFriendsDirections
  _id: String
}
`;

  t.is(printSchema(schema), expectedSchema);
  t.end();
});
