import { Command } from "commander";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { searchItems, getSourceStats, listItems, withDatabase } from "../db/database.js";

export function createServeCommand() {
  return new Command("serve")
    .description("Start Trove as an MCP server so any AI agent can query your second brain.")
    .action(async () => {
      const server = new McpServer({
        name: "trove",
        version: "0.1.0",
      });

      server.tool(
        "trove_search",
        "Search across everything in the Trove — bookmarks, saves, stars, and AI chat exports. Returns matching items ranked by relevance.",
        { query: z.string().describe("Full-text search query"), limit: z.number().optional().default(10).describe("Max results to return") },
        async ({ query, limit }) => {
          const results = withDatabase((db) => searchItems(db, query, limit));
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(results, null, 2),
              },
            ],
          };
        },
      );

      server.tool(
        "trove_sources",
        "List all synced sources with item counts and last sync timestamps.",
        {},
        async () => {
          const stats = withDatabase((db) => getSourceStats(db));
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(stats, null, 2),
              },
            ],
          };
        },
      );

      server.tool(
        "trove_list",
        "List items from a specific source. Returns items sorted by most recently saved.",
        {
          source: z.string().optional().describe("Filter by source (e.g. x, substack, github, hn, claude, chatgpt)"),
          limit: z.number().optional().default(20).describe("Max results to return"),
        },
        async ({ source, limit }) => {
          const items = withDatabase((db) => listItems(db, { ...(source ? { source } : {}), limit }));
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(items, null, 2),
              },
            ],
          };
        },
      );

      const transport = new StdioServerTransport();
      await server.connect(transport);
    });
}
