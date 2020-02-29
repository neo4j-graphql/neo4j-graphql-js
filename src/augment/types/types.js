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
  buildOperationType,
  buildSchemaDefinition,
  buildName,
  buildNamedType,
  buildObjectType,
  buildInputObjectType,
  buildInputValue,
  buildField
} from '../ast';
import {
  TemporalType,
  augmentTemporalTypes,
  Neo4jTime,
  Neo4jTimeField,
  Neo4jDate
} from './temporal';
import { SpatialType, Neo4jPoint, augmentSpatialTypes } from './spatial';
import {
  isNeo4jTypeField,
  unwrapNamedType,
  getFieldDefinition,
  isTemporalField
} from '../fields';

import { augmentNodeType, augmentNodeTypeFields } from './node/node';
import { RelationshipDirectionField } from '../types/relationship/relationship';

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

// The prefix added to the name of any type representing a managed Neo4j data type
export const Neo4jTypeName = `_Neo4j`;

/**
 * An enum describing the names of fields computed and added to the input
 * and output type definitions representing non-scalar Neo4j property types
 */
export const Neo4jTypeFormatted = {
  FORMATTED: 'formatted'
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
    [TemporalType.LOCALDATETIME]: 'Temporal',
    [SpatialType.POINT]: 'Spatial'
  },
  // TODO probably revise and remove...
  STRUCTURAL: {
    [Kind.OBJECT_TYPE_DEFINITION]: Neo4jStructuralType,
    [Kind.INTERFACE_TYPE_DEFINITION]: Neo4jStructuralType,
    [Kind.UNION_TYPE_DEFINITION]: Neo4jStructuralType
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
export const isNeo4jPropertyType = ({ type }) =>
  isNeo4jTemporalType({ type }) || isNeo4jPointType({ type });

/**
 * A predicate function for identifying a GraphQL type definition representing
 * a Neo4j Temporal type (Time, Date, DateTime, LocalTime, LocalDateTime)
 * with a name that has already been transformed ('_Neo4j' prefix added)
 */
export const isNeo4jTemporalType = ({ type }) =>
  Object.values(TemporalType).some(name => type === `${Neo4jTypeName}${name}`);

/**
 * A predicate function for identifying a GraphQL type definition representing
 * a Neo4j Spatial type (Point)
 */
export const isNeo4jPointType = ({ type }) =>
  Object.values(SpatialType).some(name => type === `${Neo4jTypeName}${name}`);

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
    if (isOperationTypeDefinition({ definition, operationTypeMap })) {
      // Overwrite existing operation map entry with augmented type
      operationTypeMap[typeName] = augmentOperationType({
        typeName,
        definition,
        typeDefinitionMap,
        generatedTypeMap,
        operationTypeMap,
        config
      });
    } else if (isNodeType({ definition })) {
      [definition, generatedTypeMap, operationTypeMap] = augmentNodeType({
        typeName,
        definition,
        typeDefinitionMap,
        generatedTypeMap,
        operationTypeMap,
        config
      });
      // Add augmented type to generated type map
      generatedTypeMap[typeName] = definition;
    } else {
      // Persist any other type definition
      generatedTypeMap[typeName] = definition;
    }
    return definition;
  });
  generatedTypeMap = augmentNeo4jTypes({
    generatedTypeMap,
    config
  });
  return [typeExtensionDefinitionMap, generatedTypeMap, operationTypeMap];
};

/**
 * Builds the GraphQL AST type definitions that represent complex Neo4j
 * property types (Temporal, Spatial) picked by the translation process
 */
const augmentNeo4jTypes = ({ generatedTypeMap, config }) => {
  generatedTypeMap = augmentTemporalTypes({
    typeMap: generatedTypeMap,
    config
  });
  generatedTypeMap = augmentSpatialTypes({
    typeMap: generatedTypeMap,
    config
  });
  return generatedTypeMap;
};

/**
 * Builds the AST definitions for the object and input object
 * types used for non-scalar Neo4j property types (Temporal, Spatial)
 */
