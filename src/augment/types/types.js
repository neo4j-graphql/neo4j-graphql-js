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
  getDirective,
  augmentDirectives
} from '../directives';
import {
  buildOperationType,
  buildSchemaDefinition,
  buildName,
  buildNamedType,
  buildObjectType,
  buildInputObjectType,
  buildInputValue,
  buildField,
  buildDescription
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
  isTemporalField,
  isSpatialField
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
  STRUCTURAL: {
    [Kind.OBJECT_TYPE_DEFINITION]: Neo4jStructuralType,
    [Kind.INTERFACE_TYPE_DEFINITION]: Neo4jStructuralType,
    [Kind.UNION_TYPE_DEFINITION]: Neo4jStructuralType
  }
};

const CYPHER_MANUAL_CURRENT_FUNCTIONS = `https://neo4j.com/docs/cypher-manual/current/functions`;
const GRANDSTACK_DOCS = `https://grandstack.io/docs`;

/**
 * A predicate function for identifying a Document AST resulting
 * from the parsing of SDL type definitions
 */
export const isSchemaDocument = ({ definition = {} }) =>
  typeof definition === 'object' && definition.kind === Kind.DOCUMENT;
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
 * A predicate function for identifying a GraphQL Object Type Extension definition
 */
export const isObjectTypeExtensionDefinition = ({ definition = {} }) =>
  definition.kind === Kind.OBJECT_TYPE_EXTENSION;

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
 * A predicate function for identifying a GraphQL Object Type Extension definition
 */
export const isInterfaceTypeExtensionDefinition = ({ definition = {} }) =>
  definition.kind === Kind.INTERFACE_TYPE_EXTENSION;

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
export const isQueryTypeDefinition = ({ definition, operationTypeMap }) => {
  return definition.name && operationTypeMap[OperationType.QUERY]
    ? definition.name.value === operationTypeMap[OperationType.QUERY].name.value
    : false;
};

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

