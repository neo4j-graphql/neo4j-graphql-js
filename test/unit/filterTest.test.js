import test from 'ava';
import { makeAugmentedSchema, cypherQuery } from '../../src/index.js';
import { graphql } from 'graphql';

test('Filters with unfiltered parents, nested relationship types', async t => {
  const typeDefs = /* GraphQL */ `
    type A_B_Relation @relation(name: "A_TO_B") {
      from: A
      to: B
    }
    type B_C_Relation @relation(name: "B_TO_C") {
      from: B
      to: C
      active: Boolean!
    }
    type A {
      bArray: [A_B_Relation!]!
    }
    type B {
      cArray: [B_C_Relation!]!
    }
    type C {
      id: ID!
    }
    type Query {
      A: [A]
    }
  `;

  const graphqlQuery = /* GraphQL */ `
    {
      A {
        bArray {
          B {
            filteredCArray: cArray(filter: { active: true }) {
              C {
                id
              }
            }
          }
        }
      }
    }
  `;

  const expectedCypherQuery =
    'MATCH (`a`:`A`) RETURN `a` {bArray: [(`a`)-[`a_bArray_relation`:`A_TO_B`]->(:`B`) | a_bArray_relation {B: head([(:`A`)-[`a_bArray_relation`]->(`a_bArray_B`:`B`) | a_bArray_B {cArray: [(`a_bArray_B`)-[`a_bArray_B_cArray_relation`:`B_TO_C`]->(:`C`) WHERE (`a_bArray_B_cArray_relation`.active = $1_filter.active) | a_bArray_B_cArray_relation {C: head([(:`B`)-[`a_bArray_B_cArray_relation`]->(`a_bArray_B_cArray_C`:`C`) | a_bArray_B_cArray_C { .id }]) }] }]) }] } AS `a`';
  const expectedCypherParams = {
    '1_filter': { active: true },
    first: -1,
    offset: 0
  };

  const resolvers = {
    Query: {
      A(object, params, ctx, resolveInfo) {
        const [query, queryParams] = cypherQuery(params, ctx, resolveInfo);
        t.is(query, expectedCypherQuery);
        t.deepEqual(queryParams, expectedCypherParams);
        return [];
      }
    }
  };

  const schema = makeAugmentedSchema({
    typeDefs,
    resolvers,
    config: { mutation: false }
  });

  // query the test schema with the test query, assertion is in the resolver
  const resp = await graphql(schema, graphqlQuery);

  t.deepEqual(resp.data.A, []);

  return;
});
