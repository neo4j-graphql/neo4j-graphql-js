import { gql } from 'apollo-server';
import { cypher } from '../../../../src/index';

export const testSchema = gql`
  type User {
    idField: ID! @id
    name: String
    names: [String]
    birthday: DateTime
    liked: [Movie!] @relation(name: "RATING", direction: OUT)
    uniqueString: String @unique
    createdAt: DateTime
    modifiedAt: DateTime
    int: Int
    myStaticNumber: Int
    myExportedNumber: Int
  }

  type Movie {
    id: ID! @id
    title: String! @unique
    likedBy: [User!] @relation(name: "RATING", direction: IN)
    custom: String
    myStaticNumber: Int
  }

  type Query {
    User: [User!]
    Movie: [Movie!]
  }

  type Mutation {
    CreateUser(data: UserCreate!): User
    MergeUser(where: UserWhere!, data: UserCreate!): User
    DeleteUser(where: UserWhere!, liked: UserLiked): User
    Custom(id: ID!, sideEffects: CustomSideEffects, computed: CustomComputed): Custom @cypher(${cypher`
      MERGE (custom: Custom {
        id: $id
      })
      RETURN custom
    `})
    MergeCustoms(data: [CustomData], nestedBatch: [CustomBatchMutation], sideEffects: CustomSideEffects, otherData: CustomSideEffects, computed: CustomComputed): [Custom] @cypher(statement: """
      UnwiNd   $data aS  
              CustomData
      MERGE (custom: Custom {
        id: CustomData.id
      })
      RETURN custom
    """)
    MergeCustomsWithoutReturnOrWithClause(data: [CustomData], nestedBatch: [CustomBatchMutation], sideEffects: CustomSideEffects, otherData: CustomSideEffects, computed: CustomComputed): [Custom] @cypher(statement: """
      UnwiNd   $data aS  
              CustomData
      MERGE (custom: Custom {
        id: CustomData.id
      })
      RETURN custom
    """)
    MergeLayeredNetwork(xNodes: [XNodeInput!]!): [XNode!]! @cypher(${cypher`
      UNWIND $xNodes AS XNodeInput
      MERGE (xNode: XNode {
        id: XNodeInput.id
      })
      RETURN xNode
    `})
    MergeLayeredNetwork2(xNodes: [XNodeInput!]!, yNodes: [YNodeInput!]!): [XNode!]! @cypher(${cypher`
      UNWIND $xNodes AS XNodeInput
      UNWIND $yNodes AS YNodeInput
      MERGE (xNode: XNode {
        id: XNodeInput.id
      })
      MERGE (yNode: YNode {
        id: YNodeInput.id
      })
      MERGE (xNode)-[:XY]->(yNode)
      RETURN xNode
    `})
  }

  type XNode {
    id: ID! @id
    xy: [YNode] @relation(name: "XY", direction: OUT)
  }

  type YNode {
    id: ID! @id
    xy: [XNode] @relation(name: "XY", direction: IN)
    yz: [ZNode] @relation(name: "YZ", direction: OUT)
  }

  type ZNode {
    id: ID! @id
    zy: [YNode] @relation(name: "YZ", direction: IN)
  }

  input XNodeInput {
    id: ID!
    xy: YNodeMutation
    y: [YNodeInput] @cypher(${cypher`
      MERGE (yNode: YNode {
        id: YNodeInput.id
      })
      MERGE (xNode)-[:XY]->(yNode)
      WITH yNode
    `})
  }

  input YNodeInput {
    id: ID!
    yz: ZNodeMutation
    z: [ZNodeInput] @cypher(${cypher`
      MERGE (zNode: ZNode {
        id: ZNodeInput.id
      })
      MERGE (yNode)-[:YZ]->(zNode)
    `})
  }

  input ZNodeInput {
    id: ID!
  }

  input YNodeMutation {
    merge: [YNodeInput] @cypher(${cypher`
      MERGE (yNode: YNode {
        id: YNodeInput.id
      })
      MERGE (xNode)-[:XY]->(yNode)
      WITH yNode
    `})
  }

  input ZNodeMutation {
    merge: [ZNodeInput] @cypher(${cypher`
      MERGE (zNode: ZNode {
        id: ZNodeInput.id
      })
      MERGE (yNode)-[:YZ]->(zNode)
    `})
  }

  type Custom {
    id: ID! @id
    computed: Int
    nested: [Custom] @relation(name: "RELATED", direction: OUT)
    nestedBatchProperty: Boolean
  }

  input CustomData {
    id: ID!
    nested: CustomSideEffects
  }

  input CustomCreate {
    id: ID!
    nested: CustomSideEffects
    merge: [CustomCreate] @cypher(${cypher`
      MERGE (subCustom: Custom {
        id: CustomCreate.id
      })
      MERGE (custom)-[:RELATED]->(subCustom)
      WITH subCustom AS custom
    `})
  }

  input CustomComputed {
    computed: ComputeComputed
    merge: [CustomCreate] @cypher(${cypher`
      MERGE (subCustom: Custom {
        id: CustomCreate.id
      })
      MERGE (custom)-[:RELATED]->(subCustom)
      WITH subCustom AS custom
    `})
  }

  input CustomComputedInput {
    value: Int!
  }

  input ComputeComputed {
    multiply: CustomComputedInput @cypher(${cypher`
      SET custom.computed = CustomComputedInput.value * 10
    `})
    add: CustomComputedInput @cypher(${cypher`
      SET custom.computed = CustomComputedInput.value + 10
    `})
  }

  input CustomSideEffects {
    create: [CustomCreate] @cypher(${cypher`
      MERGE (subCustom: Custom {
        id: CustomCreate.id
      })
      MERGE (custom)-[:RELATED]->(subCustom)
      WITH subCustom AS custom
    `})
    merge: [CustomCreate] @cypher(${cypher`
      MERGE (subCustom: Custom {
        id: CustomCreate.id
      })
      MERGE (custom)-[:RELATED]->(subCustom)
      WITH subCustom AS custom
    `})
  }

  input CustomBatchMutation {
    merge: [CustomCreate] @cypher(${cypher`
      MERGE (subCustom: Custom {
        id: CustomCreate.id
      })
      MERGE (subCustom)-[:RELATED]->(custom)
      WITH subCustom AS custom
    `})
    update: [CustomCreate] @cypher(${cypher`
      MATCH (custom)<-[:RELATED]-(subCustom: Custom {
        id: CustomCreate.id
      })
      SET subCustom.nestedBatchProperty = TRUE
      WITH subCustom AS custom
    `})
  }

  input UserWhere {
    idField: ID
  }

  input UserCreate {
    idField: ID
    name: String
    names: [String]
    birthday: DateTime
    uniqueString: String
    liked: UserLiked
    onUserCreate: OnUserCreate
    onUserMerge: OnUserMerge
  }

  input OnUserCreate {
    nested: OnUserCreate
    int: Int
    createdAt: CreatedAt @cypher(${cypher`
      WITH user, 10 AS myStaticNumber
      SET user.int = $data.onUserCreate.int
      SET user.createdAt = datetime(CreatedAt.datetime)
      SET user.myStaticNumber = myStaticNumber
    `})
  }

  input OnUserMerge {
    mergedAt: CreatedAt @cypher(${cypher`
      SET user.modifiedAt = datetime(CreatedAt.datetime)
    `})
  }

  input CreatedAt {
    datetime: DateTime!
  }

  input UserMerge {
    where: UserWhere
    data: UserCreate
  }

  input UserLiked { 
    create: [MovieCreate!] @cypher(${cypher`
      CREATE (movie: Movie {
        id: MovieCreate.id,
        title: MovieCreate.title
      })
      CREATE (user)-[:RATING]->(movie)
      WITH movie
    `})
    createWithImporting: [MovieCreate!] @cypher(${cypher`
      WITH user
      CREATE (movie: Movie {
        id: MovieCreate.id,
        title: MovieCreate.title
      })
      CREATE (user)-[:RATING]->(movie)
      WITH movie
    `})
    createWithImportingAll: [MovieCreate!] @cypher(${cypher`
      WITH *
      CREATE (movie: Movie {
        id: MovieCreate.id,
        title: MovieCreate.title
      })
      CREATE (user)-[:RATING]->(movie)
      WITH movie
    `})
    createWithImportingAllList: [MovieCreate!] @cypher(${cypher`
      WITH *, 10 AS myStaticNumber
      CREATE (movie: Movie {
        id: MovieCreate.id,
        title: MovieCreate.title,
        myStaticNumber: myStaticNumber
      })
      CREATE (user)-[:RATING]->(movie)
      WITH movie
    `})
    createWithImportingList: [MovieCreate!] @cypher(${cypher`
      WITH user, 10 AS myStaticNumber
      CREATE (movie: Movie {
        id: MovieCreate.id,
        title: MovieCreate.title,
        myStaticNumber: myStaticNumber
      })
      CREATE (user)-[:RATING]->(movie)
      WITH movie
    `})
    createWithDefaultExport: [MovieCreate!] @cypher(${cypher`
      CREATE (movie: Movie {
        id: MovieCreate.id,
        title: MovieCreate.title
      })
      CREATE (user)-[:RATING]->(movie)
    `})
    createWithExportingAll: [MovieCreate!] @cypher(${cypher`
      WITH *, 10 AS myStaticNumber
      CREATE (movie: Movie {
        id: MovieCreate.id,
        title: MovieCreate.title,
        myStaticNumber: myStaticNumber
      })
      CREATE (user)-[:RATING]->(movie)
      WITH *
    `})
    createWithExportingAllList: [MovieCreate!] @cypher(${cypher`
      WITH *, 10 AS myStaticNumber
      CREATE (movie: Movie {
        id: MovieCreate.id,
        title: MovieCreate.title,
        myStaticNumber: myStaticNumber
      })
      CREATE (user)-[:RATING]->(movie)
      WITH *, 5 AS myExportedNumber
    `})
    createWithExportingList: [MovieCreate!] @cypher(${cypher`
      WITH *, 10 AS myStaticNumber
      CREATE (movie: Movie {
        id: MovieCreate.id,
        title: MovieCreate.title,
        myStaticNumber: myStaticNumber
      })
      CREATE (user)-[:RATING]->(movie)
      WITH movie, 5 AS myExportedNumber
    `})
    nestedCreate: [MovieCreate!] @cypher(${cypher`
      CREATE (user)-[:RATING]->(movie: Movie {
        id: MovieCreate.customLayer.data.id,
        title: MovieCreate.customLayer.data.title,
        custom: MovieCreate.customLayer.custom
      })
      WITH movie
    `})
    merge: [MovieMerge!] @cypher(${cypher`
      MERGE (movie: Movie {
        id: MovieMerge.where.id
      })
      ON CREATE
        SET movie.title = MovieMerge.data.title
      MERGE (user)-[:RATING]->(movie)
      WITH movie
    `})
    delete: [MovieWhere!] @cypher(${cypher`
      MATCH (user)-[:RATING]->(movie: Movie { id: MovieWhere.id })
      DETACH DELETE movie
    `})
  }

  input MovieMerge {
    where: MovieWhere
    data: MovieCreate
  }

  input MovieWhere {
    id: ID!
  }

  input MovieCreate {
    id: ID
    title: String
    likedBy: MovieLikedBy
    customLayer: MovieCreateParamLayer
  }

  input MovieCreateParamLayer {
    custom: String
    data: MovieCreate
  }

  input MovieLikedBy {
    create: [UserCreate!] @cypher(${cypher`
      CREATE (movie)<-[:RATING]-(user:User {
        name: UserCreate.name,
        uniqueString: UserCreate.uniqueString
      })
      WITH user
    `})
    createWithNameConflictPrevention: [UserCreate!] @cypher(${cypher`
      CREATE (movie)<-[:RATING]-(subUser:User {
        name: UserCreate.name,
        uniqueString: UserCreate.uniqueString
      })
      WITH subUser AS user
    `})
    createWithParentStaticExport: [UserCreate!] @cypher(${cypher`
      WITH movie, myExportedNumber
      CREATE (movie)<-[:RATING]-(user:User {
        name: UserCreate.name,
        uniqueString: UserCreate.uniqueString,
        myExportedNumber: myExportedNumber
      })
      WITH user
    `})
    # This results in a Cypher runtime error: 
    # If the parent @cypher exports everything using WITH *,
    # then the "user" variable is already defined
    createDuplicateVariableError: [UserCreate!] @cypher(${cypher`
      CREATE (movie)<-[:RATING]-(user:User {
        name: UserCreate.name,
        uniqueString: UserCreate.uniqueString
      })
      WITH user
    `})    
    merge: [UserMerge!] @cypher(${cypher`
      MERGE (user: User {
        idField: UserMerge.where.idField
      })
      ON CREATE 
        SET user.name = UserMerge.data.name, 
            user.uniqueString = UserMerge.data.uniqueString
      MERGE (movie)<-[:RATING]-(user)
    `})
  }

  enum Role {
    reader
    user
    admin
  }
`;
