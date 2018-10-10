import test from 'ava';
import {
  cypherTestRunner,
  augmentedSchemaCypherTestRunner
} from './helpers/cypherTestHelpers';

test('simple Cypher query', t => {
  const graphQLQuery = `{
    Movie(title: "River Runs Through It, A") {
      title
    }
  }`,
    expectedCypherQuery = `MATCH (movie:Movie {title:$title}) RETURN movie { .title } AS movie SKIP $offset`;

  t.plan(3);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, {
      title: 'River Runs Through It, A',
      first: -1,
      offset: 0
    }),
    augmentedSchemaCypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery)
  ]);
});

test('Simple skip limit', t => {
  const graphQLQuery = `{
  Movie(title: "River Runs Through It, A", first: 1, offset: 0) {
    title
    year
  }
}
  `,
    expectedCypherQuery =
      'MATCH (movie:Movie {title:$title}) RETURN movie { .title , .year } AS movie SKIP $offset LIMIT $first';

  t.plan(3);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, {
      title: 'River Runs Through It, A',
      first: 1,
      offset: 0
    }),
    augmentedSchemaCypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery)
  ]);
});

test('Cypher projection skip limit', t => {
  const graphQLQuery = `{
    Movie(title: "River Runs Through It, A") {
      title
      actors {
        name
      }
      similar(first: 3) {
        title
      }
    }
  }`,
    expectedCypherQuery =
      'MATCH (movie:Movie {title:$title}) RETURN movie { .title ,actors: [(movie)<-[:ACTED_IN]-(movie_actors:Actor) | movie_actors { .name }] ,similar: [ movie_similar IN apoc.cypher.runFirstColumn("WITH {this} AS this MATCH (this)--(:Genre)--(o:Movie) RETURN o", {this: movie, first: 3, offset: 0}, true) | movie_similar { .title }][..3] } AS movie SKIP $offset';

  t.plan(3);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, {
      title: 'River Runs Through It, A',
      '1_first': 3,
      first: -1,
      offset: 0
    }),
    augmentedSchemaCypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery)
  ]);
});

test('Handle Query with name not aligning to type', t => {
  const graphQLQuery = `{
  MoviesByYear(year: 2010) {
    title
  }
}
  `,
    expectedCypherQuery =
      'MATCH (movie:Movie {year:$year}) RETURN movie { .title } AS movie SKIP $offset';

  t.plan(3);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, {
      year: 2010,
      first: -1,
      offset: 0
    }),
    augmentedSchemaCypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery)
  ]);
});

test('Query without arguments, non-null type', t => {
  const graphQLQuery = `query {
  Movie {
    movieId
  }
}`,
    expectedCypherQuery =
      'MATCH (movie:Movie {}) RETURN movie { .movieId } AS movie SKIP $offset';

  t.plan(3);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, {
      first: -1,
      offset: 0
    }),
    augmentedSchemaCypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery)
  ]);
});

test('Query single object', t => {
  const graphQLQuery = `
  {
    MovieById(movieId: "18") {
      title
    }
  }`,
    expectedCypherQuery =
      'MATCH (movie:Movie {movieId:$movieId}) RETURN movie { .title } AS movie SKIP $offset';

  t.plan(3);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, {
      movieId: '18',
      first: -1,
      offset: 0
    }),
    augmentedSchemaCypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery)
  ]);
});

test('Query single object relation', t => {
  const graphQLQuery = `
    {
      MovieById(movieId: "3100") {
        title
        filmedIn {
          name
        }
      }
    }
  `,
    expectedCypherQuery =
      'MATCH (movie:Movie {movieId:$movieId}) RETURN movie { .title ,filmedIn: head([(movie)-[:FILMED_IN]->(movie_filmedIn:State) | movie_filmedIn { .name }]) } AS movie SKIP $offset';

  t.plan(3);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, {
      movieId: '3100',
      first: -1,
      offset: 0
    }),
    augmentedSchemaCypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery)
  ]);
});

test('Query single object and array of objects relations', t => {
  const graphQLQuery = `
    {
      MovieById(movieId: "3100") {
        title
        actors {
          name
        }
        filmedIn{
          name
        }
      }
    }`,
    expectedCypherQuery =
      'MATCH (movie:Movie {movieId:$movieId}) RETURN movie { .title ,actors: [(movie)<-[:ACTED_IN]-(movie_actors:Actor) | movie_actors { .name }] ,filmedIn: head([(movie)-[:FILMED_IN]->(movie_filmedIn:State) | movie_filmedIn { .name }]) } AS movie SKIP $offset';

  t.plan(3);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, {
      movieId: '3100',
      first: -1,
      offset: 0
    }),
    augmentedSchemaCypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery)
  ]);
});

test('Deeply nested object query', t => {
  const graphQLQuery = `
 {
  Movie(title: "River Runs Through It, A") {
		title
    actors {
      name
      movies {
        title
        actors(name: "Tom Hanks") {
          name
          movies {
            title
            year
            similar(first: 3) {
              title
              year
            }
          }
        }
      }
    }
  }
}`,
    expectedCypherQuery = `MATCH (movie:Movie {title:$title}) RETURN movie { .title ,actors: [(movie)<-[:ACTED_IN]-(movie_actors:Actor) | movie_actors { .name ,movies: [(movie_actors)-[:ACTED_IN]->(movie_actors_movies:Movie) | movie_actors_movies { .title ,actors: [(movie_actors_movies)<-[:ACTED_IN]-(movie_actors_movies_actors:Actor{name:$1_name}) | movie_actors_movies_actors { .name ,movies: [(movie_actors_movies_actors)-[:ACTED_IN]->(movie_actors_movies_actors_movies:Movie) | movie_actors_movies_actors_movies { .title , .year ,similar: [ movie_actors_movies_actors_movies_similar IN apoc.cypher.runFirstColumn("WITH {this} AS this MATCH (this)--(:Genre)--(o:Movie) RETURN o", {this: movie_actors_movies_actors_movies, first: 3, offset: 0}, true) | movie_actors_movies_actors_movies_similar { .title , .year }][..3] }] }] }] }] } AS movie SKIP $offset`;

  t.plan(3);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, {
      title: 'River Runs Through It, A',
      '1_name': 'Tom Hanks',
      '2_first': 3,
      first: -1,
      offset: 0
    }),
    augmentedSchemaCypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery)
  ]);
});

