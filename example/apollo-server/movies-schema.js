import { gql } from 'apollo-server';
import { neo4jgraphql } from '../../src/index';

export const typeDefs = gql`
  type Movie {
    movieId: ID!
    title: String
    someprefix_title_with_underscores: String
    year: Int
    dateTime: DateTime
    localDateTime: LocalDateTime
    date: Date
    plot: String
    poster: String
    imdbRating: Float
    ratings: [Rated]
    genres: [Genre] @relation(name: "IN_GENRE", direction: "OUT")
    similar(first: Int = 3, offset: Int = 0, limit: Int = 5): [Movie]
      @cypher(
        statement: "MATCH (this)--(:Genre)--(o:Movie) RETURN o LIMIT $limit"
      )
    mostSimilar: Movie @cypher(statement: "RETURN this")
    degree: Int @cypher(statement: "RETURN SIZE((this)--())")
    actors(first: Int = 3, offset: Int = 0): [Actor]
      @relation(name: "ACTED_IN", direction: "IN")
    avgStars: Float
    filmedIn: State @relation(name: "FILMED_IN", direction: "OUT")
    location: Point
    locations: [Point]
    scaleRating(scale: Int = 3): Float
      @cypher(statement: "RETURN $scale * this.imdbRating")
    scaleRatingFloat(scale: Float = 1.5): Float
      @cypher(statement: "RETURN $scale * this.imdbRating")
    _id: ID
  }

  type Genre {
    name: String
    movies(first: Int = 3, offset: Int = 0): [Movie]
      @relation(name: "IN_GENRE", direction: "IN")
    highestRatedMovie: Movie
      @cypher(
        statement: "MATCH (m:Movie)-[:IN_GENRE]->(this) RETURN m ORDER BY m.imdbRating DESC LIMIT 1"
      )
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
    knows: [Person] @relation(name: "KNOWS", direction: "OUT")
  }

  type User implements Person {
    userId: ID!
    name: String
    rated: [Rated]
  }

  type Rated @relation(name: "RATED") {
    from: User
    to: Movie
    timestamp: Int
    date: Date
    rating: Float
  }
  enum BookGenre {
    Mystery
    Science
    Math
  }

  type OnlyDate {
    date: Date
  }

  type SpatialNode {
    id: ID!
    point: Point
    spatialNodes(point: Point): [SpatialNode]
      @relation(name: "SPATIAL", direction: OUT)
  }

  type Book {
    genre: BookGenre
  }

  interface Camera {
    id: ID!
    type: String
    make: String
    weight: Int
    operators: [Person] @relation(name: "cameras", direction: IN)
    computedOperators(name: String): [Person]
      @cypher(statement: "MATCH (this)<-[:cameras]-(p:Person) RETURN p")
  }

  type OldCamera implements Camera {
    id: ID!
    type: String
    make: String
    weight: Int
    smell: String
    operators: [Person] @relation(name: "cameras", direction: IN)
    computedOperators(name: String): [Person]
      @cypher(statement: "MATCH (this)<-[:cameras]-(p:Person) RETURN p")
  }

  type NewCamera implements Camera {
    id: ID!
    type: String
    make: String
    weight: Int
    features: [String]
    operators: [Person] @relation(name: "cameras", direction: IN)
    computedOperators(name: String): [Person]
      @cypher(statement: "MATCH (this)<-[:cameras]-(p:Person) RETURN p")
  }

  type CameraMan implements Person {
    userId: ID!
    name: String
    favoriteCamera: Camera @relation(name: "favoriteCamera", direction: "OUT")
    heaviestCamera: [Camera]
      @cypher(
        statement: "MATCH (c: Camera)--(this) RETURN c ORDER BY c.weight DESC LIMIT 1"
      )
    cameras: [Camera!]! @relation(name: "cameras", direction: "OUT")
    cameraBuddy: Person @relation(name: "cameraBuddy", direction: "OUT")
  }

  union MovieSearch = Movie | Genre | Book | User | OldCamera

  type Query {
    Movie(
      movieId: ID
      title: String
      year: Int
      plot: String
      poster: String
      imdbRating: Float
    ): [Movie]
    MoviesByYear(year: Int, first: Int = 10, offset: Int = 0): [Movie]
    AllMovies: [Movie]
    MovieById(movieId: ID!): Movie
    GenresBySubstring(substring: String): [Genre]
      @cypher(
        statement: "MATCH (g:Genre) WHERE toLower(g.name) CONTAINS toLower($substring) RETURN g"
      )
    Books: [Book]
    CustomCameras: [Camera] @cypher(statement: "MATCH (c:Camera) RETURN c")
    CustomCamera: Camera @cypher(statement: "MATCH (c:Camera) RETURN c")
  }

  type Mutation {
    CustomCamera: Camera
      @cypher(
        statement: "CREATE (newCamera:Camera:NewCamera {id: apoc.create.uuid(), type: 'macro'}) RETURN newCamera"
      )
    CustomCameras: [Camera]
      @cypher(
        statement: "CREATE (newCamera:Camera:NewCamera {id: apoc.create.uuid(), type: 'macro', features: ['selfie', 'zoom']}) CREATE (oldCamera:Camera:OldCamera {id: apoc.create.uuid(), type: 'floating', smell: 'rusty' }) RETURN [newCamera, oldCamera]"
      )
  }
`;

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
