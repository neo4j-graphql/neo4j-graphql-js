import { gql } from 'apollo-server';
import { buildFederatedSchema } from '@apollo/federation';
import { makeAugmentedSchema } from '../../../../src';

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

export const productsSchema = buildFederatedSchema([
  makeAugmentedSchema({
    typeDefs: gql`
      extend type Query {
        topProducts(first: Int = 5): [Product]
      }

      type Product @key(fields: "upc") {
        upc: String!
        name: String
        price: Int
        weight: Int
      }
    `,
    resolvers: {
      Product: {
        __resolveReference(object) {
          return products.find(product => product.upc === object.upc);
        }
      },
      Query: {
        //! will be generated
        Product(object, params, context, resolveInfo) {
          return products;
        },
        topProducts(_, args) {
          return products.slice(0, args.first);
        }
      }
    },
    config: {
      isFederated: true,
      debug: true
    }
  })
]);
