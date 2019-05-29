import test from 'ava';

import { ApolloClient } from 'apollo-client';
import { HttpLink } from 'apollo-link-http';
import { InMemoryCache } from 'apollo-cache-inmemory';

import gql from 'graphql-tag';
import fetch from 'node-fetch';

let client;

const headers = {
  'x-error': 'Middleware error'
};

test.before(() => {
  client = new ApolloClient({
    link: new HttpLink({ uri: 'http://localhost:3000', fetch, headers }),
    cache: new InMemoryCache()
  });
});

test('Middleware fail on req.error', async t => {
  t.plan(1);

  await client
    .query({
      query: gql`
        {
          Movie(title: "River Runs Through It, A") {
            title
          }
        }
      `
    })
    .then(data => {
      t.fail('Error should be thrown.');
    })
    .catch(error => {
      t.pass();
    });
});
