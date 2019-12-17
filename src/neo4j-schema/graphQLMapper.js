import schema from './entities';
import neo4jTypes from './types';
import _ from 'lodash';
import Debug from 'debug';

const debug = Debug('neo4j-graphql-js');

const relationDirective = (relType, direction) =>
  `@relation(name: "${relType}", direction: "${direction}")`;

const mapOutboundRels = (tree, node, config) => {
  const labels = node.getLabels();

  // Figure out which relationships are outbound from any label incident to
  // this node.
  const rels = tree.getRels().filter(rel => rel.isOutboundFrom(labels));

  return rels
    .map(rel => {
      const targetLabels = _.uniq(_.flatten(rel.links.map(l => l.to)).sort());

      if (targetLabels.length > 1) {
        // This situation isn't handled yet, and arises when you have a setup like this:
        // (:Customer)-[:BUYS]->(:Product)
        // (:Customer)-[:BUYS]->(:Service)
        // In this case, without type unions the destination type for :BUYS is ambiguous.
        console.warn(
          `RelID ${rel.id} for label set ${labels} has > 1 target type (${targetLabels}); skipping`
        );
        return null;
      }

      const tag = relationDirective(rel.getRelationshipType(), 'OUT');
      const targetType = neo4jTypes.label2GraphQLType(targetLabels[0]);

      const propName = rel.getGraphQLTypeName().toLowerCase();
      const propNavigateToNode = `   ${propName}: [${targetType}] ${tag}\n`;

      // If a relationship has props, we should always generate a type and field for
      // it to provide access to those props.  If it doesn't have props, then only
      // generate if user has told us to with the config.  Finally -- only univalents
      // are supported ATM.
      const shouldIncludeRelLink =
        rel.isUnivalent() &&
        (rel.hasProperties() || config.alwaysIncludeRelationships);
      const propNavigateToRel = `   ${rel.getRelationshipType()}_rel: [${rel.getGraphQLTypeName()}]\n`;

      return (
        propNavigateToNode + (shouldIncludeRelLink ? propNavigateToRel : '')
      );
    })
    .filter(x => x); // Remove nulls
};

const mapInboundRels = (tree, node, config) => {
  const labels = node.getLabels();

  // Extra criteria: only treat rels this way that are not also outbound from this label.
  // This prevents us from treating reflexive relationships (User)-[:FRIENDS]->(User) twice.
  // Such a relationship is considered outbound, **not** inbound (even though it's both)
  const rels = tree
    .getRels()
    .filter(rel => rel.isInboundTo(labels) && !rel.isOutboundFrom(labels));

  // In this scenario:
  // (:Product)<-[:ORDERED]-(:Customer)
  // (:Product)<-[:LOOKED_AT]-(:Customer)
  // We have *2 inbound rels* with the *same origin type* (Customer).
  // We therefore can't make both types:
  // customers: [Customer] @rel(...)
  const namingConflictsExist =
    _.uniq(rels.map(rel => rel.getFromLabels().join('_'))).length < rels.length;

  return rels
    .map(rel => {
      const originLabels = rel.getFromLabels();

      if (originLabels.length > 1) {
        console.warn(
          `RelID ${rel.id} for label set ${labels} has > 1 origin type (${originLabels}); skipping`
        );
        return null;
      }

      const tag = relationDirective(rel.getRelationshipType(), 'IN');

      const lc = s => s.toLowerCase();
      const plural = s => `${s}s`;

      // Suppose it's (:Product)<-[:ORDERED]-(:Customer).  If there's a naming
      // conflict to be avoided we'll call the rel customers_ORDERED.
      // If no conflict, it's just 'customers'.
      const originType = neo4jTypes.label2GraphQLType(originLabels[0]);

      const propName = namingConflictsExist
        ? lc(plural(originType)) + '_' + lc(rel.getGraphQLTypeName())
        : lc(plural(originType));

      return `   ${propName}: [${originType}] ${tag}\n`;
    })
    .filter(x => x);
};

