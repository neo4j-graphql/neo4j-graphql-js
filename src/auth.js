// Initial support for checking auth
import {
  IsAuthenticatedDirective,
  HasRoleDirective,
  HasScopeDirective
} from 'graphql-auth-directives';
/*
 *  Check is context.req.error or context.error
 *  have been defined.
 */
export const checkRequestError = context => {
  if (context && context.req && context.req.error) {
    return context.req.error;
  } else if (context && context.error) {
    return context.error;
  } else {
    return false;
  }
};

const shouldAddAuthDirective = (config, authDirective) => {
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

export const addAuthDirectiveImplementations = (
  schemaDirectives,
  typeMap,
  config
) => {
  if (shouldAddAuthDirective(config, 'isAuthenticated')) {
    schemaDirectives['isAuthenticated'] = IsAuthenticatedDirective;
  }
  if (shouldAddAuthDirective(config, 'hasRole')) {
    getRoleType(typeMap); // ensure Role enum specified in typedefs
    schemaDirectives['hasRole'] = HasRoleDirective;
  }
  if (shouldAddAuthDirective(config, 'hasScope')) {
    schemaDirectives['hasScope'] = HasScopeDirective;
  }
  return schemaDirectives;
};

const getRoleType = typeMap => {
  const roleType = typeMap['Role'];
  if (!roleType) {
    throw new Error(
      `A Role enum type is required for the @hasRole auth directive.`
    );
  }
  return roleType;
};
