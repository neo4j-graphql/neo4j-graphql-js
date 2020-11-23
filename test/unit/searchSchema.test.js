import test from 'ava';
import { makeAugmentedSchema } from '../../src/index';
import { mapSearchDirectives } from '../../src/schemaSearch';

import { gql } from 'apollo-server';
import { ApolloError } from 'apollo-server-errors';

test('Throws error if named @search index is used on more than one type', t => {
  const error = t.throws(
    () => {
      const schema = makeAugmentedSchema({
        typeDefs: gql`
          type Movie {
            movieId: ID! @id
            title: String @search(index: "MoviePersonSearch")
          }
          type Person {
            id: ID! @id
            name: String! @search(index: "MoviePersonSearch")
          }
        `
      });
      mapSearchDirectives({ schema });
    },
    {
      instanceOf: ApolloError
    }
  );
  t.is(
    error.message,
    `The MoviePersonSearch index on the Movie type cannot be used on the name field of the Person type, because composite search indexes are not yet supported.`
  );
});

test('Throws error if @search directive is used on list type field', t => {
  const error = t.throws(
    () => {
      const schema = makeAugmentedSchema({
        typeDefs: gql`
          type Movie {
            movieId: ID! @id
            titles: [String] @search
          }
        `
      });
      mapSearchDirectives({ schema });
    },
    {
      instanceOf: ApolloError
    }
  );
  t.is(
    error.message,
    `The @search directive on the titles field of the Movie type is invalid, because search indexes cannot currently be set for list type fields.`
  );
});

test('Throws error if @search directive is used on type other than String', t => {
  const error = t.throws(
    () => {
      const schema = makeAugmentedSchema({
        typeDefs: gql`
          type Movie {
            movieId: ID! @id
            year: Int @search
          }
        `
      });
      mapSearchDirectives({ schema });
    },
    {
      instanceOf: ApolloError
    }
  );
  t.is(
    error.message,
    `The @search directive on the year field of the Movie type is invalid, because search indexes can only be set for String and ID type fields.`
  );
});
