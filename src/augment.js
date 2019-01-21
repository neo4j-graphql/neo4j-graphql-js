import { makeExecutableSchema } from 'graphql-tools';
import { parse, print } from 'graphql';
import cloneDeep from 'lodash/cloneDeep';
import { neo4jgraphql } from './index';
import {
  printTypeMap,
  extractTypeMapFromTypeDefs,
  createOperationMap,
  addDirectiveDeclarations,
  getNamedType,
  getPrimaryKey,
  getFieldDirective,
  getRelationTypeDirectiveArgs,
  getFieldArgumentsFromAst,
  getRelationMutationPayloadFieldsFromAst,
  getRelationDirection,
  getRelationName,
  getTypeDirective,
  isBasicScalar,
  isListType,
  isKind,
  isNonNullType,
  isNodeType,
  parseFieldSdl,
  parseDirectiveSdl,
  isTemporalType,
  excludeIgnoredTypes,
  getCustomFieldResolver,
  possiblyAddIgnoreDirective,
  getExcludedTypes
} from './utils';

export const augmentedSchema = (typeMap, resolvers, config) => {
  const augmentedTypeMap = augmentTypeMap(typeMap, resolvers, config);
  const augmentedResolvers = augmentResolvers(
    augmentedTypeMap,
    resolvers,
    config
  );
  return makeExecutableSchema({
    typeDefs: printTypeMap(augmentedTypeMap),
    resolvers: augmentedResolvers,
    resolverValidationOptions: {
      requireResolversForResolveType: false
    }
  });
};

export const makeAugmentedExecutableSchema = ({
  typeDefs,
  resolvers,
  logger,
  allowUndefinedInResolve,
  resolverValidationOptions,
  directiveResolvers,
  schemaDirectives,
  parseOptions,
  inheritResolversFromInterfaces,
  config
}) => {
  const typeMap = extractTypeMapFromTypeDefs(typeDefs);
  const augmentedTypeMap = augmentTypeMap(typeMap, resolvers, config);
  const augmentedResolvers = augmentResolvers(
    augmentedTypeMap,
    resolvers,
    config
  );
  resolverValidationOptions.requireResolversForResolveType = false;
  return makeExecutableSchema({
    typeDefs: printTypeMap(augmentedTypeMap),
    resolvers: augmentedResolvers,
    logger: logger,
    allowUndefinedInResolve: allowUndefinedInResolve,
    resolverValidationOptions: resolverValidationOptions,
    directiveResolvers: directiveResolvers,
    schemaDirectives: schemaDirectives,
    parseOptions: parseOptions,
    inheritResolversFromInterfaces: inheritResolversFromInterfaces
  });
};

export const extractTypeMapFromSchema = schema => {
  const typeMap = schema.getTypeMap();
  const directives = schema.getDirectives();
  const types = { ...typeMap, ...directives };
  let astNode = {};
  return Object.keys(types).reduce((acc, t) => {
    astNode = types[t].astNode;
    if (astNode !== undefined) {
      acc[astNode.name.value] = astNode;
    }
    return acc;
  }, {});
};

export const extractResolversFromSchema = schema => {
  const _typeMap = schema && schema._typeMap ? schema._typeMap : {};
  const types = Object.keys(_typeMap);
  let type = {};
  let schemaTypeResolvers = {};
  return types.reduce((acc, t) => {
    // prevent extraction from schema introspection system keys
    if (
      t !== '__Schema' &&
      t !== '__Type' &&
      t !== '__TypeKind' &&
      t !== '__Field' &&
      t !== '__InputValue' &&
      t !== '__EnumValue' &&
      t !== '__Directive'
    ) {
      type = _typeMap[t];
      // resolvers are stored on the field level at a .resolve key
      schemaTypeResolvers = extractFieldResolversFromSchemaType(type);
      // do not add unless there exists at least one field resolver for type
      if (schemaTypeResolvers) {
        acc[t] = schemaTypeResolvers;
      }
    }
    return acc;
  }, {});
};

const extractFieldResolversFromSchemaType = type => {
  const fields = type._fields;
  const fieldKeys = fields ? Object.keys(fields) : [];
  const fieldResolvers =
    fieldKeys.length > 0
      ? fieldKeys.reduce((acc, t) => {
          // do not add entry for this field unless it has resolver
          if (fields[t].resolve !== undefined) {
            acc[t] = fields[t].resolve;
          }
          return acc;
        }, {})
      : undefined;
  // do not return value unless there exists at least 1 field resolver
  return fieldResolvers && Object.keys(fieldResolvers).length > 0
    ? fieldResolvers
    : undefined;
};

export const augmentTypeMap = (typeMap, resolvers, config) => {
  // IDEA: elevate into config as config.rootTypes?
  const rootTypes = {
    query: 'Query',
    mutation: 'Mutation'
  };
  config = excludeIgnoredTypes(typeMap, config);
  typeMap = initializeOperationTypes(typeMap, rootTypes, config);
  typeMap = addRelationTypeDirectives(typeMap);
  typeMap = addTemporalTypes(typeMap, config);
  Object.entries(typeMap).forEach(([name, type]) => {
    if (!isTemporalType(name)) {
      typeMap[name] = augmentType(type, typeMap, resolvers, rootTypes, config);
      typeMap = possiblyAddQuery(type, typeMap, resolvers, rootTypes, config);
      typeMap = possiblyAddOrderingEnum(type, typeMap, resolvers, config);
      typeMap = possiblyAddTypeInput(type, typeMap, resolvers, config);
      typeMap = possiblyAddTypeMutations(type, typeMap, resolvers, config);
      typeMap = handleRelationFields(type, typeMap, resolvers, config);
    }
  });
  typeMap = augmentQueryArguments(typeMap, config, rootTypes);
  typeMap = addDirectiveDeclarations(typeMap);
  return typeMap;
};

