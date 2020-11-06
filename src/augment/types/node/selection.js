import { GraphQLID } from 'graphql';
import { isNeo4jPropertyType } from '../types';
import {
  isNeo4jTypeField,
  isNeo4jIDField,
  unwrapNamedType,
  TypeWrappers,
  getTypeFields
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
import {
  buildName,
  buildNamedType,
  buildInputValue,
  buildInputObjectType
} from '../../ast';
import { shouldAugmentType } from '../../augment';
import { OperationType } from '../../types/types';
import {
  buildPropertyFilters,
  buildLogicalFilterInputValues
} from '../../input-values';

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

/**
 * Builds the AST definition of the node input object type used
 * by relationship mutations for selecting the nodes of the
 * relationship
 */
export const buildNodeSelectionInputType = ({
  definition,
  typeName,
  propertyInputValues,
  generatedTypeMap,
  typeExtensionDefinitionMap,
  config
}) => {
  const mutationTypeName = OperationType.MUTATION;
  const mutationTypeNameLower = mutationTypeName.toLowerCase();
  if (shouldAugmentType(config, mutationTypeNameLower, typeName)) {
    const fields = getTypeFields({
      typeName,
      definition,
      typeExtensionDefinitionMap
    });
    const primaryKey = getPrimaryKey({ fields });
    const propertyInputName = `_${typeName}Input`;
    if (primaryKey) {
      const primaryKeyName = primaryKey.name.value;
      const primaryKeyInputConfig = propertyInputValues.find(
        field => field.name === primaryKeyName
      );
      if (primaryKeyInputConfig) {
        generatedTypeMap[propertyInputName] = buildInputObjectType({
          name: buildName({ name: propertyInputName }),
          fields: [
            buildInputValue({
              name: buildName({ name: primaryKeyName }),
              type: buildNamedType({
                name: primaryKeyInputConfig.type.name,
                wrappers: {
                  [TypeWrappers.NON_NULL_NAMED_TYPE]: true
                }
              })
            })
          ]
        });
      }
    }
  }
  return generatedTypeMap;
};

export const buildNodeSelectionInputTypes = ({
  definition,
  typeName,
  propertyInputValues,
  generatedTypeMap,
  typeDefinitionMap,
  typeExtensionDefinitionMap,
  config
}) => {
  const mutationTypeName = OperationType.MUTATION;
  const mutationTypeNameLower = mutationTypeName.toLowerCase();
  if (shouldAugmentType(config, mutationTypeNameLower, typeName)) {
    const fields = getTypeFields({
      typeName,
      definition,
      typeExtensionDefinitionMap
    });
    // Used by Create, Update, Merge
    generatedTypeMap = buildNodeDataInputObject({
      typeName,
      propertyInputValues,
      generatedTypeMap
    });
    // Used by Update, Delete
    generatedTypeMap = buildNodeSelectionInputObject({
      typeName,
      generatedTypeMap,
      typeDefinitionMap,
      fields
    });
    // Used by Merge
    generatedTypeMap = buildNodeKeySelectionInputObject({
      typeName,
      generatedTypeMap,
      fields
    });
  }
  return generatedTypeMap;
};

const buildNodeSelectionInputObject = ({
  typeName,
  generatedTypeMap,
  typeDefinitionMap,
  fields
}) => {
  let keyFields = getKeyFields({ fields });
  keyFields = keyFields.filter(field => {
    const directives = field.directives;
    return (
      isPrimaryKeyField({ directives }) ||
      isUniqueField({ directives }) ||
      isIndexedField({ directives })
    );
  });
  if (!keyFields.length) {
    const primaryKey = getPrimaryKey({ fields });
    if (primaryKey) keyFields.push(primaryKey);
  }
  const propertyInputName = `_${typeName}Where`;
  if (keyFields.length) {
    const selectionArguments = buildLogicalFilterInputValues({
      typeName: propertyInputName
    });
    keyFields.forEach(field => {
      const fieldName = field.name.value;
      const fieldType = field.type;
      const unwrappedType = unwrapNamedType({ type: fieldType });
      const outputType = unwrappedType.name;
      const outputDefinition = typeDefinitionMap[outputType];
      const outputKind = outputDefinition ? outputDefinition.kind : '';
      selectionArguments.push(
        ...buildPropertyFilters({
          field,
          fieldName,
          outputType,
          outputKind
        })
      );
    });
    if (selectionArguments.length) {
      generatedTypeMap[propertyInputName] = buildInputObjectType({
        name: buildName({ name: propertyInputName }),
        fields: selectionArguments
      });
    }
  }
  return generatedTypeMap;
};
const buildNodeKeySelectionInputObject = ({
  typeName,
  generatedTypeMap,
  fields
}) => {
  let keyFields = getKeyFields({ fields });
  keyFields = keyFields.filter(field => {
    const directives = field.directives;
    return (
      isPrimaryKeyField({ directives }) ||
      isUniqueField({ directives }) ||
      isIndexedField({ directives })
    );
  });
  if (!keyFields.length) {
    const primaryKey = getPrimaryKey({ fields });
    if (primaryKey) keyFields.push(primaryKey);
  }
  if (keyFields.length) {
    const propertyInputName = `_${typeName}Keys`;
    const selectionArguments = keyFields.map(field => {
      const fieldName = field.name.value;
      const fieldType = field.type;
      const unwrappedType = unwrapNamedType({ type: fieldType });
      const outputType = unwrappedType.name;
      return buildInputValue({
        name: buildName({ name: fieldName }),
        type: buildNamedType({
          name: outputType
        })
      });
    });
    if (selectionArguments.length) {
      generatedTypeMap[propertyInputName] = buildInputObjectType({
        name: buildName({ name: propertyInputName }),
        fields: selectionArguments
      });
    }
  }
  return generatedTypeMap;
};

const buildNodeDataInputObject = ({
  typeName,
  propertyInputValues = [],
  generatedTypeMap
}) => {
  const propertyInputName = `_${typeName}Data`;
  const inputValues = propertyInputValues.map(field => {
    const { name, type } = field;
    return buildInputValue({
      name: buildName({ name }),
      type: buildNamedType({
        name: type.name
      })
    });
  });
  if (inputValues.length) {
    generatedTypeMap[propertyInputName] = buildInputObjectType({
      name: buildName({ name: propertyInputName }),
      fields: inputValues
    });
  }
  return generatedTypeMap;
};
