import type { Meta, StoryObj } from "@storybook/react";
import type { CalendarEvent, EventSegment, Resource } from "shadcn-schedule";
import { Calendar, Temporal, esTranslations } from "shadcn-schedule";
import { agendaPlugin } from "shadcn-schedule/plugins/agenda";
import { dragToCreatePlugin } from "shadcn-schedule/plugins/drag-to-create";
import { recurrencePlugin } from "shadcn-schedule/plugins/recurrence";

// Anchor date at start of local day for clean, zero-drift wall times
const today = Temporal.Now.zonedDateTimeISO().startOfDay();

// ---------------------------------------------------------------------------
// 1. Generic Conference & Facility Resources
// ---------------------------------------------------------------------------
const ROOM_A = "Conference Room A";
const ROOM_B = "Conference Room B";
const AUDITORIUM = "Main Auditorium";
const FOCUS_POD = "Focus Studio 1";

const sampleResources: Resource[] = [
  { id: "room-a", title: ROOM_A },
  { id: "room-b", title: ROOM_B },
  { id: "auditorium", title: AUDITORIUM },
  { id: "focus-1", title: FOCUS_POD },
];

// ---------------------------------------------------------------------------
// 2. Cross-Midnight Generic Facility Resources & Events
// Schedule starting at 13:00 and running past midnight to 02:00 next day
// ---------------------------------------------------------------------------
const RESOURCE_1 = "Resource A";
const RESOURCE_2 = "Resource B";
const RESOURCE_3 = "Resource C";

const crossMidnightResources: Resource[] = [
  { id: "r1", title: RESOURCE_1 },
  { id: "r2", title: RESOURCE_2 },
  { id: "r3", title: RESOURCE_3 },
];

