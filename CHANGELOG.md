# Changelog

## 2.14.4

- [Fix for missing results with some queries using nested filtering](https://github.com/neo4j-graphql/neo4j-graphql-js/pull/469)
- [Use \_RelationDirections enum for relationship directions in inferSchema](https://github.com/neo4j-graphql/neo4j-graphql-js/commit/c9b8b1af65ea751d060be79f8ab9d521577968de)

## 2.14.3

- [Add initial support for bookmarks](https://github.com/neo4j-graphql/neo4j-graphql-js/pull/460)
- [Improvements to temporal and spatial identity filters](https://github.com/neo4j-graphql/neo4j-graphql-js/pull/466)
- [Fix for issue with using relationship types with federated entities](https://github.com/neo4j-graphql/neo4j-graphql-js/pull/441)

## 2.14.2

- [Fix for missing apollo-server dependency with apollo-server-lambda](https://github.com/neo4j-graphql/neo4j-graphql-js/pull/439)

## 2.14.1

- [Fix for inferSchema potentially generating invalid GraphQL type definitions](https://github.com/neo4j-graphql/neo4j-graphql-js/commit/19b576ffef6a09f435389d096c59c8f387b586c7)

## 2.14.0

- [Apollo Federation support](https://github.com/neo4j-graphql/neo4j-graphql-js/pull/418)
- [Improvements to handling of type extensions](https://github.com/neo4j-graphql/neo4j-graphql-js/pull/418)
- [Add Apollo Federation and Gateway example](https://github.com/neo4j-graphql/neo4j-graphql-js/blob/master/example/apollo-federation/gateway.js)
- [Improve handling of nested fragments](https://github.com/neo4j-graphql/neo4j-graphql-js/pull/415)
- [Allow overriding of graphql-auth-directives](https://github.com/neo4j-graphql/neo4j-graphql-js/pull/417)
- [Add database option to inferSchema config](https://github.com/neo4j-graphql/neo4j-graphql-js/commit/69b4c8e4bca435faf0b465da335f181392265bc4)

## 2.13.0

- [Translating fragments on interface types](https://github.com/neo4j-graphql/neo4j-graphql-js/pull/394)
- [Initial support for union types](https://github.com/neo4j-graphql/neo4j-graphql-js/pull/397)
- [Generated pagination for union type fields](https://github.com/neo4j-graphql/neo4j-graphql-js/pull/398)
- [Bump graphql-auth-directives version](https://github.com/neo4j-graphql/neo4j-graphql-js/commit/dbff65b0e7e947c1ba722f7edc2a03bd26608f03)
- [Use latest APOC release in integration tests](https://github.com/neo4j-graphql/neo4j-graphql-js/commit/677d7d3a925f45fb96ae01ba4208357011b3d48e)

## 2.12.1

- [Fix nested fragments on relations](https://github.com/neo4j-graphql/neo4j-graphql-js/pull/385)

## 2.12.0

- [Add support for Neo4j multi-database](https://github.com/neo4j-graphql/neo4j-graphql-js/commit/fd557123667ab11c4c97fdf1d05c6861def5651b)
- [Fix fragments on interfaced relational fields](https://github.com/neo4j-graphql/neo4j-graphql-js/pull/377)

## 2.11.5

- [Add relation mutations for interfaced types](https://github.com/neo4j-graphql/neo4j-graphql-js/pull/374)

## 2.11.4

- [Fix for nested ordering fields with underscores](https://github.com/neo4j-graphql/neo4j-graphql-js/commit/b422f3bbef4ffe1a243193d5d1662313625e54c4)

## 2.11.3

- [Fixes for augmentation tests](https://github.com/neo4j-graphql/neo4j-graphql-js/pull/371)
- [Fix null-access for null string/ID values.](https://github.com/neo4j-graphql/neo4j-graphql-js/pull/368)
- [Fix for nested filtering](https://github.com/neo4j-graphql/neo4j-graphql-js/pull/372)

## 2.11.2

- [Fix #295 Querying interface @relation fields with non-unique relationship names](https://github.com/neo4j-graphql/neo4j-graphql-js/pull/366)
- [Update driver user agent](https://github.com/neo4j-graphql/neo4j-graphql-js/commit/5a2e52ecb604483a7aa10383340fd95cdd581f26)

## 2.11.1

- [Fix #361 Merge node should add interface label](https://github.com/neo4j-graphql/neo4j-graphql-js/pull/365)
- [Fix #349 Interfaces with no scalar fields generate invalid schemas](https://github.com/neo4j-graphql/neo4j-graphql-js/pull/365)

## 2.11.0

- [Fix for \_id field on generated ordering types](https://github.com/neo4j-graphql/neo4j-graphql-js/pull/360)
- [Initial support for Neo4j v4.0](https://github.com/neo4j-graphql/neo4j-graphql-js/pull/363)

_Note: Multi-database support is not exposed via neo4j-graphql.js in this release, only the default database can be used with neo4j-graphql.js. Multi-database support will be addressed in a future release._

## 2.10.2

- [Fix for custom cypher fields of interface type](https://github.com/neo4j-graphql/neo4j-graphql-js/pull/356)
- [Add support for Point type to inferSchema](https://github.com/neo4j-graphql/neo4j-graphql-js/commit/e8a86b037c362e97ccc75b05f5ced2e8666cadfb)

## 2.10.1

- [Use debug environment variable for inferSchema console info level](https://github.com/neo4j-graphql/neo4j-graphql-js/commit/5d72f5a4325cad2d3d5fb4f6a8ec7b66e843d6ba)

## 2.10.0

- [MERGE operation support](https://github.com/neo4j-graphql/neo4j-graphql-js/pull/355)

## 2.9.3

- [Stringify Cypher parameters object in debug output](https://github.com/neo4j-graphql/neo4j-graphql-js/commit/b06f9b1b50fc20c9cb66ab536f97c7a5b31dd13c)

## 2.9.2

- [Use Float for Point fields](https://github.com/neo4j-graphql/neo4j-graphql-js/commit/cca0f40232a1d99f4ea1679433941a9c649790dd)

## 2.9.1

- [Fix for querying fields of different interface types](https://github.com/neo4j-graphql/neo4j-graphql-js/pull/348)

## 2.9.0

- [Initial spatial support using Point type ](https://github.com/neo4j-graphql/neo4j-graphql-js/pull/334)
- [Spatial filters](https://github.com/neo4j-graphql/neo4j-graphql-js/pull/341)
- [Fixes for generated schema type and default config](https://github.com/neo4j-graphql/neo4j-graphql-js/pull/339)
- [Interface handling: generate queries for interface types + FRAGMENT_TYPE fix](https://github.com/neo4j-graphql/neo4j-graphql-js/pull/336)
- [Fixes for incorrect and non-existing hasScope directives](https://github.com/neo4j-graphql/neo4j-graphql-js/pull/345)
- [Duplicate query argument fix](https://github.com/neo4j-graphql/neo4j-graphql-js/pull/332)

## 2.8.0

- [Schema augmentation refactor](https://github.com/neo4j-graphql/neo4j-graphql-js/pull/322)
- [Carry non-fragment fields into the result for a fragment](https://github.com/neo4j-graphql/neo4j-graphql-js/pull/299)
- [Integration test updates](https://github.com/neo4j-graphql/neo4j-graphql-js/pull/300)
- [Fix for incorrect behavior in filters](https://github.com/neo4j-graphql/neo4j-graphql-js/pull/330)
- [Fix bug where Camel/Pascal cased variables were broken in filters](https://github.com/neo4j-graphql/neo4j-graphql-js/pull/325)

## 2.7.2

- [add FRAGMENT_TYPE when customQuery and customMutation resolve interfaces](https://github.com/neo4j-graphql/neo4j-graphql-js/pull/296)
- [fix: do not assign undefined to x_filter keys](https://github.com/neo4j-graphql/neo4j-graphql-js/pull/281)

## 2.7.1

- [Fix interface query bug](https://github.com/neo4j-graphql/neo4j-graphql-js/pull/291)

## 2.7.0

- [Fix: Handle multiple inline fragments](https://github.com/neo4j-graphql/neo4j-graphql-js/pull/270)
- [Initial support for federated schema](https://github.com/neo4j-graphql/neo4j-graphql-js/pull/283)
- [Support for multi-tenancy using additional labels](https://github.com/neo4j-graphql/neo4j-graphql-js/pull/282)

## 2.6.3

- [Fix: Improper handling of properties with underscores in filter](https://github.com/neo4j-graphql/neo4j-graphql-js/pull/264)

## 2.6.2

- [Improve order by performance](https://github.com/neo4j-graphql/neo4j-graphql-js/pull/247)
- [Restructure test files](https://github.com/neo4j-graphql/neo4j-graphql-js/pull/253)

## 2.6.1

- [Temporal and relationship type filters](https://github.com/neo4j-graphql/neo4j-graphql-js/pull/245)
- [bugfix: custom mutation cypher params not being passed](https://github.com/neo4j-graphql/neo4j-graphql-js/pull/246)

## 2.6.0

- [Infer GraphQL type definitions from existing Neo4j database](https://github.com/neo4j-graphql/neo4j-graphql-js/pull/223). See [`inferSchema` in API docs.](https://grandstack.io/docs/neo4j-graphql-js-api.html#inferschemadriver-options-promise)

## 2.5.0

- [Initial support for generated filter argument](https://github.com/neo4j-graphql/neo4j-graphql-js/pull/228)
- Don't include `SKIP` clause in the generated Cypher query if no `offset` parameter is specified.
- Dependency updates.

## 2.4.2

- [Fix for querying interface type when no fragment is specified](https://github.com/neo4j-graphql/neo4j-graphql-js/pull/210)
- [Fix for `@cypher` directive input type argument parameters](https://github.com/neo4j-graphql/neo4j-graphql-js/pull/213)

## 2.4.1

- [Fix for `@cypher` directive field parameters](https://github.com/neo4j-graphql/neo4j-graphql-js/pull/207)

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
