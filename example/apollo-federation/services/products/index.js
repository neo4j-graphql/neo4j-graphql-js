import { gql } from 'apollo-server';
import { buildFederatedSchema } from '@apollo/federation';
import { makeAugmentedSchema, neo4jgraphql, cypher } from '../../../../src';

export const productsSchema = buildFederatedSchema([
  makeAugmentedSchema({
    typeDefs: gql`
      extend type Query {
        topProducts(first: Int = 5): [Product]
      }

      type Product
        @key(fields: "upc listCompoundKey { id } objectCompoundKey { id }") {
        upc: String!
        name: String
        price: Int
        weight: Int
        objectCompoundKey: Metric @relation(name: "METRIC_OF", direction: OUT)
        listCompoundKey: [Metric] @relation(name: "METRIC_OF", direction: OUT)
      }

      type Metric @key(fields: "id") {
        id: ID
        metric: Int
      }
    `,
    config: {
      isFederated: true
      // debug: true
    }
  })
]);

export const products = [
  {
    upc: '1',
    name: 'Table',
    price: 899,
    weight: 100
  },
  {
    upc: '2',
    name: 'Couch',
    price: 1299,
    weight: 1000
  },
  {
    upc: '3',
    name: 'Chair',
    price: 54,
    weight: 50
  }
];
