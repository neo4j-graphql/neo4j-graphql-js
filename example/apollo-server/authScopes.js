import { makeAugmentedSchema } from '../../src/index';
import { ApolloServer } from 'apollo-server';
import neo4j from 'neo4j-driver';

// JWT
// eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJzY29wZXMiOlsicmVhZDp1c2VyIiwiY3JlYXRlOnVzZXIiXX0.jCidMhYKk_0s8aQpXojYwZYz00eIG9lD_DbeXRKj4vA

// scopes
//  "scopes": ["read:user", "create:user"]

// JWT_SECRET
// oqldBPU1yMXcrTwcha1a9PGi9RHlPVzQ

const typeDefs = `
type User {
    userId: ID!
    name: String
}

type Business {
    name: String
}
`;

const schema = makeAugmentedSchema({
  typeDefs,
  config: { auth: { hasScope: true } }
});

const driver = neo4j.driver(
  'bolt://localhost:7687',
  neo4j.auth.basic('neo4j', 'letmein')
);

const server = new ApolloServer({
  schema,
  context: ({ req }) => {
    return {
      req,
      driver
    };
  }
});

server.listen().then(({ url }) => {
  console.log(`GraphQL API ready at ${url}`);
});
