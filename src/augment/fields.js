import { Kind } from 'graphql';
import { Neo4jDataType, isNeo4jPropertyType } from './types/types';

const Neo4jSystemIDField = `_id`;

export const isIntegerField = ({ type }) =>
  Neo4jDataType.PROPERTY[type] === 'Integer';

export const isFloatField = ({ type }) =>
  Neo4jDataType.PROPERTY[type] === 'Float';

export const isStringField = ({ kind, type }) =>
  Neo4jDataType.PROPERTY[kind] === 'String' ||
  Neo4jDataType.PROPERTY[type] === 'String';

export const isBooleanField = ({ type }) =>
  Neo4jDataType.PROPERTY[type] === 'Boolean';

export const isTemporalField = ({ type }) =>
  Neo4jDataType.PROPERTY[type] === 'Temporal';

export const isNeo4jIDField = ({ name }) => name === Neo4jSystemIDField;

export const isCustomScalarField = ({ kind }) =>
  kind === Kind.SCALAR_TYPE_DEFINITION;

export const isPropertyTypeField = ({ kind, type }) =>
  isIntegerField({ type }) ||
  isFloatField({ type }) ||
  isStringField({ kind, type }) ||
  isBooleanField({ type }) ||
  isCustomScalarField({ kind }) ||
  isTemporalField({ type }) ||
  isNeo4jPropertyType({ type });

export const TypeWrappers = {
  NAME: 'name',
  NON_NULL_NAMED_TYPE: 'isNonNullNamedType',
  LIST_TYPE: 'isListType',
  NON_NULL_LIST_TYPE: 'isNonNullListType'
};

export const isNonNullNamedTypeField = ({ wrappers = {} }) =>
  wrappers[TypeWrappers.NON_NULL_NAMED_TYPE];

export const isListTypeField = ({ wrappers = {} }) =>
  wrappers[TypeWrappers.LIST_TYPE];

export const isNonNullListTypeField = ({ wrappers = {} }) =>
  wrappers[TypeWrappers.NON_NULL_LIST_TYPE];

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
  // See: https://graphql.github.io/graphql-spec/June2018/#sec-Wrapping-Types
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

export const getFieldDefinition = ({ fields = [], name = '' }) =>
  fields.find(field => field.name && field.name.value === name);

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
