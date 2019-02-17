import { print, parse } from 'graphql';
import { possiblyAddArgument } from './augment';
import { v1 as neo4j } from 'neo4j-driver';
import _ from 'lodash';
import filter from 'lodash/filter';

function parseArg(arg, variableValues) {
  switch (arg.value.kind) {
    case 'Variable': {
      return variableValues[arg.value.name.value];
    }
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
    case 'ListValue': {
      return _.map(arg.value.values, value =>
        parseArg({ value }, variableValues)
      );
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

export const parseFieldSdl = sdl => {
  return sdl ? parse(`type Type { ${sdl} }`).definitions[0].fields[0] : {};
};

export const parseInputFieldsSdl = fields => {
  let arr = [];
  if (Array.isArray(fields)) {
    fields = fields.join('\n');
    arr = fields ? parse(`type Type { ${fields} }`).definitions[0].fields : [];
    arr = arr.map(e => ({
      kind: 'InputValueDefinition',
      name: e.name,
      type: e.type
    }));
  }
  return arr;
};

export const parseDirectiveSdl = sdl => {
  return sdl
    ? parse(`type Type { field: String ${sdl} }`).definitions[0].fields[0]
        .directives[0]
    : {};
};

export const printTypeMap = typeMap => {
  return print({
    kind: 'Document',
    definitions: Object.values(typeMap)
  });
};

export const extractTypeMapFromTypeDefs = typeDefs => {
  // TODO accept alternative typeDefs formats (arr of strings, ast, etc.)
  // into a single string for parse, add validatation
  const astNodes = parse(typeDefs).definitions;
  return astNodes.reduce((acc, t) => {
    if (t.name) acc[t.name.value] = t;
    return acc;
  }, {});
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

export function extractQueryResult({ records }, returnType) {
  const { variableName } = typeIdentifiers(returnType);
  let result = null;
  if (isArrayType(returnType)) {
    result = records.map(record => record.get(variableName));
  } else if (records.length) {
    // could be object or scalar
    result = records[0].get(variableName);
    result = Array.isArray(result) ? result[0] : result;
  }
  // handle Integer fields
  result = _.cloneDeepWith(result, field => {
    if (neo4j.isInt(field)) {
      // See: https://neo4j.com/docs/api/javascript-driver/current/class/src/v1/integer.js~Integer.html
      return field.inSafeRange() ? field.toNumber() : field.toString();
    }
  });
  return result;
}

export function typeIdentifiers(returnType) {
  const typeName = innerType(returnType).toString();
  return {
    variableName: lowFirstLetter(typeName),
    typeName
  };
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
  cypherParams,
  headSelection,
  schemaType,
  resolveInfo
) {
  const defaultArgs = getDefaultArguments(headSelection.name.value, schemaType);
  const queryArgs = parseArgs(
    headSelection.arguments,
    resolveInfo.variableValues
  );

  const args = JSON.stringify(Object.assign(defaultArgs, queryArgs)).replace(
    /\"([^(\")"]+)\":/g,
    ' $1: '
  );

  return args === '{}'
    ? `{this: ${variable}, ${
        cypherParams ? `cypherParams: $cypherParams` : ''
      }${args.substring(1)}`
    : `{this: ${variable},${
        cypherParams ? ` cypherParams: $cypherParams,` : ''
      }${args.substring(1)}`;
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

export function isMutation(resolveInfo) {
  return resolveInfo.operation.operation === 'mutation';
}

export function isGraphqlScalarType(type) {
  return (
    type.constructor.name === 'GraphQLScalarType' ||
    type.constructor.name === 'GraphQLEnumType'
  );
}

export function isArrayType(type) {
  return type ? type.toString().startsWith('[') : false;
}

export const isRelationTypeDirectedField = fieldName => {
  return fieldName === 'from' || fieldName === 'to';
};

export const isKind = (type, kind) => type && type.kind && type.kind === kind;

export const isListType = (type, isList = false) => {
  if (!isKind(type, 'NamedType')) {
    if (isKind(type, 'ListType')) isList = true;
    return isListType(type.type, isList);
  }
  return isList;
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

export const isBasicScalar = name => {
  return (
    name === 'ID' ||
    name === 'String' ||
    name === 'Float' ||
    name === 'Int' ||
    name === 'Boolean'
  );
};

export const isNodeType = astNode => {
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

export const isRelationTypePayload = schemaType => {
  const astNode = schemaType ? schemaType.astNode : undefined;
  const directive = astNode ? getRelationTypeDirectiveArgs(astNode) : undefined;
  return astNode && astNode.fields && directive
    ? astNode.fields.find(e => {
        return e.name.value === directive.from || e.name.value === directive.to;
      })
    : undefined;
};

export const isRootSelection = ({ selectionInfo, rootType }) =>
  selectionInfo && selectionInfo.rootType === rootType;

export function lowFirstLetter(word) {
  return word.charAt(0).toLowerCase() + word.slice(1);
}

export function innerType(type) {
  return type.ofType ? innerType(type.ofType) : type;
}

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

export function innerFilterParams(
  filters,
  temporalArgs,
  paramKey,
  cypherDirective
) {
  const temporalArgNames = temporalArgs
    ? temporalArgs.reduce((acc, t) => {
        acc.push(t.name.value);
        return acc;
      }, [])
    : [];
  // don't exclude first, offset, orderBy args for cypher directives
  const excludedKeys = cypherDirective ? [] : ['first', 'offset', 'orderBy'];

  return Object.keys(filters).length > 0
    ? Object.entries(filters)
        // exclude temporal arguments
        .filter(
          ([key]) => ![...excludedKeys, ...temporalArgNames].includes(key)
        )
        .map(([key, value]) => {
          return { key, paramKey, value };
        })
    : [];
}

export function paramsToString(params, cypherParams) {
  if (params.length > 0) {
    const strings = _.map(params, param => {
      return `${param.key}:${param.paramKey ? `$${param.paramKey}.` : '$'}${
        typeof param.value.index === 'undefined'
          ? param.key
          : `${param.value.index}_${param.key}`
      }`;
    });
    return `{${strings.join(', ')}${
      cypherParams ? `, cypherParams: $cypherParams}` : '}'
    }`;
  }
  return '';
}

export function computeSkipLimit(selection, variableValues) {
  let first = argumentValue(selection, 'first', variableValues);
  let offset = argumentValue(selection, 'offset', variableValues);

  if (first === null && offset === null) return '';
  if (offset === null) return `[..${first}]`;
  if (first === null) return `[${offset}..]`;
  return `[${offset}..${parseInt(offset) + parseInt(first)}]`;
}

function orderByStatement(resolveInfo, orderByVar) {
  const splitIndex = orderByVar.lastIndexOf('_');
  const order = orderByVar.substring(splitIndex + 1);
  const orderBy = orderByVar.substring(0, splitIndex);
  const { variableName } = typeIdentifiers(resolveInfo.returnType);
  return ` ${variableName}.${orderBy} ${order === 'asc' ? 'ASC' : 'DESC'} `;
}

export const computeOrderBy = (resolveInfo, selection) => {
  const orderByArgs = argumentValue(
    resolveInfo.operation.selectionSet.selections[0],
    'orderBy',
    resolveInfo.variableValues
  );

  if (orderByArgs == undefined) {
    return '';
  }

  const orderByArray = Array.isArray(orderByArgs) ? orderByArgs : [orderByArgs];
  const orderByStatments = orderByArray.map(orderByVar =>
    orderByStatement(resolveInfo, orderByVar)
  );

  return ' ORDER BY' + orderByStatments.join(',');
};

export const possiblySetFirstId = ({ args, statements, params }) => {
  const arg = args.find(e => getNamedType(e).name.value === 'ID');
  // arg is the first ID field if it exists, and we set the value
  // if no value is provided for the field name (arg.name.value) in params
  if (arg && arg.name.value && params[arg.name.value] === undefined) {
    statements.push(`${arg.name.value}: apoc.create.uuid()`);
  }
  return statements;
};

export const getQueryArguments = resolveInfo => {
  return resolveInfo.schema.getQueryType().getFields()[resolveInfo.fieldName]
    .astNode.arguments;
};

export const getMutationArguments = resolveInfo => {
  return resolveInfo.schema.getMutationType().getFields()[resolveInfo.fieldName]
    .astNode.arguments;
};

// TODO refactor
export const buildCypherParameters = ({
  args,
  statements = [],
  params,
  paramKey
}) => {
  const dataParams = paramKey ? params[paramKey] : params;
  const paramKeys = dataParams ? Object.keys(dataParams) : [];
  if (args) {
    statements = paramKeys.reduce((acc, paramName) => {
      const param = paramKey ? params[paramKey][paramName] : params[paramName];
      // Get the AST definition for the argument matching this param name
      const fieldAst = args.find(arg => arg.name.value === paramName);
      if (fieldAst) {
        const fieldType = getNamedType(fieldAst.type);
        if (isTemporalInputType(fieldType.name.value)) {
          const formatted = param.formatted;
          const temporalFunction = getTemporalCypherConstructor(fieldAst);
          if (temporalFunction) {
            // Prefer only using formatted, if provided
            if (formatted) {
              if (paramKey) params[paramKey][paramName] = formatted;
              else params[paramName] = formatted;
              acc.push(
                `${paramName}: ${temporalFunction}($${
                  paramKey ? `${paramKey}.` : ''
                }${paramName})`
              );
            } else {
              let temporalParam = {};
              if (Array.isArray(param)) {
                const count = param.length;
                let i = 0;
                for (; i < count; ++i) {
                  temporalParam = param[i];
                  const formatted = temporalParam.formatted;
                  if (temporalParam.formatted) {
                    paramKey
                      ? (params[paramKey][paramName] = formatted)
                      : (params[paramName] = formatted);
                  } else {
                    Object.keys(temporalParam).forEach(e => {
                      if (Number.isInteger(temporalParam[e])) {
                        paramKey
                          ? (params[paramKey][paramName][i][e] = neo4j.int(
                              temporalParam[e]
                            ))
                          : (params[paramName][i][e] = neo4j.int(
                              temporalParam[e]
                            ));
                      }
                    });
                  }
                }
                acc.push(
                  `${paramName}: [value IN $${
                    paramKey ? `${paramKey}.` : ''
                  }${paramName} | ${temporalFunction}(value)]`
                );
              } else {
                temporalParam = paramKey
                  ? params[paramKey][paramName]
                  : params[paramName];
                const formatted = temporalParam.formatted;
                if (temporalParam.formatted) {
                  paramKey
                    ? (params[paramKey][paramName] = formatted)
                    : (params[paramName] = formatted);
                } else {
                  Object.keys(temporalParam).forEach(e => {
                    if (Number.isInteger(temporalParam[e])) {
                      paramKey
                        ? (params[paramKey][paramName][e] = neo4j.int(
                            temporalParam[e]
                          ))
                        : (params[paramName][e] = neo4j.int(temporalParam[e]));
                    }
                  });
                }
                acc.push(
                  `${paramName}: ${temporalFunction}($${
                    paramKey ? `${paramKey}.` : ''
                  }${paramName})`
                );
              }
            }
          }
        } else {
          // normal case
          acc.push(
            `${paramName}:$${paramKey ? `${paramKey}.` : ''}${paramName}`
          );
        }
      }
      return acc;
    }, statements);
  }
  if (paramKey) {
    params[paramKey] = dataParams;
  }
  return [params, statements];
};

// TODO refactor to handle Query/Mutation type schema directives
const directiveWithArgs = (directiveName, args) => (schemaType, fieldName) => {
  function fieldDirective(schemaType, fieldName, directiveName) {
    return !isGraphqlScalarType(schemaType)
      ? schemaType
          .getFields()
          [fieldName].astNode.directives.find(
            e => e.name.value === directiveName
          )
      : {};
  }

  function directiveArgument(directive, name) {
    return directive && directive.arguments
      ? directive.arguments.find(e => e.name.value === name).value.value
      : [];
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

export const getTypeDirective = (relatedAstNode, name) => {
  return relatedAstNode && relatedAstNode.directives
    ? relatedAstNode.directives.find(e => e.name.value === name)
    : undefined;
};

export const getFieldDirective = (field, directive) => {
  return (
    field &&
    field.directives &&
    field.directives.find(e => e.name.value === directive)
  );
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
  typeMap['_RelationDirections'] = parse(
    `enum _RelationDirections { IN OUT }`
  ).definitions[0];
  typeMap['neo4j_ignore'] = parse(
    `directive @neo4j_ignore on FIELD_DEFINITION`
  ).definitions[0];
  return typeMap;
};

export const getQueryCypherDirective = resolveInfo => {
  return resolveInfo.schema
    .getQueryType()
    .getFields()
    [resolveInfo.fieldName].astNode.directives.find(x => {
      return x.name.value === 'cypher';
    });
};

export const getMutationCypherDirective = resolveInfo => {
  return resolveInfo.schema
    .getMutationType()
    .getFields()
    [resolveInfo.fieldName].astNode.directives.find(x => {
      return x.name.value === 'cypher';
    });
};

function argumentValue(selection, name, variableValues) {
  let arg = selection.arguments.find(a => a.name.value === name);
  if (!arg) {
    return null;
  } else {
    return parseArg(arg, variableValues);
  }
}

export const getRelationTypeDirectiveArgs = relationshipType => {
  const directive =
    relationshipType && relationshipType.directives
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

export const getNamedType = type => {
  if (type.kind !== 'NamedType') {
    return getNamedType(type.type);
  }
  return type;
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
  let fields = astNode.fields;
  let pk = undefined;
  // remove all ignored fields
  fields = fields.filter(field => !getFieldDirective(field, 'neo4j_ignore'));
  if (!fields.length) return pk;
  pk = firstNonNullAndIdField(fields);
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

export const createOperationMap = type => {
  const fields = type ? type.fields : [];
  return fields.reduce((acc, t) => {
    acc[t.name.value] = t;
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
      rootType: 'relationship'
    }) &&
    isRelationTypeDirectedField(fieldName)
  ) {
    return parentSelectionInfo[fieldName];
  } else if (schemaTypeRelation) {
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
};

export const getOuterSkipLimit = first =>
  `SKIP $offset${first > -1 ? ' LIMIT $first' : ''}`;

export const getPayloadSelections = resolveInfo => {
  const filteredFieldNodes = filter(
    resolveInfo.fieldNodes,
    n => n.name.value === resolveInfo.fieldName
  );
  if (filteredFieldNodes[0] && filteredFieldNodes[0].selectionSet) {
    // FIXME: how to handle multiple fieldNode matches
    const x = extractSelections(
      filteredFieldNodes[0].selectionSet.selections,
      resolveInfo.fragments
    );
    return x;
  }
  return [];
};

export const filterNullParams = ({ offset, first, otherParams }) => {
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
};

export const splitSelectionParameters = (
  params,
  primaryKeyArgName,
  paramKey
) => {
  const paramKeys = paramKey
    ? Object.keys(params[paramKey])
    : Object.keys(params);
  const [primaryKeyParam, updateParams] = paramKeys.reduce(
    (acc, t) => {
      if (t === primaryKeyArgName) {
        if (paramKey) {
          acc[0][t] = params[paramKey][t];
        } else {
          acc[0][t] = params[t];
        }
      } else {
        if (paramKey) {
          if (acc[1][paramKey] === undefined) acc[1][paramKey] = {};
          acc[1][paramKey][t] = params[paramKey][t];
        } else {
          acc[1][t] = params[t];
        }
      }
      return acc;
    },
    [{}, {}]
  );
  const first = params.first;
  const offset = params.offset;
  if (first !== undefined) updateParams['first'] = first;
  if (offset !== undefined) updateParams['offset'] = offset;
  return [primaryKeyParam, updateParams];
};

export const isTemporalField = (schemaType, name) => {
  const type = schemaType ? schemaType.name : '';
  return (
    (isTemporalType(type) && name === 'year') ||
    name === 'month' ||
    name === 'day' ||
    name === 'hour' ||
    name === 'minute' ||
    name === 'second' ||
    name === 'microsecond' ||
    name === 'millisecond' ||
    name === 'nanosecond' ||
    name === 'timezone' ||
    name === 'formatted'
  );
};

export const isTemporalType = name => {
  return (
    name === '_Neo4jTime' ||
    name === '_Neo4jDate' ||
    name === '_Neo4jDateTime' ||
    name === '_Neo4jLocalTime' ||
    name === '_Neo4jLocalDateTime'
  );
};

export const getTemporalCypherConstructor = fieldAst => {
  let cypherFunction = undefined;
  const type = fieldAst ? getNamedType(fieldAst.type).name.value : '';
  switch (type) {
    case '_Neo4jTimeInput':
      cypherFunction = 'time';
      break;
    case '_Neo4jDateInput':
      cypherFunction = 'date';
      break;
    case '_Neo4jDateTimeInput':
      cypherFunction = 'datetime';
      break;
    case '_Neo4jLocalTimeInput':
      cypherFunction = 'localtime';
      break;
    case '_Neo4jLocalDateTimeInput':
      cypherFunction = 'localdatetime';
      break;
    default:
      break;
  }
  return cypherFunction;
};

export const getTemporalArguments = args => {
  return args
    ? args.reduce((acc, t) => {
        if (!t) {
          return acc;
        }
        const fieldType = getNamedType(t.type).name.value;
        if (isTemporalInputType(fieldType)) acc.push(t);
        return acc;
      }, [])
    : [];
};

export const isTemporalInputType = name => {
  return (
    name === '_Neo4jTimeInput' ||
    name === '_Neo4jDateInput' ||
    name === '_Neo4jDateTimeInput' ||
    name === '_Neo4jLocalTimeInput' ||
    name === '_Neo4jLocalDateTimeInput'
  );
};

export const temporalPredicateClauses = (
  filters,
  variableName,
  temporalArgs,
  parentParam
) => {
  return temporalArgs.reduce((acc, t) => {
    // For every temporal argument
    const argName = t.name.value;
    let temporalParam = filters[argName];
    if (temporalParam) {
      // If a parameter value has been provided for it check whether
      // the provided param value is in an indexed object for a nested argument
      const paramIndex = temporalParam.index;
      const paramValue = temporalParam.value;
      // If it is, set and use its .value
      if (paramValue) temporalParam = paramValue;
      if (temporalParam['formatted']) {
        // Only the dedicated 'formatted' arg is used if it is provided
        acc.push(
          `${variableName}.${argName} = ${getTemporalCypherConstructor(t)}($${
            // use index if provided, for nested arguments
            typeof paramIndex === 'undefined'
              ? `${parentParam ? `${parentParam}.` : ''}${argName}.formatted`
              : `${
                  parentParam ? `${parentParam}.` : ''
                }${paramIndex}_${argName}.formatted`
          })`
        );
      } else {
        Object.keys(temporalParam).forEach(e => {
          acc.push(
            `${variableName}.${argName}.${e} = $${
              typeof paramIndex === 'undefined'
                ? `${parentParam ? `${parentParam}.` : ''}${argName}`
                : `${
                    parentParam ? `${parentParam}.` : ''
                  }${paramIndex}_${argName}`
            }.${e}`
          );
        });
      }
    }
    return acc;
  }, []);
};

// An ignored type is a type without at least 1 non-ignored field
export const excludeIgnoredTypes = (typeMap, config = {}) => {
  const queryExclusionMap = {};
  const mutationExclusionMap = {};
  // If .query is an object and .exclude is provided, use it, else use new arr
  let excludedQueries = getExcludedTypes(config, 'query');
  let excludedMutations = getExcludedTypes(config, 'mutation');
  // Add any ignored types to exclusion arrays
  Object.keys(typeMap).forEach(name => {
    if (
      typeMap[name].fields &&
      !typeMap[name].fields.find(
        field => !getFieldDirective(field, 'neo4j_ignore')
      )
    ) {
      // All fields are ignored, so exclude the type
      excludedQueries.push(name);
      excludedMutations.push(name);
    }
  });
  // As long as the API is still allowed, convert the exclusion arrays
  // to a boolean map for quicker reference later
  if (config.query !== false) {
    excludedQueries.forEach(e => {
      queryExclusionMap[e] = true;
    });
    config.query = { exclude: queryExclusionMap };
  }
  if (config.mutation !== false) {
    excludedMutations.forEach(e => {
      mutationExclusionMap[e] = true;
    });
    config.mutation = { exclude: mutationExclusionMap };
  }
  return config;
};

export const getExcludedTypes = (config, rootType) => {
  return config &&
    rootType &&
    config[rootType] &&
    typeof config[rootType] === 'object' &&
    config[rootType].exclude
    ? config[rootType].exclude
    : [];
};

export const possiblyAddIgnoreDirective = (
  astNode,
  typeMap,
  resolvers,
  config
) => {
  const fields = astNode && astNode.fields ? astNode.fields : [];
  let valueTypeName = '';
  return fields.map(field => {
    // for any field of any type, if a custom resolver is provided
    // but there is no @ignore directive
    valueTypeName = getNamedType(field).name.value;
    if (
      // has a custom resolver but not a directive
      getCustomFieldResolver(astNode, field, resolvers) &&
      !getFieldDirective(field, 'neo4j_ignore') &&
      // fields that behave in ways specific to the neo4j mapping do not recieve ignore
      // directives and can instead have their data post-processed by a custom field resolver
      !getFieldDirective(field, 'relation') &&
      !getFieldDirective(field, 'cypher') &&
      !getTypeDirective(typeMap[valueTypeName], 'relation') &&
      !isTemporalType(valueTypeName)
    ) {
      // possibly initialize directives
      if (!field.directives) field.directives = [];
      // add the ignore directive for use in runtime translation
      field.directives.push(parseDirectiveSdl(`@neo4j_ignore`));
    }
    return field;
  });
};

export const getCustomFieldResolver = (astNode, field, resolvers) => {
  const typeResolver =
    astNode && astNode.name && astNode.name.value
      ? resolvers[astNode.name.value]
      : undefined;
  return typeResolver ? typeResolver[field.name.value] : undefined;
};

export const removeIgnoredFields = (schemaType, selections) => {
  if (!isGraphqlScalarType(schemaType) && selections && selections.length) {
    let schemaTypeField = '';
    selections = selections.filter(e => {
      if (e.kind === 'Field') {
        // so check if this field is ignored
        schemaTypeField = schemaType.getFields()[e.name.value];
        return (
          schemaTypeField &&
          schemaTypeField.astNode &&
          !getFieldDirective(schemaTypeField.astNode, 'neo4j_ignore')
        );
      }
      // keep element by default
      return true;
    });
  }
  return selections;
};
