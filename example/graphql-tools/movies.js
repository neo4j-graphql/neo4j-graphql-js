import { makeExecutableSchema } from 'graphql-tools';
import {neo4jgraphql} from '../../src/index';
import express from 'express';
import { graphqlExpress, graphiqlExpress } from 'graphql-server-express';
import bodyParser from 'body-parser';
import {v1 as neo4j} from 'neo4j-driver';



// Simple Movie schema
const typeDefs = `
type Movie {
  movieId: ID!
  title: String
  year: Int
  plot: String
  poster: String
  imdbRating: Float
  genres: [String]
  similar(first: Int = 3, offset: Int = 0): [Movie] @cypher(statement: "WITH {this} AS this MATCH (this)--(:Genre)--(o:Movie) RETURN o")
  mostSimilar: Movie @cypher(statement: "WITH {this} AS this RETURN this")
  degree: Int @cypher(statement: "WITH {this} AS this RETURN SIZE((this)--())")
  actors(first: Int = 3, offset: Int = 0): [Actor] @relation(name: "ACTED_IN", direction:"IN")
  avgStars: Float
}

interface Person {
	id: ID!
  name: String
}

type Actor implements Person {
  id: ID!
  name: String
  movies: [Movie]
}

type User implements Person {
  id: ID!
	name: String
}


type Query {
  Movie(id: ID, title: String, year: Int, plot: String, poster: String, imdbRating: Float, first: Int, offset: Int): [Movie]
}
`;

const resolvers = {
  // root entry point to GraphQL service
  Query: {
    // fetch movies by title substring
    Movie(object, params, ctx, resolveInfo) {
      return neo4jgraphql(object, params, ctx, resolveInfo);
    }
  }
};


const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
});

let driver;


function context(headers, secrets) {

  if (!driver) {
    driver = neo4j.driver(secrets.NEO4J_URI || "bolt://localhost:7687", neo4j.auth.basic(secrets.NEO4J_USER || "neo4j", secrets.NEO4J_PASSWORD || "letmein"))
  }
  return {driver};
}

const rootValue = {};


const PORT = 3000;
const server = express();

server.use('/graphql', bodyParser.json(), graphqlExpress(request => ({
  schema,
  rootValue,
  context: context(request.headers, process.env),
})));

server.use('/graphiql', graphiqlExpress({
  endpointURL: '/graphql',
  query: `{
  
}`,
}));

server.listen(PORT, () => {
  console.log(`GraphQL Server is now running on http://localhost:${PORT}/graphql`);
  console.log(`View GraphiQL at http://localhost:${PORT}/graphiql`);
});