import { TypeWrappers, unwrapNamedType } from '../../augment/fields';
import {
  getDirective,
  DirectiveDefinition,
  getDirectiveArgument
} from '../../augment/directives';
import { isInputObjectType } from 'graphql';
import _ from 'lodash';

export const translateNestedMutations = ({
  inputFields = [],
  parameterData = {},
  paramVariable = '',
  parameterMap,
  parentFieldName = '',
  parentIsListArgument = false,
  isListArgument = false,
  isRootArgument = false,
  rootUsesListVariable = false,
  rootStatement = '',
  typeMap = {}
}) => {
  if (!_.isObject(parameterMap)) {
    parameterMap = mapParameters(parameterData);
    isRootArgument = true;
  }
  return inputFields
    .reduce((translations, field) => {
      const { name, type } = field;
      const fieldName = name.value;
      const unwrappedType = unwrapNamedType({ type });
      const inputTypeName = unwrappedType.name;
      const inputTypeWrappers = unwrappedType.wrappers;
      const inputType = typeMap[inputTypeName];
      const nestedParameterMap = parameterMap[fieldName];
      if (isInputObjectType(inputType) && _.isObject(nestedParameterMap)) {
        [isListArgument, rootUsesListVariable] = decideCypherParameterArity({
          rootStatement,
          fieldName,
          inputTypeName,
          inputTypeWrappers,
          paramVariable,
          isRootArgument,
          rootUsesListVariable,
          isListArgument
        });
        const cypherDirective = getDirective({
          directives: field.directives,
          name: DirectiveDefinition.CYPHER
        });
        // get the path to the parameter data to iterate over
        const nestedParamVariable = decideCypherParameter({
          paramVariable,
          fieldName,
          inputTypeName,
          cypherDirective,
          isRootArgument,
          rootUsesListVariable
        });
        if (cypherDirective) {
          // wrap this Cypher statement in a subquery
          // and recurse for any nested @cypher fields
          const translated = translateNestedMutation({
            paramVariable: nestedParamVariable,
            parameterMap: nestedParameterMap,
            cypherDirective,
            inputType,
            inputTypeName,
            isListArgument,
            parentIsListArgument,
            parentFieldName,
            fieldName,
            isRootArgument,
            rootUsesListVariable,
            typeMap
          });
          if (translated) {
            translations.push(translated);
          }
        } else {
          // continue looking for sibling @cypher fields
          const nestedStatements = translateNestedMutations({
            inputFields: getFieldAstNodes(inputType),
            paramVariable: nestedParamVariable,
            parentFieldName: fieldName,
            parentIsListArgument: isListArgument,
            parameterMap: nestedParameterMap,
            isRootArgument,
            rootUsesListVariable,
            rootStatement,
            typeMap
          });
          if (nestedStatements) {
            // these subqueries are siblings within this scope,
            // but have longer paths to nested @cypher fields
            translations.push(nestedStatements);
          }
        }
      }
      return translations;
    }, [])
    .join('\n');
};

const translateNestedMutation = ({
  paramVariable,
  parameterMap,
  inputType,
  inputTypeName,
  cypherDirective,
  fieldName,
  typeMap,
  parentIsListArgument,
  parentFieldName,
  isRootArgument,
  isListArgument,
  rootUsesListVariable
}) => {
  // recurse to handle child @cypher input
  const nestedStatements = translateNestedMutations({
    inputFields: getFieldAstNodes(inputType),
    paramVariable: inputTypeName,
    parentIsListArgument: isListArgument,
    parentFieldName: fieldName,
    parameterMap,
    typeMap
  });
  const cypherStatement = augmentWithClauses({
    cypherDirective,
    inputTypeName,
    nestedStatements
  });
  // the parameter data for this @cypher field is iterated
  // over using a Cypher UNWIND clause
  const unwindClause = decideUnwindClause({
    fieldName,
    inputTypeName,
    parentIsListArgument,
    parentFieldName,
    paramVariable,
    isRootArgument,
    rootUsesListVariable
  });
  const openVariableScope = `WITH *`;
  const closeVariableScope = `RETURN COUNT(*) AS _${
    parentFieldName ? `${parentFieldName}_` : ''
  }${fieldName}_`;
  return `
CALL {
  ${openVariableScope}
  ${unwindClause}
  ${cypherStatement}${nestedStatements}
  ${closeVariableScope}
}`;
};

