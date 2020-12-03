import { ApolloServer } from 'apollo-server';
import Server from './src/server';

const playground = {
  settings: {
    'schema.polling.enable': false
  }
};

(async () => {
  const server = await Server(ApolloServer, { playground });
  const { url } = await server.listen();
  // eslint-disable-next-line no-console
  console.log(`🚀  Server ready at ${url}`);
})();
