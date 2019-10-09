import { Kind, GraphQLInt } from 'graphql';
import {
  buildName,
  buildNamedType,
  buildInputValue,
  buildInputObjectType,
  buildEnumType,
  buildEnumValue
} from './ast';
import { isNeo4jPropertyType } from './types/types';
import { isCypherField } from './directives';
import {
  TypeWrappers,
  isListTypeField,
  isNeo4jIDField,
  isIntegerField,
  isFloatField,
  isStringField,
  isBooleanField,
  isTemporalField
} from './fields';

export const PagingArgument = {
  FIRST: 'first',
  OFFSET: 'offset'
};

export const OrderingArgument = {
  ORDER_BY: 'orderBy'
};

export const FilteringArgument = {
  FILTER: 'filter'
};

export const augmentInputTypePropertyFields = ({
  inputTypeMap = {},
  fieldName,
  fieldDirectives,
  outputType,
  outputKind,
  outputTypeWrappers
}) => {
  const filteringType = inputTypeMap[FilteringArgument.FILTER];
  const orderingType = inputTypeMap[OrderingArgument.ORDER_BY];
  if (!isListTypeField({ wrappers: outputTypeWrappers })) {
    if (
      !isCypherField({ directives: fieldDirectives }) &&
      !isNeo4jIDField({ name: fieldName })
    ) {
      if (filteringType) {
        filteringType.fields.push(
          ...buildPropertyFilters({
            fieldName,
            outputType,
            outputKind
          })
        );
      }
    }
    if (orderingType) {
      orderingType.values.push(...buildPropertyOrderingValues({ fieldName }));
    }
  }
  return inputTypeMap;
};

export const buildQueryFieldArguments = ({
  augmentationMap = {},
  fieldArguments,
  fieldDirectives,
  outputType,
  outputTypeWrappers
}) => {
  Object.values(augmentationMap).forEach(name => {
    if (isListTypeField({ wrappers: outputTypeWrappers })) {
      if (name === PagingArgument.FIRST) {
        // Result Arguments
        if (
          !fieldArguments.some(arg => arg.name.value === PagingArgument.FIRST)
        ) {
          fieldArguments.push(
            buildQueryPagingArgument({
              name: PagingArgument.FIRST
            })
          );
        }
      } else if (name === PagingArgument.OFFSET) {
        // Result Arguments
        if (
          !fieldArguments.some(arg => arg.name.value === PagingArgument.OFFSET)
        ) {
          fieldArguments.push(
            buildQueryPagingArgument({
              name: PagingArgument.OFFSET
            })
          );
        }
      } else if (name === OrderingArgument.ORDER_BY) {
        // Overwrite
        fieldArguments.push(
          buildQueryOrderingArgument({
            typeName: outputType
          })
        );
      }
    }
    // Overwrite
    if (name === FilteringArgument.FILTER) {
      if (!isCypherField({ directives: fieldDirectives })) {
        fieldArguments.push(
          buildQueryFilteringArgument({
            typeName: outputType
          })
        );
      }
    }
  });
  return fieldArguments;
};

const buildQueryPagingArgument = ({ name = '' }) => {
  let arg = {};
  // Prevent overwrite
  if (name === PagingArgument.FIRST) {
    arg = buildInputValue({
      name: buildName({ name: PagingArgument.FIRST }),
      type: buildNamedType({
        name: GraphQLInt.name
      })
    });
  }
  if (name === PagingArgument.OFFSET) {
    arg = buildInputValue({
      name: buildName({ name: PagingArgument.OFFSET }),
      type: buildNamedType({
        name: GraphQLInt.name
      })
    });
  }
  return arg;
};

const buildQueryOrderingArgument = ({ typeName }) =>
  buildInputValue({
    name: buildName({ name: OrderingArgument.ORDER_BY }),
    type: buildNamedType({
      name: `_${typeName}Ordering`,
      wrappers: {
        [TypeWrappers.LIST_TYPE]: true
      }
    })
  });

export const buildQueryOrderingEnumType = ({
  nodeInputTypeMap,
  typeDefinitionMap,
  generatedTypeMap
}) => {
  const inputType = nodeInputTypeMap[OrderingArgument.ORDER_BY];
  if (inputType) {
    const orderingTypeName = inputType.name;
    const type = typeDefinitionMap[inputType.name];
    // Prevent overwrite
    if (!type) {
      inputType.name = buildName({ name: orderingTypeName });
      generatedTypeMap[orderingTypeName] = buildEnumType(inputType);
    }
  }
  return generatedTypeMap;
};

