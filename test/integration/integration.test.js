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

test('Mutation with @cypher directive (not-isolated)', async t => {
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

test('Create node mutation (not-isolated)', async t => {
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
      t.fail(error);
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
      t.fail(error);
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
      t.fail(error);
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
      t.fail(error);
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
      t.fail(error);
    });
});

test('query using inine fragment', async t => {
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
      t.fail(error);
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
        t.fail(error);
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
        t.fail(error);
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
        t.fail(error);
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
        t.fail(error);
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
        t.fail(error);
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
        t.fail(error);
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
        t.fail(error);
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
        t.fail(error);
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
                rating: 5
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
        t.fail(error);
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
      t.fail(error);
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
      t.fail(error);
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
      t.fail(error);
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
      t.fail(error);
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
      t.fail(error);
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
      t.fail(error);
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
      t.fail(error);
    });
});
