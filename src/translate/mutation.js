import {
  safeLabel,
  safeVar,
  getFilterParams,
  lowFirstLetter,
  isAddMutation,
  isCreateMutation,
  isUpdateMutation,
  isRemoveMutation,
  isMergeMutation,
  isDeleteMutation,
  computeOrderBy,
  innerFilterParams,
  paramsToString,
  getOuterSkipLimit,
  getMutationArguments,
  setPrimaryKeyValue,
  buildCypherParameters,
  initializeMutationParams,
  getMutationCypherDirective,
  splitSelectionParameters,
  isNeo4jType,
  isGraphqlScalarType,
  isGraphqlInterfaceType,
  isGraphqlUnionType,
  typeIdentifiers,
  getAdditionalLabels,
  getPayloadSelections,
  isGraphqlObjectType
} from '../utils';
import { getPrimaryKey } from '../augment/types/node/selection';
import { getNamedType, isInputObjectType } from 'graphql';
import {
  buildCypherSelection,
  isFragmentedSelection,
  mergeSelectionFragments
} from '../selections';
import _ from 'lodash';
import { isUnionTypeDefinition } from '../augment/types/types';
import { unwrapNamedType } from '../augment/fields';
import {
  getDirective,
  DirectiveDefinition,
  getDirectiveArgument
} from '../augment/directives';
import { analyzeMutationArguments } from '../augment/input-values';
import {
  getCypherParams,
  derivedTypesParams,
  buildMapProjection,
  fragmentType,
  processFilterArgument
} from './translate';

// Mutation API root operation branch
export const translateMutation = ({
  resolveInfo,
  context,
  first,
  offset,
  otherParams
}) => {
  const typeMap = resolveInfo.schema.getTypeMap();
  const { typeName, variableName } = typeIdentifiers(resolveInfo.returnType);
  const schemaType = resolveInfo.schema.getType(typeName);
  const selections = getPayloadSelections(resolveInfo);
  const outerSkipLimit = getOuterSkipLimit(first, offset);
  const orderByValue = computeOrderBy(resolveInfo, schemaType);
  const additionalNodeLabels = getAdditionalLabels(
    schemaType,
    getCypherParams(context)
  );
  const mutationTypeCypherDirective = getMutationCypherDirective(resolveInfo);
  const mutationMeta = resolveInfo.schema
    .getMutationType()
    .getFields()
    [resolveInfo.fieldName].astNode.directives.find(x => {
      return x.name.value === 'MutationMeta';
    });

  const fieldArguments = getMutationArguments(resolveInfo);
  const serializedParams = analyzeMutationArguments({
    fieldArguments,
    values: otherParams,
    resolveInfo
  });
  const params = initializeMutationParams({
    mutationMeta,
    resolveInfo,
    mutationTypeCypherDirective,
    first,
    otherParams: serializedParams,
    offset
  });

  const isInterfaceType = isGraphqlInterfaceType(schemaType);
  const isObjectType = isGraphqlObjectType(schemaType);
  const isUnionType = isGraphqlUnionType(schemaType);

  const usesFragments = isFragmentedSelection({ selections });
  const isFragmentedObjectType = usesFragments && isObjectType;
  const isFragmentedInterfaceType = usesFragments && isInterfaceType;

  const interfaceLabels =
    typeof schemaType.getInterfaces === 'function'
      ? schemaType.getInterfaces().map(i => i.name)
      : [];

  const unionLabels = getUnionLabels({ typeName, typeMap });
  const additionalLabels = [
    ...additionalNodeLabels,
    ...interfaceLabels,
    ...unionLabels
  ];

  const [schemaTypeFields, derivedTypeMap] = mergeSelectionFragments({
    schemaType,
    selections,
    isFragmentedObjectType,
    isFragmentedInterfaceType,
    isUnionType,
    typeMap,
    resolveInfo
  });

  let translation = ``;
  let translationParams = {};
  if (mutationTypeCypherDirective) {
    [translation, translationParams] = customMutation({
      resolveInfo,
      schemaType,
      schemaTypeFields,
      derivedTypeMap,
      isObjectType,
      isInterfaceType,
      isUnionType,
      usesFragments,
      selections,
      params,
      context,
      mutationTypeCypherDirective,
      variableName,
      orderByValue,
      outerSkipLimit,
      typeMap
    });
  } else if (isCreateMutation(resolveInfo)) {
    [translation, translationParams] = nodeCreate({
      resolveInfo,
      schemaType,
      selections,
      params,
      context,
      variableName,
      typeName,
      additionalLabels,
      typeMap
    });
  } else if (isDeleteMutation(resolveInfo)) {
    [translation, translationParams] = nodeDelete({
      resolveInfo,
      schemaType,
      selections,
      params,
      variableName,
      typeName,
      typeMap
    });
  } else if (isAddMutation(resolveInfo)) {
    [translation, translationParams] = relationshipCreate({
      resolveInfo,
      schemaType,
      selections,
      params,
      context
    });
  } else if (isUpdateMutation(resolveInfo) || isMergeMutation(resolveInfo)) {
    /**
     * TODO: Once we are no longer using the @MutationMeta directive
     * on relationship mutations, we will need to more directly identify
     * whether this Merge mutation if for a node or relationship
     */
    if (mutationMeta) {
      [translation, translationParams] = relationshipMergeOrUpdate({
        mutationMeta,
        resolveInfo,
        selections,
        schemaType,
        params,
        context
      });
    } else {
      [translation, translationParams] = nodeMergeOrUpdate({
        resolveInfo,
        variableName,
        typeName,
        selections,
        schemaType,
        additionalLabels,
        params,
        context,
        typeMap
      });
    }
  } else if (isRemoveMutation(resolveInfo)) {
    [translation, translationParams] = relationshipDelete({
      resolveInfo,
      schemaType,
      selections,
      params,
      context
    });
  } else {
    // throw error - don't know how to handle this type of mutation
    throw new Error(
      'Do not know how to handle this type of mutation. Mutation does not follow naming convention.'
    );
  }
  return [translation, translationParams];
};

