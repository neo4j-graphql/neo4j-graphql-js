require('dotenv-flow').config();

export const { JWT_SECRET, NEO4J_USERNAME, NEO4J_PASSWORD } = process.env;
if (!(JWT_SECRET && NEO4J_USERNAME && NEO4J_PASSWORD)) {
  throw new Error(`

Please create a .env file and configure environment variables there.

You could e.g. copy the .env file used for testing:

$ cp .env.text .env
`);
}
export default { JWT_SECRET, NEO4J_USERNAME, NEO4J_PASSWORD };
