import {
  computeSkipLimit,
  cypherDirective,
  cypherDirectiveArgs,
  filtersFromSelections,
  innerFilterParams,
  paramsToString,
  getFilterParams,
  innerType,
  isGraphqlScalarType,
  relationDirective,
  getRelationTypeDirective,
  decideNestedVariableName,
  safeVar,
  isNeo4jType,
  isNeo4jTypeField,
  getNeo4jTypeArguments,
  removeIgnoredFields,
  getDerivedTypeNames
} from './utils';
import {
  customCypherField,
  relationFieldOnNodeType,
  relationTypeFieldOnNodeType,
  nodeTypeFieldOnRelationType,
  neo4jType,
  neo4jTypeField,
  derivedTypesParams
} from './translate';
import { Kind } from 'graphql';
import {
  isObjectTypeDefinition,
  isInterfaceTypeDefinition,
  isUnionTypeDefinition
} from './augment/types/types';
import {
  unwrapNamedType,
  TypeWrappers,
  Neo4jSystemIDField
} from './augment/fields';

export function buildCypherSelection({
  initial = '',
  cypherParams,
  selections,
  variableName,
  schemaType,
  resolveInfo,
  paramIndex = 1,
  parentSelectionInfo = {},
  secondParentSelectionInfo = {}
}) {
  if (!selections.length) return [initial, {}];
  selections = removeIgnoredFields(schemaType, selections);
  let selectionFilters = filtersFromSelections(
    selections,
    resolveInfo.variableValues
  );
  const filterParams = getFilterParams(selectionFilters, paramIndex);
  const shallowFilterParams = Object.entries(filterParams).reduce(
    (result, [key, value]) => {
      result[`${value.index}_${key}`] = value.value;
      return result;
    },
    {}
  );

  // TODO move recurse out of buildCypherSelection, refactoring paramIndex
  const recurse = args => {
    paramIndex =
      Object.keys(shallowFilterParams).length > 0 ? paramIndex + 1 : paramIndex;
    const [subSelection, subFilterParams] = buildCypherSelection({
      ...args,
      ...{ paramIndex }
    });
    const derivedTypesParams = Object.entries(args)
      .filter(([key]) => key.endsWith('_derivedTypes'))
      .reduce(
        (acc, [key, value]) => ({
          ...acc,
          [key]: value
        }),
        {}
      );
    return [
      subSelection,
      { ...shallowFilterParams, ...subFilterParams, ...derivedTypesParams }
    ];
  };

  let selection = [];
  let subSelection = [];

  const [headSelection, ...tailSelections] = selections;
  const fieldName =
    headSelection && headSelection.name ? headSelection.name.value : '';
  const typeMap = resolveInfo.schema.getTypeMap();
  const schemaTypeName = schemaType.name;
  const schemaTypeAstNode = typeMap[schemaType].astNode;
  const safeVariableName = safeVar(variableName);

  const usesFragments = isFragmentedSelection({ selections });
  const isScalarType = isGraphqlScalarType(schemaType);
  const schemaTypeField = !isScalarType
    ? schemaType.getFields()[fieldName]
    : {};

  const isInterfaceType = isInterfaceTypeDefinition({
    definition: schemaTypeAstNode
  });
  const isObjectType = isObjectTypeDefinition({
    definition: schemaTypeAstNode
  });
  const isUnionType = isUnionTypeDefinition({
    definition: schemaTypeAstNode
  });
  const isFragmentedInterfaceType = usesFragments && isInterfaceType;
  const isFragmentedObjectType = usesFragments && isObjectType;
  const { statement: customCypherStatement } = cypherDirective(
    schemaType,
    fieldName
  );

  let tailParams = {
    selections: tailSelections,
    cypherParams,
    variableName,
    paramIndex,
    schemaType,
    resolveInfo,
    shallowFilterParams,
    parentSelectionInfo,
    secondParentSelectionInfo
  };

  let translationConfig = undefined;

  if (isFragmentedInterfaceType || isUnionType || isFragmentedObjectType) {
    const [schemaTypeFields, composedTypeMap] = mergeSelectionFragments({
      schemaType,
      selections,
      isFragmentedObjectType,
      resolveInfo
    });
    const hasOnlySchemaTypeFragments =
      schemaTypeFields.length > 0 && Object.keys(composedTypeMap).length === 0;
    if (hasOnlySchemaTypeFragments || isFragmentedObjectType) {
      tailParams.selections = schemaTypeFields;
      translationConfig = tailParams;
    } else if (isFragmentedInterfaceType || isUnionType) {
      const implementingTypes = getComposedTypes({
        schemaTypeName,
        schemaTypeAstNode,
        isFragmentedInterfaceType,
        isUnionType,
        isFragmentedObjectType,
        resolveInfo
      });
      // TODO Make this a new function once recurse is moved out of buildCypherSelection
      // so that we don't have to start passing recurse as an argument
      const [fragmentedQuery, queryParams] = implementingTypes.reduce(
        ([listComprehensions, params], implementingType) => {
          // Get merged selections of this implementing type
          let mergedTypeSelections = composedTypeMap[implementingType];
          if (!mergedTypeSelections) {
            // If no fields of this implementing type were selected,
            // use at least any interface fields selected generally
            mergedTypeSelections = schemaTypeFields;
          }
          if (mergedTypeSelections.length) {
            // If selections have been made for this type after merging
            if (isFragmentedInterfaceType || isUnionType) {
              schemaType = resolveInfo.schema.getType(implementingType);
            }
            // TODO Refactor when recurse is moved out buildCypherSelection
            // Build the map projection for this implementing type
            let [fragmentedQuery, queryParams] = recurse({
              ...tailParams,
              schemaType,
              selections: mergedTypeSelections,
              paramIndex
            });
            if (isFragmentedInterfaceType || isUnionType) {
              // Build a more complex list comprehension for
              // this type, to be aggregated together later
              fragmentedQuery = buildComposedTypeListComprehension({
                implementingType,
                safeVariableName,
                fragmentedQuery
              });
            }
            listComprehensions.push(fragmentedQuery);
            // Merge any cypher params built for field arguments
            params = { ...params, ...queryParams };
          }
          return [listComprehensions, params];
        },
        [[], {}]
      );
      const composedQuery = concatenateComposedTypeLists({
        fragmentedQuery
      });
      selection = [composedQuery, queryParams];
    }
  } else {
    const fieldType =
      schemaTypeField && schemaTypeField.type ? schemaTypeField.type : {};
    const innerSchemaType = innerType(fieldType); // for target "type" aka label

    // TODO Switch to using schemaTypeField.astNode instead of schemaTypeField
    // so the field type could be extracted using unwrapNamedType. We could explicitly check
    // the ast for list type wrappers (changing isArrayType calls in translate.js) and we
    // could use in the branching logic here, the same astNode.kind based predicate functions
    // used in the  augmentation code (ex: from isObjectType to isObjectTypeDefinition from ast.js)
    const fieldAstNode = schemaTypeField ? schemaTypeField.astNode : {};
    const fieldTypeWrappers = unwrapNamedType({ type: fieldAstNode });
    const fieldTypeName = fieldTypeWrappers[TypeWrappers.NAME];
    const innerSchemaTypeAstNode = typeMap[fieldTypeName]
      ? typeMap[fieldTypeName].astNode
      : {};

    const commaIfTail = tailSelections.length > 0 ? ',' : '';

    const isIntrospectionField = !isScalarType && !schemaTypeField;
    const isScalarTypeField = isGraphqlScalarType(innerSchemaType);
    const isObjectTypeField = isObjectTypeDefinition({
      definition: innerSchemaTypeAstNode
    });
    const isInterfaceTypeField = isInterfaceTypeDefinition({
      definition: innerSchemaTypeAstNode
    });
    if (isIntrospectionField) {
      // Schema meta fields(__schema, __typename, etc)
      translationConfig = {
        ...tailParams,
        initial: tailSelections.length
          ? initial
          : initial.substring(0, initial.lastIndexOf(','))
      };
    } else if (isScalarTypeField) {
      translationConfig = translateScalarTypeField({
        fieldName,
        initial,
        variableName,
        commaIfTail,
        tailParams,
        customCypherStatement,
        schemaType,
        schemaTypeAstNode,
        headSelection,
        resolveInfo,
        paramIndex,
        cypherParams,
        parentSelectionInfo,
        secondParentSelectionInfo
      });
    } else if (isObjectType || isInterfaceType) {
      const schemaTypeRelation = getRelationTypeDirective(schemaTypeAstNode);
      const innerSchemaTypeRelation = getRelationTypeDirective(
        innerSchemaTypeAstNode
      );
      const nestedVariable = decideNestedVariableName({
        schemaTypeRelation,
        innerSchemaTypeRelation,
        variableName,
        fieldName,
        parentSelectionInfo
      });
      const fieldSelectionSet =
        headSelection && headSelection.selectionSet
          ? headSelection.selectionSet.selections
          : [];

      subSelection = recurse({
        selections: fieldSelectionSet,
        variableName: nestedVariable,
        paramIndex,
        schemaType: innerSchemaType,
        resolveInfo,
        cypherParams,
        shallowFilterParams,
        parentSelectionInfo: {
          fieldName,
          schemaType,
          variableName,
          fieldType,
          filterParams,
          selections,
          paramIndex
        },
        secondParentSelectionInfo: parentSelectionInfo
      });

      const fieldArgs =
        !isScalarType && schemaTypeField && schemaTypeField.args
          ? schemaTypeField.args.map(e => e.astNode)
          : [];
      const neo4jTypeArgs = getNeo4jTypeArguments(fieldArgs);
      const queryParams = paramsToString(
        innerFilterParams(filterParams, neo4jTypeArgs)
      );
      const skipLimit = computeSkipLimit(
        headSelection,
        resolveInfo.variableValues
      );
      const { name: relType, direction: relDirection } = relationDirective(
        schemaType,
        fieldName
      );

      const usesFragments = isFragmentedSelection({
        selections: fieldSelectionSet
      });
      const isFragmentedObjectTypeField = isObjectTypeField && usesFragments;
      const [schemaTypeFields, composedTypeMap] = mergeSelectionFragments({
        schemaType: innerSchemaType,
        selections: fieldSelectionSet,
        isFragmentedObjectType: isFragmentedObjectTypeField,
        resolveInfo
      });
      const fragmentTypeParams = derivedTypesParams({
        isInterfaceType: isInterfaceTypeField,
        schema: resolveInfo.schema,
        interfaceName: innerSchemaType.name,
        usesFragments
      });
      subSelection[1] = { ...subSelection[1], ...fragmentTypeParams };
      if (customCypherStatement) {
        // Object type field with cypher directive
        translationConfig = customCypherField({
          customCypherStatement,
          cypherParams,
          paramIndex,
          schemaTypeRelation,
          isInterfaceTypeField,
          usesFragments,
          schemaTypeFields,
          composedTypeMap,
          initial,
          fieldName,
          fieldType,
          fieldTypeName,
          nestedVariable,
          variableName,
          headSelection,
          schemaType,
          innerSchemaType,
          resolveInfo,
          subSelection,
          skipLimit,
          commaIfTail,
          tailParams
        });
      } else if (isNeo4jType(fieldTypeName)) {
        translationConfig = neo4jType({
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
        });
      } else if (relType && relDirection) {
        // Object type field with relation directive
        [translationConfig, subSelection] = relationFieldOnNodeType({
          initial,
          fieldName,
          fieldType,
          variableName,
          relDirection,
          relType,
          nestedVariable,
          schemaTypeFields,
          composedTypeMap,
          isInterfaceTypeField,
          usesFragments,
          innerSchemaType,
          paramIndex,
          fieldArgs,
          filterParams,
          selectionFilters,
          neo4jTypeArgs,
          selections,
          schemaType,
          subSelection,
          skipLimit,
          commaIfTail,
          tailParams,
          resolveInfo,
          cypherParams
        });
      } else if (schemaTypeRelation) {
        // Object type field on relation type
        // (from, to, renamed, relation mutation payloads...)
        [translationConfig, subSelection] = nodeTypeFieldOnRelationType({
          initial,
          fieldName,
          fieldType,
          variableName,
          nestedVariable,
          queryParams,
          subSelection,
          skipLimit,
          commaIfTail,
          tailParams,
          filterParams,
          neo4jTypeArgs,
          schemaTypeRelation,
          innerSchemaType,
          schemaTypeFields,
          composedTypeMap,
          isInterfaceTypeField,
          usesFragments,
          paramIndex,
          parentSelectionInfo,
          resolveInfo,
          selectionFilters,
          fieldArgs,
          cypherParams
        });
      } else if (innerSchemaTypeRelation) {
        // Relation type field on node type (field payload types...)
        // and set subSelection to update field argument params
        [translationConfig, subSelection] = relationTypeFieldOnNodeType({
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
          innerSchemaType,
          nestedVariable,
          queryParams,
          filterParams,
          neo4jTypeArgs,
          resolveInfo,
          selectionFilters,
          paramIndex,
          fieldArgs,
          cypherParams
        });
      }
    }
  }
  if (translationConfig) {
    selection = recurse(translationConfig);
  }
  return [selection[0], { ...selection[1], ...subSelection[1] }];
}

