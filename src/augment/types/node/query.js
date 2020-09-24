import { GraphQLString } from 'graphql';
import { buildRelationshipFilters } from '../relationship/query';
import {
  buildField,
  buildInputValue,
  buildName,
  buildNamedType
} from '../../ast';
import {
  DirectiveDefinition,
  buildAuthScopeDirective,
  useAuthDirective
} from '../../directives';
import { shouldAugmentType } from '../../augment';
import { OperationType } from '../../types/types';
import {
  TypeWrappers,
  getFieldDefinition,
  getTypeExtensionFieldDefinition,
  isNeo4jIDField,
  Neo4jSystemIDField,
  isListTypeField
} from '../../fields';
import {
  FilteringArgument,
  PagingArgument,
  OrderingArgument,
  buildQueryFieldArguments,
  buildQueryFilteringInputType,
  buildQueryOrderingEnumType
} from '../../input-values';

/**
 * An enum describing which arguments are implemented for
 * node type fields in the Query API
 */
const NodeQueryArgument = {
  ...PagingArgument,
  ...OrderingArgument,
  ...FilteringArgument
};

/**
 * Given the results of augmentNodeTypeFields, builds or augments
 * the AST definition of the Query operation field and any
 * generated input or output types required for translation
 */
export const augmentNodeQueryAPI = ({
  typeName,
  isUnionType,
  propertyInputValues,
  nodeInputTypeMap,
  typeDefinitionMap,
  typeExtensionDefinitionMap,
  generatedTypeMap,
  operationTypeMap,
  config
}) => {
  const queryType = operationTypeMap[OperationType.QUERY];
  const queryTypeNameLower = OperationType.QUERY.toLowerCase();
  if (shouldAugmentType(config, queryTypeNameLower, typeName)) {
    if (queryType) {
      operationTypeMap = buildNodeQueryField({
        typeName,
        isUnionType,
        queryType,
        propertyInputValues,
        operationTypeMap,
        typeDefinitionMap,
        typeExtensionDefinitionMap,
        config
      });
    }
    if (!isUnionType) {
      generatedTypeMap = buildQueryOrderingEnumType({
        nodeInputTypeMap,
        typeDefinitionMap,
        generatedTypeMap
      });
      generatedTypeMap = buildQueryFilteringInputType({
        typeName: `_${typeName}Filter`,
        typeDefinitionMap,
        generatedTypeMap,
        inputTypeMap: nodeInputTypeMap
      });
    }
  }
  return [operationTypeMap, generatedTypeMap];
};

/**
 * Builds the AST for the input value definitions used for
 * node type Query field arguments
 */
export const augmentNodeTypeFieldArguments = ({
  field,
  fieldArguments,
  fieldDirectives,
  isUnionType,
  outputType,
  typeDefinitionMap,
  config
}) => {
  const queryTypeNameLower = OperationType.QUERY.toLowerCase();
  if (shouldAugmentType(config, queryTypeNameLower, outputType)) {
    fieldArguments = buildQueryFieldArguments({
      field,
      argumentMap: NodeQueryArgument,
      isUnionType,
      fieldArguments,
      fieldDirectives,
      outputType,
      typeDefinitionMap
    });
  }
  return fieldArguments;
};

/**
 * Given information about a field on a node type, builds the AST
 * for associated input value definitions used by input types
 * generated for the Query API
 */
export const augmentNodeQueryArgumentTypes = ({
  typeName,
  field,
  fieldName,
  outputType,
  nodeInputTypeMap,
  config
}) => {
  const queryTypeNameLower = OperationType.QUERY.toLowerCase();
  if (shouldAugmentType(config, queryTypeNameLower, outputType)) {
    nodeInputTypeMap[FilteringArgument.FILTER].fields.push(
      ...buildRelationshipFilters({
        typeName,
        field,
        fieldName,
        outputType: `_${outputType}Filter`,
        relatedType: outputType,
        config
      })
    );
  }
  return nodeInputTypeMap;
};

/**
 * Builds the AST for the Query type field definition for
 * a given node type
 */
const buildNodeQueryField = ({
  typeName,
  isUnionType,
  queryType,
  propertyInputValues,
  operationTypeMap,
  typeDefinitionMap,
  typeExtensionDefinitionMap,
  config
}) => {
  const queryFields = queryType.fields;
  const queryTypeName = queryType ? queryType.name.value : '';
  const queryTypeExtensions = typeExtensionDefinitionMap[queryTypeName];
  if (
    !getFieldDefinition({
      fields: queryFields,
      name: typeName
    }) &&
    !getTypeExtensionFieldDefinition({
      typeExtensions: queryTypeExtensions,
      name: typeName
    })
  ) {
    queryFields.push(
      buildField({
        name: buildName({ name: typeName }),
        type: buildNamedType({
          name: typeName,
          wrappers: {
            [TypeWrappers.LIST_TYPE]: true
          }
        }),
        args: buildNodeQueryArguments({
          typeName,
          isUnionType,
          propertyInputValues,
          typeDefinitionMap
        }),
        directives: buildNodeQueryDirectives({
          typeName,
          config
        })
      })
    );
  }
  operationTypeMap[OperationType.QUERY].fields = queryFields;
  return operationTypeMap;
};

/**
 * Builds the AST for input value definitions used for the
 * arguments of the Query type field for a given node type
 */
const buildNodeQueryArguments = ({
  typeName,
  isUnionType,
  propertyInputValues,
  typeDefinitionMap
}) => {
  if (!isUnionType) {
    // Do not persist type wrappers
    propertyInputValues = propertyInputValues.map(arg => {
      const isListArgument = arg.type.wrappers[TypeWrappers.LIST_TYPE];
      let wrappers = {};
      if (isListArgument) {
        wrappers = {
          [TypeWrappers.LIST_TYPE]: true
        };
      }
      return buildInputValue({
        name: buildName({ name: arg.name }),
        type: buildNamedType({
          name: arg.type.name,
          wrappers
        })
      });
    });
    const hasNeo4jIDField = propertyInputValues.some(field =>
      isNeo4jIDField({
        name: field.name.value
      })
    );
    if (!hasNeo4jIDField) {
      propertyInputValues.push(
        buildInputValue({
          name: buildName({ name: Neo4jSystemIDField }),
          type: buildNamedType({
            name: GraphQLString.name
          })
        })
      );
    }
  }
  propertyInputValues = buildQueryFieldArguments({
    argumentMap: NodeQueryArgument,
    fieldArguments: propertyInputValues,
    outputType: typeName,
    isListType: true,
    isUnionType,
    typeDefinitionMap
  });
  return propertyInputValues;
};

/**
 * Builds the AST for directive instances on the Query type
 * field for a given node type
 */
const buildNodeQueryDirectives = ({ typeName, config }) => {
  const directives = [];
  if (useAuthDirective(config, DirectiveDefinition.HAS_SCOPE)) {
    directives.push(
      buildAuthScopeDirective({
        scopes: [
          {
            typeName,
            mutation: `Read`
          }
        ]
      })
    );
  }
  return directives;
};
