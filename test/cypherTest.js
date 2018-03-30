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
    expectedCypherQuery = 'MATCH (movie:Movie {title:"River Runs Through It, A"}) RETURN movie { .title ,actors: [(movie)<-[:ACTED_IN]-(movie_actors:Actor) | movie_actors { .name }] ,similar: [ movie_similar IN apoc.cypher.runFirstColumn("WITH {this} AS this MATCH (this)--(:Genre)--(o:Movie) RETURN o", {this: movie, first: 3, offset: 0}, true) | movie_similar { .title }][..3] } AS movie SKIP 0';
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
    expectedCypherQuery = `MATCH (movie:Movie {title:"River Runs Through It, A"}) RETURN movie { .title ,actors: [(movie)<-[:ACTED_IN]-(movie_actors:Actor) | movie_actors { .name ,movies: [(movie_actors)-[:ACTED_IN]->(movie_actors_movies:Movie) | movie_actors_movies { .title ,actors: [(movie_actors_movies)<-[:ACTED_IN]-(movie_actors_movies_actors:Actor) | movie_actors_movies_actors { .name ,movies: [(movie_actors_movies_actors)-[:ACTED_IN]->(movie_actors_movies_actors_movies:Movie) | movie_actors_movies_actors_movies { .title , .year ,similar: [ movie_actors_movies_actors_movies_similar IN apoc.cypher.runFirstColumn("WITH {this} AS this MATCH (this)--(:Genre)--(o:Movie) RETURN o", {this: movie_actors_movies_actors_movies, first: 3, offset: 0}, true) | movie_actors_movies_actors_movies_similar { .title , .year }][..3] }] }] }] }] } AS movie SKIP 0`;
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
    expectedCypherQuery = `MATCH (movie:Movie {title:"River Runs Through It, A"}) RETURN movie { .title } AS movie SKIP 0`;
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

test('Handle @cypher directive without any params for sub-query', t=> {
  const graphQLQuery = `{
    Movie(title: "River Runs Through It, A") {
      mostSimilar {
        title
        year
      }
    }
  
  }`,
    expectedCypherQuery = `MATCH (movie:Movie {title:"River Runs Through It, A"}) RETURN movie {mostSimilar: head([ movie_mostSimilar IN apoc.cypher.runFirstColumn("WITH {this} AS this RETURN this", {this: movie}, true) | movie_mostSimilar { .title , .year }]) } AS movie SKIP 0`;
  cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery);
});

test('Pass @cypher directive default params to sub-query', t=> {
  const graphQLQuery = `{
    Movie(title: "River Runs Through It, A") {
      scaleRating
    }
  
  }`,
    expectedCypherQuery = `MATCH (movie:Movie {title:"River Runs Through It, A"}) RETURN movie {scaleRating: apoc.cypher.runFirstColumn("WITH $this AS this RETURN $scale * this.imdbRating", {this: movie, scale: 3}, false)} AS movie SKIP 0`;
  cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery);
});

test('Pass @cypher directive params to sub-query', t=> {
  const graphQLQuery = `{
    Movie(title: "River Runs Through It, A") {
      scaleRating(scale: 10)
    }
  
  }`,
    expectedCypherQuery = `MATCH (movie:Movie {title:"River Runs Through It, A"}) RETURN movie {scaleRating: apoc.cypher.runFirstColumn("WITH $this AS this RETURN $scale * this.imdbRating", {this: movie, scale: 10}, false)} AS movie SKIP 0`;
  cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery);
});

test('Query for Neo4js internal _id', t=> {
  const graphQLQuery = `{
    Movie(_id: 0) {
      title
      year
    }
  
  }`,
    expectedCypherQuery = `MATCH (movie:Movie {}) WHERE ID(movie)=0 RETURN movie { .title , .year } AS movie SKIP 0`;
  cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery);
});

test('Query for Neo4js internal _id and another param before _id', t=> {
  const graphQLQuery = `{
    Movie(title: "River Runs Through It, A", _id: 0) {
      title
      year
    }
  
  }`,
    expectedCypherQuery = `MATCH (movie:Movie {title:"River Runs Through It, A"}) WHERE ID(movie)=0 RETURN movie { .title , .year } AS movie SKIP 0`;
  cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery);
});

test('Query for Neo4js internal _id and another param after _id', t=> {
  const graphQLQuery = `{
    Movie(_id: 0, year: 2010) {
      title
      year
    }
  
  }`,
    expectedCypherQuery = `MATCH (movie:Movie {year:2010}) WHERE ID(movie)=0 RETURN movie { .title , .year } AS movie SKIP 0`;
  cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery);
});

test('Query for Neo4js internal _id by dedicated Query MovieBy_Id(_id: Int!)', t=> {
  const graphQLQuery = `{
    MovieBy_Id(_id: 0) {
      title
      year
    }
  
  }`,
    expectedCypherQuery = `MATCH (movie:Movie {}) WHERE ID(movie)=0 RETURN movie { .title , .year } AS movie SKIP 0`;
  cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery);
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
    expectedCypherQuery = 'MATCH (movie:Movie {title:"River Runs Through It, A"}) RETURN movie { .title ,actors: [(movie)<-[:ACTED_IN]-(movie_actors:Actor{name: "Tom Hanks"}) | movie_actors { .name }] ,similar: [ movie_similar IN apoc.cypher.runFirstColumn("WITH {this} AS this MATCH (this)--(:Genre)--(o:Movie) RETURN o", {this: movie, first: 3, offset: 0}, true) | movie_similar { .title }][..3] } AS movie SKIP 0';

  cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery);
});

test('basic mutation test', t => {
  const graphQLQuery = `mutation addMovie {
  createMovie(movieId: "1825683", title:"Black Panther", year: 2018, plot:"T'Challa, the King of Wakanda, rises to the throne in the isolated, technologically advanced African nation, but his claim is challenged by a vengeful outsider who was a childhood victim of T'Challa's father's mistake.", poster: "https://ia.media-imdb.com/images/M/MV5BMTg1MTY2MjYzNV5BMl5BanBnXkFtZTgwMTc4NTMwNDI@._V1_UX182_CR0,0,182,268_AL_.jpg", imdbRating: 7.8) {
		title
    year
    actors {
      name
    }
  }
}`,
    expectedCypherQuery = `CREATE (movie:Movie) SET movie = $params RETURN movie { .title , .year ,actors: [(movie)<-[:ACTED_IN]-(movie_actors:Actor) | movie_actors { .name }] } AS movie`;

  cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery);

});