import { makeExecutableSchema } from 'graphql-tools';
import { parse, print, graphql } from 'graphql';
import { createReadStream, createWriteStream } from 'fs';
import {
  extractTypeMapFromTypeDefs,
  createOperationMap
} from '../../../dist/utils';
import { augmentTypeDefs, cypherQuery } from '../../../dist/index';

export const generateTestFile = async (tckFile, testFile) => {
  const tck = await extractTck(tckFile, testFile);
  const testDeclarations = buildTestDeclarations(tck);
  writeTestFile(testFile, tck, testDeclarations);
};

const extractTck = fileName => {
  return new Promise((resolve, reject) => {
    try {
      const rs = createReadStream(fileName, { encoding: 'utf8' });
      rs.on('data', lines => {
        // split into array of lines
        lines = lines.split('\n');
        // extract array elements for typeDefs
        const typeDefs = extractBlock('schema', lines);
        resolve({
          typeDefs: typeDefs.join('\n  '),
          tests: extractTestBlocks(lines)
        });
      });
    } catch (err) {
      reject(err);
    }
  });
};

const extractBlock = (type, lines, index = 0) => {
  const startTag = '```' + type;
  const endTag = '```';
  const typeBlockIndex = lines.indexOf(startTag, index);
  let extracted = undefined;
  if (typeBlockIndex !== -1) {
    const endIndex = lines.indexOf(endTag, typeBlockIndex);
    if (type === 'params') {
      const beforeTagIndex = lines.indexOf('```cypher', index);
      // reject if the next params block occurs after the next cypher block
      // in order to prevent getting unassociated params block
      if (typeBlockIndex > beforeTagIndex) {
        return extracted;
      }
    }
    // offset by 1 to skip the startingTag
    extracted = lines.slice(typeBlockIndex + 1, endIndex);
  }
  return extracted;
};

const extractTestBlocks = data => {
  return data.reduce((acc, line, index, lines) => {
    // beginning at every ```graphql line
    if (line === '```graphql') {
      // extract the array elements of this graphql block
      const graphqlBlock = extractBlock('graphql', lines, index);
      if (graphqlBlock) {
        acc.push({
          test: getTestName(lines, index),
          graphql: graphqlBlock,
          params: extractBlock('params', lines, index),
          cypher: extractBlock('cypher', lines, index)
        });
      }
    }
    return acc;
  }, []);
};

const getTestName = (lines, index) => {
  // expects test name on line immediately before ```graphql block
  const nameIndex = index - 1;
  let name = nameIndex >= 0 ? lines[nameIndex] : '';
  if (name && name.startsWith('###')) {
    // removes ### prefix, trims whitespace
    name = name.substring(3).trim();
  } else {
    name = `Unnamed test on line ${index + 1}`;
  }
  return name;
};

const buildTestDeclarations = tck => {
  const schema = makeTestDataSchema(tck);
  const testData = buildTestData(schema, tck);
  return testData
    .reduce((acc, test) => {
      // escape " so that we can wrap the cypher in "s
      const cypherStatement = test.cypher.replace(/"/g, '\\"');
      // ava test string template
      acc.push(`test("${test.name}", t => {
  const graphQLQuery = \`${test.graphql}\`;
  const expectedCypherQuery = "${cypherStatement}";
  t.plan(2);
  filterTestRunner(t, typeDefs, graphQLQuery, ${JSON.stringify(
    test.params
  )}, expectedCypherQuery, ${JSON.stringify(test.expectedCypherParams)});
});\n`);
      return acc;
    }, [])
    .join('\n');
};

const makeTestDataSchema = tck => {
  const typeDefs = tck.typeDefs;
  const typeMap = extractTypeMapFromTypeDefs(typeDefs);
  const resolvers = buildTestDataResolvers(typeMap);
  // augmentation for directive and temporal support
  const augmentedTypeDefs = augmentTypeDefs(typeDefs);
  // build a schema to be used in running resolvers that use cypherQuery
  return makeExecutableSchema({
    typeDefs: augmentedTypeDefs,
    resolvers,
    resolverValidationOptions: {
      requireResolversForResolveType: false
    }
  });
};

const buildTestData = (schema, tck) => {
  const extractedTckTestData = tck.tests;
  return extractedTckTestData.reduce((acc, testBlocks) => {
    const testName = testBlocks.test;
    // graphql
    let testGraphql = testBlocks.graphql.join('\n');
    // validation and formatting through parse -> print
    testGraphql = parse(testGraphql);
    testGraphql = print(testGraphql);
    // graphql variables
    let testParams = {};
    if (testBlocks.params) {
      testParams = testBlocks.params.join('\n');
      testParams = JSON.parse(testParams);
    }
    const testCypher = testBlocks.cypher.join(' ');
    // get expected params from within resolver
    graphql(
      schema,
      testGraphql,
      null,
      {
        testData: acc,
        name: testName,
        graphql: testGraphql,
        params: testParams,
        cypher: testCypher
      },
      testParams
    ).then(data => {
      const errors = data['errors'];
      if (errors) {
        const error = errors[0];
        const message = error.message;
        console.log(`
Parse Error:
testName: ${testName}
message: ${message}
`);
      }
    });
    return acc;
  }, []);
};

const buildTestDataResolvers = typeMap => {
  const resolvers = {};
  const queryType = typeMap.Query;
  if (queryType) {
    const queryMap = createOperationMap(queryType);
    resolvers['Query'] = buildResolvers(queryMap);
  }
  const mutationType = typeMap.Mutation;
  if (mutationType) {
    const mutationMap = createOperationMap(mutationType);
    resolvers['Mutation'] = buildResolvers(mutationMap);
  }
  return resolvers;
};

const buildResolvers = fieldMap => {
  return Object.keys(fieldMap).reduce((acc, t) => {
    acc[t] = (object, params, ctx, resolveInfo) => {
      const [query, cypherParams] = cypherQuery(params, ctx, resolveInfo);
      ctx.testData.push({
        name: ctx.name,
        graphql: ctx.graphql,
        params: ctx.params,
        cypher: ctx.cypher,
        expectedCypherParams: cypherParams
      });
    };
    return acc;
  }, {});
};

const writeTestFile = (testFile, tck, testDeclarations) => {
  const typeDefs = tck.typeDefs;
  const writeStream = createWriteStream(testFile);
  writeStream.write(`// Generated by test/tck/parseTck.js
import test from 'ava';
import { filterTestRunner } from '../helpers/filterTestHelpers';

const typeDefs = \`
  ${typeDefs}
\`;

${testDeclarations}`);
};
