import test from 'ava';
import { testSchema } from '../helpers/testSchema';
import { makeAugmentedSchema } from '../../src/index';
import { schemaAssert } from '../../src/schemaAssert';
import { gql } from 'apollo-server';
import { ApolloError } from 'apollo-server-errors';

test('Call assertSchema for @id, @unique, and @index fields on node types', t => {
  t.plan(1);
  const schema = makeAugmentedSchema({
    typeDefs: testSchema,
    config: {
      auth: true
    }
  });
  const expected = `CALL apoc.schema.assert({State:["name"],UniqueNode:["anotherId"]}, {Movie:["movieId"],Person:["userId"],Camera:["id"],OldCamera:["id"],NewCamera:["id"],UniqueNode:["string","id"],UniqueStringNode:["uniqueString"]})`;
  const schemaAssertCypher = schemaAssert({ schema });
  t.is(schemaAssertCypher, expected);
});

test('Throws error if node type field uses @id more than once', t => {
  const error = t.throws(
    () => {
      makeAugmentedSchema({
        typeDefs: gql`
          type Movie {
            title: String @id
            movieId: ID! @id
          }
        `
      });
    },
    {
      instanceOf: ApolloError
    }
  );
  t.is(error.message, `The @id directive can only be used once per node type.`);
});

test('Throws error if node type field uses @id with @unique', t => {
  const error = t.throws(
    () => {
      makeAugmentedSchema({
        typeDefs: gql`
          type Movie {
            title: String
            movieId: ID! @id @unique
          }
        `
      });
    },
    {
      instanceOf: ApolloError
    }
  );
  t.is(
    error.message,
    `The @id and @unique directive combined are redunant. The @id directive already sets a unique property constraint and an index.`
  );
});

test('Throws error if node type field uses @id with @index', t => {
  const error = t.throws(
    () => {
      makeAugmentedSchema({
        typeDefs: gql`
          type Movie {
            title: String
            movieId: ID! @id @index
          }
        `
      });
    },
    {
      instanceOf: ApolloError
    }
  );
  t.is(
    error.message,
    `The @id and @index directive combined are redundant. The @id directive already sets a unique property constraint and an index.`
  );
});

test('Throws error if node type field uses @unique with @index', t => {
  const error = t.throws(
    () => {
      makeAugmentedSchema({
        typeDefs: gql`
          type Movie {
            title: String
            movieId: ID! @unique @index
          }
        `
      });
    },
    {
      instanceOf: ApolloError
    }
  );
  t.is(
    error.message,
    `The @unique and @index directive combined are redunant. The @unique directive sets both a unique property constraint and an index.`
  );
});

test('Throws error if node type field uses @id with @cypher', t => {
  const error = t.throws(
    () => {
      makeAugmentedSchema({
        typeDefs: gql`
          type Movie {
            title: String
            movieId: ID! @id @cypher(statement: "")
          }
        `
      });
    },
    {
      instanceOf: ApolloError
    }
  );
  t.is(
    error.message,
    `The @id directive cannot be used with the @cypher directive because computed fields are not stored as properties.`
  );
});

test('Throws error if node type field uses @unique with @cypher', t => {
  const error = t.throws(
    () => {
      makeAugmentedSchema({
        typeDefs: gql`
          type Movie {
            title: String
            movieId: ID! @unique @cypher(statement: "")
          }
        `
      });
    },
    {
      instanceOf: ApolloError
    }
  );
  t.is(
    error.message,
    `The @unique directive cannot be used with the @cypher directive because computed fields are not stored as properties.`
  );
});

test('Throws error if node type field uses @index with @cypher', t => {
  const error = t.throws(
    () => {
      makeAugmentedSchema({
        typeDefs: gql`
          type Movie {
            title: String
            movieId: ID! @index @cypher(statement: "")
          }
        `
      });
    },
    {
      instanceOf: ApolloError
    }
  );
  t.is(
    error.message,
    `The @index directive cannot used with the @cypher directive because computed fields are not stored as properties.`
  );
});

test('Throws error if @id is used on @relation field', t => {
  const error = t.throws(
    () => {
      makeAugmentedSchema({
        typeDefs: gql`
          type Movie {
            title: String
            movieId: ID!
          }
          type User {
            id: ID!
            name: String
            watched: [Movie] @id @relation(name: "WATCHED", direction: OUT)
          }
        `
      });
    },
    {
      instanceOf: ApolloError
    }
  );
  t.is(error.message, `The @id directive cannot be used on @relation fields.`);
});

