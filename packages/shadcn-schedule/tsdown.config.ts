import { defineConfig } from "tsdown";

export default defineConfig({
  clean: true,
  deps: {
    neverBundle: ["react", "react-dom"],
  },
  dts: true,
  entry: {
    index: "index.ts",
    "plugins/agenda/index": "plugins/agenda/index.ts",
    "plugins/drag-to-create/index": "plugins/drag-to-create/index.ts",
    "plugins/recurrence/index": "plugins/recurrence/index.ts",
    "testing/index": "testing/index.tsx",
  },
  format: ["esm", "cjs"],
  outExtensions: ({ format }) => {
    if (format === "es") {
      return { js: ".js", dts: ".d.ts" };
    }

    return { js: ".cjs", dts: ".d.cts" };
  },
  sourcemap: true,
});
