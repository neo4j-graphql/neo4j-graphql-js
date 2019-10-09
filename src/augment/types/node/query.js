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
import {
  OperationType,
  isQueryTypeDefinition,
  isMutationTypeDefinition,
  isSubscriptionTypeDefinition
} from '../../types/types';
import { TypeWrappers, getFieldDefinition } from '../../fields';
import {
  FilteringArgument,
  PagingArgument,
  OrderingArgument,
  buildQueryFieldArguments,
  buildQueryFilteringInputType,
  buildQueryOrderingEnumType
} from '../../input-values';

const NodeQueryArgument = {
  ...PagingArgument,
  ...OrderingArgument,
  ...FilteringArgument
};

export const augmentNodeTypeFieldInput = ({
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
}) => {
  fieldArguments = augmentNodeQueryArguments({
    definition,
    fieldArguments,
    fieldDirectives,
    outputType,
    outputTypeWrappers,
    config
  });
  nodeInputTypeMap = augmentNodeQueryArgumentTypes({
    typeName,
    definition,
    fieldName,
    outputType,
    outputTypeWrappers,
    relationshipDirective,
    nodeInputTypeMap,
    config
  });
  return [fieldArguments, nodeInputTypeMap];
};

const augmentNodeQueryArguments = ({
  definition,
  fieldArguments,
  fieldDirectives,
  outputType,
  outputTypeWrappers,
  config
}) => {
  const queryTypeNameLower = OperationType.QUERY.toLowerCase();
  if (
    !isMutationTypeDefinition({ definition }) &&
    !isSubscriptionTypeDefinition({ definition }) &&
    shouldAugmentType(config, queryTypeNameLower, outputType)
  ) {
    fieldArguments = buildQueryFieldArguments({
      augmentationMap: NodeQueryArgument,
      fieldArguments,
      fieldDirectives,
      outputType,
      outputTypeWrappers
    });
  }
  return fieldArguments;
};

const augmentNodeQueryArgumentTypes = ({
  typeName,
  definition,
  fieldName,
  outputType,
  outputTypeWrappers,
  relationshipDirective,
  nodeInputTypeMap,
  config
}) => {
  if (relationshipDirective && !isQueryTypeDefinition({ definition })) {
    nodeInputTypeMap[FilteringArgument.FILTER].fields.push(
      ...buildRelationshipFilters({
        typeName,
        fieldName,
        outputType: `_${outputType}Filter`,
        relatedType: outputType,
        outputTypeWrappers,
        config
      })
    );
  }
  return nodeInputTypeMap;
};

export const buildNodeQueryAPI = ({
  typeName,
  propertyInputValues,
  nodeInputTypeMap,
  typeDefinitionMap,
  generatedTypeMap,
  operationTypeMap,
  config
}) => {
  const queryTypeName = OperationType.QUERY;
  const queryTypeNameLower = queryTypeName.toLowerCase();
  const queryType = operationTypeMap[queryTypeName];
  if (shouldAugmentType(config, queryTypeNameLower, typeName)) {
    if (queryType) {
      operationTypeMap = buildNodeQueryField({
        typeName,
        queryType,
        propertyInputValues,
        operationTypeMap,
        config
      });
    }
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
  return [operationTypeMap, generatedTypeMap];
};

const buildNodeQueryField = ({
  typeName,
  queryType,
  propertyInputValues,
  operationTypeMap,
  config
}) => {
  const queryFields = queryType.fields;
  if (
    !getFieldDefinition({
      fields: queryFields,
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
          propertyInputValues
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

const buildNodeQueryArguments = ({ typeName, propertyInputValues }) => {
  // Do not persist type wrappers
  propertyInputValues = propertyInputValues.map(arg =>
    buildInputValue({
      name: buildName({ name: arg.name }),
      type: buildNamedType({
        name: arg.type.name
      })
    })
  );
  if (!propertyInputValues.some(field => field.name.value === '_id')) {
    propertyInputValues.push(
      buildInputValue({
        name: buildName({ name: '_id' }),
        type: buildNamedType({
          name: GraphQLString.name
        })
      })
    );
  }
  propertyInputValues = buildQueryFieldArguments({
    augmentationMap: NodeQueryArgument,
    fieldArguments: propertyInputValues,
    outputType: typeName,
    outputTypeWrappers: {
      [TypeWrappers.LIST_TYPE]: true
    }
  });
  return propertyInputValues;
};

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
