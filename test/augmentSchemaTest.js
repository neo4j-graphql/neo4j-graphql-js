import test from 'ava';
import { augmentedSchema } from './helpers/cypherTestHelpers';
import { printSchema } from 'graphql';

test.cb('Test augmented schema', t => {
  let schema = augmentedSchema();

  let expectedSchema = `enum _ActorOrdering {
  id_asc
  id_desc
  name_asc
  name_desc
  _id_asc
  _id_desc
}

enum _BookOrdering {
  _id_asc
  _id_desc
}

enum _GenreOrdering {
  name_desc
  name_asc
}

enum _MovieOrdering {
  title_desc
  title_asc
}

enum _StateOrdering {
  name_asc
  name_desc
  _id_asc
  _id_desc
}

enum _UserOrdering {
  id_asc
  id_desc
  name_asc
  name_desc
  _id_asc
  _id_desc
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
}

type Mutation {
  CreateMovie(movieId: ID, title: String, year: Int, plot: String, poster: String, imdbRating: Float, avgStars: Float): Movie
  UpdateMovie(movieId: ID!, title: String, year: Int, plot: String, poster: String, imdbRating: Float, avgStars: Float): Movie
  DeleteMovie(movieId: ID!): Movie
  AddMovieGenres(moviemovieId: ID!, genrename: String!): Movie
  RemoveMovieGenres(moviemovieId: ID!, genrename: String!): Movie
  AddMovieFilmedIn(moviemovieId: ID!, statename: String!): Movie
  RemoveMovieFilmedIn(moviemovieId: ID!, statename: String!): Movie
  CreateGenre(name: String): Genre
  DeleteGenre(name: String!): Genre
  CreateActor(id: ID, name: String): Actor
  UpdateActor(id: ID!, name: String): Actor
  DeleteActor(id: ID!): Actor
  AddActorMovies(actorid: ID!, moviemovieId: ID!): Actor
  RemoveActorMovies(actorid: ID!, moviemovieId: ID!): Actor
  CreateState(name: String): State
  DeleteState(name: String!): State
  CreateBook(genre: BookGenre): Book
  DeleteBook(genre: BookGenre!): Book
  CreateUser(id: ID, name: String): User
  UpdateUser(id: ID!, name: String): User
  DeleteUser(id: ID!): User
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
  Book(genre: BookGenre, _id: Int, first: Int, offset: Int, orderBy: _BookOrdering): [Book]
  User(id: ID, name: String, _id: Int, first: Int, offset: Int, orderBy: _UserOrdering): [User]
}

type State {
  name: String
  _id: Int
}

type User implements Person {
  id: ID!
  name: String
  _id: Int
}
`;

  t.is(printSchema(schema), expectedSchema);
  t.end();
});
