import { makeAugmentedSchema } from '../../src/index';
import { ApolloServer } from 'apollo-server';
import { v1 as neo4j } from 'neo4j-driver';

const typeDefs = `
type Movie {
  movieId: ID!
  title: String
  year: Int
  plot: String
  poster: String
  imdbRating: Float
  ratings: [Rated]
  genres: [Genre] @relation(name: "IN_GENRE", direction: "OUT")
  actors: [Actor] @relation(name: "ACTED_IN", direction: "IN")
}
type Genre {
  name: String
  movies: [Movie] @relation(name: "IN_GENRE", direction: "IN")
}
type Actor {
  id: ID!
  name: String
  movies: [Movie] @relation(name: "ACTED_IN", direction: "OUT")
}
type User {
  userId: ID!
  name: String
  rated: [Rated]
  recommendedMovies: [Movie]
    @cypher(
      statement: """
      MATCH (this)-[:RATED]->(:Movie)<-[:RATED]-(:User)-[:RATED]->(rec:Movie)
      WITH rec, COUNT(*) AS score ORDER BY score DESC LIMIT 10
      RETURN rec
      """
    )
}
type Rated @relation(name: "RATED") {
  from: User
  to: Movie
  rating: Float
  created: DateTime
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
