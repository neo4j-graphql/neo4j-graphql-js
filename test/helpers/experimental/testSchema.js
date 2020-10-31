import { gql } from 'apollo-server';

export const testSchema = `
  type User {
    idField: ID! @id
    name: String
    birthday: DateTime
    uniqueString: String! @unique
    indexedInt: Int @index
    liked: [Movie!]! @relation(
      name: "RATING", 
      direction: OUT
    )
    rated: [Rating]
  }

  extend type User {
    extensionString: String!
  }

  type Rating @relation(from: "user", to: "movie") {
    user: User
    rating: Int!
    movie: Movie
  }
    
  type Movie {
    id: ID! @id
    title: String! @unique
    genre: MovieGenre @index
    likedBy: [User!]! @relation(
      name: "RATING", 
      direction: IN
    )
    ratedBy: [Rating]
  }

  enum MovieGenre {
    Action
    Mystery
    Scary
  }

  enum Role {
    reader
    user
    admin
  }
`;
