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
  reflexive: [ReflexiveRelationshipType] @relation(direction: "OUT")
  non: [RelationshipType]
}

type ChildType {
  code: String
}

type ReflexiveRelationshipType @relation(name: "REFLEXIVE_REL") {
  from: MainType
  to: MainType
}

type RelationshipType @relation(name: "NON_REL") {
  from: MainType
  to: ChildType
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
        reflexive {
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

console.log('\n\n\nBBBBBBREEEEEEEEAKKKKKKK\n\n\n');

graphql(
  schema,
  `
    {
      MainType {
        non {
          ChildType {
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
