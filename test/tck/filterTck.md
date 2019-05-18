## Filter Test TCK

```schema
type Query {
  person(filter: _PersonFilter): [Person]
  Company(filter: _CompanyFilter): [Company]
}
enum Gender {
  female
  male
}
type Person {
  id: ID!
  name: String
  age: Int
  height: Float
  fun: Boolean
  gender: Gender
  birthday: _Neo4jDateTime
  company(filter: _CompanyFilter): Company @relation(name: "WORKS_AT", direction: OUT)
  employmentHistory(filter: _PersonEmploymentHistoryFilter): [_PersonEmploymentHistory]
  knows: _PersonKnowsDirections
}
type _PersonEmploymentHistory @relation(name: "WORKED_AT", from: "Person", to: "Company") {
  role: String!
  start: _Neo4jDateTime!
  end: _Neo4jDateTime!
  Company: Company
}
type _PersonKnowsDirections @relation(name: "KNOWS", from: "Person", to: "Person") {
  from(filter: _PersonKnowsFilter): [_PersonKnows]
  to(filter: _PersonKnowsFilter): [_PersonKnows]
}
type _PersonKnows @relation(name: "KNOWS", from: "Person", to: "Person") {
  since: _Neo4jDateTime!
  Person: Person
}
input _PersonFilter {
  AND: [_PersonFilter!]
  OR: [_PersonFilter!]
  id: ID
  id_not: ID
  id_in: [ID!]
  id_not_in: [ID!]
  id_contains: ID
  id_not_contains: ID
  id_starts_with: ID
  id_not_starts_with: ID
  id_ends_with: ID
  id_not_ends_with: ID
  name: String
  name_not: String
  name_in: [String!]
  name_not_in: [String!]
  name_contains: String
  name_not_contains: String
  name_starts_with: String
  name_not_starts_with: String
  name_ends_with: String
  name_not_ends_with: String
  age: Int
  age_not: Int
  age_in: [Int!]
  age_not_in: [Int!]
  age_lt: Int
  age_lte: Int
  age_gt: Int
  age_gte: Int
  height: Float
  height_not: Float
  height_in: [Float!]
  height_not_in: [Float!]
  height_lt: Float
  height_lte: Float
  height_gt: Float
  height_gte: Float
  fun: Boolean
  fun_not: Boolean
  gender: Gender
  gender_not: Gender
  gender_in: [Gender!]
  gender_not_in: [Gender!]
  birthday: _Neo4jDateTimeInput
  birthday_not: _Neo4jDateTimeInput
  birthday_in: [_Neo4jDateTimeInput!]
  birthday_not_in: [_Neo4jDateTimeInput!]
  birthday_lt: _Neo4jDateTimeInput
  birthday_lte: _Neo4jDateTimeInput
  birthday_gt: _Neo4jDateTimeInput
  birthday_gte: _Neo4jDateTimeInput
  company: _CompanyFilter
  company_not: _CompanyFilter
  company_in: [_CompanyFilter!]
  company_not_in: [_CompanyFilter!]
  employmentHistory: _PersonEmploymentHistoryFilter
  employmentHistory_not: _PersonEmploymentHistoryFilter
  employmentHistory_in: [_PersonEmploymentHistoryFilter!]
  employmentHistory_not_in: [_PersonEmploymentHistoryFilter!]
  employmentHistory_some: _PersonEmploymentHistoryFilter
  employmentHistory_none: _PersonEmploymentHistoryFilter
  employmentHistory_single: _PersonEmploymentHistoryFilter
  employmentHistory_every: _PersonEmploymentHistoryFilter
  knows: _PersonKnowsDirectionsFilter
  knows_not: _PersonKnowsDirectionsFilter
  knows_in: [_PersonKnowsDirectionsFilter!]
  knows_not_in: [_PersonKnowsDirectionsFilter!]
  knows_some: _PersonKnowsDirectionsFilter
  knows_none: _PersonKnowsDirectionsFilter
  knows_single: _PersonKnowsDirectionsFilter
  knows_every: _PersonKnowsDirectionsFilter
}
input _PersonEmploymentHistoryFilter {
  AND: [_PersonEmploymentHistoryFilter!]
  OR: [_PersonEmploymentHistoryFilter!]
  role: String
  role_not: String
  role_in: [String!]
  role_not_in: [String!]
  role_contains: String
  role_not_contains: String
  role_starts_with: String
  role_not_starts_with: String
  role_ends_with: String
  role_not_ends_with: String
  start: _Neo4jDateTimeInput
  start_not: _Neo4jDateTimeInput
  start_in: [_Neo4jDateTimeInput!]
  start_not_in: [_Neo4jDateTimeInput!]
  start_lt: _Neo4jDateTimeInput
  start_lte: _Neo4jDateTimeInput
  start_gt: _Neo4jDateTimeInput
  start_gte: _Neo4jDateTimeInput
  end: _Neo4jDateTimeInput
  end_not: _Neo4jDateTimeInput
  end_in: [_Neo4jDateTimeInput!]
  end_not_in: [_Neo4jDateTimeInput!]
  end_lt: _Neo4jDateTimeInput
  end_lte: _Neo4jDateTimeInput
  end_gt: _Neo4jDateTimeInput
  end_gte: _Neo4jDateTimeInput
  Company: _CompanyFilter
}
input _PersonKnowsDirectionsFilter {
  from: _PersonKnowsFilter
  to: _PersonKnowsFilter
}
input _PersonKnowsFilter {
  AND: [_PersonKnowsFilter!]
  OR: [_PersonKnowsFilter!]
  since: _Neo4jDateTimeInput
  since_not: _Neo4jDateTimeInput
  since_in: [_Neo4jDateTimeInput!]
  since_not_in: [_Neo4jDateTimeInput!]
  since_lt: _Neo4jDateTimeInput
  since_lte: _Neo4jDateTimeInput
  since_gt: _Neo4jDateTimeInput
  since_gte: _Neo4jDateTimeInput
  Person: _PersonFilter
}
type Company {
  name: String!
  founded: _Neo4jDateTime
  employees(filter: _PersonFilter): [Person] @relation(name: "WORKS_AT", direction: IN)
  employeeHistory(filter: _CompanyEmploymentHistoryFilter): [_CompanyEmployeeHistory]
}
type _CompanyEmployeeHistory @relation(name: "WORKED_AT", from: "Person", to: "Company") {
  role: String!
  start: _Neo4jDateTime!
  end: _Neo4jDateTime!
  Person: Person
}
input _CompanyFilter {
  AND: [_CompanyFilter!]
  OR: [_CompanyFilter!]
  name: String
  name_not: String
  name_in: [String!]
  name_not_in: [String!]
  name_contains: String
  name_not_contains: String
  name_starts_with: String
  name_not_starts_with: String
  name_ends_with: String
  name_not_ends_with: String
  founded: _Neo4jDateTimeInput
  founded_not: _Neo4jDateTimeInput
  founded_in: [_Neo4jDateTimeInput!]
  founded_not_in: [_Neo4jDateTimeInput!]
  founded_lt: _Neo4jDateTimeInput
  founded_lte: _Neo4jDateTimeInput
  founded_gt: _Neo4jDateTimeInput
  founded_gte: _Neo4jDateTimeInput
  employees: _PersonFilter
  employees_not: _PersonFilter
  employees_in: [_PersonFilter!]
  employees_not_in: [_PersonFilter!]
  employees_some: _PersonFilter
  employees_none: _PersonFilter
  employees_single: _PersonFilter
  employees_every: _PersonFilter
  employeeHistory: _CompanyEmploymentHistoryFilter
  employeeHistory_not: _CompanyEmploymentHistoryFilter
  employeeHistory_in: [_CompanyEmploymentHistoryFilter!]
  employeeHistory_not_in: [_CompanyEmploymentHistoryFilter!]
  employeeHistory_some: _CompanyEmploymentHistoryFilter
  employeeHistory_none: _CompanyEmploymentHistoryFilter
  employeeHistory_single: _CompanyEmploymentHistoryFilter
  employeeHistory_every: _CompanyEmploymentHistoryFilter
}
input _CompanyEmploymentHistoryFilter {
  AND: [_CompanyEmploymentHistoryFilter!]
  OR: [_CompanyEmploymentHistoryFilter!]
  role: String
  role_not: String
  role_in: [String!]
  role_not_in: [String!]
  role_contains: String
  role_not_contains: String
  role_starts_with: String
  role_not_starts_with: String
  role_ends_with: String
  role_not_ends_with: String
  start: _Neo4jDateTimeInput
  start_not: _Neo4jDateTimeInput
  start_in: [_Neo4jDateTimeInput!]
  start_not_in: [_Neo4jDateTimeInput!]
  start_lt: _Neo4jDateTimeInput
  start_lte: _Neo4jDateTimeInput
  start_gt: _Neo4jDateTimeInput
  start_gte: _Neo4jDateTimeInput
  end: _Neo4jDateTimeInput
  end_not: _Neo4jDateTimeInput
  end_in: [_Neo4jDateTimeInput!]
  end_not_in: [_Neo4jDateTimeInput!]
  end_lt: _Neo4jDateTimeInput
  end_lte: _Neo4jDateTimeInput
  end_gt: _Neo4jDateTimeInput
  end_gte: _Neo4jDateTimeInput
  Person: _PersonFilter
}
type _Neo4jTime {
  hour: Int
  minute: Int
  second: Int
  millisecond: Int
  microsecond: Int
  nanosecond: Int
  timezone: String
  formatted: String
}
input _Neo4jTimeInput {
  hour: Int
  minute: Int
  second: Int
  nanosecond: Int
  millisecond: Int
  microsecond: Int
  timezone: String
  formatted: String
}
type _Neo4jDate {
  year: Int
  month: Int
  day: Int
  formatted: String
}
input _Neo4jDateInput {
  year: Int
  month: Int
  day: Int
  formatted: String
}
type _Neo4jDateTime {
  year: Int
  month: Int
  day: Int
  hour: Int
  minute: Int
  second: Int
  millisecond: Int
  microsecond: Int
  nanosecond: Int
  timezone: String
  formatted: String
}
input _Neo4jDateTimeInput {
  year: Int
  month: Int
  day: Int
  hour: Int
  minute: Int
  second: Int
  millisecond: Int
  microsecond: Int
  nanosecond: Int
  timezone: String
  formatted: String
}
type _Neo4jLocalTime {
  hour: Int
  minute: Int
  second: Int
  millisecond: Int
  microsecond: Int
  nanosecond: Int
  formatted: String
}
input _Neo4jLocalTimeInput {
  hour: Int
  minute: Int
  second: Int
  millisecond: Int
  microsecond: Int
  nanosecond: Int
  formatted: String
}
type _Neo4jLocalDateTime {
  year: Int
  month: Int
  day: Int
  hour: Int
  minute: Int
  second: Int
  millisecond: Int
  microsecond: Int
  nanosecond: Int
  formatted: String
}
input _Neo4jLocalDateTimeInput {
  year: Int
  month: Int
  day: Int
  hour: Int
  minute: Int
  second: Int
  millisecond: Int
  microsecond: Int
  nanosecond: Int
  formatted: String
}
directive @cypher(statement: String) on FIELD_DEFINITION
directive @relation(name: String, direction: _RelationDirections, from: String, to: String) on FIELD_DEFINITION | OBJECT
enum _RelationDirections {
  IN
  OUT
}
```

