import { GraphQLString } from 'graphql';
import { buildNodeQueryAPI, augmentNodeTypeFieldInput } from './query';
import { augmentNodeMutationAPI } from './mutation';
import { augmentRelationshipTypeField } from '../relationship/relationship';
import { augmentRelationshipMutationAPI } from '../relationship/mutation';
import { shouldAugmentType } from '../../augment';
import {
  TypeWrappers,
  unwrapNamedType,
  isPropertyTypeField
} from '../../fields';
import {
  FilteringArgument,
  OrderingArgument,
  augmentInputTypePropertyFields,
  buildPropertyOrderingValues
} from '../../input-values';
import {
  getRelationDirection,
  getRelationName,
  getDirective,
  isIgnoredField,
  DirectiveDefinition
} from '../../directives';
import {
  buildName,
  buildNamedType,
  buildField,
  buildInputObjectType,
  buildInputValue
} from '../../ast';
import {
  OperationType,
  isNodeType,
  isRelationshipType,
  isObjectTypeDefinition,
  isOperationTypeDefinition,
  isQueryTypeDefinition
} from '../../types/types';
import { getPrimaryKey } from '../../../utils';

export const augmentNodeType = ({
  typeName,
  definition,
  typeDefinitionMap,
  generatedTypeMap,
  operationTypeMap,
  config
}) => {
  if (isObjectTypeDefinition({ definition })) {
    let [
      nodeInputTypeMap,
      propertyOutputFields,
      propertyInputValues,
      isIgnoredType
    ] = augmentNodeTypeFields({
      typeName,
      definition,
      typeDefinitionMap,
      generatedTypeMap,
      operationTypeMap,
      config
    });
    if (!isOperationTypeDefinition({ definition }) && !isIgnoredType) {
      [
        propertyOutputFields,
        typeDefinitionMap,
        generatedTypeMap,
        operationTypeMap
      ] = augmentNodeTypeAPI({
        definition,
        typeName,
        propertyOutputFields,
        propertyInputValues,
        nodeInputTypeMap,
        typeDefinitionMap,
        generatedTypeMap,
        operationTypeMap,
        config
      });
    }
    definition.fields = propertyOutputFields;
  }
  return [definition, generatedTypeMap, operationTypeMap];
};

