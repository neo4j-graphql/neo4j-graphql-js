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

  addProperty(name, details) {
    this.properties[name] = details;
    return this;
  }
}

class Neo4jNode extends Neo4jSchemaEntity {
  constructor(id) {
    super(id, 'node', {});
  }
}

class Neo4jRelationship extends Neo4jSchemaEntity {
  constructor(id) {
    super(id, 'relationship', {});
  }

  isInboundTo(label) {
    return this.links.filter(link => link.to.indexOf(label) > -1).length > -1;
  }

  isOutboundFrom(label) {
    return this.links.filter(link => link.from.indexOf(label) > -1).length > -1;
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