// Custom write operation
const customMutation = ({
  params,
  context,
  mutationTypeCypherDirective,
  selections,
  variableName,
  schemaType,
  schemaTypeFields,
  derivedTypeMap,
  isObjectType,
  isInterfaceType,
  isUnionType,
  usesFragments,
  resolveInfo,
  orderByValue,
  outerSkipLimit,
  typeMap
}) => {
  const cypherParams = getCypherParams(context);
  const safeVariableName = safeVar(variableName);
  // FIXME: support IN for multiple values -> WHERE
  const argString = paramsToString(
    innerFilterParams(
      getFilterParams(params.params || params),
      null,
      null,
      true
    ),
    cypherParams
  );
  const args = getMutationArguments(resolveInfo);
  const cypherQueryArg = mutationTypeCypherDirective.arguments.find(x => {
    return x.name.value === 'statement';
  });
  const rootStatement = cypherQueryArg.value.value;
  const [nestedStatements, mutationStatement] = translateNestedMutations({
    args,
    mutationStatement: rootStatement,
    dataParams: params,
    typeMap,
    isRoot: true,
    isCustom: true
  });
  const cypherStatement = augmentCustomMutation({
    rootStatement: mutationStatement,
    nestedStatements,
    returnVariable: variableName
  });
  const [subQuery, subParams] = buildCypherSelection({
    selections,
    variableName,
    schemaType,
    resolveInfo,
    cypherParams
  });
  const isScalarType = isGraphqlScalarType(schemaType);
  const isNeo4jTypeOutput = isNeo4jType(schemaType.name);
  const isScalarField = isNeo4jTypeOutput || isScalarType;
  const { cypherPart: orderByClause } = orderByValue;
  const listVariable = `apoc.map.values(value, [keys(value)[0]])[0] `;
  const [mapProjection, labelPredicate] = buildMapProjection({
    isComputedMutation: true,
    listVariable,
    schemaType,
    schemaTypeFields,
    derivedTypeMap,
    isObjectType,
    isInterfaceType,
    isUnionType,
    usesFragments,
    safeVariableName,
    subQuery,
    resolveInfo
  });
  let query = '';
  if (labelPredicate) {
    query = `CALL apoc.cypher.doIt("${cypherStatement}", ${argString}) YIELD value
    ${!isScalarField ? labelPredicate : ''}AS ${safeVariableName}
    RETURN ${
      !isScalarField
        ? `${mapProjection} AS ${safeVariableName}${orderByClause}${outerSkipLimit}`
        : ''
    }`;
  } else {
    query = `CALL apoc.cypher.doIt("${cypherStatement}", ${argString}) YIELD value
    WITH ${listVariable}AS ${safeVariableName}
    RETURN ${safeVariableName} ${
      !isScalarField
        ? `{${
            isInterfaceType
              ? `${fragmentType(safeVariableName, schemaType.name)},`
              : ''
          }${subQuery}} AS ${safeVariableName}${orderByClause}${outerSkipLimit}`
        : ''
    }`;
  }
  const fragmentTypeParams = derivedTypesParams({
    isInterfaceType,
    isUnionType,
    schema: resolveInfo.schema,
    schemaTypeName: schemaType.name,
    usesFragments
  });
  params = { ...params, ...subParams, ...fragmentTypeParams };
  if (cypherParams) {
    params['cypherParams'] = cypherParams;
  }
  return [query, { ...params }];
};

const augmentCustomMutation = ({
  rootStatement = '',
  nestedStatements = '',
  returnVariable = ''
}) => {
  let augmented = rootStatement;
  if (nestedStatements) {
    const singleLine = rootStatement.replace(/\r?\n|\r/g, ' ');
    const newlinedWithClauses = singleLine.replace(
      /\r?RETURN|\r/gi,
      `\nRETURN`
    );
    let splitOnClause = newlinedWithClauses.split('\n');
    const lastClauseIndex = splitOnClause.length - 1;
    const lastClause = splitOnClause[lastClauseIndex];
    const endsWithReturnClause = lastClause.startsWith('RETURN');
    const [augmentedStatement, continueWithDefault] = augmentWithClause({
      statement: rootStatement,
      isRoot: true,
      returnVariable
    });
    const returnOutputTypeClause = `RETURN ${returnVariable}`;
    if (endsWithReturnClause) {
      // get RETURN clause for returnVariable (case-insensitive)
      const returnClauseRegExp = new RegExp(
        `s*\\RETURN\\s*${returnVariable}\\b`,
        'i'
      );
      const matched = lastClause.match(returnClauseRegExp);
      // require that the RETURN clause, if it exists, returns returnVariable exactly (case-sensitive)
      if (matched) {
        const match = matched[0];
        if (match.includes(returnVariable)) {
          // replace ending RETURN clause with possibly augmented WITH clause
          splitOnClause.splice(lastClauseIndex, 1, continueWithDefault);
          // add the existent nested mutations
          splitOnClause.push(nestedStatements);
          // default: return the mutation type output type node variable
          splitOnClause.push(returnOutputTypeClause);
        }
      }
    } else {
      // use root @cypher statement with possibly added WITH clause
      splitOnClause = [augmentedStatement];
      splitOnClause.push(nestedStatements);
      splitOnClause.push(returnOutputTypeClause);
    }
    augmented = splitOnClause.join('\n');
  }
  return augmented;
};

const nodeCreate = ({
  resolveInfo,
  schemaType,
  selections,
  params,
  context,
  variableName,
  typeName,
  additionalLabels,
  typeMap
}) => {
  let args = getMutationArguments(resolveInfo);
  const dataArgument = args.find(arg => arg.name.value === 'data');
  let paramKey = 'params';
  let dataParams = params[paramKey];
  let nestedStatements = '';
  // handle differences with experimental input object argument format
  if (dataArgument) {
    // config.experimental
    const unwrappedType = unwrapNamedType({ type: dataArgument.type });
    const name = unwrappedType.name;
    const inputType = typeMap[name];
    const inputValues = inputType.getFields();
    // get the input value AST definitions of the .data input object
    // use the .data key instead of the existing .params format
    paramKey = 'data';
    dataParams = dataParams[paramKey];
    // elevate .data to top level so it matches "data" argument
    params = {
      ...params,
      ...params.params,
      data: dataParams
    };
    // remove .params entry
    delete params.params;
    // translate nested mutations discovered in input object arguments
    [nestedStatements] = translateNestedMutations({
      args,
      dataParams: params,
      typeMap,
      isRoot: true
    });
    args = Object.values(inputValues).map(arg => arg.astNode);
  } else {
    // translate nested mutations discovered in input object arguments
    [nestedStatements] = translateNestedMutations({
      args,
      dataParams,
      typeMap,
      paramVariable: paramKey,
      isRoot: true
    });
  }

  // use apoc.create.uuid() to set a default value for @id field,
  // if no value for it is provided in dataParams
  const fieldMap = schemaType.getFields();
  const fields = Object.values(fieldMap).map(field => field.astNode);
  const primaryKey = getPrimaryKey({ fields });
  const primaryKeyStatement = setPrimaryKeyValue({
    args,
    params: dataParams,
    primaryKey
  });
  // build Cypher for root CREATE statement
  const safeVariableName = safeVar(variableName);
  const safeLabelName = safeLabel([typeName, ...additionalLabels]);
  const paramStatements = buildCypherParameters({
    args,
    statements: primaryKeyStatement,
    params,
    paramKey,
    resolveInfo,
    typeMap
  });
  const createStatement = `CREATE (${safeVariableName}:${safeLabelName} {${paramStatements.join(
    ','
  )}})`;
  // translate selection set
  const [subQuery, subParams] = buildCypherSelection({
    selections,
    variableName,
    schemaType,
    resolveInfo,
    cypherParams: getCypherParams(context)
  });
  params = { ...params, ...subParams };
  const translation = `${createStatement}${
    nestedStatements
      ? `
  WITH *
  ${nestedStatements}`
      : ''
  }`;
  const query = `
    ${translation}
    RETURN ${safeVariableName} {${subQuery}} AS ${safeVariableName}
  `;
  return [query, params];
};

