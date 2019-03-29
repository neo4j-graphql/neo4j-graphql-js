import { augmentTypeDefs, augmentSchema } from '../../src/index';
import { ApolloServer, gql, makeExecutableSchema } from 'apollo-server';
import { v1 as neo4j } from 'neo4j-driver';
// import { typeDefs, resolvers } from './movies-schema';
import { inferSchema } from '../../src/inferSchema';

const driver = neo4j.driver(
  process.env.NEO4J_URI || 'bolt://localhost:7687',
  neo4j.auth.basic(
    process.env.NEO4J_USER || 'neo4j',
    process.env.NEO4J_PASSWORD || 'letmein'
  )
);

const inferAugmentedSchema = driver => {
  return inferSchema(driver).then(result => {
    console.log('TYPEDEFS:');
    console.log(result.typeDefs);

    const schema = makeExecutableSchema({
      typeDefs: augmentTypeDefs(result.typeDefs),
      resolverValidationOptions: {
        requireResolversForResolveType: false
      },
      resolvers: result.resolvers
    });

    // Add auto-generated mutations
    return augmentSchema(schema);
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

inferAugmentedSchema(driver)
  .then(createServer)
  .then(server =>
    server.listen(process.env.GRAPHQL_LISTEN_PORT || 3000, '0.0.0.0')
  )
  .then(({ url }) => {
    console.log(`GraphQL API ready at ${url}`);
  })
  .catch(err => console.error(err));
