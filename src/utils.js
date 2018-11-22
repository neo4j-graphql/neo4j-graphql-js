import { print, parse } from 'graphql';
import { possiblyAddArgument } from './augment';
import { v1 as neo4j } from 'neo4j-driver';
import _ from 'lodash';

function parseArg(arg, variableValues) {
  switch (arg.value.kind) {
    case 'IntValue':
      return parseInt(arg.value.value);
      break;
    case 'FloatValue':
      return parseFloat(arg.value.value);
      break;
    case 'Variable':
      return variableValues[arg.name.value];
      break;
    default:
      return arg.value.value;
  }
}

export function parseArgs(args, variableValues) {
  // get args from selection.arguments object
  // or from resolveInfo.variableValues if arg is a variable
  // note that variable values override default values

  if (!args || args.length === 0) {
    return {};
  }

  return args.reduce((acc, arg) => {
    acc[arg.name.value] = parseArg(arg, variableValues);

    return acc;
  }, {});
}

function getDefaultArguments(fieldName, schemaType) {
  // get default arguments for this field from schema

  try {
    return schemaType._fields[fieldName].args.reduce((acc, arg) => {
      acc[arg.name] = arg.defaultValue;
      return acc;
    }, {});
  } catch (err) {
    return {};
  }
}

export function cypherDirectiveArgs(
  variable,
  headSelection,
  schemaType,
  resolveInfo
) {
  const defaultArgs = getDefaultArguments(headSelection.name.value, schemaType);
  const queryArgs = parseArgs(
    headSelection.arguments,
    resolveInfo.variableValues
  );

  let args = JSON.stringify(Object.assign(defaultArgs, queryArgs)).replace(
    /\"([^(\")"]+)\":/g,
    ' $1: '
  );

  return args === '{}'
    ? `{this: ${variable}${args.substring(1)}`
    : `{this: ${variable},${args.substring(1)}`;
}

export function isMutation(resolveInfo) {
  return resolveInfo.operation.operation === 'mutation';
}

export function _isNamedMutation(name) {
  return function(resolveInfo) {
    return (
      isMutation(resolveInfo) &&
      resolveInfo.fieldName.split(/(?=[A-Z])/)[0].toLowerCase() ===
        name.toLowerCase()
    );
  };
}

export const isCreateMutation = _isNamedMutation('create');

export const isAddMutation = _isNamedMutation('add');

export const isUpdateMutation = _isNamedMutation('update');

export const isDeleteMutation = _isNamedMutation('delete');

export const isRemoveMutation = _isNamedMutation('remove');

export function isAddRelationshipMutation(resolveInfo) {
  return (
    isAddMutation(resolveInfo) &&
    resolveInfo.schema
      .getMutationType()
      .getFields()
      [resolveInfo.fieldName].astNode.directives.some(
        x => x.name.value === 'MutationMeta'
      )
  );
}

export function typeIdentifiers(returnType) {
  const typeName = innerType(returnType).toString();
  return {
    variableName: lowFirstLetter(typeName),
    typeName
  };
}

export function isGraphqlScalarType(type) {
  return (
    type.constructor.name === 'GraphQLScalarType' ||
    type.constructor.name === 'GraphQLEnumType'
  );
}

export function isArrayType(type) {
  return type.toString().startsWith('[');
}

export function lowFirstLetter(word) {
  return word.charAt(0).toLowerCase() + word.slice(1);
}

export function innerType(type) {
  return type.ofType ? innerType(type.ofType) : type;
}

// handles field level schema directives
// TODO: refactor to handle Query/Mutation type schema directives
const directiveWithArgs = (directiveName, args) => (schemaType, fieldName) => {
  function fieldDirective(schemaType, fieldName, directiveName) {
    return schemaType
      .getFields()
      [fieldName].astNode.directives.find(e => e.name.value === directiveName);
  }

  function directiveArgument(directive, name) {
    return directive.arguments.find(e => e.name.value === name).value.value;
  }

  const directive = fieldDirective(schemaType, fieldName, directiveName);
  const ret = {};
  if (directive) {
    Object.assign(
      ret,
      ...args.map(key => ({
        [key]: directiveArgument(directive, key)
      }))
    );
  }
  return ret;
};

