import test from 'ava';

import { ApolloClient } from 'apollo-client';
import { HttpLink } from 'apollo-link-http';
import { InMemoryCache } from 'apollo-cache-inmemory';

import gql from 'graphql-tag';
import fetch from 'node-fetch';

let client;

test.before(async t => {
  client = new ApolloClient({
    link: new HttpLink({ uri: 'http://localhost:4000', fetch: fetch }),
    cache: new InMemoryCache(),
    defaultOptions: {
      watchQuery: {
        fetchPolicy: 'no-cache',
        errorPolicy: 'ignore'
      },
      query: {
        fetchPolicy: 'no-cache',
        errorPolicy: 'all'
      }
    }
  });
  await client
    .mutate({
      mutation: gql`
        mutation {
          MergeSeedData
        }
      `
    })
    .then(data => {
      return data;
    })
    .catch(error => {
      t.fail(error.message);
    });
});

test.after(async t => {
  await client
    .mutate({
      mutation: gql`
        mutation {
          DeleteSeedData
        }
      `
    })
    .then(data => {
      return data;
    })
    .catch(error => {
      t.fail(error.message);
    });
});

test.serial(
  'Query for merged test data (reviews -> ((products -> inventory) + accounts))',
  async t => {
    t.plan(1);

    const expected = {
      data: {
        Review: [
          {
            id: '1',
            body: 'Love it!',
            product: {
              upc: '1',
              name: 'Table',
              price: 899,
              weight: 100,
              shippingEstimate: 50,
              inStock: true,
              metrics: [
                {
                  id: '100',
                  metric: 1,
                  data: 2,
                  __typename: 'Metric'
                }
              ],
              objectCompoundKey: {
                id: '100',
                metric: 1,
                data: 2,
                __typename: 'Metric'
              },
              listCompoundKey: [
                {
                  id: '100',
                  metric: 1,
                  data: 2,
                  __typename: 'Metric'
                }
              ],
              __typename: 'Product'
            },
            author: {
              id: '1',
              name: 'Ada Lovelace',
              username: '@ada',
              numberOfReviews: 2,
              __typename: 'Account'
            },
            __typename: 'Review'
          },
          {
            id: '2',
            body: 'Too expensive.',
            product: {
              upc: '2',
              name: 'Couch',
              price: 1299,
              weight: 1000,
              shippingEstimate: 0,
              inStock: false,
              metrics: [],
              objectCompoundKey: null,
              listCompoundKey: [],
              __typename: 'Product'
            },
            author: {
              id: '1',
              name: 'Ada Lovelace',
              username: '@ada',
              numberOfReviews: 2,
              __typename: 'Account'
            },
            __typename: 'Review'
          },
          {
            id: '3',
            body: 'Could be better.',
            product: {
              upc: '3',
              name: 'Chair',
              price: 54,
              weight: 50,
              shippingEstimate: 25,
              inStock: true,
              metrics: [],
              objectCompoundKey: null,
              listCompoundKey: [],
              __typename: 'Product'
            },
            author: {
              id: '2',
              name: 'Alan Turing',
              username: '@complete',
              numberOfReviews: 2,
              __typename: 'Account'
            },
            __typename: 'Review'
          },
          {
            id: '4',
            body: 'Prefer something else.',
            product: {
              upc: '1',
              name: 'Table',
              price: 899,
              weight: 100,
              shippingEstimate: 50,
              inStock: true,
              metrics: [
                {
                  id: '100',
                  metric: 1,
                  data: 2,
                  __typename: 'Metric'
                }
              ],
              objectCompoundKey: {
                id: '100',
                metric: 1,
                data: 2,
                __typename: 'Metric'
              },
              listCompoundKey: [
                {
                  id: '100',
                  metric: 1,
                  data: 2,
                  __typename: 'Metric'
                }
              ],
              __typename: 'Product'
            },
            author: {
              id: '2',
              name: 'Alan Turing',
              username: '@complete',
              numberOfReviews: 2,
              __typename: 'Account'
            },
            __typename: 'Review'
          }
        ]
      }
    };

    await client
      .query({
        query: gql`
          query {
            Review {
              id
              body
              product {
                upc
                name
                price
                weight
                shippingEstimate
                inStock
                metrics {
                  id
                  metric
                  data
                }
                objectCompoundKey {
                  id
                  metric
                  data
                }
                listCompoundKey {
                  id
                  metric
                  data
                }
              }
              author {
                id
                name
                username
                numberOfReviews
              }
            }
          }
        `
      })
      .then(data => {
        t.deepEqual(data.data, expected.data);
      })
      .catch(error => {
        t.fail(error.message);
      });
  }
);

