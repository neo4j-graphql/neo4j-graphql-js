import { makeAugmentedSchema } from '../../src/index';
import { ApolloServer } from 'apollo-server';
import { v1 as neo4j } from 'neo4j-driver';

const typeDefs = `
type Movie {
    title: String
    year: Int
    imdbRating: Float
    genres: [Genre] @relation(name: "IN_GENRE", direction: "OUT")
    similar: [Movie] @cypher(
        statement: """MATCH (this)<-[:RATED]-(:User)-[:RATED]->(s:Movie) 
                      WITH s, COUNT(*) AS score 
                      RETURN s ORDER BY score DESC LIMIT {first}""")
}

type Genre {
    name: String
    movies(first: Int = 3, offset: Int = 0): [Movie] @relation(name: "IN_GENRE", direction: "IN")
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
