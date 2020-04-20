import { gql } from 'apollo-server';
import { buildFederatedSchema } from '@apollo/federation';
import { makeAugmentedSchema, neo4jgraphql, cypher } from '../../../../src';

export const accountsSchema = buildFederatedSchema([
  makeAugmentedSchema({
    typeDefs: gql`
      extend type Query {
        me: User
      }

      type User @key(fields: "id") {
        id: ID!
        name: String
        username: String
      }
    `,
    config: {
      isFederated: true
      // debug: true
    }
  })
]);

export const users = [
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
