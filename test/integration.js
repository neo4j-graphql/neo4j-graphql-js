import test from 'ava';

import { ApolloClient } from 'apollo-client';
import { HttpLink } from 'apollo-link-http';
import { InMemoryCache } from 'apollo-cache-inmemory';

import gql from 'graphql-tag';
import fetch from 'node-fetch';

let client;

test.before(() => {
  client = new ApolloClient({
    link: new HttpLink({ uri: 'http://localhost:3000', fetch: fetch }),
    cache: new InMemoryCache()
  });
});

test('hello world', t => {
  t.plan(1);
  t.is('true', 'true');
});

test('basic GraphQL query', async t => {
  t.plan(1);

  let expected = {
    data: {
      Movie: [
        {
          title: 'River Runs Through It, A',
          __typename: 'Movie'
        }
      ]
    }
  };

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
      t.deepEqual(data.data, expected.data);
    })
    .catch(error => {
      t.fail(error);
    });
});

test('GraphQL query with @cypher directive', async t => {
  t.plan(1);

  let expected = {
    data: {
      Movie: [
        {
          __typename: 'Movie',
          title: 'River Runs Through It, A',
          actors: [
            {
              __typename: 'Actor',
              name: ' Tom Skerritt'
            },
            {
              __typename: 'Actor',
              name: ' Brad Pitt'
            },
            {
              __typename: 'Actor',
              name: ' Brenda Blethyn'
            },
            {
              __typename: 'Actor',
              name: 'Craig Sheffer'
            }
          ],
          similar: [
            {
              __typename: 'Movie',
              title: 'Dracula Untold'
            },
            {
              __typename: 'Movie',
              title: 'Captive, The'
            },
            {
              __typename: 'Movie',
              title: 'Helter Skelter'
            }
          ]
        }
      ]
    }
  };

  await client
    .query({
      query: gql`
        {
          Movie(title: "River Runs Through It, A") {
            title
            actors {
              name
            }
            similar(first: 3) {
              title
            }
          }
        }
      `
    })
    .then(data => {
      t.deepEqual(data.data, expected.data);
    })
    .catch(error => {
      t.fail(error);
    });
});

test('Handle @cypher directive on QueryType', async t => {
  t.plan(1);

  let expected = {
    data: {
      GenresBySubstring: [
        {
          name: 'Children',
          __typename: 'Genre',
          movies: [
            {
              __typename: 'Movie',
              title: 'Boxtrolls, The'
            },
            {
              __typename: 'Movie',
              title: 'Challenge to Lassie'
            },
            {
              __typename: 'Movie',
              title: 'Maleficent'
            }
          ]
        }
      ]
    }
  };

  await client
    .query({
      query: gql`
        {
          GenresBySubstring(substring: "Children") {
            name
            movies(first: 3) {
              title
            }
          }
        }
      `
    })
    .then(data => {
      t.deepEqual(data.data, expected.data);
    })
    .catch(error => {
      t.fail(error);
    });
});

test('Mutation with @cypher directive', async t => {
  t.plan(1);

  let expected = {
    data: {
      CreateGenre: {
        name: 'Wildlife Documentary',
        __typename: 'Genre'
      }
    }
  };

  await client
    .mutate({
      mutation: gql`
        mutation someMutation {
          CreateGenre(name: "Wildlife Documentary") {
            name
          }
        }
      `
    })
    .then(data => {
      t.deepEqual(data.data, expected.data);
    })
    .catch(error => {
      t.fail(error);
    });
});

test('Create node mutation', async t => {
  t.plan(1);

  let expected = {
    data: {
      CreateMovie: {
        __typename: 'Movie',
        title: 'My Super Awesome Movie',
        year: 2018,
        plot: 'An unending saga',
        poster: 'www.movieposter.com/img.png',
        imdbRating: 1
      }
    }
  };

  await client
    .mutate({
      mutation: gql`
        mutation someMutation {
          CreateMovie(
            movieId: "12dd334d5zaaaa"
            title: "My Super Awesome Movie"
            year: 2018
            plot: "An unending saga"
            poster: "www.movieposter.com/img.png"
            imdbRating: 1.0
          ) {
            title
            year
            plot
            poster
            imdbRating
          }
        }
      `
    })
    .then(data => {
      t.deepEqual(data.data, expected.data);
    })
    .catch(error => {
      t.fail(error);
    });
});

test('Add relationship mutation', async t => {
  t.plan(1);

  let expected = {
    data: {
      AddMovieGenre: {
        __typename: 'Movie',
        title: 'Chungking Express (Chung Hing sam lam)',
        genres: [
          {
            name: 'Mystery',
            __typename: 'Genre'
          },
          {
            name: 'Drama',
            __typename: 'Genre'
          },
          {
            name: 'Romance',
            __typename: 'Genre'
          },
          {
            name: 'Action',
            __typename: 'Genre'
          }
        ]
      }
    }
  };

  await client
    .mutate({
      mutation: gql`
        mutation someMutation {
          AddMovieGenre(moviemovieId: "123", genrename: "Action") {
            title
            genres {
              name
            }
          }
        }
      `
    })
    .then(data => {
      t.is(data.data.AddMovieGenre.genres.length, 4);
      // FIXME: Check length of genres array instead of exact response until ordering is implemented
      //t.deepEqual(data.data, expected.data);
    })
    .catch(error => {
      t.fail(error);
    });
});

// TODO: mutation with variables

test('Top level orderBy', async t => {
  t.plan(1);

  let expected = {
    data: {
      Movie: [
        {
          title: '10 Years',
          __typename: 'Movie',
          actors: [
            {
              __typename: 'Actor',
              name: 'Channing Tatum'
            },
            {
              __typename: 'Actor',
              name: ' Jenna Dewan Tatum'
            },
            {
              __typename: 'Actor',
              name: ' Justin Long'
            }
          ]
        },
        {
          title: '30 Minutes or Less',
          __typename: 'Movie',
          actors: [
            {
              name: ' Nick Swardson',
              __typename: 'Actor'
            },
            {
              name: 'Jesse Eisenberg',
              __typename: 'Actor'
            },
            {
              name: ' Aziz Ansari',
              __typename: 'Actor'
            }
          ]
        },
        {
          title: '50/50',
          __typename: 'Movie',
          actors: [
            {
              name: 'Joseph Gordon-Levitt',
              __typename: 'Actor'
            },
            {
              name: ' Seth Rogen',
              __typename: 'Actor'
            },
            {
              name: ' Anna Kendrick',
              __typename: 'Actor'
            }
          ]
        }
      ]
    }
  };

  await client
    .query({
      query: gql`
        {
          Movie(year: 2011, orderBy: title_asc, first: 3) {
            title
            actors(first: 3) {
              name
            }
          }
        }
      `
    })
    .then(data => {
      t.deepEqual(data.data, expected.data);
    })
    .catch(error => {
      t.fail(error);
    });
});
