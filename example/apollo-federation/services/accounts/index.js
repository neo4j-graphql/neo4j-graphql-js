import { gql } from 'apollo-server';
import { buildFederatedSchema } from '@apollo/federation';
import { neo4jgraphql, augmentTypeDefs, cypher } from '../../../../src';

// Example: without schema augmentation
export const accountsSchema = buildFederatedSchema([
  {
    // Used to add support for neo4j-graphql directives
    // (@cypher / @relation) and types (temporal / spatial)
    typeDefs: augmentTypeDefs(
      gql`
      extend type Query {
        me: Account @cypher(${cypher`
          MATCH (account: Account {
            id: '1'
          })
          RETURN account
        `})
        Account: [Account] @cypher(${cypher`
          MATCH (account: Account)
          RETURN account
        `})
      }

      type Account @key(fields: "id") {
        id: ID!
        name: String
        username: String
      }
    `,
      {
        isFederated: true
      }
    ),
    resolvers: {
      Query: {
        async me(object, params, context, resolveInfo) {
          return await neo4jgraphql(object, params, context, resolveInfo);
        },
        async Account(object, params, context, resolveInfo) {
          return await neo4jgraphql(object, params, context, resolveInfo);
        }
      },
      Account: {
        // Base type reference resolver
        async __resolveReference(object, context, resolveInfo) {
          return await neo4jgraphql(object, {}, context, resolveInfo);
        }
      }
    }
  }
]);

export const accounts = [
  {
    id: '1',
    name: 'Ada Lovelace',
    birthDate: '1815-12-10',
    username: '@ada'
  },
  {
    id: '2',
    name: 'Alan Turing',
    birthDate: '1912-06-23',
    username: '@complete'
  }
];
