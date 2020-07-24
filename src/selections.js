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
  getInterfaceDerivedTypeNames
} from './utils';
import {
  customCypherField,
  relationFieldOnNodeType,
  relationTypeFieldOnNodeType,
  nodeTypeFieldOnRelationType,
  neo4jType,
  neo4jTypeField,
  derivedTypesParams,
  fragmentType
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
import { selectUnselectedOrderedFields } from './augment/input-values';

export function buildCypherSelection({
  initial = '',
  cypherParams,
  selections,
  variableName,
  schemaType,
  resolveInfo,
  paramIndex = 1,
  parentSelectionInfo = {},
  secondParentSelectionInfo = {},
  isFederatedOperation = false,
  context
}) {
  if (!selections.length) return [initial, {}];
  const typeMap = resolveInfo.schema.getTypeMap();
  const schemaTypeName = schemaType.name;
  const schemaTypeAstNode = typeMap[schemaTypeName].astNode;
  const isUnionType = isUnionTypeDefinition({
    definition: schemaTypeAstNode
  });
  if (!isUnionType) {
    selections = removeIgnoredFields(schemaType, selections);
  }
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
  const safeVariableName = safeVar(variableName);

  const usesFragments = isFragmentedSelection({ selections });
  const isScalarType = isGraphqlScalarType(schemaType);
  const schemaTypeField =
    !isScalarType && !isUnionType ? schemaType.getFields()[fieldName] : {};

  const isInterfaceType = isInterfaceTypeDefinition({
    definition: schemaTypeAstNode
  });
  const isObjectType = isObjectTypeDefinition({
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
    secondParentSelectionInfo,
    isFederatedOperation,
    context
  };

  let translationConfig = undefined;

  if (isFragmentedInterfaceType || isUnionType || isFragmentedObjectType) {
    const [schemaTypeFields, derivedTypeMap] = mergeSelectionFragments({
      schemaType,
      selections,
      isFragmentedObjectType,
      isUnionType,
      typeMap,
      resolveInfo
    });
    const hasOnlySchemaTypeFragments =
      schemaTypeFields.length > 0 && Object.keys(derivedTypeMap).length === 0;
    if (hasOnlySchemaTypeFragments || isFragmentedObjectType) {
      tailParams.selections = schemaTypeFields;
      translationConfig = tailParams;
    } else if (isFragmentedInterfaceType || isUnionType) {
      const derivedTypes = getDerivedTypes({
        schemaTypeName,
        derivedTypeMap,
        isFragmentedInterfaceType,
        isUnionType,
        resolveInfo
      });
      // TODO Make this a new function once recurse is moved out of buildCypherSelection
      // so that we don't have to start passing recurse as an argument
      const [fragmentedQuery, queryParams] = derivedTypes.reduce(
        ([listComprehensions, params], derivedType) => {
          // Get merged selections of this implementing type
          if (!derivedTypeMap[derivedType]) {
            // If no fields of this implementing type were selected,
            // use at least any interface fields selected generally
            derivedTypeMap[derivedType] = schemaTypeFields;
          }
          const mergedTypeSelections = derivedTypeMap[derivedType];
          if (mergedTypeSelections.length) {
            const composedTypeDefinition = typeMap[derivedType].astNode;
            const isInterfaceTypeFragment = isInterfaceTypeDefinition({
              definition: composedTypeDefinition
            });
            // If selections have been made for this type after merging
            if (isFragmentedInterfaceType || isUnionType) {
              schemaType = resolveInfo.schema.getType(derivedType);
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
              [
                fragmentedQuery,
                queryParams
              ] = buildComposedTypeListComprehension({
                derivedType,
                isUnionType,
                mergedTypeSelections,
                queryParams,
                safeVariableName,
                isInterfaceTypeFragment,
                fragmentedQuery,
                resolveInfo
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
    const isUnionTypeField = isUnionTypeDefinition({
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
        secondParentSelectionInfo,
        isFederatedOperation,
        context
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

      const orderedFieldSelectionSet = selectUnselectedOrderedFields({
        selectionFilters,
        fieldSelectionSet
      });

      const fieldsForTranslation = orderedFieldSelectionSet.length
        ? orderedFieldSelectionSet
        : fieldSelectionSet;

      subSelection = recurse({
        selections: fieldsForTranslation,
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
        secondParentSelectionInfo: parentSelectionInfo,
        isFederatedOperation,
        context
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
      const isRelationshipField = relType && relDirection;
      const isRelationshipTypeField = innerSchemaTypeRelation !== undefined;

      const usesFragments = isFragmentedSelection({
        selections: fieldSelectionSet
      });
      const isFragmentedObjectTypeField = isObjectTypeField && usesFragments;
      const [schemaTypeFields, derivedTypeMap] = mergeSelectionFragments({
        schemaType: innerSchemaType,
        selections: fieldSelectionSet,
        isFragmentedObjectType: isFragmentedObjectTypeField,
        isUnionType: isUnionTypeField,
        typeMap,
        resolveInfo
      });
      const fragmentTypeParams = derivedTypesParams({
        isInterfaceType: isInterfaceTypeField,
        isUnionType: isUnionTypeField,
        schema: resolveInfo.schema,
        schemaTypeName: innerSchemaType.name,
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
          isUnionTypeField,
          isObjectTypeField,
          usesFragments,
          schemaTypeFields,
          derivedTypeMap,
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
          tailParams,
          isFederatedOperation,
          context
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
      } else if (isRelationshipField || isUnionTypeField) {
        // Object type field with relation directive
        [translationConfig, subSelection] = relationFieldOnNodeType({
          initial,
          fieldName,
          fieldType,
          fieldSelectionSet,
          variableName,
          relDirection,
          relType,
          nestedVariable,
          schemaTypeFields,
          derivedTypeMap,
          isInterfaceTypeField,
          isUnionTypeField,
          isObjectTypeField,
          usesFragments,
          innerSchemaType,
          paramIndex,
          fieldArgs,
          filterParams,
          selectionFilters,
          neo4jTypeArgs,
          fieldsForTranslation,
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
          schemaType,
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
          fieldSelectionSet,
          fieldsForTranslation,
          schemaTypeFields,
          derivedTypeMap,
          isObjectTypeField,
          isInterfaceTypeField,
          isUnionTypeField,
          usesFragments,
          paramIndex,
          parentSelectionInfo,
          resolveInfo,
          selectionFilters,
          fieldArgs,
          cypherParams
        });
      } else if (isRelationshipTypeField) {
        // Relation type field on node type (field payload types...)
        // and set subSelection to update field argument params
        [translationConfig, subSelection] = relationTypeFieldOnNodeType({
          innerSchemaTypeRelation,
          initial,
          fieldName,
          fieldSelectionSet,
          subSelection,
          skipLimit,
          commaIfTail,
          tailParams,
          fieldType,
          variableName,
          fieldsForTranslation,
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
  secondParentSelectionInfo,
  isFederatedOperation,
  context
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
          paramIndex,
          isFederatedOperation,
          context
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
  isUnionType,
  typeMap,
  resolveInfo
}) => {
  const schemaTypeName = schemaType.name;
  const fragmentDefinitions = resolveInfo.fragments;
  let [schemaTypeFields, derivedTypeMap] = buildFragmentMaps({
    selections,
    schemaTypeName,
    isFragmentedObjectType,
    fragmentDefinitions,
    isUnionType,
    typeMap,
    resolveInfo
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
  return [schemaTypeFields, derivedTypeMap];
};

const buildFragmentMaps = ({
  selections = [],
  schemaTypeName,
  isFragmentedObjectType,
  fragmentDefinitions,
  isUnionType,
  typeMap = {},
  resolveInfo
}) => {
  let schemaTypeFields = [];
  let interfaceFragmentMap = {};
  let objectSelectionMap = {};
  let objectFragmentMap = {};
  selections.forEach(selection => {
    const fieldKind = selection.kind;
    if (fieldKind === Kind.FIELD) {
      schemaTypeFields.push(selection);
    } else if (isSelectionFragment({ kind: fieldKind })) {
      [
        schemaTypeFields,
        interfaceFragmentMap,
        objectSelectionMap,
        objectFragmentMap
      ] = aggregateFragmentedSelections({
        schemaTypeName,
        selection,
        fieldKind,
        isUnionType,
        schemaTypeFields,
        objectFragmentMap,
        interfaceFragmentMap,
        objectSelectionMap,
        fragmentDefinitions,
        typeMap
      });
    }
  });
  // move into any interface type fragment, any fragments on object types implmenting it
  const derivedTypeMap = mergeInterfacedObjectFragments({
    schemaTypeName,
    schemaTypeFields,
    isFragmentedObjectType,
    objectSelectionMap,
    objectFragmentMap,
    interfaceFragmentMap,
    resolveInfo
  });
  // deduplicate relationship fields within fragments on the same type
  Object.keys(derivedTypeMap).forEach(typeName => {
    const allSelections = [...derivedTypeMap[typeName], ...schemaTypeFields];
    derivedTypeMap[typeName] = mergeFragmentedSelections({
      selections: allSelections
    });
  });
  schemaTypeFields = mergeFragmentedSelections({
    selections: schemaTypeFields
  });
  return [schemaTypeFields, derivedTypeMap];
};

const aggregateFragmentedSelections = ({
  schemaTypeName,
  selection,
  fieldKind,
  isUnionType,
  schemaTypeFields,
  objectFragmentMap,
  interfaceFragmentMap,
  objectSelectionMap,
  fragmentDefinitions,
  typeMap
}) => {
  const typeName = getFragmentTypeName({
    selection,
    kind: fieldKind,
    fragmentDefinitions
  });
  const fragmentSelections = getFragmentSelections({
    selection,
    kind: fieldKind,
    fragmentDefinitions
  });
  if (typeName) {
    if (fragmentSelections && fragmentSelections.length) {
      const definition = typeMap[typeName] ? typeMap[typeName].astNode : {};
      if (isObjectTypeDefinition({ definition })) {
        if (typeName === schemaTypeName) {
          // fragmented selections on the same type for which this is
          // a selection set are aggregated into schemaTypeFields
          schemaTypeFields.push(...fragmentSelections);
        } else {
          if (!objectSelectionMap[typeName]) objectSelectionMap[typeName] = [];
          // prepare an aggregation of fragmented selections used on object type
          // if querying a union type, fragments on object types are merged with
          // any interface type fragment implemented by them
          objectSelectionMap[typeName].push(selection);
          // initializes an array for the below progressive aggregation
          if (!objectFragmentMap[typeName]) objectFragmentMap[typeName] = [];
          // aggregates together all fragmented selections on this object type
          objectFragmentMap[typeName].push(...fragmentSelections);
        }
      } else if (isInterfaceTypeDefinition({ definition })) {
        if (typeName === schemaTypeName) {
          // aggregates together all fragmented selections on this interface type
          // to be multiplied over and deduplicated with any fragments on object
          // types implementing the interface, within its selection set
          schemaTypeFields.push(...fragmentSelections);
        } else if (isUnionType) {
          // only for interface fragments on union types, initializes an array
          // for the below progressive aggregation
          if (!interfaceFragmentMap[typeName])
            interfaceFragmentMap[typeName] = [];
          // aggregates together all fragmented selections on this object type
          interfaceFragmentMap[typeName].push(...fragmentSelections);
        }
      }
    }
  } else {
    // For inline untyped fragments on the same type, ex: ...{ title }
    schemaTypeFields.push(...fragmentSelections);
  }
  return [
    schemaTypeFields,
    interfaceFragmentMap,
    objectSelectionMap,
    objectFragmentMap
  ];
};

const mergeInterfacedObjectFragments = ({
  schemaTypeName,
  schemaTypeFields,
  isFragmentedObjectType,
  objectSelectionMap,
  objectFragmentMap,
  interfaceFragmentMap,
  resolveInfo
}) => {
  Object.keys(interfaceFragmentMap).forEach(interfaceName => {
    const derivedTypes = getInterfaceDerivedTypeNames(
      resolveInfo.schema,
      interfaceName
    );
    derivedTypes.forEach(typeName => {
      const implementingTypeFragments = objectSelectionMap[typeName];
      if (implementingTypeFragments) {
        // aggregate into the selections in this aggregated interface type fragment,
        // the aggregated selections of fragments on object types implmementing it
        interfaceFragmentMap[interfaceName].push(...implementingTypeFragments);
        // given the above aggregation into the interface type selections,
        // remove the fragment on this implementing type that existed
        // within the same selection set
        delete objectFragmentMap[typeName];
      }
    });
    return interfaceFragmentMap;
  });
  const derivedTypeMap = { ...objectFragmentMap, ...interfaceFragmentMap };
  if (isFragmentedObjectType) {
    derivedTypeMap[schemaTypeName] = schemaTypeFields;
  }
  return derivedTypeMap;
};

const mergeFragmentedSelections = ({ selections = [] }) => {
  const subSelectionFieldMap = {};
  const fragments = [];
  selections.forEach(selection => {
    const fieldKind = selection.kind;
    if (fieldKind === Kind.FIELD) {
      const fieldName = selection.name.value;
      if (!subSelectionFieldMap[fieldName]) {
        // initialize entry for this composing type
        subSelectionFieldMap[fieldName] = selection;
      } else {
        const alreadySelected = subSelectionFieldMap[fieldName].selectionSet
          ? subSelectionFieldMap[fieldName].selectionSet.selections
          : [];
        const selected = selection.selectionSet
          ? selection.selectionSet.selections
          : [];
        // If the field has a subselection (relationship field)
        if (alreadySelected.length && selected.length) {
          const selections = [...alreadySelected, ...selected];
          subSelectionFieldMap[
            fieldName
          ].selectionSet.selections = mergeFragmentedSelections({
            selections
          });
        }
      }
    } else {
      // Persist all fragments, to be merged later
      // If we already have this fragment, skip it.
      if (!fragments.some(anyElement => anyElement === selection)) {
        fragments.push(selection);
      }
    }
  });
  // Return the aggregation of all fragments and merged relationship fields
  return [...Object.values(subSelectionFieldMap), ...fragments];
};

export const getDerivedTypes = ({
  schemaTypeName,
  derivedTypeMap,
  isFragmentedInterfaceType,
  isUnionType,
  resolveInfo
}) => {
  let derivedTypes = [];
  if (isFragmentedInterfaceType) {
    // Get an array of all types implementing this interface type
    derivedTypes = getInterfaceDerivedTypeNames(
      resolveInfo.schema,
      schemaTypeName
    );
  } else if (isUnionType) {
    derivedTypes = Object.keys(derivedTypeMap).sort();
  }
  return derivedTypes;
};

export const getUnionDerivedTypes = ({ derivedTypeMap = {}, resolveInfo }) => {
  const typeMap = resolveInfo.schema.getTypeMap();
  const fragmentDefinitions = resolveInfo.fragments;
  const uniqueFragmentTypeMap = Object.entries(derivedTypeMap).reduce(
    (uniqueFragmentTypeMap, [typeName, selections]) => {
      const definition = typeMap[typeName].astNode;
      if (isObjectTypeDefinition({ definition })) {
        uniqueFragmentTypeMap[typeName] = true;
      } else if (isInterfaceTypeDefinition({ definition })) {
        if (hasFieldSelection({ selections })) {
          // then use the interface name in the label predicate,
          // as this is a case of a dynamic FRAGMENT_TYPE
          uniqueFragmentTypeMap[typeName] = true;
        } else if (isFragmentedSelection({ selections })) {
          selections.forEach(selection => {
            const kind = selection.kind;
            if (isSelectionFragment({ kind })) {
              const derivedTypeName = getFragmentTypeName({
                selection,
                kind,
                fragmentDefinitions
              });
              if (derivedTypeName) {
                uniqueFragmentTypeMap[derivedTypeName] = true;
              }
            }
          });
        }
      }
      return uniqueFragmentTypeMap;
    },
    {}
  );
  const typeNames = Object.keys(uniqueFragmentTypeMap);
  return typeNames.sort();
};

const hasFieldSelection = ({ selections = [] }) => {
  return selections.some(selection => {
    const kind = selection.kind;
    const name = selection.name ? selection.name.value : '';
    const isFieldSelection =
      kind === Kind.FIELD ||
      (kind === Kind.INLINE_FRAGMENT && !selection.typeCondition);
    return isFieldSelection && name !== '__typename';
  });
};

export const isFragmentedSelection = ({ selections }) => {
  return selections.find(selection =>
    isSelectionFragment({ kind: selection.kind })
  );
};

const isSelectionFragment = ({ kind = '' }) =>
  kind === Kind.INLINE_FRAGMENT || kind === Kind.FRAGMENT_SPREAD;

const getFragmentTypeName = ({ selection, kind, fragmentDefinitions }) => {
  let typeCondition = {};
  if (kind === Kind.FRAGMENT_SPREAD) {
    const fragmentDefinition = fragmentDefinitions[selection.name.value];
    typeCondition = fragmentDefinition.typeCondition;
  } else typeCondition = selection.typeCondition;
  return typeCondition && typeCondition.name ? typeCondition.name.value : '';
};

const getFragmentSelections = ({ selection, kind, fragmentDefinitions }) => {
  let fragmentSelections = [];
  if (kind === Kind.FRAGMENT_SPREAD) {
    const fragmentDefinition = fragmentDefinitions[selection.name.value];
    fragmentSelections = fragmentDefinition.selectionSet.selections;
  } else {
    fragmentSelections = selection.selectionSet.selections;
  }
  return fragmentSelections;
};

const buildComposedTypeListComprehension = ({
  derivedType,
  isUnionType,
  safeVariableName,
  mergedTypeSelections,
  queryParams,
  isInterfaceTypeFragment,
  fragmentedQuery = '',
  resolveInfo
}) => {
  const staticFragmentTypeField = `FRAGMENT_TYPE: "${derivedType}"`;
  let typeMapProjection = `${safeVariableName} { ${[
    staticFragmentTypeField,
    fragmentedQuery
  ].join(', ')} }`;
  // For fragments on interface types implemented by unioned object types
  if (isUnionType && isInterfaceTypeFragment) {
    const usesFragments = isFragmentedSelection({
      selections: mergedTypeSelections
    });
    if (usesFragments) {
      typeMapProjection = fragmentedQuery;
    } else {
      const dynamicFragmentTypeField = fragmentType(
        safeVariableName,
        derivedType
      );
      typeMapProjection = `${safeVariableName} { ${[
        dynamicFragmentTypeField,
        fragmentedQuery
      ].join(', ')} }`;
      // set param for dynamic fragment field
      const fragmentTypeParams = derivedTypesParams({
        isInterfaceType: isInterfaceTypeFragment,
        schema: resolveInfo.schema,
        schemaTypeName: derivedType
      });
      queryParams = { ...queryParams, ...fragmentTypeParams };
    }
  }
  const labelFilteringPredicate = `WHERE "${derivedType}" IN labels(${safeVariableName})`;
  const typeSpecificListComprehension = `[${safeVariableName} IN [${safeVariableName}] ${labelFilteringPredicate} | ${typeMapProjection}]`;
  return [typeSpecificListComprehension, queryParams];
};

// See: https://neo4j.com/docs/cypher-manual/current/syntax/operators/#syntax-concatenating-two-lists
const concatenateComposedTypeLists = ({ fragmentedQuery }) =>
  fragmentedQuery.length ? `head(${fragmentedQuery.join(` + `)})` : '';