const crossMidnightEvents: CalendarEvent[] = [
  // --- Resource A (Blue / Sky) ---
  {
    id: "cm-r1-1",
    title: "Operations Window A",
    start: today.with({ hour: 13, minute: 0 }),
    end: today.with({ hour: 14, minute: 30 }),
    color: "#0284c7",
    description: "Scheduled daytime operations window",
    location: RESOURCE_1,
    resourceId: "r1",
  },
  {
    id: "cm-r1-2",
    title: "System Diagnostic Run",
    start: today.with({ hour: 14, minute: 30 }),
    end: today.with({ hour: 16, minute: 0 }),
    color: "#0284c7",
    description: "Automated hardware diagnostics",
    location: RESOURCE_1,
    resourceId: "r1",
  },
  {
    id: "cm-r1-3",
    title: "Operations Review",
    start: today.with({ hour: 16, minute: 0 }),
    end: today.with({ hour: 17, minute: 30 }),
    color: "#0284c7",
    description: "Mid-afternoon team review",
    location: RESOURCE_1,
    resourceId: "r1",
  },
  {
    id: "cm-r1-4",
    title: "Infrastructure Sync",
    start: today.with({ hour: 17, minute: 30 }),
    end: today.with({ hour: 19, minute: 0 }),
    color: "#0284c7",
    description: "Multi-cluster synchronization",
    location: RESOURCE_1,
    resourceId: "r1",
  },
  {
    id: "cm-r1-5",
    title: "Data Pipeline Check",
    start: today.with({ hour: 19, minute: 0 }),
    end: today.with({ hour: 20, minute: 30 }),
    color: "#0284c7",
    description: "Kafka stream partition health verify",
    location: RESOURCE_1,
    resourceId: "r1",
  },
  {
    id: "cm-r1-6",
    title: "Deployment Window",
    start: today.with({ hour: 20, minute: 30 }),
    end: today.with({ hour: 22, minute: 0 }),
    color: "#b91c1c",
    description: "Production release maintenance",
    location: RESOURCE_1,
    resourceId: "r1",
  },
  {
    id: "cm-r1-7",
    title: "Night Shift Operations",
    start: today.with({ hour: 22, minute: 0 }),
    end: today.with({ hour: 23, minute: 30 }),
    color: "#059669",
    description: "On-call handover and runbook execution",
    location: RESOURCE_1,
    resourceId: "r1",
  },
  {
    // Crosses Midnight: 23:30 to 01:30 next day
    id: "cm-r1-8",
    title: "Security Audit & Monitoring",
    start: today.with({ hour: 23, minute: 30 }),
    end: today.add({ days: 1 }).with({ hour: 1, minute: 30 }),
    color: "#7e22ce",
    description: "Automated penetration tests & security log parsing",
    location: RESOURCE_1,
    resourceId: "r1",
  },

  // --- Resource B (Orange / Amber) ---
  {
    id: "cm-r2-1",
    title: "Load Balancing Verification",
    start: today.with({ hour: 13, minute: 0 }),
    end: today.with({ hour: 14, minute: 30 }),
    color: "#c2410c",
    description: "Ingress routing stress test",
    location: RESOURCE_2,
    resourceId: "r2",
  },
  {
    id: "cm-r2-2",
    title: "Database Indexing",
    start: today.with({ hour: 14, minute: 30 }),
    end: today.with({ hour: 16, minute: 0 }),
    color: "#059669",
    description: "Postgres index maintenance",
    location: RESOURCE_2,
    resourceId: "r2",
  },
  {
    id: "cm-r2-3",
    title: "Performance Benchmarking",
    start: today.with({ hour: 16, minute: 0 }),
    end: today.with({ hour: 17, minute: 30 }),
    color: "#059669",
    description: "Throughput metrics evaluation",
    location: RESOURCE_2,
    resourceId: "r2",
  },
  {
    id: "cm-r2-4",
    title: "Network Throughput Test",
    start: today.with({ hour: 17, minute: 30 }),
    end: today.with({ hour: 19, minute: 0 }),
    color: "#c2410c",
    description: "VPC interconnection validation",
    location: RESOURCE_2,
    resourceId: "r2",
  },
  {
    id: "cm-r2-5",
    title: "Service Health Check",
    start: today.with({ hour: 19, minute: 0 }),
    end: today.with({ hour: 20, minute: 30 }),
    color: "#c2410c",
    description: "Microservice latency probe",
    location: RESOURCE_2,
    resourceId: "r2",
  },
  {
    id: "cm-r2-6",
    title: "Batch Ingestion Job",
    start: today.with({ hour: 20, minute: 30 }),
    end: today.with({ hour: 22, minute: 0 }),
    color: "#c2410c",
    description: "Nightly data warehouse sync",
    location: RESOURCE_2,
    resourceId: "r2",
  },
  {
    id: "cm-r2-7",
    title: "Cluster Node Maintenance",
    start: today.with({ hour: 22, minute: 0 }),
    end: today.with({ hour: 23, minute: 0 }),
    color: "#c2410c",
    description: "Kubernetes node cordon and drain",
    location: RESOURCE_2,
    resourceId: "r2",
  },
  {
    // Crosses Midnight: 23:00 to 00:30 next day
    id: "cm-r2-8",
    title: "Overnight Backup Routine",
    start: today.with({ hour: 23, minute: 0 }),
    end: today.add({ days: 1 }).with({ hour: 0, minute: 30 }),
    color: "#c2410c",
    description: "Snapshot creation and offsite replication",
    location: RESOURCE_2,
    resourceId: "r2",
  },
  {
    // Entirely after midnight on the next day: 00:30 to 02:00
    id: "cm-r2-9",
    title: "Night Maintenance Window",
    start: today.add({ days: 1 }).with({ hour: 0, minute: 30 }),
    end: today.add({ days: 1 }).with({ hour: 2, minute: 0 }),
    color: "#059669",
    description: "Late maintenance slot",
    location: RESOURCE_2,
    resourceId: "r2",
  },

  // --- Resource C (Violet / Purple) ---
  {
    id: "cm-r3-1",
    title: "Automated Regression Suite",
    start: today.with({ hour: 13, minute: 30 }),
    end: today.with({ hour: 15, minute: 0 }),
    color: "#7e22ce",
    description: "End-to-end integration test runs",
    location: RESOURCE_3,
    resourceId: "r3",
  },
  {
    id: "cm-r3-2",
    title: "Integration Service Testing",
    start: today.with({ hour: 15, minute: 0 }),
    end: today.with({ hour: 16, minute: 30 }),
    color: "#7e22ce",
    description: "Upstream third-party sandbox verification",
    location: RESOURCE_3,
    resourceId: "r3",
  },
  {
    id: "cm-r3-3",
    title: "Container Image Build",
    start: today.with({ hour: 16, minute: 30 }),
    end: today.with({ hour: 18, minute: 0 }),
    color: "#7e22ce",
    description: "Multi-arch base image compilation",
    location: RESOURCE_3,
    resourceId: "r3",
  },
  {
    id: "cm-r3-4",
    title: "Telemetry Ingestion Test",
    start: today.with({ hour: 18, minute: 0 }),
    end: today.with({ hour: 19, minute: 30 }),
    color: "#7e22ce",
    description: "Metrics collector stress tests",
    location: RESOURCE_3,
    resourceId: "r3",
  },
  {
    id: "cm-r3-5",
    title: "API Gateway Stress Test",
    start: today.with({ hour: 19, minute: 30 }),
    end: today.with({ hour: 21, minute: 0 }),
    color: "#7e22ce",
    description: "Load simulation across Edge endpoints",
    location: RESOURCE_3,
    resourceId: "r3",
  },
  {
    id: "cm-r3-6",
    title: "Cache Invalidation Job",
    start: today.with({ hour: 21, minute: 0 }),
    end: today.with({ hour: 22, minute: 30 }),
    color: "#7e22ce",
    description: "Global CDN purge and cache warmup",
    location: RESOURCE_3,
    resourceId: "r3",
  },
  {
    id: "cm-r3-7",
    title: "Staging Fleet Refresh",
    start: today.with({ hour: 22, minute: 30 }),
    end: today.with({ hour: 23, minute: 45 }),
    color: "#7e22ce",
    description: "Canary fleet recreation and DNS update",
    location: RESOURCE_3,
    resourceId: "r3",
  },
  {
    // Crosses Midnight: 23:45 to 01:15 next day
    id: "cm-r3-8",
    title: "Cross-Midnight Cluster Rebalance",
    start: today.with({ hour: 23, minute: 45 }),
    end: today.add({ days: 1 }).with({ hour: 1, minute: 15 }),
    color: "#059669",
    description: "Automated distributed state rebalancing",
    location: RESOURCE_3,
    resourceId: "r3",
  },
  {
    // Entirely after midnight on the next day: 01:15 to 02:00
    id: "cm-r3-9",
    title: "Early Morning System Health",
    start: today.add({ days: 1 }).with({ hour: 1, minute: 15 }),
    end: today.add({ days: 1 }).with({ hour: 2, minute: 0 }),
    color: "#7e22ce",
    description: "Pre-morning baseline health assessment",
    location: RESOURCE_3,
    resourceId: "r3",
  },
];

