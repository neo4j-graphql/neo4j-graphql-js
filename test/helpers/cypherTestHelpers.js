import { cypherQuery, cypherMutation, augmentSchema } from '../../dist/index';
import { graphql } from 'graphql';
import { makeExecutableSchema } from 'graphql-tools';
import { testSchema } from './testSchema';

export function cypherTestRunner(
  t,
  graphqlQuery,
  graphqlParams,
  expectedCypherQuery
) {
  const testMovieSchema =
    testSchema +
    `


type Mutation {
    CreateGenre(name: String): Genre @cypher(statement: "CREATE (g:Genre) SET g.name = $name RETURN g")
    CreateMovie(movieId: ID!, title: String, year: Int, plot: String, poster: String, imdbRating: Float): Movie
    AddMovieGenre(movieId: ID!, name: String): Movie @MutationMeta(relationship: "IN_GENRE", from:"Movie", to:"Genre")
}
`;

  //t.plan(2);

  const resolvers = {
    Query: {
      Movie(object, params, ctx, resolveInfo) {
        let query = cypherQuery(params, ctx, resolveInfo);
        t.is(query, expectedCypherQuery);
      },
      MoviesByYear(object, params, ctx, resolveInfo) {
        let query = cypherQuery(params, ctx, resolveInfo);
        t.is(query, expectedCypherQuery);
      },
      MovieById(object, params, ctx, resolveInfo) {
        let query = cypherQuery(params, ctx, resolveInfo);
        t.is(query, expectedCypherQuery);
      },
      MovieBy_Id(object, params, ctx, resolveInfo) {
        let query = cypherQuery(params, ctx, resolveInfo);
        t.is(query, expectedCypherQuery);
      },
      GenresBySubstring(object, params, ctx, resolveInfo) {
        let query = cypherQuery(params, ctx, resolveInfo);
        t.is(query, expectedCypherQuery);
      },
      Books(object, params, ctx, resolveInfo) {
        let query = cypherQuery(params, ctx, resolveInfo);
        t.is(query, expectedCypherQuery);
      }
    },
    Mutation: {
      CreateGenre(object, params, ctx, resolveInfo) {
        let query = cypherMutation(params, ctx, resolveInfo);
        t.is(query, expectedCypherQuery);
        t.end();
      },
      CreateMovie(object, params, ctx, resolveInfo) {
        let query = cypherMutation(params, ctx, resolveInfo);
        t.is(query, expectedCypherQuery);
        t.end();
      },
      AddMovieGenre(object, params, ctx, resolveInfo) {
        let query = cypherMutation(params, ctx, resolveInfo);
        t.is(query, expectedCypherQuery);
        t.end();
      }
    }
  };

  const schema = makeExecutableSchema({
    typeDefs: testMovieSchema,
    resolvers,
    resolverValidationOptions: {
      requireResolversForResolveType: false
    }
  });

  // query the test schema with the test query, assertion is in the resolver
  return graphql(schema, graphqlQuery, null, null, graphqlParams).then(function(
    data
  ) {
    // no data is actually resolved, we're just comparing the generated Cypher queries
  });
}

export function augmentedSchemaCypherTestRunner(
  t,
  graphqlQuery,
  graphqlParams,
  expectedCypherQuery
) {
  //t.plan(1);
  const resolvers = {
    Query: {
      Movie(object, params, ctx, resolveInfo) {
        let query = cypherQuery(params, ctx, resolveInfo);
        t.is(query, expectedCypherQuery);
      },
      MoviesByYear(object, params, ctx, resolveInfo) {
        let query = cypherQuery(params, ctx, resolveInfo);
        t.is(query, expectedCypherQuery);
      },
      MovieById(object, params, ctx, resolveInfo) {
        let query = cypherQuery(params, ctx, resolveInfo);
        t.is(query, expectedCypherQuery);
      },
      MovieBy_Id(object, params, ctx, resolveInfo) {
        let query = cypherQuery(params, ctx, resolveInfo);
        t.is(query, expectedCypherQuery);
      },
      GenresBySubstring(object, params, ctx, resolveInfo) {
        let query = cypherQuery(params, ctx, resolveInfo);
        t.is(query, expectedCypherQuery);
      },
      Books(object, params, ctx, resolveInfo) {
        let query = cypherQuery(params, ctx, resolveInfo);
        t.is(query, expectedCypherQuery);
      }
    }
  };

  const schema = makeExecutableSchema({
    typeDefs: testSchema,
    resolvers,
    resolverValidationOptions: {
      requireResolversForResolveType: false
    }
  });

  const augmentedSchema = augmentSchema(schema);

  return graphql(augmentedSchema, graphqlQuery, null, null, graphqlParams).then(
    d => {
      // no data actually resolved, just need to generate the Cypher query
    }
  );
}

export function augmentedSchema() {
  const schema = makeExecutableSchema({
    typeDefs: testSchema,
    //resolvers,
    resolverValidationOptions: {
      requireResolversForResolveType: false
    }
  });

  const augmentedSchema = augmentSchema(schema);
  return augmentedSchema;
}
