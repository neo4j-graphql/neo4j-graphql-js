import {
  visit,
  Kind,
  GraphQLID,
  GraphQLString,
  GraphQLInt,
  GraphQLFloat,
  GraphQLBoolean
} from 'graphql';
import {
  isIgnoredField,
  DirectiveDefinition,
  getDirective
} from '../directives';
import {
  buildName,
  buildNamedType,
  buildObjectType,
  buildInputObjectType
} from '../ast';
import { TemporalType, buildTemporalTypes } from './temporal';
import {
  isTemporalField,
  unwrapNamedType,
  getFieldDefinition
} from '../fields';
import { augmentNodeType } from './node/node';
import { RelationshipDirectionField } from '../types/relationship/relationship';

// The prefix added to the name of any type representing a managed Neo4j data type
export const Neo4jTypeName = `_Neo4j`;

/**
 * An enum describing Neo4j entity types, used in type predicate functions
 */
export const Neo4jStructuralType = {
  NODE: 'Node',
  RELATIONSHIP: 'Relationship'
};

/**
 * An enum describing the semantics of default GraphQL operation types
 */
export const OperationType = {
  QUERY: 'Query',
  MUTATION: 'Mutation',
  SUBSCRIPTION: 'Subscription'
};

/**
 * A map of the semantics of the GraphQL type system to Neo4j data types
 */
// https://neo4j.com/docs/cypher-manual/current/syntax/values/#cypher-values
export const Neo4jDataType = {
  PROPERTY: {
    [GraphQLInt.name]: 'Integer',
    [GraphQLFloat.name]: 'Float',
    [GraphQLString.name]: 'String',
    [GraphQLID.name]: 'String',
    [Kind.ENUM_TYPE_DEFINITION]: 'String',
    [GraphQLBoolean.name]: 'Boolean',
    [TemporalType.TIME]: 'Temporal',
    [TemporalType.DATE]: 'Temporal',
    [TemporalType.DATETIME]: 'Temporal',
    [TemporalType.LOCALTIME]: 'Temporal',
    [TemporalType.LOCALDATETIME]: 'Temporal'
  },
  STRUCTURAL: {
    [Kind.OBJECT_TYPE_DEFINITION]: Neo4jStructuralType
  }
};

/**
 * A predicate function for identifying type definitions representing
 * a Neo4j node entity
 */
export const isNodeType = ({ definition }) =>
  interpretType({ definition }) === Neo4jStructuralType.NODE;

/**
 * A predicate function for identifying type definitions representing
 * a Neo4j relationship entity
 */
export const isRelationshipType = ({ definition }) =>
  interpretType({ definition }) === Neo4jStructuralType.RELATIONSHIP;

/**
 * A predicate function for identifying a GraphQL Object Type definition
 */
export const isObjectTypeDefinition = ({ definition = {} }) =>
  definition.kind === Kind.OBJECT_TYPE_DEFINITION;

/**
 * A predicate function for identifying a GraphQL Input Object Type definition
 */
export const isInputObjectTypeDefinition = ({ definition = {} }) =>
  definition.kind === Kind.INPUT_OBJECT_TYPE_DEFINITION;

/**
 * A predicate function for identifying a GraphQL Interface Type definition
 */
export const isInterfaceTypeDefinition = ({ definition = {} }) =>
  definition.kind === Kind.INTERFACE_TYPE_DEFINITION;

/**
 * A predicate function for identifying a GraphQL Union definition
 */
export const isUnionTypeDefinition = ({ definition = {} }) =>
  definition.kind === Kind.UNION_TYPE_DEFINITION;

/**
 * A predicate function for identifying a GraphQL operation type definition
 */
export const isOperationTypeDefinition = ({
  definition = {},
  operationTypeMap
}) =>
  isQueryTypeDefinition({ definition, operationTypeMap }) ||
  isMutationTypeDefinition({ definition, operationTypeMap }) ||
  isSubscriptionTypeDefinition({ definition, operationTypeMap });

/**
 * A predicate function for identifying the GraphQL Query type definition
 */
export const isQueryTypeDefinition = ({ definition, operationTypeMap }) =>
  definition.name && operationTypeMap[OperationType.QUERY]
    ? definition.name.value === operationTypeMap[OperationType.QUERY].name.value
    : false;

/**
 * A predicate function for identifying the GraphQL Mutation type definition
 */
export const isMutationTypeDefinition = ({ definition, operationTypeMap }) =>
  definition.name && operationTypeMap[OperationType.MUTATION]
    ? definition.name.value ===
      operationTypeMap[OperationType.MUTATION].name.value
    : false;

/**
 * A predicate function for identifying the GraphQL Subscription type definition
 */
export const isSubscriptionTypeDefinition = ({
  definition,
  operationTypeMap
}) =>
  definition.name && operationTypeMap[OperationType.SUBSCRIPTION]
    ? definition.name.value ===
      operationTypeMap[OperationType.SUBSCRIPTION].name.value
    : false;

/**
 * A predicate function for identifying a GraphQL type definition representing
 * complex Neo4j property types (Temporal, Spatial) managed by the translation process
 */
export const isNeo4jPropertyType = ({ type }) => isNeo4jTemporalType({ type });