export const buildNeo4jTypes = ({
  typeMap = {},
  neo4jTypes = {},
  config = {}
}) => {
  Object.values(neo4jTypes).forEach(typeName => {
    const typeNameLower = typeName.toLowerCase();
    if (config[typeNameLower] === true) {
      const fields = buildNeo4jTypeFields({ typeName });
      let inputFields = [];
      let outputFields = [];
      fields.forEach(([fieldName, fieldType]) => {
        const fieldNameLower = fieldName.toLowerCase();
        const fieldConfig = {
          name: buildName({ name: fieldNameLower }),
          type: buildNamedType({
            name: fieldType
          })
        };
        inputFields.push(buildInputValue(fieldConfig));
        outputFields.push(buildField(fieldConfig));
      });
      const formattedFieldConfig = {
        name: buildName({
          name: Neo4jTypeFormatted.FORMATTED
        }),
        type: buildNamedType({
          name: GraphQLString.name
        })
      };
      if (isTemporalField({ type: typeName })) {
        inputFields.push(buildInputValue(formattedFieldConfig));
        outputFields.push(buildField(formattedFieldConfig));
      }
      const objectTypeName = `${Neo4jTypeName}${typeName}`;
      const inputTypeName = `${objectTypeName}Input`;
      typeMap[objectTypeName] = buildObjectType({
        name: buildName({ name: objectTypeName }),
        fields: outputFields
      });
      typeMap[inputTypeName] = buildInputObjectType({
        name: buildName({ name: inputTypeName }),
        fields: inputFields
      });
    }
  });
  return typeMap;
};

/**
 * Builds the configuration objects for the field and input value
 * definitions used by a given Neo4j type, built into AST by
 * buildNeo4jTypes, then used in buildNeo4jType
 */
const buildNeo4jTypeFields = ({ typeName = '' }) => {
  let fields = [];
  if (typeName === TemporalType.DATE) {
    fields = Object.entries(Neo4jDate);
  } else if (typeName === TemporalType.TIME) {
    fields = Object.entries(Neo4jTime);
  } else if (typeName === TemporalType.LOCALTIME) {
    fields = Object.entries({
      ...Neo4jTime
    }).filter(([name]) => name !== Neo4jTimeField.TIMEZONE);
  } else if (typeName === TemporalType.DATETIME) {
    fields = Object.entries({
      ...Neo4jDate,
      ...Neo4jTime
    });
  } else if (typeName === TemporalType.LOCALDATETIME) {
    fields = Object.entries({
      ...Neo4jDate,
      ...Neo4jTime
    }).filter(([name]) => name !== Neo4jTimeField.TIMEZONE);
  } else if (typeName === SpatialType.POINT) {
    fields = Object.entries({
      ...Neo4jPoint
    });
  }
  return fields;
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
        if (isNeo4jTypeField({ type: typeName })) {
          const typeNameLower = typeName.toLowerCase();
          if (config.temporal[typeNameLower] || config.spatial[typeNameLower]) {
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
        if (isNeo4jTypeField({ type: typeName })) {
          const typeNameLower = typeName.toLowerCase();
          if (config.temporal[typeNameLower] || config.spatial[typeNameLower]) {
            unwrappedType.name = `${Neo4jTypeName}${typeName}`;
          }
        }
        field.type = buildNamedType(unwrappedType);
      }
      return field;
    }
  });
};

/**
 * Builds any operation types that do not exist but should
 */
export const initializeOperationTypes = ({
  typeDefinitionMap,
  schemaTypeDefinition,
  config = {}
}) => {
  let queryTypeName = OperationType.QUERY;
  let mutationTypeName = OperationType.MUTATION;
  let subscriptionTypeName = OperationType.SUBSCRIPTION;
  [
    queryTypeName,
    mutationTypeName,
    subscriptionTypeName
  ] = getSchemaTypeOperationNames({
    schemaTypeDefinition,
    queryTypeName,
    mutationTypeName,
    subscriptionTypeName
  });
  // Build default operation type definitions if none are provided,
  // only kept if at least 1 field is added for generated API
  let operationTypeMap = {};
  typeDefinitionMap = initializeOperationType({
    typeName: queryTypeName,
    typeDefinitionMap,
    config
  });
  typeDefinitionMap = initializeOperationType({
    typeName: mutationTypeName,
    typeDefinitionMap,
    config
  });
  typeDefinitionMap = initializeOperationType({
    typeName: subscriptionTypeName,
    typeDefinitionMap,
    config
  });
  // Separate operation types out from other type definitions
  [typeDefinitionMap, operationTypeMap] = buildAugmentationTypeMaps({
    queryTypeName,
    mutationTypeName,
    subscriptionTypeName,
    typeDefinitionMap
  });
  return [typeDefinitionMap, operationTypeMap];
};

/**
 * Given a schema type, extracts possibly custom operation type names
 */
const getSchemaTypeOperationNames = ({
  schemaTypeDefinition,
  queryTypeName,
  mutationTypeName,
  subscriptionTypeName
}) => {
  // Get operation type names, which may be non-default
  if (schemaTypeDefinition) {
    const operationTypes = schemaTypeDefinition.operationTypes;
    operationTypes.forEach(definition => {
      const operation = definition.operation;
      const unwrappedType = unwrapNamedType({ type: definition.type });
      if (operation === queryTypeName.toLowerCase()) {
        queryTypeName = unwrappedType.name;
      } else if (operation === mutationTypeName.toLowerCase()) {
        mutationTypeName = unwrappedType.name;
      } else if (operation === subscriptionTypeName.toLowerCase()) {
        subscriptionTypeName = unwrappedType.name;
      }
    });
  }
  return [queryTypeName, mutationTypeName, subscriptionTypeName];
};

