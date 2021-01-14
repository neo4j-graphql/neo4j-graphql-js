import { GraphQLInt, GraphQLString } from 'graphql';
import { buildNeo4jTypes } from '../types/types';

/**
 * An enum describing the names of Neo4j Temporal types
 * See: https://neo4j.com/docs/cypher-manual/current/syntax/temporal/#cypher-temporal-instants
 */
export const TemporalType = {
  TIME: 'Time',
  DATE: 'Date',
  DATETIME: 'DateTime',
  LOCALTIME: 'LocalTime',
  LOCALDATETIME: 'LocalDateTime'
};

/**
 * An enum describing the property names of the Neo4j Time type
 */
export const Neo4jTimeField = {
  HOUR: 'hour',
  MINUTE: 'minute',
  SECOND: 'second',
  MILLISECOND: 'millisecond',
  MICROSECOND: 'microsecond',
  NANOSECOND: 'nanosecond',
  TIMEZONE: 'timezone'
};

/**
 * An enum describing the property names of the Neo4j Date type
 */
export const Neo4jDateField = {
  YEAR: 'year',
  MONTH: 'month',
  DAY: 'day'
};

/**
 * A map of the Neo4j Temporal Time type fields to their respective
 * GraphQL types
 */
export const Neo4jTime = {
  [Neo4jTimeField.HOUR]: GraphQLInt.name,
  [Neo4jTimeField.MINUTE]: GraphQLInt.name,
  [Neo4jTimeField.SECOND]: GraphQLInt.name,
  [Neo4jTimeField.MILLISECOND]: GraphQLInt.name,
  [Neo4jTimeField.MICROSECOND]: GraphQLInt.name,
  [Neo4jTimeField.NANOSECOND]: GraphQLInt.name,
  [Neo4jTimeField.TIMEZONE]: GraphQLString.name
};

/**
 * A map of the Neo4j Temporal Date type fields to their respective
 * GraphQL types
 */
export const Neo4jDate = {
  [Neo4jDateField.YEAR]: GraphQLInt.name,
  [Neo4jDateField.MONTH]: GraphQLInt.name,
  [Neo4jDateField.DAY]: GraphQLInt.name
};

/**
 * The main export for building the GraphQL input and output type definitions
 * for Neo4j Temporal property types. Each TemporalType can be constructed
 * using either or both of the Time and Date type fields
 */
export const augmentTemporalTypes = ({ typeMap, config = {} }) => {
  config.temporal = decideTemporalConfig({ config });
  return buildNeo4jTypes({
    typeMap,
    neo4jTypes: TemporalType,
    config
  });
};

/**
 * A helper function for ensuring a fine-grained temporal
 * configmration, used to simplify checking it
 * throughout the augmnetation process
 */
const decideTemporalConfig = ({ config }) => {
  let defaultConfig = {
    time: true,
    date: true,
    datetime: true,
    localtime: true,
    localdatetime: true
  };
  const providedConfig = config ? config.temporal : defaultConfig;
  if (typeof providedConfig === 'boolean') {
    if (providedConfig === false) {
      defaultConfig.time = false;
      defaultConfig.date = false;
      defaultConfig.datetime = false;
      defaultConfig.localtime = false;
      defaultConfig.localdatetime = false;
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
