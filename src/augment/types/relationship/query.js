import { Kind } from 'graphql';
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
import { getDirectiveArgument, DirectiveDefinition } from '../../directives';
import {
  buildInputObjectType,
  buildField,
  buildName,
  buildDirective,
  buildDirectiveArgument,
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
  relationshipTypeDirective,
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
    const [
      relatedTypeFieldName,
      relatedType,
      relationDirection
    ] = decideRelatedType({
      typeName,
      relationshipTypeDirective,
      fromType,
      toType
    });
    [fieldType, generatedTypeMap] = transformRelationshipTypeFieldOutput({
      typeName,
      field,
      relatedType,
      relatedTypeFieldName,
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
      relationshipTypeDirective,
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
      relationshipTypeDirective,
      relatedType,
      relatedTypeFieldName,
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
  fieldName,
  typeName,
  relationshipTypeDirective,
  relatedType,
  relatedTypeFieldName,
  fieldArguments,
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
      fieldName,
      fieldArguments,
      relationshipTypeDirective,
      relatedTypeFieldName,
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
  fieldName,
  relationshipTypeDirective,
  relatedTypeFieldName,
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
      field,
      fieldName,
      fromType,
      toType,
      relatedType,
      relationshipTypeDirective,
      relatedTypeFieldName,
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
  relatedTypeFieldName,
  fieldArguments,
  fieldName,
  outputType,
  fromType,
  toType,
  typeDefinitionMap,
  generatedTypeMap,
  relationshipName,
  relationDirection,
  relationshipTypeDirective,
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
    relationshipTypeDirective,
    relatedType,
    relatedTypeFieldName,
    propertyOutputFields,
    typeDefinitionMap,
    generatedTypeMap,
    config
  });
  return [fieldType, generatedTypeMap];
};

export const isRelationshipMutationOutputType = ({ schemaType = {} }) => {
  const typeName = schemaType.name || '';
  return typeName.startsWith('_') && typeName.endsWith('Payload');
};

export const isReflexiveRelationshipOutputType = ({ schemaType = {} }) => {
  const typeName = schemaType.name || '';
  return typeName.startsWith('_') && typeName.endsWith('Directions');
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
 * Builds a relation directive for generated relationship output types
 */
export const buildQueryRelationDirective = ({
  relationshipDirective,
  relationshipName,
  fromType,
  toType
}) => {
  const fromFieldName = fromType;
  const toFieldName = toType;
  return buildDirective({
    name: buildName({ name: DirectiveDefinition.RELATION }),
    args: [
      buildDirectiveArgument({
        name: buildName({ name: 'name' }),
        value: {
          kind: Kind.STRING,
          value: relationshipName
        }
      }),
      buildDirectiveArgument({
        name: buildName({ name: RelationshipDirectionField.FROM }),
        value: {
          kind: Kind.STRING,
          value: fromFieldName
        }
      }),
      buildDirectiveArgument({
        name: buildName({ name: RelationshipDirectionField.TO }),
        value: {
          kind: Kind.STRING,
          value: toFieldName
        }
      })
    ]
  });
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
  relatedTypeFieldName,
  relationDirection,
  relationshipTypeDirective,
  propertyOutputFields,
  typeDefinitionMap,
  generatedTypeMap,
  config
}) => {
  // Try to get a provided field name for the .from argument
  if (fromType === toType) {
    let fromFieldName = getDirectiveArgument({
      directive: relationshipTypeDirective,
      name: RelationshipDirectionField.FROM
    });
    let toFieldName = getDirectiveArgument({
      directive: relationshipTypeDirective,
      name: RelationshipDirectionField.TO
    });
    // Set defaults
    if (!fromFieldName) fromFieldName = RelationshipDirectionField.FROM;
    if (!toFieldName) toFieldName = RelationshipDirectionField.TO;
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
          name: fromFieldName
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
          name: toFieldName
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
      directives: [
        buildDirective({
          name: buildName({ name: DirectiveDefinition.RELATION }),
          args: [
            buildDirectiveArgument({
              name: buildName({ name: 'name' }),
              value: {
                kind: Kind.STRING,
                value: relationshipName
              }
            }),
            buildDirectiveArgument({
              name: buildName({ name: RelationshipDirectionField.FROM }),
              value: {
                kind: Kind.STRING,
                value: fromType
              }
            }),
            buildDirectiveArgument({
              name: buildName({ name: RelationshipDirectionField.TO }),
              value: {
                kind: Kind.STRING,
                value: toType
              }
            })
          ]
        })
      ]
    });
    relatedTypeFieldName = relatedType;
  }
  let descriptionValue = `Field for the ${toType} node this ${relationshipName} [relationship](${GRANDSTACK_DOCS_RELATIONSHIP_TYPE_QUERY}) is going to.`;
  if (relationDirection === 'IN') {
    descriptionValue = `Field for the ${fromType} node this ${relationshipName} [relationship](${GRANDSTACK_DOCS_RELATIONSHIP_TYPE_QUERY}) is coming from.`;
  }
  const fromFieldName = fromType;
  const toFieldName = toType;

  generatedTypeMap[relationshipOutputName] = buildObjectType({
    name: buildName({ name: relationshipOutputName }),
    fields: [
      ...propertyOutputFields,
      buildField({
        name: buildName({ name: relatedTypeFieldName }),
        type: buildNamedType({
          name: relatedType
        }),
        description: buildDescription({
          value: descriptionValue,
          config
        })
      })
    ],
    directives: [
      buildDirective({
        name: buildName({ name: DirectiveDefinition.RELATION }),
        args: [
          buildDirectiveArgument({
            name: buildName({ name: 'name' }),
            value: {
              kind: Kind.STRING,
              value: relationshipName
            }
          }),
          buildDirectiveArgument({
            name: buildName({ name: RelationshipDirectionField.FROM }),
            value: {
              kind: Kind.STRING,
              value: fromFieldName
            }
          }),
          buildDirectiveArgument({
            name: buildName({ name: RelationshipDirectionField.TO }),
            value: {
              kind: Kind.STRING,
              value: toFieldName
            }
          })
        ]
      })
    ]
  });
  return generatedTypeMap;
};

