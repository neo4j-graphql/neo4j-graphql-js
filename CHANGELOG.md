# Changelog

## 2.4.1

-[Fix for `@cypher` directive field parameters](https://github.com/neo4j-graphql/neo4j-graphql-js/pull/207)

## 2.4.0

- [Support for authorization schema directives via graphql-auth-directives](https://www.npmjs.com/package/graphql-auth-directives)
- [Pass context data to Cypher params](https://github.com/neo4j-graphql/neo4j-graphql-js/issues/187)
- [Fix for scalar payloads on Cypher directive fields](https://github.com/neo4j-graphql/neo4j-graphql-js/issues/145)
- [Fix for input type arguments on Cypher directive fields](https://github.com/neo4j-graphql/neo4j-graphql-js/issues/192)

## 2.3.1

- [Remove functionality to infer addition of neo4j_ignore directive](https://github.com/neo4j-graphql/neo4j-graphql-js/commit/4d3ef38a5756ef14bec1cdbbfb5ecb7b6455d4c6)

## 2.3.0

- [Fixes nested ordering](https://github.com/neo4j-graphql/neo4j-graphql-js/issues/47)
- [Ordering by temporal type](https://github.com/neo4j-graphql/neo4j-graphql-js/issues/162)
- [Support ordering by enum type](https://github.com/neo4j-graphql/neo4j-graphql-js/issues/168)
- [Fix call stack size exceeded with large schemas](https://github.com/neo4j-graphql/neo4j-graphql-js/issues/172)
- [Fix customer Cypher query on root query field with no arguments throws error](https://github.com/neo4j-graphql/neo4j-graphql-js/issues/177)
- [Support arrays of orderBy arguments](https://github.com/neo4j-graphql/neo4j-graphql-js/pull/184)
- [Ignoring fields with neo4j_ignore directive](https://github.com/neo4j-graphql/neo4j-graphql-js/pull/183)
- [Don't exclude first, offset, orderBy params from Cypher directives](https://github.com/neo4j-graphql/neo4j-graphql-js/issues/58)
- [Use Neo4j driver transaction functions](https://github.com/neo4j-graphql/neo4j-graphql-js/commit/1fbc747ec090e538f61f192f77749eb7f1aa878a)

## 2.2.0

- [Add debug config option to disable logging](https://github.com/neo4j-graphql/neo4j-graphql-js/pull/170)

## 2.1.1

- [Support for array (sub)query parameters](https://github.com/neo4j-graphql/neo4j-graphql-js/pull/163)
- [Fix breaks interfaces with non-null fields](https://github.com/neo4j-graphql/neo4j-graphql-js/pull/167)

## 2.1.0

- [Support for temporal fields on relationships](https://github.com/neo4j-graphql/neo4j-graphql-js/pull/161)
- [Scalar and temporal list fields](https://github.com/neo4j-graphql/neo4j-graphql-js/pull/161)
- [Fix Adding ! to a DateTime Field, throws an error](https://github.com/neo4j-graphql/neo4j-graphql-js/issues/158)

## v2.0.1

- [Fix for temporal field query arguments](https://github.com/neo4j-graphql/neo4j-graphql-js/pull/155)
- [Fix error in extractTypeMapFromTypeDefs](https://github.com/neo4j-graphql/neo4j-graphql-js/pull/154)

## v2.0.0

- [Add initial support for temporal types](https://github.com/neo4j-graphql/neo4j-graphql-js/pull/151)
- [Upgrade to v14 of graphql-js](https://github.com/neo4j-graphql/neo4j-graphql-js/commit/862553a852e9f0eecef1d1264d9ab0ed49544dba)
- [Query escaping and safety](https://github.com/neo4j-graphql/neo4j-graphql-js/pull/146)

## v1.0.5

- [Allow for configuration of schema augmentation process](https://github.com/neo4j-graphql/neo4j-graphql-js/pull/131)
- [Support for graphql.js v14.x](https://github.com/neo4j-graphql/neo4j-graphql-js/pull/129)

## v1.0.4

- [Fix #126, default resolvers object](https://github.com/neo4j-graphql/neo4j-graphql-js/pull/127)

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
