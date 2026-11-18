import type { ReactNode } from "react";
import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";

import { createPluginRuntime } from "@/features/plugins/lib/create-plugin-runtime";
import type {
  CalendarEvent,
  CalendarPlugin,
  EventFormSlotContext,
} from "@/types/index";
import { toZonedDateTime } from "@/utils/temporal";

// oxlint-disable-next-line typescript/promise-function-async -- the declared type is a React/Payload union that includes a promise, so async would change the component
const A = ({ children }: { children: ReactNode }) => children;

// oxlint-disable-next-line typescript/promise-function-async -- the declared type is a React/Payload union that includes a promise, so async would change the component
const B = ({ children }: { children: ReactNode }) => children;

// Slot and point names stay arbitrary: the runtime passes `slotName` through
// untouched and never branches on the host's slot catalog. Arbitrary names
// prove that. The payload, though, is the host's own slot context, which the
// runtime relays unchanged.
const A_SLOT = "a-slot";
const ANOTHER_SLOT = "another-slot";

const formContext = (event: CalendarEvent): EventFormSlotContext => ({
  event,
  onChange: vi.fn<(updates: Partial<CalendarEvent>) => void>(),
});

interface TestEvent extends CalendarEvent {
  special?: boolean;
}

const ev = (id: string, startISO: string, special = false): TestEvent => ({
  id,
  special,
  end: toZonedDateTime(startISO).add({ hours: 1 }),
  start: toZonedDateTime(startISO),
  title: id,
});

const range = {
  end: toZonedDateTime("2025-01-31T23:59:59.999Z"),
  start: toZonedDateTime("2025-01-01T00:00:00.000Z"),
};

const isSpecial = (e: TestEvent): boolean => Boolean(e.special);

// A plugin that expands special events into two and claims them.
const fakePlugin = (): CalendarPlugin => ({
  managesEvent: (e) => isSpecial(e),
  name: "fake",
  transformEvents: (events) =>
    events.flatMap((e) =>
      isSpecial(e) ? [e, { ...e, id: `${e.id}-copy` }] : [e]
    ),
});