export const cypherDirective = directiveWithArgs('cypher', ['statement']);
export const relationDirective = directiveWithArgs('relation', [
  'name',
  'direction'
]);

export function filtersFromSelections(selections, variableValues) {
  if (
    selections &&
    selections.length &&
    selections[0].arguments &&
    selections[0].arguments.length
  ) {
    return selections[0].arguments.reduce((result, x) => {
      (result[x.name.value] = argumentValue(
        selections[0],
        x.name.value,
        variableValues
      )) || x.value.value;
      return result;
    }, {});
  }
  return {};
}

export function getFilterParams(filters, index) {
  return Object.entries(filters).reduce((result, [key, value]) => {
    result[key] = index
      ? {
          value,
          index
        }
      : value;
    return result;
  }, {});
}

export function innerFilterParams(filters) {
  return Object.keys(filters).length > 0
    ? `{${Object.entries(filters)
        .filter(([key]) => !['first', 'offset', 'orderBy'].includes(key))
        .map(
          ([key, value]) =>
            `${key}:$${
              typeof value.index === 'undefined' ? key : `${value.index}_${key}`
            }`
        )
        .join(',')}}`
    : '';
}

function argumentValue(selection, name, variableValues) {
  let arg = selection.arguments.find(a => a.name.value === name);
  if (!arg) {
    return null;
  } else {
    const key = arg.value.name.value;

    try {
      return variableValues[key];
    } catch (e) {
      return argumentValue(selection, name, variableValues);
    }
  }
}

function argumentValue(selection, name, variableValues) {
  let arg = selection.arguments.find(a => a.name.value === name);
  if (!arg) {
    return null;
  } else {
    return parseArg(arg, variableValues);
  }
}

export function extractQueryResult({ records }, returnType) {
  const { variableName } = typeIdentifiers(returnType);

  let result = isArrayType(returnType)
    ? records.map(record => record.get(variableName))
    : records.length
      ? records[0].get(variableName)
      : null;

  result = convertIntegerFields(result);
  return result;
}

const convertIntegerFields = result => {
  const keys = result ? Object.keys(result) : [];
  let field = undefined;
  let num = undefined;
  keys.forEach(e => {
    field = result[e];
    if (neo4j.isInt(field)) {
      num = neo4j.int(field);
      if (neo4j.integer.inSafeRange(num)) {
        result[e] = num.toString();
      } else {
        result[e] = num.toString();
      }
    } else if (typeof result[e] === 'object') {
      return convertIntegerFields(result[e]);
    }
  });
  return result;
};

export function computeSkipLimit(selection, variableValues) {
  let first = argumentValue(selection, 'first', variableValues);
  let offset = argumentValue(selection, 'offset', variableValues);

  if (first === null && offset === null) return '';
  if (offset === null) return `[..${first}]`;
  if (first === null) return `[${offset}..]`;
  return `[${offset}..${parseInt(offset) + parseInt(first)}]`;
}

export const computeOrderBy = (resolveInfo, selection) => {
  const orderByVar = argumentValue(
    resolveInfo.operation.selectionSet.selections[0],
    'orderBy',
    resolveInfo.variableValues
  );

  if (orderByVar == undefined) {
    return '';
  } else {
    const splitIndex = orderByVar.lastIndexOf('_');
    const order = orderByVar.substring(splitIndex + 1);
    const orderBy = orderByVar.substring(0, splitIndex);
    const { variableName } = typeIdentifiers(resolveInfo.returnType);
    return ` ORDER BY ${variableName}.${orderBy} ${
      order === 'asc' ? 'ASC' : 'DESC'
    } `;
  }
};

export function extractSelections(selections, fragments) {
  // extract any fragment selection sets into a single array of selections
  return selections.reduce((acc, cur) => {
    if (cur.kind === 'FragmentSpread') {
      const recursivelyExtractedSelections = extractSelections(
        fragments[cur.name.value].selectionSet.selections,
        fragments
      );
      return [...acc, ...recursivelyExtractedSelections];
    } else {
      return [...acc, cur];
    }
  }, []);
}

