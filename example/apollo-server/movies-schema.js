import { neo4jgraphql } from '../../src/index';

export const typeDefs = `
type Movie {
  movieId: ID!
  title: String
  year: Int
  dateTime: DateTime
  localDateTime: LocalDateTime
  date: Date
  plot: String
  poster: String
  imdbRating: Float
  ratings: [Rated]
  genres: [Genre] @relation(name: "IN_GENRE", direction: "OUT")
  similar(first: Int = 3, offset: Int = 0, limit: Int = 5): [Movie] @cypher(statement: "WITH {this} AS this MATCH (this)--(:Genre)--(o:Movie) RETURN o LIMIT {limit}")
  mostSimilar: Movie @cypher(statement: "WITH {this} AS this RETURN this")
  degree: Int @cypher(statement: "WITH {this} AS this RETURN SIZE((this)--())")
  actors(first: Int = 3, offset: Int = 0): [Actor] @relation(name: "ACTED_IN", direction:"IN")
  avgStars: Float
  filmedIn: State @relation(name: "FILMED_IN", direction: "OUT")
  scaleRating(scale: Int = 3): Float @cypher(statement: "WITH $this AS this RETURN $scale * this.imdbRating")
  scaleRatingFloat(scale: Float = 1.5): Float @cypher(statement: "WITH $this AS this RETURN $scale * this.imdbRating")
}

type Genre {
  name: String
  movies(first: Int = 3, offset: Int = 0): [Movie] @relation(name: "IN_GENRE", direction: "IN")
  highestRatedMovie: Movie @cypher(statement: "MATCH (m:Movie)-[:IN_GENRE]->(this) RETURN m ORDER BY m.imdbRating DESC LIMIT 1")
}

type State {
  name: String
}

interface Person {
	userId: ID!
  name: String
}

type Actor {
  id: ID!
  name: String
  movies: [Movie] @relation(name: "ACTED_IN", direction: "OUT")
}

type User implements Person {
  userId: ID!
  name: String
  rated: [Rated]
}

type Rated @relation(name:"RATED") {
  from: User
  to: Movie
  timestamp: Int
  rating: Float
}
enum BookGenre {
  Mystery,
  Science,
  Math
}

type OnlyDate {
  date: Date
}

type Book {
  genre: BookGenre
}

type Query {
  Movie(movieId: ID, title: String, year: Int, plot: String, poster: String, imdbRating: Float, first: Int, offset: Int, orderBy: _MovieOrdering): [Movie]  MoviesByYear(year: Int, first: Int = 10, offset: Int = 0): [Movie]
  AllMovies: [Movie]
  MovieById(movieId: ID!): Movie
  GenresBySubstring(substring: String): [Genre] @cypher(statement: "MATCH (g:Genre) WHERE toLower(g.name) CONTAINS toLower($substring) RETURN g")
  Books: [Book]
}`;

export const resolvers = {
  // root entry point to GraphQL service
  Query: {
    Movie(object, params, ctx, resolveInfo) {
      return neo4jgraphql(object, params, ctx, resolveInfo, true);
    },
    MoviesByYear(object, params, ctx, resolveInfo) {
      return neo4jgraphql(object, params, ctx, resolveInfo, true);
    },
    AllMovies(object, params, ctx, resolveInfo) {
      return neo4jgraphql(object, params, ctx, resolveInfo, true);
    },
    MovieById(object, params, ctx, resolveInfo) {
      return neo4jgraphql(object, params, ctx, resolveInfo, true);
    },
    GenresBySubstring(object, params, ctx, resolveInfo) {
      return neo4jgraphql(object, params, ctx, resolveInfo, true);
    },
    Books(object, params, ctx, resolveInfo) {
      return neo4jgraphql(object, params, ctx, resolveInfo, true);
    }
  }
};

// Mutation: {
//   CreateGenre(object, params, ctx, resolveInfo) {
//     return neo4jgraphql(object, params, ctx, resolveInfo, true);
//   },
//   CreateMovie(object, params, ctx, resolveInfo) {
//     return neo4jgraphql(object, params, ctx, resolveInfo, true);
//   },
//   AddMovieGenre(object, params, ctx, resolveInfo) {
//     return neo4jgraphql(object, params, ctx, resolveInfo, true);
//   }
// }