// ---------------------------------------------------------------------------
// 3. Tailored Event Sets
// ---------------------------------------------------------------------------

// Month View: Multi-day spanning events, and overflowing day cells to show "+N more"
const monthEvents: CalendarEvent[] = [
  {
    id: "m-1",
    title: "Annual Product Strategy Summit",
    start: today.subtract({ days: 2 }).with({ hour: 9, minute: 0 }),
    end: today.add({ days: 1 }).with({ hour: 18, minute: 0 }),
    allDay: true,
    color: "#6366f1",
    description: "Executive strategic alignment and keynote addresses",
  },
  {
    id: "m-2",
    title: "Global Engineering Hackathon",
    start: today.add({ days: 4 }).with({ hour: 8, minute: 0 }),
    end: today.add({ days: 6 }).with({ hour: 20, minute: 0 }),
    allDay: true,
    color: "#8b5cf6",
    description: "Worldwide internal hackathon and prototype presentations",
  },
  // Overflow events on `today` to showcase "+N more" dialog
  {
    id: "m-today-1",
    title: "Executive Staff Briefing",
    start: today.with({ hour: 9, minute: 0 }),
    end: today.with({ hour: 10, minute: 0 }),
    color: "#0284c7",
  },
  {
    id: "m-today-2",
    title: "Product Roadmap Review",
    start: today.with({ hour: 10, minute: 30 }),
    end: today.with({ hour: 11, minute: 30 }),
    color: "#f59e0b",
  },
  {
    id: "m-today-3",
    title: "Customer Advisory Board",
    start: today.with({ hour: 13, minute: 0 }),
    end: today.with({ hour: 14, minute: 0 }),
    color: "#10b981",
  },
  {
    id: "m-today-4",
    title: "Engineering Architecture Sync",
    start: today.with({ hour: 14, minute: 30 }),
    end: today.with({ hour: 15, minute: 30 }),
    color: "#ec4899",
  },
  {
    id: "m-today-5",
    title: "Design Critique & Accessibility",
    start: today.with({ hour: 16, minute: 0 }),
    end: today.with({ hour: 17, minute: 0 }),
    color: "#3b82f6",
  },
  {
    id: "m-other-1",
    title: "Sprint Planning Session",
    start: today.subtract({ days: 5 }).with({ hour: 10, minute: 0 }),
    end: today.subtract({ days: 5 }).with({ hour: 12, minute: 0 }),
    color: "#0284c7",
  },
  {
    id: "m-other-2",
    title: "Investor Update Call",
    start: today.add({ days: 2 }).with({ hour: 15, minute: 0 }),
    end: today.add({ days: 2 }).with({ hour: 16, minute: 0 }),
    color: "#f59e0b",
  },
];

