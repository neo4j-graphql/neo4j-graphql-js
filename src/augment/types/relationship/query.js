import { RelationshipDirectionField } from './relationship';
import { shouldAugmentRelationshipField } from '../../augment';
import {
  OperationType,
  isMutationTypeDefinition,
  isSubscriptionTypeDefinition
} from '../../types/types';
import { TypeWrappers, isListTypeField, unwrapNamedType } from '../../fields';
import {
  FilteringArgument,
  buildFilters,
  buildQueryFieldArguments,
  buildQueryFilteringInputType
} from '../../input-values';
import { buildRelationDirective } from '../../directives';
import {
  buildInputObjectType,
  buildField,
  buildName,
  buildNamedType,
  buildObjectType,
  buildInputValue
} from '../../ast';

const RelationshipQueryArgument = {
  // ...PagingArgument,
  // ...OrderingArgument,
  ...FilteringArgument
};

export const augmentRelationshipQueryAPI = ({
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
}) => {
  const queryTypeNameLower = OperationType.QUERY.toLowerCase();
  if (
    shouldAugmentRelationshipField(config, queryTypeNameLower, fromType, toType)
  ) {
    const relatedType = decideRelatedType({
      typeName,
      fromType,
      toType
    });
    if (
      validateRelationTypeDirectedFields(
        typeName,
        fieldName,
        fromType,
        toType,
        outputType
      )
    ) {
      [fieldType, generatedTypeMap] = augmentRelationshipTypeFieldOutput({
        typeName,
        relatedType,
        fieldArguments,
        fieldName,
        outputType,
        fromType,
        toType,
        generatedTypeMap,
        outputTypeWrappers,
        config,
        relationshipName,
        fieldType,
        propertyOutputFields
      });
      [
        fieldArguments,
        generatedTypeMap,
        nodeInputTypeMap
      ] = augmentRelationshipTypeFieldInput({
        typeName,
        definition,
        relatedType,
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
        config
      });
    }
  }

  return [
    fieldType,
    fieldArguments,
    typeDefinitionMap,
    generatedTypeMap,
    nodeInputTypeMap
  ];
};

const augmentRelationshipTypeFieldInput = ({
  typeName,
  definition,
  relatedType,
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
  config
}) => {
  const nodeFilteringFields = nodeInputTypeMap[FilteringArgument.FILTER].fields;
  let relationshipFilterTypeName = `_${typeName}${outputType[0].toUpperCase() +
    outputType.substr(1)}`;
  // Assume outgoing relationship
  if (fromType === toType) {
    relationshipFilterTypeName = `_${outputType}Directions`;
  }
  nodeFilteringFields.push(
    ...buildRelationshipFilters({
      typeName,
      fieldName,
      outputType: `${relationshipFilterTypeName}Filter`,
      relatedType: outputType,
      outputTypeWrappers,
      config
    })
  );
  [fieldArguments, generatedTypeMap] = augmentRelationshipTypeFieldArguments({
    fieldArguments,
    typeName,
    definition,
    fromType,
    toType,
    outputType,
    relatedType,
    relationshipFilterTypeName,
    outputTypeWrappers,
    typeDefinitionMap,
    generatedTypeMap,
    relationshipInputTypeMap
  });
  return [fieldArguments, generatedTypeMap, nodeInputTypeMap];
};

const augmentRelationshipTypeFieldOutput = ({
  typeName,
  relatedType,
  fieldArguments,
  fieldName,
  outputType,
  fromType,
  toType,
  generatedTypeMap,
  outputTypeWrappers,
  relationshipName,
  fieldType,
  propertyOutputFields
}) => {
  const relationshipOutputName = `_${typeName}${fieldName[0].toUpperCase() +
    fieldName.substr(1)}`;
  const unwrappedType = unwrapNamedType({ type: fieldType });
  if (fromType === toType) {
    // Clear arguments on this field, given their distribution
    fieldType = buildNamedType({
      name: `${relationshipOutputName}Directions`
    });
  } else {
    // Output transform
    unwrappedType.name = relationshipOutputName;
    fieldType = buildNamedType(unwrappedType);
  }
  generatedTypeMap = buildRelationshipFieldOutputTypes({
    outputType,
    fromType,
    toType,
    outputTypeWrappers,
    fieldArguments,
    relationshipOutputName,
    relationshipName,
    relatedType,
    propertyOutputFields,
    generatedTypeMap
  });
  return [fieldType, generatedTypeMap];
};

const augmentRelationshipTypeFieldArguments = ({
  fieldArguments,
  typeName,
  definition,
  fromType,
  toType,
  outputType,
  relatedType,
  relationshipFilterTypeName,
  outputTypeWrappers,
  typeDefinitionMap,
  generatedTypeMap,
  relationshipInputTypeMap
}) => {
  if (
    !isMutationTypeDefinition({ definition }) &&
    !isSubscriptionTypeDefinition({ definition })
  ) {
    if (fromType !== toType) {
      fieldArguments = buildQueryFieldArguments({
        augmentationMap: RelationshipQueryArgument,
        fieldArguments,
        outputType: `${typeName}${outputType}`,
        outputTypeWrappers
      });
    } else {
      fieldArguments = [];
    }
  }
  generatedTypeMap = buildRelationshipSelectionArgumentInputTypes({
    fromType,
    toType,
    relatedType,
    relationshipFilterTypeName,
    generatedTypeMap,
    relationshipInputTypeMap,
    typeDefinitionMap
  });
  return [fieldArguments, generatedTypeMap];
};

