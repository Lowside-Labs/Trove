import { Command } from "commander";
import { ensureTroveDirs } from "../core/fs.js";
import { openDatabase } from "../db/database.js";

export function createInitCommand() {
  return new Command("init").description("Create the Trove local data directory and initialize the database.").action(() => {
    const paths = ensureTroveDirs();
    const db = openDatabase(paths.root);
    db.close();

    console.log(`Initialized Trove in ${paths.root}`);
    console.log(`Database: ${paths.dbPath}`);
  });
}
