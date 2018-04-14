import filter from 'lodash/filter';
import { cypherDirectiveArgs } from './utils';

export async function neo4jgraphql(
  object,
  params,
  context,
  resolveInfo,
  debug = false
) {
  const query = cypherQuery(params, context, resolveInfo);

  if (debug) {
    console.log(query);
  }

  const session = context.driver.session();
  const result = await session.run(query, params);
  return extractQueryResult(result, resolveInfo.returnType);
}

export function cypherQuery(
  { first = -1, offset = 0, _id, ...otherParams },
  context,
  resolveInfo
) {
  const { typeName, variableName } = typeIdentifiers(resolveInfo.returnType);
  const schemaType = resolveInfo.schema.getType(typeName);

  const filteredFieldNodes = filter(
    resolveInfo.fieldNodes,
    n => n.name.value === resolveInfo.fieldName
  );

  // FIXME: how to handle multiple fieldNode matches
  const selections = filteredFieldNodes[0].selectionSet.selections;

  // FIXME: support IN for multiple values -> WHERE
  const argString = JSON.stringify(otherParams).replace(
    /\"([^(\")"]+)\":/g,
    '$1:'
  );

  const idWherePredicate =
    typeof _id !== 'undefined' ? `WHERE ID(${variableName})=${_id} ` : '';
  const outerSkipLimit = `SKIP ${offset}${first > -1 ? ' LIMIT ' + first : ''}`;

  let query;
  const queryTypeCypherDirective = resolveInfo.schema.getQueryType().getFields()[resolveInfo.fieldName].astNode.directives.filter( x => {
    return x.name.value === "cypher";
  })[0];

  if (queryTypeCypherDirective) {
    // QueryType with a @cypher directive
    const cypherQueryArg = queryTypeCypherDirective.arguments.filter( x=> {
      return x.name.value === "statement";
    })[0];

    query = `WITH apoc.cypher.runFirstColumn("${cypherQueryArg.value.value}", ${argString}, True) AS x UNWIND x AS ${variableName}
    RETURN ${variableName} {${buildCypherSelection({
      initial: '',
      selections,
      variableName,
      schemaType,
      resolveInfo
    })}} AS ${variableName} ${outerSkipLimit}`;
  } else {
    // No @cypher directive on QueryType
    query = `MATCH (${variableName}:${typeName} ${argString}) ${idWherePredicate}` +
      // ${variableName} { ${selection} } as ${variableName}`;
      `RETURN ${variableName} {${buildCypherSelection({
        initial: '',
        selections,
        variableName,
        schemaType,
        resolveInfo
      })}} AS ${variableName} ${outerSkipLimit}`;
  }

  return query;
}