export const buildPropertyOrderingValues = ({ fieldName }) => [
  buildEnumValue({
    name: buildName({ name: `${fieldName}_asc` })
  }),
  buildEnumValue({
    name: buildName({ name: `${fieldName}_desc` })
  })
];

const buildQueryFilteringArgument = ({ typeName }) =>
  buildInputValue({
    name: buildName({ name: FilteringArgument.FILTER }),
    type: buildNamedType({
      name: `_${typeName}Filter`
    })
  });

export const buildQueryFilteringInputType = ({
  typeName,
  inputTypeMap,
  typeDefinitionMap,
  generatedTypeMap
}) => {
  const inputType = inputTypeMap[FilteringArgument.FILTER];
  if (inputType) {
    const inputTypeName = inputType.name;
    inputType.name = buildName({ name: inputTypeName });
    inputType.fields.unshift(
      ...[
        buildInputValue({
          name: buildName({ name: 'AND' }),
          type: buildNamedType({
            name: typeName,
            wrappers: {
              [TypeWrappers.NON_NULL_NAMED_TYPE]: true,
              [TypeWrappers.LIST_TYPE]: true
            }
          })
        }),
        buildInputValue({
          name: buildName({ name: 'OR' }),
          type: buildNamedType({
            name: typeName,
            wrappers: {
              [TypeWrappers.NON_NULL_NAMED_TYPE]: true,
              [TypeWrappers.LIST_TYPE]: true
            }
          })
        })
      ]
    );
    if (!typeDefinitionMap[inputTypeName]) {
      generatedTypeMap[inputTypeName] = buildInputObjectType(inputType);
    }
  }
  return generatedTypeMap;
};

const buildPropertyFilters = ({
  fieldName = '',
  outputType = '',
  outputKind = ''
}) => {
  let filters = [];
  if (
    isIntegerField({ type: outputType }) ||
    isFloatField({ type: outputType }) ||
    isTemporalField({ type: outputType }) ||
    isNeo4jPropertyType({ type: outputType })
  ) {
    filters = buildFilters({
      fieldName,
      fieldConfig: {
        name: fieldName,
        type: {
          name: outputType
        }
      },
      filterTypes: ['_not', '_in', '_not_in', '_lt', '_lte', '_gt', '_gte']
    });
  } else if (isBooleanField({ type: outputType })) {
    filters = buildFilters({
      fieldName,
      fieldConfig: {
        name: fieldName,
        type: {
          name: outputType
        }
      },
      filterTypes: ['_not']
    });
  } else if (isStringField({ kind: outputKind, type: outputType })) {
    if (outputKind === Kind.ENUM_TYPE_DEFINITION) {
      filters = buildFilters({
        fieldName,
        fieldConfig: {
          name: fieldName,
          type: {
            name: outputType
          }
        },
        filterTypes: ['_not', '_in', '_not_in']
      });
    } else {
      filters = buildFilters({
        fieldName,
        fieldConfig: {
          name: fieldName,
          type: {
            name: outputType
          }
        },
        filterTypes: [
          '_not',
          '_in',
          '_not_in',
          '_contains',
          '_not_contains',
          '_starts_with',
          '_not_starts_with',
          '_ends_with',
          '_not_ends_with'
        ]
      });
    }
  }
  return filters;
};

export const buildFilters = ({ fieldName, fieldConfig, filterTypes = [] }) => [
  buildInputValue({
    name: buildName({ name: fieldConfig.name }),
    type: buildNamedType(fieldConfig.type)
  }),
  ...filterTypes.map(filter => {
    let wrappers = {};
    if (filter === '_in' || filter === '_not_in') {
      wrappers = {
        [TypeWrappers.NON_NULL_NAMED_TYPE]: true,
        [TypeWrappers.LIST_TYPE]: true
      };
    }
    return buildInputValue({
      name: buildName({ name: `${fieldName}${filter}` }),
      type: buildNamedType({
        name: fieldConfig.type.name,
        wrappers
      })
    });
  })
];
