import { cleanup, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { ResourceCell } from "@/components/resource-cell";
import { CalendarProvider } from "@/features/calendar/contexts/calendar-context/provider";
import type { Resource } from "@/types/index";
import { toZonedDateTime } from "@/utils/temporal";

// `renderResource` receives the non-generic `Resource`, so `meta` arrives as
// `unknown`; the fixtures plant a flat bag of strings.
const isString = (value: unknown): value is string => typeof value === "string";

const isStringRecord = (value: unknown): value is Record<string, string> =>
  typeof value === "object" &&
  value !== null &&
  Object.values(value).every(isString);

const renderWithMeta = (resource: Resource) => {
  const { avatar } = isStringRecord(resource.meta) ? resource.meta : {};
  const avatarSrc = isString(avatar) ? avatar : undefined;

  return (
    <div data-testid="meta-renderer">
      <div data-src={avatarSrc} data-testid="resource-avatar" />
      <span>{resource.title}</span>
    </div>
  );
};

const initialDate = toZonedDateTime("2025-01-01T00:00:00.000Z");

const mockResources: [Resource, Resource] = [
  { id: "1", title: "Resource 1" },
  { id: "2", title: "Resource 2" },
];

const mockRenderResource = (resource: Resource) => (
  <div className="flex flex-col items-center">
    <span className="text-2xl font-medium" data-testid="with-render-resource">
      {resource.title}
    </span>
  </div>
);

const renderResourceCell = (
  renderResource?: (resource: Resource) => React.ReactNode,
  children?: React.ReactNode
) =>
  // Use CalendarProvider to ensure getEventsForResource is available
  render(
    <CalendarProvider
      dayMaxEvents={3}
      events={[]}
      initialDate={initialDate}
      renderResource={renderResource}
      resources={mockResources}
    >
      <ResourceCell data-testid="resource-cell" resource={mockResources[0]}>
        {children}
      </ResourceCell>
    </CalendarProvider>
  );

describe(ResourceCell, () => {
  beforeEach(() => {
    cleanup();
  });

  it("renders with defaults", () => {
    renderResourceCell();
    const cell = screen.getByTestId("resource-cell");
    const label = cell.querySelector("div");
    expect(label).toHaveClass("truncate", "text-sm", "font-medium");
    expect(label).toHaveTextContent("Resource 1");
  });

  it("renders with renderResource if provided", () => {
    renderResourceCell(mockRenderResource);
    expect(screen.getByTestId("with-render-resource")).toBeInTheDocument();
  });

  it("renders with children if provided", () => {
    renderResourceCell(undefined, <div data-testid="with-children" />);
    expect(screen.getByTestId("with-children")).toBeInTheDocument();
  });

  it("renders with renderResource if renderResource and children provided", () => {
    renderResourceCell(mockRenderResource, <div data-testid="with-children" />);
    expect(screen.getByTestId("with-render-resource")).toBeInTheDocument();
  });

  it("custom metadata in Resource.meta is accessible in renderResource", () => {
    const resourceWithMeta: Resource = {
      id: "meta-1",
      meta: { avatar: "https://example.com/avatar.png" },
      title: "Resource with Meta",
    };

    render(
      <CalendarProvider
        dayMaxEvents={7}
        initialDate={initialDate}
        renderResource={renderWithMeta}
        resources={[resourceWithMeta]}
      >
        <ResourceCell data-testid="meta-cell" resource={resourceWithMeta} />
      </CalendarProvider>
    );

    const avatarEl = screen.getByTestId("resource-avatar");
    expect(avatarEl).toHaveAttribute(
      "data-src",
      "https://example.com/avatar.png"
    );
  });
});
