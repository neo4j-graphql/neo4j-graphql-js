import _ from 'lodash';
import schema from './entities';
import neo4jTypes from './types';

const extractRelationshipType = relTypeName =>
  relTypeName.substring(2, relTypeName.length - 1);

const withSession = (driver, f) => {
  const s = driver.session();

  return f(s).finally(() => s.close());
};

export default class Neo4jSchemaTree {
  constructor(driver) {
    this.driver = driver;
  }

  toJSON() {
    return {
      nodes: this.nodes,
      rels: this.rels
    };
  }

  initialize() {
    const nodeTypeProperties = session =>
      session
        .run('CALL db.schema.nodeTypeProperties()')
        .then(results => results.records.map(rec => rec.toObject()));

    const relTypeProperties = session =>
      session
        .run('CALL db.schema.relTypeProperties()')
        .then(results => results.records.map(rec => rec.toObject()));

    console.log('Initializing your Neo4j Schema');
    console.log('This may take a few moments depending on the size of your DB');
    return Promise.all([
      withSession(this.driver, nodeTypeProperties),
      withSession(this.driver, relTypeProperties)
    ])
      .then(([nodeTypes, relTypes]) => this._populate(nodeTypes, relTypes))
      .then(() => this._populateRelationshipLinkTypes())
      .then(() => this);
  }

  _populateRelationshipLinkTypes() {
    console.log('Getting from/to relationship metadata');

    const okapiIds = Object.keys(this.rels);

    const promises = okapiIds.map(okapiId => {
      const q = `
                MATCH (n)-[r${okapiId}]->(m)
                WITH n, r, m LIMIT 10
                RETURN distinct(labels(n)) as from, labels(m) as to
            `;

      return withSession(this.driver, s =>
        s.run(q).then(results => results.records.map(r => r.toObject()))
      ).then(rows => {
        this.getRel(okapiId).relType = extractRelationshipType(okapiId);
        this.getRel(okapiId).links = rows;
      });
    });

    return Promise.all(promises).then(() => this);
  }

  getNode(id) {
    return this.nodes[id];
  }
  getNodes() {
    return Object.values(this.nodes);
  }

  getRel(id) {
    return this.rels[id];
  }
  getRels() {
    return Object.values(this.rels);
  }

  _populate(nodeTypes, relTypes) {
    this.nodes = {};
    this.rels = {};

    // Process node types first
    _.uniq(nodeTypes.map(n => n.nodeType)).forEach(nodeType => {
      // A node type is an OKAPI node type label, looks like ":`Event`"
      // Not terribly meaningful, but a grouping ID
      const labelCombos = _.uniq(
        nodeTypes.filter(i => i.nodeType === nodeType)
      );

      labelCombos.forEach(item => {
        const combo = item.nodeLabels;
        // A label combination is an array of strings ["X", "Y"] which indicates
        // that some nodes ":X:Y" exist in the graph.
        const id = combo.join(':');
        const entity = this.nodes[id] || new schema.Neo4jNode(id);
        this.nodes[id] = entity;

        // Pick out only the property data for this label combination.
        nodeTypes
          .filter(i => i.nodeLabels === combo)
          .map(i => _.pick(i, ['propertyName', 'propertyTypes', 'mandatory']))
          .forEach(propDetail => {
            console.log(schema);
            if (_.isNil(propDetail.propertyName)) {
              return;
            }

            propDetail.graphQLType = neo4jTypes.chooseGraphQLType(propDetail);
            entity.addProperty(propDetail.propertyName, propDetail);
          });
      });
    });

    // Rel types
    _.uniq(relTypes.map(r => r.relType)).forEach(relType => {
      const id = relType;
      const entity = this.rels[id] || new schema.Neo4jRelationship(id);
      this.rels[id] = entity;

      relTypes
        .filter(r => r.relType === relType)
        .map(r => _.pick(r, ['propertyName', 'propertyTypes', 'mandatory']))
        .forEach(propDetail => {
          if (_.isNil(propDetail.propertyName)) {
            return;
          }

          propDetail.graphQLType = chooseGraphQLType(propDetail);
          entity.addProperty(propDetail.propertyName, propDetail);
        });
    });
  }
}