const translateScalarTypeField = ({
  fieldName,
  initial,
  variableName,
  commaIfTail,
  tailParams,
  customCypherStatement,
  schemaType,
  schemaTypeAstNode,
  headSelection,
  resolveInfo,
  paramIndex,
  cypherParams,
  parentSelectionInfo,
  secondParentSelectionInfo
}) => {
  if (fieldName === Neo4jSystemIDField) {
    return {
      initial: `${initial}${fieldName}: ID(${safeVar(
        variableName
      )})${commaIfTail}`,
      ...tailParams
    };
  } else {
    if (customCypherStatement) {
      if (getRelationTypeDirective(schemaTypeAstNode)) {
        variableName = `${variableName}_relation`;
      }
      return {
        initial: `${initial}${fieldName}: apoc.cypher.runFirstColumn("${customCypherStatement}", {${cypherDirectiveArgs(
          variableName,
          headSelection,
          cypherParams,
          schemaType,
          resolveInfo,
          paramIndex
        )}}, false)${commaIfTail}`,
        ...tailParams
      };
    } else if (isNeo4jTypeField(schemaType, fieldName)) {
      return neo4jTypeField({
        initial,
        fieldName,
        variableName,
        commaIfTail,
        tailParams,
        parentSelectionInfo,
        secondParentSelectionInfo
      });
    }
    // graphql scalar type, no custom cypher statement
    return {
      initial: `${initial} .${fieldName} ${commaIfTail}`,
      ...tailParams
    };
  }
};

