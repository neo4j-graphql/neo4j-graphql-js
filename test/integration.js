import test from 'ava';

import { ApolloClient } from 'apollo-client';
import { HttpLink } from 'apollo-link-http';
import { InMemoryCache } from 'apollo-cache-inmemory';

import gql from 'graphql-tag';
import fetch from 'node-fetch';

let client;

test.before( () => {
  client = new ApolloClient({
    link: new HttpLink({uri: "http://localhost:3000/graphql", fetch: fetch}),
    cache: new InMemoryCache(),
  });
});

test('hello world', t=> {
  t.plan(1);
  t.is("true", "true");
});

test('basic GraphQL query', async t=>{

  t.plan(1);

  let expected = {
    data: {
      Movie: [
        {
          title: "River Runs Through It, A",
          __typename: "Movie"
        }
      ]
    }
  };

  await client.query({
    query: gql`{
        Movie(title: "River Runs Through It, A") {
            title
        }
    }`
  })
    .then(data => {

      t.deepEqual(data.data, expected.data);
    })
    .catch(error => {
      t.fail(error);
    })

});

test('GraphQL query with @cypher directive', async t=> {
  t.plan(1);

  let expected = {
    "data": {
      "Movie": [
        {
          "__typename": "Movie",
          "title": "River Runs Through It, A",
          "actors": [
            {
              "__typename": "Actor",
              "name": " Tom Skerritt"
            },
            {
              "__typename": "Actor",
              "name": " Brad Pitt"
            },
            {
              "__typename": "Actor",
              "name": " Brenda Blethyn"
            },
            {
              "__typename": "Actor",
              "name": "Craig Sheffer"
            }
          ],
          "similar": [
            {
              "__typename": "Movie",
              "title": "Dracula Untold"
            },
            {
              "__typename": "Movie",
              "title": "Captive, The"
            },
            {
              "__typename": "Movie",
              "title": "Helter Skelter"
            }
          ]
        }
      ]
    }
  };


  await client.query({
    query: gql`{
        Movie(title: "River Runs Through It, A") {
            title
            actors {
                name
            }
            similar(first: 3) {
                title
            }
        }
    }`
  })
  .then(data => {
    t.deepEqual(data.data, expected.data);
  })
  .catch(error => {
    t.fail(error);
  })

});

test('basic mutation test', async t=> {
  t.plan(1);

  let expected = {
    "data": {
      "createMovie": {
        "title": "Black Panther",
        "year": 2018,
        "actors": []
      }
    }
  };

  await client.query({
    query: gql`mutation addMovie {
        createMovie(id: "1825683", title:"Black Panther", year: 2018, plot:"T'Challa, the King of Wakanda, rises to the throne in the isolated, technologically advanced African nation, but his claim is challenged by a vengeful outsider who was a childhood victim of T'Challa's father's mistake.", poster: "https://ia.media-imdb.com/images/M/MV5BMTg1MTY2MjYzNV5BMl5BanBnXkFtZTgwMTc4NTMwNDI@._V1_UX182_CR0,0,182,268_AL_.jpg", imdbRating: 7.8) {
            title
            year
            actors {
                name
            }
        }
    }`
  })
  .then(data => {
    t.deepEqual(data.data, expected.data);
  })
  .catch(error => {
    t.fail(error);
  })

});