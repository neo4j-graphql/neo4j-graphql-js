import { makeExecutableSchema } from 'graphql-tools';
import { neo4jgraphql } from './index';
import { print } from 'graphql';

export const makeAugmentedSchema = (typeMap, queryResolvers, mutationResolvers) => {
  const augmentedTypeMap = augmentTypeMap(typeMap);
  const augmentedResolvers = augmentResolvers(queryResolvers, mutationResolvers, augmentedTypeMap);
  return makeExecutableSchema({
    typeDefs: printTypeMap(augmentedTypeMap),
    resolvers: augmentedResolvers,
    resolverValidationOptions: {
      requireResolversForResolveType: false
    }
  });
}

export const extractAstNodesFromSchema = (schema) => {
  const typeMap = schema.getTypeMap();
  let astNode = {};
  return Object.keys(typeMap).reduce( (acc, t) => {
    astNode = typeMap[t].astNode;
    if(astNode !== undefined) {
      acc[astNode.name.value] = astNode;
    }
    return acc;
  }, {});
}

export const extractResolvers = (operationType) => {
  const operationTypeFields = operationType ? operationType.getFields() : {};
  const operations = Object.keys(operationTypeFields);
  let resolver = {};
  return operations.length > 0
    ? operations.reduce((acc, t) => {
        resolver = operationTypeFields[t].resolve;
        if(resolver !== undefined) acc[t] = resolver;
        return acc;
      }, {})
    : {};
}

const augmentTypeMap = (typeMap) => {
  const types = Object.keys(typeMap);
  typeMap = initializeOperationTypes(types, typeMap);
  const queryMap = createOperationMap(typeMap.Query);
  const mutationMap = createOperationMap(typeMap.Mutation);
  let astNode = {};
  types.forEach(t => {
    astNode = typeMap[t];
    if(isTypeForAugmentation(astNode)) {
      astNode = augmentType(astNode, typeMap);
      typeMap = possiblyAddQuery(astNode, typeMap, queryMap);
      typeMap = possiblyAddOrderingEnum(astNode, typeMap);
      typeMap = possiblyAddTypeMutations(astNode, typeMap, mutationMap);
      typeMap = possiblyAddRelationMutations(astNode, typeMap, mutationMap);
      typeMap[t] = astNode;
    }
  });
  typeMap = augmentQueryArguments(typeMap);
  return typeMap;
}

const possiblyAddTypeMutations = (astNode, typeMap, mutationMap) => {
  typeMap = possiblyAddTypeMutation(`Create`, astNode, typeMap, mutationMap);
  typeMap = possiblyAddTypeMutation(`Update`, astNode, typeMap, mutationMap);
  typeMap = possiblyAddTypeMutation(`Delete`, astNode, typeMap, mutationMap);
  return typeMap;
}

const augmentQueryArguments = (typeMap) => {
  const queryMap = createOperationMap(typeMap.Query);
  let args = [];
  let valueTypeName = "";
  let valueType = {};
  let field = {};
  let queryNames = Object.keys(queryMap);
  if(queryNames.length > 0) {
    queryNames.forEach(t => {
      field = queryMap[t];
      valueTypeName = getNamedType(field).name.value;
      valueType = typeMap[valueTypeName];
      if(isTypeForAugmentation(valueType) && isListType(field)) {
        args = field.arguments;
        queryMap[t].arguments = possiblyAddArgument(args, "first", "Int");
        queryMap[t].arguments = possiblyAddArgument(args, "offset", "Int");
        queryMap[t].arguments = possiblyAddArgument(args, "orderBy", `_${valueTypeName}Ordering`);
      }
    });
    typeMap.Query.fields = Object.values(queryMap);
  }
  return typeMap;
}

const createOperationMap = (type) => {
  const fields = type ? type.fields : [];
  return fields.reduce( (acc, t) => {
    acc[t.name.value] = t;
    return acc;
  }, {});
}

const printTypeMap = (typeMap) => {
  return print({
    "kind": "Document",
    "definitions": Object.values(typeMap)
  });
}

