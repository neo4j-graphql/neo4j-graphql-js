import { Kind } from 'graphql';
import { TypeWrappers } from './fields';

/**
 * Builds the AST definition for a Name
 */
export const buildName = ({ name = '' }) => ({
  kind: Kind.NAME,
  value: name
});

/**
 * Builds the AST definition for a Document
 */
export const buildDocument = ({ definitions = [] }) => ({
  kind: Kind.DOCUMENT,
  definitions
});

/**
 * Builds the AST definition for a Directive Argument
 */
export const buildDirectiveArgument = ({ name = '', value }) => ({
  kind: Kind.ARGUMENT,
  name,
  value
});

/**
 * Builds the AST definition for a Directive instance
 */
export const buildDirective = ({ name = '', args = [] }) => ({
  kind: Kind.DIRECTIVE,
  name,
  arguments: args
});

/**
 * Builds the AST definition for a type
 */
export const buildNamedType = ({ name = '', wrappers = {} }) => {
  let type = {
    kind: Kind.NAMED_TYPE,
    name: buildName({ name })
  };
  if (wrappers[TypeWrappers.NON_NULL_NAMED_TYPE]) {
    type = {
      kind: Kind.NON_NULL_TYPE,
      type: type
    };
  }
  if (wrappers[TypeWrappers.LIST_TYPE]) {
    type = {
      kind: Kind.LIST_TYPE,
      type: type
    };
  }
  if (wrappers[TypeWrappers.NON_NULL_LIST_TYPE]) {
    type = {
      kind: Kind.NON_NULL_TYPE,
      type: type
    };
  }
  return type;
};

/**
 * Builds the AST definition for a schema type
 */
export const buildSchemaDefinition = ({ operationTypes = [] }) => ({
  kind: Kind.SCHEMA_DEFINITION,
  operationTypes
});

/**
 * Builds the AST definition for an operation type on
 * the schema type
 */
export const buildOperationType = ({ operation = '', type = {} }) => ({
  kind: Kind.OPERATION_TYPE_DEFINITION,
  operation,
  type
});

/**
 * Builds the AST definition for an Object type
 */
export const buildObjectType = ({
  name = '',
  fields = [],
  directives = [],
  description
}) => ({
  kind: Kind.OBJECT_TYPE_DEFINITION,
  name,
  fields,
  directives,
  description
});

/**
 * Builds the AST definition for a Field
 */
export const buildField = ({
  name = '',
  type = {},
  args = [],
  directives = [],
  description
}) => ({
  kind: Kind.FIELD_DEFINITION,
  name,
  type,
  arguments: args,
  directives,
  description
});

/**
 * Builds the AST definition for an Input Value,
 * used for both field arguments and input object types
 */
export const buildInputValue = ({
  name = '',
  type = {},
  directives = [],
  defaultValue,
  description
}) => {
  return {
    kind: Kind.INPUT_VALUE_DEFINITION,
    name,
    type,
    directives,
    defaultValue,
    description
  };
};

/**
 * Builds the AST definition for an Enum type
 */
export const buildEnumType = ({ name = '', values = [], description }) => ({
  kind: Kind.ENUM_TYPE_DEFINITION,
  name,
  values,
  description
});

/**
 * Builds the AST definition for an Enum type value
 */
export const buildEnumValue = ({ name = '', description }) => ({
  kind: Kind.ENUM_VALUE_DEFINITION,
  name,
  description
});

/**
 * Builds the AST definition for an Input Object type
 */
export const buildInputObjectType = ({
  name = '',
  fields = [],
  directives = [],
  description
}) => ({
  kind: Kind.INPUT_OBJECT_TYPE_DEFINITION,
  name,
  fields,
  directives,
  description
});

/**
 * Builds the AST definition for a Directive definition
 */
export const buildDirectiveDefinition = ({
  name = '',
  args = [],
  locations = [],
  description
}) => {
  return {
    kind: Kind.DIRECTIVE_DEFINITION,
    name,
    arguments: args,
    locations,
    description
  };
};
