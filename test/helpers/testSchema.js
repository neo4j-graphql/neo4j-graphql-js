import { gql } from 'apollo-server';

export const testSchema = `  
  """
  Directive definition
  block
  description
  """
  directive @cypher(statement: String) on FIELD_DEFINITION

  "Object type line description"
  type Movie
    @additionalLabels(
      labels: ["u_<%= $cypherParams.userId %>", "newMovieLabel"]
    ) {
    _id: String
    "Field line description"
    movieId: ID! @id
    """
    Field
    block
    description
    """
    title: String @isAuthenticated
    someprefix_title_with_underscores: String
    year: Int
    released: DateTime
    plot: String
    poster: String
    imdbRating: Float
    "@relation field line description"
    genres: [Genre] @relation(name: "IN_GENRE", direction: "OUT")
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
    "@relation type field line description"      
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
    "Temporal type field line description"
    releases: [DateTime]
    "Ignored field line description"
    customField: String @neo4j_ignore
  }
  
  extend type Movie @hasRole(roles: [admin]) {
    currentUserId(strArg: String): String
      @cypher(
        statement: "RETURN $cypherParams.currentUserId AS cypherParamsUserId"
      )
    "Object type extension field line description"
    interfaceNoScalars(
      orderBy: _InterfaceNoScalarsOrdering
    ): [InterfaceNoScalars]
      @relation(name: "INTERFACE_NO_SCALARS", direction: OUT)
    extensionScalar: String
    extensionNode: [Genre] @relation(name: "IN_GENRE", direction: "OUT")
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
    interfacedRelationshipType: [InterfacedRelationshipType]
  }

  type State {
    customField: String @neo4j_ignore
    name: String! @index
    id: ID
  }

  """
  Interface type
  block description
  """
  interface Person {
    name: String
    interfacedRelationshipType: [InterfacedRelationshipType]
    userId: ID! @id
    reflexiveInterfacedRelationshipType: [ReflexiveInterfacedRelationshipType]    
  }

  type ReflexiveInterfacedRelationshipType @relation(name: "REFLEXIVE_INTERFACED_RELATIONSHIP_TYPE") {
    from: Person!
    boolean: Boolean
    to: Person!
  }

  type InterfacedRelationshipType @relation(name: "INTERFACED_RELATIONSHIP_TYPE") {
    from: Person!
    string: String!
    boolean: Boolean
    to: Genre!
  }

  extend interface Person {
    extensionScalar: String
  }
  
  "Enum type line description"
  enum _PersonOrdering {
    "Enum value line description"
    userId_asc
    """
    Enum value
    block
    description
    """
    userId_desc
    name_asc
    name_desc
  }

  """
  Custom filtering input type
  block description
  """
  input _PersonFilter {
    AND: [_PersonFilter!]
    OR: [_PersonFilter!]
    userId: ID
    userId_not: ID
    userId_in: [ID!]
    userId_not_in: [ID!]
    userId_contains: ID
    userId_not_contains: ID
    userId_starts_with: ID
    userId_not_starts_with: ID
    userId_ends_with: ID
    userId_not_ends_with: ID
    name: String
    name_not: String
    name_in: [String!]
    name_not_in: [String!]
    name_contains: String
    name_not_contains: String
    name_starts_with: String
    name_not_starts_with: String
    name_ends_with: String
    name_not_ends_with: String
    interfacedRelationshipType: _PersonInterfacedRelationshipTypeFilter
    interfacedRelationshipType_not: _PersonInterfacedRelationshipTypeFilter
    interfacedRelationshipType_in: [_PersonInterfacedRelationshipTypeFilter!]
    interfacedRelationshipType_not_in: [_PersonInterfacedRelationshipTypeFilter!]
    interfacedRelationshipType_some: _PersonInterfacedRelationshipTypeFilter
    interfacedRelationshipType_none: _PersonInterfacedRelationshipTypeFilter
    interfacedRelationshipType_single: _PersonInterfacedRelationshipTypeFilter
    interfacedRelationshipType_every: _PersonInterfacedRelationshipTypeFilter
    reflexiveInterfacedRelationshipType: _ReflexiveInterfacedRelationshipTypeDirectionsFilter
    reflexiveInterfacedRelationshipType_not: _ReflexiveInterfacedRelationshipTypeDirectionsFilter
    reflexiveInterfacedRelationshipType_in: [_ReflexiveInterfacedRelationshipTypeDirectionsFilter!]
    reflexiveInterfacedRelationshipType_not_in: [_ReflexiveInterfacedRelationshipTypeDirectionsFilter!]
    reflexiveInterfacedRelationshipType_some: _ReflexiveInterfacedRelationshipTypeDirectionsFilter
    reflexiveInterfacedRelationshipType_none: _ReflexiveInterfacedRelationshipTypeDirectionsFilter
    reflexiveInterfacedRelationshipType_single: _ReflexiveInterfacedRelationshipTypeDirectionsFilter
    reflexiveInterfacedRelationshipType_every: _ReflexiveInterfacedRelationshipTypeDirectionsFilter
    extensionScalar: String
    extensionScalar_not: String
    extensionScalar_in: [String!]
    extensionScalar_not_in: [String!]
    extensionScalar_contains: String
    extensionScalar_not_contains: String
    extensionScalar_starts_with: String
    extensionScalar_not_starts_with: String
    extensionScalar_ends_with: String
    extensionScalar_not_ends_with: String
  }
  
  input _PersonInterfacedRelationshipTypeFilter {
    AND: [_PersonInterfacedRelationshipTypeFilter!]
    OR: [_PersonInterfacedRelationshipTypeFilter!]
    string: String
    string_not: String
    string_in: [String!]
    string_not_in: [String!]
    string_contains: String
    string_not_contains: String
    string_starts_with: String
    string_not_starts_with: String
    string_ends_with: String
    string_not_ends_with: String
    boolean: Boolean
    boolean_not: Boolean
    Genre: _GenreFilter
  }
  
  input _GenreFilter {
    AND: [_GenreFilter!]
    OR: [_GenreFilter!]
    name: String
    name_not: String
    name_in: [String!]
    name_not_in: [String!]
    name_contains: String
    name_not_contains: String
    name_starts_with: String
    name_not_starts_with: String
    name_ends_with: String
    name_not_ends_with: String
    interfacedRelationshipType: _GenreInterfacedRelationshipTypeFilter
    interfacedRelationshipType_not: _GenreInterfacedRelationshipTypeFilter
    interfacedRelationshipType_in: [_GenreInterfacedRelationshipTypeFilter!]
    interfacedRelationshipType_not_in: [_GenreInterfacedRelationshipTypeFilter!]
    interfacedRelationshipType_some: _GenreInterfacedRelationshipTypeFilter
    interfacedRelationshipType_none: _GenreInterfacedRelationshipTypeFilter
    interfacedRelationshipType_single: _GenreInterfacedRelationshipTypeFilter
    interfacedRelationshipType_every: _GenreInterfacedRelationshipTypeFilter
  }

  input _GenreInterfacedRelationshipTypeFilter {
    AND: [_GenreInterfacedRelationshipTypeFilter!]
    OR: [_GenreInterfacedRelationshipTypeFilter!]
    string: String
    string_not: String
    string_in: [String!]
    string_not_in: [String!]
    string_contains: String
    string_not_contains: String
    string_starts_with: String
    string_not_starts_with: String
    string_ends_with: String
    string_not_ends_with: String
    boolean: Boolean
    boolean_not: Boolean
    Person: _PersonFilter
  }
  
  input _ReflexiveInterfacedRelationshipTypeDirectionsFilter {
    from: _ReflexiveInterfacedRelationshipTypeFilter
    to: _ReflexiveInterfacedRelationshipTypeFilter
  }
  
  input _ReflexiveInterfacedRelationshipTypeFilter {
    AND: [_ReflexiveInterfacedRelationshipTypeFilter!]
    OR: [_ReflexiveInterfacedRelationshipTypeFilter!]
    boolean: Boolean
    boolean_not: Boolean
    Person: _PersonFilter
  }

  type Actor {
    userId: ID!
    name: String
    movies: [Movie] @relation(name: "ACTED_IN", direction: "OUT")
    knows: [Person] @relation(name: "KNOWS", direction: "OUT")
    extensionScalar: String
    interfacedRelationshipType: [InterfacedRelationshipType]
    reflexiveInterfacedRelationshipType: [ReflexiveInterfacedRelationshipType]    
    _id: String
  }

  extend type Actor implements Person

  type User implements Person {
    userId: ID!
    name: String
    interfacedRelationshipType: [InterfacedRelationshipType]
    reflexiveInterfacedRelationshipType: [ReflexiveInterfacedRelationshipType]
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
    movieSearch: [MovieSearch]
    computedMovieSearch: [MovieSearch]
      @cypher(statement: "MATCH (ms:MovieSearch) RETURN ms")
    extensionScalar: String
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
    _id: String
    to: Movie
  }

  enum BookGenre {
    Mystery
    Science
  }

  extend enum BookGenre {
    Math
  }

  type Book {
    genre: BookGenre
  }
  
  type NodeTypeMutationTest {
    NodeTypeMutationTest: BookGenre
  }

  """
  Custom ordering enum type
  block description
  """  
  enum _GenreOrdering {
    name_desc
    name_asc
  }
  
  "Query type line description"
  type QueryA {
    "Object type query field line description"
    Movie(
      _id: String
      "Query field argument line description"
      movieId: ID
      """
      Query field argument
      block description
      """
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
    """
    Query field
    block
    description
    """
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
    "Interface type query field line description"
    Camera(
      type: String
      first: Int
      orderBy: _CameraOrdering
      filter: _CameraFilter
    ): [Camera]
    Person(
      userId: ID
      name: String
      extensionScalar: String
      _id: String
      first: Int
      offset: Int
      orderBy: [_PersonOrdering]
      filter: _PersonFilter
    ): [Person]
    InterfaceNoScalars(
      orderBy: _InterfaceNoScalarsOrdering
    ): [InterfaceNoScalars]
    CustomCameras: [Camera] @cypher(statement: "MATCH (c:Camera) RETURN c")
    CustomCamera: Camera @cypher(statement: "MATCH (c:Camera) RETURN c")
  }
  
  extend type QueryA {
    MovieSearch(first: Int): [MovieSearch]
    computedMovieSearch: [MovieSearch]
      @cypher(statement: "MATCH (ms:MovieSearch) RETURN ms")
  }

  "Mutation  type line description"
  type Mutation {
    "Mutation  field line description"
    currentUserId: String
      @cypher(statement: "RETURN $cypherParams.currentUserId")
    """
    Mutation  field
    block
    description
    """
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
    customWithArguments(
      """
      Mutation field argument
      block description
      """
      strArg: String,
      strInputArg: strInput
    ): String
      @cypher(statement: "RETURN $strInputArg.strArg")
    testPublish: Boolean @neo4j_ignore
    computedMovieSearch: [MovieSearch]
      @cypher(statement: "MATCH (ms:MovieSearch) RETURN ms")
  }

  extend type Mutation {
    CustomCamera: Camera
      @cypher(
        statement: "CREATE (newCamera:Camera:NewCamera {id: apoc.create.uuid(), type: 'macro'}) RETURN newCamera"
      )
    CustomCameras: [Camera]
      @cypher(
        statement: "CREATE (newCamera:Camera:NewCamera {id: apoc.create.uuid(), type: 'macro', features: ['selfie', 'zoom']}) CREATE (oldCamera:Camera:OldCamera {id: apoc.create.uuid(), type: 'floating', smell: 'rusty' }) RETURN [newCamera, oldCamera]"
      )
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

  "Custom scalar type line description"
  scalar Time
  scalar Date
  scalar DateTime
  scalar LocalTime
  scalar LocalDateTime
  
  "Input object type line description"
  input strInput {
    "Input field line description"
    strArg: String
  }

  extend input strInput {
    extensionArg: String
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

  input _CameraFilter {
    AND: [_CameraFilter!]
    OR: [_CameraFilter!]
    id: ID
    id_not: ID
    id_in: [ID!]
    id_not_in: [ID!]
    id_contains: ID
    id_not_contains: ID
    id_starts_with: ID
    id_not_starts_with: ID
    id_ends_with: ID
    id_not_ends_with: ID
    type: String
    type_not: String
    type_in: [String!]
    type_not_in: [String!]
    type_contains: String
    type_not_contains: String
    type_starts_with: String
    type_not_starts_with: String
    type_ends_with: String
    type_not_ends_with: String
    make: String
    make_not: String
    make_in: [String!]
    make_not_in: [String!]
    make_contains: String
    make_not_contains: String
    make_starts_with: String
    make_not_starts_with: String
    make_ends_with: String
    make_not_ends_with: String
    weight: Int
    weight_not: Int
    weight_in: [Int!]
    weight_not_in: [Int!]
    weight_lt: Int
    weight_lte: Int
    weight_gt: Int
    weight_gte: Int
    operators: _PersonFilter
    operators_not: _PersonFilter
    operators_in: [_PersonFilter!]
    operators_not_in: [_PersonFilter!]
    operators_some: _PersonFilter
    operators_none: _PersonFilter
    operators_single: _PersonFilter
    operators_every: _PersonFilter
  }

  interface Camera {
    type: String
    id: ID! @unique
    make: String
    weight: Int
    operators(
      first: Int
      offset: Int
      orderBy: _PersonOrdering
      filter: _PersonFilter
    ): [Person] @relation(name: "cameras", direction: IN)
    computedOperators(name: String): [Person]
      @cypher(statement: "MATCH (this)<-[:cameras]-(p:Person) RETURN p")
    reflexiveInterfaceRelationship: [Camera] @relation(name: "REFLEXIVE_INTERFACE_RELATIONSHIP", direction: OUT)
  }

  enum _CameraOrdering {
    id_asc
    id_desc
    type_asc
    type_desc
    make_asc
    make_desc
    weight_asc
    weight_desc
  }

  type OldCamera implements Camera {
    type: String
    id: ID! @unique
    make: String
    weight: Int
    smell: String
    operators(
      first: Int
      offset: Int
      orderBy: _PersonOrdering
      filter: _PersonFilter
    ): [Person] @relation(name: "cameras", direction: IN)
    computedOperators(name: String): [Person]
      @cypher(statement: "MATCH (this)<-[:cameras]-(p:Person) RETURN p")
    reflexiveInterfaceRelationship: [Camera] @relation(name: "REFLEXIVE_INTERFACE_RELATIONSHIP", direction: OUT)
  }

  type NewCamera implements Camera {
    type: String
    id: ID! @unique
    make: String
    weight: Int
    features: [String]
    operators(
      first: Int
      offset: Int
      orderBy: _PersonOrdering
      filter: _PersonFilter
    ): [Person] @relation(name: "cameras", direction: IN)
    computedOperators(name: String): [Person]
      @cypher(statement: "MATCH (this)<-[:cameras]-(p:Person) RETURN p")
    reflexiveInterfaceRelationship: [Camera] @relation(name: "REFLEXIVE_INTERFACE_RELATIONSHIP", direction: OUT)      
  }

  """
  Union type
  block description
  """
  union MovieSearch = Movie | Genre | Book

  extend union MovieSearch = Actor | OldCamera

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
    extensionScalar: String
    interfacedRelationshipType: [InterfacedRelationshipType]
    reflexiveInterfacedRelationshipType: [ReflexiveInterfacedRelationshipType]
  }

  # Normal primary key field selection applied to use the id field
  type UniqueNode {
    string: String @unique
    id: ID @id
    anotherId: ID @index
    testRelation: [UniqueStringNode] @relation(name: "TEST_RELATION", direction: OUT)
  }

  # Priority applied for @unique uniqueString field as primary
  # key, independent of ordering of non-unique fields
  type UniqueStringNode {
    id: ID!
  }

  extend type UniqueStringNode {
    uniqueString: String @unique
    testRelation: [UniqueNode] @relation(name: "TEST_RELATION", direction: IN)
  }

  type SubscriptionC {
    testSubscribe: Boolean
  }

  schema {
    query: QueryA
    subscription: SubscriptionC
  }
  
  extend schema {
    mutation: Mutation
  }
`;
