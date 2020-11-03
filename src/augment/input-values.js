import { Kind, GraphQLInt, isInputObjectType } from 'graphql';
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
  propertyFieldExists,
  unwrapNamedType
} from './fields';
import { SpatialType, Neo4jPointDistanceFilter } from './types/spatial';
import { isNeo4jTypeInput } from '../utils';
import neo4j from 'neo4j-driver';

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

export const isDataSelectionArgument = name =>
  Object.values({
    ...PagingArgument,
    ...OrderingArgument
  }).some(key => key === name);

export const isNeo4jTypeArgument = ({ fieldArgument = {} }) => {
  const type = fieldArgument.type;
  const unwrappedType = unwrapNamedType({ type });
  const name = unwrappedType.name;
  return isNeo4jTypeInput(name);
};

/**
 * Builds the AST definitions for input values that compose the
 * input object types used by Query API field arguments,
 * e.g., pagination, ordering, filtering, etc.
 */
export const augmentInputTypePropertyFields = ({
  inputTypeMap = {},
  field,
  fieldName,
  fieldDirectives,
  outputType,
  outputKind
}) => {
  const filteringType = inputTypeMap[FilteringArgument.FILTER];
  if (
    filteringType &&
    !isCypherField({ directives: fieldDirectives }) &&
    !isNeo4jIDField({ name: fieldName })
  ) {
    filteringType.fields.push(
      ...buildPropertyFilters({
        field,
        fieldName,
        outputType,
        outputKind
      })
    );
  }
  const orderingType = inputTypeMap[OrderingArgument.ORDER_BY];
  if (
    orderingType &&
    !isListTypeField({ field }) &&
    !isSpatialField({ type: outputType })
  ) {
    orderingType.values.push(...buildPropertyOrderingValues({ fieldName }));
  }
  return inputTypeMap;
};

/**
 * Given an argumentMap of expected Query API field arguments,
 * builds their AST definitions
 */
export const buildQueryFieldArguments = ({
  field = {},
  argumentMap = {},
  fieldArguments,
  fieldDirectives,
  typeName,
  outputType,
  isUnionType,
  isListType,
  typeDefinitionMap
}) => {
  const isListField = isListTypeField({ field });
  Object.values(argumentMap).forEach(name => {
    if (isListType || isListField) {
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
export const buildLogicalFilterInputValues = ({ typeName = '' }) => {
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
export const buildPropertyFilters = ({
  field,
  fieldName = '',
  outputType = '',
  outputKind = ''
}) => {
  let filterTypes = [];
  let fieldConfig = {
    name: fieldName,
    type: {
      name: outputType
    }
  };
  const isListFilter = isListTypeField({ field });
  if (isListFilter) {
    fieldConfig.type.wrappers = {
      [TypeWrappers.LIST_TYPE]: true,
      [TypeWrappers.NON_NULL_NAMED_TYPE]: true
    };
  }
  if (
    isSpatialField({ type: outputType }) ||
    isNeo4jPointType({ type: outputType })
  ) {
    filterTypes = ['not', ...Object.values(Neo4jPointDistanceFilter)];
  } else if (
    isIntegerField({ type: outputType }) ||
    isFloatField({ type: outputType }) ||
    isTemporalField({ type: outputType }) ||
    isNeo4jTemporalType({ type: outputType })
  ) {
    filterTypes = ['not'];
    if (!isListFilter) filterTypes = [...filterTypes, 'in', 'not_in'];
    filterTypes = [...filterTypes, 'lt', 'lte', 'gt', 'gte'];
  } else if (isBooleanField({ type: outputType })) {
    filterTypes = ['not'];
  } else if (isStringField({ kind: outputKind, type: outputType })) {
    if (outputKind === Kind.ENUM_TYPE_DEFINITION) {
      filterTypes = ['not'];
      if (!isListFilter) filterTypes = [...filterTypes, 'in', 'not_in'];
    } else {
      filterTypes = ['not'];
      if (!isListFilter) filterTypes = [...filterTypes, 'in', 'not_in'];
      filterTypes = [
        ...filterTypes,
        'contains',
        'not_contains',
        'starts_with',
        'not_starts_with',
        'ends_with',
        'not_ends_with'
      ];
    }
  }
  return buildFilters({
    fieldName,
    fieldConfig,
    filterTypes,
    isListFilter
  });
};

/**
 * Builds the input value definitions that compose input object types
 * used by filtering arguments
 */
export const buildFilters = ({
  fieldName,
  fieldConfig,
  filterTypes = [],
  isListFilter = false
}) => {
  if (isListFilter) {
    fieldConfig.type.wrappers = {
      [TypeWrappers.NON_NULL_NAMED_TYPE]: true,
      [TypeWrappers.LIST_TYPE]: true
    };
  }
  return filterTypes.reduce(
    (inputValues, name) => {
      const filterName = `${fieldName}_${name}`;
      const isPointDistanceFilter = Object.values(
        Neo4jPointDistanceFilter
      ).some(distanceFilter => distanceFilter === name);
      let wrappers = {};
      if (name === 'in' || name === 'not_in') {
        wrappers = {
          [TypeWrappers.NON_NULL_NAMED_TYPE]: true,
          [TypeWrappers.LIST_TYPE]: true
        };
      } else if (isPointDistanceFilter) {
        fieldConfig.type.name = `${Neo4jTypeName}${SpatialType.POINT}DistanceFilter`;
      }
      if (isListFilter) {
        wrappers = {
          [TypeWrappers.NON_NULL_NAMED_TYPE]: true,
          [TypeWrappers.LIST_TYPE]: true
        };
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
      const orderedFieldAlreadySelected = fieldSelectionSet.some(
        field => field.name && field.name.value === orderedFieldName
      );
      if (!orderedFieldAlreadySelected) {
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

export const analyzeMutationArguments = ({
  fieldArguments,
  values = {},
  resolveInfo
}) => {
  const schema = resolveInfo.schema;
  const serialized = { ...values };
  if (!Array.isArray(values) && typeof values === 'object') {
    fieldArguments.forEach(fieldArgument => {
      const name = fieldArgument.name.value;
      if (!isDataSelectionArgument(name)) {
        const type = fieldArgument.type;
        const unwrappedType = unwrapNamedType({ type });
        const typeName = unwrappedType[TypeWrappers.NAME];
        let argumentValue = serialized[name];
        if (argumentValue !== undefined) {
          const schemaType = schema.getType(typeName);
          if (isInputObjectType(schemaType)) {
            const fieldMap = schemaType.getFields();
            const fields = Object.values(fieldMap);
            const inputFields = fields.map(field => field.astNode);
            if (Array.isArray(argumentValue)) {
              argumentValue = argumentValue.map(inputValues => {
                const serialized = analyzeMutationArguments({
                  fieldArguments: inputFields,
                  values: inputValues,
                  resolveInfo
                });
                return serialized;
              });
            } else if (typeof argumentValue === 'object') {
              argumentValue = analyzeMutationArguments({
                fieldArguments: inputFields,
                values: argumentValue,
                resolveInfo
              });
            }
          } else if (typeName === GraphQLInt.name) {
            argumentValue = serializeIntegerArgument(argumentValue);
          }
          serialized[name] = argumentValue;
        }
      }
    });
  }
  return serialized;
};

const serializeIntegerArgument = argumentValue => {
  const isListValue = Array.isArray(argumentValue);
  if (!isListValue) argumentValue = [argumentValue];
  let serialized = argumentValue.map(value => {
    if (Number.isInteger(value)) value = neo4j.int(value);
    return value;
  });
  if (!isListValue) serialized = serialized[0];
  return serialized;
};
