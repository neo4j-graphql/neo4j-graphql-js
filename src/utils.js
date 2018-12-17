import { print, parse } from 'graphql';
import { possiblyAddArgument } from './augment';
import { v1 as neo4j } from 'neo4j-driver';
import _ from 'lodash';
import filter from 'lodash/filter';

function parseArg(arg, variableValues) {
  switch (arg.value.kind) {
    case 'IntValue': {
      return parseInt(arg.value.value);
    }
    case 'FloatValue': {
      return parseFloat(arg.value.value);
    }
    case 'Variable': {
      return variableValues[arg.name.value];
    }
    case 'ObjectValue': {
      return parseArgs(arg.value.fields, {});
    }
    default: {
      return arg.value.value;
    }
  }
}

export function parseArgs(args, variableValues) {
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

export function innerFilterParams(filters, temporalArgs, paramKey) {
  const temporalArgNames = temporalArgs ? temporalArgs.reduce( (acc, t) => { 
    acc.push(t.name.value); 
    return acc; 
  }, []) : [];
  return Object.keys(filters).length > 0
    ? `{${Object.entries(filters)
        // exclude temporal arguments
        .filter(([key]) => !['first', 'offset', 'orderBy', ...temporalArgNames].includes(key))
        .map(
          ([key, value]) =>
            `${key}:${paramKey ? `$${paramKey}.` : '$'}${
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

export const possiblySetFirstId = ({ 
  args, 
  statements, 
  params 
}) => {
  const arg = args.find(e => getFieldValueType(e) === "ID");
  // arg is the first ID field if it exists, and we set the value 
  // if no value is provided for the field name (arg.name.value) in params
  if(arg && arg.name.value && params[arg.name.value] === undefined) {
    statements.push(`${arg.name.value}: apoc.create.uuid()`);
  }
  return statements;
}

export const getQueryArguments = (resolveInfo) => {
  return resolveInfo.schema.getQueryType().getFields()[
    resolveInfo.fieldName
  ].astNode.arguments;
}

export const getMutationArguments = (resolveInfo) => {
  return resolveInfo.schema.getMutationType().getFields()[
    resolveInfo.fieldName
  ].astNode.arguments;
}

const getTemporalCypherConstructor = (fieldAst) => {
  let cypherFunction = undefined;
  const type = fieldAst ? getNamedType(fieldAst.type).name.value : '';
  switch(type) {
    case "_Neo4jTimeInput": cypherFunction = "time"; break;
    case "_Neo4jDateInput": cypherFunction = "date"; break;
    case "_Neo4jDateTimeInput": cypherFunction = "datetime"; break;
    case "_Neo4jLocalTimeInput": cypherFunction = "localtime"; break;
    case "_Neo4jLocalDateTimeInput": cypherFunction = "localdatetime"; break;
    default: break;
  }
  return cypherFunction;
}

export const buildCypherParameters = ({ 
  args,
  statements=[], 
  params,
  paramKey
}) => {
  const dataParams = paramKey ? params[paramKey] : params;
  const paramKeys = dataParams ? Object.keys(dataParams) : [];
  if(args) {
    statements = paramKeys.reduce( (acc, paramName) => {
      const param = paramKey ? params[paramKey][paramName] : params[paramName];
      // Get the AST definition for the argument matching this param name
      const fieldAst = args.find(arg => arg.name.value === paramName);
      if(fieldAst) {
        const fieldType = getNamedType(fieldAst.type);
        if(isTemporalInputType(fieldType.name.value)) {
          const formatted = param.formatted;
          const temporalFunction = getTemporalCypherConstructor(fieldAst);
          if(temporalFunction) {
            // Prefer only using formatted, if provided
            if(formatted) {
              if(paramKey) params[paramKey][paramName] = formatted;
              else params[paramName] = formatted;
              acc.push(`${paramName}: ${temporalFunction}($${
                paramKey 
                  ? `${paramKey}.` 
                  : ''}${paramName})`
              );
            }
            else {
              // TODO refactor
              if(Array.isArray(param)) {
                const count = param.length;
                let i = 0;
                let temporalParam = {};
                for(; i < count; ++i) {
                  if(paramKey) {
                    temporalParam = param[i];
                    if(temporalParam.formatted) {
                      params[paramKey][paramName][i] = temporalParam.formatted;
                    }
                    else {
                      Object.keys(temporalParam).forEach(e => {
                        if(Number.isInteger(temporalParam[e])) {
                          params[paramKey][paramName][i][e] = neo4j.int(temporalParam[e]);
                        }
                      });
                    }
                  }
                  else {
                    Object.keys(temporalParam).forEach(e => {
                      if(Number.isInteger(temporalParam[e])) {
                        params[paramName][i][e] = neo4j.int(temporalParam[e]);
                      }
                    });
                  }
                }
                acc.push(`${paramName}: [value IN $${paramKey ? `${paramKey}.` : ''}${paramName} | ${temporalFunction}(value)]`);
              }
              else {
                if(paramKey) {
                  const temporalParam = params[paramKey][paramName];
                  if(temporalParam.formatted) {
                    params[paramKey][paramName] = temporalParam.formatted;
                  }
                  else {
                    Object.keys(temporalParam).forEach(e => {
                      if(Number.isInteger(temporalParam[e])) {
                        params[paramKey][paramName][e] = neo4j.int(temporalParam[e]);
                      }
                    });
                  }
                }
                else {
                  const temporalParam = params[paramName];
                  Object.keys(temporalParam).forEach(e => {
                    if(Number.isInteger(temporalParam[e])) {
                      params[paramName][e] = neo4j.int(temporalParam[e]);
                    }
                  });
                }              
                acc.push(`${paramName}: ${temporalFunction}($${paramKey ? `${paramKey}.` : ''}${paramName})`);
              }
            }
          }            
        }
        else {
          // normal case
          acc.push(`${paramName}:$${paramKey ? `${paramKey}.` : ''}${paramName}`);
        }
      }
      return acc;
    }, statements);
  }
  if(paramKey) {
    params[paramKey] = dataParams;
  }
  return [params, statements];
}

export const isRelationTypeDirectedField = (fieldName) => {
  return fieldName === 'from' || fieldName === 'to';
}

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
  const directive = relationshipType && relationshipType.directives 
    ? relationshipType.directives.find(e => e.name.value === 'relation') 
    : undefined;
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

// TODO refactor
export const decideNestedVariableName = ({
  schemaTypeRelation,
  innerSchemaTypeRelation,
  variableName,
  fieldName,
  parentSelectionInfo
}) => {
  if (
    isRootSelection({ 
      selectionInfo: parentSelectionInfo,
      rootType: "relationship"
    }) && 
    isRelationTypeDirectedField(fieldName)
  ) {
    return parentSelectionInfo[fieldName];
  }
  else if (schemaTypeRelation) {
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
  ).definitions[0];
  typeMap['relation'] = parse(
    `directive @relation(name: String, direction: _RelationDirections, from: String, to: String) on FIELD_DEFINITION | OBJECT`
  ).definitions[0];
  typeMap['MutationMeta'] = parse(
    `directive @MutationMeta(relationship: String, from: String, to: String) on FIELD_DEFINITION`
  ).definitions[0];
  typeMap['_RelationDirections'] = parse(`enum _RelationDirections { IN OUT }`).definitions[0];
  return typeMap;
};

export const initializeMutationParams = ({
  resolveInfo, 
  mutationTypeCypherDirective, 
  otherParams, 
  first,
  offset
}) => {
  return (isCreateMutation(resolveInfo) || isUpdateMutation(resolveInfo)) &&
  !mutationTypeCypherDirective
    ? { params: otherParams, ...{ first, offset } }
    : { ...otherParams, ...{ first, offset } };
}

export const getQueryCypherDirective = (resolveInfo) => {
  return resolveInfo.schema
    .getQueryType()
    .getFields()
    [resolveInfo.fieldName].astNode.directives.find(x => {
      return x.name.value === 'cypher';
    });
}

export const getMutationCypherDirective = (resolveInfo) => {
  return resolveInfo.schema
    .getMutationType()
    .getFields()
    [resolveInfo.fieldName].astNode.directives.find(x => {
      return x.name.value === 'cypher';
    });
}

export const getOuterSkipLimit = first =>
  `SKIP $offset${first > -1 ? ' LIMIT $first' : ''}`;

export const getQuerySelections = (resolveInfo) => {
  const filteredFieldNodes = filter(
    resolveInfo.fieldNodes,
    n => n.name.value === resolveInfo.fieldName
  );
  // FIXME: how to handle multiple fieldNode matches
  return extractSelections(
    filteredFieldNodes[0].selectionSet.selections,
    resolveInfo.fragments
  );
}

export const getMutationSelections = (resolveInfo) => {
  let selections = getQuerySelections(resolveInfo);
  if (selections.length === 0) {
    // FIXME: why aren't the selections found in the filteredFieldNode?
    selections = extractSelections(
      resolveInfo.operation.selectionSet.selections,
      resolveInfo.fragments
    );
  }
  return selections;
}

export const filterNullParams = ({    
  offset,
  first,
  otherParams
}) => {
  return Object.entries({
    ...{ offset, first },
    ...otherParams
  }).reduce(
    ([nulls, nonNulls], [key, value]) => {
      if (value === null) {
        nulls[key] = value;
      } else {
        nonNulls[key] = value;
      }
      return [nulls, nonNulls];
    },
    [{}, {}]
  );
}

export const isTemporalType = (name) => {
  return name === "_Neo4jTime" ||
    name === "_Neo4jDate" ||
    name === "_Neo4jDateTime" ||
    name === "_Neo4jLocalTime" ||
    name === "_Neo4jLocalDateTime";
}

const isTemporalInputType = (name) => {
  return name === "_Neo4jTimeInput" ||
    name === "_Neo4jDateInput" ||
    name === "_Neo4jDateTimeInput" ||
    name === "_Neo4jLocalTimeInput" ||
    name === "_Neo4jLocalDateTimeInput";
}

export const isTemporalField = (schemaType, name) => {
  const type = schemaType ? schemaType.name : '';
  return isTemporalType(type) && 
    name === "year" || 
    name === "month" ||
    name === "day" ||
    name === "hour" ||
    name === "minute" ||
    name === "second" ||
    name === "microsecond" ||
    name === "millisecond" ||
    name === "nanosecond" ||
    name === "timezone" || 
    name === "formatted";
}

export const getTemporalArguments = (args) => {
  return args ? args.reduce( (acc, t) => {
    const fieldType = getNamedType(t.type).name.value;
    if(isTemporalInputType(fieldType)) acc.push(t);
    return acc;
  }, []) : [];
}

export function temporalPredicateClauses(filters, variableName, temporalArgs, parentParam) {
  return temporalArgs.reduce( (acc, t) => {
    // For every temporal argument
    const argName = t.name.value;
    let temporalParam = filters[argName]; 
    if(temporalParam) {
      // If a parameter value has been provided for it check whether 
      // the provided param value is in an indexed object for a nested argument
      const paramIndex = temporalParam.index;
      const paramValue = temporalParam.value;
      // If it is, set and use its .value
      if(paramValue) temporalParam = paramValue;
      if(temporalParam["formatted"]) {
        // Only the dedicated 'formatted' arg is used if it is provided
        acc.push(`${variableName}.${argName} = ${getTemporalCypherConstructor(t)}($${
            // use index if provided, for nested arguments
            typeof paramIndex === 'undefined' 
            ? `${parentParam ? `${parentParam}.` : ''}${argName}.formatted` 
            : `${parentParam ? `${parentParam}.` : ''}${paramIndex}_${argName}.formatted`
          })`);
      }
      else {
        Object.keys(temporalParam).forEach(e => {
          acc.push(`${variableName}.${argName}.${e} = $${
            typeof paramIndex === 'undefined' 
              ? `${parentParam ? `${parentParam}.` : ''}${argName}` 
              : `${parentParam ? `${parentParam}.` : ''}${paramIndex}_${argName}`
            }.${e}`);
        });
      }
    }
    return acc;
  }, []);
}

export const isRootSelection = ({selectionInfo, rootType}) => (
  selectionInfo && 
  selectionInfo.rootType === rootType
);
