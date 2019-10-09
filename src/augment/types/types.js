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
import { shouldAugmentType } from '../augment';
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
import { RelationshipDirectionField } from '../types/relationship/relationship';

export const Neo4jTypeName = `_Neo4j`;

export const Neo4jStructuralType = {
  NODE: 'Node',
  RELATIONSHIP: 'Relationship'
};

export const OperationType = {
  QUERY: 'Query',
  MUTATION: 'Mutation',
  SUBSCRIPTION: 'Subscription'
};

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

export const isNodeType = ({ definition }) =>
  interpretType({ definition }) === Neo4jStructuralType.NODE;

export const isRelationshipType = ({ definition }) =>
  interpretType({ definition }) === Neo4jStructuralType.RELATIONSHIP;

export const isObjectTypeDefinition = ({ definition = {} }) =>
  definition.kind === Kind.OBJECT_TYPE_DEFINITION;

export const isInputObjectTypeDefinition = ({ definition = {} }) =>
  definition.kind === Kind.INPUT_OBJECT_TYPE_DEFINITION;

export const isInterfaceTypeDefinition = ({ definition = {} }) =>
  definition.kind === Kind.INTERFACE_TYPE_DEFINITION;

export const isUnionTypeDefinition = ({ definition = {} }) =>
  definition.kind === Kind.UNION_TYPE_DEFINITION;

export const isOperationTypeDefinition = ({ definition = {} }) =>
  isQueryTypeDefinition({ definition }) ||
  isMutationTypeDefinition({ definition }) ||
  isSubscriptionTypeDefinition({ definition });

export const isQueryTypeDefinition = ({ definition }) =>
  definition.name && definition.name.value === OperationType.QUERY;

export const isMutationTypeDefinition = ({ definition }) =>
  definition.name && definition.name.value === OperationType.MUTATION;

export const isSubscriptionTypeDefinition = ({ definition }) =>
  definition.name && definition.name.value === OperationType.SUBSCRIPTION;

export const isNeo4jTemporalType = ({ type }) =>
  Object.values(TemporalType).some(name => type === `${Neo4jTypeName}${name}`);

export const isNeo4jPropertyType = ({ type }) => isNeo4jTemporalType({ type });

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

export const buildNeo4jTypes = ({ generatedTypeMap, config }) => {
  generatedTypeMap = buildTemporalTypes({
    typeMap: generatedTypeMap,
    config
  });
  return generatedTypeMap;
};

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

export const initializeOperationTypes = ({
  typeDefinitionMap,
  config = {}
}) => {
  const types = Object.keys(typeDefinitionMap);
  const queryTypeName = OperationType.QUERY;
  const queryTypeNameLower = queryTypeName.toLowerCase();
  const mutationTypeName = OperationType.MUTATION;
  const mutationTypeNameLower = mutationTypeName.toLowerCase();
  const subscriptionTypeName = OperationType.SUBSCRIPTION;
  let queryType = typeDefinitionMap[queryTypeName];
  let mutationType = typeDefinitionMap[mutationTypeName];
  let subscriptionType = typeDefinitionMap[subscriptionTypeName];
  if (
    hasNonExcludedNodeType(
      types,
      typeDefinitionMap,
      queryTypeNameLower,
      config
    ) &&
    !queryType &&
    config.query
  ) {
    queryType = buildObjectType({
      name: buildName({ name: queryTypeName })
    });
  }
  if (
    hasNonExcludedNodeType(
      types,
      typeDefinitionMap,
      mutationTypeNameLower,
      config
    ) &&
    !mutationType &&
    config.mutation
  ) {
    mutationType = buildObjectType({
      name: buildName({ name: mutationTypeName })
    });
  }
  const operationTypeMap = {};
  if (queryType) {
    operationTypeMap[OperationType.QUERY] = queryType;
  }
  if (mutationType) {
    operationTypeMap[OperationType.MUTATION] = mutationType;
  }
  if (subscriptionType) {
    operationTypeMap[OperationType.SUBSCRIPTION] = subscriptionType;
  }
  return [typeDefinitionMap, operationTypeMap];
};

const hasNonExcludedNodeType = (types, typeMap, rootType, config) => {
  return types.find(e => {
    const type = typeMap[e];
    const typeName = type.name ? type.name.value : '';
    if (typeName) {
      return (
        isNodeType({ definition: type }) &&
        shouldAugmentType(config, rootType, typeName)
      );
    }
  });
};
