import test from 'ava';
import {cypherTestRunner} from "./helpers/cypherTestHelpers";


test('simple Cypher query', t=> {
  const graphQLQuery = `{
    Movie(title: "River Runs Through It, A") {
      title
    }
  }`,
    expectedCypherQuery = `MATCH (movie:Movie {title:"River Runs Through It, A"}) RETURN movie { .title } AS movie SKIP 0`;

  cypherTestRunner(t,graphQLQuery, expectedCypherQuery);
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

  cypherTestRunner(t, graphQLQuery, expectedCypherQuery);

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
    expectedCypherQuery = 'MATCH (movie:Movie {title:"River Runs Through It, A"}) RETURN movie { .title ,actors: [(movie)<-[ACTED_IN]-(movie_actors:Actor) | movie_actors { .name }] ,similar: [ x IN apoc.cypher.runFirstColumn("WITH {this} AS this MATCH (this)--(:Genre)--(o:Movie) RETURN o", {this: movie}, true) | x { .title }][..3] } AS movie SKIP 0';
  cypherTestRunner(t, graphQLQuery, expectedCypherQuery);

});

test('Handle Query with name not aligning to type', t=> {
  const graphQLQuery = `{
  MoviesByYear(year: 2010) {
    title
  }
}
  `,
    expectedCypherQuery = 'MATCH (movie:Movie {year:2010}) RETURN movie { .title } AS movie SKIP 0';
  cypherTestRunner(t, graphQLQuery, expectedCypherQuery);
});

test('Query without arguments, non-null type', t=> {
  const graphQLQuery = `query {
  Movie {
    movieId
  }
}`,
    expectedCypherQuery = 'MATCH (movie:Movie {}) RETURN movie { .movieId } AS movie SKIP 0';
  cypherTestRunner(t, graphQLQuery, expectedCypherQuery);
});

test('Query single object', t=> {
  const graphQLQuery = `
  {
    MovieById(movieId: "18") {
      title
    }
  }`,
    expectedCypherQuery = 'MATCH (movie:Movie {movieId:"18"}) RETURN movie { .title } AS movie SKIP 0';
  cypherTestRunner(t, graphQLQuery, expectedCypherQuery);
});
