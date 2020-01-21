import test from 'ava';
import { parse, print } from 'graphql';
import { printSchemaDocument } from '../../src/augment/augment';
import { makeAugmentedSchema } from '../../src/index';
import { Kind } from 'graphql/language';
import { printSchema } from 'graphql/utilities';

test.cb('Test augmented schema', t => {
  const sourceSchema = makeAugmentedSchema({
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
    }
  });

  const expectedSchema = /* GraphQL */ `
    directive @cypher(statement: String) on FIELD_DEFINITION

    directive @relation(
      name: String
      direction: _RelationDirections
      from: String
      to: String
    ) on FIELD_DEFINITION | OBJECT

    directive @additionalLabels(labels: [String]) on OBJECT

    directive @MutationMeta(
      relationship: String
      from: String
      to: String
    ) on FIELD_DEFINITION

    directive @neo4j_ignore on FIELD_DEFINITION

    directive @isAuthenticated on OBJECT | FIELD_DEFINITION

    directive @hasRole(roles: [Role]) on OBJECT | FIELD_DEFINITION

    directive @hasScope(scopes: [String]) on OBJECT | FIELD_DEFINITION

    type _Neo4jDateTime {
      year: Int
      month: Int
      day: Int
      hour: Int
      minute: Int
      second: Int
      millisecond: Int
      microsecond: Int
      nanosecond: Int
      timezone: String
      formatted: String
    }

    input _Neo4jDateTimeInput {
      year: Int
      month: Int
      day: Int
      hour: Int
      minute: Int
      second: Int
      millisecond: Int
      microsecond: Int
      nanosecond: Int
      timezone: String
      formatted: String
    }

    type _Neo4jTime {
      hour: Int
      minute: Int
      second: Int
      millisecond: Int
      microsecond: Int
      nanosecond: Int
      timezone: String
      formatted: String
    }

    type _Neo4jDate {
      year: Int
      month: Int
      day: Int
      formatted: String
    }

    type _Neo4jLocalTime {
      hour: Int
      minute: Int
      second: Int
      millisecond: Int
      microsecond: Int
      nanosecond: Int
      formatted: String
    }

    type _Neo4jLocalDateTime {
      year: Int
      month: Int
      day: Int
      hour: Int
      minute: Int
      second: Int
      millisecond: Int
      microsecond: Int
      nanosecond: Int
      formatted: String
    }

    input _Neo4jTimeInput {
      hour: Int
      minute: Int
      second: Int
      millisecond: Int
      microsecond: Int
      nanosecond: Int
      timezone: String
      formatted: String
    }

    input _Neo4jDateInput {
      year: Int
      month: Int
      day: Int
      formatted: String
    }

    input _Neo4jLocalTimeInput {
      hour: Int
      minute: Int
      second: Int
      millisecond: Int
      microsecond: Int
      nanosecond: Int
      formatted: String
    }

    input _Neo4jLocalDateTimeInput {
      year: Int
      month: Int
      day: Int
      hour: Int
      minute: Int
      second: Int
      millisecond: Int
      microsecond: Int
      nanosecond: Int
      formatted: String
    }

    type _Neo4jPoint {
      x: Float
      y: Float
      z: Float
      longitude: Float
      latitude: Float
      height: Float
      crs: String
      srid: Int
    }

    input _Neo4jPointInput {
      x: Float
      y: Float
      z: Float
      longitude: Float
      latitude: Float
      height: Float
      crs: String
      srid: Int
    }

    input _Neo4jPointDistanceFilter {
      point: _Neo4jPointInput!
      distance: Float!
    }

    enum _RelationDirections {
      IN
      OUT
    }

    type Query {
      MainType(_id: String, filter: _MainTypeFilter): MainType
    }

    input _MainTypeFilter {
      AND: [_MainTypeFilter!]
      OR: [_MainTypeFilter!]
      code: String
      code_not: String
      code_in: [String!]
      code_not_in: [String!]
      code_contains: String
      code_not_contains: String
      code_starts_with: String
      code_not_starts_with: String
      code_ends_with: String
      code_not_ends_with: String
      outProp: _MainTypeRelexiveRelationshipTypeFilter
      outProp_not: _MainTypeRelexiveRelationshipTypeFilter
      outProp_in: [_MainTypeRelexiveRelationshipTypeFilter!]
      outProp_not_in: [_MainTypeRelexiveRelationshipTypeFilter!]
      outProp_some: _MainTypeRelexiveRelationshipTypeFilter
      outProp_none: _MainTypeRelexiveRelationshipTypeFilter
      outProp_single: _MainTypeRelexiveRelationshipTypeFilter
      outProp_every: _MainTypeRelexiveRelationshipTypeFilter
      inProp: _MainTypeRelexiveRelationshipTypeFilter
      inProp_not: _MainTypeRelexiveRelationshipTypeFilter
      inProp_in: [_MainTypeRelexiveRelationshipTypeFilter!]
      inProp_not_in: [_MainTypeRelexiveRelationshipTypeFilter!]
      inProp_some: _MainTypeRelexiveRelationshipTypeFilter
      inProp_none: _MainTypeRelexiveRelationshipTypeFilter
      inProp_single: _MainTypeRelexiveRelationshipTypeFilter
      inProp_every: _MainTypeRelexiveRelationshipTypeFilter
    }

    type MainType {
      code: String
      outProp(
        filter: _MainTypeRelexiveRelationshipTypeFilter
      ): [_MainTypeOutProp]
      inProp(filter: _MainTypeRelexiveRelationshipTypeFilter): [_MainTypeInProp]
      _id: String
    }

    type _MainTypeOutProp
      @relation(name: "REFLEXIVE_REL", from: "MainType", to: "MainType") {
      MainType: MainType
    }

    type _MainTypeInProp
      @relation(name: "REFLEXIVE_REL", from: "MainType", to: "MainType") {
      MainType: MainType
    }

    input _MainTypeRelexiveRelationshipTypeFilter {
      AND: [_MainTypeRelexiveRelationshipTypeFilter!]
      OR: [_MainTypeRelexiveRelationshipTypeFilter!]
      MainType: _MainTypeFilter
    }

    enum _MainTypeOrdering {
      code_asc
      code_desc
      _id_asc
      _id_desc
    }

    type RelexiveRelationshipType @relation(name: "REFLEXIVE_REL") {
      from: MainType
      to: MainType
    }

    schema {
      query: Query
    }
  `;

  compareSchema({
    test: t,
    sourceSchema,
    expectedSchema
  });
  t.end();
});