// Week View: Balanced, realistic corporate schedule distributed across days
const weekEvents: CalendarEvent[] = [
  // Monday
  {
    id: "w-mon-1",
    title: "Sprint Kickoff & Planning",
    start: today
      .subtract({ days: today.dayOfWeek - 1 })
      .with({ hour: 9, minute: 0 }),
    end: today
      .subtract({ days: today.dayOfWeek - 1 })
      .with({ hour: 10, minute: 30 }),
    color: "#0284c7",
    location: ROOM_A,
  },
  {
    id: "w-mon-2",
    title: "Frontend Architecture Guild",
    start: today
      .subtract({ days: today.dayOfWeek - 1 })
      .with({ hour: 14, minute: 0 }),
    end: today
      .subtract({ days: today.dayOfWeek - 1 })
      .with({ hour: 15, minute: 30 }),
    color: "#8b5cf6",
    location: ROOM_B,
  },
  // Tuesday
  {
    id: "w-tue-1",
    title: "Design System Review",
    start: today
      .subtract({ days: today.dayOfWeek - 2 })
      .with({ hour: 10, minute: 0 }),
    end: today
      .subtract({ days: today.dayOfWeek - 2 })
      .with({ hour: 11, minute: 30 }),
    color: "#f59e0b",
    location: ROOM_B,
  },
  {
    id: "w-tue-2",
    title: "Customer Discovery Interview",
    start: today
      .subtract({ days: today.dayOfWeek - 2 })
      .with({ hour: 13, minute: 30 }),
    end: today
      .subtract({ days: today.dayOfWeek - 2 })
      .with({ hour: 14, minute: 30 }),
    color: "#10b981",
    location: AUDITORIUM,
  },
  {
    id: "w-tue-3",
    title: "1:1 Coaching & Feedback",
    start: today
      .subtract({ days: today.dayOfWeek - 2 })
      .with({ hour: 15, minute: 30 }),
    end: today
      .subtract({ days: today.dayOfWeek - 2 })
      .with({ hour: 16, minute: 30 }),
    color: "#3b82f6",
    location: FOCUS_POD,
  },
  // Wednesday
  {
    id: "w-wed-1",
    title: "Cross-Team Product Sync",
    start: today
      .subtract({ days: today.dayOfWeek - 3 })
      .with({ hour: 9, minute: 30 }),
    end: today
      .subtract({ days: today.dayOfWeek - 3 })
      .with({ hour: 10, minute: 30 }),
    color: "#ec4899",
    location: AUDITORIUM,
  },
  {
    id: "w-wed-2",
    title: "Core Service Demo",
    start: today
      .subtract({ days: today.dayOfWeek - 3 })
      .with({ hour: 11, minute: 0 }),
    end: today
      .subtract({ days: today.dayOfWeek - 3 })
      .with({ hour: 12, minute: 0 }),
    color: "#0284c7",
    location: ROOM_A,
  },
  {
    id: "w-wed-3",
    title: "Backlog Grooming",
    start: today
      .subtract({ days: today.dayOfWeek - 3 })
      .with({ hour: 14, minute: 30 }),
    end: today
      .subtract({ days: today.dayOfWeek - 3 })
      .with({ hour: 16, minute: 0 }),
    color: "#f59e0b",
    location: ROOM_B,
  },
  // Thursday
  {
    id: "w-thu-1",
    title: "Security & Compliance Audit",
    start: today
      .subtract({ days: today.dayOfWeek - 4 })
      .with({ hour: 10, minute: 0 }),
    end: today
      .subtract({ days: today.dayOfWeek - 4 })
      .with({ hour: 11, minute: 30 }),
    color: "#8b5cf6",
    location: ROOM_A,
  },
  {
    id: "w-thu-2",
    title: "API Working Group",
    start: today
      .subtract({ days: today.dayOfWeek - 4 })
      .with({ hour: 13, minute: 0 }),
    end: today
      .subtract({ days: today.dayOfWeek - 4 })
      .with({ hour: 14, minute: 0 }),
    color: "#10b981",
    location: ROOM_B,
  },
  {
    id: "w-thu-3",
    title: "Enterprise Pilot Check-in",
    start: today
      .subtract({ days: today.dayOfWeek - 4 })
      .with({ hour: 15, minute: 0 }),
    end: today
      .subtract({ days: today.dayOfWeek - 4 })
      .with({ hour: 16, minute: 30 }),
    color: "#0284c7",
    location: AUDITORIUM,
  },
  // Friday
  {
    id: "w-fri-1",
    title: "All-Hands Town Hall",
    start: today
      .subtract({ days: today.dayOfWeek - 5 })
      .with({ hour: 11, minute: 0 }),
    end: today
      .subtract({ days: today.dayOfWeek - 5 })
      .with({ hour: 12, minute: 0 }),
    color: "#6366f1",
    location: AUDITORIUM,
  },
  {
    id: "w-fri-2",
    title: "Team Retrospective & Demos",
    start: today
      .subtract({ days: today.dayOfWeek - 5 })
      .with({ hour: 16, minute: 0 }),
    end: today
      .subtract({ days: today.dayOfWeek - 5 })
      .with({ hour: 17, minute: 30 }),
    color: "#10b981",
    location: ROOM_A,
  },
];

