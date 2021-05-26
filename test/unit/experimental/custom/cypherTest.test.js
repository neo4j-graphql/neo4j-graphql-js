import test from 'ava';
import {
  cypherTestRunner,
  augmentedSchemaCypherTestRunner
} from '../../../helpers/experimental/custom/customSchemaTest';

const CYPHER_PARAMS = {
  userId: 'user-id'
};

test('Create node mutation with deeply nested @cypher (experimental api)', t => {
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
                  { name: "Ada", uniqueString: "c" }
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
  CREATE (movie: Movie {
  id: MovieCreate.id,
  title: MovieCreate.title
})
CREATE (user)-[:RATING]->(movie)

WITH MovieCreate AS _MovieCreate, movie
CALL {
  WITH *
  UNWIND _MovieCreate.likedBy.create AS UserCreate
  CREATE (movie)<-[:RATING]-(user:User {
  name: UserCreate.name,
  uniqueString: UserCreate.uniqueString
})

WITH UserCreate AS _UserCreate, user
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
                    uniqueString: 'c'
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

test('Create node mutation with nested @cypher importing variable (experimental api)', t => {
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
          createWithImporting: [
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
                  { name: "Ada", uniqueString: "c" }
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
  UNWIND $data.liked.createWithImporting AS MovieCreate
  WITH MovieCreate, user
CREATE (movie: Movie {
  id: MovieCreate.id,
  title: MovieCreate.title
})
CREATE (user)-[:RATING]->(movie)
WITH MovieCreate AS _MovieCreate, movie
CALL {
  WITH *
  UNWIND _MovieCreate.likedBy.create AS UserCreate
  CREATE (movie)<-[:RATING]-(user:User {
  name: UserCreate.name,
  uniqueString: UserCreate.uniqueString
})

WITH UserCreate AS _UserCreate, user
  RETURN COUNT(*) AS _likedBy_create_
}
  RETURN COUNT(*) AS _liked_createWithImporting_
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
          createWithImporting: [
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
                    uniqueString: 'c'
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

test('Create node mutation with nested @cypher importing all variables (experimental api)', t => {
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
          createWithImportingAll: [
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
                  { name: "Ada", uniqueString: "c" }
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
  UNWIND $data.liked.createWithImportingAll AS MovieCreate
  WITH *, MovieCreate
CREATE (movie: Movie {
  id: MovieCreate.id,
  title: MovieCreate.title
})
CREATE (user)-[:RATING]->(movie)
WITH MovieCreate AS _MovieCreate, movie
CALL {
  WITH *
  UNWIND _MovieCreate.likedBy.create AS UserCreate
  CREATE (movie)<-[:RATING]-(user:User {
  name: UserCreate.name,
  uniqueString: UserCreate.uniqueString
})

WITH UserCreate AS _UserCreate, user
  RETURN COUNT(*) AS _likedBy_create_
}
  RETURN COUNT(*) AS _liked_createWithImportingAll_
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
          createWithImportingAll: [
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
                    uniqueString: 'c'
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

test('Create node mutation with nested @cypher importing all variables and list (experimental api)', t => {
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
          createWithImportingAllList: [
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
                  { name: "Ada", uniqueString: "c" }
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
        myStaticNumber
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
  UNWIND $data.liked.createWithImportingAllList AS MovieCreate
  WITH *, MovieCreate, 10 AS myStaticNumber
CREATE (movie: Movie {
  id: MovieCreate.id,
  title: MovieCreate.title,
  myStaticNumber: myStaticNumber
})
CREATE (user)-[:RATING]->(movie)
WITH MovieCreate AS _MovieCreate, movie
CALL {
  WITH *
  UNWIND _MovieCreate.likedBy.create AS UserCreate
  CREATE (movie)<-[:RATING]-(user:User {
  name: UserCreate.name,
  uniqueString: UserCreate.uniqueString
})

WITH UserCreate AS _UserCreate, user
  RETURN COUNT(*) AS _likedBy_create_
}
  RETURN COUNT(*) AS _liked_createWithImportingAllList_
}
    RETURN \`user\` { .idField , .uniqueString ,liked: [(\`user\`)-[:\`RATING\`]->(\`user_liked\`:\`Movie\`) | \`user_liked\` { .id , .title , .myStaticNumber ,likedBy: [(\`user_liked\`)<-[:\`RATING\`]-(\`user_liked_likedBy\`:\`User\`) | \`user_liked_likedBy\` { .name , .uniqueString }] }] } AS \`user\`
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
          createWithImportingAllList: [
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
                    uniqueString: 'c'
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

test('Create node mutation with nested @cypher importing variable list (experimental api)', t => {
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
          createWithImportingList: [
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
                  { name: "Ada", uniqueString: "c" }
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
        myStaticNumber
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
  UNWIND $data.liked.createWithImportingList AS MovieCreate
  WITH MovieCreate, user, 10 AS myStaticNumber
CREATE (movie: Movie {
  id: MovieCreate.id,
  title: MovieCreate.title,
  myStaticNumber: myStaticNumber
})
CREATE (user)-[:RATING]->(movie)
WITH MovieCreate AS _MovieCreate, movie
CALL {
  WITH *
  UNWIND _MovieCreate.likedBy.create AS UserCreate
  CREATE (movie)<-[:RATING]-(user:User {
  name: UserCreate.name,
  uniqueString: UserCreate.uniqueString
})

WITH UserCreate AS _UserCreate, user
  RETURN COUNT(*) AS _likedBy_create_
}
  RETURN COUNT(*) AS _liked_createWithImportingList_
}
    RETURN \`user\` { .idField , .uniqueString ,liked: [(\`user\`)-[:\`RATING\`]->(\`user_liked\`:\`Movie\`) | \`user_liked\` { .id , .title , .myStaticNumber ,likedBy: [(\`user_liked\`)<-[:\`RATING\`]-(\`user_liked_likedBy\`:\`User\`) | \`user_liked_likedBy\` { .name , .uniqueString }] }] } AS \`user\`
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
          createWithImportingList: [
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
                    uniqueString: 'c'
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

test('Create node mutation with nested @cypher importing static variable exported from parent (experimental api)', t => {
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
          createWithExportingAllList: [
            {
              id: "movie-1"
              title: "title-1"
              likedBy: {
                createWithParentStaticExport: [
                  { name: "Alan", uniqueString: "x" }
                  { name: "Ada", uniqueString: "y" }
                ]
              }
            }
            {
              id: "movie-2"
              title: "title-2"
              likedBy: {
                createWithParentStaticExport: [
                  { name: "Alan", uniqueString: "a" }
                  { name: "Ada", uniqueString: "c" }
                ]
              }
            }
          ]
          createWithExportingList: [
            {
              id: "movie-3"
              title: "title-3"
              likedBy: {
                createWithParentStaticExport: [
                  { name: "Alan", uniqueString: "d" }
                  { name: "Ada", uniqueString: "e" }
                ]
              }
            }
            {
              id: "movie-4"
              title: "title-4"
              likedBy: {
                createWithParentStaticExport: [
                  { name: "Alan", uniqueString: "f" }
                  { name: "Ada", uniqueString: "g" }
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
        myStaticNumber
        likedBy {
          name
          uniqueString
          myExportedNumber
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
  UNWIND $data.liked.createWithExportingAllList AS MovieCreate
  WITH *, MovieCreate, 10 AS myStaticNumber
CREATE (movie: Movie {
  id: MovieCreate.id,
  title: MovieCreate.title,
  myStaticNumber: myStaticNumber
})
CREATE (user)-[:RATING]->(movie)
WITH *, MovieCreate AS _MovieCreate, 5 AS myExportedNumber
CALL {
  WITH *
  UNWIND _MovieCreate.likedBy.createWithParentStaticExport AS UserCreate
  WITH UserCreate, movie, myExportedNumber
CREATE (movie)<-[:RATING]-(user:User {
  name: UserCreate.name,
  uniqueString: UserCreate.uniqueString,
  myExportedNumber: myExportedNumber
})
WITH UserCreate AS _UserCreate, user
  RETURN COUNT(*) AS _likedBy_createWithParentStaticExport_
}
  RETURN COUNT(*) AS _liked_createWithExportingAllList_
}

CALL {
  WITH *
  UNWIND $data.liked.createWithExportingList AS MovieCreate
  WITH *, MovieCreate, 10 AS myStaticNumber
CREATE (movie: Movie {
  id: MovieCreate.id,
  title: MovieCreate.title,
  myStaticNumber: myStaticNumber
})
CREATE (user)-[:RATING]->(movie)
WITH MovieCreate AS _MovieCreate, movie, 5 AS myExportedNumber
CALL {
  WITH *
  UNWIND _MovieCreate.likedBy.createWithParentStaticExport AS UserCreate
  WITH UserCreate, movie, myExportedNumber
CREATE (movie)<-[:RATING]-(user:User {
  name: UserCreate.name,
  uniqueString: UserCreate.uniqueString,
  myExportedNumber: myExportedNumber
})
WITH UserCreate AS _UserCreate, user
  RETURN COUNT(*) AS _likedBy_createWithParentStaticExport_
}
  RETURN COUNT(*) AS _liked_createWithExportingList_
}
    RETURN \`user\` { .idField , .uniqueString ,liked: [(\`user\`)-[:\`RATING\`]->(\`user_liked\`:\`Movie\`) | \`user_liked\` { .id , .title , .myStaticNumber ,likedBy: [(\`user_liked\`)<-[:\`RATING\`]-(\`user_liked_likedBy\`:\`User\`) | \`user_liked_likedBy\` { .name , .uniqueString , .myExportedNumber }] }] } AS \`user\`
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
          createWithExportingAllList: [
            {
              id: 'movie-1',
              title: 'title-1',
              likedBy: {
                createWithParentStaticExport: [
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
                createWithParentStaticExport: [
                  {
                    name: 'Alan',
                    uniqueString: 'a'
                  },
                  {
                    name: 'Ada',
                    uniqueString: 'c'
                  }
                ]
              }
            }
          ],
          createWithExportingList: [
            {
              id: 'movie-3',
              title: 'title-3',
              likedBy: {
                createWithParentStaticExport: [
                  {
                    name: 'Alan',
                    uniqueString: 'd'
                  },
                  {
                    name: 'Ada',
                    uniqueString: 'e'
                  }
                ]
              }
            },
            {
              id: 'movie-4',
              title: 'title-4',
              likedBy: {
                createWithParentStaticExport: [
                  {
                    name: 'Alan',
                    uniqueString: 'f'
                  },
                  {
                    name: 'Ada',
                    uniqueString: 'g'
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

test('Create node mutation with nested @cypher exporting all variables (experimental api)', t => {
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
          createWithExportingAll: [
            {
              id: "movie-1"
              title: "title-1"
            }
            {
              id: "movie-2"
              title: "title-2"
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
        myStaticNumber
      }
    }
  }
  `,
    expectedCypherQuery = `
    CREATE (\`user\`:\`User\` {idField:$data.idField,name:$data.name,names:$data.names,birthday: datetime($data.birthday),uniqueString:$data.uniqueString})
  WITH *
  
CALL {
  WITH *
  UNWIND $data.liked.createWithExportingAll AS MovieCreate
  WITH *, MovieCreate, 10 AS myStaticNumber
CREATE (movie: Movie {
  id: MovieCreate.id,
  title: MovieCreate.title,
  myStaticNumber: myStaticNumber
})
CREATE (user)-[:RATING]->(movie)
WITH *, MovieCreate AS _MovieCreate
  RETURN COUNT(*) AS _liked_createWithExportingAll_
}
    RETURN \`user\` { .idField , .uniqueString ,liked: [(\`user\`)-[:\`RATING\`]->(\`user_liked\`:\`Movie\`) | \`user_liked\` { .id , .title , .myStaticNumber }] } AS \`user\`
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
          createWithExportingAll: [
            {
              id: 'movie-1',
              title: 'title-1'
            },
            {
              id: 'movie-2',
              title: 'title-2'
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

test('Create node mutation with nested @cypher using default variable export (experimental api)', t => {
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
          createWithDefaultExport: [
            {
              id: "movie-1"
              title: "title-1"
            }
            {
              id: "movie-2"
              title: "title-2"
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
      }
    }
  }
  `,
    expectedCypherQuery = `
    CREATE (\`user\`:\`User\` {idField:$data.idField,name:$data.name,names:$data.names,birthday: datetime($data.birthday),uniqueString:$data.uniqueString})
  WITH *
  
CALL {
  WITH *
  UNWIND $data.liked.createWithDefaultExport AS MovieCreate
  CREATE (movie: Movie {
  id: MovieCreate.id,
  title: MovieCreate.title
})
CREATE (user)-[:RATING]->(movie)
  RETURN COUNT(*) AS _liked_createWithDefaultExport_
}
    RETURN \`user\` { .idField , .uniqueString ,liked: [(\`user\`)-[:\`RATING\`]->(\`user_liked\`:\`Movie\`) | \`user_liked\` { .id , .title }] } AS \`user\`
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
          createWithDefaultExport: [
            {
              id: 'movie-1',
              title: 'title-1'
            },
            {
              id: 'movie-2',
              title: 'title-2'
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

test('Create node mutation with nested @cypher using default variable export, with variable conflict (experimental api)', t => {
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
          createWithDefaultExport: [
            {
              id: "movie-1"
              title: "title-1"
              likedBy: {
                createDuplicateVariableError: [
                  { name: "Alan", uniqueString: "x" }
                  { name: "Ada", uniqueString: "y" }
                ]
              }
            }
            {
              id: "movie-2"
              title: "title-2"
              likedBy: {
                createDuplicateVariableError: [
                  { name: "Alan", uniqueString: "a" }
                  { name: "Ada", uniqueString: "c" }
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
  UNWIND $data.liked.createWithDefaultExport AS MovieCreate
  CREATE (movie: Movie {
  id: MovieCreate.id,
  title: MovieCreate.title
})
CREATE (user)-[:RATING]->(movie)
WITH *, MovieCreate AS _MovieCreate
CALL {
  WITH *
  UNWIND _MovieCreate.likedBy.createDuplicateVariableError AS UserCreate
  CREATE (movie)<-[:RATING]-(user:User {
  name: UserCreate.name,
  uniqueString: UserCreate.uniqueString
})

WITH UserCreate AS _UserCreate, user
  RETURN COUNT(*) AS _likedBy_createDuplicateVariableError_
}
  RETURN COUNT(*) AS _liked_createWithDefaultExport_
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
          createWithDefaultExport: [
            {
              id: 'movie-1',
              title: 'title-1',
              likedBy: {
                createDuplicateVariableError: [
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
                createDuplicateVariableError: [
                  {
                    name: 'Alan',
                    uniqueString: 'a'
                  },
                  {
                    name: 'Ada',
                    uniqueString: 'c'
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

test('Create node mutation with nested @cypher using default variable export, without variable conflict (experimental api)', t => {
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
          createWithDefaultExport: [
            {
              id: "movie-1"
              title: "title-1"
              likedBy: {
                createWithNameConflictPrevention: [
                  { name: "Alan", uniqueString: "x" }
                  { name: "Ada", uniqueString: "y" }
                ]
              }
            }
            {
              id: "movie-2"
              title: "title-2"
              likedBy: {
                createWithNameConflictPrevention: [
                  { name: "Alan", uniqueString: "a" }
                  { name: "Ada", uniqueString: "c" }
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
  UNWIND $data.liked.createWithDefaultExport AS MovieCreate
  CREATE (movie: Movie {
  id: MovieCreate.id,
  title: MovieCreate.title
})
CREATE (user)-[:RATING]->(movie)
WITH *, MovieCreate AS _MovieCreate
CALL {
  WITH *
  UNWIND _MovieCreate.likedBy.createWithNameConflictPrevention AS UserCreate
  CREATE (movie)<-[:RATING]-(subUser:User {
  name: UserCreate.name,
  uniqueString: UserCreate.uniqueString
})

WITH UserCreate AS _UserCreate, subUser AS user
  RETURN COUNT(*) AS _likedBy_createWithNameConflictPrevention_
}
  RETURN COUNT(*) AS _liked_createWithDefaultExport_
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
          createWithDefaultExport: [
            {
              id: 'movie-1',
              title: 'title-1',
              likedBy: {
                createWithNameConflictPrevention: [
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
                createWithNameConflictPrevention: [
                  {
                    name: 'Alan',
                    uniqueString: 'a'
                  },
                  {
                    name: 'Ada',
                    uniqueString: 'c'
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

test('Create node with deeply nested @cypher input, reusing input type (experimental api)', t => {
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
  WITH CreatedAt, user, 10 AS myStaticNumber
SET user.int = $data.onUserCreate.int
SET user.createdAt = datetime(CreatedAt.datetime)
SET user.myStaticNumber = myStaticNumber
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
                    { name: "Ada", uniqueString: "c" }
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
  MERGE (movie: Movie {
  id: MovieMerge.where.id
})
ON CREATE
  SET movie.title = MovieMerge.data.title
MERGE (user)-[:RATING]->(movie)

WITH MovieMerge AS _MovieMerge, movie
CALL {
  WITH *
  UNWIND _MovieMerge.data.likedBy.create AS UserCreate
  CREATE (movie)<-[:RATING]-(user:User {
  name: UserCreate.name,
  uniqueString: UserCreate.uniqueString
})

WITH UserCreate AS _UserCreate, user
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
                      uniqueString: 'c'
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
  MERGE (movie: Movie {
  id: MovieMerge.where.id
})
ON CREATE
  SET movie.title = MovieMerge.data.title
MERGE (user)-[:RATING]->(movie)

WITH MovieMerge AS _MovieMerge, movie
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
                      { name: "Ada", uniqueString: "c" }
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
  CREATE (user)-[:RATING]->(movie: Movie {
  id: MovieCreate.customLayer.data.id,
  title: MovieCreate.customLayer.data.title,
  custom: MovieCreate.customLayer.custom
})

WITH MovieCreate AS _MovieCreate, movie
CALL {
  WITH *
  UNWIND _MovieCreate.customLayer.data.likedBy.create AS UserCreate
  CREATE (movie)<-[:RATING]-(user:User {
  name: UserCreate.name,
  uniqueString: UserCreate.uniqueString
})

WITH UserCreate AS _UserCreate, user
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
                        uniqueString: 'c'
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
    expectedCypherQuery = `MATCH (\`user\`:\`User\`) WHERE (\`user\`.idField = $\`where\`.idField) 

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
  CREATE (movie: Movie {
  id: MovieCreate.id,
  title: MovieCreate.title
})
CREATE (user)-[:RATING]->(movie)

WITH MovieCreate AS _MovieCreate, movie
CALL {
  WITH *
  UNWIND _MovieCreate.likedBy.create AS UserCreate
  CREATE (movie)<-[:RATING]-(user:User {
  name: UserCreate.name,
  uniqueString: UserCreate.uniqueString
})

WITH UserCreate AS _UserCreate, user
  RETURN COUNT(*) AS _likedBy_create_
}
  RETURN COUNT(*) AS _liked_create_
}

CALL {
  WITH *
  UNWIND $data.liked.merge AS MovieMerge
  MERGE (movie: Movie {
  id: MovieMerge.where.id
})
ON CREATE
  SET movie.title = MovieMerge.data.title
MERGE (user)-[:RATING]->(movie)

WITH MovieMerge AS _MovieMerge, movie
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

test('Create node with nested @cypher that begins with a WITH clause that sets an arbitrary variable: OnUserCreate.createdAt (experimental api)', t => {
  const graphQLQuery = `mutation {
    CreateUser(
      data: {
        idField: "a"
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
    CREATE (\`user\`:\`User\` {idField:$data.idField})
  WITH *
  
CALL {
  WITH *
  UNWIND $data.onUserCreate.createdAt AS CreatedAt
  WITH CreatedAt, user, 10 AS myStaticNumber
SET user.int = $data.onUserCreate.int
SET user.createdAt = datetime(CreatedAt.datetime)
SET user.myStaticNumber = myStaticNumber
  RETURN COUNT(*) AS _onUserCreate_createdAt_
}
    RETURN \`user\` { .idField , .uniqueString ,liked: [(\`user\`)-[:\`RATING\`]->(\`user_liked\`:\`Movie\`) | \`user_liked\` { .id , .title ,likedBy: [(\`user_liked\`)<-[:\`RATING\`]-(\`user_liked_likedBy\`:\`User\`) | \`user_liked_likedBy\` { .name , .uniqueString }] }] ,createdAt: { formatted: toString(\`user\`.createdAt) }} AS \`user\`
  `,
    expectedParams = {
      first: -1,
      offset: 0,
      data: {
        idField: 'a',
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
                  { name: "Alan", uniqueString: "p" }
                  { name: "Ada", uniqueString: "q" }
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
  CREATE (movie: Movie {
  id: MovieCreate.id,
  title: MovieCreate.title
})
CREATE (user)-[:RATING]->(movie)

WITH MovieCreate AS _MovieCreate, movie
CALL {
  WITH *
  UNWIND _MovieCreate.likedBy.create AS UserCreate
  CREATE (movie)<-[:RATING]-(user:User {
  name: UserCreate.name,
  uniqueString: UserCreate.uniqueString
})

WITH UserCreate AS _UserCreate, user
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
                    uniqueString: 'p'
                  },
                  {
                    name: 'Ada',
                    uniqueString: 'q'
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
WITH *

CALL {
  WITH *
  UNWIND $sideEffects.create AS CustomCreate
  MERGE (subCustom: Custom {
  id: CustomCreate.id
})
MERGE (custom)-[:RELATED]->(subCustom)

WITH CustomCreate AS _CustomCreate, subCustom AS custom
CALL {
  WITH *
  UNWIND _CustomCreate.nested.create AS CustomCreate
  MERGE (subCustom: Custom {
  id: CustomCreate.id
})
MERGE (custom)-[:RELATED]->(subCustom)

WITH CustomCreate AS _CustomCreate, subCustom AS custom
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
RETURN custom", {id:$\`id\`, sideEffects:$\`sideEffects\`, computed:$\`computed\`, first:$\`first\`, offset:$\`offset\`, cypherParams: $cypherParams}) YIELD value
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
WITH *

CALL {
  WITH *
  UNWIND CustomData.nested.merge AS CustomCreate
  MERGE (subCustom: Custom {
  id: CustomCreate.id
})
MERGE (custom)-[:RELATED]->(subCustom)

WITH CustomCreate AS _CustomCreate, subCustom AS custom
  RETURN COUNT(*) AS _nested_merge_
}

CALL {
  WITH *
  UNWIND $nestedBatch AS _nestedBatch
  UNWIND _nestedBatch.merge as CustomCreate
  MERGE (subCustom: Custom {
  id: CustomCreate.id
})
MERGE (subCustom)-[:RELATED]->(custom)

WITH CustomCreate AS _CustomCreate, subCustom AS custom
CALL {
  WITH *
  UNWIND _CustomCreate.nested.merge AS CustomCreate
  MERGE (subCustom: Custom {
  id: CustomCreate.id
})
MERGE (custom)-[:RELATED]->(subCustom)

WITH CustomCreate AS _CustomCreate, subCustom AS custom
  RETURN COUNT(*) AS _nested_merge_
}
  RETURN COUNT(*) AS _nestedBatch_merge_
}

CALL {
  WITH *
  UNWIND $nestedBatch AS _nestedBatch
  UNWIND _nestedBatch.update as CustomCreate
  MATCH (custom)<-[:RELATED]-(subCustom: Custom {
  id: CustomCreate.id
})
SET subCustom.nestedBatchProperty = TRUE

WITH CustomCreate AS _CustomCreate, subCustom AS custom
  RETURN COUNT(*) AS _nestedBatch_update_
}

CALL {
  WITH *
  UNWIND $sideEffects.create AS CustomCreate
  MERGE (subCustom: Custom {
  id: CustomCreate.id
})
MERGE (custom)-[:RELATED]->(subCustom)

WITH CustomCreate AS _CustomCreate, subCustom AS custom
CALL {
  WITH *
  UNWIND _CustomCreate.nested.create AS CustomCreate
  MERGE (subCustom: Custom {
  id: CustomCreate.id
})
MERGE (custom)-[:RELATED]->(subCustom)

WITH CustomCreate AS _CustomCreate, subCustom AS custom
  RETURN COUNT(*) AS _nested_create_
}
  RETURN COUNT(*) AS _sideEffects_create_
}

CALL {
  WITH *
  UNWIND $otherData.merge AS CustomCreate
  MERGE (subCustom: Custom {
  id: CustomCreate.id
})
MERGE (custom)-[:RELATED]->(subCustom)

WITH CustomCreate AS _CustomCreate, subCustom AS custom
  RETURN COUNT(*) AS _otherData_merge_
}

CALL {
  WITH *
  UNWIND $computed.computed.multiply AS CustomComputedInput
  SET custom.computed = CustomComputedInput.value * 10
  RETURN COUNT(*) AS _computed_multiply_
}
RETURN custom", {data:$\`data\`, nestedBatch:$\`nestedBatch\`, sideEffects:$\`sideEffects\`, otherData:$\`otherData\`, computed:$\`computed\`, first:$\`first\`, offset:$\`offset\`, cypherParams: $cypherParams}) YIELD value
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
WITH *

CALL {
  WITH *
  UNWIND CustomData.nested.merge AS CustomCreate
  MERGE (subCustom: Custom {
  id: CustomCreate.id
})
MERGE (custom)-[:RELATED]->(subCustom)

WITH CustomCreate AS _CustomCreate, subCustom AS custom
  RETURN COUNT(*) AS _nested_merge_
}

CALL {
  WITH *
  UNWIND $nestedBatch AS _nestedBatch
  UNWIND _nestedBatch.merge as CustomCreate
  MERGE (subCustom: Custom {
  id: CustomCreate.id
})
MERGE (subCustom)-[:RELATED]->(custom)

WITH CustomCreate AS _CustomCreate, subCustom AS custom
CALL {
  WITH *
  UNWIND _CustomCreate.nested.merge AS CustomCreate
  MERGE (subCustom: Custom {
  id: CustomCreate.id
})
MERGE (custom)-[:RELATED]->(subCustom)

WITH CustomCreate AS _CustomCreate, subCustom AS custom
  RETURN COUNT(*) AS _nested_merge_
}
  RETURN COUNT(*) AS _nestedBatch_merge_
}

CALL {
  WITH *
  UNWIND $nestedBatch AS _nestedBatch
  UNWIND _nestedBatch.update as CustomCreate
  MATCH (custom)<-[:RELATED]-(subCustom: Custom {
  id: CustomCreate.id
})
SET subCustom.nestedBatchProperty = TRUE

WITH CustomCreate AS _CustomCreate, subCustom AS custom
  RETURN COUNT(*) AS _nestedBatch_update_
}

CALL {
  WITH *
  UNWIND $sideEffects.create AS CustomCreate
  MERGE (subCustom: Custom {
  id: CustomCreate.id
})
MERGE (custom)-[:RELATED]->(subCustom)

WITH CustomCreate AS _CustomCreate, subCustom AS custom
CALL {
  WITH *
  UNWIND _CustomCreate.nested.create AS CustomCreate
  MERGE (subCustom: Custom {
  id: CustomCreate.id
})
MERGE (custom)-[:RELATED]->(subCustom)

WITH CustomCreate AS _CustomCreate, subCustom AS custom
  RETURN COUNT(*) AS _nested_create_
}
  RETURN COUNT(*) AS _sideEffects_create_
}

CALL {
  WITH *
  UNWIND $otherData.merge AS CustomCreate
  MERGE (subCustom: Custom {
  id: CustomCreate.id
})
MERGE (custom)-[:RELATED]->(subCustom)

WITH CustomCreate AS _CustomCreate, subCustom AS custom
  RETURN COUNT(*) AS _otherData_merge_
}

CALL {
  WITH *
  UNWIND $computed.computed.multiply AS CustomComputedInput
  SET custom.computed = CustomComputedInput.value * 10
  RETURN COUNT(*) AS _computed_multiply_
}
RETURN custom", {data:$\`data\`, nestedBatch:$\`nestedBatch\`, sideEffects:$\`sideEffects\`, otherData:$\`otherData\`, computed:$\`computed\`, first:$\`first\`, offset:$\`offset\`, cypherParams: $cypherParams}) YIELD value
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
RETURN custom", {data:$\`data\`, first:$\`first\`, offset:$\`offset\`, cypherParams: $cypherParams}) YIELD value
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

test('Custom batch @cypher mutation using single UNWIND clause on list argument with nested @cypher input 3 levels deep (experimental api)', t => {
  const graphQLQuery = `mutation MergeLayeredNetwork {
    MergeLayeredNetwork(
      xNodes: [
        {
          id: "a"
          xy: {
            merge: [
              {
                id: "c"
                yz: {
                  merge: [{ id: "f" }, { id: "g" }, { id: "h" }, { id: "i" }]
                }
              }
              {
                id: "d"
                yz: {
                  merge: [{ id: "f" }, { id: "g" }, { id: "h" }, { id: "i" }]
                }
              }
              {
                id: "e"
                yz: {
                  merge: [{ id: "f" }, { id: "g" }, { id: "h" }, { id: "i" }]
                }
              }
            ]
          }
        }
        { id: "b", xy: { merge: [{ id: "c" }, { id: "d" }, { id: "e" }] } }
      ]
    ) {
      id
      xy {
        id
        yz {
          id
        }
      }
    }
  }`,
    expectedCypherQuery = `CALL apoc.cypher.doIt("UNWIND $xNodes AS XNodeInput MERGE (xNode: XNode {   id: XNodeInput.id }) 
WITH *

CALL {
  WITH *
  UNWIND XNodeInput.xy.merge AS YNodeInput
  MERGE (yNode: YNode {
  id: YNodeInput.id
})
MERGE (xNode)-[:XY]->(yNode)

WITH YNodeInput AS _YNodeInput, yNode
CALL {
  WITH *
  UNWIND _YNodeInput.yz.merge AS ZNodeInput
  MERGE (zNode: ZNode {
  id: ZNodeInput.id
})
MERGE (yNode)-[:YZ]->(zNode)
  RETURN COUNT(*) AS _yz_merge_
}
  RETURN COUNT(*) AS _xy_merge_
}
RETURN xNode", {xNodes:$\`xNodes\`, first:$\`first\`, offset:$\`offset\`, cypherParams: $cypherParams}) YIELD value
    WITH apoc.map.values(value, [keys(value)[0]])[0] AS \`xNode\`
    RETURN \`xNode\` { .id ,xy: [(\`xNode\`)-[:\`XY\`]->(\`xNode_xy\`:\`YNode\`) | \`xNode_xy\` { .id ,yz: [(\`xNode_xy\`)-[:\`YZ\`]->(\`xNode_xy_yz\`:\`ZNode\`) | \`xNode_xy_yz\` { .id }] }] } AS \`xNode\``,
    expectedParams = {
      xNodes: [
        {
          id: 'a',
          xy: {
            merge: [
              {
                id: 'c',
                yz: {
                  merge: [
                    {
                      id: 'f'
                    },
                    {
                      id: 'g'
                    },
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
                id: 'd',
                yz: {
                  merge: [
                    {
                      id: 'f'
                    },
                    {
                      id: 'g'
                    },
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
                id: 'e',
                yz: {
                  merge: [
                    {
                      id: 'f'
                    },
                    {
                      id: 'g'
                    },
                    {
                      id: 'h'
                    },
                    {
                      id: 'i'
                    }
                  ]
                }
              }
            ]
          }
        },
        {
          id: 'b',
          xy: {
            merge: [
              {
                id: 'c'
              },
              {
                id: 'd'
              },
              {
                id: 'e'
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

test('Custom batch @cypher mutation using multiple UNWIND clause on list argument with nested @cypher input 3 levels deep (experimental api)', t => {
  const graphQLQuery = `mutation MergeLayeredNetwork2 {
    MergeLayeredNetwork2(
      xNodes: [{ id: "a" }, { id: "b" }]
      yNodes: [
        {
          id: "c"
          yz: { merge: [{ id: "f" }, { id: "h" }, { id: "h" }, { id: "i" }] }
        }
        {
          id: "d"
          yz: { merge: [{ id: "f" }, { id: "g" }, { id: "h" }, { id: "i" }] }
        }
        {
          id: "e"
          yz: { merge: [{ id: "f" }, { id: "g" }, { id: "h" }, { id: "i" }] }
        }
      ]
    ) {
      id
      xy {
        id
        yz {
          id
        }
      }
    }
  }`,
    expectedCypherQuery = `CALL apoc.cypher.doIt("UNWIND $xNodes AS XNodeInput UNWIND $yNodes AS YNodeInput MERGE (xNode: XNode {   id: XNodeInput.id }) MERGE (yNode: YNode {   id: YNodeInput.id }) MERGE (xNode)-[:XY]->(yNode) 
WITH *

CALL {
  WITH *
  UNWIND YNodeInput.yz.merge AS ZNodeInput
  MERGE (zNode: ZNode {
  id: ZNodeInput.id
})
MERGE (yNode)-[:YZ]->(zNode)
  RETURN COUNT(*) AS _yz_merge_
}
RETURN xNode", {xNodes:$\`xNodes\`, yNodes:$\`yNodes\`, first:$\`first\`, offset:$\`offset\`, cypherParams: $cypherParams}) YIELD value
    WITH apoc.map.values(value, [keys(value)[0]])[0] AS \`xNode\`
    RETURN \`xNode\` { .id ,xy: [(\`xNode\`)-[:\`XY\`]->(\`xNode_xy\`:\`YNode\`) | \`xNode_xy\` { .id ,yz: [(\`xNode_xy\`)-[:\`YZ\`]->(\`xNode_xy_yz\`:\`ZNode\`) | \`xNode_xy_yz\` { .id }] }] } AS \`xNode\``,
    expectedParams = {
      xNodes: [
        {
          id: 'a'
        },
        {
          id: 'b'
        }
      ],
      yNodes: [
        {
          id: 'c',
          yz: {
            merge: [
              {
                id: 'f'
              },
              {
                id: 'h'
              },
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
          id: 'd',
          yz: {
            merge: [
              {
                id: 'f'
              },
              {
                id: 'g'
              },
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
          id: 'e',
          yz: {
            merge: [
              {
                id: 'f'
              },
              {
                id: 'g'
              },
              {
                id: 'h'
              },
              {
                id: 'i'
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
