import { generate } from './generate.js';

const watch = process.argv.includes('--watch') || process.argv.includes('-w');

generate(watch);
