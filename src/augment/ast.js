import { Kind } from 'graphql';
import { TypeWrappers } from './fields';

export const buildName = ({ name = '' }) => ({
  kind: Kind.NAME,
  value: name
});

export const buildDocument = ({ definitions = [] }) => ({
  kind: Kind.DOCUMENT,
  definitions
});

export const buildDirectiveArgument = ({ name = '', value }) => ({
  kind: Kind.ARGUMENT,
  name,
  value
});

export const buildDirective = ({ name = '', args = [] }) => ({
  kind: Kind.DIRECTIVE,
  name,
  arguments: args
});

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

export const buildEnumType = ({ name = '', values = [], description }) => ({
  kind: Kind.ENUM_TYPE_DEFINITION,
  name,
  values,
  description
});

export const buildEnumValue = ({ name = '', description }) => ({
  kind: Kind.ENUM_VALUE_DEFINITION,
  name,
  description
});

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
