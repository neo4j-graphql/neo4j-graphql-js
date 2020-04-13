import { graphql } from 'graphql';
import { ApolloError } from 'apollo-server';

//! graphql on my my own schema with a normal request
//! resolvers in that schema, for a certain test...

//! I could have four separate schema, one for each service, its resolvers could all
//! do what they normally would, but with mocked data in some cases, mocked arguments
//! and keys then being passed through

//! a test, then, would send a graphql req to the root part of the call

//! to mock sending a request for annotations from the Article schema,
//! then we get Articles, the query resolver will call the schema for the TextAnnotation
//! schema with a mocked request, but when we get the data back, we'll run a test to
//! see its right, and we'll also run a test over in the TextAnnotation to pick up the
//! federated request and build its graphql and cypher, and test those
//! so then in each schema, ill mock requests, using the helper export,
//! and then call the other schema, intercept it and do things normally with it
//! but for static testing within the resolvers

export const testFederatedOperation = ({}) => {
  // TODO modify resolve info for that which would be expected of a federated operation
  // NOTE provide what is identified in isFederatedOperation
  // TODO with that resolve info, manual / piped through object key args, and everything else normal,
  // NOTE call buildFederatedOperation and compare the generated graphql query to a static one for translation tests
  // TODO make something local, similar to cypherTestHelpers/cypherTestRunner, to generate translation cypher and compare it to the static translation
  // NOTE this way, we have static translatio tests for everything
};

// TODO integration tests will then just run everything for real

export const mockFederatedOperation = ({
  source = '',
  object = {},
  params = {},
  context = {},
  resolveInfo = {},
  schema
}) => {
  // query($representations:[_Any!]!){_entities(representations:$representations){...on Article{annotations{id name}}}}
  const federatedEntityQuery = `
query($representations:[_Any!]!) {
  _entities(representations:$representations) {
    ...on ${resolveInfo.fieldName} {
      ${source}
    }
  }
}`;
  console.log('federatedEntityQuery: ', federatedEntityQuery);
  const result = graphql({
    schema,
    source: federatedEntityQuery,
    contextValue: {},
    variableValues: {
      representations: [object]
    }
  }).then(({ data, errors }) => {
    if (errors && errors[0]) throw new ApolloError(errors);
    const expectedFormat =
      data && data[typeName] ? data[typeName][0] : undefined;
    //     if (debugFlag) {
    //       console.log(`
    // Neo4j Returned:
    //       `)
    //       console.log(JSON.stringify(expectedFormat, null, 2));
    //     }
    //     debug('%s', JSON.stringify(expectedFormat, null, 2));
    return expectedFormat;
  });
  console.log('MOCK result: ', result);
  // console.log("object: ", object);
  // console.log("params: ", params);
  // console.log("context: ", context);
  // console.log("resolveInfo: ", resolveInfo);
  // console.log("schema: ", schema);
  // TODO this will modify the resolve info and call graphql on the provided schema
};
