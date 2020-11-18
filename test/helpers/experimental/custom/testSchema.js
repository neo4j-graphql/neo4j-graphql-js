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
      RETURN custom
    `})
  }

  type Custom {
    id: ID! @id
    computed: Int
    nested: [Custom] @relation(name: "RELATED", direction: OUT)
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
      MERGE (custom)-[:RELATED]->(subCustom: Custom {
        id: CustomData.id
      })
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