const augmentResolvers = (augmentedTypeMap, resolvers, config) => {
  let queryResolvers = resolvers && resolvers.Query ? resolvers.Query : {};
  const generatedQueryMap = createOperationMap(augmentedTypeMap.Query);
  queryResolvers = possiblyAddResolvers(
    generatedQueryMap,
    queryResolvers,
    config
  );
  if (Object.keys(queryResolvers).length > 0) {
    resolvers.Query = queryResolvers;
  }
  let mutationResolvers =
    resolvers && resolvers.Mutation ? resolvers.Mutation : {};
  const generatedMutationMap = createOperationMap(augmentedTypeMap.Mutation);
  mutationResolvers = possiblyAddResolvers(
    generatedMutationMap,
    mutationResolvers,
    config
  );
  if (Object.keys(mutationResolvers).length > 0) {
    resolvers.Mutation = mutationResolvers;
  }
  // must implement __resolveInfo for every Interface type
  // we use "FRAGMENT_TYPE" key to identify the Interface implementation
  // type at runtime, so grab this value
  const interfaceTypes = Object.keys(augmentedTypeMap).filter(
    e => augmentedTypeMap[e].kind === 'InterfaceTypeDefinition'
  );
  interfaceTypes.map(e => {
    resolvers[e] = {};

    resolvers[e]['__resolveType'] = (obj, context, info) => {
      return obj['FRAGMENT_TYPE'];
    };
  });

  return resolvers;
};

export const possiblyAddArgument = (args, fieldName, fieldType) => {
  const fieldIndex = args.findIndex(e => e.name.value === fieldName);
  if (fieldIndex === -1) {
    args.push({
      kind: 'InputValueDefinition',
      name: {
        kind: 'Name',
        value: fieldName
      },
      type: {
        kind: 'NamedType',
        name: {
          kind: 'Name',
          value: fieldType
        }
      }
    });
  }
  return args;
};

const shouldAugmentType = (config, rootType, type) => {
  // rootType = lowFirstLetter(rootType);
  return typeof config[rootType] === 'boolean'
    ? config[rootType]
    : // here .exclude should be an object,
    // set at the end of excludeIgnoredTypes
    type
    ? !getExcludedTypes(config, rootType)[type]
    : false;
};

const shouldAugmentRelationField = (config, rootType, fromName, toName) =>
  shouldAugmentType(config, rootType, fromName) &&
  shouldAugmentType(config, rootType, toName);

const augmentType = (astNode, typeMap, resolvers, rootTypes, config) => {
  const queryType = rootTypes.query;
  if (isNodeType(astNode)) {
    if (shouldAugmentType(config, 'query', astNode.name.value)) {
      // Only add _id field to type if query API is generated for type
      astNode.fields = addOrReplaceNodeIdField(astNode, resolvers);
    }
    astNode.fields = possiblyAddTypeFieldArguments(
      astNode,
      typeMap,
      resolvers,
      config,
      queryType
    );
  }
  astNode.fields = possiblyAddIgnoreDirective(
    astNode,
    typeMap,
    resolvers,
    config
  );
  return astNode;
};

const augmentQueryArguments = (typeMap, config, rootTypes) => {
  const queryType = rootTypes.query;
  // adds first / offset / orderBy to queries returning node type lists
  const queryMap = createOperationMap(typeMap.Query);
  let args = [];
  let valueTypeName = '';
  let valueType = {};
  let field = {};
  let queryNames = Object.keys(queryMap);
  if (queryNames.length > 0) {
    queryNames.forEach(t => {
      field = queryMap[t];
      valueTypeName = getNamedType(field).name.value;
      valueType = typeMap[valueTypeName];
      if (
        isNodeType(valueType) &&
        isListType(field) &&
        shouldAugmentType(config, 'query', valueTypeName)
      ) {
        // does not add arguments if the field value type is excluded
        args = field.arguments;
        queryMap[t].arguments = possiblyAddArgument(args, 'first', 'Int');
        queryMap[t].arguments = possiblyAddArgument(args, 'offset', 'Int');
        queryMap[t].arguments = possiblyAddArgument(
          args,
          'orderBy',
          `_${valueTypeName}Ordering`
        );
      }
    });
    typeMap[queryType].fields = Object.values(queryMap);
  }
  return typeMap;
};

const possiblyAddResolvers = (operationTypeMap, resolvers, config) => {
  let operationName = '';
  return Object.keys(operationTypeMap).reduce((acc, t) => {
    // if no resolver provided for this operation type field
    operationName = operationTypeMap[t].name.value;
    if (acc[operationName] === undefined) {
      acc[operationName] = function(...args) {
        return neo4jgraphql(...args, config.debug);
      };
    }
    return acc;
  }, resolvers);
};

