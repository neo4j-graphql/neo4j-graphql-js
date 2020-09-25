import test from 'ava';
import {
  cypherTestRunner,
  augmentedSchemaCypherTestRunner
} from '../helpers/cypherTestHelpers';

const CYPHER_PARAMS = {
  userId: 'user-id'
};

const ADDITIONAL_MOVIE_LABELS = `:\`u_user-id\`:\`newMovieLabel\``;

test('simple Cypher query', t => {
  const graphQLQuery = `{
    Movie(title: "River Runs Through It, A") {
      title
    }
  }`,
    expectedCypherQuery = `MATCH (\`movie\`:\`Movie\`${ADDITIONAL_MOVIE_LABELS} {title:$title}) RETURN \`movie\` { .title } AS \`movie\``,
    expectedParams = {
      title: 'River Runs Through It, A',
      first: -1,
      cypherParams: CYPHER_PARAMS,
      offset: 0
    };

  t.plan(4);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, expectedParams),
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('Simple skip limit', t => {
  const graphQLQuery = `{
  Movie(title: "River Runs Through It, A", first: 2, offset: 1) {
    title
    year
  }
}
  `,
    expectedCypherQuery = `MATCH (\`movie\`:\`Movie\`${ADDITIONAL_MOVIE_LABELS} {title:$title}) RETURN \`movie\` { .title , .year } AS \`movie\` SKIP toInteger($offset) LIMIT toInteger($first)`,
    expectedParams = {
      title: 'River Runs Through It, A',
      first: 2,
      cypherParams: CYPHER_PARAMS,
      offset: 1
    };

  t.plan(4);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, expectedParams),
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
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
    expectedCypherQuery = `MATCH (\`movie\`:\`Movie\`${ADDITIONAL_MOVIE_LABELS} {title:$title}) RETURN \`movie\` { .title ,actors: [(\`movie\`)<-[:\`ACTED_IN\`]-(\`movie_actors\`:\`Actor\`) | \`movie_actors\` { .name }] ,similar: [ movie_similar IN apoc.cypher.runFirstColumn("WITH {this} AS this MATCH (this)--(:Genre)--(o:Movie) RETURN o", {this: movie, cypherParams: $cypherParams, offset: 0, first: $1_first}, true) | movie_similar { .title }][..3] } AS \`movie\``,
    expectedParams = {
      title: 'River Runs Through It, A',
      '1_first': 3,
      first: -1,
      cypherParams: CYPHER_PARAMS,
      offset: 0
    };

  t.plan(4);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, expectedParams),
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('Handle Query with name not aligning to type', t => {
  const graphQLQuery = `{
  MoviesByYear(year: 2010) {
    title
  }
}
  `,
    expectedCypherQuery = `MATCH (\`movie\`:\`Movie\`${ADDITIONAL_MOVIE_LABELS} {year:$year}) RETURN \`movie\` { .title } AS \`movie\``,
    expectedParams = {
      year: 2010,
      first: -1,
      cypherParams: CYPHER_PARAMS,
      offset: 0
    };

  t.plan(4);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, expectedParams),
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('Query without arguments, non-null type', t => {
  const graphQLQuery = `query {
  Movie {
    movieId
  }
}`,
    expectedCypherQuery = `MATCH (\`movie\`:\`Movie\`${ADDITIONAL_MOVIE_LABELS}) RETURN \`movie\` { .movieId } AS \`movie\``,
    expectedParams = {
      first: -1,
      cypherParams: CYPHER_PARAMS,
      offset: 0
    };

  t.plan(4);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, expectedParams),
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('Query single object', t => {
  const graphQLQuery = `
  {
    MovieById(movieId: "18") {
      title
    }
  }`,
    expectedCypherQuery = `MATCH (\`movie\`:\`Movie\`${ADDITIONAL_MOVIE_LABELS} {movieId:$movieId}) RETURN \`movie\` { .title } AS \`movie\``,
    expectedParams = {
      movieId: '18',
      first: -1,
      cypherParams: CYPHER_PARAMS,
      offset: 0
    };

  t.plan(4);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, expectedParams),
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
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
    expectedCypherQuery = `MATCH (\`movie\`:\`Movie\`${ADDITIONAL_MOVIE_LABELS} {movieId:$movieId}) RETURN \`movie\` { .title ,filmedIn: head([(\`movie\`)-[:\`FILMED_IN\`]->(\`movie_filmedIn\`:\`State\`) | \`movie_filmedIn\` { .name }]) } AS \`movie\``,
    expectedParams = {
      movieId: '3100',
      first: -1,
      cypherParams: CYPHER_PARAMS,
      offset: 0
    };

  t.plan(4);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, expectedParams),
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
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
    expectedCypherQuery = `MATCH (\`movie\`:\`Movie\`${ADDITIONAL_MOVIE_LABELS} {movieId:$movieId}) RETURN \`movie\` { .title ,actors: [(\`movie\`)<-[:\`ACTED_IN\`]-(\`movie_actors\`:\`Actor\`) | \`movie_actors\` { .name }] ,filmedIn: head([(\`movie\`)-[:\`FILMED_IN\`]->(\`movie_filmedIn\`:\`State\`) | \`movie_filmedIn\` { .name }]) } AS \`movie\``,
    expectedParams = {
      movieId: '3100',
      first: -1,
      cypherParams: CYPHER_PARAMS,
      offset: 0
    };

  t.plan(4);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, expectedParams),
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
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
    expectedCypherQuery = `MATCH (\`movie\`:\`Movie\`${ADDITIONAL_MOVIE_LABELS} {title:$title}) RETURN \`movie\` { .title ,actors: [(\`movie\`)<-[:\`ACTED_IN\`]-(\`movie_actors\`:\`Actor\`) | \`movie_actors\` { .name ,movies: [(\`movie_actors\`)-[:\`ACTED_IN\`]->(\`movie_actors_movies\`:\`Movie\`${ADDITIONAL_MOVIE_LABELS}) | \`movie_actors_movies\` { .title ,actors: [(\`movie_actors_movies\`)<-[:\`ACTED_IN\`]-(\`movie_actors_movies_actors\`:\`Actor\`{name:$1_name}) | \`movie_actors_movies_actors\` { .name ,movies: [(\`movie_actors_movies_actors\`)-[:\`ACTED_IN\`]->(\`movie_actors_movies_actors_movies\`:\`Movie\`${ADDITIONAL_MOVIE_LABELS}) | \`movie_actors_movies_actors_movies\` { .title , .year ,similar: [ movie_actors_movies_actors_movies_similar IN apoc.cypher.runFirstColumn("WITH {this} AS this MATCH (this)--(:Genre)--(o:Movie) RETURN o", {this: movie_actors_movies_actors_movies, cypherParams: $cypherParams, offset: 0, first: $2_first}, true) | movie_actors_movies_actors_movies_similar { .title , .year }][..3] }] }] }] }] } AS \`movie\``,
    expectedParams = {
      title: 'River Runs Through It, A',
      '1_name': 'Tom Hanks',
      '2_first': 3,
      first: -1,
      cypherParams: CYPHER_PARAMS,
      offset: 0
    };

  t.plan(4);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, expectedParams),
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
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
    expectedCypherQuery = `MATCH (\`movie\`:\`Movie\`${ADDITIONAL_MOVIE_LABELS} {title:$title}) RETURN \`movie\` { .title } AS \`movie\``,
    expectedParams = {
      title: 'River Runs Through It, A',
      first: -1,
      cypherParams: CYPHER_PARAMS,
      offset: 0
    };

  t.plan(4);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, expectedParams),
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
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
    expectedCypherQuery = `MATCH (\`movie\`:\`Movie\`${ADDITIONAL_MOVIE_LABELS} {title:$title}) RETURN \`movie\` { .title } AS \`movie\``,
    expectedParams = {
      title: 'River Runs Through It, A',
      first: -1,
      cypherParams: CYPHER_PARAMS,
      offset: 0
    };

  t.plan(4);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, expectedParams),
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
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
    expectedCypherQuery = `MATCH (\`movie\`:\`Movie\`${ADDITIONAL_MOVIE_LABELS} {title:$title}) RETURN \`movie\` { .title , .year } AS \`movie\``,
    expectedParams = {
      title: 'River Runs Through It, A',
      first: -1,
      cypherParams: CYPHER_PARAMS,
      offset: 0
    };

  t.plan(4);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, expectedParams),
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
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
    expectedCypherQuery = `MATCH (\`movie\`:\`Movie\`${ADDITIONAL_MOVIE_LABELS} {title:$title}) RETURN \`movie\` {mostSimilar: head([ movie_mostSimilar IN apoc.cypher.runFirstColumn("WITH {this} AS this RETURN this", {this: movie, cypherParams: $cypherParams}, true) | movie_mostSimilar { .title , .year }]) } AS \`movie\``,
    expectedParams = {
      title: 'River Runs Through It, A',
      first: -1,
      cypherParams: CYPHER_PARAMS,
      offset: 0
    };

  t.plan(4);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, expectedParams),
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('Pass @cypher directive default params to sub-query', t => {
  const graphQLQuery = `{
    Movie(title: "River Runs Through It, A") {
      scaleRating
    }

  }`,
    expectedCypherQuery = `MATCH (\`movie\`:\`Movie\`${ADDITIONAL_MOVIE_LABELS} {title:$title}) RETURN \`movie\` {scaleRating: apoc.cypher.runFirstColumn("WITH $this AS this RETURN $scale * this.imdbRating", {this: movie, cypherParams: $cypherParams, scale: 3}, false)} AS \`movie\``,
    expectedParams = {
      first: -1,
      cypherParams: CYPHER_PARAMS,
      offset: 0,
      title: 'River Runs Through It, A'
    };

  t.plan(4);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, expectedParams),
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('Pass @cypher directive params to sub-query', t => {
  const graphQLQuery = `{
    Movie(title: "River Runs Through It, A") {
      scaleRating(scale: 10)
    }

  }`,
    expectedCypherQuery = `MATCH (\`movie\`:\`Movie\`${ADDITIONAL_MOVIE_LABELS} {title:$title}) RETURN \`movie\` {scaleRating: apoc.cypher.runFirstColumn("WITH $this AS this RETURN $scale * this.imdbRating", {this: movie, cypherParams: $cypherParams, scale: $1_scale}, false)} AS \`movie\``,
    expectedParams = {
      first: -1,
      cypherParams: CYPHER_PARAMS,
      offset: 0,
      title: 'River Runs Through It, A',
      '1_scale': 10
    };

  t.plan(4);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, expectedParams),
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('Query for Neo4js internal _id', t => {
  const graphQLQuery = `{
    Movie(_id: "0") {
      title
      year
    }

  }`,
    expectedCypherQuery = `MATCH (\`movie\`:\`Movie\`${ADDITIONAL_MOVIE_LABELS}) WHERE ID(\`movie\`)=0 RETURN \`movie\` { .title , .year } AS \`movie\``,
    expectedParams = {
      first: -1,
      cypherParams: CYPHER_PARAMS,
      offset: 0
    };

  t.plan(4);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, expectedParams),
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('Query for Neo4js internal _id and another param before _id', t => {
  const graphQLQuery = `{
    Movie(title: "River Runs Through It, A", _id: "0") {
      title
      year
    }

  }`,
    expectedCypherQuery = `MATCH (\`movie\`:\`Movie\`${ADDITIONAL_MOVIE_LABELS} {title:$title}) WHERE ID(\`movie\`)=0 RETURN \`movie\` { .title , .year } AS \`movie\``,
    expectedParams = {
      title: 'River Runs Through It, A',
      first: -1,
      cypherParams: CYPHER_PARAMS,
      offset: 0
    };

  t.plan(4);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, expectedParams),
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('Query for Neo4js internal _id and another param after _id', t => {
  const graphQLQuery = `{
    Movie(_id: "0", year: 2010) {
      title
      year
    }

  }`,
    expectedCypherQuery = `MATCH (\`movie\`:\`Movie\`${ADDITIONAL_MOVIE_LABELS} {year:$year}) WHERE ID(\`movie\`)=0 RETURN \`movie\` { .title , .year } AS \`movie\``,
    expectedParams = {
      first: -1,
      cypherParams: CYPHER_PARAMS,
      offset: 0,
      year: 2010
    };

  t.plan(4);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, expectedParams),
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('Query for Neo4js internal _id by dedicated Query MovieBy_Id(_id: String!)', t => {
  const graphQLQuery = `{
    MovieBy_Id(_id: "0") {
      title
      year
    }

  }`,
    expectedCypherQuery = `MATCH (\`movie\`:\`Movie\`${ADDITIONAL_MOVIE_LABELS}) WHERE ID(\`movie\`)=0 RETURN \`movie\` { .title , .year } AS \`movie\``,
    expectedParams = {
      first: -1,
      cypherParams: CYPHER_PARAMS,
      offset: 0
    };

  t.plan(4);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, expectedParams),
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test(`Query for null value translates to 'IS NULL' WHERE clause`, t => {
  const graphQLQuery = `{
    Movie(poster: null) {
      title
      year
    }
  }`,
    expectedCypherQuery = `MATCH (\`movie\`:\`Movie\`${ADDITIONAL_MOVIE_LABELS}) WHERE movie.poster IS NULL RETURN \`movie\` { .title , .year } AS \`movie\``,
    expectedParams = {
      first: -1,
      cypherParams: CYPHER_PARAMS,
      offset: 0
    };

  t.plan(4);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, expectedParams),
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test(`Query for null value combined with internal ID and another param`, t => {
  const graphQLQuery = `{
      Movie(poster: null, _id: "0", year: 2010) {
        title
        year
      }
    }`,
    expectedCypherQuery = `MATCH (\`movie\`:\`Movie\`${ADDITIONAL_MOVIE_LABELS} {year:$year}) WHERE ID(\`movie\`)=0 AND movie.poster IS NULL RETURN \`movie\` { .title , .year } AS \`movie\``,
    expectedParams = {
      year: 2010,
      first: -1,
      cypherParams: CYPHER_PARAMS,
      offset: 0
    };

  t.plan(4);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, expectedParams),
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test(`query for relationship internal ID`, t => {
  const graphQLQuery = `query {
    Movie(title: "River Runs Through It, A") {
      movieId
      title
      ratings {
        rating
        _id
      }
    }
  }`,
    expectedCypherQuery = `MATCH (\`movie\`:\`Movie\`${ADDITIONAL_MOVIE_LABELS} {title:$title}) RETURN \`movie\` { .movieId , .title ,ratings: [(\`movie\`)<-[\`movie_ratings_relation\`:\`RATED\`]-(:\`User\`) | movie_ratings_relation { .rating ,_id: ID(\`movie_ratings_relation\`)}] } AS \`movie\``,
    expectedParams = {
      offset: 0,
      first: -1,
      title: 'River Runs Through It, A',
      cypherParams: CYPHER_PARAMS
    };

  t.plan(2);
  return Promise.all([
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('query for interfaced relationship internal ID', t => {
  const graphQLQuery = `query {
    Genre {
      name
      interfacedRelationshipType {
        string
        _id
      }
    }
  }
  `,
    expectedCypherQuery = `MATCH (\`genre\`:\`Genre\`) RETURN \`genre\` { .name ,interfacedRelationshipType: [(\`genre\`)<-[\`genre_interfacedRelationshipType_relation\`:\`INTERFACED_RELATIONSHIP_TYPE\`]-(:\`Person\`) | genre_interfacedRelationshipType_relation { .string ,_id: ID(\`genre_interfacedRelationshipType_relation\`)}] } AS \`genre\``,
    expectedParams = {
      offset: 0,
      first: -1,
      cypherParams: CYPHER_PARAMS
    };

  t.plan(2);
  return Promise.all([
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
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
    expectedCypherQuery = `MATCH (\`movie\`:\`Movie\`${ADDITIONAL_MOVIE_LABELS} {title:$title}) RETURN \`movie\` { .title ,actors: [(\`movie\`)<-[:\`ACTED_IN\`]-(\`movie_actors\`:\`Actor\`{name:$1_name}) | \`movie_actors\` { .name }] ,similar: [ movie_similar IN apoc.cypher.runFirstColumn("WITH {this} AS this MATCH (this)--(:Genre)--(o:Movie) RETURN o", {this: movie, cypherParams: $cypherParams, offset: 0, first: $3_first}, true) | movie_similar { .title }][..3] } AS \`movie\``,
    expectedParams = {
      title: 'River Runs Through It, A',
      first: -1,
      cypherParams: CYPHER_PARAMS,
      offset: 0,
      '1_name': 'Tom Hanks',
      '3_first': 3
    };

  t.plan(4);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, expectedParams),
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('cypher subquery preserves case through filters', t => {
  const graphQLQuery = `
  {
    CasedType(filter: {state: {name: "hello"}}) {
        name
        state {
          name
        }
      }
    }`,
    expectedCypherQuery =
      'MATCH (`casedType`:`CasedType`) WHERE (EXISTS((`casedType`)-[:FILMED_IN]->(:State)) AND ALL(`state` IN [(`casedType`)-[:FILMED_IN]->(`_state`:State) | `_state`] WHERE (`state`.name = $filter.state.name))) RETURN `casedType` { .name ,state: head([(`casedType`)-[:`FILMED_IN`]->(`casedType_state`:`State`) | `casedType_state` { .name }]) } AS `casedType`',
    expectedParams = {
      first: -1,
      cypherParams: CYPHER_PARAMS,
      offset: 0,
      filter: {
        state: {
          name: 'hello'
        }
      }
    };

  t.plan(2);
  return Promise.all([
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
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
    expectedCypherQuery = `MATCH (\`movie\`:\`Movie\`${ADDITIONAL_MOVIE_LABELS} {title:$title}) RETURN \`movie\` { .title ,actors: [(\`movie\`)<-[:\`ACTED_IN\`]-(\`movie_actors\`:\`Actor\`{name:$1_name}) | \`movie_actors\` { .name }][..3] ,similar: [ movie_similar IN apoc.cypher.runFirstColumn("WITH {this} AS this MATCH (this)--(:Genre)--(o:Movie) RETURN o", {this: movie, cypherParams: $cypherParams, offset: 0, first: $3_first}, true) | movie_similar { .title }][..3] } AS \`movie\``,
    expectedParams = {
      title: 'River Runs Through It, A',
      cypherParams: CYPHER_PARAMS,
      first: -1,
      offset: 0,
      '1_first': 3,
      '1_name': 'Tom Hanks',
      '3_first': 3
    };

  t.plan(4);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, expectedParams),
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
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
    expectedCypherQuery = `WITH apoc.cypher.runFirstColumn("MATCH (g:Genre) WHERE toLower(g.name) CONTAINS toLower($substring) RETURN g", {offset:$offset, first:$first, substring:$substring, cypherParams: $cypherParams}, True) AS x UNWIND x AS \`genre\` RETURN \`genre\` { .name ,movies: [(\`genre\`)<-[:\`IN_GENRE\`]-(\`genre_movies\`:\`Movie\`${ADDITIONAL_MOVIE_LABELS}) | \`genre_movies\` { .title }][..3] } AS \`genre\``,
    expectedParams = {
      substring: 'Action',
      first: -1,
      offset: 0,
      '1_first': 3,
      cypherParams: CYPHER_PARAMS
    };

  t.plan(4);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, expectedParams),
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('Handle @cypher directive on Mutation type', t => {
  const graphQLQuery = `mutation someMutation {
  CreateGenre(name: "Wildlife Documentary") {
    name
  }
}`,
    expectedCypherQuery = `CALL apoc.cypher.doIt("CREATE (g:Genre) SET g.name = $name RETURN g", {name:$name, first:$first, offset:$offset, cypherParams: $cypherParams}) YIELD value
    WITH apoc.map.values(value, [keys(value)[0]])[0] AS \`genre\`
    RETURN \`genre\` { .name } AS \`genre\``,
    expectedParams = {
      name: 'Wildlife Documentary',
      first: -1,
      cypherParams: CYPHER_PARAMS,
      offset: 0
    };

  t.plan(2);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, expectedParams)
  ]);
});

test('Handle @cypher directive on Mutation type with nested @cypher directive on field', t => {
  const graphQLQuery = `mutation someMutation {
    CreateGenre(name: "Wildlife Documentary") {
      highestRatedMovie {
        movieId
      }
    }
}`,
    expectedCypherQuery = `CALL apoc.cypher.doIt("CREATE (g:Genre) SET g.name = $name RETURN g", {name:$name, first:$first, offset:$offset, cypherParams: $cypherParams}) YIELD value
    WITH apoc.map.values(value, [keys(value)[0]])[0] AS \`genre\`
    RETURN \`genre\` {highestRatedMovie: head([ genre_highestRatedMovie IN apoc.cypher.runFirstColumn("MATCH (m:Movie)-[:IN_GENRE]->(this) RETURN m ORDER BY m.imdbRating DESC LIMIT 1", {this: genre, cypherParams: $cypherParams}, true) | genre_highestRatedMovie { .movieId }]) } AS \`genre\``,
    expectedParams = {
      name: 'Wildlife Documentary',
      first: -1,
      cypherParams: CYPHER_PARAMS,
      offset: 0
    };

  t.plan(2);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, expectedParams)
  ]);
});

test('Create node mutation', t => {
  const graphQLQuery = `	mutation someMutation {
  	CreateMovie(movieId: "12dd334d5", title:"My Super Awesome Movie", year:2018, plot:"An unending saga", poster:"www.movieposter.com/img.png", imdbRating: 1.0) {
			_id
      title
      genres {
        name
      }
    }
  }`,
    expectedCypherQuery = `
    CREATE (\`movie\`:\`Movie\`${ADDITIONAL_MOVIE_LABELS}:\`MovieSearch\` {movieId:$params.movieId,title:$params.title,year:$params.year,plot:$params.plot,poster:$params.poster,imdbRating:$params.imdbRating})
    RETURN \`movie\` {_id: ID(\`movie\`), .title ,genres: [(\`movie\`)-[:\`IN_GENRE\`]->(\`movie_genres\`:\`Genre\`) | \`movie_genres\` { .name }] } AS \`movie\`
  `,
    expectedParams = {
      params: {
        movieId: '12dd334d5',
        title: 'My Super Awesome Movie',
        year: {
          high: 0,
          low: 2018
        },
        plot: 'An unending saga',
        poster: 'www.movieposter.com/img.png',
        imdbRating: 1
      },
      first: -1,
      offset: 0
    };

  t.plan(4);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, expectedParams),
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('Merge node mutation (interface implemented)', t => {
  const graphQLQuery = `mutation {
    MergeUser(
      userId: "883c6b3e-3863-49a1-b190-1cee083c98b1",
      name: "Michael"
    ) {
      userId
      name
    }
  }`,
    expectedCypherQuery = `MERGE (\`user\`:\`User\`:\`Person\`{userId: $params.userId})
  SET \`user\` += {name:$params.name} RETURN \`user\` { .userId , .name } AS \`user\``,
    expectedParams = {
      params: {
        userId: '883c6b3e-3863-49a1-b190-1cee083c98b1',
        name: 'Michael'
      },
      first: -1,
      offset: 0
    };

  t.plan(4);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, expectedParams),
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('Merge node mutation using only primary key', t => {
  const graphQLQuery = `mutation MergeBook {
    MergeBook(
      genre: Mystery
    ) {
      genre
    }
  }`,
    expectedCypherQuery = `MERGE (\`book\`:\`Book\`:\`MovieSearch\`{genre: $params.genre})
  RETURN \`book\` { .genre } AS \`book\``,
    expectedParams = {
      params: {
        genre: 'Mystery'
      },
      first: -1,
      offset: 0
    };

  t.plan(4);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, expectedParams),
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('Merge node mutation using argument for field with the same name as merged type', t => {
  const graphQLQuery = `mutation MergeNodeTypeMutationTest($example: BookGenre!) {
      MergeNodeTypeMutationTest(NodeTypeMutationTest: $example) {
        NodeTypeMutationTest
      }
    }
  `,
    graphqlParams = {
      example: 'Mystery'
    },
    expectedCypherQuery = `MERGE (\`nodeTypeMutationTest\`:\`NodeTypeMutationTest\`{NodeTypeMutationTest: $params.NodeTypeMutationTest})
  RETURN \`nodeTypeMutationTest\` { .NodeTypeMutationTest } AS \`nodeTypeMutationTest\``,
    expectedParams = {
      params: {
        NodeTypeMutationTest: 'Mystery'
      },
      first: -1,
      offset: 0
    };
  t.plan(4);
  return Promise.all([
    cypherTestRunner(
      t,
      graphQLQuery,
      graphqlParams,
      expectedCypherQuery,
      expectedParams
    ),
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      graphqlParams,
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('Update node mutation', t => {
  const graphQLQuery = `mutation updateMutation {
    UpdateMovie(movieId: "12dd334d5", year: 2010) {
      _id
      title
      year
    }
  }`,
    expectedCypherQuery = `MATCH (\`movie\`:\`Movie\`{movieId: $params.movieId})
  SET \`movie\` += {year:$params.year} RETURN \`movie\` {_id: ID(\`movie\`), .title , .year } AS \`movie\``,
    expectedParams = {
      params: {
        year: {
          high: 0,
          low: 2010
        },
        movieId: '12dd334d5'
      },
      first: -1,
      offset: 0
    };
  t.plan(4);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, expectedParams),
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('Delete node mutation', t => {
  const graphQLQuery = `mutation deleteMutation{
      DeleteMovie(movieId: "12dd334d5") {
        _id
        movieId
      }
    }`,
    expectedCypherQuery = `MATCH (\`movie\`:\`Movie\` {movieId: $movieId})
WITH \`movie\` AS \`movie_toDelete\`, \`movie\` {_id: ID(\`movie\`), .movieId } AS \`movie\`
DETACH DELETE \`movie_toDelete\`
RETURN \`movie\``,
    expectedParams = {
      movieId: '12dd334d5',
      first: -1,
      offset: 0
    };
  t.plan(4);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, expectedParams),
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
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
      MATCH (\`movie_from\`:\`Movie\`${ADDITIONAL_MOVIE_LABELS} {movieId: $from.movieId})
      MATCH (\`genre_to\`:\`Genre\` {name: $to.name})
      CREATE (\`movie_from\`)-[\`in_genre_relation\`:\`IN_GENRE\`]->(\`genre_to\`)
      RETURN \`in_genre_relation\` { from: \`movie_from\` { .movieId ,genres: [(\`movie_from\`)-[:\`IN_GENRE\`]->(\`movie_from_genres\`:\`Genre\`) | \`movie_from_genres\` {_id: ID(\`movie_from_genres\`), .name }] } ,to: \`genre_to\` { .name }  } AS \`_AddMovieGenresPayload\`;
    `,
    expectedParams = {
      from: { movieId: '123' },
      to: { name: 'Action' },
      first: -1,
      offset: 0
    };

  t.plan(2);
  return Promise.all([
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('Add relationship mutation and query only outgoing nodes', t => {
  const graphQLQuery = `mutation someMutation {
    AddMovieGenres(
      from: { movieId: "123" },
      to: { name: "Action" }
    ) {
      to {
        name
      }
    }
  }`,
    expectedCypherQuery = `
      MATCH (\`movie_from\`:\`Movie\`${ADDITIONAL_MOVIE_LABELS} {movieId: $from.movieId})
      MATCH (\`genre_to\`:\`Genre\` {name: $to.name})
      CREATE (\`movie_from\`)-[\`in_genre_relation\`:\`IN_GENRE\`]->(\`genre_to\`)
      RETURN \`in_genre_relation\` { to: \`genre_to\` { .name }  } AS \`_AddMovieGenresPayload\`;
    `,
    expectedParams = {
      from: { movieId: '123' },
      to: { name: 'Action' },
      first: -1,
      offset: 0
    };

  t.plan(2);
  return augmentedSchemaCypherTestRunner(
    t,
    graphQLQuery,
    {},
    expectedCypherQuery,
    expectedParams
  );
});

test('Merge relationship mutation', t => {
  const graphQLQuery = `mutation someMutation {
    MergeMovieGenres(
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
      MATCH (\`movie_from\`:\`Movie\`${ADDITIONAL_MOVIE_LABELS} {movieId: $from.movieId})
      MATCH (\`genre_to\`:\`Genre\` {name: $to.name})
      MERGE (\`movie_from\`)-[\`in_genre_relation\`:\`IN_GENRE\`]->(\`genre_to\`)
      RETURN \`in_genre_relation\` { from: \`movie_from\` { .movieId ,genres: [(\`movie_from\`)-[:\`IN_GENRE\`]->(\`movie_from_genres\`:\`Genre\`) | \`movie_from_genres\` {_id: ID(\`movie_from_genres\`), .name }] } ,to: \`genre_to\` { .name }  } AS \`_MergeMovieGenresPayload\`;
    `,
    expectedParams = {
      from: { movieId: '123' },
      to: { name: 'Action' },
      first: -1,
      offset: 0
    };

  t.plan(2);
  return augmentedSchemaCypherTestRunner(
    t,
    graphQLQuery,
    {},
    expectedCypherQuery,
    expectedParams
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
    graphqlParams = {
      from: { movieId: '123' },
      to: { name: 'Action' },
      first: -1,
      offset: 0
    },
    expectedCypherQuery = `
      MATCH (\`movie_from\`:\`Movie\`${ADDITIONAL_MOVIE_LABELS} {movieId: $from.movieId})
      MATCH (\`genre_to\`:\`Genre\` {name: $to.name})
      CREATE (\`movie_from\`)-[\`in_genre_relation\`:\`IN_GENRE\`]->(\`genre_to\`)
      RETURN \`in_genre_relation\` { from: \`movie_from\` { .movieId ,genres: [(\`movie_from\`)-[:\`IN_GENRE\`]->(\`movie_from_genres\`:\`Genre\`) | \`movie_from_genres\` {_id: ID(\`movie_from_genres\`), .name }] } ,to: \`genre_to\` { .name }  } AS \`_AddMovieGenresPayload\`;
    `,
    expectedParams = {
      from: { movieId: '123' },
      to: { name: 'Action' },
      first: -1,
      offset: 0
    };

  t.plan(2);
  return augmentedSchemaCypherTestRunner(
    t,
    graphQLQuery,
    graphqlParams,
    expectedCypherQuery,
    expectedParams
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
      MATCH (\`user_from\`:\`User\` {userId: $from.userId})
      MATCH (\`movie_to\`:\`Movie\`${ADDITIONAL_MOVIE_LABELS} {movieId: $to.movieId})
      CREATE (\`user_from\`)-[\`rated_relation\`:\`RATED\` {rating:$data.rating}]->(\`movie_to\`)
      RETURN \`rated_relation\` { from: \`user_from\` {_id: ID(\`user_from\`), .userId , .name ,rated: [(\`user_from\`)-[\`user_from_rated_relation\`:\`RATED\`]->(:\`Movie\`${ADDITIONAL_MOVIE_LABELS}) | user_from_rated_relation { .rating ,Movie: head([(:\`User\`)-[\`user_from_rated_relation\`]->(\`user_from_rated_Movie\`:\`Movie\`${ADDITIONAL_MOVIE_LABELS}) | user_from_rated_Movie {_id: ID(\`user_from_rated_Movie\`), .movieId , .title }]) }] } ,to: \`movie_to\` {_id: ID(\`movie_to\`), .movieId , .title ,ratings: [(\`movie_to\`)<-[\`movie_to_ratings_relation\`:\`RATED\`]-(:\`User\`) | movie_to_ratings_relation { .rating ,User: head([(:\`Movie\`${ADDITIONAL_MOVIE_LABELS})<-[\`movie_to_ratings_relation\`]-(\`movie_to_ratings_User\`:\`User\`) | movie_to_ratings_User {_id: ID(\`movie_to_ratings_User\`), .userId , .name }]) }] } , .rating  } AS \`_AddUserRatedPayload\`;
    `,
    expectedParams = {
      from: { userId: '123' },
      to: { movieId: '456' },
      data: {
        rating: {
          high: 0,
          low: 5
        }
      },
      first: -1,
      offset: 0
    };

  t.plan(2);
  return augmentedSchemaCypherTestRunner(
    t,
    graphQLQuery,
    {},
    expectedCypherQuery,
    expectedParams
  );
});

test('Merge relationship mutation with relationship property', t => {
  const graphQLQuery = `mutation someMutation {
    MergeUserRated(
      from: { userId: "123" }
      to: { movieId: "8" }
      data: { rating: 9 }
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
      MATCH (\`user_from\`:\`User\` {userId: $from.userId})
      MATCH (\`movie_to\`:\`Movie\`${ADDITIONAL_MOVIE_LABELS} {movieId: $to.movieId})
      MERGE (\`user_from\`)-[\`rated_relation\`:\`RATED\`]->(\`movie_to\`)
      SET \`rated_relation\` += {rating:$data.rating} 
      RETURN \`rated_relation\` { from: \`user_from\` {_id: ID(\`user_from\`), .userId , .name ,rated: [(\`user_from\`)-[\`user_from_rated_relation\`:\`RATED\`]->(:\`Movie\`${ADDITIONAL_MOVIE_LABELS}) | user_from_rated_relation { .rating ,Movie: head([(:\`User\`)-[\`user_from_rated_relation\`]->(\`user_from_rated_Movie\`:\`Movie\`${ADDITIONAL_MOVIE_LABELS}) | user_from_rated_Movie {_id: ID(\`user_from_rated_Movie\`), .movieId , .title }]) }] } ,to: \`movie_to\` {_id: ID(\`movie_to\`), .movieId , .title ,ratings: [(\`movie_to\`)<-[\`movie_to_ratings_relation\`:\`RATED\`]-(:\`User\`) | movie_to_ratings_relation { .rating ,User: head([(:\`Movie\`${ADDITIONAL_MOVIE_LABELS})<-[\`movie_to_ratings_relation\`]-(\`movie_to_ratings_User\`:\`User\`) | movie_to_ratings_User {_id: ID(\`movie_to_ratings_User\`), .userId , .name }]) }] } , .rating  } AS \`_MergeUserRatedPayload\`;
    `,
    expectedParams = {
      from: { userId: '123' },
      to: { movieId: '8' },
      data: {
        rating: {
          high: 0,
          low: 9
        }
      },
      first: -1,
      offset: 0
    };

  t.plan(2);
  return augmentedSchemaCypherTestRunner(
    t,
    graphQLQuery,
    {},
    expectedCypherQuery,
    expectedParams
  );
});

test('Update relationship mutation with relationship property', t => {
  const graphQLQuery = `mutation someMutation {
    UpdateUserRated(
      from: { userId: "123" }
      to: { movieId: "2kljghd" }
      data: {
        rating: 1,
        location: {
          longitude: 3.0,
          latitude: 4.5,
          height: 12.5
        }
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
      MATCH (\`user_from\`:\`User\` {userId: $from.userId})
      MATCH (\`movie_to\`:\`Movie\`${ADDITIONAL_MOVIE_LABELS} {movieId: $to.movieId})
      MATCH (\`user_from\`)-[\`rated_relation\`:\`RATED\`]->(\`movie_to\`)
      SET \`rated_relation\` += {rating:$data.rating,location: point($data.location)} 
      RETURN \`rated_relation\` { from: \`user_from\` {_id: ID(\`user_from\`), .userId , .name ,rated: [(\`user_from\`)-[\`user_from_rated_relation\`:\`RATED\`]->(:\`Movie\`${ADDITIONAL_MOVIE_LABELS}) | user_from_rated_relation { .rating ,Movie: head([(:\`User\`)-[\`user_from_rated_relation\`]->(\`user_from_rated_Movie\`:\`Movie\`${ADDITIONAL_MOVIE_LABELS}) | user_from_rated_Movie {_id: ID(\`user_from_rated_Movie\`), .movieId , .title }]) }] } ,to: \`movie_to\` {_id: ID(\`movie_to\`), .movieId , .title ,ratings: [(\`movie_to\`)<-[\`movie_to_ratings_relation\`:\`RATED\`]-(:\`User\`) | movie_to_ratings_relation { .rating ,User: head([(:\`Movie\`${ADDITIONAL_MOVIE_LABELS})<-[\`movie_to_ratings_relation\`]-(\`movie_to_ratings_User\`:\`User\`) | movie_to_ratings_User {_id: ID(\`movie_to_ratings_User\`), .userId , .name }]) }] } , .rating  } AS \`_UpdateUserRatedPayload\`;
    `,
    expectedParams = {
      from: { userId: '123' },
      to: { movieId: '2kljghd' },
      data: {
        rating: {
          high: 0,
          low: 1
        },
        location: {
          longitude: 3.0,
          latitude: 4.5,
          height: 12.5
        }
      },
      first: -1,
      offset: 0
    };

  t.plan(2);
  return augmentedSchemaCypherTestRunner(
    t,
    graphQLQuery,
    {},
    expectedCypherQuery,
    expectedParams
  );
});

test('Update relationship mutation with relationship property and query only outgoing nodes', t => {
  const graphQLQuery = `mutation someMutation {
    UpdateUserRated(
      from: { userId: "123" }
      to: { movieId: "2kljghd" }
      data: {
        rating: 1
        location: { longitude: 3.0, latitude: 4.5, height: 12.5 }
      }
    ) {
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
  }
  `,
    expectedCypherQuery = `
      MATCH (\`user_from\`:\`User\` {userId: $from.userId})
      MATCH (\`movie_to\`:\`Movie\`${ADDITIONAL_MOVIE_LABELS} {movieId: $to.movieId})
      MATCH (\`user_from\`)-[\`rated_relation\`:\`RATED\`]->(\`movie_to\`)
      SET \`rated_relation\` += {rating:$data.rating,location: point($data.location)} 
      RETURN \`rated_relation\` { to: \`movie_to\` {_id: ID(\`movie_to\`), .movieId , .title ,ratings: [(\`movie_to\`)<-[\`movie_to_ratings_relation\`:\`RATED\`]-(:\`User\`) | movie_to_ratings_relation { .rating ,User: head([(:\`Movie\`${ADDITIONAL_MOVIE_LABELS})<-[\`movie_to_ratings_relation\`]-(\`movie_to_ratings_User\`:\`User\`) | movie_to_ratings_User {_id: ID(\`movie_to_ratings_User\`), .userId , .name }]) }] } , .rating  } AS \`_UpdateUserRatedPayload\`;
    `,
    expectedParams = {
      from: { userId: '123' },
      to: { movieId: '2kljghd' },
      data: {
        rating: {
          high: 0,
          low: 1
        },
        location: {
          longitude: 3.0,
          latitude: 4.5,
          height: 12.5
        }
      },
      first: -1,
      offset: 0
    };

  t.plan(2);
  return augmentedSchemaCypherTestRunner(
    t,
    graphQLQuery,
    {},
    expectedCypherQuery,
    expectedParams
  );
});

test('Add reflexive relationship mutation with relationship property', t => {
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
      MATCH (\`user_from\`:\`User\` {userId: $from.userId})
      MATCH (\`user_to\`:\`User\` {userId: $to.userId})
      CREATE (\`user_from\`)-[\`friend_of_relation\`:\`FRIEND_OF\` {since:$data.since}]->(\`user_to\`)
      RETURN \`friend_of_relation\` { from: \`user_from\` {_id: ID(\`user_from\`), .userId , .name ,friends: {from: [(\`user_from\`)<-[\`user_from_from_relation\`:\`FRIEND_OF\`]-(\`user_from_from\`:\`User\`) | user_from_from_relation { .since ,User: user_from_from {_id: ID(\`user_from_from\`), .name ,friends: {from: [(\`user_from_from\`)<-[\`user_from_from_from_relation\`:\`FRIEND_OF\`]-(\`user_from_from_from\`:\`User\`) | user_from_from_from_relation { .since ,User: user_from_from_from {_id: ID(\`user_from_from_from\`), .name } }] ,to: [(\`user_from_from\`)-[\`user_from_from_to_relation\`:\`FRIEND_OF\`]->(\`user_from_from_to\`:\`User\`) | user_from_from_to_relation { .since ,User: user_from_from_to {_id: ID(\`user_from_from_to\`), .name } }] } } }] ,to: [(\`user_from\`)-[\`user_from_to_relation\`:\`FRIEND_OF\`]->(\`user_from_to\`:\`User\`) | user_from_to_relation { .since ,User: user_from_to {_id: ID(\`user_from_to\`), .name } }] } } ,to: \`user_to\` {_id: ID(\`user_to\`), .name ,friends: {from: [(\`user_to\`)<-[\`user_to_from_relation\`:\`FRIEND_OF\`]-(\`user_to_from\`:\`User\`) | user_to_from_relation { .since ,User: user_to_from {_id: ID(\`user_to_from\`), .name } }] ,to: [(\`user_to\`)-[\`user_to_to_relation\`:\`FRIEND_OF\`]->(\`user_to_to\`:\`User\`) | user_to_to_relation { .since ,User: user_to_to {_id: ID(\`user_to_to\`), .name } }] } } , .since  } AS \`_AddUserFriendsPayload\`;
    `,
    expectedParams = {
      from: { userId: '123' },
      to: { userId: '456' },
      data: {
        since: {
          high: 0,
          low: 7
        }
      },
      first: -1,
      offset: 0
    };

  t.plan(2);
  return augmentedSchemaCypherTestRunner(
    t,
    graphQLQuery,
    {},
    expectedCypherQuery,
    expectedParams
  );
});

test('Merge reflexive relationship mutation with relationship property', t => {
  const graphQLQuery = `mutation {
    MergeUserFriends(
      from: {
        userId: "123"
      },
      to: {
        userId: "456"
      },
      data: {
        since: 8
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
      MATCH (\`user_from\`:\`User\` {userId: $from.userId})
      MATCH (\`user_to\`:\`User\` {userId: $to.userId})
      MERGE (\`user_from\`)-[\`friend_of_relation\`:\`FRIEND_OF\`]->(\`user_to\`)
      SET \`friend_of_relation\` += {since:$data.since} 
      RETURN \`friend_of_relation\` { from: \`user_from\` {_id: ID(\`user_from\`), .userId , .name ,friends: {from: [(\`user_from\`)<-[\`user_from_from_relation\`:\`FRIEND_OF\`]-(\`user_from_from\`:\`User\`) | user_from_from_relation { .since ,User: user_from_from {_id: ID(\`user_from_from\`), .name ,friends: {from: [(\`user_from_from\`)<-[\`user_from_from_from_relation\`:\`FRIEND_OF\`]-(\`user_from_from_from\`:\`User\`) | user_from_from_from_relation { .since ,User: user_from_from_from {_id: ID(\`user_from_from_from\`), .name } }] ,to: [(\`user_from_from\`)-[\`user_from_from_to_relation\`:\`FRIEND_OF\`]->(\`user_from_from_to\`:\`User\`) | user_from_from_to_relation { .since ,User: user_from_from_to {_id: ID(\`user_from_from_to\`), .name } }] } } }] ,to: [(\`user_from\`)-[\`user_from_to_relation\`:\`FRIEND_OF\`]->(\`user_from_to\`:\`User\`) | user_from_to_relation { .since ,User: user_from_to {_id: ID(\`user_from_to\`), .name } }] } } ,to: \`user_to\` {_id: ID(\`user_to\`), .name ,friends: {from: [(\`user_to\`)<-[\`user_to_from_relation\`:\`FRIEND_OF\`]-(\`user_to_from\`:\`User\`) | user_to_from_relation { .since ,User: user_to_from {_id: ID(\`user_to_from\`), .name } }] ,to: [(\`user_to\`)-[\`user_to_to_relation\`:\`FRIEND_OF\`]->(\`user_to_to\`:\`User\`) | user_to_to_relation { .since ,User: user_to_to {_id: ID(\`user_to_to\`), .name } }] } } , .since  } AS \`_MergeUserFriendsPayload\`;
    `,
    expectedParams = {
      from: { userId: '123' },
      to: { userId: '456' },
      data: {
        since: {
          high: 0,
          low: 8
        }
      },
      first: -1,
      offset: 0
    };

  t.plan(2);
  return augmentedSchemaCypherTestRunner(
    t,
    graphQLQuery,
    {},
    expectedCypherQuery,
    expectedParams
  );
});

test('Update reflexive relationship mutation with relationship property', t => {
  const graphQLQuery = `mutation {
    UpdateUserFriends(
      from: {
        userId: "123"
      },
      to: {
        userId: "456"
      },
      data: {
        since: 8
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
      MATCH (\`user_from\`:\`User\` {userId: $from.userId})
      MATCH (\`user_to\`:\`User\` {userId: $to.userId})
      MATCH (\`user_from\`)-[\`friend_of_relation\`:\`FRIEND_OF\`]->(\`user_to\`)
      SET \`friend_of_relation\` += {since:$data.since} 
      RETURN \`friend_of_relation\` { from: \`user_from\` {_id: ID(\`user_from\`), .userId , .name ,friends: {from: [(\`user_from\`)<-[\`user_from_from_relation\`:\`FRIEND_OF\`]-(\`user_from_from\`:\`User\`) | user_from_from_relation { .since ,User: user_from_from {_id: ID(\`user_from_from\`), .name ,friends: {from: [(\`user_from_from\`)<-[\`user_from_from_from_relation\`:\`FRIEND_OF\`]-(\`user_from_from_from\`:\`User\`) | user_from_from_from_relation { .since ,User: user_from_from_from {_id: ID(\`user_from_from_from\`), .name } }] ,to: [(\`user_from_from\`)-[\`user_from_from_to_relation\`:\`FRIEND_OF\`]->(\`user_from_from_to\`:\`User\`) | user_from_from_to_relation { .since ,User: user_from_from_to {_id: ID(\`user_from_from_to\`), .name } }] } } }] ,to: [(\`user_from\`)-[\`user_from_to_relation\`:\`FRIEND_OF\`]->(\`user_from_to\`:\`User\`) | user_from_to_relation { .since ,User: user_from_to {_id: ID(\`user_from_to\`), .name } }] } } ,to: \`user_to\` {_id: ID(\`user_to\`), .name ,friends: {from: [(\`user_to\`)<-[\`user_to_from_relation\`:\`FRIEND_OF\`]-(\`user_to_from\`:\`User\`) | user_to_from_relation { .since ,User: user_to_from {_id: ID(\`user_to_from\`), .name } }] ,to: [(\`user_to\`)-[\`user_to_to_relation\`:\`FRIEND_OF\`]->(\`user_to_to\`:\`User\`) | user_to_to_relation { .since ,User: user_to_to {_id: ID(\`user_to_to\`), .name } }] } } , .since  } AS \`_UpdateUserFriendsPayload\`;
    `,
    expectedParams = {
      from: { userId: '123' },
      to: { userId: '456' },
      data: {
        since: {
          high: 0,
          low: 8
        }
      },
      first: -1,
      offset: 0
    };

  t.plan(2);
  return augmentedSchemaCypherTestRunner(
    t,
    graphQLQuery,
    {},
    expectedCypherQuery,
    expectedParams
  );
});

test('Add interfaced relationship mutation', t => {
  const graphQLQuery = `mutation someMutation {
    AddActorKnows(
      from: { userId: "123" },
      to: { userId: "456" }
    ) {
      from {
        userId
        name
      }
      to {
        userId
        name
      }
    }
  }`,
    expectedCypherQuery = `
      MATCH (\`actor_from\`:\`Actor\` {userId: $from.userId})
      MATCH (\`person_to\`:\`Person\` {userId: $to.userId})
      CREATE (\`actor_from\`)-[\`knows_relation\`:\`KNOWS\`]->(\`person_to\`)
      RETURN \`knows_relation\` { from: \`actor_from\` { .userId , .name } ,to: \`person_to\` {FRAGMENT_TYPE: head( [ label IN labels(\`person_to\`) WHERE label IN $Person_derivedTypes ] ), .userId , .name }  } AS \`_AddActorKnowsPayload\`;
    `,
    expectedParams = {
      from: { userId: '123' },
      to: { userId: '456' },
      first: -1,
      offset: 0,
      Person_derivedTypes: ['Actor', 'CameraMan', 'User']
    };

  t.plan(2);
  return augmentedSchemaCypherTestRunner(
    t,
    graphQLQuery,
    {},
    expectedCypherQuery,
    expectedParams
  );
});

test('Add interfaced relationship type mutation', t => {
  const graphQLQuery = `mutation {
    AddActorInterfacedRelationshipType(
      from: { userId: "744c23c8-2042-402d-b482-28d089f976f9" }
      to: { name: "Wildlife Documentary" }
      data: { string: "data" }
    ) {
      from {
        userId
        interfacedRelationshipType {
          string
          Genre {
            name
          }
        }
      }
      string
    }
  }`,
    expectedCypherQuery = `
      MATCH (\`person_from\`:\`Person\` {userId: $from.userId})
      MATCH (\`genre_to\`:\`Genre\` {name: $to.name})
      CREATE (\`person_from\`)-[\`interfaced_relationship_type_relation\`:\`INTERFACED_RELATIONSHIP_TYPE\` {string:$data.string}]->(\`genre_to\`)
      RETURN \`interfaced_relationship_type_relation\` { from: \`person_from\` {FRAGMENT_TYPE: head( [ label IN labels(\`person_from\`) WHERE label IN $Person_derivedTypes ] ), .userId ,interfacedRelationshipType: [(\`person_from\`)-[\`person_from_interfacedRelationshipType_relation\`:\`INTERFACED_RELATIONSHIP_TYPE\`]->(:\`Genre\`) | person_from_interfacedRelationshipType_relation { .string ,Genre: head([(:\`Person\`)-[\`person_from_interfacedRelationshipType_relation\`]->(\`person_from_interfacedRelationshipType_Genre\`:\`Genre\`) | person_from_interfacedRelationshipType_Genre { .name }]) }] } , .string  } AS \`_AddActorInterfacedRelationshipTypePayload\`;
    `,
    expectedParams = {
      from: {
        userId: '744c23c8-2042-402d-b482-28d089f976f9'
      },
      to: {
        name: 'Wildlife Documentary'
      },
      data: {
        string: 'data'
      },
      first: -1,
      offset: 0,
      Person_derivedTypes: ['Actor', 'CameraMan', 'User']
    };

  t.plan(2);
  return augmentedSchemaCypherTestRunner(
    t,
    graphQLQuery,
    {},
    expectedCypherQuery,
    expectedParams
  );
});

test('Merge interfaced relationship mutation', t => {
  const graphQLQuery = `mutation someMutation {
    MergeActorKnows(
      from: { userId: "123" },
      to: { userId: "456" }
    ) {
      from {
        userId
        name
      }
      to {
        userId
        name
      }
    }
  }`,
    expectedCypherQuery = `
      MATCH (\`actor_from\`:\`Actor\` {userId: $from.userId})
      MATCH (\`person_to\`:\`Person\` {userId: $to.userId})
      MERGE (\`actor_from\`)-[\`knows_relation\`:\`KNOWS\`]->(\`person_to\`)
      RETURN \`knows_relation\` { from: \`actor_from\` { .userId , .name } ,to: \`person_to\` {FRAGMENT_TYPE: head( [ label IN labels(\`person_to\`) WHERE label IN $Person_derivedTypes ] ), .userId , .name }  } AS \`_MergeActorKnowsPayload\`;
    `,
    expectedParams = {
      from: { userId: '123' },
      to: { userId: '456' },
      first: -1,
      offset: 0,
      Person_derivedTypes: ['Actor', 'CameraMan', 'User']
    };

  t.plan(2);
  return augmentedSchemaCypherTestRunner(
    t,
    graphQLQuery,
    {},
    expectedCypherQuery,
    expectedParams
  );
});

test('Merge interfaced relationship type mutation', t => {
  const graphQLQuery = `mutation {
    MergeActorInterfacedRelationshipType(
      from: { userId: "744c23c8-2042-402d-b482-28d089f976f9" }
      to: { name: "Wildlife Documentary" }
      data: { string: "data" }
    ) {
      from {
        userId
        interfacedRelationshipType {
          string
          Genre {
            name
          }
        }
      }
      string
    }
  }`,
    expectedCypherQuery = `
      MATCH (\`person_from\`:\`Person\` {userId: $from.userId})
      MATCH (\`genre_to\`:\`Genre\` {name: $to.name})
      MERGE (\`person_from\`)-[\`interfaced_relationship_type_relation\`:\`INTERFACED_RELATIONSHIP_TYPE\`]->(\`genre_to\`)
      SET \`interfaced_relationship_type_relation\` += {string:$data.string} 
      RETURN \`interfaced_relationship_type_relation\` { from: \`person_from\` {FRAGMENT_TYPE: head( [ label IN labels(\`person_from\`) WHERE label IN $Person_derivedTypes ] ), .userId ,interfacedRelationshipType: [(\`person_from\`)-[\`person_from_interfacedRelationshipType_relation\`:\`INTERFACED_RELATIONSHIP_TYPE\`]->(:\`Genre\`) | person_from_interfacedRelationshipType_relation { .string ,Genre: head([(:\`Person\`)-[\`person_from_interfacedRelationshipType_relation\`]->(\`person_from_interfacedRelationshipType_Genre\`:\`Genre\`) | person_from_interfacedRelationshipType_Genre { .name }]) }] } , .string  } AS \`_MergeActorInterfacedRelationshipTypePayload\`;
    `,
    expectedParams = {
      from: {
        userId: '744c23c8-2042-402d-b482-28d089f976f9'
      },
      to: {
        name: 'Wildlife Documentary'
      },
      data: {
        string: 'data'
      },
      first: -1,
      offset: 0,
      Person_derivedTypes: ['Actor', 'CameraMan', 'User']
    };

  t.plan(2);
  return augmentedSchemaCypherTestRunner(
    t,
    graphQLQuery,
    {},
    expectedCypherQuery,
    expectedParams
  );
});

test('Update interfaced relationship type mutation', t => {
  const graphQLQuery = `mutation {
    UpdateActorInterfacedRelationshipType(
      from: { userId: "744c23c8-2042-402d-b482-28d089f976f9" }
      to: { name: "Wildlife Documentary" }
      data: { string: "value" }
    ) {
      from {
        userId
        interfacedRelationshipType {
          string
          Genre {
            name
          }
        }
      }
      string
    }
  }`,
    expectedCypherQuery = `
      MATCH (\`person_from\`:\`Person\` {userId: $from.userId})
      MATCH (\`genre_to\`:\`Genre\` {name: $to.name})
      MATCH (\`person_from\`)-[\`interfaced_relationship_type_relation\`:\`INTERFACED_RELATIONSHIP_TYPE\`]->(\`genre_to\`)
      SET \`interfaced_relationship_type_relation\` += {string:$data.string} 
      RETURN \`interfaced_relationship_type_relation\` { from: \`person_from\` {FRAGMENT_TYPE: head( [ label IN labels(\`person_from\`) WHERE label IN $Person_derivedTypes ] ), .userId ,interfacedRelationshipType: [(\`person_from\`)-[\`person_from_interfacedRelationshipType_relation\`:\`INTERFACED_RELATIONSHIP_TYPE\`]->(:\`Genre\`) | person_from_interfacedRelationshipType_relation { .string ,Genre: head([(:\`Person\`)-[\`person_from_interfacedRelationshipType_relation\`]->(\`person_from_interfacedRelationshipType_Genre\`:\`Genre\`) | person_from_interfacedRelationshipType_Genre { .name }]) }] } , .string  } AS \`_UpdateActorInterfacedRelationshipTypePayload\`;
    `,
    expectedParams = {
      from: {
        userId: '744c23c8-2042-402d-b482-28d089f976f9'
      },
      to: {
        name: 'Wildlife Documentary'
      },
      data: {
        string: 'value'
      },
      first: -1,
      offset: 0,
      Person_derivedTypes: ['Actor', 'CameraMan', 'User']
    };

  t.plan(2);
  return augmentedSchemaCypherTestRunner(
    t,
    graphQLQuery,
    {},
    expectedCypherQuery,
    expectedParams
  );
});

test('Merge interfaced relationship type mutation (additional operation)', t => {
  const graphQLQuery = `mutation {
    MergeGenreInterfacedRelationshipType(
      from: { userId: "744c23c8-2042-402d-b482-28d089f976f9" }
      to: { name: "Wildlife Documentary" }
      data: { string: "data" }
    ) {
      from {
        userId
        name
        interfacedRelationshipType {
          string
          Genre {
            name
          }
        }
      }
      to {
        name
        interfacedRelationshipType {
          string
          Person {
            userId
            name
          }
        }
      }
      string
    }
  }`,
    expectedCypherQuery = `
      MATCH (\`person_from\`:\`Person\` {userId: $from.userId})
      MATCH (\`genre_to\`:\`Genre\` {name: $to.name})
      MERGE (\`person_from\`)-[\`interfaced_relationship_type_relation\`:\`INTERFACED_RELATIONSHIP_TYPE\`]->(\`genre_to\`)
      SET \`interfaced_relationship_type_relation\` += {string:$data.string} 
      RETURN \`interfaced_relationship_type_relation\` { from: \`person_from\` {FRAGMENT_TYPE: head( [ label IN labels(\`person_from\`) WHERE label IN $Person_derivedTypes ] ), .userId , .name ,interfacedRelationshipType: [(\`person_from\`)-[\`person_from_interfacedRelationshipType_relation\`:\`INTERFACED_RELATIONSHIP_TYPE\`]->(:\`Genre\`) | person_from_interfacedRelationshipType_relation { .string ,Genre: head([(:\`Person\`)-[\`person_from_interfacedRelationshipType_relation\`]->(\`person_from_interfacedRelationshipType_Genre\`:\`Genre\`) | person_from_interfacedRelationshipType_Genre { .name }]) }] } ,to: \`genre_to\` { .name ,interfacedRelationshipType: [(\`genre_to\`)<-[\`genre_to_interfacedRelationshipType_relation\`:\`INTERFACED_RELATIONSHIP_TYPE\`]-(:\`Person\`) | genre_to_interfacedRelationshipType_relation { .string ,Person: head([(:\`Genre\`)<-[\`genre_to_interfacedRelationshipType_relation\`]-(\`genre_to_interfacedRelationshipType_Person\`:\`Person\`) | genre_to_interfacedRelationshipType_Person {FRAGMENT_TYPE: head( [ label IN labels(genre_to_interfacedRelationshipType_Person) WHERE label IN $Person_derivedTypes ] ), .userId , .name }]) }] } , .string  } AS \`_MergeGenreInterfacedRelationshipTypePayload\`;
    `,
    expectedParams = {
      from: {
        userId: '744c23c8-2042-402d-b482-28d089f976f9'
      },
      to: {
        name: 'Wildlife Documentary'
      },
      data: {
        string: 'data'
      },
      first: -1,
      offset: 0,
      Person_derivedTypes: ['Actor', 'CameraMan', 'User']
    };

  t.plan(2);
  return augmentedSchemaCypherTestRunner(
    t,
    graphQLQuery,
    {},
    expectedCypherQuery,
    expectedParams
  );
});

test('Remove interfaced relationship mutation', t => {
  const graphQLQuery = `mutation someMutation {
    RemoveActorKnows(
      from: { userId: "123" },
      to: { userId: "456" }
    ) {
      from {
        userId
        name
      }
      to {
        userId
        name
      }
    }
  }`,
    expectedCypherQuery = `
      MATCH (\`actor_from\`:\`Actor\` {userId: $from.userId})
      MATCH (\`person_to\`:\`Person\` {userId: $to.userId})
      OPTIONAL MATCH (\`actor_from\`)-[\`actor_fromperson_to\`:\`KNOWS\`]->(\`person_to\`)
      DELETE \`actor_fromperson_to\`
      WITH COUNT(*) AS scope, \`actor_from\` AS \`_actor_from\`, \`person_to\` AS \`_person_to\`
      RETURN {from: \`_actor_from\` { .userId , .name } ,to: \`_person_to\` {FRAGMENT_TYPE: head( [ label IN labels(\`_person_to\`) WHERE label IN $Person_derivedTypes ] ), .userId , .name } } AS \`_RemoveActorKnowsPayload\`;
    `,
    expectedParams = {
      from: { userId: '123' },
      to: { userId: '456' },
      first: -1,
      offset: 0,
      Person_derivedTypes: ['Actor', 'CameraMan', 'User']
    };

  t.plan(2);
  return augmentedSchemaCypherTestRunner(
    t,
    graphQLQuery,
    {},
    expectedCypherQuery,
    expectedParams
  );
});

test('Remove interfaced relationship type mutation', t => {
  const graphQLQuery = `mutation {
    RemoveActorInterfacedRelationshipType(
      from: { userId: "744c23c8-2042-402d-b482-28d089f976f9" }
      to: { name: "Wildlife Documentary" }
    ) {
      from {
        userId
        interfacedRelationshipType {
          string
          Genre {
            name
          }
        }
      }
    }
  }`,
    expectedCypherQuery = `
      MATCH (\`person_from\`:\`Person\` {userId: $from.userId})
      MATCH (\`genre_to\`:\`Genre\` {name: $to.name})
      OPTIONAL MATCH (\`person_from\`)-[\`person_fromgenre_to\`:\`INTERFACED_RELATIONSHIP_TYPE\`]->(\`genre_to\`)
      DELETE \`person_fromgenre_to\`
      WITH COUNT(*) AS scope, \`person_from\` AS \`_person_from\`, \`genre_to\` AS \`_genre_to\`
      RETURN {from: \`_person_from\` {FRAGMENT_TYPE: head( [ label IN labels(\`_person_from\`) WHERE label IN $Person_derivedTypes ] ), .userId ,interfacedRelationshipType: [(\`_person_from\`)-[\`_person_from_interfacedRelationshipType_relation\`:\`INTERFACED_RELATIONSHIP_TYPE\`]->(:\`Genre\`) | _person_from_interfacedRelationshipType_relation { .string ,Genre: head([(:\`Person\`)-[\`_person_from_interfacedRelationshipType_relation\`]->(\`_person_from_interfacedRelationshipType_Genre\`:\`Genre\`) | _person_from_interfacedRelationshipType_Genre { .name }]) }] } } AS \`_RemoveActorInterfacedRelationshipTypePayload\`;
    `,
    expectedParams = {
      from: {
        userId: '744c23c8-2042-402d-b482-28d089f976f9'
      },
      to: {
        name: 'Wildlife Documentary'
      },
      first: -1,
      offset: 0,
      Person_derivedTypes: ['Actor', 'CameraMan', 'User']
    };

  t.plan(2);
  return augmentedSchemaCypherTestRunner(
    t,
    graphQLQuery,
    {},
    expectedCypherQuery,
    expectedParams
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
      MATCH (\`movie_from\`:\`Movie\`${ADDITIONAL_MOVIE_LABELS} {movieId: $from.movieId})
      MATCH (\`genre_to\`:\`Genre\` {name: $to.name})
      OPTIONAL MATCH (\`movie_from\`)-[\`movie_fromgenre_to\`:\`IN_GENRE\`]->(\`genre_to\`)
      DELETE \`movie_fromgenre_to\`
      WITH COUNT(*) AS scope, \`movie_from\` AS \`_movie_from\`, \`genre_to\` AS \`_genre_to\`
      RETURN {from: \`_movie_from\` {_id: ID(\`_movie_from\`), .title } ,to: \`_genre_to\` {_id: ID(\`_genre_to\`), .name } } AS \`_RemoveMovieGenresPayload\`;
    `,
    expectedParams = {
      from: { movieId: '123' },
      to: { name: 'Action' },
      first: -1,
      offset: 0
    };

  t.plan(2);
  return augmentedSchemaCypherTestRunner(
    t,
    graphQLQuery,
    {},
    expectedCypherQuery,
    expectedParams
  );
});

test('Remove relationship mutation and query only outgoing nodes', t => {
  const graphQLQuery = `mutation someMutation {
    RemoveMovieGenres(
      from: { movieId: "123" },
      to: { name: "Action" }
    ) {
      to {
        _id
        name
      }
    }
  }`,
    expectedCypherQuery = `
      MATCH (\`movie_from\`:\`Movie\`${ADDITIONAL_MOVIE_LABELS} {movieId: $from.movieId})
      MATCH (\`genre_to\`:\`Genre\` {name: $to.name})
      OPTIONAL MATCH (\`movie_from\`)-[\`movie_fromgenre_to\`:\`IN_GENRE\`]->(\`genre_to\`)
      DELETE \`movie_fromgenre_to\`
      WITH COUNT(*) AS scope, \`movie_from\` AS \`_movie_from\`, \`genre_to\` AS \`_genre_to\`
      RETURN {to: \`_genre_to\` {_id: ID(\`_genre_to\`), .name } } AS \`_RemoveMovieGenresPayload\`;
    `,
    expectedParams = {
      from: { movieId: '123' },
      to: { name: 'Action' },
      first: -1,
      offset: 0
    };

  t.plan(2);
  return augmentedSchemaCypherTestRunner(
    t,
    graphQLQuery,
    {},
    expectedCypherQuery,
    expectedParams
  );
});

test('Remove reflexive relationship mutation', t => {
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
      MATCH (\`user_from\`:\`User\` {userId: $from.userId})
      MATCH (\`user_to\`:\`User\` {userId: $to.userId})
      OPTIONAL MATCH (\`user_from\`)-[\`user_fromuser_to\`:\`FRIEND_OF\`]->(\`user_to\`)
      DELETE \`user_fromuser_to\`
      WITH COUNT(*) AS scope, \`user_from\` AS \`_user_from\`, \`user_to\` AS \`_user_to\`
      RETURN {from: \`_user_from\` {_id: ID(\`_user_from\`), .name ,friends: {from: [(\`_user_from\`)<-[\`_user_from_from_relation\`:\`FRIEND_OF\`]-(\`_user_from_from\`:\`User\`) | _user_from_from_relation { .since ,User: _user_from_from {_id: ID(\`_user_from_from\`), .name } }] ,to: [(\`_user_from\`)-[\`_user_from_to_relation\`:\`FRIEND_OF\`]->(\`_user_from_to\`:\`User\`) | _user_from_to_relation { .since ,User: _user_from_to {_id: ID(\`_user_from_to\`), .name } }] } } ,to: \`_user_to\` {_id: ID(\`_user_to\`), .name ,friends: {from: [(\`_user_to\`)<-[\`_user_to_from_relation\`:\`FRIEND_OF\`]-(\`_user_to_from\`:\`User\`) | _user_to_from_relation { .since ,User: _user_to_from {_id: ID(\`_user_to_from\`), .name } }] ,to: [(\`_user_to\`)-[\`_user_to_to_relation\`:\`FRIEND_OF\`]->(\`_user_to_to\`:\`User\`) | _user_to_to_relation { .since ,User: _user_to_to {_id: ID(\`_user_to_to\`), .name } }] } } } AS \`_RemoveUserFriendsPayload\`;
    `,
    expectedParams = {
      from: { userId: '123' },
      to: { userId: '456' },
      first: -1,
      offset: 0
    };

  t.plan(2);
  return augmentedSchemaCypherTestRunner(
    t,
    graphQLQuery,
    {},
    expectedCypherQuery,
    expectedParams
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
    graphqlParams = {
      year: 2016,
      first: 3
    },
    expectedCypherQuery = `MATCH (\`movie\`:\`Movie\`${ADDITIONAL_MOVIE_LABELS} {year:$year}) RETURN \`movie\` { .title , .year ,similar: [ movie_similar IN apoc.cypher.runFirstColumn("WITH {this} AS this MATCH (this)--(:Genre)--(o:Movie) RETURN o", {this: movie, cypherParams: $cypherParams, offset: 0, first: $1_first}, true) | movie_similar { .title }][..3] } AS \`movie\``,
    expectedParams = {
      '1_first': 3,
      cypherParams: CYPHER_PARAMS,
      year: 2016,
      first: -1,
      offset: 0
    };

  t.plan(4);
  return Promise.all([
    cypherTestRunner(
      t,
      graphQLQuery,
      graphqlParams,
      expectedCypherQuery,
      expectedParams
    ),
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      graphqlParams,
      expectedCypherQuery,
      expectedParams
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
    graphqlParams = {
      year: 2016,
      first: 3,
      scale: 5
    },
    expectedCypherQuery = `MATCH (\`movie\`:\`Movie\`${ADDITIONAL_MOVIE_LABELS} {year:$year}) RETURN \`movie\` { .title , .year ,similar: [ movie_similar IN apoc.cypher.runFirstColumn("WITH {this} AS this MATCH (this)--(:Genre)--(o:Movie) RETURN o", {this: movie, cypherParams: $cypherParams, offset: 0, first: $1_first}, true) | movie_similar { .title ,scaleRating: apoc.cypher.runFirstColumn("WITH $this AS this RETURN $scale * this.imdbRating", {this: movie_similar, cypherParams: $cypherParams, scale: $2_scale}, false)}][..3] } AS \`movie\``,
    expectedParams = {
      year: 2016,
      first: -1,
      offset: 0,
      '1_first': 3,
      '2_scale': 5,
      cypherParams: CYPHER_PARAMS
    };

  t.plan(4);
  return Promise.all([
    cypherTestRunner(
      t,
      graphQLQuery,
      graphqlParams,
      expectedCypherQuery,
      expectedParams
    ),
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      graphqlParams,
      expectedCypherQuery,
      expectedParams
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
    expectedCypherQuery = `MATCH (\`movie\`:\`Movie\`${ADDITIONAL_MOVIE_LABELS} {year:$year}) RETURN \`movie\` {_id: ID(\`movie\`), .title , .year ,genres: [(\`movie\`)-[:\`IN_GENRE\`]->(\`movie_genres\`:\`Genre\`) | \`movie_genres\` {_id: ID(\`movie_genres\`), .name }] } AS \`movie\``,
    expectedParams = {
      year: 2016,
      cypherParams: CYPHER_PARAMS,
      first: -1,
      offset: 0
    };

  t.plan(4);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, expectedParams),
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('Treat enum as a scalar', t => {
  const graphQLQuery = `
  {
    Books {
      genre
    }
  }`,
    expectedCypherQuery = `MATCH (\`book\`:\`Book\`) RETURN \`book\` { .genre } AS \`book\``,
    expectedParams = {
      cypherParams: CYPHER_PARAMS,
      first: -1,
      offset: 0
    };

  t.plan(4);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, expectedParams),
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('Handle fragment spread on object type', t => {
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
    expectedCypherQuery = `MATCH (\`movie\`:\`Movie\`${ADDITIONAL_MOVIE_LABELS} {title:$title}) RETURN \`movie\` { .title ,actors: [(\`movie\`)<-[:\`ACTED_IN\`]-(\`movie_actors\`:\`Actor\`) | \`movie_actors\` { .name }] , .year } AS \`movie\``,
    expectedParams = {
      cypherParams: CYPHER_PARAMS,
      title: 'River Runs Through It, A',
      first: -1,
      offset: 0
    };

  t.plan(4);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, expectedParams),
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('Handle inline fragment on object type', t => {
  const graphQLQuery = `query getMovie {
    Movie(title: "River Runs Through It, A") {
      ... on Movie {
        title
        actors {
          name
        }
      }
      year
    }
  }`,
    expectedCypherQuery = `MATCH (\`movie\`:\`Movie\`${ADDITIONAL_MOVIE_LABELS} {title:$title}) RETURN \`movie\` { .title ,actors: [(\`movie\`)<-[:\`ACTED_IN\`]-(\`movie_actors\`:\`Actor\`) | \`movie_actors\` { .name }] , .year } AS \`movie\``,
    expectedParams = {
      cypherParams: CYPHER_PARAMS,
      title: 'River Runs Through It, A',
      first: -1,
      offset: 0
    };

  t.plan(4);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, expectedParams),
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('Handle multiple query fragments on object type', t => {
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
    expectedCypherQuery = `MATCH (\`movie\`:\`Movie\`${ADDITIONAL_MOVIE_LABELS} {title:$title}) RETURN \`movie\` { .title ,actors: [(\`movie\`)<-[:\`ACTED_IN\`]-(\`movie_actors\`:\`Actor\`) | \`movie_actors\` { .name }] , .year } AS \`movie\``,
    expectedParams = {
      cypherParams: CYPHER_PARAMS,
      title: 'River Runs Through It, A',
      first: -1,
      offset: 0
    };

  t.plan(4);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, expectedParams),
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('query object type using inline fragment and fragment spread', t => {
  const graphQLQuery = `fragment myTitle on Movie {
    title
  }
  
  query getMovie {
    Movie(title: "River Runs Through It, A") {
      ...myTitle
      ... on Movie {
        actors {
          name
        }
      }
      year
    }
  }`,
    expectedCypherQuery = `MATCH (\`movie\`:\`Movie\`${ADDITIONAL_MOVIE_LABELS} {title:$title}) RETURN \`movie\` { .title ,actors: [(\`movie\`)<-[:\`ACTED_IN\`]-(\`movie_actors\`:\`Actor\`) | \`movie_actors\` { .name }] , .year } AS \`movie\``,
    expectedParams = {
      cypherParams: CYPHER_PARAMS,
      title: 'River Runs Through It, A',
      first: -1,
      offset: 0
    };

  t.plan(4);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, expectedParams),
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('nested fragments on object type', t => {
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
    expectedCypherQuery = `MATCH (\`movie\`:\`Movie\`${ADDITIONAL_MOVIE_LABELS} {year:$year}) RETURN \`movie\` { .title , .year } AS \`movie\``,
    expectedParams = {
      cypherParams: CYPHER_PARAMS,
      year: 2010,
      first: -1,
      offset: 0
    };

  t.plan(4);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, expectedParams),
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('fragments on object type relations', t => {
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
    expectedCypherQuery = `MATCH (\`movie\`:\`Movie\`${ADDITIONAL_MOVIE_LABELS} {year:$year}) RETURN \`movie\` { .title ,actors: [(\`movie\`)<-[:\`ACTED_IN\`]-(\`movie_actors\`:\`Actor\`) | \`movie_actors\` { .name }] } AS \`movie\``,
    expectedParams = {
      year: 2010,
      cypherParams: CYPHER_PARAMS,
      first: -1,
      offset: 0
    };

  t.plan(4);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, expectedParams),
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('nested fragments on object type relations', t => {
  const graphQLQuery = `
    query movieItems {
      Movie(year:2010) {
        ...Foo
      }
    }
    
    fragment Foo on Movie {
      title
      actors {
        userId
        ...Bar
      }
    }
    
    fragment Bar on Actor {
      name
    }`,
    expectedCypherQuery = `MATCH (\`movie\`:\`Movie\`${ADDITIONAL_MOVIE_LABELS} {year:$year}) RETURN \`movie\` { .title ,actors: [(\`movie\`)<-[:\`ACTED_IN\`]-(\`movie_actors\`:\`Actor\`) | \`movie_actors\` { .userId , .name }] } AS \`movie\``,
    expectedParams = {
      cypherParams: CYPHER_PARAMS,
      year: 2010,
      first: -1,
      offset: 0
    };

  t.plan(4);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, expectedParams),
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
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
  }`,
    expectedCypherQuery = `MATCH (\`movie\`:\`Movie\`${ADDITIONAL_MOVIE_LABELS} {year:$year}) WITH \`movie\` ORDER BY movie.title DESC RETURN \`movie\` { .title ,actors: [(\`movie\`)<-[:\`ACTED_IN\`]-(\`movie_actors\`:\`Actor\`) | \`movie_actors\` { .name }][..3] } AS \`movie\` LIMIT toInteger($first)`,
    expectedParams = {
      offset: 0,
      first: 10,
      year: 2010,
      '1_first': 3,
      cypherParams: CYPHER_PARAMS
    };

  t.plan(2);
  return augmentedSchemaCypherTestRunner(
    t,
    graphQLQuery,
    {},
    expectedCypherQuery,
    expectedParams
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
    expectedCypherQuery = `MATCH (\`movie\`:\`Movie\`${ADDITIONAL_MOVIE_LABELS} {title:$title}) RETURN \`movie\` { .title ,ratings: [(\`movie\`)<-[\`movie_ratings_relation\`:\`RATED\`]-(:\`User\`) | movie_ratings_relation { .rating ,User: head([(:\`Movie\`${ADDITIONAL_MOVIE_LABELS})<-[\`movie_ratings_relation\`]-(\`movie_ratings_User\`:\`User\`) | movie_ratings_User { .name }]) }] } AS \`movie\``,
    expectedParams = {
      cypherParams: CYPHER_PARAMS,
      title: 'River Runs Through It, A',
      first: -1,
      offset: 0
    };

  t.plan(2);
  return augmentedSchemaCypherTestRunner(
    t,
    graphQLQuery,
    {},
    expectedCypherQuery,
    expectedParams
  );
});

test('query relationship properties and order by unselected field', t => {
  const graphQLQuery = `query {
    Movie(title: "River Runs Through It, A") {
      title
      ratings(orderBy: [datetime_asc]) {
        rating
        User {
          userId
          name
        }
      }
    }
  }
  `,
    expectedCypherQuery = `MATCH (\`movie\`:\`Movie\`:\`u_user-id\`:\`newMovieLabel\` {title:$title}) RETURN \`movie\` { .title ,ratings: [sortedElement IN apoc.coll.sortMulti([(\`movie\`)<-[\`movie_ratings_relation\`:\`RATED\`]-(:\`User\`) | movie_ratings_relation { .rating ,User: head([(:\`Movie\`:\`u_user-id\`:\`newMovieLabel\`)<-[\`movie_ratings_relation\`]-(\`movie_ratings_User\`:\`User\`) | movie_ratings_User { .userId , .name }]) ,datetime: \`movie_ratings_relation\`.datetime}], ['^datetime']) | sortedElement { .* }] } AS \`movie\``,
    expectedParams = {
      offset: 0,
      first: -1,
      title: 'River Runs Through It, A',
      '1_orderBy': ['datetime_asc'],
      cypherParams: CYPHER_PARAMS
    };

  t.plan(2);
  return augmentedSchemaCypherTestRunner(
    t,
    graphQLQuery,
    {},
    expectedCypherQuery,
    expectedParams
  );
});

test('query relationship properties and order by internal ID', t => {
  const graphQLQuery = `query {
    Movie(title: "River Runs Through It, A") {
      movieId
      title
      ratings(orderBy: [_id_asc]) {
        rating
        _id
      }
    }
  }
  `,
    expectedCypherQuery = `MATCH (\`movie\`:\`Movie\`${ADDITIONAL_MOVIE_LABELS} {title:$title}) RETURN \`movie\` { .movieId , .title ,ratings: apoc.coll.sortMulti([(\`movie\`)<-[\`movie_ratings_relation\`:\`RATED\`]-(:\`User\`) | movie_ratings_relation { .rating ,_id: ID(\`movie_ratings_relation\`)}], ['^_id']) } AS \`movie\``,
    expectedParams = {
      offset: 0,
      first: -1,
      title: 'River Runs Through It, A',
      '1_orderBy': ['_id_asc'],
      cypherParams: CYPHER_PARAMS
    };

  t.plan(2);
  return augmentedSchemaCypherTestRunner(
    t,
    graphQLQuery,
    {},
    expectedCypherQuery,
    expectedParams
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
    expectedCypherQuery = `MATCH (\`movie\`:\`Movie\`${ADDITIONAL_MOVIE_LABELS}) RETURN \`movie\` { .movieId , .title ,ratings: [(\`movie\`)<-[\`movie_ratings_relation\`:\`RATED\`]-(:\`User\`) | movie_ratings_relation { .rating ,User: head([(:\`Movie\`${ADDITIONAL_MOVIE_LABELS})<-[\`movie_ratings_relation\`]-(\`movie_ratings_User\`:\`User\`) | movie_ratings_User { .userId , .name ,friends: {from: [(\`movie_ratings_User\`)<-[\`movie_ratings_User_from_relation\`:\`FRIEND_OF\`]-(\`movie_ratings_User_from\`:\`User\`) | movie_ratings_User_from_relation { .since ,User: movie_ratings_User_from { .name ,friends: {from: [(\`movie_ratings_User_from\`)<-[\`movie_ratings_User_from_from_relation\`:\`FRIEND_OF\`]-(\`movie_ratings_User_from_from\`:\`User\`) | movie_ratings_User_from_from_relation { .since ,User: movie_ratings_User_from_from { .name } }] ,to: [(\`movie_ratings_User_from\`)-[\`movie_ratings_User_from_to_relation\`:\`FRIEND_OF\`]->(\`movie_ratings_User_from_to\`:\`User\`) | movie_ratings_User_from_to_relation { .since ,User: movie_ratings_User_from_to { .name } }] } } }] ,to: [(\`movie_ratings_User\`)-[\`movie_ratings_User_to_relation\`:\`FRIEND_OF\`]->(\`movie_ratings_User_to\`:\`User\`) | movie_ratings_User_to_relation { .since ,User: movie_ratings_User_to { .name ,friends: {from: [(\`movie_ratings_User_to\`)<-[\`movie_ratings_User_to_from_relation\`:\`FRIEND_OF\`]-(\`movie_ratings_User_to_from\`:\`User\`) | movie_ratings_User_to_from_relation { .since ,User: movie_ratings_User_to_from { .name } }] ,to: [(\`movie_ratings_User_to\`)-[\`movie_ratings_User_to_to_relation\`:\`FRIEND_OF\`]->(\`movie_ratings_User_to_to\`:\`User\`) | movie_ratings_User_to_to_relation { .since ,User: movie_ratings_User_to_to { .name } }] } } }] } }]) }] } AS \`movie\``,
    expectedParams = {
      offset: 0,
      first: -1,
      cypherParams: CYPHER_PARAMS
    };

  t.plan(2);
  return augmentedSchemaCypherTestRunner(
    t,
    graphQLQuery,
    {},
    expectedCypherQuery,
    expectedParams
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
    expectedCypherQuery = `MATCH (\`user\`:\`User\`) RETURN \`user\` {_id: ID(\`user\`), .name ,friends: {from: [(\`user\`)<-[\`user_from_relation\`:\`FRIEND_OF\`]-(\`user_from\`:\`User\`) | user_from_relation { .since ,User: user_from {_id: ID(\`user_from\`), .name ,rated: [(\`user_from\`)-[\`user_from_rated_relation\`:\`RATED\`]->(:\`Movie\`${ADDITIONAL_MOVIE_LABELS}) | user_from_rated_relation { .rating ,Movie: head([(:\`User\`)-[\`user_from_rated_relation\`]->(\`user_from_rated_Movie\`:\`Movie\`${ADDITIONAL_MOVIE_LABELS}) | user_from_rated_Movie {_id: ID(\`user_from_rated_Movie\`),ratings: [(\`user_from_rated_Movie\`)<-[\`user_from_rated_Movie_ratings_relation\`:\`RATED\`]-(:\`User\`) | user_from_rated_Movie_ratings_relation { .rating ,User: head([(:\`Movie\`${ADDITIONAL_MOVIE_LABELS})<-[\`user_from_rated_Movie_ratings_relation\`]-(\`user_from_rated_Movie_ratings_User\`:\`User\`) | user_from_rated_Movie_ratings_User {_id: ID(\`user_from_rated_Movie_ratings_User\`),friends: {from: [(\`user_from_rated_Movie_ratings_User\`)<-[\`user_from_rated_Movie_ratings_User_from_relation\`:\`FRIEND_OF\`]-(\`user_from_rated_Movie_ratings_User_from\`:\`User\`) | user_from_rated_Movie_ratings_User_from_relation { .since ,User: user_from_rated_Movie_ratings_User_from {_id: ID(\`user_from_rated_Movie_ratings_User_from\`)} }] ,to: [(\`user_from_rated_Movie_ratings_User\`)-[\`user_from_rated_Movie_ratings_User_to_relation\`:\`FRIEND_OF\`]->(\`user_from_rated_Movie_ratings_User_to\`:\`User\`) | user_from_rated_Movie_ratings_User_to_relation { .since ,User: user_from_rated_Movie_ratings_User_to {_id: ID(\`user_from_rated_Movie_ratings_User_to\`)} }] } }]) }] }]) }] } }] ,to: [(\`user\`)-[\`user_to_relation\`:\`FRIEND_OF\`]->(\`user_to\`:\`User\`) | user_to_relation { .since ,User: user_to {_id: ID(\`user_to\`), .name ,rated: [(\`user_to\`)-[\`user_to_rated_relation\`:\`RATED\`]->(:\`Movie\`${ADDITIONAL_MOVIE_LABELS}) | user_to_rated_relation { .rating ,Movie: head([(:\`User\`)-[\`user_to_rated_relation\`]->(\`user_to_rated_Movie\`:\`Movie\`${ADDITIONAL_MOVIE_LABELS}) | user_to_rated_Movie {_id: ID(\`user_to_rated_Movie\`)}]) }] } }] } } AS \`user\``,
    expectedParams = {
      offset: 0,
      first: -1,
      cypherParams: CYPHER_PARAMS
    };

  t.plan(2);
  return augmentedSchemaCypherTestRunner(
    t,
    graphQLQuery,
    {},
    expectedCypherQuery,
    expectedParams
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
    expectedCypherQuery = `MATCH (\`user\`:\`User\`) RETURN \`user\` {_id: ID(\`user\`), .name ,rated: [(\`user\`)-[\`user_rated_relation\`:\`RATED\`{rating:$1_rating}]->(:\`Movie\`${ADDITIONAL_MOVIE_LABELS}) | user_rated_relation { .rating ,Movie: head([(:\`User\`)-[\`user_rated_relation\`]->(\`user_rated_Movie\`:\`Movie\`${ADDITIONAL_MOVIE_LABELS}) | user_rated_Movie { .title }]) }] } AS \`user\``,
    expectedParams = {
      offset: 0,
      first: -1,
      '1_rating': 5,
      cypherParams: CYPHER_PARAMS
    };

  t.plan(2);
  return augmentedSchemaCypherTestRunner(
    t,
    graphQLQuery,
    {},
    expectedCypherQuery,
    expectedParams
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
    expectedCypherQuery = `MATCH (\`user\`:\`User\`) RETURN \`user\` { .userId , .name ,friends: {from: [(\`user\`)<-[\`user_from_relation\`:\`FRIEND_OF\`{since:$1_since}]-(\`user_from\`:\`User\`) | user_from_relation { .since ,User: user_from { .name } }] ,to: [(\`user\`)-[\`user_to_relation\`:\`FRIEND_OF\`{since:$3_since}]->(\`user_to\`:\`User\`) | user_to_relation { .since ,User: user_to { .name } }] } } AS \`user\``,
    expectedParams = {
      offset: 0,
      first: -1,
      cypherParams: CYPHER_PARAMS,
      '1_since': 3,
      '3_since': 5
    };

  t.plan(2);
  return augmentedSchemaCypherTestRunner(
    t,
    graphQLQuery,
    {},
    expectedCypherQuery,
    expectedParams
  );
});

test('query using inline fragment on object type - including cypherParams', t => {
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
            currentUserId
          }
        }
      }
    }
  }
  `,
    expectedCypherQuery = `MATCH (\`movie\`:\`Movie\`${ADDITIONAL_MOVIE_LABELS} {title:$title}) RETURN \`movie\` { .title ,ratings: [(\`movie\`)<-[\`movie_ratings_relation\`:\`RATED\`]-(:\`User\`) | movie_ratings_relation { .rating ,User: head([(:\`Movie\`${ADDITIONAL_MOVIE_LABELS})<-[\`movie_ratings_relation\`]-(\`movie_ratings_User\`:\`User\`) | movie_ratings_User { .name , .userId ,currentUserId: apoc.cypher.runFirstColumn("RETURN $cypherParams.currentUserId AS cypherParamsUserId", {this: movie_ratings_User, cypherParams: $cypherParams, strArg: "Neo4j"}, false)}]) }] } AS \`movie\``,
    expectedParams = {
      offset: 0,
      first: -1,
      title: 'River Runs Through It, A',
      cypherParams: CYPHER_PARAMS
    };

  t.plan(2);
  return augmentedSchemaCypherTestRunner(
    t,
    graphQLQuery,
    {},
    expectedCypherQuery,
    expectedParams
  );
});

test('query interfaced relation using inline fragment and pagination', t => {
  const graphQLQuery = `query {
    Actor {
      name
      knows(first: 0, offset: 1) {
        ...userFavorites
      }
    }
  }
  
  fragment userFavorites on User {
    name
    favorites {
      movieId
      title
      year
    }
  }`,
    expectedCypherQuery = `MATCH (\`actor\`:\`Actor\`) RETURN \`actor\` { .name ,knows: [(\`actor\`)-[:\`KNOWS\`]->(\`actor_knows\`:\`Person\`) WHERE ("User" IN labels(\`actor_knows\`)) | head([\`actor_knows\` IN [\`actor_knows\`] WHERE "User" IN labels(\`actor_knows\`) | \`actor_knows\` { FRAGMENT_TYPE: "User",  .name ,favorites: [(\`actor_knows\`)-[:\`FAVORITED\`]->(\`actor_knows_favorites\`:\`Movie\`:\`u_user-id\`:\`newMovieLabel\`) | \`actor_knows_favorites\` { .movieId , .title , .year }]  }])][1..1] } AS \`actor\``,
    expectedParams = {
      offset: 0,
      first: -1,
      '1_first': 0,
      '1_offset': 1,
      cypherParams: CYPHER_PARAMS
    };

  t.plan(2);
  return augmentedSchemaCypherTestRunner(
    t,
    graphQLQuery,
    {},
    expectedCypherQuery,
    expectedParams
  );
});

test('order interfaced relation using inline fragment', t => {
  const graphQLQuery = `query {
    Actor {
      name
      knows(orderBy: userId_asc) {
        name
        ... on User {
          userId
          favorites {
            movieId
            title
            year
          }          
        }
      }
    }
  }
`,
    expectedCypherQuery = `MATCH (\`actor\`:\`Actor\`) RETURN \`actor\` { .name ,knows: apoc.coll.sortMulti([(\`actor\`)-[:\`KNOWS\`]->(\`actor_knows\`:\`Person\`) WHERE ("Actor" IN labels(\`actor_knows\`) OR "CameraMan" IN labels(\`actor_knows\`) OR "User" IN labels(\`actor_knows\`)) | head([\`actor_knows\` IN [\`actor_knows\`] WHERE "Actor" IN labels(\`actor_knows\`) | \`actor_knows\` { FRAGMENT_TYPE: "Actor",  .name , .userId  }] + [\`actor_knows\` IN [\`actor_knows\`] WHERE "CameraMan" IN labels(\`actor_knows\`) | \`actor_knows\` { FRAGMENT_TYPE: "CameraMan",  .name , .userId  }] + [\`actor_knows\` IN [\`actor_knows\`] WHERE "User" IN labels(\`actor_knows\`) | \`actor_knows\` { FRAGMENT_TYPE: "User",  .userId ,favorites: [(\`actor_knows\`)-[:\`FAVORITED\`]->(\`actor_knows_favorites\`:\`Movie\`:\`u_user-id\`:\`newMovieLabel\`) | \`actor_knows_favorites\` { .movieId , .title , .year }] , .name  }])], ['^userId']) } AS \`actor\``,
    expectedParams = {
      offset: 0,
      first: -1,
      '1_orderBy': 'userId_asc',
      cypherParams: CYPHER_PARAMS
    };

  t.plan(2);
  return augmentedSchemaCypherTestRunner(
    t,
    graphQLQuery,
    {},
    expectedCypherQuery,
    expectedParams
  );
});

test('query interfaced relationship type using inline fragment and pagination', t => {
  const graphQLQuery = `query {
    Person {
      name
      ... on Actor {
        userId
        interfacedRelationshipType(first: 0, offset: 1) {
          string
          Genre {
            name
          }
          __typename
        }
      }
      __typename
    }
  }
  `,
    expectedCypherQuery = `MATCH (\`person\`:\`Person\`) WHERE ("Actor" IN labels(\`person\`) OR "CameraMan" IN labels(\`person\`) OR "User" IN labels(\`person\`)) RETURN head([\`person\` IN [\`person\`] WHERE "Actor" IN labels(\`person\`) | \`person\` { FRAGMENT_TYPE: "Actor",  .userId ,interfacedRelationshipType: [(\`person\`)-[\`person_interfacedRelationshipType_relation\`:\`INTERFACED_RELATIONSHIP_TYPE\`]->(:\`Genre\`) | person_interfacedRelationshipType_relation { .string ,Genre: head([(:\`Person\`)-[\`person_interfacedRelationshipType_relation\`]->(\`person_interfacedRelationshipType_Genre\`:\`Genre\`) | person_interfacedRelationshipType_Genre { .name }]) }][1..1] , .name  }] + [\`person\` IN [\`person\`] WHERE "CameraMan" IN labels(\`person\`) | \`person\` { FRAGMENT_TYPE: "CameraMan",  .name  }] + [\`person\` IN [\`person\`] WHERE "User" IN labels(\`person\`) | \`person\` { FRAGMENT_TYPE: "User",  .name  }]) AS \`person\``,
    expectedParams = {
      offset: 0,
      first: -1,
      '1_first': 0,
      '1_offset': 1,
      cypherParams: CYPHER_PARAMS
    };

  t.plan(2);
  return augmentedSchemaCypherTestRunner(
    t,
    graphQLQuery,
    {},
    expectedCypherQuery,
    expectedParams
  );
});

test('order interfaced relationship type using inline fragment', t => {
  const graphQLQuery = `query {
    Person {
      name
      ... on Actor {
        userId
        interfacedRelationshipType(orderBy: [string_desc]) {
          string
          Genre {
            name
          }
          __typename
        }
      }
      __typename
    }
  }
  `,
    expectedCypherQuery = `MATCH (\`person\`:\`Person\`) WHERE ("Actor" IN labels(\`person\`) OR "CameraMan" IN labels(\`person\`) OR "User" IN labels(\`person\`)) RETURN head([\`person\` IN [\`person\`] WHERE "Actor" IN labels(\`person\`) | \`person\` { FRAGMENT_TYPE: "Actor",  .userId ,interfacedRelationshipType: apoc.coll.sortMulti([(\`person\`)-[\`person_interfacedRelationshipType_relation\`:\`INTERFACED_RELATIONSHIP_TYPE\`]->(:\`Genre\`) | person_interfacedRelationshipType_relation { .string ,Genre: head([(:\`Person\`)-[\`person_interfacedRelationshipType_relation\`]->(\`person_interfacedRelationshipType_Genre\`:\`Genre\`) | person_interfacedRelationshipType_Genre { .name }]) }], ['string']) , .name  }] + [\`person\` IN [\`person\`] WHERE "CameraMan" IN labels(\`person\`) | \`person\` { FRAGMENT_TYPE: "CameraMan",  .name  }] + [\`person\` IN [\`person\`] WHERE "User" IN labels(\`person\`) | \`person\` { FRAGMENT_TYPE: "User",  .name  }]) AS \`person\``,
    expectedParams = {
      offset: 0,
      first: -1,
      '1_orderBy': ['string_desc'],
      cypherParams: CYPHER_PARAMS
    };

  t.plan(2);
  return augmentedSchemaCypherTestRunner(
    t,
    graphQLQuery,
    {},
    expectedCypherQuery,
    expectedParams
  );
});

test('query interfaced relationship type field for outgoing object type nodes', t => {
  const graphQLQuery = `query {
    Person {
      userId
      name
      interfacedRelationshipType {
        string
        Genre {
          name
        }
      }
    }
  }`,
    expectedCypherQuery = `MATCH (\`person\`:\`Person\`) RETURN \`person\` {FRAGMENT_TYPE: head( [ label IN labels(\`person\`) WHERE label IN $Person_derivedTypes ] ), .userId , .name ,interfacedRelationshipType: [(\`person\`)-[\`person_interfacedRelationshipType_relation\`:\`INTERFACED_RELATIONSHIP_TYPE\`]->(:\`Genre\`) | person_interfacedRelationshipType_relation { .string ,Genre: head([(:\`Person\`)-[\`person_interfacedRelationshipType_relation\`]->(\`person_interfacedRelationshipType_Genre\`:\`Genre\`) | person_interfacedRelationshipType_Genre { .name }]) }] } AS \`person\``,
    expectedParams = {
      offset: 0,
      first: -1,
      cypherParams: CYPHER_PARAMS,
      Person_derivedTypes: ['Actor', 'CameraMan', 'User']
    };

  t.plan(2);
  return augmentedSchemaCypherTestRunner(
    t,
    graphQLQuery,
    {},
    expectedCypherQuery,
    expectedParams
  );
});

test('order interfaced relationship type field for outgoing object type nodes', t => {
  const graphQLQuery = `query {
    Person {
      userId
      name
      interfacedRelationshipType(orderBy: [string_asc]) {
        string
        Genre {
          name
        }
      }
    }
  }`,
    expectedCypherQuery = `MATCH (\`person\`:\`Person\`) RETURN \`person\` {FRAGMENT_TYPE: head( [ label IN labels(\`person\`) WHERE label IN $Person_derivedTypes ] ), .userId , .name ,interfacedRelationshipType: apoc.coll.sortMulti([(\`person\`)-[\`person_interfacedRelationshipType_relation\`:\`INTERFACED_RELATIONSHIP_TYPE\`]->(:\`Genre\`) | person_interfacedRelationshipType_relation { .string ,Genre: head([(:\`Person\`)-[\`person_interfacedRelationshipType_relation\`]->(\`person_interfacedRelationshipType_Genre\`:\`Genre\`) | person_interfacedRelationshipType_Genre { .name }]) }], ['^string']) } AS \`person\``,
    expectedParams = {
      offset: 0,
      first: -1,
      '1_orderBy': ['string_asc'],
      cypherParams: CYPHER_PARAMS,
      Person_derivedTypes: ['Actor', 'CameraMan', 'User']
    };

  t.plan(2);
  return augmentedSchemaCypherTestRunner(
    t,
    graphQLQuery,
    {},
    expectedCypherQuery,
    expectedParams
  );
});

test('fliter interfaced relationship type field for outgoing object type nodes', t => {
  const graphQLQuery = `query {
    Person(filter: {
      interfacedRelationshipType: {
        Genre: {
          name: "Action"
        }
      }
    }) {
      userId
      name
      interfacedRelationshipType(filter: {
        string: "data"
      }) {
        string
        Genre {
          name        
        }
      }
    }
  }`,
    expectedCypherQuery = `MATCH (\`person\`:\`Person\`) WHERE (EXISTS((\`person\`)-[:INTERFACED_RELATIONSHIP_TYPE]->(:Genre)) AND ALL(\`person_filter_genre\` IN [(\`person\`)-[\`_person_filter_genre\`:INTERFACED_RELATIONSHIP_TYPE]->(:Genre) | \`_person_filter_genre\`] WHERE (ALL(\`genre\` IN [(\`person\`)-[\`person_filter_genre\`]->(\`_genre\`:Genre) | \`_genre\`] WHERE (\`genre\`.name = $filter.interfacedRelationshipType.Genre.name))))) RETURN \`person\` {FRAGMENT_TYPE: head( [ label IN labels(\`person\`) WHERE label IN $Person_derivedTypes ] ), .userId , .name ,interfacedRelationshipType: [(\`person\`)-[\`person_interfacedRelationshipType_relation\`:\`INTERFACED_RELATIONSHIP_TYPE\`]->(:\`Genre\`) WHERE (\`person_interfacedRelationshipType_relation\`.string = $1_filter.string) | person_interfacedRelationshipType_relation { .string ,Genre: head([(:\`Person\`)-[\`person_interfacedRelationshipType_relation\`]->(\`person_interfacedRelationshipType_Genre\`:\`Genre\`) | person_interfacedRelationshipType_Genre { .name }]) }] } AS \`person\``,
    expectedParams = {
      offset: 0,
      first: -1,
      filter: {
        interfacedRelationshipType: {
          Genre: {
            name: 'Action'
          }
        }
      },
      '1_filter': {
        string: 'data'
      },
      cypherParams: CYPHER_PARAMS,
      Person_derivedTypes: ['Actor', 'CameraMan', 'User']
    };

  t.plan(2);
  return augmentedSchemaCypherTestRunner(
    t,
    graphQLQuery,
    {},
    expectedCypherQuery,
    expectedParams
  );
});

test('query interfaced relationship type field for incoming interface type nodes', t => {
  const graphQLQuery = `query {
    Genre {
      name
      interfacedRelationshipType {
        string
        Person {
          userId
          name
        }
      }
    }
  }`,
    expectedCypherQuery = `MATCH (\`genre\`:\`Genre\`) RETURN \`genre\` { .name ,interfacedRelationshipType: [(\`genre\`)<-[\`genre_interfacedRelationshipType_relation\`:\`INTERFACED_RELATIONSHIP_TYPE\`]-(:\`Person\`) | genre_interfacedRelationshipType_relation { .string ,Person: head([(:\`Genre\`)<-[\`genre_interfacedRelationshipType_relation\`]-(\`genre_interfacedRelationshipType_Person\`:\`Person\`) | genre_interfacedRelationshipType_Person {FRAGMENT_TYPE: head( [ label IN labels(genre_interfacedRelationshipType_Person) WHERE label IN $Person_derivedTypes ] ), .userId , .name }]) }] } AS \`genre\``,
    expectedParams = {
      offset: 0,
      first: -1,
      Person_derivedTypes: ['Actor', 'CameraMan', 'User'],
      cypherParams: CYPHER_PARAMS
    };

  t.plan(2);
  return augmentedSchemaCypherTestRunner(
    t,
    graphQLQuery,
    {},
    expectedCypherQuery,
    expectedParams
  );
});

test('order interfaced relationship type field for incoming interface type nodes', t => {
  const graphQLQuery = `query {
    Genre {
      name
      interfacedRelationshipType(orderBy: string_desc) {
        string
        Person {
          userId
          name
        }
      }
    }
  }`,
    expectedCypherQuery = `MATCH (\`genre\`:\`Genre\`) RETURN \`genre\` { .name ,interfacedRelationshipType: apoc.coll.sortMulti([(\`genre\`)<-[\`genre_interfacedRelationshipType_relation\`:\`INTERFACED_RELATIONSHIP_TYPE\`]-(:\`Person\`) | genre_interfacedRelationshipType_relation { .string ,Person: head([(:\`Genre\`)<-[\`genre_interfacedRelationshipType_relation\`]-(\`genre_interfacedRelationshipType_Person\`:\`Person\`) | genre_interfacedRelationshipType_Person {FRAGMENT_TYPE: head( [ label IN labels(genre_interfacedRelationshipType_Person) WHERE label IN $Person_derivedTypes ] ), .userId , .name }]) }], ['string']) } AS \`genre\``,
    expectedParams = {
      offset: 0,
      first: -1,
      '1_orderBy': 'string_desc',
      Person_derivedTypes: ['Actor', 'CameraMan', 'User'],
      cypherParams: CYPHER_PARAMS
    };

  t.plan(2);
  return augmentedSchemaCypherTestRunner(
    t,
    graphQLQuery,
    {},
    expectedCypherQuery,
    expectedParams
  );
});

test('fliter interfaced relationship type field for incoming interface type nodes', t => {
  const graphQLQuery = `query {
    Genre(filter: {
      interfacedRelationshipType: {
        Person: {
          userId: "45add9f4-e6c7-4ded-b951-59e3947240fe"
        }
      }
    }) {
      name
      interfacedRelationshipType(filter: {
        string: "data",
        Person: {
          name_in: ["Michael"]
        }
      }) {
        string
        Person {
          userId
          name
        }
      }
    }
  }`,
    expectedCypherQuery = `MATCH (\`genre\`:\`Genre\`) WHERE (EXISTS((\`genre\`)<-[:INTERFACED_RELATIONSHIP_TYPE]-(:Person)) AND ALL(\`genre_filter_person\` IN [(\`genre\`)<-[\`_genre_filter_person\`:INTERFACED_RELATIONSHIP_TYPE]-(:Person) | \`_genre_filter_person\`] WHERE (ALL(\`person\` IN [(\`genre\`)<-[\`genre_filter_person\`]-(\`_person\`:Person) | \`_person\`] WHERE (\`person\`.userId = $filter.interfacedRelationshipType.Person.userId))))) RETURN \`genre\` { .name ,interfacedRelationshipType: [(\`genre\`)<-[\`genre_interfacedRelationshipType_relation\`:\`INTERFACED_RELATIONSHIP_TYPE\`]-(:\`Person\`) WHERE (\`genre_interfacedRelationshipType_relation\`.string = $1_filter.string) AND (ALL(\`genre_filter_person\` IN [(\`genre\`)<-[\`genre_interfacedRelationshipType_relation\`]-(\`_person\`:Person) | \`_person\`] WHERE (\`genre_filter_person\`.name IN $1_filter.Person.name_in))) | genre_interfacedRelationshipType_relation { .string ,Person: head([(:\`Genre\`)<-[\`genre_interfacedRelationshipType_relation\`]-(\`genre_interfacedRelationshipType_Person\`:\`Person\`) | genre_interfacedRelationshipType_Person {FRAGMENT_TYPE: head( [ label IN labels(genre_interfacedRelationshipType_Person) WHERE label IN $Person_derivedTypes ] ), .userId , .name }]) }] } AS \`genre\``,
    expectedParams = {
      offset: 0,
      first: -1,
      filter: {
        interfacedRelationshipType: {
          Person: {
            userId: '45add9f4-e6c7-4ded-b951-59e3947240fe'
          }
        }
      },
      '1_filter': {
        string: 'data',
        Person: {
          name_in: ['Michael']
        }
      },
      Person_derivedTypes: ['Actor', 'CameraMan', 'User'],
      cypherParams: CYPHER_PARAMS
    };

  t.plan(2);
  return augmentedSchemaCypherTestRunner(
    t,
    graphQLQuery,
    {},
    expectedCypherQuery,
    expectedParams
  );
});

test('query incoming interface type nodes using fragments in relationship type field', t => {
  const graphQLQuery = `query {
    Genre {
      name
      interfacedRelationshipType {
        string          
        Person {
          ... on User {
            name
          }
          ...UserFragment
          __typename
        }
      }
    }
  }

  fragment UserFragment on User {
    userId
  }`,
    expectedCypherQuery = `MATCH (\`genre\`:\`Genre\`) RETURN \`genre\` { .name ,interfacedRelationshipType: [(\`genre\`)<-[\`genre_interfacedRelationshipType_relation\`:\`INTERFACED_RELATIONSHIP_TYPE\`]-(:\`Person\`) | genre_interfacedRelationshipType_relation { .string ,Person: head([(:\`Genre\`)<-[\`genre_interfacedRelationshipType_relation\`]-(\`genre_interfacedRelationshipType_Person\`:\`Person\`) WHERE ("User" IN labels(genre_interfacedRelationshipType_Person)) | head([\`genre_interfacedRelationshipType_Person\` IN [\`genre_interfacedRelationshipType_Person\`] WHERE "User" IN labels(\`genre_interfacedRelationshipType_Person\`) | \`genre_interfacedRelationshipType_Person\` { FRAGMENT_TYPE: "User",  .name , .userId  }])]) }] } AS \`genre\``,
    expectedParams = {
      offset: 0,
      first: -1,
      cypherParams: CYPHER_PARAMS
    };

  t.plan(2);
  return augmentedSchemaCypherTestRunner(
    t,
    graphQLQuery,
    {},
    expectedCypherQuery,
    expectedParams
  );
});

test('order incoming interface type nodes using fragments in relationship type field', t => {
  const graphQLQuery = `query {
    Genre {
      name
      interfacedRelationshipType(orderBy: string_asc) {
        string          
        Person {
          ... on User {
            name
          }
          ...UserFragment
          __typename
        }
      }
    }
  }

  fragment UserFragment on User {
    userId
  }`,
    expectedCypherQuery = `MATCH (\`genre\`:\`Genre\`) RETURN \`genre\` { .name ,interfacedRelationshipType: apoc.coll.sortMulti([(\`genre\`)<-[\`genre_interfacedRelationshipType_relation\`:\`INTERFACED_RELATIONSHIP_TYPE\`]-(:\`Person\`) | genre_interfacedRelationshipType_relation { .string ,Person: head([(:\`Genre\`)<-[\`genre_interfacedRelationshipType_relation\`]-(\`genre_interfacedRelationshipType_Person\`:\`Person\`) WHERE ("User" IN labels(genre_interfacedRelationshipType_Person)) | head([\`genre_interfacedRelationshipType_Person\` IN [\`genre_interfacedRelationshipType_Person\`] WHERE "User" IN labels(\`genre_interfacedRelationshipType_Person\`) | \`genre_interfacedRelationshipType_Person\` { FRAGMENT_TYPE: "User",  .name , .userId  }])]) }], ['^string']) } AS \`genre\``,
    expectedParams = {
      offset: 0,
      first: -1,
      '1_orderBy': 'string_asc',
      cypherParams: CYPHER_PARAMS
    };

  t.plan(2);
  return augmentedSchemaCypherTestRunner(
    t,
    graphQLQuery,
    {},
    expectedCypherQuery,
    expectedParams
  );
});

test('filter incoming interface type nodes using only fragments in relationship type field', t => {
  const graphQLQuery = `query {
    Genre {
      name
      interfacedRelationshipType(filter: { Person: { name_not_in: ["John"] } }) {
        string
        Person {
          ... on User {
            userId
          }
        }
      }
      __typename
    }
  }
  `,
    expectedCypherQuery = `MATCH (\`genre\`:\`Genre\`) RETURN \`genre\` { .name ,interfacedRelationshipType: [(\`genre\`)<-[\`genre_interfacedRelationshipType_relation\`:\`INTERFACED_RELATIONSHIP_TYPE\`]-(:\`Person\`) WHERE (ALL(\`genre_filter_person\` IN [(\`genre\`)<-[\`genre_interfacedRelationshipType_relation\`]-(\`_person\`:Person) | \`_person\`] WHERE (NOT \`genre_filter_person\`.name IN $1_filter.Person.name_not_in))) | genre_interfacedRelationshipType_relation { .string ,Person: head([(:\`Genre\`)<-[\`genre_interfacedRelationshipType_relation\`]-(\`genre_interfacedRelationshipType_Person\`:\`Person\`) WHERE ("User" IN labels(genre_interfacedRelationshipType_Person)) | head([\`genre_interfacedRelationshipType_Person\` IN [\`genre_interfacedRelationshipType_Person\`] WHERE "User" IN labels(\`genre_interfacedRelationshipType_Person\`) | \`genre_interfacedRelationshipType_Person\` { FRAGMENT_TYPE: "User",  .userId  }])]) }] } AS \`genre\``,
    expectedParams = {
      offset: 0,
      first: -1,
      '1_filter': {
        Person: {
          name_not_in: ['John']
        }
      },
      cypherParams: CYPHER_PARAMS
    };

  t.plan(2);
  return augmentedSchemaCypherTestRunner(
    t,
    graphQLQuery,
    {},
    expectedCypherQuery,
    expectedParams
  );
});

test('query reflexive interfaced relationship type field using fragments', t => {
  const graphQLQuery = `query {
    Person {
      userId
      name
      reflexiveInterfacedRelationshipType {
        from {
          boolean
          Person {
            ...UserFragment
            __typename
          }
        }
        to {
          boolean
          Person {
            userId
            ... on Actor {
              name
            }
            __typename
          }
        }      
      }
    }
  }	
  
  fragment UserFragment on User {
    name
    userId
  }`,
    expectedCypherQuery = `MATCH (\`person\`:\`Person\`) RETURN \`person\` {FRAGMENT_TYPE: head( [ label IN labels(\`person\`) WHERE label IN $Person_derivedTypes ] ), .userId , .name ,reflexiveInterfacedRelationshipType: {from: [(\`person\`)<-[\`person_from_relation\`:\`REFLEXIVE_INTERFACED_RELATIONSHIP_TYPE\`]-(\`person_from\`:\`Person\`) | person_from_relation { .boolean ,Person: head([\`person_from\` IN [\`person_from\`] WHERE "User" IN labels(\`person_from\`) | \`person_from\` { FRAGMENT_TYPE: "User",  .name , .userId  }]) }] ,to: [(\`person\`)-[\`person_to_relation\`:\`REFLEXIVE_INTERFACED_RELATIONSHIP_TYPE\`]->(\`person_to\`:\`Person\`) | person_to_relation { .boolean ,Person: head([\`person_to\` IN [\`person_to\`] WHERE "Actor" IN labels(\`person_to\`) | \`person_to\` { FRAGMENT_TYPE: "Actor",  .name , .userId  }] + [\`person_to\` IN [\`person_to\`] WHERE "CameraMan" IN labels(\`person_to\`) | \`person_to\` { FRAGMENT_TYPE: "CameraMan",  .userId  }] + [\`person_to\` IN [\`person_to\`] WHERE "User" IN labels(\`person_to\`) | \`person_to\` { FRAGMENT_TYPE: "User",  .userId  }]) }] } } AS \`person\``,
    expectedParams = {
      offset: 0,
      first: -1,
      cypherParams: CYPHER_PARAMS,
      Person_derivedTypes: ['Actor', 'CameraMan', 'User']
    };

  t.plan(2);
  return augmentedSchemaCypherTestRunner(
    t,
    graphQLQuery,
    {},
    expectedCypherQuery,
    expectedParams
  );
});

test('order incoming and outgoing nodes of reflexive interfaced relationship type field', t => {
  const graphQLQuery = `query {
    Person {
      userId
      name
      reflexiveInterfacedRelationshipType {
        from(orderBy: boolean_desc) {
          boolean
        }
        to(orderBy: boolean_asc) {
          boolean
        }
      }
    }
  }
  `,
    expectedCypherQuery = `MATCH (\`person\`:\`Person\`) RETURN \`person\` {FRAGMENT_TYPE: head( [ label IN labels(\`person\`) WHERE label IN $Person_derivedTypes ] ), .userId , .name ,reflexiveInterfacedRelationshipType: {from: apoc.coll.sortMulti([(\`person\`)<-[\`person_from_relation\`:\`REFLEXIVE_INTERFACED_RELATIONSHIP_TYPE\`]-(\`person_from\`:\`Person\`) | person_from_relation { .boolean }], ['boolean']) ,to: apoc.coll.sortMulti([(\`person\`)-[\`person_to_relation\`:\`REFLEXIVE_INTERFACED_RELATIONSHIP_TYPE\`]->(\`person_to\`:\`Person\`) | person_to_relation { .boolean }], ['^boolean']) } } AS \`person\``,
    expectedParams = {
      offset: 0,
      first: -1,
      '1_orderBy': 'boolean_desc',
      '3_orderBy': 'boolean_asc',
      cypherParams: CYPHER_PARAMS,
      Person_derivedTypes: ['Actor', 'CameraMan', 'User']
    };

  t.plan(2);
  return augmentedSchemaCypherTestRunner(
    t,
    graphQLQuery,
    {},
    expectedCypherQuery,
    expectedParams
  );
});

test('filter reflexive interfaced relationship type field', t => {
  const graphQLQuery = `query {
    Person(filter: {
      name_in: ["Michael"]
      reflexiveInterfacedRelationshipType: {
        to: {
          Person: {
            name_in: ["John"]
          }
        }
      }
    }) {
      userId
      name
      reflexiveInterfacedRelationshipType {
        to(first: 1, offset: 0, filter: {
          boolean: true
        }) {
          boolean
          Person {
            userId
            name          
            interfacedRelationshipType(first: 1) {
              string
              Genre {
                name
              }
              __typename
            }
            __typename
          }
        }
      }
    }
  }`,
    expectedCypherQuery = `MATCH (\`person\`:\`Person\`) WHERE (\`person\`.name IN $filter.name_in) AND ((EXISTS((\`person\`)-[:REFLEXIVE_INTERFACED_RELATIONSHIP_TYPE]->(:Person)) AND ALL(\`person_filter_person\` IN [(\`person\`)-[\`_person_filter_person\`:REFLEXIVE_INTERFACED_RELATIONSHIP_TYPE]->(:Person) | \`_person_filter_person\`] WHERE (ALL(\`person\` IN [(\`person\`)-[\`person_filter_person\`]->(\`_person\`:Person) | \`_person\`] WHERE (\`person\`.name IN $filter.reflexiveInterfacedRelationshipType.to.Person.name_in)))))) RETURN \`person\` {FRAGMENT_TYPE: head( [ label IN labels(\`person\`) WHERE label IN $Person_derivedTypes ] ), .userId , .name ,reflexiveInterfacedRelationshipType: {to: [(\`person\`)-[\`person_to_relation\`:\`REFLEXIVE_INTERFACED_RELATIONSHIP_TYPE\`]->(\`person_to\`:\`Person\`) WHERE (\`person_to_relation\`.boolean = $1_filter.boolean) | person_to_relation { .boolean ,Person: person_to {FRAGMENT_TYPE: head( [ label IN labels(person_to) WHERE label IN $Person_derivedTypes ] ), .userId , .name ,interfacedRelationshipType: [(\`person_to\`)-[\`person_to_interfacedRelationshipType_relation\`:\`INTERFACED_RELATIONSHIP_TYPE\`]->(:\`Genre\`) | person_to_interfacedRelationshipType_relation { .string ,Genre: head([(:\`Person\`)-[\`person_to_interfacedRelationshipType_relation\`]->(\`person_to_interfacedRelationshipType_Genre\`:\`Genre\`) | person_to_interfacedRelationshipType_Genre { .name }]) }][..1] } }][0..1] } } AS \`person\``,
    expectedParams = {
      offset: 0,
      first: -1,
      filter: {
        name_in: ['Michael'],
        reflexiveInterfacedRelationshipType: {
          to: {
            Person: {
              name_in: ['John']
            }
          }
        }
      },
      '1_filter': {
        boolean: true
      },
      '1_first': 1,
      '1_offset': 0,
      '2_first': 1,
      Person_derivedTypes: ['Actor', 'CameraMan', 'User'],
      cypherParams: CYPHER_PARAMS
    };

  t.plan(2);
  return augmentedSchemaCypherTestRunner(
    t,
    graphQLQuery,
    {},
    expectedCypherQuery,
    expectedParams
  );
});

test('Create node with temporal properties', t => {
  const graphQLQuery = `mutation {
    CreateTemporalNode(
      time: {
        hour: 10,
        minute: 30,
        second: 1,
        millisecond: 2,
        microsecond: 3,
        nanosecond: 4,
        timezone: "-08:00",
        formatted: "10:30:01.002003004-08:00"
      }
      date: { 
        year: 2018, 
        month: 11, 
        day: 23 
      },
      datetime: {
        year: 2018,
        month: 11,
        day: 23,
        hour: 10,
        minute: 30,
        second: 1,
        millisecond: 2,
        microsecond: 3,
        nanosecond: 4,
        timezone: "America/Los_Angeles"
      }
      localtime: {
        hour: 10,
        minute: 30,
        second: 1,
        millisecond: 2,
        microsecond: 3,
        nanosecond: 4
      }
      localdatetime: {
        year: 2018,
        month: 11,
        day: 23,
        hour: 10,
        minute: 30,
        second: 1,
        millisecond: 2,
        microsecond: 3,
        nanosecond: 4
      }
    ) {
      _id
      time {
        hour
        minute
        second
        millisecond
        microsecond
        nanosecond
        timezone
        formatted
      }
      date {
        year
        month
        day
        formatted
      }
      datetime {
        year
        month
        day
        hour
        minute
        second
        millisecond
        microsecond
        nanosecond
        timezone
        formatted
      }
      localtime {
        hour
        minute
        second
        millisecond
        microsecond
        nanosecond
        formatted
      }
      localdatetime {
        year
        month
        day
        hour
        minute
        second
        millisecond
        microsecond
        nanosecond
        formatted
      }
    }
  }`,
    expectedCypherQuery = `
    CREATE (\`temporalNode\`:\`TemporalNode\` {datetime: datetime($params.datetime),time: time($params.time),date: date($params.date),localtime: localtime($params.localtime),localdatetime: localdatetime($params.localdatetime)})
    RETURN \`temporalNode\` {_id: ID(\`temporalNode\`),time: { hour: \`temporalNode\`.time.hour , minute: \`temporalNode\`.time.minute , second: \`temporalNode\`.time.second , millisecond: \`temporalNode\`.time.millisecond , microsecond: \`temporalNode\`.time.microsecond , nanosecond: \`temporalNode\`.time.nanosecond , timezone: \`temporalNode\`.time.timezone , formatted: toString(\`temporalNode\`.time) },date: { year: \`temporalNode\`.date.year , month: \`temporalNode\`.date.month , day: \`temporalNode\`.date.day , formatted: toString(\`temporalNode\`.date) },datetime: { year: \`temporalNode\`.datetime.year , month: \`temporalNode\`.datetime.month , day: \`temporalNode\`.datetime.day , hour: \`temporalNode\`.datetime.hour , minute: \`temporalNode\`.datetime.minute , second: \`temporalNode\`.datetime.second , millisecond: \`temporalNode\`.datetime.millisecond , microsecond: \`temporalNode\`.datetime.microsecond , nanosecond: \`temporalNode\`.datetime.nanosecond , timezone: \`temporalNode\`.datetime.timezone , formatted: toString(\`temporalNode\`.datetime) },localtime: { hour: \`temporalNode\`.localtime.hour , minute: \`temporalNode\`.localtime.minute , second: \`temporalNode\`.localtime.second , millisecond: \`temporalNode\`.localtime.millisecond , microsecond: \`temporalNode\`.localtime.microsecond , nanosecond: \`temporalNode\`.localtime.nanosecond , formatted: toString(\`temporalNode\`.localtime) },localdatetime: { year: \`temporalNode\`.localdatetime.year , month: \`temporalNode\`.localdatetime.month , day: \`temporalNode\`.localdatetime.day , hour: \`temporalNode\`.localdatetime.hour , minute: \`temporalNode\`.localdatetime.minute , second: \`temporalNode\`.localdatetime.second , millisecond: \`temporalNode\`.localdatetime.millisecond , microsecond: \`temporalNode\`.localdatetime.microsecond , nanosecond: \`temporalNode\`.localdatetime.nanosecond , formatted: toString(\`temporalNode\`.localdatetime) }} AS \`temporalNode\`
  `,
    expectedParams = {
      params: {
        datetime: {
          year: {
            low: 2018,
            high: 0
          },
          month: {
            low: 11,
            high: 0
          },
          day: {
            low: 23,
            high: 0
          },
          hour: {
            low: 10,
            high: 0
          },
          minute: {
            low: 30,
            high: 0
          },
          second: {
            low: 1,
            high: 0
          },
          millisecond: {
            low: 2,
            high: 0
          },
          microsecond: {
            low: 3,
            high: 0
          },
          nanosecond: {
            low: 4,
            high: 0
          },
          timezone: 'America/Los_Angeles'
        },
        time: '10:30:01.002003004-08:00',
        date: {
          year: {
            low: 2018,
            high: 0
          },
          month: {
            low: 11,
            high: 0
          },
          day: {
            low: 23,
            high: 0
          }
        },
        localtime: {
          hour: {
            low: 10,
            high: 0
          },
          minute: {
            low: 30,
            high: 0
          },
          second: {
            low: 1,
            high: 0
          },
          millisecond: {
            low: 2,
            high: 0
          },
          microsecond: {
            low: 3,
            high: 0
          },
          nanosecond: {
            low: 4,
            high: 0
          }
        },
        localdatetime: {
          year: {
            low: 2018,
            high: 0
          },
          month: {
            low: 11,
            high: 0
          },
          day: {
            low: 23,
            high: 0
          },
          hour: {
            low: 10,
            high: 0
          },
          minute: {
            low: 30,
            high: 0
          },
          second: {
            low: 1,
            high: 0
          },
          millisecond: {
            low: 2,
            high: 0
          },
          microsecond: {
            low: 3,
            high: 0
          },
          nanosecond: {
            low: 4,
            high: 0
          }
        }
      },
      first: -1,
      offset: 0
    };

  t.plan(2);
  return augmentedSchemaCypherTestRunner(
    t,
    graphQLQuery,
    {},
    expectedCypherQuery,
    expectedParams
  );
});

test('Create node with spatial properties', t => {
  const graphQLQuery = `mutation {
    CreateSpatialNode(
      id: "xyz"
      point: { longitude: 40, latitude: 50, height: 60 }
    ) {
      id
      point {
        longitude
        latitude
        height
        crs
      }
    }
  }`,
    expectedCypherQuery = `
    CREATE (\`spatialNode\`:\`SpatialNode\` {id:$params.id,point: point($params.point)})
    RETURN \`spatialNode\` { .id ,point: { longitude: \`spatialNode\`.point.longitude , latitude: \`spatialNode\`.point.latitude , height: \`spatialNode\`.point.height , crs: \`spatialNode\`.point.crs }} AS \`spatialNode\`
  `,
    expectedParams = {
      params: {
        id: 'xyz',
        point: {
          longitude: 40,
          latitude: 50,
          height: 60
        }
      },
      first: -1,
      offset: 0
    };

  t.plan(2);
  return augmentedSchemaCypherTestRunner(
    t,
    graphQLQuery,
    {},
    expectedCypherQuery,
    expectedParams
  );
});

test('Query node with temporal properties using temporal arguments', t => {
  const graphQLQuery = `query {
    TemporalNode(
      time: {
        hour: 10,
        minute: 30,
        second: 1,
        millisecond: 2,
        microsecond: 2003,
        nanosecond: 2003004,
        timezone: "-08:00",
        formatted: "10:30:01.002003004-08:00"
      }
      date: { 
        year: 2018, 
        month: 11, 
        day: 23 
      }
      datetime: {
        year: 2018,
        month: 11,
        day: 23,
        hour: 10,
        minute: 30,
        second: 1,
        millisecond: 2,
        microsecond: 2003,
        nanosecond: 2003004,
        timezone: "America/Los_Angeles"
      }
      localtime: {
        hour: 10,
        minute: 30,
        second: 1,
        millisecond: 2,
        microsecond: 2003,
        nanosecond: 2003004
      }
      localdatetime: {
        year: 2018,
        month: 11,
        day: 23,
        hour: 10,
        minute: 30,
        second: 1,
        millisecond: 2,
        microsecond: 2003,
        nanosecond: 2003004,
        formatted: "2018-11-23T10:30:01.002003004"
      }
    ) {
      _id
      time {
        hour
        minute
        second
        millisecond
        microsecond
        nanosecond
        timezone
        formatted
      }
      date {
        year
        month
        day
        formatted
      }
      datetime {
        year
        month
        day
        hour
        minute
        second
        millisecond
        microsecond
        nanosecond
        timezone
        formatted
      }
      localtime {
        hour
        minute
        second
        millisecond
        microsecond
        nanosecond
        formatted
      }
      localdatetime {
        year
        month
        day
        hour
        minute
        second
        millisecond
        microsecond
        nanosecond
        formatted
      }
    }
  }`,
    expectedCypherQuery = `MATCH (\`temporalNode\`:\`TemporalNode\`) WHERE \`temporalNode\`.datetime.year = $datetime.year AND \`temporalNode\`.datetime.month = $datetime.month AND \`temporalNode\`.datetime.day = $datetime.day AND \`temporalNode\`.datetime.hour = $datetime.hour AND \`temporalNode\`.datetime.minute = $datetime.minute AND \`temporalNode\`.datetime.second = $datetime.second AND \`temporalNode\`.datetime.millisecond = $datetime.millisecond AND \`temporalNode\`.datetime.microsecond = $datetime.microsecond AND \`temporalNode\`.datetime.nanosecond = $datetime.nanosecond AND \`temporalNode\`.datetime.timezone = $datetime.timezone AND \`temporalNode\`.time = time($time.formatted) AND \`temporalNode\`.date.year = $date.year AND \`temporalNode\`.date.month = $date.month AND \`temporalNode\`.date.day = $date.day AND \`temporalNode\`.localtime.hour = $localtime.hour AND \`temporalNode\`.localtime.minute = $localtime.minute AND \`temporalNode\`.localtime.second = $localtime.second AND \`temporalNode\`.localtime.millisecond = $localtime.millisecond AND \`temporalNode\`.localtime.microsecond = $localtime.microsecond AND \`temporalNode\`.localtime.nanosecond = $localtime.nanosecond AND \`temporalNode\`.localdatetime = localdatetime($localdatetime.formatted) RETURN \`temporalNode\` {_id: ID(\`temporalNode\`),time: { hour: \`temporalNode\`.time.hour , minute: \`temporalNode\`.time.minute , second: \`temporalNode\`.time.second , millisecond: \`temporalNode\`.time.millisecond , microsecond: \`temporalNode\`.time.microsecond , nanosecond: \`temporalNode\`.time.nanosecond , timezone: \`temporalNode\`.time.timezone , formatted: toString(\`temporalNode\`.time) },date: { year: \`temporalNode\`.date.year , month: \`temporalNode\`.date.month , day: \`temporalNode\`.date.day , formatted: toString(\`temporalNode\`.date) },datetime: { year: \`temporalNode\`.datetime.year , month: \`temporalNode\`.datetime.month , day: \`temporalNode\`.datetime.day , hour: \`temporalNode\`.datetime.hour , minute: \`temporalNode\`.datetime.minute , second: \`temporalNode\`.datetime.second , millisecond: \`temporalNode\`.datetime.millisecond , microsecond: \`temporalNode\`.datetime.microsecond , nanosecond: \`temporalNode\`.datetime.nanosecond , timezone: \`temporalNode\`.datetime.timezone , formatted: toString(\`temporalNode\`.datetime) },localtime: { hour: \`temporalNode\`.localtime.hour , minute: \`temporalNode\`.localtime.minute , second: \`temporalNode\`.localtime.second , millisecond: \`temporalNode\`.localtime.millisecond , microsecond: \`temporalNode\`.localtime.microsecond , nanosecond: \`temporalNode\`.localtime.nanosecond , formatted: toString(\`temporalNode\`.localtime) },localdatetime: { year: \`temporalNode\`.localdatetime.year , month: \`temporalNode\`.localdatetime.month , day: \`temporalNode\`.localdatetime.day , hour: \`temporalNode\`.localdatetime.hour , minute: \`temporalNode\`.localdatetime.minute , second: \`temporalNode\`.localdatetime.second , millisecond: \`temporalNode\`.localdatetime.millisecond , microsecond: \`temporalNode\`.localdatetime.microsecond , nanosecond: \`temporalNode\`.localdatetime.nanosecond , formatted: toString(\`temporalNode\`.localdatetime) }} AS \`temporalNode\``,
    expectedParams = {
      offset: 0,
      first: -1,
      datetime: {
        year: 2018,
        month: 11,
        day: 23,
        hour: 10,
        minute: 30,
        second: 1,
        millisecond: 2,
        microsecond: 2003,
        nanosecond: 2003004,
        timezone: 'America/Los_Angeles'
      },
      time: {
        hour: 10,
        minute: 30,
        second: 1,
        millisecond: 2,
        microsecond: 2003,
        nanosecond: 2003004,
        timezone: '-08:00',
        formatted: '10:30:01.002003004-08:00'
      },
      date: {
        year: 2018,
        month: 11,
        day: 23
      },
      localtime: {
        hour: 10,
        minute: 30,
        second: 1,
        millisecond: 2,
        microsecond: 2003,
        nanosecond: 2003004
      },
      localdatetime: {
        year: 2018,
        month: 11,
        day: 23,
        hour: 10,
        minute: 30,
        second: 1,
        millisecond: 2,
        microsecond: 2003,
        nanosecond: 2003004,
        formatted: '2018-11-23T10:30:01.002003004'
      }
    };

  t.plan(2);
  return augmentedSchemaCypherTestRunner(
    t,
    graphQLQuery,
    {},
    expectedCypherQuery,
    expectedParams
  );
});

test('Query node with spatial properties', t => {
  const graphQLQuery = `query {
    SpatialNode(      
      point: {
        longitude: 40, latitude: 50, height: 60
      }
    ) {
      id
      point {
        longitude
        latitude
        height
        crs
      }
    }
  }`,
    expectedCypherQuery = `MATCH (\`spatialNode\`:\`SpatialNode\`) WHERE \`spatialNode\`.point.longitude = $point.longitude AND \`spatialNode\`.point.latitude = $point.latitude AND \`spatialNode\`.point.height = $point.height RETURN \`spatialNode\` { .id ,point: { longitude: \`spatialNode\`.point.longitude , latitude: \`spatialNode\`.point.latitude , height: \`spatialNode\`.point.height , crs: \`spatialNode\`.point.crs }} AS \`spatialNode\``,
    expectedParams = {
      offset: 0,
      first: -1,
      cypherParams: CYPHER_PARAMS,
      point: {
        longitude: 40,
        latitude: 50,
        height: 60
      }
    };

  t.plan(2);
  return augmentedSchemaCypherTestRunner(
    t,
    graphQLQuery,
    {},
    expectedCypherQuery,
    expectedParams
  );
});

test('Nested Query with temporal property arguments', t => {
  const graphQLQuery = `query {
    TemporalNode(
      datetime: {
        year: 2018
        month: 11
        day: 23
        hour: 10
        minute: 30
        second: 1
        millisecond: 2
        microsecond: 2003
        nanosecond: 2003004
        timezone: "America/Los_Angeles"
      }
    ) {
      _id
      time {
        hour
        minute
        second
        millisecond
        microsecond
        nanosecond
        timezone
        formatted
      }
      date {
        year
        month
        day
        formatted
      }
      datetime {
        year
        month
        day
        hour
        minute
        second
        millisecond
        microsecond
        nanosecond
        timezone
        formatted
      }
      localtime {
        hour
        minute
        second
        millisecond
        microsecond
        nanosecond
        formatted
      }
      localdatetime {
        year
        month
        day
        hour
        minute
        second
        millisecond
        microsecond
        nanosecond
        formatted
      }
      temporalNodes(
        datetime: {
          year: 2020
          month: 11
          day: 23
          hour: 10
          minute: 30
          second: 1
          millisecond: 2
          microsecond: 2003
          nanosecond: 2003004
          timezone: "America/Los_Angeles"
        }
        localdatetime: {
          year: 2018
          month: 11
          day: 23
          hour: 10
          minute: 30
          second: 1
          millisecond: 2
          microsecond: 2003
          nanosecond: 2003004
          formatted: "2018-11-23T10:30:01.002003004"
        }
      ) {
        _id
        time {
          hour
          minute
          second
          millisecond
          microsecond
          nanosecond
          timezone
          formatted
        }
        date {
          year
          month
          day
          formatted
        }
        datetime {
          year
          month
          day
          hour
          minute
          second
          millisecond
          microsecond
          nanosecond
          timezone
          formatted
        }
        localtime {
          hour
          minute
          second
          millisecond
          microsecond
          nanosecond
          formatted
        }
        localdatetime {
          year
          month
          day
          hour
          minute
          second
          millisecond
          microsecond
          nanosecond
          formatted
        }
      }
    }
  }`,
    expectedCypherQuery = `MATCH (\`temporalNode\`:\`TemporalNode\`) WHERE \`temporalNode\`.datetime.year = $datetime.year AND \`temporalNode\`.datetime.month = $datetime.month AND \`temporalNode\`.datetime.day = $datetime.day AND \`temporalNode\`.datetime.hour = $datetime.hour AND \`temporalNode\`.datetime.minute = $datetime.minute AND \`temporalNode\`.datetime.second = $datetime.second AND \`temporalNode\`.datetime.millisecond = $datetime.millisecond AND \`temporalNode\`.datetime.microsecond = $datetime.microsecond AND \`temporalNode\`.datetime.nanosecond = $datetime.nanosecond AND \`temporalNode\`.datetime.timezone = $datetime.timezone RETURN \`temporalNode\` {_id: ID(\`temporalNode\`),time: { hour: \`temporalNode\`.time.hour , minute: \`temporalNode\`.time.minute , second: \`temporalNode\`.time.second , millisecond: \`temporalNode\`.time.millisecond , microsecond: \`temporalNode\`.time.microsecond , nanosecond: \`temporalNode\`.time.nanosecond , timezone: \`temporalNode\`.time.timezone , formatted: toString(\`temporalNode\`.time) },date: { year: \`temporalNode\`.date.year , month: \`temporalNode\`.date.month , day: \`temporalNode\`.date.day , formatted: toString(\`temporalNode\`.date) },datetime: { year: \`temporalNode\`.datetime.year , month: \`temporalNode\`.datetime.month , day: \`temporalNode\`.datetime.day , hour: \`temporalNode\`.datetime.hour , minute: \`temporalNode\`.datetime.minute , second: \`temporalNode\`.datetime.second , millisecond: \`temporalNode\`.datetime.millisecond , microsecond: \`temporalNode\`.datetime.microsecond , nanosecond: \`temporalNode\`.datetime.nanosecond , timezone: \`temporalNode\`.datetime.timezone , formatted: toString(\`temporalNode\`.datetime) },localtime: { hour: \`temporalNode\`.localtime.hour , minute: \`temporalNode\`.localtime.minute , second: \`temporalNode\`.localtime.second , millisecond: \`temporalNode\`.localtime.millisecond , microsecond: \`temporalNode\`.localtime.microsecond , nanosecond: \`temporalNode\`.localtime.nanosecond , formatted: toString(\`temporalNode\`.localtime) },localdatetime: { year: \`temporalNode\`.localdatetime.year , month: \`temporalNode\`.localdatetime.month , day: \`temporalNode\`.localdatetime.day , hour: \`temporalNode\`.localdatetime.hour , minute: \`temporalNode\`.localdatetime.minute , second: \`temporalNode\`.localdatetime.second , millisecond: \`temporalNode\`.localdatetime.millisecond , microsecond: \`temporalNode\`.localdatetime.microsecond , nanosecond: \`temporalNode\`.localdatetime.nanosecond , formatted: toString(\`temporalNode\`.localdatetime) },temporalNodes: [(\`temporalNode\`)-[:\`TEMPORAL\`]->(\`temporalNode_temporalNodes\`:\`TemporalNode\`) WHERE temporalNode_temporalNodes.datetime.year = $1_datetime.year AND temporalNode_temporalNodes.datetime.month = $1_datetime.month AND temporalNode_temporalNodes.datetime.day = $1_datetime.day AND temporalNode_temporalNodes.datetime.hour = $1_datetime.hour AND temporalNode_temporalNodes.datetime.minute = $1_datetime.minute AND temporalNode_temporalNodes.datetime.second = $1_datetime.second AND temporalNode_temporalNodes.datetime.millisecond = $1_datetime.millisecond AND temporalNode_temporalNodes.datetime.microsecond = $1_datetime.microsecond AND temporalNode_temporalNodes.datetime.nanosecond = $1_datetime.nanosecond AND temporalNode_temporalNodes.datetime.timezone = $1_datetime.timezone AND temporalNode_temporalNodes.localdatetime = localdatetime($1_localdatetime.formatted) | \`temporalNode_temporalNodes\` {_id: ID(\`temporalNode_temporalNodes\`),time: { hour: \`temporalNode_temporalNodes\`.time.hour , minute: \`temporalNode_temporalNodes\`.time.minute , second: \`temporalNode_temporalNodes\`.time.second , millisecond: \`temporalNode_temporalNodes\`.time.millisecond , microsecond: \`temporalNode_temporalNodes\`.time.microsecond , nanosecond: \`temporalNode_temporalNodes\`.time.nanosecond , timezone: \`temporalNode_temporalNodes\`.time.timezone , formatted: toString(\`temporalNode_temporalNodes\`.time) },date: { year: \`temporalNode_temporalNodes\`.date.year , month: \`temporalNode_temporalNodes\`.date.month , day: \`temporalNode_temporalNodes\`.date.day , formatted: toString(\`temporalNode_temporalNodes\`.date) },datetime: { year: \`temporalNode_temporalNodes\`.datetime.year , month: \`temporalNode_temporalNodes\`.datetime.month , day: \`temporalNode_temporalNodes\`.datetime.day , hour: \`temporalNode_temporalNodes\`.datetime.hour , minute: \`temporalNode_temporalNodes\`.datetime.minute , second: \`temporalNode_temporalNodes\`.datetime.second , millisecond: \`temporalNode_temporalNodes\`.datetime.millisecond , microsecond: \`temporalNode_temporalNodes\`.datetime.microsecond , nanosecond: \`temporalNode_temporalNodes\`.datetime.nanosecond , timezone: \`temporalNode_temporalNodes\`.datetime.timezone , formatted: toString(\`temporalNode_temporalNodes\`.datetime) },localtime: { hour: \`temporalNode_temporalNodes\`.localtime.hour , minute: \`temporalNode_temporalNodes\`.localtime.minute , second: \`temporalNode_temporalNodes\`.localtime.second , millisecond: \`temporalNode_temporalNodes\`.localtime.millisecond , microsecond: \`temporalNode_temporalNodes\`.localtime.microsecond , nanosecond: \`temporalNode_temporalNodes\`.localtime.nanosecond , formatted: toString(\`temporalNode_temporalNodes\`.localtime) },localdatetime: { year: \`temporalNode_temporalNodes\`.localdatetime.year , month: \`temporalNode_temporalNodes\`.localdatetime.month , day: \`temporalNode_temporalNodes\`.localdatetime.day , hour: \`temporalNode_temporalNodes\`.localdatetime.hour , minute: \`temporalNode_temporalNodes\`.localdatetime.minute , second: \`temporalNode_temporalNodes\`.localdatetime.second , millisecond: \`temporalNode_temporalNodes\`.localdatetime.millisecond , microsecond: \`temporalNode_temporalNodes\`.localdatetime.microsecond , nanosecond: \`temporalNode_temporalNodes\`.localdatetime.nanosecond , formatted: toString(\`temporalNode_temporalNodes\`.localdatetime) }}] } AS \`temporalNode\``,
    expectedParams = {
      offset: 0,
      first: -1,
      datetime: {
        year: 2018,
        month: 11,
        day: 23,
        hour: 10,
        minute: 30,
        second: 1,
        millisecond: 2,
        microsecond: 2003,
        nanosecond: 2003004,
        timezone: 'America/Los_Angeles'
      },
      '1_datetime': {
        year: 2020,
        month: 11,
        day: 23,
        hour: 10,
        minute: 30,
        second: 1,
        millisecond: 2,
        microsecond: 2003,
        nanosecond: 2003004,
        timezone: 'America/Los_Angeles'
      },
      '1_localdatetime': {
        year: 2018,
        month: 11,
        day: 23,
        hour: 10,
        minute: 30,
        second: 1,
        millisecond: 2,
        microsecond: 2003,
        nanosecond: 2003004,
        formatted: '2018-11-23T10:30:01.002003004'
      }
    };

  t.plan(2);
  return augmentedSchemaCypherTestRunner(
    t,
    graphQLQuery,
    {},
    expectedCypherQuery,
    expectedParams
  );
});

test('Nested Query with spatial property arguments', t => {
  const graphQLQuery = `query {
    SpatialNode(point: { longitude: 1.5 }) {
      point {
        longitude
        latitude
        height
      }
      spatialNodes(point: { longitude: 40 }) {
        point {
          longitude
          latitude
          height
        }
      }
    }
  }`,
    expectedCypherQuery = `MATCH (\`spatialNode\`:\`SpatialNode\`) WHERE \`spatialNode\`.point.longitude = $point.longitude RETURN \`spatialNode\` {point: { longitude: \`spatialNode\`.point.longitude , latitude: \`spatialNode\`.point.latitude , height: \`spatialNode\`.point.height },spatialNodes: [(\`spatialNode\`)-[:\`SPATIAL\`]->(\`spatialNode_spatialNodes\`:\`SpatialNode\`) WHERE spatialNode_spatialNodes.point.longitude = $1_point.longitude | \`spatialNode_spatialNodes\` {point: { longitude: \`spatialNode_spatialNodes\`.point.longitude , latitude: \`spatialNode_spatialNodes\`.point.latitude , height: \`spatialNode_spatialNodes\`.point.height }}] } AS \`spatialNode\``,
    expectedParams = {
      offset: 0,
      first: -1,
      point: {
        longitude: 1.5
      },
      '1_point': {
        longitude: 40
      },
      cypherParams: CYPHER_PARAMS
    };

  t.plan(2);
  return augmentedSchemaCypherTestRunner(
    t,
    graphQLQuery,
    {},
    expectedCypherQuery,
    expectedParams
  );
});

test('Update node spatial property', t => {
  const graphQLQuery = `mutation {
    UpdateSpatialNode(
      id: "xyz",
      point: {
        longitude: 100,
        latitude: 200,
        height: 300
      }
    ) {
      point {
        longitude
        latitude
        height
      }
    }
  }`,
    expectedCypherQuery = `MATCH (\`spatialNode\`:\`SpatialNode\`{id: $params.id})
  SET \`spatialNode\` += {point: point($params.point)} RETURN \`spatialNode\` {point: { longitude: \`spatialNode\`.point.longitude , latitude: \`spatialNode\`.point.latitude , height: \`spatialNode\`.point.height }} AS \`spatialNode\``,
    expectedParams = {
      offset: 0,
      first: -1,
      params: {
        id: 'xyz',
        point: {
          longitude: 100,
          latitude: 200,
          height: 300
        }
      }
    };

  t.plan(2);
  return augmentedSchemaCypherTestRunner(
    t,
    graphQLQuery,
    {},
    expectedCypherQuery,
    expectedParams
  );
});

test('Query relationship with temporal properties', t => {
  const graphQLQuery = `query {
    Movie {
      _id
      title
      ratings {
        rating
        datetime {
          year
        }
        User {
          _id
          name        
        }
      }
    }
  }`,
    expectedCypherQuery = `MATCH (\`movie\`:\`Movie\`${ADDITIONAL_MOVIE_LABELS}) RETURN \`movie\` {_id: ID(\`movie\`), .title ,ratings: [(\`movie\`)<-[\`movie_ratings_relation\`:\`RATED\`]-(:\`User\`) | movie_ratings_relation { .rating ,datetime: { year: \`movie_ratings_relation\`.datetime.year },User: head([(:\`Movie\`${ADDITIONAL_MOVIE_LABELS})<-[\`movie_ratings_relation\`]-(\`movie_ratings_User\`:\`User\`) | movie_ratings_User {_id: ID(\`movie_ratings_User\`), .name }]) }] } AS \`movie\``,
    expectedParams = {
      offset: 0,
      first: -1,
      cypherParams: CYPHER_PARAMS
    };

  t.plan(2);
  return augmentedSchemaCypherTestRunner(
    t,
    graphQLQuery,
    {},
    expectedCypherQuery,
    expectedParams
  );
});

test('Add relationship mutation with temporal properties', t => {
  const graphQLQuery = `mutation {
    AddUserRated(
      from: {
        userId: "fa547ca6-f44d-4a6c-8c86-45050227181f"
      },
      to: {
        movieId: "04b85fa3-7c78-4e65-9830-97dad60aa746"
      },
      data: {		
        rating: 5,		
        time: {	
          hour: 10,
          minute: 30,
          second: 1,
          millisecond: 2,
          microsecond: 3,
          nanosecond: 4,
          timezone: "-08:00",
          formatted: "10:30:01.002003004-08:00"
        },
        date: { 
          year: 2017, 
          month: 11, 
          day: 23 
        },
        datetime: {
          year: 2020,
          month: 11,
          day: 23,
          hour: 10,
          minute: 30,
          second: 1,
          millisecond: 2,
          microsecond: 3,
          nanosecond: 4,
          timezone: "America/Los_Angeles"
        },
        localtime: {
          hour: 10,
          minute: 30,
          second: 1,
          millisecond: 2,
          microsecond: 3,
          nanosecond: 4
        },
        localdatetime: {
          year: 2018,
          month: 11,
          day: 23,
          hour: 10,
          minute: 30,
          second: 1,
          millisecond: 2,
          microsecond: 3,
          nanosecond: 4,
          formatted: "2018-11-23T10:30:01.002003004"
        }
      }
    ) {
      time {
        hour
        minute
        second
        millisecond
        microsecond
        nanosecond
        timezone
        formatted
      }
      date {
        year
        month
        day
        formatted
      }
      datetime {
        year
        month
        day
        hour
        minute
        second
        millisecond
        microsecond
        nanosecond
        timezone
        formatted
      }
      localtime {
        hour
        minute
        second
        millisecond
        microsecond
        nanosecond
        formatted
      }
      localdatetime {
        year
        month
        day
        hour
        minute
        second
        millisecond
        microsecond
        nanosecond
        formatted
      }
      from {
        _id
        userId
        name
        rated {
          datetime {
            year
          }
        }
      }
      to {
        _id
        movieId
        title
        ratings {
          datetime {
            year
          }
        }
      }
    }
  }`,
    expectedCypherQuery = `
      MATCH (\`user_from\`:\`User\` {userId: $from.userId})
      MATCH (\`movie_to\`:\`Movie\`${ADDITIONAL_MOVIE_LABELS} {movieId: $to.movieId})
      CREATE (\`user_from\`)-[\`rated_relation\`:\`RATED\` {rating:$data.rating,time: time($data.time),date: date($data.date),datetime: datetime($data.datetime),localtime: localtime($data.localtime),localdatetime: localdatetime($data.localdatetime)}]->(\`movie_to\`)
      RETURN \`rated_relation\` { time: { hour: \`rated_relation\`.time.hour , minute: \`rated_relation\`.time.minute , second: \`rated_relation\`.time.second , millisecond: \`rated_relation\`.time.millisecond , microsecond: \`rated_relation\`.time.microsecond , nanosecond: \`rated_relation\`.time.nanosecond , timezone: \`rated_relation\`.time.timezone , formatted: toString(\`rated_relation\`.time) },date: { year: \`rated_relation\`.date.year , month: \`rated_relation\`.date.month , day: \`rated_relation\`.date.day , formatted: toString(\`rated_relation\`.date) },datetime: { year: \`rated_relation\`.datetime.year , month: \`rated_relation\`.datetime.month , day: \`rated_relation\`.datetime.day , hour: \`rated_relation\`.datetime.hour , minute: \`rated_relation\`.datetime.minute , second: \`rated_relation\`.datetime.second , millisecond: \`rated_relation\`.datetime.millisecond , microsecond: \`rated_relation\`.datetime.microsecond , nanosecond: \`rated_relation\`.datetime.nanosecond , timezone: \`rated_relation\`.datetime.timezone , formatted: toString(\`rated_relation\`.datetime) },localtime: { hour: \`rated_relation\`.localtime.hour , minute: \`rated_relation\`.localtime.minute , second: \`rated_relation\`.localtime.second , millisecond: \`rated_relation\`.localtime.millisecond , microsecond: \`rated_relation\`.localtime.microsecond , nanosecond: \`rated_relation\`.localtime.nanosecond , formatted: toString(\`rated_relation\`.localtime) },localdatetime: { year: \`rated_relation\`.localdatetime.year , month: \`rated_relation\`.localdatetime.month , day: \`rated_relation\`.localdatetime.day , hour: \`rated_relation\`.localdatetime.hour , minute: \`rated_relation\`.localdatetime.minute , second: \`rated_relation\`.localdatetime.second , millisecond: \`rated_relation\`.localdatetime.millisecond , microsecond: \`rated_relation\`.localdatetime.microsecond , nanosecond: \`rated_relation\`.localdatetime.nanosecond , formatted: toString(\`rated_relation\`.localdatetime) },from: \`user_from\` {_id: ID(\`user_from\`), .userId , .name ,rated: [(\`user_from\`)-[\`user_from_rated_relation\`:\`RATED\`]->(:\`Movie\`${ADDITIONAL_MOVIE_LABELS}) | user_from_rated_relation {datetime: { year: \`user_from_rated_relation\`.datetime.year }}] } ,to: \`movie_to\` {_id: ID(\`movie_to\`), .movieId , .title ,ratings: [(\`movie_to\`)<-[\`movie_to_ratings_relation\`:\`RATED\`]-(:\`User\`) | movie_to_ratings_relation {datetime: { year: \`movie_to_ratings_relation\`.datetime.year }}] }  } AS \`_AddUserRatedPayload\`;
    `,
    expectedParams = {
      from: {
        userId: 'fa547ca6-f44d-4a6c-8c86-45050227181f'
      },
      to: {
        movieId: '04b85fa3-7c78-4e65-9830-97dad60aa746'
      },
      data: {
        rating: {
          low: 5,
          high: 0
        },
        time: '10:30:01.002003004-08:00',
        date: {
          year: {
            low: 2017,
            high: 0
          },
          month: {
            low: 11,
            high: 0
          },
          day: {
            low: 23,
            high: 0
          }
        },
        datetime: {
          year: {
            low: 2020,
            high: 0
          },
          month: {
            low: 11,
            high: 0
          },
          day: {
            low: 23,
            high: 0
          },
          hour: {
            low: 10,
            high: 0
          },
          minute: {
            low: 30,
            high: 0
          },
          second: {
            low: 1,
            high: 0
          },
          millisecond: {
            low: 2,
            high: 0
          },
          microsecond: {
            low: 3,
            high: 0
          },
          nanosecond: {
            low: 4,
            high: 0
          },
          timezone: 'America/Los_Angeles'
        },
        localtime: {
          hour: {
            low: 10,
            high: 0
          },
          minute: {
            low: 30,
            high: 0
          },
          second: {
            low: 1,
            high: 0
          },
          millisecond: {
            low: 2,
            high: 0
          },
          microsecond: {
            low: 3,
            high: 0
          },
          nanosecond: {
            low: 4,
            high: 0
          }
        },
        localdatetime: '2018-11-23T10:30:01.002003004'
      },
      offset: 0,
      first: -1
    };

  t.plan(2);
  return augmentedSchemaCypherTestRunner(
    t,
    graphQLQuery,
    {},
    expectedCypherQuery,
    expectedParams
  );
});

test('Add relationship mutation with spatial properties', t => {
  const graphQLQuery = `mutation {
    AddUserRated(
      from: { userId: "123" }
      to: { movieId: "2kljghd" }
      data: { 
        rating: 10, 
        location: {
          longitude: 10,
          latitude: 20.3,
          height: 30.2
        }
      }
    ) {
      location {
        longitude
        latitude
        height
      }
      from {
        _id
      }
      to {
        _id
      }
    }
  }`,
    expectedCypherQuery = `
      MATCH (\`user_from\`:\`User\` {userId: $from.userId})
      MATCH (\`movie_to\`:\`Movie\`:\`u_user-id\`:\`newMovieLabel\` {movieId: $to.movieId})
      CREATE (\`user_from\`)-[\`rated_relation\`:\`RATED\` {rating:$data.rating,location: point($data.location)}]->(\`movie_to\`)
      RETURN \`rated_relation\` { location: { longitude: \`rated_relation\`.location.longitude , latitude: \`rated_relation\`.location.latitude , height: \`rated_relation\`.location.height },from: \`user_from\` {_id: ID(\`user_from\`)} ,to: \`movie_to\` {_id: ID(\`movie_to\`)}  } AS \`_AddUserRatedPayload\`;
    `,
    expectedParams = {
      from: { userId: '123' },
      to: { movieId: '2kljghd' },
      data: {
        rating: {
          high: 0,
          low: 10
        },
        location: {
          longitude: 10,
          latitude: 20.3,
          height: 30.2
        }
      },
      offset: 0,
      first: -1
    };

  t.plan(2);
  return augmentedSchemaCypherTestRunner(
    t,
    graphQLQuery,
    {},
    expectedCypherQuery,
    expectedParams
  );
});

test('Query relationship with spatial properties', t => {
  const graphQLQuery = `query {
    User {
      rated {
        location {
          longitude
          latitude
          height  
          srid
        }
      }
    }
  }`,
    expectedCypherQuery = `MATCH (\`user\`:\`User\`) RETURN \`user\` {rated: [(\`user\`)-[\`user_rated_relation\`:\`RATED\`]->(:\`Movie\`:\`u_user-id\`:\`newMovieLabel\`) | user_rated_relation {location: { longitude: \`user_rated_relation\`.location.longitude , latitude: \`user_rated_relation\`.location.latitude , height: \`user_rated_relation\`.location.height , srid: \`user_rated_relation\`.location.srid }}] } AS \`user\``,
    expectedParams = {
      offset: 0,
      first: -1,
      cypherParams: CYPHER_PARAMS
    };

  t.plan(2);
  return augmentedSchemaCypherTestRunner(
    t,
    graphQLQuery,
    {},
    expectedCypherQuery,
    expectedParams
  );
});

test('Add relationship mutation with list properties', t => {
  const graphQLQuery = `mutation {
    AddUserRated(
      from: { userId: "fa547ca6-f44d-4a6c-8c86-45050227181f" }
      to: { movieId: "04b85fa3-7c78-4e65-9830-97dad60aa746" }
      data: {
        ratings: [5, 9, 10]
        datetimes: [
          {
            year: 2020
            month: 11
            day: 23
            hour: 10
            minute: 30
            second: 1
            millisecond: 2
            microsecond: 3
            nanosecond: 4
            timezone: "America/Los_Angeles"
          }
          {
            formatted: "2018-11-23T10:30:01.002003004-08:00[America/Los_Angeles]"
          }
        ]
      }
    ) {
      ratings
      datetimes {
        year
        month
        day
        hour
        minute
        second
        millisecond
        microsecond
        nanosecond
        timezone
        formatted
      }
      from {
        _id
        userId
        name
        rated {
          datetime {
            year
          }
        }
      }
      to {
        _id
        movieId
        title
        ratings {
          datetime {
            year
          }
        }
      }
    }
  }`,
    expectedCypherQuery = `
      MATCH (\`user_from\`:\`User\` {userId: $from.userId})
      MATCH (\`movie_to\`:\`Movie\`${ADDITIONAL_MOVIE_LABELS} {movieId: $to.movieId})
      CREATE (\`user_from\`)-[\`rated_relation\`:\`RATED\` {ratings:$data.ratings,datetimes: [value IN $data.datetimes | datetime(value)]}]->(\`movie_to\`)
      RETURN \`rated_relation\` {  .ratings ,datetimes: reduce(a = [], INSTANCE IN rated_relation.datetimes | a + { year: INSTANCE.year , month: INSTANCE.month , day: INSTANCE.day , hour: INSTANCE.hour , minute: INSTANCE.minute , second: INSTANCE.second , millisecond: INSTANCE.millisecond , microsecond: INSTANCE.microsecond , nanosecond: INSTANCE.nanosecond , timezone: INSTANCE.timezone , formatted: toString(INSTANCE) }),from: \`user_from\` {_id: ID(\`user_from\`), .userId , .name ,rated: [(\`user_from\`)-[\`user_from_rated_relation\`:\`RATED\`]->(:\`Movie\`${ADDITIONAL_MOVIE_LABELS}) | user_from_rated_relation {datetime: { year: \`user_from_rated_relation\`.datetime.year }}] } ,to: \`movie_to\` {_id: ID(\`movie_to\`), .movieId , .title ,ratings: [(\`movie_to\`)<-[\`movie_to_ratings_relation\`:\`RATED\`]-(:\`User\`) | movie_to_ratings_relation {datetime: { year: \`movie_to_ratings_relation\`.datetime.year }}] }  } AS \`_AddUserRatedPayload\`;
    `,
    expectedParams = {
      from: {
        userId: 'fa547ca6-f44d-4a6c-8c86-45050227181f'
      },
      to: {
        movieId: '04b85fa3-7c78-4e65-9830-97dad60aa746'
      },
      data: {
        ratings: [
          {
            low: 5,
            high: 0
          },
          {
            low: 9,
            high: 0
          },
          {
            low: 10,
            high: 0
          }
        ],
        datetimes: [
          {
            year: {
              low: 2020,
              high: 0
            },
            month: {
              low: 11,
              high: 0
            },
            day: {
              low: 23,
              high: 0
            },
            hour: {
              low: 10,
              high: 0
            },
            minute: {
              low: 30,
              high: 0
            },
            second: {
              low: 1,
              high: 0
            },
            millisecond: {
              low: 2,
              high: 0
            },
            microsecond: {
              low: 3,
              high: 0
            },
            nanosecond: {
              low: 4,
              high: 0
            },
            timezone: 'America/Los_Angeles'
          },
          '2018-11-23T10:30:01.002003004-08:00[America/Los_Angeles]'
        ]
      },
      first: -1,
      offset: 0
    };

  t.plan(2);
  return augmentedSchemaCypherTestRunner(
    t,
    graphQLQuery,
    {},
    expectedCypherQuery,
    expectedParams
  );
});

test('Add reflexive relationship mutation with temporal properties', t => {
  const graphQLQuery = `mutation {
    AddUserFriends(
      from: { userId: "4451fa0a-5dcf-4a84-b950-56b7ad332627" }
      to: { userId: "fa547ca6-f44d-4a6c-8c86-45050227181f" }
      data: {
        since: 11
        time: {
          hour: 10
          minute: 30
          second: 1
          millisecond: 2
          microsecond: 3
          nanosecond: 4
          timezone: "-08:00"
          formatted: "10:30:01.002003004-08:00"
        }
        date: { year: 2018, month: 11, day: 23 }
        datetime: {
          year: 2018
          month: 11
          day: 23
          hour: 10
          minute: 30
          second: 1
          millisecond: 2
          microsecond: 3
          nanosecond: 4
          timezone: "America/Los_Angeles"
        }
        datetimes: [
          {
            year: 2020
            month: 11
            day: 23
            hour: 10
            minute: 30
            second: 1
            millisecond: 2
            microsecond: 3
            nanosecond: 4
            timezone: "America/Los_Angeles"
          }
          {
            formatted: "2018-11-23T10:30:01.002003004-08:00[America/Los_Angeles]"
          }
        ]
        localtime: {
          hour: 10
          minute: 30
          second: 1
          millisecond: 2
          microsecond: 3
          nanosecond: 4
        }
        localdatetime: {
          year: 2018
          month: 11
          day: 23
          hour: 10
          minute: 30
          second: 1
          millisecond: 2
          microsecond: 3
          nanosecond: 4
        }
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
            datetime {
              year
            }
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
      time {
        hour
        minute
        second
        millisecond
        microsecond
        nanosecond
        timezone
        formatted
      }
      date {
        year
        month
        day
        formatted
      }
      datetime {
        year
        month
        day
        hour
        minute
        second
        millisecond
        microsecond
        nanosecond
        timezone
        formatted
      }
      datetimes {
        year
        month
        day
        hour
        minute
        second
        millisecond
        microsecond
        nanosecond
        timezone
        formatted
      }
      localtime {
        hour
        minute
        second
        millisecond
        microsecond
        nanosecond
        formatted
      }
      localdatetime {
        year
        month
        day
        hour
        minute
        second
        millisecond
        microsecond
        nanosecond
        formatted
      }
    }
  }`,
    expectedCypherQuery = `
      MATCH (\`user_from\`:\`User\` {userId: $from.userId})
      MATCH (\`user_to\`:\`User\` {userId: $to.userId})
      CREATE (\`user_from\`)-[\`friend_of_relation\`:\`FRIEND_OF\` {since:$data.since,time: time($data.time),date: date($data.date),datetime: datetime($data.datetime),datetimes: [value IN $data.datetimes | datetime(value)],localtime: localtime($data.localtime),localdatetime: localdatetime($data.localdatetime)}]->(\`user_to\`)
      RETURN \`friend_of_relation\` { from: \`user_from\` {_id: ID(\`user_from\`), .userId , .name ,friends: {from: [(\`user_from\`)<-[\`user_from_from_relation\`:\`FRIEND_OF\`]-(\`user_from_from\`:\`User\`) | user_from_from_relation { .since ,User: user_from_from {_id: ID(\`user_from_from\`), .name ,friends: {from: [(\`user_from_from\`)<-[\`user_from_from_from_relation\`:\`FRIEND_OF\`]-(\`user_from_from_from\`:\`User\`) | user_from_from_from_relation { .since ,User: user_from_from_from {_id: ID(\`user_from_from_from\`), .name } }] ,to: [(\`user_from_from\`)-[\`user_from_from_to_relation\`:\`FRIEND_OF\`]->(\`user_from_from_to\`:\`User\`) | user_from_from_to_relation { .since ,User: user_from_from_to {_id: ID(\`user_from_from_to\`), .name } }] } } }] ,to: [(\`user_from\`)-[\`user_from_to_relation\`:\`FRIEND_OF\`]->(\`user_from_to\`:\`User\`) | user_from_to_relation { .since ,datetime: { year: \`user_from_to_relation\`.datetime.year },User: user_from_to {_id: ID(\`user_from_to\`), .name } }] } } ,to: \`user_to\` {_id: ID(\`user_to\`), .name ,friends: {from: [(\`user_to\`)<-[\`user_to_from_relation\`:\`FRIEND_OF\`]-(\`user_to_from\`:\`User\`) | user_to_from_relation { .since ,User: user_to_from {_id: ID(\`user_to_from\`), .name } }] ,to: [(\`user_to\`)-[\`user_to_to_relation\`:\`FRIEND_OF\`]->(\`user_to_to\`:\`User\`) | user_to_to_relation { .since ,User: user_to_to {_id: ID(\`user_to_to\`), .name } }] } } , .since ,time: { hour: \`friend_of_relation\`.time.hour , minute: \`friend_of_relation\`.time.minute , second: \`friend_of_relation\`.time.second , millisecond: \`friend_of_relation\`.time.millisecond , microsecond: \`friend_of_relation\`.time.microsecond , nanosecond: \`friend_of_relation\`.time.nanosecond , timezone: \`friend_of_relation\`.time.timezone , formatted: toString(\`friend_of_relation\`.time) },date: { year: \`friend_of_relation\`.date.year , month: \`friend_of_relation\`.date.month , day: \`friend_of_relation\`.date.day , formatted: toString(\`friend_of_relation\`.date) },datetime: { year: \`friend_of_relation\`.datetime.year , month: \`friend_of_relation\`.datetime.month , day: \`friend_of_relation\`.datetime.day , hour: \`friend_of_relation\`.datetime.hour , minute: \`friend_of_relation\`.datetime.minute , second: \`friend_of_relation\`.datetime.second , millisecond: \`friend_of_relation\`.datetime.millisecond , microsecond: \`friend_of_relation\`.datetime.microsecond , nanosecond: \`friend_of_relation\`.datetime.nanosecond , timezone: \`friend_of_relation\`.datetime.timezone , formatted: toString(\`friend_of_relation\`.datetime) },datetimes: reduce(a = [], INSTANCE IN friend_of_relation.datetimes | a + { year: INSTANCE.year , month: INSTANCE.month , day: INSTANCE.day , hour: INSTANCE.hour , minute: INSTANCE.minute , second: INSTANCE.second , millisecond: INSTANCE.millisecond , microsecond: INSTANCE.microsecond , nanosecond: INSTANCE.nanosecond , timezone: INSTANCE.timezone , formatted: toString(INSTANCE) }),localtime: { hour: \`friend_of_relation\`.localtime.hour , minute: \`friend_of_relation\`.localtime.minute , second: \`friend_of_relation\`.localtime.second , millisecond: \`friend_of_relation\`.localtime.millisecond , microsecond: \`friend_of_relation\`.localtime.microsecond , nanosecond: \`friend_of_relation\`.localtime.nanosecond , formatted: toString(\`friend_of_relation\`.localtime) },localdatetime: { year: \`friend_of_relation\`.localdatetime.year , month: \`friend_of_relation\`.localdatetime.month , day: \`friend_of_relation\`.localdatetime.day , hour: \`friend_of_relation\`.localdatetime.hour , minute: \`friend_of_relation\`.localdatetime.minute , second: \`friend_of_relation\`.localdatetime.second , millisecond: \`friend_of_relation\`.localdatetime.millisecond , microsecond: \`friend_of_relation\`.localdatetime.microsecond , nanosecond: \`friend_of_relation\`.localdatetime.nanosecond , formatted: toString(\`friend_of_relation\`.localdatetime) } } AS \`_AddUserFriendsPayload\`;
    `,
    expectedParams = {
      from: {
        userId: '4451fa0a-5dcf-4a84-b950-56b7ad332627'
      },
      to: {
        userId: 'fa547ca6-f44d-4a6c-8c86-45050227181f'
      },
      first: -1,
      offset: 0,
      data: {
        since: {
          low: 11,
          high: 0
        },
        time: '10:30:01.002003004-08:00',
        date: {
          year: {
            low: 2018,
            high: 0
          },
          month: {
            low: 11,
            high: 0
          },
          day: {
            low: 23,
            high: 0
          }
        },
        datetime: {
          year: {
            low: 2018,
            high: 0
          },
          month: {
            low: 11,
            high: 0
          },
          day: {
            low: 23,
            high: 0
          },
          hour: {
            low: 10,
            high: 0
          },
          minute: {
            low: 30,
            high: 0
          },
          second: {
            low: 1,
            high: 0
          },
          millisecond: {
            low: 2,
            high: 0
          },
          microsecond: {
            low: 3,
            high: 0
          },
          nanosecond: {
            low: 4,
            high: 0
          },
          timezone: 'America/Los_Angeles'
        },
        datetimes: [
          {
            year: {
              low: 2020,
              high: 0
            },
            month: {
              low: 11,
              high: 0
            },
            day: {
              low: 23,
              high: 0
            },
            hour: {
              low: 10,
              high: 0
            },
            minute: {
              low: 30,
              high: 0
            },
            second: {
              low: 1,
              high: 0
            },
            millisecond: {
              low: 2,
              high: 0
            },
            microsecond: {
              low: 3,
              high: 0
            },
            nanosecond: {
              low: 4,
              high: 0
            },
            timezone: 'America/Los_Angeles'
          },
          '2018-11-23T10:30:01.002003004-08:00[America/Los_Angeles]'
        ],
        localtime: {
          hour: {
            low: 10,
            high: 0
          },
          minute: {
            low: 30,
            high: 0
          },
          second: {
            low: 1,
            high: 0
          },
          millisecond: {
            low: 2,
            high: 0
          },
          microsecond: {
            low: 3,
            high: 0
          },
          nanosecond: {
            low: 4,
            high: 0
          }
        },
        localdatetime: {
          year: {
            low: 2018,
            high: 0
          },
          month: {
            low: 11,
            high: 0
          },
          day: {
            low: 23,
            high: 0
          },
          hour: {
            low: 10,
            high: 0
          },
          minute: {
            low: 30,
            high: 0
          },
          second: {
            low: 1,
            high: 0
          },
          millisecond: {
            low: 2,
            high: 0
          },
          microsecond: {
            low: 3,
            high: 0
          },
          nanosecond: {
            low: 4,
            high: 0
          }
        }
      }
    };

  t.plan(2);
  return augmentedSchemaCypherTestRunner(
    t,
    graphQLQuery,
    {},
    expectedCypherQuery,
    expectedParams
  );
});

test('Remove relationship mutation for relation type field', t => {
  const graphQLQuery = `mutation {
    RemoveUserRated(
      from: { userId: "fa547ca6-f44d-4a6c-8c86-45050227181f" }
      to: { movieId: "04b85fa3-7c78-4e65-9830-97dad60aa746" }
    ) {
      from {
        _id
        userId
        name
        rated {
          datetime {
            year
          }
          Movie {
            title
          }
        }
      }
      to {
        _id
        movieId
        title
        ratings {
          datetime {
            year
          }
        }
      }
    }
  }`,
    expectedCypherQuery = `
      MATCH (\`user_from\`:\`User\` {userId: $from.userId})
      MATCH (\`movie_to\`:\`Movie\`${ADDITIONAL_MOVIE_LABELS} {movieId: $to.movieId})
      OPTIONAL MATCH (\`user_from\`)-[\`user_frommovie_to\`:\`RATED\`]->(\`movie_to\`)
      DELETE \`user_frommovie_to\`
      WITH COUNT(*) AS scope, \`user_from\` AS \`_user_from\`, \`movie_to\` AS \`_movie_to\`
      RETURN {from: \`_user_from\` {_id: ID(\`_user_from\`), .userId , .name ,rated: [(\`_user_from\`)-[\`_user_from_rated_relation\`:\`RATED\`]->(:\`Movie\`${ADDITIONAL_MOVIE_LABELS}) | _user_from_rated_relation {datetime: { year: \`_user_from_rated_relation\`.datetime.year },Movie: head([(:\`User\`)-[\`_user_from_rated_relation\`]->(\`_user_from_rated_Movie\`:\`Movie\`${ADDITIONAL_MOVIE_LABELS}) | _user_from_rated_Movie { .title }]) }] } ,to: \`_movie_to\` {_id: ID(\`_movie_to\`), .movieId , .title ,ratings: [(\`_movie_to\`)<-[\`_movie_to_ratings_relation\`:\`RATED\`]-(:\`User\`) | _movie_to_ratings_relation {datetime: { year: \`_movie_to_ratings_relation\`.datetime.year }}] } } AS \`_RemoveUserRatedPayload\`;
    `,
    expectedParams = {
      from: {
        userId: 'fa547ca6-f44d-4a6c-8c86-45050227181f'
      },
      to: {
        movieId: '04b85fa3-7c78-4e65-9830-97dad60aa746'
      },
      first: -1,
      offset: 0
    };

  t.plan(2);
  return augmentedSchemaCypherTestRunner(
    t,
    graphQLQuery,
    {},
    expectedCypherQuery,
    expectedParams
  );
});

test('Query nested temporal properties on reflexive relationship using temporal arguments', t => {
  const graphQLQuery = `query {
    User {
      userId
      name
      friends {
        from(
          time: {
            hour: 10
            minute: 30
            second: 1
            millisecond: 2
            microsecond: 2003
            nanosecond: 2003004
            timezone: "-08:00"
            formatted: "10:30:01.002003004-08:00"
          }
          date: { year: 2018, month: 11, day: 23 }
          datetime: {
            year: 2018
            month: 11
            day: 23
            hour: 10
            minute: 30
            second: 1
            millisecond: 2
            microsecond: 2003
            nanosecond: 2003004
            timezone: "America/Los_Angeles"
          }
          localtime: {
            hour: 10
            minute: 30
            second: 1
            millisecond: 2
            microsecond: 2003
            nanosecond: 2003004
          }
          localdatetime: {
            year: 2018
            month: 11
            day: 23
            hour: 10
            minute: 30
            second: 1
            millisecond: 2
            microsecond: 2003
            nanosecond: 2003004
          }
        ) {
          since
          time {
            hour
            minute
            second
            millisecond
            microsecond
            nanosecond
            timezone
            formatted
          }
          date {
            year
            month
            day
            formatted
          }
          datetime {
            year
            month
            day
            hour
            minute
            second
            millisecond
            microsecond
            nanosecond
            timezone
            formatted
          }
          datetimes {
            year
            month
            day
            hour
            minute
            second
            millisecond
            microsecond
            nanosecond
            timezone
            formatted
          }
          localtime {
            hour
            minute
            second
            millisecond
            microsecond
            nanosecond
            formatted
          }
          localdatetime {
            year
            month
            day
            hour
            minute
            second
            millisecond
            microsecond
            nanosecond
            formatted
          }
          User {
            _id
            userId
            rated {
              datetime {
                year
              }
            }
          }
        }
        to(
          time: {
            hour: 10
            minute: 30
            second: 1
            millisecond: 2
            microsecond: 2003
            nanosecond: 2003004
            timezone: "-08:00"
            formatted: "10:30:01.002003004-08:00"
          }
          date: { year: 2018, month: 11, day: 23 }
          datetime: {
            year: 2018
            month: 11
            day: 23
            hour: 10
            minute: 30
            second: 1
            millisecond: 2
            microsecond: 2003
            nanosecond: 2003004
            timezone: "America/Los_Angeles"
          }
          localtime: {
            hour: 10
            minute: 30
            second: 1
            millisecond: 2
            microsecond: 2003
            nanosecond: 2003004
          }
          localdatetime: {
            year: 2018
            month: 11
            day: 23
            hour: 10
            minute: 30
            second: 1
            millisecond: 2
            microsecond: 2003
            nanosecond: 2003004
          }
        ) {
          since
          time {
            hour
            minute
            second
            millisecond
            microsecond
            nanosecond
            timezone
            formatted
          }
          date {
            year
            month
            day
            formatted
          }
          datetime {
            year
            month
            day
            hour
            minute
            second
            millisecond
            microsecond
            nanosecond
            timezone
            formatted
          }
          localtime {
            hour
            minute
            second
            millisecond
            microsecond
            nanosecond
            formatted
          }
          localdatetime {
            year
            month
            day
            hour
            minute
            second
            millisecond
            microsecond
            nanosecond
            formatted
          }
          User {
            _id
            userId
            rated {
              datetime {
                year
              }
            }
          }
        }
      }
    }
  }`,
    expectedCypherQuery = `MATCH (\`user\`:\`User\`) RETURN \`user\` { .userId , .name ,friends: {from: [(\`user\`)<-[\`user_from_relation\`:\`FRIEND_OF\`]-(\`user_from\`:\`User\`) WHERE user_from_relation.time = time($1_time.formatted) AND user_from_relation.date.year = $1_date.year AND user_from_relation.date.month = $1_date.month AND user_from_relation.date.day = $1_date.day AND user_from_relation.datetime.year = $1_datetime.year AND user_from_relation.datetime.month = $1_datetime.month AND user_from_relation.datetime.day = $1_datetime.day AND user_from_relation.datetime.hour = $1_datetime.hour AND user_from_relation.datetime.minute = $1_datetime.minute AND user_from_relation.datetime.second = $1_datetime.second AND user_from_relation.datetime.millisecond = $1_datetime.millisecond AND user_from_relation.datetime.microsecond = $1_datetime.microsecond AND user_from_relation.datetime.nanosecond = $1_datetime.nanosecond AND user_from_relation.datetime.timezone = $1_datetime.timezone AND user_from_relation.localtime.hour = $1_localtime.hour AND user_from_relation.localtime.minute = $1_localtime.minute AND user_from_relation.localtime.second = $1_localtime.second AND user_from_relation.localtime.millisecond = $1_localtime.millisecond AND user_from_relation.localtime.microsecond = $1_localtime.microsecond AND user_from_relation.localtime.nanosecond = $1_localtime.nanosecond AND user_from_relation.localdatetime.year = $1_localdatetime.year AND user_from_relation.localdatetime.month = $1_localdatetime.month AND user_from_relation.localdatetime.day = $1_localdatetime.day AND user_from_relation.localdatetime.hour = $1_localdatetime.hour AND user_from_relation.localdatetime.minute = $1_localdatetime.minute AND user_from_relation.localdatetime.second = $1_localdatetime.second AND user_from_relation.localdatetime.millisecond = $1_localdatetime.millisecond AND user_from_relation.localdatetime.microsecond = $1_localdatetime.microsecond AND user_from_relation.localdatetime.nanosecond = $1_localdatetime.nanosecond | user_from_relation { .since ,time: { hour: \`user_from_relation\`.time.hour , minute: \`user_from_relation\`.time.minute , second: \`user_from_relation\`.time.second , millisecond: \`user_from_relation\`.time.millisecond , microsecond: \`user_from_relation\`.time.microsecond , nanosecond: \`user_from_relation\`.time.nanosecond , timezone: \`user_from_relation\`.time.timezone , formatted: toString(\`user_from_relation\`.time) },date: { year: \`user_from_relation\`.date.year , month: \`user_from_relation\`.date.month , day: \`user_from_relation\`.date.day , formatted: toString(\`user_from_relation\`.date) },datetime: { year: \`user_from_relation\`.datetime.year , month: \`user_from_relation\`.datetime.month , day: \`user_from_relation\`.datetime.day , hour: \`user_from_relation\`.datetime.hour , minute: \`user_from_relation\`.datetime.minute , second: \`user_from_relation\`.datetime.second , millisecond: \`user_from_relation\`.datetime.millisecond , microsecond: \`user_from_relation\`.datetime.microsecond , nanosecond: \`user_from_relation\`.datetime.nanosecond , timezone: \`user_from_relation\`.datetime.timezone , formatted: toString(\`user_from_relation\`.datetime) },datetimes: reduce(a = [], INSTANCE IN user_from_relation.datetimes | a + { year: INSTANCE.year , month: INSTANCE.month , day: INSTANCE.day , hour: INSTANCE.hour , minute: INSTANCE.minute , second: INSTANCE.second , millisecond: INSTANCE.millisecond , microsecond: INSTANCE.microsecond , nanosecond: INSTANCE.nanosecond , timezone: INSTANCE.timezone , formatted: toString(INSTANCE) }),localtime: { hour: \`user_from_relation\`.localtime.hour , minute: \`user_from_relation\`.localtime.minute , second: \`user_from_relation\`.localtime.second , millisecond: \`user_from_relation\`.localtime.millisecond , microsecond: \`user_from_relation\`.localtime.microsecond , nanosecond: \`user_from_relation\`.localtime.nanosecond , formatted: toString(\`user_from_relation\`.localtime) },localdatetime: { year: \`user_from_relation\`.localdatetime.year , month: \`user_from_relation\`.localdatetime.month , day: \`user_from_relation\`.localdatetime.day , hour: \`user_from_relation\`.localdatetime.hour , minute: \`user_from_relation\`.localdatetime.minute , second: \`user_from_relation\`.localdatetime.second , millisecond: \`user_from_relation\`.localdatetime.millisecond , microsecond: \`user_from_relation\`.localdatetime.microsecond , nanosecond: \`user_from_relation\`.localdatetime.nanosecond , formatted: toString(\`user_from_relation\`.localdatetime) },User: user_from {_id: ID(\`user_from\`), .userId ,rated: [(\`user_from\`)-[\`user_from_rated_relation\`:\`RATED\`]->(:\`Movie\`${ADDITIONAL_MOVIE_LABELS}) | user_from_rated_relation {datetime: { year: \`user_from_rated_relation\`.datetime.year }}] } }] ,to: [(\`user\`)-[\`user_to_relation\`:\`FRIEND_OF\`]->(\`user_to\`:\`User\`) WHERE user_to_relation.time = time($3_time.formatted) AND user_to_relation.date.year = $3_date.year AND user_to_relation.date.month = $3_date.month AND user_to_relation.date.day = $3_date.day AND user_to_relation.datetime.year = $3_datetime.year AND user_to_relation.datetime.month = $3_datetime.month AND user_to_relation.datetime.day = $3_datetime.day AND user_to_relation.datetime.hour = $3_datetime.hour AND user_to_relation.datetime.minute = $3_datetime.minute AND user_to_relation.datetime.second = $3_datetime.second AND user_to_relation.datetime.millisecond = $3_datetime.millisecond AND user_to_relation.datetime.microsecond = $3_datetime.microsecond AND user_to_relation.datetime.nanosecond = $3_datetime.nanosecond AND user_to_relation.datetime.timezone = $3_datetime.timezone AND user_to_relation.localtime.hour = $3_localtime.hour AND user_to_relation.localtime.minute = $3_localtime.minute AND user_to_relation.localtime.second = $3_localtime.second AND user_to_relation.localtime.millisecond = $3_localtime.millisecond AND user_to_relation.localtime.microsecond = $3_localtime.microsecond AND user_to_relation.localtime.nanosecond = $3_localtime.nanosecond AND user_to_relation.localdatetime.year = $3_localdatetime.year AND user_to_relation.localdatetime.month = $3_localdatetime.month AND user_to_relation.localdatetime.day = $3_localdatetime.day AND user_to_relation.localdatetime.hour = $3_localdatetime.hour AND user_to_relation.localdatetime.minute = $3_localdatetime.minute AND user_to_relation.localdatetime.second = $3_localdatetime.second AND user_to_relation.localdatetime.millisecond = $3_localdatetime.millisecond AND user_to_relation.localdatetime.microsecond = $3_localdatetime.microsecond AND user_to_relation.localdatetime.nanosecond = $3_localdatetime.nanosecond | user_to_relation { .since ,time: { hour: \`user_to_relation\`.time.hour , minute: \`user_to_relation\`.time.minute , second: \`user_to_relation\`.time.second , millisecond: \`user_to_relation\`.time.millisecond , microsecond: \`user_to_relation\`.time.microsecond , nanosecond: \`user_to_relation\`.time.nanosecond , timezone: \`user_to_relation\`.time.timezone , formatted: toString(\`user_to_relation\`.time) },date: { year: \`user_to_relation\`.date.year , month: \`user_to_relation\`.date.month , day: \`user_to_relation\`.date.day , formatted: toString(\`user_to_relation\`.date) },datetime: { year: \`user_to_relation\`.datetime.year , month: \`user_to_relation\`.datetime.month , day: \`user_to_relation\`.datetime.day , hour: \`user_to_relation\`.datetime.hour , minute: \`user_to_relation\`.datetime.minute , second: \`user_to_relation\`.datetime.second , millisecond: \`user_to_relation\`.datetime.millisecond , microsecond: \`user_to_relation\`.datetime.microsecond , nanosecond: \`user_to_relation\`.datetime.nanosecond , timezone: \`user_to_relation\`.datetime.timezone , formatted: toString(\`user_to_relation\`.datetime) },localtime: { hour: \`user_to_relation\`.localtime.hour , minute: \`user_to_relation\`.localtime.minute , second: \`user_to_relation\`.localtime.second , millisecond: \`user_to_relation\`.localtime.millisecond , microsecond: \`user_to_relation\`.localtime.microsecond , nanosecond: \`user_to_relation\`.localtime.nanosecond , formatted: toString(\`user_to_relation\`.localtime) },localdatetime: { year: \`user_to_relation\`.localdatetime.year , month: \`user_to_relation\`.localdatetime.month , day: \`user_to_relation\`.localdatetime.day , hour: \`user_to_relation\`.localdatetime.hour , minute: \`user_to_relation\`.localdatetime.minute , second: \`user_to_relation\`.localdatetime.second , millisecond: \`user_to_relation\`.localdatetime.millisecond , microsecond: \`user_to_relation\`.localdatetime.microsecond , nanosecond: \`user_to_relation\`.localdatetime.nanosecond , formatted: toString(\`user_to_relation\`.localdatetime) },User: user_to {_id: ID(\`user_to\`), .userId ,rated: [(\`user_to\`)-[\`user_to_rated_relation\`:\`RATED\`]->(:\`Movie\`${ADDITIONAL_MOVIE_LABELS}) | user_to_rated_relation {datetime: { year: \`user_to_rated_relation\`.datetime.year }}] } }] } } AS \`user\``,
    expectedParams = {
      offset: 0,
      first: -1,
      '1_time': {
        hour: 10,
        minute: 30,
        second: 1,
        millisecond: 2,
        microsecond: 2003,
        nanosecond: 2003004,
        timezone: '-08:00',
        formatted: '10:30:01.002003004-08:00'
      },
      '1_date': {
        year: 2018,
        month: 11,
        day: 23
      },
      '1_datetime': {
        year: 2018,
        month: 11,
        day: 23,
        hour: 10,
        minute: 30,
        second: 1,
        millisecond: 2,
        microsecond: 2003,
        nanosecond: 2003004,
        timezone: 'America/Los_Angeles'
      },
      '1_localtime': {
        hour: 10,
        minute: 30,
        second: 1,
        millisecond: 2,
        microsecond: 2003,
        nanosecond: 2003004
      },
      '1_localdatetime': {
        year: 2018,
        month: 11,
        day: 23,
        hour: 10,
        minute: 30,
        second: 1,
        millisecond: 2,
        microsecond: 2003,
        nanosecond: 2003004
      },
      '3_time': {
        hour: 10,
        minute: 30,
        second: 1,
        millisecond: 2,
        microsecond: 2003,
        nanosecond: 2003004,
        timezone: '-08:00',
        formatted: '10:30:01.002003004-08:00'
      },
      '3_date': {
        year: 2018,
        month: 11,
        day: 23
      },
      '3_datetime': {
        year: 2018,
        month: 11,
        day: 23,
        hour: 10,
        minute: 30,
        second: 1,
        millisecond: 2,
        microsecond: 2003,
        nanosecond: 2003004,
        timezone: 'America/Los_Angeles'
      },
      '3_localtime': {
        hour: 10,
        minute: 30,
        second: 1,
        millisecond: 2,
        microsecond: 2003,
        nanosecond: 2003004
      },
      '3_localdatetime': {
        year: 2018,
        month: 11,
        day: 23,
        hour: 10,
        minute: 30,
        second: 1,
        millisecond: 2,
        microsecond: 2003,
        nanosecond: 2003004
      },
      cypherParams: CYPHER_PARAMS
    };

  t.plan(2);
  return augmentedSchemaCypherTestRunner(
    t,
    graphQLQuery,
    {},
    expectedCypherQuery,
    expectedParams
  );
});

test('Query nested temporal properties on relationships using temporal arguments', t => {
  const graphQLQuery = `query {
    Movie {
      _id
      title
      ratings(
        rating: 5
        time: {
          hour: 10
          minute: 30
          second: 1
          millisecond: 2
          microsecond: 2003
          nanosecond: 2003004
          timezone: "-08:00"
          formatted: "10:30:01.002003004-08:00"
        }
        date: { year: 2017, month: 11, day: 23 }
        datetime: {
          year: 2020
          month: 11
          day: 23
          hour: 10
          minute: 30
          second: 1
          millisecond: 2
          microsecond: 2003
          nanosecond: 2003004
          timezone: "America/Los_Angeles"
        }
        localtime: {
          hour: 10
          minute: 30
          second: 1
          millisecond: 2
          microsecond: 2003
          nanosecond: 2003004
        }
        localdatetime: {
          year: 2018
          month: 11
          day: 23
          hour: 10
          minute: 30
          second: 1
          millisecond: 2
          microsecond: 2003
          nanosecond: 2003004
        }
      ) {
        rating
        time {
          hour
          minute
          second
          millisecond
          microsecond
          nanosecond
          timezone
          formatted
        }
        date {
          year
          month
          day
          formatted
        }
        datetime {
          year
          month
          day
          hour
          minute
          second
          millisecond
          microsecond
          nanosecond
          timezone
          formatted
        }
        localtime {
          hour
          minute
          second
          millisecond
          microsecond
          nanosecond
          formatted
        }
        localdatetime {
          year
          month
          day
          hour
          minute
          second
          millisecond
          microsecond
          nanosecond
          formatted
        }
        User {
          _id
          name
          rated(
            rating: 5
            time: {
              formatted: "10:30:01.002003004-08:00"
            }
            datetime: {
              year: 2020
            }
          ) {
            rating
            time {
              hour
              minute
              second
              millisecond
              microsecond
              nanosecond
              timezone
              formatted
            }
            date {
              year
              month
              day
              formatted
            }
            datetime {
              year
              month
              day
              hour
              minute
              second
              millisecond
              microsecond
              nanosecond
              timezone
              formatted
            }
            localtime {
              hour
              minute
              second
              millisecond
              microsecond
              nanosecond
              formatted
            }
            localdatetime {
              year
              month
              day
              hour
              minute
              second
              millisecond
              microsecond
              nanosecond
              formatted
            }
          }
        }
      }
    }
  }`,
    expectedCypherQuery = `MATCH (\`movie\`:\`Movie\`${ADDITIONAL_MOVIE_LABELS}) RETURN \`movie\` {_id: ID(\`movie\`), .title ,ratings: [(\`movie\`)<-[\`movie_ratings_relation\`:\`RATED\`{rating:$1_rating}]-(:\`User\`) WHERE movie_ratings_relation.time = time($1_time.formatted) AND movie_ratings_relation.date.year = $1_date.year AND movie_ratings_relation.date.month = $1_date.month AND movie_ratings_relation.date.day = $1_date.day AND movie_ratings_relation.datetime.year = $1_datetime.year AND movie_ratings_relation.datetime.month = $1_datetime.month AND movie_ratings_relation.datetime.day = $1_datetime.day AND movie_ratings_relation.datetime.hour = $1_datetime.hour AND movie_ratings_relation.datetime.minute = $1_datetime.minute AND movie_ratings_relation.datetime.second = $1_datetime.second AND movie_ratings_relation.datetime.millisecond = $1_datetime.millisecond AND movie_ratings_relation.datetime.microsecond = $1_datetime.microsecond AND movie_ratings_relation.datetime.nanosecond = $1_datetime.nanosecond AND movie_ratings_relation.datetime.timezone = $1_datetime.timezone AND movie_ratings_relation.localtime.hour = $1_localtime.hour AND movie_ratings_relation.localtime.minute = $1_localtime.minute AND movie_ratings_relation.localtime.second = $1_localtime.second AND movie_ratings_relation.localtime.millisecond = $1_localtime.millisecond AND movie_ratings_relation.localtime.microsecond = $1_localtime.microsecond AND movie_ratings_relation.localtime.nanosecond = $1_localtime.nanosecond AND movie_ratings_relation.localdatetime.year = $1_localdatetime.year AND movie_ratings_relation.localdatetime.month = $1_localdatetime.month AND movie_ratings_relation.localdatetime.day = $1_localdatetime.day AND movie_ratings_relation.localdatetime.hour = $1_localdatetime.hour AND movie_ratings_relation.localdatetime.minute = $1_localdatetime.minute AND movie_ratings_relation.localdatetime.second = $1_localdatetime.second AND movie_ratings_relation.localdatetime.millisecond = $1_localdatetime.millisecond AND movie_ratings_relation.localdatetime.microsecond = $1_localdatetime.microsecond AND movie_ratings_relation.localdatetime.nanosecond = $1_localdatetime.nanosecond | movie_ratings_relation { .rating ,time: { hour: \`movie_ratings_relation\`.time.hour , minute: \`movie_ratings_relation\`.time.minute , second: \`movie_ratings_relation\`.time.second , millisecond: \`movie_ratings_relation\`.time.millisecond , microsecond: \`movie_ratings_relation\`.time.microsecond , nanosecond: \`movie_ratings_relation\`.time.nanosecond , timezone: \`movie_ratings_relation\`.time.timezone , formatted: toString(\`movie_ratings_relation\`.time) },date: { year: \`movie_ratings_relation\`.date.year , month: \`movie_ratings_relation\`.date.month , day: \`movie_ratings_relation\`.date.day , formatted: toString(\`movie_ratings_relation\`.date) },datetime: { year: \`movie_ratings_relation\`.datetime.year , month: \`movie_ratings_relation\`.datetime.month , day: \`movie_ratings_relation\`.datetime.day , hour: \`movie_ratings_relation\`.datetime.hour , minute: \`movie_ratings_relation\`.datetime.minute , second: \`movie_ratings_relation\`.datetime.second , millisecond: \`movie_ratings_relation\`.datetime.millisecond , microsecond: \`movie_ratings_relation\`.datetime.microsecond , nanosecond: \`movie_ratings_relation\`.datetime.nanosecond , timezone: \`movie_ratings_relation\`.datetime.timezone , formatted: toString(\`movie_ratings_relation\`.datetime) },localtime: { hour: \`movie_ratings_relation\`.localtime.hour , minute: \`movie_ratings_relation\`.localtime.minute , second: \`movie_ratings_relation\`.localtime.second , millisecond: \`movie_ratings_relation\`.localtime.millisecond , microsecond: \`movie_ratings_relation\`.localtime.microsecond , nanosecond: \`movie_ratings_relation\`.localtime.nanosecond , formatted: toString(\`movie_ratings_relation\`.localtime) },localdatetime: { year: \`movie_ratings_relation\`.localdatetime.year , month: \`movie_ratings_relation\`.localdatetime.month , day: \`movie_ratings_relation\`.localdatetime.day , hour: \`movie_ratings_relation\`.localdatetime.hour , minute: \`movie_ratings_relation\`.localdatetime.minute , second: \`movie_ratings_relation\`.localdatetime.second , millisecond: \`movie_ratings_relation\`.localdatetime.millisecond , microsecond: \`movie_ratings_relation\`.localdatetime.microsecond , nanosecond: \`movie_ratings_relation\`.localdatetime.nanosecond , formatted: toString(\`movie_ratings_relation\`.localdatetime) },User: head([(:\`Movie\`${ADDITIONAL_MOVIE_LABELS})<-[\`movie_ratings_relation\`]-(\`movie_ratings_User\`:\`User\`) | movie_ratings_User {_id: ID(\`movie_ratings_User\`), .name ,rated: [(\`movie_ratings_User\`)-[\`movie_ratings_User_rated_relation\`:\`RATED\`{rating:$2_rating}]->(:\`Movie\`${ADDITIONAL_MOVIE_LABELS}) WHERE movie_ratings_User_rated_relation.time = time($2_time.formatted) AND movie_ratings_User_rated_relation.datetime.year = $2_datetime.year | movie_ratings_User_rated_relation { .rating ,time: { hour: \`movie_ratings_User_rated_relation\`.time.hour , minute: \`movie_ratings_User_rated_relation\`.time.minute , second: \`movie_ratings_User_rated_relation\`.time.second , millisecond: \`movie_ratings_User_rated_relation\`.time.millisecond , microsecond: \`movie_ratings_User_rated_relation\`.time.microsecond , nanosecond: \`movie_ratings_User_rated_relation\`.time.nanosecond , timezone: \`movie_ratings_User_rated_relation\`.time.timezone , formatted: toString(\`movie_ratings_User_rated_relation\`.time) },date: { year: \`movie_ratings_User_rated_relation\`.date.year , month: \`movie_ratings_User_rated_relation\`.date.month , day: \`movie_ratings_User_rated_relation\`.date.day , formatted: toString(\`movie_ratings_User_rated_relation\`.date) },datetime: { year: \`movie_ratings_User_rated_relation\`.datetime.year , month: \`movie_ratings_User_rated_relation\`.datetime.month , day: \`movie_ratings_User_rated_relation\`.datetime.day , hour: \`movie_ratings_User_rated_relation\`.datetime.hour , minute: \`movie_ratings_User_rated_relation\`.datetime.minute , second: \`movie_ratings_User_rated_relation\`.datetime.second , millisecond: \`movie_ratings_User_rated_relation\`.datetime.millisecond , microsecond: \`movie_ratings_User_rated_relation\`.datetime.microsecond , nanosecond: \`movie_ratings_User_rated_relation\`.datetime.nanosecond , timezone: \`movie_ratings_User_rated_relation\`.datetime.timezone , formatted: toString(\`movie_ratings_User_rated_relation\`.datetime) },localtime: { hour: \`movie_ratings_User_rated_relation\`.localtime.hour , minute: \`movie_ratings_User_rated_relation\`.localtime.minute , second: \`movie_ratings_User_rated_relation\`.localtime.second , millisecond: \`movie_ratings_User_rated_relation\`.localtime.millisecond , microsecond: \`movie_ratings_User_rated_relation\`.localtime.microsecond , nanosecond: \`movie_ratings_User_rated_relation\`.localtime.nanosecond , formatted: toString(\`movie_ratings_User_rated_relation\`.localtime) },localdatetime: { year: \`movie_ratings_User_rated_relation\`.localdatetime.year , month: \`movie_ratings_User_rated_relation\`.localdatetime.month , day: \`movie_ratings_User_rated_relation\`.localdatetime.day , hour: \`movie_ratings_User_rated_relation\`.localdatetime.hour , minute: \`movie_ratings_User_rated_relation\`.localdatetime.minute , second: \`movie_ratings_User_rated_relation\`.localdatetime.second , millisecond: \`movie_ratings_User_rated_relation\`.localdatetime.millisecond , microsecond: \`movie_ratings_User_rated_relation\`.localdatetime.microsecond , nanosecond: \`movie_ratings_User_rated_relation\`.localdatetime.nanosecond , formatted: toString(\`movie_ratings_User_rated_relation\`.localdatetime) }}] }]) }] } AS \`movie\``,
    expectedParams = {
      offset: 0,
      first: -1,
      '1_rating': 5,
      '1_time': {
        hour: 10,
        minute: 30,
        second: 1,
        millisecond: 2,
        microsecond: 2003,
        nanosecond: 2003004,
        timezone: '-08:00',
        formatted: '10:30:01.002003004-08:00'
      },
      '1_date': {
        year: 2017,
        month: 11,
        day: 23
      },
      '1_datetime': {
        year: 2020,
        month: 11,
        day: 23,
        hour: 10,
        minute: 30,
        second: 1,
        millisecond: 2,
        microsecond: 2003,
        nanosecond: 2003004,
        timezone: 'America/Los_Angeles'
      },
      '1_localtime': {
        hour: 10,
        minute: 30,
        second: 1,
        millisecond: 2,
        microsecond: 2003,
        nanosecond: 2003004
      },
      '1_localdatetime': {
        year: 2018,
        month: 11,
        day: 23,
        hour: 10,
        minute: 30,
        second: 1,
        millisecond: 2,
        microsecond: 2003,
        nanosecond: 2003004
      },
      '2_rating': 5,
      '2_time': {
        formatted: '10:30:01.002003004-08:00'
      },
      '2_datetime': {
        year: 2020
      },
      cypherParams: CYPHER_PARAMS
    };

  t.plan(2);
  return augmentedSchemaCypherTestRunner(
    t,
    graphQLQuery,
    {},
    expectedCypherQuery,
    expectedParams
  );
});

test('Query nested list properties on relationship', t => {
  const graphQLQuery = `query {
    Movie {
      _id
      title
      ratings {
        rating
        ratings
        time {
          hour
          minute
          second
          millisecond
          microsecond
          nanosecond
          timezone
          formatted
        }
        date {
          year
          month
          day
          formatted
        }
        datetime {
          year
          month
          day
          hour
          minute
          second
          millisecond
          microsecond
          nanosecond
          timezone
          formatted
        }
        datetimes {
          year
          month
          day
          hour
          minute
          second
          millisecond
          microsecond
          nanosecond
          timezone
          formatted
        }
        localtime {
          hour
          minute
          second
          millisecond
          microsecond
          nanosecond
          formatted
        }
        localdatetime {
          year
          month
          day
          hour
          minute
          second
          millisecond
          microsecond
          nanosecond
          formatted
        }
        User {
          _id
          name
          rated {
            rating
            time {
              hour
              minute
              second
              millisecond
              microsecond
              nanosecond
              timezone
              formatted
            }
            date {
              year
              month
              day
              formatted
            }
            datetime {
              year
              month
              day
              hour
              minute
              second
              millisecond
              microsecond
              nanosecond
              timezone
              formatted
            }
            datetimes {
              year
              month
              day
              hour
              minute
              second
              millisecond
              microsecond
              nanosecond
              timezone
              formatted
            }
            localtime {
              hour
              minute
              second
              millisecond
              microsecond
              nanosecond
              formatted
            }
            localdatetime {
              year
              month
              day
              hour
              minute
              second
              millisecond
              microsecond
              nanosecond
              formatted
            }
          }
        }
      }
    }
  }`,
    expectedCypherQuery = `MATCH (\`movie\`:\`Movie\`${ADDITIONAL_MOVIE_LABELS}) RETURN \`movie\` {_id: ID(\`movie\`), .title ,ratings: [(\`movie\`)<-[\`movie_ratings_relation\`:\`RATED\`]-(:\`User\`) | movie_ratings_relation { .rating , .ratings ,time: { hour: \`movie_ratings_relation\`.time.hour , minute: \`movie_ratings_relation\`.time.minute , second: \`movie_ratings_relation\`.time.second , millisecond: \`movie_ratings_relation\`.time.millisecond , microsecond: \`movie_ratings_relation\`.time.microsecond , nanosecond: \`movie_ratings_relation\`.time.nanosecond , timezone: \`movie_ratings_relation\`.time.timezone , formatted: toString(\`movie_ratings_relation\`.time) },date: { year: \`movie_ratings_relation\`.date.year , month: \`movie_ratings_relation\`.date.month , day: \`movie_ratings_relation\`.date.day , formatted: toString(\`movie_ratings_relation\`.date) },datetime: { year: \`movie_ratings_relation\`.datetime.year , month: \`movie_ratings_relation\`.datetime.month , day: \`movie_ratings_relation\`.datetime.day , hour: \`movie_ratings_relation\`.datetime.hour , minute: \`movie_ratings_relation\`.datetime.minute , second: \`movie_ratings_relation\`.datetime.second , millisecond: \`movie_ratings_relation\`.datetime.millisecond , microsecond: \`movie_ratings_relation\`.datetime.microsecond , nanosecond: \`movie_ratings_relation\`.datetime.nanosecond , timezone: \`movie_ratings_relation\`.datetime.timezone , formatted: toString(\`movie_ratings_relation\`.datetime) },datetimes: reduce(a = [], INSTANCE IN movie_ratings_relation.datetimes | a + { year: INSTANCE.year , month: INSTANCE.month , day: INSTANCE.day , hour: INSTANCE.hour , minute: INSTANCE.minute , second: INSTANCE.second , millisecond: INSTANCE.millisecond , microsecond: INSTANCE.microsecond , nanosecond: INSTANCE.nanosecond , timezone: INSTANCE.timezone , formatted: toString(INSTANCE) }),localtime: { hour: \`movie_ratings_relation\`.localtime.hour , minute: \`movie_ratings_relation\`.localtime.minute , second: \`movie_ratings_relation\`.localtime.second , millisecond: \`movie_ratings_relation\`.localtime.millisecond , microsecond: \`movie_ratings_relation\`.localtime.microsecond , nanosecond: \`movie_ratings_relation\`.localtime.nanosecond , formatted: toString(\`movie_ratings_relation\`.localtime) },localdatetime: { year: \`movie_ratings_relation\`.localdatetime.year , month: \`movie_ratings_relation\`.localdatetime.month , day: \`movie_ratings_relation\`.localdatetime.day , hour: \`movie_ratings_relation\`.localdatetime.hour , minute: \`movie_ratings_relation\`.localdatetime.minute , second: \`movie_ratings_relation\`.localdatetime.second , millisecond: \`movie_ratings_relation\`.localdatetime.millisecond , microsecond: \`movie_ratings_relation\`.localdatetime.microsecond , nanosecond: \`movie_ratings_relation\`.localdatetime.nanosecond , formatted: toString(\`movie_ratings_relation\`.localdatetime) },User: head([(:\`Movie\`${ADDITIONAL_MOVIE_LABELS})<-[\`movie_ratings_relation\`]-(\`movie_ratings_User\`:\`User\`) | movie_ratings_User {_id: ID(\`movie_ratings_User\`), .name ,rated: [(\`movie_ratings_User\`)-[\`movie_ratings_User_rated_relation\`:\`RATED\`]->(:\`Movie\`${ADDITIONAL_MOVIE_LABELS}) | movie_ratings_User_rated_relation { .rating ,time: { hour: \`movie_ratings_User_rated_relation\`.time.hour , minute: \`movie_ratings_User_rated_relation\`.time.minute , second: \`movie_ratings_User_rated_relation\`.time.second , millisecond: \`movie_ratings_User_rated_relation\`.time.millisecond , microsecond: \`movie_ratings_User_rated_relation\`.time.microsecond , nanosecond: \`movie_ratings_User_rated_relation\`.time.nanosecond , timezone: \`movie_ratings_User_rated_relation\`.time.timezone , formatted: toString(\`movie_ratings_User_rated_relation\`.time) },date: { year: \`movie_ratings_User_rated_relation\`.date.year , month: \`movie_ratings_User_rated_relation\`.date.month , day: \`movie_ratings_User_rated_relation\`.date.day , formatted: toString(\`movie_ratings_User_rated_relation\`.date) },datetime: { year: \`movie_ratings_User_rated_relation\`.datetime.year , month: \`movie_ratings_User_rated_relation\`.datetime.month , day: \`movie_ratings_User_rated_relation\`.datetime.day , hour: \`movie_ratings_User_rated_relation\`.datetime.hour , minute: \`movie_ratings_User_rated_relation\`.datetime.minute , second: \`movie_ratings_User_rated_relation\`.datetime.second , millisecond: \`movie_ratings_User_rated_relation\`.datetime.millisecond , microsecond: \`movie_ratings_User_rated_relation\`.datetime.microsecond , nanosecond: \`movie_ratings_User_rated_relation\`.datetime.nanosecond , timezone: \`movie_ratings_User_rated_relation\`.datetime.timezone , formatted: toString(\`movie_ratings_User_rated_relation\`.datetime) },datetimes: reduce(a = [], INSTANCE IN movie_ratings_User_rated_relation.datetimes | a + { year: INSTANCE.year , month: INSTANCE.month , day: INSTANCE.day , hour: INSTANCE.hour , minute: INSTANCE.minute , second: INSTANCE.second , millisecond: INSTANCE.millisecond , microsecond: INSTANCE.microsecond , nanosecond: INSTANCE.nanosecond , timezone: INSTANCE.timezone , formatted: toString(INSTANCE) }),localtime: { hour: \`movie_ratings_User_rated_relation\`.localtime.hour , minute: \`movie_ratings_User_rated_relation\`.localtime.minute , second: \`movie_ratings_User_rated_relation\`.localtime.second , millisecond: \`movie_ratings_User_rated_relation\`.localtime.millisecond , microsecond: \`movie_ratings_User_rated_relation\`.localtime.microsecond , nanosecond: \`movie_ratings_User_rated_relation\`.localtime.nanosecond , formatted: toString(\`movie_ratings_User_rated_relation\`.localtime) },localdatetime: { year: \`movie_ratings_User_rated_relation\`.localdatetime.year , month: \`movie_ratings_User_rated_relation\`.localdatetime.month , day: \`movie_ratings_User_rated_relation\`.localdatetime.day , hour: \`movie_ratings_User_rated_relation\`.localdatetime.hour , minute: \`movie_ratings_User_rated_relation\`.localdatetime.minute , second: \`movie_ratings_User_rated_relation\`.localdatetime.second , millisecond: \`movie_ratings_User_rated_relation\`.localdatetime.millisecond , microsecond: \`movie_ratings_User_rated_relation\`.localdatetime.microsecond , nanosecond: \`movie_ratings_User_rated_relation\`.localdatetime.nanosecond , formatted: toString(\`movie_ratings_User_rated_relation\`.localdatetime) }}] }]) }] } AS \`movie\``,
    expectedParams = {
      offset: 0,
      first: -1,
      cypherParams: CYPHER_PARAMS
    };

  t.plan(2);
  return augmentedSchemaCypherTestRunner(
    t,
    graphQLQuery,
    {},
    expectedCypherQuery,
    expectedParams
  );
});

test('UUID value generated if no id value provided', t => {
  const graphQLQuery = `mutation {
    CreateMovie(title: "Yo Dawg", released: {year: 2009, month: 6, day: 9}) {
      title
    }
  }`,
    expectedCypherQuery = `
    CREATE (\`movie\`:\`Movie\`${ADDITIONAL_MOVIE_LABELS}:\`MovieSearch\` {movieId: apoc.create.uuid(),title:$params.title,released: datetime($params.released)})
    RETURN \`movie\` { .title } AS \`movie\`
  `,
    expectedParams = {
      params: {
        title: 'Yo Dawg',
        released: {
          year: {
            low: 2009,
            high: 0
          },
          month: {
            low: 6,
            high: 0
          },
          day: {
            low: 9,
            high: 0
          }
        }
      },
      first: -1,
      offset: 0
    };

  t.plan(2);
  return augmentedSchemaCypherTestRunner(
    t,
    graphQLQuery,
    {},
    expectedCypherQuery,
    expectedParams
  );
});

test('Create node with list arguments', t => {
  const graphQLQuery = `mutation {
    CreateMovie(
      title: "River Runs Through It, A"
      titles: ["A", "B"]
      imdbRatings: [5.5, 8.95]
      years: [2004, 2018]
      booleans: [false, true]
      enums: [Science]
      year: 2020
      released: {year: 1992, month: 10, day: 9}
      releases: [
        {
          year: 2020
          month: 11
          day: 23
          hour: 10
          minute: 30
          second: 1
          millisecond: 2
          microsecond: 3
          nanosecond: 4
          timezone: "America/Los_Angeles"
        },
        {
          formatted: "2020-11-23T10:30:01.002003004-08:00[America/Los_Angeles]"
        }
      ]
      locations: [
        {
          x: 10,
          y: 20,
          z: 30
        },
        {
          x: 30,
          y: 20,
          z: 10
        }
      ]
    ) {
      movieId
      title
      titles
      imdbRatings
      years
      releases {
        year
        month
        day
        hour
        second
        formatted
      }
      locations {
        x
        y
        z
      }
    }
  }`,
    expectedCypherQuery = `
    CREATE (\`movie\`:\`Movie\`${ADDITIONAL_MOVIE_LABELS}:\`MovieSearch\` {movieId: apoc.create.uuid(),title:$params.title,year:$params.year,released: datetime($params.released),locations: [value IN $params.locations | point(value)],years:$params.years,titles:$params.titles,imdbRatings:$params.imdbRatings,releases: [value IN $params.releases | datetime(value)],booleans:$params.booleans,enums:$params.enums})
    RETURN \`movie\` { .movieId , .title , .titles , .imdbRatings , .years ,releases: reduce(a = [], INSTANCE IN movie.releases | a + { year: INSTANCE.year , month: INSTANCE.month , day: INSTANCE.day , hour: INSTANCE.hour , second: INSTANCE.second , formatted: toString(INSTANCE) }),locations: reduce(a = [], INSTANCE IN movie.locations | a + { x: INSTANCE.x , y: INSTANCE.y , z: INSTANCE.z })} AS \`movie\`
  `,
    expectedParams = {
      offset: 0,
      first: -1,
      params: {
        title: 'River Runs Through It, A',
        year: {
          low: 2020,
          high: 0
        },
        released: {
          year: {
            low: 1992,
            high: 0
          },
          month: {
            low: 10,
            high: 0
          },
          day: {
            low: 9,
            high: 0
          }
        },
        locations: [
          {
            x: 10,
            y: 20,
            z: 30
          },
          {
            x: 30,
            y: 20,
            z: 10
          }
        ],
        years: [
          {
            low: 2004,
            high: 0
          },
          {
            low: 2018,
            high: 0
          }
        ],
        titles: ['A', 'B'],
        imdbRatings: [5.5, 8.95],
        releases: [
          {
            year: {
              low: 2020,
              high: 0
            },
            month: {
              low: 11,
              high: 0
            },
            day: {
              low: 23,
              high: 0
            },
            hour: {
              low: 10,
              high: 0
            },
            minute: {
              low: 30,
              high: 0
            },
            second: {
              low: 1,
              high: 0
            },
            millisecond: {
              low: 2,
              high: 0
            },
            microsecond: {
              low: 3,
              high: 0
            },
            nanosecond: {
              low: 4,
              high: 0
            },
            timezone: 'America/Los_Angeles'
          },
          '2020-11-23T10:30:01.002003004-08:00[America/Los_Angeles]'
        ],
        booleans: [false, true],
        enums: ['Science']
      }
    };

  t.plan(4);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, expectedParams),
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('Query list properties on node type using list arguments', t => {
  const graphQLQuery = `query {
    Movie(
      titles: ["A"]
      imdbRatings: [8.95]
      years: [2004]
      booleans: true
      enums: [Mystery, Science]
      releases: [
        {
          year: 2020
          month: 11
          day: 23
        },
        {
          formatted: "2030-10-23T10:30:01.002003004-08:00[America/Los_Angeles]"
        }
      ],
      locations: {
        x: 10
        y: 20
        z: 30
      }
    ) {
      _id
      locations {
        x
        y
        z
        srid
      }
      releases {
        year
        month
        day
        formatted
      }
      titles
      imdbRatings
      years
      booleans
    }
  }
  `,
    expectedCypherQuery = `MATCH (\`movie\`:\`Movie\`${ADDITIONAL_MOVIE_LABELS}) WHERE [value IN $locations WHERE [prop IN \`movie\`.\`locations\` WHERE ((value.x IS NULL OR prop.x = value.x) AND (value.y IS NULL OR prop.y = value.y) AND (value.z IS NULL OR prop.z = value.z))]] AND [value IN $years WHERE value IN \`movie\`.\`years\`] AND [value IN $titles WHERE value IN \`movie\`.\`titles\`] AND [value IN $imdbRatings WHERE value IN \`movie\`.\`imdbRatings\`] AND [value IN $releases WHERE [prop IN \`movie\`.\`releases\` WHERE ((value.year IS NULL OR prop.year = value.year) AND (value.month IS NULL OR prop.month = value.month) AND (value.day IS NULL OR prop.day = value.day) AND (value.formatted IS NULL OR prop = datetime(value.formatted)))]] AND [value IN $booleans WHERE value IN \`movie\`.\`booleans\`] AND [value IN $enums WHERE value IN \`movie\`.\`enums\`] RETURN \`movie\` {_id: ID(\`movie\`),locations: reduce(a = [], INSTANCE IN movie.locations | a + { x: INSTANCE.x , y: INSTANCE.y , z: INSTANCE.z , srid: INSTANCE.srid }),releases: reduce(a = [], INSTANCE IN movie.releases | a + { year: INSTANCE.year , month: INSTANCE.month , day: INSTANCE.day , formatted: toString(INSTANCE) }), .titles , .imdbRatings , .years , .booleans } AS \`movie\``,
    expectedParams = {
      offset: 0,
      first: -1,
      locations: [
        {
          x: 10,
          y: 20,
          z: 30
        }
      ],
      years: [2004],
      titles: ['A'],
      imdbRatings: [8.95],
      releases: [
        {
          year: 2020,
          month: 11,
          day: 23
        },
        {
          formatted: '2030-10-23T10:30:01.002003004-08:00[America/Los_Angeles]'
        }
      ],
      booleans: [true],
      enums: ['Mystery', 'Science'],
      cypherParams: CYPHER_PARAMS
    };

  t.plan(4);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, expectedParams),
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('Query list properties on nested node type using list arguments', t => {
  const graphQLQuery = `query {
    Movie {
      _id
      year
      actors(
        strings: ["B"],
        datetimes: [
          {
            year: 2020,
            month: 11,
            day: 23,
          },
          {
            formatted: "2018-11-23T10:30:01.002003004-08:00[America/Los_Angeles]"
          }
        ]
      ) {
        name
      }
    }
  }
  `,
    expectedCypherQuery = `MATCH (\`movie\`:\`Movie\`${ADDITIONAL_MOVIE_LABELS}) RETURN \`movie\` {_id: ID(\`movie\`), .year ,actors: [(\`movie\`)<-[:\`ACTED_IN\`]-(\`movie_actors\`:\`Actor\`) WHERE [value IN $1_strings WHERE value IN \`movie_actors\`.\`strings\`] AND [value IN $1_datetimes WHERE [prop IN \`movie_actors\`.\`datetimes\` WHERE ((value.year IS NULL OR prop.year = value.year) AND (value.month IS NULL OR prop.month = value.month) AND (value.day IS NULL OR prop.day = value.day) AND (value.formatted IS NULL OR prop = datetime(value.formatted)))]] | \`movie_actors\` { .name }] } AS \`movie\``,
    expectedParams = {
      offset: 0,
      first: -1,
      '1_strings': ['B'],
      '1_datetimes': [
        {
          year: 2020,
          month: 11,
          day: 23
        },
        {
          formatted: '2018-11-23T10:30:01.002003004-08:00[America/Los_Angeles]'
        }
      ],
      cypherParams: CYPHER_PARAMS
    };

  t.plan(4);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, expectedParams),
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('Query list properties on relationship type field using list arguments', t => {
  const graphQLQuery = `query {
    Movie {
      _id
      year
      ratings(
        ratings: [12, 20]
        datetimes: [
          {
            year: 2019,
            month: 12,
            day: 23,
          },
          {
            formatted: "2018-10-23T00:00:00Z"
          }
        ]
      ) {      
        ratings
        datetimes {
          year
          month
          day
          formatted        
        }
      }
    }
  }
  `,
    expectedCypherQuery = `MATCH (\`movie\`:\`Movie\`${ADDITIONAL_MOVIE_LABELS}) RETURN \`movie\` {_id: ID(\`movie\`), .year ,ratings: [(\`movie\`)<-[\`movie_ratings_relation\`:\`RATED\`]-(:\`User\`) WHERE [value IN $1_ratings WHERE value IN \`movie_ratings_relation\`.\`ratings\`] AND [value IN $1_datetimes WHERE [prop IN \`movie_ratings_relation\`.\`datetimes\` WHERE ((value.year IS NULL OR prop.year = value.year) AND (value.month IS NULL OR prop.month = value.month) AND (value.day IS NULL OR prop.day = value.day) AND (value.formatted IS NULL OR prop = datetime(value.formatted)))]] | movie_ratings_relation { .ratings ,datetimes: reduce(a = [], INSTANCE IN movie_ratings_relation.datetimes | a + { year: INSTANCE.year , month: INSTANCE.month , day: INSTANCE.day , formatted: toString(INSTANCE) })}] } AS \`movie\``,
    expectedParams = {
      offset: 0,
      first: -1,
      '1_ratings': [12, 20],
      '1_datetimes': [
        {
          year: 2019,
          month: 12,
          day: 23
        },
        {
          formatted: '2018-10-23T00:00:00Z'
        }
      ],
      cypherParams: CYPHER_PARAMS
    };

  t.plan(2);
  return augmentedSchemaCypherTestRunner(
    t,
    graphQLQuery,
    {},
    expectedCypherQuery,
    expectedParams
  );
});

test('Query list properties on reflexive relationship type field using list arguments', t => {
  const graphQLQuery = `query {
    User {
      friends {
        to(
	        ratings: ["B"]
          datetimes: [
            {
              year: 2018,
              month: 10,
              day: 23,
            },
            {
              formatted: "2020-11-23T00:00:00Z"
            }
          ]
        ) {
          _id
          ratings
          datetimes {
            year
            month
            day
            formatted        
          }          
        }
        from(
	        ratings: ["A"]
          datetimes: [
            {
              year: 2018,
              month: 10,
              day: 23,
            },
            {
              formatted: "2020-11-23T00:00:00Z"
            }
          ]
        ) {
          _id
          ratings
          datetimes {
            year
            month
            day
            formatted        
          }          
        }
      }
    }
  }
  `,
    expectedCypherQuery = `MATCH (\`user\`:\`User\`) RETURN \`user\` {friends: {to: [(\`user\`)-[\`user_to_relation\`:\`FRIEND_OF\`]->(\`user_to\`:\`User\`) WHERE [value IN $1_ratings WHERE value IN \`user_to_relation\`.\`ratings\`] AND [value IN $1_datetimes WHERE [prop IN \`user_to_relation\`.\`datetimes\` WHERE ((value.year IS NULL OR prop.year = value.year) AND (value.month IS NULL OR prop.month = value.month) AND (value.day IS NULL OR prop.day = value.day) AND (value.formatted IS NULL OR prop = datetime(value.formatted)))]] | user_to_relation {_id: ID(\`user_to_relation\`), .ratings ,datetimes: reduce(a = [], INSTANCE IN user_to_relation.datetimes | a + { year: INSTANCE.year , month: INSTANCE.month , day: INSTANCE.day , formatted: toString(INSTANCE) })}] ,from: [(\`user\`)<-[\`user_from_relation\`:\`FRIEND_OF\`]-(\`user_from\`:\`User\`) WHERE [value IN $3_ratings WHERE value IN \`user_from_relation\`.\`ratings\`] AND [value IN $3_datetimes WHERE [prop IN \`user_from_relation\`.\`datetimes\` WHERE ((value.year IS NULL OR prop.year = value.year) AND (value.month IS NULL OR prop.month = value.month) AND (value.day IS NULL OR prop.day = value.day) AND (value.formatted IS NULL OR prop = datetime(value.formatted)))]] | user_from_relation {_id: ID(\`user_from_relation\`), .ratings ,datetimes: reduce(a = [], INSTANCE IN user_from_relation.datetimes | a + { year: INSTANCE.year , month: INSTANCE.month , day: INSTANCE.day , formatted: toString(INSTANCE) })}] } } AS \`user\``,
    expectedParams = {
      offset: 0,
      first: -1,
      '1_ratings': ['B'],
      '1_datetimes': [
        {
          year: 2018,
          month: 10,
          day: 23
        },
        {
          formatted: '2020-11-23T00:00:00Z'
        }
      ],
      '3_ratings': ['A'],
      '3_datetimes': [
        {
          year: 2018,
          month: 10,
          day: 23
        },
        {
          formatted: '2020-11-23T00:00:00Z'
        }
      ],
      cypherParams: CYPHER_PARAMS
    };

  t.plan(2);
  return augmentedSchemaCypherTestRunner(
    t,
    graphQLQuery,
    {},
    expectedCypherQuery,
    expectedParams
  );
});

test('Custom query for non-list property on node type using list argument', t => {
  const graphQLQuery = `query {
      MoviesByYears(
        year: [2020]
        released: [
          {
            year: 1992
            month: 10
            day: 9
          },
          {
            formatted: "2030-10-23T10:30:01.002003004-08:00[America/Los_Angeles]"
          }
        ]
      ) {
        _id
        year
        released {
          formatted
        }
      }
    }
    `,
    expectedCypherQuery = `MATCH (\`movie\`:\`Movie\`${ADDITIONAL_MOVIE_LABELS}) WHERE \`movie\`.\`year\` IN $year AND [value IN $released WHERE ((value.year IS NULL OR \`movie\`.\`released\`.year = value.year) AND (value.month IS NULL OR \`movie\`.\`released\`.month = value.month) AND (value.day IS NULL OR \`movie\`.\`released\`.day = value.day) AND (value.formatted IS NULL OR \`movie\`.\`released\` = datetime(value.formatted)))] RETURN \`movie\` {_id: ID(\`movie\`), .year ,released: { formatted: toString(\`movie\`.released) }} AS \`movie\``,
    expectedParams = {
      offset: 0,
      first: -1,
      year: [2020],
      released: [
        {
          year: 1992,
          month: 10,
          day: 9
        },
        {
          formatted: '2030-10-23T10:30:01.002003004-08:00[America/Los_Angeles]'
        }
      ],
      cypherParams: CYPHER_PARAMS
    };

  t.plan(4);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, expectedParams),
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('Custom query for nested non-list property on node type using list argument (no matching field)', t => {
  const graphQLQuery = `
  {
    MoviesByYears(year: [1998]) {
        title
        actors(names: ["Jeff Bridges", "John Goodman"]) {
          name
        }
      }
    }`,
    expectedCypherQuery = `MATCH (\`movie\`:\`Movie\`${ADDITIONAL_MOVIE_LABELS}) WHERE \`movie\`.\`year\` IN $year RETURN \`movie\` { .title ,actors: [(\`movie\`)<-[:\`ACTED_IN\`]-(\`movie_actors\`:\`Actor\`) WHERE \`movie_actors\`.\`names\` IN $1_names | \`movie_actors\` { .name }] } AS \`movie\``,
    expectedParams = {
      year: [1998],
      '1_names': ['Jeff Bridges', 'John Goodman'],
      first: -1,
      offset: 0,
      cypherParams: CYPHER_PARAMS
    };

  t.plan(4);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, expectedParams),
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('Query node type using String type list filters', t => {
  const graphQLQuery = `query {
    Movie(
      filter: {
        titles: ["A", "B", "C"]
        titles_not: ["B"]
        titles_contains: ["C"]
        titles_ends_with: ["D"]
        titles_starts_with: ["E"]
        titles_not_contains: ["F"]
        titles_not_ends_with: ["G"]
        titles_not_starts_with: ["H"]
      }
    ) {
      _id
      titles
    }
  }  
  `,
    expectedCypherQuery = `MATCH (\`movie\`:\`Movie\`${ADDITIONAL_MOVIE_LABELS}) WHERE ([value IN $filter.titles WHERE value IN \`movie\`.titles]) AND (NONE(value IN $filter.titles_not WHERE [prop IN \`movie\`.titles WHERE prop = value])) AND ([value IN $filter.titles_contains WHERE [prop IN \`movie\`.titles WHERE prop CONTAINS value]]) AND ([value IN $filter.titles_not_contains WHERE [prop IN \`movie\`.titles WHERE NOT prop CONTAINS value]]) AND ([value IN $filter.titles_starts_with WHERE [prop IN \`movie\`.titles WHERE prop STARTS WITH value]]) AND ([value IN $filter.titles_not_starts_with WHERE [prop IN \`movie\`.titles WHERE NOT prop STARTS WITH value]]) AND ([value IN $filter.titles_ends_with WHERE [prop IN \`movie\`.titles WHERE prop ENDS WITH value]]) AND ([value IN $filter.titles_not_ends_with WHERE [prop IN \`movie\`.titles WHERE NOT prop ENDS WITH value]]) RETURN \`movie\` {_id: ID(\`movie\`), .titles } AS \`movie\``,
    expectedParams = {
      offset: 0,
      first: -1,
      filter: {
        titles: ['A', 'B', 'C'],
        titles_not: ['B'],
        titles_contains: ['C'],
        titles_not_contains: ['F'],
        titles_starts_with: ['E'],
        titles_not_starts_with: ['H'],
        titles_ends_with: ['D'],
        titles_not_ends_with: ['G']
      },
      cypherParams: CYPHER_PARAMS
    };

  t.plan(2);
  return Promise.all([
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('Query node type using Int type list filters', t => {
  const graphQLQuery = `query {
    Movie(
      filter: {
        years: [2018, 2004]
        years_not: [2020]
        years_lt: [2005],
        years_gt: [2017],
        years_lte: [2018],
        years_gte: [2004]
      }
    ) {
      _id
      years
    }
  }   
  `,
    expectedCypherQuery = `MATCH (\`movie\`:\`Movie\`${ADDITIONAL_MOVIE_LABELS}) WHERE ([value IN $filter.years WHERE value IN \`movie\`.years]) AND (NONE(value IN $filter.years_not WHERE [prop IN \`movie\`.years WHERE prop = value])) AND ([value IN $filter.years_lt WHERE [prop IN \`movie\`.years WHERE prop < value]]) AND ([value IN $filter.years_lte WHERE [prop IN \`movie\`.years WHERE prop <= value]]) AND ([value IN $filter.years_gt WHERE [prop IN \`movie\`.years WHERE prop > value]]) AND ([value IN $filter.years_gte WHERE [prop IN \`movie\`.years WHERE prop >= value]]) RETURN \`movie\` {_id: ID(\`movie\`), .years } AS \`movie\``,
    expectedParams = {
      offset: 0,
      first: -1,
      filter: {
        years: [2018, 2004],
        years_not: [2020],
        years_lt: [2005],
        years_lte: [2018],
        years_gt: [2017],
        years_gte: [2004]
      },
      cypherParams: CYPHER_PARAMS
    };

  t.plan(2);
  return Promise.all([
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('Query node type using Float type list filters', t => {
  const graphQLQuery = `query {
    Movie(
      filter: {
        imdbRatings: [5.5, 8.95]
        imdbRatings_lt: [5.6, 7, 8.99]
        imdbRatings_gt: [5.4, 8]
        imdbRatings_not: [5.55, 8.96]
        imdbRatings_lte: [5.5]
        imdbRatings_gte: [8.95]
      }
    ) {
      _id
      imdbRatings
    }
  }
  `,
    expectedCypherQuery = `MATCH (\`movie\`:\`Movie\`${ADDITIONAL_MOVIE_LABELS}) WHERE ([value IN $filter.imdbRatings WHERE value IN \`movie\`.imdbRatings]) AND (NONE(value IN $filter.imdbRatings_not WHERE [prop IN \`movie\`.imdbRatings WHERE prop = value])) AND ([value IN $filter.imdbRatings_lt WHERE [prop IN \`movie\`.imdbRatings WHERE prop < value]]) AND ([value IN $filter.imdbRatings_lte WHERE [prop IN \`movie\`.imdbRatings WHERE prop <= value]]) AND ([value IN $filter.imdbRatings_gt WHERE [prop IN \`movie\`.imdbRatings WHERE prop > value]]) AND ([value IN $filter.imdbRatings_gte WHERE [prop IN \`movie\`.imdbRatings WHERE prop >= value]]) RETURN \`movie\` {_id: ID(\`movie\`), .imdbRatings } AS \`movie\``,
    expectedParams = {
      offset: 0,
      first: -1,
      filter: {
        imdbRatings: [5.5, 8.95],
        imdbRatings_not: [5.55, 8.96],
        imdbRatings_lt: [5.6, 7, 8.99],
        imdbRatings_lte: [5.5],
        imdbRatings_gt: [5.4, 8],
        imdbRatings_gte: [8.95]
      },
      cypherParams: CYPHER_PARAMS
    };

  t.plan(2);
  return Promise.all([
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('Query node type using Boolean and Enum type list filters', t => {
  const graphQLQuery = `query {
    Movie(
      filter: {
        booleans: [true]
        booleans_not: false
        enums: [Science]
        enums_not: [Mystery]
      }
    ) {
      _id
      booleans
      enums
    }
  }
  `,
    expectedCypherQuery = `MATCH (\`movie\`:\`Movie\`${ADDITIONAL_MOVIE_LABELS}) WHERE ([value IN $filter.booleans WHERE value IN \`movie\`.booleans]) AND (NONE(value IN $filter.booleans_not WHERE [prop IN \`movie\`.booleans WHERE prop = value])) AND ([value IN $filter.enums WHERE value IN \`movie\`.enums]) AND (NONE(value IN $filter.enums_not WHERE [prop IN \`movie\`.enums WHERE prop = value])) RETURN \`movie\` {_id: ID(\`movie\`), .booleans , .enums } AS \`movie\``,
    expectedParams = {
      offset: 0,
      first: -1,
      filter: {
        booleans: [true],
        booleans_not: [false],
        enums: ['Science'],
        enums_not: ['Mystery']
      },
      cypherParams: CYPHER_PARAMS
    };

  t.plan(2);
  return Promise.all([
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('Query node type using Temporal type list filters', t => {
  const graphQLQuery = `query {
    Movie(
      filter: {
        releases: [
          { year: 2020 }
          { year: 2018 }
        ]
        releases_lt: [
          {
            year: 2041,
            day: 24
          }
        ]
        releases_gt: [
          {
            formatted: "2010-10-22T10:30:01.002003004-07:00[America/Los_Angeles]"
          }
        ]
        releases_not: {
          year: 2041
        }
        releases_lte: {
          year: 2020,
          day: 23
        }      
        releases_gte: {
          year: 2020,
          day: 23
        }
      }
    ) {
      _id
      releases {
        year
        day
        month
        hour
        minute
        second
        formatted
      }
    }
  }  
  `,
    expectedCypherQuery = `MATCH (\`movie\`:\`Movie\`${ADDITIONAL_MOVIE_LABELS}) WHERE ([value IN $filter.releases WHERE [prop IN \`movie\`.releases WHERE ((value.year IS NULL OR prop.year = value.year))]]) AND (NONE(value IN $filter.releases_not WHERE [prop IN \`movie\`.releases WHERE ((value.year IS NULL OR prop.year = value.year))])) AND ([value IN $filter.releases_lt WHERE [prop IN \`movie\`.releases WHERE ((value.year IS NULL OR prop.year < value.year) AND (value.day IS NULL OR prop.day < value.day))]]) AND ([value IN $filter.releases_lte WHERE [prop IN \`movie\`.releases WHERE ((value.year IS NULL OR prop.year <= value.year) AND (value.day IS NULL OR prop.day <= value.day))]]) AND ([value IN $filter.releases_gt WHERE [prop IN \`movie\`.releases WHERE ((value.formatted IS NULL OR prop > datetime(value.formatted)))]]) AND ([value IN $filter.releases_gte WHERE [prop IN \`movie\`.releases WHERE ((value.year IS NULL OR prop.year >= value.year) AND (value.day IS NULL OR prop.day >= value.day))]]) RETURN \`movie\` {_id: ID(\`movie\`),releases: reduce(a = [], INSTANCE IN movie.releases | a + { year: INSTANCE.year , day: INSTANCE.day , month: INSTANCE.month , hour: INSTANCE.hour , minute: INSTANCE.minute , second: INSTANCE.second , formatted: toString(INSTANCE) })} AS \`movie\``,
    expectedParams = {
      offset: 0,
      first: -1,
      filter: {
        releases: [
          {
            year: {
              low: 2020,
              high: 0
            }
          },
          {
            year: {
              low: 2018,
              high: 0
            }
          }
        ],
        releases_not: [
          {
            year: {
              low: 2041,
              high: 0
            }
          }
        ],
        releases_lt: [
          {
            year: {
              low: 2041,
              high: 0
            },
            day: {
              low: 24,
              high: 0
            }
          }
        ],
        releases_lte: [
          {
            year: {
              low: 2020,
              high: 0
            },
            day: {
              low: 23,
              high: 0
            }
          }
        ],
        releases_gt: [
          {
            formatted:
              '2010-10-22T10:30:01.002003004-07:00[America/Los_Angeles]'
          }
        ],
        releases_gte: [
          {
            year: {
              low: 2020,
              high: 0
            },
            day: {
              low: 23,
              high: 0
            }
          }
        ]
      },
      cypherParams: CYPHER_PARAMS
    };

  t.plan(2);
  return Promise.all([
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('Query node type using Spatial type list filters', t => {
  const graphQLQuery = `query {
    Movie(
      filter: {
        locations: [
          {
            x: 10
          }
          {
            x: 30
          }
        ]
        locations_not: [
          {
            z: 11
          }
        ]
        locations_distance: [
          {
            point: {
              x: 10
              y: 20
              z: 31
            }
            distance: 1
          }
        ]
        locations_distance_lt: [
          {
            point: {
              x: 10
              y: 20
              z: 31
            }
            distance: 2.5
          }
        ]      
        locations_distance_gt: [
          {
            point: {
              x: 10
              y: 20
              z: 31
            }
            distance: 2.5
          }
        ]
        locations_distance_lte: [
          {
            point: {
              x: 10
              y: 20
              z: 31
            }
            distance: 2.5
          }
        ]
        locations_distance_gte: [
          {
            point: {
              x: 10
              y: 20
              z: 31
            }
            distance: 2.5
          }
        ]            
      }
    ) {
      _id
      locations {
        x
        y
        z
      }
    }
  }    
  `,
    expectedCypherQuery = `MATCH (\`movie\`:\`Movie\`${ADDITIONAL_MOVIE_LABELS}) WHERE ([value IN $filter.locations WHERE [prop IN \`movie\`.locations WHERE ((value.x IS NULL OR prop.x = value.x))]]) AND (NONE(value IN $filter.locations_not WHERE [prop IN \`movie\`.locations WHERE ((value.z IS NULL OR prop.z = value.z))])) AND ([value IN $filter.locations_distance WHERE [prop IN \`movie\`.locations WHERE ((distance(prop, point(value.point)) =value.distance))]]) AND ([value IN $filter.locations_distance_lt WHERE [prop IN \`movie\`.locations WHERE ((distance(prop, point(value.point)) <value.distance))]]) AND ([value IN $filter.locations_distance_lte WHERE [prop IN \`movie\`.locations WHERE ((distance(prop, point(value.point)) <=value.distance))]]) AND ([value IN $filter.locations_distance_gt WHERE [prop IN \`movie\`.locations WHERE ((distance(prop, point(value.point)) >value.distance))]]) AND ([value IN $filter.locations_distance_gte WHERE [prop IN \`movie\`.locations WHERE ((distance(prop, point(value.point)) >=value.distance))]]) RETURN \`movie\` {_id: ID(\`movie\`),locations: reduce(a = [], INSTANCE IN movie.locations | a + { x: INSTANCE.x , y: INSTANCE.y , z: INSTANCE.z })} AS \`movie\``,
    expectedParams = {
      offset: 0,
      first: -1,
      filter: {
        locations: [
          {
            x: 10
          },
          {
            x: 30
          }
        ],
        locations_not: [
          {
            z: 11
          }
        ],
        locations_distance: [
          {
            point: {
              x: 10,
              y: 20,
              z: 31
            },
            distance: 1
          }
        ],
        locations_distance_lt: [
          {
            point: {
              x: 10,
              y: 20,
              z: 31
            },
            distance: 2.5
          }
        ],
        locations_distance_lte: [
          {
            point: {
              x: 10,
              y: 20,
              z: 31
            },
            distance: 2.5
          }
        ],
        locations_distance_gt: [
          {
            point: {
              x: 10,
              y: 20,
              z: 31
            },
            distance: 2.5
          }
        ],
        locations_distance_gte: [
          {
            point: {
              x: 10,
              y: 20,
              z: 31
            },
            distance: 2.5
          }
        ]
      },
      cypherParams: CYPHER_PARAMS
    };

  t.plan(2);
  return Promise.all([
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('Query using filters that check for existence of list properties', t => {
  const graphQLQuery = `query {
    Movie(
      filter: {
        titles: null
        titles_not: null
        years: null
        years_not: null
        imdbRatings: null
        imdbRatings_not: null
        releases: null
        releases_not: null
        locations: null
        locations_not: null
      }
    ) {
      _id
    }
  }
  `,
    expectedCypherQuery = `MATCH (\`movie\`:\`Movie\`${ADDITIONAL_MOVIE_LABELS}) WHERE ($filter._locations_null = TRUE AND NOT EXISTS(\`movie\`.locations)) AND ($filter._locations_not_null = TRUE AND EXISTS(\`movie\`.locations)) AND ($filter._years_null = TRUE AND NOT EXISTS(\`movie\`.years)) AND ($filter._years_not_null = TRUE AND EXISTS(\`movie\`.years)) AND ($filter._titles_null = TRUE AND NOT EXISTS(\`movie\`.titles)) AND ($filter._titles_not_null = TRUE AND EXISTS(\`movie\`.titles)) AND ($filter._imdbRatings_null = TRUE AND NOT EXISTS(\`movie\`.imdbRatings)) AND ($filter._imdbRatings_not_null = TRUE AND EXISTS(\`movie\`.imdbRatings)) AND ($filter._releases_null = TRUE AND NOT EXISTS(\`movie\`.releases)) AND ($filter._releases_not_null = TRUE AND EXISTS(\`movie\`.releases)) RETURN \`movie\` {_id: ID(\`movie\`)} AS \`movie\``,
    expectedParams = {
      offset: 0,
      first: -1,
      filter: {
        _locations_null: true,
        _locations_not_null: true,
        _years_null: true,
        _years_not_null: true,
        _titles_null: true,
        _titles_not_null: true,
        _imdbRatings_null: true,
        _imdbRatings_not_null: true,
        _releases_null: true,
        _releases_not_null: true
      },
      cypherParams: CYPHER_PARAMS
    };

  t.plan(2);
  return Promise.all([
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('Query using filters that check for emptiness of list properties', t => {
  const graphQLQuery = `query {
    Movie(
      filter: {
        titles: []
        titles_not: []
        years: []
        years_not: []
        imdbRatings: []
        imdbRatings_not: []
        releases: []
        releases_not: []
        locations: []
        locations_not: []
      }
    ) {
      _id
    }
  }
  `,
    expectedCypherQuery = `MATCH (\`movie\`:\`Movie\`${ADDITIONAL_MOVIE_LABELS}) WHERE ((size(\`movie\`.locations) = 0)) AND ((size(\`movie\`.locations) > 0)) AND ((size(\`movie\`.years) = 0)) AND ((size(\`movie\`.years) > 0)) AND ((size(\`movie\`.titles) = 0)) AND ((size(\`movie\`.titles) > 0)) AND ((size(\`movie\`.imdbRatings) = 0)) AND ((size(\`movie\`.imdbRatings) > 0)) AND ((size(\`movie\`.releases) = 0)) AND ((size(\`movie\`.releases) > 0)) RETURN \`movie\` {_id: ID(\`movie\`)} AS \`movie\``,
    expectedParams = {
      offset: 0,
      first: -1,
      filter: {
        locations: [],
        locations_not: [],
        years: [],
        years_not: [],
        titles: [],
        titles_not: [],
        imdbRatings: [],
        imdbRatings_not: [],
        releases: [],
        releases_not: []
      },
      cypherParams: CYPHER_PARAMS
    };

  t.plan(2);
  return Promise.all([
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('Query relationship type using list field filters', t => {
  const graphQLQuery = `query {
    Movie(filter: { ratings_not: null }) {
      _id
      titles
      ratings(
        filter: {
          ratings_not: []
          ratings: [5]
          ratings_lt: [6]
          ratings_gt: [19]
          ratings_lte: [5]
          ratings_gte: [20]
          datetimes: [
            { year: 2018, hour: 0 }
            {
              formatted: "2019-11-23T10:30:01.002003004-08:00[America/Los_Angeles]"
            }
          ]
          datetimes_not: [{ year: 2022 }]
          datetimes_lt: [{ day: 24 }]
          datetimes_lte: [{ day: 23 }, { day: 22 }]
          datetimes_gt: [{ hour: 9 }, { minute: 0 }]
          datetimes_gte: [{ hour: 10 }]
        }
      ) {
        ratings
        datetimes {
          year
          month
          day
          hour
          minute
          second
          formatted
        }
      }
    }
  }  
  `,
    expectedCypherQuery = `MATCH (\`movie\`:\`Movie\`${ADDITIONAL_MOVIE_LABELS}) WHERE ($filter._ratings_not_null = TRUE AND EXISTS((\`movie\`)<-[:RATED]-(:User))) RETURN \`movie\` {_id: ID(\`movie\`), .titles ,ratings: [(\`movie\`)<-[\`movie_ratings_relation\`:\`RATED\`]-(:\`User\`) WHERE ((size(\`movie_ratings_relation\`.ratings) > 0)) AND ([value IN $1_filter.ratings WHERE value IN \`movie_ratings_relation\`.ratings]) AND ([value IN $1_filter.ratings_lt WHERE [prop IN \`movie_ratings_relation\`.ratings WHERE prop < value]]) AND ([value IN $1_filter.ratings_gt WHERE [prop IN \`movie_ratings_relation\`.ratings WHERE prop > value]]) AND ([value IN $1_filter.ratings_lte WHERE [prop IN \`movie_ratings_relation\`.ratings WHERE prop <= value]]) AND ([value IN $1_filter.ratings_gte WHERE [prop IN \`movie_ratings_relation\`.ratings WHERE prop >= value]]) AND ([value IN $1_filter.datetimes WHERE [prop IN \`movie_ratings_relation\`.datetimes WHERE ((value.year IS NULL OR prop.year = value.year) AND (value.hour IS NULL OR prop.hour = value.hour) AND (value.formatted IS NULL OR prop = datetime(value.formatted)))]]) AND (NONE(value IN $1_filter.datetimes_not WHERE [prop IN \`movie_ratings_relation\`.datetimes WHERE ((value.year IS NULL OR prop.year = value.year))])) AND ([value IN $1_filter.datetimes_lt WHERE [prop IN \`movie_ratings_relation\`.datetimes WHERE ((value.day IS NULL OR prop.day < value.day))]]) AND ([value IN $1_filter.datetimes_lte WHERE [prop IN \`movie_ratings_relation\`.datetimes WHERE ((value.day IS NULL OR prop.day <= value.day))]]) AND ([value IN $1_filter.datetimes_gt WHERE [prop IN \`movie_ratings_relation\`.datetimes WHERE ((value.hour IS NULL OR prop.hour > value.hour) AND (value.minute IS NULL OR prop.minute > value.minute))]]) AND ([value IN $1_filter.datetimes_gte WHERE [prop IN \`movie_ratings_relation\`.datetimes WHERE ((value.hour IS NULL OR prop.hour >= value.hour))]]) | movie_ratings_relation { .ratings ,datetimes: reduce(a = [], INSTANCE IN movie_ratings_relation.datetimes | a + { year: INSTANCE.year , month: INSTANCE.month , day: INSTANCE.day , hour: INSTANCE.hour , minute: INSTANCE.minute , second: INSTANCE.second , formatted: toString(INSTANCE) })}] } AS \`movie\``,
    expectedParams = {
      offset: 0,
      first: -1,
      filter: {
        _ratings_not_null: true
      },
      '1_filter': {
        ratings_not: [],
        ratings: [5],
        ratings_lt: [6],
        ratings_gt: [19],
        ratings_lte: [5],
        ratings_gte: [20],
        datetimes: [
          {
            year: {
              low: 2018,
              high: 0
            },
            hour: {
              low: 0,
              high: 0
            }
          },
          {
            formatted:
              '2019-11-23T10:30:01.002003004-08:00[America/Los_Angeles]'
          }
        ],
        datetimes_not: [
          {
            year: {
              low: 2022,
              high: 0
            }
          }
        ],
        datetimes_lt: [
          {
            day: {
              low: 24,
              high: 0
            }
          }
        ],
        datetimes_lte: [
          {
            day: {
              low: 23,
              high: 0
            }
          },
          {
            day: {
              low: 22,
              high: 0
            }
          }
        ],
        datetimes_gt: [
          {
            hour: {
              low: 9,
              high: 0
            }
          },
          {
            minute: {
              low: 0,
              high: 0
            }
          }
        ],
        datetimes_gte: [
          {
            hour: {
              low: 10,
              high: 0
            }
          }
        ]
      },
      cypherParams: CYPHER_PARAMS
    };

  t.plan(2);
  return augmentedSchemaCypherTestRunner(
    t,
    graphQLQuery,
    {},
    expectedCypherQuery,
    expectedParams
  );
});

test('Create node with non-null field', t => {
  const graphQLQuery = `mutation {
    CreateState(
      name: "California"
    ) {
      name
    }
  }`,
    expectedCypherQuery = `
    CREATE (\`state\`:\`State\` {name:$params.name})
    RETURN \`state\` { .name } AS \`state\`
  `,
    expectedParams = {
      params: {
        name: 'California'
      },
      first: -1,
      offset: 0
    };

  t.plan(4);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, expectedParams),
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('Query node with ignored field', t => {
  const graphQLQuery = `query {
    State {
      name
      customField
    } 
  }`,
    expectedCypherQuery = `MATCH (\`state\`:\`State\`) RETURN \`state\` { .name } AS \`state\``,
    expectedParams = {
      first: -1,
      cypherParams: CYPHER_PARAMS,
      offset: 0
    };

  t.plan(4);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, expectedParams),
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

// FIXME: ignore this test until inferred addition of @neo4j_ignore directive
//        is re-evaluated
// test('Query nested node with ignored field (inferred from resolver)', t => {
//   const graphQLQuery = `query {
//     Movie {
//       customField
//       filmedIn {
//         name
//         customField
//       }
//     }
//   }`,
//     expectedCypherQuery = `MATCH (\`movie\`:\`Movie\`${ADDITIONAL_MOVIE_LABELS}) RETURN \`movie\` {filmedIn: head([(\`movie\`)-[:\`FILMED_IN\`]->(\`movie_filmedIn\`:\`State\`) | movie_filmedIn { .name }]) } AS \`movie\``;

//   t.plan(1);
//   return Promise.all([
//     augmentedSchemaCypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery)
//   ]);
// });

test('Deeply nested orderBy', t => {
  const graphQLQuery = `query {
    Movie(orderBy:title_desc) {
      title
      actors(orderBy:name_desc) {
        name
        movies(orderBy:[title_asc, title_desc]) {
          title
        }
      }
    }
  }`,
    expectedCypherQuery = `MATCH (\`movie\`:\`Movie\`${ADDITIONAL_MOVIE_LABELS}) WITH \`movie\` ORDER BY movie.title DESC RETURN \`movie\` { .title ,actors: apoc.coll.sortMulti([(\`movie\`)<-[:\`ACTED_IN\`]-(\`movie_actors\`:\`Actor\`) | \`movie_actors\` { .name ,movies: apoc.coll.sortMulti([(\`movie_actors\`)-[:\`ACTED_IN\`]->(\`movie_actors_movies\`:\`Movie\`${ADDITIONAL_MOVIE_LABELS}) | \`movie_actors_movies\` { .title }], ['^title','title']) }], ['name']) } AS \`movie\``,
    expectedParams = {
      offset: 0,
      first: -1,
      '1_orderBy': 'name_desc',
      '2_orderBy': ['title_asc', 'title_desc'],
      cypherParams: CYPHER_PARAMS
    };

  t.plan(2);
  return Promise.all([
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('Optimize performance - not requesting attributes with @cypher directive - early ORDER BY', async t => {
  const graphQLQuery = `{
    User(orderBy: name_desc) {
      _id
      name
    }
  }`,
    expectedCypherQuery = `MATCH (\`user\`:\`User\`) WITH \`user\` ORDER BY user.name DESC RETURN \`user\` {_id: ID(\`user\`), .name } AS \`user\``,
    expectedParams = {
      offset: 0,
      first: -1,
      cypherParams: CYPHER_PARAMS
    };

  t.plan(2);
  return Promise.all([
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('Optimize performance - attributes with @cypher directive requested - no optimization', async t => {
  const graphQLQuery = `{
    User(orderBy: currentUserId_desc) {
      _id
      name
      currentUserId
    }
  }`,
    expectedCypherQuery = `MATCH (\`user\`:\`User\`) RETURN \`user\` {_id: ID(\`user\`), .name ,currentUserId: apoc.cypher.runFirstColumn("RETURN $cypherParams.currentUserId AS cypherParamsUserId", {this: user, cypherParams: $cypherParams, strArg: "Neo4j"}, false)} AS \`user\` ORDER BY user.currentUserId DESC `,
    expectedParams = {
      offset: 0,
      first: -1,
      cypherParams: CYPHER_PARAMS
    };

  t.plan(2);
  return Promise.all([
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('Query using enum orderBy', t => {
  const graphQLQuery = `query {
    Book(orderBy: [genre_asc]) {
      _id
      genre
    }
  }`,
    expectedCypherQuery =
      'MATCH (`book`:`Book`) WITH `book` ORDER BY book.genre ASC RETURN `book` {_id: ID(`book`), .genre } AS `book`',
    expectedParams = {
      offset: 0,
      first: -1,
      cypherParams: CYPHER_PARAMS
    };

  t.plan(2);
  return Promise.all([
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('Query using temporal orderBy', t => {
  const graphQLQuery = `query {
    TemporalNode(
      orderBy: [datetime_desc, datetime_asc]
    ) {
      datetime {
        formatted
      }
    }
  }`,
    expectedCypherQuery =
      'MATCH (`temporalNode`:`TemporalNode`) WITH `temporalNode` ORDER BY temporalNode.datetime DESC , temporalNode.datetime ASC RETURN `temporalNode` {datetime: { formatted: toString(`temporalNode`.datetime) }} AS `temporalNode`',
    expectedParams = {
      offset: 0,
      first: -1
    };

  t.plan(2);
  return Promise.all([
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('Deeply nested query using temporal orderBy', t => {
  const graphQLQuery = `query {
    TemporalNode(orderBy: [datetime_desc]) {
      _id
      datetime {
        year
        month
        day
        hour
        minute
        second
        millisecond
        microsecond
        nanosecond
        timezone
        formatted
      }
      temporalNodes(orderBy: datetime_asc) {
        _id
        datetime {
          year
          month
          day
          hour
          minute
          second
          millisecond
          microsecond
          nanosecond
          timezone
          formatted
        }
        time {
          hour
        }
        temporalNodes(first: 2, offset: 1, orderBy: [datetime_desc, time_desc]) {
          _id
          datetime {
            year
            formatted
          }
          time {
            hour
          }
        }
      }
    }
  }`,
    expectedCypherQuery =
      "MATCH (`temporalNode`:`TemporalNode`) WITH `temporalNode` ORDER BY temporalNode.datetime DESC RETURN `temporalNode` {_id: ID(`temporalNode`),datetime: { year: `temporalNode`.datetime.year , month: `temporalNode`.datetime.month , day: `temporalNode`.datetime.day , hour: `temporalNode`.datetime.hour , minute: `temporalNode`.datetime.minute , second: `temporalNode`.datetime.second , millisecond: `temporalNode`.datetime.millisecond , microsecond: `temporalNode`.datetime.microsecond , nanosecond: `temporalNode`.datetime.nanosecond , timezone: `temporalNode`.datetime.timezone , formatted: toString(`temporalNode`.datetime) },temporalNodes: [sortedElement IN apoc.coll.sortMulti([(`temporalNode`)-[:`TEMPORAL`]->(`temporalNode_temporalNodes`:`TemporalNode`) | `temporalNode_temporalNodes` {_id: ID(`temporalNode_temporalNodes`),datetime: `temporalNode_temporalNodes`.datetime,time: `temporalNode_temporalNodes`.time,temporalNodes: [sortedElement IN apoc.coll.sortMulti([(`temporalNode_temporalNodes`)-[:`TEMPORAL`]->(`temporalNode_temporalNodes_temporalNodes`:`TemporalNode`) | `temporalNode_temporalNodes_temporalNodes` {_id: ID(`temporalNode_temporalNodes_temporalNodes`),datetime: `temporalNode_temporalNodes_temporalNodes`.datetime,time: `temporalNode_temporalNodes_temporalNodes`.time}], ['datetime','time']) | sortedElement { .* ,  datetime: {year: sortedElement.datetime.year,formatted: toString(sortedElement.datetime)},time: {hour: sortedElement.time.hour}}][1..3] }], ['^datetime']) | sortedElement { .* ,  datetime: {year: sortedElement.datetime.year,month: sortedElement.datetime.month,day: sortedElement.datetime.day,hour: sortedElement.datetime.hour,minute: sortedElement.datetime.minute,second: sortedElement.datetime.second,millisecond: sortedElement.datetime.millisecond,microsecond: sortedElement.datetime.microsecond,nanosecond: sortedElement.datetime.nanosecond,timezone: sortedElement.datetime.timezone,formatted: toString(sortedElement.datetime)},time: {hour: sortedElement.time.hour}}] } AS `temporalNode`",
    expectedParams = {
      offset: 0,
      first: -1,
      '1_orderBy': 'datetime_asc',
      '2_first': 2,
      '2_offset': 1,
      '2_orderBy': ['datetime_desc', 'time_desc']
    };

  t.plan(2);
  return Promise.all([
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('query nested relationship with differences between selected and ordered fields', t => {
  const graphQLQuery = `query {
    TemporalNode(orderBy: [datetime_desc]) {
      datetime {
        year
        formatted
      }
      temporalNodes(orderBy: [datetime_asc, datetime_desc]) {
        _id
        name
        time {
          hour
        }
        temporalNodes(first: 2, offset: 1, orderBy: [datetime_desc, name_asc]) {
          _id
          name
        }
      }
    }
  }
  `,
    expectedCypherQuery =
      "MATCH (`temporalNode`:`TemporalNode`) WITH `temporalNode` ORDER BY temporalNode.datetime DESC RETURN `temporalNode` {datetime: { year: `temporalNode`.datetime.year , formatted: toString(`temporalNode`.datetime) },temporalNodes: [sortedElement IN apoc.coll.sortMulti([(`temporalNode`)-[:`TEMPORAL`]->(`temporalNode_temporalNodes`:`TemporalNode`) | `temporalNode_temporalNodes` {_id: ID(`temporalNode_temporalNodes`), .name ,time: `temporalNode_temporalNodes`.time,temporalNodes: [sortedElement IN apoc.coll.sortMulti([(`temporalNode_temporalNodes`)-[:`TEMPORAL`]->(`temporalNode_temporalNodes_temporalNodes`:`TemporalNode`) | `temporalNode_temporalNodes_temporalNodes` {_id: ID(`temporalNode_temporalNodes_temporalNodes`), .name ,datetime: `temporalNode_temporalNodes_temporalNodes`.datetime}], ['datetime','^name']) | sortedElement { .* }][1..3] ,datetime: `temporalNode_temporalNodes`.datetime}], ['^datetime','datetime']) | sortedElement { .* ,  time: {hour: sortedElement.time.hour}}] } AS `temporalNode`",
    expectedParams = {
      offset: 0,
      first: -1,
      '1_orderBy': ['datetime_asc', 'datetime_desc'],
      '2_first': 2,
      '2_offset': 1,
      '2_orderBy': ['datetime_desc', 'name_asc']
    };

  t.plan(2);
  return Promise.all([
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('Deeply nested query using temporal orderBy without temporal field selection', t => {
  const graphQLQuery = `query {
    TemporalNode(orderBy: [datetime_desc]) {
      _id
      temporalNodes(first: 2, offset: 1, orderBy: [datetime_desc, time_desc]) {
        _id
      }
    }
  }`,
    expectedCypherQuery =
      "MATCH (`temporalNode`:`TemporalNode`) WITH `temporalNode` ORDER BY temporalNode.datetime DESC RETURN `temporalNode` {_id: ID(`temporalNode`),temporalNodes: [sortedElement IN apoc.coll.sortMulti([(`temporalNode`)-[:`TEMPORAL`]->(`temporalNode_temporalNodes`:`TemporalNode`) | `temporalNode_temporalNodes` {_id: ID(`temporalNode_temporalNodes`),datetime: `temporalNode_temporalNodes`.datetime,time: `temporalNode_temporalNodes`.time}], ['datetime','time']) | sortedElement { .* }][1..3] } AS `temporalNode`",
    expectedParams = {
      offset: 0,
      first: -1,
      '1_first': 2,
      '1_offset': 1,
      '1_orderBy': ['datetime_desc', 'time_desc']
    };

  t.plan(2);
  return Promise.all([
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('Handle @cypher field with String payload using cypherParams', t => {
  const graphQLQuery = `query {
    User {
      userId
      currentUserId
      name
    }
  }`,
    expectedCypherQuery = `MATCH (\`user\`:\`User\`) RETURN \`user\` { .userId ,currentUserId: apoc.cypher.runFirstColumn("RETURN $cypherParams.currentUserId AS cypherParamsUserId", {this: user, cypherParams: $cypherParams, strArg: "Neo4j"}, false), .name } AS \`user\``,
    expectedParams = {
      first: -1,
      cypherParams: CYPHER_PARAMS,
      offset: 0
    };

  t.plan(4);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, expectedParams),
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('Handle nested @cypher fields that use cypherParams', t => {
  const graphQLQuery = `query {
    User {
      userId
      currentUserId
      name
      friends {
        to {
          since
          currentUserId
          User {
            name
            currentUserId
          }
        }
        from {
          since
          currentUserId
        }
      }
      rated {
        rating
        currentUserId
      }
      favorites {
        movieId
        currentUserId
      }
    }
  }`,
    expectedCypherQuery = `MATCH (\`user\`:\`User\`) RETURN \`user\` { .userId ,currentUserId: apoc.cypher.runFirstColumn("RETURN $cypherParams.currentUserId AS cypherParamsUserId", {this: user, cypherParams: $cypherParams, strArg: "Neo4j"}, false), .name ,friends: {to: [(\`user\`)-[\`user_to_relation\`:\`FRIEND_OF\`]->(\`user_to\`:\`User\`) | user_to_relation { .since ,currentUserId: apoc.cypher.runFirstColumn("RETURN $cypherParams.currentUserId AS cypherParamsUserId", {this: user_to_relation, cypherParams: $cypherParams}, false),User: user_to { .name ,currentUserId: apoc.cypher.runFirstColumn("RETURN $cypherParams.currentUserId AS cypherParamsUserId", {this: user_to, cypherParams: $cypherParams, strArg: "Neo4j"}, false)} }] ,from: [(\`user\`)<-[\`user_from_relation\`:\`FRIEND_OF\`]-(\`user_from\`:\`User\`) | user_from_relation { .since ,currentUserId: apoc.cypher.runFirstColumn("RETURN $cypherParams.currentUserId AS cypherParamsUserId", {this: user_from_relation, cypherParams: $cypherParams}, false)}] } ,rated: [(\`user\`)-[\`user_rated_relation\`:\`RATED\`]->(:\`Movie\`${ADDITIONAL_MOVIE_LABELS}) | user_rated_relation { .rating ,currentUserId: apoc.cypher.runFirstColumn("RETURN $cypherParams.currentUserId AS cypherParamsUserId", {this: user_rated_relation, cypherParams: $cypherParams}, false)}] ,favorites: [(\`user\`)-[:\`FAVORITED\`]->(\`user_favorites\`:\`Movie\`${ADDITIONAL_MOVIE_LABELS}) | \`user_favorites\` { .movieId ,currentUserId: apoc.cypher.runFirstColumn("RETURN $cypherParams.currentUserId AS cypherParamsUserId", {this: user_favorites, cypherParams: $cypherParams}, false)}] } AS \`user\``,
    expectedParams = {
      first: -1,
      cypherParams: CYPHER_PARAMS,
      offset: 0
    };

  t.plan(2);
  return Promise.all([
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('Handle @cypher query using cypherParams with String payload', t => {
  const graphQLQuery = `query {
    currentUserId
  }`,
    expectedCypherQuery = `WITH apoc.cypher.runFirstColumn("RETURN $cypherParams.currentUserId AS currentUserId", {offset:$offset, first:$first, cypherParams: $cypherParams}, True) AS x UNWIND x AS \`string\` RETURN \`string\` `,
    expectedParams = {
      first: -1,
      cypherParams: CYPHER_PARAMS,
      offset: 0
    };

  t.plan(4);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, expectedParams),
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('Handle @cypher query using cypherParams with Object payload', t => {
  const graphQLQuery = `query {
    computedObjectWithCypherParams {
      userId
    }
  }`,
    expectedCypherQuery = `WITH apoc.cypher.runFirstColumn("RETURN { userId: $cypherParams.currentUserId }", {offset:$offset, first:$first, cypherParams: $cypherParams}, True) AS x UNWIND x AS \`currentUserId\` RETURN \`currentUserId\` { .userId } AS \`currentUserId\``,
    expectedParams = {
      first: -1,
      cypherParams: CYPHER_PARAMS,
      offset: 0
    };

  t.plan(4);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, expectedParams),
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('Handle @cypher query with Boolean payload', t => {
  const graphQLQuery = `query {
    computedBoolean
  }`,
    expectedCypherQuery = `WITH apoc.cypher.runFirstColumn("RETURN true", {offset:$offset, first:$first, cypherParams: $cypherParams}, True) AS x UNWIND x AS \`boolean\` RETURN \`boolean\` `,
    expectedParams = {
      first: -1,
      cypherParams: CYPHER_PARAMS,
      offset: 0
    };

  t.plan(4);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, expectedParams),
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('Handle @cypher query with Int payload', t => {
  const graphQLQuery = `query {
    computedInt
  }`,
    expectedCypherQuery = `WITH apoc.cypher.runFirstColumn("RETURN 1", {offset:$offset, first:$first, cypherParams: $cypherParams}, True) AS x UNWIND x AS \`int\` RETURN \`int\` `,
    expectedParams = {
      first: -1,
      cypherParams: CYPHER_PARAMS,
      offset: 0
    };

  t.plan(4);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, expectedParams),
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('Handle @cypher query with Float payload', t => {
  const graphQLQuery = `query {
    computedFloat
  }`,
    expectedCypherQuery = `WITH apoc.cypher.runFirstColumn("RETURN 3.14", {offset:$offset, first:$first, cypherParams: $cypherParams}, True) AS x UNWIND x AS \`float\` RETURN \`float\` `,
    expectedParams = {
      first: -1,
      cypherParams: CYPHER_PARAMS,
      offset: 0
    };

  t.plan(4);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, expectedParams),
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('Handle @cypher query with String list payload', t => {
  const graphQLQuery = `query {
    computedStringList
  }`,
    expectedCypherQuery = `WITH apoc.cypher.runFirstColumn("UNWIND ['hello', 'world'] AS stringList RETURN stringList", {offset:$offset, first:$first, cypherParams: $cypherParams}, True) AS x UNWIND x AS \`string\` RETURN \`string\` `,
    expectedParams = {
      first: -1,
      cypherParams: CYPHER_PARAMS,
      offset: 0
    };

  t.plan(4);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, expectedParams),
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('Handle @cypher query with Int list payload', t => {
  const graphQLQuery = `query {
    computedIntList
  }`,
    expectedCypherQuery = `WITH apoc.cypher.runFirstColumn("UNWIND [1, 2, 3] AS intList RETURN intList", {offset:$offset, first:$first, cypherParams: $cypherParams}, True) AS x UNWIND x AS \`int\` RETURN \`int\` `,
    expectedParams = {
      first: -1,
      cypherParams: CYPHER_PARAMS,
      offset: 0
    };

  t.plan(4);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, expectedParams),
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('Handle @cypher query with temporal payload', t => {
  const graphQLQuery = `query {
    computedTemporal {
      year
      month
      day
      hour
      minute
      second
      microsecond
      millisecond
      nanosecond    
      timezone
      formatted
    }
  }`,
    expectedCypherQuery = `WITH apoc.cypher.runFirstColumn("WITH datetime() AS now RETURN { year: now.year, month: now.month , day: now.day , hour: now.hour , minute: now.minute , second: now.second , millisecond: now.millisecond , microsecond: now.microsecond , nanosecond: now.nanosecond , timezone: now.timezone , formatted: toString(now) }", {offset:$offset, first:$first, cypherParams: $cypherParams}, True) AS x UNWIND x AS \`_Neo4jDateTime\` RETURN \`_Neo4jDateTime\` `,
    expectedParams = {
      first: -1,
      cypherParams: CYPHER_PARAMS,
      offset: 0
    };

  t.plan(4);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, expectedParams),
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('Handle @cypher query with spatial payload', t => {
  const graphQLQuery = `query {
    computedSpatial {
      x
      y
      z
      crs
    }
  }`,
    expectedCypherQuery = `WITH apoc.cypher.runFirstColumn("WITH point({ x: 10, y: 20, z: 15 }) AS instance RETURN { x: instance.x, y: instance.y, z: instance.z, crs: instance.crs }", {offset:$offset, first:$first, cypherParams: $cypherParams}, True) AS x UNWIND x AS \`_Neo4jPoint\` RETURN \`_Neo4jPoint\` `,
    expectedParams = {
      first: -1,
      cypherParams: CYPHER_PARAMS,
      offset: 0
    };

  t.plan(4);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, expectedParams),
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('Handle @cypher mutation using cypherParams with String payload', t => {
  const graphQLQuery = `mutation {
    currentUserId
  }`,
    expectedCypherQuery = `CALL apoc.cypher.doIt("RETURN $cypherParams.currentUserId", {first:$first, offset:$offset, cypherParams: $cypherParams}) YIELD value
    WITH apoc.map.values(value, [keys(value)[0]])[0] AS \`string\`
    RETURN \`string\` `,
    expectedParams = {
      first: -1,
      cypherParams: CYPHER_PARAMS,
      offset: 0
    };

  t.plan(4);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, expectedParams),
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('Handle @cypher mutation using cypherParams with Object payload', t => {
  const graphQLQuery = `mutation {
    computedObjectWithCypherParams {
      userId
    }
  }`,
    expectedCypherQuery = `CALL apoc.cypher.doIt("RETURN { userId: $cypherParams.currentUserId }", {first:$first, offset:$offset, cypherParams: $cypherParams}) YIELD value
    WITH apoc.map.values(value, [keys(value)[0]])[0] AS \`currentUserId\`
    RETURN \`currentUserId\` { .userId } AS \`currentUserId\``,
    expectedParams = {
      first: -1,
      cypherParams: CYPHER_PARAMS,
      offset: 0
    };

  t.plan(4);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, expectedParams),
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('Handle @cypher mutation with String list payload', t => {
  const graphQLQuery = `mutation {
    computedStringList
  }`,
    expectedCypherQuery = `CALL apoc.cypher.doIt("UNWIND ['hello', 'world'] AS stringList RETURN stringList", {first:$first, offset:$offset, cypherParams: $cypherParams}) YIELD value
    WITH apoc.map.values(value, [keys(value)[0]])[0] AS \`string\`
    RETURN \`string\` `,
    expectedParams = {
      first: -1,
      cypherParams: CYPHER_PARAMS,
      offset: 0
    };

  t.plan(4);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, expectedParams),
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('Handle @cypher mutation with temporal payload', t => {
  const graphQLQuery = `mutation {
    computedTemporal {
      year
      month
      day
      hour
      minute
      second
      microsecond
      millisecond
      nanosecond    
      timezone
      formatted
    }
  }`,
    expectedCypherQuery = `CALL apoc.cypher.doIt("WITH datetime() AS now RETURN { year: now.year, month: now.month , day: now.day , hour: now.hour , minute: now.minute , second: now.second , millisecond: now.millisecond , microsecond: now.microsecond , nanosecond: now.nanosecond , timezone: now.timezone , formatted: toString(now) }", {first:$first, offset:$offset, cypherParams: $cypherParams}) YIELD value
    WITH apoc.map.values(value, [keys(value)[0]])[0] AS \`_Neo4jDateTime\`
    RETURN \`_Neo4jDateTime\` `,
    expectedParams = {
      first: -1,
      cypherParams: CYPHER_PARAMS,
      offset: 0
    };

  t.plan(4);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, expectedParams),
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('Handle @cypher mutation with spatial payload', t => {
  const graphQLQuery = `mutation {
    computedSpatial {
      x
      y
      z
      crs
    }
  }`,
    expectedCypherQuery = `CALL apoc.cypher.doIt("WITH point({ x: 10, y: 20, z: 15 }) AS instance RETURN { x: instance.x, y: instance.y, z: instance.z, crs: instance.crs }", {first:$first, offset:$offset, cypherParams: $cypherParams}) YIELD value
    WITH apoc.map.values(value, [keys(value)[0]])[0] AS \`_Neo4jPoint\`
    RETURN \`_Neo4jPoint\` `,
    expectedParams = {
      first: -1,
      cypherParams: CYPHER_PARAMS,
      offset: 0
    };

  t.plan(4);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, expectedParams),
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('Handle nested @cypher fields using parameterized arguments and cypherParams', t => {
  const graphQLQuery = `query someQuery(
    $strArg1: String
    $strArg2: String
    $strArg3: String
    $strInputArg: strInput
  ) {
    Movie {
      _id
      currentUserId(strArg: $strArg1)
      ratings {
        currentUserId(strArg: $strArg2)
        User {
          name
          currentUserId(strArg: $strArg3, strInputArg: $strInputArg)
        }
      }
    }
  }`,
    graphqlParams = {
      strArg1: 'Yo Dawg',
      strArg2: 'Yoo Dawg',
      strArg3: 'Yooo Dawg',
      strInputArg: {
        strArg: 'Yoooo Dawg'
      },
      cypherParams: CYPHER_PARAMS
    },
    expectedCypherQuery = `MATCH (\`movie\`:\`Movie\`${ADDITIONAL_MOVIE_LABELS}) RETURN \`movie\` {_id: ID(\`movie\`),currentUserId: apoc.cypher.runFirstColumn("RETURN $cypherParams.currentUserId AS cypherParamsUserId", {this: movie, cypherParams: $cypherParams, strArg: $1_strArg}, false),ratings: [(\`movie\`)<-[\`movie_ratings_relation\`:\`RATED\`]-(:\`User\`) | movie_ratings_relation {currentUserId: apoc.cypher.runFirstColumn("RETURN $cypherParams.currentUserId AS cypherParamsUserId", {this: movie_ratings_relation, cypherParams: $cypherParams, strArg: $2_strArg}, false),User: head([(:\`Movie\`${ADDITIONAL_MOVIE_LABELS})<-[\`movie_ratings_relation\`]-(\`movie_ratings_User\`:\`User\`) | movie_ratings_User { .name ,currentUserId: apoc.cypher.runFirstColumn("RETURN $cypherParams.currentUserId AS cypherParamsUserId", {this: movie_ratings_User, cypherParams: $cypherParams, strArg: $3_strArg, strInputArg: $3_strInputArg}, false)}]) }] } AS \`movie\``,
    expectedParams = {
      offset: 0,
      first: -1,
      '1_strArg': 'Yo Dawg',
      '2_strArg': 'Yoo Dawg',
      '3_strArg': 'Yooo Dawg',
      '3_strInputArg': {
        strArg: 'Yoooo Dawg'
      },
      cypherParams: CYPHER_PARAMS
    };

  t.plan(2);
  return Promise.all([
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      graphqlParams,
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('Handle @cypher mutation with input type argument', t => {
  const graphQLQuery = `mutation someMutation($strArg: String, $strInputArg: strInput) {
    customWithArguments(strArg: $strArg, strInputArg: $strInputArg )
  }`,
    graphqlParams = {
      strArg: 'Hello',
      strInputArg: {
        strArg: 'World'
      }
    },
    expectedCypherQuery = `CALL apoc.cypher.doIt("RETURN $strInputArg.strArg", {strArg:$strArg, strInputArg:$strInputArg, first:$first, offset:$offset, cypherParams: $cypherParams}) YIELD value
    WITH apoc.map.values(value, [keys(value)[0]])[0] AS \`string\`
    RETURN \`string\` `,
    expectedParams = {
      first: -1,
      cypherParams: CYPHER_PARAMS,
      offset: 0,
      strArg: 'Hello',
      strInputArg: {
        strArg: 'World'
      }
    };

  t.plan(4);
  return Promise.all([
    cypherTestRunner(
      t,
      graphQLQuery,
      graphqlParams,
      expectedCypherQuery,
      expectedParams
    ),
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      graphqlParams,
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('Handle @cypher mutation with list arguments', t => {
  const graphQLQuery = `mutation someMutation(
    $integer: Int
    $datetime: _Neo4jDateTimeInput
    $integers: [Int]
    $datetimes: [_Neo4jDateTimeInput]
    $point: _Neo4jPointInput
    $points: [_Neo4jPointInput]
  ) {
    customCreateNode(
      integer: $integer
      datetime: $datetime
      integers: $integers
      datetimes: $datetimes
      point: $point
      points: $points
    )
  }
  `,
    graphqlParams = {
      integer: 2,
      datetime: { year: 2020, month: 9, day: 21 },
      integers: [2, 4, 6],
      datetimes: [{ year: 2020, month: 9, day: 22 }],
      point: { x: 10.1, y: 11.2, z: 12.3 },
      points: [
        { x: 10.1, y: 11.2, z: 12.3 },
        { x: 10.2, y: 11.3, z: 12.4 }
      ]
    },
    expectedCypherQuery = `CALL apoc.cypher.doIt("CREATE (n:Node { integer: $integer, datetime: datetime($datetime), point: point($point), integers: $integers, datetimes: [value IN $datetimes | datetime(value)], points: [value IN $points | point(value)] }) RETURN TRUE", {integer:$integer, datetime:$datetime, integers:$integers, datetimes:$datetimes, point:$point, points:$points, first:$first, offset:$offset, cypherParams: $cypherParams}) YIELD value
    WITH apoc.map.values(value, [keys(value)[0]])[0] AS \`boolean\`
    RETURN \`boolean\` `,
    expectedParams = {
      first: -1,
      cypherParams: CYPHER_PARAMS,
      offset: 0,
      integer: {
        low: 2,
        high: 0
      },
      datetime: {
        year: {
          low: 2020,
          high: 0
        },
        month: {
          low: 9,
          high: 0
        },
        day: {
          low: 21,
          high: 0
        }
      },
      integers: [
        {
          low: 2,
          high: 0
        },
        {
          low: 4,
          high: 0
        },
        {
          low: 6,
          high: 0
        }
      ],
      datetimes: [
        {
          year: {
            low: 2020,
            high: 0
          },
          month: {
            low: 9,
            high: 0
          },
          day: {
            low: 22,
            high: 0
          }
        }
      ],
      point: {
        x: 10.1,
        y: 11.2,
        z: 12.3
      },
      points: [
        {
          x: 10.1,
          y: 11.2,
          z: 12.3
        },
        {
          x: 10.2,
          y: 11.3,
          z: 12.4
        }
      ]
    };

  t.plan(4);
  return Promise.all([
    cypherTestRunner(
      t,
      graphQLQuery,
      graphqlParams,
      expectedCypherQuery,
      expectedParams
    ),
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      graphqlParams,
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('Handle @cypher query with parameterized input type argument', t => {
  const graphQLQuery = `query someQuery ($strArg: String, $strInputArg: strInput) {
    customWithArguments(strArg: $strArg, strInputArg: $strInputArg )
  }`,
    graphqlParams = {
      strArg: 'Hello',
      strInputArg: {
        strArg: 'World'
      }
    },
    expectedCypherQuery = `WITH apoc.cypher.runFirstColumn("RETURN $strInputArg.strArg", {offset:$offset, first:$first, strArg:$strArg, strInputArg:$strInputArg, cypherParams: $cypherParams}, True) AS x UNWIND x AS \`string\` RETURN \`string\` `,
    expectedParams = {
      first: -1,
      offset: 0,
      strArg: 'Hello',
      strInputArg: {
        strArg: 'World'
      },
      cypherParams: CYPHER_PARAMS
    };

  t.plan(4);
  return Promise.all([
    cypherTestRunner(
      t,
      graphQLQuery,
      graphqlParams,
      expectedCypherQuery,
      expectedParams
    ),
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      graphqlParams,
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('Handle @cypher field on root query type with scalar payload, no args', t => {
  const graphQLQuery = `query {
    TemporalNode {
      computedTimestamp
    }
  }`,
    expectedCypherQuery = `MATCH (\`temporalNode\`:\`TemporalNode\`) RETURN \`temporalNode\` {computedTimestamp: apoc.cypher.runFirstColumn("RETURN toString(datetime())", {this: temporalNode}, false)} AS \`temporalNode\``,
    expectedParams = {
      first: -1,
      offset: 0
    };

  t.plan(2);
  return Promise.all([
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('Handle @cypher field with parameterized value for field of input type argument', t => {
  const graphQLQuery = `query someQuery(
    $strArg: String
  ) {
    User {
      name
      currentUserId(strInputArg: {
        strArg: $strArg
      })
    }
  }`,
    graphqlParams = {
      strArg: 'Yo Dawg'
    },
    expectedCypherQuery = `MATCH (\`user\`:\`User\`) RETURN \`user\` { .name ,currentUserId: apoc.cypher.runFirstColumn("RETURN $cypherParams.currentUserId AS cypherParamsUserId", {this: user, cypherParams: $cypherParams, strArg: "Neo4j", strInputArg: $1_strInputArg}, false)} AS \`user\``,
    expectedParams = {
      '1_strInputArg': {
        strArg: 'Yo Dawg'
      },
      first: -1,
      offset: 0,
      cypherParams: CYPHER_PARAMS
    };

  t.plan(4);
  return Promise.all([
    cypherTestRunner(
      t,
      graphQLQuery,
      graphqlParams,
      expectedCypherQuery,
      expectedParams
    ),
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      graphqlParams,
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('Handle order by field with underscores - root level', t => {
  const graphQLQuery = `{Movie(orderBy: someprefix_title_with_underscores_desc){title}}`,
    expectedCypherQuery =
      'MATCH (`movie`:`Movie`:`u_user-id`:`newMovieLabel`) WITH `movie` ORDER BY movie.someprefix_title_with_underscores DESC RETURN `movie` { .title } AS `movie`',
    expectedParams = {
      first: -1,
      offset: 0,
      cypherParams: CYPHER_PARAMS
    };

  t.plan(2);
  return Promise.all([
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('Handle order by field with underscores - nested field ', t => {
  const graphQLQuery = `
  {
    GenresBySubstring(substring: "Foo") {
      movies(orderBy: someprefix_title_with_underscores_desc) {
        title
      }
    }
  }
  `,
    expectedCypherQuery =
      'WITH apoc.cypher.runFirstColumn("MATCH (g:Genre) WHERE toLower(g.name) CONTAINS toLower($substring) RETURN g", {offset:$offset, first:$first, substring:$substring, cypherParams: $cypherParams}, True) AS x UNWIND x AS `genre` RETURN `genre` {movies: apoc.coll.sortMulti([(`genre`)<-[:`IN_GENRE`]-(`genre_movies`:`Movie`:`u_user-id`:`newMovieLabel`) | `genre_movies` { .title , .someprefix_title_with_underscores }], [\'someprefix_title_with_underscores\']) } AS `genre`',
    expectedParams = {
      '1_orderBy': 'someprefix_title_with_underscores_desc',
      cypherParams: CYPHER_PARAMS,
      first: -1,
      offset: 0,
      substring: 'Foo'
    };

  t.plan(2);
  return Promise.all([
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('query only an interface field', t => {
  const graphQLQuery = `query {
    Camera {
      id
    }
  }`,
    expectedCypherQuery = `MATCH (\`camera\`:\`Camera\`) RETURN \`camera\` {FRAGMENT_TYPE: head( [ label IN labels(\`camera\`) WHERE label IN $Camera_derivedTypes ] ), .id } AS \`camera\``,
    expectedParams = {
      first: -1,
      offset: 0,
      cypherParams: CYPHER_PARAMS,
      Camera_derivedTypes: ['NewCamera', 'OldCamera']
    };

  t.plan(4);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, expectedParams),
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('query only __typename field on interface type', t => {
  const graphQLQuery = `query {
    Camera {
      __typename
    }
  }`,
    expectedCypherQuery = `MATCH (\`camera\`:\`Camera\`) RETURN \`camera\` {FRAGMENT_TYPE: head( [ label IN labels(\`camera\`) WHERE label IN $Camera_derivedTypes ] )} AS \`camera\``,
    expectedParams = {
      first: -1,
      offset: 0,
      cypherParams: CYPHER_PARAMS,
      Camera_derivedTypes: ['NewCamera', 'OldCamera']
    };

  t.plan(4);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, expectedParams),
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('query only interface fields', t => {
  const graphQLQuery = `query {
    Camera {
      id
      type
      make
      weight
    }
  }`,
    expectedCypherQuery = `MATCH (\`camera\`:\`Camera\`) RETURN \`camera\` {FRAGMENT_TYPE: head( [ label IN labels(\`camera\`) WHERE label IN $Camera_derivedTypes ] ), .id , .type , .make , .weight } AS \`camera\``,
    expectedParams = {
      first: -1,
      offset: 0,
      cypherParams: CYPHER_PARAMS,
      Camera_derivedTypes: ['NewCamera', 'OldCamera']
    };

  t.plan(4);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, expectedParams),
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('query only interface fields using untyped inline fragment', t => {
  const graphQLQuery = `query {
    Camera {
      id
      type
      ... {
        make
        weight
      }
    }
  }`,
    expectedCypherQuery = `MATCH (\`camera\`:\`Camera\`) RETURN \`camera\` {FRAGMENT_TYPE: head( [ label IN labels(\`camera\`) WHERE label IN $Camera_derivedTypes ] ), .id , .type , .make , .weight } AS \`camera\``,
    expectedParams = {
      first: -1,
      offset: 0,
      cypherParams: CYPHER_PARAMS,
      Camera_derivedTypes: ['NewCamera', 'OldCamera']
    };

  t.plan(4);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, expectedParams),
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('query only computed interface fields', t => {
  const graphQLQuery = `query {
    CustomCameras {
      id
      type
      make
      weight
    }
  }`,
    expectedCypherQuery = `WITH apoc.cypher.runFirstColumn("MATCH (c:Camera) RETURN c", {offset:$offset, first:$first, cypherParams: $cypherParams}, True) AS x UNWIND x AS \`camera\` RETURN \`camera\` {FRAGMENT_TYPE: head( [ label IN labels(\`camera\`) WHERE label IN $Camera_derivedTypes ] ), .id , .type , .make , .weight } AS \`camera\``,
    expectedParams = {
      first: -1,
      offset: 0,
      cypherParams: CYPHER_PARAMS,
      Camera_derivedTypes: ['NewCamera', 'OldCamera']
    };

  t.plan(4);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, expectedParams),
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('query interface type relationship field', t => {
  const graphQLQuery = `query {
    Camera {
      id
      type
      make
      weight
      operators {
        userId
        name
        __typename
      }
    }
  }`,
    expectedCypherQuery = `MATCH (\`camera\`:\`Camera\`) RETURN \`camera\` {FRAGMENT_TYPE: head( [ label IN labels(\`camera\`) WHERE label IN $Camera_derivedTypes ] ), .id , .type , .make , .weight ,operators: [(\`camera\`)<-[:\`cameras\`]-(\`camera_operators\`:\`Person\`) | \`camera_operators\` {FRAGMENT_TYPE: head( [ label IN labels(\`camera_operators\`) WHERE label IN $Person_derivedTypes ] ), .userId , .name }] } AS \`camera\``,
    expectedParams = {
      offset: 0,
      first: -1,
      Person_derivedTypes: ['Actor', 'CameraMan', 'User'],
      cypherParams: CYPHER_PARAMS,
      Camera_derivedTypes: ['NewCamera', 'OldCamera']
    };

  t.plan(4);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, expectedParams),
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('query reflexive interface type relationship field', t => {
  const graphQLQuery = `query {
    NewCamera {
      id
      make
      reflexiveInterfaceRelationship {
        id
        type
        weight
      }
    }
  }
  `,
    expectedCypherQuery = `MATCH (\`newCamera\`:\`NewCamera\`) RETURN \`newCamera\` { .id , .make ,reflexiveInterfaceRelationship: [(\`newCamera\`)-[:\`REFLEXIVE_INTERFACE_RELATIONSHIP\`]->(\`newCamera_reflexiveInterfaceRelationship\`:\`Camera\`) | \`newCamera_reflexiveInterfaceRelationship\` {FRAGMENT_TYPE: head( [ label IN labels(\`newCamera_reflexiveInterfaceRelationship\`) WHERE label IN $Camera_derivedTypes ] ), .id , .type , .weight }] } AS \`newCamera\``,
    expectedParams = {
      offset: 0,
      first: -1,
      Camera_derivedTypes: ['NewCamera', 'OldCamera'],
      cypherParams: CYPHER_PARAMS
    };

  t.plan(2);
  return Promise.all([
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('query reflexive interface type relationship field using fragments', t => {
  const graphQLQuery = `query {
    Camera {
      id
      ... on NewCamera {
        make
        reflexiveInterfaceRelationship {
          ... on Camera {
            id
            type
            weight
            make
          }
        }
      }
      reflexiveInterfaceRelationship {
        ... on OldCamera {
          weight
        }
      }
    }
  }  
  `,
    expectedCypherQuery = `MATCH (\`camera\`:\`Camera\`) WHERE ("NewCamera" IN labels(\`camera\`) OR "OldCamera" IN labels(\`camera\`)) RETURN head([\`camera\` IN [\`camera\`] WHERE "NewCamera" IN labels(\`camera\`) | \`camera\` { FRAGMENT_TYPE: "NewCamera",  .make ,reflexiveInterfaceRelationship: [(\`camera\`)-[:\`REFLEXIVE_INTERFACE_RELATIONSHIP\`]->(\`camera_reflexiveInterfaceRelationship\`:\`Camera\`) WHERE ("NewCamera" IN labels(\`camera_reflexiveInterfaceRelationship\`) OR "OldCamera" IN labels(\`camera_reflexiveInterfaceRelationship\`)) | head([\`camera_reflexiveInterfaceRelationship\` IN [\`camera_reflexiveInterfaceRelationship\`] WHERE "NewCamera" IN labels(\`camera_reflexiveInterfaceRelationship\`) | \`camera_reflexiveInterfaceRelationship\` { FRAGMENT_TYPE: "NewCamera",  .id , .type , .weight , .make  }] + [\`camera_reflexiveInterfaceRelationship\` IN [\`camera_reflexiveInterfaceRelationship\`] WHERE "OldCamera" IN labels(\`camera_reflexiveInterfaceRelationship\`) | \`camera_reflexiveInterfaceRelationship\` { FRAGMENT_TYPE: "OldCamera",  .weight , .id , .type , .make  }])] , .id  }] + [\`camera\` IN [\`camera\`] WHERE "OldCamera" IN labels(\`camera\`) | \`camera\` { FRAGMENT_TYPE: "OldCamera",  .id ,reflexiveInterfaceRelationship: [(\`camera\`)-[:\`REFLEXIVE_INTERFACE_RELATIONSHIP\`]->(\`camera_reflexiveInterfaceRelationship\`:\`Camera\`) WHERE ("OldCamera" IN labels(\`camera_reflexiveInterfaceRelationship\`)) | head([\`camera_reflexiveInterfaceRelationship\` IN [\`camera_reflexiveInterfaceRelationship\`] WHERE "OldCamera" IN labels(\`camera_reflexiveInterfaceRelationship\`) | \`camera_reflexiveInterfaceRelationship\` { FRAGMENT_TYPE: "OldCamera",  .weight  }])]  }]) AS \`camera\``,
    expectedParams = {
      offset: 0,
      first: -1,
      cypherParams: CYPHER_PARAMS
    };

  t.plan(2);
  return Promise.all([
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('query only __typename field on interface type relationship field', t => {
  const graphQLQuery = `query {
    Camera {
      id
      operators {
        __typename
      }
    }
  }`,
    expectedCypherQuery = `MATCH (\`camera\`:\`Camera\`) RETURN \`camera\` {FRAGMENT_TYPE: head( [ label IN labels(\`camera\`) WHERE label IN $Camera_derivedTypes ] ), .id ,operators: [(\`camera\`)<-[:\`cameras\`]-(\`camera_operators\`:\`Person\`) | \`camera_operators\` {FRAGMENT_TYPE: head( [ label IN labels(\`camera_operators\`) WHERE label IN $Person_derivedTypes ] )}] } AS \`camera\``,
    expectedParams = {
      offset: 0,
      first: -1,
      Person_derivedTypes: ['Actor', 'CameraMan', 'User'],
      cypherParams: CYPHER_PARAMS,
      Camera_derivedTypes: ['NewCamera', 'OldCamera']
    };

  t.plan(4);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, expectedParams),
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('query computed interface type relationship field', t => {
  const graphQLQuery = `query {
    CustomCameras {
      id
      type
      make
      weight
      computedOperators {
        userId
        name
        __typename
      }
    }
  }`,
    expectedCypherQuery = `WITH apoc.cypher.runFirstColumn("MATCH (c:Camera) RETURN c", {offset:$offset, first:$first, cypherParams: $cypherParams}, True) AS x UNWIND x AS \`camera\` RETURN \`camera\` {FRAGMENT_TYPE: head( [ label IN labels(\`camera\`) WHERE label IN $Camera_derivedTypes ] ), .id , .type , .make , .weight ,computedOperators: [ camera_computedOperators IN apoc.cypher.runFirstColumn("MATCH (this)<-[:cameras]-(p:Person) RETURN p", {this: camera, cypherParams: $cypherParams}, true) | camera_computedOperators {FRAGMENT_TYPE: head( [ label IN labels(camera_computedOperators) WHERE label IN $Person_derivedTypes ] ), .userId , .name }] } AS \`camera\``,
    expectedParams = {
      offset: 0,
      first: -1,
      Person_derivedTypes: ['Actor', 'CameraMan', 'User'],
      cypherParams: CYPHER_PARAMS,
      Camera_derivedTypes: ['NewCamera', 'OldCamera']
    };

  t.plan(4);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, expectedParams),
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('query computed interface type relationship field using only an inline fragment', t => {
  const graphQLQuery = `query {
    CustomCameras {
      id
      type
      make
      weight
      computedOperators {
        ... on CameraMan {
          userId
          name
        }
      }
    }
  }`,
    expectedCypherQuery = `WITH apoc.cypher.runFirstColumn("MATCH (c:Camera) RETURN c", {offset:$offset, first:$first, cypherParams: $cypherParams}, True) AS x UNWIND x AS \`camera\` RETURN \`camera\` {FRAGMENT_TYPE: head( [ label IN labels(\`camera\`) WHERE label IN $Camera_derivedTypes ] ), .id , .type , .make , .weight ,computedOperators: [camera_computedOperators IN [ camera_computedOperators IN apoc.cypher.runFirstColumn("MATCH (this)<-[:cameras]-(p:Person) RETURN p", {this: camera, cypherParams: $cypherParams}, true) WHERE ("CameraMan" IN labels(camera_computedOperators)) | camera_computedOperators] | head([\`camera_computedOperators\` IN [\`camera_computedOperators\`] WHERE "CameraMan" IN labels(\`camera_computedOperators\`) | \`camera_computedOperators\` { FRAGMENT_TYPE: "CameraMan",  .userId , .name  }])] } AS \`camera\``,
    expectedParams = {
      offset: 0,
      first: -1,
      cypherParams: CYPHER_PARAMS,
      Camera_derivedTypes: ['NewCamera', 'OldCamera']
    };

  t.plan(4);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, expectedParams),
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('query only fields on an implementing type using an inline fragment', t => {
  const graphQLQuery = `query {
    Camera {
      ... on OldCamera {
        id
        type
      }
    }
  }`,
    expectedCypherQuery = `MATCH (\`camera\`:\`Camera\`) WHERE ("OldCamera" IN labels(\`camera\`)) RETURN head([\`camera\` IN [\`camera\`] WHERE "OldCamera" IN labels(\`camera\`) | \`camera\` { FRAGMENT_TYPE: "OldCamera",  .id , .type  }]) AS \`camera\``,
    expectedParams = {
      offset: 0,
      first: -1,
      cypherParams: CYPHER_PARAMS
    };

  t.plan(4);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, expectedParams),
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('query only interface type fields using fragments', t => {
  const graphQLQuery = `query {
    Person {
      userId
      ... on Person {
        name
      }
      ...Person
    }
  }
  
  fragment Person on Person {
    __typename
  }`,
    expectedCypherQuery = `MATCH (\`person\`:\`Person\`) RETURN \`person\` {FRAGMENT_TYPE: head( [ label IN labels(\`person\`) WHERE label IN $Person_derivedTypes ] ), .userId , .name } AS \`person\``,
    expectedParams = {
      first: -1,
      offset: 0,
      cypherParams: CYPHER_PARAMS,
      Person_derivedTypes: ['Actor', 'CameraMan', 'User']
    };

  t.plan(4);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, expectedParams),
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('query fields on interface and implementing object type using only fragments', t => {
  const graphQLQuery = `query {
    Person {
      ... on Person {
        userId
        __typename      
      }
      ...Person    
    }
  }

  fragment Person on Person {
    ... on CameraMan {
      name
    }
  }`,
    expectedCypherQuery = `MATCH (\`person\`:\`Person\`) WHERE ("Actor" IN labels(\`person\`) OR "CameraMan" IN labels(\`person\`) OR "User" IN labels(\`person\`)) RETURN head([\`person\` IN [\`person\`] WHERE "Actor" IN labels(\`person\`) | \`person\` { FRAGMENT_TYPE: "Actor",  .userId  }] + [\`person\` IN [\`person\`] WHERE "CameraMan" IN labels(\`person\`) | \`person\` { FRAGMENT_TYPE: "CameraMan",  .name , .userId  }] + [\`person\` IN [\`person\`] WHERE "User" IN labels(\`person\`) | \`person\` { FRAGMENT_TYPE: "User",  .userId  }]) AS \`person\``,
    expectedParams = {
      first: -1,
      offset: 0,
      cypherParams: CYPHER_PARAMS
    };

  t.plan(4);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, expectedParams),
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('query fields on interface and implementing object types using only fragments', t => {
  const graphQLQuery = `query {
    Person {
      ...Person
      ... on Person {
        ... on User {
          userId        
        }
        __typename      
      }
    }
  }

  fragment Person on Person {
    ... on Actor {
      _id
    }
  }`,
    expectedCypherQuery = `MATCH (\`person\`:\`Person\`) WHERE ("Actor" IN labels(\`person\`) OR "User" IN labels(\`person\`)) RETURN head([\`person\` IN [\`person\`] WHERE "Actor" IN labels(\`person\`) | \`person\` { FRAGMENT_TYPE: "Actor", _id: ID(\`person\`) }] + [\`person\` IN [\`person\`] WHERE "User" IN labels(\`person\`) | \`person\` { FRAGMENT_TYPE: "User",  .userId  }]) AS \`person\``,
    expectedParams = {
      first: -1,
      offset: 0,
      cypherParams: CYPHER_PARAMS
    };

  t.plan(4);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, expectedParams),
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('query fields on object type using inline fragment on implemented interface', t => {
  const graphQLQuery = `query {
    User {
      name
      ... on Person {
        userId
        __typename    
      }
    }
  }`,
    expectedCypherQuery = `MATCH (\`user\`:\`User\`) RETURN \`user\` { .name , .userId } AS \`user\``,
    expectedParams = {
      first: -1,
      offset: 0,
      cypherParams: CYPHER_PARAMS
    };

  t.plan(4);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, expectedParams),
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('query fields on object type using only fragments on implemented interface', t => {
  const graphQLQuery = `query {
    User {
      ... on Person {
        userId
      }
      ...Person
    }
  }
  
  fragment Person on Person {
    __typename
  }
  `,
    expectedCypherQuery = `MATCH (\`user\`:\`User\`) RETURN \`user\` { .userId } AS \`user\``,
    expectedParams = {
      first: -1,
      offset: 0,
      cypherParams: CYPHER_PARAMS
    };

  t.plan(4);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, expectedParams),
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('pagination used on root and nested interface type field', t => {
  const graphQLQuery = `query {
    Camera(first: 2, offset: 1) {
      id
      type
      make
      weight
      operators(first: 1, offset: 1) {
        name
        ... on CameraMan {
          userId
        }
      }
    }
  }`,
    expectedCypherQuery = `MATCH (\`camera\`:\`Camera\`) RETURN \`camera\` {FRAGMENT_TYPE: head( [ label IN labels(\`camera\`) WHERE label IN $Camera_derivedTypes ] ), .id , .type , .make , .weight ,operators: [(\`camera\`)<-[:\`cameras\`]-(\`camera_operators\`:\`Person\`) WHERE ("Actor" IN labels(\`camera_operators\`) OR "CameraMan" IN labels(\`camera_operators\`) OR "User" IN labels(\`camera_operators\`)) | head([\`camera_operators\` IN [\`camera_operators\`] WHERE "Actor" IN labels(\`camera_operators\`) | \`camera_operators\` { FRAGMENT_TYPE: "Actor",  .name  }] + [\`camera_operators\` IN [\`camera_operators\`] WHERE "CameraMan" IN labels(\`camera_operators\`) | \`camera_operators\` { FRAGMENT_TYPE: "CameraMan",  .userId , .name  }] + [\`camera_operators\` IN [\`camera_operators\`] WHERE "User" IN labels(\`camera_operators\`) | \`camera_operators\` { FRAGMENT_TYPE: "User",  .name  }])][1..2] } AS \`camera\` SKIP toInteger($offset) LIMIT toInteger($first)`,
    expectedParams = {
      first: 2,
      offset: 1,
      '1_first': 1,
      '1_offset': 1,
      Camera_derivedTypes: ['NewCamera', 'OldCamera'],
      cypherParams: CYPHER_PARAMS
    };

  t.plan(2);
  return Promise.all([
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('ordering used on root and nested interface type field', t => {
  const graphQLQuery = `query {
    Camera(orderBy: type_asc) {
      id
      type
      make
      weight
      operators(orderBy: name_desc) {
        name
        ... on CameraMan {
          userId
        }
      }
    }
  }`,
    expectedCypherQuery = `MATCH (\`camera\`:\`Camera\`) WITH \`camera\` ORDER BY camera.type ASC RETURN \`camera\` {FRAGMENT_TYPE: head( [ label IN labels(\`camera\`) WHERE label IN $Camera_derivedTypes ] ), .id , .type , .make , .weight ,operators: apoc.coll.sortMulti([(\`camera\`)<-[:\`cameras\`]-(\`camera_operators\`:\`Person\`) WHERE ("Actor" IN labels(\`camera_operators\`) OR "CameraMan" IN labels(\`camera_operators\`) OR "User" IN labels(\`camera_operators\`)) | head([\`camera_operators\` IN [\`camera_operators\`] WHERE "Actor" IN labels(\`camera_operators\`) | \`camera_operators\` { FRAGMENT_TYPE: "Actor",  .name  }] + [\`camera_operators\` IN [\`camera_operators\`] WHERE "CameraMan" IN labels(\`camera_operators\`) | \`camera_operators\` { FRAGMENT_TYPE: "CameraMan",  .userId , .name  }] + [\`camera_operators\` IN [\`camera_operators\`] WHERE "User" IN labels(\`camera_operators\`) | \`camera_operators\` { FRAGMENT_TYPE: "User",  .name  }])], ['name']) } AS \`camera\``,
    expectedParams = {
      offset: 0,
      first: -1,
      '1_orderBy': 'name_desc',
      cypherParams: CYPHER_PARAMS,
      Camera_derivedTypes: ['NewCamera', 'OldCamera']
    };

  t.plan(4);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, expectedParams),
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('filtering used on root and nested interface type field with only fragments', t => {
  const graphQLQuery = `query {
    Camera(
      filter: {
        operators_not: null
      }
    ) {
      ... on NewCamera {
        operators(
          filter: {
            name_not: null
          }
        ) {
          ... on CameraMan {
            name
          }
        }
      }
    }
  }`,
    expectedCypherQuery = `MATCH (\`camera\`:\`Camera\`) WHERE ("NewCamera" IN labels(\`camera\`)) AND ($filter._operators_not_null = TRUE AND EXISTS((\`camera\`)<-[:cameras]-(:Person))) RETURN head([\`camera\` IN [\`camera\`] WHERE "NewCamera" IN labels(\`camera\`) | \`camera\` { FRAGMENT_TYPE: "NewCamera", operators: [(\`camera\`)<-[:\`cameras\`]-(\`camera_operators\`:\`Person\`) WHERE ("CameraMan" IN labels(\`camera_operators\`)) AND ($1_filter._name_not_null = TRUE AND EXISTS(\`camera_operators\`.name)) | head([\`camera_operators\` IN [\`camera_operators\`] WHERE "CameraMan" IN labels(\`camera_operators\`) | \`camera_operators\` { FRAGMENT_TYPE: "CameraMan",  .name  }])]  }]) AS \`camera\``,
    expectedParams = {
      offset: 0,
      first: -1,
      filter: {
        _operators_not_null: true
      },
      '1_filter': {
        _name_not_null: true
      },
      cypherParams: CYPHER_PARAMS
    };

  t.plan(4);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, expectedParams),
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('filtering used on root and nested interface using fragments and query variables', t => {
  const graphQLQuery = `query getCameras($type: String, $operatorsFilter: _PersonFilter, $computedOperatorName: String) {
    Camera(type: $type) {
      id
      type
      ... on NewCamera {
        operators(filter: $operatorsFilter) {
          userId
        }
      }
      ... on OldCamera {
        operators(filter: $operatorsFilter) {
          userId
        }
      }
      operators(filter: $operatorsFilter) {
        userId
      }
      computedOperators(name: $computedOperatorName) {
        userId
        name
      }
    }
  }`,
    graphqlParams = {
      type: 'macro',
      operatorsFilter: {
        userId: 'man001'
      },
      computedOperatorName: 'Johnnie Zoom'
    },
    expectedCypherQuery = `MATCH (\`camera\`:\`Camera\` {type:$type}) WHERE ("NewCamera" IN labels(\`camera\`) OR "OldCamera" IN labels(\`camera\`)) RETURN head([\`camera\` IN [\`camera\`] WHERE "NewCamera" IN labels(\`camera\`) | \`camera\` { FRAGMENT_TYPE: "NewCamera", operators: [(\`camera\`)<-[:\`cameras\`]-(\`camera_operators\`:\`Person\`) WHERE (\`camera_operators\`.userId = $1_filter.userId) | \`camera_operators\` {FRAGMENT_TYPE: head( [ label IN labels(\`camera_operators\`) WHERE label IN $Person_derivedTypes ] ), .userId }] , .id , .type ,computedOperators: [ camera_computedOperators IN apoc.cypher.runFirstColumn("MATCH (this)<-[:cameras]-(p:Person) RETURN p", {this: camera, cypherParams: $cypherParams, name: $3_name}, true) | camera_computedOperators {FRAGMENT_TYPE: head( [ label IN labels(camera_computedOperators) WHERE label IN $Person_derivedTypes ] ), .userId , .name }]  }] + [\`camera\` IN [\`camera\`] WHERE "OldCamera" IN labels(\`camera\`) | \`camera\` { FRAGMENT_TYPE: "OldCamera", operators: [(\`camera\`)<-[:\`cameras\`]-(\`camera_operators\`:\`Person\`) WHERE (\`camera_operators\`.userId = $1_filter.userId) | \`camera_operators\` {FRAGMENT_TYPE: head( [ label IN labels(\`camera_operators\`) WHERE label IN $Person_derivedTypes ] ), .userId }] , .id , .type ,computedOperators: [ camera_computedOperators IN apoc.cypher.runFirstColumn("MATCH (this)<-[:cameras]-(p:Person) RETURN p", {this: camera, cypherParams: $cypherParams, name: $3_name}, true) | camera_computedOperators {FRAGMENT_TYPE: head( [ label IN labels(camera_computedOperators) WHERE label IN $Person_derivedTypes ] ), .userId , .name }]  }]) AS \`camera\``,
    expectedParams = {
      offset: 0,
      first: -1,
      type: 'macro',
      '1_filter': {
        userId: 'man001'
      },
      '3_name': 'Johnnie Zoom',
      Person_derivedTypes: ['Actor', 'CameraMan', 'User'],
      cypherParams: CYPHER_PARAMS
    };

  t.plan(4);
  return Promise.all([
    cypherTestRunner(
      t,
      graphQLQuery,
      graphqlParams,
      expectedCypherQuery,
      expectedParams
    ),
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      graphqlParams,
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('query only computed fields on an implementing type using an inline fragment', t => {
  const graphQLQuery = `query {
    CustomCameras {
      ... on OldCamera {
        id
        type
      }
    }
  }`,
    expectedCypherQuery = `WITH apoc.cypher.runFirstColumn("MATCH (c:Camera) RETURN c", {offset:$offset, first:$first, cypherParams: $cypherParams}, True) AS x WITH [\`camera\` IN x WHERE ("OldCamera" IN labels(\`camera\`)) | \`camera\`] AS x UNWIND x AS \`camera\` RETURN head([\`camera\` IN [\`camera\`] WHERE "OldCamera" IN labels(\`camera\`) | \`camera\` { FRAGMENT_TYPE: "OldCamera",  .id , .type  }]) AS \`camera\``,
    expectedParams = {
      offset: 0,
      first: -1,
      cypherParams: CYPHER_PARAMS
    };

  t.plan(4);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, expectedParams),
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('query computed interface fields using fragments on implementing types', t => {
  const graphQLQuery = `query {
    CustomCameras {
      id
      ... on OldCamera {
        type
      }
      ...NewCameraFragment
      __typename
    }
  }
  
  fragment NewCameraFragment on NewCamera {
    type
    weight
  }`,
    expectedCypherQuery = `WITH apoc.cypher.runFirstColumn("MATCH (c:Camera) RETURN c", {offset:$offset, first:$first, cypherParams: $cypherParams}, True) AS x WITH [\`camera\` IN x WHERE ("NewCamera" IN labels(\`camera\`) OR "OldCamera" IN labels(\`camera\`)) | \`camera\`] AS x UNWIND x AS \`camera\` RETURN head([\`camera\` IN [\`camera\`] WHERE "NewCamera" IN labels(\`camera\`) | \`camera\` { FRAGMENT_TYPE: "NewCamera",  .type , .weight , .id  }] + [\`camera\` IN [\`camera\`] WHERE "OldCamera" IN labels(\`camera\`) | \`camera\` { FRAGMENT_TYPE: "OldCamera",  .type , .id  }]) AS \`camera\``,
    expectedParams = {
      offset: 0,
      first: -1,
      cypherParams: CYPHER_PARAMS
    };

  t.plan(4);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, expectedParams),
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('query interface type relationship field using inline fragment on implementing type', t => {
  const graphQLQuery = `query {
    Camera {
      ... on OldCamera {
        id
        type
        operators {
          userId
          ... on CameraMan {
            name
          }
        }
      }
    }
  }`,
    expectedCypherQuery = `MATCH (\`camera\`:\`Camera\`) WHERE ("OldCamera" IN labels(\`camera\`)) RETURN head([\`camera\` IN [\`camera\`] WHERE "OldCamera" IN labels(\`camera\`) | \`camera\` { FRAGMENT_TYPE: "OldCamera",  .id , .type ,operators: [(\`camera\`)<-[:\`cameras\`]-(\`camera_operators\`:\`Person\`) WHERE ("Actor" IN labels(\`camera_operators\`) OR "CameraMan" IN labels(\`camera_operators\`) OR "User" IN labels(\`camera_operators\`)) | head([\`camera_operators\` IN [\`camera_operators\`] WHERE "Actor" IN labels(\`camera_operators\`) | \`camera_operators\` { FRAGMENT_TYPE: "Actor",  .userId  }] + [\`camera_operators\` IN [\`camera_operators\`] WHERE "CameraMan" IN labels(\`camera_operators\`) | \`camera_operators\` { FRAGMENT_TYPE: "CameraMan",  .name , .userId  }] + [\`camera_operators\` IN [\`camera_operators\`] WHERE "User" IN labels(\`camera_operators\`) | \`camera_operators\` { FRAGMENT_TYPE: "User",  .userId  }])]  }]) AS \`camera\``,
    expectedParams = {
      offset: 0,
      first: -1,
      cypherParams: CYPHER_PARAMS
    };

  t.plan(4);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, expectedParams),
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('query interface type relationship field using only inline fragment', t => {
  const graphQLQuery = `query {
    Camera {
      ... on OldCamera {
        id
        type
        operators {
          ... on CameraMan {
            userId
            name
          }
        }
      }
    }
  }`,
    expectedCypherQuery = `MATCH (\`camera\`:\`Camera\`) WHERE ("OldCamera" IN labels(\`camera\`)) RETURN head([\`camera\` IN [\`camera\`] WHERE "OldCamera" IN labels(\`camera\`) | \`camera\` { FRAGMENT_TYPE: "OldCamera",  .id , .type ,operators: [(\`camera\`)<-[:\`cameras\`]-(\`camera_operators\`:\`Person\`) WHERE ("CameraMan" IN labels(\`camera_operators\`)) | head([\`camera_operators\` IN [\`camera_operators\`] WHERE "CameraMan" IN labels(\`camera_operators\`) | \`camera_operators\` { FRAGMENT_TYPE: "CameraMan",  .userId , .name  }])]  }]) AS \`camera\``,
    expectedParams = {
      offset: 0,
      first: -1,
      cypherParams: CYPHER_PARAMS
    };

  t.plan(4);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, expectedParams),
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('query interface __typename as only field not within fragments on implementing types', t => {
  const graphQLQuery = `query {
    Camera {
      __typename
      ... on OldCamera {
        id
        type
        operators {
          __typename
          ... on CameraMan {
            userId
            name
          }
        }
      }
    }
  }`,
    expectedCypherQuery = `MATCH (\`camera\`:\`Camera\`) WHERE ("OldCamera" IN labels(\`camera\`)) RETURN head([\`camera\` IN [\`camera\`] WHERE "OldCamera" IN labels(\`camera\`) | \`camera\` { FRAGMENT_TYPE: "OldCamera",  .id , .type ,operators: [(\`camera\`)<-[:\`cameras\`]-(\`camera_operators\`:\`Person\`) WHERE ("CameraMan" IN labels(\`camera_operators\`)) | head([\`camera_operators\` IN [\`camera_operators\`] WHERE "CameraMan" IN labels(\`camera_operators\`) | \`camera_operators\` { FRAGMENT_TYPE: "CameraMan",  .userId , .name  }])]  }]) AS \`camera\``,
    expectedParams = {
      offset: 0,
      first: -1,
      cypherParams: CYPHER_PARAMS
    };

  t.plan(4);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, expectedParams),
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('query same field on implementing type using inline fragment', t => {
  const graphQLQuery = `query {
    Camera {
      id
      ... on OldCamera {
        id
      }
    }
  }`,
    expectedCypherQuery = `MATCH (\`camera\`:\`Camera\`) WHERE ("NewCamera" IN labels(\`camera\`) OR "OldCamera" IN labels(\`camera\`)) RETURN head([\`camera\` IN [\`camera\`] WHERE "NewCamera" IN labels(\`camera\`) | \`camera\` { FRAGMENT_TYPE: "NewCamera",  .id  }] + [\`camera\` IN [\`camera\`] WHERE "OldCamera" IN labels(\`camera\`) | \`camera\` { FRAGMENT_TYPE: "OldCamera",  .id  }]) AS \`camera\``,
    expectedParams = {
      offset: 0,
      first: -1,
      cypherParams: CYPHER_PARAMS
    };

  t.plan(4);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, expectedParams),
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('query interface and implementing type using inline fragment', t => {
  const graphQLQuery = `query {
    Camera {
      id
      ... on OldCamera {
        id
        type
      }
    }
  }`,
    expectedCypherQuery = `MATCH (\`camera\`:\`Camera\`) WHERE ("NewCamera" IN labels(\`camera\`) OR "OldCamera" IN labels(\`camera\`)) RETURN head([\`camera\` IN [\`camera\`] WHERE "NewCamera" IN labels(\`camera\`) | \`camera\` { FRAGMENT_TYPE: "NewCamera",  .id  }] + [\`camera\` IN [\`camera\`] WHERE "OldCamera" IN labels(\`camera\`) | \`camera\` { FRAGMENT_TYPE: "OldCamera",  .id , .type  }]) AS \`camera\``,
    expectedParams = {
      offset: 0,
      first: -1,
      cypherParams: CYPHER_PARAMS
    };

  t.plan(4);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, expectedParams),
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('query interface type relationship fields within inline fragment', t => {
  const graphQLQuery = `query {
    Camera {
      id
      type
      make
      weight
      ... on OldCamera {
        operators {
          userId
          name
          __typename
        }
      }
    }
  }`,
    expectedCypherQuery = `MATCH (\`camera\`:\`Camera\`) WHERE ("NewCamera" IN labels(\`camera\`) OR "OldCamera" IN labels(\`camera\`)) RETURN head([\`camera\` IN [\`camera\`] WHERE "NewCamera" IN labels(\`camera\`) | \`camera\` { FRAGMENT_TYPE: "NewCamera",  .id , .type , .make , .weight  }] + [\`camera\` IN [\`camera\`] WHERE "OldCamera" IN labels(\`camera\`) | \`camera\` { FRAGMENT_TYPE: "OldCamera", operators: [(\`camera\`)<-[:\`cameras\`]-(\`camera_operators\`:\`Person\`) | \`camera_operators\` {FRAGMENT_TYPE: head( [ label IN labels(\`camera_operators\`) WHERE label IN $Person_derivedTypes ] ), .userId , .name }] , .id , .type , .make , .weight  }]) AS \`camera\``,
    expectedParams = {
      offset: 0,
      first: -1,
      Person_derivedTypes: ['Actor', 'CameraMan', 'User'],
      cypherParams: CYPHER_PARAMS
    };

  t.plan(4);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, expectedParams),
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('query interface and implementing type using fragment spread', t => {
  const graphQLQuery = `query {
    Camera {
      id
      ...NewCameraFragment
    }
  }
  
  fragment NewCameraFragment on NewCamera {
    id
    type
  }`,
    expectedCypherQuery = `MATCH (\`camera\`:\`Camera\`) WHERE ("NewCamera" IN labels(\`camera\`) OR "OldCamera" IN labels(\`camera\`)) RETURN head([\`camera\` IN [\`camera\`] WHERE "NewCamera" IN labels(\`camera\`) | \`camera\` { FRAGMENT_TYPE: "NewCamera",  .id , .type  }] + [\`camera\` IN [\`camera\`] WHERE "OldCamera" IN labels(\`camera\`) | \`camera\` { FRAGMENT_TYPE: "OldCamera",  .id  }]) AS \`camera\``,
    expectedParams = {
      offset: 0,
      first: -1,
      cypherParams: CYPHER_PARAMS
    };

  t.plan(4);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, expectedParams),
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('query interface and implementing types using inline fragment and fragment spread', t => {
  const graphQLQuery = `query {
    Camera {
      id
      ...NewCameraFragment
      make
      ... on OldCamera {
        smell
      }
    }
  }
  
  fragment NewCameraFragment on NewCamera {
    id
    type
    features
  }`,
    expectedCypherQuery = `MATCH (\`camera\`:\`Camera\`) WHERE ("NewCamera" IN labels(\`camera\`) OR "OldCamera" IN labels(\`camera\`)) RETURN head([\`camera\` IN [\`camera\`] WHERE "NewCamera" IN labels(\`camera\`) | \`camera\` { FRAGMENT_TYPE: "NewCamera",  .id , .type , .features , .make  }] + [\`camera\` IN [\`camera\`] WHERE "OldCamera" IN labels(\`camera\`) | \`camera\` { FRAGMENT_TYPE: "OldCamera",  .smell , .id , .make  }]) AS \`camera\``,
    expectedParams = {
      offset: 0,
      first: -1,
      cypherParams: CYPHER_PARAMS
    };

  t.plan(4);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, expectedParams),
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('query interface type relationship field on implementing types using inline fragment and fragment spread', t => {
  const graphQLQuery = `query {
    Camera {
      id
      type
      weight
      ... on OldCamera {
        id
        operators {
          userId
          name
        }
      }
      ...NewCameraFragment
    }
  }
  
  fragment NewCameraFragment on NewCamera {
    id
    operators {
      userId
    }
  }`,
    expectedCypherQuery = `MATCH (\`camera\`:\`Camera\`) WHERE ("NewCamera" IN labels(\`camera\`) OR "OldCamera" IN labels(\`camera\`)) RETURN head([\`camera\` IN [\`camera\`] WHERE "NewCamera" IN labels(\`camera\`) | \`camera\` { FRAGMENT_TYPE: "NewCamera",  .id ,operators: [(\`camera\`)<-[:\`cameras\`]-(\`camera_operators\`:\`Person\`) | \`camera_operators\` {FRAGMENT_TYPE: head( [ label IN labels(\`camera_operators\`) WHERE label IN $Person_derivedTypes ] ), .userId }] , .type , .weight  }] + [\`camera\` IN [\`camera\`] WHERE "OldCamera" IN labels(\`camera\`) | \`camera\` { FRAGMENT_TYPE: "OldCamera",  .id ,operators: [(\`camera\`)<-[:\`cameras\`]-(\`camera_operators\`:\`Person\`) | \`camera_operators\` {FRAGMENT_TYPE: head( [ label IN labels(\`camera_operators\`) WHERE label IN $Person_derivedTypes ] ), .userId , .name }] , .type , .weight  }]) AS \`camera\``,
    expectedParams = {
      offset: 0,
      first: -1,
      Person_derivedTypes: ['Actor', 'CameraMan', 'User'],
      cypherParams: CYPHER_PARAMS
    };

  t.plan(4);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, expectedParams),
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('query interface type payload of @cypher mutation field', t => {
  const graphQLQuery = `mutation {
    CustomCamera {
      id
      type
    }
  }`,
    expectedCypherQuery = `CALL apoc.cypher.doIt("CREATE (newCamera:Camera:NewCamera {id: apoc.create.uuid(), type: 'macro'}) RETURN newCamera", {first:$first, offset:$offset, cypherParams: $cypherParams}) YIELD value
    WITH apoc.map.values(value, [keys(value)[0]])[0] AS \`camera\`
    RETURN \`camera\` {FRAGMENT_TYPE: head( [ label IN labels(\`camera\`) WHERE label IN $Camera_derivedTypes ] ), .id , .type } AS \`camera\``,
    expectedParams = {
      offset: 0,
      first: -1,
      cypherParams: CYPHER_PARAMS,
      Camera_derivedTypes: ['NewCamera', 'OldCamera']
    };

  t.plan(4);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, expectedParams),
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('query interface type list payload of @cypher mutation field using fragments', t => {
  const graphQLQuery = `mutation {
    CustomCameras {
      id
      ... on NewCamera {
        features
      }
      ...CameraFragment
      ...OldCameraFragment
    }
  }
  fragment CameraFragment on Camera {
    type
  }
  fragment OldCameraFragment on OldCamera {
    smell
  }`,
    expectedCypherQuery = `CALL apoc.cypher.doIt("CREATE (newCamera:Camera:NewCamera {id: apoc.create.uuid(), type: 'macro', features: ['selfie', 'zoom']}) CREATE (oldCamera:Camera:OldCamera {id: apoc.create.uuid(), type: 'floating', smell: 'rusty' }) RETURN [newCamera, oldCamera]", {first:$first, offset:$offset, cypherParams: $cypherParams}) YIELD value
    UNWIND [\`camera\` IN apoc.map.values(value, [keys(value)[0]])[0]  WHERE ("NewCamera" IN labels(\`camera\`) OR "OldCamera" IN labels(\`camera\`)) | \`camera\`] AS \`camera\`
    RETURN head([\`camera\` IN [\`camera\`] WHERE "NewCamera" IN labels(\`camera\`) | \`camera\` { FRAGMENT_TYPE: "NewCamera",  .features , .id , .type  }] + [\`camera\` IN [\`camera\`] WHERE "OldCamera" IN labels(\`camera\`) | \`camera\` { FRAGMENT_TYPE: "OldCamera",  .smell , .id , .type  }]) AS \`camera\``,
    expectedParams = {
      offset: 0,
      first: -1,
      cypherParams: CYPHER_PARAMS
    };

  t.plan(4);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, expectedParams),
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('query interface type list payload of @cypher mutation field using only fragments', t => {
  const graphQLQuery = `mutation {
    CustomCameras {
      ... on NewCamera {
        features
      }
      ...OldCameraFragment
    }
  }
  
  fragment OldCameraFragment on OldCamera {
    smell
  }`,
    expectedCypherQuery = `CALL apoc.cypher.doIt("CREATE (newCamera:Camera:NewCamera {id: apoc.create.uuid(), type: 'macro', features: ['selfie', 'zoom']}) CREATE (oldCamera:Camera:OldCamera {id: apoc.create.uuid(), type: 'floating', smell: 'rusty' }) RETURN [newCamera, oldCamera]", {first:$first, offset:$offset, cypherParams: $cypherParams}) YIELD value
    UNWIND [\`camera\` IN apoc.map.values(value, [keys(value)[0]])[0]  WHERE ("NewCamera" IN labels(\`camera\`) OR "OldCamera" IN labels(\`camera\`)) | \`camera\`] AS \`camera\`
    RETURN head([\`camera\` IN [\`camera\`] WHERE "NewCamera" IN labels(\`camera\`) | \`camera\` { FRAGMENT_TYPE: "NewCamera",  .features  }] + [\`camera\` IN [\`camera\`] WHERE "OldCamera" IN labels(\`camera\`) | \`camera\` { FRAGMENT_TYPE: "OldCamera",  .smell  }]) AS \`camera\``,
    expectedParams = {
      offset: 0,
      first: -1,
      cypherParams: CYPHER_PARAMS
    };

  t.plan(4);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, expectedParams),
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('query interfaced relationship mutation payload using fragments', t => {
  const graphQLQuery = `mutation someMutation {
    AddActorKnows(from: { userId: "123" }, to: { userId: "456" }) {
      from {
        name
      }
      to {
        name
        ... on User {
          userId
        }
      }
    }
  }`,
    expectedCypherQuery = `
      MATCH (\`actor_from\`:\`Actor\` {userId: $from.userId})
      MATCH (\`person_to\`:\`Person\` {userId: $to.userId})
      CREATE (\`actor_from\`)-[\`knows_relation\`:\`KNOWS\`]->(\`person_to\`)
      RETURN \`knows_relation\` { from: \`actor_from\` { .name } ,to: head([\`person_to\` IN [\`person_to\`] WHERE "Actor" IN labels(\`person_to\`) | \`person_to\` { FRAGMENT_TYPE: "Actor",  .name  }] + [\`person_to\` IN [\`person_to\`] WHERE "CameraMan" IN labels(\`person_to\`) | \`person_to\` { FRAGMENT_TYPE: "CameraMan",  .name  }] + [\`person_to\` IN [\`person_to\`] WHERE "User" IN labels(\`person_to\`) | \`person_to\` { FRAGMENT_TYPE: "User",  .userId , .name  }])  } AS \`_AddActorKnowsPayload\`;
    `,
    expectedParams = {
      from: { userId: '123' },
      to: { userId: '456' },
      first: -1,
      offset: 0
    };

  t.plan(2);
  return Promise.all([
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('query interfaced relationship mutation payload using only fragments', t => {
  const graphQLQuery = `mutation someMutation {
    AddActorKnows(from: { userId: "123" }, to: { userId: "456" }) {
      from {
        name
      }
      to {
        ... on User {
          userId
        }
      }
    }
  }`,
    expectedCypherQuery = `
      MATCH (\`actor_from\`:\`Actor\` {userId: $from.userId})
      MATCH (\`person_to\`:\`Person\` {userId: $to.userId})
      CREATE (\`actor_from\`)-[\`knows_relation\`:\`KNOWS\`]->(\`person_to\`)
      RETURN \`knows_relation\` { from: \`actor_from\` { .name } ,to: head([\`person_to\` IN [\`person_to\`] WHERE "User" IN labels(\`person_to\`) | \`person_to\` { FRAGMENT_TYPE: "User",  .userId  }])  } AS \`_AddActorKnowsPayload\`;
    `,
    expectedParams = {
      from: { userId: '123' },
      to: { userId: '456' },
      first: -1,
      offset: 0
    };

  t.plan(2);
  return Promise.all([
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('query interface using multiple fragments on the same implementing type', t => {
  const graphQLQuery = `query {
    Camera {
      weight
      ... on NewCamera {
        id
        operators {
          name
        }
      }
      ...NewCameraFragment
      ... on Camera {
        ... on NewCamera {
          type
          operators {
            userId
          }
        }
      }
    }
  }
  
  fragment NewCameraFragment on NewCamera {
    type
    operators {
      __typename
    }
  }`,
    expectedCypherQuery = `MATCH (\`camera\`:\`Camera\`) WHERE ("NewCamera" IN labels(\`camera\`) OR "OldCamera" IN labels(\`camera\`)) RETURN head([\`camera\` IN [\`camera\`] WHERE "NewCamera" IN labels(\`camera\`) | \`camera\` { FRAGMENT_TYPE: "NewCamera",  .id ,operators: [(\`camera\`)<-[:\`cameras\`]-(\`camera_operators\`:\`Person\`) | \`camera_operators\` {FRAGMENT_TYPE: head( [ label IN labels(\`camera_operators\`) WHERE label IN $Person_derivedTypes ] ), .name , .userId }] , .type , .weight  }] + [\`camera\` IN [\`camera\`] WHERE "OldCamera" IN labels(\`camera\`) | \`camera\` { FRAGMENT_TYPE: "OldCamera",  .weight  }]) AS \`camera\``,
    expectedParams = {
      offset: 0,
      first: -1,
      cypherParams: CYPHER_PARAMS,
      Person_derivedTypes: ['Actor', 'CameraMan', 'User']
    };

  t.plan(4);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, expectedParams),
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('Create object type node with additional union label', t => {
  const graphQLQuery = `mutation {
    CreateMovie(
      title: "Searchable Movie"
    ) {
      movieId
      title
    }
  }`,
    expectedCypherQuery = `
    CREATE (\`movie\`:\`Movie\`${ADDITIONAL_MOVIE_LABELS}:\`MovieSearch\` {movieId: apoc.create.uuid(),title:$params.title})
    RETURN \`movie\` { .movieId , .title } AS \`movie\`
  `,
    expectedParams = {
      offset: 0,
      first: -1,
      params: {
        title: 'Searchable Movie'
      }
    };

  t.plan(4);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, expectedParams),
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('Create interfaced object type node with additional union label', t => {
  const graphQLQuery = `mutation {
    CreateActor(
      name: "John"
    ) {
      userId
      name
    }
  }`,
    expectedCypherQuery = `
    CREATE (\`actor\`:\`Actor\`:\`Person\`:\`MovieSearch\` {userId: apoc.create.uuid(),name:$params.name})
    RETURN \`actor\` { .userId , .name } AS \`actor\`
  `,
    expectedParams = {
      offset: 0,
      first: -1,
      params: {
        name: 'John'
      }
    };

  t.plan(4);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, expectedParams),
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('Create object type node with @id field', t => {
  const graphQLQuery = `mutation someMutation {
    CreateMovie(
      title: "My Super Awesome Movie"
      year: 2018
      plot: "An unending saga"
      poster: "www.movieposter.com/img.png"
      imdbRating: 1.0
    ) {
      _id
      movieId
      title
      genres {
        name
      }
    }
  }`,
    expectedCypherQuery = `
    CREATE (\`movie\`:\`Movie\`${ADDITIONAL_MOVIE_LABELS}:\`MovieSearch\` {movieId: apoc.create.uuid(),title:$params.title,year:$params.year,plot:$params.plot,poster:$params.poster,imdbRating:$params.imdbRating})
    RETURN \`movie\` {_id: ID(\`movie\`), .movieId , .title ,genres: [(\`movie\`)-[:\`IN_GENRE\`]->(\`movie_genres\`:\`Genre\`) | \`movie_genres\` { .name }] } AS \`movie\`
  `,
    expectedParams = {
      params: {
        title: 'My Super Awesome Movie',
        year: {
          high: 0,
          low: 2018
        },
        plot: 'An unending saga',
        poster: 'www.movieposter.com/img.png',
        imdbRating: 1
      },
      offset: 0,
      first: -1
    };

  t.plan(4);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, expectedParams),
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('Create interfaced object type node with @unique field', t => {
  const graphQLQuery = `mutation {
    CreateNewCamera(
      type: "floating"
      features: ["selfie", "zoom"]
    ) {
      id
      type
      features
    }
  }
  `,
    expectedCypherQuery = `
    CREATE (\`newCamera\`:\`NewCamera\`:\`Camera\` {id: apoc.create.uuid(),type:$params.type,features:$params.features})
    RETURN \`newCamera\` { .id , .type , .features } AS \`newCamera\`
  `,
    expectedParams = {
      params: {
        type: 'floating',
        features: ['selfie', 'zoom']
      },
      offset: 0,
      first: -1
    };

  t.plan(4);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, expectedParams),
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('Create object type node with @index field', t => {
  const graphQLQuery = `mutation {
    CreateState(name: "California", id: "123") {
      name
    }
  }
  `,
    expectedCypherQuery = `
    CREATE (\`state\`:\`State\` {name:$params.name,id:$params.id})
    RETURN \`state\` { .name } AS \`state\`
  `,
    expectedParams = {
      params: {
        name: 'California',
        id: '123'
      },
      offset: 0,
      first: -1
    };

  t.plan(4);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, expectedParams),
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('Create object type node with multiple @unique ID type fields', t => {
  const graphQLQuery = `mutation {
    CreateUniqueNode(string: "hello world", anotherId: "123") {
      string
      id
      anotherId
    }
  }`,
    expectedCypherQuery = `
    CREATE (\`uniqueNode\`:\`UniqueNode\` {id: apoc.create.uuid(),string:$params.string,anotherId:$params.anotherId})
    RETURN \`uniqueNode\` { .string , .id , .anotherId } AS \`uniqueNode\`
  `,
    expectedParams = {
      params: {
        string: 'hello world',
        anotherId: '123'
      },
      offset: 0,
      first: -1
    };

  t.plan(4);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, expectedParams),
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('Merge object type node with @unique field', t => {
  const graphQLQuery = `mutation {
    MergeUniqueStringNode(id: "123", uniqueString: "abc") {
      id
      uniqueString
    }
  }
`,
    expectedCypherQuery = `MERGE (\`uniqueStringNode\`:\`UniqueStringNode\`{uniqueString: $params.uniqueString})
  SET \`uniqueStringNode\` += {id:$params.id} RETURN \`uniqueStringNode\` { .id , .uniqueString } AS \`uniqueStringNode\``,
    expectedParams = {
      params: {
        id: '123',
        uniqueString: 'abc'
      },
      offset: 0,
      first: -1
    };

  t.plan(4);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, expectedParams),
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('Delete object type node with @unique field', t => {
  const graphQLQuery = `mutation {
    DeleteUniqueStringNode(uniqueString: "abc") {
      id
      uniqueString
    }
  }`,
    expectedCypherQuery = `MATCH (\`uniqueStringNode\`:\`UniqueStringNode\` {uniqueString: $uniqueString})
WITH \`uniqueStringNode\` AS \`uniqueStringNode_toDelete\`, \`uniqueStringNode\` { .id , .uniqueString } AS \`uniqueStringNode\`
DETACH DELETE \`uniqueStringNode_toDelete\`
RETURN \`uniqueStringNode\``,
    expectedParams = {
      uniqueString: 'abc',
      offset: 0,
      first: -1
    };

  t.plan(4);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, expectedParams),
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('Add relationship using @id and @unique node type for node selection', t => {
  const graphQLQuery = `mutation {
    AddUniqueNodeTestRelation(
      from: { id: "123" }
      to: { uniqueString: "abc" }
    ) {
      from {
        string
        id
        anotherId
      }
      to {
        uniqueString
      }
    }
  }`,
    expectedCypherQuery = `
      MATCH (\`uniqueNode_from\`:\`UniqueNode\` {id: $from.id})
      MATCH (\`uniqueStringNode_to\`:\`UniqueStringNode\` {uniqueString: $to.uniqueString})
      CREATE (\`uniqueNode_from\`)-[\`test_relation_relation\`:\`TEST_RELATION\`]->(\`uniqueStringNode_to\`)
      RETURN \`test_relation_relation\` { from: \`uniqueNode_from\` { .string , .id , .anotherId } ,to: \`uniqueStringNode_to\` { .uniqueString }  } AS \`_AddUniqueNodeTestRelationPayload\`;
    `,
    expectedParams = {
      from: {
        id: '123'
      },
      to: {
        uniqueString: 'abc'
      },
      offset: 0,
      first: -1
    };

  t.plan(2);
  return Promise.all([
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('Merge relationship using @id and @unique node type fields for node selection', t => {
  const graphQLQuery = `mutation {
    MergeUniqueNodeTestRelation(
      from: { id: "123" }
      to: { uniqueString: "abc" }
    ) {
      from {
        string
        id
        anotherId
      }
      to {
        uniqueString
      }
    }
  }`,
    expectedCypherQuery = `
      MATCH (\`uniqueNode_from\`:\`UniqueNode\` {id: $from.id})
      MATCH (\`uniqueStringNode_to\`:\`UniqueStringNode\` {uniqueString: $to.uniqueString})
      MERGE (\`uniqueNode_from\`)-[\`test_relation_relation\`:\`TEST_RELATION\`]->(\`uniqueStringNode_to\`)
      RETURN \`test_relation_relation\` { from: \`uniqueNode_from\` { .string , .id , .anotherId } ,to: \`uniqueStringNode_to\` { .uniqueString }  } AS \`_MergeUniqueNodeTestRelationPayload\`;
    `,
    expectedParams = {
      from: {
        id: '123'
      },
      to: {
        uniqueString: 'abc'
      },
      first: -1,
      offset: 0
    };

  t.plan(2);
  return Promise.all([
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('Remove relationship using @id and @unique node type fields for node selection', t => {
  const graphQLQuery = `mutation {
    RemoveUniqueNodeTestRelation(
      from: { id: "123" }
      to: { uniqueString: "abc" }
    ) {
      from {
        string
        id
        anotherId
      }
      to {
        uniqueString
      }
    }
  }
  `,
    expectedCypherQuery = `
      MATCH (\`uniqueNode_from\`:\`UniqueNode\` {id: $from.id})
      MATCH (\`uniqueStringNode_to\`:\`UniqueStringNode\` {uniqueString: $to.uniqueString})
      OPTIONAL MATCH (\`uniqueNode_from\`)-[\`uniqueNode_fromuniqueStringNode_to\`:\`TEST_RELATION\`]->(\`uniqueStringNode_to\`)
      DELETE \`uniqueNode_fromuniqueStringNode_to\`
      WITH COUNT(*) AS scope, \`uniqueNode_from\` AS \`_uniqueNode_from\`, \`uniqueStringNode_to\` AS \`_uniqueStringNode_to\`
      RETURN {from: \`_uniqueNode_from\` { .string , .id , .anotherId } ,to: \`_uniqueStringNode_to\` { .uniqueString } } AS \`_RemoveUniqueNodeTestRelationPayload\`;
    `,
    expectedParams = {
      from: {
        id: '123'
      },
      to: {
        uniqueString: 'abc'
      },
      first: -1,
      offset: 0
    };

  t.plan(2);
  return Promise.all([
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('query only __typename field on union type', t => {
  const graphQLQuery = `query {
    MovieSearch {
      __typename
    }
  }`,
    expectedCypherQuery = `MATCH (\`movieSearch\`:\`MovieSearch\`) RETURN \`movieSearch\` {FRAGMENT_TYPE: head( [ label IN labels(\`movieSearch\`) WHERE label IN $MovieSearch_derivedTypes ] )} AS \`movieSearch\``,
    expectedParams = {
      first: -1,
      offset: 0,
      cypherParams: CYPHER_PARAMS,
      MovieSearch_derivedTypes: ['Movie', 'Genre', 'Book', 'Actor', 'OldCamera']
    };

  t.plan(4);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, expectedParams),
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('query union type using fragments', t => {
  const graphQLQuery = `query {
    MovieSearch {
      ... on Movie {
        movieId
        title
      }
      ...MovieSearchGenre
    }
  }
  
  fragment MovieSearchGenre on Genre {
    name
  }`,
    expectedCypherQuery = `MATCH (\`movieSearch\`:\`MovieSearch\`) WHERE ("Genre" IN labels(\`movieSearch\`) OR "Movie" IN labels(\`movieSearch\`)) RETURN head([\`movieSearch\` IN [\`movieSearch\`] WHERE "Genre" IN labels(\`movieSearch\`) | \`movieSearch\` { FRAGMENT_TYPE: "Genre",  .name  }] + [\`movieSearch\` IN [\`movieSearch\`] WHERE "Movie" IN labels(\`movieSearch\`) | \`movieSearch\` { FRAGMENT_TYPE: "Movie",  .movieId , .title  }]) AS \`movieSearch\``,
    expectedParams = {
      first: -1,
      offset: 0,
      cypherParams: CYPHER_PARAMS
    };

  t.plan(4);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, expectedParams),
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('query computed union type using fragments', t => {
  const graphQLQuery = `query {
    computedMovieSearch {
      ... on Movie {
        movieId
        title
      }
      ...MovieSearchGenre
    }
  }
  
  fragment MovieSearchGenre on Genre {
    name
  }`,
    expectedCypherQuery = `WITH apoc.cypher.runFirstColumn("MATCH (ms:MovieSearch) RETURN ms", {offset:$offset, first:$first, cypherParams: $cypherParams}, True) AS x WITH [\`movieSearch\` IN x WHERE ("Genre" IN labels(\`movieSearch\`) OR "Movie" IN labels(\`movieSearch\`)) | \`movieSearch\`] AS x UNWIND x AS \`movieSearch\` RETURN head([\`movieSearch\` IN [\`movieSearch\`] WHERE "Genre" IN labels(\`movieSearch\`) | \`movieSearch\` { FRAGMENT_TYPE: "Genre",  .name  }] + [\`movieSearch\` IN [\`movieSearch\`] WHERE "Movie" IN labels(\`movieSearch\`) | \`movieSearch\` { FRAGMENT_TYPE: "Movie",  .movieId , .title  }]) AS \`movieSearch\``,
    expectedParams = {
      first: -1,
      offset: 0,
      cypherParams: CYPHER_PARAMS
    };

  t.plan(4);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, expectedParams),
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('query union type relationship using fragments', t => {
  const graphQLQuery = `query {
    User {
      movieSearch {
        ... on Movie {
          title
          _id
        }
        ...MovieSearchGenre
      }
    }
  }
  
  fragment MovieSearchGenre on Genre {
    name
  }`,
    expectedCypherQuery = `MATCH (\`user\`:\`User\`) RETURN \`user\` {movieSearch: [(\`user\`)--(\`user_movieSearch\`:\`MovieSearch\`) WHERE ("Genre" IN labels(\`user_movieSearch\`) OR "Movie" IN labels(\`user_movieSearch\`)) | head([\`user_movieSearch\` IN [\`user_movieSearch\`] WHERE "Genre" IN labels(\`user_movieSearch\`) | \`user_movieSearch\` { FRAGMENT_TYPE: "Genre",  .name  }] + [\`user_movieSearch\` IN [\`user_movieSearch\`] WHERE "Movie" IN labels(\`user_movieSearch\`) | \`user_movieSearch\` { FRAGMENT_TYPE: "Movie",  .title ,_id: ID(\`user_movieSearch\`) }])] } AS \`user\``,
    expectedParams = {
      first: -1,
      offset: 0,
      cypherParams: CYPHER_PARAMS
    };

  t.plan(4);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, expectedParams),
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('query only __typename field on union type relationship', t => {
  const graphQLQuery = `query {
    User {
      userId
      name
      movieSearch {
        __typename
      }
      favorites {
        movieId
      }
    }
  }`,
    expectedCypherQuery = `MATCH (\`user\`:\`User\`) RETURN \`user\` { .userId , .name ,movieSearch: [(\`user\`)--(\`user_movieSearch\`:\`MovieSearch\`) | \`user_movieSearch\` {FRAGMENT_TYPE: head( [ label IN labels(\`user_movieSearch\`) WHERE label IN $MovieSearch_derivedTypes ] )}] ,favorites: [(\`user\`)-[:\`FAVORITED\`]->(\`user_favorites\`:\`Movie\`:\`u_user-id\`:\`newMovieLabel\`) | \`user_favorites\` { .movieId }] } AS \`user\``,
    expectedParams = {
      offset: 0,
      first: -1,
      MovieSearch_derivedTypes: [
        'Movie',
        'Genre',
        'Book',
        'Actor',
        'OldCamera'
      ],
      cypherParams: CYPHER_PARAMS
    };

  t.plan(4);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, expectedParams),
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('query only __typename field on computed union type relationship', t => {
  const graphQLQuery = `query {
    User {
      computedMovieSearch {
        __typename
      }
    }
  }`,
    expectedCypherQuery = `MATCH (\`user\`:\`User\`) RETURN \`user\` {computedMovieSearch: [ user_computedMovieSearch IN apoc.cypher.runFirstColumn("MATCH (ms:MovieSearch) RETURN ms", {this: user, cypherParams: $cypherParams}, true) | user_computedMovieSearch {FRAGMENT_TYPE: head( [ label IN labels(user_computedMovieSearch) WHERE label IN $MovieSearch_derivedTypes ] )}] } AS \`user\``,
    expectedParams = {
      offset: 0,
      first: -1,
      MovieSearch_derivedTypes: [
        'Movie',
        'Genre',
        'Book',
        'Actor',
        'OldCamera'
      ],
      cypherParams: CYPHER_PARAMS
    };

  t.plan(4);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, expectedParams),
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('query computed union type relationship using fragments', t => {
  const graphQLQuery = `query {
    User {
      computedMovieSearch {
        ... on Movie {
          movieId
          title
        }
        ...MovieSearchGenre
      }
    }
  }
  
  fragment MovieSearchGenre on Genre {
    name
  }`,
    expectedCypherQuery = `MATCH (\`user\`:\`User\`) RETURN \`user\` {computedMovieSearch: [user_computedMovieSearch IN [ user_computedMovieSearch IN apoc.cypher.runFirstColumn("MATCH (ms:MovieSearch) RETURN ms", {this: user, cypherParams: $cypherParams}, true) WHERE ("Genre" IN labels(user_computedMovieSearch) OR "Movie" IN labels(user_computedMovieSearch)) | user_computedMovieSearch] | head([\`user_computedMovieSearch\` IN [\`user_computedMovieSearch\`] WHERE "Genre" IN labels(\`user_computedMovieSearch\`) | \`user_computedMovieSearch\` { FRAGMENT_TYPE: "Genre",  .name  }] + [\`user_computedMovieSearch\` IN [\`user_computedMovieSearch\`] WHERE "Movie" IN labels(\`user_computedMovieSearch\`) | \`user_computedMovieSearch\` { FRAGMENT_TYPE: "Movie",  .movieId , .title  }])] } AS \`user\``,
    expectedParams = {
      offset: 0,
      first: -1,
      cypherParams: CYPHER_PARAMS
    };

  t.plan(4);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, expectedParams),
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('query union type payload of computed mutation field', t => {
  const graphQLQuery = `mutation {
    computedMovieSearch {
      ... on Movie {
        title
      }
    }
  }`,
    expectedCypherQuery = `CALL apoc.cypher.doIt("MATCH (ms:MovieSearch) RETURN ms", {first:$first, offset:$offset, cypherParams: $cypherParams}) YIELD value
    UNWIND [\`movieSearch\` IN apoc.map.values(value, [keys(value)[0]])[0]  WHERE ("Movie" IN labels(\`movieSearch\`)) | \`movieSearch\`] AS \`movieSearch\`
    RETURN head([\`movieSearch\` IN [\`movieSearch\`] WHERE "Movie" IN labels(\`movieSearch\`) | \`movieSearch\` { FRAGMENT_TYPE: "Movie",  .title  }]) AS \`movieSearch\``,
    expectedParams = {
      offset: 0,
      first: -1,
      cypherParams: CYPHER_PARAMS
    };

  t.plan(4);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, expectedParams),
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('query union type using multiple fragments on the same interfaced object type', t => {
  const graphQLQuery = `query {
    MovieSearch {
      __typename
      ... on Movie {
        movieId
        title
      }
      ...MovieSearchGenre
      ... on Person {
        name
        ... on Actor {
          userId
          movies {
            movieId
            genres {
              _id
            }
          }
        }
      }
      ...MovieSearchActor
    }
  }
  
  fragment MovieSearchGenre on Genre {
    name
  }
  
  fragment MovieSearchActor on Actor {
    userId
    movies {
      movieId
      title
      genres {
        name
      }
    }
  }`,
    expectedCypherQuery = `MATCH (\`movieSearch\`:\`MovieSearch\`) WHERE ("Genre" IN labels(\`movieSearch\`) OR "Movie" IN labels(\`movieSearch\`) OR "Person" IN labels(\`movieSearch\`)) RETURN head([\`movieSearch\` IN [\`movieSearch\`] WHERE "Genre" IN labels(\`movieSearch\`) | \`movieSearch\` { FRAGMENT_TYPE: "Genre",  .name  }] + [\`movieSearch\` IN [\`movieSearch\`] WHERE "Movie" IN labels(\`movieSearch\`) | \`movieSearch\` { FRAGMENT_TYPE: "Movie",  .movieId , .title  }] + [\`movieSearch\` IN [\`movieSearch\`] WHERE "Person" IN labels(\`movieSearch\`) | head([\`movieSearch\` IN [\`movieSearch\`] WHERE "Actor" IN labels(\`movieSearch\`) | \`movieSearch\` { FRAGMENT_TYPE: "Actor",  .userId ,movies: [(\`movieSearch\`)-[:\`ACTED_IN\`]->(\`movieSearch_movies\`:\`Movie\`:\`u_user-id\`:\`newMovieLabel\`) | \`movieSearch_movies\` { .movieId ,genres: [(\`movieSearch_movies\`)-[:\`IN_GENRE\`]->(\`movieSearch_movies_genres\`:\`Genre\`) | \`movieSearch_movies_genres\` {_id: ID(\`movieSearch_movies_genres\`), .name }] , .title }] , .name  }] + [\`movieSearch\` IN [\`movieSearch\`] WHERE "CameraMan" IN labels(\`movieSearch\`) | \`movieSearch\` { FRAGMENT_TYPE: "CameraMan",  .name  }] + [\`movieSearch\` IN [\`movieSearch\`] WHERE "User" IN labels(\`movieSearch\`) | \`movieSearch\` { FRAGMENT_TYPE: "User",  .name  }])]) AS \`movieSearch\``,
    expectedParams = {
      offset: 0,
      first: -1,
      cypherParams: CYPHER_PARAMS
    };

  t.plan(4);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, expectedParams),
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('query union type relationship using multiple fragments and interfaced object types', t => {
  const graphQLQuery = `query {
    User {
      userId
      name
      movieSearch {
        __typename
        ... on Movie {
          movieId
          title
        }
        ... on Movie {
          released {
            year
          }
        }
        ...MovieSearchGenre
        ... on Person {
          ... on Actor {
            userId
            name
            movies {
              movieId
              genres {
                _id
              }
            }
          }
        }
        ...MovieSearchActor
        ... on Camera {
          id
          type
        }
      }
      favorites {
        movieId
      }
    }
  }
  
  fragment MovieSearchGenre on Genre {
    name
  }
  
  fragment MovieSearchActor on Actor {
    userId
    movies {
      title
      genres {
        name
      }
    }
  }`,
    expectedCypherQuery = `MATCH (\`user\`:\`User\`) RETURN \`user\` { .userId , .name ,movieSearch: [(\`user\`)--(\`user_movieSearch\`:\`MovieSearch\`) WHERE ("Actor" IN labels(\`user_movieSearch\`) OR "Camera" IN labels(\`user_movieSearch\`) OR "Genre" IN labels(\`user_movieSearch\`) OR "Movie" IN labels(\`user_movieSearch\`)) | head([\`user_movieSearch\` IN [\`user_movieSearch\`] WHERE "Camera" IN labels(\`user_movieSearch\`) | \`user_movieSearch\` { FRAGMENT_TYPE: head( [ label IN labels(\`user_movieSearch\`) WHERE label IN $Camera_derivedTypes ] ),  .id , .type  }] + [\`user_movieSearch\` IN [\`user_movieSearch\`] WHERE "Genre" IN labels(\`user_movieSearch\`) | \`user_movieSearch\` { FRAGMENT_TYPE: "Genre",  .name  }] + [\`user_movieSearch\` IN [\`user_movieSearch\`] WHERE "Movie" IN labels(\`user_movieSearch\`) | \`user_movieSearch\` { FRAGMENT_TYPE: "Movie",  .movieId , .title ,released: { year: \`user_movieSearch\`.released.year } }] + [\`user_movieSearch\` IN [\`user_movieSearch\`] WHERE "Person" IN labels(\`user_movieSearch\`) | head([\`user_movieSearch\` IN [\`user_movieSearch\`] WHERE "Actor" IN labels(\`user_movieSearch\`) | \`user_movieSearch\` { FRAGMENT_TYPE: "Actor",  .userId , .name ,movies: [(\`user_movieSearch\`)-[:\`ACTED_IN\`]->(\`user_movieSearch_movies\`:\`Movie\`:\`u_user-id\`:\`newMovieLabel\`) | \`user_movieSearch_movies\` { .movieId ,genres: [(\`user_movieSearch_movies\`)-[:\`IN_GENRE\`]->(\`user_movieSearch_movies_genres\`:\`Genre\`) | \`user_movieSearch_movies_genres\` {_id: ID(\`user_movieSearch_movies_genres\`), .name }] , .title }]  }])])] ,favorites: [(\`user\`)-[:\`FAVORITED\`]->(\`user_favorites\`:\`Movie\`:\`u_user-id\`:\`newMovieLabel\`) | \`user_favorites\` { .movieId }] } AS \`user\``,
    expectedParams = {
      offset: 0,
      first: -1,
      Camera_derivedTypes: ['NewCamera', 'OldCamera'],
      cypherParams: CYPHER_PARAMS
    };

  t.plan(4);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, expectedParams),
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('query union type using pagination', t => {
  const graphQLQuery = `query {
    MovieSearch(first: 10) {
      __typename
      ... on Movie {
        movieId
        title
      }
      ...MovieSearchGenre
      ... on Person {
        name
        ... on Actor {
          userId
          movies {
            movieId
            genres {
              _id
            }
          }
        }
      }
      ...MovieSearchActor
    }
  }
  
  fragment MovieSearchGenre on Genre {
    name
  }
  
  fragment MovieSearchActor on Actor {
    userId
    movies {
      movieId
      title
      genres {
        name
      }
    }
  }`,
    expectedCypherQuery = `MATCH (\`movieSearch\`:\`MovieSearch\`) WHERE ("Genre" IN labels(\`movieSearch\`) OR "Movie" IN labels(\`movieSearch\`) OR "Person" IN labels(\`movieSearch\`)) RETURN head([\`movieSearch\` IN [\`movieSearch\`] WHERE "Genre" IN labels(\`movieSearch\`) | \`movieSearch\` { FRAGMENT_TYPE: "Genre",  .name  }] + [\`movieSearch\` IN [\`movieSearch\`] WHERE "Movie" IN labels(\`movieSearch\`) | \`movieSearch\` { FRAGMENT_TYPE: "Movie",  .movieId , .title  }] + [\`movieSearch\` IN [\`movieSearch\`] WHERE "Person" IN labels(\`movieSearch\`) | head([\`movieSearch\` IN [\`movieSearch\`] WHERE "Actor" IN labels(\`movieSearch\`) | \`movieSearch\` { FRAGMENT_TYPE: "Actor",  .userId ,movies: [(\`movieSearch\`)-[:\`ACTED_IN\`]->(\`movieSearch_movies\`:\`Movie\`:\`u_user-id\`:\`newMovieLabel\`) | \`movieSearch_movies\` { .movieId ,genres: [(\`movieSearch_movies\`)-[:\`IN_GENRE\`]->(\`movieSearch_movies_genres\`:\`Genre\`) | \`movieSearch_movies_genres\` {_id: ID(\`movieSearch_movies_genres\`), .name }] , .title }] , .name  }] + [\`movieSearch\` IN [\`movieSearch\`] WHERE "CameraMan" IN labels(\`movieSearch\`) | \`movieSearch\` { FRAGMENT_TYPE: "CameraMan",  .name  }] + [\`movieSearch\` IN [\`movieSearch\`] WHERE "User" IN labels(\`movieSearch\`) | \`movieSearch\` { FRAGMENT_TYPE: "User",  .name  }])]) AS \`movieSearch\` LIMIT toInteger($first)`,
    expectedParams = {
      offset: 0,
      first: 10,
      cypherParams: CYPHER_PARAMS
    };

  t.plan(4);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, expectedParams),
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('query union type relationship using pagination', t => {
  const graphQLQuery = `query {
    User {
      movieSearch(first: 2, offset: 1) {
        ... on Movie {
          title
          _id
        }
        ...MovieSearchGenre
      }
    }
  }
  
  fragment MovieSearchGenre on Genre {
    name
  }`,
    expectedCypherQuery = `MATCH (\`user\`:\`User\`) RETURN \`user\` {movieSearch: [(\`user\`)--(\`user_movieSearch\`:\`MovieSearch\`) WHERE ("Genre" IN labels(\`user_movieSearch\`) OR "Movie" IN labels(\`user_movieSearch\`)) | head([\`user_movieSearch\` IN [\`user_movieSearch\`] WHERE "Genre" IN labels(\`user_movieSearch\`) | \`user_movieSearch\` { FRAGMENT_TYPE: "Genre",  .name  }] + [\`user_movieSearch\` IN [\`user_movieSearch\`] WHERE "Movie" IN labels(\`user_movieSearch\`) | \`user_movieSearch\` { FRAGMENT_TYPE: "Movie",  .title ,_id: ID(\`user_movieSearch\`) }])][1..3] } AS \`user\``,
    expectedParams = {
      '1_first': 2,
      '1_offset': 1,
      offset: 0,
      first: -1,
      cypherParams: CYPHER_PARAMS
    };

  t.plan(2);
  return Promise.all([
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('query computed union type relationship using pagination', t => {
  const graphQLQuery = `query {
    computedMovieSearch(first: 5, offset: 2) {
      ... on Movie {
        movieId
        title
      }
      ...MovieSearchGenre
    }
  }
  
  fragment MovieSearchGenre on Genre {
    name
  }`,
    expectedCypherQuery = `WITH apoc.cypher.runFirstColumn("MATCH (ms:MovieSearch) RETURN ms", {offset:$offset, first:$first, cypherParams: $cypherParams}, True) AS x WITH [\`movieSearch\` IN x WHERE ("Genre" IN labels(\`movieSearch\`) OR "Movie" IN labels(\`movieSearch\`)) | \`movieSearch\`] AS x UNWIND x AS \`movieSearch\` RETURN head([\`movieSearch\` IN [\`movieSearch\`] WHERE "Genre" IN labels(\`movieSearch\`) | \`movieSearch\` { FRAGMENT_TYPE: "Genre",  .name  }] + [\`movieSearch\` IN [\`movieSearch\`] WHERE "Movie" IN labels(\`movieSearch\`) | \`movieSearch\` { FRAGMENT_TYPE: "Movie",  .movieId , .title  }]) AS \`movieSearch\` SKIP toInteger($offset) LIMIT toInteger($first)`,
    expectedParams = {
      offset: 2,
      first: 5,
      cypherParams: CYPHER_PARAMS
    };

  t.plan(2);
  return Promise.all([
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});
