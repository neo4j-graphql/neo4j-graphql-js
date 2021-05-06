import { gql } from 'apollo-server';

const typeDefs = gql`
  type Query {
    profile: Person
  }

  type Mutation {
    login(email: String!, password: String!): String
    signup(email: String!, password: String!, name: String!): String
    writePost(title: String!, text: String): Post
  }

  extend type Person {
    postCount: Int
  }

  extend type Post {
    authored: Boolean
  }
`;
export default typeDefs;
