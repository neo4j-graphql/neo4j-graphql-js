import test from 'ava';
import Neo4jSchemaTree from '../../../dist/neo4j-schema/Neo4jSchemaTree';
import fakes from '../../helpers/driverFakes';
import _ from 'lodash';

let tree;
let driver;

const fakeResponses = {
  'CALL db.schema.nodeTypeProperties()': [
    {
      nodeLabels: ['A', 'B'],
      propertyName: 'prop1',
      propertyTypes: ['String'],
      mandatory: true
    },
    {
      nodeLabels: ['A', 'B'],
      propertyName: 'prop2',
      propertyTypes: ['Float'],
      mandatory: false
    }
  ],
  'CALL db.schema.relTypeProperties()': [
    {
      relType: ':`REL`',
      propertyName: null,
      propertyTypes: null,
      mandatory: null
    },
    {
      relType: ':`WITH_PROPS`',
      propertyName: 'a',
      propertyTypes: ['String'],
      mandatory: true
    },
    {
      relType: ':`WITH_PROPS`',
      propertyName: 'b',
      propertyTypes: ['String'],
      mandatory: true
    }
  ],
  // Regex match for triggering _populateRelationshipTypeLinks
  '.*as from,.*as to': [{ from: ['A', 'B'], to: ['A', 'B'] }]
};

test.beforeEach(t => {
  driver = fakes.Driver(fakeResponses);

  tree = new Neo4jSchemaTree(driver);
});

test('Driver ownership', t => {
  t.is(tree.driver, driver);
});

test('Initialize', t => {
  return tree.initialize().then(() => {
    const nodes = tree.getNodes();
    t.is(nodes.length, 1);
    const n = nodes[0];

    t.is(n.id, 'A:B');

    // Schema tree should assign graphQLTypes to properties
    t.is(n.getProperty('prop1').graphQLType, 'String!');

    const rels = tree.getRels();
    t.is(rels.length, 2);
    const rel = rels.filter(r => r.getRelationshipType() === 'REL')[0];
    const withProps = rels.filter(
      r => r.getRelationshipType() === 'WITH_PROPS'
    )[0];

    t.deepEqual(rel.getPropertyNames(), []);
    t.deepEqual(withProps.getPropertyNames(), ['a', 'b']);

    t.is(tree.getNodeByLabels(['B', 'A']), n);
    t.is(tree.getNodeByLabels(['Nonexistant']), undefined);
  });
});

test('Link Establishment', t => {
  return tree.initialize().then(() => {
    const rels = tree.getRels();
    const rel = rels.filter(r => r.getRelationshipType() === 'REL')[0];
    const withProps = rels.filter(
      r => r.getRelationshipType() === 'WITH_PROPS'
    )[0];

    // They're both from A,B -> A,B

    t.true(rel.isOutboundFrom('A'));
    t.true(rel.isOutboundFrom('B'));
    t.true(withProps.isOutboundFrom('A'));
    t.true(withProps.isOutboundFrom('B'));
  });
});

test('toJSON', t => {
  return tree.initialize().then(() => {
    const obj = tree.toJSON();
    t.true(_.isObject(obj.nodes) && !_.isNil(obj.nodes));
    t.true(_.isObject(obj.rels) && !_.isNil(obj.rels));
  });
});
