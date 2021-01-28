import { ApolloServer } from 'apollo-server';
import { ApolloGateway } from '@apollo/gateway';
import { accountsSchema } from './services/accounts';
import { inventorySchema } from './services/inventory';
import { productsSchema } from './services/products';
import { reviewsSchema } from './services/reviews';
import neo4j from 'neo4j-driver';
import dotenv from 'dotenv';

dotenv.config();

// The schema and seed data are based on the Apollo Federation demo
// See: https://github.com/apollographql/federation-demo

const driver = neo4j.driver(
  process.env.NEO4J_URI || 'bolt://localhost:7687',
  neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD)
);

// Start Accounts
const accountsService = new ApolloServer({
  schema: accountsSchema,
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
accountsService.listen({ port: 4001 }).then(({ url }) => {
  console.log(`🚀 Accounts ready at ${url}`);
});

// Start Reviews
const reviewsService = new ApolloServer({
  schema: reviewsSchema,
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
reviewsService.listen({ port: 4002 }).then(({ url }) => {
  console.log(`🚀 Reviews ready at ${url}`);
});

// Start Products
const productsService = new ApolloServer({
  schema: productsSchema,
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
productsService.listen({ port: 4003 }).then(({ url }) => {
  console.log(`🚀 Products ready at ${url}`);
});

// Start Inventory
const inventoryService = new ApolloServer({
  schema: inventorySchema,
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
inventoryService.listen({ port: 4004 }).then(({ url }) => {
  console.log(`🚀 Inventory ready at ${url}`);
});

const gateway = new ApolloGateway({
  serviceList: [
    { name: 'accounts', url: 'http://localhost:4001/graphql' },
    { name: 'reviews', url: 'http://localhost:4002/graphql' },
    { name: 'products', url: 'http://localhost:4003/graphql' },
    { name: 'inventory', url: 'http://localhost:4004/graphql' }
  ],
  // Experimental: Enabling this enables the query plan view in Playground.
  __exposeQueryPlanExperimental: true
});

(async () => {
  const server = new ApolloServer({
    gateway,

    // Apollo Graph Manager (previously known as Apollo Engine)
    // When enabled and an `ENGINE_API_KEY` is set in the environment,
    // provides metrics, schema management and trace reporting.
    engine: false,

    // Subscriptions are unsupported but planned for a future Gateway version.
    subscriptions: false
  });

  server.listen({ port: 4000 }).then(({ url }) => {
    console.log(`🚀 Apollo Gateway ready at ${url}`);
  });
})();
