import neo4j from 'neo4j-driver';
import { NEO4J_USERNAME, NEO4J_PASSWORD } from './config';

const driver = neo4j.driver(
  'bolt://localhost:7687',
  neo4j.auth.basic(NEO4J_USERNAME, NEO4J_PASSWORD)
);
export default driver;
