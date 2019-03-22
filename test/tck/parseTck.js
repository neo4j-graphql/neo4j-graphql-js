import { generateTestFile } from './parser';

const TCK_FILE = './test/tck/filterTck.md';
const TEST_FILE = './test/filterTest.js';

generateTestFile(TCK_FILE, TEST_FILE);