export function fixParamsForAddRelationshipMutation(params, resolveInfo) {
  // FIXME: find a better way to map param name in schema to datamodel
  let mutationMeta, fromTypeArg, toTypeArg;

  try {
    mutationMeta = resolveInfo.schema
      .getMutationType()
      .getFields()
      [resolveInfo.fieldName].astNode.directives.filter(x => {
        return x.name.value === 'MutationMeta';
      })[0];
  } catch (e) {
    throw new Error(
      'Missing required MutationMeta directive on add relationship directive'
    );
  }

  try {
    fromTypeArg = mutationMeta.arguments.filter(x => {
      return x.name.value === 'from';
    })[0];

    toTypeArg = mutationMeta.arguments.filter(x => {
      return x.name.value === 'to';
    })[0];
  } catch (e) {
    throw new Error(
      'Missing required argument in MutationMeta directive (relationship, from, or to)'
    );
  }
  //TODO: need to handle one-to-one and one-to-many

  const fromType = fromTypeArg.value.value,
    toType = toTypeArg.value.value,
    fromVar = lowFirstLetter(fromType),
    toVar = lowFirstLetter(toType),
    fromParam = resolveInfo.schema
      .getMutationType()
      .getFields()
      [resolveInfo.fieldName].astNode.arguments[0].name.value.substr(
        fromVar.length
      ),
    toParam = resolveInfo.schema
      .getMutationType()
      .getFields()
      [resolveInfo.fieldName].astNode.arguments[1].name.value.substr(
        toVar.length
      );

  params[toParam] =
    params[
      resolveInfo.schema.getMutationType().getFields()[
        resolveInfo.fieldName
      ].astNode.arguments[1].name.value
    ];

  params[fromParam] =
    params[
      resolveInfo.schema.getMutationType().getFields()[
        resolveInfo.fieldName
      ].astNode.arguments[0].name.value
    ];

  delete params[
    resolveInfo.schema.getMutationType().getFields()[resolveInfo.fieldName]
      .astNode.arguments[1].name.value
  ];

  delete params[
    resolveInfo.schema.getMutationType().getFields()[resolveInfo.fieldName]
      .astNode.arguments[0].name.value
  ];

  return params;
}

export const isKind = (type, kind) => type && type.kind === kind;

export const isListType = (type, isList = false) => {
  if (!isKind(type, 'NamedType')) {
    if (isKind(type, 'ListType')) isList = true;
    return isListType(type.type, isList);
  }
  return isList;
};

export const parameterizeRelationFields = fields => {
  let name = '';
  return Object.keys(fields)
    .reduce((acc, t) => {
      name = fields[t].name.value;
      acc.push(`${name}:$data.${name}`);
      return acc;
    }, [])
    .join(',');
};

export const getRelationTypeDirectiveArgs = relationshipType => {
  const directive = relationshipType.directives.find(
    e => e.name.value === 'relation'
  );
  return directive
    ? {
        name: directive.arguments.find(e => e.name.value === 'name').value
          .value,
        from: directive.arguments.find(e => e.name.value === 'from').value
          .value,
        to: directive.arguments.find(e => e.name.value === 'to').value.value
      }
    : undefined;
};

export const getFieldArgumentsFromAst = (field, typeName, fieldIsList) => {
  let fieldArgs = field.arguments ? field.arguments : [];
  let augmentedArgs = [...fieldArgs];
  if (fieldIsList) {
    augmentedArgs = possiblyAddArgument(augmentedArgs, 'first', 'Int');
    augmentedArgs = possiblyAddArgument(augmentedArgs, 'offset', 'Int');
    augmentedArgs = possiblyAddArgument(
      augmentedArgs,
      'orderBy',
      `_${typeName}Ordering`
    );
  }
  const args = augmentedArgs
    .reduce((acc, t) => {
      acc.push(print(t));
      return acc;
    }, [])
    .join('\n');
  return args.length > 0 ? `(${args})` : '';
};

