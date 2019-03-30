import test from 'ava';
import types from '../../dist/neo4j-schema/types';
import _ from 'lodash';

test('label2GraphQLType', t => {
  t.is(types.label2GraphQLType('Foo'), 'Foo');
  t.is(types.label2GraphQLType('Hello World'), 'Hello_World');
  t.is(types.label2GraphQLType('A:B:C'), 'A_B_C');
});

test('chooseGraphQLType', t => {
  const prop = (types, mandatory = false) => ({
    propertyTypes: types,
    mandatory
  });

  t.is(types.chooseGraphQLType(null), 'String');
  t.is(types.chooseGraphQLType(prop(['String'], true)), 'String!');
  t.is(types.chooseGraphQLType(prop(['Long', 'String'], true)), 'String!');
  // TODO: Review type mappings to GraphQL with Will
  // t.is(types.chooseGraphQLType(prop(['Integer', 'Float'], false)), 'Float');
  t.is(
    types.chooseGraphQLType(prop(['Integer', 'String', 'Float'], false)),
    'String'
  );
});