const augmentResolvers = (queryResolvers, mutationResolvers, typeMap) => {
  let resolvers = {};
  const queryMap = createOperationMap(typeMap.Query);
  queryResolvers = possiblyAddResolvers(queryMap, queryResolvers)
  if(Object.keys(queryResolvers).length > 0) {
    resolvers.Query = queryResolvers;
  }
  const mutationMap = createOperationMap(typeMap.Mutation);
  mutationResolvers = possiblyAddResolvers(mutationMap, mutationResolvers)
  if(Object.keys(mutationResolvers).length > 0) {
    resolvers.Mutation = mutationResolvers;
  }
  return resolvers;
}

const possiblyAddResolvers = (operationTypeMap, resolvers) => {
  let operationName = "";
  return Object.keys(operationTypeMap).reduce( (acc, t) => {
    // if no resolver provided for this operation type field
    operationName = operationTypeMap[t].name.value;
    if(acc[operationName] === undefined) {
      acc[operationName] = neo4jgraphql;
    }
    return acc;
  }, resolvers);
}

const possiblyAddQuery = (astNode, typeMap, queryMap) => {
  const name = astNode.name.value;
  if(queryMap[name] === undefined) {
    typeMap.Query.fields.push({
      "kind": "FieldDefinition",
      "name": {
        "kind": "Name",
        "value": name
      },
      "arguments": createQueryArguments(astNode, typeMap),
      "type": {
        "kind": "ListType",
        "type": {
          "kind": "NamedType",
          "name": {
            "kind": "Name",
            "value": name
          }
        }
      },
      "directives": [],
    });
  }
  return typeMap;
}

const possiblyAddOrderingEnum = (astNode, typeMap) => {
  const name = `_${astNode.name.value}Ordering`;
  const values = createOrderingFields(astNode.fields, typeMap);
  // Add ordering enum if it does not exist already and if
  // there is at least one basic scalar field on this type
  if(typeMap[name] === undefined && values.length > 0) {
    typeMap[name] = {
      kind: "EnumTypeDefinition",
      name: {
        kind: "Name",
        value: name
      },
      directives: [],
      values: values
    };
  }
  return typeMap;
}

const initializeOperationTypes = (types, typeMap) => {
  if(types.length > 0) {
    typeMap = possiblyAddObjectType(typeMap, "Query");
    typeMap = possiblyAddObjectType(typeMap, "Mutation");
  }
  return typeMap;
}

const augmentType = (astNode, typeMap) => {
  astNode.fields = addOrReplaceNodeIdField(astNode, "ID");
  astNode.fields = possiblyAddTypeFieldArguments(astNode, typeMap);
  return astNode;
}


const isListType = (type, isList=false) => {
  // Only checks that there is at least one ListType on the way
  // to the NamedType
  if(!isKind(type, "NamedType")) {
    if(isKind(type, "ListType")) {
      isList = true;
    }
    return isListType(type.type, isList);
  }
  return isList;
}

const possiblyAddTypeFieldArguments = (astNode, typeMap) => {
  const fields = astNode.fields;
  let relationTypeName = "";
  let relationType = {};
  let args = [];
  fields.forEach(field => {
    relationTypeName = getNamedType(field).name.value;
    relationType = typeMap[relationTypeName];
    if(isTypeForAugmentation(relationType)
    && isListType(field)
    && (getDirective(field, "relation") || getDirective(field, "cypher"))) {
      args = field.arguments;
      field.arguments = possiblyAddArgument(args, "first", "Int");
      field.arguments = possiblyAddArgument(args, "offset", "Int");
      field.arguments = possiblyAddArgument(args, "orderBy", `_${relationTypeName}Ordering`);
    }
  });
  return fields;
}

const possiblyAddArgument = (args, fieldName, fieldType) => {
  const fieldIndex = args.findIndex(e => e.name.value === fieldName);
  if(fieldIndex === -1) {
  args.push({
      "kind": "InputValueDefinition",
      "name": {
        "kind": "Name",
        "value": fieldName,
      },
      "type": {
        "kind": "NamedType",
        "name": {
          "kind": "Name",
          "value": fieldType,
        },
      },
      "directives": [],
    });
  }
  return args;
};

