import neode from '../neode';

export default class Post {
  constructor(data) {
    Object.assign(this, data);
  }

  async save() {
    if (!(this.author && this.author.node))
      throw new Error('author node is missing!');
    const node = await neode.create('Post', this);
    await node.relateTo(this.author.node, 'wrote');
    Object.assign(this, { ...node.properties(), node });
    return this;
  }
}
