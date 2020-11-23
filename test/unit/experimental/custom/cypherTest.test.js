import test from 'ava';
import {
  cypherTestRunner,
  augmentedSchemaCypherTestRunner
} from '../../../helpers/experimental/custom/customSchemaTest';

const CYPHER_PARAMS = {
  userId: 'user-id'
};

test('Create node mutation with nested @cypher input 2 levels deep (experimental api)', t => {
  const graphQLQuery = `mutation {
    CreateUser(
      data: {
        idField: "a"
        name: "Ada"
        uniqueString: "b"
        birthday: {
          year: 2020
          month: 11
          day: 10
        }
        names: ["A", "B"]
        liked: {
          create: [
            {
              id: "movie-1"
              title: "title-1"
              likedBy: {
                create: [
                  { name: "Alan", uniqueString: "x" }
                  { name: "Ada", uniqueString: "y" }
                ]
              }
            }
            {
              id: "movie-2"
              title: "title-2"
              likedBy: {
                create: [
                  { name: "Alan", uniqueString: "a" }
                  { name: "Ada", uniqueString: "b" }
                ]
              }
            }
          ]
        }
      }
    ) {
      idField
      uniqueString
      liked {
        id
        title
        likedBy {
          name
          uniqueString
        }
      }
    }
  }
  `,
    expectedCypherQuery = `
    CREATE (\`user\`:\`User\` {idField:$data.idField,name:$data.name,names:$data.names,birthday: datetime($data.birthday),uniqueString:$data.uniqueString})
  WITH *
  
CALL {
  WITH *
  UNWIND $data.liked.create AS MovieCreate
  CREATE (user)-[:RATING]->(movie: Movie {   id: MovieCreate.id,   title: MovieCreate.title }) 
WITH MovieCreate AS _MovieCreate,  movie
CALL {
  WITH *
  UNWIND _MovieCreate.likedBy.create AS UserCreate
  CREATE (movie)<-[:RATING]-(user:User {
  name: UserCreate.name,
  uniqueString: UserCreate.uniqueString
})
  RETURN COUNT(*) AS _likedBy_create_
}
  RETURN COUNT(*) AS _liked_create_
}
    RETURN \`user\` { .idField , .uniqueString ,liked: [(\`user\`)-[:\`RATING\`]->(\`user_liked\`:\`Movie\`) | \`user_liked\` { .id , .title ,likedBy: [(\`user_liked\`)<-[:\`RATING\`]-(\`user_liked_likedBy\`:\`User\`) | \`user_liked_likedBy\` { .name , .uniqueString }] }] } AS \`user\`
  `,
    expectedParams = {
      first: -1,
      offset: 0,
      data: {
        idField: 'a',
        name: 'Ada',
        names: ['A', 'B'],
        birthday: {
          year: {
            low: 2020,
            high: 0
          },
          month: {
            low: 11,
            high: 0
          },
          day: {
            low: 10,
            high: 0
          }
        },
        uniqueString: 'b',
        liked: {
          create: [
            {
              id: 'movie-1',
              title: 'title-1',
              likedBy: {
                create: [
                  {
                    name: 'Alan',
                    uniqueString: 'x'
                  },
                  {
                    name: 'Ada',
                    uniqueString: 'y'
                  }
                ]
              }
            },
            {
              id: 'movie-2',
              title: 'title-2',
              likedBy: {
                create: [
                  {
                    name: 'Alan',
                    uniqueString: 'a'
                  },
                  {
                    name: 'Ada',
                    uniqueString: 'b'
                  }
                ]
              }
            }
          ]
        }
      }
    };
  t.plan(4);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, expectedParams),
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('Create node with nested @cypher input 2 levels down through same input type (experimental api)', t => {
  const graphQLQuery = `mutation {
    CreateUser(
      data: {
        idField: "a"
        name: "Ada"
        uniqueString: "b"
        birthday: { year: 2020, month: 11, day: 10 }
        names: ["A", "B"]
        onUserCreate: {
          int: 5
          nested: { createdAt: { datetime: { year: 2020, month: 11, day: 14 } } }
        }
      }
    ) {
      idField
      name
      uniqueString
      birthday {
        formatted
      }
      names
      int
      createdAt {
        formatted
      }
    }
  }
  `,
    expectedCypherQuery = `
    CREATE (\`user\`:\`User\` {idField:$data.idField,name:$data.name,names:$data.names,birthday: datetime($data.birthday),uniqueString:$data.uniqueString})
  WITH *
  
CALL {
  WITH *
  UNWIND $data.onUserCreate.nested.createdAt AS CreatedAt
  SET user.int = $data.onUserCreate.int
SET user.createdAt = datetime(CreatedAt.datetime)
  RETURN COUNT(*) AS _nested_createdAt_
}
    RETURN \`user\` { .idField , .name , .uniqueString ,birthday: { formatted: toString(\`user\`.birthday) }, .names , .int ,createdAt: { formatted: toString(\`user\`.createdAt) }} AS \`user\`
  `,
    expectedParams = {
      first: -1,
      offset: 0,
      data: {
        idField: 'a',
        name: 'Ada',
        names: ['A', 'B'],
        birthday: {
          year: {
            low: 2020,
            high: 0
          },
          month: {
            low: 11,
            high: 0
          },
          day: {
            low: 10,
            high: 0
          }
        },
        uniqueString: 'b',
        onUserCreate: {
          nested: {
            createdAt: {
              datetime: {
                year: {
                  low: 2020,
                  high: 0
                },
                month: {
                  low: 11,
                  high: 0
                },
                day: {
                  low: 14,
                  high: 0
                }
              }
            }
          },
          int: {
            low: 5,
            high: 0
          }
        }
      }
    };
  t.plan(4);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, expectedParams),
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('Merge node with @cypher nested 2 levels deep, skipping 1 non-@mutation input object (experimental api)', t => {
  const graphQLQuery = `mutation {
    MergeUser(
      where: {
        idField: "a"
      }
      data: {
        name: "Ada"
        uniqueString: "b"
        birthday: {
          year: 2020
          month: 11
          day: 10
        }
        names: ["A", "B"]
        liked: {
          merge: [
            {
              where: {
                id: "movie-1"
              }
              data: {
                title: "title-1"
                likedBy: {
                  create: [
                    { name: "Alan", uniqueString: "x" }
                    { name: "Ada", uniqueString: "y" }
                  ]
                }
              }
            }
            {
              where: {
                id: "movie-2"
              }
              data: {
                title: "title-2"
                likedBy: {
                  create: [
                    { name: "Alan", uniqueString: "a" }
                    { name: "Ada", uniqueString: "b" }
                  ]
                }
              }
            }
          ]
        }
      }
    ) {
      idField
      uniqueString
      liked {
        id
        title
        likedBy {
          name
          uniqueString
        }
      }
    }
  }  
  `,
    expectedCypherQuery = `MERGE (\`user\`:\`User\`{idField:$where.idField})
ON CREATE
  SET \`user\` += {name:$data.name,names:$data.names,birthday: datetime($data.birthday),uniqueString:$data.uniqueString}
ON MATCH
  SET \`user\` += {name:$data.name,names:$data.names,birthday: datetime($data.birthday),uniqueString:$data.uniqueString} 
  WITH *
  
CALL {
  WITH *
  UNWIND $data.liked.merge AS MovieMerge
  MERGE (movie: Movie {   id: MovieMerge.where.id }) ON CREATE   SET movie.title = MovieMerge.data.title MERGE (user)-[:RATING]->(movie) 
WITH MovieMerge AS _MovieMerge,  movie
CALL {
  WITH *
  UNWIND _MovieMerge.data.likedBy.create AS UserCreate
  CREATE (movie)<-[:RATING]-(user:User {
  name: UserCreate.name,
  uniqueString: UserCreate.uniqueString
})
  RETURN COUNT(*) AS _likedBy_create_
}
  RETURN COUNT(*) AS _liked_merge_
}RETURN \`user\` { .idField , .uniqueString ,liked: [(\`user\`)-[:\`RATING\`]->(\`user_liked\`:\`Movie\`) | \`user_liked\` { .id , .title ,likedBy: [(\`user_liked\`)<-[:\`RATING\`]-(\`user_liked_likedBy\`:\`User\`) | \`user_liked_likedBy\` { .name , .uniqueString }] }] } AS \`user\``,
    expectedParams = {
      where: {
        idField: 'a'
      },
      data: {
        name: 'Ada',
        names: ['A', 'B'],
        birthday: {
          year: {
            low: 2020,
            high: 0
          },
          month: {
            low: 11,
            high: 0
          },
          day: {
            low: 10,
            high: 0
          }
        },
        uniqueString: 'b',
        liked: {
          merge: [
            {
              where: {
                id: 'movie-1'
              },
              data: {
                title: 'title-1',
                likedBy: {
                  create: [
                    {
                      name: 'Alan',
                      uniqueString: 'x'
                    },
                    {
                      name: 'Ada',
                      uniqueString: 'y'
                    }
                  ]
                }
              }
            },
            {
              where: {
                id: 'movie-2'
              },
              data: {
                title: 'title-2',
                likedBy: {
                  create: [
                    {
                      name: 'Alan',
                      uniqueString: 'a'
                    },
                    {
                      name: 'Ada',
                      uniqueString: 'b'
                    }
                  ]
                }
              }
            }
          ]
        }
      }
    };
  t.plan(4);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, expectedParams),
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('Merge node mutation with complex @cypher nested 2 levels deep, skipping 1 non-@mutation input object (experimental api)', t => {
  const graphQLQuery = `mutation {
    MergeUser(
      where: {
        idField: "a"
      }
      data: {
        name: "Ada"
        uniqueString: "b"
        birthday: {
          year: 2020
          month: 11
          day: 10
        }
        names: ["A", "B"]
        liked: {
          merge: [
            {
              where: {
                id: "movie-1"
              }
              data: {
                title: "title-1"
                likedBy: {
                  merge: [
                    { 
                      where: {
                        idField: "b"
                      }
                      data: {
                        name: "Alan"
                        uniqueString: "x"
                      }
                    }
                    { 
                      where: {
                        idField: "c"
                      }
                      data: {
                        name: "Ada"
                        uniqueString: "y"
                      }
                    }
                  ]
                }
              }
            }
            {
              where: {
                id: "movie-2"
              }
              data: {
                title: "title-2"
                likedBy: {
                  merge: [
                    { 
                      where: {
                        idField: "b"
                      }
                      data: {
                        name: "Alan"
                        uniqueString: "x"
                      }
                    }
                    { 
                      where: {
                        idField: "c"
                      }
                      data: {
                        name: "Ada"
                        uniqueString: "y"
                      }
                    }
                  ]
                }
              }
            }
          ]
        }
      }
    ) {
      idField
      uniqueString
      liked {
        id
        title
        likedBy {
          name
          uniqueString
        }
      }
    }
  }
  `,
    expectedCypherQuery = `MERGE (\`user\`:\`User\`{idField:$where.idField})
ON CREATE
  SET \`user\` += {name:$data.name,names:$data.names,birthday: datetime($data.birthday),uniqueString:$data.uniqueString}
ON MATCH
  SET \`user\` += {name:$data.name,names:$data.names,birthday: datetime($data.birthday),uniqueString:$data.uniqueString} 
  WITH *
  
CALL {
  WITH *
  UNWIND $data.liked.merge AS MovieMerge
  MERGE (movie: Movie {   id: MovieMerge.where.id }) ON CREATE   SET movie.title = MovieMerge.data.title MERGE (user)-[:RATING]->(movie) 
WITH MovieMerge AS _MovieMerge,  movie
CALL {
  WITH *
  UNWIND _MovieMerge.data.likedBy.merge AS UserMerge
  MERGE (user: User {
  idField: UserMerge.where.idField
})
ON CREATE 
  SET user.name = UserMerge.data.name, 
      user.uniqueString = UserMerge.data.uniqueString
MERGE (movie)<-[:RATING]-(user)
  RETURN COUNT(*) AS _likedBy_merge_
}
  RETURN COUNT(*) AS _liked_merge_
}RETURN \`user\` { .idField , .uniqueString ,liked: [(\`user\`)-[:\`RATING\`]->(\`user_liked\`:\`Movie\`) | \`user_liked\` { .id , .title ,likedBy: [(\`user_liked\`)<-[:\`RATING\`]-(\`user_liked_likedBy\`:\`User\`) | \`user_liked_likedBy\` { .name , .uniqueString }] }] } AS \`user\``,
    expectedParams = {
      where: {
        idField: 'a'
      },
      data: {
        name: 'Ada',
        names: ['A', 'B'],
        birthday: {
          year: {
            low: 2020,
            high: 0
          },
          month: {
            low: 11,
            high: 0
          },
          day: {
            low: 10,
            high: 0
          }
        },
        uniqueString: 'b',
        liked: {
          merge: [
            {
              where: {
                id: 'movie-1'
              },
              data: {
                title: 'title-1',
                likedBy: {
                  merge: [
                    {
                      where: {
                        idField: 'b'
                      },
                      data: {
                        name: 'Alan',
                        uniqueString: 'x'
                      }
                    },
                    {
                      where: {
                        idField: 'c'
                      },
                      data: {
                        name: 'Ada',
                        uniqueString: 'y'
                      }
                    }
                  ]
                }
              }
            },
            {
              where: {
                id: 'movie-2'
              },
              data: {
                title: 'title-2',
                likedBy: {
                  merge: [
                    {
                      where: {
                        idField: 'b'
                      },
                      data: {
                        name: 'Alan',
                        uniqueString: 'x'
                      }
                    },
                    {
                      where: {
                        idField: 'c'
                      },
                      data: {
                        name: 'Ada',
                        uniqueString: 'y'
                      }
                    }
                  ]
                }
              }
            }
          ]
        }
      }
    };
  t.plan(4);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, expectedParams),
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('Merge node mutation with @cypher nested 3 levels deep, skipping 2 non-@mutation input objects (experimental api)', t => {
  const graphQLQuery = `mutation {
    CreateUser(
      data: {
        idField: "a"
        name: "Ada"
        uniqueString: "b"
        birthday: { year: 2020, month: 11, day: 10 }
        names: ["A", "B"]
        liked: {
          nestedCreate: [
            {
              customLayer: {
                custom: "custom-1"
                data: {
                  id: "movie-1"
                  title: "title-1"
                  likedBy: {
                    create: [
                      { name: "Alan", uniqueString: "x" }
                      { name: "Ada", uniqueString: "y" }
                    ]
                  }
                }
              }
            }
            {
              customLayer: {
                custom: "custom-2"
                data: {
                  id: "movie-2"
                  title: "title-2"
                  likedBy: {
                    create: [
                      { name: "Alan", uniqueString: "a" }
                      { name: "Ada", uniqueString: "b" }
                    ]
                  }
                }
              }
            }
          ]
        }
      }
    ) {
      idField
      uniqueString
      liked {
        id
        title
        custom
        likedBy {
          name
          uniqueString
        }
      }
    }
  }
  `,
    expectedCypherQuery = `
    CREATE (\`user\`:\`User\` {idField:$data.idField,name:$data.name,names:$data.names,birthday: datetime($data.birthday),uniqueString:$data.uniqueString})
  WITH *
  
CALL {
  WITH *
  UNWIND $data.liked.nestedCreate AS MovieCreate
  CREATE (user)-[:RATING]->(movie: Movie {   id: MovieCreate.customLayer.data.id,   title: MovieCreate.customLayer.data.title,   custom: MovieCreate.customLayer.custom }) 
WITH MovieCreate AS _MovieCreate,  movie
CALL {
  WITH *
  UNWIND _MovieCreate.customLayer.data.likedBy.create AS UserCreate
  CREATE (movie)<-[:RATING]-(user:User {
  name: UserCreate.name,
  uniqueString: UserCreate.uniqueString
})
  RETURN COUNT(*) AS _likedBy_create_
}
  RETURN COUNT(*) AS _liked_nestedCreate_
}
    RETURN \`user\` { .idField , .uniqueString ,liked: [(\`user\`)-[:\`RATING\`]->(\`user_liked\`:\`Movie\`) | \`user_liked\` { .id , .title , .custom ,likedBy: [(\`user_liked\`)<-[:\`RATING\`]-(\`user_liked_likedBy\`:\`User\`) | \`user_liked_likedBy\` { .name , .uniqueString }] }] } AS \`user\`
  `,
    expectedParams = {
      first: -1,
      offset: 0,
      data: {
        idField: 'a',
        name: 'Ada',
        names: ['A', 'B'],
        birthday: {
          year: {
            low: 2020,
            high: 0
          },
          month: {
            low: 11,
            high: 0
          },
          day: {
            low: 10,
            high: 0
          }
        },
        uniqueString: 'b',
        liked: {
          nestedCreate: [
            {
              customLayer: {
                custom: 'custom-1',
                data: {
                  id: 'movie-1',
                  title: 'title-1',
                  likedBy: {
                    create: [
                      {
                        name: 'Alan',
                        uniqueString: 'x'
                      },
                      {
                        name: 'Ada',
                        uniqueString: 'y'
                      }
                    ]
                  }
                }
              }
            },
            {
              customLayer: {
                custom: 'custom-2',
                data: {
                  id: 'movie-2',
                  title: 'title-2',
                  likedBy: {
                    create: [
                      {
                        name: 'Alan',
                        uniqueString: 'a'
                      },
                      {
                        name: 'Ada',
                        uniqueString: 'b'
                      }
                    ]
                  }
                }
              }
            }
          ]
        }
      }
    };
  t.plan(4);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, expectedParams),
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('Delete node mutation with @cypher deleting related node (experimental api)', t => {
  const graphQLQuery = `mutation {
    DeleteUser(
      where: {
        idField: "a",
      }
      liked: {
        delete: {
          id: "movie-1"
        }
      }
    ) {
      idField
    }
  }
  `,
    expectedCypherQuery = `MATCH (\`user\`:\`User\`) WHERE (\`user\`.idField = $where.idField) 

CALL {
  WITH *
  UNWIND $liked.delete AS MovieWhere
  MATCH (user)-[:RATING]->(movie: Movie { id: MovieWhere.id })
DETACH DELETE movie
  RETURN COUNT(*) AS _liked_delete_
}
WITH \`user\` AS \`user_toDelete\`, \`user\` { .idField } AS \`user\`
DETACH DELETE \`user_toDelete\`
RETURN \`user\``,
    expectedParams = {
      where: {
        idField: 'a'
      },
      liked: {
        delete: [
          {
            id: 'movie-1'
          }
        ]
      },
      first: -1,
      offset: 0
    };
  t.plan(4);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, expectedParams),
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('Sequence of custom nested @cypher (experimental api)', t => {
  const graphQLQuery = `mutation {
    MergeUser(
      where: {
        idField: "a"
      }
      data: {
        name: "Ada"
        uniqueString: "b"
        birthday: {
          year: 2020
          month: 11
          day: 10
        }
        names: ["A", "B"]
        liked: {
          merge: [
            {
              where: {
                id: "movie-1"
              }
              data: {
                title: "title-1"
                likedBy: {
                  merge: [
                    { 
                      where: {
                        idField: "b"
                      }
                      data: {
                        name: "Alan"
                        uniqueString: "x"
                      }
                    }
                    { 
                      where: {
                        idField: "c"
                      }
                      data: {
                        name: "Ada"
                        uniqueString: "y"
                      }
                    }
                  ]
                }
              }
            }
            {
              where: {
                id: "movie-2"
              }
              data: {
                title: "title-2"
                likedBy: {
                  merge: [
                    { 
                      where: {
                        idField: "b"
                      }
                      data: {
                        name: "Alan"
                        uniqueString: "x"
                      }
                    }
                    { 
                      where: {
                        idField: "c"
                      }
                      data: {
                        name: "Ada"
                        uniqueString: "y"
                      }
                    }
                  ]
                }
              }
            }
          ]
          create: [
            {
              id: "movie-1"
              title: "title-1"
              likedBy: {
                create: [
                  { name: "Alan", uniqueString: "p" }
                  { name: "Ada", uniqueString: "q" }
                ]
              }
            }
            {
              id: "movie-2"
              title: "title-2"
              likedBy: {
                create: [
                  { name: "Alan", uniqueString: "r" }
                  { name: "Ada", uniqueString: "s" }
                ]
              }
            }
          ]
        }
      }
    ) {
      idField
      uniqueString
      liked {
        id
        title
        likedBy {
          name
          uniqueString
        }
      }
    }
  }
  `,
    expectedCypherQuery = `MERGE (\`user\`:\`User\`{idField:$where.idField})
ON CREATE
  SET \`user\` += {name:$data.name,names:$data.names,birthday: datetime($data.birthday),uniqueString:$data.uniqueString}
ON MATCH
  SET \`user\` += {name:$data.name,names:$data.names,birthday: datetime($data.birthday),uniqueString:$data.uniqueString} 
  WITH *
  
CALL {
  WITH *
  UNWIND $data.liked.create AS MovieCreate
  CREATE (user)-[:RATING]->(movie: Movie {   id: MovieCreate.id,   title: MovieCreate.title }) 
WITH MovieCreate AS _MovieCreate,  movie
CALL {
  WITH *
  UNWIND _MovieCreate.likedBy.create AS UserCreate
  CREATE (movie)<-[:RATING]-(user:User {
  name: UserCreate.name,
  uniqueString: UserCreate.uniqueString
})
  RETURN COUNT(*) AS _likedBy_create_
}
  RETURN COUNT(*) AS _liked_create_
}

CALL {
  WITH *
  UNWIND $data.liked.merge AS MovieMerge
  MERGE (movie: Movie {   id: MovieMerge.where.id }) ON CREATE   SET movie.title = MovieMerge.data.title MERGE (user)-[:RATING]->(movie) 
WITH MovieMerge AS _MovieMerge,  movie
CALL {
  WITH *
  UNWIND _MovieMerge.data.likedBy.merge AS UserMerge
  MERGE (user: User {
  idField: UserMerge.where.idField
})
ON CREATE 
  SET user.name = UserMerge.data.name, 
      user.uniqueString = UserMerge.data.uniqueString
MERGE (movie)<-[:RATING]-(user)
  RETURN COUNT(*) AS _likedBy_merge_
}
  RETURN COUNT(*) AS _liked_merge_
}RETURN \`user\` { .idField , .uniqueString ,liked: [(\`user\`)-[:\`RATING\`]->(\`user_liked\`:\`Movie\`) | \`user_liked\` { .id , .title ,likedBy: [(\`user_liked\`)<-[:\`RATING\`]-(\`user_liked_likedBy\`:\`User\`) | \`user_liked_likedBy\` { .name , .uniqueString }] }] } AS \`user\``,
    expectedParams = {
      where: {
        idField: 'a'
      },
      data: {
        name: 'Ada',
        names: ['A', 'B'],
        birthday: {
          year: {
            low: 2020,
            high: 0
          },
          month: {
            low: 11,
            high: 0
          },
          day: {
            low: 10,
            high: 0
          }
        },
        uniqueString: 'b',
        liked: {
          create: [
            {
              id: 'movie-1',
              title: 'title-1',
              likedBy: {
                create: [
                  {
                    name: 'Alan',
                    uniqueString: 'p'
                  },
                  {
                    name: 'Ada',
                    uniqueString: 'q'
                  }
                ]
              }
            },
            {
              id: 'movie-2',
              title: 'title-2',
              likedBy: {
                create: [
                  {
                    name: 'Alan',
                    uniqueString: 'r'
                  },
                  {
                    name: 'Ada',
                    uniqueString: 's'
                  }
                ]
              }
            }
          ],
          merge: [
            {
              where: {
                id: 'movie-1'
              },
              data: {
                title: 'title-1',
                likedBy: {
                  merge: [
                    {
                      where: {
                        idField: 'b'
                      },
                      data: {
                        name: 'Alan',
                        uniqueString: 'x'
                      }
                    },
                    {
                      where: {
                        idField: 'c'
                      },
                      data: {
                        name: 'Ada',
                        uniqueString: 'y'
                      }
                    }
                  ]
                }
              }
            },
            {
              where: {
                id: 'movie-2'
              },
              data: {
                title: 'title-2',
                likedBy: {
                  merge: [
                    {
                      where: {
                        idField: 'b'
                      },
                      data: {
                        name: 'Alan',
                        uniqueString: 'x'
                      }
                    },
                    {
                      where: {
                        idField: 'c'
                      },
                      data: {
                        name: 'Ada',
                        uniqueString: 'y'
                      }
                    }
                  ]
                }
              }
            }
          ]
        }
      }
    };
  t.plan(4);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, expectedParams),
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('Create node with multiple nested @cypher (experimental api)', t => {
  const graphQLQuery = `mutation {
    CreateUser(
      data: {
        idField: "a"
        name: "Ada"
        uniqueString: "b"
        birthday: { year: 2020, month: 11, day: 10 }
        names: ["A", "B"]
        liked: {
          create: [
            {
              id: "movie-1"
              title: "title-1"
              likedBy: {
                create: [
                  { name: "Alan", uniqueString: "x" }
                  { name: "Ada", uniqueString: "y" }
                ]
              }
            }
            {
              id: "movie-2"
              title: "title-2"
              likedBy: {
                create: [
                  { name: "Alan", uniqueString: "a" }
                  { name: "Ada", uniqueString: "b" }
                ]
              }
            }
          ]
        }
        onUserCreate: {
          createdAt: { datetime: { year: 2020, month: 11, day: 13 } }
        }
      }
    ) {
      idField
      uniqueString
      liked {
        id
        title
        likedBy {
          name
          uniqueString
        }
      }
      createdAt {
        formatted
      }
    }
  }  
  `,
    expectedCypherQuery = `
    CREATE (\`user\`:\`User\` {idField:$data.idField,name:$data.name,names:$data.names,birthday: datetime($data.birthday),uniqueString:$data.uniqueString})
  WITH *
  
CALL {
  WITH *
  UNWIND $data.liked.create AS MovieCreate
  CREATE (user)-[:RATING]->(movie: Movie {   id: MovieCreate.id,   title: MovieCreate.title }) 
WITH MovieCreate AS _MovieCreate,  movie
CALL {
  WITH *
  UNWIND _MovieCreate.likedBy.create AS UserCreate
  CREATE (movie)<-[:RATING]-(user:User {
  name: UserCreate.name,
  uniqueString: UserCreate.uniqueString
})
  RETURN COUNT(*) AS _likedBy_create_
}
  RETURN COUNT(*) AS _liked_create_
}

CALL {
  WITH *
  UNWIND $data.onUserCreate.createdAt AS CreatedAt
  SET user.int = $data.onUserCreate.int
SET user.createdAt = datetime(CreatedAt.datetime)
  RETURN COUNT(*) AS _onUserCreate_createdAt_
}
    RETURN \`user\` { .idField , .uniqueString ,liked: [(\`user\`)-[:\`RATING\`]->(\`user_liked\`:\`Movie\`) | \`user_liked\` { .id , .title ,likedBy: [(\`user_liked\`)<-[:\`RATING\`]-(\`user_liked_likedBy\`:\`User\`) | \`user_liked_likedBy\` { .name , .uniqueString }] }] ,createdAt: { formatted: toString(\`user\`.createdAt) }} AS \`user\`
  `,
    expectedParams = {
      first: -1,
      offset: 0,
      data: {
        idField: 'a',
        name: 'Ada',
        names: ['A', 'B'],
        birthday: {
          year: {
            low: 2020,
            high: 0
          },
          month: {
            low: 11,
            high: 0
          },
          day: {
            low: 10,
            high: 0
          }
        },
        uniqueString: 'b',
        liked: {
          create: [
            {
              id: 'movie-1',
              title: 'title-1',
              likedBy: {
                create: [
                  {
                    name: 'Alan',
                    uniqueString: 'x'
                  },
                  {
                    name: 'Ada',
                    uniqueString: 'y'
                  }
                ]
              }
            },
            {
              id: 'movie-2',
              title: 'title-2',
              likedBy: {
                create: [
                  {
                    name: 'Alan',
                    uniqueString: 'a'
                  },
                  {
                    name: 'Ada',
                    uniqueString: 'b'
                  }
                ]
              }
            }
          ]
        },
        onUserCreate: {
          createdAt: {
            datetime: {
              year: {
                low: 2020,
                high: 0
              },
              month: {
                low: 11,
                high: 0
              },
              day: {
                low: 13,
                high: 0
              }
            }
          }
        }
      }
    };
  t.plan(4);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, expectedParams),
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('Merge node with multiple nested @cypher (experimental api)', t => {
  const graphQLQuery = `mutation {
    MergeUser(
      where: {
        idField: "a"
      }
      data: {
        name: "Ada"
        uniqueString: "b"
        birthday: { year: 2020, month: 11, day: 10 }
        names: ["A", "B"]
        liked: {
          create: [
            {
              id: "movie-1"
              title: "title-1"
              likedBy: {
                create: [
                  { name: "Alan", uniqueString: "x" }
                  { name: "Ada", uniqueString: "y" }
                ]
              }
            }
            {
              id: "movie-2"
              title: "title-2"
              likedBy: {
                create: [
                  { name: "Alan", uniqueString: "a" }
                  { name: "Ada", uniqueString: "b" }
                ]
              }
            }
          ]
        }
        onUserMerge: {
          mergedAt: { datetime: { year: 2020, month: 11, day: 13 } }
        }
      }
    ) {
      idField
      uniqueString
      liked {
        id
        title
        likedBy {
          name
          uniqueString
        }
      }
      createdAt {
        formatted
      }
    }
  }
  `,
    expectedCypherQuery = `MERGE (\`user\`:\`User\`{idField:$where.idField})
ON CREATE
  SET \`user\` += {name:$data.name,names:$data.names,birthday: datetime($data.birthday),uniqueString:$data.uniqueString}
ON MATCH
  SET \`user\` += {name:$data.name,names:$data.names,birthday: datetime($data.birthday),uniqueString:$data.uniqueString} 
  WITH *
  
CALL {
  WITH *
  UNWIND $data.liked.create AS MovieCreate
  CREATE (user)-[:RATING]->(movie: Movie {   id: MovieCreate.id,   title: MovieCreate.title }) 
WITH MovieCreate AS _MovieCreate,  movie
CALL {
  WITH *
  UNWIND _MovieCreate.likedBy.create AS UserCreate
  CREATE (movie)<-[:RATING]-(user:User {
  name: UserCreate.name,
  uniqueString: UserCreate.uniqueString
})
  RETURN COUNT(*) AS _likedBy_create_
}
  RETURN COUNT(*) AS _liked_create_
}

CALL {
  WITH *
  UNWIND $data.onUserMerge.mergedAt AS CreatedAt
  SET user.modifiedAt = datetime(CreatedAt.datetime)
  RETURN COUNT(*) AS _onUserMerge_mergedAt_
}RETURN \`user\` { .idField , .uniqueString ,liked: [(\`user\`)-[:\`RATING\`]->(\`user_liked\`:\`Movie\`) | \`user_liked\` { .id , .title ,likedBy: [(\`user_liked\`)<-[:\`RATING\`]-(\`user_liked_likedBy\`:\`User\`) | \`user_liked_likedBy\` { .name , .uniqueString }] }] ,createdAt: { formatted: toString(\`user\`.createdAt) }} AS \`user\``,
    expectedParams = {
      where: {
        idField: 'a'
      },
      data: {
        name: 'Ada',
        names: ['A', 'B'],
        birthday: {
          year: {
            low: 2020,
            high: 0
          },
          month: {
            low: 11,
            high: 0
          },
          day: {
            low: 10,
            high: 0
          }
        },
        uniqueString: 'b',
        liked: {
          create: [
            {
              id: 'movie-1',
              title: 'title-1',
              likedBy: {
                create: [
                  {
                    name: 'Alan',
                    uniqueString: 'x'
                  },
                  {
                    name: 'Ada',
                    uniqueString: 'y'
                  }
                ]
              }
            },
            {
              id: 'movie-2',
              title: 'title-2',
              likedBy: {
                create: [
                  {
                    name: 'Alan',
                    uniqueString: 'a'
                  },
                  {
                    name: 'Ada',
                    uniqueString: 'b'
                  }
                ]
              }
            }
          ]
        },
        onUserMerge: {
          mergedAt: {
            datetime: {
              year: {
                low: 2020,
                high: 0
              },
              month: {
                low: 11,
                high: 0
              },
              day: {
                low: 13,
                high: 0
              }
            }
          }
        }
      }
    };
  t.plan(4);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, expectedParams),
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('Custom @cypher mutation with multiple nested @cypher (experimental api)', t => {
  const graphQLQuery = `mutation {
    Custom(
      id: "a"
      sideEffects: {
        create: [
          { id: "b", nested: { create: [{ id: "d" }, { id: "e" }] } }
          { id: "c", nested: { create: [{ id: "f" }, { id: "g" }] } }
        ]
      }
      computed: {
        computed: {
          multiply: {
            value: 5
          }
        }
      }
    ) {
      id
      computed
      nested {
        id
        nested {
          id
        }
      }
    }
  }  
  `,
    expectedCypherQuery = `CALL apoc.cypher.doIt("MERGE (custom: Custom {   id: $id }) 
WITH custom

CALL {
  WITH *
  UNWIND $sideEffects.create AS CustomData
  MERGE (subCustom: Custom {   id: CustomData.id }) MERGE (custom)-[:RELATED]->(subCustom) 
WITH CustomData AS _CustomData,  subCustom AS custom
CALL {
  WITH *
  UNWIND _CustomData.nested.create AS CustomData
  MERGE (subCustom: Custom {
  id: CustomData.id
})
MERGE (custom)-[:RELATED]->(subCustom)
WITH subCustom AS custom
  RETURN COUNT(*) AS _nested_create_
}
  RETURN COUNT(*) AS _sideEffects_create_
}

CALL {
  WITH *
  UNWIND $computed.computed.multiply AS CustomComputedInput
  SET custom.computed = CustomComputedInput.value * 10
  RETURN COUNT(*) AS _computed_multiply_
}
RETURN custom", {id:$id, sideEffects:$sideEffects, computed:$computed, first:$first, offset:$offset, cypherParams: $cypherParams}) YIELD value
    WITH apoc.map.values(value, [keys(value)[0]])[0] AS \`custom\`
    RETURN \`custom\` { .id , .computed ,nested: [(\`custom\`)-[:\`RELATED\`]->(\`custom_nested\`:\`Custom\`) | \`custom_nested\` { .id ,nested: [(\`custom_nested\`)-[:\`RELATED\`]->(\`custom_nested_nested\`:\`Custom\`) | \`custom_nested_nested\` { .id }] }] } AS \`custom\``,
    expectedParams = {
      id: 'a',
      sideEffects: {
        create: [
          {
            id: 'b',
            nested: {
              create: [
                {
                  id: 'd'
                },
                {
                  id: 'e'
                }
              ]
            }
          },
          {
            id: 'c',
            nested: {
              create: [
                {
                  id: 'f'
                },
                {
                  id: 'g'
                }
              ]
            }
          }
        ]
      },
      computed: {
        computed: {
          multiply: {
            value: {
              low: 5,
              high: 0
            }
          }
        }
      },
      first: -1,
      offset: 0,
      cypherParams: CYPHER_PARAMS
    };
  t.plan(4);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, expectedParams),
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('Custom batch @cypher mutation using single UNWIND clause on list argument with nested @cypher input (experimental api)', t => {
  const graphQLQuery = `mutation {
    MergeCustoms(
      data: [
        {
          id: "a"
          nested: {
            merge: [
              { id: "b" }
              { id: "c" }
            ]
          }
        }
        {
          id: "d"
          nested: {
            merge: [
              { id: "e" }
              { id: "f" }
            ]
          }
        }
      ]
      sideEffects: {
        create: [
          { id: "g", nested: { create: [{ id: "h" }, { id: "i" }] } }
          { id: "j", nested: { create: [{ id: "k" }, { id: "l" }] } }
        ]
      }
      otherData: {
        merge: [
          {
            id: "x"
          }
        ]
      }
      computed: {
        computed: {
          multiply: {
            value: 5
          }
        }
      }
      nestedBatch: [
        {
          merge: [
            {
              id: "y"
            }
            {
              id: "z"
              nested: {
                merge: [
                  {
                    id: "m"
                  }
                ]
              }
            }
          ]
          update: [
            {
              id: "y"
            }
            {
              id: "z"
            }
          ]
        }
      ]
    ) {
      id
      computed
      nested {
        id
      }
    }
  }`,
    expectedCypherQuery = `CALL apoc.cypher.doIt("UnwiNd   $data aS            CustomData MERGE (custom: Custom {   id: CustomData.id }) 
WITH custom, CustomData AS _CustomData

CALL {
  WITH *
  UNWIND _CustomData.nested.merge AS CustomData
  MERGE (subCustom: Custom {
  id: CustomData.id
})
MERGE (custom)-[:RELATED]->(subCustom)
WITH subCustom AS custom
  RETURN COUNT(*) AS _nested_merge_
}

CALL {
  WITH *
  UNWIND $nestedBatch AS _nestedBatch
  UNWIND _nestedBatch.merge as CustomData
  MERGE (subCustom: Custom {   id: CustomData.id }) MERGE (subCustom)-[:RELATED]->(custom) 
WITH CustomData AS _CustomData,  subCustom AS custom
CALL {
  WITH *
  UNWIND _CustomData.nested.merge AS CustomData
  MERGE (subCustom: Custom {
  id: CustomData.id
})
MERGE (custom)-[:RELATED]->(subCustom)
WITH subCustom AS custom
  RETURN COUNT(*) AS _nested_merge_
}
  RETURN COUNT(*) AS _nestedBatch_merge_
}

CALL {
  WITH *
  UNWIND $nestedBatch AS _nestedBatch
  UNWIND _nestedBatch.update as CustomData
  MATCH (custom)<-[:RELATED]-(subCustom: Custom {
  id: CustomData.id
})
SET subCustom.nestedBatchProperty = TRUE
WITH subCustom AS custom
  RETURN COUNT(*) AS _nestedBatch_update_
}

CALL {
  WITH *
  UNWIND $sideEffects.create AS CustomData
  MERGE (subCustom: Custom {   id: CustomData.id }) MERGE (custom)-[:RELATED]->(subCustom) 
WITH CustomData AS _CustomData,  subCustom AS custom
CALL {
  WITH *
  UNWIND _CustomData.nested.create AS CustomData
  MERGE (subCustom: Custom {
  id: CustomData.id
})
MERGE (custom)-[:RELATED]->(subCustom)
WITH subCustom AS custom
  RETURN COUNT(*) AS _nested_create_
}
  RETURN COUNT(*) AS _sideEffects_create_
}

CALL {
  WITH *
  UNWIND $otherData.merge AS CustomData
  MERGE (subCustom: Custom {
  id: CustomData.id
})
MERGE (custom)-[:RELATED]->(subCustom)
WITH subCustom AS custom
  RETURN COUNT(*) AS _otherData_merge_
}

CALL {
  WITH *
  UNWIND $computed.computed.multiply AS CustomComputedInput
  SET custom.computed = CustomComputedInput.value * 10
  RETURN COUNT(*) AS _computed_multiply_
}
RETURN custom", {data:$data, nestedBatch:$nestedBatch, sideEffects:$sideEffects, otherData:$otherData, computed:$computed, first:$first, offset:$offset, cypherParams: $cypherParams}) YIELD value
    WITH apoc.map.values(value, [keys(value)[0]])[0] AS \`custom\`
    RETURN \`custom\` { .id , .computed ,nested: [(\`custom\`)-[:\`RELATED\`]->(\`custom_nested\`:\`Custom\`) | \`custom_nested\` { .id }] } AS \`custom\``,
    expectedParams = {
      data: [
        {
          id: 'a',
          nested: {
            merge: [
              {
                id: 'b'
              },
              {
                id: 'c'
              }
            ]
          }
        },
        {
          id: 'd',
          nested: {
            merge: [
              {
                id: 'e'
              },
              {
                id: 'f'
              }
            ]
          }
        }
      ],
      nestedBatch: [
        {
          merge: [
            {
              id: 'y'
            },
            {
              id: 'z',
              nested: {
                merge: [
                  {
                    id: 'm'
                  }
                ]
              }
            }
          ],
          update: [
            {
              id: 'y'
            },
            {
              id: 'z'
            }
          ]
        }
      ],
      sideEffects: {
        create: [
          {
            id: 'g',
            nested: {
              create: [
                {
                  id: 'h'
                },
                {
                  id: 'i'
                }
              ]
            }
          },
          {
            id: 'j',
            nested: {
              create: [
                {
                  id: 'k'
                },
                {
                  id: 'l'
                }
              ]
            }
          }
        ]
      },
      otherData: {
        merge: [
          {
            id: 'x'
          }
        ]
      },
      computed: {
        computed: {
          multiply: {
            value: {
              low: 5,
              high: 0
            }
          }
        }
      },
      first: -1,
      offset: 0,
      cypherParams: CYPHER_PARAMS
    };
  t.plan(4);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, expectedParams),
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('Custom batch @cypher mutation without RETURN or WITH clause, using nested @cypher input (experimental api)', t => {
  const graphQLQuery = `mutation {
    MergeCustomsWithoutReturnOrWithClause(
      data: [
        {
          id: "a"
          nested: {
            merge: [
              { id: "b" }
              { id: "c" }
            ]
          }
        }
        {
          id: "d"
          nested: {
            merge: [
              { id: "e" }
              { id: "f" }
            ]
          }
        }
      ]
      sideEffects: {
        create: [
          { id: "g", nested: { create: [{ id: "h" }, { id: "i" }] } }
          { id: "j", nested: { create: [{ id: "k" }, { id: "l" }] } }
        ]
      }
      otherData: {
        merge: [
          {
            id: "x"
          }
        ]
      }
      computed: {
        computed: {
          multiply: {
            value: 5
          }
        }
      }
      nestedBatch: [
        {
          merge: [
            {
              id: "y"
            }
            {
              id: "z"
              nested: {
                merge: [
                  {
                    id: "m"
                  }
                ]
              }
            }
          ]
          update: [
            {
              id: "y"
            }
            {
              id: "z"
            }
          ]
        }
      ]
    ) {
      id
      computed
      nested {
        id
      }
    }
  }`,
    expectedCypherQuery = `CALL apoc.cypher.doIt("UnwiNd   $data aS            CustomData MERGE (custom: Custom {   id: CustomData.id })  
WITH custom, CustomData AS _CustomData

CALL {
  WITH *
  UNWIND _CustomData.nested.merge AS CustomData
  MERGE (subCustom: Custom {
  id: CustomData.id
})
MERGE (custom)-[:RELATED]->(subCustom)
WITH subCustom AS custom
  RETURN COUNT(*) AS _nested_merge_
}

CALL {
  WITH *
  UNWIND $nestedBatch AS _nestedBatch
  UNWIND _nestedBatch.merge as CustomData
  MERGE (subCustom: Custom {   id: CustomData.id }) MERGE (subCustom)-[:RELATED]->(custom) 
WITH CustomData AS _CustomData,  subCustom AS custom
CALL {
  WITH *
  UNWIND _CustomData.nested.merge AS CustomData
  MERGE (subCustom: Custom {
  id: CustomData.id
})
MERGE (custom)-[:RELATED]->(subCustom)
WITH subCustom AS custom
  RETURN COUNT(*) AS _nested_merge_
}
  RETURN COUNT(*) AS _nestedBatch_merge_
}

CALL {
  WITH *
  UNWIND $nestedBatch AS _nestedBatch
  UNWIND _nestedBatch.update as CustomData
  MATCH (custom)<-[:RELATED]-(subCustom: Custom {
  id: CustomData.id
})
SET subCustom.nestedBatchProperty = TRUE
WITH subCustom AS custom
  RETURN COUNT(*) AS _nestedBatch_update_
}

CALL {
  WITH *
  UNWIND $sideEffects.create AS CustomData
  MERGE (subCustom: Custom {   id: CustomData.id }) MERGE (custom)-[:RELATED]->(subCustom) 
WITH CustomData AS _CustomData,  subCustom AS custom
CALL {
  WITH *
  UNWIND _CustomData.nested.create AS CustomData
  MERGE (subCustom: Custom {
  id: CustomData.id
})
MERGE (custom)-[:RELATED]->(subCustom)
WITH subCustom AS custom
  RETURN COUNT(*) AS _nested_create_
}
  RETURN COUNT(*) AS _sideEffects_create_
}

CALL {
  WITH *
  UNWIND $otherData.merge AS CustomData
  MERGE (subCustom: Custom {
  id: CustomData.id
})
MERGE (custom)-[:RELATED]->(subCustom)
WITH subCustom AS custom
  RETURN COUNT(*) AS _otherData_merge_
}

CALL {
  WITH *
  UNWIND $computed.computed.multiply AS CustomComputedInput
  SET custom.computed = CustomComputedInput.value * 10
  RETURN COUNT(*) AS _computed_multiply_
}
RETURN custom", {data:$data, nestedBatch:$nestedBatch, sideEffects:$sideEffects, otherData:$otherData, computed:$computed, first:$first, offset:$offset, cypherParams: $cypherParams}) YIELD value
    WITH apoc.map.values(value, [keys(value)[0]])[0] AS \`custom\`
    RETURN \`custom\` { .id , .computed ,nested: [(\`custom\`)-[:\`RELATED\`]->(\`custom_nested\`:\`Custom\`) | \`custom_nested\` { .id }] } AS \`custom\``,
    expectedParams = {
      data: [
        {
          id: 'a',
          nested: {
            merge: [
              {
                id: 'b'
              },
              {
                id: 'c'
              }
            ]
          }
        },
        {
          id: 'd',
          nested: {
            merge: [
              {
                id: 'e'
              },
              {
                id: 'f'
              }
            ]
          }
        }
      ],
      nestedBatch: [
        {
          merge: [
            {
              id: 'y'
            },
            {
              id: 'z',
              nested: {
                merge: [
                  {
                    id: 'm'
                  }
                ]
              }
            }
          ],
          update: [
            {
              id: 'y'
            },
            {
              id: 'z'
            }
          ]
        }
      ],
      sideEffects: {
        create: [
          {
            id: 'g',
            nested: {
              create: [
                {
                  id: 'h'
                },
                {
                  id: 'i'
                }
              ]
            }
          },
          {
            id: 'j',
            nested: {
              create: [
                {
                  id: 'k'
                },
                {
                  id: 'l'
                }
              ]
            }
          }
        ]
      },
      otherData: {
        merge: [
          {
            id: 'x'
          }
        ]
      },
      computed: {
        computed: {
          multiply: {
            value: {
              low: 5,
              high: 0
            }
          }
        }
      },
      first: -1,
      offset: 0,
      cypherParams: CYPHER_PARAMS
    };
  t.plan(4);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, expectedParams),
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('Custom @cypher mutation with RETURN clause and no nested @cypher input (experimental api)', t => {
  const graphQLQuery = `mutation {
    MergeCustoms(
      data: [
        {
          id: "a"
        }
        {
          id: "d"
        }
      ]
    ) {
      id
    }
  }`,
    expectedCypherQuery = `CALL apoc.cypher.doIt("UnwiNd   $data aS  
         CustomData
MERGE (custom: Custom {
  id: CustomData.id
})
RETURN custom", {data:$data, first:$first, offset:$offset, cypherParams: $cypherParams}) YIELD value
    WITH apoc.map.values(value, [keys(value)[0]])[0] AS \`custom\`
    RETURN \`custom\` { .id } AS \`custom\``,
    expectedParams = {
      data: [
        {
          id: 'a'
        },
        {
          id: 'd'
        }
      ],
      first: -1,
      offset: 0,
      cypherParams: CYPHER_PARAMS
    };
  t.plan(4);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, expectedParams),
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('Custom batch @cypher mutation using multiple UNWIND clause on list argument with nested @cypher input (experimental api)', t => {
  const graphQLQuery = `mutation {
    MergeMatrix(
      xNodes: [
        {
          id: "a"
          yNodes: {
            merge: [
              {
                id: "c"
              }
              {
                id: "d"
              }
            ]
          }
        }
        {
          id: "b"
          yNodes: {
            merge: [
              {
                id: "c"
              }
              {
                id: "d"
              }
            ]
          }
        }
      ]
      yNodes: [
        {
          id: "c"
          xNodes: {
            merge: [
              {
                id: "a"
              }
              {
                id: "b"
              }
            ]
          }
        }
        {
          id: "d"
          xNodes: {
            merge: [
              {
                id: "a"
              }
              {
                id: "b"
              }
            ]
          }
        }
      ]
    ) {
      id
      xy {
        id
      }
      yx {
        id
      }
    }
  }`,
    expectedCypherQuery = `CALL apoc.cypher.doIt("UNWIND $xNodes AS XNodeInput UNWIND $yNodes AS YNodeInput MERGE (xNode: XNode {   id: XNodeInput.id }) MERGE (yNode: YNode {   id: YNodeInput.id })   
WITH YNodeInput AS _YNodeInput, XNodeInput AS _XNodeInput, xNode, yNode

CALL {
  WITH *
  UNWIND _XNodeInput.yNodes.merge AS YNodeInput
  MERGE (yNode)<-[:XY]-(xNode)
MERGE (yNode)-[:YX]->(xNode)
  RETURN COUNT(*) AS _yNodes_merge_
}

CALL {
  WITH *
  UNWIND _YNodeInput.xNodes.merge AS XNodeInput
  MERGE (xNode)-[:XY]->(yNode)
MERGE (xNode)<-[:YX]-(yNode)
  RETURN COUNT(*) AS _xNodes_merge_
}
RETURN xNode", {xNodes:$xNodes, yNodes:$yNodes, first:$first, offset:$offset, cypherParams: $cypherParams}) YIELD value
    WITH apoc.map.values(value, [keys(value)[0]])[0] AS \`xNode\`
    RETURN \`xNode\` { .id ,xy: [(\`xNode\`)-[:\`XY\`]->(\`xNode_xy\`:\`YNode\`) | \`xNode_xy\` { .id }] ,yx: [(\`xNode\`)<-[:\`YX\`]-(\`xNode_yx\`:\`YNode\`) | \`xNode_yx\` { .id }] } AS \`xNode\``,
    expectedParams = {
      xNodes: [
        {
          id: 'a',
          yNodes: {
            merge: [
              {
                id: 'c'
              },
              {
                id: 'd'
              }
            ]
          }
        },
        {
          id: 'b',
          yNodes: {
            merge: [
              {
                id: 'c'
              },
              {
                id: 'd'
              }
            ]
          }
        }
      ],
      yNodes: [
        {
          id: 'c',
          xNodes: {
            merge: [
              {
                id: 'a'
              },
              {
                id: 'b'
              }
            ]
          }
        },
        {
          id: 'd',
          xNodes: {
            merge: [
              {
                id: 'a'
              },
              {
                id: 'b'
              }
            ]
          }
        }
      ],
      first: -1,
      offset: 0,
      cypherParams: CYPHER_PARAMS
    };
  t.plan(4);
  return Promise.all([
    cypherTestRunner(t, graphQLQuery, {}, expectedCypherQuery, expectedParams),
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});