test.serial(
  'Field arguments with service path: (products -> (inventory + (reviews -> accounts)))',
  async t => {
    t.plan(1);

    const expected = {
      data: {
        Product: [
          {
            upc: '3',
            name: 'Chair',
            weight: 50,
            price: 54,
            inStock: true,
            shippingEstimate: 25,
            reviews: [
              {
                id: '3',
                body: 'Could be better.',
                author: {
                  id: '2',
                  name: 'Alan Turing',
                  username: '@complete',
                  numberOfReviews: 2,
                  __typename: 'Account'
                },
                __typename: 'Review'
              }
            ],
            metrics: [],
            listCompoundKey: [],
            __typename: 'Product'
          },
          {
            upc: '2',
            name: 'Couch',
            weight: 1000,
            price: 1299,
            inStock: false,
            shippingEstimate: 0,
            reviews: [
              {
                id: '2',
                body: 'Too expensive.',
                author: {
                  id: '1',
                  name: 'Ada Lovelace',
                  username: '@ada',
                  numberOfReviews: 2,
                  __typename: 'Account'
                },
                __typename: 'Review'
              }
            ],
            metrics: [],
            listCompoundKey: [],
            __typename: 'Product'
          },
          {
            upc: '1',
            name: 'Table',
            weight: 100,
            price: 899,
            inStock: true,
            shippingEstimate: 50,
            reviews: [
              {
                id: '4',
                body: 'Prefer something else.',
                author: {
                  id: '2',
                  name: 'Alan Turing',
                  username: '@complete',
                  numberOfReviews: 2,
                  __typename: 'Account'
                },
                __typename: 'Review'
              },
              {
                id: '1',
                body: 'Love it!',
                author: {
                  id: '1',
                  name: 'Ada Lovelace',
                  username: '@ada',
                  numberOfReviews: 2,
                  __typename: 'Account'
                },
                __typename: 'Review'
              }
            ],
            metrics: [
              {
                id: '100',
                metric: 1,
                data: 2,
                __typename: 'Metric'
              }
            ],
            listCompoundKey: [
              {
                id: '100',
                metric: 1,
                data: 2,
                __typename: 'Metric'
              }
            ],
            __typename: 'Product'
          }
        ]
      }
    };

    await client
      .query({
        query: gql`
          query {
            Product(orderBy: upc_desc) {
              upc
              name
              weight
              price
              inStock
              shippingEstimate
              reviews(
                first: 2
                filter: { id_in: ["1", "2", "3", "4"] }
                orderBy: id_desc
              ) {
                id
                body
                author {
                  id
                  name
                  username
                  numberOfReviews
                }
              }
              metrics {
                id
                metric
                data
              }
              listCompoundKey {
                id
                metric
                data
              }
            }
          }
        `
      })
      .then(data => {
        t.deepEqual(data.data, expected.data);
      })
      .catch(error => {
        t.fail(error.message);
      });
  }
);

test.serial(
  'Unselected @requires fields with service path: (accounts -> (reviews -> (accounts + (products + inventory))))',
  async t => {
    t.plan(1);

    const expected = {
      data: {
        Account: [
          {
            id: '1',
            name: 'Ada Lovelace',
            username: '@ada',
            reviews: [
              {
                id: '1',
                body: 'Love it!',
                author: {
                  id: '1',
                  name: 'Ada Lovelace',
                  username: '@ada',
                  __typename: 'Account'
                },
                product: {
                  upc: '1',
                  name: 'Table',
                  inStock: true,
                  shippingEstimate: 50,
                  metrics: [
                    {
                      id: '100',
                      data: 2,
                      __typename: 'Metric'
                    }
                  ],
                  __typename: 'Product'
                },
                __typename: 'Review'
              },
              {
                id: '2',
                body: 'Too expensive.',
                author: {
                  id: '1',
                  name: 'Ada Lovelace',
                  username: '@ada',
                  __typename: 'Account'
                },
                product: {
                  upc: '2',
                  name: 'Couch',
                  inStock: false,
                  shippingEstimate: 0,
                  metrics: [],
                  __typename: 'Product'
                },
                __typename: 'Review'
              }
            ],
            numberOfReviews: 2,
            __typename: 'Account'
          },
          {
            id: '2',
            name: 'Alan Turing',
            username: '@complete',
            reviews: [
              {
                id: '3',
                body: 'Could be better.',
                author: {
                  id: '2',
                  name: 'Alan Turing',
                  username: '@complete',
                  __typename: 'Account'
                },
                product: {
                  upc: '3',
                  name: 'Chair',
                  inStock: true,
                  shippingEstimate: 25,
                  metrics: [],
                  __typename: 'Product'
                },
                __typename: 'Review'
              },
              {
                id: '4',
                body: 'Prefer something else.',
                author: {
                  id: '2',
                  name: 'Alan Turing',
                  username: '@complete',
                  __typename: 'Account'
                },
                product: {
                  upc: '1',
                  name: 'Table',
                  inStock: true,
                  shippingEstimate: 50,
                  metrics: [
                    {
                      id: '100',
                      data: 2,
                      __typename: 'Metric'
                    }
                  ],
                  __typename: 'Product'
                },
                __typename: 'Review'
              }
            ],
            numberOfReviews: 2,
            __typename: 'Account'
          }
        ]
      }
    };

    await client
      .query({
        query: gql`
          query {
            Account {
              id
              name
              username
              reviews(orderBy: id_asc) {
                id
                body
                author {
                  id
                  name
                  username
                }
                product {
                  upc
                  name
                  inStock
                  shippingEstimate
                  metrics {
                    id
                    data
                  }
                }
              }
              numberOfReviews
            }
          }
        `
      })
      .then(data => {
        t.deepEqual(data.data, expected.data);
      })
      .catch(error => {
        t.fail(error.message);
      });
  }
);
