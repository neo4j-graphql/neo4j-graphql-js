import test from 'ava';
import { printSchema } from 'graphql';
import {
  augmentSchema,
  makeAugmentedSchema,
  augmentTypeDefs
} from '../../dist/index';
import { typeDefs } from '../helpers/configTestHelpers';
import { makeExecutableSchema } from 'graphql-tools';

test.cb('Config - makeAugmentedSchema - no queries, no mutations', t => {
  const testSchema = makeAugmentedSchema({
    typeDefs,
    config: {
      query: false,
      mutation: false,
      auth: false
    }
  });

  t.is(printSchema(testSchema).includes('type Mutation'), false);
  t.is(printSchema(testSchema).includes('type Query'), false);
  t.end();
});

test.cb('Config - augmentSchema - no queries, no mutations', t => {
  const schema = makeExecutableSchema({
    typeDefs: augmentTypeDefs(typeDefs, { auth: false })
  });

  const augmentedSchema = augmentSchema(schema, {
    query: false,
    mutation: false
  });

  t.is(printSchema(augmentedSchema).includes('type Mutation'), false);
  t.is(printSchema(augmentedSchema).includes('type Query'), false);
  t.end();
});

test.cb('Config - makeAugmentedSchema - enable queries, no mutations', t => {
  const testSchema = makeAugmentedSchema({
    typeDefs,
    config: {
      query: true,
      mutation: false
    }
  });

  t.is(printSchema(testSchema).includes('type Mutation'), false);
  t.is(printSchema(testSchema).includes('type Query'), true);
  t.end();
});

test.cb('Config - augmentSchema - enable queries, no mutations', t => {
  const schema = makeExecutableSchema({
    typeDefs: augmentTypeDefs(typeDefs, { auth: false })
  });

  const augmentedSchema = augmentSchema(schema, {
    query: true,
    mutation: false
  });

  t.is(printSchema(augmentedSchema).includes('type Mutation'), false);
  t.is(printSchema(augmentedSchema).includes('type Query'), true);
  t.end();
});

test.cb(
  'Config - makeAugmentedSchema - enable queries, enable mutations',
  t => {
    const testSchema = makeAugmentedSchema({
      typeDefs,
      config: {
        query: true,
        mutation: true
      }
    });

    t.is(printSchema(testSchema).includes('type Mutation'), true);
    t.is(printSchema(testSchema).includes('type Query'), true);
    t.end();
  }
);

test.cb('Config - augmentSchema - enable queries, enable mutations', t => {
  const schema = makeExecutableSchema({
    typeDefs: augmentTypeDefs(typeDefs, { auth: false })
  });

  const augmentedSchema = augmentSchema(schema, {
    query: true,
    mutation: true
  });

  t.is(printSchema(augmentedSchema).includes('type Mutation'), true);
  t.is(printSchema(augmentedSchema).includes('type Query'), true);
  t.end();
});

test.cb(
  'Config - makeAugmentedSchema - specify types to exclude for mutation',
  t => {
    const testSchema = makeAugmentedSchema({
      typeDefs,
      config: {
        mutation: {
          exclude: ['User', 'Hashtag']
        }
      }
    });

    t.is(printSchema(testSchema).includes('CreateUser'), false);
    t.is(printSchema(testSchema).includes('DeleteHashtag'), false);
    t.end();
  }
);

test.cb('Config - augmentSchema - specify types to exclude for mutation', t => {
  const schema = makeExecutableSchema({
    typeDefs: augmentTypeDefs(typeDefs, { auth: false })
  });

  const augmentedSchema = augmentSchema(schema, {
    mutation: {
      exclude: ['User', 'Hashtag']
    }
  });

  t.is(printSchema(augmentedSchema).includes('CreateUser'), false);
  t.is(printSchema(augmentedSchema).includes('DeleteHashtag'), false);
  t.end();
});

test.cb(
  'Config - makeAugmentedSchema - specify types to exclude for query',
  t => {
    const testSchema = makeAugmentedSchema({
      typeDefs,
      config: {
        query: {
          exclude: ['User', 'Hashtag']
        }
      }
    });

    const queryType = `
type Query {
  Tweet(id: ID, timestamp: _Neo4jDateTimeInput, text: String, _id: String, first: Int, offset: Int, orderBy: [_TweetOrdering], filter: _TweetFilter): [Tweet]
}
`;

    t.is(printSchema(testSchema).includes(queryType), true);
    t.end();
  }
);

test.cb('Config - augmentSchema - specify types to exclude for query', t => {
  const schema = makeExecutableSchema({
    typeDefs: augmentTypeDefs(typeDefs, { auth: false })
  });

  const augmentedSchema = augmentSchema(schema, {
    query: {
      exclude: ['User', 'Hashtag']
    }
  });

  const queryType = `
type Query {
  Tweet(id: ID, timestamp: _Neo4jDateTimeInput, text: String, _id: String, first: Int, offset: Int, orderBy: [_TweetOrdering], filter: _TweetFilter): [Tweet]
}
`;

  t.is(printSchema(augmentedSchema).includes(queryType), true);
  t.end();
});

test.cb('Config - temporal - disable temporal schema augmentation', t => {
  const schema = makeAugmentedSchema({
    typeDefs,
    config: {
      temporal: false
    }
  });

  t.is(printSchema(schema).includes('_Neo4jDateTimeInput'), false);
  t.end();
});