### ID field equal to given value
```graphql
{ person(filter: { id: "jane" }) { name }}
```
```cypher
MATCH (`person`:`Person`) WHERE (`person`.id = $filter.id) RETURN `person` { .name } AS `person`
```

### ID field that starts with given substring
```graphql
{ person(filter: { id_starts_with: "ja" }) { name }}
```
```cypher
MATCH (`person`:`Person`) WHERE (`person`.id STARTS WITH $filter.id_starts_with) RETURN `person` { .name } AS `person`
```
### ID field that does NOT start with given substring
```graphql
{ person(filter: { id_not_starts_with: "ja" }) { name }}
```
```cypher
MATCH (`person`:`Person`) WHERE (NOT `person`.id STARTS WITH $filter.id_not_starts_with) RETURN `person` { .name } AS `person`
```

### ID field that ends with given substring
```graphql
{ person(filter: { id_ends_with: "ne" }) { name }}
```
```cypher
MATCH (`person`:`Person`) WHERE (`person`.id ENDS WITH $filter.id_ends_with) RETURN `person` { .name } AS `person`
```

### ID field that does NOT end with given substring
```graphql
{ person(filter: { id_not_ends_with: "ne" }) { name }}
```
```cypher
MATCH (`person`:`Person`) WHERE (NOT `person`.id ENDS WITH $filter.id_not_ends_with) RETURN `person` { .name } AS `person`
```

### ID field that contains given substring
```graphql
{ person(filter: { id_contains: "an" }) { name }}
```
```cypher
MATCH (`person`:`Person`) WHERE (`person`.id CONTAINS $filter.id_contains) RETURN `person` { .name } AS `person`
```

### ID field that does NOT contain given substring
```graphql
{ person(filter: { id_not_contains: "an" }) { name }}
```
```cypher
MATCH (`person`:`Person`) WHERE (NOT `person`.id CONTAINS $filter.id_not_contains) RETURN `person` { .name } AS `person`
```

### ID field in given list
```graphql
{ person(filter: { id_in: ["jane"] }) { name }}
```
```cypher
MATCH (`person`:`Person`) WHERE (`person`.id IN $filter.id_in) RETURN `person` { .name } AS `person`
```

### ID field NOT in given list
```graphql
{ person(filter: { id_not_in: ["joe"] }) { name }}
```
```cypher
MATCH (`person`:`Person`) WHERE (NOT `person`.id IN $filter.id_not_in) RETURN `person` { .name } AS `person`
```

### ID field different from given value
```graphql
{ person(filter: { id_not: "joe" }) { name }}
```
```cypher
MATCH (`person`:`Person`) WHERE (NOT `person`.id =  $filter.id_not) RETURN `person` { .name } AS `person`
```

### String field does NOT exist
```graphql
{ person(filter: { id: null }) { name }}
```
```cypher
MATCH (`person`:`Person`) WHERE ($filter._id_null = TRUE AND NOT EXISTS(`person`.id)) RETURN `person` { .name } AS `person`
```

### String field exists
```graphql
{ person(filter: { id_not: null }) { name }}
```
```cypher
MATCH (`person`:`Person`) WHERE ($filter._id_not_null = TRUE AND EXISTS(`person`.id)) RETURN `person` { .name } AS `person`
```

### String field equal to given value (parameterized filter)
```graphql
query filterQuery($filter: _PersonFilter) { person(filter: $filter) { name }}
```
```params
{
  "filter": {
    "name": "Jane"
  }
}
```
```cypher
MATCH (`person`:`Person`) WHERE (`person`.name = $filter.name) RETURN `person` { .name } AS `person`
```

