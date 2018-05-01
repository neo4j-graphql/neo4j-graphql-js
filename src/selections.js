import {
  computeSkipLimit,
  cypherDirective,
  cypherDirectiveArgs,
  innerFilterParams,
  innerType,
  isArrayType,
  isGraphqlScalarType,
  relationDirective
} from './utils';

export function buildCypherSelection({
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
  const commaIfTail = tailSelections.length > 0 ? ',' : '';

  // Schema meta fields(__schema, __typename, etc)
  if (!schemaType.getFields()[fieldName]) {
    return buildCypherSelection({
      initial: tailSelections.length
        ? initial
        : initial.substring(0, initial.lastIndexOf(',')),
      ...tailParams
    });
  }

  const fieldType = schemaType.getFields()[fieldName].type;
  const innerSchemaType = innerType(fieldType); // for target "type" aka label
  const { statement: customCypher } = cypherDirective(schemaType, fieldName);

  // Database meta fields(_id)
  if (fieldName === '_id') {
    return buildCypherSelection({
      initial: `${initial}${fieldName}: ID(${variableName})${commaIfTail}`,
      ...tailParams
    });
  }

  // Main control flow
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
