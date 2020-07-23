import { RelationshipDirectionField } from './relationship';
import { shouldAugmentRelationshipField } from '../../augment';
import { OperationType } from '../../types/types';
import { TypeWrappers, isListTypeField, unwrapNamedType } from '../../fields';
import {
  PagingArgument,
  OrderingArgument,
  FilteringArgument,
  buildFilters,
  buildQueryFieldArguments,
  buildQueryFilteringInputType,
  buildQueryOrderingEnumType
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
import { isExternalTypeExtension } from '../../../federation';

/**
 * An enum describing which arguments are implemented for
 * relationship type fields in the Query API
 */
const RelationshipQueryArgument = {
  ...PagingArgument,
  ...OrderingArgument,
  ...FilteringArgument
};

/**
 * Given the results of augmentRelationshipTypeFields, builds or
 * augments the AST definition of the Query operation field and
 * any generated input or output types required for translation
 */
export const augmentRelationshipQueryAPI = ({
  typeName,
  definition,
  fieldArguments,
  fieldName,
  outputType,
  fromType,
  toType,
  typeDefinitionMap,
  typeExtensionDefinitionMap,
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
    const [definingType, isImplementedField] = getTypeDefiningField({
      typeName,
      definition,
      fieldName,
      typeDefinitionMap,
      typeExtensionDefinitionMap
    });
    if (isImplementedField) typeName = definingType;
    const relatedType = decideRelatedType({
      typeName,
      definition,
      fromType,
      toType
    });
    [fieldType, generatedTypeMap] = transformRelationshipTypeFieldOutput({
      typeName,
      relatedType,
      fieldArguments,
      fieldName,
      outputType,
      fromType,
      toType,
      typeDefinitionMap,
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
      relatedType,
      fieldArguments,
      fieldName,
      isImplementedField,
      outputType,
      fromType,
      toType,
      typeDefinitionMap,
      typeExtensionDefinitionMap,
      generatedTypeMap,
      nodeInputTypeMap,
      relationshipInputTypeMap,
      outputTypeWrappers,
      config
    });
  }
  return [
    fieldType,
    fieldArguments,
    typeDefinitionMap,
    generatedTypeMap,
    nodeInputTypeMap
  ];
};

const getTypeDefiningField = ({
  typeName,
  definition,
  fieldName,
  typeDefinitionMap,
  typeExtensionDefinitionMap
}) => {
  const definitionInterfaces = definition.interfaces || [];
  const interfaces = [...definitionInterfaces];
  const typeExtensions = typeExtensionDefinitionMap[typeName] || [];
  typeExtensions.forEach(extension => {
    const extendedImplementations = extension.interfaces;
    if (extendedImplementations && extendedImplementations.length) {
      interfaces.push(...extendedImplementations);
    }
  });
  let definingType = typeName;
  // field is defined by interface implemented by this type
  let isImplementedField = false;
  if (interfaces && interfaces.length) {
    interfaces.forEach(namedType => {
      const unwrappedType = unwrapNamedType({ type: namedType });
      const interfaceName = unwrappedType.name;
      const interfaceTypes = [];
      const typeDefinition = typeDefinitionMap[interfaceName];
      if (typeDefinition) interfaceTypes.push(typeDefinition);
      const interfaceDefinesField = interfaceTypes.some(type =>
        type.fields.some(field => field.name.value === fieldName)
      );
      if (interfaceDefinesField) {
        isImplementedField = true;
        definingType = interfaceName;
      }
    });
  }
  return [definingType, isImplementedField];
};

/**
 * Given a relationship type field, builds the input value
 * definitions for its Query arguments, along with those needed
 * for input types generated to support the same Query API
 * for the given field of the given relationship type
 */
const augmentRelationshipTypeFieldInput = ({
  typeName,
  relatedType,
  fieldArguments,
  fieldName,
  isImplementedField,
  outputType,
  fromType,
  toType,
  typeDefinitionMap,
  typeExtensionDefinitionMap,
  generatedTypeMap,
  nodeInputTypeMap,
  relationshipInputTypeMap,
  outputTypeWrappers,
  config
}) => {
  if (
    !isExternalTypeExtension({
      typeName: fromType,
      typeMap: typeDefinitionMap,
      typeExtensionDefinitionMap
    }) &&
    !isExternalTypeExtension({
      typeName: toType,
      typeMap: typeDefinitionMap,
      typeExtensionDefinitionMap
    })
  ) {
    let relationshipFilterTypeName = `_${typeName}${outputType[0].toUpperCase() +
      outputType.substr(1)}`;
    // Assume outgoing relationship
    if (fromType === toType) {
      relationshipFilterTypeName = `_${outputType}Directions`;
    }
    nodeInputTypeMap[FilteringArgument.FILTER].fields.push(
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
      fromType,
      toType,
      isImplementedField,
      outputType,
      relatedType,
      relationshipFilterTypeName,
      outputTypeWrappers,
      typeDefinitionMap,
      generatedTypeMap,
      relationshipInputTypeMap
    });
  }
  return [fieldArguments, generatedTypeMap, nodeInputTypeMap];
};

