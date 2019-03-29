import schema from './entities';
import neo4jTypes from './types';
import _ from 'lodash';
import { neo4jgraphql } from '..';

const relationDirective = (relType, direction) =>
  `@relation(name: "${relType}", direction: "${direction}")`;

const mapOutboundRels = (tree, node) => {
  const labels = node.getLabels();

  return _.flatten(
    labels.map(label => {
      // Figure out which relationships are outbound from any label incident to
      // this node.
      const rels = tree.getRels().filter(rel => rel.isOutboundFrom(label));

      return rels
        .map(rel => {
          const targetLabels = _.uniq(
            _.flatten(rel.links.map(l => l.to))
          ).sort();

          if (targetLabels.length > 1) {
            console.warn(
              `RelID ${
                rel.id
              } for label ${label} has > 1 target type (${targetLabels}); skipping`
            );
            return null;
          }

          const tag = relationDirective(rel.getRelationshipType(), 'OUT');
          const targetType = neo4jTypes.label2GraphQLType(targetLabels[0]);

          return `   ${rel
            .getGraphQLTypeName()
            .toLowerCase()}: [${targetType}] ${tag}\n`;
        })
        .filter(x => x); // Remove nulls
    })
  );
};

const mapInboundRels = (tree, node) => {
  const labels = node.getLabels();

  return _.flatten(
    labels.map(label => {
      // Extra criteria: only treat rels this way that are not also outbound from this label.
      // This prevents us from treating reflexive relationships (User)-[:FRIENDS]->(User) twice.
      // Such a relationship is considered outbound, **not** inbound (even though it's both)
      const rels = tree
        .getRels()
        .filter(rel => rel.isInboundTo(label) && !rel.isOutboundFrom(label));

      return rels
        .map(rel => {
          const originLabels = _.uniq(
            _.flatten(rel.links.map(l => l.from))
          ).sort();

          if (originLabels.length > 1) {
            console.warn(
              `RelID ${
                rel.id
              } for label ${label} has > 1 origin type (${originLabels}); skipipng`
            );
            return null;
          }

          const tag = relationDirective(rel.getRelationshipType(), 'IN');
          const originType = neo4jTypes.label2GraphQLType(originLabels[0]);
          return `   ${originType.toLowerCase()}s: [${originType}] ${tag}\n`;
        })
        .filter(x => x);
    })
  );
};

const mapNode = (tree, node) => {
  if (!node instanceof schema.Neo4jNode) {
    throw new Error('Mapped node must be instanceof Neo4jNode');
  }

  const propNames = node.getPropertyNames();
  const graphqlTypeName = node.getGraphQLTypeName();

  const typeDeclaration = `type ${graphqlTypeName} {\n`;

  const propertyDeclarations = propNames.map(
    propName => `   ${propName}: ${node.getProperty(propName).graphQLType}\n`
  );

  const relDeclarations = mapOutboundRels(tree, node).concat(
    mapInboundRels(tree, node)
  );

  return (
    typeDeclaration +
    propertyDeclarations.join('') +
    relDeclarations.join('') +
    '}\n'
  );
};

const mapRel = (tree, rel) => {
  if (!rel instanceof schema.Neo4jRelationship) {
    throw new Error('Mapped relationship must be instanceof Neo4jRelationship');
  }

  return '';
};

const mapQuery = tree => {
  const decl = 'type Query {\n';

  //   Not really needed.
  //   const queries = tree.getNodes().map(node => {
  //     const typeName = node.getGraphQLTypeName();
  //     return `   All${typeName}s: [${typeName}]\n`;
  //   });

  const queries = [];

  // return decl + queries.join('') + '}\n';
  return '';
};

const generateResolvers = tree => {
  const Query = {};

  // Not really needed
  // tree.getNodes().forEach(node => {
  //     const typeName = node.getGraphQLTypeName();
  //     const resolverName = `All${typeName}s`;

  //     Query[resolverName] = (object, params, ctx, resolveInfo) =>
  //         neo4jgraphql(object, params, ctx, resolveInfo, true);
  // });

  // return { Query };
  return {};
};

/**
 * Maps a Neo4jSchemaTree -> GraphQL Typedef Declaration
 * @param {Neo4jSchemaTree} tree
 * @returns {Object} containing typeDefs and resolvers
 */
const map = tree => {
  const nodeTypes = tree.getNodes().map(node => mapNode(tree, node));
  const relTypes = tree.getRels().map(rel => mapRel(tree, rel));
  const query = mapQuery(tree);

  const typeDefs = nodeTypes.concat(relTypes).join('\n') + '\n\n' + query;

  return {
    typeDefs,
    resolvers: generateResolvers(tree)
  };
};

export default map;
