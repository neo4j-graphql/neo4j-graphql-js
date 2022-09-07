# GraphQL Spatial Types

> Neo4j currently supports the spatial `Point` type, which can represent both 2D (such as latitude and longitude) and 3D (such as x,y,z or latitude, longitude, height) points. Read more about the [Point type](https://neo4j.com/docs/cypher-manual/3.5/syntax/spatial/) and associated [functions, such as the index-backed distance function](https://neo4j.com/docs/cypher-manual/current/functions/spatial/) in the Neo4j docs.

## Spatial `Point` type in SDL

neo4j-graphql.js makes available the `Point` type for use in your GraphQL type definitions. You can use it like this:

```graphql
type Business {
  id: ID!
  name: String
  location: Point
}
```

The GraphQL [schema augmentation process](graphql-schema-generation-augmentation.mdx) will translate the `location` field to a `_Neo4jPoint` type in the augmented schema.

## Using `Point` In Queries

The `Point` object type exposes the following fields that can be used in the query selection set:

- `x`: `Float`
- `y`: `Float`
- `z`: `Float`
- `longitude`: `Float`
- `latitude`: `Float`
- `height`: `Float`
- `crs`: `String`
- `srid`: `Int`

For example:

_GraphQL query_

```graphql
query {
  Business(first: 2) {
    name
    location {
      latitude
      longitude
    }
  }
}
```

_GraphQL result_

```json
{
  "data": {
    "Business": [
      {
        "name": "Missoula Public Library",
        "location": {
          "latitude": 46.870035,
          "longitude": -113.990976
        }
      },
      {
        "name": "Ninja Mike's",
        "location": {
          "latitude": 46.874029,
          "longitude": -113.995057
        }
      }
    ]
  }
}
```

### `Point` Query Arguments

As part of the GraphQL [schema augmentation process](graphql-schema-generation-augmentation.mdx) point input types are added to the schema and can be used as field arguments. For example if I wanted to find businesses with exact values of longitude and latitude:

_GraphQL query_

```graphql
query {
  Business(location: { latitude: 46.870035, longitude: -113.990976 }) {
    name
    location {
      latitude
      longitude
    }
  }
}
```

_GraphQL result_

```json
{
  "data": {
    "Business": [
      {
        "name": "Missoula Public Library",
        "location": {
          "latitude": 46.870035,
          "longitude": -113.990976
        }
      }
    ]
  }
}
```

However, with Point data the auto-generated filters are likely to be more useful, especially when we consider arbitrary precision.

### `Point` Query Filter

When querying using point data, often we want to find things that are close to other things. For example, what businesses are within 1.5km of me? We can accomplish this using the [auto-generated filter argument](graphql-filtering.mdx). For example:

_GraphQL query_

```graphql
{
  Business(
    filter: {
      location_distance_lt: {
        point: { latitude: 46.859924, longitude: -113.985402 }
        distance: 1500
      }
    }
  ) {
    name
    location {
      latitude
      longitude
    }
  }
}
```

_GraphQL result_

```json
{
  "data": {
    "Business": [
      {
        "name": "Missoula Public Library",
        "location": {
          "latitude": 46.870035,
          "longitude": -113.990976
        }
      },
      {
        "name": "Market on Front",
        "location": {
          "latitude": 46.869824,
          "longitude": -113.993633
        }
      }
    ]
  }
}
```

For points using the Geographic coordinate reference system (latitude and longitude) `distance` is measured in meters.

## Using `Point` In Mutations

The schema augmentation process adds mutations for creating, updating, and deleting nodes and relationships, including for setting values for `Point` fields using the `_Neo4jPointInput` type.

For example, to create a new Business node and set the value of the location field:

```graphql
mutation {
  CreateBusiness(
    name: "University of Montana"
    location: { latitude: 46.859924, longitude: -113.985402 }
  ) {
    name
  }
}
```

Note that not all fields of the `_Neo4jPointInput` type need to specified. In general, you have the choice of:

- **Fields (latitude,longitude or x,y)** If the coordinate is specified using the fields `latitude` and `longitude` then the Geographic coordinate reference system will be used. If instead `x` and `y` fields are used then the coordinate reference system would be Cartesian.
- **Number of dimensions** You can specify `height` along with `longitude` and `latitude` for 3D, or `z` along with `x` and `y`.

See the [Neo4j Cypher docs for more details](https://neo4j.com/docs/cypher-manual/current/syntax/spatial/#cypher-spatial-specifying-spatial-instants) on the spatial point type.

## Resources

- Blog post: [Working With Spatial Data In Neo4j GraphQL In The Cloud](https://blog.grandstack.io/working-with-spatial-data-in-neo4j-graphql-in-the-cloud-eee2bf1afad) - Serverless GraphQL, Neo4j Aura, and GRANDstack