test('Handle meta field at beginning of selection set', t => {
  const graphQLQuery = `
  {
    Movie(title:"River Runs Through It, A"){
      __typename
      title
    }
  }`,
    expectedCypherQuery = `MATCH (movie:Movie {title:$title}) RETURN movie { .title } AS movie SKIP $offset`;

  t.plan(3);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, {
      title: 'River Runs Through It, A',
      first: -1,
      offset: 0
    }),
    augmentedSchemaCypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery)
  ]);
});

test('Handle meta field at end of selection set', t => {
  const graphQLQuery = `
  {
    Movie(title:"River Runs Through It, A"){
      title
      __typename
    }
  }
  `,
    expectedCypherQuery = `MATCH (movie:Movie {title:$title}) RETURN movie { .title } AS movie SKIP $offset`;

  t.plan(3);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, {
      title: 'River Runs Through It, A',
      first: -1,
      offset: 0
    }),
    augmentedSchemaCypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery)
  ]);
});

test('Handle meta field in middle of selection set', t => {
  const graphQLQuery = `
  {
    Movie(title:"River Runs Through It, A"){
      title
      __typename
      year
    }
  }
  `,
    expectedCypherQuery = `MATCH (movie:Movie {title:$title}) RETURN movie { .title , .year } AS movie SKIP $offset`;

  t.plan(3);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, {
      title: 'River Runs Through It, A',
      first: -1,
      offset: 0
    }),
    augmentedSchemaCypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery)
  ]);
});

test('Handle @cypher directive without any params for sub-query', t => {
  const graphQLQuery = `{
    Movie(title: "River Runs Through It, A") {
      mostSimilar {
        title
        year
      }
    }

  }`,
    expectedCypherQuery = `MATCH (movie:Movie {title:$title}) RETURN movie {mostSimilar: head([ movie_mostSimilar IN apoc.cypher.runFirstColumn("WITH {this} AS this RETURN this", {this: movie}, true) | movie_mostSimilar { .title , .year }]) } AS movie SKIP $offset`;

  t.plan(3);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, {
      title: 'River Runs Through It, A',
      first: -1,
      offset: 0
    }),
    augmentedSchemaCypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery)
  ]);
});

test('Pass @cypher directive default params to sub-query', t => {
  const graphQLQuery = `{
    Movie(title: "River Runs Through It, A") {
      scaleRating
    }

  }`,
    expectedCypherQuery = `MATCH (movie:Movie {title:$title}) RETURN movie {scaleRating: apoc.cypher.runFirstColumn("WITH $this AS this RETURN $scale * this.imdbRating", {this: movie, scale: 3}, false)} AS movie SKIP $offset`;

  t.plan(3);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, {
      first: -1,
      offset: 0,
      title: 'River Runs Through It, A'
    }),
    augmentedSchemaCypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery)
  ]);
});

test('Pass @cypher directive params to sub-query', t => {
  const graphQLQuery = `{
    Movie(title: "River Runs Through It, A") {
      scaleRating(scale: 10)
    }

  }`,
    expectedCypherQuery = `MATCH (movie:Movie {title:$title}) RETURN movie {scaleRating: apoc.cypher.runFirstColumn("WITH $this AS this RETURN $scale * this.imdbRating", {this: movie, scale: 10}, false)} AS movie SKIP $offset`;

  t.plan(3);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, {
      first: -1,
      offset: 0,
      title: 'River Runs Through It, A',
      '1_scale': 10
    }),
    augmentedSchemaCypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery)
  ]);
});

test('Query for Neo4js internal _id', t => {
  const graphQLQuery = `{
    Movie(_id: 0) {
      title
      year
    }

  }`,
    expectedCypherQuery = `MATCH (movie:Movie {}) WHERE ID(movie)=0 RETURN movie { .title , .year } AS movie SKIP $offset`;

  t.plan(3);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, {
      first: -1,
      offset: 0
    }),
    augmentedSchemaCypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery)
  ]);
});

test('Query for Neo4js internal _id and another param before _id', t => {
  const graphQLQuery = `{
    Movie(title: "River Runs Through It, A", _id: 0) {
      title
      year
    }

  }`,
    expectedCypherQuery = `MATCH (movie:Movie {title:$title}) WHERE ID(movie)=0 RETURN movie { .title , .year } AS movie SKIP $offset`;

  t.plan(3);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, {
      title: 'River Runs Through It, A',
      first: -1,
      offset: 0
    }),
    augmentedSchemaCypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery)
  ]);
});

test('Query for Neo4js internal _id and another param after _id', t => {
  const graphQLQuery = `{
    Movie(_id: 0, year: 2010) {
      title
      year
    }

  }`,
    expectedCypherQuery = `MATCH (movie:Movie {year:$year}) WHERE ID(movie)=0 RETURN movie { .title , .year } AS movie SKIP $offset`;

  t.plan(3);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, {
      first: -1,
      offset: 0,
      year: 2010
    }),
    augmentedSchemaCypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery)
  ]);
});

