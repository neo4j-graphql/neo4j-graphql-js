import { stitchSchemas } from '@graphql-tools/stitch';
import typeDefs from './typeDefs';
import Resolvers from './resolvers';
import neo4jSchema from './neo4j-graphql-js/schema';

export default () => {
  const resolvers = Resolvers({ subschema: neo4jSchema });
  return stitchSchemas({
    subschemas: [neo4jSchema],
    typeDefs,
    resolvers
  });
};
