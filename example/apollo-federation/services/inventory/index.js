import { gql } from 'apollo-server';
import { buildFederatedSchema } from '@apollo/federation';
import { makeAugmentedSchema, cypher } from '../../../../src';

export const inventorySchema = buildFederatedSchema([
  makeAugmentedSchema({
    typeDefs: gql`
      extend type Product @key(fields: "upc listCompoundKey { id } objectCompoundKey { id } nullKey") {
        upc: String! @external
        weight: Int @external
        price: Int @external
        nullKey: String @external
        inStock: Boolean
        shippingEstimate: Int
          @requires(fields: "weight price")
          @cypher(${cypher`
            CALL apoc.when($price > 900,
              // free for expensive items
              'RETURN 0 AS value',
              // estimate is based on weight
              'RETURN $weight * 0.5 AS value',
              {
                price: $price,
                weight: $weight
              })
            YIELD value
            RETURN value.value
          `})
        metrics: [Metric]
          @requires(fields: "price")
          @relation(name: "METRIC_OF", direction: OUT)
        objectCompoundKey: Metric
          @external
          @relation(name: "METRIC_OF", direction: OUT)
        listCompoundKey: [Metric]
          @external
          @relation(name: "METRIC_OF", direction: OUT)
      }

      extend type Metric @key(fields: "id") {
        id: ID @external
        metric: Int @external
        data: Int
          @requires(fields: "metric")
          @cypher(${cypher`
            RETURN $metric + 1
          `})
      }

    `,
    resolvers: {
      Metric: {
        // Generated
        // async __resolveReference(object, context, resolveInfo) {
        //   const data = await neo4jgraphql(object, {}, context, resolveInfo);
        //   return {
        //     ...object,
        //     ...data
        //   };
        // },
      }
      // Generated
      // Product: {
      // async __resolveReference(object, context, resolveInfo) {
      //   const data = await neo4jgraphql(object, {}, context, resolveInfo);
      //   return {
      //     ...object,
      //     ...data
      //   };
      // }
      // }
    },
    config: {
      isFederated: true
      // subscription: false, // default is false
      // debug: true
    }
  })
]);

export const inventory = [
  { upc: '1', inStock: true },
  { upc: '2', inStock: false },
  { upc: '3', inStock: true }
];