const possiblyAddTypeInput = (astNode, typeMap, resolvers, config) => {
  const typeName = astNode.name.value;
  if (shouldAugmentType(config, 'mutation', typeName)) {
    const inputName = `_${astNode.name.value}Input`;
    if (isNodeType(astNode)) {
      if (typeMap[inputName] === undefined) {
        const pk = getPrimaryKey(astNode);
        if (pk) {
          const nodeInputType = `
            input ${inputName} { ${pk.name.value}: ${
            // Always exactly require the pk of a node type
            decideFieldType(getNamedType(pk).name.value)
          }! }`;
          typeMap[inputName] = parse(nodeInputType);
        }
      }
    } else if (getTypeDirective(astNode, 'relation')) {
      // Only used for the .data argument in generated relation creation mutations
      if (typeMap[inputName] === undefined) {
        let fieldName = '';
        let valueType = {};
        let valueTypeName = '';
        const fields = astNode.fields;
        // The .data arg on add relation mutations,
        // which is the only arg in the API that uses
        // relation input types, is only generate if there
        // is at least one non-directed field (property field)
        const hasSomePropertyField = fields.find(
          e => e.name.value !== 'from' && e.name.value !== 'to'
        );
        const fromField = fields.find(e => e.name.value === 'from');
        const fromName = getNamedType(fromField).name.value;
        const toField = fields.find(e => e.name.value === 'to');
        const toName = getNamedType(toField).name.value;
        // only generate an input type for the relationship if we know that both
        // the from and to nodes are not excluded, since thus we know that
        // relation mutations are generated for this relation, which would
        // make use of the relation input type
        const shouldCreateRelationInput = shouldAugmentRelationField(
          config,
          'mutation',
          fromName,
          toName
        );
        if (hasSomePropertyField && shouldCreateRelationInput) {
          let field = {};
          typeMap[inputName] = parse(
            `input ${inputName} {${fields
              .reduce((acc, t) => {
                fieldName = t.name.value;
                valueTypeName = getNamedType(t).name.value;
                valueType = typeMap[valueTypeName];
                field = cloneDeep(t);
                field.directives = [];
                if (
                  !getFieldDirective(t, 'neo4j_ignore') &&
                  !getCustomFieldResolver(astNode, field, resolvers) &&
                  fieldName !== '_id' &&
                  fieldName !== 'to' &&
                  fieldName !== 'from' &&
                  !getFieldDirective(t, 'cypher') &&
                  (isBasicScalar(valueTypeName) ||
                    isKind(valueType, 'EnumTypeDefinition') ||
                    isKind(valueType, 'ScalarTypeDefinition') ||
                    isTemporalType(valueTypeName))
                ) {
                  field.kind = 'InputValueDefinition';
                  field.type = transformManagedFieldTypes(field.type);
                  acc.push(print(field));
                }
                return acc;
              }, [])
              .join('\n')}}`
          );
        }
      }
    }
  }
  return typeMap;
};

const possiblyAddQuery = (astNode, typeMap, resolvers, rootTypes, config) => {
  const typeName = astNode.name.value;
  const queryType = rootTypes.query;
  const queryMap = createOperationMap(typeMap.Query);
  if (isNodeType(astNode) && shouldAugmentType(config, 'query', typeName)) {
    const name = astNode.name.value;
    if (queryMap[name] === undefined) {
      typeMap[queryType].fields.push({
        kind: 'FieldDefinition',
        name: {
          kind: 'Name',
          value: name
        },
        arguments: createQueryArguments(astNode, resolvers, typeMap),
        type: {
          kind: 'ListType',
          type: {
            kind: 'NamedType',
            name: {
              kind: 'Name',
              value: name
            }
          }
        }
      });
    }
  }
  return typeMap;
};

const possiblyAddOrderingEnum = (astNode, typeMap, resolvers, config) => {
  const typeName = astNode.name.value;
  if (isNodeType(astNode) && shouldAugmentType(config, 'query', typeName)) {
    const name = `_${astNode.name.value}Ordering`;
    const values = createOrderingFields(astNode, resolvers);
    // Add ordering enum if it does not exist already and if
    // there is at least one basic scalar field on this type
    if (typeMap[name] === undefined && values.length > 0) {
      typeMap[name] = {
        kind: 'EnumTypeDefinition',
        name: {
          kind: 'Name',
          value: name
        },
        directives: [],
        values: values
      };
    }
  }
  return typeMap;
};

const possiblyAddTypeMutations = (astNode, typeMap, resolvers, config) => {
  const typeName = astNode.name.value;
  if (shouldAugmentType(config, 'mutation', typeName)) {
    const mutationMap = createOperationMap(typeMap.Mutation);
    if (
      isNodeType(astNode) &&
      shouldAugmentType(config, 'mutation', typeName)
    ) {
      typeMap = possiblyAddTypeMutation(
        `Create`,
        astNode,
        resolvers,
        typeMap,
        mutationMap
      );
      typeMap = possiblyAddTypeMutation(
        `Update`,
        astNode,
        resolvers,
        typeMap,
        mutationMap
      );
      typeMap = possiblyAddTypeMutation(
        `Delete`,
        astNode,
        resolvers,
        typeMap,
        mutationMap
      );
    }
  }
  return typeMap;
};

const possiblyAddTypeFieldArguments = (
  astNode,
  typeMap,
  resolvers,
  config,
  queryType
) => {
  const fields = astNode.fields;
  let relationTypeName = '';
  let relationType = {};
  let args = [];
  fields.forEach(field => {
    relationTypeName = getNamedType(field).name.value;
    relationType = typeMap[relationTypeName];
    if (
      !getFieldDirective(field, 'neo4j_ignore') &&
      !getCustomFieldResolver(astNode, field, resolvers) &&
      // only adds args if node payload type has not been excluded
      shouldAugmentType(config, 'query', relationTypeName) &&
      // we know astNode is a node type, so this field should be a node type
      // as well, since the generated args are only for node type lists
      isNodeType(relationType) &&
      // the args (first / offset / orderBy) are only generated for list fields
      isListType(field) &&
      (getFieldDirective(field, 'relation') ||
        getFieldDirective(field, 'cypher'))
    ) {
      args = field.arguments;
      field.arguments = possiblyAddArgument(args, 'first', 'Int');
      field.arguments = possiblyAddArgument(args, 'offset', 'Int');
      field.arguments = possiblyAddArgument(
        args,
        'orderBy',
        `_${relationTypeName}Ordering`
      );
    }
  });
  return fields;
};

