import { makeAugmentedSchema } from 'neo4j-graphql-js';
import { gql } from 'apollo-server';

const typeDefs = gql`
  type Person {
    id: ID!
    name: String!
    email: String
    posts: [Post] @relation(name: "WROTE", direction: "OUT")
  }

  type Post {
    id: ID!
    title: String!
    text: String
    author: Person @relation(name: "WROTE", direction: "IN")
  }
`;

const schema = makeAugmentedSchema({ typeDefs });
export default schema;
