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
    return Object.keys(this.properties).sort();
  }

  hasProperties() {
    return this.getPropertyNames().length > 0;
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

  /**
   * A univalent relationship is one that connects exactly one type of node label to exactly one type of
   * other node label.  Imagine you have (:Customer)-[:BUYS]->(:Product).  In this case, BUYS is univalent
   * because it always connects from:Customer to:Product.
   *
   * If you had a graph which was (:Customer)-[:BUYS]->(:Product), (:Company)-[:BUYS]->(:Product) then
   * the BUYS relationship would be multivalent because it connects [Customer, Company] -> [Product].
   *
   * Important note, since nodes can have multiple labels, you could end up in a situation where
   * (:A:B)-[:WHATEVER]->(:C:D).  This is still univalent, because WHATEVER always connects things which
   * are all of :A:B to those that are all of :C:D.   If you had this situation:
   * (:A:B)-[:WHATEVER]->(:C:D) and then (:A)-[:WHATEVER]->(:C) this is not univalent.
   */
  isUnivalent() {
    return (
      this.links && this.links.length === 1
      // Length of links[0].from and to doesn't matter, as label combinations may be in use.
    );
  }

  isInboundTo(label) {
    const comparisonSet = this._setify(label);

    const linksToThisLabel = this.links.filter(link => {
      const hereToSet = new Set(link.to);
      const intersection = this._setIntersection(comparisonSet, hereToSet);
      return intersection.size === comparisonSet.size;
    });
    return linksToThisLabel.length > 0;
  }

  _setify(thing) {
    return new Set(_.isArray(thing) ? thing : [thing]);
  }

  _setIntersection(a, b) {
    return new Set([...a].filter(x => b.has(x)));
  }

  /**
   * Returns true if the relationship is outbound from a label or set of labels.
   * @param {*} label a single label or array of labels.
   */
  isOutboundFrom(label) {
    const comparisonSet = this._setify(label);

    const linksFromThisLabelSet = this.links.filter(link => {
      const hereFromSet = new Set(link.from);
      const intersection = this._setIntersection(comparisonSet, hereFromSet);
      return intersection.size === comparisonSet.size;
    });
    return linksFromThisLabelSet.length > 0;
  }

  getToLabels() {
    return _.uniq(_.flatten(this.links.map(l => l.to))).sort();
  }

  getFromLabels() {
    return _.uniq(_.flatten(this.links.map(l => l.from))).sort();
  }
}

export default {
  Neo4jSchemaEntity,
  Neo4jNode,
  Neo4jRelationship
};