test('Query for Neo4js internal _id by dedicated Query MovieBy_Id(_id: Int!)', t => {
  const graphQLQuery = `{
    MovieBy_Id(_id: 0) {
      title
      year
    }

  }`,
    expectedCypherQuery = `MATCH (movie:Movie {}) WHERE ID(movie)=0 RETURN movie { .title , .year } AS movie SKIP $offset`;

  t.plan(3);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, {
      first: -1,
      offset: 0
    }),
    augmentedSchemaCypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery)
  ]);
});

test(`Query for null value translates to 'IS NULL' WHERE clause`, t => {
  const graphQLQuery = `{
    Movie(poster: null) {
      title
      year
    }
  }`,
    expectedCypherQuery = `MATCH (movie:Movie {}) WHERE movie.poster IS NULL RETURN movie { .title , .year } AS movie SKIP $offset`;

  t.plan(3);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, {
      first: -1,
      offset: 0
    }),
    augmentedSchemaCypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery)
  ]);
});

test(`Query for null value combined with internal ID and another param`, t => {
  const graphQLQuery = `{
      Movie(poster: null, _id: 0, year: 2010) {
        title
        year
      }
    }`,
    expectedCypherQuery = `MATCH (movie:Movie {year:$year}) WHERE ID(movie)=0 AND movie.poster IS NULL RETURN movie { .title , .year } AS movie SKIP $offset`;

  t.plan(3);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, {
      year: 2010,
      first: -1,
      offset: 0
    }),
    augmentedSchemaCypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery)
  ]);
});

test('Cypher subquery filters', t => {
  const graphQLQuery = `
  {
    Movie(title: "River Runs Through It, A") {
        title
        actors(name: "Tom Hanks") {
          name
        }
        similar(first: 3) {
          title
        }
      }
    }`,
    expectedCypherQuery =
      'MATCH (movie:Movie {title:$title}) RETURN movie { .title ,actors: [(movie)<-[:ACTED_IN]-(movie_actors:Actor{name:$1_name}) | movie_actors { .name }] ,similar: [ movie_similar IN apoc.cypher.runFirstColumn("WITH {this} AS this MATCH (this)--(:Genre)--(o:Movie) RETURN o", {this: movie, first: 3, offset: 0}, true) | movie_similar { .title }][..3] } AS movie SKIP $offset';

  t.plan(3);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, {
      title: 'River Runs Through It, A',
      first: -1,
      offset: 0,
      '1_name': 'Tom Hanks',
      '3_first': 3
    }),
    augmentedSchemaCypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery)
  ]);
});

test('Cypher subquery filters with paging', t => {
  const graphQLQuery = `
  {
    Movie(title: "River Runs Through It, A") {
        title
        actors(name: "Tom Hanks", first: 3) {
          name
        }
        similar(first: 3) {
          title
        }
      }
    }`,
    expectedCypherQuery =
      'MATCH (movie:Movie {title:$title}) RETURN movie { .title ,actors: [(movie)<-[:ACTED_IN]-(movie_actors:Actor{name:$1_name}) | movie_actors { .name }][..3] ,similar: [ movie_similar IN apoc.cypher.runFirstColumn("WITH {this} AS this MATCH (this)--(:Genre)--(o:Movie) RETURN o", {this: movie, first: 3, offset: 0}, true) | movie_similar { .title }][..3] } AS movie SKIP $offset';

  t.plan(3);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, {
      title: 'River Runs Through It, A',
      first: -1,
      offset: 0,
      '1_first': 3,
      '1_name': 'Tom Hanks',
      '3_first': 3
    }),
    augmentedSchemaCypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery)
  ]);
});

test('Handle @cypher directive on Query Type', t => {
  const graphQLQuery = `
  {
  GenresBySubstring(substring:"Action") {
    name
    movies(first: 3) {
      title
    }
  }
}
  `,
    expectedCypherQuery = `WITH apoc.cypher.runFirstColumn("MATCH (g:Genre) WHERE toLower(g.name) CONTAINS toLower($substring) RETURN g", {substring:$substring}, True) AS x UNWIND x AS genre
    RETURN genre { .name ,movies: [(genre)<-[:IN_GENRE]-(genre_movies:Movie{}) | genre_movies { .title }][..3] } AS genre SKIP $offset`;

  t.plan(3);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, {
      substring: 'Action',
      first: -1,
      offset: 0,
      '1_first': 3
    }),
    augmentedSchemaCypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery)
  ]);
});

test.cb('Handle @cypher directive on Mutation type', t => {
  const graphQLQuery = `mutation someMutation {
  CreateGenre(name: "Wildlife Documentary") {
    name
  }
}`,
    expectedCypherQuery = `CALL apoc.cypher.doIt("CREATE (g:Genre) SET g.name = $name RETURN g", {name:$name}) YIELD value
    WITH apoc.map.values(value, [keys(value)[0]])[0] AS genre
    RETURN genre { .name } AS genre SKIP $offset`;

  t.plan(2);
  cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, {
    name: 'Wildlife Documentary',
    first: -1,
    offset: 0
  });
});

test.cb('Create node mutation', t => {
  const graphQLQuery = `	mutation someMutation {
  	CreateMovie(movieId: "12dd334d5", title:"My Super Awesome Movie", year:2018, plot:"An unending saga", poster:"www.movieposter.com/img.png", imdbRating: 1.0) {
			_id
      title
      genres {
        name
      }
    }
  }`,
    expectedCypherQuery = `CREATE (movie:Movie) SET movie = $params RETURN movie {_id: ID(movie), .title ,genres: [(movie)-[:IN_GENRE]->(movie_genres:Genre) | movie_genres { .name }] } AS movie`;

  t.plan(2);
  cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, {
    params: {
      movieId: '12dd334d5',
      title: 'My Super Awesome Movie',
      year: 2018,
      plot: 'An unending saga',
      poster: 'www.movieposter.com/img.png',
      imdbRating: 1.0
    },
    first: -1,
    offset: 0
  });
});

