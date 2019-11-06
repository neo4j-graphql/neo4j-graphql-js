import {
  augmentNodeQueryAPI,
  augmentNodeQueryArgumentTypes,
  augmentNodeTypeFieldArguments
} from './query';
import { augmentNodeMutationAPI } from './mutation';
import { augmentRelationshipTypeField } from '../relationship/relationship';
import { augmentRelationshipMutationAPI } from '../relationship/mutation';
import { shouldAugmentType } from '../../augment';
import {
  TypeWrappers,
  unwrapNamedType,
  isPropertyTypeField,
  buildNeo4jSystemIDField
} from '../../fields';
import {
  FilteringArgument,
  OrderingArgument,
  augmentInputTypePropertyFields
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

/**
 * The main export for the augmentation process of a GraphQL
 * type definition representing a Neo4j node entity
 */
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
    // A type is ignored when all its fields use @neo4j_ignore
    if (!isIgnoredType) {
      if (!isOperationTypeDefinition({ definition, operationTypeMap })) {
        [propertyOutputFields, nodeInputTypeMap] = buildNeo4jSystemIDField({
          definition,
          typeName,
          propertyOutputFields,
          operationTypeMap,
          nodeInputTypeMap,
          config
        });
      }
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
      definition.fields = propertyOutputFields;
    }
  }
  return [definition, generatedTypeMap, operationTypeMap];
};

/**
 * Iterates through all field definitions of a node type, deciding whether
 * to generate the corresponding field or input value definitions that compose
 * the output and input types used in the Query and Mutation API
 */
export const augmentNodeTypeFields = ({
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
  return [
    nodeInputTypeMap,
    propertyOutputFields,
    propertyInputValues,
    isIgnoredType
  ];
};

/**
 * Builds the Query API field arguments and relationship field mutation
 * API for a node type field
 */
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
  fieldArguments = augmentNodeTypeFieldArguments({
    fieldArguments,
    fieldDirectives,
    outputType,
    outputTypeWrappers,
    config
  });
  if (
    relationshipDirective &&
    !isQueryTypeDefinition({ definition, operationTypeMap })
  ) {
    nodeInputTypeMap = augmentNodeQueryArgumentTypes({
      typeName,
      fieldName,
      outputType,
      outputTypeWrappers,
      nodeInputTypeMap,
      config
    });
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

/**
 * Uses the results of augmentNodeTypeFields to build the AST definitions
 * used to in supporting the Query and Mutation API of a node type
 */
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
  [operationTypeMap, generatedTypeMap] = augmentNodeQueryAPI({
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

/**
 * Builds the AST definition of the node input object type used
 * by relationship mutations for selecting the nodes of the
 * relationship
 */

const buildNodeSelectionInputType = ({
  definition,
  typeName,
  propertyInputValues,
  generatedTypeMap,
  config
}) => {
  const mutationTypeName = OperationType.MUTATION;
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