const nodeMergeOrUpdate = ({
  resolveInfo,
  variableName,
  typeName,
  selections,
  schemaType,
  additionalLabels,
  params,
  context,
  typeMap
}) => {
  const safeVariableName = safeVar(variableName);
  const args = getMutationArguments(resolveInfo);
  let paramKey = 'params';
  let dataParams = params[paramKey];
  let nestedStatements = '';

  const selectionArgument = args.find(arg => arg.name.value === 'where');
  const dataArgument = args.find(arg => arg.name.value === 'data');

  const fieldMap = schemaType.getFields();
  const fields = Object.values(fieldMap).map(field => field.astNode);
  const primaryKey = getPrimaryKey({ fields });
  const primaryKeyArgName = primaryKey.name.value;

  let cypherOperation = '';
  let safeLabelName = safeLabel(typeName);
  if (isMergeMutation(resolveInfo)) {
    safeLabelName = safeLabel([typeName, ...additionalLabels]);
    cypherOperation = 'MERGE';
  } else if (isUpdateMutation(resolveInfo)) {
    cypherOperation = 'MATCH';
  }
  let query = ``;
  let paramUpdateStatements = [];
  if (selectionArgument && dataArgument) {
    // config.experimental
    // no need to use .params key in this argument design
    params = dataParams;
    const [propertyStatements, generatePrimaryKey] = translateNodeInputArgument(
      {
        selectionArgument,
        dataArgument,
        params,
        primaryKey,
        typeMap,
        fieldMap,
        resolveInfo,
        context
      }
    );
    let onMatchStatements = ``;
    if (propertyStatements.length > 0) {
      onMatchStatements = `SET ${safeVar(
        variableName
      )} += {${propertyStatements.join(',')}} `;
    }
    if (isMergeMutation(resolveInfo)) {
      const unwrappedType = unwrapNamedType({ type: selectionArgument.type });
      const name = unwrappedType.name;
      const inputType = typeMap[name];
      const inputValues = inputType.getFields();
      const selectionArgs = Object.values(inputValues).map(arg => arg.astNode);
      const selectionExpression = buildCypherParameters({
        args: selectionArgs,
        params,
        paramKey: 'where',
        resolveInfo,
        cypherParams: getCypherParams(context),
        typeMap
      });
      const onCreateProps = [...propertyStatements, ...generatePrimaryKey];
      let onCreateStatements = ``;
      if (onCreateProps.length > 0) {
        onCreateStatements = `SET ${safeVar(
          variableName
        )} += {${onCreateProps.join(',')}}`;
      }
      const keySelectionStatement = selectionExpression.join(',');
      query = `${cypherOperation} (${safeVariableName}:${safeLabelName}{${keySelectionStatement}})
ON CREATE
  ${onCreateStatements}
ON MATCH
  ${onMatchStatements}`;
    } else {
      const [predicate, serializedFilter] = translateNodeSelectionArgument({
        variableName,
        args,
        params,
        schemaType,
        resolveInfo
      });
      query = `${cypherOperation} (${safeVariableName}:${safeLabelName})${predicate}
${onMatchStatements}\n`;
      params = { ...params, ...serializedFilter };
    }
    [nestedStatements] = translateNestedMutations({
      args,
      dataParams,
      typeMap,
      isRoot: true
    });
  } else {
    [nestedStatements] = translateNestedMutations({
      args,
      dataParams,
      paramVariable: paramKey,
      typeMap,
      isRoot: true
    });
    const [primaryKeyParam, updateParams] = splitSelectionParameters(
      params,
      primaryKeyArgName,
      paramKey
    );
    paramUpdateStatements = buildCypherParameters({
      args,
      params: updateParams,
      paramKey: paramKey,
      resolveInfo,
      cypherParams: getCypherParams(context),
      typeMap
    });
    query = `${cypherOperation} (${safeVariableName}:${safeLabelName}{${primaryKeyArgName}: $params.${primaryKeyArgName}})
  `;
    if (paramUpdateStatements.length > 0) {
      query += `SET ${safeVariableName} += {${paramUpdateStatements.join(
        ','
      )}} `;
    }
    if (!params.params) params.params = {};
    params.params[primaryKeyArgName] = primaryKeyParam[primaryKeyArgName];
  }
  const [subQuery, subParams] = buildCypherSelection({
    selections,
    variableName,
    schemaType,
    resolveInfo,
    cypherParams: getCypherParams(context)
  });
  params = { ...params, ...subParams };
  query = `${query}${
    nestedStatements
      ? `
  WITH *
  ${nestedStatements}`
      : ''
  }RETURN ${safeVariableName} {${subQuery}} AS ${safeVariableName}`;
  return [query, params];
};

const nodeDelete = ({
  resolveInfo,
  selections,
  variableName,
  typeName,
  schemaType,
  typeMap,
  params
}) => {
  const safeVariableName = safeVar(variableName);
  const safeLabelName = safeLabel(typeName);
  const args = getMutationArguments(resolveInfo);
  const fieldMap = schemaType.getFields();
  const fields = Object.values(fieldMap).map(field => field.astNode);
  const primaryKey = getPrimaryKey({ fields });
  const primaryKeyArgName = primaryKey.name.value;
  let matchStatement = ``;
  const selectionArgument = args.find(arg => arg.name.value === 'where');
  if (selectionArgument) {
    const [predicate, serializedFilter] = translateNodeSelectionArgument({
      variableName,
      args,
      params,
      schemaType,
      resolveInfo
    });
    matchStatement = `MATCH (${safeVariableName}:${safeLabelName})${predicate}`;
    params = { ...params, ...serializedFilter };
  } else {
    matchStatement = `MATCH (${safeVariableName}:${safeLabelName} {${primaryKeyArgName}: $${primaryKeyArgName}})`;
  }
  const [nestedStatements] = translateNestedMutations({
    args,
    dataParams: params,
    typeMap,
    isRoot: true
  });
  const [subQuery, subParams] = buildCypherSelection({
    selections,
    variableName,
    schemaType,
    resolveInfo
  });
  params = { ...params, ...subParams };
  const deletionVariableName = safeVar(`${variableName}_toDelete`);
  let query = '';
  if (nestedStatements) {
    // Cannot execute a map projection on a deleted node in Neo4j
    // so the projection is executed and aliased before the delete
    query = `${matchStatement}
${nestedStatements}
WITH ${safeVariableName} AS ${deletionVariableName}, ${safeVariableName} {${subQuery}} AS ${safeVariableName}
DETACH DELETE ${deletionVariableName}
RETURN ${safeVariableName}`;
  } else {
    // Cannot execute a map projection on a deleted node in Neo4j
    // so the projection is executed and aliased before the delete
    query = `${matchStatement}
WITH ${safeVariableName} AS ${deletionVariableName}, ${safeVariableName} {${subQuery}} AS ${safeVariableName}
DETACH DELETE ${deletionVariableName}
RETURN ${safeVariableName}`;
  }
  return [query, params];
};