const mapNode = (tree, node, config) => {
  if (!node instanceof schema.Neo4jNode) {
    throw new Error('Mapped node must be instanceof Neo4jNode');
  }

  const propNames = node.getPropertyNames();
  const graphqlTypeName = node.getGraphQLTypeName();

  const typeDeclaration = `type ${graphqlTypeName} {\n`;

  if (propNames.length === 0) {
    throw new Error(
      'GraphQL types must have properties!  The neo4j node ' +
        node.id +
        ' lacks any properties in the database, meaning it cannot be mapped ' +
        'to a GraphQL type. Please ensure all of your nodes have at least 1 property'
    );
  }

  // Normally schema augmentation does this for the user automatically, but we do it
  // again here for another reason: GraphQL types must have properties, so if in the
  // schema we end up with a node label that has no normal properties, by adding this
  // one, we can still generate a type for an otherwise "empty" node label.
  const idProp = `   _id: Long!\n`;

  const propertyDeclarations = propNames.map(
    propName => `   ${propName}: ${node.getProperty(propName).graphQLType}\n`
  );

  const relDeclarations = mapOutboundRels(tree, node, config).concat(
    mapInboundRels(tree, node, config)
  );

  return (
    typeDeclaration +
    [idProp].concat(propertyDeclarations).join('') +
    relDeclarations.join('') +
    '}\n'
  );
};

const mapRel = (tree, rel, config) => {
  if (!rel instanceof schema.Neo4jRelationship) {
    throw new Error('Mapped relationship must be instanceof Neo4jRelationship');
  }

  // Our target is to generate something of this sort:
  // https://grandstack.io/docs/neo4j-graphql-js.html#relationships-with-properties
  // type Rated @relation(name: "RATED") {
  //   from: User
  //   to: Movie
  //   rating: Float
  //   timestamp: Int
  // }
  //
  // The trouble with this formulation is that Neo4j rels don't have to connect
  // only one from -> to.  This is what the 'links' structure is for in the
  // schema tree.  Such a relationship is univalent and easy, but we have to
  // name types differently if we end up in the case where a rel can connect
  // many different types of node labels.
  const mapUnivalentRel = rel => {
    const propNames = rel.getPropertyNames();
    const graphqlTypeName = rel.getGraphQLTypeName();
    const typeDeclaration = `type ${graphqlTypeName} @relation(name: "${rel.getRelationshipType()}") {\n`;

    // It's univalent so this assumption holds:
    const fromNodeLabels = rel.links[0].from;
    const toNodeLabels = rel.links[0].to;
    const fromNode = tree.getNodeByLabels(fromNodeLabels);
    const toNode = tree.getNodeByLabels(toNodeLabels);

    if (!fromNode) {
      throw new Error(
        'No node found in schema tree for univalent rel ' +
          rel.id +
          ' given from labels ' +
          JSON.stringify(rel.links[0])
      );
    } else if (!toNode) {
      throw new Error(
        'No node found in schema tree for univalent rel ' +
          rel.id +
          ' given to labels ' +
          JSON.stringify(rel.links[0])
      );
    }

    // Relationships must be connected, so from/to is always !mandatory.
    const fromDecl = `  from: ${fromNode.getGraphQLTypeName()}!\n`;
    const toDecl = `  to: ${toNode.getGraphQLTypeName()}!\n`;

    const propertyDeclarations = propNames.map(
      propName => `  ${propName}: ${rel.getProperty(propName).graphQLType}\n`
    );

    return (
      typeDeclaration +
      fromDecl +
      toDecl +
      propertyDeclarations.join('') +
      '}\n'
    );
  };

  if (rel.isUnivalent()) {
    if (!rel.hasProperties() && !config.alwaysIncludeRelationships) {
      const rt = rel.getRelationshipType();
      debug(
        '%s',
        `Relationship :${rt} has no properties and does not need to be generated`
      );
      return '';
    }

    return mapUnivalentRel(rel);
  }

  console.warn(
    'Relationship',
    rel,
    'is not univalent and is not yet supported'
  );
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
const map = (tree, config = {}) => {
  const nodeTypes = tree.getNodes().map(node => mapNode(tree, node, config));
  const relTypes = tree.getRels().map(rel => mapRel(tree, rel, config));
  const query = mapQuery(tree);

  const typeDefs = nodeTypes.concat(relTypes).join('\n') + '\n\n' + query;

  return {
    typeDefs,
    resolvers: generateResolvers(tree)
  };
};

export default map;
