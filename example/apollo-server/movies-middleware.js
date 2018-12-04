import { makeAugmentedSchema } from '../../src/index';
import { ApolloServer } from 'apollo-server-express';
import express from 'express';
import bodyParser from 'body-parser';
import { makeExecutableSchema } from 'apollo-server';
import { v1 as neo4j } from 'neo4j-driver';
import { typeDefs, resolvers } from './movies-schema';

const schema = makeAugmentedSchema({
  typeDefs,
  resolvers,
  resolverValidationOptions: {
    requireResolversForResolveType: false
  }
});

// Add auto-generated mutations
//const augmentedSchema = augmentSchema(schema);

const driver = neo4j.driver(
  process.env.NEO4J_URI || 'bolt://localhost:7687',
  neo4j.auth.basic(
    process.env.NEO4J_USER || 'neo4j',
    process.env.NEO4J_PASSWORD || 'letmein'
  )
);

const app = express();
app.use(bodyParser.json());

const checkErrorHeaderMiddleware = async (req, res, next) => {
  req.error = req.headers['x-error'];
  next();
};

app.use('*', checkErrorHeaderMiddleware);

const server = new ApolloServer({
  schema,
  // inject the request object into the context to support middleware
  // inject the Neo4j driver instance to handle database call
  context: ({ req }) => {
    return {
      driver,
      req
    };
  }
});

server.applyMiddleware({ app, path: '/' });
app.listen(3000, '0.0.0.0');