/**
 * Builds an operation type if it does not exist but should
 */
const initializeOperationType = ({
  typeName = '',
  typeDefinitionMap = {},
  config = {}
}) => {
  const typeNameLower = typeName.toLowerCase();
  let operationType = typeDefinitionMap[typeName];
  if (!operationType && config[typeNameLower]) {
    operationType = buildObjectType({
      name: buildName({ name: typeName })
    });
  }
  if (operationType) typeDefinitionMap[typeName] = operationType;
  return typeDefinitionMap;
};

/**
 * Builds a typeDefinitionMap that excludes operation types, instead placing them
 * within an operationTypeMap
 */
const buildAugmentationTypeMaps = ({
  queryTypeName,
  mutationTypeName,
  subscriptionTypeName,
  typeDefinitionMap = {}
}) => {
  return Object.entries(typeDefinitionMap).reduce(
    ([typeMap, operationTypeMap], [typeName, definition]) => {
      if (typeName === queryTypeName) {
        operationTypeMap[OperationType.QUERY] = definition;
      } else if (typeName === mutationTypeName) {
        operationTypeMap[OperationType.MUTATION] = definition;
      } else if (typeName === subscriptionTypeName) {
        operationTypeMap[OperationType.SUBSCRIPTION] = definition;
      } else {
        typeMap[typeName] = definition;
      }
      return [typeMap, operationTypeMap];
    },
    [{}, {}]
  );
};

/**
 * The augmentation entry point for a GraphQL operation
 * type (Query, Mutation, etc.)
 */
const augmentOperationType = ({
  typeName,
  definition,
  typeDefinitionMap,
  generatedTypeMap,
  operationTypeMap,
  config
}) => {
  if (isObjectTypeDefinition({ definition })) {
    if (isQueryTypeDefinition({ definition, operationTypeMap })) {
      let [
        nodeInputTypeMap,
        propertyOutputFields,
        propertyInputValues,
        isIgnoredType
      ] = augmentNodeTypeFields({
        typeName,
        definition,
        typeDefinitionMap,
        generatedTypeMap,
        operationTypeMap,
        config
      });
      if (!isIgnoredType) {
        definition.fields = propertyOutputFields;
      }
    }
  }
  return definition;
};

/**
 * Regenerates the schema type definition using any existing operation types
 */
export const regenerateSchemaType = ({ schema = {}, definitions = [] }) => {
  const operationTypes = [];
  Object.values(OperationType).forEach(name => {
    let operationType = undefined;
    if (name === OperationType.QUERY) operationType = schema.getQueryType();
    else if (name === OperationType.MUTATION)
      operationType = schema.getMutationType();
    else if (name === OperationType.SUBSCRIPTION)
      operationType = schema.getSubscriptionType();
    if (operationType) {
      operationTypes.push(
        buildOperationType({
          operation: name.toLowerCase(),
          type: buildNamedType({ name: operationType.name })
        })
      );
    }
  });
  if (operationTypes.length) {
    definitions.push(
      buildSchemaDefinition({
        operationTypes
      })
    );
  }
  return definitions;
};

/**
 * Builds any schema type entry that should exist but doesn't, and
 * decides to only keep operation type definitions that contain at least
 * 1 field
 */
export const augmentSchemaType = ({
  definitions,
  schemaTypeDefinition,
  operationTypeMap
}) => {
  let operationTypes = [];
  // If schema type provided or regenerated, get its operation types
  if (schemaTypeDefinition)
    operationTypes = schemaTypeDefinition.operationTypes;
  // Only persist operation types that have at least 1 field, and for those add
  // a schema type operation field if one does not exist
  operationTypeMap = Object.entries(operationTypeMap).forEach(
    ([typeName, operationType]) => {
      // Keep the operation type only if there are fields,
      if (operationType.fields.length) {
        const typeNameLow = typeName.toLowerCase();
        // Keep this operation type definition
        definitions.push(operationType);
        // Add schema type field for any generated default operation types (Query, etc.)
        if (
          !operationTypes.find(operation => operation.operation === typeNameLow)
        ) {
          operationTypes.push(
            buildOperationType({
              operation: typeNameLow,
              type: buildNamedType({ name: operationType.name.value })
            })
          );
        }
      }
    }
  );
  // If a schema type was regenerated or provided and at least one operation type
  // exists, then update its operation types and keep it
  if (schemaTypeDefinition && operationTypes.length) {
    schemaTypeDefinition.operationTypes = operationTypes;
    definitions.push(schemaTypeDefinition);
  }
  return definitions;
};
