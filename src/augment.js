import { neo4jgraphql } from './index';
import { parse, print } from 'graphql';
import {
  createOperationMap,
  createRelationMap,
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
  addDirectiveDeclarations
} from './utils';

export const augmentTypeMap = typeMap => {
  const types = Object.keys(typeMap);
  typeMap = initializeOperationTypes(types, typeMap);
  const queryMap = createOperationMap(typeMap.Query);
  const mutationMap = createOperationMap(typeMap.Mutation);
  typeMap = computeRelationTypeDirectiveDefaults(typeMap);
  const relationMap = createRelationMap(typeMap);
  let astNode = {};
  Object.keys(typeMap).forEach(t => {
    astNode = typeMap[t];
    astNode = augmentType(astNode, typeMap);
    typeMap = possiblyAddTypeInput(astNode, typeMap);
    typeMap = possiblyAddQuery(astNode, typeMap, queryMap);
    typeMap = possiblyAddOrderingEnum(astNode, typeMap);
    typeMap = possiblyAddTypeMutations(astNode, typeMap, mutationMap);
    typeMap = possiblyAddRelationMutations(
      astNode,
      typeMap,
      mutationMap,
      relationMap
    );
    typeMap[t] = astNode;
  });
  typeMap = augmentQueryArguments(typeMap);
  typeMap = addDirectiveDeclarations(typeMap);
  return typeMap;
};

const augmentType = (astNode, typeMap) => {
  if (isNodeType(astNode)) {
    astNode.fields = addOrReplaceNodeIdField(astNode, 'ID');
    astNode.fields = possiblyAddTypeFieldArguments(astNode, typeMap);
  }
  return astNode;
};