/**
 * Given information about a field on a relationship type, builds
 * the AST for associated input value definitions used by input
 * types generated for the Query API
 */
const buildRelationshipSelectionArgumentInputTypes = ({
  field,
  fieldName,
  fromType,
  toType,
  relatedType,
  relationshipTypeDirective,
  relatedTypeFieldName,
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
    let fromFieldName = getDirectiveArgument({
      directive: relationshipTypeDirective,
      name: RelationshipDirectionField.FROM
    });
    let toFieldName = getDirectiveArgument({
      directive: relationshipTypeDirective,
      name: RelationshipDirectionField.TO
    });
    if (!fromFieldName) fromFieldName = RelationshipDirectionField.FROM;
    if (!toFieldName) toFieldName = RelationshipDirectionField.TO;
    const nodeSelectionArguments = [
      buildInputValue({
        name: buildName({
          name: fromFieldName
        }),
        type: buildNamedType({
          name: relatedTypeFilterName
        })
      }),
      buildInputValue({
        name: buildName({
          name: toFieldName
        }),
        type: buildNamedType({
          name: relatedTypeFilterName
        })
      })
    ];
    generatedTypeMap[reflexiveFilteringTypeName] = buildInputObjectType({
      name: buildName({
        name: reflexiveFilteringTypeName
      }),
      fields: nodeSelectionArguments
    });
    relationshipFilteringFields.push(
      buildInputValue({
        name: buildName({ name: relatedType }),
        type: buildNamedType({
          name: `_${relatedType}Filter`
        })
      })
    );
  } else {
    relationshipFilteringFields.push(
      buildInputValue({
        name: buildName({ name: relatedTypeFieldName }),
        type: buildNamedType({
          name: `_${relatedType}Filter`
        })
      })
    );
  }
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
 * Given the name of a type, and the names of the node types
 * of a relationship type, decides which type it is related to
 * (possibly itself)
 */
export const decideRelatedType = ({
  typeName,
  relationshipTypeDirective,
  fromType,
  toType
}) => {
  let relatedType = toType;
  let relationDirection = 'OUT';
  let directedNodeFieldName = RelationshipDirectionField.TO;
  if (fromType !== toType) {
    // Interpret relationship direction
    if (typeName === toType) {
      // Is incoming relationship
      relatedType = fromType;
      relationDirection = 'IN';
      directedNodeFieldName = RelationshipDirectionField.FROM;
    }
  }
  // Try getting a custom directive argument for directedNodeFieldName
  let relatedTypeFieldName = getDirectiveArgument({
    directive: relationshipTypeDirective,
    name: directedNodeFieldName
  });
  // If one is not provided, use the transformed default
  if (!relatedTypeFieldName) relatedTypeFieldName = relatedType;
  return [relatedTypeFieldName, relatedType, relationDirection];
};
