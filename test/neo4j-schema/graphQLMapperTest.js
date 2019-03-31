import test from 'ava';
import schema from '../../dist/neo4j-schema/entities';
import graphQLMapper from '../../dist/neo4j-schema/graphQLMapper';
import Neo4jSchemaTree from '../../dist/neo4j-schema/Neo4jSchemaTree';
import driverFakes from '../helpers/driverFakes';
import assert from 'assert';
import _ from 'lodash';

let tree;
let driver;
let typeDefs;
let result;
let resolvers;

const fakeOkapiProperty = (labels, name, graphQLType, mandatory = false) => ({
  nodeLabels: labels,
  graphQLType,
  mandatory
});

test.before(t => {
  driver = driverFakes.Driver();

  // Create a fake tree.
  tree = new Neo4jSchemaTree(driver);

  const customer = new schema.Neo4jNode('Customer');
  const product = new schema.Neo4jNode('Product');
  const buys = new schema.Neo4jRelationship(':`BUYS`');
  buys.links = [{ from: ['Customer'], to: ['Product'] }];

  customer.addProperty(
    'name',
    fakeOkapiProperty(['Customer'], 'name', 'String!')
  );
  customer.addProperty(
    'age',
    fakeOkapiProperty(['Customer'], 'age', 'Integer')
  );
  product.addProperty(
    'sku',
    fakeOkapiProperty(['Product'], 'sku', 'String!', true)
  );

  tree.nodes[customer.id] = customer;
  tree.nodes[product.id] = product;
  tree.rels[buys.id] = buys;

  result = graphQLMapper(tree);
  typeDefs = result.typeDefs;
  resolvers = result.resolvers;
});

test('Basic Mapping Result Structure', t => {
  t.true(typeof result === 'object');
  t.true(typeof typeDefs === 'string');
  t.true(typeof resolvers === 'object');
});

test('Defines a GraphQL type per node', t => {
  t.true(typeDefs.indexOf('type Customer {') > -1);
  t.true(typeDefs.indexOf('type Product {') > -1);
});

test('Defines properties with correct types', t => {
  console.log(typeDefs);
  t.true(typeDefs.indexOf('age: Integer') > -1);
  t.true(typeDefs.indexOf('name: String!') > -1);
  t.true(typeDefs.indexOf('sku: String!') > -1);
});

test('Defines relationships BOTH WAYS with right order and @relation directive', t => {
  t.true(
    typeDefs.indexOf(
      'buys: [Product] @relation(name: "BUYS", direction: "OUT")'
    ) > -1
  );
  t.true(
    typeDefs.indexOf(
      'customers: [Customer] @relation(name: "BUYS", direction: "IN")'
    ) > -1
  );
});