const possiblyAddObjectType = (typeMap, name) => {
  if (typeMap[name] === undefined) {
    typeMap[name] = {
      kind: 'ObjectTypeDefinition',
      name: {
        kind: 'Name',
        value: name
      },
      interfaces: [],
      directives: [],
      fields: []
    };
  }
  return typeMap;
};

const possiblyAddTypeMutation = (
  namePrefix,
  astNode,
  resolvers,
  typeMap,
  mutationMap
) => {
  const typeName = astNode.name.value;
  const mutationName = namePrefix + typeName;
  // Only generate if the mutation named mutationName does not already exist
  if (mutationMap[mutationName] === undefined) {
    let args = buildAllFieldArguments(namePrefix, astNode, resolvers, typeMap);
    if (args.length > 0) {
      typeMap.Mutation.fields.push({
        kind: 'FieldDefinition',
        name: {
          kind: 'Name',
          value: mutationName
        },
        arguments: args,
        type: {
          kind: 'NamedType',
          name: {
            kind: 'Name',
            value: typeName
          }
        },
        directives: []
      });
    }
  }
  return typeMap;
};

const possiblyAddRelationTypeFieldPayload = (
  relationAstNode,
  capitalizedFieldName,
  typeName,
  typeMap,
  field
) => {
  const fieldTypeName = `_${typeName}${capitalizedFieldName}`;
  if (!typeMap[fieldTypeName]) {
    let fieldName = '';
    let fieldValueName = '';
    let fromField = {};
    let toField = {};
    let _fromField = {};
    let _toField = {};
    let fromValue = undefined;
    let toValue = undefined;
    let fields = relationAstNode.fields;
    const relationTypeDirective = getRelationTypeDirectiveArgs(relationAstNode);
    if (relationTypeDirective) {
      const relationPropertyFields = fields
        .reduce((acc, t) => {
          fieldValueName = getNamedType(t).name.value;
          fieldName = t.name.value;
          if (fieldName === 'from') {
            fromValue = fieldValueName;
            fromField = t;
          } else if (fieldName === 'to') {
            toValue = fieldValueName;
            toField = t;
          } else {
            // Exclude .to and .from, but gather them from along the way
            // using previous branches above
            acc.push(print(t));
          }
          return acc;
        }, [])
        .join('\n');
      if (fromValue && fromValue === toValue) {
        // If field is a list type, then make .from and .to list types
        const fieldIsList = isListType(field);

        typeMap[`${fieldTypeName}Directions`] = parse(`
        type ${fieldTypeName}Directions ${print(relationAstNode.directives)} {
            from${getFieldArgumentsFromAst(field, typeName)}: ${
          fieldIsList ? '[' : ''
        }${fieldTypeName}${fieldIsList ? ']' : ''}
            to${getFieldArgumentsFromAst(field, typeName)}: ${
          fieldIsList ? '[' : ''
        }${fieldTypeName}${fieldIsList ? ']' : ''}
      }`);

        typeMap[fieldTypeName] = parse(`
      type ${fieldTypeName} ${print(relationAstNode.directives)} {
        ${relationPropertyFields}
        ${fromValue}: ${fromValue}
      }
      `);

        // remove arguments on field
        field.arguments = [];
      } else {
        // Non-reflexive case, (User)-[RATED]->(Movie)
        typeMap[fieldTypeName] = parse(`
      type ${fieldTypeName} ${print(relationAstNode.directives)} {
        ${relationPropertyFields}
        ${
          typeName === toValue
            ? // If this is the from, the allow selecting the to
              `${fromValue}: ${fromValue}`
            : // else this is the to, so allow selecting the from
            typeName === fromValue
            ? `${toValue}: ${toValue}`
            : ''
        }
      }
      `);
      }
    }
  }
  return typeMap;
};

const possiblyAddRelationMutationField = (
  typeName,
  capitalizedFieldName,
  fromName,
  toName,
  mutationMap,
  typeMap,
  relationName,
  relatedAstNode,
  relationHasProps
) => {
  const mutationTypes = ['Add', 'Remove'];
  let mutationName = '';
  let payloadTypeName = '';
  let hasSomePropertyField = false;
  mutationTypes.forEach(action => {
    mutationName = `${action}${typeName}${capitalizedFieldName}`;
    // Prevents overwriting
    if (mutationMap[mutationName] === undefined) {
      payloadTypeName = `_${mutationName}Payload`;
      hasSomePropertyField = relatedAstNode.fields.find(
        e => e.name.value !== 'from' && e.name.value !== 'to'
      );
      // If we know we should expect data properties (from context: relationHasProps)
      // and if there is at least 1 field that is not .to or .from (hasSomePropertyField)
      // and if we are generating the add relation mutation, then add the .data argument
      const shouldUseRelationDataArgument =
        relationHasProps && hasSomePropertyField && action === 'Add';
      // Relation mutation type
      typeMap.Mutation.fields.push(
        parseFieldSdl(`
          ${mutationName}(from: _${fromName}Input!, to: _${toName}Input!${
          shouldUseRelationDataArgument
            ? `, data: _${relatedAstNode.name.value}Input!`
            : ''
        }): ${payloadTypeName} @MutationMeta(relationship: "${relationName}", from: "${fromName}", to: "${toName}")
      `)
      );
      // Prevents overwriting
      if (typeMap[payloadTypeName] === undefined) {
        typeMap[payloadTypeName] = parse(`
        type ${payloadTypeName} @relation(name: "${relationName}", from: "${fromName}", to: "${toName}") {
          from: ${fromName}
          to: ${toName}
          ${
            shouldUseRelationDataArgument
              ? getRelationMutationPayloadFieldsFromAst(relatedAstNode)
              : ''
          }
        }
        `);
      }
    }
  });
  return typeMap;
};

