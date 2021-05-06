import Schema from './schema';
import context from './context';

export default (ApolloServer, opts) => {
  const schema = Schema();
  const server = new ApolloServer({
    schema,
    context,
    ...opts
  });
  return server;
};
