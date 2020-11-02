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
      t.fail(error.message);
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
              name: 'Craig Sheffer'
            },
            {
              __typename: 'Actor',
              name: 'Tom Skerritt'
            },
            {
              __typename: 'Actor',
              name: 'Brad Pitt'
            },
            {
              __typename: 'Actor',
              name: 'Brenda Blethyn'
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
      t.fail(error.message);
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
      t.fail(error.message);
    });
});

test.serial('Mutation with @cypher directive (not-isolated)', async t => {
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
      t.fail(error.message);
    });
});

test.serial('Create node mutation (not-isolated)', async t => {
  t.plan(1);

  let expected = {
    data: {
      CreateMovie: {
        __typename: 'Movie',
        title: 'My Super Awesome Movie',
        year: 2018,
        plot: 'An unending saga',
        poster: 'www.movieposter.com/img.png',
        imdbRating: 1,
        location: {
          __typename: '_Neo4jPoint',
          longitude: -113.990976,
          latitude: 46.870035,
          height: 12.3
        }
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
            location: {
              latitude: 46.870035
              longitude: -113.990976
              height: 12.3
            }
          ) {
            title
            year
            plot
            poster
            imdbRating
            location {
              longitude
              latitude
              height
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
});

test.serial('Merge node mutation (not-isolated)', async t => {
  t.plan(1);

  let expected = {
    data: {
      MergeMovie: {
        __typename: 'Movie',
        title: 'My Super Awesome Movie',
        year: 2018,
        plot: 'An unending saga',
        poster: 'www.movieposter.com/img.png',
        imdbRating: 1,
        location: {
          __typename: '_Neo4jPoint',
          latitude: 46.870035,
          longitude: -113.990976,
          height: 12.3
        }
      }
    }
  };

  await client
    .mutate({
      mutation: gql`
        mutation someMutation {
          MergeMovie(
            movieId: "12dd334d5zaaaa"
            title: "My Super Awesome Movie"
            year: 2018
            plot: "An unending saga"
            poster: "www.movieposter.com/img.png"
            imdbRating: 1.0
            location: {
              latitude: 46.870035
              longitude: -113.990976
              height: 12.3
            }
          ) {
            title
            year
            plot
            poster
            imdbRating
            location {
              latitude
              longitude
              height
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
});

test('Update node mutation', async t => {
  t.plan(1);

  let expected = {
    data: {
      UpdateMovie: {
        __typename: 'Movie',
        title: 'Sabrina',
        year: 2010
      }
    }
  };

  await client
    .mutate({
      mutation: gql`
        mutation updateMutation {
          UpdateMovie(movieId: "7", year: 2010) {
            title
            year
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
});

test.serial('Add relationship mutation (not-isolated)', async t => {
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
        mutation addGenreRelationToMovie(
          $from: _MovieInput!
          $to: _GenreInput!
        ) {
          AddMovieGenres(from: $from, to: $to) {
            from {
              title
              genres {
                name
              }
            }
            to {
              name
            }
          }
        }
      `,
      variables: {
        from: {
          movieId: '123'
        },
        to: {
          name: 'Action'
        }
      }
    })
    .then(data => {
      t.is(data.data.AddMovieGenres.from.genres.length, 4);
      // FIXME: Check length of genres array instead of exact response until ordering is implemented
      //t.deepEqual(data.data, expected.data);
    })
    .catch(error => {
      t.fail(error.message);
    });
});

test.serial('Merge relationship mutation (not-isolated)', async t => {
  t.plan(1);

  let expected = {
    data: {
      MergeMovieGenre: {
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
        mutation mergeGenreRelationToMovie(
          $from: _MovieInput!
          $to: _GenreInput!
        ) {
          MergeMovieGenres(from: $from, to: $to) {
            from {
              title
              genres {
                name
              }
            }
            to {
              name
            }
          }
        }
      `,
      variables: {
        from: {
          movieId: '123'
        },
        to: {
          name: 'Action'
        }
      }
    })
    .then(data => {
      t.is(data.data.MergeMovieGenres.from.genres.length, 4);
      // FIXME: Check length of genres array instead of exact response until ordering is implemented
      //t.deepEqual(data.data, expected.data);
    })
    .catch(error => {
      t.fail(error.message);
    });
});

test.serial('Remove relationship mutation (not-isolated)', async t => {
  t.plan(1);

  await client
    .mutate({
      mutation: gql`
        mutation removeGenreRelationshipToMovie(
          $from: _MovieInput!
          $to: _GenreInput!
        ) {
          RemoveMovieGenres(from: $from, to: $to) {
            from {
              title
              genres {
                name
              }
            }
            to {
              name
            }
          }
        }
      `,
      variables: {
        from: {
          movieId: '123'
        },
        to: {
          name: 'Action'
        }
      }
    })
    .then(data => {
      t.is(data.data.RemoveMovieGenres.from.genres.length, 3);
    })
    .catch(error => {
      t.fail(error.message);
    });
});

test('Delete node mutation', async t => {
  t.plan(1);

  await client
    .mutate({
      mutation: gql`
        mutation deleteNode {
          DeleteMovie(movieId: "24") {
            title
          }
        }
      `
    })
    .then(d => {
      //
    })
    .catch(error => {
      t.fail(error.message);
    });

  await client
    .query({
      query: gql`
        {
          Movie(movieId: "24") {
            title
          }
        }
      `
    })
    .then(data => {
      t.is(data.data.Movie.length, 0);
    })
    .catch(error => {
      t.fail(error.message);
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
              name: 'Max Minghella'
            },
            {
              __typename: 'Actor',
              name: 'Jenna Dewan Tatum'
            }
          ]
        },
        {
          title: '30 Minutes or Less',
          __typename: 'Movie',
          actors: [
            {
              name: 'Jesse Eisenberg',
              __typename: 'Actor'
            },
            {
              name: 'Nick Swardson',
              __typename: 'Actor'
            },
            {
              name: 'Aziz Ansari',
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
              name: 'Bryce Dallas Howard',
              __typename: 'Actor'
            },
            {
              name: 'Seth Rogen',
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
      t.fail(error.message);
    });
});

test('query relationship property data', async t => {
  t.plan(1);

  let expected = {
    data: {
      Movie: [
        {
          title: 'It',
          __typename: 'Movie',
          ratings: [
            {
              __typename: '_MovieRatings',
              rating: 4.5,
              User: {
                __typename: 'User',
                name: 'Dylan Rich'
              }
            },
            {
              __typename: '_MovieRatings',
              rating: 2,
              User: {
                __typename: 'User',
                name: 'Ashley Smith'
              }
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
          Movie(title: "It") {
            title
            ratings {
              rating
              User {
                name
              }
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
});

test('query using inline fragment', async t => {
  t.plan(1);

  let expected = {
    __typename: '_MovieRatings',
    rating: 3,
    User: {
      __typename: 'User',
      name: 'Brittney Stewart',
      userId: '665'
    }
  };

  await client
    .query({
      query: gql`
        {
          Movie(title: "River Runs Through It, A") {
            title
            ratings {
              rating
              User {
                ... on User {
                  name
                  userId
                }
              }
            }
          }
        }
      `
    })
    .then(data => {
      t.deepEqual(data.data.Movie[0].ratings[0], expected);
    })
    .catch(error => {
      t.fail(error.message);
    });
});

test.serial('should be able to query node by its interface type', async t => {
  t.plan(1);

  let id = null;
  await client
    .mutate({
      mutation: gql`
        mutation {
          CreateUser(name: "John Petrucci") {
            userId
          }
        }
      `
    })
    .then(data => {
      id = data.data.CreateUser.userId;
    });

  let expected = {
    data: {
      Person: [
        {
          name: 'John Petrucci',
          userId: id,
          __typename: 'User'
        }
      ]
    }
  };

  await client
    .query({
      variables: { id },
      query: gql`
        query QueryByInterface($id: ID) {
          Person(userId: $id) {
            name
            userId
          }
        }
      `
    })
    .then(data => {
      t.deepEqual(data.data, expected.data);
    })
    .catch(error => {
      t.fail(error.message);
    })
    .finally(async () => {
      await client.mutate({
        variables: { id },
        mutation: gql`
          mutation Cleanup($id: ID!) {
            DeleteUser(userId: $id) {
              userId
            }
          }
        `
      });
    });
});

test.serial(
  'should be able to query node by its interface type (with fragments)',
  async t => {
    t.plan(1);

    let id = null;
    await client
      .mutate({
        mutation: gql`
          mutation {
            CreateUser(name: "John Petrucci") {
              userId
            }
          }
        `
      })
      .then(data => {
        id = data.data.CreateUser.userId;
      });

    let expected = {
      data: {
        Person: [
          {
            name: 'John Petrucci',
            userId: id,
            rated: [],
            __typename: 'User'
          }
        ]
      }
    };

    await client
      .query({
        variables: { id },
        query: gql`
          query QueryByInterface($id: ID) {
            Person(userId: $id) {
              name
              userId
              ... on User {
                rated {
                  timestamp
                }
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
      })
      .finally(async () => {
        await client.mutate({
          variables: { id },
          mutation: gql`
            mutation Cleanup($id: ID!) {
              DeleteUser(userId: $id) {
                userId
              }
            }
          `
        });
      });
  }
);

test.serial(
  'should be able to query node relations(s) by interface type',
  async t => {
    t.plan(1);

    await client.mutate({
      mutation: gql`
        mutation {
          CreateOldCamera(id: "cam001", type: "macro", weight: 99) {
            id
          }
          CreateNewCamera(
            id: "cam002"
            type: "floating"
            features: ["selfie", "zoom"]
          ) {
            id
          }
          CreateCameraMan(userId: "man001", name: "Johnnie Zoom") {
            userId
          }
          AddCameraManFavoriteCamera(
            from: { userId: "man001" }
            to: { id: "cam001" }
          ) {
            from {
              userId
            }
          }
          a: AddCameraManCameras(
            from: { userId: "man001" }
            to: { id: "cam001" }
          ) {
            from {
              userId
            }
          }
          b: AddCameraManCameras(
            from: { userId: "man001" }
            to: { id: "cam002" }
          ) {
            from {
              userId
            }
          }
          c: CreateCameraMan(userId: "man002", name: "Bud Wise") {
            userId
          }
          AddCameraManCameraBuddy(
            from: { userId: "man001" }
            to: { userId: "man002" }
          ) {
            from {
              userId
            }
          }
        }
      `
    });

    let expected = {
      data: {
        CameraMan: [
          {
            userId: 'man001',
            favoriteCamera: {
              id: 'cam001',
              __typename: 'OldCamera'
            },
            cameras: [
              {
                id: 'cam002',
                type: 'floating',
                features: ['selfie', 'zoom'],
                __typename: 'NewCamera'
              },
              {
                id: 'cam001',
                type: 'macro',
                weight: 99,
                __typename: 'OldCamera'
              }
            ],
            cameraBuddy: {
              userId: 'man002',
              __typename: 'CameraMan'
            },
            __typename: 'CameraMan'
          }
        ]
      }
    };

    await client
      .query({
        query: gql`
          query {
            CameraMan(userId: "man001") {
              userId
              favoriteCamera {
                id
              }
              cameras {
                id
                type
                ... on OldCamera {
                  weight
                }
                ... on NewCamera {
                  features
                }
              }
              cameraBuddy {
                userId
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
      })
      .finally(async () => {
        await client.mutate({
          mutation: gql`
            mutation {
              DeleteOldCamera(id: "cam001") {
                id
              }
              DeleteNewCamera(id: "cam002") {
                id
              }
              a: DeleteCameraMan(userId: "man001") {
                userId
              }
              b: DeleteCameraMan(userId: "man002") {
                userId
              }
            }
          `
        });
      });
  }
);

test.serial(
  'should be able to query custom cypher field returning interface type',
  async t => {
    t.plan(1);

    await client.mutate({
      mutation: gql`
        mutation {
          CreateOldCamera(
            id: "cam010"
            type: "macro"
            weight: 99
            smell: "rancid"
          ) {
            id
          }
          CreateNewCamera(
            id: "cam011"
            type: "floating"
            weight: 122
            features: ["selfie", "zoom"]
          ) {
            id
          }
          CreateCameraMan(userId: "man010", name: "Johnnie Zoom") {
            userId
          }
          a: AddCameraManCameras(
            from: { userId: "man010" }
            to: { id: "cam010" }
          ) {
            from {
              userId
            }
          }
          b: AddCameraManCameras(
            from: { userId: "man010" }
            to: { id: "cam011" }
          ) {
            from {
              userId
            }
          }
        }
      `
    });

    let expected = {
      data: {
        CameraMan: [
          {
            userId: 'man010',
            heaviestCamera: [
              {
                id: 'cam011',
                __typename: 'NewCamera'
              }
            ],
            __typename: 'CameraMan'
          }
        ]
      }
    };

    await client
      .query({
        query: gql`
          query {
            CameraMan(userId: "man010") {
              userId
              heaviestCamera {
                id
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
      })
      .finally(async () => {
        await client.mutate({
          mutation: gql`
            mutation {
              DeleteOldCamera(id: "cam010") {
                id
              }
              DeleteNewCamera(id: "cam011") {
                id
              }
              DeleteCameraMan(userId: "man010") {
                userId
              }
            }
          `
        });
      });
  }
);

test.serial(
  'query interface type relationship field on interface type',
  async t => {
    t.plan(1);

    await client.mutate({
      mutation: gql`
        mutation {
          CreateOldCamera(id: "cam003", type: "macro", weight: 99) {
            id
          }
          CreateNewCamera(
            id: "cam004"
            type: "floating"
            features: ["selfie", "zoom"]
          ) {
            id
          }
          CreateCameraMan(userId: "man003", name: "Johnnie Zoom") {
            userId
          }
          CreateUser(userId: "man004", name: "Johnnie Zoooom") {
            userId
          }
          a: AddCameraOperators(
            from: { userId: "man003" }
            to: { id: "cam003" }
          ) {
            from {
              userId
            }
          }
          b: AddCameraOperators(
            from: { userId: "man003" }
            to: { id: "cam004" }
          ) {
            from {
              userId
            }
          }
          c: AddCameraOperators(
            from: { userId: "man004" }
            to: { id: "cam003" }
          ) {
            from {
              userId
            }
          }
        }
      `
    });

    let expected = {
      data: {
        Camera: [
          {
            id: 'cam003',
            type: 'macro',
            operators: [
              {
                userId: 'man004',
                __typename: 'User'
              },
              {
                userId: 'man003',
                name: 'Johnnie Zoom',
                __typename: 'CameraMan'
              }
            ],
            __typename: 'OldCamera'
          }
        ]
      }
    };

    await client
      .query({
        query: gql`
          query {
            Camera {
              ... on OldCamera {
                id
                type
                operators {
                  userId
                  ...CameraManFragment
                }
              }
            }
          }
          fragment CameraManFragment on CameraMan {
            name
          }
        `
      })
      .then(data => {
        t.deepEqual(data.data, expected.data);
      })
      .catch(error => {
        t.fail(error.message);
      })
      .finally(async () => {
        await client.mutate({
          mutation: gql`
            mutation {
              DeleteOldCamera(id: "cam003") {
                id
              }
              DeleteNewCamera(id: "cam004") {
                id
              }
              DeleteUser(userId: "man004") {
                userId
              }
              DeleteCameraMan(userId: "man003") {
                userId
              }
            }
          `
        });
      });
  }
);

test.serial('query union type using complex fragments', async t => {
  t.plan(1);

  await client.mutate({
    mutation: gql`
      mutation {
        CreateOldCamera(id: "cam009", type: "macro", weight: 99) {
          id
        }
        CreateUser(userId: "man009", name: "Johnnie Zoooooooom") {
          userId
        }
      }
    `
  });

  let expected = {
    data: {
      MovieSearch: [
        {
          __typename: 'Movie',
          movieId: '12dd334d5zaaaa',
          title: 'My Super Awesome Movie'
        },
        {
          __typename: 'OldCamera',
          id: 'cam009',
          type: 'macro'
        },
        {
          userId: 'man009',
          name: 'Johnnie Zoooooooom',
          __typename: 'User'
        }
      ]
    }
  };

  await client
    .query({
      query: gql`
        query {
          MovieSearch {
            ... on Movie {
              movieId
            }
            ... on User {
              userId
            }
            ... on Camera {
              __typename
              ... on OldCamera {
                id
                type
              }
            }
            ...MovieFragment
            ... on Person {
              ... on CameraMan {
                _id
              }
            }
            ...PersonFragment
          }
        }

        fragment MovieFragment on Movie {
          title
        }

        fragment PersonFragment on Person {
          ... on User {
            userId
            name
          }
          __typename
        }
      `
    })
    .then(data => {
      t.deepEqual(data.data, expected.data);
    })
    .catch(error => {
      t.fail(error.message);
    })
    .finally(async () => {
      await client.mutate({
        mutation: gql`
          mutation {
            DeleteOldCamera(id: "cam009") {
              id
            }
            DeleteUser(userId: "man009") {
              userId
            }
          }
        `
      });
    });
});

/*
 * Temporal type tests
 */

// Temporal node property
test.serial(
  'Temporal - Create node with temporal property (not-isolated)',
  async t => {
    t.plan(1);

    let expected = {
      data: {
        CreateMovie: {
          __typename: 'Movie',
          title: 'Bob Loblaw',
          dateTime: {
            __typename: '_Neo4jDateTime',
            year: 2010,
            month: 1,
            day: 2
          }
        }
      }
    };

    await client
      .mutate({
        mutation: gql`
          mutation {
            CreateMovie(
              title: "Bob Loblaw"
              imdbRating: 2.0
              year: 2010
              dateTime: { year: 2010, month: 1, day: 2 }
            ) {
              title
              dateTime {
                year
                month
                day
              }
            }
          }
        `
      })
      .then(data => {
        t.deepEqual(data, expected);
      })
      .catch(error => {
        t.fail(error.message);
      });
  }
);

test.serial(
  'Temporal - Create node with multiple temporal fields and input formats (not-isolated)',
  async t => {
    t.plan(1);

    let expected = {
      data: {
        CreateMovie: {
          __typename: 'Movie',
          title: 'Bob Loblaw 2',
          dateTime: {
            __typename: '_Neo4jDateTime',
            year: 2010,
            month: 1,
            day: 2,
            formatted: '2010-01-02T00:00:00Z'
          },
          localDateTime: {
            __typename: '_Neo4jLocalDateTime',
            formatted: '2010-01-02T00:00:00'
          },
          date: {
            __typename: '_Neo4jDate',
            formatted: '2010-01-02'
          }
        }
      }
    };

    await client
      .mutate({
        mutation: gql`
          mutation {
            CreateMovie(
              title: "Bob Loblaw 2"
              imdbRating: 2.0
              year: 2010
              localDateTime: { formatted: "2010-01-02T00:00:00" }
              dateTime: { year: 2010, month: 1, day: 2 }
              date: { formatted: "2010-01-02" }
            ) {
              title
              dateTime {
                year
                month
                day
                formatted
              }
              localDateTime {
                formatted
              }
              date {
                formatted
              }
            }
          }
        `
      })
      .then(data => {
        t.deepEqual(data, expected);
      })
      .catch(error => {
        t.fail(error.message);
      });
  }
);

test.serial(
  'Temporal - Create node with multiple temporal fields and input formats - with GraphQL variables (not-isolated)',
  async t => {
    t.plan(1);

    let expected = {
      data: {
        CreateMovie: {
          __typename: 'Movie',
          title: 'Bob Loblaw 3',
          dateTime: {
            __typename: '_Neo4jDateTime',
            year: 2010,
            month: 1,
            day: 2,
            formatted: '2010-01-02T00:00:00Z'
          },
          localDateTime: {
            __typename: '_Neo4jLocalDateTime',
            formatted: '2010-01-02T00:00:00'
          },
          date: {
            __typename: '_Neo4jDate',
            formatted: '2010-01-02'
          }
        }
      }
    };

    await client
      .mutate({
        mutation: gql`
          mutation createWithTemporalFields(
            $title: String
            $localDateTimeInput: _Neo4jLocalDateTimeInput
            $dateInput: _Neo4jDateInput
          ) {
            CreateMovie(
              title: $title
              imdbRating: 2.0
              year: 2010
              localDateTime: $localDateTimeInput
              dateTime: { year: 2010, month: 1, day: 2 }
              date: $dateInput
            ) {
              title
              dateTime {
                year
                month
                day
                formatted
              }
              localDateTime {
                formatted
              }
              date {
                formatted
              }
            }
          }
        `,
        variables: {
          title: 'Bob Loblaw 3',
          localDateTimeInput: { formatted: '2010-01-02T00:00:00' },
          dateInput: { formatted: '2010-01-02' }
        }
      })
      .then(data => {
        t.deepEqual(data, expected);
      })
      .catch(error => {
        t.fail(error.message);
      });
  }
);

test.serial(
  'Temporal - Query node with temporal field (not-isolated)',
  async t => {
    let expected = {
      data: {
        Movie: [
          {
            __typename: 'Movie',
            title: 'Bob Loblaw 3',
            date: {
              __typename: '_Neo4jDate',
              formatted: '2010-01-02'
            },
            localDateTime: {
              __typename: '_Neo4jLocalDateTime',
              day: 2,
              month: 1,
              year: 2010,
              hour: 0,
              minute: 0,
              second: 0,
              formatted: '2010-01-02T00:00:00'
            },
            dateTime: {
              __typename: '_Neo4jDateTime',
              timezone: 'Z',
              day: 2,
              month: 1,
              year: 2010,
              hour: 0,
              minute: 0,
              second: 0,
              millisecond: 0,
              nanosecond: 0
            }
          }
        ]
      }
    };

    await client
      .query({
        query: gql`
          {
            Movie(title: "Bob Loblaw 3") {
              title
              date {
                formatted
              }
              localDateTime {
                day
                month
                year
                hour
                minute
                second
                formatted
              }
              dateTime {
                timezone
                day
                month
                year
                hour
                minute
                second
                millisecond
                nanosecond
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
  'Temporal - create node with only a temporal property (not-isolated)',
  async t => {
    t.plan(1);

    let expected = {
      data: {
        CreateOnlyDate: {
          __typename: 'OnlyDate',
          date: {
            __typename: '_Neo4jDate',
            formatted: '2020-11-10'
          }
        }
      }
    };

    await client
      .mutate({
        mutation: gql`
          mutation {
            CreateOnlyDate(date: { day: 10, month: 11, year: 2020 }) {
              date {
                formatted
              }
            }
          }
        `
      })
      .then(data => {
        t.deepEqual(data, expected);
      })
      .catch(error => {
        t.fail(error.message);
      });
  }
);

test.serial(
  'Temporal - temporal query argument, components (not-isolated)',
  async t => {
    t.plan(1);

    let expected = {
      data: {
        OnlyDate: [
          {
            __typename: 'OnlyDate',
            date: {
              __typename: '_Neo4jDate',
              formatted: '2020-11-10'
            }
          }
        ]
      }
    };

    await client
      .query({
        query: gql`
          {
            OnlyDate(date: { day: 10, month: 11, year: 2020 }) {
              date {
                formatted
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
  'Temporal - temporal query argument, formatted (not-isolated)',
  async t => {
    t.plan(1);

    let expected = {
      data: {
        OnlyDate: [
          {
            __typename: 'OnlyDate',
            date: {
              __typename: '_Neo4jDate',
              formatted: '2020-11-10'
            }
          }
        ]
      }
    };

    await client
      .query({
        query: gql`
          {
            OnlyDate(date: { formatted: "2020-11-10" }) {
              date {
                formatted
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
  'Add relationship with temporal property (not-isolated)',
  async t => {
    t.plan(1);

    let expected = {
      data: {
        AddMovieRatings: {
          __typename: '_AddMovieRatingsPayload',
          date: {
            __typename: '_Neo4jDate',
            formatted: '2018-12-18'
          },
          rating: 5
        }
      }
    };

    await client
      .mutate({
        mutation: gql`
          mutation {
            AddMovieRatings(
              from: { userId: 18 }
              to: { movieId: 6683 }
              data: { rating: 5, date: { year: 2018, month: 12, day: 18 } }
            ) {
              date {
                formatted
              }
              rating
            }
          }
        `
      })
      .then(data => {
        t.deepEqual(data, expected);
      })
      .catch(error => {
        t.fail(error.message);
      });
  }
);

test.serial(
  'Merge relationship with temporal property (not-isolated)',
  async t => {
    t.plan(1);

    let expected = {
      data: {
        MergeMovieRatings: {
          __typename: '_MergeMovieRatingsPayload',
          date: {
            __typename: '_Neo4jDate',
            formatted: '2018-12-18'
          },
          rating: 9
        }
      }
    };

    await client
      .mutate({
        mutation: gql`
          mutation {
            MergeMovieRatings(
              from: { userId: 18 }
              to: { movieId: 6683 }
              data: { rating: 9, date: { year: 2018, month: 12, day: 18 } }
            ) {
              date {
                formatted
              }
              rating
            }
          }
        `
      })
      .then(data => {
        t.deepEqual(data, expected);
      })
      .catch(error => {
        t.fail(error.message);
      });
  }
);

test.serial(
  'Update relationship with temporal property (not-isolated)',
  async t => {
    t.plan(1);

    let expected = {
      data: {
        UpdateMovieRatings: {
          __typename: '_UpdateMovieRatingsPayload',
          date: {
            __typename: '_Neo4jDate',
            formatted: '2018-12-18'
          },
          rating: 7
        }
      }
    };

    await client
      .mutate({
        mutation: gql`
          mutation {
            UpdateMovieRatings(
              from: { userId: 18 }
              to: { movieId: 6683 }
              data: { rating: 7, date: { year: 2018, month: 12, day: 18 } }
            ) {
              date {
                formatted
              }
              rating
            }
          }
        `
      })
      .then(data => {
        t.deepEqual(data, expected);
      })
      .catch(error => {
        t.fail(error.message);
      });
  }
);

test.serial(
  'Query for temporal property on relationship (not-isolated)',
  async t => {
    t.plan(1);

    let expected = {
      data: {
        Movie: [
          {
            __typename: 'Movie',
            title: 'Fire',
            ratings: [
              {
                __typename: '_MovieRatings',
                date: {
                  __typename: '_Neo4jDate',
                  formatted: '2018-12-18'
                },
                rating: 7
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
            Movie(movieId: 6683) {
              title
              ratings {
                date {
                  formatted
                }
                rating
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

/*
 * Spatial type tests
 */

// Spatial node property
test.serial(
  'Spatial - Create node with spatial property (not-isolated)',
  async t => {
    t.plan(1);

    let expected = {
      data: {
        CreateMovie: {
          __typename: 'Movie',
          title: 'Bob Loblaw 4',
          location: {
            __typename: '_Neo4jPoint',
            latitude: 20,
            longitude: 10,
            height: 30
          }
        }
      }
    };

    await client
      .mutate({
        mutation: gql`
          mutation {
            CreateMovie(
              title: "Bob Loblaw 4"
              location: { longitude: 10, latitude: 20, height: 30 }
            ) {
              title
              location {
                longitude
                latitude
                height
              }
            }
          }
        `
      })
      .then(data => {
        t.deepEqual(data, expected);
      })
      .catch(error => {
        t.fail(error.message);
      });
  }
);

test.serial(
  'Spatial - Create node with spatial property - with GraphQL variables (not-isolated)',
  async t => {
    t.plan(1);

    let expected = {
      data: {
        CreateMovie: {
          __typename: 'Movie',
          title: 'Bob Loblaw 5',
          location: {
            __typename: '_Neo4jPoint',
            latitude: 40,
            longitude: 50,
            height: 60
          }
        }
      }
    };

    await client
      .mutate({
        mutation: gql`
          mutation createWithSpatialFields(
            $title: String
            $locationInput: _Neo4jPointInput
          ) {
            CreateMovie(title: $title, location: $locationInput) {
              title
              location {
                longitude
                latitude
                height
              }
            }
          }
        `,
        variables: {
          title: 'Bob Loblaw 5',
          locationInput: {
            longitude: 50,
            latitude: 40,
            height: 60
          }
        }
      })
      .then(data => {
        t.deepEqual(data, expected);
      })
      .catch(error => {
        t.fail(error.message);
      });
  }
);

test.serial(
  'Spatial - Query node with spatial field (not-isolated)',
  async t => {
    let expected = {
      data: {
        Movie: [
          {
            __typename: 'Movie',
            location: {
              __typename: '_Neo4jPoint',
              crs: 'wgs-84-3d',
              height: 60,
              latitude: 40,
              longitude: 50
            },
            title: 'Bob Loblaw 5'
          }
        ]
      }
    };

    await client
      .query({
        query: gql`
          {
            Movie(title: "Bob Loblaw 5") {
              title
              location {
                longitude
                latitude
                height
                crs
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
  'Spatial - create node with only a spatial property (not-isolated)',
  async t => {
    t.plan(1);

    let expected = {
      data: {
        CreateSpatialNode: {
          __typename: 'SpatialNode',
          id: 'xyz',
          point: {
            __typename: '_Neo4jPoint',
            crs: 'wgs-84-3d',
            latitude: 20,
            longitude: 10,
            height: 30
          }
        }
      }
    };

    await client
      .mutate({
        mutation: gql`
          mutation {
            CreateSpatialNode(
              id: "xyz"
              point: { longitude: 10, latitude: 20, height: 30 }
            ) {
              id
              point {
                longitude
                latitude
                height
                crs
              }
            }
          }
        `
      })
      .then(data => {
        t.deepEqual(data, expected);
      })
      .catch(error => {
        t.fail(error.message);
      });
  }
);

test.serial(
  'Spatial - spatial query argument, components (not-isolated)',
  async t => {
    t.plan(1);

    let expected = {
      data: {
        SpatialNode: [
          {
            __typename: 'SpatialNode',
            id: 'xyz',
            point: {
              __typename: '_Neo4jPoint',
              crs: 'wgs-84-3d',
              latitude: 20,
              longitude: 10,
              height: 30
            }
          }
        ]
      }
    };

    await client
      .query({
        query: gql`
          {
            SpatialNode(point: { longitude: 10, latitude: 20, height: 30 }) {
              id
              point {
                longitude
                latitude
                height
                crs
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

test.serial('Spatial - filtering - field equal to given value', async t => {
  t.plan(1);
  let expected = {
    data: {
      SpatialNode: [
        {
          __typename: 'SpatialNode',
          point: {
            __typename: '_Neo4jPoint',
            crs: 'wgs-84-3d',
            latitude: 20,
            longitude: 10,
            height: 30
          }
        }
      ]
    }
  };
  await client
    .query({
      query: gql`
        {
          SpatialNode(filter: { point: { longitude: 10 } }) {
            point {
              longitude
              latitude
              height
              crs
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
});

test.serial(
  'Spatial - filtering - field different from given value',
  async t => {
    t.plan(1);
    let expected = {
      data: {
        Movie: [
          {
            __typename: 'Movie',
            location: {
              __typename: '_Neo4jPoint',
              crs: 'wgs-84-3d',
              height: 60,
              latitude: 40,
              longitude: 50
            },
            title: 'Bob Loblaw 5'
          }
        ]
      }
    };
    await client
      .query({
        query: gql`
          {
            Movie(
              title: "Bob Loblaw 5"
              filter: { location_not: { longitude: 10, height: 30 } }
            ) {
              title
              location {
                longitude
                latitude
                height
                crs
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
  'Spatial - filtering - field distance with given Point value less than given value',
  async t => {
    t.plan(1);
    let expected = {
      data: {
        Movie: [
          {
            __typename: 'Movie',
            location: {
              __typename: '_Neo4jPoint',
              longitude: 10,
              latitude: 20,
              height: 30,
              crs: 'wgs-84-3d'
            }
          }
        ]
      }
    };
    await client
      .query({
        query: gql`
          {
            Movie(
              filter: {
                location_distance_lt: {
                  point: { longitude: 10, latitude: 20, height: 30 }
                  distance: 100
                }
              }
            ) {
              location {
                longitude
                latitude
                height
                crs
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

test('Basic filter', async t => {
  t.plan(1);

  let expected = {
    data: {
      Movie: [
        {
          __typename: 'Movie',
          title: '20,000 Leagues Under the Sea'
        },
        {
          __typename: 'Movie',
          title: 'Billy Blazes, Esq.'
        },
        {
          __typename: 'Movie',
          title: 'Birth of a Nation, The'
        },
        {
          __typename: 'Movie',
          title: "Dog's Life, A"
        },
        {
          __typename: 'Movie',
          title: 'Immigrant, The'
        },
        {
          __typename: 'Movie',
          title: "Intolerance: Love's Struggle Throughout the Ages"
        },
        {
          __typename: 'Movie',
          title: 'Trip to the Moon, A (Voyage dans la lune, Le)'
        }
      ]
    }
  };

  await client
    .query({
      query: gql`
        {
          Movie(filter: { year_lt: 1920 }, orderBy: [title_asc]) {
            title
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
});

test.before(
  'Prepare Apollo generated filters test with underscores',
  async t => {
    t.plan(1);

    let expected = {
      data: {
        UpdateMovie: {
          __typename: 'Movie',
          someprefix_title_with_underscores: 'Legends of the Fall'
        }
      }
    };

    await client
      .mutate({
        mutation: gql`
          mutation updateMutation {
            UpdateMovie(
              movieId: "266"
              someprefix_title_with_underscores: "Legends of the Fall"
            ) {
              someprefix_title_with_underscores
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

test('Basic filter using Apollo generated filters underscore test', async t => {
  t.plan(1);

  let expected = {
    data: {
      Movie: [
        {
          __typename: 'Movie',
          title: 'Legends of the Fall'
        }
      ]
    }
  };

  await client
    .query({
      query: gql`
        {
          Movie(
            filter: {
              someprefix_title_with_underscores_starts_with: "Legends of the"
            }
          ) {
            title
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
});

test('Filter with AND', async t => {
  t.plan(1);

  let expected = {
    data: {
      Movie: [
        {
          __typename: 'Movie',
          title: 'Billy Blazes, Esq.'
        },
        {
          __typename: 'Movie',
          title: 'Birth of a Nation, The'
        }
      ]
    }
  };

  await client
    .query({
      query: gql`
        {
          Movie(
            filter: { AND: [{ year_lt: 1920, title_starts_with: "B" }] }
            orderBy: [title_asc]
          ) {
            title
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
});

test('Filter with OR', async t => {
  t.plan(1);

  let expected = {
    data: {
      Movie: [
        {
          __typename: 'Movie',
          title: '20,000 Leagues Under the Sea'
        },
        {
          __typename: 'Movie',
          title: 'Billy Blazes, Esq.'
        },
        {
          __typename: 'Movie',
          title: 'Birth of a Nation, The'
        },
        {
          __typename: 'Movie',
          title: "Dog's Life, A"
        },
        {
          __typename: 'Movie',
          title: 'Immigrant, The'
        },
        {
          __typename: 'Movie',
          title: "Intolerance: Love's Struggle Throughout the Ages"
        },
        {
          __typename: 'Movie',
          title: 'River Runs Through It, A'
        },
        {
          __typename: 'Movie',
          title: 'Trip to the Moon, A (Voyage dans la lune, Le)'
        }
      ]
    }
  };

  await client
    .query({
      query: gql`
        {
          Movie(
            filter: {
              OR: [{ year_lt: 1920 }, { title_contains: "River Runs" }]
            }
            orderBy: [title_asc]
          ) {
            title
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
});

test('Filter with nested AND and OR', async t => {
  t.plan(1);

  let expected = {
    data: {
      Movie: [
        {
          __typename: 'Movie',
          title: '20,000 Leagues Under the Sea',
          genres: [
            {
              __typename: 'Genre',
              name: 'Sci-Fi'
            },
            {
              __typename: 'Genre',
              name: 'Adventure'
            },
            {
              __typename: 'Genre',
              name: 'Action'
            }
          ]
        },
        {
          __typename: 'Movie',
          title: 'Babylon 5: The River of Souls',
          genres: [
            {
              __typename: 'Genre',
              name: 'Sci-Fi'
            },
            {
              __typename: 'Genre',
              name: 'Drama'
            }
          ]
        },
        {
          __typename: 'Movie',
          title: 'Billy Blazes, Esq.',
          genres: [
            {
              __typename: 'Genre',
              name: 'Western'
            },
            {
              __typename: 'Genre',
              name: 'Comedy'
            }
          ]
        },
        {
          __typename: 'Movie',
          title: 'Birth of a Nation, The',
          genres: [
            {
              __typename: 'Genre',
              name: 'War'
            },
            {
              __typename: 'Genre',
              name: 'Drama'
            }
          ]
        },
        {
          __typename: 'Movie',
          title: 'Bridge on the River Kwai, The',
          genres: [
            {
              __typename: 'Genre',
              name: 'Drama'
            },
            {
              __typename: 'Genre',
              name: 'Adventure'
            },
            {
              __typename: 'Genre',
              name: 'War'
            }
          ]
        },
        {
          __typename: 'Movie',
          title: 'Crimson Rivers, The (Rivières pourpres, Les)',
          genres: [
            {
              __typename: 'Genre',
              name: 'Drama'
            },
            {
              __typename: 'Genre',
              name: 'Crime'
            },
            {
              __typename: 'Genre',
              name: 'Mystery'
            },
            {
              __typename: 'Genre',
              name: 'Thriller'
            }
          ]
        },
        {
          __typename: 'Movie',
          title: "Dog's Life, A",
          genres: [
            {
              __typename: 'Genre',
              name: 'Comedy'
            }
          ]
        },
        {
          __typename: 'Movie',
          title: 'Frozen River',
          genres: [
            {
              __typename: 'Genre',
              name: 'Drama'
            }
          ]
        },
        {
          __typename: 'Movie',
          title: 'Immigrant, The',
          genres: [
            {
              __typename: 'Genre',
              name: 'Comedy'
            }
          ]
        },
        {
          __typename: 'Movie',
          title: "Intolerance: Love's Struggle Throughout the Ages",
          genres: [
            {
              __typename: 'Genre',
              name: 'Drama'
            }
          ]
        },
        {
          __typename: 'Movie',
          title: 'Man from Snowy River, The',
          genres: [
            {
              __typename: 'Genre',
              name: 'Western'
            },
            {
              __typename: 'Genre',
              name: 'Romance'
            },
            {
              __typename: 'Genre',
              name: 'Drama'
            }
          ]
        },
        {
          __typename: 'Movie',
          title: 'Mystic River',
          genres: [
            {
              __typename: 'Genre',
              name: 'Drama'
            },
            {
              __typename: 'Genre',
              name: 'Mystery'
            },
            {
              __typename: 'Genre',
              name: 'Crime'
            }
          ]
        },
        {
          __typename: 'Movie',
          title: 'Return to Snowy River (a.k.a. The Man From Snowy River II)',
          genres: [
            {
              __typename: 'Genre',
              name: 'Western'
            },
            {
              __typename: 'Genre',
              name: 'Drama'
            },
            {
              __typename: 'Genre',
              name: 'Adventure'
            }
          ]
        },
        {
          __typename: 'Movie',
          title: 'River Runs Through It, A',
          genres: [
            {
              __typename: 'Genre',
              name: 'Drama'
            }
          ]
        },
        {
          __typename: 'Movie',
          title: "River's Edge",
          genres: [
            {
              __typename: 'Genre',
              name: 'Drama'
            },
            {
              __typename: 'Genre',
              name: 'Crime'
            }
          ]
        },
        {
          __typename: 'Movie',
          title: 'River, The',
          genres: [
            {
              __typename: 'Genre',
              name: 'Drama'
            }
          ]
        },
        {
          __typename: 'Movie',
          title: 'Trip to the Moon, A (Voyage dans la lune, Le)',
          genres: [
            {
              __typename: 'Genre',
              name: 'Action'
            },
            {
              __typename: 'Genre',
              name: 'Adventure'
            },
            {
              __typename: 'Genre',
              name: 'Fantasy'
            },
            {
              __typename: 'Genre',
              name: 'Sci-Fi'
            }
          ]
        },
        {
          __typename: 'Movie',
          title: 'Wild River',
          genres: [
            {
              __typename: 'Genre',
              name: 'Romance'
            },
            {
              __typename: 'Genre',
              name: 'Drama'
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
          Movie(
            filter: {
              OR: [
                { year_lt: 1920 }
                {
                  AND: [
                    { title_contains: "River" }
                    { genres_some: { name: "Drama" } }
                  ]
                }
              ]
            }
            orderBy: [title_asc]
          ) {
            title
            genres {
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
      t.fail(error.message);
    });
});

test('Filter in selection', async t => {
  t.plan(1);

  let expected = {
    data: {
      Movie: [
        {
          __typename: 'Movie',
          title: '20,000 Leagues Under the Sea',
          genres: []
        },
        {
          __typename: 'Movie',
          title: 'Babylon 5: The River of Souls',
          genres: [
            {
              __typename: 'Genre',
              name: 'Drama'
            }
          ]
        },
        {
          __typename: 'Movie',
          title: 'Billy Blazes, Esq.',
          genres: []
        },
        {
          __typename: 'Movie',
          title: 'Birth of a Nation, The',
          genres: [
            {
              __typename: 'Genre',
              name: 'Drama'
            }
          ]
        },
        {
          __typename: 'Movie',
          title: 'Bridge on the River Kwai, The',
          genres: [
            {
              __typename: 'Genre',
              name: 'Drama'
            }
          ]
        },
        {
          __typename: 'Movie',
          title: 'Crimson Rivers, The (Rivières pourpres, Les)',
          genres: [
            {
              __typename: 'Genre',
              name: 'Drama'
            }
          ]
        },
        {
          __typename: 'Movie',
          title: "Dog's Life, A",
          genres: []
        },
        {
          __typename: 'Movie',
          title: 'Frozen River',
          genres: [
            {
              __typename: 'Genre',
              name: 'Drama'
            }
          ]
        },
        {
          __typename: 'Movie',
          title: 'Immigrant, The',
          genres: []
        },
        {
          __typename: 'Movie',
          title: "Intolerance: Love's Struggle Throughout the Ages",
          genres: [
            {
              __typename: 'Genre',
              name: 'Drama'
            }
          ]
        },
        {
          __typename: 'Movie',
          title: 'Man from Snowy River, The',
          genres: [
            {
              __typename: 'Genre',
              name: 'Drama'
            }
          ]
        },
        {
          __typename: 'Movie',
          title: 'Mystic River',
          genres: [
            {
              __typename: 'Genre',
              name: 'Drama'
            }
          ]
        },
        {
          __typename: 'Movie',
          title: 'Return to Snowy River (a.k.a. The Man From Snowy River II)',
          genres: [
            {
              __typename: 'Genre',
              name: 'Drama'
            }
          ]
        },
        {
          __typename: 'Movie',
          title: 'River Runs Through It, A',
          genres: [
            {
              __typename: 'Genre',
              name: 'Drama'
            }
          ]
        },
        {
          __typename: 'Movie',
          title: "River's Edge",
          genres: [
            {
              __typename: 'Genre',
              name: 'Drama'
            }
          ]
        },
        {
          __typename: 'Movie',
          title: 'River, The',
          genres: [
            {
              __typename: 'Genre',
              name: 'Drama'
            }
          ]
        },
        {
          __typename: 'Movie',
          title: 'Trip to the Moon, A (Voyage dans la lune, Le)',
          genres: []
        },
        {
          __typename: 'Movie',
          title: 'Wild River',
          genres: [
            {
              __typename: 'Genre',
              name: 'Drama'
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
          Movie(
            filter: {
              OR: [
                { year_lt: 1920 }
                {
                  AND: [
                    { title_contains: "River" }
                    { genres_some: { name: "Drama" } }
                  ]
                }
              ]
            }
            orderBy: [title_asc]
          ) {
            title
            genres(filter: { name: "Drama" }) {
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
      t.fail(error.message);
    });
});

test('Nested filter', async t => {
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
              name: 'Craig Sheffer'
            },
            {
              __typename: 'Actor',
              name: 'Tom Skerritt'
            },
            {
              __typename: 'Actor',
              name: 'Brad Pitt'
            },
            {
              __typename: 'Actor',
              name: 'Brenda Blethyn'
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
          Movie(
            filter: {
              title_starts_with: "River"
              actors_some: { name_contains: "Brad" }
            }
            orderBy: [title_asc]
          ) {
            title
            actors {
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
      t.fail(error.message);
    });
});

test('Filter with GraphQL variable', async t => {
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
              name: 'Craig Sheffer'
            },
            {
              __typename: 'Actor',
              name: 'Tom Skerritt'
            },
            {
              __typename: 'Actor',
              name: 'Brad Pitt'
            },
            {
              __typename: 'Actor',
              name: 'Brenda Blethyn'
            }
          ]
        }
      ]
    }
  };

  await client
    .query({
      query: gql`
        query NestedFilterWithVars($title: String, $name: String) {
          Movie(
            filter: {
              title_starts_with: $title
              actors_some: { name_contains: $name }
            }
            orderBy: [title_asc]
          ) {
            title
            actors {
              name
            }
          }
        }
      `,
      variables: {
        title: 'River',
        name: 'Brad'
      }
    })
    .then(data => {
      t.deepEqual(data.data, expected.data);
    })
    .catch(error => {
      t.fail(error.message);
    });
});