function buildCypherSelection({
  initial,
  selections,
  variableName,
  schemaType,
  resolveInfo
}) {
  if (!selections.length) {
    return initial;
  }

  const [headSelection, ...tailSelections] = selections;

  const tailParams = {
    selections: tailSelections,
    variableName,
    schemaType,
    resolveInfo
  };

  const fieldName = headSelection.name.value;

  if (!schemaType.getFields()[fieldName]) {
    // meta field type
    return buildCypherSelection({
      initial: tailSelections.length
        ? initial
        : initial.substring(0, initial.lastIndexOf(',')),
      ...tailParams
    });
  }

  const commaIfTail = tailSelections.length > 0 ? ',' : '';

  const fieldType = schemaType.getFields()[fieldName].type;
  const innerSchemaType = innerType(fieldType); // for target "type" aka label

  const { statement: customCypher } = cypherDirective(schemaType, fieldName);

  if (isGraphqlScalarType(innerSchemaType)) {
    if (customCypher) {
      return buildCypherSelection({
        initial: `${initial}${fieldName}: apoc.cypher.runFirstColumn("${customCypher}", ${cypherDirectiveArgs(
          variableName,
          headSelection,
          schemaType,
          resolveInfo
        )}, false)${commaIfTail}`,
        ...tailParams
      });
    }

    // graphql scalar type, no custom cypher statement
    return buildCypherSelection({
      initial: `${initial} .${fieldName} ${commaIfTail}`,
      ...tailParams
    });
  }

  // We have a graphql object type

  const nestedVariable = variableName + '_' + fieldName;
  const skipLimit = computeSkipLimit(headSelection, resolveInfo.variableValues);

  const nestedParams = {
    initial: '',
    selections: headSelection.selectionSet.selections,
    variableName: nestedVariable,
    schemaType: innerSchemaType,
    resolveInfo
  };

  if (customCypher) {
    // similar: [ x IN apoc.cypher.runFirstColumn("WITH {this} AS this MATCH (this)--(:Genre)--(o:Movie) RETURN o", {this: movie}, true) |x {.title}][1..2])
    const fieldIsList = !!fieldType.ofType;

    return buildCypherSelection({
      initial: `${initial}${fieldName}: ${
        fieldIsList ? '' : 'head('
      }[ ${nestedVariable} IN apoc.cypher.runFirstColumn("${customCypher}", ${cypherDirectiveArgs(
        variableName,
        headSelection,
        schemaType,
        resolveInfo
      )}, true) | ${nestedVariable} {${buildCypherSelection({
        ...nestedParams
      })}}]${fieldIsList ? '' : ')'}${skipLimit} ${commaIfTail}`,
      ...tailParams
    });
  }

  // graphql object type, no custom cypher

  const { name: relType, direction: relDirection } = relationDirective(
    schemaType,
    fieldName
  );

  const queryParams = innerFilterParams(selections);

  return buildCypherSelection({
    initial: `${initial}${fieldName}: ${
      !isArrayType(fieldType) ? 'head(' : ''
    }[(${variableName})${
      relDirection === 'in' || relDirection === 'IN' ? '<' : ''
    }-[:${relType}]-${
      relDirection === 'out' || relDirection === 'OUT' ? '>' : ''
    }(${nestedVariable}:${
      innerSchemaType.name
    }${queryParams}) | ${nestedVariable} {${buildCypherSelection({
      ...nestedParams
    })}}]${!isArrayType(fieldType) ? ')' : ''}${skipLimit} ${commaIfTail}`,
    ...tailParams
  });
}

function typeIdentifiers(returnType) {
  const typeName = innerType(returnType).toString();
  return {
    variableName: lowFirstLetter(typeName),
    typeName
  };
}

function isGraphqlScalarType(type) {
  return type.constructor.name === 'GraphQLScalarType';
}

function isArrayType(type) {
  return type.toString().startsWith('[');
}

function lowFirstLetter(word) {
  return word.charAt(0).toLowerCase() + word.slice(1);
}

function innerType(type) {
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

const cypherDirective = directiveWithArgs('cypher', ['statement']);
const relationDirective = directiveWithArgs('relation', ['name', 'direction']);

function innerFilterParams(selections) {
  let queryParams = '';

  if (
    selections &&
    selections.length &&
    selections[0].arguments &&
    selections[0].arguments.length
  ) {
    const filters = selections[0].arguments
      .filter(x => {
        return x.name.value !== 'first' && x.name.value !== 'offset';
      })
      .map(x => {
        const filterValue = JSON.stringify(x.value.value).replace(
          /\"([^(\")"]+)\":/g,
          '$1:'
        ); // FIXME: support IN for multiple values -> WHERE
        return `${x.name.value}: ${filterValue}`;
      });

    queryParams = `{${filters.join(',')}}`;
  }
  return queryParams;
}

function argumentValue(selection, name, variableValues) {
  let arg = selection.arguments.find(a => a.name.value === name);
  if (!arg) {
    return null;
  } else if (!arg.value.value && name in variableValues && arg.value.kind === "Variable") {
    return variableValues[name];
  }  else {
    return arg.value.value;
  }
}

function extractQueryResult({ records }, returnType) {
  const { variableName } = typeIdentifiers(returnType);

  return isArrayType(returnType)
    ? records.map(record => record.get(variableName))
    : records.length ? records[0].get(variableName) : null;
}

function computeSkipLimit(selection, variableValues) {
  let first = argumentValue(selection, 'first', variableValues);
  let offset = argumentValue(selection, 'offset', variableValues);

  if (first === null && offset === null) return '';
  if (offset === null) return `[..${first}]`;
  if (first === null) return `[${offset}..]`;
  return `[${offset}..${parseInt(offset) + parseInt(first)}]`;
}

function getSchemaDirective(fieldNode, directiveName, schema) {
  
}