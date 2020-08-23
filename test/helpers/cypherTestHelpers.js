import {
  cypherQuery,
  cypherMutation,
  augmentTypeDefs,
  makeAugmentedSchema
} from '../../src/index';
import { printSchemaDocument } from '../../src/augment/augment';
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
    CreateMovie(movieId: ID, title: String, year: Int, plot: String, poster: String, imdbRating: Float, released: DateTime): Movie
    CreateState(name: String!, id: ID): State
    CreateUniqueNode(string: String, id: ID, anotherId: ID): UniqueNode @hasScope(scopes: ["UniqueNode: Create"])
    MergeUniqueStringNode(id: ID, uniqueString: String!): UniqueStringNode @hasScope(scopes: ["UniqueStringNode: Merge"])
    DeleteUniqueStringNode(uniqueString: String!): UniqueStringNode @hasScope(scopes: ["UniqueStringNode: Delete"])
    UpdateMovie(movieId: ID!, title: String, year: Int, plot: String, poster: String, imdbRating: Float): Movie
    DeleteMovie(movieId: ID!): Movie
    MergeUser(userId: ID!, name: String): User
    MergeBook(genre: BookGenre!): Book
    MergeNodeTypeMutationTest(NodeTypeMutationTest: BookGenre!): NodeTypeMutationTest
    currentUserId: String @cypher(statement: "RETURN $cypherParams.currentUserId")
    computedObjectWithCypherParams: currentUserId @cypher(statement: "RETURN { userId: $cypherParams.currentUserId }")
    computedStringList: [String] @cypher(statement: "UNWIND ['hello', 'world'] AS stringList RETURN stringList")
    computedTemporal: DateTime @cypher(statement: "WITH datetime() AS now RETURN { year: now.year, month: now.month , day: now.day , hour: now.hour , minute: now.minute , second: now.second , millisecond: now.millisecond , microsecond: now.microsecond , nanosecond: now.nanosecond , timezone: now.timezone , formatted: toString(now) }")
    computedSpatial: Point @cypher(statement: "WITH point({ x: 10, y: 20, z: 15 }) AS instance RETURN { x: instance.x, y: instance.y, z: instance.z, crs: instance.crs }")
    customWithArguments(strArg: String, strInputArg: strInput): String @cypher(statement: "RETURN $strInputArg.strArg")
    CreateNewCamera(id: ID, type: String, make: String, weight: Int, features: [String]): NewCamera
    CreateActor(userId: ID, name: String): Actor
    computedMovieSearch: [MovieSearch] @cypher(statement: "MATCH (ms:MovieSearch) RETURN ms")
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
    QueryA: {
      User: checkCypherQuery,
      Movie: checkCypherQuery,
      MoviesByYear: checkCypherQuery,
      MoviesByYears: checkCypherQuery,
      MovieById: checkCypherQuery,
      MovieBy_Id: checkCypherQuery,
      GenresBySubstring: checkCypherQuery,
      Books: checkCypherQuery,
      State: checkCypherQuery,
      Camera: checkCypherQuery,
      Person: checkCypherQuery,
      CustomCameras: checkCypherQuery,
      CustomCamera: checkCypherQuery,
      computedBoolean: checkCypherQuery,
      computedInt: checkCypherQuery,
      computedFloat: checkCypherQuery,
      currentUserId: checkCypherQuery,
      computedTemporal: checkCypherQuery,
      computedSpatial: checkCypherQuery,
      computedObjectWithCypherParams: checkCypherQuery,
      computedStringList: checkCypherQuery,
      computedIntList: checkCypherQuery,
      customWithArguments: checkCypherQuery,
      MovieSearch: checkCypherQuery,
      computedMovieSearch: checkCypherQuery
    },
    Mutation: {
      CreateGenre: checkCypherMutation,
      CreateMovie: checkCypherMutation,
      CreateActor: checkCypherMutation,
      CreateState: checkCypherMutation,
      CreateUniqueNode: checkCypherMutation,
      DeleteUniqueStringNode: checkCypherMutation,
      UpdateMovie: checkCypherMutation,
      DeleteMovie: checkCypherMutation,
      MergeUser: checkCypherMutation,
      MergeBook: checkCypherMutation,
      MergeNodeTypeMutationTest: checkCypherMutation,
      MergeUniqueStringNode: checkCypherMutation,
      currentUserId: checkCypherMutation,
      computedObjectWithCypherParams: checkCypherMutation,
      computedStringList: checkCypherMutation,
      computedTemporal: checkCypherMutation,
      computedSpatial: checkCypherMutation,
      customWithArguments: checkCypherMutation,
      CustomCamera: checkCypherMutation,
      CustomCameras: checkCypherMutation,
      CreateNewCamera: checkCypherMutation,
      computedMovieSearch: checkCypherMutation
    }
  };
  let augmentedTypeDefs = augmentTypeDefs(testMovieSchema, { auth: true });
  const schema = makeExecutableSchema({
    typeDefs: augmentedTypeDefs,
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
const cypherTestTypeDefs = printSchemaDocument({
  schema: makeAugmentedSchema({
    typeDefs: testSchema,
    resolvers: {
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
    config: {
      auth: true
    }
  })
});

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
    QueryA: {
      Person: checkCypherQuery,
      Actor: checkCypherQuery,
      User: checkCypherQuery,
      Genre: checkCypherQuery,
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
      SpatialNode: checkCypherQuery,
      State: checkCypherQuery,
      CasedType: checkCypherQuery,
      Camera: checkCypherQuery,
      Person: checkCypherQuery,
      NewCamera: checkCypherQuery,
      CustomCameras: checkCypherQuery,
      CustomCamera: checkCypherQuery,
      computedBoolean: checkCypherQuery,
      computedInt: checkCypherQuery,
      computedFloat: checkCypherQuery,
      currentUserId: checkCypherQuery,
      computedTemporal: checkCypherQuery,
      computedSpatial: checkCypherQuery,
      computedObjectWithCypherParams: checkCypherQuery,
      computedStringList: checkCypherQuery,
      computedIntList: checkCypherQuery,
      customWithArguments: checkCypherQuery,
      MovieSearch: checkCypherQuery,
      computedMovieSearch: checkCypherQuery
    },
    Mutation: {
      CreateMovie: checkCypherMutation,
      CreateActor: checkCypherMutation,
      CreateState: checkCypherMutation,
      CreateUniqueNode: checkCypherMutation,
      DeleteUniqueStringNode: checkCypherMutation,
      AddUniqueNodeTestRelation: checkCypherMutation,
      MergeUniqueNodeTestRelation: checkCypherMutation,
      RemoveUniqueNodeTestRelation: checkCypherMutation,
      MergeBook: checkCypherMutation,
      MergeNodeTypeMutationTest: checkCypherMutation,
      MergeUniqueStringNode: checkCypherMutation,
      CreateTemporalNode: checkCypherMutation,
      UpdateTemporalNode: checkCypherMutation,
      DeleteTemporalNode: checkCypherMutation,
      AddTemporalNodeTemporalNodes: checkCypherMutation,
      RemoveTemporalNodeTemporalNodes: checkCypherMutation,
      CreateSpatialNode: checkCypherMutation,
      UpdateSpatialNode: checkCypherMutation,
      DeleteSpatialNode: checkCypherMutation,
      AddSpatialNodeSpatialNodes: checkCypherMutation,
      RemoveSpatialNodeSpatialNodes: checkCypherMutation,
      AddMovieGenres: checkCypherMutation,
      MergeMovieGenres: checkCypherMutation,
      RemoveMovieGenres: checkCypherMutation,
      AddUserRated: checkCypherMutation,
      MergeUserRated: checkCypherMutation,
      UpdateUserRated: checkCypherMutation,
      RemoveUserRated: checkCypherMutation,
      AddUserFriends: checkCypherMutation,
      MergeUserFriends: checkCypherMutation,
      UpdateUserFriends: checkCypherMutation,
      RemoveUserFriends: checkCypherMutation,
      AddActorKnows: checkCypherMutation,
      MergeActorKnows: checkCypherMutation,
      RemoveActorKnows: checkCypherMutation,
      currentUserId: checkCypherMutation,
      computedObjectWithCypherParams: checkCypherMutation,
      computedStringList: checkCypherMutation,
      computedTemporal: checkCypherMutation,
      computedSpatial: checkCypherMutation,
      customWithArguments: checkCypherMutation,
      CustomCamera: checkCypherMutation,
      CustomCameras: checkCypherMutation,
      CreateNewCamera: checkCypherMutation,
      computedMovieSearch: checkCypherMutation,
      AddActorInterfacedRelationshipType: checkCypherMutation,
      RemoveActorInterfacedRelationshipType: checkCypherMutation,
      MergeActorInterfacedRelationshipType: checkCypherMutation,
      UpdateActorInterfacedRelationshipType: checkCypherMutation,
      MergeGenreInterfacedRelationshipType: checkCypherMutation
    }
  };

  const augmentedSchema = makeExecutableSchema({
    typeDefs: cypherTestTypeDefs,
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