const decideFieldType = name => {
  if (isTemporalType(name)) {
    name = `${name}Input`;
  }
  return name;
};

const validateRelationTypeDirectedFields = (typeName, fromName, toName) => {
  // directive to and from are not the same and neither are equal to this
  if (fromName !== toName && toName !== typeName && fromName !== typeName) {
    throw new Error(`The '${
      field.name.value
    }' field on the '${typeName}' type uses the '${relatedAstNode.name.value}'
    but '${
      relatedAstNode.name.value
    }' comes from '${fromName}' and goes to '${toName}'`);
  }
  return true;
};

const handleRelationFields = (astNode, typeMap, resolvers, config) => {
  const mutationMap = createOperationMap(typeMap.Mutation);
  const typeName = astNode.name.value;
  const fields = astNode.fields;
  const fieldCount = fields ? fields.length : 0;
  let relationFieldDirective = {};
  let fieldValueName = '';
  let relatedAstNode = {};
  let relationTypeDirective = {};
  let capitalizedFieldName = '';
  let field = {};
  let fieldIndex = 0;
  if (isNodeType(astNode)) {
    for (; fieldIndex < fieldCount; ++fieldIndex) {
      field = fields[fieldIndex];
      if (
        !getFieldDirective(field, 'neo4j_ignore') &&
        !getCustomFieldResolver(astNode, field, resolvers)
      ) {
        fieldValueName = getNamedType(field).name.value;
        capitalizedFieldName =
          field.name.value.charAt(0).toUpperCase() + field.name.value.substr(1);
        relatedAstNode = typeMap[fieldValueName];
        if (relatedAstNode) {
          relationTypeDirective = getTypeDirective(relatedAstNode, 'relation');
          relationFieldDirective = getFieldDirective(field, 'relation');
          // continue if typeName is allowed
          // in either Query or Mutation
          if (isNodeType(relatedAstNode)) {
            // the field has a node type
            if (relationFieldDirective) {
              // Relation Mutation API
              // relation directive exists on field
              typeMap = handleRelationFieldDirective({
                relatedAstNode,
                typeName,
                capitalizedFieldName,
                fieldValueName,
                relationFieldDirective,
                mutationMap,
                typeMap,
                config
              });
            }
          } else if (relationTypeDirective) {
            // Query and Relation Mutation API
            // the field value is a non-node type using a relation type directive
            typeMap = handleRelationTypeDirective({
              relatedAstNode,
              typeName,
              fields,
              field,
              fieldIndex,
              capitalizedFieldName,
              relationTypeDirective,
              config,
              typeMap,
              mutationMap
            });
          }
        }
      }
    }
  }
  return typeMap;
};

const handleRelationTypeDirective = ({
  relatedAstNode,
  typeName,
  fields,
  field,
  fieldIndex,
  capitalizedFieldName,
  relationTypeDirective,
  config,
  typeMap,
  mutationMap
}) => {
  const typeDirectiveArgs = relationTypeDirective
    ? relationTypeDirective.arguments
    : [];
  const nameArgument = typeDirectiveArgs.find(e => e.name.value === 'name');
  const fromArgument = typeDirectiveArgs.find(e => e.name.value === 'from');
  const toArgument = typeDirectiveArgs.find(e => e.name.value === 'to');
  const relationName = nameArgument.value.value;
  const fromName = fromArgument.value.value;
  const toName = toArgument.value.value;
  // Relation Mutation API, adds relation mutation to Mutation
  if (
    shouldAugmentRelationField(config, 'mutation', fromName, toName) &&
    validateRelationTypeDirectedFields(typeName, fromName, toName)
  ) {
    typeMap = possiblyAddRelationMutationField(
      typeName,
      capitalizedFieldName,
      fromName,
      toName,
      mutationMap,
      typeMap,
      relationName,
      relatedAstNode,
      true
    );
  }
  // Relation type field payload transformation for selection sets
  typeMap = possiblyAddRelationTypeFieldPayload(
    relatedAstNode,
    capitalizedFieldName,
    typeName,
    typeMap,
    field
  );
  // Replaces the field's value with the generated payload type
  fields[fieldIndex] = replaceRelationTypeValue(
    fromName,
    toName,
    field,
    capitalizedFieldName,
    typeName
  );
  return typeMap;
};

const handleRelationFieldDirective = ({
  relatedAstNode,
  typeName,
  capitalizedFieldName,
  fieldValueName,
  relationFieldDirective,
  mutationMap,
  typeMap,
  config
}) => {
  let fromName = typeName;
  let toName = fieldValueName;
  // Mutation API, relation mutations for field directives
  if (shouldAugmentRelationField(config, 'mutation', fromName, toName)) {
    const relationName = getRelationName(relationFieldDirective);
    const direction = getRelationDirection(relationFieldDirective);
    // possibly swap directions to fit assertion of fromName = typeName
    if (direction === 'IN' || direction === 'in') {
      let temp = fromName;
      fromName = toName;
      toName = temp;
    }
    // (Mutation API) add relation mutation to Mutation
    typeMap = possiblyAddRelationMutationField(
      typeName,
      capitalizedFieldName,
      fromName,
      toName,
      mutationMap,
      typeMap,
      relationName,
      relatedAstNode,
      false
    );
  }
  return typeMap;
};

const replaceRelationTypeValue = (
  fromName,
  toName,
  field,
  capitalizedFieldName,
  typeName
) => {
  const isList = isListType(field);
  let type = {
    kind: 'NamedType',
    name: {
      kind: 'Name',
      value: `_${typeName}${capitalizedFieldName}${
        fromName === toName ? 'Directions' : ''
      }`
    }
  };
  if (isList && fromName !== toName) {
    type = {
      kind: 'ListType',
      type: type
    };
  }
  field.type = type;
  return field;
};

