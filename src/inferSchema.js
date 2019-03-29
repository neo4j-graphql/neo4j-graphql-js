import _ from 'lodash';
import Neo4jSchemaTree from './neo4j-schema/Neo4jSchemaTree';
import graphQLMapper from './neo4j-schema/graphQLMapper';

// OKAPI formats it as ':`Foo`' and we want 'Foo'
const extractRelationshipType = relTypeName =>
  relTypeName.substring(2, relTypeName.length - 1);

const generateGraphQLTypeForTreeEntry = (tree, key) => {
  const entry = tree.getNode(key);
  const propNames = Object.keys(entry);
  const graphqlTypeName = key.replace(/:/g, '_');

  const typeDeclaration = `type ${graphqlTypeName} {\n`;

  const propertyDeclarations = propNames.map(
    propName => `   ${propName}: ${entry[propName].graphQLType}\n`
  );

  const labels = key.split(/:/);

  // For these labels, figure out which rels are outbound from any member label.
  // That is, if your node is :Foo:Bar, any rel outbound from just Foo counts.
  const relDeclarations = _.flatten(
    labels.map(label => {
      const inbound = lookupInboundRels(tree, label);
      const outbound = lookupOutboundRels(tree, label);
      const relIds = _.uniq(inbound.concat(outbound));

      return relIds.map(relId => {
        // Create a copy of the links to/from this label.
        const links = _.cloneDeep(
          tree.rels[relId].links.filter(
            link => link.from.indexOf(label) > -1 || link.to.indexOf(label) > -1
          )
        ).map(link => {
          if (link.from.indexOf(label) > -1) {
            _.set(link, 'direction', 'OUT');
          } else {
            _.set(link, 'direction', 'IN');
          }
        });

        // OUT relationships first.  Get their 'to' labels and generate.
        const allTargetLabels = _.uniq(
          _.flatten(
            links.filter(l => l.direction === 'OUT').map(link => link.to)
          )
        );
        if (allTargetLabels.length > 1) {
          // If a relationship (:A)-[:relType]->(x) where
          // x has multiple different labels, we can't express this as a type in
          // GraphQL.
          console.warn(
            `RelID ${relId} for label ${label} has more than one outbound type (${allTargetLabels}); skipping`
          );
          return null;
        }

        const tag = `@relation(name: "${extractRelationshipType(
          relId
        )}", direction: "OUT")`;
        const targetTypeName = allTargetLabels[0];

        return `   ${targetTypeName.toLowerCase()}s: [${targetTypeName}] ${tag}\n`;
      });
    })
  );

  return (
    typeDeclaration +
    propertyDeclarations.join('') +
    relDeclarations.join('') +
    '}\n'
  );
};

/**
 * Determine which relationships are outbound from a label under a schema tree.
 * @param {*} tree a schema tree
 * @param {*} label a graph label
 * @returns {Array} of relationship IDs
 */
const lookupOutboundRels = (tree, label) =>
  Object.keys(tree.rels).filter(
    relId =>
      tree.rels[relId].links &&
      tree.rels[relId].links.filter(link => link.from.indexOf(label) !== -1)
        .length > 0
  );

const lookupInboundRels = (tree, label) =>
  Object.keys(tree.rels).filter(
    relId =>
      tree.rels[relId].links &&
      tree.rels[relId].links.filter(link => link.to.indexOf(label) !== -1)
        .length > 0
  );

const schemaTreeToGraphQLSchema = tree => {
  console.log('TREE ', JSON.stringify(tree.toJSON(), null, 2));
  const nodeTypes = Object.keys(tree.nodes).map(key =>
    generateGraphQLTypeForTreeEntry(tree, key)
  );

  const schema = nodeTypes.join('\n');
  return schema;
};

/**
 * Infer a GraphQL schema by inspecting the contents of a Neo4j instance.
 * @param {} driver
 * @returns a GraphQL schema.
 */
export const inferSchema = driver => {
  const tree = new Neo4jSchemaTree(driver);

  return tree.initialize().then(graphQLMapper);
};