### String field equal to given value (parameterized)
```graphql
query filterQuery($name: String) { person(filter: {name: $name}) { name }}
```
```params
{
  "name": "Jane"
}
```
```cypher
MATCH (`person`:`Person`) WHERE (`person`.name = $filter.name) RETURN `person` { .name } AS `person`
```

### String field equal to given value
```graphql
{ person(filter: { name: "Jane" }) { name }}
```
```cypher
MATCH (`person`:`Person`) WHERE (`person`.name = $filter.name) RETURN `person` { .name } AS `person`
```

### String field that starts with given substring
```graphql
{ person(filter: { name_starts_with: "Ja" }) { name }}
```
```cypher
MATCH (`person`:`Person`) WHERE (`person`.name STARTS WITH $filter.name_starts_with) RETURN `person` { .name } AS `person`
```

### String field that does NOT start with given substring
```graphql
{ person(filter: { name_not_starts_with: "Ja" }) { name }}
```
```cypher
MATCH (`person`:`Person`) WHERE (NOT `person`.name STARTS WITH $filter.name_not_starts_with) RETURN `person` { .name } AS `person`
```

### String field that ends with given substring
```graphql
{ person(filter: { name_ends_with: "ne" }) { name }}
```
```cypher
MATCH (`person`:`Person`) WHERE (`person`.name ENDS WITH $filter.name_ends_with) RETURN `person` { .name } AS `person`
```

### String field that does NOT end with given substring
```graphql
{ person(filter: { name_not_ends_with: "ne" }) { name }}
```
```cypher
MATCH (`person`:`Person`) WHERE (NOT `person`.name ENDS WITH $filter.name_not_ends_with) RETURN `person` { .name } AS `person`
```

### String field that contains given substring
```graphql
{ person(filter: { name_contains: "an" }) { name }}
```
```cypher
MATCH (`person`:`Person`) WHERE (`person`.name CONTAINS $filter.name_contains) RETURN `person` { .name } AS `person`
```

### String field that does NOT contain given substring
```graphql
{ person(filter: { name_not_contains: "an" }) { name }}
```
```cypher
MATCH (`person`:`Person`) WHERE (NOT `person`.name CONTAINS $filter.name_not_contains) RETURN `person` { .name } AS `person`
```

### String field in given list
```graphql
{ person(filter: { name_in: ["Jane"] }) { name }}
```
```cypher
MATCH (`person`:`Person`) WHERE (`person`.name IN $filter.name_in) RETURN `person` { .name } AS `person`
```

### String field NOT in given list 
```graphql
{ person(filter: { name_not_in: ["Joe"] }) { name }}
```
```cypher
MATCH (`person`:`Person`) WHERE (NOT `person`.name IN $filter.name_not_in) RETURN `person` { .name } AS `person`
```

### String field different from given value
```graphql
{ person(filter: { name_not: "Joe" }) { name }}
```
```cypher
MATCH (`person`:`Person`) WHERE (NOT `person`.name =  $filter.name_not) RETURN `person` { .name } AS `person`
```

### Boolean field equal to given value
```graphql
{ person(filter: { fun: true }) { name }}
```
```cypher
MATCH (`person`:`Person`) WHERE (`person`.fun = $filter.fun) RETURN `person` { .name } AS `person`
```

### Boolean field different from given value
```graphql
{ person(filter: { fun_not: true }) { name }}
```
```cypher
MATCH (`person`:`Person`) WHERE (NOT `person`.fun =  $filter.fun_not) RETURN `person` { .name } AS `person`
```

### Enum field equal to given value (parameterized)
```graphql
query filterQuery($filterPersonGender: Gender) { person(filter: { gender: $filterPersonGender }) { name }}
```
```params
{"filterPersonGender":"male"}
```
```cypher
MATCH (`person`:`Person`) WHERE (`person`.gender = $filter.gender) RETURN `person` { .name } AS `person`
```

### Enum field different from given value (parameterized)
```graphql
query filterQuery($filterPersonGender: Gender) { person(filter: { gender_not: $filterPersonGender }) { name }}
```
```params
{"filterPersonGender":"male"}
```
```cypher
MATCH (`person`:`Person`) WHERE (NOT `person`.gender =  $filter.gender_not) RETURN `person` { .name } AS `person`
```

### Enum field NOT in given list (parameterized)
```graphql
query filterQuery($filterPersonGender: [Gender!]) { person(filter: { gender_not_in: $filterPersonGender }) { name }}
```
```params
{"filterPersonGender":["male"]}
```
```cypher
MATCH (`person`:`Person`) WHERE (NOT `person`.gender IN $filter.gender_not_in) RETURN `person` { .name } AS `person`
```

### Enum field in given list
```graphql
{ person(filter: { gender_in: male }) { name }}
```
```cypher
MATCH (`person`:`Person`) WHERE (`person`.gender IN $filter.gender_in) RETURN `person` { .name } AS `person`
```

### Int field equal to given value
```graphql
{ person(filter: { age: 38 }) { name }}
```
```cypher
MATCH (`person`:`Person`) WHERE (`person`.age = $filter.age) RETURN `person` { .name } AS `person`
```

### Int field in given list
```graphql
{ person(filter: { age_in: [38] }) { name }}
```
```cypher
MATCH (`person`:`Person`) WHERE (`person`.age IN $filter.age_in) RETURN `person` { .name } AS `person`
```

### Int field NOT in given list
```graphql
{ person(filter: { age_not_in: [38] }) { name }}
```
```cypher
MATCH (`person`:`Person`) WHERE (NOT `person`.age IN $filter.age_not_in) RETURN `person` { .name } AS `person`
```

### Int field less than or equal to given value
```graphql
{ person(filter: { age_lte: 40 }) { name }}
```
```cypher
MATCH (`person`:`Person`) WHERE (`person`.age <= $filter.age_lte) RETURN `person` { .name } AS `person`
```

### Int field less than given value
```graphql
{ person(filter: { age_lt: 40 }) { name }}
```
```cypher
MATCH (`person`:`Person`) WHERE (`person`.age < $filter.age_lt) RETURN `person` { .name } AS `person`
```

### Int field greater than given value
```graphql
{ person(filter: { age_gt: 40 }) { name }}
```
```cypher
MATCH (`person`:`Person`) WHERE (`person`.age > $filter.age_gt) RETURN `person` { .name } AS `person`
```

### Int field greater than or equal to given value
```graphql
{ person(filter: { age_gte: 40 }) { name }}
```
```cypher
MATCH (`person`:`Person`) WHERE (`person`.age >= $filter.age_gte) RETURN `person` { .name } AS `person`
```

### Float field equal to given value
```graphql
{ person(filter: { height: 1.75 }) { name }}
```
```cypher
MATCH (`person`:`Person`) WHERE (`person`.height = $filter.height) RETURN `person` { .name } AS `person`
```

### Float field different from given value
```graphql
{ person(filter: { height_not: 1.75 }) { name }}
```
```cypher
MATCH (`person`:`Person`) WHERE (NOT `person`.height =  $filter.height_not) RETURN `person` { .name } AS `person`
```

### Float field in given list
```graphql
{ person(filter: { height_in: [1.75] }) { name }}
```
```cypher
MATCH (`person`:`Person`) WHERE (`person`.height IN $filter.height_in) RETURN `person` { .name } AS `person`
```

### Float field NOT in given list
```graphql
{ person(filter: { height_not_in: [1.75] }) { name }}
```
```cypher
MATCH (`person`:`Person`) WHERE (NOT `person`.height IN $filter.height_not_in) RETURN `person` { .name } AS `person`
```

