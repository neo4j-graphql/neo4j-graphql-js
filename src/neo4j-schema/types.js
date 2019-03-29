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

export default {
  chooseGraphQLType
};