export const getRelationMutationPayloadFieldsFromAst = relatedAstNode => {
  let isList = false;
  let fieldName = '';
  return relatedAstNode.fields
    .reduce((acc, t) => {
      fieldName = t.name.value;
      if (fieldName !== 'to' && fieldName !== 'from') {
        isList = isListType(t);
        // Use name directly in order to prevent requiring required fields on the payload type
        acc.push(
          `${fieldName}: ${isList ? '[' : ''}${getNamedType(t).name.value}${
            isList ? `]` : ''
          }${print(t.directives)}`
        );
      }
      return acc;
    }, [])
    .join('\n');
};

export const getFieldValueType = type => {
  if (type.kind !== 'NamedType') {
    return getFieldValueType(type.type);
  }
  return type.name.value;
};

export const getNamedType = type => {
  if (type.kind !== 'NamedType') {
    return getNamedType(type.type);
  }
  return type;
};

export const isBasicScalar = name => {
  return (
    name === 'ID' ||
    name === 'String' ||
    name === 'Float' ||
    name === 'Int' ||
    name === 'Boolean'
  );
};

const firstNonNullAndIdField = fields => {
  let valueTypeName = '';
  return fields.find(e => {
    valueTypeName = getNamedType(e).name.value;
    return (
      e.name.value !== '_id' &&
      e.type.kind === 'NonNullType' &&
      valueTypeName === 'ID'
    );
  });
};

const firstIdField = fields => {
  let valueTypeName = '';
  return fields.find(e => {
    valueTypeName = getNamedType(e).name.value;
    return e.name.value !== '_id' && valueTypeName === 'ID';
  });
};

const firstNonNullField = fields => {
  let valueTypeName = '';
  return fields.find(e => {
    valueTypeName = getNamedType(e).name.value;
    return valueTypeName === 'NonNullType';
  });
};

const firstField = fields => {
  return fields.find(e => {
    return e.name.value !== '_id';
  });
};

export const getPrimaryKey = astNode => {
  const fields = astNode.fields;
  let pk = firstNonNullAndIdField(fields);
  if (!pk) {
    pk = firstIdField(fields);
  }
  if (!pk) {
    pk = firstNonNullField(fields);
  }
  if (!pk) {
    pk = firstField(fields);
  }
  return pk;
};

export const getTypeDirective = (relatedAstNode, name) => {
  return relatedAstNode.directives
    ? relatedAstNode.directives.find(e => e.name.value === name)
    : undefined;
};

export const getFieldDirective = (field, directive) => {
  return field && field.directives.find(e => e.name.value === directive);
};

export const isNonNullType = (type, isRequired = false, parent = {}) => {
  if (!isKind(type, 'NamedType')) {
    return isNonNullType(type.type, isRequired, type);
  }
  if (isKind(parent, 'NonNullType')) {
    isRequired = true;
  }
  return isRequired;
};

export const createOperationMap = type => {
  const fields = type ? type.fields : [];
  return fields.reduce((acc, t) => {
    acc[t.name.value] = t;
    return acc;
  }, {});
};

export const isNodeType = astNode => {
  // TODO: check for @ignore and @model directives
  return (
    astNode &&
    // must be graphql object type
    astNode.kind === 'ObjectTypeDefinition' &&
    // is not Query or Mutation type
    astNode.name.value !== 'Query' &&
    astNode.name.value !== 'Mutation' &&
    // does not have relation type directive
    getTypeDirective(astNode, 'relation') === undefined &&
    // does not have from and to fields; not relation type
    astNode.fields &&
    astNode.fields.find(e => e.name.value === 'from') === undefined &&
    astNode.fields.find(e => e.name.value === 'to') === undefined
  );
};

export const parseFieldSdl = sdl => {
  return sdl
    ? parse(`type fieldToParse { ${sdl} }`).definitions[0].fields[0]
    : {};
};

export const getRelationDirection = relationDirective => {
  let direction = {};
  try {
    direction = relationDirective.arguments.filter(
      a => a.name.value === 'direction'
    )[0];
    return direction.value.value;
  } catch (e) {
    // FIXME: should we ignore this error to define default behavior?
    throw new Error('No direction argument specified on @relation directive');
  }
};

export const getRelationName = relationDirective => {
  let name = {};
  try {
    name = relationDirective.arguments.filter(a => a.name.value === 'name')[0];
    return name.value.value;
  } catch (e) {
    // FIXME: should we ignore this error to define default behavior?
    throw new Error('No name argument specified on @relation directive');
  }
};