### Float field less than or equal to given value
```graphql
{ person(filter: { height_lte: 1.80 }) { name }}
```
```cypher
MATCH (`person`:`Person`) WHERE (`person`.height <= $filter.height_lte) RETURN `person` { .name } AS `person`
```

### Float field less than to given value
```graphql
{ person(filter: { height_lt: 1.80 }) { name }}
```
```cypher
MATCH (`person`:`Person`) WHERE (`person`.height < $filter.height_lt) RETURN `person` { .name } AS `person`
```

### Float field greater than or equal to given value
```graphql
{ person(filter: { height_gte: 1.80 }) { name }}
```
```cypher
MATCH (`person`:`Person`) WHERE (`person`.height >= $filter.height_gte) RETURN `person` { .name } AS `person`
```

### Float field greater than given value
```graphql
{ person(filter: { height_gt: 1.80 }) { name }}
```
```cypher
MATCH (`person`:`Person`) WHERE (`person`.height > $filter.height_gt) RETURN `person` { .name } AS `person`
```

### Boolean AND Float field OR String field equal to given value
```graphql
{ person(filter: { OR: [{ AND: [{fun: true},{height:1.75}]},{name_in: ["Jane"]}]  }) { name }}
```
```cypher
MATCH (`person`:`Person`) WHERE (ANY(_OR IN $filter.OR WHERE (_OR.AND IS NULL OR ALL(_AND IN _OR.AND WHERE (_AND.fun IS NULL OR `person`.fun = _AND.fun) AND (_AND.height IS NULL OR `person`.height = _AND.height))) AND (_OR.name_in IS NULL OR `person`.name IN _OR.name_in))) RETURN `person` { .name } AS `person`
```

### Boolean AND String field equal to given value
```graphql
{ person(filter: { AND: [{ fun: true, name: "Jane"}]  }) { name }}
```
```cypher
MATCH (`person`:`Person`) WHERE (ALL(_AND IN $filter.AND WHERE (_AND.name IS NULL OR `person`.name = _AND.name) AND (_AND.fun IS NULL OR `person`.fun = _AND.fun))) RETURN `person` { .name } AS `person`
```

### Boolean AND String field equal to value given in separate filters
```graphql
{ person(filter: { AND: [{ fun: true},{name: "Jane"}]  }) { name }}
```
```cypher
MATCH (`person`:`Person`) WHERE (ALL(_AND IN $filter.AND WHERE (_AND.fun IS NULL OR `person`.fun = _AND.fun) AND (_AND.name IS NULL OR `person`.name = _AND.name))) RETURN `person` { .name } AS `person`
```

### Boolean field equal to OR String field NOT equal to given value
```graphql
{ person(filter: { OR: [{ fun: false, name_not: "Jane"}]  }) { name }}
```
```cypher
MATCH (`person`:`Person`) WHERE (ANY(_OR IN $filter.OR WHERE (_OR.name_not IS NULL OR NOT `person`.name =  _OR.name_not) AND (_OR.fun IS NULL OR `person`.fun = _OR.fun))) RETURN `person` { .name } AS `person`
```

### Boolean field equal to given value OR String value in given list
```graphql
{ person(filter: { OR: [{ fun: true},{name_in: ["Jane"]}]  }) { name }}
```
```cypher
MATCH (`person`:`Person`) WHERE (ANY(_OR IN $filter.OR WHERE (_OR.fun IS NULL OR `person`.fun = _OR.fun) AND (_OR.name_in IS NULL OR `person`.name IN _OR.name_in))) RETURN `person` { .name } AS `person`
```

### Related node does NOT exist
```graphql
{ person(filter: { company: null }) { name }}
```
```cypher
MATCH (`person`:`Person`) WHERE ($filter._company_null = TRUE AND NOT EXISTS((`person`)-[:WORKS_AT]->(:Company))) RETURN `person` { .name } AS `person`
```

### Related node exists
```graphql
{ person(filter: { company_not: null }) { name }}
```
```cypher
MATCH (`person`:`Person`) WHERE ($filter._company_not_null = TRUE AND EXISTS((`person`)-[:WORKS_AT]->(:Company))) RETURN `person` { .name } AS `person`
```

### ALL related nodes matching filter
```graphql
{ person(filter: { company: { name: "ACME" } }) { name }}
```
```cypher
MATCH (`person`:`Person`) WHERE (EXISTS((`person`)-[:WORKS_AT]->(:Company)) AND ALL(`company` IN [(`person`)-[:WORKS_AT]->(`_company`:Company) | `_company`] WHERE (`company`.name = $filter.company.name))) RETURN `person` { .name } AS `person`
```

### ALL related nodes NOT matching filter
```graphql
{ person(filter: { company_not: { name: "ACME" } }) { name }}
```
```cypher
MATCH (`person`:`Person`) WHERE (EXISTS((`person`)-[:WORKS_AT]->(:Company)) AND NONE(`company` IN [(`person`)-[:WORKS_AT]->(`_company`:Company) | `_company`] WHERE (`company`.name = $filter.company_not.name))) RETURN `person` { .name } AS `person`
```

### ALL related nodes matching filter in given list
```graphql
{ person( filter: { company_in: [ { name: "Neo4j" }, { name: "ACME" } ] }) { name } }
```
```cypher
MATCH (`person`:`Person`) WHERE (EXISTS((`person`)-[:WORKS_AT]->(:Company)) AND ALL(`company` IN [(`person`)-[:WORKS_AT]->(`_company`:Company) | `_company`] WHERE ANY(_company_in IN $filter.company_in WHERE (_company_in.name IS NULL OR `company`.name = _company_in.name)))) RETURN `person` { .name } AS `person`
```

### ALL related nodes NOT matching filter in given list
```graphql
{ person( filter: { company_not_in: [ { name: "Neo4j" }, { name: "ACME" } ] }) { name } }
```
```cypher
MATCH (`person`:`Person`) WHERE (EXISTS((`person`)-[:WORKS_AT]->(:Company)) AND ALL(`company` IN [(`person`)-[:WORKS_AT]->(`_company`:Company) | `_company`] WHERE NONE(_company_not_in IN $filter.company_not_in WHERE (_company_not_in.name IS NULL OR `company`.name = _company_not_in.name)))) RETURN `person` { .name } AS `person`
```

### ALL related nodes matching filter nested in given logical OR filters
```graphql
{ person( filter: { OR:[ { company: { name: "Neo4j" } }, { company: null } ] } ) { name } }
```
```cypher
MATCH (`person`:`Person`) WHERE (ANY(_OR IN $filter.OR WHERE (_OR.company IS NULL OR EXISTS((`person`)-[:WORKS_AT]->(:Company)) AND ALL(`company` IN [(`person`)-[:WORKS_AT]->(`_company`:Company) | `_company`] WHERE (_OR.company.name IS NULL OR `company`.name = _OR.company.name))) AND (_OR._company_null IS NULL OR _OR._company_null = TRUE AND NOT EXISTS((`person`)-[:WORKS_AT]->(:Company))))) RETURN `person` { .name } AS `person`
```

### String field equal to given value AND String field on ALL related nodes ends with given substring (parameterized filter)
```graphql
query filterQuery($filter: _PersonFilter) { person(filter: $filter) { name }}
```
```params
{
  "filter": {
    "name": "Jane",
    "company": {
      "name_ends_with": "ME"
    }
  }
}
```
```cypher
MATCH (`person`:`Person`) WHERE (`person`.name = $filter.name) AND (EXISTS((`person`)-[:WORKS_AT]->(:Company)) AND ALL(`company` IN [(`person`)-[:WORKS_AT]->(`_company`:Company) | `_company`] WHERE (`company`.name ENDS WITH $filter.company.name_ends_with))) RETURN `person` { .name } AS `person`
```

