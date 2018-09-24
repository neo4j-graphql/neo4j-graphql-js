import test from 'ava';
import { augmentedSchema } from './helpers/cypherTestHelpers';
import { printSchema } from 'graphql';

test.cb('Test augmented schema', t => {
  let schema = augmentedSchema();

  let expectedSchema = `input _ActorInput {
  id: ID!
}

enum _ActorOrdering {
  id_asc
  id_desc
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
  User(first: Int, offset: Int, orderBy: _UserOrdering): User
}

input _RatedInput {
  rating: Int
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

input _UserInput {
  id: ID!
}

enum _UserOrdering {
  id_asc
  id_desc
  name_asc
  name_desc
  _id_asc
  _id_desc
}

type _UserRated {
  rating: Int
  Movie(first: Int, offset: Int, orderBy: _MovieOrdering): Movie
}

type Actor implements Person {
  id: ID!
  name: String
  movies(first: Int, offset: Int, orderBy: _MovieOrdering): [Movie]
  _id: Int
}

type Book {
  genre: BookGenre
  _id: Int
}

enum BookGenre {
  Mystery
  Science
  Math
}

scalar DateTime

type Genre {
  _id: Int
  name: String
  movies(first: Int = 3, offset: Int = 0, orderBy: _MovieOrdering): [Movie]
  highestRatedMovie: Movie
}

type Movie {
  _id: ID
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
  CreateActor(id: ID, name: String): Actor
  UpdateActor(id: ID!, name: String): Actor
  DeleteActor(id: ID!): Actor
  AddActorMovies(from: _ActorInput!, to: _MovieInput!): _AddActorMoviesPayload
  RemoveActorMovies(from: _ActorInput!, to: _MovieInput!): _RemoveActorMoviesPayload
  CreateState(name: String): State
  DeleteState(name: String!): State
  CreateUser(id: ID, name: String): User
  UpdateUser(id: ID!, name: String): User
  DeleteUser(id: ID!): User
  AddUserRated(from: _UserInput!, to: _MovieInput!, data: _RatedInput!): _AddUserRatedPayload
  RemoveUserRated(from: _UserInput!, to: _MovieInput!): _RemoveUserRatedPayload
  CreateBook(genre: BookGenre): Book
  DeleteBook(genre: BookGenre!): Book
}

interface Person {
  id: ID!
  name: String
}

type Query {
  Movie(_id: Int, movieId: ID, title: String, year: Int, plot: String, poster: String, imdbRating: Float, first: Int, offset: Int, orderBy: _MovieOrdering): [Movie]
  MoviesByYear(year: Int, first: Int, offset: Int, orderBy: _MovieOrdering): [Movie]
  MovieById(movieId: ID!): Movie
  MovieBy_Id(_id: Int!): Movie
  GenresBySubstring(substring: String, first: Int, offset: Int, orderBy: _GenreOrdering): [Genre]
  Books(first: Int, offset: Int, orderBy: _BookOrdering): [Book]
  Genre(_id: Int, name: String, first: Int, offset: Int, orderBy: _GenreOrdering): [Genre]
  Actor(id: ID, name: String, _id: Int, first: Int, offset: Int, orderBy: _ActorOrdering): [Actor]
  State(name: String, _id: Int, first: Int, offset: Int, orderBy: _StateOrdering): [State]
  User(id: ID, name: String, _id: Int, first: Int, offset: Int, orderBy: _UserOrdering): [User]
  Book(genre: BookGenre, _id: Int, first: Int, offset: Int, orderBy: _BookOrdering): [Book]
}

type Rated {
  from(first: Int, offset: Int, orderBy: _UserOrdering): User
  rating: Int
  to(first: Int, offset: Int, orderBy: _MovieOrdering): Movie
}

type State {
  name: String
  _id: Int
}

type User implements Person {
  id: ID!
  name: String
  rated: [_UserRated]
  _id: Int
}
`;

  t.is(printSchema(schema), expectedSchema);
  t.end();
});
