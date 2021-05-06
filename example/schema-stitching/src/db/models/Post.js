module.exports = {
  id: {
    type: 'uuid',
    primary: true
  },
  title: {
    type: 'string',
    required: true
  },
  text: 'string',
  wrote: {
    type: 'relationship',
    target: 'Person',
    relationship: 'WROTE',
    direction: 'in'
  }
};
