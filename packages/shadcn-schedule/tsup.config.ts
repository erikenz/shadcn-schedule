import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "index.ts",
    "plugins/agenda/index": "plugins/agenda/index.ts",
    "plugins/drag-to-create/index": "plugins/drag-to-create/index.ts",
    "plugins/recurrence/index": "plugins/recurrence/index.ts",
    "testing/index": "testing/index.tsx",
  },
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  external: ["react", "react-dom"],
});
