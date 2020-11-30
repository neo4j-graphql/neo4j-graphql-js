import test from 'ava';
import {
  cypherTestRunner,
  augmentedSchemaCypherTestRunner
} from '../../helpers/custom/customSchemaTest';

const CYPHER_PARAMS = {
  userId: 'user-id'
};

test('Create node mutation with nested @cypher', t => {
  const graphQLQuery = `mutation {
    CreateUser(
      idField: "user-1"
      liked: {
        create: [
          {
            id: "movie-1"
            title: "title-1"
          }
          {
            id: "movie-2"
            title: "title-2"
          }
          {
            id: "movie-3"
            title: "title-3"
          }
          {
            id: "movie-4"
            title: "title-4"
          }
        ]
      }
    ) {
      idField
      liked {
        id
        title
      }
    }
  }
  `,
    expectedCypherQuery = `
    CREATE (\`user\`:\`User\` {idField:$params.idField})
  WITH *
  
CALL {
  WITH *
  UNWIND $params.liked.create AS MovieCreate
  WITH MovieCreate, user
CREATE (user)-[:RATING]->(movie: Movie {
  id: MovieCreate.id,
  title: MovieCreate.title
})
WITH MovieCreate AS _MovieCreate, movie
  RETURN COUNT(*) AS _liked_create_
}
    RETURN \`user\` { .idField ,liked: [(\`user\`)-[:\`RATING\`]->(\`user_liked\`:\`Movie\`) | \`user_liked\` { .id , .title }] } AS \`user\`
  `,
    expectedParams = {
      params: {
        idField: 'user-1',
        liked: {
          create: [
            {
              id: 'movie-1',
              title: 'title-1'
            },
            {
              id: 'movie-2',
              title: 'title-2'
            },
            {
              id: 'movie-3',
              title: 'title-3'
            },
            {
              id: 'movie-4',
              title: 'title-4'
            }
          ]
        }
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

test('Create node mutation with nested @cypher, skipping 1 non-@mutation input object', t => {
  const graphQLQuery = `mutation {
    CreateUser(
      idField: "user-1"
      liked: {
        nestedCreate: [
          {
            customLayer: {
              custom: "custom-1"
              movie: {
                id: "movie-1"
                title: "title-1"
              }
            }
          }
          {
            customLayer: {
              custom: "custom-2"
              movie: {
                id: "movie-2"
                title: "title-2"
              }
            }
          }
          {
            customLayer: {
              custom: "custom-3"
              movie: {
                id: "movie-3"
                title: "title-3"
              }
            }
          }
          {
            customLayer: {
              custom: "custom-4"
              movie: {
                id: "movie-4"
                title: "title-4"
              }
            }
          }
        ]
      }
    ) {
      idField
      liked {
        id
        title
        custom
      }
    }
  }
  `,
    expectedCypherQuery = `
    CREATE (\`user\`:\`User\` {idField:$params.idField})
  WITH *
  
CALL {
  WITH *
  UNWIND $params.liked.nestedCreate AS MovieCreate
  WITH MovieCreate, user
CREATE (user)-[:RATING]->(movie: Movie {
  id: MovieCreate.customLayer.movie.id,
  title: MovieCreate.customLayer.movie.title,
  custom: MovieCreate.customLayer.custom
})
WITH MovieCreate AS _MovieCreate, movie
  RETURN COUNT(*) AS _liked_nestedCreate_
}
    RETURN \`user\` { .idField ,liked: [(\`user\`)-[:\`RATING\`]->(\`user_liked\`:\`Movie\`) | \`user_liked\` { .id , .title , .custom }] } AS \`user\`
  `,
    expectedParams = {
      params: {
        idField: 'user-1',
        liked: {
          nestedCreate: [
            {
              customLayer: {
                custom: 'custom-1',
                movie: {
                  id: 'movie-1',
                  title: 'title-1'
                }
              }
            },
            {
              customLayer: {
                custom: 'custom-2',
                movie: {
                  id: 'movie-2',
                  title: 'title-2'
                }
              }
            },
            {
              customLayer: {
                custom: 'custom-3',
                movie: {
                  id: 'movie-3',
                  title: 'title-3'
                }
              }
            },
            {
              customLayer: {
                custom: 'custom-4',
                movie: {
                  id: 'movie-4',
                  title: 'title-4'
                }
              }
            }
          ]
        }
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

test('Delete node mutation with @cypher deleting related node', t => {
  const graphQLQuery = `mutation {
    DeleteUser(
      idField: "user-1"
      liked: {
        delete: {
          id: "movie-1"
        }
      }
    ) {
      idField
      liked {
        id
      }
    }
  }
  `,
    expectedCypherQuery = `MATCH (\`user\`:\`User\` {idField: $idField})

CALL {
  WITH *
  UNWIND $liked.delete AS MovieWhere
  WITH MovieWhere, user
MATCH (user)-[:RATING]->(movie: Movie { id: MovieWhere.id })
DETACH DELETE movie
  RETURN COUNT(*) AS _liked_delete_
}
WITH \`user\` AS \`user_toDelete\`, \`user\` { .idField ,liked: [(\`user\`)-[:\`RATING\`]->(\`user_liked\`:\`Movie\`) | \`user_liked\` { .id }] } AS \`user\`
DETACH DELETE \`user_toDelete\`
RETURN \`user\``,
    expectedParams = {
      idField: 'user-1',
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

test('Create node mutation with multiple nested @cypher', t => {
  const graphQLQuery = `mutation {
    CreateUser(
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
                { name: "Ada", uniqueString: "c" }
              ]
            }
          }
        ]
      }
      sideEffects: {
        createdAt: { datetime: { year: 2020, month: 11, day: 13 } }
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
    CREATE (\`user\`:\`User\` {idField:$params.idField,name:$params.name,names:$params.names,birthday: datetime($params.birthday),uniqueString:$params.uniqueString})
  WITH *
  
CALL {
  WITH *
  UNWIND $params.liked.create AS MovieCreate
  WITH MovieCreate, user
CREATE (user)-[:RATING]->(movie: Movie {
  id: MovieCreate.id,
  title: MovieCreate.title
})
WITH MovieCreate AS _MovieCreate, movie
CALL {
  WITH *
  UNWIND _MovieCreate.likedBy.create AS UserCreate
  WITH UserCreate, movie
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
  UNWIND $params.sideEffects.createdAt AS CreatedAt
  WITH CreatedAt, user
SET user.createdAt = datetime(CreatedAt.datetime)
  RETURN COUNT(*) AS _sideEffects_createdAt_
}
    RETURN \`user\` { .idField , .uniqueString ,liked: [(\`user\`)-[:\`RATING\`]->(\`user_liked\`:\`Movie\`) | \`user_liked\` { .id , .title ,likedBy: [(\`user_liked\`)<-[:\`RATING\`]-(\`user_liked_likedBy\`:\`User\`) | \`user_liked_likedBy\` { .name , .uniqueString }] }] ,createdAt: { formatted: toString(\`user\`.createdAt) }} AS \`user\`
  `,
    expectedParams = {
      params: {
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
        },
        sideEffects: {
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

test('Merge node mutation with multiple nested @cypher', t => {
  const graphQLQuery = `mutation {
    MergeUser(
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
                { name: "Ada", uniqueString: "c" }
              ]
            }
          }
        ]
      }
      sideEffects: {
        mergedAt: { datetime: { year: 2020, month: 11, day: 13 } }
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
    expectedCypherQuery = `MERGE (\`user\`:\`User\`{idField: $params.idField})
  SET \`user\` += {name:$params.name,names:$params.names,birthday: datetime($params.birthday),uniqueString:$params.uniqueString} 
  WITH *
  
CALL {
  WITH *
  UNWIND $params.liked.create AS MovieCreate
  WITH MovieCreate, user
CREATE (user)-[:RATING]->(movie: Movie {
  id: MovieCreate.id,
  title: MovieCreate.title
})
WITH MovieCreate AS _MovieCreate, movie
CALL {
  WITH *
  UNWIND _MovieCreate.likedBy.create AS UserCreate
  WITH UserCreate, movie
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
  UNWIND $params.sideEffects.mergedAt AS CreatedAt
  WITH CreatedAt, user
SET user.modifiedAt = datetime(CreatedAt.datetime)
  RETURN COUNT(*) AS _sideEffects_mergedAt_
}RETURN \`user\` { .idField , .uniqueString ,liked: [(\`user\`)-[:\`RATING\`]->(\`user_liked\`:\`Movie\`) | \`user_liked\` { .id , .title ,likedBy: [(\`user_liked\`)<-[:\`RATING\`]-(\`user_liked_likedBy\`:\`User\`) | \`user_liked_likedBy\` { .name , .uniqueString }] }] ,createdAt: { formatted: toString(\`user\`.createdAt) }} AS \`user\``,
    expectedParams = {
      params: {
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
        },
        sideEffects: {
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

test('Custom @cypher mutation with multiple nested @cypher', t => {
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
  UNWIND $sideEffects.create AS CustomData
  WITH CustomData, custom
MERGE (subCustom: Custom {
  id: CustomData.id
})
MERGE (custom)-[:RELATED]->(subCustom)
WITH CustomData AS _CustomData, subCustom AS custom
CALL {
  WITH *
  UNWIND _CustomData.nested.create AS CustomData
  WITH CustomData, custom
MERGE (subCustom: Custom {
  id: CustomData.id
})
MERGE (custom)-[:RELATED]->(subCustom)
WITH CustomData AS _CustomData, subCustom AS custom
  RETURN COUNT(*) AS _nested_create_
}
  RETURN COUNT(*) AS _sideEffects_create_
}

CALL {
  WITH *
  UNWIND $computed.computed.multiply AS CustomComputedInput
  WITH CustomComputedInput, custom
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
