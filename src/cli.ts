#!/usr/bin/env node

import { Command } from "commander";
import { createHydrateCommand } from "./commands/hydrate.js";
import { createIndexCommand } from "./commands/index.js";
import { createInitCommand } from "./commands/init.js";
import { createSearchCommand } from "./commands/search.js";
import { createStatsCommand } from "./commands/stats.js";
import { createSyncCommand } from "./commands/sync.js";
import { resolveWorkspaceRoot } from "./core/paths.js";

const program = new Command()
  .name("trove")
  .description("Turn your saved web material into a local knowledge workspace for AI agents.")
  .option("--home <path>", "Path to the Trove workspace (default: ~/.trove)")
  .version("0.1.0");

program.hook("preAction", (_thisCommand, actionCommand) => {
  const home = resolveWorkspaceRoot({
    home: actionCommand.optsWithGlobals().home,
  });

  if (home) {
    process.env.TROVE_HOME = home;
  }
});

program.addCommand(createInitCommand());
program.addCommand(createSyncCommand());
program.addCommand(createIndexCommand());
program.addCommand(createHydrateCommand());
program.addCommand(createSearchCommand());
program.addCommand(createStatsCommand());

await program.parseAsync();
