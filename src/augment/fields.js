import { Kind, GraphQLString } from 'graphql';
import { shouldAugmentType } from './augment';
import {
  Neo4jDataType,
  isNeo4jPropertyType,
  OperationType
} from './types/types';
import { OrderingArgument, buildPropertyOrderingValues } from './input-values';
import { buildField, buildName, buildNamedType } from './ast';

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
  isScalarField({ kind, type }) ||
  isTemporalField({ type }) ||
  isSpatialField({ type }) ||
  isNeo4jPropertyType({ type });

export const isScalarField = ({ kind, type }) =>
  isIntegerField({ type }) ||
  isFloatField({ type }) ||
  isStringField({ kind, type }) ||
  isBooleanField({ type }) ||
  isCustomScalarField({ kind });

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
 * Predicate function identifying whether a type was wrapped
 * with a GraphQL ListType wrapper
 */
export const isListTypeField = ({ field = {} }) => {
  const type = field.type;
  const unwrappedType = unwrapNamedType({ type });
  const typeWrappers = unwrappedType.wrappers;
  return typeWrappers[TypeWrappers.LIST_TYPE];
};

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
 * A getter for a field definition of a given name, contained
 * in the field definitions of a type in a given array of extensions
 */
export const getTypeExtensionFieldDefinition = ({
  typeExtensions = [],
  name = ''
}) =>
  typeExtensions.find(extension =>
    getFieldDefinition({ fields: extension.fields, name })
  );

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

/**
 * Builds the AST definition for the Neo4j system ID, adding an
 * '_id' field to the fields of a given type and its associated API
 */
export const buildNeo4jSystemIDField = ({
  typeName,
  propertyOutputFields,
  nodeInputTypeMap,
  config
}) => {
  const queryTypeNameLower = OperationType.QUERY.toLowerCase();
  if (shouldAugmentType(config, queryTypeNameLower, typeName)) {
    const neo4jInternalIDConfig = {
      name: Neo4jSystemIDField,
      type: {
        name: GraphQLString.name
      }
    };
    const systemIDIndex = propertyOutputFields.findIndex(
      e => e.name.value === Neo4jSystemIDField
    );
    const systemIDField = buildField({
      name: buildName({ name: neo4jInternalIDConfig.name }),
      type: buildNamedType({
        name: GraphQLString.name
      })
    });
    if (systemIDIndex >= 0) {
      propertyOutputFields.splice(systemIDIndex, 1, systemIDField);
    } else {
      propertyOutputFields.push(systemIDField);
    }
    const orderingValues = nodeInputTypeMap[OrderingArgument.ORDER_BY].values;
    const systemIDOrderingValue = orderingValues.find(
      value =>
        value.name.value === `${Neo4jSystemIDField}_asc` ||
        value.name.value === `${Neo4jSystemIDField}_desc`
    );
    if (!systemIDOrderingValue) {
      nodeInputTypeMap[OrderingArgument.ORDER_BY].values.push(
        ...buildPropertyOrderingValues({
          fieldName: neo4jInternalIDConfig.name
        })
      );
    }
  }
  return [propertyOutputFields, nodeInputTypeMap];
};

export const propertyFieldExists = ({
  definition = {},
  typeDefinitionMap = {}
}) => {
  const fields = definition.fields || [];
  return fields.find(field => {
    const fieldType = field.type;
    const unwrappedType = unwrapNamedType({ type: fieldType });
    const outputType = unwrappedType.name;
    const typeWrappers = unwrappedType.wrappers;
    const outputDefinition = typeDefinitionMap[outputType];
    const outputKind = outputDefinition ? outputDefinition.kind : '';
    const isListType = typeWrappers[TypeWrappers.LIST_TYPE];
    return (
      !isListType &&
      isPropertyTypeField({
        kind: outputKind,
        type: outputType
      })
    );
  });
};

export const getTypeFields = ({
  typeName = '',
  definition = {},
  typeExtensionDefinitionMap = {}
}) => {
  const allFields = [];
  const fields = definition.fields;
  if (fields && fields.length) {
    // if there are .fields, return them
    allFields.push(...fields);
    const extensions = typeExtensionDefinitionMap[typeName] || [];
    // also return any .fields of extensions of this type
    extensions.forEach(extension => allFields.push(...extension.fields));
  }
  return allFields;
};