const possiblyAddTypeMutation = (namePrefix, astNode, typeMap, mutationMap) => {
  const typeName = astNode.name.value;
  const mutationName = namePrefix + typeName;
  // Only generate if the mutation named mutationName does not already exist
  if(mutationMap[mutationName] === undefined) {
    let args = buildAllFieldArguments(namePrefix, astNode, typeMap);
    if(args.length > 0) {
      typeMap.Mutation.fields.push({
        "kind": "FieldDefinition",
        "name": {
          "kind": "Name",
          "value": mutationName
        },
        "arguments": args,
        "type": {
          "kind": "NamedType",
          "name": {
            "kind": "Name",
            "value": typeName
          }
        },
        "directives": [],
      });
    }
  }
  return typeMap;
}

const isNonNullType = (type, isRequired=false, parent={}) => {
  if(!isKind(type, "NamedType")) {
    return isNonNullType(type.type, isRequired, type);
  }
  if(isKind(parent, "NonNullType")) {
    isRequired = true;
  }
  return isRequired;
}

const isKind = (type, kind) => {
  return type && type.kind === kind;
}

const buildAllFieldArguments = (namePrefix, astNode, typeMap) => {
  let fields = [];
  let type = {};
  let fieldName = "";
  let valueTypeName = "";
  let valueType = {};
  switch(namePrefix) {
    case 'Create': {
      let firstIdField = undefined;
      astNode.fields.reduce( (acc, t) => {
        type = getNamedType(t);
        fieldName = t.name.value;
        valueTypeName = type.name.value;
        valueType = typeMap[valueTypeName];
        // If this field is not _id, and not a list,
        // and is not computed, and either a basic scalar
        // or an enum
        if(fieldName !== "_id"
        && !isListType(t)
        && !getDirective(t, "cypher")
        && (isBasicScalar(valueTypeName)
        || isKind(valueType, "EnumTypeDefinition"))) {
          // Require if required
          if(isNonNullType(t)) {
            // Regardless of whether it is NonNullType,
            // don't require the first ID field discovered
            if(valueTypeName === "ID" && !firstIdField) {
              // will only be true once, this field will
              // by default recieve an auto-generated uuid,
              // if no value is provided
              firstIdField = t;
              acc.push({
                "kind": "InputValueDefinition",
                "name": {
                  "kind": "Name",
                  "value": fieldName
                },
                "type": type,
                "directives": [],
              });
            }
            else {
              acc.push({
                "kind": "InputValueDefinition",
                "name": {
                  "kind": "Name",
                  "value": fieldName
                },
                "type": {
                  "kind": "NonNullType",
                  type: type
                },
                "directives": [],
              });
            }
          }
          else {
            acc.push({
              "kind": "InputValueDefinition",
              "name": {
                "kind": "Name",
                "value": fieldName
              },
              "type": type,
              "directives": [],
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
      if(primaryKey) {
        // Primary key field is first field and required
        const primaryKeyName = primaryKey.name.value;
        const primaryKeyType = getNamedType(primaryKey);
        augmentedFields.push({
          "kind": "InputValueDefinition",
          "name": {
            "kind": "Name",
            "value": primaryKeyName
          },
          "type": {
            "kind": "NonNullType",
            "type": primaryKeyType
          },
          "directives": [],
        });
        astNode.fields.reduce( (acc, t) => {
          type = getNamedType(t);
          fieldName = t.name.value;
          valueTypeName = type.name.value;
          valueType = typeMap[valueTypeName];
          // If this field is not the primary key, and not _id,
          // and not a list, and not computed, and either a basic
          // scalar or an enum
          if(fieldName !== primaryKeyName
          && fieldName !== "_id"
          && !isListType(t)
          && !getDirective(t, "cypher")
          && (isBasicScalar(valueTypeName)
          || isKind(valueType, "EnumTypeDefinition"))) {
            acc.push({
              "kind": "InputValueDefinition",
              "name": {
                "kind": "Name",
                "value": fieldName
              },
              "type": type,
              "directives": [],
            });
          }
          return acc;
        }, augmentedFields);
        // Use if there is at least one field other than
        // the primaryKey field used for node selection
        if(augmentedFields.length > 1) {
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
        "kind": "InputValueDefinition",
        "name": {
          "kind": "Name",
          "value": primaryKeyName
        },
        "type": {
          "kind": "NonNullType",
          "type": {
            "kind": "NamedType",
            "name": {
              "kind": "Name",
              "value": primaryKeyType.name.value
            }
          }
        },
        "directives": []
      });
      break;
    }
  }
  return fields;
}

const firstNonNullAndIdField = (fields) => {
  let valueTypeName = "";
  return fields.find(e => {
    valueTypeName = getNamedType(e).name.value;
    return e.name.value !== '_id'
      && e.type.kind === 'NonNullType'
      && valueTypeName === 'ID';
  });
}

const firstIdField = (fields) => {
  let valueTypeName = "";
  return fields.find(e => {
    valueTypeName = getNamedType(e).name.value;
    return e.name.value !== '_id'
      && valueTypeName === 'ID';
  });
}

const firstNonNullField = (fields) => {
  let valueTypeName = "";
  return fields.find(e => {
    valueTypeName = getNamedType(e).name.value;
    return valueTypeName === 'NonNullType';
  });
}

const firstField = (fields) => {
  return fields.find(e => {
    return e.name.value !== '_id';
  });
}

const getPrimaryKey = (astNode) => {
  const fields = astNode.fields;
  let pk = firstNonNullAndIdField(fields);
  if(!pk) {
    pk = firstIdField(fields);
  }
  if(!pk) {
    pk = firstNonNullField(fields);
  }
  if(!pk) {
    pk = firstField(fields);
  }
  return pk;
}

const capitalizeName = (name) => {
  return name.charAt(0).toUpperCase() + name.substr(1);
}
const possiblyAddRelationMutations = (astNode, typeMap, mutationMap) => {
  const typeName = astNode.name.value;
  let relationTypeName = "";
  let relationDirective = {};
  let relationName = "";
  let direction = "";
  let capitalizedFieldName = "";
  astNode.fields.forEach(e => {
    relationDirective = getDirective(e, "relation");
    if(relationDirective) {
      relationName = getRelationName(relationDirective);
      direction = getRelationDirection(relationDirective);
      relationTypeName = getNamedType(e).name.value;
      capitalizedFieldName = capitalizeName(e.name.value);
      possiblyAddRelationMutationField(
        `Add${typeName}${capitalizedFieldName}`,
        astNode,
        typeName,
        relationTypeName,
        direction,
        relationName,
        typeMap,
        mutationMap
      );
      possiblyAddRelationMutationField(
        `Remove${typeName}${capitalizedFieldName}`,
        astNode,
        typeName,
        relationTypeName,
        direction,
        relationName,
        typeMap,
        mutationMap
      );
    }
  });
  return typeMap;
}

const getDirective = (field, directive) => {
  return field && field.directives.find(e => e.name.value === directive);
};

const buildRelationMutationArguments = (astNode, relationTypeName, typeMap) => {
  const relationAstNode = typeMap[relationTypeName];
  if(relationAstNode) {
    const primaryKey = getPrimaryKey(astNode);
    const relationPrimaryKey = getPrimaryKey(relationAstNode);
    const relationType = getNamedType(relationPrimaryKey);
    return [
      {
        "kind": "InputValueDefinition",
        "name": {
          "kind": "Name",
          "value": astNode.name.value.toLowerCase() + primaryKey.name.value
        },
        "type": {
          "kind": "NonNullType",
          "type": getNamedType(primaryKey)
        },
        "directives": [],
      },
      {
        "kind": "InputValueDefinition",
        "name": {
          "kind": "Name",
          "value": relationAstNode.name.value.toLowerCase() + relationPrimaryKey.name.value
        },
        "type": {
          "kind": "NonNullType",
          "type": relationType
        },
        "directives": [],
      }
    ];
  }
}

const possiblyAddRelationMutationField = (
  mutationName,
  astNode,
  typeName,
  relationTypeName,
  direction,
  name,
  typeMap,
  mutationMap) => {
  // Only generate if the mutation named mutationName does not already exist,
  // and only generate for one direction, OUT, in order to prevent duplication
  if(mutationMap[mutationName] === undefined
    && (direction === "OUT" || direction === "out")) {
    typeMap.Mutation.fields.push({
      "kind": "FieldDefinition",
      "name": {
        "kind": "Name",
        "value": mutationName
      },
      "arguments": buildRelationMutationArguments(astNode, relationTypeName, typeMap),
      "type": {
        "kind": "NamedType",
        "name": {
          "kind": "Name",
          "value": typeName
        }
      },
      "directives": [
        {
          "kind": "Directive",
          "name": {
            "kind": "Name",
            "value": "MutationMeta"
          },
          "arguments": [
            {
              "kind": "Argument",
              "name": {
                "kind": "Name",
                "value": "relationship"
              },
              "value": {
                "kind": "StringValue",
                "value": name
              }
            },
            {
              "kind": "Argument",
              "name": {
                "kind": "Name",
                "value": "from"
              },
              "value": {
                "kind": "StringValue",
                "value": typeName
              }
            },
            {
              "kind": "Argument",
              "name": {
                "kind": "Name",
                "value": "to"
              },
              "value": {
                "kind": "StringValue",
                "value": relationTypeName
              }
            },
          ]
        }
      ],
    });
  }
  return typeMap;
}

const addOrReplaceNodeIdField = (astNode, valueType) => {
  const fields = astNode ? astNode.fields : [];
  const index = fields.findIndex(e => e.name.value === '_id');
  const definition = {
    "kind": "FieldDefinition",
    "name": {
      "kind": "Name",
      "value": "_id"
    },
    "arguments": [],
    "type": {
      "kind": "NamedType",
      "name": {
        "kind": "Name",
        "value": valueType,
      }
    },
    "directives": [],
  };
  // If it has already been provided, replace it to force valueType,
  // else add it as the last field
  index >= 0
    ? fields.splice(index, 1, definition)
    : fields.push(definition)
  return fields;
}

const getRelationName = (relationDirective) => {
  let name = {};
  try {
    name = relationDirective.arguments.filter(a => a.name.value === 'name')[0];
  } catch (e) {
    // FIXME: should we ignore this error to define default behavior?
    throw new Error('No name argument specified on @relation directive');
  }
  return name.value.value;
}

const getRelationDirection = (relationDirective) => {
  let direction = {};
  try {
    direction = relationDirective.arguments.filter(a => a.name.value === 'direction')[0];
  } catch (e) {
    // FIXME: should we ignore this error to define default behavior?
    throw new Error('No direction argument specified on @relation directive');
  }
  return direction.value.value;
}

const possiblyAddObjectType = (typeMap, name) => {
  if(typeMap[name] === undefined) {
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
}

const isBasicScalar = (name) => {
  return name === "ID" || name === "String"
      || name === "Float" || name === "Int" || name === "Boolean";
}

const isQueryArgumentFieldType = (type, valueType) => {
  return isBasicScalar(type.name.value)
      || isKind(valueType, "EnumTypeDefinition");
}

const createQueryArguments = (astNode, typeMap) => {
  let type = {};
  let valueTypeName = "";
  astNode.fields = addOrReplaceNodeIdField(astNode, "Int");
  return astNode.fields.reduce( (acc, t) => {
    type = getNamedType(t);
    valueTypeName = type.name.value;
    if(isQueryArgumentFieldType(type, typeMap[valueTypeName])) {
      acc.push({
        "kind": "InputValueDefinition",
        "name": {
          "kind": "Name",
          "value": t.name.value
        },
        "type": type,
        "directives": [],
      });
    }
    return acc;
  }, []);
}

const isTypeForAugmentation = (astNode) => {
  // TODO: check for @ignore and @model directives
  return astNode && astNode.kind === "ObjectTypeDefinition"
    && astNode.name.value !== "Query"
    && astNode.name.value !== "Mutation";
}

const getNamedType = (type) => {
  if(type.kind !== "NamedType") {
    return getNamedType(type.type);
  }
  return type;
}

const createOrderingFields = (fields, typeMap) => {
  let type = {};
  return fields.reduce( (acc, t) => {
    type = getNamedType(t);
    if(isBasicScalar(type.name.value)) {
      acc.push({
        kind: 'EnumValueDefinition',
        name: {
          kind: "Name",
          value: `${t.name.value}_asc`
        },
        directives: []
      });
      acc.push({
        kind: 'EnumValueDefinition',
        name: {
          kind: "Name",
          value: `${t.name.value}_desc`
        },
        directives: []
      });
    }
    return acc;
  }, []);
}
