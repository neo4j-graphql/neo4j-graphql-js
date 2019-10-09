import { augmentRelationshipQueryAPI } from './query';
import { augmentRelationshipMutationAPI } from './mutation';
import {
  unwrapNamedType,
  isPropertyTypeField,
  getFieldType,
  toSnakeCase
} from '../../fields';
import {
  FilteringArgument,
  augmentInputTypePropertyFields
} from '../../input-values';
import {
  DirectiveDefinition,
  getDirective,
  isIgnoredField,
  isCypherField,
  getDirectiveArgument
} from '../../directives';
import { isOperationTypeDefinition } from '../../types/types';

export const RelationshipDirectionField = {
  FROM: 'from',
  TO: 'to'
};

export const augmentRelationshipTypeField = ({
  typeName,
  definition,
  fieldType,
  fieldArguments,
  fieldDirectives,
  fieldName,
  outputDefinition,
  nodeInputTypeMap,
  typeDefinitionMap,
  generatedTypeMap,
  operationTypeMap,
  outputType,
  config,
  outputTypeWrappers
}) => {
  if (!isOperationTypeDefinition({ definition })) {
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
        fieldArguments,
        fieldName,
        outputType,
        fromType,
        toType,
        typeDefinitionMap,
        generatedTypeMap,
        nodeInputTypeMap,
        relationshipInputTypeMap,
        outputTypeWrappers,
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
        relationshipName,
        propertyInputValues,
        propertyOutputFields,
        typeDefinitionMap,
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

const augmentRelationshipTypeFields = ({
  typeName,
  outputType,
  outputDefinition,
  typeDefinitionMap,
  config
}) => {
  const fields = outputDefinition.fields;
  const fromTypeName = getFieldType({
    fields,
    name: RelationshipDirectionField.FROM
  });
  const toTypeName = getFieldType({
    fields,
    name: RelationshipDirectionField.TO
  });
  let relatedTypeFilterName = `_${typeName}${outputType}Filter`;
  if (fromTypeName === toTypeName) {
    relatedTypeFilterName = `_${outputType}Filter`;
  }
  let relationshipInputTypeMap = {
    [FilteringArgument.FILTER]: {
      name: relatedTypeFilterName,
      fields: []
    }
  };
  const propertyInputValues = [];
  const propertyOutputFields = fields.reduce((outputFields, field) => {
    const fieldName = field.name.value;
    const fieldDirectives = field.directives;
    if (!isIgnoredField({ directives: fieldDirectives })) {
      const unwrappedType = unwrapNamedType({ type: field.type });
      const outputType = unwrappedType.name;
      const outputTypeWrappers = unwrappedType.wrappers;
      const fieldDefinition = typeDefinitionMap[outputType];
      const outputKind = fieldDefinition ? fieldDefinition.kind : '';
      if (
        isPropertyTypeField({
          kind: outputKind,
          type: outputType
        })
      ) {
        relationshipInputTypeMap = augmentInputTypePropertyFields({
          inputTypeMap: relationshipInputTypeMap,
          fieldName,
          fieldDirectives,
          outputType,
          outputKind,
          outputTypeWrappers,
          config
        });
        propertyInputValues.push({
          name: fieldName,
          type: unwrappedType,
          directives: fieldDirectives
        });
        outputFields.push(field);
      }
    }
    return outputFields;
  }, []);
  return [
    fromTypeName,
    toTypeName,
    propertyInputValues,
    propertyOutputFields,
    relationshipInputTypeMap
  ];
};

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
