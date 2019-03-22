## Filter Test TCK

```schema
enum Gender { female, male }
type Person {
  id : ID!
  name: String
  age: Int
  height: Float
  fun: Boolean
  gender: Gender
  company: Company @relation(name:"WORKS_AT", direction: OUT)
}
type Company {
  name: String
  employees: [Person] @relation(name:"WORKS_AT", direction: IN)
}
type Query {
  person(filter: _PersonFilter): [Person]
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
  gender_not_in: [Gender!]
  gender_in: [Gender!]
  company: [_CompanyFilter!]
  company_not: [_CompanyFilter!]
}
input _CompanyFilter {
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
}
```
```graphql
# Matches nodes with exact value of ID field 
{ person(filter: { id: "jane" }) { name }}
```
```cypher
MATCH (person:Person)
WHERE (person.id = "jane")
RETURN person { .name } AS person
```
```graphql
# Matches nodes with an ID field that starts with given substring
{ person(filter: { id_starts_with: "ja" }) { name }}
```
```cypher
MATCH (person:Person)
WHERE (person.id STARTS WITH "ja")
RETURN person { .name } AS person
```
```graphql
# Matches nodes with an ID field that does not start with given substring
{ person(filter: { id_not_starts_with: "ja" }) { name }}
```
```cypher
MATCH (person:Person)
WHERE (NOT person.id STARTS WITH "ja")
RETURN person { .name } AS person
```
```graphql
# Matches nodes with an ID field that ends with given substring
{ person(filter: { id_ends_with: "ne" }) { name }}
```
```cypher
MATCH (person:Person)
WHERE (person.id ENDS WITH "ne")
RETURN person { .name } AS person
```
```graphql
# Matches nodes with an ID field that does not end with given substring
{ person(filter: { id_not_ends_with: "ne" }) { name }}
```
```cypher
MATCH (person:Person)
WHERE (NOT person.id ENDS WITH "ne")
RETURN person { .name } AS person
```
```graphql
# Matches nodes with an ID field that contains given substring
{ person(filter: { id_contains: "an" }) { name }}
```
```cypher
MATCH (person:Person)
WHERE (person.id CONTAINS "an")
RETURN person { .name } AS person
```
```graphql
# Matches nodes with an ID field that does not contain given substring
{ person(filter: { id_not_contains: "an" }) { name }}
```
```cypher
MATCH (person:Person)
WHERE (NOT person.id CONTAINS "an")
RETURN person { .name } AS person
```
```graphql
# Matches nodes with an ID field in given list
{ person(filter: { id_in: ["jane"] }) { name }}
```
```cypher
MATCH (person:Person)
WHERE (person.id IN ["jane"])
RETURN person { .name } AS person
```
```graphql
# Matches nodes with ID field not in given list
{ person(filter: { id_not_in: ["joe"] }) { name }}
```
```cypher
MATCH (person:Person)
WHERE (NOT person.id IN ["joe"])
RETURN person { .name } AS person
```
```graphql
# Matches nodes with ID field different from given value
{ person(filter: { id_not: "joe" }) { name }}
```
```cypher
MATCH (person:Person)
WHERE (NOT person.id = "joe")
RETURN person { .name } AS person
```
```graphql
# Matches nodes with exact value of String field (parameterized filter)
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
MATCH (person:Person)
WHERE (person.name = "Jane")
RETURN person { .name } AS person
```
```graphql
# Matches nodes with exact value of String field (parameterized)
query filterQuery($name: String) { person(filter: {name : $name}) { name }}
```
```params
{
  "name": "Jane"
}
```
```cypher
MATCH (person:Person)
WHERE (person.name = {name})
RETURN person { .name } AS person
```
```graphql
# Matches nodes with exact value of String field
{ person(filter: { name: "Jane" }) { name }}
```
```cypher
MATCH (person:Person)
WHERE (person.name = "Jane")
RETURN person { .name } AS person
```
```graphql
# Matches nodes with a String field that starts with given substring
{ person(filter: { name_starts_with: "Ja" }) { name }}
```
```cypher
MATCH (person:Person)
WHERE (person.name STARTS WITH "Ja")
RETURN person { .name } AS person
```
```graphql
# Matches nodes with a String field that does not start with given substring
{ person(filter: { name_not_starts_with: "Ja" }) { name }}
```
```cypher
MATCH (person:Person)
WHERE (NOT person.name STARTS WITH "Ja")
RETURN person { .name } AS person
```
```graphql
# Matches nodes with a String field that ends with given substring
{ person(filter: { name_ends_with: "ne" }) { name }}
```
```cypher
MATCH (person:Person)
WHERE (person.name ENDS WITH "ne")
RETURN person { .name } AS person
```
```graphql
# Matches nodes with a String field that does not end with given substring
{ person(filter: { name_not_ends_with: "ne" }) { name }}
```
```cypher
MATCH (person:Person)
WHERE (NOT person.name ENDS WITH "ne")
RETURN person { .name } AS person
```
```graphql
# Matches nodes with a String field that contains given substring
{ person(filter: { name_contains: "an" }) { name }}
```
```cypher
MATCH (person:Person) 
WHERE (person.name CONTAINS "an")
RETURN person { .name } AS person
```
```graphql
# Matches nodes with a String field that does not contain given substring
{ person(filter: { name_not_contains: "an" }) { name }}
```
```cypher
MATCH (person:Person)
WHERE (NOT person.name CONTAINS "an")
RETURN person { .name } AS person
```
```graphql
# Matches nodes with a String field in given list
{ person(filter: { name_in: ["Jane"] }) { name }}
```
```cypher
MATCH (person:Person)
WHERE (person.name IN ["Jane"])
RETURN person { .name } AS person
```
```graphql
# Matches nodes with a String field not in given list 
{ person(filter: { name_not_in: ["Joe"] }) { name }}
```
```cypher
MATCH (person:Person)
WHERE (NOT person.name IN ["Joe"])
RETURN person { .name } AS person
```
```graphql
# Matches nodes with a String field different from given value
{ person(filter: { name_not: "Joe" }) { name }}
```
```cypher
MATCH (person:Person)
WHERE (NOT person.name = "Joe")
RETURN person { .name } AS person
```
```graphql
# Matches nodes with exact value of Boolean field
{ person(filter: { fun: true }) { name }}
```
```cypher
MATCH (person:Person)
WHERE (person.fun = true)
RETURN person { .name } AS person
```
```graphql
# Matches nodes with Boolean field different from given value
{ person(filter: { fun_not: true }) { name }}
```
```cypher
MATCH (person:Person)
WHERE (NOT person.fun = true)
RETURN person { .name } AS person
```
```graphql
# Matches nodes with exact value of Enum field (parameterized)
query filterQuery($filterPersonGender: Gender) { person(filter: { gender: $filterPersonGender }) { name }}
```
```params
{"filterPersonGender":"male"}
```
```cypher
MATCH (person:Person)
WHERE person.gender = $filterPersonGender
RETURN person { .name } AS person
```
```graphql
# Matches nodes with value of Enum field different from given value (parameterized)
query filterQuery($filterPersonGender: Gender) { person(filter: { gender_not: $filterPersonGender }) { name }}
```
```params
{"filterPersonGender":"male"}
```
```cypher
MATCH (person:Person)
WHERE NOT person.gender = $filterPersonGender
RETURN person { .name } AS person
```
```graphql
# Matches nodes with value of Enum field not in given list (parameterized)
query filterQuery($filterPersonGender: [Gender!]) { person(filter: { gender_not_in: $filterPersonGender }) { name }}
```
```params
{"filterPersonGender":["male"]}
```
```cypher
MATCH (person:Person)
WHERE NOT person.gender IN $filterPersonGender
RETURN person { .name } AS person
```
```graphql
# Matches nodes with value of Enum field in given list
{ person(filter: { gender_in: male }) { name }}
```
```cypher
MATCH (person:Person)
WHERE (person.gender IN ["male"])
RETURN person { .name } AS person
```
```graphql
# Matches nodes with exact value of Int field 
{ person(filter: { age: 38 }) { name }}
```
```cypher
MATCH (person:Person)
WHERE (person.age = 38)
RETURN person { .name } AS person
```
```graphql
# Matches nodes with value of Int field in given list
{ person(filter: { age_in: [38] }) { name }}
```
```cypher
MATCH (person:Person)
WHERE (person.age IN [38])
RETURN person { .name } AS person
```
```graphql
# Matches nodes with value of Int field not in given list
{ person(filter: { age_not_in: [38] }) { name }}
```
```cypher
MATCH (person:Person)
WHERE (NOT person.age IN [38])
RETURN person { .name } AS person
```
```graphql
# Matches nodes with an Int field less than or equal to given value
{ person(filter: { age_lte: 40 }) { name }}
```
```cypher
MATCH (person:Person)
WHERE (person.age <= 40)
RETURN person { .name } AS person
```
```graphql
# Matches nodes with an Int field less than given value
{ person(filter: { age_lt: 40 }) { name }}
```
```cypher
MATCH (person:Person)
WHERE (person.age < 40)
RETURN person { .name } AS person
```
```graphql
# Matches nodes with an Int field greater than given value
{ person(filter: { age_gt: 40 }) { name }}
```
```cypher
MATCH (person:Person)
WHERE (person.age > 40)
RETURN person { .name } AS person
```
```graphql
# Matches nodes with an Int field greater than or equal to given value
{ person(filter: { age_gte: 40 }) { name }}
```
```cypher
MATCH (person:Person)
WHERE (person.age >= 40)
RETURN person { .name } AS person
```
```graphql
# Matches nodes with exact value of Float field
{ person(filter: { height: 1.75 }) { name }}
```
```cypher
MATCH (person:Person)
WHERE (person.height = 1.75)
RETURN person { .name } AS person
```
```graphql
# Matches nodes with value of Float field different from given value
{ person(filter: { height_not: 1.75 }) { name }}
```
```cypher
MATCH (person:Person)
WHERE (NOT person.height = 1.75)
RETURN person { .name } AS person
```
```graphql
# Matches nodes with Float field in given list
{ person(filter: { height_in: [1.75] }) { name }}
```
```cypher
MATCH (person:Person)
WHERE (person.height IN [1.75])
RETURN person { .name } AS person
```
```graphql
# Matches nodes with Float field not in given list
{ person(filter: { height_not_in: [1.75] }) { name }}
```
```cypher
MATCH (person:Person)
WHERE (NOT person.height IN [1.75])
RETURN person { .name } AS person
```
```graphql
# Matches nodes with a Float field less than or equal to given value
{ person(filter: { height_lte: 1.80 }) { name }}
```
```cypher
MATCH (person:Person)
WHERE (person.height <= 1.8)
RETURN person { .name } AS person
```
```graphql
# Matches nodes with a Float field less than to given value
{ person(filter: { height_lt: 1.80 }) { name }}
```
```cypher
MATCH (person:Person)
WHERE (person.height < 1.8)
RETURN person { .name } AS person
```
```graphql
# Matches nodes with a Float field greater than or equal to given value
{ person(filter: { height_gte: 1.80 }) { name }}
```
```cypher
MATCH (person:Person)
WHERE (person.height >= 1.8)
RETURN person { .name } AS person
```
```graphql
# Matches nodes with a Float field greater than given value
{ person(filter: { height_gt: 1.80 }) { name }}
```
```cypher
MATCH (person:Person)
WHERE (person.height > 1.8)
RETURN person { .name } AS person
```
```graphql
# Matches nodes with relation field equal to null
{ person(filter: { company: null }) { name }}
```
```cypher
MATCH (person:Person)
WHERE (NOT (person)-[:WORKS_AT]->())
RETURN person { .name } AS person
```
```graphql
# Matches nodes with relation field not equal to null
{ person(filter: { company_not: null }) { name }}
```
```cypher
MATCH (person:Person)
WHERE ((person)-[:WORKS_AT]->())
RETURN person { .name } AS person
```
```graphql
# Matches nodes with related type field equal to given value
{ person(filter: { company : { name : "ACME" } }) { name }}
```
```cypher
MATCH (person:Person)
WHERE (ALL(person_Company_Cond IN [(person)-[:WORKS_AT]->(person_Company) | (person_Company.name = "ACME")] WHERE person_Company_Cond))
RETURN person { .name } AS person
```
```graphql
# Matches nodes with related type field equal to given value
{ person(filter: { company_not : { name : "ACME" } }) { name }}
```
```cypher
MATCH (person:Person)
WHERE (NOT ALL(person_Company_Cond IN [(person)-[:WORKS_AT]->(person_Company) | (person_Company.name = "ACME")] WHERE person_Company_Cond))
RETURN person { .name } AS person
```
```graphql
# Matches nodes with String field equal to exact value and related type field ends with given substring (parameterized filter)
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
MATCH (person:Person)
WHERE (((person.name = "Jane" AND  ALL(person_Company_Cond IN [(person)-[:WORKS_AT]->(person_Company) | (person_Company.name ENDS WITH "ME")] WHERE person_Company_Cond))))
RETURN person { .name } AS person
```
```graphql
# Matches nodes with Boolean AND Float field OR String field equal to given value
{ person(filter: { OR: [{ AND: [{fun: true},{height:1.75}]},{name_in: ["Jane"]}]  }) { name }}
```
```cypher
MATCH (person:Person)
WHERE (((((person.fun = true) AND (person.height = 1.75))) OR (person.name IN ["Jane"])))
RETURN person { .name } AS person
```
```graphql
# Matches nodes with Boolean AND String field equal to given value
{ person(filter: { AND: [{ fun: true, name: "Jane"}]  }) { name }}
```
```cypher
MATCH (person:Person)
WHERE (((person.fun = true AND  person.name = "Jane")))
RETURN person { .name } AS person
```
```graphql
# Matches nodes with Boolean AND String field equal to value given in object
{ person(filter: { AND: [{ fun: true},{name: "Jane"}]  }) { name }}
```
```cypher
MATCH (person:Person)
WHERE (((person.fun = true) AND (person.name = "Jane")))
RETURN person { .name } AS person
```
```graphql
# Matches nodes with Boolean field equal to OR String field NOT equal to given value
{ person(filter: { OR: [{ fun: false, name_not: "Jane"}]  }) { name }}
```
```cypher
MATCH (person:Person)
WHERE (((person.fun = false AND NOT person.name = "Jane")))
RETURN person { .name } AS person
```
```graphql
# Matches nodes with Boolean field equal to given value OR String value in given list
{ person(filter: { OR: [{ fun: true},{name_in: ["Jane"]}]  }) { name }}
```
```cypher
MATCH (person:Person)
WHERE (((person.fun = true) OR (person.name IN ["Jane"])))
RETURN person { .name } AS person
```
