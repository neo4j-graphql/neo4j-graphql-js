import gql from 'graphql-tag';

export const testAST = gql`
  type Thing {
    id: ID!
    name: String
  }
`;

export const testSchema = `type Movie {
  _id: String
  movieId: ID!
  title: String
  year: Int
  released: DateTime!
  plot: String
  poster: String
  imdbRating: Float
  genres: [Genre] @relation(name: "IN_GENRE", direction: "OUT")
  similar(first: Int = 3, offset: Int = 0): [Movie] @cypher(statement: "WITH {this} AS this MATCH (this)--(:Genre)--(o:Movie) RETURN o")
  mostSimilar: Movie @cypher(statement: "WITH {this} AS this RETURN this")
  degree: Int @cypher(statement: "WITH {this} AS this RETURN SIZE((this)--())")
  actors(first: Int = 3, offset: Int = 0, name: String, names: [String]): [Actor] @relation(name: "ACTED_IN", direction:"IN")
  avgStars: Float
  filmedIn: State @relation(name: "FILMED_IN", direction:"OUT")
  scaleRating(scale: Int = 3): Float @cypher(statement: "WITH $this AS this RETURN $scale * this.imdbRating")
  scaleRatingFloat(scale: Float = 1.5): Float @cypher(statement: "WITH $this AS this RETURN $scale * this.imdbRating")
  actorMovies: [Movie] @cypher(statement: "MATCH (this)-[:ACTED_IN*2]-(other:Movie) RETURN other")
  ratings(
    rating: Int
    time: Time
    date: Date
    datetime: DateTime
    localtime: LocalTime
    localdatetime: LocalDateTime
  ): [Rated]
  years: [Int]
  titles: [String]
  imdbRatings: [Float]
  releases: [DateTime]
  customField: String
}

type Genre {
  _id: String!
  name: String
  movies(first: Int = 3, offset: Int = 0): [Movie] @relation(name: "IN_GENRE", direction: "IN")
  highestRatedMovie: Movie @cypher(statement: "MATCH (m:Movie)-[:IN_GENRE]->(this) RETURN m ORDER BY m.imdbRating DESC LIMIT 1")
}

type State {
  customField: String @neo4j_ignore
  name: String!
}

interface Person {
  userId: ID!
  name: String
}

type Actor implements Person {
  userId: ID!
  name: String
  movies: [Movie] @relation(name: "ACTED_IN", direction:"OUT")
}

type User implements Person {
  userId: ID!
  name: String
  rated(
    rating: Int
    time: Time
    date: Date
    datetime: DateTime
    localtime: LocalTime
    localdatetime: LocalDateTime
  ): [Rated]
  friends(
    since: Int,
    time: Time,
    date: Date,
    datetime: DateTime,
    localtime: LocalTime,
    localdatetime: LocalDateTime
  ): [FriendOf]
}

type FriendOf {
  from: User
  since: Int
  time: Time
  date: Date
  datetime: DateTime
  datetimes: [DateTime]
  localtime: LocalTime
  localdatetime: LocalDateTime
  to: User
}

type Rated {
  from: User
  rating: Int
  ratings: [Int]
  time: Time
  date: Date
  datetime: DateTime
  localtime: LocalTime
  localdatetime: LocalDateTime
  datetimes: [DateTime]
  to: Movie
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
  Movie(_id: String, movieId: ID, title: String, year: Int, released: DateTime, plot: String, poster: String, imdbRating: Float, first: Int, offset: Int, orderBy: _MovieOrdering): [Movie]
  MoviesByYear(year: Int): [Movie]
  MoviesByYears(year: [Int]): [Movie]
  MovieById(movieId: ID!): Movie
  MovieBy_Id(_id: String!): Movie
  GenresBySubstring(substring: String): [Genre] @cypher(statement: "MATCH (g:Genre) WHERE toLower(g.name) CONTAINS toLower($substring) RETURN g")
  State: [State]
  Books: [Book]
}

type TemporalNode {
  datetime: DateTime
  name: String
  time: Time
  date: Date
  localtime: LocalTime
  localdatetime: LocalDateTime
  localdatetimes: [LocalDateTime]
  temporalNodes(
    time: Time,
    date: Date,
    datetime: DateTime,
    localtime: LocalTime,
    localdatetime: LocalDateTime
  ): [TemporalNode] @relation(name: "TEMPORAL", direction: OUT)
}

type ignoredType {
  ignoredField: String @neo4j_ignore
}

scalar Time
scalar Date
scalar DateTime
scalar LocalTime
scalar LocalDateTime
`;
