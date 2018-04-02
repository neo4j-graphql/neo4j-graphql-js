export function parseArgs(args) {
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
      default:
        acc[arg.name.value] = arg.value.value;
    }

    return acc;
  }, {});
}

function getDefaultArguments(fieldName, schemaType) {
  // FIXME: check that these things exist

  try {
    return schemaType._fields[fieldName].args.reduce((acc, arg) => {
      acc[arg.name] = arg.defaultValue;
      return acc;
    }, {});
  } catch (err) {
    return {};
  }
}

export function cypherDirectiveArgs(variable, headSelection, schemaType) {
  // { "this": variable };
  const defaultArgs = getDefaultArguments(headSelection.name.value, schemaType);
  const schemaArgs = {}; // FIXME: what's the differenc between schemargs and defaultargs?
  const queryArgs = parseArgs(headSelection.arguments);
  console.log(queryArgs);

  let args = JSON.stringify(Object.assign(defaultArgs, queryArgs)).replace(
    /\"([^(\")"]+)\":/g,
    ' $1: '
  );

  return args === '{}'
    ? `{this: ${variable}${args.substring(1)}`
    : `{this: ${variable},${args.substring(1)}`;
}
