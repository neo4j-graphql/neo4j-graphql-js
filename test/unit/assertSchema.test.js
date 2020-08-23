import test from 'ava';
import { testSchema } from '../helpers/testSchema';
import { makeAugmentedSchema } from '../../src/index';
import { schemaAssert } from '../../src/schemaAssert';

test('Assert property constraints for @unique directive fields on Node types', t => {
  t.plan(1);
  const schema = makeAugmentedSchema({
    typeDefs: testSchema,
    config: {
      auth: true
    }
  });
  const expected = `CALL apoc.schema.assert({Movie:["movieId"],State:["name"],UniqueNode:["anotherId"]}, {Person:["userId"],OldCamera:["id"],Camera:["id"],NewCamera:["id"],UniqueNode:["string","id"],UniqueStringNode:["uniqueString"]})`;
  const schemaAssertCypher = schemaAssert({ schema });
  t.is(schemaAssertCypher, expected);
});

// TODO make tests for all errors thrown for invalid directive combinations using @id, @unique, and @index
