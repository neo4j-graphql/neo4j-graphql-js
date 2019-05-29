import test from 'ava';
import types from '../../../dist/neo4j-schema/types';
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

  // Types which are the same between both.
  const sameTypes = [
    'Float',
    'String',
    'Boolean',
    'Date',
    'DateTime',
    'LocalTime',
    'LocalDateTime',
    'Time'
  ];
  sameTypes.forEach(typeName => {
    t.is(types.chooseGraphQLType(prop([typeName], false)), typeName);

    // Repeated types always resolve to the same thing.
    t.is(
      types.chooseGraphQLType(prop([typeName, typeName, typeName], false)),
      typeName
    );
  });

  // String dominates all other types.
  const lotsOfTypes = _.cloneDeep(sameTypes);
  t.is(types.chooseGraphQLType(prop(lotsOfTypes, false)), 'String');

  // Array types map to [Type]
  sameTypes.forEach(typeName => {
    const arrayNeo4jTypeName = `${typeName}Array`;
    t.is(
      types.chooseGraphQLType(prop([arrayNeo4jTypeName], false)),
      '[' + typeName + ']'
    );
  });

  const mappedTypes = [
    { neo4j: 'Long', graphQL: 'Int' },
    { neo4j: 'Double', graphQL: 'Float' },
    { neo4j: 'Integer', graphQL: 'Int' }
  ];

  mappedTypes.forEach(mt => {
    t.is(types.chooseGraphQLType(prop([mt.neo4j], false)), mt.graphQL);
  });

  // Arrays of mapped types.
  mappedTypes.forEach(mt => {
    const arrayNeo4jTypeName = `${mt.neo4j}Array`;
    t.is(
      types.chooseGraphQLType(prop([arrayNeo4jTypeName], false)),
      '[' + mt.graphQL + ']'
    );
  });

  // Domination relationships:
  // Long is wider than integer, but in the end, that maps to Int in GraphQL
  t.is(types.chooseGraphQLType(prop(['Long', 'Integer'], false)), 'Int');

  // Float is wider than Integer
  t.is(types.chooseGraphQLType(prop(['Integer', 'Float'], false)), 'Float');
});
