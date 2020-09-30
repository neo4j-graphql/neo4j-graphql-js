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
  buildInputValue,
  buildDescription
} from '../../ast';
import { isExternalTypeExtension } from '../../../federation';

const GRANDSTACK_DOCS = `https://grandstack.io/docs`;
const GRANDSTACK_DOCS_RELATIONSHIP_TYPE_QUERY = `${GRANDSTACK_DOCS}/graphql-relationship-types`;

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
  field,
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
    const [relatedType, relationDirection] = decideRelatedType({
      typeName,
      definition,
      fromType,
      toType
    });
    [fieldType, generatedTypeMap] = transformRelationshipTypeFieldOutput({
      typeName,
      field,
      relatedType,
      fieldArguments,
      fieldName,
      outputType,
      fromType,
      toType,
      typeDefinitionMap,
      generatedTypeMap,
      config,
      relationshipName,
      relationDirection,
      fieldType,
      propertyOutputFields,
      config
    });
    [
      fieldArguments,
      generatedTypeMap,
      nodeInputTypeMap
    ] = augmentRelationshipTypeFieldInput({
      typeName,
      definition,
      field,
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
  field,
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
        field,
        fieldName,
        outputType: `${relationshipFilterTypeName}Filter`,
        relatedType: outputType,
        config
      })
    );
    [fieldArguments, generatedTypeMap] = augmentRelationshipTypeFieldArguments({
      field,
      fieldArguments,
      typeName,
      fromType,
      toType,
      isImplementedField,
      outputType,
      relatedType,
      relationshipFilterTypeName,
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
  field,
  typeName,
  fromType,
  toType,
  isImplementedField,
  outputType,
  relatedType,
  relationshipFilterTypeName,
  typeDefinitionMap,
  generatedTypeMap,
  relationshipInputTypeMap
}) => {
  if (fromType !== toType) {
    fieldArguments = buildQueryFieldArguments({
      field,
      argumentMap: RelationshipQueryArgument,
      fieldArguments,
      typeName,
      outputType,
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
  field,
  relatedType,
  fieldArguments,
  fieldName,
  outputType,
  fromType,
  toType,
  typeDefinitionMap,
  generatedTypeMap,
  relationshipName,
  relationDirection,
  fieldType,
  propertyOutputFields,
  config
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
    field,
    outputType,
    fromType,
    toType,
    fieldArguments,
    relationshipOutputName,
    relationshipName,
    relationDirection,
    relatedType,
    propertyOutputFields,
    typeDefinitionMap,
    generatedTypeMap,
    config
  });
  return [fieldType, generatedTypeMap];
};

/**
 * Builds the AST definitions that compose the Query filtering input type
 * values for a given relationship field
 */
export const buildRelationshipFilters = ({
  typeName,
  field,
  fieldName,
  outputType,
  relatedType,
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
    if (isListTypeField({ field })) {
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
 * Builds the AST definitions for the object types generated
 * for querying relationship type fields on node types
 */
const buildRelationshipFieldOutputTypes = ({
  field,
  outputType,
  fromType,
  toType,
  fieldArguments,
  relationshipOutputName,
  relationshipName,
  relatedType,
  relationDirection,
  propertyOutputFields,
  typeDefinitionMap,
  generatedTypeMap,
  config
}) => {
  const relationTypeDirective = buildRelationDirective({
    relationshipName,
    fromType,
    toType
  });
  if (fromType === toType) {
    fieldArguments = buildQueryFieldArguments({
      field,
      argumentMap: RelationshipQueryArgument,
      fieldArguments,
      outputType,
      typeDefinitionMap
    });
    const reflexiveOutputName = `${relationshipOutputName}Directions`;
    const nodeOutputFields = [
      buildField({
        name: buildName({
          name: RelationshipDirectionField.FROM
        }),
        args: fieldArguments,
        type: buildNamedType({
          name: relationshipOutputName,
          wrappers: {
            [TypeWrappers.LIST_TYPE]: true
          }
        }),
        description: buildDescription({
          value: `Field for the ${fromType} node this ${relationshipName} [relationship](${GRANDSTACK_DOCS_RELATIONSHIP_TYPE_QUERY}) is coming from.`,
          config
        })
      }),
      buildField({
        name: buildName({
          name: RelationshipDirectionField.TO
        }),
        args: fieldArguments,
        type: buildNamedType({
          name: relationshipOutputName,
          wrappers: {
            [TypeWrappers.LIST_TYPE]: true
          }
        }),
        description: buildDescription({
          value: `Field for the ${toType} node this ${relationshipName} [relationship](${GRANDSTACK_DOCS_RELATIONSHIP_TYPE_QUERY}) is going to.`,
          config
        })
      })
    ];
    generatedTypeMap[reflexiveOutputName] = buildObjectType({
      name: buildName({ name: reflexiveOutputName }),
      fields: nodeOutputFields,
      directives: [relationTypeDirective]
    });
  }
  let descriptionValue = `Field for the ${toType} node this ${relationshipName} [relationship](${GRANDSTACK_DOCS_RELATIONSHIP_TYPE_QUERY}) is going to.`;
  if (relationDirection === 'IN') {
    descriptionValue = `Field for the ${fromType} node this ${relationshipName} [relationship](${GRANDSTACK_DOCS_RELATIONSHIP_TYPE_QUERY}) is coming from.`;
  }
  generatedTypeMap[relationshipOutputName] = buildObjectType({
    name: buildName({ name: relationshipOutputName }),
    fields: [
      ...propertyOutputFields,
      buildField({
        name: buildName({ name: relatedType }),
        type: buildNamedType({
          name: relatedType
        }),
        description: buildDescription({
          value: descriptionValue,
          config
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
  let relationDirection = 'OUT';
  if (fromType !== toType) {
    // Interpret relationship direction
    if (typeName === toType) {
      // Is incoming relationship
      relatedType = fromType;
      relationDirection = 'IN';
    }
  }
  return [relatedType, relationDirection];
};