const augmentQueryArguments = typeMap => {
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
      if (isNodeType(valueType) && isListType(field)) {
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

export const augmentResolvers = (
  augmentedTypeMap,
  resolvers
) => {
  let queryResolvers = resolvers && resolvers.Query ? resolvers.Query : {};
  let mutationResolvers = resolvers && resolvers.Mutation ? resolvers.Mutation : {};
  const generatedQueryMap = createOperationMap(augmentedTypeMap.Query);
  queryResolvers = possiblyAddResolvers(generatedQueryMap, queryResolvers);
  if (Object.keys(queryResolvers).length > 0) {
    resolvers.Query = queryResolvers;
  }
  const generatedMutationMap = createOperationMap(augmentedTypeMap.Mutation);
  mutationResolvers = possiblyAddResolvers(generatedMutationMap, mutationResolvers);
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

const possiblyAddTypeInput = (astNode, typeMap) => {
  const inputName = `_${astNode.name.value}Input`;
  if (isNodeType(astNode)) {
    if (typeMap[inputName] === undefined) {
      const pk = getPrimaryKey(astNode);
      if (pk) {
        typeMap[inputName] = parse(`
          input ${inputName} { ${pk.name.value}: ${
          // Always exactly require the pk of a node type
          getNamedType(pk).name.value
        }! }`).definitions[0];
      }
    }
  } else if (getTypeDirective(astNode, 'relation')) {
    if (typeMap[inputName] === undefined) {
      let fieldName = '';
      let valueType = {};
      let valueTypeName = '';
      let isRequired = false;
      const hasSomePropertyField = astNode.fields.find(
        e => e.name.value !== 'from' && e.name.value !== 'to'
      );
      if (hasSomePropertyField) {
        typeMap[inputName] = parse(
          `input ${inputName} {${astNode.fields
            .reduce((acc, t) => {
              fieldName = t.name.value;
              isRequired = isNonNullType(t);
              if (
                fieldName !== '_id' &&
                fieldName !== 'to' &&
                fieldName !== 'from' &&
                !isListType(t) &&
                !getFieldDirective(t, 'cypher')
              ) {
                valueTypeName = getNamedType(t).name.value;
                valueType = typeMap[valueTypeName];
                if (
                  isBasicScalar(valueTypeName) ||
                  isKind(valueType, 'EnumTypeDefinition') ||
                  isKind(valueType, 'ScalarTypeDefinition')
                ) {
                  acc.push(
                    `${t.name.value}: ${valueTypeName}${isRequired ? '!' : ''}`
                  );
                }
              }
              return acc;
            }, [])
            .join('\n')}}`
        ).definitions[0];
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

const possiblyAddTypeMutations = (astNode, typeMap, mutationMap) => {
  if (isNodeType(astNode)) {
    typeMap = possiblyAddTypeMutation(`Create`, astNode, typeMap, mutationMap);
    typeMap = possiblyAddTypeMutation(`Update`, astNode, typeMap, mutationMap);
    typeMap = possiblyAddTypeMutation(`Delete`, astNode, typeMap, mutationMap);
  }
  return typeMap;
};

const possiblyAddRelationMutations = (
  astNode,
  typeMap,
  mutationMap,
  relationMap
) => {
  const typeName = astNode.name.value;
  const fields = astNode.fields;
  const fieldCount = fields ? fields.length : 0;
  let relationFieldDirective = {};
  let relationName = '';
  let direction = '';
  let fieldValueName = '';
  let relatedAstNode = {};
  let relationTypeDirective = {};
  let nameArgument = {};
  let fromArgument = {};
  let toArgument = {};
  let fromName = '';
  let toName = '';
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
        if (isNodeType(relatedAstNode)) {
          relationFieldDirective = getFieldDirective(field, 'relation');
          if (relationFieldDirective) {
            relationName = getRelationName(relationFieldDirective);
            direction = getRelationDirection(relationFieldDirective);
            fromName = typeName;
            toName = fieldValueName;
            if (direction === 'IN' || direction === 'in') {
              let temp = fromName;
              fromName = toName;
              toName = temp;
            }
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
        } else if (relationTypeDirective) {
          let typeDirectiveArgs = relationTypeDirective
            ? relationTypeDirective.arguments
            : [];
          nameArgument = typeDirectiveArgs.find(e => e.name.value === 'name');
          fromArgument = typeDirectiveArgs.find(e => e.name.value === 'from');
          toArgument = typeDirectiveArgs.find(e => e.name.value === 'to');
          relationName = nameArgument.value.value;
          fromName = fromArgument.value.value;
          toName = toArgument.value.value;
          // directive to and from are not the same and neither are equal to this
          if (
            fromName !== toName &&
            toName !== typeName &&
            fromName !== typeName
          ) {
            throw new Error(`The '${
              field.name.value
            }' field on the '${typeName}' type uses the '${
              relatedAstNode.name.value
            }'
            but '${
              relatedAstNode.name.value
            }' comes from '${fromName}' and goes to '${toName}'`);
          }
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
          // TODO refactor the getRelationTypeDirectiveArgs stuff in here,
          // TODO out of it, and make it use the above, already obtained values...
          typeMap = possiblyAddNonSymmetricRelationshipType(
            relatedAstNode,
            capitalizedFieldName,
            typeName,
            typeMap,
            field
          );
          // TODO probably put replaceRelationTypeValue above into possiblyAddNonSymmetricRelationshipType, after you refactor it
          fields[fieldIndex] = replaceRelationTypeValue(
            fromName, 
            toName,
            field,
            capitalizedFieldName,
            typeName
          );
        }
      }
    }
  }
  return typeMap;
};

const possiblyAddTypeFieldArguments = (astNode, typeMap) => {
  const fields = astNode.fields;
  let relationTypeName = '';
  let relationType = {};
  let args = [];
  fields.forEach(field => {
    relationTypeName = getNamedType(field).name.value;
    relationType = typeMap[relationTypeName];
    if (
      isNodeType(relationType) &&
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

const buildAllFieldArguments = (namePrefix, astNode, typeMap) => {
  let fields = [];
  let type = {};
  let fieldName = '';
  let valueTypeName = '';
  let valueType = {};
  switch (namePrefix) {
    case 'Create': {
      let firstIdField = undefined;
      astNode.fields.reduce((acc, t) => {
        type = getNamedType(t);
        fieldName = t.name.value;
        valueTypeName = type.name.value;
        valueType = typeMap[valueTypeName];
        // If this field is not _id, and not a list,
        // and is not computed, and either a basic scalar
        // or an enum
        if (
          fieldName !== '_id' &&
          !isListType(t) &&
          !getFieldDirective(t, 'cypher') &&
          (isBasicScalar(valueTypeName) ||
            isKind(valueType, 'EnumTypeDefinition') ||
            isKind(valueType, 'ScalarTypeDefinition'))
        ) {
          // Require if required
          if (isNonNullType(t)) {
            // Regardless of whether it is NonNullType,
            // don't require the first ID field discovered
            if (valueTypeName === 'ID' && !firstIdField) {
              // will only be true once, this field will
              // by default recieve an auto-generated uuid,
              // if no value is provided
              firstIdField = t;
              acc.push({
                kind: 'InputValueDefinition',
                name: {
                  kind: 'Name',
                  value: fieldName
                },
                type: type,
                directives: []
              });
            } else {
              acc.push({
                kind: 'InputValueDefinition',
                name: {
                  kind: 'Name',
                  value: fieldName
                },
                type: {
                  kind: 'NonNullType',
                  type: type
                },
                directives: []
              });
            }
          } else {
            acc.push({
              kind: 'InputValueDefinition',
              name: {
                kind: 'Name',
                value: fieldName
              },
              type: type,
              directives: []
            });
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
        augmentedFields.push({
          kind: 'InputValueDefinition',
          name: {
            kind: 'Name',
            value: primaryKeyName
          },
          type: {
            kind: 'NonNullType',
            type: primaryKeyType
          },
          directives: []
        });
        astNode.fields.reduce((acc, t) => {
          type = getNamedType(t);
          fieldName = t.name.value;
          valueTypeName = type.name.value;
          valueType = typeMap[valueTypeName];
          // If this field is not the primary key, and not _id,
          // and not a list, and not computed, and either a basic
          // scalar or an enum
          if (
            fieldName !== primaryKeyName &&
            fieldName !== '_id' &&
            !isListType(t) &&
            !getFieldDirective(t, 'cypher') &&
            (isBasicScalar(valueTypeName) ||
              isKind(valueType, 'EnumTypeDefinition') ||
              isKind(valueType, 'ScalarTypeDefinition'))
          ) {
            acc.push({
              kind: 'InputValueDefinition',
              name: {
                kind: 'Name',
                value: fieldName
              },
              type: type,
              directives: []
            });
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
              value: primaryKeyType.name.value
            }
          }
        },
        directives: []
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

const replaceRelationTypeValue = (fromName, toName, field, capitalizedFieldName, typeName) => {
  const isList = isListType(field);
  // TODO persist a required inner type, and required list type
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

const possiblyAddNonSymmetricRelationshipType = (
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
            acc.push(`${fieldName}: ${fieldValueName} ${print(t.directives)}`);
          }
          return acc;
        }, [])
        .join('\n');
        if(fromValue && fromValue === toValue) {
          // If field is a list type, then make .from and .to list types
          const fieldIsList = isListType(field);

          typeMap[`${fieldTypeName}Directions`] = parse(`
            type ${fieldTypeName}Directions ${print(relationAstNode.directives)} {
              from${getFieldArgumentsFromAst(
                field,
                typeName,
              )}: ${fieldIsList ? '[' : ''}${fieldTypeName}${fieldIsList ? ']' : ''}
              to${getFieldArgumentsFromAst(
                field,
                typeName,
              )}: ${fieldIsList ? '[' : ''}${fieldTypeName}${fieldIsList ? ']' : ''}
            }`);
          
          typeMap[fieldTypeName] = parse(`
            type ${fieldTypeName} ${print(relationAstNode.directives)} {
              ${relationPropertyFields}
              ${fromValue}: ${fromValue}
            }
          `);

          // remove arguments on field
          field.arguments = [];
        }
        else {
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
                  : ''}
              }
          `);
        }
      }
  }
  return typeMap;
};

const addOrReplaceNodeIdField = (astNode, valueType) => {
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
        value: valueType
      }
    },
    directives: []
  };
  ``;
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
  astNode.fields = addOrReplaceNodeIdField(astNode, 'Int');
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

const initializeOperationTypes = (types, typeMap) => {
  if (types.length > 0) {
    typeMap = possiblyAddObjectType(typeMap, 'Query');
    typeMap = possiblyAddObjectType(typeMap, 'Mutation');
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
        // TODO use sdl instead
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
