/**
 * This module serves to fake the minimum of the Neo4j driver API so that tests
 * can impersonate live driver connections.
 *
 * Use "Fake Tables" like this:
 *
 * Driver({
 *    "MATCH (n) RETURN count(n)": [ { n: 100 } ],
 *    /CREATE.*:Foo.*RETURN true/: [ { value: true } ],
 * })
 *
 * This makes a fake driver which responds in those matching conditions, and
 * answers all other queries with []
 */
import sinon from 'sinon';
import _ from 'lodash';

let i = 0;

const record = (data = { value: 1 }) => {
  return {
    get: field => {
      if (field in data) {
        return data[field];
      }
      throw new Error(
        `Missing field in FakeRecord caller expected ${field} in ${JSON.stringify(
          data
        )}`
      );
    },
    has: field => !_.isNil(_.get(data, field)),
    toObject: () => data
  };
};

const results = (results = []) => ({
  records: results.map(record)
});

// Fake table is an object with keys that are either queries or regular expressions
// Values are the results to return when you see those.
const fakeRun = fakeTable => (query, params) => {
  let foundFakes = [];

  Object.keys(fakeTable).forEach(fakePossibility => {
    if (
      query === fakePossibility ||
      query.match(new RegExp(fakePossibility, 'igm'))
    ) {
      foundFakes = fakeTable[fakePossibility];
    }
  });

  return Promise.resolve(results(foundFakes));
};

const Session = fakeTable => {
  return {
    id: Math.random(),
    run: fakeRun(fakeTable),
    close: sinon.fake.returns(true)
  };
};

const Driver = fakeTable => {
  return {
    id: Math.random(),
    session: sinon.fake.returns(Session(fakeTable))
  };
};

export default {
  results,
  record,
  Driver,
  Session
};