/**
 * Builds the AST for the input value definitions used for
 * relationship type Query field arguments
 */
const augmentRelationshipTypeFieldArguments = ({
  fieldArguments,
  typeName,
  fromType,
  toType,
  isImplementedField,
  outputType,
  relatedType,
  relationshipFilterTypeName,
  outputTypeWrappers,
  typeDefinitionMap,
  generatedTypeMap,
  relationshipInputTypeMap
}) => {
  if (fromType !== toType) {
    fieldArguments = buildQueryFieldArguments({
      argumentMap: RelationshipQueryArgument,
      fieldArguments,
      typeName,
      outputType,
      outputTypeWrappers,
      typeDefinitionMap
    });
  } else {
    fieldArguments = [];
  }
  if (!isImplementedField) {
    // If this relationship type field is on an object type implementing an
    // interface that defines it, then the argument input types and output type
    // must be those used on that interface's field definition
    generatedTypeMap = buildRelationshipSelectionArgumentInputTypes({
      fromType,
      toType,
      relatedType,
      relationshipFilterTypeName,
      generatedTypeMap,
      relationshipInputTypeMap,
      typeDefinitionMap
    });
  }
  return [fieldArguments, generatedTypeMap];
};

/**
 * Builds the AST for object type definitions used for transforming
 * a relationship type field on a node type - will likely not be
 * necessary once we allow for dynamically named fields for the
 * 'from' and 'to' node type reference fields on relationship types
 */
const transformRelationshipTypeFieldOutput = ({
  typeName,
  relatedType,
  fieldArguments,
  fieldName,
  outputType,
  fromType,
  toType,
  typeDefinitionMap,
  generatedTypeMap,
  outputTypeWrappers,
  relationshipName,
  fieldType,
  propertyOutputFields
}) => {
  let relationshipOutputName = `_${typeName}${fieldName[0].toUpperCase() +
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
    typeDefinitionMap,
    generatedTypeMap
  });
  return [fieldType, generatedTypeMap];
};

/**
 * Builds the AST definitions that compose the Query filtering input type
 * values for a given relationship field
 */
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
        filterTypes: ['not', 'in', 'not_in', 'some', 'none', 'single', 'every']
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
        filterTypes: ['not', 'in', 'not_in']
      });
    }
  }
  return filters;
};

/**
 * Builds the AST definitions for the incoming and outgoing node type
 * fields of the output object types generated for querying relationship
 * type fields
 */
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

/**
 * Builds the AST definitions for the object types generated
 * for querying relationship type fields on node types
 */
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
  typeDefinitionMap,
  generatedTypeMap
}) => {
  const relationTypeDirective = buildRelationDirective({
    relationshipName,
    fromType,
    toType
  });
  if (fromType === toType) {
    fieldArguments = buildQueryFieldArguments({
      argumentMap: RelationshipQueryArgument,
      fieldArguments,
      outputType,
      outputTypeWrappers,
      typeDefinitionMap
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

/**
 * Given information about a field on a relationship type, builds
 * the AST for associated input value definitions used by input
 * types generated for the Query API
 */
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
  generatedTypeMap = buildQueryOrderingEnumType({
    nodeInputTypeMap: relationshipInputTypeMap,
    typeDefinitionMap,
    generatedTypeMap
  });
  return generatedTypeMap;
};

/**
 * Builds the AST definitions for the input values of the
 * incoming and outgoing nodes, used as relationship mutation
 * field arguments for selecting the related nodes
 */
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

/**
 * Given the name of a type, and the names of the node types
 * of a relationship type, decides which type it is related to
 * (possibly itself)
 */
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