/**
 * A predicate function for identifying a GraphQL type definition representing
 * a Neo4j Temporal type (Time, Date, DateTime, LocalTime, LocalDateTime)
 * with a name that has already been transformed ('_Neo4j' prefix added)
 */
export const isNeo4jTemporalType = ({ type }) =>
  Object.values(TemporalType).some(name => type === `${Neo4jTypeName}${name}`);

/**
 * A predicate function for identifying which Neo4j entity type, if any, a given
 * GraphQL type definition represents
 */
export const interpretType = ({ definition = {} }) => {
  const kind = definition.kind;
  // Get the structural types allows for this definition kind
  const neo4jStructuralTypes = Neo4jDataType.STRUCTURAL[kind];
  let neo4jType = '';
  if (neo4jStructuralTypes) {
    const name = definition.name.value;
    if (!isNeo4jPropertyType({ type: name })) {
      const fields = definition.fields;
      const typeDirectives = definition.directives;
      if (
        neo4jStructuralTypes.RELATIONSHIP &&
        getDirective({
          directives: typeDirectives,
          name: DirectiveDefinition.RELATION
        }) &&
        getFieldDefinition({
          fields,
          name: RelationshipDirectionField.FROM
        }) &&
        getFieldDefinition({
          fields,
          name: RelationshipDirectionField.TO
        })
      ) {
        neo4jType = neo4jStructuralTypes.RELATIONSHIP;
      } else if (neo4jStructuralTypes.NODE) {
        // If not a relationship, assume node
        neo4jType = neo4jStructuralTypes.NODE;
      }
    }
  }
  return neo4jType;
};

/**
 * The main export for the augmentation process over prepared maps of
 * GraphQL type definitions
 */
export const augmentTypes = ({
  typeDefinitionMap,
  typeExtensionDefinitionMap,
  generatedTypeMap,
  operationTypeMap = {},
  config = {}
}) => {
  Object.entries({
    ...typeDefinitionMap,
    ...operationTypeMap
  }).forEach(([typeName, definition]) => {
    if (isNodeType({ definition })) {
      [definition, generatedTypeMap, operationTypeMap] = augmentNodeType({
        typeName,
        definition,
        typeDefinitionMap,
        generatedTypeMap,
        operationTypeMap,
        config
      });
      generatedTypeMap[typeName] = definition;
    } else {
      generatedTypeMap[typeName] = definition;
    }
    return definition;
  });
  generatedTypeMap = buildNeo4jTypes({
    generatedTypeMap,
    config
  });
  return [typeExtensionDefinitionMap, generatedTypeMap, operationTypeMap];
};

/**
 * Builds the GraphQL AST type definitions that represent complex Neo4j
 * property types (Temporal, Spatial) managed by the translation process
 */
const buildNeo4jTypes = ({ generatedTypeMap, config }) => {
  generatedTypeMap = buildTemporalTypes({
    typeMap: generatedTypeMap,
    config
  });
  return generatedTypeMap;
};

/**
 * Builds a GraphQL Object type and Input Object type representing
 * the input and output schema for a complex Neo4j property type,
 * ex: _Neo4jTime, _Neo4jTimeInput, etc.
 */
export const buildNeo4jType = ({
  inputTypeName,
  inputFields,
  objectTypeName,
  outputFields,
  typeMap
}) => {
  typeMap[objectTypeName] = buildObjectType({
    name: buildName({ name: objectTypeName }),
    fields: outputFields
  });
  typeMap[inputTypeName] = buildInputObjectType({
    name: buildName({ name: inputTypeName }),
    fields: inputFields
  });
  return typeMap;
};

/**
 * Applies the Neo4jTypeName prefix to any Field or Input Value definition
 * with a type representing a complex Neo4j property type, to align with the
 * type names expected by the translation process
 */
export const transformNeo4jTypes = ({ definitions = [], config }) => {
  const inputTypeSuffix = `Input`;
  return visit(definitions, {
    [Kind.INPUT_VALUE_DEFINITION]: field => {
      const directives = field.directives;
      if (!isIgnoredField({ directives })) {
        const type = field.type;
        const unwrappedType = unwrapNamedType({ type });
        const typeName = unwrappedType.name;
        if (isTemporalField({ type: typeName })) {
          const typeNameLower = typeName.toLowerCase();
          if (config.temporal[typeNameLower]) {
            unwrappedType.name = `${Neo4jTypeName}${typeName}${inputTypeSuffix}`;
          }
        } else if (isNeo4jPropertyType({ type: typeName })) {
          unwrappedType.name = `${typeName}${inputTypeSuffix}`;
        }
        field.type = buildNamedType(unwrappedType);
      }
      return field;
    },
    [Kind.FIELD_DEFINITION]: field => {
      const directives = field.directives;
      if (!isIgnoredField({ directives })) {
        const type = field.type;
        const unwrappedType = unwrapNamedType({ type });
        const typeName = unwrappedType.name;
        if (isTemporalField({ type: typeName })) {
          const typeNameLower = typeName.toLowerCase();
          if (config.temporal[typeNameLower]) {
            unwrappedType.name = `${Neo4jTypeName}${typeName}`;
          }
        }
        field.type = buildNamedType(unwrappedType);
      }
      return field;
    }
  });
};
