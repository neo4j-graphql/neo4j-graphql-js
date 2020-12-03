import bcrypt from 'bcrypt';
import neode from '../neode';

export default class Person {
  constructor(data) {
    Object.assign(this, data);
  }

  checkPassword(password) {
    return bcrypt.compareSync(password, this.hashedPassword);
  }

  async save() {
    this.hashedPassword = bcrypt.hashSync(this.password, 10);
    const node = await neode.create('Person', this);
    Object.assign(this, { ...node.properties(), node });
    return this;
  }

  static async first(props) {
    const node = await neode.first('Person', props);
    if (!node) return null;
    return new Person({ ...node.properties(), node });
  }

  static currentUser(context) {
    const { person } = context;
    if (!person) return null;
    return Person.first({ id: person.id });
  }

  static async all() {
    const nodes = await neode.all('Person');
    return nodes.map(node => new Person({ ...node.properties(), node }));
  }
}
