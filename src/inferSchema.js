import _ from 'lodash';

/**
 * Choose a single property type given an array of possible values.  In the simplest
 * and usual case, a property only has one possible type, and so it will get assigned
 * that.  But we have to handle situations where a property can be a long or an int,
 * depending on value, etc.
 * @param {Object} property a property object from OKAPI schema information
 * @returns String a single type name.
 */
const chooseGraphQLType = property => {
  const options = property.propertyTypes;
  const mandatoryModifier = property.mandatory ? '!' : '';

  if (!options || options.length === 0) {
    return 'String' + mandatoryModifier;
  }
  if (options.length === 1) {
    return options[0] + mandatoryModifier;
  }

  const has = t => options.indexOf(t) !== -1;

  return (
    options
      .filter(a => a)
      .reduce((a, b) => {
        // Comparator function: always pick the broader of the two types.
        if (!a || !b) {
          return a || b;
        }
        if (a === b) {
          return a;
        }

        const set = [a, b];

        // String's generality dominates everything else.
        if (has(set, 'String')) {
          return 'String';
        }

        // Types form a partial ordering/lattice.  Some combinations are
        // nonsense and aren't specified, for example Long vs. Boolean.
        // In the nonsense cases, you get String at the bottom.
        // Basically, inconsistently typed neo4j properties are a **problem**,
        // and you shouldn't have them.
        if (has(set, 'String')) {
          return 'String';
        }
        // Only a few pairwise combinations make sense...
        if (has(set, 'Long') && has(set, 'Integer')) {
          return 'Long';
        }
        if (has(set, 'Integer') && has(set, 'Float')) {
          return 'Float';
        }

        return 'String';
      }, null) + mandatoryModifier
  );
};

const withSession = (driver, f) => {
  const s = driver.session();

  return f(s).finally(() => s.close());
};

const nodeTypeProperties = session =>
  session
    .run('CALL db.schema.nodeTypeProperties()')
    .then(results => results.records.map(rec => rec.toObject()));

const relTypeProperties = session =>
  session
    .run('CALL db.schema.relTypeProperties()')
    .then(results => results.records.map(rec => rec.toObject()));

// OKAPI formats it as ':`Foo`' and we want 'Foo'
const extractRelationshipType = relTypeName =>
  relTypeName.substring(2, relTypeName.length - 1);

const buildSchemaTree = (nodeTypes, relTypes) => {
  const tree = {
    nodes: {},
    rels: {}
  };

  // Process node types first
  _.uniq(nodeTypes.map(n => n.nodeType)).forEach(nodeType => {
    // A node type is an OKAPI node type label, looks like ":`Event`"
    // Not terribly meaningful, but a grouping ID
    const labelCombos = _.uniq(nodeTypes.filter(i => i.nodeType === nodeType));

    labelCombos.forEach(item => {
      const combo = item.nodeLabels;
      console.log('combo', combo);
      // A label combination is an array of strings ["X", "Y"] which indicates
      // that some nodes ":X:Y" exist in the graph.
      const id = `:${combo.join(':')}`;

      // Pick out only the property data for this label combination.
      nodeTypes
        .filter(i => i.nodeLabels === combo)
        .map(i => _.pick(i, ['propertyName', 'propertyTypes', 'mandatory']))
        .forEach(propDetail => {
          if (!tree.nodes[id]) {
            tree.nodes[id] = {};
          }

          if (_.isNil(propDetail.propertyName)) {
            return;
          }

          propDetail.graphQLType = chooseGraphQLType(propDetail);
          tree.nodes[id][propDetail.propertyName] = propDetail;
        });
    });
  });

  // Rel types
  _.uniq(relTypes.map(r => r.relType)).forEach(relType => {
    const id = extractRelationshipType(relType);

    const props = relTypes
      .filter(r => r.relType === relType)
      .map(r => _.pick(r, ['propertyName', 'propertyTypes', 'mandatory']))
      .forEach(propDetail => {
        if (!tree.rels[id]) {
          tree.rels[id] = {};
        }

        if (_.isNil(propDetail.propertyName)) {
          return;
        }

        propDetail.graphQLType = chooseGraphQLType(propDetail);
        tree.rels[id][propDetail.propertyName] = propDetail;
      });
  });

  // Tree now looks like this:
  // {
  //     nodes: {
  //     ':Foo:Bar': {
  //         prop1: {
  //             propertyTypes: ["String"],
  //             mandatory: true
  //         }
  //     }
  //     }
  // }
  return tree;
};

/**
 * Infer a GraphQL schema by inspecting the contents of a Neo4j instance.
 * @param {} driver
 * @returns a GraphQL schema.
 */
export const inferSchema = driver => {
  return Promise.all([
    withSession(driver, nodeTypeProperties),
    withSession(driver, relTypeProperties)
  ]).then(([nodeTypes, relTypes]) => buildSchemaTree(nodeTypes, relTypes));
};
