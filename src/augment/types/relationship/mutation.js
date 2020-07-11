import { RelationshipDirectionField } from './relationship';
import { buildNodeOutputFields } from './query';
import { shouldAugmentRelationshipField } from '../../augment';
import { OperationType } from '../../types/types';
import { TypeWrappers, getFieldDefinition } from '../../fields';
import {
  DirectiveDefinition,
  buildAuthScopeDirective,
  buildMutationMetaDirective,
  buildRelationDirective,
  useAuthDirective,
  getDirective,
  isCypherField
} from '../../directives';
import {
  buildInputValue,
  buildName,
  buildNamedType,
  buildField,
  buildObjectType,
  buildInputObjectType
} from '../../ast';
import { getPrimaryKey } from '../../../utils';
import { isExternalTypeExtension } from '../../../federation';

/**
 * An enum describing the names of relationship mutations,
 * for node and relationship type fields (field and type
 * relation directive)
 */
const RelationshipMutation = {
  CREATE: 'Add',
  DELETE: 'Remove',
  UPDATE: 'Update',
  MERGE: 'Merge'
};

/**
 * Given the results of augmentRelationshipTypeFields, builds or
 * augments the AST definitions of the Mutation operation fields
 * and any generated input or output types required for translation
 */
export const augmentRelationshipMutationAPI = ({
  typeName,
  fieldName,
  outputType,
  fromType,
  toType,
  relationshipName,
  propertyInputValues = [],
  propertyOutputFields = [],
  typeDefinitionMap,
  typeExtensionDefinitionMap,
  generatedTypeMap,
  operationTypeMap,
  config
}) => {
  const mutationTypeName = OperationType.MUTATION;
  const mutationType = operationTypeMap[mutationTypeName];
  const mutationTypeNameLower = mutationTypeName.toLowerCase();
  if (
    mutationType &&
    shouldAugmentRelationshipField(
      config,
      mutationTypeNameLower,
      fromType,
      toType
    )
  ) {
    Object.values(RelationshipMutation).forEach(mutationAction => {
      const mutationName = buildRelationshipMutationName({
        mutationAction,
        typeName,
        fieldName
      });
      const [
        fromTypeDefinition,
        isFromServiceType
      ] = getRelatedNodeTypeDefinition({
        typeName: fromType,
        typeDefinitionMap,
        typeExtensionDefinitionMap
      });
      const [toTypeDefinition, isToServiceType] = getRelatedNodeTypeDefinition({
        typeName: toType,
        typeDefinitionMap,
        typeExtensionDefinitionMap
      });
      const fromTypePk = getPrimaryKey(fromTypeDefinition);
      const toTypePk = getPrimaryKey(toTypeDefinition);
      if (
        !getFieldDefinition({
          fields: mutationType.fields,
          name: mutationName
        }) &&
        // Only generate mutation API for given relationship if both related
        // nodes have a primary key
        fromTypePk &&
        toTypePk
      ) {
        [operationTypeMap, generatedTypeMap] = buildRelationshipMutationAPI({
          mutationAction,
          mutationName,
          relationshipName,
          fromType,
          toType,
          propertyInputValues,
          propertyOutputFields,
          outputType,
          generatedTypeMap,
          operationTypeMap,
          isFromServiceType,
          isToServiceType,
          config
        });
      }
    });
  }
  return [typeDefinitionMap, generatedTypeMap, operationTypeMap];
};

const getRelatedNodeTypeDefinition = ({
  typeName = '',
  typeDefinitionMap = {},
  typeExtensionDefinitionMap = {}
}) => {
  let definition = {};
  let isServiceType = false;
  if (
    isExternalTypeExtension({
      typeName,
      typeMap: typeDefinitionMap,
      typeExtensionDefinitionMap
    })
  ) {
    const typeExtensions = typeExtensionDefinitionMap[typeName];
    if (typeExtensions && typeExtensions.length) {
      definition = typeExtensions[0];
      isServiceType = true;
    }
  } else {
    definition = typeDefinitionMap[typeName];
  }
  return [definition, isServiceType];
};

/**
 * Builds the AST for the input value definitions used as
 * field arguments on relationship mutations for selecting
 * the related nodes
 */
