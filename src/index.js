const _ = require('lodash');

export function neo4jgraphql(object, params, context, resolveInfo) {

  // get AST
  // convert query AST to cypher
  // execute query
  // batching??
  // return data

  // retrieve result type from schema -> determine List/Single non-null (resolveInfo.returnType)
  // If @cypher directive ignore

  const returnTypeEnum = {
    OBJECT: 0,
    ARRAY: 1
  };

  let type = resolveInfo.fieldName,
    variable = type.charAt(0).toLowerCase() + type.slice(1);


  let query = cypherQuery(params, context, resolveInfo);


  console.log(query);

  let returnType = resolveInfo.returnType.toString().startsWith("[") ? returnTypeEnum.ARRAY : returnTypeEnum.OBJECT;

  let session = context.driver.session();
  let data = session.run(query, params)
    .then( result => {

      if (returnType === returnTypeEnum.ARRAY) {
        return result.records.map(record => { return record.get(variable)})
      } else if (returnType === returnTypeEnum.OBJECT) {
        return result.records[0].get(variable);
      }


    });


  return data;

};

export function cypherQuery(params, context, resolveInfo) {
  let pageParams = {
    "first": params['first'] === undefined ? -1 : params['first'],
    "offset": params['offset'] || 0
  };

  delete params['first'];
  delete params['offset'];



  let type = innerType(resolveInfo.returnType).toString(),
    variable = type.charAt(0).toLowerCase() + type.slice(1),
    schemaType = resolveInfo.schema.getType(type);


  let filteredFieldNodes = _.filter(resolveInfo.fieldNodes, function(o) {
    if (o.name.value === resolveInfo.fieldName) {
      return true;
    }
  });

  // FIXME: how to handle multiple fieldNode matches
  let selections = filteredFieldNodes[0].selectionSet.selections;
  let argString = JSON.stringify(params).replace(/\"([^(\")"]+)\":/g,"$1:"); // FIXME: support IN for multiple values -> WHERE
  let query = `MATCH (${variable}:${type} ${argString}) `;

  query = query +  `RETURN ${variable} {` + buildCypherSelection(``, selections, variable, schemaType, resolveInfo);// ${variable} { ${selection} } as ${variable}`;

  query = query + `} AS ${variable}`;

  query = query + ` SKIP ${pageParams.offset}${pageParams.first > -1 ? " LIMIT "+pageParams.first: ""}`;

  return query;

}


function buildCypherSelection(initial, selections, variable, schemaType, resolveInfo) { //FIXME: resolveInfo not needed

  if (selections.length === 0) {
    return initial;
  }

  const [headSelection, ...tailSelections] = selections;

  let fieldName = headSelection.name.value,
      fieldType = schemaType.getFields()[fieldName].type;

  let inner = innerType(fieldType) ; // for target "type" aka label

  let fieldHasCypherDirective = schemaType.getFields()[fieldName].astNode.directives.filter((e) => {return e.name.value === 'cypher'}).length > 0;

  if (fieldHasCypherDirective) {

    let fieldIsScalar = fieldType.constructor.name === "GraphQLScalarType"; // FIXME: DRY
    let statement = schemaType.getFields()[fieldName].astNode.directives.find((e) => {
      return e.name.value === 'cypher'
    }).arguments.find((e) => {
      return e.name.value === 'statement'
    }).value.value;

    if (fieldIsScalar) {

      return buildCypherSelection(initial + `${fieldName}: apoc.cypher.runFirstColumn("${statement}", {this: ${variable}}, false)${tailSelections.length > 0 ? ',' : ''}`, tailSelections, variable, schemaType, resolveInfo);
    } else {
      // similar: [ x IN apoc.cypher.runFirstColumn("WITH {this} AS this MATCH (this)--(:Genre)--(o:Movie) RETURN o", {this: movie}, true) |x {.title}][1..2])

      let nestedVariable = variable + '_' + fieldName;
      let skipLimit = computeSkipLimit(headSelection);
      let fieldIsList = !!fieldType.ofType;

      return buildCypherSelection(initial + `${fieldName}: ${fieldIsList ? "" : "head("}[ x IN apoc.cypher.runFirstColumn("${statement}", {this: ${variable}}, true) | x {${buildCypherSelection(``, headSelection.selectionSet.selections, nestedVariable, inner, resolveInfo)}}]${fieldIsList? "": ")"}${skipLimit} ${tailSelections.length > 0 ? ',' : ''}`, tailSelections, variable, schemaType, resolveInfo);
    }

  } else if (fieldType.constructor.name === "GraphQLScalarType") {
    return buildCypherSelection(initial + ` .${fieldName} ${tailSelections.length > 0 ? ',' : ''}`, tailSelections, variable, schemaType, resolveInfo);
  } else {
    // field is an object
    let nestedVariable = variable + '_' + fieldName,
      skipLimit = computeSkipLimit(headSelection),
      relationDirective = schemaType.getFields()[fieldName].astNode.directives.find((e) => { return e.name.value === 'relation' });

    if (!relationDirective) {
      return buildCypherSelection(
        initial + ` .${fieldName}${skipLimit}${tailSelections.length > 0 ? ',' : ''} `,
        tailSelections,
        variable,
        schemaType,
        resolveInfo);
    }

    let relType = relationDirective.arguments.find(e => { return e.name.value === 'name' }).value.value,
      relDirection = relationDirective.arguments.find(e => { return e.name.value === 'direction' }).value.value;

    return buildCypherSelection(
      initial + `${fieldName}: [(${variable})${relDirection === 'in' || relDirection === 'IN' ? '<' : ''}-[${relType}]-${relDirection === 'out' || relDirection === 'OUT' ? '>' : ''}(${nestedVariable}:${inner.name}) | ${nestedVariable} {${buildCypherSelection(``, headSelection.selectionSet.selections, nestedVariable, inner, resolveInfo)}}]${skipLimit} ${tailSelections.length > 0 ? ',' : ''}`,
      tailSelections,
      variable,
      schemaType,
      resolveInfo);
  }


}

function innerType (type) {
  return (type.ofType) ? innerType(type.ofType) : type;
}

function argumentValue(selection, name) {
  let arg = selection.arguments.find( (a) =>  a.name.value  === name)
  return arg === undefined ?  null : arg.value.value
}
function computeSkipLimit(selection) {
  let first=argumentValue(selection,"first");
  let offset=argumentValue(selection,"offset");

  if (first === null && offset === null ) return "";
  if (offset === null) return `[..${first}]`;
  if (first === null) return `[${offset}..]`;
  return `[${offset}..${parseInt(offset)+parseInt(first)}]`
}