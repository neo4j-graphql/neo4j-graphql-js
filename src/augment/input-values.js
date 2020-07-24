import { Kind, GraphQLInt } from 'graphql';
import {
  buildName,
  buildNamedType,
  buildInputValue,
  buildInputObjectType,
  buildEnumType,
  buildEnumValue,
  buildFieldSelection
} from './ast';
import {
  isNeo4jTemporalType,
  isNeo4jPointType,
  Neo4jTypeName
} from './types/types';
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
  getFieldDefinition,
  isSpatialField,
  propertyFieldExists
} from './fields';
import { SpatialType, Neo4jPointDistanceFilter } from './types/spatial';
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
    if (orderingType && outputType !== SpatialType.POINT) {
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
  typeName,
  outputType,
  outputTypeWrappers,
  isUnionType,
  typeDefinitionMap
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
      } else if (name === OrderingArgument.ORDER_BY && !isUnionType) {
        const argumentIndex = fieldArguments.findIndex(
          arg => arg.name.value === OrderingArgument.ORDER_BY
        );
        const outputTypeDefinition = typeDefinitionMap[outputType];
        const orderingArgument = buildQueryOrderingArgument({
          typeName: outputType
        });
        const hasPropertyField = propertyFieldExists({
          definition: outputTypeDefinition,
          typeDefinitionMap
        });
        // Does not already exist
        if (argumentIndex === -1) {
          // Ordering is only supported when there exists at
          // least 1 property field (scalar, temporal, etc.)
          if (hasPropertyField) {
            fieldArguments.push(orderingArgument);
          }
        } else {
          // Does already exist
          if (hasPropertyField) {
            // Replace it with generated argument
            fieldArguments.splice(argumentIndex, 1, orderingArgument);
          }
          // Else, there are no property fields on the type to be ordered,
          // but we should keep what has been provided
        }
      }
    }
    if (name === FilteringArgument.FILTER && !isUnionType) {
      if (!isCypherField({ directives: fieldDirectives })) {
        const argumentIndex = fieldArguments.findIndex(
          arg => arg.name.value === FilteringArgument.FILTER
        );
        if (typeName) {
          outputType = `${typeName}${outputType}`;
        }
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
  if (inputType && inputType.values.length) {
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
    isSpatialField({ type: outputType }) ||
    isNeo4jPointType({ type: outputType })
  ) {
    filters = buildFilters({
      fieldName,
      fieldConfig: {
        name: fieldName,
        type: {
          name: outputType
        }
      },
      filterTypes: ['not', ...Object.values(Neo4jPointDistanceFilter)]
    });
  } else if (
    isIntegerField({ type: outputType }) ||
    isFloatField({ type: outputType }) ||
    isTemporalField({ type: outputType }) ||
    isNeo4jTemporalType({ type: outputType })
  ) {
    filters = buildFilters({
      fieldName,
      fieldConfig: {
        name: fieldName,
        type: {
          name: outputType
        }
      },
      filterTypes: ['not', 'in', 'not_in', 'lt', 'lte', 'gt', 'gte']
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
      filterTypes: ['not']
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
        filterTypes: ['not', 'in', 'not_in']
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
          'not',
          'in',
          'not_in',
          'contains',
          'not_contains',
          'starts_with',
          'not_starts_with',
          'ends_with',
          'not_ends_with'
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
export const buildFilters = ({ fieldName, fieldConfig, filterTypes = [] }) => {
  return filterTypes.reduce(
    (inputValues, name) => {
      const filterName = `${fieldName}_${name}`;
      const isPointDistanceFilter = Object.values(
        Neo4jPointDistanceFilter
      ).some(distanceFilter => distanceFilter === name);
      const isListFilter = name === 'in' || name === 'not_in';
      let wrappers = {};
      if (isListFilter) {
        wrappers = {
          [TypeWrappers.NON_NULL_NAMED_TYPE]: true,
          [TypeWrappers.LIST_TYPE]: true
        };
      } else if (isPointDistanceFilter) {
        fieldConfig.type.name = `${Neo4jTypeName}${SpatialType.POINT}DistanceFilter`;
      }
      inputValues.push(
        buildInputValue({
          name: buildName({ name: filterName }),
          type: buildNamedType({
            name: fieldConfig.type.name,
            wrappers
          })
        })
      );
      return inputValues;
    },
    [
      buildInputValue({
        name: buildName({ name: fieldConfig.name }),
        type: buildNamedType(fieldConfig.type)
      })
    ]
  );
};

export const selectUnselectedOrderedFields = ({
  selectionFilters,
  fieldSelectionSet
}) => {
  let orderingArguments = selectionFilters['orderBy'];
  const orderedFieldSelectionSet = [];
  // cooerce to array if not provided as list
  if (orderingArguments) {
    // if a single ordering enum argument value is provided,
    // cooerce back into an array
    if (typeof orderingArguments === 'string') {
      orderingArguments = [orderingArguments];
    }
    orderedFieldSelectionSet.push(...fieldSelectionSet);
    // add field selection AST for ordered fields if those fields are
    // not selected, since apoc.coll.sortMulti requires data to sort
    const orderedFieldNameMap = orderingArguments.reduce(
      (uniqueFieldMap, orderingArg) => {
        const fieldName = orderingArg.substring(
          0,
          orderingArg.lastIndexOf('_')
        );
        // prevent redundant selections
        // ex: [datetime_asc, datetime_desc], if provided, would result
        // in adding two selections for the datetime field
        if (!uniqueFieldMap[fieldName]) uniqueFieldMap[fieldName] = true;
        return uniqueFieldMap;
      },
      {}
    );
    const orderingArgumentFieldNames = Object.keys(orderedFieldNameMap);
    orderingArgumentFieldNames.forEach(orderedFieldName => {
      if (
        !fieldSelectionSet.some(
          field => field.name && field.name.value === orderedFieldName
        )
      ) {
        // add the field so that its data can be used for ordering
        // since as it is not actually selected, it will be removed
        // by default GraphQL post-processing field resolvers
        orderedFieldSelectionSet.push(
          buildFieldSelection({
            name: buildName({
              name: orderedFieldName
            })
          })
        );
      }
    });
  }
  return orderedFieldSelectionSet;
};
