/**
 * The areas a manager can grant access to, and what each level means.
 *
 * Three levels rather than a grid of checkboxes: none, view, edit. That is
 * how the current app presents it, and it is the right shape -- write
 * without read is meaningless, and nobody has ever wanted it.
 *
 * The descriptions are shown to the manager doing the granting, so they say
 * what the person will be able to do rather than naming the permission.
 */
export const ACCESS_AREAS = [
  {
    resource: "jobs",
    label: "Jobs",
    view: "See jobs, their details and their progress",
    edit: "Create and change job records",
  },
  {
    resource: "site-diary",
    label: "Site diary",
    view: "Read diary entries and their photos",
    edit: "Write entries, add photos and manage notes",
  },
  {
    resource: "call-forward",
    label: "Call forward",
    view: "See each job's programme",
    edit: "Change the programme, its dates and its templates",
  },
  {
    resource: "trade-scheduler",
    label: "Trade scheduler",
    view: "See the weekly schedule, workers and leave",
    edit: "Allocate workers, record leave and change the schedule",
  },
  {
    resource: "reports",
    label: "Reports",
    view: "Run the project reports",
    // Reports are read-only: there is nothing to grant beyond seeing them.
    edit: null,
  },
] as const;

export type AccessLevel = "none" | "view" | "edit";

export function levelOf(resource: string, held: Set<string>): AccessLevel {
  if (held.has(`${resource}:write`)) return "edit";
  if (held.has(`${resource}:read`)) return "view";
  return "none";
}

/**
 * Applies a level, replacing whatever was there.
 *
 * "edit" grants read as well: an area someone can change but not see is not
 * a state the product has ever meant to allow.
 */
export function withLevel(resource: string, level: AccessLevel, held: Set<string>): Set<string> {
  const next = new Set(held);
  next.delete(`${resource}:read`);
  next.delete(`${resource}:write`);
  if (level === "view") next.add(`${resource}:read`);
  if (level === "edit") {
    next.add(`${resource}:read`);
    next.add(`${resource}:write`);
  }
  return next;
}

export function toPermissions(held: Set<string>): { resource: string; action: string }[] {
  return [...held].flatMap((key) => {
    const [resource, action] = key.split(":");
    if (resource === undefined || action === undefined) return [];
    return [{ resource, action }];
  });
}
