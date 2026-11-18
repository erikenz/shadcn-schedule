import "@testing-library/jest-dom/vitest";

// The calendar's Temporal helpers default to the process timezone until
// `setDefaultTimeZone()` runs inside a mounted calendar.
// Pin UTC so pure unit tests (recurrence math, layout) are deterministic
// regardless of the machine's local zone.
process.env.TZ = "UTC";
