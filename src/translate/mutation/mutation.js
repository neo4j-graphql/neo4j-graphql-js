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
} from '../../utils';
import { getPrimaryKey } from '../../augment/types/node/selection';
import { getNamedType } from 'graphql';
import {
  buildCypherSelection,
  isFragmentedSelection,
  mergeSelectionFragments
} from '../../selections';
import _ from 'lodash';
import { isUnionTypeDefinition } from '../../augment/types/types';
import { unwrapNamedType } from '../../augment/fields';
import { analyzeMutationArguments } from '../../augment/input-values';
import {
  getCypherParams,
  derivedTypesParams,
  buildMapProjection,
  fragmentType,
  processFilterArgument
} from '../translate';
import { ApolloError } from 'apollo-server-errors';
import { translateNestedMutations } from './input-values';

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
    throw new ApolloError(
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
  const nestedStatements = translateNestedMutations({
    inputFields: args,
    parameterData: params,
    rootStatement,
    typeMap
  });
  const cypherStatement = augmentCustomMutation({
    rootStatement: rootStatement,
    nestedStatements
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
  nestedStatements = ''
}) => {
  let augmented = rootStatement;
  if (nestedStatements) {
    const statement = rootStatement.replace(/\r?\n|\r/g, ' ');
    const newlinedWithClauses = statement.replace(/\r?RETURN|\r/gi, `\nRETURN`);
    let splitOnClause = newlinedWithClauses.split('\n');
    const returnClauseIndex = splitOnClause.length - 1;
    const returnClause = splitOnClause[returnClauseIndex];
    const endsWithReturnClause = returnClause.startsWith('RETURN');
    // require that the root @cypher statement have a RETURN clause
    if (endsWithReturnClause) {
      const rootWithClause = `WITH *`;
      const returnClause = splitOnClause.splice(
        returnClauseIndex,
        1,
        rootWithClause
      );
      // add the existent nested mutations
      splitOnClause.push(nestedStatements);
      splitOnClause.push(returnClause[0]);
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
    nestedStatements = translateNestedMutations({
      inputFields: args,
      parameterData: params,
      typeMap
    });
    args = Object.values(inputValues).map(arg => arg.astNode);
  } else {
    // translate nested mutations discovered in input object arguments
    nestedStatements = translateNestedMutations({
      inputFields: args,
      parameterData: dataParams,
      paramVariable: paramKey,
      typeMap
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
    nestedStatements = translateNestedMutations({
      inputFields: args,
      parameterData: dataParams,
      typeMap
    });
  } else {
    nestedStatements = translateNestedMutations({
      inputFields: args,
      parameterData: dataParams,
      paramVariable: paramKey,
      typeMap
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
  const nestedStatements = translateNestedMutations({
    inputFields: args,
    parameterData: params,
    typeMap
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