// Day View: Packed single-day schedule with 15-minute slot intervals
const dayEvents: CalendarEvent[] = [
  {
    id: "d-1",
    title: "Daily Standup & Triage",
    start: today.with({ hour: 8, minute: 30 }),
    end: today.with({ hour: 9, minute: 15 }),
    color: "#0284c7",
    location: ROOM_A,
  },
  {
    id: "d-2",
    title: "Client Onboarding Session",
    start: today.with({ hour: 9, minute: 30 }),
    end: today.with({ hour: 10, minute: 45 }),
    color: "#f59e0b",
    location: ROOM_B,
  },
  {
    id: "d-3",
    title: "Technical Architecture Review",
    start: today.with({ hour: 11, minute: 0 }),
    end: today.with({ hour: 12, minute: 30 }),
    color: "#8b5cf6",
    location: AUDITORIUM,
  },
  {
    id: "d-4",
    title: "Lunch & Tech Talk",
    start: today.with({ hour: 12, minute: 45 }),
    end: today.with({ hour: 13, minute: 45 }),
    color: "#10b981",
    location: ROOM_A,
  },
  {
    id: "d-5",
    title: "Product Discovery Interview",
    start: today.with({ hour: 14, minute: 0 }),
    end: today.with({ hour: 15, minute: 15 }),
    color: "#3b82f6",
    location: FOCUS_POD,
  },
  {
    id: "d-6",
    title: "Security & Compliance Check",
    start: today.with({ hour: 15, minute: 30 }),
    end: today.with({ hour: 16, minute: 30 }),
    color: "#ec4899",
    location: ROOM_B,
  },
  {
    id: "d-7",
    title: "Engineering Sprint Retro",
    start: today.with({ hour: 16, minute: 45 }),
    end: today.with({ hour: 17, minute: 45 }),
    color: "#10b981",
    location: ROOM_A,
  },
];

// Recurrence: Recurring events with contiguous back-to-back blocks to verify non-overlap full width
interface StoryRecurringEvent extends CalendarEvent {
  rrule?: {
    freq: number;
    interval?: number;
  };
}

const recurrenceEvents: StoryRecurringEvent[] = [
  {
    id: "rec-morning",
    title: "Daily Standup",
    start: today.with({ hour: 9, minute: 30 }),
    end: today.with({ hour: 10, minute: 0 }),
    color: "#0284c7",
    rrule: { freq: 3, interval: 1 },
    description: "Daily team check-in and unblocking",
  },
  {
    id: "rec-review",
    title: "Design System Review",
    start: today.with({ hour: 11, minute: 30 }),
    end: today.with({ hour: 13, minute: 0 }),
    color: "#f59e0b",
    description: "Component audit and accessibility inspection",
  },
  // Contiguous non-overlapping sequence: 14:00-15:30 -> 15:30-16:30 -> 16:30-18:00
  {
    id: "rec-interview",
    title: "Customer Discovery Interview",
    start: today.with({ hour: 14, minute: 0 }),
    end: today.with({ hour: 15, minute: 30 }),
    color: "#8b5cf6",
    description: "User research session",
  },
  {
    id: "rec-allhands",
    title: "Weekly Engineering All-Hands",
    start: today.with({ hour: 15, minute: 30 }),
    end: today.with({ hour: 16, minute: 30 }),
    color: "#3b82f6",
    rrule: { freq: 2, interval: 1 },
    description: "Engineering updates, RFC reviews, and announcements",
  },
  {
    id: "rec-retro",
    title: "Team Demo & Retrospective",
    start: today.with({ hour: 16, minute: 30 }),
    end: today.with({ hour: 18, minute: 0 }),
    color: "#10b981",
    description: "Sprint demo showcase and feedback",
  },
];

