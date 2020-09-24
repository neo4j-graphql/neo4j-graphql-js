import { parse, Kind } from 'graphql';
import { unwrapNamedType, isListTypeField } from './augment/fields';
import { Neo4jTypeFormatted } from './augment/types/types';
import { getFederatedOperationData } from './federation';
import neo4j from 'neo4j-driver';
import _ from 'lodash';

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
    case 'NullValue': {
      return null;
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

export const parseDirectiveSdl = sdl => {
  return sdl
    ? parse(`type Type { field: String ${sdl} }`).definitions[0].fields[0]
        .directives[0]
    : {};
};

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
  headSelection,
  cypherParams,
  schemaType,
  resolveInfo,
  paramIndex,
  isFederatedOperation,
  context
) {
  // Get any default arguments or an empty object
  const defaultArgs = getDefaultArguments(headSelection.name.value, schemaType);
  // Set the $this parameter by default
  let args = [`this: ${variable}`];
  // If cypherParams are provided, add the parameter
  if (cypherParams) args.push(`cypherParams: $cypherParams`);
  let federatedOperationParams = {};
  if (isFederatedOperation) {
    const { requiredData, params } = getFederatedOperationData({ context });
    federatedOperationParams = {
      ...requiredData,
      ...params
    };
    Object.keys(federatedOperationParams).forEach(name => {
      args.push(`${name}: $${name}`);
    });
  }
  // Parse field argument values
  const queryArgs = parseArgs(
    headSelection.arguments,
    resolveInfo.variableValues
  );
  // Add arguments that have default values, if no value is provided
  Object.keys(defaultArgs).forEach(e => {
    // Use only if default value exists and no value has been provided
    if (
      defaultArgs[e] !== undefined &&
      queryArgs[e] === undefined &&
      federatedOperationParams[e] === undefined
    ) {
      // Values are inlined
      const inlineDefaultValue = JSON.stringify(defaultArgs[e]);
      args.push(`${e}: ${inlineDefaultValue}`);
    }
  });
  // Add arguments that have provided values
  Object.keys(queryArgs).forEach(e => {
    if (
      queryArgs[e] !== undefined &&
      federatedOperationParams[e] === undefined
    ) {
      // Use only if value exists
      args.push(`${e}: $${paramIndex}_${e}`);
    }
  });
  // Return the comma separated join of all param
  // strings, adding a comma to match current test formats
  return args.join(', ');
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

export const isMergeMutation = _isNamedMutation('merge');

const isRelationshipUpdateMutation = ({ resolveInfo, mutationMeta }) =>
  isUpdateMutation(resolveInfo) && !mutationMeta;

const isRelationshipMergeMutation = ({ resolveInfo, mutationMeta }) =>
  isMergeMutation(resolveInfo) && !mutationMeta;

export function isMutation(resolveInfo) {
  return resolveInfo.operation.operation === 'mutation';
}

export function isGraphqlScalarType(type) {
  return (
    type.constructor.name === 'GraphQLScalarType' ||
    type.constructor.name === 'GraphQLEnumType'
  );
}

export function isGraphqlObjectType(type) {
  return type.constructor.name === 'GraphQLObjectType';
}

export function isGraphqlInterfaceType(type) {
  return type.constructor.name === 'GraphQLInterfaceType';
}

export function isGraphqlUnionType(type) {
  return type.constructor.name === 'GraphQLUnionType';
}

export function isArrayType(type) {
  return type ? type.toString().startsWith('[') : false;
}

export const isRelationTypeDirectedField = fieldName => {
  return fieldName === 'from' || fieldName === 'to';
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
  const directive = astNode ? getRelationTypeDirective(astNode) : undefined;
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
  neo4jTypeArgs,
  paramKey,
  cypherDirective
) {
  const temporalArgNames = neo4jTypeArgs
    ? neo4jTypeArgs.reduce((acc, t) => {
        acc.push(t.name.value);
        return acc;
      }, [])
    : [];
  // don't exclude first, offset, orderBy args for cypher directives
  const excludedKeys = cypherDirective
    ? []
    : ['first', 'offset', 'orderBy', 'filter'];
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
        !param.value || typeof param.value.index === 'undefined'
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

function splitOrderByArg(orderByVar) {
  const splitIndex = orderByVar.lastIndexOf('_');
  const order = orderByVar.substring(splitIndex + 1);
  const orderBy = orderByVar.substring(0, splitIndex);
  return { orderBy, order };
}

function orderByStatement(resolveInfo, { orderBy, order }) {
  const { variableName } = typeIdentifiers(resolveInfo.returnType);
  return ` ${variableName}.${orderBy} ${order === 'asc' ? 'ASC' : 'DESC'} `;
}

export const computeOrderBy = (resolveInfo, schemaType) => {
  let selection = resolveInfo.operation.selectionSet.selections[0];
  const orderByArgs = argumentValue(
    selection,
    'orderBy',
    resolveInfo.variableValues
  );

  if (orderByArgs == undefined) {
    return { cypherPart: '', optimization: { earlyOrderBy: false } };
  }

  const orderByArray = Array.isArray(orderByArgs) ? orderByArgs : [orderByArgs];

  let optimization = { earlyOrderBy: true };

  const orderByStatements = orderByArray.map(orderByVar => {
    const { orderBy, order } = splitOrderByArg(orderByVar);
    const hasNoCypherDirective = _.isEmpty(
      cypherDirective(schemaType, orderBy)
    );
    optimization.earlyOrderBy =
      optimization.earlyOrderBy && hasNoCypherDirective;
    return orderByStatement(resolveInfo, { orderBy, order });
  });

  return {
    cypherPart: ` ORDER BY${orderByStatements.join(',')}`,
    optimization
  };
};

export const setPrimaryKeyValue = ({
  args = [],
  statements = [],
  params,
  primaryKey
}) => {
  if (primaryKey) {
    const fieldName = primaryKey.name.value;
    const primaryKeyArgument = args.find(arg => arg.name.value === fieldName);
    if (primaryKeyArgument) {
      const type = primaryKeyArgument.type;
      const unwrappedType = unwrapNamedType({ type });
      const isIDTypePrimaryKey = unwrappedType.name === 'ID';
      if (isIDTypePrimaryKey && params[fieldName] === undefined) {
        statements.push(`${fieldName}: apoc.create.uuid()`);
      }
    }
  }
  return statements;
};

export const getQueryArguments = (resolveInfo, isFederatedOperation) => {
  if (resolveInfo.fieldName === '_entities' || isFederatedOperation) return [];
  return resolveInfo.schema.getQueryType().getFields()[resolveInfo.fieldName]
    .astNode.arguments;
};

export const getMutationArguments = resolveInfo => {
  return resolveInfo.schema.getMutationType().getFields()[resolveInfo.fieldName]
    .astNode.arguments;
};

export const getAdditionalLabels = (schemaType, cypherParams) => {
  const labelDirective = getTypeDirective(
    schemaType.astNode,
    'additionalLabels'
  );
  const { labels: rawLabels } = labelDirective
    ? parseArgs(labelDirective.arguments)
    : { labels: [] };

  const parsedLabels = rawLabels.map(label =>
    _.template(label, { variable: '$cypherParams' })(cypherParams)
  );
  return parsedLabels;
};

export const buildCypherParameters = ({
  args,
  statements = [],
  params,
  paramKey
}) => {
  const dataParams = paramKey ? params[paramKey] : params;
  const paramKeys = dataParams ? Object.keys(dataParams) : [];
  if (args) {
    statements = paramKeys.reduce((paramStatements, paramName) => {
      const param = paramKey ? params[paramKey][paramName] : params[paramName];
      // Get the AST definition for the argument matching this param name
      const fieldAst = args.find(arg => arg.name.value === paramName);
      if (fieldAst) {
        const unwrappedType = unwrapNamedType({ type: fieldAst.type });
        const fieldTypeName = unwrappedType.name;
        if (isNeo4jTypeInput(fieldTypeName)) {
          paramStatements = buildNeo4jTypeCypherParameters({
            paramStatements,
            params,
            param,
            paramKey,
            paramName,
            fieldTypeName
          });
        } else {
          // normal case
          paramStatements.push(
            `${paramName}:$${paramKey ? `${paramKey}.` : ''}${paramName}`
          );
        }
      }
      return paramStatements;
    }, statements);
  }
  return statements;
};

const buildNeo4jTypeCypherParameters = ({
  paramStatements,
  params,
  param,
  paramKey,
  paramName,
  fieldTypeName
}) => {
  const formatted = param.formatted;
  const neo4jTypeConstructor = decideNeo4jTypeConstructor(fieldTypeName);
  if (neo4jTypeConstructor) {
    // Prefer only using formatted, if provided
    if (formatted) {
      if (paramKey) params[paramKey][paramName] = formatted;
      else params[paramName] = formatted;
      paramStatements.push(
        `${paramName}: ${neo4jTypeConstructor}($${
          paramKey ? `${paramKey}.` : ''
        }${paramName})`
      );
    } else {
      let neo4jTypeParam = {};
      if (Array.isArray(param)) {
        const count = param.length;
        let paramIndex = 0;
        for (; paramIndex < count; ++paramIndex) {
          neo4jTypeParam = param[paramIndex];
          if (neo4jTypeParam.formatted) {
            const formatted = neo4jTypeParam.formatted;
            if (paramKey) params[paramKey][paramName][paramIndex] = formatted;
            else params[paramName][paramIndex] = formatted;
          }
        }
        paramStatements.push(
          `${paramName}: [value IN $${
            paramKey ? `${paramKey}.` : ''
          }${paramName} | ${neo4jTypeConstructor}(value)]`
        );
      } else {
        if (paramKey) neo4jTypeParam = params[paramKey][paramName];
        else neo4jTypeParam = params[paramName];
        const formatted = neo4jTypeParam.formatted;
        if (neo4jTypeParam.formatted) {
          if (paramKey) params[paramKey][paramName] = formatted;
          else params[paramName] = formatted;
        }
        paramStatements.push(
          `${paramName}: ${neo4jTypeConstructor}($${
            paramKey ? `${paramKey}.` : ''
          }${paramName})`
        );
      }
    }
  }
  return paramStatements;
};

// TODO refactor to handle Query/Mutation type schema directives
const directiveWithArgs = (directiveName, args) => (schemaType, fieldName) => {
  function fieldDirective(schemaType, fieldName, directiveName) {
    return !isGraphqlScalarType(schemaType) && !isGraphqlUnionType(schemaType)
      ? schemaType.getFields() &&
          schemaType.getFields()[fieldName] &&
          schemaType
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
    field.directives.find(e => e && e.name && e.name.value === directive)
  );
};

export const getQueryCypherDirective = (resolveInfo, isFederatedOperation) => {
  if (resolveInfo.fieldName === '_entities' || isFederatedOperation) return;
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
  let args = selection ? selection.arguments : [];
  let arg = args.find(a => a.name.value === name);
  if (!arg) {
    return null;
  } else {
    return parseArg(arg, variableValues);
  }
}

export const getRelationTypeDirective = relationshipType => {
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
 * @param {String | String[]} a label name or an array of labels
 * @returns {String} an escaped label name suitable for cypher concat
 */
export const safeLabel = l => {
  if (!Array.isArray(l)) {
    l = [l];
  }
  const safeLabels = l.map(label => {
    const asStr = `${label}`;
    const escapeInner = asStr.replace(/\`/g, '\\`');
    return '`' + escapeInner + '`';
  });
  return safeLabels.join(':');
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
  mutationMeta,
  resolveInfo,
  mutationTypeCypherDirective,
  otherParams,
  first,
  offset
}) => {
  return (isCreateMutation(resolveInfo) ||
    isRelationshipUpdateMutation({ resolveInfo, mutationMeta }) ||
    isRelationshipMergeMutation({ resolveInfo, mutationMeta })) &&
    !mutationTypeCypherDirective
    ? { params: otherParams, ...{ first, offset } }
    : { ...otherParams, ...{ first, offset } };
};

export const getOuterSkipLimit = (first, offset) =>
  `${offset > 0 ? ` SKIP toInteger($offset)` : ''}${
    first > -1 ? ' LIMIT toInteger($first)' : ''
  }`;

export const getPayloadSelections = resolveInfo => {
  const filteredFieldNodes = resolveInfo.fieldNodes.filter(n => {
    return n => n.name.value === resolveInfo.fieldName;
  });
  // FIXME: how to handle multiple fieldNode matches
  const payloadTypeNode = filteredFieldNodes[0];
  let selections = [];
  if (payloadTypeNode && payloadTypeNode.selectionSet) {
    selections = payloadTypeNode.selectionSet.selections;
  }
  return selections;
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

export const isNeo4jType = name => isTemporalType(name) || isSpatialType(name);

export const isNeo4jTypeInput = name =>
  isTemporalInputType(name) ||
  isSpatialInputType(name) ||
  isSpatialDistanceInputType(name);

export const isTemporalType = name => {
  return (
    name === '_Neo4jTime' ||
    name === '_Neo4jDate' ||
    name === '_Neo4jDateTime' ||
    name === '_Neo4jLocalTime' ||
    name === '_Neo4jLocalDateTime'
  );
};

export const isTemporalField = (schemaType, name) => {
  const type = schemaType ? schemaType.name : '';
  return (
    isTemporalType(type) &&
    (name === 'year' ||
      name === 'month' ||
      name === 'day' ||
      name === 'hour' ||
      name === 'minute' ||
      name === 'second' ||
      name === 'microsecond' ||
      name === 'millisecond' ||
      name === 'nanosecond' ||
      name === 'timezone' ||
      name === 'formatted')
  );
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

export const isSpatialType = name => name === '_Neo4jPoint';

export const isSpatialField = (schemaType, name) => {
  const type = schemaType ? schemaType.name : '';
  return (
    isSpatialType(type) &&
    (name === 'x' ||
      name === 'y' ||
      name === 'z' ||
      name === 'longitude' ||
      name === 'latitude' ||
      name === 'height' ||
      name === 'crs' ||
      name === 'srid' ||
      name === 'formatted')
  );
};

export const isSpatialInputType = name => name === '_Neo4jPointInput';

export const isSpatialDistanceInputType = ({ filterOperationType = '' }) => {
  switch (filterOperationType) {
    case 'distance':
    case 'distance_lt':
    case 'distance_lte':
    case 'distance_gt':
    case 'distance_gte':
      return true;
    default:
      return false;
  }
};

export const decideNeo4jTypeConstructor = typeName => {
  switch (typeName) {
    case '_Neo4jTimeInput':
      return 'time';
    case '_Neo4jDateInput':
      return 'date';
    case '_Neo4jDateTimeInput':
      return 'datetime';
    case '_Neo4jLocalTimeInput':
      return 'localtime';
    case '_Neo4jLocalDateTimeInput':
      return 'localdatetime';
    case '_Neo4jPointInput':
      return 'point';
    default:
      return '';
  }
};

export const neo4jTypePredicateClauses = (
  filters,
  variableName,
  fieldArguments,
  parentParam
) => {
  return fieldArguments.reduce((acc, fieldArgument) => {
    if (!isListTypeField({ field: fieldArgument })) {
      // For every temporal argument
      const argName = fieldArgument.name.value;
      let argValue = filters[argName];
      if (argValue) {
        const type = fieldArgument.type;
        const unwrappedType = unwrapNamedType({ type });
        const typeName = unwrappedType.name;
        // If a parameter value has been provided for it check whether
        // the provided param value is in an indexed object for a nested argument
        const paramIndex = argValue.index;
        const paramValue = argValue.value;
        // If it is, set and use its .value
        if (paramValue) argValue = paramValue;
        const parentParamPath = parentParam ? `${parentParam}.` : '';
        const paramPath = `${parentParamPath}${
          paramIndex >= 1 ? `${paramIndex}_` : ''
        }${argName}`;
        const propertyPath = `${variableName}.${argName}`;
        const cypherTypeConstructor = decideNeo4jTypeConstructor(typeName);
        const isTemporalFormattedField = argValue[Neo4jTypeFormatted.FORMATTED];
        if (isTemporalFormattedField) {
          // Only the dedicated 'formatted' arg is used if it is provided
          acc.push(
            `${propertyPath} = ${cypherTypeConstructor}($${paramPath}.${Neo4jTypeFormatted.FORMATTED})`
          );
        } else {
          Object.keys(argValue).forEach(paramName => {
            acc.push(
              `${propertyPath}.${paramName} = $${paramPath}.${paramName}`
            );
          });
        }
      }
    }
    return acc;
  }, []);
};

export const getNeo4jTypeArguments = args => {
  return args
    ? args.reduce((acc, t) => {
        if (!t) {
          return acc;
        }
        const fieldType = unwrapNamedType({ type: t.type }).name;
        if (isNeo4jTypeInput(fieldType)) acc.push(t);
        return acc;
      }, [])
    : [];
};

// TODO rename and add logic for @skip and @include directives?
export const removeIgnoredFields = (schemaType, selections) => {
  if (!isGraphqlScalarType(schemaType) && selections && selections.length) {
    const schemaTypeFields = schemaType.getFields();
    let schemaTypeField = '';
    selections = selections.filter(field => {
      const fieldKind = field.kind;
      if (fieldKind === Kind.FIELD) {
        const fieldName = field.name.value;
        // so check if this field is ignored
        schemaTypeField = schemaTypeFields[fieldName];
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

export const getInterfaceDerivedTypeNames = (schema, interfaceName) => {
  const implementingTypeMap = schema._implementations
    ? schema._implementations[interfaceName]
    : {};
  let implementingTypes = [];
  if (implementingTypeMap) {
    implementingTypes = Object.values(implementingTypeMap).map(
      type => type.name
    );
  }
  return implementingTypes.sort();
};
