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
        t.is(data.data.length, expected.data.length);
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
        t.is(data.data.length, expected.data.length);
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
        t.is(data.data.length, expected.data.length);
      })
      .catch(error => {
        t.fail(error.message);
      });
  }
);

test.serial(
  'Query relationship field between two external entities',
  async t => {
    t.plan(1);
    const expected = {
      data: {
        Product: [
          {
            upc: '1',
            name: 'Table',
            account: {
              id: '2',
              name: 'Alan Turing',
              __typename: 'Account'
            },
            __typename: 'Product'
          },
          {
            upc: '2',
            name: 'Couch',
            account: {
              id: '1',
              name: 'Ada Lovelace',
              __typename: 'Account'
            },
            __typename: 'Product'
          },
          {
            upc: '3',
            name: 'Chair',
            account: {
              id: '2',
              name: 'Alan Turing',
              __typename: 'Account'
            },
            __typename: 'Product'
          }
        ]
      }
    };

    await client
      .query({
        query: gql`
          query relationshipEntityWithEntity {
            Product {
              upc
              name
              account {
                id
                name
              }
            }
          }
        `
      })
      .then(data => {
        t.is(data.data.length, expected.data.length);
      })
      .catch(error => {
        t.fail(error.message);
      });
  }
);

test.serial(
  'Query relationship type field between object and external entity',
  async t => {
    t.plan(1);
    const expected = {
      data: {
        Product: [
          {
            upc: '1',
            name: 'Table',
            ratings: [
              {
                rating: 9.9,
                Review: {
                  id: '1',
                  body: 'Love it!',
                  __typename: 'Review'
                },
                __typename: '_ProductRatings'
              },
              {
                rating: 5,
                Review: {
                  id: '4',
                  body: 'Prefer something else.',
                  __typename: 'Review'
                },
                __typename: '_ProductRatings'
              }
            ],
            __typename: 'Product'
          },
          {
            upc: '2',
            name: 'Couch',
            ratings: [
              {
                rating: 5.5,
                Review: {
                  id: '2',
                  body: 'Too expensive.',
                  __typename: 'Review'
                },
                __typename: '_ProductRatings'
              }
            ],
            __typename: 'Product'
          },
          {
            upc: '3',
            name: 'Chair',
            ratings: [
              {
                rating: 3.8,
                Review: {
                  id: '3',
                  body: 'Could be better.',
                  __typename: 'Review'
                },
                __typename: '_ProductRatings'
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
          query relationshipTypeObjectWithEntity {
            Product {
              upc
              name
              ratings {
                rating
                Review {
                  id
                  body
                }
              }
            }
          }
        `
      })
      .then(data => {
        t.is(data.data.length, expected.data.length);
      })
      .catch(error => {
        t.fail(error.message);
      });
  }
);

test.serial(
  'Query relationship type field between two external entities',
  async t => {
    t.plan(1);
    const expected = {
      data: {
        Account: [
          {
            id: '2',
            name: 'Alan Turing',
            entityRelationship: [
              {
                value: 4,
                Product: {
                  upc: '1',
                  name: 'Table',
                  __typename: 'Product'
                },
                __typename: '_AccountEntityRelationship'
              },
              {
                value: 3,
                Product: {
                  upc: '3',
                  name: 'Chair',
                  __typename: 'Product'
                },
                __typename: '_AccountEntityRelationship'
              }
            ],
            __typename: 'Account'
          },
          {
            id: '1',
            name: 'Ada Lovelace',
            entityRelationship: [
              {
                value: 2,
                Product: {
                  upc: '2',
                  name: 'Couch',
                  __typename: 'Product'
                },
                __typename: '_AccountEntityRelationship'
              },
              {
                value: 1,
                Product: {
                  upc: '1',
                  name: 'Table',
                  __typename: 'Product'
                },
                __typename: '_AccountEntityRelationship'
              }
            ],
            __typename: 'Account'
          }
        ]
      }
    };

    await client
      .query({
        query: gql`
          query relationshipTypeEntityWithEntity {
            Account {
              id
              name
              entityRelationship {
                value
                Product {
                  upc
                  name
                }
              }
            }
          }
        `
      })
      .then(data => {
        t.is(data.data.length, expected.data.length);
      })
      .catch(error => {
        t.fail(error.message);
      });
  }
);