export const createRelationMap = typeMap => {
  let astNode = {};
  let name = '';
  let fields = [];
  let fromTypeName = '';
  let toTypeName = '';
  let typeDirective = {};
  return Object.keys(typeMap).reduce((acc, t) => {
    astNode = typeMap[t];
    name = astNode.name.value;
    fields = astNode.fields;
    typeDirective = getTypeDirective(astNode, 'relation');
    if (typeDirective) {
      // validate the other fields to make sure theyre not nodes or rel types
      fromTypeName = typeDirective.arguments.find(e => e.name.value === 'from')
        .value.value;
      toTypeName = typeDirective.arguments.find(e => e.name.value === 'to')
        .value.value;
      acc[name] = {
        from: typeMap[fromTypeName],
        to: typeMap[toTypeName]
      };
    }
    return acc;
  }, {});
};

/**
 * Render safe a variable name according to cypher rules
 * @param {String} i input variable name
 * @returns {String} escaped text suitable for interpolation in cypher
 */
export const safeVar = i => {
  // There are rare cases where the var input is an object and has to be stringified
  // to produce the right output.
  const asStr = `${i}`;

  // Rules: https://neo4j.com/docs/developer-manual/current/cypher/syntax/naming/
  return '`' + asStr.replace(/[-!$%^&*()_+|~=`{}\[\]:";'<>?,.\/]/g, '_') + '`';
};

/**
 * Render safe a label name by enclosing it in backticks and escaping any
 * existing backtick if present.
 * @param {String} l a label name
 * @returns {String} an escaped label name suitable for cypher concat
 */
export const safeLabel = l => {
  const asStr = `${l}`;
  const escapeInner = asStr.replace(/\`/g, '\\`');
  return '`' + escapeInner + '`';
};

export const printTypeMap = typeMap => {
  return print({
    kind: 'Document',
    definitions: Object.values(typeMap)
  });
};

export const decideNestedVariableName = ({
  schemaTypeRelation,
  innerSchemaTypeRelation,
  variableName,
  fieldName,
  rootVariableNames
}) => {
  if (rootVariableNames) {
    // Only show up for relation mutations
    return rootVariableNames[fieldName];
  }
  if (schemaTypeRelation) {
    const fromTypeName = schemaTypeRelation.from;
    const toTypeName = schemaTypeRelation.to;
    if (fromTypeName === toTypeName) {
      if (fieldName === 'from' || fieldName === 'to') {
        return variableName + '_' + fieldName;
      } else {
        // Case of a reflexive relationship type's directed field
        // being renamed to its node type value
        // ex: from: User -> User: User
        return variableName;
      }
    }
  } else {
    // Types without @relation directives are assumed to be node types
    // and only node types can have fields whose values are relation types
    if (innerSchemaTypeRelation) {
      // innerSchemaType is a field payload type using a @relation directive
      if (innerSchemaTypeRelation.from === innerSchemaTypeRelation.to) {
        return variableName;
      }
    } else {
      // related types are different
      return variableName + '_' + fieldName;
    }
  }
  return variableName + '_' + fieldName;
};

export const extractTypeMapFromTypeDefs = typeDefs => {
  // TODO: accept alternative typeDefs formats (arr of strings, ast, etc.)
  // into a single string for parse, add validatation
  const astNodes = parse(typeDefs).definitions;
  return astNodes.reduce((acc, t) => {
    acc[t.name.value] = t;
    return acc;
  }, {});
};

export const addDirectiveDeclarations = typeMap => {
  // overwrites any provided directive declarations for system directive names
  typeMap['cypher'] = parse(
    `directive @cypher(statement: String) on FIELD_DEFINITION`
  );
  typeMap['relation'] = parse(
    `directive @relation(name: String, direction: _RelationDirections, from: String, to: String) on FIELD_DEFINITION | OBJECT`
  );
  typeMap['MutationMeta'] = parse(
    `directive @MutationMeta(relationship: String, from: String, to: String) on FIELD_DEFINITION`
  );
  typeMap['_RelationDirections'] = parse(`enum _RelationDirections { IN OUT }`);
  return typeMap;
};
