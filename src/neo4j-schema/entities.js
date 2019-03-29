import _ from 'lodash';

/**
 * Base class for a schema entity derived from Neo4j
 */
class Neo4jSchemaEntity {
  constructor(id, type, properties = {}) {
    this.id = id;
    this.type = type;
    this.properties = properties;
  }

  asJSON() {
    return {
      id: this.id,
      type: this.type,
      properties: this.properties
    };
  }

  getGraphQLTypeName() {
    throw new Error('Override me in subclass');
  }

  getPropertyNames() {
    return Object.keys(this.properties);
  }

  getProperty(name) {
    return this.properties[name];
  }

  addProperty(name, details) {
    if (_.isNil(name) || _.isNil(details)) {
      throw new Error('Property must have both name and details');
    }

    _.set(this.properties, name, details);
    return this;
  }
}

class Neo4jNode extends Neo4jSchemaEntity {
  constructor(id) {
    super(id, 'node', {});
  }

  getGraphQLTypeName() {
    // Make sure to guarantee alphabetic consistent ordering.
    const parts = this.getLabels();
    return parts.join('_').replace(/ /g, '_');
  }

  getLabels() {
    return this.id.split(/:/g).sort();
  }
}

class Neo4jRelationship extends Neo4jSchemaEntity {
  constructor(id) {
    super(id, 'relationship', {});
  }

  getRelationshipType() {
    // OKAPI returns okapi IDs as :`TYPENAME`
    return this.id.substring(2, this.id.length - 1);
  }

  getGraphQLTypeName() {
    return this.getRelationshipType().replace(/ /g, '_');
  }

  isInboundTo(label) {
    const linksToThisLabel = this.links.filter(
      link => link.to.indexOf(label) > -1
    );
    return linksToThisLabel.length > 0;
  }

  isOutboundFrom(label) {
    const linksFromThisLabel = this.links.filter(
      link => link.from.indexOf(label) > -1
    );
    return linksFromThisLabel.length > 0;
  }

  getToLabels() {
    return _.uniq(_.flatten(this.links.map(l => l.to)));
  }

  getFromLabels() {
    return _.uniq(_.flatten(this.links.map(l => l.from)));
  }
}

export default {
  Neo4jSchemaEntity,
  Neo4jNode,
  Neo4jRelationship
};