// Drag to Create: Clean canvas with anchors
const dragToCreateEvents: CalendarEvent[] = [
  {
    id: "dtc-1",
    title: "Morning Status Check",
    start: today.with({ hour: 9, minute: 0 }),
    end: today.with({ hour: 10, minute: 0 }),
    color: "#0284c7",
  },
  {
    id: "dtc-2",
    title: "Team Alignment",
    start: today.with({ hour: 11, minute: 30 }),
    end: today.with({ hour: 12, minute: 30 }),
    color: "#f59e0b",
  },
];

// ---------------------------------------------------------------------------
// 4. Meta Configuration
// ---------------------------------------------------------------------------
const meta: Meta<typeof Calendar> = {
  title: "Components/Schedule",
  component: Calendar,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
  },
  argTypes: {
    initialView: {
      control: "select",
      options: ["month", "week", "day", "year"],
      description: "Active view of the schedule",
    },
    timeFormat: {
      control: "select",
      options: ["12-hour", "24-hour"],
      description: "Time format display (12h AM/PM vs 24h military)",
    },
    hour12: {
      control: "boolean",
      description: "Direct hour12 toggle",
    },
    firstDayOfWeek: {
      control: "select",
      options: ["sunday", "monday", "saturday"],
      description: "First day of week (sunday, monday, saturday)",
    },
    stickyViewHeader: {
      control: "boolean",
      description: "Whether view headers stick to the top on scroll",
    },
  },
  args: {
    initialDate: today,
    initialView: "week",
    timeFormat: "12-hour",
    firstDayOfWeek: "sunday",
    stickyViewHeader: true,
  },
};

export default meta;

type Story = StoryObj<typeof Calendar>;

// ---------------------------------------------------------------------------
// 5. Stories
// ---------------------------------------------------------------------------

export const InteractivePlayground: Story = {
  name: "Interactive Playground (Controls Enabled)",
  render: (args) => (
    <div className="h-[750px] w-full rounded-xl border p-4 shadow-sm">
      <Calendar {...args} events={weekEvents} />
    </div>
  ),
};

export const MonthView: Story = {
  name: "Month View",
  args: {
    initialView: "month",
  },
  render: (args) => (
    <div className="h-[750px] w-full rounded-xl border p-4 shadow-sm">
      <Calendar {...args} events={monthEvents} initialView="month" />
    </div>
  ),
};

export const WeekView: Story = {
  name: "Week View",
  args: {
    initialView: "week",
  },
  render: (args) => (
    <div className="h-[750px] w-full rounded-xl border p-4 shadow-sm">
      <Calendar
        {...args}
        events={weekEvents}
        initialView="week"
        slotDuration={30}
      />
    </div>
  ),
};

export const DayView: Story = {
  name: "Day View",
  args: {
    initialView: "day",
  },
  render: (args) => (
    <div className="h-[750px] w-full rounded-xl border p-4 shadow-sm">
      <Calendar
        {...args}
        events={dayEvents}
        initialView="day"
        slotDuration={15}
      />
    </div>
  ),
};

export const CrossMidnightScheduleDay: Story = {
  name: "Cross-Midnight: Day View (13:00 → 02:00 Next Day)",
  args: {
    initialView: "day",
  },
  render: (args) => (
    <div className="space-y-3">
      <div className="bg-muted/40 text-muted-foreground rounded-lg border p-3 text-xs">
        🌙 <strong>Overnight Hours (13:00 → 02:00 Next Day)</strong>: The
        schedule window starts at 13:00 in the afternoon and runs continuously
        past midnight until 02:00 of the following day. Events spanning across
        midnight (e.g. 23:00 to 00:30) and events situated entirely after
        midnight (00:30 to 02:00) render cleanly within the continuous grid.
      </div>
      <div className="h-[750px] w-full rounded-xl border p-4 shadow-sm">
        <Calendar
          {...args}
          businessHours={{
            startTime: "13:00",
            endTime: "02:00",
          }}
          events={crossMidnightEvents.filter((e) => e.resourceId === "r2")}
          hideNonBusinessHours={true}
          initialDate={today}
          initialView="day"
          slotDuration={30}
          timeFormat="24-hour"
        />
      </div>
    </div>
  ),
};