// input _RelexiveRelationshipTypeDirectionsFilter {
//    from: _RelexiveRelationshipTypeFilter
//    to: _RelexiveRelationshipTypeFilter
//  }

//  input _RelexiveRelationshipTypeFilter {
//    AND: [_RelexiveRelationshipTypeFilter!]
//    OR: [_RelexiveRelationshipTypeFilter!]
//    MainType: _MainTypeFilter
//  }

//  type _MainTypeOutPropDirections
//    @relation(name: "REFLEXIVE_REL", from: "MainType", to: "MainType") {
//    from(filter: _RelexiveRelationshipTypeFilter): [_MainTypeOutProp]
//    to(filter: _RelexiveRelationshipTypeFilter): [_MainTypeOutProp]
//  }

//  type _MainTypeInPropDirections
//    @relation(name: "REFLEXIVE_REL", from: "MainType", to: "MainType") {
//    from(filter: _RelexiveRelationshipTypeFilter): [_MainTypeInProp]
//    to(filter: _RelexiveRelationshipTypeFilter): [_MainTypeInProp]
//  }

const compareSchema = ({ test, sourceSchema = {}, expectedSchema = {} }) => {
  const expectedDefinitions = parse(expectedSchema).definitions;
  // printSchema is no longer used here, as it simplifies out the schema type and all
  // directive instances. printSchemaDocument does not simplify anything out, as it uses
  // the graphql print function instead, along with the regeneration of the schema type
  const printedSourceSchema = printSchemaDocument({ schema: sourceSchema });
  const augmentedDefinitions = parse(printedSourceSchema).definitions;
  augmentedDefinitions.forEach(augmentedDefinition => {
    const kind = augmentedDefinition.kind;
    let expectedDefinition = undefined;
    let name = '';
    if (kind === Kind.SCHEMA_DEFINITION) {
      expectedDefinition = expectedDefinitions.find(
        def => def.kind === Kind.SCHEMA_DEFINITION
      );
    } else {
      name = augmentedDefinition.name.value;
      expectedDefinition = expectedDefinitions.find(definition => {
        if (definition.name) {
          if (definition.name.value === augmentedDefinition.name.value) {
            return definition;
          }
        }
      });
      if (!expectedDefinition) {
        // throw new Error
        console.log(`${name} is missing from the augmented schema`);
      }
    }
    test.is(print(expectedDefinition), print(augmentedDefinition));
  });
};
