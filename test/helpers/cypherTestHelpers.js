import {cypherQuery} from '../../dist/index';
import {graphql} from 'graphql';
import {makeExecutableSchema} from 'graphql-tools';

export function cypherTestRunner(t, graphqlQuery, graphqlParams, expectedCypherQuery) {

  const testMovieSchema = `
type Movie {
  movieId: ID!
  title: String
  year: Int
  plot: String
  poster: String
  imdbRating: Float
  genres: [String]
  similar(first: Int = 3, offset: Int = 0): [Movie] @cypher(statement: "WITH {this} AS this MATCH (this)--(:Genre)--(o:Movie) RETURN o")
  mostSimilar: Movie @cypher(statement: "WITH {this} AS this RETURN this")
  degree: Int @cypher(statement: "WITH {this} AS this RETURN SIZE((this)--())")
  actors(first: Int = 3, offset: Int = 0): [Actor] @relation(name: "ACTED_IN", direction:"IN")
  avgStars: Float
  filmedIn: State @relation(name: "FILMED_IN", direction:"OUT")
  scaleRating(scale: Int = 3): Float @cypher(statement: "WITH $this AS this RETURN $scale * this.imdbRating")
  scaleRatingFloat(scale: Float = 1.5): Float @cypher(statement: "WITH $this AS this RETURN $scale * this.imdbRating")
}

type State {
  name: String
}

interface Person {
	id: ID!
  name: String
}

type Actor implements Person {
  id: ID!
  name: String
  movies: [Movie] @relation(name: "ACTED_IN", direction:"OUT")
}

type User implements Person {
  id: ID!
	name: String
}


type Query {
  Movie(id: ID, title: String, year: Int, plot: String, poster: String, imdbRating: Float, first: Int, offset: Int): [Movie]
  MoviesByYear(year: Int): [Movie]
  MovieById(movieId: ID!): Movie
}
`;

  t.plan(1);


  const resolvers = {
    Query: {
      Movie(object, params, ctx, resolveInfo) {
        let query = cypherQuery(params, ctx, resolveInfo);
        t.is(query, expectedCypherQuery);
      },
      MoviesByYear(object, params, ctx, resolveInfo){
        let query = cypherQuery(params, ctx, resolveInfo);
        t.is(query, expectedCypherQuery);
    },
      MovieById(object, params, ctx, resolveInfo) {
        let query = cypherQuery(params, ctx, resolveInfo);
        t.is(query, expectedCypherQuery);
      }
  }};


  const schema = makeExecutableSchema({
    typeDefs: testMovieSchema,
    resolvers,
  });

  // query the test schema with the test query, assertion is in the resolver
  return graphql(schema, graphqlQuery, null, null, graphqlParams).then(function (data) {
    // no data is actually resolved, we're just comparing the generated Cypher queries
  })
}