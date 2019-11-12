import { GraphQLInt, GraphQLString, GraphQLFloat } from 'graphql';
import { buildNeo4jTypes, Neo4jTypeName } from '../types/types';
import {
  buildName,
  buildNamedType,
  buildInputValue,
  buildInputObjectType
} from '../ast';
import { TypeWrappers } from '../fields';

/**
 * An enum describing the name of the Neo4j Point type
 */
export const SpatialType = {
  POINT: 'Point'
};

/**
 * An enum describing the property names of the Neo4j Point type
 * See: https://neo4j.com/docs/cypher-manual/current/syntax/spatial/#cypher-spatial-instants
 */
const Neo4jPointField = {
  X: 'x',
  Y: 'y',
  Z: 'z',
  LONGITUDE: 'longitude',
  LATITUDE: 'latitude',
  HEIGHT: 'height',
  CRS: 'crs',
  SRID: 'srid'
};

/**
 * A map of the Neo4j Temporal Time type fields to their respective
 * GraphQL types
 */
export const Neo4jPoint = {
  [Neo4jPointField.X]: GraphQLInt.name,
  [Neo4jPointField.Y]: GraphQLInt.name,
  [Neo4jPointField.Z]: GraphQLInt.name,
  [Neo4jPointField.LONGITUDE]: GraphQLInt.name,
  [Neo4jPointField.LATITUDE]: GraphQLInt.name,
  [Neo4jPointField.HEIGHT]: GraphQLInt.name,
  [Neo4jPointField.CRS]: GraphQLString.name,
  [Neo4jPointField.SRID]: GraphQLInt.name
};

export const Neo4jPointDistanceFilter = {
  DISTANCE: 'distance',
  DISTANCE_LESS_THAN: 'distance_lt',
  DISTANCE_LESS_THAN_OR_EQUAL: 'distance_lte',
  DISTANCE_GREATER_THAN: 'distance_gt',
  DISTANCE_GREATER_THAN_OR_EQUAL: 'distance_gte'
};

export const Neo4jPointDistanceArgument = {
  POINT: 'point',
  DISTANCE: 'distance'
};

/**
 * The main export for building the GraphQL input and output type definitions
 * for Neo4j Temporal property types
 */
export const augmentSpatialTypes = ({ typeMap, config = {} }) => {
  config.spatial = decideSpatialConfig({ config });
  typeMap = buildSpatialDistanceFilterInputType({
    typeMap,
    config
  });
  return buildNeo4jTypes({
    typeMap,
    neo4jTypes: SpatialType,
    config: config.spatial
  });
};

/**
 * A helper function for ensuring a fine-grained spatial
 * configmration
 */
const decideSpatialConfig = ({ config }) => {
  let defaultConfig = {
    point: true
  };
  const providedConfig = config ? config.spatial : defaultConfig;
  if (typeof providedConfig === 'boolean') {
    if (providedConfig === false) {
      defaultConfig.point = false;
    }
  } else if (typeof providedConfig === 'object') {
    defaultConfig = providedConfig;
  }
  return defaultConfig;
};

/**
 * Builds the AST for the input object definition used for
 * providing arguments to the spatial filters that use the
 * distance Cypher function
 */
const buildSpatialDistanceFilterInputType = ({ typeMap = {}, config }) => {
  if (config.spatial.point) {
    const typeName = `${Neo4jTypeName}${SpatialType.POINT}DistanceFilter`;
    // Overwrite
    typeMap[typeName] = buildInputObjectType({
      name: buildName({ name: typeName }),
      fields: [
        buildInputValue({
          name: buildName({ name: Neo4jPointDistanceArgument.POINT }),
          type: buildNamedType({
            name: `${Neo4jTypeName}${SpatialType.POINT}Input`,
            wrappers: {
              [TypeWrappers.NON_NULL_NAMED_TYPE]: true
            }
          })
        }),
        buildInputValue({
          name: buildName({ name: Neo4jPointDistanceArgument.DISTANCE }),
          type: buildNamedType({
            name: GraphQLFloat.name,
            wrappers: {
              [TypeWrappers.NON_NULL_NAMED_TYPE]: true
            }
          })
        })
      ]
    });
  }
  return typeMap;
};
