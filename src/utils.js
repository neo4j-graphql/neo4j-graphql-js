const { print, parse } = require('graphql');
const neo4j = require('neo4j-driver').v1;
const _ = require('lodash');
const filter = require('lodash/filter');

function parseArg(arg, variableValues) {
  switch (arg.value.kind) {
    case 'IntValue': {
      return parseInt(arg.value.value);
    }
    case 'FloatValue': {
      return parseFloat(arg.value.value);
    }
    case 'Variable': {
      return variableValues[arg.value.name.value];
    }
    case 'ObjectValue': {
      return parseArgs(arg.value.fields, variableValues);
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

var parseArgs = function(args, variableValues) {
  if (!args || args.length === 0) {
    return {};
  }
  return args.reduce((acc, arg) => {
    acc[arg.name.value] = parseArg(arg, variableValues);
    return acc;
  }, {});
};

var parseFieldSdl = sdl => {
  return sdl ? parse(`type Type { ${sdl} }`).definitions[0].fields[0] : {};
};

var parseInputFieldsSdl = fields => {
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

var parseDirectiveSdl = sdl => {
  return sdl
    ? parse(`type Type { field: String ${sdl} }`).definitions[0].fields[0]
        .directives[0]
    : {};
};

var printTypeMap = typeMap => {
  return print({
    kind: 'Document',
    definitions: Object.values(typeMap)
  });
};

var extractTypeMapFromTypeDefs = typeDefs => {
  // TODO accept alternative typeDefs formats (arr of strings, ast, etc.)
  // into a single string for parse, add validatation
  const astNodes = parse(typeDefs).definitions;
  return astNodes.reduce((acc, t) => {
    if (t.name) acc[t.name.value] = t;
    return acc;
  }, {});
};

var extractSelections = function(selections, fragments) {
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
};

var extractQueryResult = function({ records }, returnType) {
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
};

var typeIdentifiers = function(returnType) {
  const typeName = innerType(returnType).toString();
  return {
    variableName: lowFirstLetter(typeName),
    typeName
  };
};

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

var cypherDirectiveArgs = function(
  variable,
  headSelection,
  cypherParams,
  schemaType,
  resolveInfo,
  paramIndex
) {
  // Get any default arguments or an empty object
  const defaultArgs = getDefaultArguments(headSelection.name.value, schemaType);
  // Set the $this parameter by default
  let args = [`this: ${variable}`];
  // If cypherParams are provided, add the parameter
  if (cypherParams) args.push(`cypherParams: $cypherParams`);
  // Parse field argument values
  const queryArgs = parseArgs(
    headSelection.arguments,
    resolveInfo.variableValues
  );
  // Add arguments that have default values, if no value is provided
  Object.keys(defaultArgs).forEach(e => {
    // Use only if default value exists and no value has been provided
    if (defaultArgs[e] !== undefined && queryArgs[e] === undefined) {
      // Values are inlined
      const inlineDefaultValue = JSON.stringify(defaultArgs[e]);
      args.push(`${e}: ${inlineDefaultValue}`);
    }
  });
  // Add arguments that have provided values
  Object.keys(queryArgs).forEach(e => {
    if (queryArgs[e] !== undefined) {
      // Use only if value exists
      args.push(`${e}: $${paramIndex}_${e}`);
    }
  });
  // Return the comma separated join of all param
  // strings, adding a comma to match current test formats
  return args.join(', ');
};

var _isNamedMutation = function(name) {
  return function(resolveInfo) {
    return (
      isMutation(resolveInfo) &&
      resolveInfo.fieldName.split(/(?=[A-Z])/)[0].toLowerCase() ===
        name.toLowerCase()
    );
  };
};

var isCreateMutation = _isNamedMutation('create');

var isAddMutation = _isNamedMutation('add');

var isUpdateMutation = _isNamedMutation('update');

var isChangeMutation = _isNamedMutation('change');

var isDeleteMutation = _isNamedMutation('delete');

var isRemoveMutation = _isNamedMutation('remove');

var isMutation = function(resolveInfo) {
  return resolveInfo.operation.operation === 'mutation';
};

var isGraphqlScalarType = function(type) {
  return (
    type.constructor.name === 'GraphQLScalarType' ||
    type.constructor.name === 'GraphQLEnumType'
  );
};

var isArrayType = function(type) {
  return type ? type.toString().startsWith('[') : false;
};

var isRelationTypeDirectedField = fieldName => {
  return fieldName === 'from' || fieldName === 'to';
};

var isKind = (type, kind) => type && type.kind && type.kind === kind;

var isListType = (type, isList = false) => {
  if (!isKind(type, 'NamedType')) {
    if (isKind(type, 'ListType')) isList = true;
    return isListType(type.type, isList);
  }
  return isList;
};

var isNonNullType = (type, isRequired = false, parent = {}) => {
  if (!isKind(type, 'NamedType')) {
    return isNonNullType(type.type, isRequired, type);
  }
  if (isKind(parent, 'NonNullType')) {
    isRequired = true;
  }
  return isRequired;
};

var isBasicScalar = name => {
  return (
    name === 'ID' ||
    name === 'String' ||
    name === 'Float' ||
    name === 'Int' ||
    name === 'Boolean'
  );
};

var isNodeType = astNode => {
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

var isRelationTypePayload = schemaType => {
  const astNode = schemaType ? schemaType.astNode : undefined;
  const directive = astNode ? getRelationTypeDirectiveArgs(astNode) : undefined;
  return astNode && astNode.fields && directive
    ? astNode.fields.find(e => {
        return e.name.value === directive.from || e.name.value === directive.to;
      })
    : undefined;
};

var isRootSelection = ({ selectionInfo, rootType }) =>
  selectionInfo && selectionInfo.rootType === rootType;

var lowFirstLetter = function(word) {
  return word.charAt(0).toLowerCase() + word.slice(1);
};

var innerType = function(type) {
  return type.ofType ? innerType(type.ofType) : type;
};

var filtersFromSelections = function(selections, variableValues) {
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
};

var getFilterParams = function(filters, index) {
  return Object.entries(filters).reduce((result, [key, value]) => {
    result[key] = index
      ? {
          value,
          index
        }
      : value;
    return result;
  }, {});
};

var innerFilterParams = function(
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
};

var paramsToString = function(params, cypherParams) {
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
};

var computeSkipLimit = function(selection, variableValues) {
  let first = argumentValue(selection, 'first', variableValues);
  let offset = argumentValue(selection, 'offset', variableValues);

  if (first === null && offset === null) return '';
  if (offset === null) return `[..${first}]`;
  if (first === null) return `[${offset}..]`;
  return `[${offset}..${parseInt(offset) + parseInt(first)}]`;
};

function orderByStatement(resolveInfo, orderByVar) {
  const splitIndex = orderByVar.lastIndexOf('_');
  const order = orderByVar.substring(splitIndex + 1);
  const orderBy = orderByVar.substring(0, splitIndex);
  const { variableName } = typeIdentifiers(resolveInfo.returnType);
  return ` ${variableName}.${orderBy} ${order === 'asc' ? 'ASC' : 'DESC'} `;
}

var computeOrderBy = (resolveInfo, selection) => {
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

var possiblySetFirstId = ({ args, statements, params }) => {
  const arg = args.find(e => getNamedType(e).name.value === 'ID');
  // arg is the first ID field if it exists, and we set the value
  // if no value is provided for the field name (arg.name.value) in params
  if (arg && arg.name.value && params[arg.name.value] === undefined) {
    statements.push(`${arg.name.value}: apoc.create.uuid()`);
  }
  return statements;
};

var getQueryArguments = resolveInfo => {
  return resolveInfo.schema.getQueryType().getFields()[resolveInfo.fieldName]
    .astNode.arguments;
};

var getMutationArguments = resolveInfo => {
  return resolveInfo.schema.getMutationType().getFields()[resolveInfo.fieldName]
    .astNode.arguments;
};

// TODO refactor
var buildCypherParameters = ({ args, statements = [], params, paramKey }) => {
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

var cypherDirective = directiveWithArgs('cypher', ['statement']);

var relationDirective = directiveWithArgs('relation', ['name', 'direction']);

var getTypeDirective = (relatedAstNode, name) => {
  return relatedAstNode && relatedAstNode.directives
    ? relatedAstNode.directives.find(e => e.name.value === name)
    : undefined;
};

var getFieldDirective = (field, directive) => {
  return (
    field &&
    field.directives &&
    field.directives.find(e => e.name.value === directive)
  );
};

var getRelationDirection = relationDirective => {
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

var getRelationName = relationDirective => {
  let name = {};
  try {
    name = relationDirective.arguments.filter(a => a.name.value === 'name')[0];
    return name.value.value;
  } catch (e) {
    // FIXME: should we ignore this error to define default behavior?
    throw new Error('No name argument specified on @relation directive');
  }
};

var getQueryCypherDirective = resolveInfo => {
  return resolveInfo.schema
    .getQueryType()
    .getFields()
    [resolveInfo.fieldName].astNode.directives.find(x => {
      return x.name.value === 'cypher';
    });
};

var getMutationCypherDirective = resolveInfo => {
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

var getRelationTypeDirectiveArgs = relationshipType => {
  const directive =
    relationshipType && relationshipType.directives
      ? relationshipType.directives.find(e => e.name.value === 'relation')
      : undefined;
  let args = undefined;
  if (directive) {
    args = {
      name: directive.arguments.find(e => e.name.value === 'name').value.value
    };
    const fromInputArg = directive.arguments.find(e => e.name.value === 'from');
    if (fromInputArg) args.from = fromInputArg.value.value;
    const toInputArg = directive.arguments.find(e => e.name.value === 'to');
    if (toInputArg) args.to = toInputArg.value.value;
  }
  return args;
};

var getRelationMutationPayloadFieldsFromAst = relatedAstNode => {
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

var getNamedType = type => {
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

const nonNullFields = fields => {
  return fields.filter(field => {
    return field.type.kind === 'NonNullType' && field.name.value !== '_id';
  });
};

var getPrimaryKeys = astNode => {
  let fields = astNode.fields;
  if (!fields.length) return fields;
  // remove all ignored fields
  fields = fields.filter(field => !getFieldDirective(field, 'neo4j_ignore'));
  return nonNullFields(fields);
};

var createOperationMap = type => {
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
var safeVar = i => {
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
var safeLabel = l => {
  const asStr = `${l}`;
  const escapeInner = asStr.replace(/\`/g, '\\`');
  return '`' + escapeInner + '`';
};

var decideNestedVariableName = ({
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

var initializeMutationParams = ({
  resolveInfo,
  mutationTypeCypherDirective,
  otherParams,
  first,
  offset
}) => {
  return (isCreateMutation(resolveInfo) ||
    isUpdateMutation(resolveInfo) ||
    isDeleteMutation(resolveInfo)) &&
    !mutationTypeCypherDirective
    ? { params: otherParams, ...{ first, offset } }
    : { ...otherParams, ...{ first, offset } };
};

var getOuterSkipLimit = first =>
  `SKIP $offset${first > -1 ? ' LIMIT $first' : ''}`;

var getPayloadSelections = resolveInfo => {
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

var filterNullParams = ({ offset, first, otherParams }) => {
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

var splitSelectionParameters = (params, primaryKeyArgNames, paramKey) => {
  const paramKeys = Object.keys(params);
  const [primaryKeyParams, otherParams] = paramKeys.reduce(
    (acc, t) => {
      if (!paramKey) {
        if (primaryKeyArgNames.indexOf(t) >= 0) {
          acc[0][t] = params[t];
        } else {
          acc[1][t] = params[t];
        }
      } else if (t == paramKey) {
        const subParamKeys = paramKey
          ? Object.keys(params[paramKey])
          : undefined;
        [acc[0], acc[1][t]] = subParamKeys.reduce(
          (subAcc, subT) => {
            if (primaryKeyArgNames.indexOf(subT) >= 0) {
              subAcc[0][subT] = params[t][subT];
            } else {
              if (subAcc[1] === undefined) subAcc[1] = {};
              subAcc[1][subT] = params[t][subT];
            }
            return subAcc;
          },
          [{}, {}]
        );
      } else {
        acc[1][t] = params[t];
      }
      return acc;
    },
    [{}, {}]
  );
  return [primaryKeyParams, otherParams];
};

var isTemporalField = (schemaType, name) => {
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

var isTemporalType = name => {
  return (
    name === '_Neo4jTime' ||
    name === '_Neo4jDate' ||
    name === '_Neo4jDateTime' ||
    name === '_Neo4jLocalTime' ||
    name === '_Neo4jLocalDateTime'
  );
};

var getTemporalCypherConstructor = fieldAst => {
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

var getTemporalArguments = args => {
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

var isTemporalInputType = name => {
  return (
    name === '_Neo4jTimeInput' ||
    name === '_Neo4jDateInput' ||
    name === '_Neo4jDateTimeInput' ||
    name === '_Neo4jLocalTimeInput' ||
    name === '_Neo4jLocalDateTimeInput'
  );
};

var temporalPredicateClauses = (
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
var excludeIgnoredTypes = (typeMap, config = {}) => {
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

var getExcludedTypes = (config, rootType) => {
  return config &&
    rootType &&
    config[rootType] &&
    typeof config[rootType] === 'object' &&
    config[rootType].exclude
    ? config[rootType].exclude
    : [];
};

var possiblyAddIgnoreDirective = (astNode, typeMap, resolvers, config) => {
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

var getCustomFieldResolver = (astNode, field, resolvers) => {
  const typeResolver =
    astNode && astNode.name && astNode.name.value
      ? resolvers[astNode.name.value]
      : undefined;
  return typeResolver ? typeResolver[field.name.value] : undefined;
};

var removeIgnoredFields = (schemaType, selections) => {
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

var fieldCopyNullable = field => {
  const newField = {};
  if (field && field.kind && field.kind === 'FieldDefinition') {
    if (isNonNullType(field)) {
      // keep key-value pairs except for type and loc
      ['kind', 'description', 'name', 'arguments', 'directives'].forEach(e => {
        newField[e] = field[e];
      });
      const fieldType = field.type;
      const newFieldType = getNamedType(fieldType);
      newField.type = newFieldType;
      if (field.loc) {
        newField.loc = {
          start: field.loc.start,
          end: field.loc.end - 1
        };
      }
    }
  }
  return Object.keys(newField).length > 0 ? newField : field;
};

var fieldCopyNonNullable = field => {
  const newField = {};
  if (field && field.kind && field.kind === 'FieldDefinition') {
    if (!isNonNullType(field)) {
      // keep key-value pairs except for type and loc
      ['kind', 'description', 'name', 'arguments', 'directives'].forEach(e => {
        newField[e] = field[e];
      });
      const fieldType = field.type;
      const newFieldType = {
        kind: 'NonNullType',
        type: getNamedType(currentFieldType)
      };
      if (fieldType.loc) {
        newFieldType.loc = {
          start: fieldType.loc.start,
          end: fieldType.loc.end + 1
        };
      }
      newField.type = newFieldType;
      if (field.loc) {
        newField.loc = {
          start: field.loc.start,
          end: field.loc.end + 1
        };
      }
    }
  }
  return Object.keys(newField).length > 0 ? newField : field;
};

module.exports = {
  parseArgs,
  parseFieldSdl,
  parseInputFieldsSdl,
  parseDirectiveSdl,
  printTypeMap,
  extractTypeMapFromTypeDefs,
  extractSelections,
  extractQueryResult,
  typeIdentifiers,
  cypherDirectiveArgs,
  _isNamedMutation,
  isCreateMutation,
  isAddMutation,
  isUpdateMutation,
  isChangeMutation,
  isDeleteMutation,
  isRemoveMutation,
  isMutation,
  isGraphqlScalarType,
  isArrayType,
  isRelationTypeDirectedField,
  isKind,
  isListType,
  isNonNullType,
  isBasicScalar,
  isNodeType,
  isRelationTypePayload,
  isRootSelection,
  lowFirstLetter,
  innerType,
  filtersFromSelections,
  getFilterParams,
  innerFilterParams,
  paramsToString,
  computeSkipLimit,
  computeOrderBy,
  possiblySetFirstId,
  getQueryArguments,
  getMutationArguments,
  buildCypherParameters,
  cypherDirective,
  relationDirective,
  getTypeDirective,
  getFieldDirective,
  getRelationDirection,
  getRelationName,
  getQueryCypherDirective,
  getMutationCypherDirective,
  getRelationTypeDirectiveArgs,
  getRelationMutationPayloadFieldsFromAst,
  getNamedType,
  getPrimaryKeys,
  createOperationMap,
  safeVar,
  safeLabel,
  decideNestedVariableName,
  initializeMutationParams,
  getOuterSkipLimit,
  getPayloadSelections,
  filterNullParams,
  splitSelectionParameters,
  isTemporalField,
  isTemporalType,
  getTemporalCypherConstructor,
  getTemporalArguments,
  isTemporalInputType,
  temporalPredicateClauses,
  excludeIgnoredTypes,
  getExcludedTypes,
  possiblyAddIgnoreDirective,
  getCustomFieldResolver,
  removeIgnoredFields,
  fieldCopyNullable,
  fieldCopyNonNullable
};
