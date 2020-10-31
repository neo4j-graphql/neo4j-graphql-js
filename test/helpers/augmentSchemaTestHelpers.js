import { parse, print, Kind } from 'graphql';
import { printSchemaDocument } from '../../src/augment/augment';

export const compareSchema = ({
  test,
  sourceSchema = {},
  expectedSchema = {}
}) => {
  const expectedDefinitions = parse(expectedSchema, { noLocation: true })
    .definitions;
  const printedSourceSchema = printSchemaDocument({ schema: sourceSchema });
  const augmentedDefinitions = parse(printedSourceSchema, { noLocation: true })
    .definitions;
  expectedDefinitions.forEach(expected => {
    const matchingAugmented = findMatchingType({
      definitions: augmentedDefinitions,
      definition: expected
    });
    if (matchingAugmented) {
      test.is(print(expected), print(matchingAugmented));
    } else {
      test.fail(
        `\nAugmented schema is missing definition:\n${print(expected)}`
      );
    }
  });
  augmentedDefinitions.forEach(augmented => {
    const matchingExpected = findMatchingType({
      definitions: expectedDefinitions,
      definition: augmented
    });
    if (matchingExpected) {
      test.is(print(augmented), print(matchingExpected));
    } else {
      test.fail(
        `\nExpected augmented schema is missing definition:\n${print(
          augmented
        )}`
      );
    }
  });
};

const findMatchingType = ({ definitions = [], definition }) => {
  const expectedKind = definition.kind;
  const expectedName = definition.name;
  return definitions.find(augmented => {
    const augmentedName = augmented.name;
    const matchesKind = augmented.kind == expectedKind;
    let matchesName = false;
    let isSchemaDefinition = false;
    if (matchesKind) {
      if (expectedName && augmentedName) {
        if (expectedName.value === augmentedName.value) {
          matchesName = true;
        }
      } else if (augmented.kind === Kind.SCHEMA_DEFINITION) {
        isSchemaDefinition = true;
      }
    }
    return matchesKind && (matchesName || isSchemaDefinition);
  });
};