export const mergeSelectionFragments = ({
  schemaType,
  selections,
  isFragmentedObjectType,
  resolveInfo
}) => {
  let schemaTypeFields = [];
  const composedTypeMap = {};
  const schemaTypeName = schemaType.name;
  const fragmentDefinitions = resolveInfo.fragments;
  selections.forEach(selection => {
    let fieldKind = selection.kind;
    if (fieldKind === Kind.FIELD) {
      schemaTypeFields.push(selection);
    } else if (
      fieldKind === Kind.INLINE_FRAGMENT ||
      fieldKind === Kind.FRAGMENT_SPREAD
    ) {
      let fragmentSelections = [];
      let typeCondition = '';
      if (fieldKind === Kind.FRAGMENT_SPREAD) {
        const fragmentDefinition = fragmentDefinitions[selection.name.value];
        fragmentSelections = fragmentDefinition.selectionSet.selections;
        typeCondition = fragmentDefinition.typeCondition;
      } else {
        fragmentSelections = selection.selectionSet.selections;
        typeCondition = selection.typeCondition;
      }
      const typeName = typeCondition ? typeCondition.name.value : '';
      if (typeName) {
        // For fragments on the same type containing the fragment or
        // for inline fragments without type conditions
        if (typeName === schemaTypeName) {
          schemaTypeFields.push(...fragmentSelections);
        } else {
          const typeSelections = composedTypeMap[typeName];
          // Initialize selection set array for this type
          if (!typeSelections) {
            composedTypeMap[typeName] = fragmentSelections;
          } else {
            // for aggregation of multiple fragments on the same type
            composedTypeMap[typeName].push(...fragmentSelections);
          }
        }
      } else {
        // For inline untyped fragments on the same type, ex: ...{ title }
        schemaTypeFields.push(...fragmentSelections);
      }
    }
  });
  if (isFragmentedObjectType) {
    // Composed object queries still only use a single map projection
    composedTypeMap[schemaTypeName] = schemaTypeFields;
  }
  Object.keys(composedTypeMap).forEach(typeName => {
    composedTypeMap[typeName] = mergeFragmentedSelections({
      selections: [...composedTypeMap[typeName], ...schemaTypeFields]
    });
  });
  schemaTypeFields = mergeFragmentedSelections({
    selections: schemaTypeFields
  });
  // When querying an interface type using fragments, queries are made
  // more specific if there is not at least 1 interface field selected.
  // So the __typename field is removed here to prevent interpreting it
  // as a field for which a value could be obtained from matched data.
  // Otherwisez all interface type nodes would always be returned even
  // when only using fragments to select fields on implementing types
  const typeNameFieldIndex = schemaTypeFields.findIndex(
    field => field.name && field.name.value === '__typename'
  );
  if (typeNameFieldIndex !== -1) schemaTypeFields.splice(typeNameFieldIndex, 1);
  return [schemaTypeFields, composedTypeMap];
};

