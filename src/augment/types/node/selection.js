import { GraphQLID } from 'graphql';
import { isNeo4jPropertyType } from '../types';
import {
  isNeo4jTypeField,
  isNeo4jIDField,
  unwrapNamedType,
  TypeWrappers
} from '../../fields';
import {
  isCypherField,
  isIgnoredField,
  isRelationField,
  isPrimaryKeyField,
  isUniqueField,
  isIndexedField,
  validateFieldDirectives
} from '../../directives';

/**
 * Gets a single field for use as a primary key
 */
export const getPrimaryKey = ({ fields = [] }) => {
  // Get all scalar fields that can be used as keys
  const keyFields = getKeyFields({ fields });
  // Try getting an @id field
  let pk = getPrimaryKeyField(keyFields);
  if (!pk) {
    // Try getting a single key from @unique fields
    const uniqueFields = getUniqueFields(keyFields);
    pk = inferPrimaryKey(uniqueFields);
  }
  if (!pk) {
    // Try getting a single key from @index fields
    const indexedFields = getIndexedFields(keyFields);
    pk = inferPrimaryKey(indexedFields);
  }
  if (!pk) {
    // Try getting a single key from all fields
    pk = inferPrimaryKey(keyFields);
  }
  return pk;
};

/**
 * Gets all fields for which is it possible to set
 * unique property constraint or indexes in Neo4j.
 */
export const getKeyFields = ({ fields = [] }) => {
  return fields.filter(field => {
    const { name, type, directives } = field;
    const unwrappedType = unwrapNamedType({ type });
    validateFieldDirectives({ directives });
    // Prevent ignored, relationship, computed, temporal,
    // and spatial fields from being indexable
    return (
      !isCypherField({ directives }) &&
      !isIgnoredField({ directives }) &&
      !isRelationField({ directives }) &&
      !isNeo4jIDField({ name: name.value }) &&
      !isNeo4jPropertyType({ type: unwrappedType.name }) &&
      !isNeo4jTypeField({ type: unwrappedType.name })
    );
  });
};

// Finds an @id field
const getPrimaryKeyField = fields =>
  fields.find(({ directives }) => isPrimaryKeyField({ directives }));

// Gets all @unique fields
const getUniqueFields = fields =>
  fields.filter(({ directives }) => isUniqueField({ directives }));

// Gets all @index fields
const getIndexedFields = fields =>
  fields.filter(({ directives }) => isIndexedField({ directives }));

/**
 * Attempts to select a default primary key by assessing field
 * type predecence. Ideally, a default primary keyis an ID type
 * and non-nullable. With neither an ID, nor a non-nullable field,
 * the first scalar field is used.
 */
const inferPrimaryKey = (fields = []) => {
  let pk = undefined;
  if (!fields.length) return pk;
  // Try to use the first `ID!` field.
  pk = fields.find(({ type }) => {
    const unwrappedType = unwrapNamedType({ type });
    return (
      unwrappedType.wrappers[TypeWrappers.NON_NULL_NAMED_TYPE] &&
      unwrappedType.name === GraphQLID.name
    );
  });
  if (!pk) {
    // Try to use the first `ID` type field.
    pk = fields.find(({ type }) => {
      return unwrapNamedType({ type }).name === GraphQLID.name;
    });
  }
  if (!pk) {
    // Try to use the first `!` scalar field.
    pk = fields.find(({ type }) => {
      return unwrapNamedType({ type }).wrappers[
        TypeWrappers.NON_NULL_NAMED_TYPE
      ];
    });
  }
  if (!pk) {
    // Try to use the first field.
    pk = fields[0];
  }
  return pk;
};
