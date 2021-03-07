import { makeAugmentedSchema } from '../../src/index';
import { ApolloServer } from 'apollo-server';
import neo4j from 'neo4j-driver';

const typeDefs = `

type User {
    name: String!
    wrote: [Review] @relation(name: "WROTE", direction: OUT)
  }
  type Review {
    date: Date!
    reviewId: String!
    stars: Float!
    text: String
    reviews: [Business] @relation(name: "REVIEWS", direction: OUT)
    users: [User] @relation(name: "WROTE", direction: IN)
  }
  type Category {
    name: String!
    business: [Business] @relation(name: "IN_CATEGORY", direction: IN)
  }
  type Business {
    address: String!
    city: String!
    location: Point!
    name: String!
    state: String!
    in_category: [Category] @relation(name: "IN_CATEGORY", direction: OUT)
    reviews: [Review] @relation(name: "REVIEWS", direction: IN)
  }
`;

const schema = makeAugmentedSchema({ typeDefs });

const driver = neo4j.driver(
  'neo4j://localhost:7687',
  neo4j.auth.basic('neo4j', 'letmein'),
  { encrypted: false }
);

// Create two separate servers by hardcoding value for context.neo4jDatabase
// const sanmateoServer = new ApolloServer({
//   schema,
//   context: { driver, neo4jDatabase: 'sanmateo' }
// });

// sanmateoServer.listen(3003, '0.0.0.0').then(({ url }) => {
//   console.log(`San Mateo GraphQL API ready at ${url}`);
// });

// const missoulaServer = new ApolloServer({
//   schema,
//   context: { driver, neo4jDatabase: 'missoula' }
// });

// missoulaServer.listen(3004, '0.0.0.0').then(({ url }) => {
//   console.log(`Missoula GraphQL API ready at ${url}`);
// });

// Or we can add a header to the request
const server = new ApolloServer({
  schema,
  context: ({ req }) => {
    return { driver, neo4jDatabase: req.headers['x-database'] };
  }
});

server.listen(3003, '0.0.0.0').then(({ url }) => {
  console.log(`GraphQL API ready at ${url}`);
});
