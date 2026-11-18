import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { Temporal } from "temporal-polyfill";
import { describe, expect, it, vi } from "vitest";

import { Header } from "@/features/calendar/components/header/base-header";
import { CalendarProvider } from "@/features/calendar/contexts/calendar-context/provider";
import type { DateRange } from "@/features/calendar/types/index";
import type { CollectFn } from "@/lib/utils/export-ical";
import { agendaPlugin } from "@/plugins/agenda/index";
import { elementAt } from "@/test-utils/element-at";
import type { CalendarEvent, CalendarPlugin, PluginView } from "@/types/index";
import { monthIndex, toZonedDateTime } from "@/utils/temporal";

const StubIcon = () => null;

const customViewPlugin = (
  view: Partial<PluginView> & Pick<PluginView, "name">
): CalendarPlugin => ({
  name: `plugin-${view.name}`,
  views: [{ component: () => null, icon: StubIcon, ...view }],
});

const titleText = () =>
  (screen.getByTestId("calendar-title").textContent ?? "").replaceAll(
    /[\u2009\u202F]/gu,
    " "
  );

// Custom render function that wraps Header in CalendarProvider. The header tier
// defaults to 'desktop' in tests (no layout for ResizeObserver to measure), so
// these exercise the desktop layout: segmented switcher + inline Export button.
const renderHeader = (events: CalendarEvent[] = [], providerProps = {}) =>
  render(
    <CalendarProvider
      dayMaxEvents={3}
      events={events}
      firstDayOfWeek={0}
      {...providerProps}
    >
      <Header />
    </CalendarProvider>
  );

const { mockDownloadICalendar } = vi.hoisted(() => ({
  mockDownloadICalendar:
    vi.fn<
      (
        events: CalendarEvent[],
        collect: CollectFn,
        filename?: string,
        calendarName?: string
      ) => void
    >(),
}));

vi.mock(import("../../../../lib/utils/export-ical.ts"), () => ({
  downloadICalendar: mockDownloadICalendar,
}));

const EXPORT_BUTTON = /export/iu;
const ICS_FILENAME = /calendar-\d{4}-\d{2}-\d{2}\.ics/u;

describe("Calendar header", () => {
  const testEvents: CalendarEvent[] = [
    {
      end: toZonedDateTime("2025-08-04T10:00:00.000Z"),
      id: "test-1",
      start: toZonedDateTime("2025-08-04T09:00:00.000Z"),
      title: "Test Event",
      uid: "test-1@calendar.local",
    },
    {
      description: "Test description",
      end: toZonedDateTime("2025-08-05T15:00:00.000Z"),
      id: "test-2",
      start: toZonedDateTime("2025-08-05T14:00:00.000Z"),
      title: "Another Event",
    },
  ];

  it("should render the export button", () => {
    renderHeader(testEvents);

    const exportButton = screen.getByRole("button", { name: EXPORT_BUTTON });
    expect(exportButton).toBeInTheDocument();
    expect(exportButton).toHaveTextContent("Export");
  });

  it("should call downloadICalendar when export is clicked", () => {
    renderHeader(testEvents);

    fireEvent.click(screen.getByRole("button", { name: EXPORT_BUTTON }));

    expect(mockDownloadICalendar).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ id: "test-1", title: "Test Event" }),
        expect.objectContaining({ id: "test-2", title: "Another Event" }),
      ]),
      expect.any(Function),
      expect.stringMatching(ICS_FILENAME),
      "Calendar"
    );
  });

  it("should not render the export button when hideExportButton is true", () => {
    renderHeader(testEvents, { hideExportButton: true });

    expect(
      screen.queryByRole("button", { name: EXPORT_BUTTON })
    ).not.toBeInTheDocument();
  });

  it("should call onDateChange when picking a month from the title date picker", async () => {
    const onDateChange =
      vi.fn<(date: Temporal.ZonedDateTime, range: DateRange) => void>();

    renderHeader([], {
      initialDate: toZonedDateTime("2025-08-04T09:00:00.000Z"),
      onDateChange,
    });

    // Title shows "August 2025" in month view; clicking it opens the month grid.
    act(() => {
      fireEvent.click(screen.getByTestId("calendar-title"));
    });
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Sep" }));
    });

    await waitFor(() => {
      expect(onDateChange).toHaveBeenCalledOnce();
    });

    const [calledDate] = elementAt(onDateChange.mock.calls, 0);
    expect(calledDate).toBeInstanceOf(Temporal.ZonedDateTime);
    expect(monthIndex(calledDate)).toBe(8);
    expect(calledDate.year).toBe(2025);
  });

  it("should switch the active view from the segmented switcher", async () => {
    renderHeader();

    const weekToggle = screen.getByRole("tab", { name: "Week" });
    act(() => {
      fireEvent.click(weekToggle);
    });

    await waitFor(() => {
      expect(weekToggle).toHaveAttribute("aria-selected", "true");
    });
  });

  it("renders the week range in the title using Intl.DateTimeFormat.formatRange", () => {
    renderHeader([], {
      initialDate: toZonedDateTime("2026-04-29T12:00:00.000Z"),
      initialView: "week",
    });

    // firstDayOfWeek defaults to 0 (Sunday), so the week containing Apr 29 2026
    // is Sun Apr 26 - Sat May 2. formatRange returns "Apr 26 – May 2" in English
    // (en-dash separator, U+2013) with no year suffix.
    const title = screen.getByTestId("calendar-title");
    expect(title).toHaveTextContent("Apr 26 – May 2");
    expect(title.textContent).not.toContain("2026");
  });

  it("renders a custom-window agenda range (not a single day) in the title", () => {
    renderHeader([], {
      initialDate: toZonedDateTime("2026-04-15T12:00:00.000Z"),
      initialView: "agenda",
      plugins: [agendaPlugin({ window: 7 })],
    });

    // A custom 7-day window starting at Apr 15 lists Apr 15 - 21, so the title
    // shows that range rather than just "Apr 15".
    const title = screen.getByTestId("calendar-title");
    expect(title).toHaveTextContent("Apr 15 – 21");
  });

  it("mirrors the week-view title for a week-window agenda", () => {
    renderHeader([], {
      initialDate: toZonedDateTime("2026-04-15T12:00:00.000Z"),
      initialView: "agenda",
      plugins: [agendaPlugin({ window: "week" })],
    });

    // firstDayOfWeek 0: the week containing Apr 15 2026 (a Wednesday) is
    // Sun Apr 12 - Sat Apr 18, exactly as week view would title it.
    const title = screen.getByTestId("calendar-title");
    expect(title).toHaveTextContent("Apr 12 – 18");
  });

  it("mirrors the month-view title for a month-window agenda", () => {
    renderHeader([], {
      initialDate: toZonedDateTime("2026-04-15T12:00:00.000Z"),
      initialView: "agenda",
      plugins: [agendaPlugin({ window: "month" })],
    });

    const title = screen.getByTestId("calendar-title");
    expect(title).toHaveTextContent("Apr 2026");
  });
});

