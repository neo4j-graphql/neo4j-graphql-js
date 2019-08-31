import { v1 as neo4j } from 'neo4j-driver';
import path from 'path';

const driver = neo4j.driver(
  process.env.NEO4J_URI || 'bolt://localhost:7687',
  neo4j.auth.basic(
    process.env.NEO4J_USER || 'neo4j',
    process.env.NEO4J_PASSWORD || 'letmein'
  )
);

export const resetDatabase = async () => {
  const seedPath = path.resolve(__dirname, '../fixtures/seed.graphml');
  const session = driver.session();
  await session.run(`
    MATCH (n) WHERE n:Actor OR n:Director OR n:Genre OR n:Movie OR n:OnlyDate OR n:User DETACH DELETE n RETURN count(n);
  `);
  await session.run(
    `
    CALL apoc.import.graphml($seedPath, {batchSize: 10000, storeNodeIds: false, readLabels:true});
  `,
    { seedPath }
  );
  session.close(() => driver.close());
};