const translateNodeInputArgument = ({
  selectionArgument = {},
  dataArgument = {},
  params,
  primaryKey,
  typeMap,
  resolveInfo,
  context
}) => {
  const unwrappedType = unwrapNamedType({ type: dataArgument.type });
  const name = unwrappedType.name;
  const inputType = typeMap[name];
  const inputValues = inputType.getFields();
  const updateArgs = Object.values(inputValues).map(arg => arg.astNode);
  let propertyStatements = buildCypherParameters({
    args: updateArgs,
    params,
    paramKey: 'data',
    resolveInfo,
    cypherParams: getCypherParams(context),
    typeMap
  });
  let primaryKeyStatement = [];
  if (isMergeMutation(resolveInfo)) {
    const unwrappedType = unwrapNamedType({ type: selectionArgument.type });
    const name = unwrappedType.name;
    const inputType = typeMap[name];
    const inputValues = inputType.getFields();
    const selectionArgs = Object.values(inputValues).map(arg => arg.astNode);
    // check key selection values for @id key argument
    const primaryKeySelectionValue = setPrimaryKeyValue({
      args: selectionArgs,
      params: params['where'],
      primaryKey
    });
    const primaryKeyValue = setPrimaryKeyValue({
      args: updateArgs,
      params: params['data'],
      primaryKey
    });
    if (primaryKeySelectionValue.length && primaryKeyValue.length) {
      // apoc.create.uuid() statement returned for both, so a value exists in neither
      primaryKeyStatement = primaryKeySelectionValue;
    }
  }
  return [propertyStatements, primaryKeyStatement];
};

const translateNodeSelectionArgument = ({
  variableName,
  args,
  params,
  schemaType,
  resolveInfo
}) => {
  const [filterPredicates, serializedFilter] = processFilterArgument({
    argumentName: 'where',
    fieldArgs: args,
    schemaType,
    variableName,
    resolveInfo,
    params
  });
  const predicateClauses = [...filterPredicates]
    .filter(predicate => !!predicate)
    .join(' AND ');
  let predicate = ``;
  if (isMergeMutation(resolveInfo)) {
    predicate = predicateClauses;
  } else {
    predicate = predicateClauses ? ` WHERE ${predicateClauses} ` : '';
  }
  return [predicate, serializedFilter];
};

// Relation Add / Remove
const relationshipCreate = ({
  resolveInfo,
  selections,
  schemaType,
  params,
  context
}) => {
  let mutationMeta, relationshipNameArg, fromTypeArg, toTypeArg;
  try {
    mutationMeta = resolveInfo.schema
      .getMutationType()
      .getFields()
      [resolveInfo.fieldName].astNode.directives.find(x => {
        return x.name.value === 'MutationMeta';
      });
  } catch (e) {
    throw new Error(
      'Missing required MutationMeta directive on add relationship directive'
    );
  }
  try {
    relationshipNameArg = mutationMeta.arguments.find(x => {
      return x.name.value === 'relationship';
    });
    fromTypeArg = mutationMeta.arguments.find(x => {
      return x.name.value === 'from';
    });
    toTypeArg = mutationMeta.arguments.find(x => {
      return x.name.value === 'to';
    });
  } catch (e) {
    throw new Error(
      'Missing required argument in MutationMeta directive (relationship, from, or to)'
    );
  }

  const schemaTypeName = safeVar(schemaType);
  const cypherParams = getCypherParams(context);

  const args = getMutationArguments(resolveInfo);
  const typeMap = resolveInfo.schema.getTypeMap();

  const fromType = fromTypeArg.value.value;
  const fromSchemaType = resolveInfo.schema.getType(fromType);
  const fromAdditionalLabels = getAdditionalLabels(
    fromSchemaType,
    cypherParams
  );
  const fromLabel = safeLabel([fromType, ...fromAdditionalLabels]);
  const firstArg = args[0];
  const fromArgName = firstArg.name.value;
  const fromVar = `${lowFirstLetter(fromType)}_${fromArgName}`;
  const fromVariable = safeVar(fromVar);
  const fromInputArg = firstArg.type;
  const fromInputArgType = getNamedType(fromInputArg).type.name.value;
  const fromInputAst = typeMap[fromInputArgType].astNode;
  const fromFields = fromInputAst.fields;
  const fromCypherParam = fromFields[0].name.value;

  const toType = toTypeArg.value.value;
  const toSchemaType = resolveInfo.schema.getType(toType);
  const toAdditionalLabels = getAdditionalLabels(toSchemaType, cypherParams);
  const toLabel = safeLabel([toType, ...toAdditionalLabels]);
  const secondArg = args[1];
  const toArgName = secondArg.name.value;
  const toVar = `${lowFirstLetter(toType)}_${toArgName}`;
  const toVariable = safeVar(toVar);
  const toInputArg = secondArg.type;
  const toInputArgType = getNamedType(toInputArg).type.name.value;
  const toInputAst = typeMap[toInputArgType].astNode;
  const toFields = toInputAst.fields;
  const toCypherParam = toFields[0].name.value;

  const relationshipName = relationshipNameArg.value.value;
  const lowercased = relationshipName.toLowerCase();
  const relationshipLabel = safeLabel(relationshipName);
  const relationshipVariable = safeVar(lowercased + '_relation');

  const dataInputArg = args.find(e => e.name.value === 'data');
  const dataInputAst = dataInputArg
    ? typeMap[getNamedType(dataInputArg.type).type.name.value].astNode
    : undefined;
  const dataFields = dataInputAst ? dataInputAst.fields : [];
  const [subQuery, subParams] = buildCypherSelection({
    selections,
    schemaType,
    resolveInfo,
    parentSelectionInfo: {
      fromArgName,
      toArgName,
      [fromArgName]: fromVar,
      [toArgName]: toVar,
      variableName: lowercased
    },
    cypherParams: getCypherParams(context)
  });
  let nodeSelectionStatements = ``;
  const fromUsesWhereInput =
    fromInputArgType.startsWith('_') && fromInputArgType.endsWith('Where');
  const toUsesWhereInput =
    toInputArgType.startsWith('_') && toInputArgType.endsWith('Where');
  if (fromUsesWhereInput && toUsesWhereInput) {
    const [fromPredicate, serializedFromFilter] = processFilterArgument({
      argumentName: fromArgName,
      variableName: fromVar,
      schemaType: fromSchemaType,
      fieldArgs: args,
      resolveInfo,
      params
    });
    const fromClauses = [...fromPredicate]
      .filter(predicate => !!predicate)
      .join(' AND ');
    const [toPredicate, serializedToFilter] = processFilterArgument({
      argumentName: toArgName,
      variableName: toVar,
      schemaType: toSchemaType,
      fieldArgs: args,
      resolveInfo,
      params
    });
    const toClauses = [...toPredicate]
      .filter(predicate => !!predicate)
      .join(' AND ');
    const sourceNodeSelectionPredicate = fromClauses
      ? ` WHERE ${fromClauses} `
      : '';
    const targetNodeSelectionPredicate = toClauses
      ? ` WHERE ${toClauses} `
      : '';
    params = { ...params, ...serializedFromFilter };
    params = { ...params, ...serializedToFilter };
    nodeSelectionStatements = `MATCH (${fromVariable}:${fromLabel})${sourceNodeSelectionPredicate}
      MATCH (${toVariable}:${toLabel})${targetNodeSelectionPredicate}`;
  } else {
    nodeSelectionStatements = `MATCH (${fromVariable}:${fromLabel} {${fromCypherParam}: $${fromArgName}.${fromCypherParam}})
      MATCH (${toVariable}:${toLabel} {${toCypherParam}: $${toArgName}.${toCypherParam}})`;
  }
  const paramStatements = buildCypherParameters({
    args: dataFields,
    params,
    paramKey: 'data',
    resolveInfo,
    typeMap
  });
  params = { ...params, ...subParams };
  let query = `
      ${nodeSelectionStatements}
      CREATE (${fromVariable})-[${relationshipVariable}:${relationshipLabel}${
    paramStatements.length > 0 ? ` {${paramStatements.join(',')}}` : ''
  }]->(${toVariable})
      RETURN ${relationshipVariable} { ${subQuery} } AS ${schemaTypeName};
    `;
  return [query, params];
};

