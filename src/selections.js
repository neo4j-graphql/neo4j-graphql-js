import {
  computeSkipLimit,
  cypherDirective,
  cypherDirectiveArgs,
  filtersFromSelections,
  innerFilterParams,
  getFilterParams,
  innerType,
  isArrayType,
  isGraphqlScalarType,
  extractSelections,
  relationDirective,
  getRelationTypeDirectiveArgs
} from './utils';

export function buildCypherSelection({
  initial,
  selections,
  variableName,
  schemaType,
  resolveInfo,
  paramIndex = 1,
  rootNodes
}) {
  if (!selections.length) {
    return [initial, {}];
  }

  const filterParams = getFilterParams(
    filtersFromSelections(selections, resolveInfo.variableValues),
    paramIndex
  );
  const shallowFilterParams = Object.entries(filterParams).reduce(
    (result, [key, value]) => {
      result[`${value.index}_${key}`] = value.value;
      return result;
    },
    {}
  );

  const [headSelection, ...tailSelections] = selections;

  let tailParams = {
    selections: tailSelections,
    variableName,
    schemaType,
    resolveInfo
  };

  const recurse = args => {
    paramIndex =
      Object.keys(shallowFilterParams).length > 0 ? paramIndex + 1 : paramIndex;
    const [subSelection, subFilterParams] = buildCypherSelection({
      ...args,
      ...{ paramIndex }
    });
    return [subSelection, { ...shallowFilterParams, ...subFilterParams }];
  };

  let fieldName;
  let isInlineFragment = false;
  let interfaceLabel;

  if (headSelection.kind === 'InlineFragment') {
    // get selections for the fragment and recurse on those
    const fragmentSelections = headSelection.selectionSet.selections;

    let fragmentTailParams = {
      selections: fragmentSelections,
      variableName,
      schemaType,
      resolveInfo
    };
    return recurse({
      initial: fragmentSelections.length
        ? initial
        : initial.substring(0, initial.lastIndexOf(',')),
      ...fragmentTailParams
    });
  } else {
    fieldName = headSelection.name.value;
  }

  const commaIfTail = tailSelections.length > 0 ? ',' : '';

  // Schema meta fields(__schema, __typename, etc)
  if (!schemaType.getFields()[fieldName]) {
    return recurse({
      initial: tailSelections.length
        ? initial
        : initial.substring(0, initial.lastIndexOf(',')),
      ...tailParams
    });
  }

  const fieldType = schemaType.getFields()[fieldName].type;
  const innerSchemaType = innerType(fieldType); // for target "type" aka label

  if (
    innerSchemaType &&
    innerSchemaType.astNode &&
    innerSchemaType.astNode.kind === 'InterfaceTypeDefinition'
  ) {
    isInlineFragment = true;
    interfaceType = schemaType;
    const interfaceName = innerSchemaType.name;

    const fragments = headSelection.selectionSet.selections.filter(
      item => item.kind === 'InlineFragment'
    );

    // FIXME: this will only handle the first inline fragment
    const fragment = fragments[0];

    interfaceLabel = fragment.typeCondition.name.value;
    const implementationName = fragment.typeCondition.name.value;

    const schemaType = resolveInfo.schema._implementations[interfaceName].find(
      intfc => intfc.name === implementationName
    );
  }

  const { statement: customCypher } = cypherDirective(schemaType, fieldName);

  const typeMap = resolveInfo.schema.getTypeMap();
  const schemaTypeAstNode = typeMap[schemaType].astNode;

  // Database meta fields(_id)
  if (fieldName === '_id') {
    return recurse({
      initial: `${initial}${fieldName}: ID(${variableName})${commaIfTail}`,
      ...tailParams
    });
  }

  // Main control flow
  if (isGraphqlScalarType(innerSchemaType)) {
    if (customCypher) {
      if (getRelationTypeDirectiveArgs(schemaTypeAstNode)) {
        variableName = `${variableName}_relation`;
      }
      return recurse({
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
    return recurse({
      initial: `${initial} .${fieldName} ${commaIfTail}`,
      ...tailParams
    });
  }

  // We have a graphql object type
  const nestedVariable = variableName + '_' + fieldName;
  const skipLimit = computeSkipLimit(headSelection, resolveInfo.variableValues);

  const subSelections = extractSelections(
    headSelection.selectionSet.selections,
    resolveInfo.fragments
  );

  const subSelection = recurse({
    initial: '',
    selections: subSelections,
    variableName: nestedVariable,
    schemaType: innerSchemaType,
    resolveInfo
  });

  let selection;

  // Object type field with cypher directive
  if (customCypher) {
    if (getRelationTypeDirectiveArgs(schemaTypeAstNode)) {
      variableName = `${variableName}_relation`;
    }
    // similar: [ x IN apoc.cypher.runFirstColumn("WITH {this} AS this MATCH (this)--(:Genre)--(o:Movie) RETURN o", {this: movie}, true) |x {.title}][1..2])
    const fieldIsList = !!fieldType.ofType;
    selection = recurse({
      initial: `${initial}${fieldName}: ${
        fieldIsList ? '' : 'head('
      }[ ${nestedVariable} IN apoc.cypher.runFirstColumn("${customCypher}", ${cypherDirectiveArgs(
        variableName,
        headSelection,
        schemaType,
        resolveInfo
      )}, true) | ${nestedVariable} {${subSelection[0]}}]${
        fieldIsList ? '' : ')'
      }${skipLimit} ${commaIfTail}`,
      ...tailParams
    });
  } else {
    // graphql object type, no custom cypher
    const queryParams = innerFilterParams(filterParams);
    const relationDirectiveData = getRelationTypeDirectiveArgs(
      schemaTypeAstNode
    );
    if (relationDirectiveData) {
      const fromTypeName = relationDirectiveData.from;
      const toTypeName = relationDirectiveData.to;
      const isFromField = fieldName === fromTypeName || fieldName === 'from';
      const isToField = fieldName === toTypeName || fieldName === 'to';
      if (isFromField || isToField) {
        if (rootNodes && (fieldName === 'from' || fieldName === 'to')) {
          // Branch currenlty needed to be explicit about handling the .to and .from
          // keys involved with the relation removal mutation, using rootNodes
          selection = recurse({
            initial: `${initial}${fieldName}: ${
              !isArrayType(fieldType) ? 'head(' : ''
            }[${
              isFromField ? `${rootNodes.from}_from` : `${rootNodes.to}_to`
            } {${subSelection[0]}}]${
              !isArrayType(fieldType) ? ')' : ''
            }${skipLimit} ${commaIfTail}`,
            ...tailParams,
            rootNodes,
            variableName: isFromField ? rootNodes.to : rootNodes.from
          });
        } else {
          selection = recurse({
            initial: `${initial}${fieldName}: ${
              !isArrayType(fieldType) ? 'head(' : ''
            }[(:${
              fieldName === fromTypeName || fieldName === 'from'
                ? toTypeName
                : fromTypeName
            })${
              fieldName === fromTypeName || fieldName === 'from' ? '<' : ''
            }-[${variableName}_relation]-${
              fieldName === toTypeName || fieldName === 'to' ? '>' : ''
            }(${nestedVariable}:${
              isInlineFragment ? interfaceLabel : innerSchemaType.name
            }${queryParams}) | ${nestedVariable} {${
              isInlineFragment
                ? 'FRAGMENT_TYPE: "' + interfaceLabel + '",' + subSelection[0]
                : subSelection[0]
            }}]${
              !isArrayType(fieldType) ? ')' : ''
            }${skipLimit} ${commaIfTail}`,
            ...tailParams
          });
        }
      }
    } else {
      let { name: relType, direction: relDirection } = relationDirective(
        schemaType,
        fieldName
      );
      if (relType && relDirection) {
        selection = recurse({
          initial: `${initial}${fieldName}: ${
            !isArrayType(fieldType) ? 'head(' : ''
          }[(${variableName})${
            relDirection === 'in' || relDirection === 'IN' ? '<' : ''
          }-[:${relType}]-${
            relDirection === 'out' || relDirection === 'OUT' ? '>' : ''
          }(${nestedVariable}:${
            isInlineFragment ? interfaceLabel : innerSchemaType.name
          }${queryParams}) | ${nestedVariable} {${
            isInlineFragment
              ? 'FRAGMENT_TYPE: "' + interfaceLabel + '",' + subSelection[0]
              : subSelection[0]
          }}]${!isArrayType(fieldType) ? ')' : ''}${skipLimit} ${commaIfTail}`,
          ...tailParams
        });
      } else {
        const innerSchemaTypeAstNode = typeMap[innerSchemaType].astNode;
        const relationDirectiveData = getRelationTypeDirectiveArgs(
          innerSchemaTypeAstNode
        );
        if (relationDirectiveData) {
          const relType = relationDirectiveData.name;
          const fromTypeName = relationDirectiveData.from;
          const toTypeName = relationDirectiveData.to;
          const nestedRelationshipVariable = `${nestedVariable}_relation`;
          const schemaTypeName = schemaType.name;
          if (fromTypeName !== toTypeName) {
            selection = recurse({
              initial: `${initial}${fieldName}: ${
                !isArrayType(fieldType) ? 'head(' : ''
              }[(${variableName})${
                schemaTypeName === toTypeName ? '<' : ''
              }-[${nestedRelationshipVariable}:${relType}${queryParams}]-${
                schemaTypeName === fromTypeName ? '>' : ''
              }(:${
                schemaTypeName === fromTypeName ? toTypeName : fromTypeName
              }) | ${nestedRelationshipVariable} {${subSelection[0]}}]${
                !isArrayType(fieldType) ? ')' : ''
              }${skipLimit} ${commaIfTail}`,
              ...tailParams
            });
          } else {
            // Type symmetry limitation, Person FRIEND_OF Person, assume OUT for now
            selection = recurse({
              initial: `${initial}${fieldName}: ${
                !isArrayType(fieldType) ? 'head(' : ''
              }[(${variableName})-[${nestedRelationshipVariable}:${relType}${queryParams}]->(:${
                schemaTypeName === fromTypeName ? toTypeName : fromTypeName
              }) | ${nestedRelationshipVariable} {${subSelection[0]}}]${
                !isArrayType(fieldType) ? ')' : ''
              }${skipLimit} ${commaIfTail}`,
              ...tailParams
            });
          }
        }
      }
    }
  }
  return [selection[0], { ...selection[1], ...subSelection[1] }];
}