test.cb('Update node mutation', t => {
  const graphQLQuery = `mutation updateMutation {
    UpdateMovie(movieId: "12dd334d5", year: 2010) {
      _id
      title
      year
    }
  }`,
    expectedCypherQuery = `MATCH (movie:Movie {movieId: $params.movieId}) SET movie += $params RETURN movie {_id: ID(movie), .title , .year } AS movie`;

  t.plan(2);
  cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, {
    params: {
      movieId: '12dd334d5',
      year: 2010
    },
    first: -1,
    offset: 0
  });
});

test.cb('Delete node mutation', t => {
  const graphQLQuery = `mutation deleteMutation{
      DeleteMovie(movieId: "12dd334d5") {
        _id
        movieId
      }
    }`,
    expectedCypherQuery = `MATCH (movie:Movie {movieId: $movieId})
WITH movie AS movie_toDelete, movie {_id: ID(movie), .movieId } AS movie
DETACH DELETE movie_toDelete
RETURN movie`;

  t.plan(2);
  cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, {
    movieId: '12dd334d5',
    first: -1,
    offset: 0
  });
});

test('Add relationship mutation', t => {
  const graphQLQuery = `mutation someMutation {
    AddMovieGenres(
      from: { movieId: "123" },
      to: { name: "Action" }
    ) {
      from {
        movieId
        genres {
          _id
          name
        }
      }
      to {
        name
      }
    }
  }`,
    expectedCypherQuery = `
      MATCH (movie_from:Movie {movieId: $from.movieId})
      MATCH (genre_to:Genre {name: $to.name})
      CREATE (movie_from)-[in_genre_relation:IN_GENRE]->(genre_to)
      RETURN in_genre_relation { from: movie_from { .movieId ,genres: [(movie_from)-[:IN_GENRE]->(movie_from_genres:Genre) | movie_from_genres {_id: ID(movie_from_genres), .name }] } ,to: genre_to { .name }  } AS _AddMovieGenresPayload;
    `;

  t.plan(1);
  return augmentedSchemaCypherTestRunner(
    t,
    graphQLQuery,
    {
      from: { movieId: '123' },
      to: { name: 'Action' },
      first: -1,
      offset: 0
    },
    expectedCypherQuery
  );
});

test('Add relationship mutation with GraphQL variables', t => {
  const graphQLQuery = `mutation someMutation($from: _MovieInput!) {
    AddMovieGenres(
      from: $from,
      to: { name: "Action" }
    ) {
      from {
        movieId
        genres {
          _id
          name
        }
      }
      to {
        name
      }
    }
  }`,
    expectedCypherQuery = `
      MATCH (movie_from:Movie {movieId: $from.movieId})
      MATCH (genre_to:Genre {name: $to.name})
      CREATE (movie_from)-[in_genre_relation:IN_GENRE]->(genre_to)
      RETURN in_genre_relation { from: movie_from { .movieId ,genres: [(movie_from)-[:IN_GENRE]->(movie_from_genres:Genre) | movie_from_genres {_id: ID(movie_from_genres), .name }] } ,to: genre_to { .name }  } AS _AddMovieGenresPayload;
    `;

  t.plan(1);
  return augmentedSchemaCypherTestRunner(
    t,
    graphQLQuery,
    {
      from: { movieId: '123' },
      to: { name: 'Action' },
      first: -1,
      offset: 0
    },
    expectedCypherQuery
  );
});

test('Add relationship mutation with relationship property', t => {
  const graphQLQuery = `mutation someMutation {
    AddUserRated(
      from: {
        userId: "123"
      },
      to: {
        movieId: "456"
      },
      data: {
        rating: 5
      }
    ) {
      from {
        _id
        userId
        name
        rated {
          rating
          Movie {
            _id
            movieId
            title
          }
        }
      }
      to {
        _id
        movieId
        title 
        ratings {
          rating
          User {
            _id
            userId
            name
          }
        }
      }
      rating
    }
  }`,
    expectedCypherQuery = `
      MATCH (user_from:User {userId: $from.userId})
      MATCH (movie_to:Movie {movieId: $to.movieId})
      CREATE (user_from)-[rated_relation:RATED {rating:$data.rating}]->(movie_to)
      RETURN rated_relation { from: user_from {_id: ID(user_from), .userId , .name ,rated: [(user_from)-[user_from_rated_relation:RATED]->(:Movie) | user_from_rated_relation { .rating ,Movie: head([(:User)-[user_from_rated_relation]->(user_from_rated_Movie:Movie) | user_from_rated_Movie {_id: ID(user_from_rated_Movie), .movieId , .title }]) }] } ,to: movie_to {_id: ID(movie_to), .movieId , .title ,ratings: [(movie_to)<-[movie_to_ratings_relation:RATED]-(:User) | movie_to_ratings_relation { .rating ,User: head([(:Movie)<-[movie_to_ratings_relation]-(movie_to_ratings_User:User) | movie_to_ratings_User {_id: ID(movie_to_ratings_User), .userId , .name }]) }] } , .rating  } AS _AddUserRatedPayload;
    `;

  t.plan(1);
  return augmentedSchemaCypherTestRunner(
    t,
    graphQLQuery,
    {
      from: { userId: '123' },
      to: { movieId: '456' },
      data: { rating: 5 },
      first: -1,
      offset: 0
    },
    expectedCypherQuery
  );
});

