import {
  cypherQuery,
  cypherMutation,
  augmentSchema,
  augmentTypeDefs
} from '../../dist/index';
import { printTypeMap, extractTypeMapFromTypeDefs } from '../../dist/utils';
import { augmentTypeMap } from '../../dist/augment';
import { graphql } from 'graphql';
import { makeExecutableSchema } from 'graphql-tools';
import { testSchema } from './testSchema';

export function cypherTestRunner(
  t,
  graphqlQuery,
  graphqlParams,
  expectedCypherQuery,
  expectedCypherParams
) {
  const testMovieSchema =
    testSchema +
    `
type Mutation {
    CreateGenre(name: String): Genre @cypher(statement: "CREATE (g:Genre) SET g.name = $name RETURN g")
    CreateMovie(movieId: ID, title: String, year: Int, plot: String, poster: String, imdbRating: Float): Movie
    CreateState(name: String!): State
    UpdateMovie(movieId: ID!, title: String, year: Int, plot: String, poster: String, imdbRating: Float): Movie
    DeleteMovie(movieId: ID!): Movie
    currentUserId: String @cypher(statement: "RETURN $cypherParams.currentUserId")
    computedObjectWithCypherParams: currentUserId @cypher(statement: "RETURN { userId: $cypherParams.currentUserId }")
    computedStringList: [String] @cypher(statement: "UNWIND ['hello', 'world'] AS stringList RETURN stringList")
    computedTemporal: DateTime @cypher(statement: "WITH datetime() AS now RETURN { year: now.year, month: now.month , day: now.day , hour: now.hour , minute: now.minute , second: now.second , millisecond: now.millisecond , microsecond: now.microsecond , nanosecond: now.nanosecond , timezone: now.timezone , formatted: toString(now) }")
    customWithArguments(strArg: String, strInputArg: strInput): String @cypher(statement: "RETURN $strInputArg.strArg")
  }
`;

  const checkCypherQuery = (object, params, ctx, resolveInfo) => {
    const [query, queryParams] = cypherQuery(params, ctx, resolveInfo);
    t.is(query, expectedCypherQuery);
    t.deepEqual(queryParams, expectedCypherParams);
  };

  const checkCypherMutation = (object, params, ctx, resolveInfo) => {
    const [query, queryParams] = cypherMutation(params, ctx, resolveInfo);
    t.is(query, expectedCypherQuery);
    t.deepEqual(queryParams, expectedCypherParams);
    t.end();
  };

  const resolvers = {
    Query: {
      User: checkCypherQuery,
      Movie: checkCypherQuery,
      MoviesByYear: checkCypherQuery,
      MoviesByYears: checkCypherQuery,
      MovieById: checkCypherQuery,
      MovieBy_Id: checkCypherQuery,
      GenresBySubstring: checkCypherQuery,
      Books: checkCypherQuery,
      State: checkCypherQuery,
      computedBoolean: checkCypherQuery,
      computedInt: checkCypherQuery,
      computedFloat: checkCypherQuery,
      currentUserId: checkCypherQuery,
      computedTemporal: checkCypherQuery,
      computedObjectWithCypherParams: checkCypherQuery,
      computedStringList: checkCypherQuery,
      computedIntList: checkCypherQuery,
      customWithArguments: checkCypherQuery
    },
    Mutation: {
      CreateGenre: checkCypherMutation,
      CreateMovie: checkCypherMutation,
      CreateState: checkCypherMutation,
      UpdateMovie: checkCypherMutation,
      DeleteMovie: checkCypherMutation,
      currentUserId: checkCypherMutation,
      computedObjectWithCypherParams: checkCypherMutation,
      computedStringList: checkCypherMutation,
      computedTemporal: checkCypherMutation,
      customWithArguments: checkCypherMutation
    }
  };

  const schema = makeExecutableSchema({
    typeDefs: augmentTypeDefs(testMovieSchema, { auth: true }),
    resolvers,
    resolverValidationOptions: {
      requireResolversForResolveType: false
    }
  });

  // query the test schema with the test query, assertion is in the resolver
  return graphql(
    schema,
    graphqlQuery,
    null,
    {
      cypherParams: {
        userId: 'user-id'
      }
    },
    graphqlParams
  );
}

