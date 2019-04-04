const { makeExecutableSchema } = require('graphql-tools');
const { parse, print } = require('graphql');
const { neo4jgraphql } = require('./resolve');
const {
  printTypeMap,
  extractTypeMapFromTypeDefs,
  createOperationMap,
  getNamedType,
  getPrimaryKeys,
  getFieldDirective,
  getRelationTypeDirectiveArgs,
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
  getExcludedTypes,
  parseInputFieldsSdl
} = require('./utils');
const {
  possiblyAddDirectiveImplementations,
  possiblyAddScopeDirective,
  addDirectiveDeclarations
} = require('./auth');

var augmentedSchema = (typeMap, resolvers, config) => {
  const augmentedTypeMap = augmentTypeMap(typeMap, resolvers, config);
  const augmentedResolvers = augmentResolvers(
    augmentedTypeMap,
    resolvers,
    config
  );
  const schemaDirectives = possiblyAddDirectiveImplementations(
    schemaDirectives,
    typeMap,
    config
  );
  return makeExecutableSchema({
    typeDefs: printTypeMap(augmentedTypeMap),
    resolvers: augmentedResolvers,
    resolverValidationOptions: {
      requireResolversForResolveType: false
    },
    schemaDirectives
  });
};

var makeAugmentedExecutableSchema = ({
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
  schemaDirectives = possiblyAddDirectiveImplementations(
    schemaDirectives,
    typeMap,
    config
  );
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

var extractTypeMapFromSchema = schema => {
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

var extractResolversFromSchema = schema => {
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

var augmentTypeMap = (typeMap, resolvers, config) => {
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
  typeMap = addDirectiveDeclarations(typeMap, config);
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

const possiblyAddOrderingArgument = (args, fieldName) => {
  const orderingType = `_${fieldName}Ordering`;
  if (args.findIndex(e => e.name.value === orderingType) === -1) {
    args.push({
      kind: 'InputValueDefinition',
      name: {
        kind: 'Name',
        value: 'orderBy'
      },
      type: {
        kind: 'ListType',
        type: {
          kind: 'NamedType',
          name: {
            kind: 'Name',
            value: orderingType
          }
        }
      }
    });
  }
  return args;
};

var possiblyAddArgument = (args, fieldName, fieldType) => {
  if (args.findIndex(e => e.name.value === fieldName) === -1) {
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
  // FIXME: inferring where to add @neo4j_ignore directive improperly causes
  //        fields to be ignored when logger is added, so remove functionality
  //        until we refactor how to infer when @neo4j_ignore directive is needed
  //        see https://github.com/neo4j-graphql/neo4j-graphql-js/issues/189
  // astNode.fields = possiblyAddIgnoreDirective(
  //   astNode,
  //   typeMap,
  //   resolvers,
  //   config
  // );
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
        queryMap[t].arguments = possiblyAddOrderingArgument(
          args,
          valueTypeName
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
    let inputSuffix = '';
    let inputName = '';
    if (isNodeType(astNode) || getTypeDirective(astNode, 'relation')) {
      inputSuffix = isNodeType(astNode) ? 'Input' : 'PKInput';
      inputName = `_${astNode.name.value}${inputSuffix}`;
      if (typeMap[inputName] === undefined) {
        const pks = getPrimaryKeys(astNode);
        if (pks.length) {
          // Always exactly require the pks of a node type
          let pkFields = pks.map(
            pk =>
              `${pk.name.value}: ${decideFieldType(
                getNamedType(pk).name.value
              )}!`
          );
          const inputType = `input ${inputName} { ${pkFields.join(' ')} }`;
          typeMap[inputName] = parse(inputType);
        }
      }
    }
    if (getTypeDirective(astNode, 'relation')) {
      inputSuffix = 'FullInput';
      inputName = `_${astNode.name.value}${inputSuffix}`;
      // Only used for the .data argument in generated relation creation mutations
      if (typeMap[inputName] === undefined) {
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
        if (
          hasSomePropertyField &&
          shouldAugmentRelationField(config, 'mutation', fromName, toName)
        ) {
          const relationInputFields = buildRelationTypeInputFields(
            astNode,
            fields,
            typeMap,
            resolvers
          );
          typeMap[inputName] = parse(
            `input ${inputName} {${relationInputFields}}`
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
    const authDirectives = possiblyAddScopeDirective({
      entityType: 'node',
      operationType: 'Read',
      typeName,
      config
    });
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
        },
        directives: [authDirectives]
      });
    }
  }
  return typeMap;
};

const possiblyAddOrderingEnum = (astNode, typeMap, resolvers, config) => {
  const typeName = astNode.name.value;
  if (isNodeType(astNode) && shouldAugmentType(config, 'query', typeName)) {
    const name = `_${astNode.name.value}Ordering`;
    const values = createOrderingFields(astNode, typeMap, resolvers);
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
        mutationMap,
        config
      );
      typeMap = possiblyAddTypeMutation(
        `Update`,
        astNode,
        resolvers,
        typeMap,
        mutationMap,
        config
      );
      typeMap = possiblyAddTypeMutation(
        `Delete`,
        astNode,
        resolvers,
        typeMap,
        mutationMap,
        config
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
      fieldIsNotIgnored(astNode, field, resolvers) &&
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
      field.arguments = possiblyAddOrderingArgument(args, relationTypeName);
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
  mutationType,
  astNode,
  resolvers,
  typeMap,
  mutationMap,
  config
) => {
  const typeName = astNode.name.value;
  const mutationName = mutationType + typeName;
  // Only generate if the mutation named mutationName does not already exist
  if (mutationMap[mutationName] === undefined) {
    const args = buildMutationArguments(
      mutationType,
      astNode,
      resolvers,
      typeMap
    );
    const typeName = astNode.name.value;
    const authDirectives = possiblyAddScopeDirective({
      entityType: 'node',
      operationType: mutationType,
      typeName,
      config
    });
    typeMap['Mutation'].fields.push({
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
      directives: [authDirectives]
    });
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
      // TODO refactor
      const relationTypePayloadFields = fields
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
        const fieldArgs = getFieldArgumentsFromAst(field, typeName);
        typeMap[`${fieldTypeName}Directions`] = parse(`
        type ${fieldTypeName}Directions ${print(relationAstNode.directives)} {
            from${fieldArgs}: ${fieldIsList ? '[' : ''}${fieldTypeName}${
          fieldIsList ? ']' : ''
        }
            to${fieldArgs}: ${fieldIsList ? '[' : ''}${fieldTypeName}${
          fieldIsList ? ']' : ''
        }
      }`);

        typeMap[fieldTypeName] = parse(`
      type ${fieldTypeName} ${print(relationAstNode.directives)} {
        ${relationTypePayloadFields}
        ${fromValue}: ${fromValue}
      }
      `);

        // remove arguments on field
        field.arguments = [];
      } else {
        // Non-reflexive case, (User)-[RATED]->(Movie)
        typeMap[fieldTypeName] = parse(`
      type ${fieldTypeName} ${print(relationAstNode.directives)} {
        ${relationTypePayloadFields}
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
  relationHasProps,
  config
) => {
  const mutationTypes = ['Add', 'Remove'];
  let mutationName = '';
  let payloadTypeName = '';
  let hasSomePropertyField = false;
  mutationTypes.forEach(action => {
    mutationName = `${action}${typeName}${capitalizedFieldName}`;
    // Prevents overwriting
    if (mutationMap[mutationName] === undefined) {
      const fromInputAst = typeMap[fromName];
      const toInputAst = typeMap[toName];
      const fromInputPrimaryKeys = getPrimaryKeys(fromInputAst);
      const shouldUseRelationFromArgument = !!fromInputPrimaryKeys.length;
      const toInputPrimaryKeys = getPrimaryKeys(toInputAst);
      const shouldUseRelationToArgument = !!toInputPrimaryKeys.length;

      const dataName =
        action === 'Remove'
          ? `_${relatedAstNode.name.value}PKInput`
          : `_${relatedAstNode.name.value}FullInput`;

      if (fromInputPrimaryKeys.length || toInputPrimaryKeys.length) {
        payloadTypeName = `_${mutationName}Payload`;
        hasSomePropertyField = relatedAstNode.fields.find(
          e => e.name.value !== 'from' && e.name.value !== 'to'
        );
        // If we know we should expect data properties (from context: relationHasProps)
        // and if there is at least 1 field that is not .to or .from (hasSomePropertyField)
        // and if we are generating the add relation mutation, then add the .data argument
        const shouldUseRelationDataArgument =
          relationHasProps &&
          hasSomePropertyField &&
          (action !== 'Remove' || getPrimaryKeys(relatedAstNode).length);
        const authDirectives = possiblyAddScopeDirective({
          entityType: 'relation',
          operationType: action,
          typeName,
          relatedTypeName: toName,
          config
        });
        // Relation mutation type
        typeMap.Mutation.fields.push(
          parseFieldSdl(`
              ${mutationName}(${
            shouldUseRelationFromArgument ? `from: _${fromName}Input!` : ''
          }${
            shouldUseRelationFromArgument && shouldUseRelationToArgument
              ? `, `
              : ''
          }${shouldUseRelationToArgument ? `to: _${toName}Input!` : ''}${
            shouldUseRelationDataArgument
              ? `, data: ${dataName}${
                  getPrimaryKeys(relatedAstNode).length ? '!' : ''
                }`
              : ''
          }): ${payloadTypeName} @MutationMeta(relationship: "${relationName}", from: "${fromName}", to: "${toName}") ${
            authDirectives ? authDirectives : ''
          }
          `)
        );
        // Prevents overwriting
        if (typeMap[payloadTypeName] === undefined) {
          typeMap[payloadTypeName] = parse(`
            type ${payloadTypeName} @relation(name: "${relationName}", ${
            shouldUseRelationFromArgument ? `from: "${fromName}"` : ''
          }${
            shouldUseRelationFromArgument && shouldUseRelationToArgument
              ? ', '
              : ''
          }${shouldUseRelationToArgument ? `to: "${toName}"` : ''}) {
              ${shouldUseRelationFromArgument ? `from: ${fromName}` : ''}
              ${shouldUseRelationToArgument ? `to: ${toName}` : ''}
              ${
                shouldUseRelationDataArgument
                  ? getRelationMutationPayloadFieldsFromAst(relatedAstNode)
                  : ''
              }
            }
            `);
        }
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
      if (fieldIsNotIgnored(astNode, field, resolvers)) {
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
      true,
      config
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
      false,
      config
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
    if (fieldIsNotIgnored(astNode, fields[index], resolvers)) {
      fields.splice(index, 1, definition);
    }
  } else {
    fields.push(definition);
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

const createOrderingFields = (astNode, typeMap, resolvers) => {
  const fields = astNode ? astNode.fields : [];
  let type = {};
  let valueType = {};
  let valueTypeName = '';
  let fieldName = '';
  return fields.reduce((acc, field) => {
    type = getNamedType(field);
    valueTypeName = type.name.value;
    valueType = typeMap[valueTypeName];
    if (
      !isListType(field) &&
      fieldIsNotIgnored(astNode, field, resolvers) &&
      (isBasicScalar(type.name.value) ||
        isKind(valueType, 'EnumTypeDefinition') ||
        isTemporalType(valueTypeName))
    ) {
      fieldName = field.name.value;
      acc.push({
        kind: 'EnumValueDefinition',
        name: {
          kind: 'Name',
          value: `${fieldName}_asc`
        }
      });
      acc.push({
        kind: 'EnumValueDefinition',
        name: {
          kind: 'Name',
          value: `${fieldName}_desc`
        }
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
    if (fieldIsNotIgnored(astNode, t, resolvers)) {
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

const shouldAugmentType = (config, rootType, type) => {
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

const fieldIsNotIgnored = (astNode, field, resolvers) => {
  return !getFieldDirective(field, 'neo4j_ignore');
  // FIXME: issue related to inferences on AST field .resolve
  // See: possiblyAddIgnoreDirective
  // !getCustomFieldResolver(astNode, field, resolvers)
};

const isNotSystemField = name => {
  return name !== '_id' && name !== 'to' && name !== 'from';
};

var addTemporalTypes = (typeMap, config) => {
  config = decideTemporalConfig(config);
  typeMap = temporalTypes(typeMap, config);
  return transformTemporalFields(typeMap, config);
};

const getFieldArgumentsFromAst = (field, typeName, fieldIsList) => {
  let fieldArgs = field.arguments ? field.arguments : [];
  let paginationArgs = [];
  if (fieldIsList) {
    paginationArgs = possiblyAddArgument(fieldArgs, 'first', 'Int');
    paginationArgs = possiblyAddArgument(fieldArgs, 'offset', 'Int');
    paginationArgs = possiblyAddArgument(
      fieldArgs,
      'orderBy',
      `_${typeName}Ordering`
    );
  }
  const args = [paginationArgs, ...fieldArgs]
    .reduce((acc, t) => {
      acc.push(print(t));
      return acc;
    }, [])
    .join('\n');
  return args.length > 0 ? `(${args})` : '';
};

const buildMutationArguments = (mutationType, astNode, resolvers, typeMap) => {
  const primaryKeys = getPrimaryKeys(astNode);
  switch (mutationType) {
    case 'Create': {
      return buildCreateMutationArguments(astNode, typeMap, resolvers);
    }
    case 'Update': {
      return buildUpdateMutationArguments(
        primaryKeys,
        astNode,
        typeMap,
        resolvers
      );
    }
    case 'Delete': {
      return buildDeleteMutationArguments(primaryKeys);
    }
  }
};

const buildUpdateMutationArguments = (
  primaryKeys,
  astNode,
  typeMap,
  resolvers
) => {
  let mutationArgs = [];
  const primaryKeyNames = primaryKeys.map(primaryKey => primaryKey.name.value);
  // Primary key fields are first args and required for node selection
  const parsedPrimaryKeyFields = primaryKeys.map(
    primaryKey =>
      `${primaryKey.name.value}: ${getNamedType(primaryKey).name.value}!`
  );
  let type = {};
  let valueTypeName = '';
  let valueType = {};
  let fieldName = '';
  mutationArgs = astNode.fields.reduce((acc, t) => {
    type = getNamedType(t);
    fieldName = t.name.value;
    valueTypeName = type.name.value;
    valueType = typeMap[valueTypeName];
    if (fieldIsNotIgnored(astNode, t, resolvers)) {
      if (
        primaryKeyNames.indexOf(fieldName) < 0 &&
        isNotSystemField(fieldName) &&
        !getFieldDirective(t, 'cypher') &&
        (isBasicScalar(valueTypeName) ||
          isKind(valueType, 'EnumTypeDefinition') ||
          isKind(valueType, 'ScalarTypeDefinition') ||
          isTemporalType(valueTypeName))
      ) {
        acc.push(print(t));
      }
    }
    return acc;
  }, []);
  mutationArgs.unshift(...parsedPrimaryKeyFields);
  mutationArgs = transformManagedFieldTypes(mutationArgs);
  mutationArgs = parseInputFieldsSdl(mutationArgs);
  return mutationArgs;
};

const buildDeleteMutationArguments = primaryKeys => {
  let mutationArgs = primaryKeys.map(
    primaryKey =>
      `${primaryKey.name.value}: ${getNamedType(primaryKey).name.value}!`
  );
  mutationArgs = transformManagedFieldTypes(mutationArgs);
  return parseInputFieldsSdl(mutationArgs);
};

const buildCreateMutationArguments = (astNode, typeMap, resolvers) => {
  let type = {};
  let valueTypeName = '';
  let valueType = {};
  let fieldName = '';
  let firstIdField = undefined;
  let field = {};
  let mutationArgs = astNode.fields.reduce((acc, t) => {
    type = getNamedType(t);
    fieldName = t.name.value;
    valueTypeName = type.name.value;
    valueType = typeMap[valueTypeName];
    if (fieldIsNotIgnored(astNode, t, resolvers)) {
      if (
        isNotSystemField(fieldName) &&
        !getFieldDirective(t, 'cypher') &&
        (isBasicScalar(valueTypeName) ||
          isKind(valueType, 'EnumTypeDefinition') ||
          isKind(valueType, 'ScalarTypeDefinition') ||
          isTemporalType(valueTypeName))
      ) {
        if (
          isNonNullType(t) &&
          !isListType(t) &&
          valueTypeName === 'ID' &&
          !firstIdField
        ) {
          firstIdField = t;
          field = {
            kind: 'InputValueDefinition',
            name: {
              kind: 'Name',
              value: fieldName
            },
            type: {
              kind: 'NamedType',
              name: {
                kind: 'Name',
                value: valueTypeName
              }
            }
          };
        } else {
          field = t;
        }
        acc.push(print(field));
      }
    }
    return acc;
  }, []);
  // Transform managed field types: _Neo4jTime -> _Neo4jTimeInput
  mutationArgs = transformManagedFieldTypes(mutationArgs);
  // Use a helper to get the AST for all fields
  mutationArgs = parseInputFieldsSdl(mutationArgs);
  return mutationArgs;
};

const buildRelationTypeInputFields = (astNode, fields, typeMap, resolvers) => {
  let fieldName = '';
  let valueTypeName = '';
  let valueType = {};
  let relationInputFields = fields.reduce((acc, t) => {
    fieldName = t.name.value;
    valueTypeName = getNamedType(t).name.value;
    valueType = typeMap[valueTypeName];
    if (
      fieldIsNotIgnored(astNode, t, resolvers) &&
      isNotSystemField(fieldName) &&
      !getFieldDirective(t, 'cypher') &&
      (isBasicScalar(valueTypeName) ||
        isKind(valueType, 'EnumTypeDefinition') ||
        isKind(valueType, 'ScalarTypeDefinition') ||
        isTemporalType(valueTypeName))
    ) {
      acc.push(
        print({
          kind: 'InputValueDefinition',
          name: t.name,
          type: t.type
        })
      );
    }
    return acc;
  }, []);
  relationInputFields = transformManagedFieldTypes(relationInputFields);
  return relationInputFields.join('\n');
};

const transformManagedFieldTypes = fields => {
  return fields.reduce((acc, field) => {
    if (
      field !== '_Neo4jDateTimeInput' &&
      field !== '_Neo4jDateInput' &&
      field !== '_Neo4jTimeInput' &&
      field !== '_Neo4jLocalTimeInput' &&
      field !== '_Neo4jLocalDateTimeInput'
    ) {
      if (field.includes('_Neo4jDateTime')) {
        field = field.replace('_Neo4jDateTime', '_Neo4jDateTimeInput');
      } else if (field.includes('_Neo4jDate')) {
        field = field.replace('_Neo4jDate', '_Neo4jDateInput');
      } else if (field.includes('_Neo4jTime')) {
        field = field.replace('_Neo4jTime', '_Neo4jTimeInput');
      } else if (field.includes('_Neo4jLocalTime')) {
        field = field.replace('_Neo4jLocalTime', '_Neo4jLocalTimeInput');
      } else if (field.includes('_Neo4jLocalDateTime')) {
        field = field.replace(
          '_Neo4jLocalDateTime',
          '_Neo4jLocalDateTimeInput'
        );
      }
    }
    acc.push(field);
    return acc;
  }, []);
};

module.exports = {
  augmentedSchema,
  makeAugmentedExecutableSchema,
  extractTypeMapFromSchema,
  extractResolversFromSchema,
  augmentTypeMap,
  possiblyAddArgument,
  addTemporalTypes
};
