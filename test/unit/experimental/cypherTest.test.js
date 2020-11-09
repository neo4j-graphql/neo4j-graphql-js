import test from 'ava';
import {
  cypherTestRunner,
  augmentedSchemaCypherTestRunner
} from '../../helpers/experimental/augmentSchemaTest';

test('Create node mutation using data input object argument', t => {
  const graphQLQuery = `mutation {
    CreateUser(
      data: {
        name: "Michael"
        indexedInt: 33
        uniqueString: "abc"
        extensionString: "xyz"
        birthday: { year: 1987, month: 9, day: 3, hour: 1 }
      }
    ) {
      idField
      indexedInt
      name
      uniqueString
      extensionString
      birthday {
        year
        month
        day
      }
    }
  }  
  `,
    expectedCypherQuery = `
    CREATE (\`user\`:\`User\` {idField: apoc.create.uuid(),name:$data.name,birthday: datetime($data.birthday),uniqueString:$data.uniqueString,indexedInt:$data.indexedInt,extensionString:$data.extensionString})
    RETURN \`user\` { .idField , .indexedInt , .name , .uniqueString , .extensionString ,birthday: { year: \`user\`.birthday.year , month: \`user\`.birthday.month , day: \`user\`.birthday.day }} AS \`user\`
  `,
    expectedParams = {
      first: -1,
      offset: 0,
      data: {
        name: 'Michael',
        uniqueString: 'abc',
        extensionString: 'xyz',
        birthday: {
          year: {
            low: 1987,
            high: 0
          },
          month: {
            low: 9,
            high: 0
          },
          day: {
            low: 3,
            high: 0
          },
          hour: {
            low: 1,
            high: 0
          }
        },
        indexedInt: {
          low: 33,
          high: 0
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

test('Update node mutation using data input object argument', t => {
  const graphQLQuery = `mutation {
    UpdateUser(
      where: {
        idField_not: null
        indexedInt_in: [11, 33, 1]
      }
      data: {
        name: "Michael",
        indexedInt: 34
        birthday: {
          year: 2020
          month: 10
          day: 30
          hour: 2
        }
      }
    ) {
      idField
      name
      indexedInt
      birthday {
        year
        month
        day
      }
    }
  }
  `,
    expectedCypherQuery = `MATCH (\`user\`:\`User\`) WHERE ($where._idField_not_null = TRUE AND EXISTS(\`user\`.idField)) AND (\`user\`.indexedInt IN $where.indexedInt_in) 
SET \`user\` += {name:$data.name,birthday: datetime($data.birthday),indexedInt:$data.indexedInt} 
RETURN \`user\` { .idField , .name , .indexedInt ,birthday: { year: \`user\`.birthday.year , month: \`user\`.birthday.month , day: \`user\`.birthday.day }} AS \`user\``,
    expectedParams = {
      where: {
        _idField_not_null: true,
        indexedInt_in: [
          {
            low: 11,
            high: 0
          },
          {
            low: 33,
            high: 0
          },
          {
            low: 1,
            high: 0
          }
        ]
      },
      data: {
        name: 'Michael',
        birthday: {
          year: {
            low: 2020,
            high: 0
          },
          month: {
            low: 10,
            high: 0
          },
          day: {
            low: 30,
            high: 0
          },
          hour: {
            low: 2,
            high: 0
          }
        },
        indexedInt: {
          low: 34,
          high: 0
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

test('Delete node mutation using data input object argument', t => {
  const graphQLQuery = `mutation {
    DeleteUser(
      where: {
        idField_not: null
        indexedInt_in: [11, 34, 33]
      }
    ) {
      idField
      name
      indexedInt
      birthday {
        year
        month
        day
      }
    }
  }
  `,
    expectedCypherQuery = `MATCH (\`user\`:\`User\`) WHERE ($where._idField_not_null = TRUE AND EXISTS(\`user\`.idField)) AND (\`user\`.indexedInt IN $where.indexedInt_in) 
WITH \`user\` AS \`user_toDelete\`, \`user\` { .idField , .name , .indexedInt ,birthday: { year: \`user\`.birthday.year , month: \`user\`.birthday.month , day: \`user\`.birthday.day }} AS \`user\`
DETACH DELETE \`user_toDelete\`
RETURN \`user\``,
    expectedParams = {
      where: {
        _idField_not_null: true,
        indexedInt_in: [
          {
            low: 11,
            high: 0
          },
          {
            low: 34,
            high: 0
          },
          {
            low: 33,
            high: 0
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

test('Merge node mutation using data input object argument (creating with .where @id value)', t => {
  const graphQLQuery = `mutation {
    MergeUser(
      where: {
        idField: "A"
        indexedInt: 33
      }
      data: {
        indexedInt: 33
        uniqueString: "abc"
        name: "Michael"
        extensionString: "xyz"
        birthday: { year: 1987, month: 9, day: 3, hour: 1 }
      }
    ) {
      idField
      indexedInt
      name
      birthday {
        year
        month
        day
      }
    }
  }  
  `,
    expectedCypherQuery = `MERGE (\`user\`:\`User\`{idField:$where.idField,indexedInt:$where.indexedInt})
ON CREATE
  SET \`user\` += {name:$data.name,birthday: datetime($data.birthday),uniqueString:$data.uniqueString,indexedInt:$data.indexedInt,extensionString:$data.extensionString}
ON MATCH
  SET \`user\` += {name:$data.name,birthday: datetime($data.birthday),uniqueString:$data.uniqueString,indexedInt:$data.indexedInt,extensionString:$data.extensionString} RETURN \`user\` { .idField , .indexedInt , .name ,birthday: { year: \`user\`.birthday.year , month: \`user\`.birthday.month , day: \`user\`.birthday.day }} AS \`user\``,
    expectedParams = {
      where: {
        idField: 'A',
        indexedInt: {
          low: 33,
          high: 0
        }
      },
      data: {
        name: 'Michael',
        birthday: {
          year: {
            low: 1987,
            high: 0
          },
          month: {
            low: 9,
            high: 0
          },
          day: {
            low: 3,
            high: 0
          },
          hour: {
            low: 1,
            high: 0
          }
        },
        uniqueString: 'abc',
        indexedInt: {
          low: 33,
          high: 0
        },
        extensionString: 'xyz'
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

test('Merge node mutation using data input object argument (creating with .data @id value)', t => {
  const graphQLQuery = `mutation {
    MergeUser(
      where: {
        indexedInt: 33
      }
      data: {
        idField: "A"
        indexedInt: 33
        uniqueString: "abc"
        name: "Michael"
        extensionString: "xyz"
        birthday: { year: 1987, month: 9, day: 3, hour: 1 }
      }
    ) {
      idField
      indexedInt
      name
      birthday {
        year
        month
        day
      }
    }
  }  
  `,
    expectedCypherQuery = `MERGE (\`user\`:\`User\`{indexedInt:$where.indexedInt})
ON CREATE
  SET \`user\` += {idField:$data.idField,name:$data.name,birthday: datetime($data.birthday),uniqueString:$data.uniqueString,indexedInt:$data.indexedInt,extensionString:$data.extensionString}
ON MATCH
  SET \`user\` += {idField:$data.idField,name:$data.name,birthday: datetime($data.birthday),uniqueString:$data.uniqueString,indexedInt:$data.indexedInt,extensionString:$data.extensionString} RETURN \`user\` { .idField , .indexedInt , .name ,birthday: { year: \`user\`.birthday.year , month: \`user\`.birthday.month , day: \`user\`.birthday.day }} AS \`user\``,
    expectedParams = {
      where: {
        indexedInt: {
          low: 33,
          high: 0
        }
      },
      data: {
        idField: 'A',
        name: 'Michael',
        birthday: {
          year: {
            low: 1987,
            high: 0
          },
          month: {
            low: 9,
            high: 0
          },
          day: {
            low: 3,
            high: 0
          },
          hour: {
            low: 1,
            high: 0
          }
        },
        uniqueString: 'abc',
        indexedInt: {
          low: 33,
          high: 0
        },
        extensionString: 'xyz'
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

test('Merge node mutation using multiple keys, generated @id property, and query variables (generating @id value)', t => {
  const graphQLQuery = `mutation MergeUser($where: _UserKeys!, $data: _UserCreate!) {
    MergeUser(
      where: $where,
      data: $data
    ) {
      idField # ON CREATE: generated using apoc.create.uuid()
      indexedInt
      name
      names
      uniqueString
      extensionString
      birthday {
        year
        month
        day
      }
    }
  }
  `,
    graphqlParams = {
      where: {
        // Generated ON CREATE if no value provided for @id key
        // "idField": "123",
        // @unique key field
        uniqueString: 'abc',
        // @index key field
        indexedInt: 33
      },
      data: {
        // keys to set on create or match
        uniqueString: 'abc',
        indexedInt: 33,
        // optional
        name: 'Michael',
        birthday: { year: 1987, month: 9, day: 3, hour: 1 },
        names: ['A', 'B'],
        // required (non-null)
        extensionString: 'xyz'
      }
    },
    expectedCypherQuery = `MERGE (\`user\`:\`User\`{uniqueString:$where.uniqueString,indexedInt:$where.indexedInt})
ON CREATE
  SET \`user\` += {name:$data.name,names:$data.names,birthday: datetime($data.birthday),uniqueString:$data.uniqueString,indexedInt:$data.indexedInt,extensionString:$data.extensionString,idField: apoc.create.uuid()}
ON MATCH
  SET \`user\` += {name:$data.name,names:$data.names,birthday: datetime($data.birthday),uniqueString:$data.uniqueString,indexedInt:$data.indexedInt,extensionString:$data.extensionString} RETURN \`user\` { .idField , .indexedInt , .name , .names , .uniqueString , .extensionString ,birthday: { year: \`user\`.birthday.year , month: \`user\`.birthday.month , day: \`user\`.birthday.day }} AS \`user\``,
    expectedParams = {
      where: {
        uniqueString: 'abc',
        indexedInt: {
          low: 33,
          high: 0
        }
      },
      data: {
        name: 'Michael',
        names: ['A', 'B'],
        birthday: {
          year: {
            low: 1987,
            high: 0
          },
          month: {
            low: 9,
            high: 0
          },
          day: {
            low: 3,
            high: 0
          },
          hour: {
            low: 1,
            high: 0
          }
        },
        uniqueString: 'abc',
        indexedInt: {
          low: 33,
          high: 0
        },
        extensionString: 'xyz'
      }
    };

  t.plan(4);
  return Promise.all([
    cypherTestRunner(
      t,
      graphQLQuery,
      graphqlParams,
      expectedCypherQuery,
      expectedParams
    ),
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      graphqlParams,
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('Add relationship mutation using complex node selection arguments', t => {
  const graphQLQuery = `mutation {
    AddUserRated(
      user: {
        indexedInt_in: [33]
      }
      movie: {
        title_not: "B"
      }
      data: {
        rating: 10
      }
    ) {
      user {
        idField
        indexedInt
        name
      }
      movie {
        id
        title
      }
    }
  }  
  `,
    expectedCypherQuery = `
      MATCH (\`user_user\`:\`User\`) WHERE (\`user_user\`.indexedInt IN $user.indexedInt_in) 
      MATCH (\`movie_movie\`:\`Movie\`) WHERE (NOT \`movie_movie\`.title =  $movie.title_not) 
      CREATE (\`user_user\`)-[\`rating_relation\`:\`RATING\` {rating:$data.rating}]->(\`movie_movie\`)
      RETURN \`rating_relation\` { user: \`user_user\` { .idField , .indexedInt , .name } ,movie: \`movie_movie\` { .id , .title }  } AS \`_AddUserRatedPayload\`;
    `,
    expectedParams = {
      user: {
        indexedInt_in: [
          {
            low: 33,
            high: 0
          }
        ]
      },
      movie: {
        title_not: 'B'
      },
      data: {
        rating: {
          low: 10,
          high: 0
        }
      },
      first: -1,
      offset: 0
    };
  t.plan(2);
  return Promise.all([
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('Update relationship mutation using complex node selection arguments', t => {
  const graphQLQuery = `mutation {
    UpdateUserRated(
      user: {
        indexedInt_in: [33]
      }
      movie: {
        title: "A"
      }
      data: {
        rating: 5
      }
    ) {
      user {
        idField
        indexedInt
        name
      }
      movie {
        id
        title
      }
    }
  }  
  `,
    expectedCypherQuery = `
      MATCH (\`user_user\`:\`User\`) WHERE (\`user_user\`.indexedInt IN $user.indexedInt_in) 
      MATCH (\`movie_movie\`:\`Movie\`) WHERE (\`movie_movie\`.title = $movie.title) 
      MATCH (\`user_user\`)-[\`rating_relation\`:\`RATING\`]->(\`movie_movie\`)
      SET \`rating_relation\` += {rating:$data.rating} 
      RETURN \`rating_relation\` { user: \`user_user\` { .idField , .indexedInt , .name } ,movie: \`movie_movie\` { .id , .title }  } AS \`_UpdateUserRatedPayload\`;
    `,
    expectedParams = {
      user: {
        indexedInt_in: [
          {
            low: 33,
            high: 0
          }
        ]
      },
      movie: {
        title: 'A'
      },
      data: {
        rating: {
          low: 5,
          high: 0
        }
      },
      first: -1,
      offset: 0
    };
  t.plan(2);
  return Promise.all([
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('Remove relationship mutation using complex node selection arguments', t => {
  const graphQLQuery = `mutation {
    RemoveUserRated(
      user: {
        indexedInt_in: [33]
      }
      movie: {
        title_not: "B"
      }
    ) {
      user {
        idField
        indexedInt
        name
      }
      movie {
        id
        title
      }
    }
  }  
  `,
    expectedCypherQuery = `
      MATCH (\`user_user\`:\`User\`) WHERE (\`user_user\`.indexedInt IN $user.indexedInt_in) 
      MATCH (\`movie_movie\`:\`Movie\`) WHERE (NOT \`movie_movie\`.title =  $movie.title_not) 
      OPTIONAL MATCH (\`user_user\`)-[\`user_usermovie_movie\`:\`RATING\`]->(\`movie_movie\`)
      DELETE \`user_usermovie_movie\`
      WITH COUNT(*) AS scope, \`user_user\` AS \`_user_user\`, \`movie_movie\` AS \`_movie_movie\`
      RETURN {user: \`_user_user\` { .idField , .indexedInt , .name } ,movie: \`_movie_movie\` { .id , .title } } AS \`_RemoveUserRatedPayload\`;
    `,
    expectedParams = {
      user: {
        indexedInt_in: [
          {
            low: 33,
            high: 0
          }
        ]
      },
      movie: {
        title_not: 'B'
      },
      first: -1,
      offset: 0
    };
  t.plan(2);
  return Promise.all([
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});

test('Merge relationship mutation using complex node selection arguments', t => {
  const graphQLQuery = `mutation {
    MergeUserRated(
      user: {
        indexedInt_in: [33]
      }
      movie: {
        title: "A"
      }
      data: {
        rating: 5
      }
    ) {
      user {
        idField
        indexedInt
        name
      }
      movie {
        id
        title
      }
    }
  }
  `,
    expectedCypherQuery = `
      MATCH (\`user_user\`:\`User\`) WHERE (\`user_user\`.indexedInt IN $user.indexedInt_in) 
      MATCH (\`movie_movie\`:\`Movie\`) WHERE (\`movie_movie\`.title = $movie.title) 
      MERGE (\`user_user\`)-[\`rating_relation\`:\`RATING\`]->(\`movie_movie\`)
      SET \`rating_relation\` += {rating:$data.rating} 
      RETURN \`rating_relation\` { user: \`user_user\` { .idField , .indexedInt , .name } ,movie: \`movie_movie\` { .id , .title }  } AS \`_MergeUserRatedPayload\`;
    `,
    expectedParams = {
      user: {
        indexedInt_in: [
          {
            low: 33,
            high: 0
          }
        ]
      },
      movie: {
        title: 'A'
      },
      data: {
        rating: {
          low: 5,
          high: 0
        }
      },
      first: -1,
      offset: 0
    };
  t.plan(2);
  return Promise.all([
    augmentedSchemaCypherTestRunner(
      t,
      graphQLQuery,
      {},
      expectedCypherQuery,
      expectedParams
    )
  ]);
});
