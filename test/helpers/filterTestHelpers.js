import { makeExecutableSchema } from 'graphql-tools';
import { graphql } from 'graphql';
import { cypherQuery, augmentTypeDefs } from '../../dist/index';

export const filterTestRunner = (
  t,
  typeDefs,
  graphqlQuery,
  graphqlParams,
  expectedCypherQuery,
  expectedCypherParams
) => {
  const resolvers = {
    Query: {
      person(object, params, ctx, resolveInfo) {
        const [query, queryParams] = cypherQuery(params, ctx, resolveInfo);
        t.is(query, expectedCypherQuery);
        t.deepEqual(queryParams, expectedCypherParams);
      }
    }
  };
  const schema = makeExecutableSchema({
    typeDefs: augmentTypeDefs(typeDefs),
    resolvers,
    resolverValidationOptions: {
      requireResolversForResolveType: false
    }
  });
  return graphql(schema, graphqlQuery, null, {}, graphqlParams);
};
