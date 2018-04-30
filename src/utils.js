export function parseArgs(args, variableValues) {
  // get args from selection.arguments object
  // or from resolveInfo.variableValues if arg is a variable
  // note that variable values override default values

  if (!args) {
    return {};
  }

  if (args.length === 0) {
    return {};
  }

  return args.reduce((acc, arg) => {
    switch (arg.value.kind) {
      case 'IntValue':
        acc[arg.name.value] = parseInt(arg.value.value);
        break;
      case 'FloatValue':
        acc[arg.name.value] = parseFloat(arg.value.value);
        break;
      case 'Variable':
        acc[arg.name.value] = variableValues[arg.name.value];
        break;
      default:
        acc[arg.name.value] = arg.value.value;
    }

    return acc;
  }, {});
}

function getDefaultArguments(fieldName, schemaType) {
  // get default arguments for this field from schema

  try {
    return schemaType._fields[fieldName].args.reduce((acc, arg) => {
      acc[arg.name] = arg.defaultValue;
      return acc;
    }, {});
  } catch (err) {
    return {};
  }
}

export function cypherDirectiveArgs(
  variable,
  headSelection,
  schemaType,
  resolveInfo
) {
  const defaultArgs = getDefaultArguments(headSelection.name.value, schemaType);
  const queryArgs = parseArgs(
    headSelection.arguments,
    resolveInfo.variableValues
  );

  let args = JSON.stringify(Object.assign(defaultArgs, queryArgs)).replace(
    /\"([^(\")"]+)\":/g,
    ' $1: '
  );

  return args === '{}'
    ? `{this: ${variable}${args.substring(1)}`
    : `{this: ${variable},${args.substring(1)}`;
}

export function isMutation(resolveInfo) {
  return resolveInfo.operation.operation === 'mutation';
}

export function isAddRelationshipMutation(resolveInfo) {
  return (
    resolveInfo.operation.operation === 'mutation' &&
    (resolveInfo.fieldName.startsWith('Add') ||
      resolveInfo.fieldName.startsWith('add'))
  );
}
