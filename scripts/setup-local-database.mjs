// Create a local demo database on a fresh clone. Never replace existing data.
import { copyFile, mkdir } from "node:fs/promises";
import { constants } from "node:fs";
import { fileURLToPath } from "node:url";
const directory = new URL("../database/", import.meta.url);
const source = new URL("data.example.ts", directory);
const target = new URL("data.ts", directory);
await mkdir(fileURLToPath(directory), { recursive: true });
try {
  await copyFile(source, target, constants.COPYFILE_EXCL);
  console.log("Created local demo database; existing databases are never overwritten.");
} catch (error) {
  if (error.code !== "EEXIST") throw error;
}
