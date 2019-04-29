import { makeAugmentedSchema, inferSchema } from '../../src/index';
import { ApolloServer } from 'apollo-server';
import { v1 as neo4j } from 'neo4j-driver';

const driver = neo4j.driver(
  process.env.NEO4J_URI || 'bolt://localhost:7687',
  neo4j.auth.basic(
    process.env.NEO4J_USER || 'neo4j',
    process.env.NEO4J_PASSWORD || 'letmein'
  )
);

const schemaInferenceOptions = {
  alwaysIncludeRelationships: false
};

const inferAugmentedSchema = driver => {
  return inferSchema(driver, schemaInferenceOptions).then(result => {
    console.log('TYPEDEFS:');
    console.log(result.typeDefs);

    return makeAugmentedSchema({
      typeDefs: result.typeDefs
    });
  });
};

const createServer = augmentedSchema =>
  new ApolloServer({
    schema: augmentedSchema,
    // inject the request object into the context to support middleware
    // inject the Neo4j driver instance to handle database call
    context: ({ req }) => {
      return {
        driver,
        req
      };
    }
  });

const port = process.env.GRAPHQL_LISTEN_PORT || 3000;

inferAugmentedSchema(driver)
  .then(createServer)
  .then(server => server.listen(port, '0.0.0.0'))
  .then(({ url }) => {
    console.log(`GraphQL API ready at ${url}`);
  })
  .catch(err => console.error(err));
