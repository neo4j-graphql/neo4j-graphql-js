import { makeAugmentedSchema } from '../../src/index';
const { ApolloServer } = require('apollo-server');
const neo4j = require('neo4j-driver');

const __unionTypeDefs = `
union SearchResult = Blog | Movie

type Blog {
  blogId: ID!
  created: DateTime
  content: String
}

type Movie {
  movieId: ID!
  title: String
}

type Query {
  search(searchString: String!): [SearchResult] @cypher(statement:"CALL db.index.fulltext.queryNodes('searchIndex', $searchString) YIELD node RETURN node")
}
`;

const __interfaceTypeDefs = `
interface Person {
  id: ID!
  name: String
}

type User implements Person {
  id: ID!
  name: String
  screenName: String
  reviews: [Review] @relation(name: "WROTE", direction: OUT)
}

type Actor implements Person {
  id: ID!
  name: String
  movies: [Movie] @relation(name: "ACTED_IN", direction: OUT)
}

type Movie {
  movieId: ID!
  title: String
}

type Review {
  rating: Int
  created: DateTime
  movie: Movie @relation(name: "REVIEWS", direction: OUT)
}
`;

const typeDefs = /* GraphQL*/ `

union SearchResult = Review | Actor | Movie

interface Person {
  id: ID!
  name: String
  friends: [Person] @relation(name: "FRIEND_OF", direction: OUT)
}

type User implements Person {
  id: ID!
  name: String
  screenName: String
  reviews: [Review] @relation(name: "WROTE", direction: OUT)
  friends: [Person] @relation(name: "FRIEND_OF", direction: OUT)
  searched: [SearchResult]
}

type Actor implements Person {
  id: ID!
  name: String
  movies: [Movie] @relation(name: "ACTED_IN", direction: OUT)
  friends: [Person] @relation(name: "FRIEND_OF", direction: OUT)
}

type Movie {
  movieId: ID!
  title: String
}

type Review {
  rating: Int
  movie: Movie @relation(name: "REVIEWS", direction: OUT)
}

`;

const driver = neo4j.driver(
  'neo4j://localhost:7687',
  neo4j.auth.basic('neo4j', 'letmein'),
  { encrypted: false }
);

const server = new ApolloServer({
  schema: makeAugmentedSchema({ typeDefs }),
  context: ({ req }) => {
    return { driver };
  }
});

server.listen(3003, '0.0.0.0').then(({ url }) => {
  console.log(`GraphQL API ready at ${url}`);
});
