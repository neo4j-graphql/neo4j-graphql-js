module.exports = {
  id: {
    type: 'uuid',
    primary: true
  },
  name: {
    type: 'string',
    required: true
  },
  email: {
    type: 'string',
    unique: true,
    required: true
  },
  password: {
    type: 'string',
    strip: true
  },
  hashedPassword: {
    type: 'string',
    required: true
  }
};
