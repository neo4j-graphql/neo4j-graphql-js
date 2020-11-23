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
  }

  type Movie {
    id: ID! @id
    title: String! @unique
    likedBy: [User!] @relation(name: "RATING", direction: IN)
    custom: String
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
      WITH custom
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
    """)
    MergeMatrix(xNodes: [XNodeInput!], yNodes: [YNodeInput!]): [XNode!]! @cypher(${cypher`
      UNWIND $xNodes AS XNodeInput
      UNWIND $yNodes AS YNodeInput
      MERGE (xNode: XNode {
        id: XNodeInput.id
      })
      MERGE (yNode: YNode {
        id: YNodeInput.id
      })
      WITH xNode, yNode
    `})
  }

  type XNode {
    id: ID! @id
    xy: [YNode] @relation(name: "XY", direction: OUT)
    yx: [YNode] @relation(name: "YX", direction: IN)
  }

  input XNodeInput {
    id: ID!
    yNodes: YNodeMutation
  }

  input YNodeMutation {
    merge: [YNodeInput] @cypher(${cypher`
      MERGE (yNode)<-[:XY]-(xNode)
      MERGE (yNode)-[:YX]->(xNode)
    `})
  }

  type YNode {
    id: ID! @id
    xy: [XNode] @relation(name: "XY", direction: IN)
    yx: [XNode] @relation(name: "YX", direction: OUT)
  }

  input YNodeInput {
    id: ID!
    xNodes: XNodeMutation
  }

  input XNodeMutation {
    merge: [XNodeInput] @cypher(${cypher`
      MERGE (xNode)-[:XY]->(yNode)
      MERGE (xNode)<-[:YX]-(yNode)
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

  input CustomComputed {
    computed: ComputeComputed
  }

  input CustomComputedInput {
    value: Int!
  }

  input ComputeComputed {
    multiply: CustomComputedInput @cypher(${cypher`
      SET custom.computed = CustomComputedInput.value * 10
    `})
  }

  input CustomSideEffects {
    create: [CustomData] @cypher(${cypher`
      MERGE (subCustom: Custom {
        id: CustomData.id
      })
      MERGE (custom)-[:RELATED]->(subCustom)
      WITH subCustom AS custom
    `})
    merge: [CustomData] @cypher(${cypher`
      MERGE (subCustom: Custom {
        id: CustomData.id
      })
      MERGE (custom)-[:RELATED]->(subCustom)
      WITH subCustom AS custom
    `})
  }

  input CustomBatchMutation {
    merge: [CustomData] @cypher(${cypher`
      MERGE (subCustom: Custom {
        id: CustomData.id
      })
      MERGE (subCustom)-[:RELATED]->(custom)
      WITH subCustom AS custom
    `})
    update: [CustomData] @cypher(${cypher`
      MATCH (custom)<-[:RELATED]-(subCustom: Custom {
        id: CustomData.id
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
      SET user.int = $data.onUserCreate.int
      SET user.createdAt = datetime(CreatedAt.datetime)
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
      CREATE (user)-[:RATING]->(movie: Movie {
        id: MovieCreate.id,
        title: MovieCreate.title
      })
      WITH movie
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