### ALL related nodes matching String field equal to given value
```graphql
{ p: Company { employees(filter: { name: "Jane" }) { name }}}
```
```cypher
MATCH (`company`:`Company`) RETURN `company` {employees: [(`company`)<-[:`WORKS_AT`]-(`company_employees`:`Person`) WHERE (`company_employees`.name = $1_filter.name) | company_employees { .name }] } AS `company`
```

### ALL related nodes matching filter given in separate OR filters
```graphql
{ p: Company { employees(filter: { OR: [{ name: "Jane" },{name:"Joe"}]}) { name }}}
```
```cypher
MATCH (`company`:`Company`) RETURN `company` {employees: [(`company`)<-[:`WORKS_AT`]-(`company_employees`:`Person`) WHERE (ANY(_OR IN $1_filter.OR WHERE (_OR.name IS NULL OR `company_employees`.name = _OR.name))) | company_employees { .name }] } AS `company`
```

### ALL related nodes matching String field in given list
```graphql
{ p: Company(filter: { employees: { name_in: ["Jane","Joe"] } }) { name }}
```
```cypher
MATCH (`company`:`Company`) WHERE (EXISTS((`company`)<-[:WORKS_AT]-(:Person)) AND ALL(`person` IN [(`company`)<-[:WORKS_AT]-(`_person`:Person) | `_person`] WHERE (`person`.name IN $filter.employees.name_in))) RETURN `company` { .name } AS `company`
```

### SOME related nodes matching given filter
```graphql
{ p: Company(filter: { employees_some: { name: "Jane" } }) { name }}
```
```cypher
MATCH (`company`:`Company`) WHERE (EXISTS((`company`)<-[:WORKS_AT]-(:Person)) AND ANY(`person` IN [(`company`)<-[:WORKS_AT]-(`_person`:Person) | `_person`] WHERE (`person`.name = $filter.employees_some.name))) RETURN `company` { .name } AS `company`
```

### EVERY related node matching given filter
```graphql
{ p: Company(filter: { employees_every: { name: "Jill" } }) { name }}
```
```cypher
MATCH (`company`:`Company`) WHERE (EXISTS((`company`)<-[:WORKS_AT]-(:Person)) AND ALL(`person` IN [(`company`)<-[:WORKS_AT]-(`_person`:Person) | `_person`] WHERE (`person`.name = $filter.employees_every.name))) RETURN `company` { .name } AS `company`
```

### NONE of any related nodes match given filter
```graphql
{ p: Company(filter: { employees_none: { name: "Jane" } }) { name }}
```
```cypher
MATCH (`company`:`Company`) WHERE (EXISTS((`company`)<-[:WORKS_AT]-(:Person)) AND NONE(`person` IN [(`company`)<-[:WORKS_AT]-(`_person`:Person) | `_person`] WHERE (`person`.name = $filter.employees_none.name))) RETURN `company` { .name } AS `company`
```

### SINGLE related node matching given filter
```graphql
{ p: Company(filter: { employees_single: { name: "Jill" } }) { name }}
```
```cypher
MATCH (`company`:`Company`) WHERE (EXISTS((`company`)<-[:WORKS_AT]-(:Person)) AND SINGLE(`person` IN [(`company`)<-[:WORKS_AT]-(`_person`:Person) | `_person`] WHERE (`person`.name = $filter.employees_single.name))) RETURN `company` { .name } AS `company`
```

### Nested relationship filter
```graphql
{ person(filter: { company: { employees_some: { name: "Jane" } } } ) { name } }
```
```cypher
MATCH (`person`:`Person`) WHERE (EXISTS((`person`)-[:WORKS_AT]->(:Company)) AND ALL(`company` IN [(`person`)-[:WORKS_AT]->(`_company`:Company) | `_company`] WHERE (EXISTS((`company`)<-[:WORKS_AT]-(:Person)) AND ANY(`person` IN [(`company`)<-[:WORKS_AT]-(`_person`:Person) | `_person`] WHERE (`person`.name = $filter.company.employees_some.name))))) RETURN `person` { .name } AS `person`
```
 
### Temporal field equal to given value
```graphql
{ person( filter: { birthday: { year: 2020, day: 1, month: 1 hour: 0 minute: 0 second: 0 millisecond: 0 nanosecond: 0 timezone: "Z" } } ) { name } }
```
```cypher
MATCH (`person`:`Person`) WHERE ((`person`.birthday = datetime($filter.birthday))) RETURN `person` { .name } AS `person`
```

### Temporal field different from given value
```graphql
{ person( filter: { birthday_not: { year: 2020 } } ) { name } }
```
```cypher
MATCH (`person`:`Person`) WHERE ((NOT `person`.birthday =  datetime($filter.birthday_not))) RETURN `person` { .name } AS `person`
```

### Temporal field before or equal to given value
```graphql
{ person(filter: { birthday_lte: { year: 2020 } }) { name } }
```
```cypher
MATCH (`person`:`Person`) WHERE ((`person`.birthday <= datetime($filter.birthday_lte))) RETURN `person` { .name } AS `person`
```

### Temporal field before given value
```graphql
{ person(filter: { birthday_lt: { year: 2021 } }) { name } }
```
```cypher
MATCH (`person`:`Person`) WHERE ((`person`.birthday < datetime($filter.birthday_lt))) RETURN `person` { .name } AS `person`
```

### Temporal field after or equal to given value
```graphql
{ person(filter: { birthday_gte: { year: 2020 } }) { name } }
```
```cypher
MATCH (`person`:`Person`) WHERE ((`person`.birthday >= datetime($filter.birthday_gte))) RETURN `person` { .name } AS `person`
```

### Temporal field after given value
```graphql
{ person(filter: { birthday_gt: { year: 2020 } }) { name } }
```
```cypher
MATCH (`person`:`Person`) WHERE ((`person`.birthday > datetime($filter.birthday_gt))) RETURN `person` { .name } AS `person`
```

### Temporal field in given list
```graphql
{ person(filter: { birthday_in: [ { year: 2020 }, { formatted: "2021-01-01T00:00:00Z" } ] }) { name } } 
```
```cypher
MATCH (`person`:`Person`) WHERE (ANY(_birthday_in IN $filter.birthday_in WHERE (`person`.birthday = datetime(_birthday_in)))) RETURN `person` { .name } AS `person`
```

### Temporal field NOT in given list
```graphql
{ person(filter: { birthday_not_in: [ { year: 2021 }, { formatted: "2021-01-01T00:00:00Z" } ] }) { name } } 
```
```cypher
MATCH (`person`:`Person`) WHERE (NONE(_birthday_not_in IN $filter.birthday_not_in WHERE (`person`.birthday = datetime(_birthday_not_in)))) RETURN `person` { .name } AS `person`
```

### Temporal field does NOT exist
```graphql
{ person( filter: { birthday: null } ) { name } }
```
```cypher
MATCH (`person`:`Person`) WHERE ($filter._birthday_null = TRUE AND NOT EXISTS(`person`.birthday)) RETURN `person` { .name } AS `person`
```

### Temporal field exists
```graphql
{ person( filter: { birthday_not: null } ) { name } }
```
```cypher
MATCH (`person`:`Person`) WHERE ($filter._birthday_not_null = TRUE AND EXISTS(`person`.birthday)) RETURN `person` { .name } AS `person`
```