const buildNodeSelectionArguments = ({ fromType, toType }) => {
  return [
    buildInputValue({
      name: buildName({
        name: RelationshipDirectionField.FROM
      }),
      type: buildNamedType({
        name: `_${fromType}Input`,
        wrappers: {
          [TypeWrappers.NON_NULL_NAMED_TYPE]: true
        }
      })
    }),
    buildInputValue({
      name: buildName({
        name: RelationshipDirectionField.TO
      }),
      type: buildNamedType({
        name: `_${toType}Input`,
        wrappers: {
          [TypeWrappers.NON_NULL_NAMED_TYPE]: true
        }
      })
    })
  ];
};

/**
 * Builds the AST definitions decided and configured in
 * augmentRelationshipMutationAPI
 */
const buildRelationshipMutationAPI = ({
  mutationAction,
  mutationName,
  relationshipName,
  fromType,
  toType,
  propertyInputValues,
  propertyOutputFields,
  outputType,
  generatedTypeMap,
  operationTypeMap,
  isFromServiceType,
  isToServiceType,
  config
}) => {
  if (!isFromServiceType && !isToServiceType) {
    const mutationOutputType = `_${mutationName}Payload`;
    operationTypeMap = buildRelationshipMutationField({
      mutationAction,
      mutationName,
      relationshipName,
      fromType,
      toType,
      propertyInputValues,
      propertyOutputFields,
      mutationOutputType,
      outputType,
      operationTypeMap,
      config
    });
    generatedTypeMap = buildRelationshipMutationPropertyInputType({
      mutationAction,
      outputType,
      propertyInputValues,
      generatedTypeMap
    });
    generatedTypeMap = buildRelationshipMutationOutputType({
      mutationAction,
      mutationOutputType,
      propertyInputValues,
      propertyOutputFields,
      relationshipName,
      fromType,
      toType,
      generatedTypeMap
    });
  }
  return [operationTypeMap, generatedTypeMap];
};

/**
 * Builds the AST definition for a Mutation operation field
 * of a given RelationshipMutation name
 */
const buildRelationshipMutationField = ({
  mutationAction,
  mutationName,
  relationshipName,
  fromType,
  toType,
  propertyInputValues,
  propertyOutputFields,
  mutationOutputType,
  outputType,
  operationTypeMap,
  config
}) => {
  if (
    mutationAction === RelationshipMutation.CREATE ||
    mutationAction === RelationshipMutation.DELETE ||
    (mutationAction === RelationshipMutation.UPDATE &&
      propertyInputValues.length) ||
    mutationAction === RelationshipMutation.MERGE
  ) {
    operationTypeMap[OperationType.MUTATION].fields.push(
      buildField({
        name: buildName({
          name: mutationName
        }),
        type: buildNamedType({
          name: mutationOutputType
        }),
        args: buildRelationshipMutationArguments({
          mutationAction,
          fromType,
          toType,
          propertyOutputFields,
          outputType
        }),
        directives: buildRelationshipMutationDirectives({
          mutationAction,
          relationshipName,
          fromType,
          toType,
          config
        })
      })
    );
  }
  return operationTypeMap;
};

/**
 * Given the use of a relationship type field, builds the AST
 * for the input value definition of the 'data' argument for its 'Add'
 * relationship mutation field, which inputs a generated input object
 * type for providing relationship properties
 */
const buildRelationshipPropertyInputArgument = ({ outputType }) => {
  return buildInputValue({
    name: buildName({ name: 'data' }),
    type: buildNamedType({
      name: `_${outputType}Input`,
      wrappers: {
        [TypeWrappers.NON_NULL_NAMED_TYPE]: true
      }
    })
  });
};

/**
 * Builds the AST for the relationship type property input
 * object definition, used as the type of the 'data' input value
 * definition built by buildRelationshipPropertyInputArgument
 */
