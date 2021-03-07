export const typeDefs = `
type Tweet {
    id: ID!
    timestamp: DateTime
    text: String
    hashtags: [Hashtag] @relation(name: "HAS_TAG", direction: OUT)
    user: User @relation(name: "POSTED", direction: IN)
}

type User {
    id: ID!
    screen_name: String
    tweets: [Tweet] @relation(name: "POSTED", direction: OUT)
}

type Hashtag {
    name: String
}

scalar DateTime
`;

export const EXPECTED_SCHEMA_NO_QUERIES_NO_MUTATIONS = `directive @cypher(statement: String) on FIELD_DEFINITION

directive @relation(name: String, direction: _RelationDirections, from: String, to: String) on FIELD_DEFINITION | OBJECT

directive @MutationMeta(relationship: String, from: String, to: String) on FIELD_DEFINITION

enum _RelationDirections {
  IN
  OUT
}

type Hashtag {
  name: String
  _id: String
}

type Tweet {
  id: ID!
  timestamp: _Neo4jDateTime
  text: String
  hashtags: [Hashtag]
  user: User
  _id: String
}

type User {
  id: ID!
  screen_name: String
  tweets: [Tweet]
  _id: String
}
`;

export const EXPECTED_SCHEMA_ENABLE_QUERIES_NO_MUTATIONS = `directive @cypher(statement: String) on FIELD_DEFINITION

directive @relation(name: String, direction: _RelationDirections, from: String, to: String) on FIELD_DEFINITION | OBJECT

directive @MutationMeta(relationship: String, from: String, to: String) on FIELD_DEFINITION

enum _HashtagOrdering {
  name_asc
  name_desc
  _id_asc
  _id_desc
}

enum _RelationDirections {
  IN
  OUT
}

enum _TweetOrdering {
  id_asc
  id_desc
  text_asc
  text_desc
  _id_asc
  _id_desc
}

enum _UserOrdering {
  id_asc
  id_desc
  screen_name_asc
  screen_name_desc
  _id_asc
  _id_desc
}

type Hashtag {
  name: String
  _id: String
}

type Query {
  Tweet(id: ID, text: String, _id: String, first: Int, offset: Int, orderBy: _TweetOrdering): [Tweet]
  User(id: ID, screen_name: String, _id: String, first: Int, offset: Int, orderBy: _UserOrdering): [User]
  Hashtag(name: String, _id: String, first: Int, offset: Int, orderBy: _HashtagOrdering): [Hashtag]
}

type Tweet {
  id: ID!
  timestamp: _Neo4jDateTime
  text: String
  hashtags(first: Int, offset: Int, orderBy: _HashtagOrdering): [Hashtag]
  user: User
  _id: String
}

type User {
  id: ID!
  screen_name: String
  tweets(first: Int, offset: Int, orderBy: _TweetOrdering): [Tweet]
  _id: String
}
`;

export const EXPECTED_SCHEMA_ENABLE_QUERIES_ENABLE_MUTATIONS = `directive @cypher(statement: String) on FIELD_DEFINITION

directive @relation(name: String, direction: _RelationDirections, from: String, to: String) on FIELD_DEFINITION | OBJECT

directive @MutationMeta(relationship: String, from: String, to: String) on FIELD_DEFINITION

type _AddTweetHashtagsPayload {
  from: Tweet
  to: Hashtag
}

type _AddTweetUserPayload {
  from: User
  to: Tweet
}

type _AddUserTweetsPayload {
  from: User
  to: Tweet
}

input _HashtagInput {
  name: String!
}

enum _HashtagOrdering {
  name_asc
  name_desc
  _id_asc
  _id_desc
}

enum _RelationDirections {
  IN
  OUT
}

type _RemoveTweetHashtagsPayload {
  from: Tweet
  to: Hashtag
}

type _RemoveTweetUserPayload {
  from: User
  to: Tweet
}

type _RemoveUserTweetsPayload {
  from: User
  to: Tweet
}

input _TweetInput {
  id: ID!
}

enum _TweetOrdering {
  id_asc
  id_desc
  text_asc
  text_desc
  _id_asc
  _id_desc
}

input _UserInput {
  id: ID!
}

enum _UserOrdering {
  id_asc
  id_desc
  screen_name_asc
  screen_name_desc
  _id_asc
  _id_desc
}

type Hashtag {
  name: String
  _id: String
}

type Mutation {
  CreateTweet(id: ID, text: String): Tweet
  UpdateTweet(id: ID!, text: String): Tweet
  DeleteTweet(id: ID!): Tweet
  AddTweetHashtags(from: _TweetInput!, to: _HashtagInput!): _AddTweetHashtagsPayload
  RemoveTweetHashtags(from: _TweetInput!, to: _HashtagInput!): _RemoveTweetHashtagsPayload
  AddTweetUser(from: _UserInput!, to: _TweetInput!): _AddTweetUserPayload
  RemoveTweetUser(from: _UserInput!, to: _TweetInput!): _RemoveTweetUserPayload
  CreateUser(id: ID, screen_name: String): User
  UpdateUser(id: ID!, screen_name: String): User
  DeleteUser(id: ID!): User
  AddUserTweets(from: _UserInput!, to: _TweetInput!): _AddUserTweetsPayload
  RemoveUserTweets(from: _UserInput!, to: _TweetInput!): _RemoveUserTweetsPayload
  CreateHashtag(name: String): Hashtag
  DeleteHashtag(name: String!): Hashtag
}

type Query {
  Tweet(id: ID, text: String, _id: String, first: Int, offset: Int, orderBy: _TweetOrdering): [Tweet]
  User(id: ID, screen_name: String, _id: String, first: Int, offset: Int, orderBy: _UserOrdering): [User]
  Hashtag(name: String, _id: String, first: Int, offset: Int, orderBy: _HashtagOrdering): [Hashtag]
}

type Tweet {
  id: ID!
  timestamp: _Neo4jDateTime
  text: String
  hashtags(first: Int, offset: Int, orderBy: _HashtagOrdering): [Hashtag]
  user: User
  _id: String
}

type User {
  id: ID!
  screen_name: String
  tweets(first: Int, offset: Int, orderBy: _TweetOrdering): [Tweet]
  _id: String
}
`;