### Temporal field does NOT exist on related node
```graphql
{ person( filter: { company: { founded: null } } ) { name } }
```
```cypher
MATCH (`person`:`Person`) WHERE (EXISTS((`person`)-[:WORKS_AT]->(:Company)) AND ALL(`company` IN [(`person`)-[:WORKS_AT]->(`_company`:Company) | `_company`] WHERE ($filter.company._founded_null = TRUE AND NOT EXISTS(`company`.founded)))) RETURN `person` { .name } AS `person`
```

### Temporal field on related node equal to given value
```graphql
{ person( filter: { company: { founded: { year: 2007 } } } ) { name } }
```
```cypher
MATCH (`person`:`Person`) WHERE (EXISTS((`person`)-[:WORKS_AT]->(:Company)) AND ALL(`company` IN [(`person`)-[:WORKS_AT]->(`_company`:Company) | `_company`] WHERE ((`company`.founded = datetime($filter.company.founded))))) RETURN `person` { .name } AS `person`
```

### Temporal field on related node equal to given year OR formatted value OR does NOT exist
```graphql
{ person( filter: { company: { OR: [ { founded: { year: 2007 } } { founded: { formatted: "2007-01-01T00:00:00Z" } } { founded: null } ] } } ) { name } }
```
```cypher
MATCH (`person`:`Person`) WHERE (EXISTS((`person`)-[:WORKS_AT]->(:Company)) AND ALL(`company` IN [(`person`)-[:WORKS_AT]->(`_company`:Company) | `_company`] WHERE (ANY(_OR IN $filter.company.OR WHERE ((_OR.founded IS NULL OR `company`.founded = datetime(_OR.founded))) AND (_OR._founded_null IS NULL OR _OR._founded_null = TRUE AND NOT EXISTS(`company`.founded)))))) RETURN `person` { .name } AS `person`
```

### Temporal and scalar field on relationship match given logical AND filters
```graphql
{ person( filter: { employmentHistory: { AND: [ { role: "Developer" }, { start: { year: 2019 } }, { end: { year: 2020 } } ] } } ) { name } }
```
```cypher
MATCH (`person`:`Person`) WHERE (EXISTS((`person`)-[:WORKED_AT]->(:Company)) AND ALL(`person_filter_company` IN [(`person`)-[`_person_filter_company`:WORKED_AT]->(:Company) | `_person_filter_company`] WHERE (ALL(_AND IN $filter.employmentHistory.AND WHERE (_AND.role IS NULL OR `person_filter_company`.role = _AND.role) AND ((_AND.start IS NULL OR `person_filter_company`.start = datetime(_AND.start))) AND ((_AND.end IS NULL OR `person_filter_company`.end = datetime(_AND.end))))))) RETURN `person` { .name } AS `person`
```

### Related node does NOT exist (relationship type)
```graphql
{ person( filter: { employmentHistory: null }) { name } }
```
```cypher
MATCH (`person`:`Person`) WHERE ($filter._employmentHistory_null = TRUE AND NOT EXISTS((`person`)-[:WORKED_AT]->(:Company))) RETURN `person` { .name } AS `person`
```

### Related node exists (relationship type)
```graphql
{ person( filter: { employmentHistory_not: null }) { name } }
```
```cypher
MATCH (`person`:`Person`) WHERE ($filter._employmentHistory_not_null = TRUE AND EXISTS((`person`)-[:WORKED_AT]->(:Company))) RETURN `person` { .name } AS `person`
```

### Temporal fields on relationship do NOT exist
```graphql
{ person( filter: { employmentHistory: { start: null, end: null } } ) { name } }
```
```cypher
MATCH (`person`:`Person`) WHERE (EXISTS((`person`)-[:WORKED_AT]->(:Company)) AND ALL(`person_filter_company` IN [(`person`)-[`_person_filter_company`:WORKED_AT]->(:Company) | `_person_filter_company`] WHERE ($filter.employmentHistory._start_null = TRUE AND NOT EXISTS(`person_filter_company`.start)) AND ($filter.employmentHistory._end_null = TRUE AND NOT EXISTS(`person_filter_company`.end)))) RETURN `person` { .name } AS `person`
```

### Temporal fields on relationship exist
```graphql
{ person( filter: { employmentHistory: { start_not: null, end_not: null } } ) { name } }
```
```cypher
MATCH (`person`:`Person`) WHERE (EXISTS((`person`)-[:WORKED_AT]->(:Company)) AND ALL(`person_filter_company` IN [(`person`)-[`_person_filter_company`:WORKED_AT]->(:Company) | `_person_filter_company`] WHERE ($filter.employmentHistory._start_not_null = TRUE AND EXISTS(`person_filter_company`.start)) AND ($filter.employmentHistory._end_not_null = TRUE AND EXISTS(`person_filter_company`.end)))) RETURN `person` { .name } AS `person`
```

### Temporal fields on relationship equal to given values
```graphql
{ person( filter: { employmentHistory: { start:{ year: 2019 }, end: { formatted: "2020-01-01T00:00:00Z" } } } ) { name } }
```
```cypher
MATCH (`person`:`Person`) WHERE (EXISTS((`person`)-[:WORKED_AT]->(:Company)) AND ALL(`person_filter_company` IN [(`person`)-[`_person_filter_company`:WORKED_AT]->(:Company) | `_person_filter_company`] WHERE ((`person_filter_company`.start = datetime($filter.employmentHistory.start))) AND ((`person_filter_company`.end = datetime($filter.employmentHistory.end))))) RETURN `person` { .name } AS `person`
```

### ALL relationships matching filter
```graphql
{ person( filter: { employmentHistory: { role: "Developer" } } ) { name } } 
```
```cypher
MATCH (`person`:`Person`) WHERE (EXISTS((`person`)-[:WORKED_AT]->(:Company)) AND ALL(`person_filter_company` IN [(`person`)-[`_person_filter_company`:WORKED_AT]->(:Company) | `_person_filter_company`] WHERE (`person_filter_company`.role = $filter.employmentHistory.role))) RETURN `person` { .name } AS `person`
```

### ALL relationships NOT matching filter
```graphql
{ person( filter: { employmentHistory_not: { role: "Developer" } } ) { name } } 
```
```cypher
MATCH (`person`:`Person`) WHERE (EXISTS((`person`)-[:WORKED_AT]->(:Company)) AND NONE(`person_filter_company` IN [(`person`)-[`_person_filter_company`:WORKED_AT]->(:Company) | `_person_filter_company`] WHERE (`person_filter_company`.role = $filter.employmentHistory_not.role))) RETURN `person` { .name } AS `person`
```

### SOME relationships matching given filter
```graphql
{ person( filter: { employmentHistory_some: { role: "Developer" } } ) { name } }
```
```cypher
MATCH (`person`:`Person`) WHERE (EXISTS((`person`)-[:WORKED_AT]->(:Company)) AND ANY(`person_filter_company` IN [(`person`)-[`_person_filter_company`:WORKED_AT]->(:Company) | `_person_filter_company`] WHERE (`person_filter_company`.role = $filter.employmentHistory_some.role))) RETURN `person` { .name } AS `person`
```

### EVERY relationship matching given filter
```graphql
{ person( filter: { employmentHistory_every: { role: "Developer" } } ) { name } }
```
```cypher
MATCH (`person`:`Person`) WHERE (EXISTS((`person`)-[:WORKED_AT]->(:Company)) AND ALL(`person_filter_company` IN [(`person`)-[`_person_filter_company`:WORKED_AT]->(:Company) | `_person_filter_company`] WHERE (`person_filter_company`.role = $filter.employmentHistory_every.role))) RETURN `person` { .name } AS `person`
```