// The header date picker must derive its title + picker form generically from a
// view's navigation metadata, never from the view's name. These exercise a
// throwaway third-party view (named 'sprint', not 'agenda') to prove core stays
// plugin-agnostic: the same nav step that drives prev/next also picks the picker.
describe("header date picker (plugin-agnostic)", () => {
  // Apr 15 2026 is a Wednesday; firstDayOfWeek defaults to 0 (Sunday), so its
  // week is Sun Apr 12 - Sat Apr 18.
  const at = toZonedDateTime("2026-04-15T12:00:00.000Z");

  // A one-view plugin with arbitrary navigation metadata and an optional range.

  const renderSprint = (view: Partial<PluginView>, providerProps = {}) =>
    renderHeader([], {
      initialDate: at,
      initialView: "sprint",
      plugins: [customViewPlugin({ name: "sprint", ...view })],
      ...providerProps,
    });

  it("titles a week-navigating custom view as a week range", () => {
    renderSprint({ navigationUnit: "week" });
    expect(titleText()).toContain("Apr 12 – 18");
  });

  it("titles a month-navigating custom view as MMM YYYY", () => {
    renderSprint({ navigationUnit: "month" });
    expect(titleText()).toContain("Apr 2026");
  });

  it("titles a year-navigating custom view as YYYY", () => {
    renderSprint({ navigationUnit: "year" });
    expect(titleText()).toContain("2026");
    expect(titleText()).not.toContain("Apr");
  });

  it("titles a single-day custom view as a single date with weekday", () => {
    renderSprint({ navigationUnit: "day" });
    expect(titleText()).toContain("Wed, Apr 15, 2026");
  });

  it("titles a multi-day-window custom view as its range", () => {
    renderSprint({
      navigationStep: { amount: 3, unit: "day" },
      range: (date) => ({ end: date.add({ days: 2 }), start: date }),
    });
    // A 3-day window Apr 15 - 17: not a single day, not a grid week.
    expect(titleText()).toContain("Apr 15 – 17");
  });

  it("treats navigationStep as winning over navigationUnit", () => {
    // A view that labels itself week but steps a 10-day window is a range.
    renderSprint({
      navigationStep: { amount: 10, unit: "day" },
      navigationUnit: "week",
      range: (date) => ({ end: date.add({ days: 9 }), start: date }),
    });
    expect(titleText()).toContain("Apr 15 – 24");
  });

  it("falls back to a single date when a view declares no navigation metadata", () => {
    renderSprint({});
    expect(titleText()).toContain("Wed, Apr 15, 2026");
  });

  it("opens the month grid (not the day calendar) for a month-navigating view", async () => {
    const onDateChange =
      vi.fn<(date: Temporal.ZonedDateTime, range: DateRange) => void>();

    renderSprint({ navigationUnit: "month" }, { onDateChange });

    act(() => {
      fireEvent.click(screen.getByTestId("calendar-title"));
    });
    // The month grid shows month buttons; the day calendar would not.
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Sep" }));
    });

    await waitFor(() => {
      expect(onDateChange).toHaveBeenCalledOnce();
    });
    const [calledDate] = elementAt(onDateChange.mock.calls, 0);

    expect(calledDate.month).toBe(9);
  });

  it("opens the year grid for a year-navigating view", async () => {
    const onDateChange =
      vi.fn<(date: Temporal.ZonedDateTime, range: DateRange) => void>();

    renderSprint({ navigationUnit: "year" }, { onDateChange });

    act(() => {
      fireEvent.click(screen.getByTestId("calendar-title"));
    });
    // The year grid lists selectable years; pick the next one.
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "2027" }));
    });

    await waitFor(() => {
      expect(onDateChange).toHaveBeenCalledOnce();
    });
    const [calledDate] = elementAt(onDateChange.mock.calls, 0);

    expect(calledDate.year).toBe(2027);
  });
});
