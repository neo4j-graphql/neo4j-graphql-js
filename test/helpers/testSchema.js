export const testSchema = /* GraphQL */ `
  type Movie
    @additionalLabels(
      labels: ["u_<%= $cypherParams.userId %>", "newMovieLabel"]
    ) {
    _id: String
    movieId: ID!
    title: String @isAuthenticated
    someprefix_title_with_underscores: String
    year: Int
    released: DateTime!
    plot: String
    poster: String
    imdbRating: Float
    genres: [Genre] @relation(name: "IN_GENRE", direction: "OUT")
    nextInFranchise: Sequel @relation(direction: "OUT")
    viewedBy: [Viewing]
    similar(first: Int = 3, offset: Int = 0): [Movie]
      @cypher(
        statement: "WITH {this} AS this MATCH (this)--(:Genre)--(o:Movie) RETURN o"
      )
    mostSimilar: Movie @cypher(statement: "WITH {this} AS this RETURN this")
    degree: Int
      @cypher(statement: "WITH {this} AS this RETURN SIZE((this)--())")
    actors(
      first: Int = 3
      offset: Int = 0
      name: String
      names: [String]
    ): [Actor] @relation(name: "ACTED_IN", direction: "IN")
    avgStars: Float
    filmedIn: State @relation(name: "FILMED_IN", direction: "OUT")
    location: Point
    locations: [Point]
    scaleRating(scale: Int = 3): Float
      @cypher(statement: "WITH $this AS this RETURN $scale * this.imdbRating")
    scaleRatingFloat(scale: Float = 1.5): Float
      @cypher(statement: "WITH $this AS this RETURN $scale * this.imdbRating")
    actorMovies: [Movie]
      @cypher(
        statement: "MATCH (this)-[:ACTED_IN*2]-(other:Movie) RETURN other"
      )
    ratings(
      rating: Int
      time: Time
      date: Date
      datetime: DateTime
      localtime: LocalTime
      localdatetime: LocalDateTime
      location: Point
    ): [Rated]
    years: [Int]
    titles: [String]
    imdbRatings: [Float]
    releases: [DateTime]
    customField: String @neo4j_ignore
    currentUserId(strArg: String): String
      @cypher(
        statement: "RETURN $cypherParams.currentUserId AS cypherParamsUserId"
      )
    interfaceNoScalars(
      orderBy: _InterfaceNoScalarsOrdering
    ): [InterfaceNoScalars]
      @relation(name: "INTERFACE_NO_SCALARS", direction: OUT)
  }

  type Genre {
    _id: String!
    name: String
    movies(first: Int = 3, offset: Int = 0): [Movie]
      @relation(name: "IN_GENRE", direction: "IN")
    highestRatedMovie: Movie
      @cypher(
        statement: "MATCH (m:Movie)-[:IN_GENRE]->(this) RETURN m ORDER BY m.imdbRating DESC LIMIT 1"
      )
  }

  type Sequel @relation(name: "IS_SEQUEL_TO") {
    yearsBetween: Int
    from: Movie
    to: Movie
  }

  type Viewing @relation(name: "VIEWED_BY") {
    dateViewed: Date
    from: Movie
    to: User
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
    movies: [Movie] @relation(name: "ACTED_IN", direction: "OUT")
    knows: [Person] @relation(name: "KNOWS", direction: "OUT")
  }

  type User implements Person {
    userId: ID!
    name: String
    currentUserId(strArg: String = "Neo4j", strInputArg: strInput): String
      @cypher(
        statement: "RETURN $cypherParams.currentUserId AS cypherParamsUserId"
      )
    rated(
      rating: Int
      time: Time
      date: Date
      datetime: DateTime
      localtime: LocalTime
      localdatetime: LocalDateTime
      location: Point
    ): [Rated]
    friends(
      since: Int
      time: Time
      date: Date
      datetime: DateTime
      localtime: LocalTime
      localdatetime: LocalDateTime
      location: Point
    ): [FriendOf]
    favorites: [Movie] @relation(name: "FAVORITED", direction: "OUT")
  }

  type FriendOf @relation {
    from: User
    currentUserId: String
      @cypher(
        statement: "RETURN $cypherParams.currentUserId AS cypherParamsUserId"
      )
    since: Int
    time: Time
    date: Date
    datetime: DateTime
    datetimes: [DateTime]
    localtime: LocalTime
    localdatetime: LocalDateTime
    location: Point
    to: User
  }

  type Rated @relation {
    from: User
    currentUserId(strArg: String): String
      @cypher(
        statement: "RETURN $cypherParams.currentUserId AS cypherParamsUserId"
      )
    rating: Int
    ratings: [Int]
    time: Time
    date: Date
    datetime: DateTime
    localtime: LocalTime
    localdatetime: LocalDateTime
    datetimes: [DateTime]
    location: Point
    to: Movie
  }

  enum BookGenre {
    Mystery
    Science
    Math
  }

  type Book {
    genre: BookGenre
  }

  enum _GenreOrdering {
    name_desc
    name_asc
  }

  type QueryA {
    Movie(
      _id: String
      movieId: ID
      title: String
      year: Int
      released: DateTime
      plot: String
      poster: String
      imdbRating: Float
      location: Point
      first: Int
      offset: Int
    ): [Movie]
    MoviesByYear(year: Int): [Movie]
    MoviesByYears(year: [Int]): [Movie]
    MovieById(movieId: ID!): Movie
    MovieBy_Id(_id: String!): Movie
    GenresBySubstring(substring: String): [Genre]
      @cypher(
        statement: "MATCH (g:Genre) WHERE toLower(g.name) CONTAINS toLower($substring) RETURN g"
      )
    State: [State]
    User(userId: ID, name: String, _id: String): [User]
    Books: [Book]
    currentUserId: String
      @cypher(statement: "RETURN $cypherParams.currentUserId AS currentUserId")
    computedBoolean: Boolean @cypher(statement: "RETURN true")
    computedFloat: Float @cypher(statement: "RETURN 3.14")
    computedInt: Int @cypher(statement: "RETURN 1")
    computedIntList: [Int]
      @cypher(statement: "UNWIND [1, 2, 3] AS intList RETURN intList")
    computedStringList: [String]
      @cypher(
        statement: "UNWIND ['hello', 'world'] AS stringList RETURN stringList"
      )
    computedTemporal: DateTime
      @cypher(
        statement: "WITH datetime() AS now RETURN { year: now.year, month: now.month , day: now.day , hour: now.hour , minute: now.minute , second: now.second , millisecond: now.millisecond , microsecond: now.microsecond , nanosecond: now.nanosecond , timezone: now.timezone , formatted: toString(now) }"
      )
    computedSpatial: Point
      @cypher(
        statement: "WITH point({ x: 10, y: 20, z: 15 }) AS instance RETURN { x: instance.x, y: instance.y, z: instance.z, crs: instance.crs }"
      )
    computedObjectWithCypherParams: currentUserId
      @cypher(statement: "RETURN { userId: $cypherParams.currentUserId }")
    customWithArguments(strArg: String, strInputArg: strInput): String
      @cypher(statement: "RETURN $strInputArg.strArg")
    CasedType: [CasedType]
    InterfaceNoScalars(
      orderBy: _InterfaceNoScalarsOrdering
    ): [InterfaceNoScalars]
  }

  type Mutation {
    currentUserId: String
      @cypher(statement: "RETURN $cypherParams.currentUserId")
    computedObjectWithCypherParams: currentUserId
      @cypher(statement: "RETURN { userId: $cypherParams.currentUserId }")
    computedTemporal: DateTime
      @cypher(
        statement: "WITH datetime() AS now RETURN { year: now.year, month: now.month , day: now.day , hour: now.hour , minute: now.minute , second: now.second , millisecond: now.millisecond , microsecond: now.microsecond , nanosecond: now.nanosecond , timezone: now.timezone , formatted: toString(now) }"
      )
    computedSpatial: Point
      @cypher(
        statement: "WITH point({ x: 10, y: 20, z: 15 }) AS instance RETURN { x: instance.x, y: instance.y, z: instance.z, crs: instance.crs }"
      )
    computedStringList: [String]
      @cypher(
        statement: "UNWIND ['hello', 'world'] AS stringList RETURN stringList"
      )
    customWithArguments(strArg: String, strInputArg: strInput): String
      @cypher(statement: "RETURN $strInputArg.strArg")
    testPublish: Boolean @neo4j_ignore
  }

  type currentUserId {
    userId: String
  }

  type TemporalNode {
    datetime: DateTime
    name: String
    time: Time
    date: Date
    localtime: LocalTime
    localdatetime: LocalDateTime
    localdatetimes: [LocalDateTime]
    computedTimestamp: String @cypher(statement: "RETURN toString(datetime())")
    temporalNodes(
      time: Time
      date: Date
      datetime: DateTime
      localtime: LocalTime
      localdatetime: LocalDateTime
    ): [TemporalNode] @relation(name: "TEMPORAL", direction: OUT)
  }

  type SpatialNode {
    id: ID!
    point: Point
    spatialNodes(point: Point): [SpatialNode]
      @relation(name: "SPATIAL", direction: OUT)
  }

  type ignoredType {
    ignoredField: String @neo4j_ignore
  }

  scalar Time
  scalar Date
  scalar DateTime
  scalar LocalTime
  scalar LocalDateTime

  input strInput {
    strArg: String
  }

  enum Role {
    reader
    user
    admin
  }

  type CasedType {
    name: String
    state: State @relation(name: "FILMED_IN", direction: "OUT")
  }

  interface InterfaceNoScalars {
    movies: [Movie] @relation(name: "MOVIES", direction: OUT)
  }

  enum _InterfaceNoScalarsOrdering {
    movies_asc
  }

  type SubscriptionC {
    testSubscribe: Boolean
  }

  schema {
    query: QueryA
    mutation: Mutation
    subscription: SubscriptionC
  }
`;
