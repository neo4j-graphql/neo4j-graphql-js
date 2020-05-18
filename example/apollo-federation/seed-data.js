export const seedData = {
  data: {
    Review: [
      {
        id: '1',
        body: 'Love it!',
        product: {
          upc: '1',
          name: 'Table',
          price: 899,
          weight: 100,
          inStock: true,
          metrics: [
            {
              id: '100',
              metric: 1,
              data: 2
            }
          ],
          objectCompoundKey: {
            id: '100',
            metric: 1,
            data: 2
          },
          listCompoundKey: [
            {
              id: '100',
              metric: 1,
              data: 2
            }
          ]
        },
        authorID: '1',
        author: {
          id: '1',
          name: 'Ada Lovelace',
          username: '@ada',
          numberOfReviews: 2
        }
      },
      {
        id: '2',
        body: 'Too expensive.',
        product: {
          upc: '2',
          name: 'Couch',
          price: 1299,
          weight: 1000,
          inStock: false,
          metrics: [],
          objectCompoundKey: null,
          listCompoundKey: []
        },
        authorID: '1',
        author: {
          id: '1',
          name: 'Ada Lovelace',
          username: '@ada',
          numberOfReviews: 2
        }
      },
      {
        id: '3',
        body: 'Could be better.',
        product: {
          upc: '3',
          name: 'Chair',
          price: 54,
          weight: 50,
          inStock: true,
          metrics: [],
          objectCompoundKey: null,
          listCompoundKey: []
        },
        authorID: '2',
        author: {
          id: '2',
          name: 'Alan Turing',
          username: '@complete',
          numberOfReviews: 2
        }
      },
      {
        id: '4',
        body: 'Prefer something else.',
        product: {
          upc: '1',
          name: 'Table',
          price: 899,
          weight: 100,
          inStock: true,
          metrics: [
            {
              id: '100',
              metric: 1,
              data: 2
            }
          ],
          objectCompoundKey: {
            id: '100',
            metric: 1,
            data: 2
          },
          listCompoundKey: [
            {
              id: '100',
              metric: 1,
              data: 2
            }
          ]
        },
        authorID: '2',
        author: {
          id: '2',
          name: 'Alan Turing',
          username: '@complete',
          numberOfReviews: 2
        }
      }
    ]
  }
};