const relationshipDelete = ({
  resolveInfo,
  selections,
  schemaType,
  params,
  context
}) => {
  let mutationMeta, relationshipNameArg, fromTypeArg, toTypeArg;
  try {
    mutationMeta = resolveInfo.schema
      .getMutationType()
      .getFields()
      [resolveInfo.fieldName].astNode.directives.find(x => {
        return x.name.value === 'MutationMeta';
      });
  } catch (e) {
    throw new Error(
      'Missing required MutationMeta directive on add relationship directive'
    );
  }

  try {
    relationshipNameArg = mutationMeta.arguments.find(x => {
      return x.name.value === 'relationship';
    });
    fromTypeArg = mutationMeta.arguments.find(x => {
      return x.name.value === 'from';
    });
    toTypeArg = mutationMeta.arguments.find(x => {
      return x.name.value === 'to';
    });
  } catch (e) {
    throw new Error(
      'Missing required argument in MutationMeta directive (relationship, from, or to)'
    );
  }

  const schemaTypeName = safeVar(schemaType);
  const cypherParams = getCypherParams(context);

  const args = getMutationArguments(resolveInfo);
  const typeMap = resolveInfo.schema.getTypeMap();

  const fromType = fromTypeArg.value.value;
  const fromSchemaType = resolveInfo.schema.getType(fromType);
  const fromAdditionalLabels = getAdditionalLabels(
    resolveInfo.schema.getType(fromType),
    cypherParams
  );
  const fromLabel = safeLabel([fromType, ...fromAdditionalLabels]);
  const firstArg = args[0];
  const fromArgName = firstArg.name.value;
  const fromVar = `${lowFirstLetter(fromType)}_${fromArgName}`;
  const fromVariable = safeVar(fromVar);
  const fromInputArg = firstArg.type;
  const fromInputArgType = getNamedType(fromInputArg).type.name.value;
  const fromInputAst = typeMap[fromInputArgType].astNode;
  const fromFields = fromInputAst.fields;
  const fromCypherParam = fromFields[0].name.value;

  const toType = toTypeArg.value.value;
  const toSchemaType = resolveInfo.schema.getType(toType);
  const toAdditionalLabels = getAdditionalLabels(
    resolveInfo.schema.getType(toType),
    cypherParams
  );
  const toLabel = safeLabel([toType, ...toAdditionalLabels]);
  const secondArg = args[1];
  const toArgName = secondArg.name.value;
  const toVar = `${lowFirstLetter(toType)}_${toArgName}`;
  const toVariable = safeVar(toVar);

  const toInputArg = secondArg.type;
  const toInputArgType = getNamedType(toInputArg).type.name.value;
  const toInputAst = typeMap[toInputArgType].astNode;
  const toFields = toInputAst.fields;
  const toCypherParam = toFields[0].name.value;

  const relationshipName = relationshipNameArg.value.value;
  const relationshipVariable = safeVar(fromVar + toVar);
  const relationshipLabel = safeLabel(relationshipName);
  let nodeSelectionStatements = ``;
  const fromUsesWhereInput =
    fromInputArgType.startsWith('_') && fromInputArgType.endsWith('Where');
  const toUsesWhereInput =
    toInputArgType.startsWith('_') && toInputArgType.endsWith('Where');
  if (fromUsesWhereInput && toUsesWhereInput) {
    const [fromPredicate, serializedFromFilter] = processFilterArgument({
      argumentName: fromArgName,
      variableName: fromVar,
      schemaType: fromSchemaType,
      fieldArgs: args,
      resolveInfo,
      params
    });
    const fromClauses = [...fromPredicate]
      .filter(predicate => !!predicate)
      .join(' AND ');
    const [toPredicate, serializedToFilter] = processFilterArgument({
      argumentName: toArgName,
      variableName: toVar,
      schemaType: toSchemaType,
      fieldArgs: args,
      resolveInfo,
      params
    });
    const toClauses = [...toPredicate]
      .filter(predicate => !!predicate)
      .join(' AND ');
    const sourceNodeSelectionPredicate = fromClauses
      ? ` WHERE ${fromClauses} `
      : '';
    const targetNodeSelectionPredicate = toClauses
      ? ` WHERE ${toClauses} `
      : '';
    params = { ...params, ...serializedFromFilter };
    params = { ...params, ...serializedToFilter };
    nodeSelectionStatements = `MATCH (${fromVariable}:${fromLabel})${sourceNodeSelectionPredicate}
      MATCH (${toVariable}:${toLabel})${targetNodeSelectionPredicate}`;
  } else {
    nodeSelectionStatements = `MATCH (${fromVariable}:${fromLabel} {${fromCypherParam}: $${fromArgName}.${fromCypherParam}})
      MATCH (${toVariable}:${toLabel} {${toCypherParam}: $${toArgName}.${toCypherParam}})`;
  }

  const [subQuery, subParams] = buildCypherSelection({
    selections,
    schemaType,
    resolveInfo,
    parentSelectionInfo: {
      fromArgName,
      toArgName,
      [fromArgName]: '_' + fromVar,
      [toArgName]: '_' + toVar
    },
    cypherParams: getCypherParams(context)
  });
  const query = `
      ${nodeSelectionStatements}
      OPTIONAL MATCH (${fromVariable})-[${relationshipVariable}:${relationshipLabel}]->(${toVariable})
      DELETE ${relationshipVariable}
      WITH COUNT(*) AS scope, ${fromVariable} AS ${safeVar(
    `_${fromVar}`
  )}, ${toVariable} AS ${safeVar(`_${toVar}`)}
      RETURN {${subQuery}} AS ${schemaTypeName};
    `;
  params = { ...params, ...subParams };
  return [query, params];
};