const decideCypherParameterArity = ({
  rootStatement = '',
  fieldName = '',
  inputTypeName = '',
  inputTypeWrappers = {},
  paramVariable = '',
  isRootArgument = false,
  rootUsesListVariable = false,
  isListArgument = false
}) => {
  if (isRootArgument) {
    isListArgument = inputTypeWrappers[TypeWrappers.LIST_TYPE];
    if (!paramVariable) {
      // These properties are used to identify cases where the root
      // Cypher statement of a @cypher mutation already unwinds a list
      // argument containing nested @cypher fields
      rootUsesListVariable = includesCypherUnwindClause({
        typeName: inputTypeName,
        fieldName,
        statement: rootStatement
      });
    }
  }
  return [isListArgument, rootUsesListVariable];
};

const includesCypherUnwindClause = ({
  typeName = '',
  fieldName = '',
  statement = ''
}) => {
  const unwindRegExp = new RegExp(
    `\\s*\\UNWIND\\s*\\$${fieldName}\\s*\\AS\\s*${typeName}`,
    'i'
  );
  const matched = statement.match(unwindRegExp);
  let hasUnwindClause = false;
  if (matched) {
    const match = matched[0];
    const includesParameter = match.includes(`$${fieldName}`);
    const includesVariable = match.includes(typeName);
    if (includesParameter && includesVariable) {
      hasUnwindClause = true;
    }
  }
  return hasUnwindClause;
};

const decideCypherParameter = ({
  paramVariable,
  inputTypeName,
  fieldName,
  cypherDirective,
  isRootArgument,
  rootUsesListVariable
}) => {
  if (paramVariable) {
    if (cypherDirective) {
      if (isRootArgument) {
        if (!rootUsesListVariable) {
          // Cypher parameter prefix
          return `$${paramVariable}`;
        }
        return paramVariable;
      }
      // prefixed with _ to correspond to alias
      // of parent UNWIND variable
      return `_${paramVariable}.${fieldName}`;
    }
    return `${paramVariable}.${fieldName}`;
  }
  if (rootUsesListVariable) {
    // root @cypher mutation unwinds this argument
    // so continue with its Cypher variable
    return inputTypeName;
  }
  return fieldName;
};

const decideUnwindClause = ({
  fieldName,
  inputTypeName,
  parentFieldName,
  parentIsListArgument,
  paramVariable,
  isRootArgument,
  rootUsesListVariable
}) => {
  if (isRootArgument) {
    if (parentIsListArgument && !rootUsesListVariable) {
      // two-dimensional unwind for root list arguments
      // not already unwound by the root Cypher statement
      return `UNWIND ${paramVariable} AS _${parentFieldName}
  UNWIND _${parentFieldName}.${fieldName} as ${inputTypeName}`;
    }
    return `UNWIND ${paramVariable}.${fieldName} AS ${inputTypeName}`;
  }
  return `UNWIND ${paramVariable} AS ${inputTypeName}`;
};

const augmentWithClauses = ({
  inputTypeName = '',
  nestedStatements = [],
  cypherDirective
}) => {
  let statement = getDirectiveArgument({
    directive: cypherDirective,
    name: 'statement'
  });
  let openingWithClause = '';
  let endingWithClause = '';
  if (statement) {
    const lowercasedStatement = statement.toLowerCase();
    const isCommentedRegExp = new RegExp(`with(?!\/*.*)`, 'i');
    let firstWithIndex = lowercasedStatement.indexOf('with');
    isCommentedRegExp.lastIndex = firstWithIndex;
    let lastWithIndex = lowercasedStatement.lastIndexOf('with');
    // this makes the regex match "sticky", which begins the match from the given index
    isCommentedRegExp.lastIndex = lastWithIndex;
    if (firstWithIndex !== -1) {
      const firstWithMatch = statement.substr(firstWithIndex);
      // so, to determine which is at the top, see that the index is actually 0, test this
      if (firstWithMatch) {
        // there is only one WITH clause
        if (firstWithIndex === lastWithIndex) {
          const onlyMatch = statement.substr(firstWithIndex);
          if (firstWithIndex === 0) {
            // the only WITH clause also begins at index 0, so it's an opening WITH clause
            openingWithClause = onlyMatch;
          } else {
            // assume the last WITH clause is at the end of the statement
            endingWithClause = onlyMatch;
          }
        } else if (lastWithIndex !== -1) {
          // there are two or more WITH clauses
          const firstMatch = statement.substr(firstWithIndex);
          const lastMatch = statement.substr(lastWithIndex);
          if (firstWithIndex === 0) openingWithClause = firstMatch;
          endingWithClause = lastMatch;
        }
        if (openingWithClause && endingWithClause) {
          openingWithClause = openingWithClause.substr(0, lastWithIndex);
        }
        if (openingWithClause) {
          // add a Cypher variable for inputTypeName - the name of the parent
          // UNWIND variable - to keep it available within the proceeding Cypher
          statement = augmentWithClause({
            withClause: openingWithClause,
            inputTypeName,
            isImportClause: true
          });
        }
        if (endingWithClause) {
          // add an alias for the Cypher variable from the parent UNWIND statement,
          // to allow the same input type to be used again by a nested UNWIND,
          // preventing variable name conflicts
          const augmentedWithClause = augmentWithClause({
            withClause: endingWithClause,
            inputTypeName,
            isExportClause: true
          });
          if (openingWithClause) {
            // if there is also a WITH clause importing variables,
            // then it has already been augmented (above) and equal to statement,
            // so the now augmented exporting WITH clause is appended
            statement = `${statement}${augmentedWithClause}`;
          } else {
            // otherwise, statement is still unmodified, so get everything before
            // the exporting WITH clause, appending after it the augmented clause
            const beforeEndingWith = statement.substr(0, lastWithIndex);
            statement = `${beforeEndingWith}\n${augmentedWithClause}`;
          }
        }
      }
    }
  }
  if (!endingWithClause && nestedStatements.length) {
    const paramVariable = `${inputTypeName} AS _${inputTypeName}`;
    // continue with all Cypher variables in scope and an alias of the input type
    endingWithClause = `WITH *, ${paramVariable}`;
    statement = `${statement}\n${endingWithClause}`;
  }
  return statement;
};

