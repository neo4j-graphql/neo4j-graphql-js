import { delegateToSchema } from '@graphql-tools/delegate';
import {
  AuthenticationError,
  UserInputError,
  ForbiddenError
} from 'apollo-server';
import Person from './db/entities/Person';
import Post from './db/entities/Post';

export default ({ subschema }) => ({
  Query: {
    profile: async (_parent, _args, context, info) => {
      const [person] = await delegateToSchema({
        schema: subschema,
        operation: 'query',
        fieldName: 'Person',
        args: {
          id: context.person.id
        },
        context,
        info
      });
      return person;
    }
  },
  Mutation: {
    login: async (_parent, { email, password }, { jwtSign }) => {
      const person = await Person.first({ email });
      if (person && person.checkPassword(password)) {
        return jwtSign({ person: { id: person.id } });
      }
      throw new AuthenticationError('Wrong email/password combination!');
    },
    signup: async (_parent, { name, email, password }, { jwtSign }) => {
      const existingPerson = await Person.first({ email });
      if (existingPerson) throw new UserInputError('email address not unique');
      const person = new Person({ name, email, password });
      await person.save();
      return jwtSign({ person: { id: person.id } });
    },
    writePost: async (_parent, args, context, info) => {
      const currentUser = await Person.currentUser(context);
      if (!currentUser)
        throw new ForbiddenError('You must be authenticated to write a post!');
      const post = new Post({ ...args, author: currentUser });
      await post.save();
      const [resolvedPost] = await delegateToSchema({
        schema: subschema,
        operation: 'query',
        fieldName: 'Post',
        args: { id: post.id },
        context,
        info
      });
      return resolvedPost;
    }
  },
  Person: {
    email: {
      selectionSet: '{ id }',
      resolve: (parent, _args, context) => {
        const { person } = context;
        if (person && person.id === parent.id) return parent.email;
        throw new ForbiddenError('E-Mail addresses are private');
      }
    },
    postCount: {
      selectionSet: '{ posts { id } }',
      resolve: person => person.posts.length
    }
  }
});
