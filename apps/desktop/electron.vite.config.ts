import path from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";

const dirname = path.dirname(fileURLToPath(import.meta.url));

const workspaceAlias = {
  "trove-contracts": path.resolve(dirname, "../../packages/trove-contracts/src/index.ts"),
  "trove-core": path.resolve(dirname, "../../packages/trove-core/src/index.ts"),
};

export default defineConfig({
  main: {
    resolve: {
      alias: workspaceAlias,
    },
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          index: path.resolve(dirname, "src/main/index.ts"),
        },
      },
    },
  },
  preload: {
    resolve: {
      alias: workspaceAlias,
    },
    build: {
      rollupOptions: {
        input: {
          index: path.resolve(dirname, "src/preload/index.ts"),
        },
      },
    },
  },
  renderer: {
    resolve: {
      alias: {
        "@renderer": path.resolve(dirname, "src/renderer/src"),
        "trove-contracts": workspaceAlias["trove-contracts"],
      },
    },
    plugins: [tailwindcss(), react()],
    root: path.resolve(dirname, "src/renderer"),
    build: {
      outDir: path.resolve(dirname, "dist/renderer"),
      rollupOptions: {
        input: {
          index: path.resolve(dirname, "src/renderer/index.html"),
        },
      },
    },
  },
});