const relationshipMergeOrUpdate = ({
  mutationMeta,
  resolveInfo,
  selections,
  schemaType,
  params,
  context
}) => {
  let query = '';
  let relationshipNameArg = undefined;
  let fromTypeArg = undefined;
  let toTypeArg = undefined;
  try {
    relationshipNameArg = mutationMeta.arguments.find(x => {
      return x.name.value === 'relationship';
    });
    fromTypeArg = mutationMeta.arguments.find(x => {
      return x.name.value === 'from';
    });
    toTypeArg = mutationMeta.arguments.find(x => {
      return x.name.value === 'to';
    });
  } catch (e) {
    throw new Error(
      'Missing required argument in MutationMeta directive (relationship, from, or to)'
    );
  }
  if (relationshipNameArg && fromTypeArg && toTypeArg) {
    const schemaTypeName = safeVar(schemaType);
    const cypherParams = getCypherParams(context);

    const args = getMutationArguments(resolveInfo);
    const typeMap = resolveInfo.schema.getTypeMap();

    const fromType = fromTypeArg.value.value;
    const fromSchemaType = resolveInfo.schema.getType(fromType);
    const fromAdditionalLabels = getAdditionalLabels(
      resolveInfo.schema.getType(fromType),
      cypherParams
    );
    const fromLabel = safeLabel([fromType, ...fromAdditionalLabels]);
    const firstArg = args[0];
    const fromArgName = firstArg.name.value;
    const fromVar = `${lowFirstLetter(fromType)}_${fromArgName}`;
    const fromVariable = safeVar(fromVar);
    const fromInputArg = firstArg.type;
    const fromInputArgType = getNamedType(fromInputArg).type.name.value;
    const fromInputAst = typeMap[fromInputArgType].astNode;
    const fromFields = fromInputAst.fields;
    const fromCypherParam = fromFields[0].name.value;

    const toType = toTypeArg.value.value;
    const toSchemaType = resolveInfo.schema.getType(toType);
    const toAdditionalLabels = getAdditionalLabels(
      resolveInfo.schema.getType(toType),
      cypherParams
    );
    const toLabel = safeLabel([toType, ...toAdditionalLabels]);
    const secondArg = args[1];
    const toArgName = secondArg.name.value;
    const toVar = `${lowFirstLetter(toType)}_${toArgName}`;
    const toVariable = safeVar(toVar);
    const toInputArg = secondArg.type;
    const toInputArgType = getNamedType(toInputArg).type.name.value;
    const toInputAst = typeMap[toInputArgType].astNode;
    const toFields = toInputAst.fields;
    const toCypherParam = toFields[0].name.value;

    const relationshipName = relationshipNameArg.value.value;
    const lowercased = relationshipName.toLowerCase();
    const relationshipLabel = safeLabel(relationshipName);
    const relationshipVariable = safeVar(lowercased + '_relation');

    const dataInputArg = args.find(e => e.name.value === 'data');
    const dataInputAst = dataInputArg
      ? typeMap[getNamedType(dataInputArg.type).type.name.value].astNode
      : undefined;
    const dataFields = dataInputAst ? dataInputAst.fields : [];

    let nodeSelectionStatements = ``;
    const fromUsesWhereInput =
      fromInputArgType.startsWith('_') && fromInputArgType.endsWith('Where');
    const toUsesWhereInput =
      toInputArgType.startsWith('_') && toInputArgType.endsWith('Where');
    if (fromUsesWhereInput && toUsesWhereInput) {
      const [fromPredicate, serializedFromFilter] = processFilterArgument({
        argumentName: fromArgName,
        variableName: fromVar,
        schemaType: fromSchemaType,
        fieldArgs: args,
        resolveInfo,
        params
      });
      const fromClauses = [...fromPredicate]
        .filter(predicate => !!predicate)
        .join(' AND ');
      const [toPredicate, serializedToFilter] = processFilterArgument({
        argumentName: toArgName,
        variableName: toVar,
        schemaType: toSchemaType,
        fieldArgs: args,
        resolveInfo,
        params
      });
      const toClauses = [...toPredicate]
        .filter(predicate => !!predicate)
        .join(' AND ');
      const sourceNodeSelectionPredicate = fromClauses
        ? ` WHERE ${fromClauses} `
        : '';
      const targetNodeSelectionPredicate = toClauses
        ? ` WHERE ${toClauses} `
        : '';
      params = { ...params, ...serializedFromFilter };
      params = { ...params, ...serializedToFilter };
      nodeSelectionStatements = `  MATCH (${fromVariable}:${fromLabel})${sourceNodeSelectionPredicate}
      MATCH (${toVariable}:${toLabel})${targetNodeSelectionPredicate}`;
    } else {
      nodeSelectionStatements = `  MATCH (${fromVariable}:${fromLabel} {${fromCypherParam}: $${fromArgName}.${fromCypherParam}})
      MATCH (${toVariable}:${toLabel} {${toCypherParam}: $${toArgName}.${toCypherParam}})`;
    }

    const [subQuery, subParams] = buildCypherSelection({
      selections,
      schemaType,
      resolveInfo,
      parentSelectionInfo: {
        fromArgName,
        toArgName,
        [fromArgName]: fromVar,
        [toArgName]: toVar,
        variableName: lowercased
      },
      cypherParams: getCypherParams(context)
    });

    const paramStatements = buildCypherParameters({
      args: dataFields,
      params,
      paramKey: 'data',
      resolveInfo,
      typeMap
    });

    let cypherOperation = '';
    if (isMergeMutation(resolveInfo)) {
      cypherOperation = 'MERGE';
    } else if (isUpdateMutation(resolveInfo)) {
      cypherOperation = 'MATCH';
    }

    query = `
    ${nodeSelectionStatements}
      ${cypherOperation} (${fromVariable})-[${relationshipVariable}:${relationshipLabel}]->(${toVariable})${
      paramStatements.length > 0
        ? `
      SET ${relationshipVariable} += {${paramStatements.join(',')}} `
        : ''
    }
      RETURN ${relationshipVariable} { ${subQuery} } AS ${schemaTypeName};
    `;
    params = { ...params, ...subParams };
  }
  return [query, params];
};

const translateNestedMutations = ({
  args = [],
  dataParams = {},
  paramVariable,
  mutationStatement = '',
  typeMap = {},
  isRoot = false,
  isCustom = false
}) => {
  const mappedDataParams = mapMutationParams({ params: dataParams });
  const statements = [];
  args.forEach(arg => {
    const argName = arg.name.value;
    const typeName = unwrapNamedType({ type: arg.type }).name;
    const inputType = typeMap[typeName];
    if (isInputObjectType(inputType) && dataParams[argName] !== undefined) {
      let paramName = argName;
      if (isRoot) paramName = paramVariable;
      let rootUsesListVariable = false;
      let augmentedStatement = '';
      const argumentIsArray = Array.isArray(dataParams[argName]);
      const isCustomRootListArgument = isCustom && isRoot && argumentIsArray;
      if (isCustomRootListArgument) {
        rootUsesListVariable = includesCypherUnwindClause({
          typeName,
          argName,
          statement: mutationStatement
        });
        [augmentedStatement] = augmentWithClause({
          statement: mutationStatement,
          inputFieldTypeName: typeName,
          isCustom,
          rootUsesListVariable
        });
      }
      const statement = translateNestedMutation({
        paramName,
        dataParams: mappedDataParams,
        args: [arg],
        parentTypeName: typeName,
        paramVariable,
        typeMap,
        isRoot,
        isCustom,
        argumentIsArray,
        rootUsesListVariable,
        isCustomRootListArgument,
        mutationStatement
      });
      if (statement.length) {
        // inputType has at least one @cypher input field
        statements.push(...statement);
        if (isCustomRootListArgument) {
          mutationStatement = augmentedStatement;
        }
      } else {
        let paramName = argName;
        // inputType did not have a @cypher input field, so keep looking
        const nestedParams = mappedDataParams[argName];
        const nestedArgs = Object.values(inputType.getFields()).map(
          arg => arg.astNode
        );
        if (isCustomRootListArgument) {
          [augmentedStatement] = augmentWithClause({
            statement: mutationStatement,
            inputFieldTypeName: typeName,
            isCustom,
            rootUsesListVariable
          });
        }
        const statement = translateNestedMutation({
          isNestedParam: true,
          isCustom,
          paramName,
          args: nestedArgs,
          dataParams: nestedParams,
          parentTypeName: typeName,
          paramVariable,
          typeMap,
          isRoot,
          argumentIsArray,
          rootUsesListVariable,
          isCustomRootListArgument,
          mutationStatement
        });
        if (statement.length) {
          statements.push(...statement);
          if (isCustomRootListArgument) {
            mutationStatement = augmentedStatement;
          }
        }
      }
    }
  });
  const nestedStatements = statements.join('\n');
  return [nestedStatements, mutationStatement];
};