export const CrossMidnightVerticalResources: Story = {
  name: "Cross-Midnight: Vertical Resources (13:00 → 02:00 Next Day)",
  args: {
    initialView: "day",
  },
  render: (args) => (
    <div className="space-y-3">
      <div className="bg-muted/40 text-muted-foreground rounded-lg border p-3 text-xs">
        🏢{" "}
        <strong>Overnight Multi-Resource Grid (13:00 → 02:00 Next Day)</strong>:
        Side-by-side resource columns (Resource A, Resource B, Resource C)
        displaying an afternoon-to-overnight schedule where operations span
        across midnight into the next day.
      </div>
      <div className="h-[750px] w-full rounded-xl border p-4 shadow-sm">
        <Calendar
          {...args}
          businessHours={{
            startTime: "13:00",
            endTime: "02:00",
          }}
          events={crossMidnightEvents}
          hideNonBusinessHours={true}
          initialDate={today}
          initialView="day"
          orientation="vertical"
          resources={crossMidnightResources}
          slotDuration={30}
          timeFormat="24-hour"
        />
      </div>
    </div>
  ),
};

export const CrossMidnightHorizontalResources: Story = {
  name: "Cross-Midnight: Horizontal Resources (13:00 → 02:00 Next Day)",
  args: {
    initialView: "day",
  },
  render: (args) => (
    <div className="space-y-3">
      <div className="bg-muted/40 text-muted-foreground rounded-lg border p-3 text-xs">
        ↔️ <strong>Overnight Horizontal Rows (13:00 → 02:00 Next Day)</strong>:
        Resources arranged as horizontal rows with hours advancing across
        columns from 13:00 to 02:00 past midnight.
      </div>
      <div className="h-[750px] w-full rounded-xl border p-4 shadow-sm">
        <Calendar
          {...args}
          businessHours={{
            startTime: "13:00",
            endTime: "02:00",
          }}
          events={crossMidnightEvents}
          hideNonBusinessHours={true}
          initialDate={today}
          initialView="day"
          orientation="horizontal"
          resources={crossMidnightResources}
          slotDuration={30}
          timeFormat="24-hour"
        />
      </div>
    </div>
  ),
};

export const TimeFormat24Hour: Story = {
  name: "24-Hour Time Format",
  args: {
    initialView: "week",
    timeFormat: "24-hour",
  },
  render: (args) => (
    <div className="space-y-3">
      <div className="bg-muted/40 text-muted-foreground rounded-lg border p-3 text-xs">
        ⏱️ <strong>24-Hour Format</strong>: Hour gutters, event form dialog
        pickers, and timeline views use international 24-hour military notation
        (e.g. <code>09:00</code>, <code>14:30</code>, <code>22:00</code>).
      </div>
      <div className="h-[750px] w-full rounded-xl border p-4 shadow-sm">
        <Calendar
          {...args}
          events={weekEvents}
          initialDate={today}
          initialView="week"
          slotDuration={30}
          timeFormat="24-hour"
        />
      </div>
    </div>
  ),
};

export const YearView: Story = {
  name: "Year View",
  args: {
    initialView: "year",
  },
  render: (args) => (
    <div className="h-[750px] w-full rounded-xl border p-4 shadow-sm">
      <Calendar {...args} events={monthEvents} initialView="year" />
    </div>
  ),
};

export const ResourceVertical: Story = {
  name: "Multi-Resource (Vertical Columns)",
  render: (args) => (
    <div className="h-[750px] w-full rounded-xl border p-4 shadow-sm">
      <Calendar
        {...args}
        events={weekEvents.map((e, i) => ({
          ...e,
          resourceId: sampleResources[i % sampleResources.length]?.id,
        }))}
        initialDate={today}
        initialView="day"
        orientation="vertical"
        resources={sampleResources}
        slotDuration={30}
      />
    </div>
  ),
};

export const ResourceHorizontal: Story = {
  name: "Multi-Resource (Horizontal Rows)",
  render: (args) => (
    <div className="h-[750px] w-full rounded-xl border p-4 shadow-sm">
      <Calendar
        {...args}
        events={weekEvents.map((e, i) => ({
          ...e,
          resourceId: sampleResources[i % sampleResources.length]?.id,
        }))}
        initialDate={today}
        initialView="day"
        orientation="horizontal"
        resources={sampleResources}
        slotDuration={30}
      />
    </div>
  ),
};

export const AgendaPluginView: Story = {
  name: "Plugin: Agenda Timeline View",
  render: (args) => (
    <div className="h-[750px] w-full rounded-xl border p-4 shadow-sm">
      <Calendar
        {...args}
        events={weekEvents}
        initialDate={today}
        initialView="agenda"
        plugins={[agendaPlugin()]}
      />
    </div>
  ),
};