const addOrReplaceNodeIdField = (astNode, resolvers) => {
  const fields = astNode ? astNode.fields : [];
  const index = fields.findIndex(e => e.name.value === '_id');
  const definition = {
    kind: 'FieldDefinition',
    name: {
      kind: 'Name',
      value: '_id'
    },
    arguments: [],
    type: {
      kind: 'NamedType',
      name: {
        kind: 'Name',
        value: 'String'
      }
    },
    directives: []
  };
  if (index >= 0) {
    if (
      !getFieldDirective(fields[index], 'neo4j_ignore') &&
      !getCustomFieldResolver(astNode, fields[index], resolvers)
    ) {
      fields.splice(index, 1, definition);
    }
  } else {
    fields.push(definition);
  }
  return fields;
};

const buildAllFieldArguments = (namePrefix, astNode, resolvers, typeMap) => {
  let fields = [];
  let type = {};
  let fieldName = '';
  let valueTypeName = '';
  let valueType = {};
  const primaryKey = getPrimaryKey(astNode);
  switch (namePrefix) {
    case 'Create': {
      let firstIdField = undefined;
      let field = {};
      astNode.fields.reduce((acc, t) => {
        type = getNamedType(t);
        fieldName = t.name.value;
        valueTypeName = type.name.value;
        valueType = typeMap[valueTypeName];
        if (
          !getFieldDirective(t, 'neo4j_ignore') &&
          !getCustomFieldResolver(astNode, t, resolvers)
        ) {
          if (
            isTemporalType(valueTypeName) ||
            (fieldName !== '_id' &&
              !getFieldDirective(t, 'cypher') &&
              (isBasicScalar(valueTypeName) ||
                isKind(valueType, 'EnumTypeDefinition') ||
                isKind(valueType, 'ScalarTypeDefinition')))
          ) {
            const isNonNullable = isNonNullType(t);
            field = cloneDeep(t);
            field.directives = [];
            if (isNonNullable) {
              const isList = isListType(t);
              // Don't require the first ID field discovered
              if (!isList && valueTypeName === 'ID' && !firstIdField) {
                // will only be true once, this field will
                // by default recieve an auto-generated uuid,
                // if no value is provided
                firstIdField = t;
                const idField = {
                  kind: 'InputValueDefinition',
                  name: {
                    kind: 'Name',
                    value: fieldName
                  },
                  type: {
                    kind: 'NamedType',
                    name: {
                      kind: 'Name',
                      value: decideFieldType(valueTypeName)
                    }
                  }
                };
                acc.push(idField);
              } else {
                field.kind = 'InputValueDefinition';
                field.type = transformManagedFieldTypes(field.type);
                acc.push(field);
              }
            } else {
              field.kind = 'InputValueDefinition';
              field.type = transformManagedFieldTypes(field.type);
              acc.push(field);
            }
          }
        }
        return acc;
      }, fields);
      break;
    }
    case 'Update': {
      if (primaryKey) {
        // Primary key field is first field and required
        const primaryKeyName = primaryKey.name.value;
        const primaryKeyType = getNamedType(primaryKey);
        const parsedPrimaryKeyField = parseFieldSdl(`
          ${primaryKeyName}: ${decideFieldType(primaryKeyType.name.value)}!
        `);
        parsedPrimaryKeyField.kind = 'InputValueDefinition';
        let augmentedFields = [];
        let field = {};
        augmentedFields.push(parsedPrimaryKeyField);
        astNode.fields.reduce((acc, t) => {
          type = getNamedType(t);
          fieldName = t.name.value;
          valueTypeName = type.name.value;
          valueType = typeMap[valueTypeName];
          if (
            !getFieldDirective(t, 'neo4j_ignore') &&
            !getCustomFieldResolver(astNode, t, resolvers)
          ) {
            if (
              isTemporalType(valueTypeName) ||
              (fieldName !== primaryKeyName &&
                fieldName !== '_id' &&
                !getFieldDirective(t, 'cypher') &&
                (isBasicScalar(valueTypeName) ||
                  isKind(valueType, 'EnumTypeDefinition') ||
                  isKind(valueType, 'ScalarTypeDefinition')))
            ) {
              field = cloneDeep(t);
              field.directives = [];
              if (isNonNullType(field)) {
                // Don't require update fields, that wouldn't be very flexible
                field.type = field.type.type;
              }
              field.kind = 'InputValueDefinition';
              field.type = transformManagedFieldTypes(field.type);
              acc.push(field);
            }
          }
          return acc;
        }, augmentedFields);
        // Use if there is at least one field other than
        // the primaryKey field used for node selection
        if (augmentedFields.length > 1) {
          fields = augmentedFields;
        }
      }
      break;
    }
    case 'Delete': {
      if (primaryKey) {
        const primaryKeyName = primaryKey.name.value;
        const primaryKeyType = getNamedType(primaryKey);
        fields.push({
          kind: 'InputValueDefinition',
          name: {
            kind: 'Name',
            value: primaryKeyName
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: {
                kind: 'Name',
                value: decideFieldType(primaryKeyType.name.value)
              }
            }
          }
        });
      }
      break;
    }
  }
  return fields;
};

