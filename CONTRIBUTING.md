# Contributing

Thanks so much for thinking of contributing to `neo4j-graphql-js`, we really
appreciate it! :heart:

## Get in Touch

There's an active [mailing list](https://groups.google.com/forum/#!forum/neo4j)
and [Slack channel](https://neo4j.com/slack) where we work directly with the
community.
If you're not already a member, sign up!

We love our community and wouldn't be where we are without you.

## Getting Set Up

Clone the repository, install dependencies and build the project:

```
git clone git@github.com:neo4j-graphql/neo4j-graphql-js.git
cd neo4j-graphql-js
npm install
npm run build
```

### Testing

We use the `ava` test runner. Run the tests with:

```
npm run test
```

The `npm test` script will run unit tests that check GraphQL -> Cypher
translation and the schema augmentation features and can be easily run locally
without any extra dependencies.

Full integration tests can be found in `/test` and are
[run on CircleCI](https://circleci.com/gh/neo4j-graphql/neo4j-graphql-js) as
part of the CI process.

#### Integration Testing

If you want to run integration tests locally, make sure your setup meets the
following requirements:

- A local Neo4J instance with username `neo4j` and password `letmein`
- Your Neo4J instance runs on [this database](https://s3.amazonaws.com/neo4j-sandbox-usecase-datastores/v3_5/recommendations.db.zip)

In order to import the database, you can download the zipped files and extract
it to the databases folder of your Neo4J instance. Restart the database on the
new data.

Once you're done with that:

```
npm run start-middleware
# open another terminal and run
npm run parse-tck
npm run test-all
```

Note that `npm run test-all` will fail on consecutive runs! Some of the
integration tests create data and get in the way of other tests. Running the
whole test suite twice will result in some failing tests. There is [an issue
for it](https://github.com/neo4j-graphql/neo4j-graphql-js/issues/252), check if
it is still active. Your best option for now is to re-import the data after each
test run.

### Local Development

If you include this library inside your project and you want point the
dependency to the files on your local machine, you will probably run into the
following error:

```
Error: Cannot use GraphQLObjectType "Query" from another module or realm.

Ensure that there is only one instance of "graphql" in the node_modules
directory. If different versions of "graphql" are the dependencies of other
relied on modules, use "resolutions" to ensure only one version is installed.
```

This is because we currently don't have `graphql` as a peer dependency. See if
[this issue](https://github.com/neo4j-graphql/neo4j-graphql-js/issues/249) still
exists. Until this is fixed a possible workaround is to overwrite the target
folder of `npm run build`.

Open `package.json` and simply replace `dist/` with the path to the
`node_modules/` folder of your project:

```
{
  ...
  "scripts": {
    ...
    "build": "babel src --presets babel-preset-env --out-dir /path/to/your/projects/node_modules/",
    ..
  }
  ..
}

```

If you run `npm run build` now, it will be build right into your project and you
should not face the error above.

## Spread the love

If you want to merge back your changes into the main repository, it would be
best if you could [fork the repository](https://help.github.com/en/articles/fork-a-repo)
on Github. Add the fork as a separate remote, push your branch and create a pull
request:

```sh
git remote add your-fork git@github.com:your-username/neo4j-graphql-js.git
git push your-fork your-branch
# now go to Github and create a pull request
```

We :heart: you.
