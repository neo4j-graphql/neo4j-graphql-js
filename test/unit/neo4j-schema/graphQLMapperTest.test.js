import test from 'ava';
import schema from '../../../dist/neo4j-schema/entities';
import graphQLMapper from '../../../dist/neo4j-schema/graphQLMapper';
import Neo4jSchemaTree from '../../../dist/neo4j-schema/Neo4jSchemaTree';
import driverFakes from '../../helpers/driverFakes';
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

const fakeOkapiRelProperty = (
  relType,
  name,
  graphQLType,
  mandatory = false
) => ({
  relType,
  propertyName: name,
  graphQLType,
  mandatory
});

test.before(t => {
  driver = driverFakes.Driver();

  // Create a fake tree.
  tree = new Neo4jSchemaTree(driver);

  const customer = new schema.Neo4jNode('Customer');
  const product = new schema.Neo4jNode('Product');
  const state = new schema.Neo4jNode('State');

  const buys = new schema.Neo4jRelationship(':`BUYS`');
  buys.links = [{ from: ['Customer'], to: ['Product'] }];
  const reviewed = new schema.Neo4jRelationship(':`REVIEWED`');
  reviewed.links = [{ from: ['Customer'], to: ['Product'] }];
  const livesIn = new schema.Neo4jRelationship(':`LIVES_IN`');
  livesIn.links = [{ from: ['Customer'], to: ['State'] }];

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
  state.addProperty(
    'name',
    fakeOkapiProperty(['State'], 'name', 'String!', true)
  );

  reviewed.addProperty(
    'stars',
    fakeOkapiRelProperty(':`REVIEWED`', 'stars', 'Integer', true)
  );

  tree.nodes[customer.id] = customer;
  tree.nodes[product.id] = product;
  tree.nodes[state.id] = state;

  tree.rels[buys.id] = buys;
  tree.rels[reviewed.id] = reviewed;
  tree.rels[livesIn.id] = livesIn;

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

test('All nodes get an _id property to permit propertyless-node labels to work', t => {
  t.true(typeDefs.indexOf('_id: Long!') > -1);
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
      'lives_in: [State] @relation(name: "LIVES_IN", direction: "OUT")'
    ) > -1
  );
  t.true(
    typeDefs.indexOf(
      'customers: [Customer] @relation(name: "LIVES_IN", direction: "IN")'
    ) > -1
  );
});

test('Deconflicts names for multi-targeted relationships by using relationship label', t => {
  // From customer, we have both rels REVIEWED and BUYS going out to Product.  This means
  // that on "Product" the field can't be called "customers" because there would be a naming
  // conflict.  This tests that the module has worked around this.
  t.true(
    typeDefs.indexOf(
      'customers_buys: [Customer] @relation(name: "BUYS", direction: "IN")'
    ) > -1
  );

  t.true(
    typeDefs.indexOf(
      'customers_reviewed: [Customer] @relation(name: "REVIEWED", direction: "IN")'
    ) > -1
  );
});

test('Defines relationship types with properties', t => {
  console.log(typeDefs);
  t.true(typeDefs.indexOf('type REVIEWED @relation(name: "REVIEWED")') > -1);
});
