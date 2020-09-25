import { Kind, DirectiveLocation, GraphQLString } from 'graphql';
import { TypeWrappers } from './fields';
import {
  buildDirectiveDefinition,
  buildInputValue,
  buildNamedType,
  buildEnumType,
  buildEnumValue,
  buildDirectiveArgument,
  buildDirective,
  buildName
} from './ast';
import { ApolloError } from 'apollo-server-errors';

/**
 * An enum describing the names of directive definitions and instances
 * used by this integration
 */
export const DirectiveDefinition = {
  CYPHER: 'cypher',
  RELATION: 'relation',
  MUTATION_META: 'MutationMeta',
  NEO4J_IGNORE: 'neo4j_ignore',
  IS_AUTHENTICATED: 'isAuthenticated',
  HAS_ROLE: 'hasRole',
  HAS_SCOPE: 'hasScope',
  ADDITIONAL_LABELS: 'additionalLabels',
  ID: 'id',
  UNIQUE: 'unique',
  INDEX: 'index'
};

// The name of Role type used in authorization logic
const ROLE_TYPE = 'Role';

/**
 * Enum for the names of directed fields on relationship types
 */
const RelationshipDirectionField = {
  FROM: 'from',
  TO: 'to'
};

export const isCypherField = ({ directives = [] }) =>
  getDirective({
    directives,
    name: DirectiveDefinition.CYPHER
  });

export const isIgnoredField = ({ directives = [] }) =>
  getDirective({
    directives,
    name: DirectiveDefinition.NEO4J_IGNORE
  });

export const isRelationField = ({ directives = [] }) =>
  getDirective({
    directives,
    name: DirectiveDefinition.RELATION
  });

export const isPrimaryKeyField = ({ directives = [] }) =>
  getDirective({
    directives,
    name: DirectiveDefinition.ID
  });

export const isUniqueField = ({ directives = [] }) =>
  getDirective({
    directives,
    name: DirectiveDefinition.UNIQUE
  });

export const isIndexedField = ({ directives = [] }) =>
  getDirective({
    directives,
    name: DirectiveDefinition.INDEX
  });

export const validateFieldDirectives = ({ fields = [], directives = [] }) => {
  const primaryKeyFields = fields.filter(field =>
    isPrimaryKeyField({
      directives: field.directives
    })
  );
  if (primaryKeyFields.length > 1)
    throw new ApolloError(
      `The @id directive can only be used once per node type.`
    );
  const isPrimaryKey = isPrimaryKeyField({ directives });
  const isUnique = isUniqueField({ directives });
  const isIndex = isIndexedField({ directives });
  const isComputed = isCypherField({ directives });
  if (isComputed) {
    if (isPrimaryKey)
      throw new ApolloError(
        `The @id directive cannot be used with the @cypher directive because computed fields are not stored as properties.`
      );
    if (isUnique)
      throw new ApolloError(
        `The @unique directive cannot be used with the @cypher directive because computed fields are not stored as properties.`
      );
    if (isIndex)
      throw new ApolloError(
        `The @index directive cannot used with the @cypher directive because computed fields are not stored as properties.`
      );
  }
  if (isPrimaryKey && isUnique)
    throw new ApolloError(
      `The @id and @unique directive combined are redunant. The @id directive already sets a unique property constraint and an index.`
    );
  if (isPrimaryKey && isIndex)
    throw new ApolloError(
      `The @id and @index directive combined are redundant. The @id directive already sets a unique property constraint and an index.`
    );
  if (isUnique && isIndex)
    throw new ApolloError(
      `The @unique and @index directive combined are redunant. The @unique directive sets both a unique property constraint and an index.`
    );
};

/**
 * The main export for augmenting directive definitions
 */
export const augmentDirectiveDefinitions = ({
  typeDefinitionMap = {},
  directiveDefinitionMap = {},
  config = {}
}) => {
  // For each directive definition used by the integration
  Object.entries({
    ...directiveDefinitionBuilderMap,
    ...AuthDirectiveDefinitionMap
  }).forEach(([name, buildDefinition]) => {
    // If directive definition not provided
    if (!directiveDefinitionMap[name]) {
      // Try to build a config object for building the definition
      // AST node for this directive
      const astNodeConfig = buildDefinition({ typeDefinitionMap, config });
      if (astNodeConfig) {
        if (astNodeConfig.args) {
          astNodeConfig.args = astNodeConfig.args.map(arg =>
            buildInputValue({
              name: buildName({ name: arg.name }),
              type: buildNamedType(arg.type)
            })
          );
        }
        // Build and map a new AST node for this directive
        directiveDefinitionMap[name] = buildDirectiveDefinition({
          name: buildName({ name }),
          args: astNodeConfig.args,
          locations: astNodeConfig.locations.map(name => buildName({ name }))
        });
      }
    }
  });
  const relationshipDirectionEnumName = '_RelationDirections';
  typeDefinitionMap[relationshipDirectionEnumName] = buildEnumType({
    name: buildName({ name: relationshipDirectionEnumName }),
    values: [
      buildEnumValue({
        name: buildName({ name: 'IN' })
      }),
      buildEnumValue({
        name: buildName({ name: 'OUT' })
      })
    ]
  });
  return [typeDefinitionMap, directiveDefinitionMap];
};