const addRelationTypeDirectives = typeMap => {
  let astNode = {};
  let fields = [];
  let name = '';
  let to = {};
  let from = {};
  let fromTypeName = '';
  let toTypeName = '';
  let typeDirective = {};
  let relationName = '';
  let typeDirectiveIndex = -1;
  Object.keys(typeMap).forEach(typeName => {
    astNode = typeMap[typeName];
    name = astNode.name.value;
    fields = astNode.fields;
    to = fields ? fields.find(e => e.name.value === 'to') : undefined;
    from = fields ? fields.find(e => e.name.value === 'from') : undefined;
    if (to && !from) {
      throw new Error(
        `Relationship type ${name} has a 'to' field but no corresponding 'from' field`
      );
    }
    if (from && !to) {
      throw new Error(
        `Relationship type ${name} has a 'from' field but no corresponding 'to' field`
      );
    }
    if (from && to) {
      // get values of .to and .from fields
      fromTypeName = getNamedType(from).name.value;
      toTypeName = getNamedType(to).name.value;
      // assume the default relationship name
      relationName = transformRelationName(astNode);
      // get its relation type directive
      typeDirectiveIndex = astNode.directives.findIndex(
        e => e.name.value === 'relation'
      );
      if (typeDirectiveIndex >= 0) {
        typeDirective = astNode.directives[typeDirectiveIndex];
        // get the arguments of type directive
        let args = typeDirective ? typeDirective.arguments : [];
        if (args.length > 0) {
          // get its name argument
          let nameArg = args.find(e => e.name.value === 'name');
          if (nameArg) {
            relationName = nameArg.value.value;
          }
        }
        // replace it if it exists in order to force correct configuration
        astNode.directives[typeDirectiveIndex] = parseDirectiveSdl(`
          @relation(
            name: ${relationName}, 
            from: ${fromTypeName},
            to: ${toTypeName}
          )
        `);
      } else {
        astNode.directives.push(
          parseDirectiveSdl(`
          @relation(
            name: ${relationName}, 
            from: ${fromTypeName},
            to: ${toTypeName}
          )
        `)
        );
      }
      typeMap[typeName] = astNode;
    }
  });
  return typeMap;
};

const createOrderingFields = (astNode, resolvers) => {
  const fields = astNode ? astNode.fields : [];
  let type = {};
  return fields.reduce((acc, field) => {
    type = getNamedType(field);
    if (
      !getFieldDirective(field, 'neo4j_ignore') &&
      !getCustomFieldResolver(astNode, field, resolvers) &&
      isBasicScalar(type.name.value)
    ) {
      acc.push({
        kind: 'EnumValueDefinition',
        name: {
          kind: 'Name',
          value: `${field.name.value}_asc`
        },
        directives: []
      });
      acc.push({
        kind: 'EnumValueDefinition',
        name: {
          kind: 'Name',
          value: `${field.name.value}_desc`
        },
        directives: []
      });
    }
    return acc;
  }, []);
};

const createQueryArguments = (astNode, resolvers, typeMap) => {
  let type = {};
  let valueTypeName = '';
  let valueKind = '';
  let queryArg = {};
  return astNode.fields.reduce((acc, t) => {
    if (
      !getFieldDirective(t, 'neo4j_ignore') &&
      !getCustomFieldResolver(astNode, t, resolvers)
    ) {
      type = getNamedType(t);
      valueTypeName = type.name.value;
      valueKind = typeMap[valueTypeName]
        ? typeMap[valueTypeName].kind
        : undefined;
      queryArg = {
        kind: 'InputValueDefinition',
        name: {
          kind: 'Name',
          value: t.name.value
        },
        type: type
      };
      if (
        isBasicScalar(valueTypeName) ||
        valueKind === 'EnumTypeDefinition' ||
        valueKind === 'ScalarTypeDefinition'
      ) {
        acc.push(queryArg);
      } else if (isTemporalType(valueTypeName)) {
        queryArg.type = {
          kind: 'NamedType',
          name: {
            kind: 'Name',
            value: `${valueTypeName}Input`
          }
        };
        acc.push(queryArg);
      }
    }
    return acc;
  }, []);
};

const hasNonExcludedNodeType = (types, typeMap, rootType, config) => {
  let type = '';
  return types.find(e => {
    type = typeMap[e];
    return (
      isNodeType(type) &&
      type.name &&
      shouldAugmentType(config, rootType, type.name.value)
    );
  });
};

const initializeOperationTypes = (typeMap, rootTypes, config) => {
  const queryType = rootTypes.query;
  const mutationType = rootTypes.mutation;
  const types = Object.keys(typeMap);
  if (hasNonExcludedNodeType(types, typeMap, 'query', config)) {
    typeMap = possiblyAddObjectType(typeMap, queryType);
  }
  if (hasNonExcludedNodeType(types, typeMap, 'mutation', config)) {
    typeMap = possiblyAddObjectType(typeMap, mutationType);
  }
  return typeMap;
};

const transformManagedFieldTypes = type => {
  if (type.kind !== 'NamedType') {
    type.type = transformManagedFieldTypes(type.type);
    return type;
  }
  if (type.kind === 'NamedType') {
    const name = type.name.value;
    if (isTemporalType(name)) {
      type.name.value = `${name}Input`;
    }
  }
  return type;
};

const transformRelationName = relatedAstNode => {
  const name = relatedAstNode.name.value;
  let char = '';
  let uppercased = '';
  return Object.keys(name)
    .reduce((acc, t) => {
      char = name.charAt(t);
      uppercased = char.toUpperCase();
      if (char === uppercased && t > 0) {
        // already uppercased
        acc.push(`_${uppercased}`);
      } else {
        acc.push(uppercased);
      }
      return acc;
    }, [])
    .join('');
};