### NONE of any relationships match given filter
```graphql
{ person( filter: { employmentHistory_none: { role: "Developer" } } ) { name } }
```
```cypher
MATCH (`person`:`Person`) WHERE (EXISTS((`person`)-[:WORKED_AT]->(:Company)) AND NONE(`person_filter_company` IN [(`person`)-[`_person_filter_company`:WORKED_AT]->(:Company) | `_person_filter_company`] WHERE (`person_filter_company`.role = $filter.employmentHistory_none.role))) RETURN `person` { .name } AS `person`
```

### SINGLE relationship matching given filter
```graphql
{ person( filter: { employmentHistory_single: { role: "Developer" } } ) { name } }
```
```cypher
MATCH (`person`:`Person`) WHERE (EXISTS((`person`)-[:WORKED_AT]->(:Company)) AND SINGLE(`person_filter_company` IN [(`person`)-[`_person_filter_company`:WORKED_AT]->(:Company) | `_person_filter_company`] WHERE (`person_filter_company`.role = $filter.employmentHistory_single.role))) RETURN `person` { .name } AS `person`
```

### Scalar fields on relationship AND related node equal to given values
```graphql
{ person( filter: { employmentHistory: { role: "Developer", Company: { name: "ACME" } } } ) { name } }
```
```cypher
MATCH (`person`:`Person`) WHERE (EXISTS((`person`)-[:WORKED_AT]->(:Company)) AND ALL(`person_filter_company` IN [(`person`)-[`_person_filter_company`:WORKED_AT]->(:Company) | `_person_filter_company`] WHERE (`person_filter_company`.role = $filter.employmentHistory.role) AND (ALL(`company` IN [(`person`)-[`person_filter_company`]->(`_company`:Company) | `_company`] WHERE (`company`.name = $filter.employmentHistory.Company.name))))) RETURN `person` { .name } AS `person`
```

### ALL relationships matching filter in given list
```graphql
{ person( filter: { employmentHistory_in: [ { role: "Manager", start: { year: 2013 } }, { role: "Developer", start: { formatted: "2019-01-01T00:00:00Z" } } ] } ) { name } }
```
```cypher
MATCH (`person`:`Person`) WHERE (EXISTS((`person`)-[:WORKED_AT]->(:Company)) AND ALL(`person_filter_company` IN [(`person`)-[`_person_filter_company`:WORKED_AT]->(:Company) | `_person_filter_company`] WHERE ANY(_employmentHistory_in IN $filter.employmentHistory_in WHERE (_employmentHistory_in.role IS NULL OR `person_filter_company`.role = _employmentHistory_in.role) AND ((_employmentHistory_in.start IS NULL OR `person_filter_company`.start = datetime(_employmentHistory_in.start)))))) RETURN `person` { .name } AS `person`
```

### ALL relationships NOT matching filter in given list
```graphql
{ person( filter: { employmentHistory_not_in: [ { role: "Advisor", start: { year: 2015 } } ] } ) { name } }
```
```cypher
MATCH (`person`:`Person`) WHERE (EXISTS((`person`)-[:WORKED_AT]->(:Company)) AND ALL(`person_filter_company` IN [(`person`)-[`_person_filter_company`:WORKED_AT]->(:Company) | `_person_filter_company`] WHERE NONE(_employmentHistory_not_in IN $filter.employmentHistory_not_in WHERE (_employmentHistory_not_in.role IS NULL OR `person_filter_company`.role = _employmentHistory_not_in.role) AND ((_employmentHistory_not_in.start IS NULL OR `person_filter_company`.start = datetime(_employmentHistory_not_in.start)))))) RETURN `person` { .name } AS `person`
```

### ALL outgoing reflexive type relationships matching filter
```graphql
{ person( filter: { name: "jane", knows: { to: { since: { year: 2016 } } } } ) { name } }
```
```cypher
MATCH (`person`:`Person`) WHERE (`person`.name = $filter.name) AND ((EXISTS((`person`)-[:KNOWS]->(:Person)) AND ALL(`person_filter_person` IN [(`person`)-[`_person_filter_person`:KNOWS]->(:Person) | `_person_filter_person`] WHERE ((`person_filter_person`.since = datetime($filter.knows.to.since)))))) RETURN `person` { .name } AS `person`
```

### ALL incoming reflexive type relationships NOT matching filter
```graphql
{ person(filter: { name: "jane", knows_not: { from: { since: { year: 2018 } } } }) { name } }
```
```cypher
MATCH (`person`:`Person`) WHERE (`person`.name = $filter.name) AND ((EXISTS((`person`)<-[:KNOWS]-(:Person)) AND NONE(`person_filter_person` IN [(`person`)<-[`_person_filter_person`:KNOWS]-(:Person) | `_person_filter_person`] WHERE ((`person_filter_person`.since = datetime($filter.knows_not.from.since)))))) RETURN `person` { .name } AS `person`
```

### ALL outgoing reflexive type relationships matching given filter
```graphql
{ person( filter: { name: "jane", knows: { from: { since: { year: 2018 } } } } ) { name } }
```
```cypher
MATCH (`person`:`Person`) WHERE (`person`.name = $filter.name) AND ((EXISTS((`person`)<-[:KNOWS]-(:Person)) AND ALL(`person_filter_person` IN [(`person`)<-[`_person_filter_person`:KNOWS]-(:Person) | `_person_filter_person`] WHERE ((`person_filter_person`.since = datetime($filter.knows.from.since)))))) RETURN `person` { .name } AS `person`
```

### SOME incoming reflexive type relationships matching given filter
```graphql
{ person( filter: { name: "jane", knows_some: { from: { since: { year: 2018 } } } } ) { name } }
```
```cypher
MATCH (`person`:`Person`) WHERE (`person`.name = $filter.name) AND ((EXISTS((`person`)<-[:KNOWS]-(:Person)) AND ANY(`person_filter_person` IN [(`person`)<-[`_person_filter_person`:KNOWS]-(:Person) | `_person_filter_person`] WHERE ((`person_filter_person`.since = datetime($filter.knows_some.from.since)))))) RETURN `person` { .name } AS `person`
```

### EVERY incoming and outgoing reflexive type relationship matching given filters
```graphql
{ person( filter: { name: "jane", knows_every: { to: { since: { year: 2009 } }, from: { since: { year: 2018 } } } } ) { name } }
```
```cypher
MATCH (`person`:`Person`) WHERE (`person`.name = $filter.name) AND ((EXISTS((`person`)<-[:KNOWS]-(:Person)) AND ALL(`person_filter_person` IN [(`person`)<-[`_person_filter_person`:KNOWS]-(:Person) | `_person_filter_person`] WHERE ((`person_filter_person`.since = datetime($filter.knows_every.from.since))))) AND (EXISTS((`person`)-[:KNOWS]->(:Person)) AND ALL(`person_filter_person` IN [(`person`)-[`_person_filter_person`:KNOWS]->(:Person) | `_person_filter_person`] WHERE ((`person_filter_person`.since = datetime($filter.knows_every.to.since)))))) RETURN `person` { .name } AS `person`
```

