import { GraphQLID } from 'graphql';
import {
  buildField,
  buildName,
  buildNamedType,
  buildInputValue,
  buildDescription
} from '../../ast';
import {
  DirectiveDefinition,
  buildAuthScopeDirective,
  buildPublishDirective,
  useAuthDirective,
  isCypherField
} from '../../directives';
import {
  getPrimaryKey,
  buildNodeSelectionInputType,
  buildNodeSelectionInputTypes
} from './selection';
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
export const NodeMutation = {
  CREATE: 'Create',
  UPDATE: 'Update',
  DELETE: 'Delete',
  MERGE: 'Merge'
};

const GRANDSTACK_DOCS = `https://grandstack.io/docs`;
const GRANDSTACK_DOCS_SCHEMA_AUGMENTATION = `${GRANDSTACK_DOCS}/graphql-schema-generation-augmentation`;

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
  typeDefinitionMap,
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
  if (config.experimental === true) {
    generatedTypeMap = buildNodeSelectionInputTypes({
      definition,
      typeName,
      propertyInputValues,
      generatedTypeMap,
      typeDefinitionMap,
      typeExtensionDefinitionMap,
      config
    });
  } else {
    generatedTypeMap = buildNodeSelectionInputType({
      definition,
      typeName,
      propertyInputValues,
      generatedTypeMap,
      typeDefinitionMap,
      typeExtensionDefinitionMap,
      config
    });
  }
  return [operationTypeMap, generatedTypeMap];
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

const buildNodeMutationObjectArguments = ({ typeName, operationName = '' }) => {
  const args = [];
  const nodeSelectionConfig = {
    name: 'where',
    type: {
      name: `_${typeName}Where`,
      wrappers: {
        [TypeWrappers.NON_NULL_NAMED_TYPE]: true
      }
    }
  };
  const propertyCreateInputConfig = {
    name: 'data',
    type: {
      name: `_${typeName}Create`,
      wrappers: {
        [TypeWrappers.NON_NULL_NAMED_TYPE]: true
      }
    }
  };
  const propertyUpdateInputConfig = {
    name: 'data',
    type: {
      name: `_${typeName}Update`,
      wrappers: {
        [TypeWrappers.NON_NULL_NAMED_TYPE]: true
      }
    }
  };
  if (operationName === NodeMutation.CREATE) {
    args.push(propertyCreateInputConfig);
  } else if (operationName === NodeMutation.UPDATE) {
    args.push(nodeSelectionConfig);
    args.push(propertyUpdateInputConfig);
  } else if (operationName === NodeMutation.MERGE) {
    const keySelectionInputConfig = {
      name: 'where',
      type: {
        name: `_${typeName}Keys`,
        wrappers: {
          [TypeWrappers.NON_NULL_NAMED_TYPE]: true
        }
      }
    };
    args.push(keySelectionInputConfig);
    args.push(propertyCreateInputConfig);
  } else if (operationName === NodeMutation.DELETE) {
    args.push(nodeSelectionConfig);
  }
  return args.map(arg =>
    buildInputValue({
      name: buildName({ name: arg.name }),
      type: buildNamedType(arg.type)
    })
  );
};

/**
 * Given the results of augmentNodeTypeFields, builds the AST
 * definition for a Mutation operation field of a given
 * NodeMutation name
 */
const buildNodeMutationField = ({
  mutationType,
  mutationAction = '',
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
    let mutationArgs = [];
    if (config.experimental === true) {
      mutationArgs = buildNodeMutationObjectArguments({
        typeName,
        operationName: mutationAction
      });
    } else {
      mutationArgs = buildNodeMutationArguments({
        operationName: mutationAction,
        primaryKey,
        args: propertyInputValues
      });
    }
    const mutationConfig = {
      name: buildName({ name: mutationName }),
      args: mutationArgs,
      type: buildNamedType({
        name: typeName
      }),
      directives: buildNodeMutationDirectives({
        mutationName,
        mutationAction,
        typeName,
        config
      })
    };
    let mutationField = undefined;
    let mutationDescriptionUrl = '';
    if (mutationAction === NodeMutation.CREATE) {
      mutationField = mutationConfig;
      mutationDescriptionUrl =
        '[creating](https://neo4j.com/docs/cypher-manual/4.1/clauses/create/#create-nodes)';
    } else if (mutationAction === NodeMutation.UPDATE) {
      if (primaryKey && mutationConfig.args.length > 1) {
        mutationField = mutationConfig;
        mutationDescriptionUrl =
          '[updating](https://neo4j.com/docs/cypher-manual/4.1/clauses/set/#set-update-a-property)';
      }
    } else if (mutationAction === NodeMutation.MERGE) {
      if (primaryKey) {
        mutationField = mutationConfig;
        mutationDescriptionUrl =
          '[merging](https://neo4j.com/docs/cypher-manual/4.1/clauses/merge/#query-merge-node-derived)';
      }
    } else if (mutationAction === NodeMutation.DELETE) {
      if (primaryKey) {
        mutationField = mutationConfig;
        mutationDescriptionUrl =
          '[deleting](https://neo4j.com/docs/cypher-manual/4.1/clauses/delete/#delete-delete-single-node)';
      }
    }
    if (mutationField) {
      mutationField.description = buildDescription({
        value: `[Generated mutation](${GRANDSTACK_DOCS_SCHEMA_AUGMENTATION}/#${mutationAction.toLowerCase()}) for ${mutationDescriptionUrl} a ${typeName} node.`,
        config
      });
      mutationFields.push(buildField(mutationField));
    }
    operationTypeMap[OperationType.MUTATION].fields = mutationFields;
  }
  return operationTypeMap;
};

/**
 * Builds the AST definitions for directive instances used by
 * generated node Mutation fields of NodeMutation names
 */
const buildNodeMutationDirectives = ({
  mutationName,
  mutationAction,
  typeName,
  config
}) => {
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
  if (shouldAugmentType(config, 'subscription', typeName)) {
    directives.push(
      buildPublishDirective({
        mutationName,
        config
      })
    );
  }
  return directives;
};