test('Add relationship mutation with relationship property (reflexive)', t => {
  const graphQLQuery = `mutation {
    AddUserFriends(
      from: {
        userId: "123"
      },
      to: {
        userId: "456"
      },
      data: {
        since: 7
      }
    ) {
      from {
        _id
        userId
        name
        friends {
          from {
            since
            User {
              _id
              name
              friends {
                from {
                  since
                  User {
                    _id
                    name
                  }
                }
                to {
                  since
                  User {
                    _id
                    name
                  }
                }
              }
            }
          }
          to {
            since
            User {
              _id
              name
            }
          }
        }
      }
      to {
        _id
        name
        friends {
          from {
            since
            User {
              _id
              name
            }
          }
          to {
            since
            User {
              _id
              name
            }
          }
        }
      }
      since
    }
  }
  `,
    expectedCypherQuery = `
      MATCH (user_from:User {userId: $from.userId})
      MATCH (user_to:User {userId: $to.userId})
      CREATE (user_from)-[friend_of_relation:FRIEND_OF {since:$data.since}]->(user_to)
      RETURN friend_of_relation { from: user_from {_id: ID(user_from), .userId , .name ,friends: {from: [(user_from)<-[user_from_from_relation:FRIEND_OF]-(user_from_from:User) | user_from_from_relation { .since ,User: user_from_from {_id: ID(user_from_from), .name ,friends: {from: [(user_from_from)<-[user_from_from_from_relation:FRIEND_OF]-(user_from_from_from:User) | user_from_from_from_relation { .since ,User: user_from_from_from {_id: ID(user_from_from_from), .name } }] ,to: [(user_from_from)-[user_from_from_to_relation:FRIEND_OF]->(user_from_from_to:User) | user_from_from_to_relation { .since ,User: user_from_from_to {_id: ID(user_from_from_to), .name } }] } } }] ,to: [(user_from)-[user_from_to_relation:FRIEND_OF]->(user_from_to:User) | user_from_to_relation { .since ,User: user_from_to {_id: ID(user_from_to), .name } }] } } ,to: user_to {_id: ID(user_to), .name ,friends: {from: [(user_to)<-[user_to_from_relation:FRIEND_OF]-(user_to_from:User) | user_to_from_relation { .since ,User: user_to_from {_id: ID(user_to_from), .name } }] ,to: [(user_to)-[user_to_to_relation:FRIEND_OF]->(user_to_to:User) | user_to_to_relation { .since ,User: user_to_to {_id: ID(user_to_to), .name } }] } } , .since  } AS _AddUserFriendsPayload;
    `;

  t.plan(1);
  return augmentedSchemaCypherTestRunner(
    t,
    graphQLQuery,
    {
      from: { userId: '123' },
      to: { userId: '456' },
      data: { since: 7 },
      first: -1,
      offset: 0
    },
    expectedCypherQuery
  );
});

test('Remove relationship mutation', t => {
  const graphQLQuery = `mutation someMutation {
    RemoveMovieGenres(
      from: { movieId: "123" },
      to: { name: "Action" }
    ) {
      from {
        _id
        title
      }
      to {
        _id
        name
      }
    }
  }`,
    expectedCypherQuery = `
      MATCH (movie_from:Movie {movieId: $from.movieId})
      MATCH (genre_to:Genre {name: $to.name})
      OPTIONAL MATCH (movie_from)-[movie_fromgenre_to:IN_GENRE]->(genre_to)
      DELETE movie_fromgenre_to
      WITH COUNT(*) AS scope, movie_from AS _movie_from, genre_to AS _genre_to
      RETURN {from: _movie_from {_id: ID(_movie_from), .title } ,to: _genre_to {_id: ID(_genre_to), .name } } AS _RemoveMovieGenresPayload;
    `;

  t.plan(1);
  return augmentedSchemaCypherTestRunner(
    t,
    graphQLQuery,
    {
      from: { movieId: '123' },
      to: { name: 'Action' },
      first: -1,
      offset: 0
    },
    expectedCypherQuery
  );
});

test('Remove relationship mutation (reflexive)', t => {
  const graphQLQuery = `mutation {
    RemoveUserFriends(
      from: {
        userId: "123"
      },
      to: {
        userId: "456"
      },
    ) {
      from {
        _id
        name
        friends {
          from {
            since
            User {
              _id
              name
            }
          }
          to {
            since
            User {
              _id
              name
            }
          }
        }
      }
      to {
        _id
        name
        friends {
          from {
            since
            User {
              _id
              name
            }
          }
          to {
            since
            User {
              _id
              name
            }
          }
        }      
      }
    }
  }
  `,
    expectedCypherQuery = `
      MATCH (user_from:User {userId: $from.userId})
      MATCH (user_to:User {userId: $to.userId})
      OPTIONAL MATCH (user_from)-[user_fromuser_to:FRIEND_OF]->(user_to)
      DELETE user_fromuser_to
      WITH COUNT(*) AS scope, user_from AS _user_from, user_to AS _user_to
      RETURN {from: _user_from {_id: ID(_user_from), .name ,friends: {from: [(_user_from)<-[_user_from_from_relation:FRIEND_OF]-(_user_from_from:User) | _user_from_from_relation { .since ,User: _user_from_from {_id: ID(_user_from_from), .name } }] ,to: [(_user_from)-[_user_from_to_relation:FRIEND_OF]->(_user_from_to:User) | _user_from_to_relation { .since ,User: _user_from_to {_id: ID(_user_from_to), .name } }] } } ,to: _user_to {_id: ID(_user_to), .name ,friends: {from: [(_user_to)<-[_user_to_from_relation:FRIEND_OF]-(_user_to_from:User) | _user_to_from_relation { .since ,User: _user_to_from {_id: ID(_user_to_from), .name } }] ,to: [(_user_to)-[_user_to_to_relation:FRIEND_OF]->(_user_to_to:User) | _user_to_to_relation { .since ,User: _user_to_to {_id: ID(_user_to_to), .name } }] } } } AS _RemoveUserFriendsPayload;
    `;

  t.plan(1);
  return augmentedSchemaCypherTestRunner(
    t,
    graphQLQuery,
    {
      from: { userId: '123' },
      to: { userId: '456' },
      first: -1,
      offset: 0
    },
    expectedCypherQuery
  );
});

