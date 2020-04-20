import { gql } from 'apollo-server';
import { buildFederatedSchema } from '@apollo/federation';
import { makeAugmentedSchema, neo4jgraphql, cypher } from '../../../../src';

export const reviewsSchema = buildFederatedSchema([
  makeAugmentedSchema({
    typeDefs: gql`
      type Review @key(fields: "id") {
        id: ID!
        body: String
        author: User
          @cypher(statement: "MATCH (this)<-[:AUTHOR_OF]-(user:User) RETURN user")
        product: Product
          @relation(name: "REVIEW_OF", direction: OUT)
      }

      extend type User @key(fields: "id") {
        id: ID! @external
        reviews: [Review]
          @relation(name: "AUTHOR_OF", direction: OUT)
        numberOfReviews: Int
          @cypher(${cypher`
            MATCH (this)-[:AUTHOR_OF]->(review:Review)
            RETURN count(review)
          `})
      }

      extend type Product @key(fields: "upc") {
        upc: String! @external
        reviews: [Review]
          @relation(name: "REVIEW_OF", direction: IN)
      }
    `,
    resolvers: {
      User: {
        // Generated
        // async __resolveReference(object, context, resolveInfo) {
        //   const data = await neo4jgraphql(object, {}, context, resolveInfo);
        //   return {
        //     ...object,
        //     ...data
        //   };
        // }
      },
      Product: {
        // Generated
        // async __resolveReference(object, context, resolveInfo) {
        //   const data = await neo4jgraphql(object, {}, context, resolveInfo);
        //   return {
        //     ...object,
        //     ...data
        //   };
        // }
      }
    },
    config: {
      isFederated: true
      // debug: true
    }
  })
]);

export const reviews = [
  {
    id: '1',
    authorID: '1',
    product: { upc: '1' },
    body: 'Love it!'
  },
  {
    id: '2',
    authorID: '1',
    product: { upc: '2' },
    body: 'Too expensive.'
  },
  {
    id: '3',
    authorID: '2',
    product: { upc: '3' },
    body: 'Could be better.'
  },
  {
    id: '4',
    authorID: '2',
    product: { upc: '1' },
    body: 'Prefer something else.'
  }
];