export const buildRelationshipFilters = ({
  typeName,
  fieldName,
  outputType,
  relatedType,
  outputTypeWrappers,
  config
}) => {
  let filters = [];
  const queryTypeNameLower = OperationType.QUERY.toLowerCase();
  if (
    shouldAugmentRelationshipField(
      config,
      queryTypeNameLower,
      typeName,
      relatedType
    )
  ) {
    if (isListTypeField({ wrappers: outputTypeWrappers })) {
      filters = buildFilters({
        fieldName,
        fieldConfig: {
          name: fieldName,
          type: {
            name: outputType
          }
        },
        filterTypes: [
          '_not',
          '_in',
          '_not_in',
          '_some',
          '_none',
          '_single',
          '_every'
        ]
      });
    } else {
      filters = buildFilters({
        fieldName,
        fieldConfig: {
          name: fieldName,
          type: {
            name: outputType
          }
        },
        filterTypes: ['_not', '_in', '_not_in']
      });
    }
  }
  return filters;
};

export const buildNodeOutputFields = ({
  fromType,
  toType,
  args = [],
  wrappers = {}
}) => {
  return [
    buildField({
      name: buildName({
        name: RelationshipDirectionField.FROM
      }),
      args,
      type: buildNamedType({
        name: fromType,
        wrappers
      })
    }),
    buildField({
      name: buildName({
        name: RelationshipDirectionField.TO
      }),
      args,
      type: buildNamedType({
        name: toType,
        wrappers
      })
    })
  ];
};

const buildRelationshipFieldOutputTypes = ({
  outputType,
  fromType,
  toType,
  outputTypeWrappers,
  fieldArguments,
  relationshipOutputName,
  relationshipName,
  relatedType,
  propertyOutputFields,
  generatedTypeMap
}) => {
  const relationTypeDirective = buildRelationDirective({
    relationshipName,
    fromType,
    toType
  });
  if (fromType === toType) {
    fieldArguments = buildQueryFieldArguments({
      augmentationMap: RelationshipQueryArgument,
      fieldArguments,
      outputType,
      outputTypeWrappers
    });
    const reflexiveOutputName = `${relationshipOutputName}Directions`;
    generatedTypeMap[reflexiveOutputName] = buildObjectType({
      name: buildName({ name: reflexiveOutputName }),
      fields: buildNodeOutputFields({
        fromType: relationshipOutputName,
        toType: relationshipOutputName,
        args: fieldArguments,
        wrappers: {
          [TypeWrappers.LIST_TYPE]: true
        }
      }),
      directives: [relationTypeDirective]
    });
  }
  generatedTypeMap[relationshipOutputName] = buildObjectType({
    name: buildName({ name: relationshipOutputName }),
    fields: [
      ...propertyOutputFields,
      buildField({
        name: buildName({ name: relatedType }),
        type: buildNamedType({
          name: relatedType
        })
      })
    ],
    directives: [relationTypeDirective]
  });
  return generatedTypeMap;
};

const buildRelationshipSelectionArgumentInputTypes = ({
  fromType,
  toType,
  relatedType,
  relationshipFilterTypeName,
  generatedTypeMap,
  relationshipInputTypeMap,
  typeDefinitionMap
}) => {
  const relationshipFilteringFields =
    relationshipInputTypeMap[FilteringArgument.FILTER].fields;
  const relatedTypeFilterName =
    relationshipInputTypeMap[FilteringArgument.FILTER].name;
  if (fromType === toType) {
    const reflexiveFilteringTypeName = `${relationshipFilterTypeName}Filter`;
    generatedTypeMap[reflexiveFilteringTypeName] = buildInputObjectType({
      name: buildName({
        name: reflexiveFilteringTypeName
      }),
      fields: buildNodeInputFields({
        fromType: relatedTypeFilterName,
        toType: relatedTypeFilterName
      })
    });
  }
  const relatedTypeFilteringField = buildInputValue({
    name: buildName({ name: relatedType }),
    type: buildNamedType({
      name: `_${relatedType}Filter`
    })
  });
  relationshipFilteringFields.push(relatedTypeFilteringField);
  generatedTypeMap = buildQueryFilteringInputType({
    typeName: relatedTypeFilterName,
    typeDefinitionMap,
    generatedTypeMap,
    inputTypeMap: relationshipInputTypeMap
  });
  return generatedTypeMap;
};

const buildNodeInputFields = ({ fromType, toType }) => {
  return [
    buildInputValue({
      name: buildName({
        name: RelationshipDirectionField.FROM
      }),
      type: buildNamedType({
        name: fromType
      })
    }),
    buildInputValue({
      name: buildName({
        name: RelationshipDirectionField.TO
      }),
      type: buildNamedType({
        name: toType
      })
    })
  ];
};

const decideRelatedType = ({ typeName, fromType, toType }) => {
  let relatedType = toType;
  if (fromType !== toType) {
    // Interpret relationship direction
    if (typeName === toType) {
      // Is incoming relationship
      relatedType = fromType;
    }
  }
  return relatedType;
};

const validateRelationTypeDirectedFields = (
  typeName,
  fieldName,
  fromName,
  toName,
  outputType
) => {
  // directive to and from are not the same and neither are equal to this
  if (fromName !== toName && toName !== typeName && fromName !== typeName) {
    throw new Error(
      `The ${fieldName} field on the ${typeName} node type uses the ${outputType} relationship type but ${outputType} comes from ${fromName} and goes to ${toName}`
    );
  }
  return true;
};