test('Handle GraphQL variables in nested selection - first/offset', t => {
  const graphQLQuery = `query ($year: Int!, $first: Int!) {

  Movie(year: $year) {
    title
    year
    similar(first: $first) {
      title
    }
  }
}`,
    expectedCypherQuery = `MATCH (movie:Movie {year:$year}) RETURN movie { .title , .year ,similar: [ movie_similar IN apoc.cypher.runFirstColumn("WITH {this} AS this MATCH (this)--(:Genre)--(o:Movie) RETURN o", {this: movie, first: 3, offset: 0}, true) | movie_similar { .title }][..3] } AS movie SKIP $offset`;

  t.plan(3);

  return Promise.all([
    cypherTestRunner(
      t,
      graphQLQuery,
      { year: 2016, first: 3 },
      expectedCypherQuery,
      {
        '1_first': 3,
        year: 2016,
        first: -1,
        offset: 0
      }
    ),
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      { year: 2016, first: 3 },
      expectedCypherQuery
    )
  ]);
});

test('Handle GraphQL variables in nest selection - @cypher param (not first/offset)', t => {
  const graphQLQuery = `query ($year: Int = 2016, $first: Int = 2, $scale:Int) {

  Movie(year: $year) {
    title
    year
    similar(first: $first) {
      title
      scaleRating(scale:$scale)
    }

  }
}`,
    expectedCypherQuery = `MATCH (movie:Movie {year:$year}) RETURN movie { .title , .year ,similar: [ movie_similar IN apoc.cypher.runFirstColumn("WITH {this} AS this MATCH (this)--(:Genre)--(o:Movie) RETURN o", {this: movie, first: 3, offset: 0}, true) | movie_similar { .title ,scaleRating: apoc.cypher.runFirstColumn("WITH $this AS this RETURN $scale * this.imdbRating", {this: movie_similar, scale: 5}, false)}][..3] } AS movie SKIP $offset`;

  t.plan(3);
  return Promise.all([
    cypherTestRunner(
      t,
      graphQLQuery,
      { year: 2016, first: 3, scale: 5 },
      expectedCypherQuery,
      {
        year: 2016,
        first: -1,
        offset: 0,
        '1_first': 3,
        '2_scale': 5
      }
    ),
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      { year: 2016, first: 3, scale: 5 },
      expectedCypherQuery
    )
  ]);
});

test('Return internal node id for _id field', t => {
  const graphQLQuery = `{
  Movie(year: 2016) {
    _id
    title
    year
    genres {
      _id
      name
    }
  }
}
`,
    expectedCypherQuery = `MATCH (movie:Movie {year:$year}) RETURN movie {_id: ID(movie), .title , .year ,genres: [(movie)-[:IN_GENRE]->(movie_genres:Genre) | movie_genres {_id: ID(movie_genres), .name }] } AS movie SKIP $offset`;

  t.plan(3);

  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, {
      year: 2016,
      first: -1,
      offset: 0
    }),
    augmentedSchemaCypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery)
  ]);
});

test('Treat enum as a scalar', t => {
  const graphQLQuery = `
  {
    Books {
      genre
    }
  }`,
    expectedCypherQuery = `MATCH (book:Book {}) RETURN book { .genre } AS book SKIP $offset`;

  t.plan(3);

  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, {
      first: -1,
      offset: 0
    }),
    augmentedSchemaCypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery)
  ]);
});

test('Handle query fragment', t => {
  const graphQLQuery = `
fragment myTitle on Movie {
  title
  actors {
    name
  }
}

query getMovie {
  Movie(title: "River Runs Through It, A") {
    ...myTitle
    year
  }
}`,
    expectedCypherQuery = `MATCH (movie:Movie {title:$title}) RETURN movie { .title ,actors: [(movie)<-[:ACTED_IN]-(movie_actors:Actor) | movie_actors { .name }] , .year } AS movie SKIP $offset`;

  t.plan(3);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, {
      title: 'River Runs Through It, A',
      first: -1,
      offset: 0
    }),
    augmentedSchemaCypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery)
  ]);
});

test('Handle multiple query fragments', t => {
  const graphQLQuery = `
    fragment myTitle on Movie {
  title
}

fragment myActors on Movie {
  actors {
    name
  }
}

query getMovie {
  Movie(title: "River Runs Through It, A") {
    ...myTitle
    ...myActors
    year
  }
}
  `,
    expectedCypherQuery = `MATCH (movie:Movie {title:$title}) RETURN movie { .title ,actors: [(movie)<-[:ACTED_IN]-(movie_actors:Actor) | movie_actors { .name }] , .year } AS movie SKIP $offset`;

  t.plan(3);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, {
      title: 'River Runs Through It, A',
      first: -1,
      offset: 0
    }),
    augmentedSchemaCypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery)
  ]);
});

