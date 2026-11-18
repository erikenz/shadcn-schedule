<p align="center">
  <img src="https://raw.githubusercontent.com/erikenz/shadcn-schedule/main/assets/icon.svg" width="64" height="64" alt="shadcn-schedule logo">
</p>

# shadcn-schedule

> The modern, Temporal-backed calendar and scheduling engine for Tailwind & shadcn.

Built with TypeScript, Tailwind CSS 4, and Base UI / Radix primitives.

[![CI](https://github.com/erikenz/shadcn-schedule/actions/workflows/ci.yml/badge.svg)](https://github.com/erikenz/shadcn-schedule/actions/workflows/ci.yml) [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## Features

- 🕒 **ECMAScript Temporal-native**: Built on `temporal-polyfill` and `rrule-temporal` — zero dayjs monkey-patching, no DST drift, robust timezone management.
- 🎨 **shadcn & Tailwind CSS 4 native**: Automatically respects your application's shadcn theme variables and CSS design tokens.
- 🧩 **Slotted & Headless Forms**: Pluggable `components={{ EventForm }}` slot. Use your own shadcn Sheet/Drawer or Dialog with your custom form schema, or disable built-in popups entirely.
- 🏢 **Multi-Resource Scheduling**: Full support for court/room/staff allocation in horizontal and vertical orientations.
- 🪶 **Zustand 5 Store**: Micro-optimized state management. Fast dragging, snapping, and hover states with zero cascading re-renders.
- 🔌 **Extensible Plugin System**: First-class optional plugins for Recurrence (RFC 5545), Agenda view, and Drag-to-Create time selections.
- 🧪 **Rock-Solid**: 1,185 passing unit and integration tests.

---

## Installation

```bash
pnpm add shadcn-schedule
# or
npm install shadcn-schedule
# or
yarn add shadcn-schedule
```

### Peer Dependencies

Ensure `react` and `react-dom` (>= 18) are installed in your project.

### CSS Setup

Import the calendar styles into your Tailwind v4 stylesheet so its utility classes and animations are compiled:

```css
@import "shadcn-schedule/styles/globals.css";
```

---

## Quick Start (Drop-in)

```tsx
import { Calendar } from "shadcn-schedule";

const events = [
  {
    id: "1",
    title: "Court 1 Booking",
    start: "2025-01-15T10:00:00Z",
    end: "2025-01-15T11:30:00Z",
  },
];

export function MyCalendar() {
  return (
    <div className="h-[800px] w-full">
      <Calendar
        events={events}
        initialView="week"
        onEventClick={(event) => console.log("Clicked:", event)}
      />
    </div>
  );
}
```

---

## Headless / Pluggable Form Slot

In real applications, you almost always want your own custom form, slide-over Drawer (Sheet), or modal dialog instead of a rigid library popup.

### 1. Custom Form Component

Pass your own form component via the `components.EventForm` prop:

```tsx
import { Calendar, type EventFormProps } from "shadcn-schedule";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

function BookingDrawer({
  open,
  onClose,
  selectedEvent,
  onAdd,
  onUpdate,
  onDelete,
}: EventFormProps) {
  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>
            {selectedEvent?.id ? "Edit Booking" : "New Booking"}
          </SheetTitle>
        </SheetHeader>
        {/* Your custom booking form here */}
      </SheetContent>
    </Sheet>
  );
}

export function VenueSchedule({ bookings }) {
  return (
    <div className="h-screen w-full">
      <Calendar
        events={bookings}
        components={{
          EventForm: BookingDrawer,
        }}
      />
    </div>
  );
}
```

### 2. Disabling Built-in Dialogs Entirely

If you handle event and cell clicks completely externally:

```tsx
<Calendar
  events={bookings}
  components={{
    EventForm: null, // Disables built-in form mounting completely
  }}
  onCellClick={(info) => openCustomBookingModal(info)}
  onEventClick={(event) => openEventDetails(event)}
/>
```

---

## Multi-Resource Scheduling

Arrange venues, courts, rooms, or staff as resource axes:

```tsx
const resources = [
  { id: "court-1", title: "Court 1 (Indoor)" },
  { id: "court-2", title: "Court 2 (Outdoor)" },
];

<Calendar
  events={events}
  resources={resources}
  orientation="horizontal" // or "vertical"
  initialView="day"
/>;
```

---

## Plugins

Optional functionality is decoupled into subpath exports to keep your bundle lean:

```tsx
import { Calendar } from "shadcn-schedule";
import { agendaPlugin } from "shadcn-schedule/plugins/agenda";
import { dragToCreatePlugin } from "shadcn-schedule/plugins/drag-to-create";
import { recurrencePlugin } from "shadcn-schedule/plugins/recurrence";

<Calendar
  events={events}
  plugins={[recurrencePlugin(), dragToCreatePlugin(), agendaPlugin()]}
/>;
```

---

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details on setting up your local environment, running tests, and submitting pull requests.

---

## License

[MIT](LICENSE)
