const {
  isArrayType,
  cypherDirectiveArgs,
  safeLabel,
  safeVar,
  innerFilterParams,
  paramsToString,
  isNodeType,
  getRelationTypeDirectiveArgs,
  isRelationTypeDirectedField,
  isRelationTypePayload,
  isRootSelection,
  temporalPredicateClauses,
  isTemporalType
} = require('./utils');
const _ = require('lodash');

var customCypherField = ({
  customCypher,
  cypherParams,
  paramIndex,
  schemaTypeRelation,
  initial,
  fieldName,
  fieldType,
  nestedVariable,
  variableName,
  headSelection,
  schemaType,
  resolveInfo,
  subSelection,
  skipLimit,
  commaIfTail,
  tailParams
}) => {
  if (schemaTypeRelation) {
    variableName = `${variableName}_relation`;
  }
  const fieldIsList = !!fieldType.ofType;
  // similar: [ x IN apoc.cypher.runFirstColumn("WITH {this} AS this MATCH (this)--(:Genre)--(o:Movie) RETURN o", {this: movie}, true) |x {.title}][1..2])

  // For @cypher fields with object payload types, customCypherField is
  // called after the recursive call to compute a subSelection. But recurse()
  // increments paramIndex. So here we need to decrement it in order to map
  // appropriately to the indexed keys produced in getFilterParams()
  const cypherFieldParamsIndex = paramIndex - 1;
  return {
    initial: `${initial}${fieldName}: ${
      fieldIsList ? '' : 'head('
    }[ ${nestedVariable} IN apoc.cypher.runFirstColumn("${customCypher}", {${cypherDirectiveArgs(
      variableName,
      headSelection,
      cypherParams,
      schemaType,
      resolveInfo,
      cypherFieldParamsIndex
    )}}, true) | ${nestedVariable} {${subSelection[0]}}]${
      fieldIsList ? '' : ')'
    }${skipLimit} ${commaIfTail}`,
    ...tailParams
  };
};

