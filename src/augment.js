import { neo4jgraphql } from './index';
import { parse, print } from 'graphql';
import {
  createOperationMap,
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
  addDirectiveDeclarations,
  lowFirstLetter,
  isTemporalType
} from './utils';
import cloneDeep from 'lodash/cloneDeep';

export const augmentTypeMap = (typeMap, config) => {
  const types = Object.keys(typeMap);
  // For now, the Query and Mutation type names have been
  // elevated from various use cases to be set here
  const queryType = 'Query';
  const mutationType = 'Mutation';
  typeMap = initializeOperationTypes({
    types,
    typeMap,
    config,
    queryType,
    mutationType
  });
  // adds relation directives on relation types
  // if not written, with default args
  typeMap = computeRelationTypeDirectiveDefaults(typeMap);
  typeMap = addTemporalTypes(typeMap, config);
  const queryMap = createOperationMap(typeMap.Query);
  const mutationMap = createOperationMap(typeMap.Mutation);
  let astNode = {};
  let typeName = '';
  Object.keys(typeMap).forEach(t => {
    astNode = typeMap[t];
    typeName = astNode.name.value;
    if (!isTemporalType(typeName)) {
      astNode = augmentType(astNode, typeMap, config, queryType);
      // Query API Only
      // config is used in augmentQueryArguments to prevent adding node list args
      if (
        shouldAugmentType({
          config,
          operationType: queryType,
          type: typeName
        })
      ) {
        typeMap = possiblyAddQuery(astNode, typeMap, queryMap);
        typeMap = possiblyAddOrderingEnum(astNode, typeMap);
      }
      // Mutation API Only
      // adds node selection input types for each type
      if (
        shouldAugmentType({
          config,
          operationType: mutationType,
          type: typeName
        })
      ) {
        typeMap = possiblyAddTypeInput({
          astNode,
          typeMap,
          mutationType,
          config
        });
        typeMap = possiblyAddTypeMutations({
          astNode,
          typeMap,
          mutationMap,
          config,
          mutationType,
          typeName
        });
      }
      // Relation Type SDL support and Relation Mutation API
      typeMap = handleRelationFields({
        astNode,
        typeMap,
        mutationMap,
        config,
        queryType,
        mutationType
      });
      typeMap[t] = astNode;
    }
  });
  typeMap = augmentQueryArguments(typeMap, config, queryType);
  // add directive declarations for graphql@14 support
  typeMap = addDirectiveDeclarations(typeMap);
  return typeMap;
};

const augmentType = (astNode, typeMap, config, queryType) => {
  if (isNodeType(astNode)) {
    astNode.fields = addOrReplaceNodeIdField(astNode);
    astNode.fields = possiblyAddTypeFieldArguments(
      astNode,
      typeMap,
      config,
      queryType
    );
  }
  return astNode;
};

const augmentQueryArguments = (typeMap, config, queryType) => {
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
        shouldAugmentType({
          config,
          operationType: queryType,
          type: valueTypeName
        })
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
    typeMap.Query.fields = Object.values(queryMap);
  }
  return typeMap;
};

export const augmentResolvers = (augmentedTypeMap, resolvers) => {
  let queryResolvers = resolvers && resolvers.Query ? resolvers.Query : {};
  const generatedQueryMap = createOperationMap(augmentedTypeMap.Query);
  queryResolvers = possiblyAddResolvers(generatedQueryMap, queryResolvers);
  if (Object.keys(queryResolvers).length > 0) {
    resolvers.Query = queryResolvers;
  }
  let mutationResolvers =
    resolvers && resolvers.Mutation ? resolvers.Mutation : {};
  const generatedMutationMap = createOperationMap(augmentedTypeMap.Mutation);
  mutationResolvers = possiblyAddResolvers(
    generatedMutationMap,
    mutationResolvers
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
      },
      directives: []
    });
  }
  return args;
};

const possiblyAddResolvers = (operationTypeMap, resolvers) => {
  let operationName = '';
  return Object.keys(operationTypeMap).reduce((acc, t) => {
    // if no resolver provided for this operation type field
    operationName = operationTypeMap[t].name.value;
    if (acc[operationName] === undefined) {
      acc[operationName] = neo4jgraphql;
    }
    return acc;
  }, resolvers);
};

