import { generateTestFile } from './parser';

const TCK_FILE = './test/helpers/tck/filterTck.md';
const TEST_FILE = './test/unit/filterTests.test.js';

generateTestFile(TCK_FILE, TEST_FILE);
