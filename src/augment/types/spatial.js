import { GraphQLInt, GraphQLString } from 'graphql';
import { buildNeo4jTypes } from '../types/types';

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

/**
 * The main export for building the GraphQL input and output type definitions
 * for Neo4j Temporal property types
 */
export const augmentSpatialTypes = ({ typeMap, config = {} }) => {
  config.spatial = decideSpatialConfig({ config });
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
    Object.keys(defaultConfig).forEach(e => {
      if (providedConfig[e] === undefined) {
        providedConfig[e] = defaultConfig[e];
      }
    });
    defaultConfig = providedConfig;
  }
  return defaultConfig;
};
