import { Kind } from 'graphql';
import { Neo4jDataType, isNeo4jPropertyType } from './types/types';

/**
 * The name of the Neo4j system ID field
 * See: https://neo4j.com/docs/cypher-manual/current/functions/scalar/#functions-id
 */
export const Neo4jSystemIDField = `_id`;

/**
 * Given the kind or type of a field, this predicate function identifies which
 * Neo4j property type, if any, it represents
 * See: https://neo4j.com/docs/cypher-manual/current/syntax/values/#property-types
 */
export const isPropertyTypeField = ({ kind, type }) =>
  isIntegerField({ type }) ||
  isFloatField({ type }) ||
  isStringField({ kind, type }) ||
  isBooleanField({ type }) ||
  isCustomScalarField({ kind }) ||
  isTemporalField({ type }) ||
  isSpatialField({ type }) ||
  isNeo4jPropertyType({ type });

export const isIntegerField = ({ type }) =>
  Neo4jDataType.PROPERTY[type] === 'Integer';

export const isFloatField = ({ type }) =>
  Neo4jDataType.PROPERTY[type] === 'Float';

export const isStringField = ({ kind, type }) =>
  Neo4jDataType.PROPERTY[kind] === 'String' ||
  Neo4jDataType.PROPERTY[type] === 'String';

export const isBooleanField = ({ type }) =>
  Neo4jDataType.PROPERTY[type] === 'Boolean';

export const isNeo4jTypeField = ({ type }) =>
  isTemporalField({ type }) || isSpatialField({ type });

export const isTemporalField = ({ type }) =>
  Neo4jDataType.PROPERTY[type] === 'Temporal';

export const isSpatialField = ({ type }) =>
  Neo4jDataType.PROPERTY[type] === 'Spatial';

export const isNeo4jIDField = ({ name }) => name === Neo4jSystemIDField;

export const isCustomScalarField = ({ kind }) =>
  kind === Kind.SCALAR_TYPE_DEFINITION;

/**
 * An Enum used for referring to the unique combinations of GraphQL type wrappers
 */
export const TypeWrappers = {
  NAME: 'name',
  NON_NULL_NAMED_TYPE: 'isNonNullNamedType',
  LIST_TYPE: 'isListType',
  NON_NULL_LIST_TYPE: 'isNonNullListType'
};

/**
 * Predicate function identifying whether a GraphQL NamedType
 * contained in a type was wrapped with a NonNullType wrapper
 */
export const isNonNullNamedTypeField = ({ wrappers = {} }) =>
  wrappers[TypeWrappers.NON_NULL_NAMED_TYPE];

/**
 * Predicate function identifying whether a type was wrapped
 * with a GraphQL ListType wrapper
 */
export const isListTypeField = ({ wrappers = {} }) =>
  wrappers[TypeWrappers.LIST_TYPE];

/**
 * Predicate function identifying whether a GraphQL ListType
 * contained in a type was wrapped with a NonNullType wrapper
 */
export const isNonNullListTypeField = ({ wrappers = {} }) =>
  wrappers[TypeWrappers.NON_NULL_LIST_TYPE];

/**
 * A helper function that reduces the type wrappers of a given type
 * to unique cases described by the TypeWrappers enum. This enables the use
 * of simplified predicate functions for identifying type wrapper conditions,
 * as well as enables a configurable generative process for wrapping types,
 * using buildNamedType.
 * See: https://graphql.github.io/graphql-spec/June2018/#sec-Wrapping-Types
 */
export const unwrapNamedType = ({ type = {}, unwrappedType = {} }) => {
  // Initialize wrappers for this type
  unwrappedType.wrappers = {
    [TypeWrappers.LIST_TYPE]: false,
    [TypeWrappers.NON_NULL_NAMED_TYPE]: false,
    [TypeWrappers.NON_NULL_LIST_TYPE]: false
  };
  // Get wrapped type
  const wrappedType = type.type;
  // Recursing down through all type wrappers:
  // See: https://graphql.github.io/graphql-spec/June2018/#sec-Type-References
  if (wrappedType) {
    unwrappedType = unwrapNamedType({
      type: wrappedType,
      unwrappedType
    });
  }
  // Making decisions on the way back up:
  // Cases: (1) Name, (2) [Name], (3) [Name!], (4) Name!, (5) [Name]!, (6) [Name!]!
  if (type.kind === Kind.NAMED_TYPE && type.name) {
    if (type.name.kind === Kind.NAME) {
      // (1) Name - name of unwrapped type
      unwrappedType[TypeWrappers.NAME] = type.name.value;
    }
  } else if (type.kind === Kind.LIST_TYPE) {
    // (2) [Name], (3) [Name!]
    unwrappedType.wrappers[TypeWrappers.LIST_TYPE] = true;
  } else if (type.kind === Kind.NON_NULL_TYPE) {
    // Check the wrapped type; a name or a list
    if (wrappedType) {
      if (wrappedType.kind === Kind.NAMED_TYPE) {
        // (4) Name!
        unwrappedType.wrappers[TypeWrappers.NON_NULL_NAMED_TYPE] = true;
      } else if (wrappedType.kind === Kind.LIST_TYPE) {
        // (5) [Name]!, (6) [Name!]!
        unwrappedType.wrappers[TypeWrappers.NON_NULL_LIST_TYPE] = true;
      }
    }
  }
  return unwrappedType;
};

/**
 * A getter for a field definition of a given name, contained
 * in a given array of field definitions
 */
export const getFieldDefinition = ({ fields = [], name = '' }) =>
  fields.find(field => field.name && field.name.value === name);

/**
 * A getter for the type name of a field of a given name,
 * finding the field, unwrapping its type, and returning
 * the value of its NamedType
 */
export const getFieldType = ({ fields = [], name = '' }) => {
  let typeName = '';
  const field = getFieldDefinition({
    fields,
    name
  });
  if (field) {
    typeName = unwrapNamedType({ type: field.type }).name;
  }
  return typeName;
};

/**
 * Transformation helper for conversion of a given string to
 * snake case, used in generating default relationship names
 * ex: fooBar -> FOO_BAR
 */
export const toSnakeCase = name => {
  return Object.keys(name)
    .reduce((acc, t) => {
      const char = name.charAt(t);
      const uppercased = char.toUpperCase();
      if (char === uppercased && t > 0) {
        acc.push(`_${uppercased}`);
      } else {
        acc.push(uppercased);
      }
      return acc;
    }, [])
    .join('');
};