test('nested fragments', t => {
  const graphQLQuery = `
    query movieItems {
      Movie(year:2010) {
        ...Foo
      }
    }
    
    fragment Foo on Movie {
      title
      ...Bar
    }
    
    fragment Bar on Movie {
      year
    }`,
    expectedCypherQuery = `MATCH (movie:Movie {year:$year}) RETURN movie { .title , .year } AS movie SKIP $offset`;

  t.plan(3);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, {
      year: 2010,
      first: -1,
      offset: 0
    }),
    augmentedSchemaCypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery)
  ]);
});

test('fragments on relations', t => {
  const graphQLQuery = `
    query movieItems {
      Movie(year:2010) {
        title
        actors {
          ...Foo
        }
      }
    }
    
    fragment Foo on Actor {
      name
    }`,
    expectedCypherQuery = `MATCH (movie:Movie {year:$year}) RETURN movie { .title ,actors: [(movie)<-[:ACTED_IN]-(movie_actors:Actor) | movie_actors { .name }] } AS movie SKIP $offset`;

  t.plan(3);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, {
      year: 2010,
      first: -1,
      offset: 0
    }),
    augmentedSchemaCypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery)
  ]);
});

test('nested fragments on relations', t => {
  const graphQLQuery = `
    query movieItems {
      Movie(year:2010) {
        ...Foo
      }
    }
    
    fragment Foo on Movie {
      title
      actors {
        ...Bar
      }
    }
    
    fragment Bar on Actor {
      name
    }`,
    expectedCypherQuery = `MATCH (movie:Movie {year:$year}) RETURN movie { .title ,actors: [(movie)<-[:ACTED_IN]-(movie_actors:Actor) | movie_actors { .name }] } AS movie SKIP $offset`;

  t.plan(3);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, {
      year: 2010,
      first: -1,
      offset: 0
    }),
    augmentedSchemaCypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery)
  ]);
});

test('orderBy test - descending, top level - augmented schema', t => {
  const graphQLQuery = `{
    Movie(year: 2010, orderBy:title_desc, first: 10) {
      title
      actors(first:3) {
        name
      }
    }
  }
  `,
    expectedCypherQuery = `MATCH (movie:Movie {year:$year}) RETURN movie { .title ,actors: [(movie)<-[:ACTED_IN]-(movie_actors:Actor{}) | movie_actors { .name }][..3] } AS movie ORDER BY movie.title DESC  SKIP $offset LIMIT $first`;

  t.plan(1);

  return augmentedSchemaCypherTestRunner(
    t,
    graphQLQuery,
    {},
    expectedCypherQuery,
    {
      offset: 0,
      first: 10,
      year: 2010,
      '1_first': 3
    }
  );
});

test('query for relationship properties', t => {
  const graphQLQuery = `{
    Movie(title: "River Runs Through It, A") {
       title
      ratings {
        rating
        User {
          name
        }
      }
    }
  }`,
    expectedCypherQuery = `MATCH (movie:Movie {title:$title}) RETURN movie { .title ,ratings: [(movie)<-[movie_ratings_relation:RATED]-(:User) | movie_ratings_relation { .rating ,User: head([(:Movie)<-[movie_ratings_relation]-(movie_ratings_User:User) | movie_ratings_User { .name }]) }] } AS movie SKIP $offset`;

  t.plan(1);

  return augmentedSchemaCypherTestRunner(
    t,
    graphQLQuery,
    {},
    expectedCypherQuery,
    {}
  );
});

test('query reflexive relation nested in non-reflexive relation', t => {
  const graphQLQuery = `query {
    Movie {
      movieId
      title
      ratings {
        rating
        User {
          userId
          name
          friends {
            from {
              since
              User {
                name
                friends {
                  from {
                    since
                    User {
                      name
                    }
                  }
                  to {
                    since
                    User {
                      name
                    }
                  }
                }
              }
            }
            to {
              since
              User {
                name
                friends {
                  from {
                    since
                    User {
                      name
                    }
                  }
                  to {
                    since
                    User {
                      name
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }`,
    expectedCypherQuery = `MATCH (movie:Movie {}) RETURN movie { .movieId , .title ,ratings: [(movie)<-[movie_ratings_relation:RATED]-(:User) | movie_ratings_relation { .rating ,User: head([(:Movie)<-[movie_ratings_relation]-(movie_ratings_User:User) | movie_ratings_User { .userId , .name ,friends: {from: [(movie_ratings_User)<-[movie_ratings_User_from_relation:FRIEND_OF]-(movie_ratings_User_from:User) | movie_ratings_User_from_relation { .since ,User: movie_ratings_User_from { .name ,friends: {from: [(movie_ratings_User_from)<-[movie_ratings_User_from_from_relation:FRIEND_OF]-(movie_ratings_User_from_from:User) | movie_ratings_User_from_from_relation { .since ,User: movie_ratings_User_from_from { .name } }] ,to: [(movie_ratings_User_from)-[movie_ratings_User_from_to_relation:FRIEND_OF]->(movie_ratings_User_from_to:User) | movie_ratings_User_from_to_relation { .since ,User: movie_ratings_User_from_to { .name } }] } } }] ,to: [(movie_ratings_User)-[movie_ratings_User_to_relation:FRIEND_OF]->(movie_ratings_User_to:User) | movie_ratings_User_to_relation { .since ,User: movie_ratings_User_to { .name ,friends: {from: [(movie_ratings_User_to)<-[movie_ratings_User_to_from_relation:FRIEND_OF]-(movie_ratings_User_to_from:User) | movie_ratings_User_to_from_relation { .since ,User: movie_ratings_User_to_from { .name } }] ,to: [(movie_ratings_User_to)-[movie_ratings_User_to_to_relation:FRIEND_OF]->(movie_ratings_User_to_to:User) | movie_ratings_User_to_to_relation { .since ,User: movie_ratings_User_to_to { .name } }] } } }] } }]) }] } AS movie SKIP $offset`;

  t.plan(1);

  return augmentedSchemaCypherTestRunner(
    t,
    graphQLQuery,
    {},
    expectedCypherQuery,
    {}
  );
});