const temporalTypes = (typeMap, types) => {
  if (types.time === true) {
    typeMap['_Neo4jTime'] = parse(`
      type _Neo4jTime {
        hour: Int
        minute: Int
        second: Int
        millisecond: Int
        microsecond: Int
        nanosecond: Int
        timezone: String
        formatted: String
      }
    `).definitions[0];
    typeMap['_Neo4jTimeInput'] = parse(`
      input _Neo4jTimeInput {
        hour: Int
        minute: Int
        second: Int
        nanosecond: Int
        millisecond: Int
        microsecond: Int
        timezone: String
        formatted: String
      }
    `).definitions[0];
  }
  if (types.date === true) {
    typeMap['_Neo4jDate'] = parse(`
      type _Neo4jDate {
        year: Int
        month: Int
        day: Int
        formatted: String
      }
    `).definitions[0];
    typeMap['_Neo4jDateInput'] = parse(`
      input _Neo4jDateInput {
        year: Int
        month: Int
        day: Int
        formatted: String
      }
    `).definitions[0];
  }
  if (types.datetime === true) {
    typeMap['_Neo4jDateTime'] = parse(`
      type _Neo4jDateTime {
        year: Int
        month: Int
        day: Int
        hour: Int
        minute: Int
        second: Int
        millisecond: Int
        microsecond: Int
        nanosecond: Int
        timezone: String
        formatted: String
      }
    `).definitions[0];
    typeMap['_Neo4jDateTimeInput'] = parse(`
      input _Neo4jDateTimeInput {
        year: Int
        month: Int
        day: Int
        hour: Int
        minute: Int
        second: Int
        millisecond: Int
        microsecond: Int
        nanosecond: Int
        timezone: String 
        formatted: String
      }
    `).definitions[0];
  }
  if (types.localtime === true) {
    typeMap['_Neo4jLocalTime'] = parse(`
      type _Neo4jLocalTime {
        hour: Int
        minute: Int
        second: Int
        millisecond: Int
        microsecond: Int
        nanosecond: Int
        formatted: String
      }
    `).definitions[0];
    typeMap['_Neo4jLocalTimeInput'] = parse(`
      input _Neo4jLocalTimeInput {
        hour: Int
        minute: Int
        second: Int
        millisecond: Int
        microsecond: Int
        nanosecond: Int
        formatted: String
      }
    `).definitions[0];
  }
  if (types.localdatetime === true) {
    typeMap['_Neo4jLocalDateTime'] = parse(`
      type _Neo4jLocalDateTime {
        year: Int
        month: Int
        day: Int
        hour: Int
        minute: Int
        second: Int
        millisecond: Int
        microsecond: Int
        nanosecond: Int
        formatted: String
      }
    `).definitions[0];
    typeMap['_Neo4jLocalDateTimeInput'] = parse(`
      input _Neo4jLocalDateTimeInput {
        year: Int
        month: Int
        day: Int
        hour: Int
        minute: Int
        second: Int
        millisecond: Int
        microsecond: Int
        nanosecond: Int
        formatted: String
      }
    `).definitions[0];
  }
  return typeMap;
};

const transformTemporalFieldArgs = (field, config) => {
  field.arguments.forEach(arg => {
    arg.type = transformTemporalTypeName(arg.type, config, true);
  });
  return field;
};

const transformTemporalFields = (typeMap, config) => {
  Object.keys(typeMap).forEach(t => {
    if (typeMap[t].kind === 'ObjectTypeDefinition') {
      if (!isTemporalType(t)) {
        typeMap[t].fields.forEach(field => {
          // released: DateTime -> released: _Neo4jDateTime
          field.type = transformTemporalTypeName(field.type, config);
          field = transformTemporalFieldArgs(field, config);
        });
      }
    }
  });
  return typeMap;
};

const transformTemporalTypeName = (type, config, isArgument) => {
  if (type.kind !== 'NamedType') {
    type.type = transformTemporalTypeName(type.type, config);
    return type;
  }
  if (type.kind === 'NamedType') {
    switch (type.name.value) {
      case 'Time': {
        if (config.time === true) {
          type.name.value = `_Neo4jTime${isArgument ? `Input` : ''}`;
        }
        break;
      }
      case 'Date': {
        if (config.date === true) {
          type.name.value = `_Neo4jDate${isArgument ? `Input` : ''}`;
        }
        break;
      }
      case 'DateTime': {
        if (config.datetime === true) {
          type.name.value = `_Neo4jDateTime${isArgument ? `Input` : ''}`;
        }
        break;
      }
      case 'LocalTime': {
        if (config.localtime === true) {
          type.name.value = `_Neo4jLocalTime${isArgument ? `Input` : ''}`;
        }
        break;
      }
      case 'LocalDateTime': {
        if (config.localdatetime === true) {
          type.name.value = `_Neo4jLocalDateTime${isArgument ? `Input` : ''}`;
        }
        break;
      }
      default:
        break;
    }
  }
  return type;
};

const decideTemporalConfig = config => {
  let defaultConfig = {
    time: true,
    date: true,
    datetime: true,
    localtime: true,
    localdatetime: true
  };
  const providedConfig = config ? config.temporal : defaultConfig;
  if (typeof providedConfig === 'boolean') {
    if (providedConfig === false) {
      defaultConfig.time = false;
      defaultConfig.date = false;
      defaultConfig.datetime = false;
      defaultConfig.localtime = false;
      defaultConfig.localdatetime = false;
    }
  } else if (typeof providedConfig === 'object') {
    Object.keys(defaultConfig).forEach(e => {
      if (providedConfig[e] === undefined) {
        providedConfig[e] = defaultConfig[e];
      }
    });
    defaultConfig = providedConfig;
  }
  return defaultConfig;
};

export const addTemporalTypes = (typeMap, config) => {
  config = decideTemporalConfig(config);
  typeMap = temporalTypes(typeMap, config);
  return transformTemporalFields(typeMap, config);
};
