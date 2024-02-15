/**
 * Inlines all instances of process.env.APP_URL since shopify does not do this during prod builds >:(
 */

import { readdir, readFile, writeFile } from 'fs/promises';
import { resolve } from 'path';

if (!process.env.APP_URL) {
  console.log('No APP_URL environment variable set, skipping inlining');
  process.exit();
}

const BASE_PATH = resolve(process.cwd(), './src');

for await (const dirent of await readdir(BASE_PATH, { withFileTypes: true })) {
  await dfs(BASE_PATH, dirent);
}

/**
 * @param {string} basePath
 * @param {Dirent} dirent */
async function dfs(basePath, dirent) {
  if (dirent.isDirectory()) {
    for await (const child of await readdir(resolve(basePath, dirent.name), { withFileTypes: true })) {
      await dfs(resolve(basePath, dirent.name), child);
    }
  } else {
    const filePath = resolve(basePath, dirent.name);
    const fileContents = await readFile(filePath, 'utf8');
    const newContents = fileContents.replace(/process\.env\.APP_URL/g, JSON.stringify(process.env.APP_URL));
    if (fileContents !== newContents) {
      console.log(`Inlined APP_URL in ${filePath}`);
      await writeFile(filePath, newContents);
    }
  }
}
