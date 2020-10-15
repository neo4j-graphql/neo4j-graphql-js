import { augmentRelationshipQueryAPI } from './query';
import { augmentRelationshipMutationAPI } from './mutation';
import {
  unwrapNamedType,
  isPropertyTypeField,
  getFieldType,
  getFieldDefinition,
  toSnakeCase,
  buildNeo4jSystemIDField
} from '../../fields';
import {
  OrderingArgument,
  FilteringArgument,
  augmentInputTypePropertyFields
} from '../../input-values';
import {
  DirectiveDefinition,
  getDirective,
  isIgnoredField,
  isCypherField,
  isPrimaryKeyField,
  isUniqueField,
  isIndexedField,
  getDirectiveArgument,
  augmentDirectives
} from '../../directives';
import { isOperationTypeDefinition } from '../../types/types';
import { ApolloError } from 'apollo-server-errors';

// An enum for the semantics of the directed fields of a relationship type
export const RelationshipDirectionField = {
  FROM: 'from',
  TO: 'to'
};

/**
 * The main export for the augmentation process of a GraphQL
 * type definition representing a Neo4j relationship entity
 */
export const augmentRelationshipTypeField = ({
  typeName,
  field,
  definition,
  fieldType,
  fieldArguments,
  fieldDirectives,
  fieldName,
  outputDefinition,
  nodeInputTypeMap,
  typeDefinitionMap,
  typeExtensionDefinitionMap,
  generatedTypeMap,
  operationTypeMap,
  outputType,
  config
}) => {
  if (!isOperationTypeDefinition({ definition, operationTypeMap })) {
    const isPrimaryKey = isPrimaryKeyField({ directives: fieldDirectives });
    const isIndex = isIndexedField({ directives: fieldDirectives });
    const isUnique = isUniqueField({ directives: fieldDirectives });
    if (isPrimaryKey)
      throw new ApolloError(
        `The @id directive cannot be used on @relation type fields.`
      );
    if (isUnique)
      throw new ApolloError(
        `The @unique directive cannot be used on @relation type fields.`
      );
    if (isIndex)
      throw new ApolloError(
        `The @index directive cannot be used on @relation type fields.`
      );
    if (!isCypherField({ directives: fieldDirectives })) {
      const relationshipTypeDirective = getDirective({
        directives: outputDefinition.directives,
        name: DirectiveDefinition.RELATION
      });
      let relationshipName = getDirectiveArgument({
        directive: relationshipTypeDirective,
        name: 'name'
      });
      relationshipName = decideDefaultRelationshipName({
        relationshipTypeDirective,
        outputType,
        relationshipName
      });
      // validate if the provided node type field names are defined
      validateRelationTypeDirective({
        outputDefinition,
        relationshipTypeDirective,
        config
      });
      let [
        fromType,
        toType,
        propertyInputValues,
        propertyOutputFields,
        relationshipInputTypeMap
      ] = augmentRelationshipTypeFields({
        typeName,
        outputType,
        outputDefinition,
        typeDefinitionMap,
        relationshipTypeDirective,
        config
      });
      [
        fieldType,
        fieldArguments,
        typeDefinitionMap,
        generatedTypeMap,
        nodeInputTypeMap
      ] = augmentRelationshipQueryAPI({
        typeName,
        definition,
        field,
        fieldArguments,
        fieldName,
        outputType,
        relationshipTypeDirective,
        fromType,
        toType,
        typeDefinitionMap,
        typeExtensionDefinitionMap,
        generatedTypeMap,
        nodeInputTypeMap,
        relationshipInputTypeMap,
        config,
        relationshipName,
        fieldType,
        propertyOutputFields
      });
      [
        typeDefinitionMap,
        generatedTypeMap,
        operationTypeMap
      ] = augmentRelationshipMutationAPI({
        typeName,
        fieldName,
        outputType,
        fromType,
        toType,
        relationshipDirective: relationshipTypeDirective,
        relationshipName,
        propertyInputValues,
        propertyOutputFields,
        typeDefinitionMap,
        typeExtensionDefinitionMap,
        generatedTypeMap,
        operationTypeMap,
        config
      });
    }
  }
  return [
    fieldType,
    fieldArguments,
    nodeInputTypeMap,
    typeDefinitionMap,
    generatedTypeMap,
    operationTypeMap
  ];
};

const validateRelationTypeDirective = ({
  outputDefinition,
  relationshipTypeDirective,
  config = {}
}) => {
  if (config.query !== false) {
    const outputTypeName = outputDefinition.name.value;
    const fields = outputDefinition.fields;
    validateRelationTypeNodeField({
      fields,
      fieldName: RelationshipDirectionField.FROM,
      outputTypeName,
      relationshipTypeDirective
    });
    validateRelationTypeNodeField({
      fields,
      fieldName: RelationshipDirectionField.TO,
      outputTypeName,
      relationshipTypeDirective
    });
  }
};