const mergeFragmentedSelections = ({ selections = [] }) => {
  const mergedSelections = selections.reduce((merged, selection) => {
    const fieldName = selection.name.value;
    if (!merged[fieldName]) {
      // initialize entry for this composing type
      merged[fieldName] = selection;
    } else {
      // FIXME Deeply merge selection sets of fragments on the same type
    }
    return merged;
  }, {});
  return Object.values(mergedSelections);
};

export const getComposedTypes = ({
  schemaTypeName,
  schemaTypeAstNode,
  isFragmentedInterfaceType,
  isUnionType,
  isFragmentedObjectType,
  resolveInfo
}) => {
  let implementingTypes = [];
  if (isFragmentedInterfaceType) {
    // Get an array of all types implementing this interface type
    implementingTypes = getDerivedTypeNames(resolveInfo.schema, schemaTypeName);
  } else if (isUnionType) {
    implementingTypes = schemaTypeAstNode.types.reduce((types, type) => {
      types.push(type.name.value);
      return types;
    }, []);
  } else if (isFragmentedObjectType) {
    implementingTypes.push(schemaTypeName);
  }
  return implementingTypes;
};

export const isFragmentedSelection = ({ selections }) => {
  return selections.find(
    selection =>
      selection.kind === Kind.INLINE_FRAGMENT ||
      selection.kind === Kind.FRAGMENT_SPREAD
  );
};

const buildComposedTypeListComprehension = ({
  implementingType,
  safeVariableName,
  fragmentedQuery
}) => {
  const fragmentTypeField = `FRAGMENT_TYPE: "${implementingType}"`;
  const typeMapProjection = `${safeVariableName} { ${fragmentTypeField}${
    // When __typename is the only field selected not within a fragment,
    // fragmentedQuery is undefined, so that we only provide the FRAGMENT_TYPE
    fragmentedQuery ? `, ${fragmentedQuery}` : ''
  } }`;
  const typeListComprehension = `${safeVariableName} IN [${safeVariableName}] WHERE [label IN labels(${safeVariableName}) WHERE label = "${implementingType}" | TRUE]`;
  return `[${typeListComprehension} | ${typeMapProjection}]`;
};

// See: https://neo4j.com/docs/cypher-manual/current/syntax/operators/#syntax-concatenating-two-lists
const concatenateComposedTypeLists = ({ fragmentedQuery }) =>
  `head(${fragmentedQuery.join(` + `)})`;
