import { makeExecutableSchema } from 'graphql-tools';
import { neo4jgraphql } from './index';
import { print } from 'graphql';

export const makeAugmentedSchema = (schema, augmentedTypeMap, queryMap, mutationMap) => {
  return makeExecutableSchema({
    typeDefs: printTypeMap(augmentedTypeMap),
    resolvers: augmentResolvers(schema, augmentedTypeMap, queryMap, mutationMap),
    resolverValidationOptions: {
      requireResolversForResolveType: false
    }
  });
}

export const augmentTypeDefs = (typeMap) => {
  let astNode = {};
  const types = Object.keys(typeMap);
  typeMap = initializeOperationTypes(types, typeMap);
  const queryMap = createOperationMap(typeMap.Query);
  const mutationMap = createOperationMap(typeMap.Mutation);
  types.forEach(t => {
    astNode = typeMap[t];
    if(isTypeForAugmentation(astNode)) {
      astNode = augmentType(astNode);
      // typeMap = possiblyAddQuery(astNode, typeMap, queryMap);
      typeMap = possiblyAddMutations(astNode, typeMap, mutationMap);
      // typeMap = possiblyAddOrderingEnum(astNode, typeMap);
      typeMap[t] = astNode;
    }
  });
  return typeMap;
}

export const augmentResolvers = (schema, augmentedTypeMap, queryMap, mutationMap) => {
  // For now, only adds resolvers for auto-generated mutations
  let resolvers = extractResolversFromSchema(schema);
  resolvers = augmentMutationResolvers(resolvers, augmentedTypeMap, mutationMap);
  return resolvers;
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

export const extractResolversFromSchema = (schema) => {
  const queryResolvers = extractResolvers(schema.getQueryType());
  const mutationResolvers = extractResolvers(schema.getMutationType());
  let extracted = {};
  if(queryResolvers) extracted.Query = queryResolvers;
  if(mutationResolvers) extracted.Mutation = mutationResolvers;
  return extracted;
}

export const createOperationMap = (type) => {
  const fields = type ? type.fields : [];
  return fields.reduce( (acc, t) => {
    acc[t.name.value] = t;
    return acc;
  }, {});
}

export const printTypeMap = (typeMap) => {
  const printed = print({
    "kind": "Document",
    "definitions": Object.values(typeMap)
  });
  return printed;
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

const possiblyAddMutations = (astNode, typeMap, mutationMap) => {
  typeMap = possiblyAddTypeMutation(`Create`, astNode, typeMap, mutationMap);
  typeMap = possiblyAddTypeMutation(`Update`, astNode, typeMap, mutationMap);
  typeMap = possiblyAddTypeMutation(`Delete`, astNode, typeMap, mutationMap);
  typeMap = possiblyAddRelationMutations(astNode, typeMap, mutationMap);
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

const augmentType = (astNode) => {
  astNode.fields = addOrReplaceNodeIdField(astNode, "ID");
  return astNode;
}

const possiblyAddTypeMutation = (namePrefix, astNode, typeMap, mutationMap) => {
  const typeName = astNode.name.value;
  const mutationName = namePrefix + typeName;
  // Only generate if the mutation named mutationName does not already exist
  if(mutationMap[mutationName] === undefined) {
    typeMap.Mutation.fields.push({
      "kind": "FieldDefinition",
      "name": {
        "kind": "Name",
        "value": mutationName
      },
      "arguments": buildAllFieldArguments(namePrefix, astNode, typeMap),
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
  return typeMap;
}

const buildAllFieldArguments = (namePrefix, astNode, typeMap) => {
  let fields = [];
  let type = {};
  let fieldName = "";
  switch(namePrefix) {
    case 'Create': {
      fields = astNode.fields.reduce( (acc, t) => {
        type = getNamedType(t);
        fieldName = t.name.value;
        if(isValidOptionalMutationArgument(fieldName, type, typeMap)) {
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
      }, []);
      break;
    }
    case 'Update': {
      fields = astNode.fields.reduce( (acc, t) => {
        type = getNamedType(t);
        fieldName = t.name.value;
        if(isValidOptionalMutationArgument(fieldName, type, typeMap)) {
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
      }, []);
      break;
    }
    case 'Delete': {
      const primaryKey = getPrimaryKey(astNode);
      fields.push({
        "kind": "InputValueDefinition",
        "name": {
          "kind": "Name",
          "value": primaryKey.name.value
        },
        "type": primaryKey.type,
        "directives": []
      })
      break;
    }
  }
  return fields;
}

const isValidOptionalMutationArgument = (fieldName, type, typeMap) => {
  const valueTypeName = type.name.value;
  const valueType = typeMap[valueTypeName];
  return fieldName !== "_id"
    && (isBasicScalar(valueTypeName)
    || (valueType
        && valueType.kind === "EnumTypeDefinition"));
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

const possiblyAddRelationMutations = (astNode, typeMap, mutationMap) => {
  const typeName = astNode.name.value;
  let relationTypeName = "";
  let relationDirective = {};
  let relationName = "";
  let direction = "";
  astNode.fields.forEach(e => {
    relationDirective = getDirective(e, "relation");
    if(relationDirective) {
      relationName = getRelationName(relationDirective);
      direction = getRelationDirection(relationDirective);
      relationTypeName = getNamedType(e).name.value;
      possiblyAddRelationMutationField(
        `Add${typeName}${relationTypeName}`,
        astNode,
        typeName,
        relationTypeName,
        direction,
        relationName,
        typeMap,
        mutationMap
      );
      possiblyAddRelationMutationField(
        `Remove${typeName}${relationTypeName}`,
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
  return field.directives.find(e => e.name.value === directive);
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

const possiblyAddMutationResolver = (name, resolvers, mutationMap) => {
  if(resolvers.Mutation === undefined) resolvers.Mutation = {};
  // Only generate resolver for a generated mutation type
  // So, don't generate if there is an entry in mutationMap
  if(mutationMap[name] !== undefined) return resolvers;
  // Even if the mutation type is generated, only generate
  // a resolver if the user has not written one
  if(resolvers.Mutation[name] === undefined) {
    resolvers.Mutation[name] = neo4jgraphql;
  }
  return resolvers;
}

const possiblyAddRelationMutationResolvers = (astNode, typeName, resolvers, mutationMap) => {
  let relationDirective = {};
  let relationTypeName = "";
  let relationName = "";
  let direction = "";
  astNode.fields.forEach(e => {
    relationDirective = getDirective(e, "relation");
    if(relationDirective) {
      relationName = getRelationName(relationDirective);
      direction = getRelationDirection(relationDirective);
      if(direction === "OUT" || direction === "out") {
        relationTypeName = getNamedType(e).name.value;
        resolvers = possiblyAddMutationResolver(`Add${typeName}${relationTypeName}`, resolvers, mutationMap);
        resolvers = possiblyAddMutationResolver(`Remove${typeName}${relationTypeName}`, resolvers, mutationMap);
      }
    }
  });
  return resolvers;
}

const augmentMutationResolvers = (resolvers, typeMap, mutationMap) => {
  let astNode = {};
  let typeName = "";
  Object.keys(typeMap).forEach(e => {
    astNode = typeMap[e];
    typeName = astNode.name.value;
    // Should be greatly simplified if we generate resolvers for any
    // mutation for which one is not provided. For now, this matches the
    // typeDefs augmentation logic to only generate resolvers for the same
    // mutation types that were generated
    if(isTypeForAugmentation(astNode)) {
      resolvers = possiblyAddMutationResolver(`Create${typeName}`, resolvers, mutationMap);
      resolvers = possiblyAddMutationResolver(`Update${typeName}`, resolvers, mutationMap);
      resolvers = possiblyAddMutationResolver(`Delete${typeName}`, resolvers, mutationMap);
      resolvers = possiblyAddRelationMutationResolvers(astNode, typeName, resolvers, mutationMap);
    }
  });
  return resolvers;
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
  || (valueType
    && valueType.kind === "EnumTypeDefinition");
}

const createQueryArguments = (astNode, typeMap) => {
  let type = {};
  let valueTypeName = "";
  astNode.fields = addOrReplaceNodeIdField(astNode, "Int");
  const fieldArguments = astNode.fields.reduce( (acc, t) => {
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
  return [
    ...fieldArguments,
    {
      "kind": "InputValueDefinition",
      "name": {
        "kind": "Name",
        "value": "first",
      },
      "type": {
        "kind": "NamedType",
        "name": {
          "kind": "Name",
          "value": "Int",
        },
      },
      "directives": [],
    },
    {
      "kind": "InputValueDefinition",
      "name": {
        "kind": "Name",
        "value": "offset",
      },
      "type": {
        "kind": "NamedType",
        "name": {
          "kind": "Name",
          "value": "Int",
        },
      },
      "directives": [],
    },
    {
      "kind": "InputValueDefinition",
      "name": {
        "kind": "Name",
        "value": "orderBy",
      },
      "type": {
        "kind": "NamedType",
        "name": {
          "kind": "Name",
          "value": `_${astNode.name.value}Ordering`,
        },
      },
      "directives": [],
    }
  ]
}

const isTypeForAugmentation = (astNode) => {
  // TODO: check for @ignore and @model directives
  return astNode.kind === "ObjectTypeDefinition"
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

const extractResolvers = (operationType) => {
  const operationTypeFields = operationType ? operationType.getFields() : {};
  const operations = Object.keys(operationTypeFields);
  let resolver = {};
  return operations.length > 0
    ? operations.reduce((acc, t) => {
        resolver = operationTypeFields[t].resolve;
        if(resolver !== undefined) acc[t] = resolver;
        return acc;
      }, {})
    : undefined;
}