test('Throws error if @unique is used on @relation field', t => {
  const error = t.throws(
    () => {
      makeAugmentedSchema({
        typeDefs: gql`
          type Movie {
            title: String
            movieId: ID!
          }
          type User {
            id: ID!
            name: String
            watched: [Movie] @unique @relation(name: "WATCHED", direction: OUT)
          }
        `
      });
    },
    {
      instanceOf: ApolloError
    }
  );
  t.is(
    error.message,
    `The @unique directive cannot be used on @relation fields.`
  );
});

test('Throws error if @index is used on @relation field', t => {
  const error = t.throws(
    () => {
      makeAugmentedSchema({
        typeDefs: gql`
          type Movie {
            title: String
            movieId: ID!
          }
          type User {
            id: ID!
            name: String
            watched: [Movie] @index @relation(name: "WATCHED", direction: OUT)
          }
        `
      });
    },
    {
      instanceOf: ApolloError
    }
  );
  t.is(
    error.message,
    `The @index directive cannot be used on @relation fields.`
  );
});

test('Throws error if @id is used on @relation type field', t => {
  const error = t.throws(
    () => {
      makeAugmentedSchema({
        typeDefs: gql`
          type Movie {
            title: String
            movieId: ID!
          }
          type User {
            id: ID!
            name: String
            rated: [Rated] @id
          }
          type Rated @relation(name: "RATED") {
            from: User
            rating: Int
            to: Movie
          }
        `
      });
    },
    {
      instanceOf: ApolloError
    }
  );
  t.is(
    error.message,
    `The @id directive cannot be used on @relation type fields.`
  );
});

test('Throws error if @unique is used on @relation type field', t => {
  const error = t.throws(
    () => {
      makeAugmentedSchema({
        typeDefs: gql`
          type Movie {
            title: String
            movieId: ID!
          }
          type User {
            id: ID!
            name: String
            rated: [Rated] @unique
          }
          type Rated @relation(name: "RATED") {
            from: User
            rating: Int
            to: Movie
          }
        `
      });
    },
    {
      instanceOf: ApolloError
    }
  );
  t.is(
    error.message,
    `The @unique directive cannot be used on @relation type fields.`
  );
});

test('Throws error if @index is used on @relation type field', t => {
  const error = t.throws(
    () => {
      makeAugmentedSchema({
        typeDefs: gql`
          type Movie {
            title: String
            movieId: ID!
          }
          type User {
            id: ID!
            name: String
            rated: [Rated] @index
          }
          type Rated @relation(name: "RATED") {
            from: User
            rating: Int
            to: Movie
          }
        `
      });
    },
    {
      instanceOf: ApolloError
    }
  );
  t.is(
    error.message,
    `The @index directive cannot be used on @relation type fields.`
  );
});

test('Throws error if @id is used on @relation type', t => {
  const error = t.throws(
    () => {
      makeAugmentedSchema({
        typeDefs: gql`
          type Movie {
            title: String
            movieId: ID!
          }
          type User {
            id: ID!
            name: String
            rated: [Rated]
          }
          type Rated @relation(name: "RATED") {
            from: User
            rating: Int @id
            to: Movie
          }
        `
      });
    },
    {
      instanceOf: ApolloError
    }
  );
  t.is(error.message, `The @id directive cannot be used on @relation types.`);
});

test('Throws error if @unique is used on @relation type', t => {
  const error = t.throws(
    () => {
      makeAugmentedSchema({
        typeDefs: gql`
          type Movie {
            title: String
            movieId: ID!
          }
          type User {
            id: ID!
            name: String
            rated: [Rated]
          }
          type Rated @relation(name: "RATED") {
            from: User
            rating: Int @unique
            to: Movie
          }
        `
      });
    },
    {
      instanceOf: ApolloError
    }
  );
  t.is(
    error.message,
    `The @unique directive cannot be used on @relation types.`
  );
});

test('Throws error if @index is used on @relation type', t => {
  const error = t.throws(
    () => {
      makeAugmentedSchema({
        typeDefs: gql`
          type Movie {
            title: String
            movieId: ID!
          }
          type User {
            id: ID!
            name: String
            rated: [Rated]
          }
          type Rated @relation(name: "RATED") {
            from: User
            rating: Int @index
            to: Movie
          }
        `
      });
    },
    {
      instanceOf: ApolloError
    }
  );
  t.is(
    error.message,
    `The @index directive cannot be used on @relation types.`
  );
});