const isDefaultOperationType = ({ typeName }) =>
  typeName === OperationType.QUERY ||
  typeName === OperationType.MUTATION ||
  typeName === OperationType.SUBSCRIPTION;

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
  typeExtensionDefinitionMap = {},
  generatedTypeMap,
  operationTypeMap = {},
  config = {}
}) => {
  const augmentationDefinitions = [
    ...Object.entries({
      ...typeDefinitionMap,
      ...operationTypeMap
    })
  ];
  augmentationDefinitions.forEach(([typeName, definition]) => {
    const isObjectType = isObjectTypeDefinition({ definition });
    const isInterfaceType = isInterfaceTypeDefinition({ definition });
    const isUnionType = isUnionTypeDefinition({ definition });
    const isOperationType = isOperationTypeDefinition({
      definition,
      operationTypeMap
    });
    const isQueryType = isQueryTypeDefinition({ definition, operationTypeMap });
    const isMutationType = isMutationTypeDefinition({
      definition,
      operationTypeMap
    });
    if (isOperationType) {
      [definition, typeExtensionDefinitionMap] = augmentOperationType({
        typeName,
        definition,
        typeExtensionDefinitionMap,
        isQueryType,
        isMutationType,
        isObjectType,
        typeDefinitionMap,
        generatedTypeMap,
        operationTypeMap,
        config
      });
      operationTypeMap[typeName] = definition;
    } else if (isNodeType({ definition })) {
      [
        definition,
        generatedTypeMap,
        operationTypeMap,
        typeExtensionDefinitionMap
      ] = augmentNodeType({
        typeName,
        definition,
        isObjectType,
        isInterfaceType,
        isUnionType,
        isOperationType,
        isQueryType,
        typeDefinitionMap,
        generatedTypeMap,
        operationTypeMap,
        typeExtensionDefinitionMap,
        config
      });
      // Add augmented type to generated type map
      generatedTypeMap[typeName] = definition;
    } else {
      // Persist any other type definition
      generatedTypeMap[typeName] = definition;
    }
  });
  generatedTypeMap = augmentNeo4jTypes({
    generatedTypeMap,
    config
  });
  Object.entries(typeExtensionDefinitionMap).forEach(
    ([typeName, extensions]) => {
      const isNonLocalType = !generatedTypeMap[typeName];
      const isOperationType = isDefaultOperationType({ typeName });
      if (isNonLocalType && !isOperationType) {
        const augmentedExtensions = extensions.map(definition => {
          const isObjectExtension =
            definition.kind === Kind.OBJECT_TYPE_EXTENSION;
          const isInterfaceExtension =
            definition.kind === Kind.INTERFACE_TYPE_EXTENSION;
          const isUnionExtension =
            definition.kind === Kind.UNION_TYPE_EXTENSION;
          let nodeInputTypeMap = {};
          let propertyOutputFields = [];
          let propertyInputValues = [];
          let extensionNodeInputTypeMap = {};
          if (isObjectExtension || isInterfaceExtension) {
            [
              nodeInputTypeMap,
              propertyOutputFields,
              propertyInputValues
            ] = augmentNodeTypeFields({
              typeName,
              definition,
              typeDefinitionMap,
              typeExtensionDefinitionMap,
              generatedTypeMap,
              operationTypeMap,
              nodeInputTypeMap,
              extensionNodeInputTypeMap,
              propertyOutputFields,
              propertyInputValues,
              isUnionExtension,
              isObjectExtension,
              isInterfaceExtension,
              config
            });
            return {
              ...definition,
              fields: propertyOutputFields
            };
          }
        });
        typeExtensionDefinitionMap[typeName] = augmentedExtensions;
      }
    }
  );
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
    if (
      config.temporal[typeNameLower] === true ||
      config.spatial[typeNameLower] === true
    ) {
      const [inputFields, outputFields] = buildNeo4jTypeFields({
        typeName,
        config
      });
      // decide some categorical labels used in dynamically generated descriptions
      let cypherCategory = 'Temporal';
      let usingOutputDocUrl = `${GRANDSTACK_DOCS}/graphql-temporal-types-datetime#using-temporal-fields-in-queries`;
      let usingInputDocUrl = `${GRANDSTACK_DOCS}/graphql-temporal-types-datetime/#temporal-query-arguments`;
      if (isSpatialField({ type: typeName })) {
        cypherCategory = 'Spatial';
        usingOutputDocUrl = `${GRANDSTACK_DOCS}/graphql-spatial-types#using-point-in-queries`;
        usingInputDocUrl = `${GRANDSTACK_DOCS}/graphql-spatial-types/#point-query-arguments`;
      }
      const neo4jTypeName = `${Neo4jTypeName}${typeName}`;
      // input object type
      const inputTypeName = `${neo4jTypeName}Input`;
      typeMap[inputTypeName] = buildInputObjectType({
        name: buildName({ name: inputTypeName }),
        fields: inputFields,
        description: buildDescription({
          value: `Generated ${typeName} input object for Neo4j [${cypherCategory} field arguments](${usingInputDocUrl}).`,
          config
        })
      });
      // output object type
      typeMap[neo4jTypeName] = buildObjectType({
        name: buildName({ name: neo4jTypeName }),
        fields: outputFields,
        description: buildDescription({
          value: `Generated ${typeName} object type for Neo4j [${cypherCategory} fields](${usingOutputDocUrl}).`,
          config
        })
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
const buildNeo4jTypeFields = ({ typeName = '', config }) => {
  let fieldConfigs = [];
  if (typeName === TemporalType.DATE) {
    fieldConfigs = Object.entries(Neo4jDate);
  } else if (typeName === TemporalType.TIME) {
    fieldConfigs = Object.entries(Neo4jTime);
  } else if (typeName === TemporalType.LOCALTIME) {
    fieldConfigs = Object.entries({
      ...Neo4jTime
    }).filter(([name]) => name !== Neo4jTimeField.TIMEZONE);
  } else if (typeName === TemporalType.DATETIME) {
    fieldConfigs = Object.entries({
      ...Neo4jDate,
      ...Neo4jTime
    });
  } else if (typeName === TemporalType.LOCALDATETIME) {
    fieldConfigs = Object.entries({
      ...Neo4jDate,
      ...Neo4jTime
    }).filter(([name]) => name !== Neo4jTimeField.TIMEZONE);
  } else if (typeName === SpatialType.POINT) {
    fieldConfigs = Object.entries({
      ...Neo4jPoint
    });
  }
  fieldConfigs = fieldConfigs.map(([fieldName, fieldType]) => {
    return {
      name: buildName({ name: fieldName }),
      type: buildNamedType({
        name: fieldType
      })
    };
  });
  let inputFields = fieldConfigs.map(config => buildInputValue(config));
  let outputFields = fieldConfigs.map(config => buildField(config));
  [inputFields, outputFields] = augmentNeo4jTypeFields({
    typeName,
    inputFields,
    outputFields,
    config
  });
  return [inputFields, outputFields];
};

const augmentNeo4jTypeFields = ({
  typeName = '',
  inputFields = [],
  outputFields = [],
  config
}) => {
  let neo4jTypeName = 'Temporal';
  let usingOutputDocUrl = `${GRANDSTACK_DOCS}/graphql-temporal-types-datetime#using-temporal-fields-in-queries`;
  let usingInputDocUrl = `${GRANDSTACK_DOCS}/graphql-temporal-types-datetime/#using-temporal-fields-in-mutations`;
  if (isTemporalField({ type: typeName })) {
    const typeNameLow = typeName.toLowerCase();
    const name = buildName({ name: Neo4jTypeFormatted.FORMATTED });
    const type = buildNamedType({ name: GraphQLString.name });
    // input value definitions
    const inputDescription = buildDescription({
      value: `Creates a Neo4j [${neo4jTypeName}](${usingInputDocUrl}) ${typeName} value using a [String format](${CYPHER_MANUAL_CURRENT_FUNCTIONS}/temporal/${typeNameLow}/#functions-${typeNameLow}-create-string).`,
      config
    });
    inputFields.push(
      buildInputValue({
        name,
        type,
        description: inputDescription
      })
    );
    // output field definitions
    const outputDescription = buildDescription({
      value: `Outputs a Neo4j [${neo4jTypeName}](${usingOutputDocUrl}) ${typeName} value as a String type by using the [toString](${CYPHER_MANUAL_CURRENT_FUNCTIONS}/string/#functions-tostring) Cypher function.`,
      config
    });
    outputFields.push(
      buildField({
        name,
        type,
        description: outputDescription
      })
    );
  }
  return [inputFields, outputFields];
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
  typeExtensionDefinitionMap,
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
    typeDefinitionMap,
    typeExtensionDefinitionMap
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
  typeExtensionDefinitionMap,
  isQueryType,
  isMutationType,
  isObjectType,
  typeDefinitionMap,
  generatedTypeMap,
  operationTypeMap,
  config
}) => {
  if (isObjectType) {
    const typeExtensions = typeExtensionDefinitionMap[typeName] || [];
    if (isQueryType) {
      // Augment existing Query type fields
      let nodeInputTypeMap = {};
      let propertyOutputFields = [];
      let propertyInputValues = [];
      if (typeExtensions.length) {
        typeExtensionDefinitionMap[typeName] = typeExtensions.map(extension => {
          let isIgnoredType = false;
          [
            nodeInputTypeMap,
            propertyOutputFields,
            propertyInputValues,
            isIgnoredType
          ] = augmentNodeTypeFields({
            typeName,
            definition: extension,
            typeDefinitionMap,
            typeExtensionDefinitionMap,
            generatedTypeMap,
            operationTypeMap,
            nodeInputTypeMap,
            propertyOutputFields,
            propertyInputValues,
            config
          });
          if (!isIgnoredType) {
            extension.fields = propertyOutputFields;
          }
          return extension;
        });
      }
      let isIgnoredType = false;
      [
        nodeInputTypeMap,
        propertyOutputFields,
        propertyInputValues,
        isIgnoredType
      ] = augmentNodeTypeFields({
        typeName,
        definition,
        typeDefinitionMap,
        typeExtensionDefinitionMap,
        generatedTypeMap,
        propertyOutputFields,
        operationTypeMap,
        config
      });
      if (!isIgnoredType) {
        definition.fields = propertyOutputFields;
      }
    } else if (isMutationType) {
      // Augment existing Mutation type fields
      definition.fields = definition.fields.map(field => {
        field.directives = augmentDirectives({ directives: field.directives });
        return field;
      });
      if (typeExtensions.length) {
        typeExtensionDefinitionMap[typeName] = typeExtensions.map(extension => {
          const fields = extension.fields;
          if (fields && fields.length) {
            extension.fields = fields.map(field => {
              field.directives = augmentDirectives({
                directives: field.directives
              });
              return field;
            });
          }
          return extension;
        });
      }
    }
  }
  return [definition, typeExtensionDefinitionMap];
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
