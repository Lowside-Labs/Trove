#!/usr/bin/env node

import { Command } from "commander";
import { createHydrateCommand } from "./commands/hydrate.js";
import { createIndexCommand } from "./commands/index.js";
import { createInitCommand } from "./commands/init.js";
import { createSearchCommand } from "./commands/search.js";
import { createStatsCommand } from "./commands/stats.js";
import { createSyncCommand } from "./commands/sync.js";
import { TerminalOutput } from "./core/output.js";
import { resolveCommandWorkspace } from "./core/paths.js";

const program = new Command()
  .name("trove")
  .description("A second brain from your digital life.")
  .option("--home <path>", "Path to the Trove workspace (overrides the remembered workspace)")
  .version("0.1.0");

program.hook("preAction", (_thisCommand, actionCommand) => {
  if (actionCommand.name() === "init") {
    return;
  }

  const output = new TerminalOutput();
  const resolution = resolveCommandWorkspace({
    home: actionCommand.optsWithGlobals().home,
  });

  if (resolution.root) {
    process.env.TROVE_HOME = resolution.root;
    return;
  }

  output.error(resolution.error ?? "No Trove workspace found.");
  process.exit(1);
});

program.addCommand(createInitCommand());
program.addCommand(createSyncCommand());
program.addCommand(createIndexCommand());
program.addCommand(createHydrateCommand());
program.addCommand(createSearchCommand());
program.addCommand(createStatsCommand());

await program.parseAsync();