test('query non-reflexive relation nested in reflexive relation', t => {
  const graphQLQuery = `query {
    User {
      _id
      name
      friends {
        from {
          since
          User {
            _id
            name
            rated {
              rating
              Movie {
                _id
                ratings {
                  rating 
                  User {
                    _id
                    friends {
                      from {
                        since
                        User {
                          _id
                        }
                      }
                      to {
                        since 
                        User {
                          _id
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
        to {
          since
          User {
            _id
            name
            rated {
              rating
              Movie {
                _id
              }
            }
          }
        }
      }
    }
  }`,
    expectedCypherQuery = `MATCH (user:User {}) RETURN user {_id: ID(user), .name ,friends: {from: [(user)<-[user_from_relation:FRIEND_OF]-(user_from:User) | user_from_relation { .since ,User: user_from {_id: ID(user_from), .name ,rated: [(user_from)-[user_from_rated_relation:RATED]->(:Movie) | user_from_rated_relation { .rating ,Movie: head([(:User)-[user_from_rated_relation]->(user_from_rated_Movie:Movie) | user_from_rated_Movie {_id: ID(user_from_rated_Movie),ratings: [(user_from_rated_Movie)<-[user_from_rated_Movie_ratings_relation:RATED]-(:User) | user_from_rated_Movie_ratings_relation { .rating ,User: head([(:Movie)<-[user_from_rated_Movie_ratings_relation]-(user_from_rated_Movie_ratings_User:User) | user_from_rated_Movie_ratings_User {_id: ID(user_from_rated_Movie_ratings_User),friends: {from: [(user_from_rated_Movie_ratings_User)<-[user_from_rated_Movie_ratings_User_from_relation:FRIEND_OF]-(user_from_rated_Movie_ratings_User_from:User) | user_from_rated_Movie_ratings_User_from_relation { .since ,User: user_from_rated_Movie_ratings_User_from {_id: ID(user_from_rated_Movie_ratings_User_from)} }] ,to: [(user_from_rated_Movie_ratings_User)-[user_from_rated_Movie_ratings_User_to_relation:FRIEND_OF]->(user_from_rated_Movie_ratings_User_to:User) | user_from_rated_Movie_ratings_User_to_relation { .since ,User: user_from_rated_Movie_ratings_User_to {_id: ID(user_from_rated_Movie_ratings_User_to)} }] } }]) }] }]) }] } }] ,to: [(user)-[user_to_relation:FRIEND_OF]->(user_to:User) | user_to_relation { .since ,User: user_to {_id: ID(user_to), .name ,rated: [(user_to)-[user_to_rated_relation:RATED]->(:Movie) | user_to_rated_relation { .rating ,Movie: head([(:User)-[user_to_rated_relation]->(user_to_rated_Movie:Movie) | user_to_rated_Movie {_id: ID(user_to_rated_Movie)}]) }] } }] } } AS user SKIP $offset`;

  t.plan(1);

  return augmentedSchemaCypherTestRunner(
    t,
    graphQLQuery,
    {},
    expectedCypherQuery,
    {}
  );
});

test('query relation type with argument', t => {
  const graphQLQuery = `query {
    User {
      _id
      name
      rated(rating: 5) {
        rating
        Movie {
          title
        }
      }
    }
  }`,
    expectedCypherQuery = `MATCH (user:User {}) RETURN user {_id: ID(user), .name ,rated: [(user)-[user_rated_relation:RATED{rating:$1_rating}]->(:Movie) | user_rated_relation { .rating ,Movie: head([(:User)-[user_rated_relation]->(user_rated_Movie:Movie) | user_rated_Movie { .title }]) }] } AS user SKIP $offset`;

  t.plan(1);

  return augmentedSchemaCypherTestRunner(
    t,
    graphQLQuery,
    {},
    expectedCypherQuery,
    {}
  );
});

test('query reflexive relation type with arguments', t => {
  const graphQLQuery = `query {
    User {
      userId
      name
      friends {
        from(since: 3) {
          since
          User {
            name
          }
        }
        to(since: 5) {
          since
          User {
            name
          }
        }
      }
    }
  }
  `,
    expectedCypherQuery = `MATCH (user:User {}) RETURN user { .userId , .name ,friends: {from: [(user)<-[user_from_relation:FRIEND_OF{since:$1_since}]-(user_from:User) | user_from_relation { .since ,User: user_from { .name } }] ,to: [(user)-[user_to_relation:FRIEND_OF{since:$3_since}]->(user_to:User) | user_to_relation { .since ,User: user_to { .name } }] } } AS user SKIP $offset`;

  t.plan(1);

  return augmentedSchemaCypherTestRunner(
    t,
    graphQLQuery,
    {},
    expectedCypherQuery,
    {}
  );
});

test('query using inline fragment', t => {
  const graphQLQuery = `
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
  `,
    expectedCypherQuery = `MATCH (movie:Movie {title:$title}) RETURN movie { .title ,ratings: [(movie)<-[movie_ratings_relation:RATED]-(:User) | movie_ratings_relation { .rating ,User: head([(:Movie)<-[movie_ratings_relation]-(movie_ratings_User:User) | movie_ratings_User { .name , .userId }]) }] } AS movie SKIP $offset`;

  t.plan(1);

  return augmentedSchemaCypherTestRunner(
    t,
    graphQLQuery,
    {},
    expectedCypherQuery,
    {}
  );
});

