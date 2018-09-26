import { makeAugmentedSchema } from '../../src/index';
import { ApolloServer } from 'apollo-server';
import { v1 as neo4j } from 'neo4j-driver';

const typeDefs = `
type Movie {
  title: String
  year: Int
  imdbRating: Float
  ratings: [Rated]
  genres: [Attribute] @relation(name: "IN_GENRE", direction: "OUT")
  similar: [Movie] @cypher(
      statement: """MATCH (this)<-[:RATED]-(:User)-[:RATED]->(s:Movie) 
                    WITH s, COUNT(*) AS score 
                    RETURN s ORDER BY score DESC LIMIT {first}""")
}

type Genre implements Attribute {
  name: String
  count: Int
  movies: [Movie] @relation(name: "IN_GENRE", direction: "IN")
}

interface Attribute {
  name: String
}

type User implements Person {
  userId: String
  name: String
  rated: [Rated]
}

interface Person {
  userId: String
  name: String
}

type Rated @relation(name: "RATED") {
  from: User
  to: Movie
  rating: Float
  timestamp: Int
}

`;

const schema = makeAugmentedSchema({ typeDefs });

const driver = neo4j.driver(
  'bolt://localhost:7687',
  neo4j.auth.basic('neo4j', 'letmein')
);

const server = new ApolloServer({ schema, context: { driver } });

server.listen(3003, '0.0.0.0').then(({ url }) => {
  console.log(`GraphQL API ready at ${url}`);
});
