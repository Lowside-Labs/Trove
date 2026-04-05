import { Command } from "commander";
import { ensureTroveDirs } from "../core/fs.js";
import { withDatabase } from "../db/database.js";

export function createInitCommand() {
  return new Command("init").description("Create the Trove local data directory and initialize the database.").action(() => {
    const paths = ensureTroveDirs();
    withDatabase(() => undefined, paths.root);

    console.log(`Initialized Trove in ${paths.root}`);
    console.log(`Database: ${paths.dbPath}`);
  });
}
