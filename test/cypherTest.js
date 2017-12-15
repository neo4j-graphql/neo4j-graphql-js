import test from 'ava';
import {cypherTestRunner} from "./helpers/cypherTestHelpers";


test('simple Cypher query', t=> {
  const graphQLQuery = `{
    Movie(title: "River Runs Through It, A") {
      title
    }
  }`,
    expectedCypherQuery = `MATCH (movie:Movie {title:"River Runs Through It, A"}) RETURN movie { .title } AS movie SKIP 0`;

  cypherTestRunner(t,graphQLQuery, {}, expectedCypherQuery);
});

test('Simple skip limit', t=> {
  const graphQLQuery = `{
  Movie(title: "River Runs Through It, A", first: 1, offset: 0) {
    title
    year
  }
}
  `,
    expectedCypherQuery = 'MATCH (movie:Movie {title:"River Runs Through It, A"}) RETURN movie { .title , .year } AS movie SKIP 0 LIMIT 1';

  cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery);

});


test('Cypher projection skip limit', t=> {
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
    expectedCypherQuery = 'MATCH (movie:Movie {title:"River Runs Through It, A"}) RETURN movie { .title ,actors: [(movie)<-[:ACTED_IN]-(movie_actors:Actor) | movie_actors { .name }] ,similar: [ x IN apoc.cypher.runFirstColumn("WITH {this} AS this MATCH (this)--(:Genre)--(o:Movie) RETURN o", {this: movie}, true) | x { .title }][..3] } AS movie SKIP 0';
  cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery);

});

test('Handle Query with name not aligning to type', t=> {
  const graphQLQuery = `{
  MoviesByYear(year: 2010) {
    title
  }
}
  `,
    expectedCypherQuery = 'MATCH (movie:Movie {year:2010}) RETURN movie { .title } AS movie SKIP 0';
  cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery);
});

test('Query without arguments, non-null type', t=> {
  const graphQLQuery = `query {
  Movie {
    movieId
  }
}`,
    expectedCypherQuery = 'MATCH (movie:Movie {}) RETURN movie { .movieId } AS movie SKIP 0';
  cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery);
});

test('Query single object', t=> {
  const graphQLQuery = `
  {
    MovieById(movieId: "18") {
      title
    }
  }`,
    expectedCypherQuery = 'MATCH (movie:Movie {movieId:"18"}) RETURN movie { .title } AS movie SKIP 0';
  cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery);
});

test('Query single object relation', t=> {
  const graphQLQuery =`
    {
      MovieById(movieId: "3100") {
        title
        filmedIn {
          name
        }
      }
    }
  `,
    expectedCypherQuery = 'MATCH (movie:Movie {movieId:"3100"}) RETURN movie { .title ,filmedIn: head([(movie)-[:FILMED_IN]->(movie_filmedIn:State) | movie_filmedIn { .name }]) } AS movie SKIP 0';
  cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery);
});

test('Query single object and array of objects relations', t=> {
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
    expectedCypherQuery = 'MATCH (movie:Movie {movieId:"3100"}) RETURN movie { .title ,actors: [(movie)<-[:ACTED_IN]-(movie_actors:Actor) | movie_actors { .name }] ,filmedIn: head([(movie)-[:FILMED_IN]->(movie_filmedIn:State) | movie_filmedIn { .name }]) } AS movie SKIP 0';
  cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery);
});

test('Deeply nested object query', t=> {
  const graphQLQuery = `
 {
  Movie(title: "River Runs Through It, A") {
		title
    actors {
      name
      movies {
        title
        actors {
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
    expectedCypherQuery = `MATCH (movie:Movie {title:"River Runs Through It, A"}) RETURN movie { .title ,actors: [(movie)<-[:ACTED_IN]-(movie_actors:Actor) | movie_actors { .name ,movies: [(movie_actors)-[:ACTED_IN]->(movie_actors_movies:Movie) | movie_actors_movies { .title ,actors: [(movie_actors_movies)<-[:ACTED_IN]-(movie_actors_movies_actors:Actor) | movie_actors_movies_actors { .name ,movies: [(movie_actors_movies_actors)-[:ACTED_IN]->(movie_actors_movies_actors_movies:Movie) | movie_actors_movies_actors_movies { .title , .year ,similar: [ x IN apoc.cypher.runFirstColumn("WITH {this} AS this MATCH (this)--(:Genre)--(o:Movie) RETURN o", {this: movie_actors_movies_actors_movies}, true) | x { .title , .year }][..3] }] }] }] }] } AS movie SKIP 0`;
  cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery);
});

test('Handle meta field at beginning of selection set', t=> {
  const graphQLQuery = `
  {
    Movie(title:"River Runs Through It, A"){
      __typename
      title
    }
  }`,
    expectedCypherQuery = `MATCH (movie:Movie {title:"River Runs Through It, A"}) RETURN movie { .title } AS movie SKIP 0`;
  cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery);
});

test('Handle meta field at end of selection set', t=> {
  const graphQLQuery = `
  {
    Movie(title:"River Runs Through It, A"){
      title
      __typename
    }
  }
  `,
    expectedCypherQuery = `MATCH (movie:Movie {title:"River Runs Through It, A"}) RETURN movie {.title } AS movie SKIP 0`;
  cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery);
});

test('Handle meta field in middle of selection set', t=> {
  const graphQLQuery = `
  {
    Movie(title:"River Runs Through It, A"){
      title
      __typename
      year
    }
  }
  `,
    expectedCypherQuery = `MATCH (movie:Movie {title:"River Runs Through It, A"}) RETURN movie { .title , .year } AS movie SKIP 0`;
  cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery);
});

test('Pass @cypher directive params to sub-query', t=> {
  const graphQLQuery = ``,
    expectedCypherQuery = ``;
  cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery);
});