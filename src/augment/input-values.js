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
  isTemporalField,
  getFieldDefinition
} from './fields';

/**
 * An enum describing the names of the input value definitions
 * used for the field argument AST for data result pagination
 */
export const PagingArgument = {
  FIRST: 'first',
  OFFSET: 'offset'
};

/**
 * An enum describing the names of the input value definitions
 * used for the field argument AST for data result ordering
 */
export const OrderingArgument = {
  ORDER_BY: 'orderBy'
};

/**
 * An enum describing the names of the input value definitions
 * used for the field argument AST for data selection filtering
 */
export const FilteringArgument = {
  FILTER: 'filter'
};

/**
 * Builds the AST definitions for input values that compose the
 * input object types used by Query API field arguments,
 * e.g., pagination, ordering, filtering, etc.
 */
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

/**
 * Given an argumentMap of expected Query API field arguments,
 * builds their AST definitions
 */
export const buildQueryFieldArguments = ({
  argumentMap = {},
  fieldArguments,
  fieldDirectives,
  outputType,
  outputTypeWrappers
}) => {
  Object.values(argumentMap).forEach(name => {
    if (isListTypeField({ wrappers: outputTypeWrappers })) {
      if (name === PagingArgument.FIRST) {
        // Does not overwrite
        if (
          !getFieldDefinition({
            fields: fieldArguments,
            name: PagingArgument.FIRST
          })
        ) {
          fieldArguments.push(
            buildQueryPagingArgument({
              name: PagingArgument.FIRST
            })
          );
        }
      } else if (name === PagingArgument.OFFSET) {
        // Does not overwrite
        if (
          !getFieldDefinition({
            fields: fieldArguments,
            name: PagingArgument.OFFSET
          })
        ) {
          fieldArguments.push(
            buildQueryPagingArgument({
              name: PagingArgument.OFFSET
            })
          );
        }
      } else if (name === OrderingArgument.ORDER_BY) {
        const argumentIndex = fieldArguments.findIndex(
          arg => arg.name.value === OrderingArgument.ORDER_BY
        );
        // Does overwrite
        if (argumentIndex === -1) {
          fieldArguments.push(
            buildQueryOrderingArgument({
              typeName: outputType
            })
          );
        } else {
          fieldArguments.splice(
            argumentIndex,
            1,
            buildQueryOrderingArgument({
              typeName: outputType
            })
          );
        }
      }
    }
    if (name === FilteringArgument.FILTER) {
      if (!isCypherField({ directives: fieldDirectives })) {
        const argumentIndex = fieldArguments.findIndex(
          arg => arg.name.value === FilteringArgument.FILTER
        );
        // Does overwrite
        if (argumentIndex === -1) {
          fieldArguments.push(
            buildQueryFilteringArgument({
              typeName: outputType
            })
          );
        } else {
          fieldArguments.splice(
            argumentIndex,
            1,
            buildQueryFilteringArgument({
              typeName: outputType
            })
          );
        }
      }
    }
  });
  return fieldArguments;
};

/**
 * Builds the AST definition for pagination field arguments
 * used in the Query API
 */
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

/**
 * Builds the AST definition for ordering field arguments
 */
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

/**
 * Builds the AST definition for an enum type used as the
 * type of an ordering field argument
 */
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

/**
 * Builds the AST definitions for the values of an enum
 * definitions used by an ordering field argument
 */
export const buildPropertyOrderingValues = ({ fieldName }) => [
  buildEnumValue({
    name: buildName({ name: `${fieldName}_asc` })
  }),
  buildEnumValue({
    name: buildName({ name: `${fieldName}_desc` })
  })
];

/**
 * Builds the AST definition for the input value definition
 * used for a filtering field argument
 */
const buildQueryFilteringArgument = ({ typeName }) =>
  buildInputValue({
    name: buildName({ name: FilteringArgument.FILTER }),
    type: buildNamedType({
      name: `_${typeName}Filter`
    })
  });

/**
 * Builds the AST definition for an input object type used
 * as the type of a filtering field argument
 */
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
    inputType.fields.unshift(...buildLogicalFilterInputValues({ typeName }));
    if (!typeDefinitionMap[inputTypeName]) {
      generatedTypeMap[inputTypeName] = buildInputObjectType(inputType);
    }
  }
  return generatedTypeMap;
};

// An enum containing the semantics of logical filtering arguments
const LogicalFilteringArgument = {
  AND: 'AND',
  OR: 'OR'
};

/**
 * Builds the AST definitions for logical filtering arguments
 */
const buildLogicalFilterInputValues = ({ typeName = '' }) => {
  return [
    buildInputValue({
      name: buildName({ name: LogicalFilteringArgument.AND }),
      type: buildNamedType({
        name: typeName,
        wrappers: {
          [TypeWrappers.NON_NULL_NAMED_TYPE]: true,
          [TypeWrappers.LIST_TYPE]: true
        }
      })
    }),
    buildInputValue({
      name: buildName({ name: LogicalFilteringArgument.OR }),
      type: buildNamedType({
        name: typeName,
        wrappers: {
          [TypeWrappers.NON_NULL_NAMED_TYPE]: true,
          [TypeWrappers.LIST_TYPE]: true
        }
      })
    })
  ];
};

/**
 * Builds the AST definitions for filtering Neo4j property type fields
 */
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

/**
 * Builds the input value definitions that compose input object types
 * used by filtering arguments
 */
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