// Optimization to prevent schema augmentation from running for every test
const typeMap = extractTypeMapFromTypeDefs(testSchema);
const augmentedTypeMap = augmentTypeMap(
  typeMap,
  {
    // These custom field resolvers exist only for generating
    // @neo4j_ignore directives used in a few tests
    Movie: {
      customField(object, params, ctx, resolveInfo) {
        return '';
      }
    },
    State: {
      customField(object, params, ctx, resolveInfo) {
        return '';
      }
    }
  },
  {
    auth: true
  }
);
const augmentedSchemaCypherTestRunnerTypeDefs = printTypeMap(augmentedTypeMap);

export function augmentedSchemaCypherTestRunner(
  t,
  graphqlQuery,
  graphqlParams,
  expectedCypherQuery
) {
  const checkCypherQuery = (object, params, ctx, resolveInfo) => {
    const [query, queryParams] = cypherQuery(params, ctx, resolveInfo);
    t.is(query, expectedCypherQuery);
    t.deepEqual(queryParams, expectedCypherParams);
  };
  const checkCypherMutation = (object, params, ctx, resolveInfo) => {
    const [query, queryParams] = cypherMutation(params, ctx, resolveInfo);
    t.is(query, expectedCypherQuery);
    t.deepEqual(queryParams, expectedCypherParams);
    t.end();
  };

  const resolvers = {
    Query: {
      User: checkCypherQuery,
      Movie: checkCypherQuery,
      MoviesByYear: checkCypherQuery,
      MoviesByYears: checkCypherQuery,
      MovieById: checkCypherQuery,
      MovieBy_Id: checkCypherQuery,
      GenresBySubstring: checkCypherQuery,
      Book: checkCypherQuery,
      Books: checkCypherQuery,
      TemporalNode(object, params, ctx, resolveInfo) {
        // cypherParams is emptied for the test
        // Handle @cypher field on root query type with scalar payload, no args
        // to ensure that only the $this param is used
        ctx['cypherParams'] = {};
        let [query, queryParams] = cypherQuery(params, ctx, resolveInfo);
        t.is(query, expectedCypherQuery);
        t.deepEqual(queryParams, expectedCypherParams);
      },
      State: checkCypherQuery,
      computedBoolean: checkCypherQuery,
      computedInt: checkCypherQuery,
      computedFloat: checkCypherQuery,
      currentUserId: checkCypherQuery,
      computedTemporal: checkCypherQuery,
      computedObjectWithCypherParams: checkCypherQuery,
      computedStringList: checkCypherQuery,
      computedIntList: checkCypherQuery,
      customWithArguments: checkCypherQuery
    },
    Mutation: {
      CreateMovie: checkCypherMutation,
      CreateState: checkCypherMutation,
      CreateTemporalNode: checkCypherMutation,
      UpdateTemporalNode: checkCypherMutation,
      DeleteTemporalNode: checkCypherMutation,
      AddTemporalNodeTemporalNodes: checkCypherMutation,
      RemoveTemporalNodeTemporalNodes: checkCypherMutation,
      AddMovieGenres: checkCypherMutation,
      RemoveMovieGenres: checkCypherMutation,
      AddUserRated: checkCypherMutation,
      RemoveUserRated: checkCypherMutation,
      AddUserFriends: checkCypherMutation,
      RemoveUserFriends: checkCypherMutation,
      currentUserId: checkCypherMutation,
      computedObjectWithCypherParams: checkCypherMutation,
      computedStringList: checkCypherMutation,
      computedTemporal: checkCypherMutation,
      customWithArguments: checkCypherMutation
    }
  };

  const augmentedSchema = makeExecutableSchema({
    typeDefs: augmentedSchemaCypherTestRunnerTypeDefs,
    resolvers,
    resolverValidationOptions: {
      requireResolversForResolveType: false
    }
  });

  return graphql(
    augmentedSchema,
    graphqlQuery,
    null,
    {
      cypherParams: {
        userId: 'user-id'
      }
    },
    graphqlParams
  );
}

const augmentedSchemaTypeDefs = augmentTypeDefs(testSchema, {
  auth: true
});

export function augmentedSchema() {
  const schema = makeExecutableSchema({
    typeDefs: augmentedSchemaTypeDefs,
    resolvers: {
      Movie: {
        customField(object, params, ctx, resolveInfo) {
          return '';
        }
      },
      State: {
        customField(object, params, ctx, resolveInfo) {
          return '';
        }
      }
    },
    resolverValidationOptions: {
      requireResolversForResolveType: false
    }
  });
  return augmentSchema(schema);
}