const includesCypherUnwindClause = ({
  typeName = '',
  argName = '',
  statement = ''
}) => {
  const unwindRegExp = new RegExp(
    `\\s*\\UNWIND\\s*\\$${argName}\\s*\\AS\\s*${typeName}`,
    'i'
  );
  const matched = statement.match(unwindRegExp);
  let hasUnwindClause = false;
  if (matched) {
    const match = matched[0];
    const includesParameter = match.includes(`$${argName}`);
    const includesVariable = match.includes(typeName);
    if (includesParameter && includesVariable) {
      hasUnwindClause = true;
    }
  }
  return hasUnwindClause;
};

const translateNestedMutation = ({
  args = [],
  paramName,
  isRoot,
  isNestedParam = false,
  isCustom = false,
  argumentIsArray = false,
  rootUsesListVariable = false,
  dataParams = {},
  paramVariable,
  parentTypeName,
  typeMap = {},
  isCustomRootListArgument,
  mutationStatement
}) => {
  const translations = [];
  // For each defined argument
  args.forEach(arg => {
    const argName = arg.name.value;
    const argumentTypeName = unwrapNamedType({ type: arg.type }).name;
    const argumentType = typeMap[argumentTypeName];
    const argValue = dataParams[argName];
    if (isInputObjectType(argumentType) && argValue !== undefined) {
      Object.keys(argValue).forEach(name => {
        translations.push(
          ...translateNestedMutationInput({
            name,
            argName,
            argValue,
            argumentType,
            paramName,
            parentTypeName,
            paramVariable,
            isRoot,
            isNestedParam,
            isCustom,
            argumentIsArray,
            rootUsesListVariable,
            typeMap,
            isCustomRootListArgument,
            mutationStatement
          })
        );
      });
    }
  });
  return translations;
};

const translateNestedMutationInput = ({
  name,
  argName,
  argValue,
  argumentType,
  parentTypeName,
  paramName,
  paramVariable,
  isRoot,
  isNestedParam,
  isCustom,
  argumentIsArray,
  rootUsesListVariable,
  typeMap,
  isCustomRootListArgument,
  mutationStatement
}) => {
  const translations = [];
  const inputFields = argumentType.getFields();
  const inputField = inputFields[name];
  if (inputField) {
    const inputFieldAst = inputFields[name].astNode;
    const inputFieldTypeName = unwrapNamedType({ type: inputFieldAst.type })
      .name;
    const inputFieldType = typeMap[inputFieldTypeName];
    const customCypher = getDirective({
      directives: inputFieldAst.directives,
      name: DirectiveDefinition.CYPHER
    });
    if (isInputObjectType(inputFieldType)) {
      if (customCypher) {
        const inputFieldTypeName = inputFieldType.name;
        const statement = getDirectiveArgument({
          directive: customCypher,
          name: 'statement'
        });
        let nestedParamVariable = paramVariable ? paramVariable : '';
        if (isRoot) {
          nestedParamVariable = paramName;
        } else if (isNestedParam) {
          // recursively builds nested cypher variable path
          nestedParamVariable = `${paramVariable}.${paramName}`;
        }
        if (rootUsesListVariable) {
          nestedParamVariable = parentTypeName;
        }
        const translated = buildMutationSubQuery({
          inputFieldTypeName,
          inputFieldType,
          statement,
          name,
          parentTypeName,
          paramVariable: nestedParamVariable,
          argName,
          argValue,
          typeMap,
          isRoot,
          isNestedParam,
          argumentIsArray,
          rootUsesListVariable,
          isCustomRootListArgument,
          mutationStatement
        });
        if (translated) translations.push(translated);
      } else if (isNestedParam) {
        // keep looking
        const nestedArgs = Object.values(argumentType.getFields()).map(
          arg => arg.astNode
        );
        let nestedParamVariable = `${
          paramVariable ? `${paramVariable}.` : ''
        }${paramName}`;
        let nestedParamName = argName;
        if (isRoot) {
          // recursively builds cypher variable path
          nestedParamName = `${paramName ? `${paramName}.` : ''}${argName}`;
        }
        const statement = translateNestedMutation({
          isNestedParam: true,
          isRoot,
          paramName: nestedParamName,
          args: nestedArgs,
          dataParams: argValue,
          paramVariable: nestedParamVariable,
          typeMap,
          isCustom,
          mutationStatement,
          isCustomRootListArgument
        });
        const nestedStatements = statement.join('\n');
        if (nestedStatements) translations.push(nestedStatements);
      }
    }
  }
  return translations;
};