const augmentNodeTypeFields = ({
  typeName,
  definition,
  typeDefinitionMap,
  generatedTypeMap,
  operationTypeMap,
  config
}) => {
  const fields = definition.fields;
  let isIgnoredType = true;
  const propertyInputValues = [];
  let nodeInputTypeMap = {
    [FilteringArgument.FILTER]: {
      name: `_${typeName}Filter`,
      fields: []
    },
    [OrderingArgument.ORDER_BY]: {
      name: `_${typeName}Ordering`,
      values: []
    }
  };
  let propertyOutputFields = fields.reduce((outputFields, field) => {
    let fieldType = field.type;
    let fieldArguments = field.arguments;
    const fieldDirectives = field.directives;
    if (!isIgnoredField({ directives: fieldDirectives })) {
      isIgnoredType = false;
      const fieldName = field.name.value;
      const unwrappedType = unwrapNamedType({ type: fieldType });
      const outputType = unwrappedType.name;
      const outputDefinition = typeDefinitionMap[outputType];
      const outputKind = outputDefinition ? outputDefinition.kind : '';
      const outputTypeWrappers = unwrappedType.wrappers;
      const relationshipDirective = getDirective({
        directives: fieldDirectives,
        name: DirectiveDefinition.RELATION
      });
      if (
        isPropertyTypeField({
          kind: outputKind,
          type: outputType
        })
      ) {
        nodeInputTypeMap = augmentInputTypePropertyFields({
          inputTypeMap: nodeInputTypeMap,
          fieldName,
          fieldDirectives,
          outputType,
          outputKind,
          outputTypeWrappers
        });
        propertyInputValues.push({
          name: fieldName,
          type: unwrappedType,
          directives: fieldDirectives
        });
      } else if (isNodeType({ definition: outputDefinition })) {
        [
          fieldArguments,
          nodeInputTypeMap,
          typeDefinitionMap,
          generatedTypeMap,
          operationTypeMap
        ] = augmentNodeTypeField({
          typeName,
          definition,
          fieldArguments,
          fieldDirectives,
          fieldName,
          outputType,
          nodeInputTypeMap,
          typeDefinitionMap,
          generatedTypeMap,
          operationTypeMap,
          config,
          relationshipDirective,
          outputTypeWrappers
        });
      } else if (isRelationshipType({ definition: outputDefinition })) {
        [
          fieldType,
          fieldArguments,
          nodeInputTypeMap,
          typeDefinitionMap,
          generatedTypeMap,
          operationTypeMap
        ] = augmentRelationshipTypeField({
          typeName,
          definition,
          fieldType,
          fieldArguments,
          fieldDirectives,
          fieldName,
          outputTypeWrappers,
          outputType,
          outputDefinition,
          nodeInputTypeMap,
          typeDefinitionMap,
          generatedTypeMap,
          operationTypeMap,
          config
        });
      }
    }
    outputFields.push({
      ...field,
      type: fieldType,
      arguments: fieldArguments
    });
    return outputFields;
  }, []);
  if (!isOperationTypeDefinition({ definition }) && !isIgnoredType) {
    const queryTypeName = OperationType.QUERY;
    const queryTypeNameLower = queryTypeName.toLowerCase();
    if (shouldAugmentType(config, queryTypeNameLower, typeName)) {
      const neo4jInternalIDConfig = {
        name: '_id',
        type: {
          name: GraphQLString.name
        }
      };
      const systemIDIndex = propertyOutputFields.findIndex(
        e => e.name.value === '_id'
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
      nodeInputTypeMap[OrderingArgument.ORDER_BY].values.push(
        ...buildPropertyOrderingValues({
          fieldName: neo4jInternalIDConfig.name
        })
      );
    }
  }
  return [
    nodeInputTypeMap,
    propertyOutputFields,
    propertyInputValues,
    isIgnoredType
  ];
};

const augmentNodeTypeField = ({
  typeName,
  definition,
  fieldArguments,
  fieldDirectives,
  fieldName,
  outputType,
  nodeInputTypeMap,
  typeDefinitionMap,
  generatedTypeMap,
  operationTypeMap,
  config,
  relationshipDirective,
  outputTypeWrappers
}) => {
  [fieldArguments, nodeInputTypeMap] = augmentNodeTypeFieldInput({
    typeName,
    definition,
    fieldName,
    fieldArguments,
    fieldDirectives,
    outputType,
    config,
    relationshipDirective,
    outputTypeWrappers,
    nodeInputTypeMap
  });
  if (relationshipDirective && !isQueryTypeDefinition({ definition })) {
    const relationshipName = getRelationName(relationshipDirective);
    const relationshipDirection = getRelationDirection(relationshipDirective);
    // Assume direction OUT
    let fromType = typeName;
    let toType = outputType;
    if (relationshipDirection === 'IN') {
      let temp = fromType;
      fromType = outputType;
      toType = temp;
    }
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
      typeDefinitionMap,
      generatedTypeMap,
      operationTypeMap,
      config
    });
  }
  return [
    fieldArguments,
    nodeInputTypeMap,
    typeDefinitionMap,
    generatedTypeMap,
    operationTypeMap
  ];
};

const augmentNodeTypeAPI = ({
  definition,
  typeName,
  propertyOutputFields,
  propertyInputValues,
  nodeInputTypeMap,
  typeDefinitionMap,
  generatedTypeMap,
  operationTypeMap,
  config
}) => {
  [operationTypeMap, generatedTypeMap] = augmentNodeMutationAPI({
    definition,
    typeName,
    propertyInputValues,
    generatedTypeMap,
    operationTypeMap,
    config
  });
  [operationTypeMap, generatedTypeMap] = buildNodeQueryAPI({
    typeName,
    propertyInputValues,
    nodeInputTypeMap,
    typeDefinitionMap,
    generatedTypeMap,
    operationTypeMap,
    config
  });
  generatedTypeMap = buildNodeSelectionInputType({
    definition,
    typeName,
    propertyInputValues,
    generatedTypeMap,
    config
  });
  return [
    propertyOutputFields,
    typeDefinitionMap,
    generatedTypeMap,
    operationTypeMap
  ];
};

const buildNodeSelectionInputType = ({
  definition,
  typeName,
  propertyInputValues,
  generatedTypeMap,
  config
}) => {
  const mutationTypeName = OperationType.QUERY;
  const mutationTypeNameLower = mutationTypeName.toLowerCase();
  if (shouldAugmentType(config, mutationTypeNameLower, typeName)) {
    const primaryKey = getPrimaryKey(definition);
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