const augmentWithClause = ({
  withClause = '',
  inputTypeName = '',
  isImportClause = false,
  isExportClause = false
}) => {
  // find the index of the first comma, for checking if this is a variable list
  const firstCommaIndex = withClause.indexOf(',');
  // regex to check if this clause begins with the pattern WITH *
  const withEverythingRegex = new RegExp(`WITH\\s*\\\*+`, 'i');
  const continuesWithEverything = withClause.match(withEverythingRegex);
  // assume the clause is not a variable list, e.g., WITH *, ... or WITH x, ...
  let isVariableList = false;
  // assume the clause does not begin with WITH *
  let isWithAsterisk = false;
  let augmentedWithClause = withClause;
  // remove the WITH from the beginning of the clause
  let withClauseRemainder = withClause.substr(4);
  if (continuesWithEverything) {
    isWithAsterisk = true;
    const match = continuesWithEverything[0];
    const matchLen = match.length;
    // get everything proceeding WITH *
    const nextCypher = withClause.substr(matchLen);
    if (nextCypher) {
      // trim everything proceeding, so we can check the next character
      // using String.startsWith
      const trimmed = nextCypher.trim();
      if (trimmed.startsWith(',') && firstCommaIndex !== -1) {
        // if the clause begins with WITH * and is immediately proceeded
        // by a comma, the clause begins as: "WITH *, ..."
        isVariableList = true;
      }
    }
  }
  let paramVariable = '';
  if (isImportClause) {
    // if an importating WITH clause is provided, then we need to persist
    // the parent UNWIND clause's variable along with it to keep it available
    paramVariable = inputTypeName;
  } else if (isExportClause) {
    // alias this input type name for it to be unwound by the nested UNWIND,
    // to allow for reusing the same input type in nested cases
    paramVariable = `${inputTypeName} AS _${inputTypeName}`;
  }
  if (isWithAsterisk) {
    if (isVariableList) {
      // set withClauseRemainder forward to start at the first comma
      withClauseRemainder = withClause.substr(firstCommaIndex);
    } else {
      // set withClauseRemainder to immediately after WITH *
      withClauseRemainder = withClause.substr(6);
    }
    // inject paramVariable into the clause
    augmentedWithClause = `WITH *, ${paramVariable}${withClauseRemainder}`;
  } else {
    // otherwise, the clause is not WITH * and not a list, as neither "WITH *", nor "WITH x, ..."
    // so it is added with a preceeding comma, assuming the clause provides at least 1 variable
    augmentedWithClause = `WITH ${paramVariable}${
      withClauseRemainder ? `,${withClauseRemainder}` : ''
    }`;
  }
  return augmentedWithClause;
};

export const mapParameters = (params = {}) => {
  // reduce parameter json to a json with keys only for object
  // and array values, used to identify usage of @cypher input
  return Object.entries(params).reduce((mapped, [name, param]) => {
    const mappedParam = mapParameter(param);
    if (mappedParam) {
      mapped[name] = mappedParam;
    }
    return mapped;
  }, {});
};

const mapParameter = param => {
  if (_.isArray(param)) {
    // object type list field
    if (_.isObject(param[0])) {
      // after graphql validation, all values
      // in this array should also be objects
      return param.reduce((mapped, params) => {
        return _.merge(mapped, mapParameters(params));
      }, {});
    }
    // scalar list field
  } else if (_.isObject(param)) {
    return mapParameters(param);
  }
  // scalar field / null
};

const getFieldAstNodes = type =>
  Object.values(type.getFields()).map(field => field.astNode);
