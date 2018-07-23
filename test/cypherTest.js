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
      '1-first': 3,
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
    expectedCypherQuery = `MATCH (movie:Movie {title:$title}) RETURN movie { .title ,actors: [(movie)<-[:ACTED_IN]-(movie_actors:Actor) | movie_actors { .name ,movies: [(movie_actors)-[:ACTED_IN]->(movie_actors_movies:Movie) | movie_actors_movies { .title ,actors: [(movie_actors_movies)<-[:ACTED_IN]-(movie_actors_movies_actors:Actor{name:$1-name}) | movie_actors_movies_actors { .name ,movies: [(movie_actors_movies_actors)-[:ACTED_IN]->(movie_actors_movies_actors_movies:Movie) | movie_actors_movies_actors_movies { .title , .year ,similar: [ movie_actors_movies_actors_movies_similar IN apoc.cypher.runFirstColumn("WITH {this} AS this MATCH (this)--(:Genre)--(o:Movie) RETURN o", {this: movie_actors_movies_actors_movies, first: 3, offset: 0}, true) | movie_actors_movies_actors_movies_similar { .title , .year }][..3] }] }] }] }] } AS movie SKIP $offset`;

  t.plan(3);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, {
      title: 'River Runs Through It, A',
      '1-name': 'Tom Hanks',
      '2-first': 3,
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
      '1-scale': 10
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
      'MATCH (movie:Movie {title:$title}) RETURN movie { .title ,actors: [(movie)<-[:ACTED_IN]-(movie_actors:Actor{name:$1-name}) | movie_actors { .name }] ,similar: [ movie_similar IN apoc.cypher.runFirstColumn("WITH {this} AS this MATCH (this)--(:Genre)--(o:Movie) RETURN o", {this: movie, first: 3, offset: 0}, true) | movie_similar { .title }][..3] } AS movie SKIP $offset';

  t.plan(3);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, {
      title: 'River Runs Through It, A',
      first: -1,
      offset: 0,
      '1-name': 'Tom Hanks',
      '3-first': 3
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
      'MATCH (movie:Movie {title:$title}) RETURN movie { .title ,actors: [(movie)<-[:ACTED_IN]-(movie_actors:Actor{name:$1-name}) | movie_actors { .name }][..3] ,similar: [ movie_similar IN apoc.cypher.runFirstColumn("WITH {this} AS this MATCH (this)--(:Genre)--(o:Movie) RETURN o", {this: movie, first: 3, offset: 0}, true) | movie_similar { .title }][..3] } AS movie SKIP $offset';

  t.plan(3);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, {
      title: 'River Runs Through It, A',
      first: -1,
      offset: 0,
      '1-first': 3,
      '1-name': 'Tom Hanks',
      '3-first': 3
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
      '1-first': 3
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

test.cb('Add relationship mutation', t => {
  const graphQLQuery = `mutation someMutation {
  AddMovieGenre(moviemovieId:"123", genrename: "Action") {
    _id
    title
    genres {
      name
    }
  }
}`,
    expectedCypherQuery = `MATCH (movie:Movie {movieId: $moviemovieId})
       MATCH (genre:Genre {name: $genrename})
      CREATE (movie)-[:IN_GENRE]->(genre)
      RETURN movie {_id: ID(movie), .title ,genres: [(movie)-[:IN_GENRE]->(movie_genres:Genre) | movie_genres { .name }] } AS movie;`;

  t.plan(2);
  cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, {
    moviemovieId: '123',
    genrename: 'Action',
    first: -1,
    offset: 0
  });
});

test.cb('Add relationship mutation with GraphQL variables', t => {
  const graphQLQuery = `mutation someMutation($movieParam:ID!) {
  AddMovieGenre(moviemovieId:$movieParam, genrename: "Action") {
    _id
    title
    genres {
      name
    }
  }
}`,
    expectedCypherQuery = `MATCH (movie:Movie {movieId: $moviemovieId})
       MATCH (genre:Genre {name: $genrename})
      CREATE (movie)-[:IN_GENRE]->(genre)
      RETURN movie {_id: ID(movie), .title ,genres: [(movie)-[:IN_GENRE]->(movie_genres:Genre) | movie_genres { .name }] } AS movie;`;

  t.plan(2);
  cypherTestRunner(
    t,
    graphQLQuery,
    { movieParam: '123' },
    expectedCypherQuery,
    {
      genrename: 'Action',
      moviemovieId: '123',
      first: -1,
      offset: 0
    }
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
        '1-first': 3,
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
        '1-first': 3,
        '2-scale': 5
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

// // test augmented schema:
// test.cb('Add relationship mutation on augmented schema',t => {
//   const graphQLQuery = `
//     mutation {
//   AddMovieGenre(movieId: "123", name: "Boring") {
//     title
//     genres {
//       name
//     }
//   }
// }
//   `,
//     expectedCypherQuery = `MATCH (movie:Movie {movieId: $movieId})
//        MATCH (genre:Genre {name: $name})
//       CREATE (movie)-[:IN_GENRE]->(genre)
//       RETURN movie { .title ,genres: [(movie)-[:IN_GENRE]->(movie_genres:Genre) | movie_genres { .name }] } AS movie;`;
//
//   t.plan (1);
//   // FIXME: not testing Cypher params
//   // { movieId: '123', name: 'Boring' }
//   augmentedSchemaCypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery);
//
// });
//
// test.cb('Create node mutation on augmented schema', t=> {
//   const graphQLQuery = `
//   mutation {
//   CreateGenre(name: "Boring") {
//     name
//   }
// }`,
//     expectedCypherQuery = `CREATE (genre:Genre) SET genre = $params RETURN genre { .name } AS genre`;
//   t.plan(2);
//   // FIXME: not testing Cypher params
//   // { params: { name: 'Boring' } }
//
//   augmentedSchemaCypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery);
//
// });

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
    expectedCypherQuery = `MATCH (movie:Movie {year:$year}) RETURN movie { .title, .year } AS movie SKIP $offset`;

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
