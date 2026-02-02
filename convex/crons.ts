import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "cleanup orphaned pending generations",
  { minutes: 5 },
  internal.generations.cleanupOrphaned,
);

export default crons;