var relationFieldOnNodeType = ({
  initial,
  fieldName,
  fieldType,
  variableName,
  relDirection,
  relType,
  nestedVariable,
  isInlineFragment,
  interfaceLabel,
  innerSchemaType,
  filterParams,
  temporalArgs,
  selections,
  schemaType,
  subSelection,
  skipLimit,
  commaIfTail,
  tailParams,
  temporalClauses
}) => {
  const arrayFilterParams = _.pickBy(
    filterParams,
    (param, keyName) => Array.isArray(param.value) && !('orderBy' === keyName)
  );
  const allParams = innerFilterParams(filterParams, temporalArgs);
  const queryParams = paramsToString(
    _.filter(allParams, param => !Array.isArray(param.value))
  );
  const safeVariableName = safeVar(nestedVariable);
  const arrayPredicates = _.map(arrayFilterParams, (value, key) => {
    const param = _.find(allParams, param => param.key === key);
    return `${safeVariableName}.${safeVar(key)} IN $${
      param.value.index
    }_${key}`;
  });
  const whereClauses = [...temporalClauses, ...arrayPredicates];
  const orderByParam = filterParams['orderBy'];
  const temporalOrdering = temporalOrderingFieldExists(
    schemaType,
    filterParams
  );
  return {
    initial: `${initial}${fieldName}: ${
      !isArrayType(fieldType) ? 'head(' : ''
    }${
      orderByParam
        ? temporalOrdering
          ? `[sortedElement IN apoc.coll.sortMulti(`
          : `apoc.coll.sortMulti(`
        : ''
    }[(${safeVar(variableName)})${
      relDirection === 'in' || relDirection === 'IN' ? '<' : ''
    }-[:${safeLabel(relType)}]-${
      relDirection === 'out' || relDirection === 'OUT' ? '>' : ''
    }(${safeVariableName}:${safeLabel(
      isInlineFragment ? interfaceLabel : innerSchemaType.name
    )}${queryParams})${
      whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : ''
    } | ${nestedVariable} {${
      isInlineFragment
        ? 'FRAGMENT_TYPE: "' + interfaceLabel + '",' + subSelection[0]
        : subSelection[0]
    }}]${
      orderByParam
        ? `, [${buildSortMultiArgs(orderByParam)}])${
            temporalOrdering
              ? ` | sortedElement { .*,  ${temporalTypeSelections(
                  selections,
                  innerSchemaType
                )}}]`
              : ``
          }`
        : ''
    }${!isArrayType(fieldType) ? ')' : ''}${skipLimit} ${commaIfTail}`,
    ...tailParams
  };
};

var relationTypeFieldOnNodeType = ({
  innerSchemaTypeRelation,
  initial,
  fieldName,
  subSelection,
  skipLimit,
  commaIfTail,
  tailParams,
  fieldType,
  variableName,
  schemaType,
  nestedVariable,
  queryParams,
  filterParams,
  temporalArgs
}) => {
  if (innerSchemaTypeRelation.from === innerSchemaTypeRelation.to) {
    return {
      initial: `${initial}${fieldName}: {${
        subSelection[0]
      }}${skipLimit} ${commaIfTail}`,
      ...tailParams
    };
  }
  const relationshipVariableName = `${nestedVariable}_relation`;
  const temporalClauses = temporalPredicateClauses(
    filterParams,
    relationshipVariableName,
    temporalArgs
  );
  return {
    initial: `${initial}${fieldName}: ${
      !isArrayType(fieldType) ? 'head(' : ''
    }[(${safeVar(variableName)})${
      schemaType.name === innerSchemaTypeRelation.to ? '<' : ''
    }-[${safeVar(relationshipVariableName)}:${safeLabel(
      innerSchemaTypeRelation.name
    )}${queryParams}]-${
      schemaType.name === innerSchemaTypeRelation.from ? '>' : ''
    }(:${safeLabel(
      schemaType.name === innerSchemaTypeRelation.from
        ? innerSchemaTypeRelation.to
        : innerSchemaTypeRelation.from
    )}) ${
      temporalClauses.length > 0
        ? `WHERE ${temporalClauses.join(' AND ')} `
        : ''
    }| ${relationshipVariableName} {${subSelection[0]}}]${
      !isArrayType(fieldType) ? ')' : ''
    }${skipLimit} ${commaIfTail}`,
    ...tailParams
  };
};

var nodeTypeFieldOnRelationType = ({
  fieldInfo,
  schemaTypeRelation,
  innerSchemaType,
  isInlineFragment,
  interfaceLabel,
  paramIndex,
  schemaType,
  filterParams,
  temporalArgs,
  parentSelectionInfo
}) => {
  if (
    isRootSelection({
      selectionInfo: parentSelectionInfo,
      rootType: 'relationship'
    }) &&
    isRelationTypeDirectedField(fieldInfo.fieldName)
  ) {
    return relationTypeMutationPayloadField({
      ...fieldInfo,
      parentSelectionInfo
    });
  }
  // Normal case of schemaType with a relationship directive
  return directedNodeTypeFieldOnRelationType({
    ...fieldInfo,
    schemaTypeRelation,
    innerSchemaType,
    isInlineFragment,
    interfaceLabel,
    paramIndex,
    schemaType,
    filterParams,
    temporalArgs
  });
};

const relationTypeMutationPayloadField = ({
  initial,
  fieldName,
  variableName,
  subSelection,
  skipLimit,
  commaIfTail,
  tailParams,
  parentSelectionInfo
}) => {
  const safeVariableName = safeVar(variableName);
  return {
    initial: `${initial}${fieldName}: ${safeVariableName} {${
      subSelection[0]
    }}${skipLimit} ${commaIfTail}`,
    ...tailParams,
    variableName:
      fieldName === 'from' ? parentSelectionInfo.to : parentSelectionInfo.from
  };
};

const directedNodeTypeFieldOnRelationType = ({
  initial,
  fieldName,
  fieldType,
  variableName,
  queryParams,
  nestedVariable,
  subSelection,
  skipLimit,
  commaIfTail,
  tailParams,
  schemaTypeRelation,
  innerSchemaType,
  isInlineFragment,
  interfaceLabel,
  filterParams,
  temporalArgs
}) => {
  const relType = schemaTypeRelation.name;
  const fromTypeName = schemaTypeRelation.from;
  const toTypeName = schemaTypeRelation.to;
  const isFromField = fieldName === fromTypeName || fieldName === 'from';
  const isToField = fieldName === toTypeName || fieldName === 'to';
  // Since the translations are significantly different,
  // we first check whether the relationship is reflexive
  if (fromTypeName === toTypeName) {
    const relationshipVariableName = `${variableName}_${
      isFromField ? 'from' : 'to'
    }_relation`;
    if (isRelationTypeDirectedField(fieldName)) {
      const temporalFieldRelationshipVariableName = `${nestedVariable}_relation`;
      const temporalClauses = temporalPredicateClauses(
        filterParams,
        temporalFieldRelationshipVariableName,
        temporalArgs
      );
      return {
        initial: `${initial}${fieldName}: ${
          !isArrayType(fieldType) ? 'head(' : ''
        }[(${safeVar(variableName)})${isFromField ? '<' : ''}-[${safeVar(
          relationshipVariableName
        )}:${safeLabel(relType)}${queryParams}]-${
          isToField ? '>' : ''
        }(${safeVar(nestedVariable)}:${safeLabel(
          isInlineFragment ? interfaceLabel : fromTypeName
        )}) ${
          temporalClauses.length > 0
            ? `WHERE ${temporalClauses.join(' AND ')} `
            : ''
        }| ${relationshipVariableName} {${
          isInlineFragment
            ? 'FRAGMENT_TYPE: "' + interfaceLabel + '",' + subSelection[0]
            : subSelection[0]
        }}]${!isArrayType(fieldType) ? ')' : ''}${skipLimit} ${commaIfTail}`,
        ...tailParams
      };
    } else {
      // Case of a renamed directed field
      // e.g., 'from: Movie' -> 'Movie: Movie'
      return {
        initial: `${initial}${fieldName}: ${variableName} {${
          subSelection[0]
        }}${skipLimit} ${commaIfTail}`,
        ...tailParams
      };
    }
  } else {
    variableName = variableName + '_relation';
    return {
      initial: `${initial}${fieldName}: ${
        !isArrayType(fieldType) ? 'head(' : ''
      }[(:${safeLabel(isFromField ? toTypeName : fromTypeName)})${
        isFromField ? '<' : ''
      }-[${safeVar(variableName)}]-${isToField ? '>' : ''}(${safeVar(
        nestedVariable
      )}:${safeLabel(
        isInlineFragment ? interfaceLabel : innerSchemaType.name
      )}${queryParams}) | ${nestedVariable} {${
        isInlineFragment
          ? 'FRAGMENT_TYPE: "' + interfaceLabel + '",' + subSelection[0]
          : subSelection[0]
      }}]${!isArrayType(fieldType) ? ')' : ''}${skipLimit} ${commaIfTail}`,
      ...tailParams
    };
  }
};

var temporalField = ({
  initial,
  fieldName,
  commaIfTail,
  tailParams,
  parentSelectionInfo,
  secondParentSelectionInfo
}) => {
  const parentFieldName = parentSelectionInfo.fieldName;
  const parentFieldType = parentSelectionInfo.fieldType;
  const parentSchemaType = parentSelectionInfo.schemaType;
  const parentVariableName = parentSelectionInfo.variableName;
  const secondParentVariableName = secondParentSelectionInfo.variableName;
  // Initially assume that the parent type of the temporal type
  // containing this temporal field was a node
  let variableName = parentVariableName;
  let fieldIsArray = isArrayType(parentFieldType);
  if (parentSchemaType && !isNodeType(parentSchemaType.astNode)) {
    // initial assumption wrong, build appropriate relationship variable
    if (
      isRootSelection({
        selectionInfo: secondParentSelectionInfo,
        rootType: 'relationship'
      })
    ) {
      // If the second parent selection scope above is the root
      // then we need to use the root variableName
      variableName = `${secondParentVariableName}_relation`;
    } else if (isRelationTypePayload(parentSchemaType)) {
      const parentSchemaTypeRelation = getRelationTypeDirectiveArgs(
        parentSchemaType.astNode
      );
      if (parentSchemaTypeRelation.from === parentSchemaTypeRelation.to) {
        variableName = `${variableName}_relation`;
      } else {
        variableName = `${variableName}_relation`;
      }
    }
  }
  return {
    initial: `${initial} ${fieldName}: ${
      fieldIsArray
        ? `${
            fieldName === 'formatted'
              ? `toString(TEMPORAL_INSTANCE)`
              : `TEMPORAL_INSTANCE.${fieldName}`
          } ${commaIfTail}`
        : `${
            fieldName === 'formatted'
              ? `toString(${safeVar(
                  variableName
                )}.${parentFieldName}) ${commaIfTail}`
              : `${safeVar(
                  variableName
                )}.${parentFieldName}.${fieldName} ${commaIfTail}`
          }`
    }`,
    ...tailParams
  };
};

var temporalType = ({
  initial,
  fieldName,
  subSelection,
  commaIfTail,
  tailParams,
  variableName,
  nestedVariable,
  fieldType,
  schemaType,
  schemaTypeRelation,
  parentSelectionInfo
}) => {
  const parentVariableName = parentSelectionInfo.variableName;
  const parentFilterParams = parentSelectionInfo.filterParams;
  const parentSchemaType = parentSelectionInfo.schemaType;
  const safeVariableName = safeVar(variableName);
  let fieldIsArray = isArrayType(fieldType);
  if (!isNodeType(schemaType.astNode)) {
    if (
      isRelationTypePayload(schemaType) &&
      schemaTypeRelation.from === schemaTypeRelation.to
    ) {
      variableName = `${nestedVariable}_relation`;
    } else {
      if (fieldIsArray) {
        if (
          isRootSelection({
            selectionInfo: parentSelectionInfo,
            rootType: 'relationship'
          })
        ) {
          if (schemaTypeRelation.from === schemaTypeRelation.to) {
            variableName = `${parentVariableName}_relation`;
          } else {
            variableName = `${parentVariableName}_relation`;
          }
        } else {
          variableName = `${variableName}_relation`;
        }
      } else {
        variableName = `${nestedVariable}_relation`;
      }
    }
  }
  return {
    initial: `${initial}${fieldName}: ${
      fieldIsArray
        ? `reduce(a = [], TEMPORAL_INSTANCE IN ${variableName}.${fieldName} | a + {${
            subSelection[0]
          }})${commaIfTail}`
        : temporalOrderingFieldExists(parentSchemaType, parentFilterParams)
        ? `${safeVariableName}.${fieldName}${commaIfTail}`
        : `{${subSelection[0]}}${commaIfTail}`
    }`,
    ...tailParams
  };
};

const temporalTypeSelections = (selections, innerSchemaType) => {
  // TODO use extractSelections instead?
  const selectedTypes =
    selections && selections[0] && selections[0].selectionSet
      ? selections[0].selectionSet.selections
      : [];
  return selectedTypes
    .reduce((temporalTypeFields, innerSelection) => {
      // name of temporal type field
      const fieldName = innerSelection.name.value;
      const fieldTypeName = getFieldTypeName(innerSchemaType, fieldName);
      if (isTemporalType(fieldTypeName)) {
        const innerSelectedTypes = innerSelection.selectionSet
          ? innerSelection.selectionSet.selections
          : [];
        temporalTypeFields.push(
          `${fieldName}: {${innerSelectedTypes
            .reduce((temporalSubFields, t) => {
              // temporal type subfields, year, minute, etc.
              const subFieldName = t.name.value;
              if (subFieldName === 'formatted') {
                temporalSubFields.push(
                  `${subFieldName}: toString(sortedElement.${fieldName})`
                );
              } else {
                temporalSubFields.push(
                  `${subFieldName}: sortedElement.${fieldName}.${subFieldName}`
                );
              }
              return temporalSubFields;
            }, [])
            .join(',')}}`
        );
      }
      return temporalTypeFields;
    }, [])
    .join(',');
};

const getFieldTypeName = (schemaType, fieldName) => {
  // TODO handle for fragments?
  const field =
    schemaType && fieldName ? schemaType.getFields()[fieldName] : undefined;
  return field ? field.type.name : '';
};

const temporalOrderingFieldExists = (schemaType, filterParams) => {
  let orderByParam = filterParams ? filterParams['orderBy'] : undefined;
  if (orderByParam) {
    orderByParam = orderByParam.value;
    if (!Array.isArray(orderByParam)) orderByParam = [orderByParam];
    return orderByParam.find(e => {
      const fieldName = e.substring(0, e.indexOf('_'));
      const fieldTypeName = getFieldTypeName(schemaType, fieldName);
      return isTemporalType(fieldTypeName);
    });
  }
  return undefined;
};

const buildSortMultiArgs = param => {
  let values = param ? param.value : [];
  let fieldName = '';
  if (!Array.isArray(values)) values = [values];
  return values
    .map(e => {
      fieldName = e.substring(0, e.indexOf('_'));
      return e.includes('_asc') ? `'^${fieldName}'` : `'${fieldName}'`;
    })
    .join(',');
};

module.exports = {
  customCypherField,
  relationFieldOnNodeType,
  relationTypeFieldOnNodeType,
  nodeTypeFieldOnRelationType,
  temporalField,
  temporalType
};