const possiblyAddTypeInput = ({ astNode, typeMap, mutationType, config }) => {
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
      const shouldCreateRelationInput = shouldAugmentRelationField({
        config,
        operationType: mutationType,
        fromName,
        toName
      });
      if (hasSomePropertyField && shouldCreateRelationInput) {
        let field = {};
        typeMap[inputName] = parse(
          `input ${inputName} {${fields
            .reduce((acc, t) => {
              fieldName = t.name.value;
              valueTypeName = getNamedType(t).name.value;
              valueType = typeMap[valueTypeName];
              field = cloneDeep(t);
              if (
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
  return typeMap;
};

const possiblyAddQuery = (astNode, typeMap, queryMap) => {
  if (isNodeType(astNode)) {
    const name = astNode.name.value;
    if (queryMap[name] === undefined) {
      typeMap.Query.fields.push({
        kind: 'FieldDefinition',
        name: {
          kind: 'Name',
          value: name
        },
        arguments: createQueryArguments(astNode, typeMap),
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
        directives: []
      });
    }
  }
  return typeMap;
};

const possiblyAddOrderingEnum = (astNode, typeMap) => {
  if (isNodeType(astNode)) {
    const name = `_${astNode.name.value}Ordering`;
    const values = createOrderingFields(astNode.fields, typeMap);
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

const possiblyAddTypeMutations = ({
  astNode,
  typeMap,
  mutationMap,
  config,
  mutationType,
  typeName
}) => {
  if (
    isNodeType(astNode) &&
    shouldAugmentType({
      config,
      operationType: mutationType,
      type: typeName
    })
  ) {
    typeMap = possiblyAddTypeMutation(`Create`, astNode, typeMap, mutationMap);
    typeMap = possiblyAddTypeMutation(`Update`, astNode, typeMap, mutationMap);
    typeMap = possiblyAddTypeMutation(`Delete`, astNode, typeMap, mutationMap);
  }
  return typeMap;
};

const handleRelationFields = ({
  astNode,
  typeMap,
  mutationMap,
  config,
  queryType,
  mutationType
}) => {
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
      fieldValueName = getNamedType(field).name.value;
      capitalizedFieldName = capitalizeName(field.name.value);
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
              config,
              mutationType
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
            queryType,
            mutationType,
            typeMap,
            mutationMap
          });
        }
      }
    }
  }
  return typeMap;
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

const shouldAugmentRelationField = ({
  config,
  operationType,
  fromName,
  toName
}) => {
  // validate that both the fromName and toName node types
  // have not been excluded
  return (
    shouldAugmentType({
      config,
      operationType,
      type: fromName
    }) &&
    shouldAugmentType({
      config,
      operationType,
      type: toName
    })
  );
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
  queryType,
  mutationType,
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
    shouldAugmentRelationField({
      config,
      operationType: mutationType,
      fromName,
      toName
    }) &&
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
  config,
  mutationType
}) => {
  let fromName = typeName;
  let toName = fieldValueName;
  // Mutation API, relation mutations for field directives
  if (
    shouldAugmentRelationField({
      config,
      operationType: mutationType,
      fromName,
      toName
    })
  ) {
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

const possiblyAddTypeFieldArguments = (astNode, typeMap, config, queryType) => {
  const fields = astNode.fields;
  let relationTypeName = '';
  let relationType = {};
  let args = [];
  fields.forEach(field => {
    relationTypeName = getNamedType(field).name.value;
    relationType = typeMap[relationTypeName];
    if (
      // only adds args if node payload type has not been excluded
      shouldAugmentType({
        config,
        operationType: queryType,
        type: relationTypeName
      }) &&
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

const decideFieldType = name => {
  if (isTemporalType(name)) {
    name = `${name}Input`;
  }
  return name;
};

const createOrderingFields = (fields, typeMap) => {
  let type = {};
  return fields.reduce((acc, t) => {
    type = getNamedType(t);
    if (isBasicScalar(type.name.value)) {
      acc.push({
        kind: 'EnumValueDefinition',
        name: {
          kind: 'Name',
          value: `${t.name.value}_asc`
        },
        directives: []
      });
      acc.push({
        kind: 'EnumValueDefinition',
        name: {
          kind: 'Name',
          value: `${t.name.value}_desc`
        },
        directives: []
      });
    }
    return acc;
  }, []);
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

const buildAllFieldArguments = (namePrefix, astNode, typeMap) => {
  let fields = [];
  let type = {};
  let fieldName = '';
  let valueTypeName = '';
  let valueType = {};
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
          isTemporalType(valueTypeName) ||
          (fieldName !== '_id' &&
            !getFieldDirective(t, 'cypher') &&
            (isBasicScalar(valueTypeName) ||
              isKind(valueType, 'EnumTypeDefinition') ||
              isKind(valueType, 'ScalarTypeDefinition')))
        ) {
          const isNonNullable = isNonNullType(t);
          field = cloneDeep(t);
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
        return acc;
      }, fields);
      break;
    }
    case 'Update': {
      const primaryKey = getPrimaryKey(astNode);
      let augmentedFields = [];
      if (primaryKey) {
        // Primary key field is first field and required
        const primaryKeyName = primaryKey.name.value;
        const primaryKeyType = getNamedType(primaryKey);
        const parsedPrimaryKeyField = parseFieldSdl(`
          ${primaryKeyName}: ${decideFieldType(primaryKeyType.name.value)}!
        `);
        parsedPrimaryKeyField.kind = 'InputValueDefinition';
        augmentedFields.push(parsedPrimaryKeyField);
        let field = {};
        astNode.fields.reduce((acc, t) => {
          type = getNamedType(t);
          fieldName = t.name.value;
          valueTypeName = type.name.value;
          valueType = typeMap[valueTypeName];
          field = cloneDeep(t);
          if (
            (fieldName !== primaryKeyName &&
              fieldName !== '_id' &&
              !getFieldDirective(t, 'cypher') &&
              (isBasicScalar(valueTypeName) ||
                isKind(valueType, 'EnumTypeDefinition') ||
                isKind(valueType, 'ScalarTypeDefinition'))) ||
            isTemporalType(valueTypeName)
          ) {
            if (isNonNullType(field)) {
              // Don't require update fields, that wouldn't be very flexible
              field.type = field.type.type;
            }
            field.kind = 'InputValueDefinition';
            field.type = transformManagedFieldTypes(field.type);
            acc.push(field);
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
      const primaryKey = getPrimaryKey(astNode);
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
      break;
    }
  }
  return fields;
};

const possiblyAddTypeMutation = (namePrefix, astNode, typeMap, mutationMap) => {
  const typeName = astNode.name.value;
  const mutationName = namePrefix + typeName;
  // Only generate if the mutation named mutationName does not already exist
  if (mutationMap[mutationName] === undefined) {
    let args = buildAllFieldArguments(namePrefix, astNode, typeMap);
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
            type ${fieldTypeName}Directions ${print(
          relationAstNode.directives
        )} {
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

const addOrReplaceNodeIdField = astNode => {
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
  // If it has already been provided, replace it to force valueType,
  // else add it as the last field
  index >= 0 ? fields.splice(index, 1, definition) : fields.push(definition);
  return fields;
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

const capitalizeName = name => {
  return name.charAt(0).toUpperCase() + name.substr(1);
};

const createQueryArguments = (astNode, typeMap) => {
  let type = {};
  let valueTypeName = '';
  astNode.fields = addOrReplaceNodeIdField(astNode);
  return astNode.fields.reduce((acc, t) => {
    type = getNamedType(t);
    valueTypeName = type.name.value;
    if (isQueryArgumentFieldType(type, typeMap[valueTypeName])) {
      acc.push({
        kind: 'InputValueDefinition',
        name: {
          kind: 'Name',
          value: t.name.value
        },
        type: type,
        directives: []
      });
    } else if (isTemporalType(valueTypeName)) {
      acc.push({
        kind: 'InputValueDefinition',
        name: {
          kind: 'Name',
          value: t.name.value
        },
        type: {
          kind: 'NamedType',
          name: {
            kind: 'Name',
            value: `${valueTypeName}Input`
          }
        },
        directives: []
      });
    }
    return acc;
  }, []);
};

const isQueryArgumentFieldType = (type, valueType) => {
  return (
    isBasicScalar(type.name.value) ||
    isKind(valueType, 'EnumTypeDefinition') ||
    isKind(valueType, 'ScalarTypeDefinition')
  );
};

const hasNonExcludedNodeType = (types, typeMap, operationType, config) => {
  return types.find(
    e =>
      isNodeType(typeMap[e]) &&
      shouldAugmentType({
        config,
        operationType,
        type: typeMap[e].name.value
      })
  );
};

const initializeOperationTypes = ({
  types,
  typeMap,
  config,
  queryType,
  mutationType
}) => {
  if (hasNonExcludedNodeType(types, typeMap, queryType, config)) {
    typeMap = possiblyAddObjectType(typeMap, queryType);
  }
  if (hasNonExcludedNodeType(types, typeMap, mutationType, config)) {
    typeMap = possiblyAddObjectType(typeMap, mutationType);
  }
  return typeMap;
};

const computeRelationTypeDirectiveDefaults = typeMap => {
  let astNode = {};
  let fields = [];
  let name = '';
  let to = {};
  let from = {};
  let fromTypeName = '';
  let toTypeName = '';
  let fromAstNode = {};
  let toAstNode = '';
  let typeDirective = {};
  let relationName = '';
  let toName = '';
  let fromName = '';
  let typeDirectiveIndex = -1;
  Object.keys(typeMap).forEach(typeName => {
    astNode = typeMap[typeName];
    name = astNode.name.value;
    fields = astNode.fields;
    to = fields ? fields.find(e => e.name.value === 'to') : undefined;
    from = fields ? fields.find(e => e.name.value === 'from') : undefined;
    if (to && !from)
      throw new Error(
        `Relationship type ${name} has a 'to' field but no corresponding 'from' field`
      );
    if (from && !to)
      throw new Error(
        `Relationship type ${name} has a 'from' field but no corresponding 'to' field`
      );
    if (from && to) {
      // get values of .to and .from fields
      fromTypeName = getNamedType(from).name.value;
      toTypeName = getNamedType(to).name.value;
      // get the astNodes of those object values
      fromAstNode = typeMap[fromTypeName];
      toAstNode = typeMap[toTypeName];
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
        astNode.directives[typeDirectiveIndex] = {
          kind: 'Directive',
          name: {
            kind: 'Name',
            value: 'relation'
          },
          arguments: [
            {
              kind: 'Argument',
              name: {
                kind: 'Name',
                value: 'name'
              },
              value: {
                kind: 'StringValue',
                value: relationName
              }
            },
            {
              kind: 'Argument',
              name: {
                kind: 'Name',
                value: 'from'
              },
              value: {
                kind: 'StringValue',
                value: fromTypeName
              }
            },
            {
              kind: 'Argument',
              name: {
                kind: 'Name',
                value: 'to'
              },
              value: {
                kind: 'StringValue',
                value: toTypeName
              }
            }
          ]
        };
      } else {
        astNode.directives.push({
          kind: 'Directive',
          name: {
            kind: 'Name',
            value: 'relation'
          },
          arguments: [
            {
              kind: 'Argument',
              name: {
                kind: 'Name',
                value: 'name'
              },
              value: {
                kind: 'StringValue',
                value: relationName
              }
            },
            {
              kind: 'Argument',
              name: {
                kind: 'Name',
                value: 'from'
              },
              value: {
                kind: 'StringValue',
                value: fromTypeName
              }
            },
            {
              kind: 'Argument',
              name: {
                kind: 'Name',
                value: 'to'
              },
              value: {
                kind: 'StringValue',
                value: toTypeName
              }
            }
          ]
        });
      }
      typeMap[typeName] = astNode;
    }
  });
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

const shouldAugmentType = ({ config = {}, operationType = '', type }) => {
  operationType = lowFirstLetter(operationType);
  const typeValue = config[operationType];
  const configType = typeof typeValue;
  if (configType === 'boolean') {
    return config[operationType];
  } else if (configType === 'object') {
    const excludes = typeValue.exclude;
    if (Array.isArray(excludes)) {
      if (type) {
        return !excludes.includes(type);
      }
    }
  }
  return true;
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
  let astNode = {};
  Object.keys(typeMap).forEach(t => {
    astNode = typeMap[t];
    if (
      astNode &&
      // must be graphql object type
      astNode.kind === 'ObjectTypeDefinition'
      // does not have relation type directive
      // getTypeDirective(astNode, 'relation') === undefined &&
      // does not have from and to fields; not relation type
      // astNode.fields &&
      // astNode.fields.find(e => e.name.value === 'from') === undefined &&
      // astNode.fields.find(e => e.name.value === 'to') === undefined
    ) {
      if (!isTemporalType(t)) {
        astNode.fields.forEach(field => {
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