describe(createPluginRuntime, () => {
  it("transformEvents runs the plugin chain, then range-filters", () => {
    const runtime = createPluginRuntime([fakePlugin()]);

    const result = runtime.transformEvents(
      [ev("a", "2025-01-05T09:00:00.000Z", true)],
      range
    );

    expect(result.map((e) => e.id)).toStrictEqual(["a", "a-copy"]);
  });

  it("transformEvents chains plugins sequentially (each sees prior output)", () => {
    const addCopy: CalendarPlugin = {
      name: "addCopy",
      transformEvents: (events) =>
        events.flatMap((e) => [e, { ...e, id: `${e.id}-1` }]),
    };

    const retitleByIndex: CalendarPlugin = {
      name: "retitleByIndex",
      transformEvents: (events) =>
        events.map((e, i) => ({ ...e, title: `${i}` })),
    };

    const runtime = createPluginRuntime([addCopy, retitleByIndex]);

    const result = runtime.transformEvents(
      [ev("a", "2025-01-05T09:00:00.000Z")],
      range
    );

    // addCopy produced [a, a-1]; retitleByIndex then renamed by position.
    expect(result.map((e) => e.title)).toStrictEqual(["0", "1"]);
  });

  it("transformEvents with no plugins is the overlap filter", () => {
    const runtime = createPluginRuntime([]);
    const inRange = ev("b", "2025-01-10T09:00:00.000Z");
    const outOfRange = ev("c", "2024-06-10T09:00:00.000Z");
    const result = runtime.transformEvents([inRange, outOfRange], range);
    expect(result.map((e) => e.id)).toStrictEqual(["b"]);
  });

  it("transformEvents range-filters plugin-produced events too", () => {
    const injectOutOfRange: CalendarPlugin = {
      name: "inject",
      transformEvents: (events) => [
        ...events,
        ev("far", "2020-01-01T00:00:00.000Z"),
      ],
    };

    const runtime = createPluginRuntime([injectOutOfRange]);

    const result = runtime.transformEvents(
      [ev("b", "2025-01-10T09:00:00.000Z")],
      range
    );

    expect(result.map((e) => e.id)).toStrictEqual(["b"]);
  });

  it("getEventManager returns the first plugin that manages the event", () => {
    const runtime = createPluginRuntime([fakePlugin()]);
    expect(
      runtime.getEventManager(ev("a", "2025-01-05T09:00:00.000Z", true))?.name
    ).toBe("fake");
    expect(
      runtime.getEventManager(ev("b", "2025-01-05T09:00:00.000Z"))
    ).toBeUndefined();
  });

  it("renderSlot collects a node from every plugin that renders the slot", () => {
    const withForm: CalendarPlugin = {
      name: "withForm",
      renderSlot: (slotName) =>
        slotName === A_SLOT ? createElement("div") : null,
    };

    const noRender: CalendarPlugin = { name: "noRender" };
    const runtime = createPluginRuntime([withForm, noRender]);
    expect(
      runtime.renderSlot(
        A_SLOT,
        formContext(ev("s", "2025-01-05T09:00:00.000Z"))
      )
    ).toHaveLength(1);
  });

  it("renderSlot returns nothing when no plugin renders the slot", () => {
    const runtime = createPluginRuntime([fakePlugin()]);
    expect(
      runtime.renderSlot(
        ANOTHER_SLOT,
        formContext(ev("s", "2025-01-05T09:00:00.000Z"))
      )
    ).toHaveLength(0);
  });

  it("collect flattens contributions from all plugins for a point", () => {
    const a: CalendarPlugin = {
      contribute: (p) => (p === "x" ? ["a1"] : []),
      name: "a",
    };

    const b: CalendarPlugin = {
      contribute: (p) => (p === "x" ? ["b1", "b2"] : []),
      name: "b",
    };

    expect(
      createPluginRuntime([a, b]).collect(
        "x",
        ev("ctx", "2025-01-05T09:00:00.000Z")
      )
    ).toStrictEqual(["a1", "b1", "b2"]);
  });

  it("collect ignores plugins without contribute or contributing to other points", () => {
    const a: CalendarPlugin = {
      contribute: (p) => (p === "x" ? ["a1"] : []),
      name: "a",
    };

    expect(
      createPluginRuntime([a, { name: "b" }]).collect(
        "y",
        ev("ctx", "2025-01-05T09:00:00.000Z")
      )
    ).toStrictEqual([]);
  });

  it("collect passes the context through to contribute", () => {
    const event = ev("ctx", "2025-01-05T09:00:00.000Z");
    let seen: CalendarEvent | undefined;

    const a: CalendarPlugin = {
      contribute: (_p, ctx) => {
        seen = ctx;

        return [];
      },
      name: "a",
    };

    createPluginRuntime([a]).collect("x", event);
    expect(seen).toBe(event);
  });

  it("getViews aggregates views from all plugins in order", () => {
    const p1: CalendarPlugin = {
      name: "p1",
      views: [{ component: () => null, icon: () => null, name: "v1" }],
    };

    const p2: CalendarPlugin = {
      name: "p2",
      views: [
        {
          component: () => null,
          icon: () => null,
          name: "v2",
          navigationUnit: "week",
        },
      ],
    };

    expect(
      createPluginRuntime([p1, p2])
        .getViews()
        .map((v) => v.name)
    ).toStrictEqual(["v1", "v2"]);
  });

  it("getViews is empty when no plugin declares views", () => {
    expect(createPluginRuntime([{ name: "p" }]).getViews()).toStrictEqual([]);
  });

  it("getProviders returns the providers of plugins that declare one, in order", () => {
    const runtime = createPluginRuntime([
      { name: "a", provider: A },
      { name: "b" },
      { name: "c", provider: B },
    ]);

    expect(runtime.getProviders()).toStrictEqual([A, B]);
  });
});
