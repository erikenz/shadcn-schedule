import { describe, expect, it } from "vitest";

import { dragToCreatePlugin } from "@/plugins/drag-to-create/drag-to-create-plugin";

describe(dragToCreatePlugin, () => {
  it("registers a named plugin that contributes a provider", () => {
    const plugin = dragToCreatePlugin();

    expect(plugin.name).toBe("drag-to-create");
    expect(plugin.provider).toBeTypeOf("function");
  });

  it("accepts a custom onSelect option", () => {
    const plugin = dragToCreatePlugin({ onSelect: () => {} });

    expect(plugin.name).toBe("drag-to-create");
  });
});