const augmentWithClause = ({
  statement,
  inputFieldTypeName,
  isCustom,
  isRoot,
  returnVariable,
  rootUsesListVariable
}) => {
  const singleLine = statement.replace(/\r?\n|\r/g, ' ');
  // find every WITH and add a newline character after each WITH
  const newlinedWithClauses = singleLine.replace(/\r?WITH|\r/gi, `\nWITH`);
  // reutnr the split of the single statement based on newlines specific to clause
  const splitOnWithClauses = newlinedWithClauses.split('\n');
  // get the last line, check if it is a WITH clause
  const lastWithClause = splitOnWithClauses[splitOnWithClauses.length - 1];
  const endsWithWithClause = lastWithClause.startsWith('WITH');
  let continueWith = `WITH ${inputFieldTypeName} AS _${inputFieldTypeName}`;
  if (isRoot) {
    if (endsWithWithClause) {
      const trimmed = lastWithClause.trim();
      const withRemoved = trimmed.substr(4);
      const withVariables = withRemoved.split(',');
      const trimmedVariables = withVariables.map(variable => variable.trim());
      if (!trimmedVariables.includes(returnVariable)) {
        trimmedVariables.unshift(returnVariable);
      }
      const joined = trimmedVariables.join(', ');
      continueWith = `WITH ${joined}`;
      splitOnWithClauses[splitOnWithClauses.length - 1] = continueWith;
    } else {
      // default
      continueWith = `WITH ${returnVariable}`;
      splitOnWithClauses[splitOnWithClauses.length - 1] = continueWith;
    }
  } else if (endsWithWithClause) {
    const trimmed = lastWithClause.trim();
    const withRemoved = trimmed.substr(4);
    const firstCommentIndex = withRemoved.indexOf('//');
    const firstParamIndex = withRemoved.indexOf(inputFieldTypeName);
    // inputFieldTypeName exist in the provided WITH clause
    if (firstParamIndex !== -1) {
      if (firstCommentIndex !== -1) {
        // it might be in a // comment though, for some reason
        if (firstParamIndex > firstCommentIndex) {
          // it is, so add it
          splitOnWithClauses[splitOnWithClauses.length - 1] = `${continueWith}${
            withRemoved ? `, ${withRemoved}` : ''
          }`;
        }
      } else if (isCustom) {
        //! REFACTOR THREE
        if (rootUsesListVariable) {
          // progressively augment the root WITH statement
          const withVariables = withRemoved.split(',');
          const trimmedVariables = withVariables.map(variable =>
            variable.trim()
          );
          const inputTypeVariableIndex = trimmedVariables.indexOf(
            inputFieldTypeName
          );
          if (inputTypeVariableIndex !== -1) {
            trimmedVariables.splice(
              inputTypeVariableIndex,
              1,
              `${inputFieldTypeName} AS _${inputFieldTypeName}`
            );
            const joined = trimmedVariables.join(', ');
            continueWith = `WITH ${joined}`;
            splitOnWithClauses[
              splitOnWithClauses.length - 1
            ] = `${continueWith}`;
          } else {
            splitOnWithClauses[
              splitOnWithClauses.length - 1
            ] = `${continueWith}${withRemoved ? `, ${withRemoved}` : ''}`;
          }
        }
      }
    } else if (isCustom) {
      if (rootUsesListVariable) {
        //! REFACTOR THREE
        // progressively augment the root WITH statement
        const withVariables = withRemoved.split(',');
        const trimmedVariables = withVariables.map(variable => variable.trim());
        const inputTypeVariableIndex = trimmedVariables.indexOf(
          inputFieldTypeName
        );
        if (inputTypeVariableIndex !== -1) {
          trimmedVariables.splice(
            inputTypeVariableIndex,
            1,
            `${inputFieldTypeName} AS _${inputFieldTypeName}`
          );
          const joined = trimmedVariables.join(', ');
          continueWith = `WITH ${joined}`;
          splitOnWithClauses[splitOnWithClauses.length - 1] = `${continueWith}`;
        } else {
          splitOnWithClauses[splitOnWithClauses.length - 1] = `${continueWith}${
            withRemoved ? `, ${withRemoved}` : ''
          }`;
        }
      }
    } else {
      // it does not exist, so add it
      splitOnWithClauses[splitOnWithClauses.length - 1] = `${continueWith}${
        withRemoved ? `, ${withRemoved}` : ''
      }`;
    }
  } else {
    // default
    splitOnWithClauses.push(continueWith);
  }
  const augmented = splitOnWithClauses.join('\n');
  return [augmented, continueWith, rootUsesListVariable];
};

const buildMutationSubQuery = ({
  inputFieldTypeName,
  inputFieldType,
  statement,
  name,
  parentTypeName,
  paramVariable,
  argName,
  argValue,
  typeMap,
  isRoot,
  argumentIsArray,
  isNestedParam,
  rootUsesListVariable,
  isCustomRootListArgument,
  mutationStatement
}) => {
  let statements = '';
  const inputFieldTypeFields = inputFieldType.getFields();
  const nestedArgs = Object.values(inputFieldTypeFields).map(
    arg => arg.astNode
  );
  const nestedDataParams = argValue[name];
  const mappedDataParams = mapMutationParams({ params: nestedDataParams });
  const [nestedMutationStatements] = translateNestedMutations({
    args: nestedArgs,
    dataParams: mappedDataParams,
    paramVariable: inputFieldTypeName,
    typeMap,
    mutationStatement
  });
  if (nestedMutationStatements) {
    const [
      augmentedStatement,
      continueWith,
      unwindsListArgument
    ] = augmentWithClause({
      statement,
      inputFieldTypeName
    });
    // persist the parameter variable only if there are further
    // nested translations
    statements = `${augmentedStatement}${nestedMutationStatements}`;
  } else {
    // otherwise, we are at a leaf endpoint
    statements = statement;
  }
  //! REFACTOR ONE
  // generalized solution for possible edge case where the current and
  // nested input type names are the same
  if (!isRoot && paramVariable) {
    paramVariable = `_${paramVariable}`;
  }
  let paramPath = `${
    paramVariable ? `${paramVariable}.` : ''
  }${argName}.${name}`;
  // If we are at root, and if the argument type is not a list when
  // this is a custom @cypher mutation
  if (isRoot && (!isNestedParam || !argumentIsArray)) {
    paramPath = `$${paramPath}`;
  }
  return cypherSubQuery({
    argName,
    name,
    paramPath,
    inputFieldTypeName,
    parentTypeName,
    paramVariable,
    statements,
    isNestedParam,
    rootUsesListVariable,
    mutationStatement,
    isCustomRootListArgument
  });
};

const cypherSubQuery = ({
  argName = '',
  name = '',
  paramPath = '',
  inputFieldTypeName = '',
  parentTypeName = '',
  paramVariable = '',
  statements = '',
  isNestedParam = false,
  rootUsesListVariable = false,
  isCustomRootListArgument = false
}) => {
  let unwindStatement = `UNWIND ${paramPath} AS ${inputFieldTypeName}`;
  if (isCustomRootListArgument) {
    if (rootUsesListVariable) {
      if (isNestedParam) {
        unwindStatement = `UNWIND _${parentTypeName}.${argName}.${name} AS ${inputFieldTypeName}`;
      } else {
        unwindStatement = `UNWIND _${paramVariable}.${name} AS ${inputFieldTypeName}`;
      }
    } else {
      unwindStatement = `UNWIND $${argName} AS _${argName}
  UNWIND _${argName}.${name} as ${inputFieldTypeName}`;
    }
  }
  return `
CALL {
  WITH *
  ${unwindStatement}
  ${statements}
  RETURN COUNT(*) AS _${argName}_${name}_
}`;
};

const mapMutationParams = ({ params = {} }) => {
  return Object.entries(params).reduce((mapped, [name, param]) => {
    if (param === null) {
      mapped[name] = true;
    } else {
      mapped[name] = mapMutationParam({ param });
    }
    return mapped;
  }, {});
};

const mapMutationParam = ({ param }) => {
  let mapped = {};
  if (Array.isArray(param)) {
    const firstElement = param[0];
    if (typeof firstElement === 'object' && !Array.isArray(firstElement)) {
      param.forEach(listObject => {
        const subMapped = mapMutationParams({
          params: listObject
        });
        mapped = {
          ...mapped,
          ...subMapped
        };
      });
      // list of object values
      return mapped;
    } else {
      // list argument of non-object values
      return true;
    }
  } else if (typeof param === 'object') {
    if (param === null) return true;
    return mapMutationParams({
      params: param
    });
  }
  return true;
};

const getUnionLabels = ({ typeName = '', typeMap = {} }) => {
  const unionLabels = [];
  Object.keys(typeMap).map(key => {
    const definition = typeMap[key];
    const astNode = definition.astNode;
    if (isUnionTypeDefinition({ definition: astNode })) {
      const types = definition.getTypes();
      const unionTypeName = definition.name;
      if (types.find(type => type.name === typeName)) {
        unionLabels.push(unionTypeName);
      }
    }
  });
  return unionLabels;
};
