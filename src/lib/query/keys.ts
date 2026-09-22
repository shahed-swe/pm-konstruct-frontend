/**
 * Query keys, in one place and hierarchical.
 *
 * Hierarchical so an invalidation can be as broad or as narrow as the change
 * warrants: saving a diary note invalidates `diary.notes(entryId)` and
 * nothing else, while deleting a job invalidates `jobs.all` and every list
 * under it in one call. The legacy passed literal arrays at each call site,
 * which is why several mutations invalidated `["jobs"]` and `["/api/jobs"]`
 * inconsistently and a renamed job stayed stale in the sidebar.
 *
 * Every key starts with its resource, so `queryClient.removeQueries({ queryKey:
 * jobs.all })` on sign-out clears a whole area without naming each list.
 */

export const keys = {
  session: {
    all: ["session"] as const,
    me: () => [...keys.session.all, "me"] as const,
    permissions: () => [...keys.session.all, "permissions"] as const,
  },

  branding: {
    all: ["branding"] as const,
    current: () => [...keys.branding.all, "current"] as const,
  },

  jobs: {
    all: ["jobs"] as const,
    list: (filters?: Record<string, unknown>) =>
      [...keys.jobs.all, "list", filters ?? {}] as const,
    detail: (id: number) => [...keys.jobs.all, "detail", id] as const,
    notes: (id: number) => [...keys.jobs.detail(id), "notes"] as const,
    files: (id: number) => [...keys.jobs.detail(id), "files"] as const,
    links: (id: number) => [...keys.jobs.detail(id), "links"] as const,
    assignments: (id: number) => [...keys.jobs.detail(id), "assignments"] as const,
    tasks: (id: number) => [...keys.jobs.detail(id), "tasks"] as const,
    etos: (id: number) => [...keys.jobs.detail(id), "etos"] as const,
  },

  diary: {
    all: ["diary"] as const,
    list: (filters?: Record<string, unknown>) =>
      [...keys.diary.all, "list", filters ?? {}] as const,
    detail: (id: number) => [...keys.diary.all, "detail", id] as const,
    notes: (id: number) => [...keys.diary.detail(id), "notes"] as const,
    weather: (id: number) => [...keys.diary.detail(id), "weather"] as const,
  },

  media: {
    all: ["media"] as const,
    forJob: (id: number) => [...keys.media.all, "job", id] as const,
    forDiary: (id: number) => [...keys.media.all, "diary", id] as const,
  },

  callForward: {
    all: ["call-forward"] as const,
    list: (filters?: Record<string, unknown>) =>
      [...keys.callForward.all, "list", filters ?? {}] as const,
    board: () => [...keys.callForward.all, "board"] as const,
    templates: () => [...keys.callForward.all, "templates"] as const,
  },

  dashboard: {
    all: ["dashboard"] as const,
    stats: () => [...keys.dashboard.all, "stats"] as const,
    calendar: (month: string) => [...keys.dashboard.all, "calendar", month] as const,
    calendarFilters: () => [...keys.dashboard.all, "calendar", "filters"] as const,
    actionItems: () => [...keys.dashboard.all, "action-items"] as const,
    delays: () => [...keys.dashboard.all, "delays"] as const,
    stageClaims: () => [...keys.dashboard.all, "stage-claims"] as const,
    upcomingTasks: () => [...keys.dashboard.all, "upcoming-tasks"] as const,
  },

  scheduler: {
    all: ["scheduler"] as const,
    workers: () => [...keys.scheduler.all, "workers"] as const,
    allocations: (week: string) => [...keys.scheduler.all, "allocations", week] as const,
    absences: (week: string) => [...keys.scheduler.all, "absences", week] as const,
    dayNotes: (week: string) => [...keys.scheduler.all, "day-notes", week] as const,
  },

  forms: {
    all: ["forms"] as const,
    inspections: (filters?: Record<string, unknown>) =>
      [...keys.forms.all, "inspections", filters ?? {}] as const,
    inspection: (id: number) => [...keys.forms.all, "inspection", id] as const,
    etos: (filters?: Record<string, unknown>) => [...keys.forms.all, "eto", filters ?? {}] as const,
  },

  progress: {
    all: ["progress"] as const,
    daily: (jobId: number) => [...keys.progress.all, "daily", jobId] as const,
    job: (jobId: number) => [...keys.progress.all, "job", jobId] as const,
  },

  reports: {
    all: ["reports"] as const,
    run: (kind: string, params: Record<string, unknown>) =>
      [...keys.reports.all, kind, params] as const,
  },

  users: {
    all: ["users"] as const,
    list: () => [...keys.users.all, "list"] as const,
    detail: (id: number) => [...keys.users.all, "detail", id] as const,
    permissions: (id: number) => [...keys.users.detail(id), "permissions"] as const,
  },

  settings: {
    all: ["settings"] as const,
    email: () => [...keys.settings.all, "email"] as const,
    emailStatus: () => [...keys.settings.all, "email", "status"] as const,
  },

  notifications: {
    all: ["notifications"] as const,
    list: () => [...keys.notifications.all, "list"] as const,
    prefs: () => [...keys.notifications.all, "prefs"] as const,
    vapidKey: () => [...keys.notifications.all, "vapid"] as const,
  },

  billing: {
    all: ["billing"] as const,
    status: () => [...keys.billing.all, "status"] as const,
    plans: () => [...keys.billing.all, "plans"] as const,
  },

  weather: {
    all: ["weather"] as const,
    at: (lat: number, lon: number) => [...keys.weather.all, lat, lon] as const,
  },
} as const;
