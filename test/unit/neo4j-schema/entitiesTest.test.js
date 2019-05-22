import test from 'ava';
import schema from '../../../dist/neo4j-schema/entities';
import _ from 'lodash';

let n;
let r;

const nodeOkapiID = 'Foo:Bar';
const relOkapiID = ':`REL WITH SPACE`';

test.before(t => {
  n = new schema.Neo4jNode(nodeOkapiID);
  r = new schema.Neo4jRelationship(relOkapiID);
});

test('Neo4jNode basics', t => {
  t.is(n.type, 'node');
  t.is(n.id, nodeOkapiID);
});

test('SchemaEntity properties', t => {
  const fooProp = { foo: 'bar' };
  const barProp = { bar: 'foo' };
  n.addProperty('foo', fooProp);
  n.addProperty('bar', barProp);

  t.deepEqual(n.getPropertyNames(), ['bar', 'foo']);
  t.deepEqual(n.getProperty('foo'), fooProp);
  t.deepEqual(n.getProperty('bar'), barProp);

  t.true(_.isNil(n.getProperty('nonexistant')));
});

test('Neo4jNode labels', t => t.deepEqual(n.getLabels(), ['Bar', 'Foo']));
test('Neo4jNode graphQLType', t => t.is(n.getGraphQLTypeName(), 'Bar_Foo'));

test('Neo4jRelationship basics', t => {
  t.is(r.type, 'relationship');
  t.is(r.id, relOkapiID);
});

test('Neo4jRelationship type', t =>
  t.is(r.getRelationshipType(), 'REL WITH SPACE'));

test('Neo4jRelationship graphQLTypeName', t =>
  t.is(r.getGraphQLTypeName(), 'REL_WITH_SPACE'));

test('Neo4j Relationship Links', t => {
  const links = [
    { from: ['A', 'B'], to: ['C', 'D'] },
    { from: ['E'], to: ['F'] }
  ];

  r.links = links;

  ['A', 'B', 'E'].forEach(label => {
    t.true(r.isOutboundFrom(label));
    t.false(r.isInboundTo(label));
  });

  ['C', 'D', 'F'].forEach(label => {
    t.true(r.isInboundTo(label));
    t.false(r.isOutboundFrom(label));
  });

  // isOutboundFrom/isInboundTo should also work on sets.
  t.true(r.isOutboundFrom(['B', 'A']));
  t.true(r.isInboundTo(['C', 'D']));

  t.deepEqual(r.getToLabels(), ['C', 'D', 'F']);
  t.deepEqual(r.getFromLabels(), ['A', 'B', 'E']);

  t.false(r.isUnivalent());
});

test('Neo4j Univalent/Multivalent Relationships', t => {
  const univalentLinks = [{ from: ['A', 'B'], to: ['C', 'D'] }];
  const multiValentLinks = [
    { from: ['A', 'B'], to: ['C', 'D'] },
    { from: ['E'], to: ['F'] }
  ];

  r.links = univalentLinks;
  t.true(r.isUnivalent());
  r.links = multiValentLinks;
  t.false(r.isUnivalent());
});
