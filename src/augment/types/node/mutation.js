import { GraphQLID } from 'graphql';
import {
  buildField,
  buildName,
  buildNamedType,
  buildInputValue
} from '../../ast';
import {
  DirectiveDefinition,
  buildAuthScopeDirective,
  useAuthDirective,
  isCypherField
} from '../../directives';
import { getPrimaryKey } from './selection';
import { shouldAugmentType } from '../../augment';
import { OperationType } from '../../types/types';
import {
  TypeWrappers,
  getFieldDefinition,
  isNeo4jIDField,
  getTypeExtensionFieldDefinition,
  getTypeFields
} from '../../fields';

/**
 * An enum describing the names of node type mutations
 */
const NodeMutation = {
  CREATE: 'Create',
  UPDATE: 'Update',
  DELETE: 'Delete',
  MERGE: 'Merge'
};

/**
 * Given the results of augmentNodeTypeFields, builds or augments
 * the AST definitions of the Mutation operation fields and any
 * generated input or output types required for translation
 */
export const augmentNodeMutationAPI = ({
  definition,
  typeName,
  isInterfaceType,
  propertyInputValues,
  generatedTypeMap,
  operationTypeMap,
  typeExtensionDefinitionMap,
  config
}) => {
  const fields = getTypeFields({
    typeName,
    definition,
    typeExtensionDefinitionMap
  });
  const primaryKey = getPrimaryKey({ fields });
  const mutationTypeName = OperationType.MUTATION;
  const mutationType = operationTypeMap[mutationTypeName];
  const mutationTypeNameLower = mutationTypeName.toLowerCase();
  if (
    mutationType &&
    shouldAugmentType(config, mutationTypeNameLower, typeName) &&
    !isInterfaceType
  ) {
    Object.values(NodeMutation).forEach(mutationAction => {
      operationTypeMap = buildNodeMutationField({
        mutationType,
        mutationAction,
        primaryKey,
        typeName,
        propertyInputValues,
        operationTypeMap,
        typeExtensionDefinitionMap,
        config
      });
    });
  }
  return [operationTypeMap, generatedTypeMap];
};

/**
 * Given the results of augmentNodeTypeFields, builds the AST
 * definition for a Mutation operation field of a given
 * NodeMutation name
 */
const buildNodeMutationField = ({
  mutationType,
  mutationAction,
  primaryKey,
  typeName,
  propertyInputValues,
  operationTypeMap,
  typeExtensionDefinitionMap,
  config
}) => {
  const mutationFields = mutationType.fields;
  const mutationName = `${mutationAction}${typeName}`;
  const mutationTypeName = mutationType ? mutationType.name.value : '';
  const mutationTypeExtensions = typeExtensionDefinitionMap[mutationTypeName];
  if (
    !getFieldDefinition({
      fields: mutationFields,
      name: mutationName
    }) &&
    !getTypeExtensionFieldDefinition({
      typeExtensions: mutationTypeExtensions,
      name: typeName
    })
  ) {
    const mutationField = {
      name: buildName({ name: mutationName }),
      args: buildNodeMutationArguments({
        operationName: mutationAction,
        primaryKey,
        args: propertyInputValues
      }),
      type: buildNamedType({
        name: typeName
      }),
      directives: buildNodeMutationDirectives({
        mutationAction,
        typeName,
        config
      })
    };
    if (mutationAction === NodeMutation.CREATE) {
      mutationFields.push(buildField(mutationField));
    } else if (mutationAction === NodeMutation.UPDATE) {
      if (primaryKey && mutationField.args.length > 1) {
        mutationFields.push(buildField(mutationField));
      }
    } else if (mutationAction === NodeMutation.MERGE) {
      if (primaryKey) {
        mutationFields.push(buildField(mutationField));
      }
    } else if (mutationAction === NodeMutation.DELETE) {
      if (primaryKey) {
        mutationFields.push(buildField(mutationField));
      }
    }
    operationTypeMap[OperationType.MUTATION].fields = mutationFields;
  }
  return operationTypeMap;
};

/**
 * Builds the AST for the input value definitions used as arguments
 * on generated node Mutation fields of NodeMutation names
 */
const buildNodeMutationArguments = ({
  operationName = '',
  primaryKey,
  args = []
}) => {
  const primaryKeyName = primaryKey ? primaryKey.name.value : '';
  args = args.reduce((args, field) => {
    const name = field.name;
    const directives = field.directives;
    if (!isNeo4jIDField({ name }) && !isCypherField({ directives })) {
      const type = field.type;
      if (operationName === NodeMutation.CREATE) {
        // Uses primary key and any other property field
        if (primaryKeyName === name) {
          if (type.name === GraphQLID.name) {
            // Create auto-generates ID primary keys
            args.push({
              name,
              type: {
                name: type.name
              }
            });
          } else {
            args.push({
              name,
              type: {
                name: type.name,
                wrappers: type.wrappers
              }
            });
          }
        } else {
          args.push({
            name,
            type
          });
        }
      } else if (
        operationName === NodeMutation.UPDATE ||
        operationName === NodeMutation.MERGE
      ) {
        // Uses primary key and any other property field
        if (primaryKeyName === name) {
          // Require primary key otherwise
          args.push({
            name,
            type: {
              name: type.name,
              wrappers: {
                [TypeWrappers.NON_NULL_NAMED_TYPE]: true
              }
            }
          });
        } else {
          // Persist list type wrapper
          args.push({
            name,
            type: {
              name: type.name,
              wrappers: {
                [TypeWrappers.LIST_TYPE]: type.wrappers[TypeWrappers.LIST_TYPE]
              }
            }
          });
        }
      } else if (operationName === NodeMutation.DELETE) {
        // Only uses primary key
        if (primaryKeyName === name) {
          // Require primary key otherwise
          args.push({
            name,
            type: {
              name: type.name,
              wrappers: {
                [TypeWrappers.NON_NULL_NAMED_TYPE]: true
              }
            }
          });
        }
      }
    }
    return args;
  }, []);
  return args.map(arg =>
    buildInputValue({
      name: buildName({ name: arg.name }),
      type: buildNamedType(arg.type)
    })
  );
};

/**
 * Builds the AST definitions for directive instances used by
 * generated node Mutation fields of NodeMutation names
 */
const buildNodeMutationDirectives = ({ mutationAction, typeName, config }) => {
  const directives = [];
  if (useAuthDirective(config, DirectiveDefinition.HAS_SCOPE)) {
    directives.push(
      buildAuthScopeDirective({
        scopes: [
          {
            typeName,
            mutation: mutationAction
          }
        ]
      })
    );
  }
  return directives;
};
