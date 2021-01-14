import { GraphQLID, GraphQLString } from 'graphql';
import {
  augmentNodeQueryAPI,
  augmentNodeQueryArgumentTypes,
  augmentNodeTypeFieldArguments
} from './query';
import { augmentNodeMutationAPI } from './mutation';
import { augmentRelationshipTypeField } from '../relationship/relationship';
import { augmentRelationshipMutationAPI } from '../relationship/mutation';
import {
  unwrapNamedType,
  isPropertyTypeField,
  buildNeo4jSystemIDField
} from '../../fields';
import {
  FilteringArgument,
  OrderingArgument,
  augmentInputTypePropertyFields,
  SearchArgument
} from '../../input-values';
import {
  getRelationDirection,
  getRelationName,
  getDirective,
  getDirectiveArgument,
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
  isNodeType,
  isRelationshipType,
  isQueryTypeDefinition,
  isUnionTypeDefinition,
  isObjectTypeExtensionDefinition,
  isInterfaceTypeExtensionDefinition
} from '../../types/types';
import { ApolloError } from 'apollo-server-errors';

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
  let searchInputTypeMap = {};
  let propertyOutputFields = [];
  let propertyInputValues = [];
  let extensionPropertyInputValues = [];
  let extensionNodeInputTypeMap = {};
  // let extensionSearchInputTypeMap = {};
  let searchesType = false;
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
            isIgnoredType,
            searchesType,
            searchInputTypeMap
          ] = augmentNodeTypeFields({
            typeName,
            definition: extension,
            typeDefinitionMap,
            typeExtensionDefinitionMap,
            generatedTypeMap,
            searchInputTypeMap,
            operationTypeMap,
            nodeInputTypeMap: extensionNodeInputTypeMap,
            propertyInputValues: extensionPropertyInputValues,
            propertyOutputFields,
            searchesType,
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
      isIgnoredType,
      searchesType,
      searchInputTypeMap
    ] = augmentNodeTypeFields({
      typeName,
      definition,
      isUnionType,
      isQueryType,
      searchesType,
      typeDefinitionMap,
      typeExtensionDefinitionMap,
      generatedTypeMap,
      operationTypeMap,
      nodeInputTypeMap,
      searchInputTypeMap,
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
        searchesType,
        typeName,
        propertyOutputFields,
        propertyInputValues,
        nodeInputTypeMap,
        searchInputTypeMap,
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
  searchInputTypeMap = {},
  extensionNodeInputTypeMap,
  propertyOutputFields = [],
  propertyInputValues = [],
  isUnionExtension,
  isObjectExtension,
  isInterfaceExtension,
  searchesType,
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
            if (
              outputType === GraphQLID.name ||
              outputType === GraphQLString.name
            ) {
              const searchDirective = getDirective({
                directives: fieldDirectives,
                name: DirectiveDefinition.SEARCH
              });
              if (searchDirective) {
                searchesType = true;
                let indexName = getDirectiveArgument({
                  directive: searchDirective,
                  name: 'index'
                });
                // defult search index name for this node type
                if (!indexName) indexName = `${typeName}Search`;
                searchInputTypeMap[indexName] = true;
              }
            }
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
    isIgnoredType,
    searchesType,
    searchInputTypeMap
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
        relationshipDirective,
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
  searchesType,
  propertyInputValues,
  nodeInputTypeMap,
  searchInputTypeMap,
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
      typeDefinitionMap,
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
    searchesType,
    propertyInputValues,
    nodeInputTypeMap,
    searchInputTypeMap,
    typeDefinitionMap,
    typeExtensionDefinitionMap,
    generatedTypeMap,
    operationTypeMap,
    config
  });
  return [typeDefinitionMap, generatedTypeMap, operationTypeMap];
};
