## Filter Test TCK

```schema
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
  company(filter: _CompanyFilter): Company @relation(name: "WORKS_AT", direction: OUT)
}
type Company {
  name: String
  employees(filter: _PersonFilter): [Person] @relation(name: "WORKS_AT", direction: IN)
}
type Query {
  person(filter: _PersonFilter): [Person]
  Company(filter: _CompanyFilter): [Company]
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
  company: _CompanyFilter
  company_not: _CompanyFilter
  company_in: [_CompanyFilter!]
  company_not_in: [_CompanyFilter!]
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
  employees: _PersonFilter
  employees_not: _PersonFilter
  employees_in: [_PersonFilter!]
  employees_not_in: [_PersonFilter!]
  employees_some: _PersonFilter
  employees_none: _PersonFilter
  employees_single: _PersonFilter
  employees_every: _PersonFilter
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

### ID field that does not start with given substring
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

### ID field that does not end with given substring
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

### ID field that does not contain given substring
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

### ID field not in given list
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

### String field does not exist
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
query filterQuery($name: String) { person(filter: {name : $name}) { name }}
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

### String field that does not start with given substring
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

### String field that does not end with given substring
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

### String field that does not contain given substring
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

### String field not in given list 
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

### Enum field not in given list (parameterized)
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

### Int field not in given list
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

### Float field not in given list
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

### Related node does not exist
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
{ person(filter: { company : { name : "ACME" } }) { name }}
```
```cypher
MATCH (`person`:`Person`) WHERE (EXISTS((`person`)-[:WORKS_AT]->(:Company)) AND ALL(`company` IN [(`person`)-[`person_filter_company`:WORKS_AT]->(`_company`:Company) | `_company`] WHERE (`company`.name = $filter.company.name))) RETURN `person` { .name } AS `person`
```

### ALL related nodes NOT matching filter
```graphql
{ person(filter: { company_not : { name : "ACME" } }) { name }}
```
```cypher
MATCH (`person`:`Person`) WHERE (EXISTS((`person`)-[:WORKS_AT]->(:Company)) AND NONE(`company` IN [(`person`)-[`person_filter_company`:WORKS_AT]->(`_company`:Company) | `_company`] WHERE (`company`.name = $filter.company_not.name))) RETURN `person` { .name } AS `person`
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
MATCH (`person`:`Person`) WHERE (`person`.name = $filter.name) AND (EXISTS((`person`)-[:WORKS_AT]->(:Company)) AND ALL(`company` IN [(`person`)-[`person_filter_company`:WORKS_AT]->(`_company`:Company) | `_company`] WHERE (`company`.name ENDS WITH $filter.company.name_ends_with))) RETURN `person` { .name } AS `person`
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
{ p: Company(filter: { employees : { name_in : ["Jane","Joe"] } }) { name }}
```
```cypher
MATCH (`company`:`Company`) WHERE (EXISTS((`company`)<-[:WORKS_AT]-(:Person)) AND ALL(`person` IN [(`company`)<-[`company_filter_person`:WORKS_AT]-(`_person`:Person) | `_person`] WHERE (`person`.name IN $filter.employees.name_in))) RETURN `company` { .name } AS `company`
```

### SOME related nodes matching given filter
```graphql
{ p: Company(filter: { employees_some : { name : "Jane" } }) { name }}
```
```cypher
MATCH (`company`:`Company`) WHERE (EXISTS((`company`)<-[:WORKS_AT]-(:Person)) AND ANY(`person` IN [(`company`)<-[`company_filter_person`:WORKS_AT]-(`_person`:Person) | `_person`] WHERE (`person`.name = $filter.employees_some.name))) RETURN `company` { .name } AS `company`
```

### EVERY related node matching given filter
```graphql
{ p: Company(filter: { employees_every : { name : "Jill" } }) { name }}
```
```cypher
MATCH (`company`:`Company`) WHERE (EXISTS((`company`)<-[:WORKS_AT]-(:Person)) AND ALL(`person` IN [(`company`)<-[`company_filter_person`:WORKS_AT]-(`_person`:Person) | `_person`] WHERE (`person`.name = $filter.employees_every.name))) RETURN `company` { .name } AS `company`
```

### NONE of related nodes matching given filter
```graphql
{ p: Company(filter: { employees_none : { name : "Jane" } }) { name }}
```
```cypher
MATCH (`company`:`Company`) WHERE (EXISTS((`company`)<-[:WORKS_AT]-(:Person)) AND NONE(`person` IN [(`company`)<-[`company_filter_person`:WORKS_AT]-(`_person`:Person) | `_person`] WHERE (`person`.name = $filter.employees_none.name))) RETURN `company` { .name } AS `company`
```

### SINGLE related node matching given filter
```graphql
{ p: Company(filter: { employees_single : { name : "Jill" } }) { name }}
```
```cypher
MATCH (`company`:`Company`) WHERE (EXISTS((`company`)<-[:WORKS_AT]-(:Person)) AND SINGLE(`person` IN [(`company`)<-[`company_filter_person`:WORKS_AT]-(`_person`:Person) | `_person`] WHERE (`person`.name = $filter.employees_single.name))) RETURN `company` { .name } AS `company`
```

### Nested relationship filter
```graphql
{ person(filter: { company: { employees_some: { name: "Jane" } } } ) { name } }
```
```cypher
MATCH (`person`:`Person`) WHERE (EXISTS((`person`)-[:WORKS_AT]->(:Company)) AND ALL(`company` IN [(`person`)-[`person_filter_company`:WORKS_AT]->(`_company`:Company) | `_company`] WHERE (EXISTS((`company`)<-[:WORKS_AT]-(:Person)) AND ANY(`person` IN [(`company`)<-[`company_filter_person`:WORKS_AT]-(`_person`:Person) | `_person`] WHERE (`person`.name = $filter.company.employees_some.name))))) RETURN `person` { .name } AS `person`
```