const buildRelationshipMutationPropertyInputType = ({
  mutationAction,
  outputType,
  propertyInputValues,
  generatedTypeMap
}) => {
  if (
    (mutationAction === RelationshipMutation.CREATE ||
      mutationAction === RelationshipMutation.UPDATE ||
      mutationAction === RelationshipMutation.MERGE) &&
    propertyInputValues.length
  ) {
    let nonComputedPropertyInputFields = propertyInputValues.filter(field => {
      const cypherDirective = getDirective({
        directives: field.directives,
        name: DirectiveDefinition.CYPHER
      });
      return !cypherDirective;
    });
    const inputTypeName = `_${outputType}Input`;
    generatedTypeMap[inputTypeName] = buildInputObjectType({
      name: buildName({ name: inputTypeName }),
      fields: nonComputedPropertyInputFields.map(inputValue =>
        buildInputValue({
          name: buildName({ name: inputValue.name }),
          type: buildNamedType(inputValue.type)
        })
      )
    });
  }
  return generatedTypeMap;
};

/**
 * Builds the AST for the input value definitions used as arguments on
 * generated relationship Mutation fields of RelationshipMutation names
 */
const buildRelationshipMutationArguments = ({
  mutationAction,
  fromType,
  toType,
  propertyOutputFields,
  outputType
}) => {
  const fieldArguments = buildNodeSelectionArguments({ fromType, toType });
  if (
    (mutationAction === RelationshipMutation.CREATE ||
      mutationAction === RelationshipMutation.UPDATE ||
      mutationAction === RelationshipMutation.MERGE) &&
    propertyOutputFields.length
  ) {
    fieldArguments.push(
      buildRelationshipPropertyInputArgument({
        outputType
      })
    );
  }
  return fieldArguments;
};

/**
 * Builds the AST definitions for directive instances used by
 * generated relationship Mutation fields of RelationshipMutation
 * names
 */
const buildRelationshipMutationDirectives = ({
  mutationAction,
  relationshipName,
  fromType,
  toType,
  config
}) => {
  const mutationMetaDirective = buildMutationMetaDirective({
    relationshipName,
    fromType,
    toType
  });
  const directives = [mutationMetaDirective];
  if (useAuthDirective(config, DirectiveDefinition.HAS_SCOPE)) {
    let authAction = '';
    if (mutationAction === RelationshipMutation.CREATE) {
      authAction = 'Create';
    } else if (mutationAction === RelationshipMutation.DELETE) {
      authAction = 'Delete';
    } else if (mutationAction === RelationshipMutation.UPDATE) {
      authAction = 'Update';
    } else if (mutationAction === RelationshipMutation.MERGE) {
      authAction = 'Merge';
    }
    if (authAction) {
      directives.push(
        buildAuthScopeDirective({
          scopes: [
            {
              typeName: fromType,
              mutation: authAction
            },
            {
              typeName: toType,
              mutation: authAction
            }
          ]
        })
      );
    }
  }
  return directives;
};

/**
 * Builds the AST for the object type definition used for the
 * output type of relationship type Mutation fields
 */
const buildRelationshipMutationOutputType = ({
  mutationAction,
  mutationOutputType,
  propertyInputValues,
  propertyOutputFields,
  relationshipName,
  fromType,
  toType,
  generatedTypeMap
}) => {
  if (
    mutationAction === RelationshipMutation.CREATE ||
    mutationAction === RelationshipMutation.DELETE ||
    mutationAction === RelationshipMutation.MERGE ||
    (mutationAction === RelationshipMutation.UPDATE &&
      propertyInputValues.length)
  ) {
    const relationTypeDirective = buildRelationDirective({
      relationshipName,
      fromType,
      toType
    });
    let fields = buildNodeOutputFields({ fromType, toType });
    if (
      mutationAction === RelationshipMutation.CREATE ||
      mutationAction === RelationshipMutation.UPDATE ||
      mutationAction === RelationshipMutation.MERGE
    ) {
      // TODO temporary block on cypher field arguments - needs translation test
      const mutationOutputFields = propertyOutputFields.map(field => {
        if (isCypherField({ directives: field.directives })) {
          return {
            ...field,
            arguments: []
          };
        } else return field;
      });
      fields.push(...mutationOutputFields);
    }
    // Overwrite
    generatedTypeMap[mutationOutputType] = buildObjectType({
      name: buildName({ name: mutationOutputType }),
      fields,
      directives: [relationTypeDirective]
    });
  }
  return generatedTypeMap;
};

/**
 * Builds the full name value for a relationship mutation field
 */
const buildRelationshipMutationName = ({
  mutationAction,
  typeName,
  fieldName
}) =>
  `${mutationAction}${typeName}${fieldName[0].toUpperCase() +
    fieldName.substr(1)}`;
