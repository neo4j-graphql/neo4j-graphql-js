import { gql } from 'apollo-server';
import { buildFederatedSchema } from '@apollo/federation';
import { makeAugmentedSchema, neo4jgraphql, cypher } from '../../../../src';
import { seedData } from '../../seed-data';

export const reviewsSchema = buildFederatedSchema([
  makeAugmentedSchema({
    typeDefs: gql`
      type Review @key(fields: "id authorID") {
        id: ID!
        body: String
        authorID: ID
        # Scalar property to lookup associate node
        author: Account
          @cypher(${cypher`
            MATCH (account:Account {id: this.authorID})
            RETURN account
          `})
        # Normal use of @relation field directive
        product: Product
          @relation(name: "REVIEW_OF", direction: OUT)
        ratings: [Rating]
      }

      extend type Account @key(fields: "id") {
        id: ID! @external
        # Object list @relation field added to nonlocal type for local type
        reviews(body: String): [Review]
          @relation(name: "AUTHOR_OF", direction: OUT)
        # Scalar @cypher field added to nonlocal type for local type
        numberOfReviews: Int
          @cypher(${cypher`
            MATCH (this)-[:AUTHOR_OF]->(review:Review)
            RETURN count(review)
          `})
        product: [Product] @relation(name: "PRODUCT_ACCOUNT", direction: IN)
        entityRelationship: [EntityRelationship]
      }

      extend type Product @key(fields: "upc") {
        upc: String! @external
        reviews(body: String): [Review]
          @relation(name: "REVIEW_OF", direction: IN)
        ratings: [Rating]
        account(filter: LocalAccountFilter): [Account] @relation(name: "PRODUCT_ACCOUNT", direction: OUT)
        entityRelationship: [EntityRelationship]
      }

      input LocalAccountFilter {
        id_not: ID
      }

      type Rating @relation(name: "REVIEW_OF") {
        from: Review
        rating: Float
        to: Product
      }

      type EntityRelationship @relation(name: "PRODUCT_ACCOUNT") {
        from: Product
        value: Int
        to: Account
      }

      # Used in testing and for example of nested merge import
      input MergeReviewsInput {
        id: ID!
        body: String
        product: MergeProductInput
        author: MergeAccountInput
      }

      input MergeProductInput {
        upc: String!
        name: String
        price: Int
        weight: Int
        inStock: Boolean
        metrics: [MergeMetricInput]
        objectCompoundKey: MergeMetricInput
        listCompoundKey: [MergeMetricInput]
      }

      input MergeMetricInput {
        id: ID!
        metric: String      
      }

      input MergeAccountInput {
        id: ID!
        name: String
        username: String        
      }

      extend type Mutation {
        MergeSeedData(data: MergeReviewsInput): Boolean @cypher(${cypher`
          UNWIND $data AS review
            MERGE (r:Review {
              id: review.id
            })
            SET r += {
              body: review.body,
              authorID: review.authorID
            }
          WITH *

          // Merge Review.author
          UNWIND review.author AS account
            MERGE (a:Account {
              id: account.id
            })
            ON CREATE SET a += {
              name: account.name,
              username: account.username
            }
            MERGE (r)<-[:AUTHOR_OF]-(a)
          // Resets processing context for unwound sibling relationship data
          WITH COUNT(*) AS SCOPE

          // Unwind second sibling, Review.product
          UNWIND $data AS review
            MATCH (r:Review {
              id: review.id
            })
            // Merge Review.product
            UNWIND review.product AS product
            MERGE (p:Product {
              upc: product.upc
            })
            ON CREATE SET p += {
              name: product.name,
              price: product.price,
              weight: product.weight,
              inStock: product.inStock
            }
            MERGE (p)<-[:REVIEW_OF {
              rating: review.rating
            }]-(r)
          WITH *
            UNWIND review.author AS account
              MATCH (a:Account {
                id: account.id
              })
              MERGE (p)-[:PRODUCT_ACCOUNT {
                value: product.value
              }]->(a)
          WITH *
          // Merge Review.product.metrics / .objectCompoundKey / .listCompoundKey
          UNWIND product.metrics AS metric
            MERGE (m:Metric {
              id: metric.id
            })
            ON CREATE SET m += {
              metric: metric.metric
            }
            MERGE (p)-[:METRIC_OF]->(m)
          // End processing scope for Review.product
          WITH COUNT(*) AS SCOPE

          RETURN true
        `})
        DeleteSeedData: Boolean @cypher(${cypher`
          MATCH (account: Account)
          MATCH (product: Product)
          MATCH (review: Review)
          MATCH (metric: Metric)
          DETACH DELETE account, product, review, metric
          RETURN TRUE
        `})
      }

    `,
    resolvers: {
      Mutation: {
        async MergeSeedData(object, params, context, resolveInfo) {
          const data = seedData.data['Review'];
          return await neo4jgraphql(object, { data }, context, resolveInfo);
        }
      },
      Account: {
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