### NONE of any incoming and outgoing reflexive type relationships match given filters
```graphql
{ person( filter: { name: "jane", knows_none: { to: { since: { year: 2229 } }, from: { since: { year: 2218 } } } } ) { name } }
```
```cypher
MATCH (`person`:`Person`) WHERE (`person`.name = $filter.name) AND ((EXISTS((`person`)<-[:KNOWS]-(:Person)) AND NONE(`person_filter_person` IN [(`person`)<-[`_person_filter_person`:KNOWS]-(:Person) | `_person_filter_person`] WHERE ((`person_filter_person`.since = datetime($filter.knows_none.from.since))))) AND (EXISTS((`person`)-[:KNOWS]->(:Person)) AND NONE(`person_filter_person` IN [(`person`)-[`_person_filter_person`:KNOWS]->(:Person) | `_person_filter_person`] WHERE ((`person_filter_person`.since = datetime($filter.knows_none.to.since)))))) RETURN `person` { .name } AS `person`
```

### SINGLE incoming reflexive type relationships matching given filter
```graphql
{ person( filter: { name: "jane", knows_single: { from: { since: { year: 2018 } } } } ) { name } }
```
```cypher
MATCH (`person`:`Person`) WHERE (`person`.name = $filter.name) AND ((EXISTS((`person`)<-[:KNOWS]-(:Person)) AND SINGLE(`person_filter_person` IN [(`person`)<-[`_person_filter_person`:KNOWS]-(:Person) | `_person_filter_person`] WHERE ((`person_filter_person`.since = datetime($filter.knows_single.from.since)))))) RETURN `person` { .name } AS `person`
```

### ALL outgoing reflexive relationships matching filter in given list
```graphql
{ person( filter: { name: "jane", knows_in: [ { to: { since: { year: 3000 } } }, { to: { since: { year: 2009 } } } ] } ) { name } }
```
```cypher
MATCH (`person`:`Person`) WHERE (`person`.name = $filter.name) AND (ANY(_knows_in IN $filter.knows_in WHERE (_knows_in.to IS NULL OR EXISTS((`person`)-[:KNOWS]->(:Person)) AND ANY(`person_filter_person` IN [(`person`)-[`_person_filter_person`:KNOWS]->(:Person) | `_person_filter_person`] WHERE ((_knows_in.to.since IS NULL OR `person_filter_person`.since = datetime(_knows_in.to.since))))))) RETURN `person` { .name } AS `person`
```

### ALL incoming reflexive relationships NOT matching filter in given list
```graphql
{ person( filter: { name: "jane", knows_in: [ { from: { since: { year: 3000 } } }, { from: { since: { year: 2018 } } } ] } ) { name } }
```
```cypher
MATCH (`person`:`Person`) WHERE (`person`.name = $filter.name) AND (ANY(_knows_in IN $filter.knows_in WHERE (_knows_in.from IS NULL OR EXISTS((`person`)<-[:KNOWS]-(:Person)) AND ANY(`person_filter_person` IN [(`person`)<-[`_person_filter_person`:KNOWS]-(:Person) | `_person_filter_person`] WHERE ((_knows_in.from.since IS NULL OR `person_filter_person`.since = datetime(_knows_in.from.since))))))) RETURN `person` { .name } AS `person`
```

### Incoming and outgoing reflexive relationships do NOT exist
```graphql
{ person( filter: { knows: { from: null, to: null } } ) { name } }
```
```cypher
MATCH (`person`:`Person`) WHERE (($filter.knows._from_null = TRUE AND NOT EXISTS((`person`)<-[:KNOWS]-(:Person))) AND ($filter.knows._to_null = TRUE AND NOT EXISTS((`person`)-[:KNOWS]->(:Person)))) RETURN `person` { .name } AS `person`
```

### Deeply nested list filters containing differences
```graphql
{ person( filter: { company_in: [ { OR: [ { name: "Neo4j", employees: { name: "jane" } } ] }, { OR: [ { name: "Neo4j" } ] } ] } ) { name } }
```
```cypher
MATCH (`person`:`Person`) WHERE (EXISTS((`person`)-[:WORKS_AT]->(:Company)) AND ALL(`company` IN [(`person`)-[:WORKS_AT]->(`_company`:Company) | `_company`] WHERE ANY(_company_in IN $filter.company_in WHERE (_company_in.OR IS NULL OR ANY(_OR IN _company_in.OR WHERE (_OR.name IS NULL OR `company`.name = _OR.name) AND (_OR.employees IS NULL OR EXISTS((`company`)<-[:WORKS_AT]-(:Person)) AND ALL(`person` IN [(`company`)<-[:WORKS_AT]-(`_person`:Person) | `_person`] WHERE (_OR.employees.name IS NULL OR `person`.name = _OR.employees.name)))))))) RETURN `person` { .name } AS `person`
```

### Nested filter on relationship field
```graphql
{ person( filter: { name: "jane", company: { name: "Neo4j" } } ) { name company(filter: { name: "Neo4j", founded: { year: 2007 } }) { name } } }
```
```cypher
MATCH (`person`:`Person`) WHERE (`person`.name = $filter.name) AND (EXISTS((`person`)-[:WORKS_AT]->(:Company)) AND ALL(`company` IN [(`person`)-[:WORKS_AT]->(`_company`:Company) | `_company`] WHERE (`company`.name = $filter.company.name))) RETURN `person` { .name ,company: head([(`person`)-[:`WORKS_AT`]->(`person_company`:`Company`) WHERE (`person_company`.name = $1_filter.name) AND ((`person_company`.founded = datetime($1_filter.founded))) | person_company { .name }]) } AS `person`
```

### Nested filter on relationship type field
```graphql
{ person( filter: { name: "jane" }) { name employmentHistory( filter: { role: "Developer", Company: { name: "Neo4j" } }) { start { year } Company { name } } } }
```
```cypher
MATCH (`person`:`Person`) WHERE (`person`.name = $filter.name) RETURN `person` { .name ,employmentHistory: [(`person`)-[`person_employmentHistory_relation`:`WORKED_AT`]->(:`Company`) WHERE (`person_employmentHistory_relation`.role = $1_filter.role) AND (ALL(`person_filter_company` IN [(`person`)-[`person_employmentHistory_relation`]->(`_company`:Company) | `_company`] WHERE (`person_filter_company`.name = $1_filter.Company.name))) | person_employmentHistory_relation {start: { year: `person_employmentHistory_relation`.start.year },Company: head([(:`Person`)-[`person_employmentHistory_relation`]->(`person_employmentHistory_Company`:`Company`) | person_employmentHistory_Company { .name }]) }] } AS `person`
```

### Nested filters on reflexive relationship type field
```graphql
{ person( filter: { name: "jane" }) { name knows { from( filter: { since: { year: 2018 }, Person: { name: "Joe" } } ) { since { year } Person { name } } to( filter: { since: { year: 2019 } Person: { name: "Jill" } } ) { since { year } Person { name } } } } }
```
```cypher
MATCH (`person`:`Person`) WHERE (`person`.name = $filter.name) RETURN `person` { .name ,knows: {from: [(`person`)<-[`person_from_relation`:`KNOWS`]-(`person_from`:`Person`) WHERE ((`person_from_relation`.since = datetime($1_filter.since))) AND (ALL(`person_filter_person` IN [(`person`)-[`person_from_relation`]->(`_person`:Person) | `_person`] WHERE (`person_filter_person`.name = $1_filter.Person.name))) | person_from_relation {since: { year: `person_from_relation`.since.year },Person: person_from { .name } }] ,to: [(`person`)-[`person_to_relation`:`KNOWS`]->(`person_to`:`Person`) WHERE ((`person_to_relation`.since = datetime($3_filter.since))) AND (ALL(`person_filter_person` IN [(`person`)-[`person_to_relation`]->(`_person`:Person) | `_person`] WHERE (`person_filter_person`.name = $3_filter.Person.name))) | person_to_relation {since: { year: `person_to_relation`.since.year },Person: person_to { .name } }] } } AS `person`
```