const validateRelationTypeNodeField = ({
  fields = [],
  fieldName = '',
  outputTypeName = '',
  relationshipTypeDirective = {}
}) => {
  let name = getDirectiveArgument({
    directive: relationshipTypeDirective,
    name: fieldName
  });
  if (!name) name = fieldName;
  const fromField = getFieldDefinition({ fields, name });
  if (!fromField) {
    if (name === fieldName) {
      throw new ApolloError(
        `The @relation directive on the ${outputTypeName} type requires either a "${fieldName}" argument value or a "${fieldName}" field definition.`
      );
    } else {
      throw new ApolloError(
        `The '${fieldName}' argument of the @relation directive on the ${outputTypeName} type is "${name}", but a "${name}" field is not defined.`
      );
    }
  }
};

/**
 * Iterates through all field definitions of a relationship type, deciding whether
 * to generate the corresponding field or input value definitions that compose
 * the output and input types used in the Query and Mutation API
 */
const augmentRelationshipTypeFields = ({
  typeName,
  outputType,
  outputDefinition,
  typeDefinitionMap,
  relationshipTypeDirective,
  config
}) => {
  const fields = outputDefinition.fields;
  let fromFieldName = getDirectiveArgument({
    directive: relationshipTypeDirective,
    name: RelationshipDirectionField.FROM
  });
  let fromTypeName = getFieldType({
    fields,
    name: fromFieldName
  });
  if (!fromTypeName) {
    fromTypeName = getFieldType({
      fields,
      name: RelationshipDirectionField.FROM
    });
  }
  let toFieldName = getDirectiveArgument({
    directive: relationshipTypeDirective,
    name: RelationshipDirectionField.TO
  });
  let toTypeName = getFieldType({
    fields,
    name: toFieldName
  });
  if (!toTypeName) {
    toTypeName = getFieldType({
      fields,
      name: RelationshipDirectionField.TO
    });
  }
  let relatedTypeFilterName = `_${typeName}${outputType}Filter`;
  let relatedTypeOrderingName = `_${outputType}Ordering`;
  if (fromTypeName === toTypeName) {
    relatedTypeFilterName = `_${outputType}Filter`;
    relatedTypeOrderingName = `_${outputType}Ordering`;
  }
  let relationshipInputTypeMap = {
    [FilteringArgument.FILTER]: {
      name: relatedTypeFilterName,
      fields: []
    },
    [OrderingArgument.ORDER_BY]: {
      name: relatedTypeOrderingName,
      values: []
    }
  };
  const propertyInputValues = [];
  let propertyOutputFields = fields.reduce((outputFields, field) => {
    const fieldName = field.name.value;
    const fieldDirectives = field.directives;
    if (!isIgnoredField({ directives: fieldDirectives })) {
      const unwrappedType = unwrapNamedType({ type: field.type });
      const outputType = unwrappedType.name;
      const fieldDefinition = typeDefinitionMap[outputType];
      const outputKind = fieldDefinition ? fieldDefinition.kind : '';
      if (
        isPropertyTypeField({
          kind: outputKind,
          type: outputType
        })
      ) {
        const isPrimaryKey = isPrimaryKeyField({ directives: fieldDirectives });
        const isIndex = isIndexedField({ directives: fieldDirectives });
        const isUnique = isUniqueField({ directives: fieldDirectives });
        if (isPrimaryKey)
          throw new ApolloError(
            `The @id directive cannot be used on @relation types.`
          );
        if (isUnique)
          throw new ApolloError(
            `The @unique directive cannot be used on @relation types.`
          );
        if (isIndex)
          throw new ApolloError(
            `The @index directive cannot be used on @relation types.`
          );
        // escapes unescaped double quotes in @cypher statements
        field.directives = augmentDirectives({ directives: fieldDirectives });
        relationshipInputTypeMap = augmentInputTypePropertyFields({
          inputTypeMap: relationshipInputTypeMap,
          field,
          fieldName,
          fieldDirectives,
          outputType,
          outputKind
        });
        if (!isCypherField({ directives: fieldDirectives })) {
          propertyInputValues.push({
            name: fieldName,
            type: unwrappedType,
            directives: fieldDirectives
          });
        }
        outputFields.push(field);
      }
    }
    return outputFields;
  }, []);
  [propertyOutputFields, relationshipInputTypeMap] = buildNeo4jSystemIDField({
    typeName,
    propertyOutputFields,
    nodeInputTypeMap: relationshipInputTypeMap,
    config,
    isRelationship: true
  });
  return [
    fromTypeName,
    toTypeName,
    propertyInputValues,
    propertyOutputFields,
    relationshipInputTypeMap
  ];
};

/**
 * Generates a default value for the name argument
 * of the relation type directive, if none is provided
 */
const decideDefaultRelationshipName = ({
  relationshipTypeDirective,
  outputType,
  relationshipName
}) => {
  if (relationshipTypeDirective && !relationshipName) {
    relationshipName = toSnakeCase(outputType);
  }
  return relationshipName;
};
