import { graphql } from 'graphql';
import { makeExecutableSchema } from 'graphql-tools';
import _ from 'lodash';
import {
  cypherQuery,
  cypherMutation,
  makeAugmentedSchema,
  augmentTypeDefs
} from '../../../src/index';
import { printSchemaDocument } from '../../../src/augment/augment';
import { testSchema } from './testSchema';

// Optimization to prevent schema augmentation from running for every test
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

export function cypherTestRunner(
  t,
  graphqlQuery,
  graphqlParams,
  expectedCypherQuery,
  expectedCypherParams
) {
  const testMovieSchema =
    testSchema +
    `
    type Mutation {
      CreateUser(data: _UserCreate!): User @hasScope(scopes: ["User: Create", "create:user"])
      UpdateUser(where: _UserWhere!, data: _UserUpdate!): User @hasScope(scopes: ["User: Update", "update:user"])
      DeleteUser(where: _UserWhere!): User @hasScope(scopes: ["User: Delete", "delete:user"])
      MergeUser(where: _UserKeys!, data: _UserCreate!): User @hasScope(scopes: ["User: Merge", "merge:user"])
    }

    type Query {
      User: [User] @hasScope(scopes: ["User: Read", "read:user"])
    }

    input _UserCreate {
      idField: ID
      name: String
      names: [String]
      birthday: _Neo4jDateTimeInput
      birthdays: [_Neo4jDateTimeInput]
      uniqueString: String!
      indexedInt: Int
      extensionString: String!
    }

    input _UserUpdate {
      idField: ID
      name: String
      names: [String]
      birthday: _Neo4jDateTimeInput
      birthdays: [_Neo4jDateTimeInput]
      uniqueString: String
      indexedInt: Int
      extensionString: String
    }

    input _UserWhere {
      AND: [_UserWhere!]
      OR: [_UserWhere!]
      idField: ID
      idField_not: ID
      idField_in: [ID!]
      idField_not_in: [ID!]
      idField_contains: ID
      idField_not_contains: ID
      idField_starts_with: ID
      idField_not_starts_with: ID
      idField_ends_with: ID
      idField_not_ends_with: ID
      uniqueString: String
      uniqueString_not: String
      uniqueString_in: [String!]
      uniqueString_not_in: [String!]
      uniqueString_contains: String
      uniqueString_not_contains: String
      uniqueString_starts_with: String
      uniqueString_not_starts_with: String
      uniqueString_ends_with: String
      uniqueString_not_ends_with: String
      indexedInt: Int
      indexedInt_not: Int
      indexedInt_in: [Int!]
      indexedInt_not_in: [Int!]
      indexedInt_lt: Int
      indexedInt_lte: Int
      indexedInt_gt: Int
      indexedInt_gte: Int
    }

    input _UserKeys {
      idField: ID
      uniqueString: String
      indexedInt: Int
    }
    
  `;

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
      UpdateUser: checkCypherMutation,
      DeleteUser: checkCypherMutation,
      MergeUser: checkCypherMutation
    }
  };
  let augmentedTypeDefs = augmentTypeDefs(testMovieSchema, {
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
      UpdateUser: checkCypherMutation,
      DeleteUser: checkCypherMutation,
      MergeUser: checkCypherMutation,
      AddUserRated: checkCypherMutation,
      UpdateUserRated: checkCypherMutation,
      RemoveUserRated: checkCypherMutation,
      MergeUserRated: checkCypherMutation
    }
  };

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
