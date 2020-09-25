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
  buildNeo4jSystemIDField,
  getTypeFields
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
  isCypherField,
  isPrimaryKeyField,
  isUniqueField,
  isIndexedField,
  DirectiveDefinition,
  augmentDirectives,
  validateFieldDirectives
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
  isQueryTypeDefinition,
  isUnionTypeDefinition,
  isObjectTypeExtensionDefinition,
  isInterfaceTypeExtensionDefinition
} from '../../types/types';
import { getPrimaryKey } from './selection';
import { ApolloError } from 'apollo-server-errors';
import { Kind } from 'graphql';

/**
 * The main export for the augmentation process of a GraphQL
 * type definition representing a Neo4j node entity
 */
export const augmentNodeType = ({
  typeName,
  definition,
  isObjectType,
  isInterfaceType,
  isUnionType,
  isOperationType,
  isQueryType,
  typeDefinitionMap,
  generatedTypeMap,
  operationTypeMap,
  typeExtensionDefinitionMap,
  config
}) => {
  let nodeInputTypeMap = {};
  let propertyOutputFields = [];
  let propertyInputValues = [];
  let extensionPropertyInputValues = [];
  let extensionNodeInputTypeMap = {};
  if (isObjectType || isInterfaceType || isUnionType) {
    const typeExtensions = typeExtensionDefinitionMap[typeName] || [];
    if (typeExtensions.length) {
      typeExtensionDefinitionMap[typeName] = typeExtensions.map(extension => {
        let isIgnoredType = false;
        const isObjectExtension = isObjectTypeExtensionDefinition({
          definition: extension
        });
        const isInterfaceExtension = isInterfaceTypeExtensionDefinition({
          definition: extension
        });
        if (isObjectExtension || isInterfaceExtension) {
          [
            extensionNodeInputTypeMap,
            propertyOutputFields,
            extensionPropertyInputValues,
            isIgnoredType
          ] = augmentNodeTypeFields({
            typeName,
            definition: extension,
            typeDefinitionMap,
            typeExtensionDefinitionMap,
            generatedTypeMap,
            operationTypeMap,
            nodeInputTypeMap: extensionNodeInputTypeMap,
            propertyInputValues: extensionPropertyInputValues,
            propertyOutputFields,
            config
          });
          if (!isIgnoredType) {
            extension.fields = propertyOutputFields;
          }
        }
        return extension;
      });
    }

    // A type is ignored when all its fields use @neo4j_ignore
    let isIgnoredType = false;
    [
      nodeInputTypeMap,
      propertyOutputFields,
      propertyInputValues,
      isIgnoredType
    ] = augmentNodeTypeFields({
      typeName,
      definition,
      isUnionType,
      isQueryType,
      typeDefinitionMap,
      typeExtensionDefinitionMap,
      generatedTypeMap,
      operationTypeMap,
      nodeInputTypeMap,
      extensionNodeInputTypeMap,
      propertyOutputFields,
      propertyInputValues,
      config
    });

    definition.fields = propertyOutputFields;

    if (extensionPropertyInputValues.length) {
      propertyInputValues.push(...extensionPropertyInputValues);
    }

    if (!isIgnoredType) {
      if (!isOperationType && !isInterfaceType && !isUnionType) {
        [propertyOutputFields, nodeInputTypeMap] = buildNeo4jSystemIDField({
          typeName,
          propertyOutputFields,
          nodeInputTypeMap,
          config
        });
      }
      [
        typeDefinitionMap,
        generatedTypeMap,
        operationTypeMap
      ] = augmentNodeTypeAPI({
        definition,
        isObjectType,
        isInterfaceType,
        isUnionType,
        isOperationType,
        isQueryType,
        typeName,
        propertyOutputFields,
        propertyInputValues,
        nodeInputTypeMap,
        typeDefinitionMap,
        typeExtensionDefinitionMap,
        generatedTypeMap,
        operationTypeMap,
        config
      });
    }
  }
  return [
    definition,
    generatedTypeMap,
    operationTypeMap,
    typeExtensionDefinitionMap
  ];
};

/**
 * Iterates through all field definitions of a node type, deciding whether
 * to generate the corresponding field or input value definitions that compose
 * the output and input types used in the Query and Mutation API
 */
