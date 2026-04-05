#!/usr/bin/env node

import { Command } from "commander";
import { createHydrateCommand } from "./commands/hydrate.js";
import { createIndexCommand } from "./commands/index.js";
import { createInitCommand } from "./commands/init.js";
import { createSearchCommand } from "./commands/search.js";
import { createStatsCommand } from "./commands/stats.js";
import { createSyncCommand } from "./commands/sync.js";

const program = new Command()
  .name("trove")
  .description("Local-first CLI for collecting, indexing, and searching saved web content.")
  .version("0.1.0");

program.addCommand(createInitCommand());
program.addCommand(createSyncCommand());
program.addCommand(createIndexCommand());
program.addCommand(createHydrateCommand());
program.addCommand(createSearchCommand());
program.addCommand(createStatsCommand());

await program.parseAsync();
