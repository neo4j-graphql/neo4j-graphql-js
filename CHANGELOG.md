# Changelog

## v1.0.3

- [Support for reflexive relationship types. #125](https://github.com/neo4j-graphql/neo4j-graphql-js/pull/125)
- [Fix #113 Don't drop non-Query/Mutation resolvers passed into makeAugmentedExecutableSchema](https://github.com/neo4j-graphql/neo4j-graphql-js/issues/113)
- [Fix #124 Basic schema with non nullable property gives error when calling mutation](https://github.com/neo4j-graphql/neo4j-graphql-js/issues/124)
- [return better error message in case name or direction haven't been specified into the directive](https://github.com/neo4j-graphql/neo4j-graphql-js/commit/63f66acfd989972c0ed2fc8797579b468cd3dab8)

## v1.0.2

- Improvements to InlineFragment handling. [#115](https://github.com/neo4j-graphql/neo4j-graphql-js/pull/115) and [#114](https://github.com/neo4j-graphql/neo4j-graphql-js/pull/114)

## v1.0.1

- [Initial support for InlineFragments - See #103](https://github.com/neo4j-graphql/neo4j-graphql-js/issues/103)

## v1.0.0

- [Support for relation types with managed directional fields from and to, along with an optional @relation type directive](https://github.com/neo4j-graphql/neo4j-graphql-js/pull/108)
- [Auto-generate value for ID field if not specified in create mutation](https://github.com/neo4j-graphql/neo4j-graphql-js/pull/111)
- [Include custom scalars in the arguments of generated mutations](https://github.com/neo4j-graphql/neo4j-graphql-js/pull/111)

## v0.2.1

- [Use underscore instead of dash for nested query variables - Fixes #106](https://github.com/neo4j-graphql/neo4j-graphql-js/pull/107)

## v0.2.0

- [Create augmented schema from type definitions only (no initial schema object required)](https://github.com/neo4j-graphql/neo4j-graphql-js/pull/99)

## v0.1.33

- [Updates to augmentSchema](https://github.com/neo4j-graphql/neo4j-graphql-js/pull/94)

## v0.1.32

- [Don't use rc version of graphql-js](https://github.com/neo4j-graphql/neo4j-graphql-js/commit/b8a0a7f6a7698ac4c83690ed8950bca892d11c93)

## v0.1.31

- Augment schema refactor [#84](https://github.com/neo4j-graphql/neo4j-graphql-js/pull/84)

## v0.1.30

- [Add update, delete, and remove relationship mutations](https://github.com/neo4j-graphql/neo4j-graphql-js/commit/e3d297fb739577172c0dac067ca3d08acbcafa2e)
- [Update debug NPM script](https://github.com/neo4j-graphql/neo4j-graphql-js/commit/a0dee6ad88242e89d1a93899440a1d75ef500659)
- Add code coverage reporting
- add top level orderBy tests

## v0.1.29

- Bugfix: Recursively extract fragment selections [#78](https://github.com/neo4j-graphql/neo4j-graphql-js/pull/78)
- Bugfix: Extract selections from fragments on relations [#79](https://github.com/neo4j-graphql/neo4j-graphql-js/pull/79)

## ...