export const augmentNodeTypeFields = ({
  typeName,
  definition,
  isUnionType,
  isQueryType,
  typeDefinitionMap,
  typeExtensionDefinitionMap,
  generatedTypeMap,
  operationTypeMap,
  nodeInputTypeMap = {},
  extensionNodeInputTypeMap,
  propertyOutputFields = [],
  propertyInputValues = [],
  isUnionExtension,
  isObjectExtension,
  isInterfaceExtension,
  config
}) => {
  let isIgnoredType = true;
  let filterTypeName = `_${typeName}Filter`;
  const fields = definition.fields;
  if (!isUnionType && !isUnionExtension) {
    if (!isQueryType) {
      if (!nodeInputTypeMap[FilteringArgument.FILTER]) {
        nodeInputTypeMap[FilteringArgument.FILTER] = {
          name: filterTypeName,
          fields: []
        };
      }
      if (!nodeInputTypeMap[OrderingArgument.ORDER_BY]) {
        nodeInputTypeMap[OrderingArgument.ORDER_BY] = {
          name: `_${typeName}Ordering`,
          values: []
        };
      }
    }
    propertyOutputFields = fields.reduce((outputFields, field) => {
      let fieldType = field.type;
      let fieldArguments = field.arguments;
      const fieldDirectives = field.directives;
      const isIgnored = isIgnoredField({ directives: fieldDirectives });
      if (!isIgnored) {
        isIgnoredType = false;
        const fieldName = field.name.value;
        const unwrappedType = unwrapNamedType({ type: fieldType });
        const outputType = unwrappedType.name;
        const outputDefinition = typeDefinitionMap[outputType];
        const outputKind = outputDefinition ? outputDefinition.kind : '';
        const relationshipDirective = getDirective({
          directives: fieldDirectives,
          name: DirectiveDefinition.RELATION
        });
        // escapes unescaped double quotes in @cypher statements
        field.directives = augmentDirectives({ directives: fieldDirectives });
        validateFieldDirectives({
          fields,
          directives: fieldDirectives
        });
        if (
          !isObjectExtension &&
          !isInterfaceExtension &&
          isPropertyTypeField({
            kind: outputKind,
            type: outputType
          })
        ) {
          nodeInputTypeMap = augmentInputTypePropertyFields({
            inputTypeMap: nodeInputTypeMap,
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
            field,
            outputDefinition,
            fieldArguments,
            fieldDirectives,
            fieldName,
            outputType,
            nodeInputTypeMap,
            typeDefinitionMap,
            typeExtensionDefinitionMap,
            generatedTypeMap,
            operationTypeMap,
            relationshipDirective,
            isObjectExtension,
            isInterfaceExtension,
            config
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
            field,
            fieldType,
            fieldArguments,
            fieldDirectives,
            fieldName,
            outputType,
            outputDefinition,
            nodeInputTypeMap,
            typeDefinitionMap,
            typeExtensionDefinitionMap,
            generatedTypeMap,
            operationTypeMap,
            isObjectExtension,
            isInterfaceExtension,
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
    if (!isObjectExtension && !isInterfaceExtension) {
      if (!isQueryType && extensionNodeInputTypeMap) {
        if (extensionNodeInputTypeMap[FilteringArgument.FILTER]) {
          const extendedFilteringFields =
            extensionNodeInputTypeMap[FilteringArgument.FILTER].fields;
          nodeInputTypeMap[FilteringArgument.FILTER].fields.push(
            ...extendedFilteringFields
          );
        }
        if (extensionNodeInputTypeMap[OrderingArgument.ORDER_BY]) {
          const extendedOrderingValues =
            extensionNodeInputTypeMap[OrderingArgument.ORDER_BY].values;
          nodeInputTypeMap[OrderingArgument.ORDER_BY].values.push(
            ...extendedOrderingValues
          );
        }
      }
    }
  } else {
    isIgnoredType = false;
  }
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
  field,
  outputDefinition,
  fieldArguments,
  fieldDirectives,
  fieldName,
  outputType,
  nodeInputTypeMap,
  typeDefinitionMap,
  typeExtensionDefinitionMap,
  generatedTypeMap,
  operationTypeMap,
  config,
  relationshipDirective
}) => {
  const isPrimaryKey = isPrimaryKeyField({ directives: fieldDirectives });
  const isUnique = isUniqueField({ directives: fieldDirectives });
  const isIndex = isIndexedField({ directives: fieldDirectives });
  if (isPrimaryKey)
    throw new ApolloError(
      `The @id directive cannot be used on @relation fields.`
    );
  if (isUnique)
    throw new ApolloError(
      `The @unique directive cannot be used on @relation fields.`
    );
  if (isIndex)
    throw new ApolloError(
      `The @index directive cannot be used on @relation fields.`
    );
  const isUnionType = isUnionTypeDefinition({ definition: outputDefinition });
  fieldArguments = augmentNodeTypeFieldArguments({
    field,
    fieldArguments,
    fieldDirectives,
    isUnionType,
    outputType,
    typeDefinitionMap,
    config
  });
  if (!isUnionType) {
    if (
      relationshipDirective &&
      !isQueryTypeDefinition({ definition, operationTypeMap })
    ) {
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
      nodeInputTypeMap = augmentNodeQueryArgumentTypes({
        typeName,
        field,
        fieldName,
        outputType,
        nodeInputTypeMap,
        config
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
        typeDefinitionMap,
        typeExtensionDefinitionMap,
        generatedTypeMap,
        operationTypeMap,
        config
      });
    }
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
  isObjectType,
  isInterfaceType,
  isUnionType,
  isOperationType,
  isQueryType,
  propertyInputValues,
  nodeInputTypeMap,
  typeDefinitionMap,
  typeExtensionDefinitionMap,
  generatedTypeMap,
  operationTypeMap,
  config
}) => {
  if (!isUnionType) {
    [operationTypeMap, generatedTypeMap] = augmentNodeMutationAPI({
      definition,
      typeName,
      isInterfaceType,
      propertyInputValues,
      generatedTypeMap,
      operationTypeMap,
      typeExtensionDefinitionMap,
      config
    });
    generatedTypeMap = buildNodeSelectionInputType({
      definition,
      typeName,
      propertyInputValues,
      generatedTypeMap,
      typeExtensionDefinitionMap,
      config
    });
  }
  [operationTypeMap, generatedTypeMap] = augmentNodeQueryAPI({
    typeName,
    isObjectType,
    isInterfaceType,
    isUnionType,
    isOperationType,
    isQueryType,
    propertyInputValues,
    nodeInputTypeMap,
    typeDefinitionMap,
    typeExtensionDefinitionMap,
    generatedTypeMap,
    operationTypeMap,
    config
  });
  return [typeDefinitionMap, generatedTypeMap, operationTypeMap];
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