/**
 * Builds a relation directive for generated relationship output types
 */
export const buildRelationDirective = ({
  relationshipName,
  fromType,
  toType
}) =>
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
  });

/**
 * Builds a MutationMeta directive for translating relationship mutations
 */
export const buildMutationMetaDirective = ({
  relationshipName,
  fromType,
  toType
}) =>
  buildDirective({
    name: buildName({ name: DirectiveDefinition.MUTATION_META }),
    args: [
      buildDirectiveArgument({
        name: buildName({ name: 'relationship' }),
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
  });

/**
 * Builds the hasScope directive used in API authorization logic
 */
export const buildAuthScopeDirective = ({ scopes = [] }) =>
  buildDirective({
    name: buildName({ name: DirectiveDefinition.HAS_SCOPE }),
    args: [
      buildDirectiveArgument({
        name: buildName({ name: 'scopes' }),
        value: {
          kind: Kind.LIST,
          values: scopes.flatMap(scope => [
            {
              kind: Kind.STRING,
              value: `${scope.typeName}: ${scope.mutation}`
            },
            {
              kind: Kind.STRING,
              value: `${scope.mutation}:${scope.typeName}`.toLowerCase()
            }
          ])
        }
      })
    ]
  });

/**
 * A map of the AST configurations for directive definitions
 * used in API authorization logic
 */
const AuthDirectiveDefinitionMap = {
  [DirectiveDefinition.IS_AUTHENTICATED]: ({ config }) => {
    if (useAuthDirective(config, DirectiveDefinition.IS_AUTHENTICATED)) {
      return {
        name: DirectiveDefinition.IS_AUTHENTICATED,
        locations: [
          DirectiveLocation.OBJECT,
          DirectiveLocation.FIELD_DEFINITION
        ]
      };
    }
  },
  [DirectiveDefinition.HAS_ROLE]: ({ typeDefinitionMap, config }) => {
    if (useAuthDirective(config, DirectiveDefinition.HAS_ROLE)) {
      const roleEnumType = typeDefinitionMap[ROLE_TYPE];
      if (!roleEnumType)
        throw new Error(
          `A Role enum type is required for the @hasRole auth directive.`
        );
      if (roleEnumType && roleEnumType.kind !== Kind.ENUM_TYPE_DEFINITION)
        throw new Error(`The Role type must be an Enum type`);
      return {
        name: DirectiveDefinition.HAS_ROLE,
        args: [
          {
            name: 'roles',
            type: {
              name: ROLE_TYPE,
              wrappers: {
                [TypeWrappers.LIST_TYPE]: true
              }
            }
          }
        ],
        locations: [
          DirectiveLocation.OBJECT,
          DirectiveLocation.FIELD_DEFINITION
        ]
      };
    }
  },
  [DirectiveDefinition.HAS_SCOPE]: ({ config }) => {
    if (useAuthDirective(config, DirectiveDefinition.HAS_SCOPE)) {
      return {
        name: DirectiveDefinition.HAS_SCOPE,
        args: [
          {
            name: 'scopes',
            type: {
              name: GraphQLString,
              wrappers: {
                [TypeWrappers.LIST_TYPE]: true
              }
            }
          }
        ],
        locations: [
          DirectiveLocation.OBJECT,
          DirectiveLocation.FIELD_DEFINITION
        ]
      };
    }
  }
};

/**
 * Map of AST configs for ASTNodeBuilder
 */
const directiveDefinitionBuilderMap = {
  [DirectiveDefinition.CYPHER]: ({ config }) => {
    return {
      name: DirectiveDefinition.CYPHER,
      args: [
        {
          name: 'statement',
          type: {
            name: GraphQLString
          }
        }
      ],
      locations: [DirectiveLocation.FIELD_DEFINITION]
    };
  },
  [DirectiveDefinition.RELATION]: ({ config }) => {
    return {
      name: DirectiveDefinition.RELATION,
      args: [
        {
          name: 'name',
          type: {
            name: GraphQLString
          }
        },
        {
          name: 'direction',
          type: {
            name: '_RelationDirections'
          }
        },
        {
          name: RelationshipDirectionField.FROM,
          type: {
            name: GraphQLString
          }
        },
        {
          name: RelationshipDirectionField.TO,
          type: {
            name: GraphQLString
          }
        }
      ],
      locations: [DirectiveLocation.FIELD_DEFINITION, DirectiveLocation.OBJECT]
    };
  },
  [DirectiveDefinition.ADDITIONAL_LABELS]: ({ config }) => {
    return {
      name: DirectiveDefinition.ADDITIONAL_LABELS,
      args: [
        {
          name: 'labels',
          type: {
            name: GraphQLString,
            wrappers: {
              [TypeWrappers.LIST_TYPE]: true
            }
          }
        }
      ],
      locations: [DirectiveLocation.OBJECT]
    };
  },
  [DirectiveDefinition.MUTATION_META]: ({ config }) => {
    return {
      name: DirectiveDefinition.MUTATION_META,
      args: [
        {
          name: 'relationship',
          type: {
            name: GraphQLString
          }
        },
        {
          name: RelationshipDirectionField.FROM,
          type: {
            name: GraphQLString
          }
        },
        {
          name: RelationshipDirectionField.TO,
          type: {
            name: GraphQLString
          }
        }
      ],
      locations: [DirectiveLocation.FIELD_DEFINITION]
    };
  },
  [DirectiveDefinition.NEO4J_IGNORE]: ({ config }) => {
    return {
      name: DirectiveDefinition.NEO4J_IGNORE,
      locations: [DirectiveLocation.FIELD_DEFINITION]
    };
  },
  [DirectiveDefinition.ID]: ({ config }) => {
    return {
      name: DirectiveDefinition.ID,
      locations: [DirectiveLocation.FIELD_DEFINITION]
    };
  },
  [DirectiveDefinition.UNIQUE]: ({ config }) => {
    return {
      name: DirectiveDefinition.UNIQUE,
      locations: [DirectiveLocation.FIELD_DEFINITION]
    };
  },
  [DirectiveDefinition.INDEX]: ({ config }) => {
    return {
      name: DirectiveDefinition.INDEX,
      locations: [DirectiveLocation.FIELD_DEFINITION]
    };
  }
};

/**
 * Predicate function for deciding whether to a given directive
 */
export const useAuthDirective = (config, authDirective) => {
  if (config && typeof config === 'object') {
    return (
      config.auth === true ||
      (config &&
        typeof config.auth === 'object' &&
        config.auth[authDirective] === true)
    );
  }
  return false;
};

/**
 * Gets the direction argument of the relation field directive
 */
export const getRelationDirection = relationDirective => {
  let direction = {};
  try {
    direction = relationDirective.arguments.filter(
      a => a.name.value === 'direction'
    )[0];
    return direction.value.value;
  } catch (e) {
    // FIXME: should we ignore this error to define default behavior?
    throw new Error('No direction argument specified on @relation directive');
  }
};

/**
 * Gets the name argument of a relation directive
 */
export const getRelationName = relationDirective => {
  let name = {};
  try {
    name = relationDirective.arguments.filter(a => a.name.value === 'name')[0];
    return name.value.value;
  } catch (e) {
    // FIXME: should we ignore this error to define default behavior?
    throw new Error('No name argument specified on @relation directive');
  }
};

/**
 * Gets a directive instance of a given name
 */
export const getDirective = ({ directives, name }) => {
  return directives.find(directive => directive.name.value === name);
};

/**
 * Gets an argument of a directive
 */
export const getDirectiveArgument = ({ directive, name }) => {
  let value = '';
  const arg = directive.arguments.find(
    arg => arg.name && arg.name.value === name
  );
  if (arg) {
    value = arg.value.value;
  }
  return value;
};

export const augmentDirectives = ({ directives = [] }) => {
  let cypherDirective = getDirective({
    directives,
    name: DirectiveDefinition.CYPHER
  });
  if (cypherDirective) {
    cypherDirective = escapeCypherStatement({
      directive: cypherDirective
    });
  }
  return directives;
};

const escapeCypherStatement = ({ directive }) => {
  const arg = directive.arguments.find(arg => arg.name.value === 'statement');
  if (arg) {
    const value = arg.value;
    if (value && value.kind === Kind.STRING && value.block) {
      // Negative lookbehind assertion regex
      const unescapedDoubleQuotes = /(?<!\\)"/g;
      const escaped = value.value.replace(unescapedDoubleQuotes, '\\"');
      arg.value.value = escaped;
    }
  }
  return directive;
};
