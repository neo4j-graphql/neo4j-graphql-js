import { makeAugmentedSchema } from '../../src/index';
import { ApolloServer } from 'apollo-server-express';
import express from 'express';
import bodyParser from 'body-parser';
import neo4j from 'neo4j-driver';
import { typeDefs, resolvers, pubsub } from './movies-schema';
import http from 'http';

const PORT = 3000;

const schema = makeAugmentedSchema({
  typeDefs,
  resolvers,
  config: {
    subscription: {
      publish: (event, key, data) => {
        pubsub.publish(event, {
          [key]: data
        });
      },
      subscribe: events => {
        return pubsub.asyncIterator(events);
      },
      exclude: ['User']
    }
  }
});

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
      req,
      cypherParams: {
        userId: 'user-id'
      }
    };
  }
});

server.applyMiddleware({ app, path: '/' });

// See: https://www.apollographql.com/docs/apollo-server/data/subscriptions/#subscriptions-with-additional-middleware
const httpServer = http.createServer(app);
server.installSubscriptionHandlers(httpServer);

// ⚠️ Pay attention to the fact that we are calling `listen` on the http server variable, and not on `app`.
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(
    `🚀 Server ready at http://localhost:${PORT}${server.graphqlPath}`
  );
  console.log(
    `🚀 Subscriptions ready at ws://localhost:${PORT}${server.subscriptionsPath}`
  );
});
