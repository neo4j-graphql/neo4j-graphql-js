import test from 'ava';
import { parse, print } from 'graphql';
import { Kind } from 'graphql/language';
import { printSchema } from 'graphql/utilities';

import {
  cypherQuery,
  cypherMutation,
  augmentTypeDefs,
  makeAugmentedSchema
} from '../src/index';
import { graphql } from 'graphql';

const checkCypherQuery = (object, params, ctx, resolveInfo) => {
  const [query, queryParams] = cypherQuery(params, ctx, resolveInfo);
  console.log(query);
};

const schema = makeAugmentedSchema({
  typeDefs: `
type MainType {
code: String
outProp: [RelexiveRelationshipType] @relation(direction: "OUT")
inProp: [RelexiveRelationshipType] @relation(direction: "IN")
}

type RelexiveRelationshipType @relation(name: "REFLEXIVE_REL") {
from: MainType
to: MainType
}
type Query {
MainType (
  _id: String
): MainType
}
  `,
  config: {
    auth: false,
    mutation: false
  },
  resolvers: {
    Query: {
      MainType: checkCypherQuery
    }
  }
});

graphql(
  schema,
  `
    {
      MainType {
        outProp {
          MainType {
            code
          }
        }
      }
    }
  `,
  null,
  {},
  {}
);
