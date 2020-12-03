import { createTestClient } from 'apollo-server-testing';
import { ApolloServer, gql } from 'apollo-server';
import Server from './server';
import actualContext from './context';
import neode from './db/neode';
import Person from './db/entities/Person';

let query;
let mutate;
let reqMock;
const context = () => actualContext({ req: reqMock });
const alice = new Person({
  name: 'Alice',
  email: 'alice@example.org',
  password: '1234'
});
const bob = new Person({
  name: 'Bob',
  email: 'bob@example.org',
  password: '4321'
});

const cleanDatabase = async () => {
  const { driver } = context();
  await driver
    .session()
    .writeTransaction(txc => txc.run('MATCH(n) DETACH DELETE n;'));
};

beforeEach(async () => {
  reqMock = { headers: {} };
  await cleanDatabase();
  const server = await Server(ApolloServer, { context });
  const testClient = createTestClient(server);
  ({ query, mutate } = testClient);
});

afterAll(async () => {
  await cleanDatabase();
  const { driver } = context();
  driver.close();
  neode.driver.close();
});

describe('Query', () => {
  describe('Person', () => {
    const PERSON = gql`
      {
        Person(orderBy: name_asc) {
          id
          name
        }
      }
    `;
    beforeEach(async () => {
      await Promise.all([alice.save(), bob.save()]);
    });

    it('returns array of type `Person`', async () => {
      await expect(query({ query: PERSON })).resolves.toMatchObject({
        errors: undefined,
        data: {
          Person: [
            { id: expect.any(String), name: 'Alice' },
            { id: expect.any(String), name: 'Bob' }
          ]
        }
      });
    });
  });
});

describe('Mutation', () => {
  describe('login', () => {
    const LOGIN = gql`
      mutation($email: String!, $password: String!) {
        login(email: $email, password: $password)
      }
    `;

    beforeEach(async () => {
      await alice.save();
    });

    it('checks correct username/password combination', async () => {
      const variables = { email: 'alice@example.org', password: 'wrong' };
      await expect(
        mutate({ mutation: LOGIN, variables })
      ).resolves.toMatchObject({
        errors: [
          expect.objectContaining({
            message: 'Wrong email/password combination!',
            extensions: { code: 'UNAUTHENTICATED' }
          })
        ],
        data: {
          login: null
        }
      });
    });

    it('responds with JWT', async () => {
      const variables = { email: 'alice@example.org', password: '1234' };
      await expect(
        mutate({ mutation: LOGIN, variables })
      ).resolves.toMatchObject({
        errors: undefined,
        data: {
          login: expect.any(String)
        }
      });
    });
  });

  describe('signup', () => {
    const SIGNUP = gql`
      mutation($name: String!, $email: String!, $password: String!) {
        signup(name: $name, email: $email, password: $password)
      }
    `;

    it('validates unique email address', async () => {
      await alice.save();
      const variables = {
        name: 'Alice',
        email: 'alice@example.org',
        password: '1234'
      };
      await expect(
        mutate({ mutation: SIGNUP, variables })
      ).resolves.toMatchObject({
        errors: [
          expect.objectContaining({
            message: 'email address not unique',
            extensions: { code: 'BAD_USER_INPUT' }
          })
        ],
        data: {
          signup: null
        }
      });
    });

    it('responds with JWT', async () => {
      const variables = {
        name: 'Alice',
        email: 'alice@example.org',
        password: '1234'
      };
      await expect(
        mutate({ mutation: SIGNUP, variables })
      ).resolves.toMatchObject({
        errors: undefined,
        data: {
          signup: expect.any(String)
        }
      });
    });

    it('creates new user in the database', async () => {
      const variables = {
        name: 'Alice',
        email: 'alice@example.org',
        password: '1234'
      };
      await expect(Person.all()).resolves.toEqual([]);
      await mutate({ mutation: SIGNUP, variables });
      await expect(Person.all()).resolves.toEqual([
        expect.objectContaining({ name: 'Alice' })
      ]);
    });
  });

  describe('writePost', () => {
    const WRITE_POST = gql`
      mutation($title: String!, $text: String) {
        writePost(title: $title, text: $text) {
          title
          text
          author {
            name
          }
        }
      }
    `;
    const variables = {
      title: 'GraphQL schema stitching',
      text: 'It is really versatile'
    };

    beforeEach(() => alice.save());

    it('throws Forbidden error when unauthenticated', async () => {
      await expect(
        mutate({ mutation: WRITE_POST, variables })
      ).resolves.toMatchObject({
        errors: [
          expect.objectContaining({
            message: 'You must be authenticated to write a post!',
            extensions: { code: 'FORBIDDEN' }
          })
        ],
        data: {
          writePost: null
        }
      });
    });

    it('assigns `currentUser` as author of the post', async () => {
      const { jwtSign } = context();
      const aliceJwt = jwtSign({ person: { id: alice.id } });
      reqMock = { headers: { authorization: `Bearer ${aliceJwt}` } };
      await expect(
        mutate({ mutation: WRITE_POST, variables })
      ).resolves.toMatchObject({
        errors: undefined,
        data: {
          writePost: {
            title: 'GraphQL schema stitching',
            text: 'It is really versatile',
            author: { name: 'Alice' }
          }
        }
      });
    });
  });
});

describe('Type', () => {
  describe('Person', () => {
    describe('email', () => {
      const PERSON = gql`
        {
          Person(orderBy: name_asc) {
            name
            email
          }
        }
      `;

      it('throws Forbidden error except for currentUser object', async () => {
        const { jwtSign } = context();
        await Promise.all([alice.save(), bob.save()]);
        const aliceJwt = jwtSign({ person: { id: alice.id } });
        reqMock = { headers: { authorization: `Bearer ${aliceJwt}` } };
        await expect(query({ query: PERSON })).resolves.toMatchObject({
          errors: [
            expect.objectContaining({
              message: 'E-Mail addresses are private',
              extensions: { code: 'FORBIDDEN' }
            })
          ],
          data: {
            Person: [
              { name: 'Alice', email: 'alice@example.org' },
              { name: 'Bob', email: null }
            ]
          }
        });
      });
    });
  });
});
