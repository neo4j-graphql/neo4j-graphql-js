import { graphql } from 'graphql';
import { makeExecutableSchema } from 'graphql-tools';
import _ from 'lodash';
import {
  cypherQuery,
  cypherMutation,
  makeAugmentedSchema,
  augmentTypeDefs
} from '../../../../src/index';
import { printSchemaDocument } from '../../../../src/augment/augment';
import { testSchema } from './testSchema';

export function cypherTestRunner(
  t,
  graphqlQuery,
  graphqlParams,
  expectedCypherQuery,
  expectedCypherParams
) {
  const checkCypherQuery = (object, params, ctx, resolveInfo) => {
    const [query, queryParams] = cypherQuery(params, ctx, resolveInfo);
    t.is(query, expectedCypherQuery);
    const deserializedParams = JSON.parse(JSON.stringify(queryParams));
    t.deepEqual(deserializedParams, expectedCypherParams);
  };

  const checkCypherMutation = (object, params, ctx, resolveInfo) => {
    const [query, queryParams] = cypherMutation(params, ctx, resolveInfo);
    t.is(query, expectedCypherQuery);
    const deserializedParams = JSON.parse(JSON.stringify(queryParams));
    t.deepEqual(deserializedParams, expectedCypherParams);
  };

  const resolvers = {
    Mutation: {
      CreateUser: checkCypherMutation,
      DeleteUser: checkCypherMutation,
      MergeUser: checkCypherMutation,
      Custom: checkCypherMutation,
      MergeCustoms: checkCypherMutation,
      MergeMatrix: checkCypherMutation,
      MergeCustomsWithoutReturnOrWithClause: checkCypherMutation
    }
  };
  let augmentedTypeDefs = augmentTypeDefs(testSchema, {
    auth: true,
    experimental: true
  });
  const schema = makeExecutableSchema({
    typeDefs: augmentedTypeDefs,
    resolvers,
    resolverValidationOptions: {
      requireResolversForResolveType: false
    }
  });

  // query the test schema with the test query, assertion is in the resolver
  return graphql(
    schema,
    graphqlQuery,
    null,
    {
      cypherParams: {
        userId: 'user-id'
      }
    },
    graphqlParams
  );
}

export function augmentedSchemaCypherTestRunner(
  t,
  graphqlQuery,
  graphqlParams,
  expectedCypherQuery,
  expectedCypherParams
) {
  const checkCypherQuery = (object, params, ctx, resolveInfo) => {
    const [query, queryParams] = cypherQuery(params, ctx, resolveInfo);
    t.is(query, expectedCypherQuery);
    const deserializedParams = JSON.parse(JSON.stringify(queryParams));
    t.deepEqual(deserializedParams, expectedCypherParams);
  };
  const checkCypherMutation = (object, params, ctx, resolveInfo) => {
    const [query, queryParams] = cypherMutation(params, ctx, resolveInfo);
    t.is(query, expectedCypherQuery);
    const deserializedParams = JSON.parse(JSON.stringify(queryParams));
    t.deepEqual(deserializedParams, expectedCypherParams);
  };

  const resolvers = {
    Mutation: {
      CreateUser: checkCypherMutation,
      DeleteUser: checkCypherMutation,
      MergeUser: checkCypherMutation,
      Custom: checkCypherMutation,
      MergeCustoms: checkCypherMutation,
      MergeMatrix: checkCypherMutation,
      MergeCustomsWithoutReturnOrWithClause: checkCypherMutation
    }
  };

  const cypherTestTypeDefs = printSchemaDocument({
    schema: makeAugmentedSchema({
      typeDefs: testSchema,
      resolvers: {},
      config: {
        auth: true,
        experimental: true
      }
    })
  });

  const augmentedSchema = makeExecutableSchema({
    typeDefs: cypherTestTypeDefs,
    resolvers,
    resolverValidationOptions: {
      requireResolversForResolveType: false
    }
  });

  return graphql(
    augmentedSchema,
    graphqlQuery,
    null,
    {
      cypherParams: {
        userId: 'user-id'
      }
    },
    graphqlParams
  );
}