export const DragToCreate: Story = {
  name: "Plugin: Drag to Create",
  render: (args) => (
    <div className="space-y-3">
      <div className="border-primary/20 bg-primary/5 text-foreground rounded-lg border p-3 text-xs">
        ✨ <strong>How to use Drag to Create</strong>: Click and hold any empty
        time slot in the calendar, drag downwards across the hours you want to
        book, and release your pointer. The event creation modal will pop up
        pre-filled with the exact selected start and end times.
      </div>
      <div className="h-[750px] w-full rounded-xl border p-4 shadow-sm">
        <Calendar
          {...args}
          events={dragToCreateEvents}
          initialDate={today}
          initialView="week"
          plugins={[dragToCreatePlugin()]}
          slotDuration={30}
        />
      </div>
    </div>
  ),
};

export const RecurrenceRFC5545: Story = {
  name: "Plugin: Recurrence (RFC 5545 RRULE)",
  render: (args) => (
    <div className="space-y-3">
      <div className="bg-muted/40 text-muted-foreground rounded-lg border p-3 text-xs">
        🔄 <strong>Recurrence & Contiguous Events</strong>: Contiguous
        non-overlapping events (14:00–15:30, 15:30–16:30, 16:30–18:00) render at
        100% full column width without being artificially split in half.
      </div>
      <div className="h-[750px] w-full rounded-xl border p-4 shadow-sm">
        <Calendar
          {...args}
          events={recurrenceEvents}
          initialDate={today}
          initialView="week"
          plugins={[recurrencePlugin()]}
          slotDuration={30}
        />
      </div>
    </div>
  ),
};

export const CustomEventRenderer: Story = {
  name: "Custom Event Renderer (with Segment Info)",
  render: (args) => (
    <div className="h-[750px] w-full rounded-xl border p-4 shadow-sm">
      <Calendar
        {...args}
        events={weekEvents}
        initialDate={today}
        initialView="week"
        renderEvent={(event: CalendarEvent, segment?: EventSegment) => {
          const isStart = segment?.isStart ?? true;
          const isEnd = segment?.isEnd ?? true;

          const hasLocation =
            event.location !== undefined && event.location !== "";

          return (
            <div
              className={`flex h-full w-full flex-col justify-between overflow-hidden border p-1.5 text-xs text-white transition-opacity hover:opacity-90 ${
                isStart ? "rounded-t-md" : "rounded-t-none border-t-0"
              } ${isEnd ? "rounded-b-md" : "rounded-b-none border-b-0"}`}
              style={{
                backgroundColor: event.color ?? "#0284c7",
                borderColor: "rgba(255,255,255,0.25)",
              }}
            >
              <div className="flex items-center gap-1.5 truncate font-semibold">
                <span>🗓️</span>
                <span className="truncate">{event.title}</span>
              </div>
              {hasLocation && (
                <div className="truncate text-[10px] opacity-80">
                  📍 {event.location}
                </div>
              )}
            </div>
          );
        }}
        slotDuration={30}
      />
    </div>
  ),
};

export const BusinessHoursRestrictions: Story = {
  name: "Business Hours & Clamping",
  render: (args) => (
    <div className="h-[750px] w-full rounded-xl border p-4 shadow-sm">
      <Calendar
        {...args}
        businessHours={{
          daysOfWeek: [
            "monday",
            "tuesday",
            "wednesday",
            "thursday",
            "friday",
            "saturday",
          ],
          startTime: "08:00",
          endTime: "22:00",
        }}
        events={weekEvents}
        initialDate={today}
        initialView="week"
        slotDuration={30}
      />
    </div>
  ),
};

export const SpanishLocale: Story = {
  name: "Localization (Spanish)",
  render: (args) => (
    <div className="h-[750px] w-full rounded-xl border p-4 shadow-sm">
      <Calendar
        {...args}
        events={monthEvents}
        initialDate={today}
        initialView="month"
        locale="es"
        translations={esTranslations}
      />
    </div>
  ),
};

export const KitchenSinkAllPlugins: Story = {
  name: "Full Kitchen Sink (All Plugins Active)",
  render: (args) => (
    <div className="h-[750px] w-full rounded-xl border p-4 shadow-sm">
      <Calendar
        {...args}
        events={recurrenceEvents}
        initialDate={today}
        initialView="week"
        plugins={[dragToCreatePlugin(), recurrencePlugin(), agendaPlugin()]}
        resources={sampleResources}
        slotDuration={30}
      />
    </div>
  ),
};
