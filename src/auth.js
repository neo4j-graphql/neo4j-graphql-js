// Initial support for checking auth
import { parse } from 'graphql';
import {
  IsAuthenticatedDirective,
  HasRoleDirective,
  HasScopeDirective
} from 'graphql-auth-directives';
import { parseDirectiveSdl } from './utils';
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

export const shouldAddAuthDirective = (config, authDirective) => {
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

export const possiblyAddDirectiveDeclarations = (typeMap, config) => {
  if (shouldAddAuthDirective(config, 'isAuthenticated')) {
    typeMap['isAuthenticated'] = parse(
      `directive @isAuthenticated on OBJECT | FIELD_DEFINITION`
    ).definitions[0];
  }
  if (shouldAddAuthDirective(config, 'hasRole')) {
    getRoleType(typeMap); // ensure Role enum is specified in typedefs
    typeMap['hasRole'] = parse(
      `directive @hasRole(roles: [Role]) on OBJECT | FIELD_DEFINITION`
    ).definitions[0];
  }
  if (shouldAddAuthDirective(config, 'hasScope')) {
    typeMap['hasScope'] = parse(
      `directive @hasScope(scopes: [String]) on OBJECT | FIELD_DEFINITION`
    ).definitions[0];
  }
  return typeMap;
};

export const possiblyAddDirectiveImplementations = (
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

export const possiblyAddScopeDirective = ({
  typeName,
  relatedTypeName,
  operationType,
  entityType,
  config
}) => {
  if (shouldAddAuthDirective(config, 'hasScope')) {
    if (entityType === 'node') {
      if (
        operationType === 'Create' ||
        operationType === 'Read' ||
        operationType === 'Update' ||
        operationType === 'Delete'
      ) {
        return parseDirectiveSdl(
          `@hasScope(scopes: ["${typeName}: ${operationType}"])`
        );
      }
    }
    if (entityType === 'relation') {
      if (operationType === 'Add') operationType = 'Create';
      else if (operationType === 'Remove') operationType = 'Delete';
      return `@hasScope(scopes: ["${typeName}: ${operationType}", "${relatedTypeName}: ${operationType}"])`;
    }
  }
  return undefined;
};

export const addDirectiveDeclarations = (typeMap, config) => {
  // overwrites any provided directive declarations for system directive names
  typeMap['cypher'] = parse(
    `directive @cypher(statement: String) on FIELD_DEFINITION`
  ).definitions[0];
  typeMap['relation'] = parse(
    `directive @relation(name: String, direction: _RelationDirections, from: String, to: String) on FIELD_DEFINITION | OBJECT`
  ).definitions[0];
  // TODO should we change these system directives to having a '_Neo4j' prefix
  typeMap['MutationMeta'] = parse(
    `directive @MutationMeta(relationship: String, from: String, to: String) on FIELD_DEFINITION`
  ).definitions[0];
  typeMap['neo4j_ignore'] = parse(
    `directive @neo4j_ignore on FIELD_DEFINITION`
  ).definitions[0];
  typeMap['_RelationDirections'] = parse(
    `enum _RelationDirections { IN OUT }`
  ).definitions[0];
  typeMap = possiblyAddDirectiveDeclarations(typeMap, config);
  return typeMap;
};
