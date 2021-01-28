import { makeAugmentedSchema } from '../../src/index';
import { ApolloServer } from 'apollo-server';
import neo4j from 'neo4j-driver';

const typeDefs = `
type Person {
  _id: Long!
  born: Int
  name: String!
  acted_in: [Movie] @relation(name: "ACTED_IN", direction: OUT)
  ACTED_IN_rel: [ACTED_IN]
  directed: [Movie] @relation(name: "DIRECTED", direction: OUT)
  produced: [Movie] @relation(name: "PRODUCED", direction: OUT)
  wrote: [Movie] @relation(name: "WROTE", direction: OUT)
  follows: [Person] @relation(name: "FOLLOWS", direction: OUT)
  reviewed: [Movie] @relation(name: "REVIEWED", direction: OUT)
  REVIEWED_rel: [REVIEWED]
}

type Movie {
  _id: Long!
  released: Int!
  tagline: String
  title: String!
  persons_acted_in: [Person] @relation(name: "ACTED_IN", direction: IN)
  persons_directed: [Person] @relation(name: "DIRECTED", direction: IN)
  persons_produced: [Person] @relation(name: "PRODUCED", direction: IN)
  persons_wrote: [Person] @relation(name: "WROTE", direction: IN)
  persons_reviewed: [Person] @relation(name: "REVIEWED", direction: IN)
}

type ACTED_IN @relation(name: "ACTED_IN") {
 from: Person!
 to: Movie!
 roles: [String]!
}

type REVIEWED @relation(name: "REVIEWED") {
 from: Person!
 to: Movie!
 rating: Int!
 summary: String!
}

`;

const schema = makeAugmentedSchema({ typeDefs });

const driver = neo4j.driver(
  'bolt://localhost:7687',
  neo4j.auth.basic('neo4j', 'letmein')
);

const server = new ApolloServer({
  schema,
  context: ({ req }) => {
    return {
      driver,
      neo4jBookmarks: req.headers['neo4jbookmark']
    };
  }
});

server.listen(3003, '0.0.0.0').then(({ url }) => {
  console.log(`GraphQL API ready at ${url}`);
});
