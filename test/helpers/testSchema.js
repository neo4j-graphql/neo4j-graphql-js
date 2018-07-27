export const testSchema = `type Movie {
  _id: ID
  movieId: ID!
    title: String
  year: Int
  plot: String
  poster: String
  imdbRating: Float
  genres: [Genre] @relation(name: "IN_GENRE", direction: "OUT")
  similar(first: Int = 3, offset: Int = 0): [Movie] @cypher(statement: "WITH {this} AS this MATCH (this)--(:Genre)--(o:Movie) RETURN o")
  mostSimilar: Movie @cypher(statement: "WITH {this} AS this RETURN this")
  degree: Int @cypher(statement: "WITH {this} AS this RETURN SIZE((this)--())")
  actors(first: Int = 3, offset: Int = 0, name: String): [Actor] @relation(name: "ACTED_IN", direction:"IN")
  avgStars: Float
  filmedIn: State @relation(name: "FILMED_IN", direction:"OUT")
  scaleRating(scale: Int = 3): Float @cypher(statement: "WITH $this AS this RETURN $scale * this.imdbRating")
  scaleRatingFloat(scale: Float = 1.5): Float @cypher(statement: "WITH $this AS this RETURN $scale * this.imdbRating")
  actorMovies: [Movie] @cypher(statement: "MATCH (this)-[:ACTED_IN*2]-(other:Movie) RETURN other")
}

type Genre {
  _id: ID!
    name: String
  movies(first: Int = 3, offset: Int = 0): [Movie] @relation(name: "IN_GENRE", direction: "IN")
  highestRatedMovie: Movie @cypher(statement: "MATCH (m:Movie)-[:IN_GENRE]->(this) RETURN m ORDER BY m.imdbRating DESC LIMIT 1")
}

type State {
  name: String
}

interface Person {
  id: ID!
    name: String
}

type Actor implements Person {
  id: ID!
    name: String
  movies: [Movie] @relation(name: "ACTED_IN", direction:"OUT")
}

type User implements Person {
  id: ID!
    name: String
}

enum BookGenre {
  Mystery,
    Science,
    Math
}

type Book {
  genre: BookGenre
}

enum _MovieOrdering {
  title_desc,
  title_asc
}

enum _GenreOrdering {
  name_desc,
  name_asc
}

type Query {
  Movie(_id: Int, id: ID, title: String, year: Int, plot: String, poster: String, imdbRating: Float, first: Int, offset: Int, orderBy: _MovieOrdering): [Movie]
  MoviesByYear(year: Int): [Movie]
  MovieById(movieId: ID!): Movie
  MovieBy_Id(_id: Int!): Movie
  GenresBySubstring(substring: String): [Genre] @cypher(statement: "MATCH (g:Genre) WHERE toLower(g.name) CONTAINS toLower($substring) RETURN g")
  Books: [Book]
}`;
