import test from 'ava';
import { augmentedSchema } from './helpers/cypherTestHelpers';
import { printSchema } from 'graphql';

test.cb('Test augmented schema', t => {
  let schema = augmentedSchema();

  let expectedSchema = `type Actor implements Person {
  id: ID!
  name: String
  movies: [Movie]
  _id: ID
}

type Book {
  genre: BookGenre
  _id: ID
}

enum BookGenre {
  Mystery
  Science
  Math
}

type Genre {
  _id: ID
  name: String
  movies(first: Int = 3, offset: Int = 0): [Movie]
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
  genres: [Genre]
  similar(first: Int = 3, offset: Int = 0): [Movie]
  mostSimilar: Movie
  degree: Int
  actors(first: Int = 3, offset: Int = 0, name: String): [Actor]
  avgStars: Float
  filmedIn: State
  scaleRating(scale: Int = 3): Float
  scaleRatingFloat(scale: Float = 1.5): Float
  actorMovies: [Movie]
}

type Mutation {
  CreateMovie(movieId: ID, title: String, year: Int, plot: String, poster: String, imdbRating: Float, degree: Int, avgStars: Float, scaleRating: Float, scaleRatingFloat: Float): Movie
  AddMovieGenre(moviemovieId: ID!, genrename: String!): Movie
  AddMovieState(moviemovieId: ID!, statename: String!): Movie
  CreateGenre(name: String): Genre
  CreateActor(id: ID, name: String): Actor
  AddActorMovie(actorid: ID!, moviemovieId: ID!): Actor
  CreateState(name: String): State
  CreateBook(genre: BookGenre): Book
  CreateUser(id: ID, name: String): User
}

interface Person {
  id: ID!
  name: String
}

type Query {
  Movie(_id: Int, id: ID, title: String, year: Int, plot: String, poster: String, imdbRating: Float, first: Int, offset: Int): [Movie]
  MoviesByYear(year: Int): [Movie]
  MovieById(movieId: ID!): Movie
  MovieBy_Id(_id: Int!): Movie
  GenresBySubstring(substring: String): [Genre]
  Books: [Book]
}

type State {
  name: String
  _id: ID
}

type User implements Person {
  id: ID!
  name: String
  _id: ID
}
`;

  t.is(printSchema(schema), expectedSchema);
  t.end();
});
