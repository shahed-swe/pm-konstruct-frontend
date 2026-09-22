/**
 * Generated from the Rust DTOs. Do not edit.
 *
 * Regenerate with `tools/dev/gen-types.py`; CI runs it with `--check`, so a
 * DTO changed without regenerating fails the build rather than reaching a
 * page as a type error nobody sees until runtime.
 *
 * Optionals are `T | null` rather than `T?` because serde emits the key with
 * a null value; a consumer testing `"field" in response` would be misled by
 * the other spelling. A `?` here means the key really can be absent.
 */

// ── auth ────────────────────────────────────────────────────────

export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * Matches the legacy `{ token, user }` response so existing clients and the
 * captured fixtures need no changes.
 */
export interface LoginResponse {
  token: string;
  user: UserDto;
}

export interface UserDto {
  id: number;
  companyId: number;
  name: string;
  email: string;
  role: string;
  phone: string | null;
  active: boolean;
}

export interface PermissionDto {
  resource: string;
  action: string;
}

/**
 * `GET /auth/permissions` -- the effective set after the managed sentinel is
 * applied, not the raw stored rows.
 */
export interface PermissionsResponse {
  permissions: PermissionDto[];
}

/**
 * The entitlement summary carried on `/auth/me`, so the client knows
 * whether to show the application or redirect to billing.
 *
 * Not the billing page's own status, which is `dto::billing::BillingStatusDto`
 * and reads the subscription from Stripe. This one is derived from what the
 * session already resolved and costs nothing extra.
 */
export interface EntitlementDto {
  accessAllowed: boolean;
  onboardingComplete: boolean;
  canConfigureAccount: boolean;
}

/**
 * `GET /auth/me`.
 */
export interface MeResponse {
  user: UserDto;
  permissions: PermissionDto[];
  billing: EntitlementDto;
}

export interface HealthResponse {
  status: string;
  ready: boolean;
}

export interface ReadyResponse {
  status: string;
  database: boolean;
  migrations: boolean;
}

/**
 * Whether this installation still needs its first account.
 */
export interface SetupStatusDto {
  needsSetup: boolean;
}

/**
 * The first-run form, plus the shared secret that authorises it.
 */
export interface SetupRequest {
  setupKey: string;
  name: string;
  email: string;
  password: string;
  phone: string | null;
  companyName: string | null;
}

/**
 * The public sign-up form.
 */
export interface RegisterRequest {
  companyName: string;
  name: string;
  email: string;
  password: string;
  phone: string | null;
}

export interface ForgotPasswordRequest {
  email: string;
}

/**
 * Always the same wording, whatever happened.
 */
export interface MessageDto {
  message: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
}

// ── billing ─────────────────────────────────────────────────────

export interface PlanDto {
  key: string;
  label: string;
  minSeats: number;
  maxSeats: number | null;
  /** Cents per seat per month. */
  unitAmount: number;
}

/**
 * The pricing page. Public: it is what a prospect sees before signing up.
 */
export interface PlansDto {
  currency: string;
  trialDays: number;
  plans: PlanDto[];
}

export interface BillingStatusDto {
  status: string;
  hasAccess: boolean;
  onboardingComplete: boolean;
  activeUsers: number;
  seatLimit: number;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  trialEndsAt: string | null;
  planKey: string | null;
}

export interface CheckoutRequestDto {
  planKey: string;
  seatQuantity: number;
}

export interface ConfirmCheckoutRequest {
  sessionId: string;
}

export interface ReadinessRequest {
  setupKey: string;
}

/**
 * Where to send the customer next.
 */
export interface HostedSessionDto {
  sessionId: string;
  url: string;
}

export interface ReadinessDto {
  configured: boolean;
  livemode: boolean | null;
  expectedLivemode: boolean;
  modeMatches: boolean;
  ready: boolean;
  prices: PriceStatusDto[];
  problems: string[];
}

export interface PriceStatusDto {
  planKey: string;
  priceId: string | null;
}

// ── call_forward ────────────────────────────────────────────────

export interface CallForwardDto {
  id: number;
  jobId: number;
  title: string;
  itemType: string;
  supplierTrade: string | null;
  estStart: string | null;
  estFinish: string | null;
  actualStart: string | null;
  actualFinish: string | null;
  status: string;
  notes: string | null;
  sortOrder: number;
  parentId: number | null;
  /** Computed, never stored. */
  delayStatus: string;
  /** Only ever set when `delayStatus` is `delayed`. */
  delayDays: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface CallForwardRequest {
  jobId: number | null;
  title: string;
  itemType: string | null;
  supplierTrade: string | null;
  estStart: string | null;
  estFinish: string | null;
  actualStart: string | null;
  actualFinish: string | null;
  status: string | null;
  notes: string | null;
  sortOrder: number | null;
  parentId: number | null;
  /**
   * Index into the same list for bulk creates, so a hierarchy can be
   * described before any ids exist.
   */
  localParent: number | null;
}

export interface BulkCreateRequest {
  jobId: number;
  items: CallForwardRequest[];
}

export interface ReorderItem {
  id: number;
  sortOrder: number;
  /** Absent leaves parentage untouched; an explicit `null` detaches to root. */
  parentId?: number | null;
}

export interface ReorderRequest {
  items: ReorderItem[];
}

export interface ReorderResponse {
  updated: number;
}

export interface CallForwardListQuery {
  jobId: number | null;
  status: string | null;
  parentId: number | null;
}

export interface UpcomingQuery {
  days: number | null;
}

export interface TemplateItemDto {
  localId: number;
  localParentId: number | null;
  title: string;
  itemType: string;
  supplierTrade: string | null;
  sortOrder: number;
}

export interface TemplateDto {
  id: number;
  name: string;
  description: string | null;
  items: TemplateItemDto[];
  createdAt: string;
  updatedAt: string;
}

/**
 * A template is captured from a job, never authored by hand: that way it
 * always reflects a programme that really existed.
 */
export interface CreateTemplateRequest {
  name: string;
  description: string | null;
  jobId: number;
}

export interface RenameTemplateRequest {
  name: string;
  description: string | null;
}

export interface ApplyTemplateRequest {
  jobId: number;
  /**
   * Clears the job's existing programme first. Destructive, so it is off
   * unless explicitly asked for.
   */
  replace?: boolean;
}

export interface AppliedDto {
  applied: number;
}

// ── dashboard ───────────────────────────────────────────────────

export interface DashboardStatsDto {
  totalJobs: number;
  activeJobs: number;
  completedJobs: number;
  openCallForwards: number;
  overdueCallForwards: number;
  /** Null for everyone but a manager. */
  totalUsers: number | null;
  recentDiaryEntries: number;
}

export interface DashboardJobDto {
  id: number;
  jobNumber: string | null;
  address: string | null;
  name: string | null;
  status: string;
  startDate: string | null;
  endDate: string | null;
}

export interface DashboardCallForwardDto {
  id: number;
  jobId: number;
  jobNumber: string | null;
  jobAddress: string | null;
  title: string;
  itemType: string;
  estStart: string | null;
  estFinish: string | null;
  status: string;
}

export interface DashboardDiaryDto {
  id: number;
  jobId: number;
  jobNumber: string | null;
  jobAddress: string | null;
  date: string;
  workCompleted: string | null;
  authorName: string | null;
}

export interface UpcomingClaimDto {
  id: number;
  jobId: number;
  jobName: string | null;
  jobAddress: string | null;
  jobNumber: string | null;
  title: string;
  estStart: string | null;
  estFinish: string | null;
  actualStart: string | null;
  actualFinish: string | null;
  status: string;
  notes: string | null;
}

export interface DelaySeverityDto {
  label: string;
  count: number;
  avgDays: number;
  maxDays: number;
}

export interface ActionItemDto {
  noteId: number;
  diaryEntryId: number;
  category: string;
  content: string;
  actionStatus: string;
  actionRaisedBy: number | null;
  createdAt: string;
  entryDate: string;
  jobId: number;
  jobName: string | null;
  jobNumber: string | null;
  jobAddress: string | null;
  authorId: number | null;
  authorName: string | null;
  latestCommentContent: string | null;
  latestCommentAuthor: string | null;
  latestCommentAt: string | null;
}

/**
 * The calendar's query string.
 */
export interface CalendarQueryParams {
  month: string | null;
  /** The legacy parameter is `gantt`; it means "ignore the month". */
  gantt?: string | null;
  jobId: number | null;
  supervisorId: number | null;
  type: string | null;
}

export interface CalendarEventDto {
  id: string;
  type: string;
  title: string;
  start: string;
  end: string;
  estStart: string | null;
  estFinish: string | null;
  actualStart: string | null;
  actualFinish: string | null;
  jobId: number;
  jobName: string;
  jobNumber: string;
  jobAddress: string | null;
  supervisorId: number | null;
  supervisorName: string | null;
  status: string;
  supplierTrade: string | null;
  url: string;
}

export interface CalendarFilterJobDto {
  id: number;
  name: string;
  jobNumber: string;
  address: string | null;
}

export interface CalendarFilterSupervisorDto {
  id: number;
  name: string;
}

export interface CalendarFiltersDto {
  jobs: CalendarFilterJobDto[];
  supervisors: CalendarFilterSupervisorDto[];
}

// ── diary ───────────────────────────────────────────────────────

export interface DiaryEntryDto extends WeatherDto {
  id: number;
  jobId: number;
  date: string;
  time: string | null;
  authorId: number | null;
  weather: string | null;
  workforce: number | null;
  workCompleted: string;
  materials: string | null;
  tradesOnSite: string | null;
  safetyNotes: string | null;
  clientInstructions: string | null;
  equipment: string | null;
  visitors: string | null;
  issues: string | null;
  notes: string | null;
  actionStatus: string | null;
  actionRaisedBy: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface DiaryEntryRequest {
  jobId: number | null;
  date: string | null;
  time: string | null;
  weather: string | null;
  workforce: number | null;
  workCompleted: string | null;
  materials: string | null;
  tradesOnSite: string | null;
  safetyNotes: string | null;
  clientInstructions: string | null;
  equipment: string | null;
  visitors: string | null;
  issues: string | null;
  notes: string | null;
  actionStatus: string | null;
}

export interface DiaryNoteDto {
  id: number;
  diaryEntryId: number;
  category: string;
  content: string;
  actionStatus: string | null;
  actionRaisedBy: number | null;
  sortOrder: number;
  archived: boolean;
  createdAt: string;
}

export interface DiaryNoteRequest {
  category: string | null;
  content: string;
  actionStatus: string | null;
  sortOrder: number | null;
}

export interface ActionStatusRequest {
  actionStatus: string | null;
}

export interface DiaryCommentDto {
  id: number;
  noteId: number;
  authorId: number | null;
  authorName: string | null;
  content: string;
  createdAt: string;
}

export interface CommentRequest {
  content: string;
}

export interface DiaryListQuery {
  jobId: number | null;
  from: string | null;
  to: string | null;
  actionStatus: string | null;
  includeArchived?: boolean;
}

/**
 * Emailing a diary entry to colleagues on the job.
 */
export interface EmailEntryRequest {
  to: string[];
  subject?: string;
  customMessage: string | null;
}

/**
 * What was actually sent, and to whom.
 */
export interface EmailSentDto {
  success: boolean;
  message: string;
}

// ── forms ───────────────────────────────────────────────────────

export interface EtoRequest {
  jobId: number;
  reason?: string;
  details?: string;
}

export interface EtoRaisedDto {
  entryId: number;
  noteId: number;
  etoNumber: number;
  poNumber: string;
  raisedBy: string;
  /** Always `action`: a new ETO is pending manager approval by definition. */
  status: string;
}

export interface EtoListItemDto {
  noteId: number;
  entryId: number;
  etoNumber: string;
  content: string;
  raisedBy: string;
  diaryDate: string;
  approvedAt: string;
  jobNumber: string | null;
  jobName: string | null;
  jobAddress: string | null;
}

export interface DraftRequest {
  jobId: number;
}

export interface InspectionItemRequest {
  clientKey: string;
  room?: string;
  description?: string;
  actioned?: boolean;
  sortOrder?: number | null;
}

export interface InspectionDraftRequest {
  inspector?: string;
  inspectionType?: string;
  stage?: string;
  observations?: string;
  weatherData?: unknown | null;
  /**
   * The revision the client last read. Required -- defaulting it to 0 would
   * turn every stale save into a silent overwrite of the first one.
   */
  revision?: number;
  items?: InspectionItemRequest[];
}

export interface InspectionPhotoDto {
  id: number;
  itemId: number;
  diaryMediaId: number;
  sortOrder: number;
  originalName: string;
  mimeType: string;
  fileSize: number;
  url: string;
}

export interface InspectionItemDto {
  id: number;
  clientKey: string;
  room: string;
  description: string;
  actioned: boolean;
  sortOrder: number;
  photos: InspectionPhotoDto[];
}

export interface InspectionFormDto {
  id: number;
  companyId: number;
  jobId: number;
  createdBy: number;
  diaryEntryId: number;
  diaryNoteId: number;
  inspectionDate: string;
  inspector: string;
  inspectionType: string;
  stage: string;
  observations: string;
  weatherData: unknown | null;
  revision: number;
  createdAt: string;
  updatedAt: string;
  items: InspectionItemDto[];
}

export interface PreparedInspectionUploadDto {
  storedName: string;
  uploadUrl: string;
  expiresInSecs: number;
  maxBytes: number;
}

export interface ConfirmInspectionPhoto {
  storedName: string;
  originalName: string;
  mimeType: string;
}

export interface ConfirmInspectionPhotos {
  files: ConfirmInspectionPhoto[];
}

/**
 * Emailing a form to colleagues on the job.
 */
export interface EmailFormRequest {
  jobId: number;
  to: string[];
  subject: string;
  body: string;
}

// ── job ─────────────────────────────────────────────────────────

export interface JobDto {
  id: number;
  companyId: number;
  name: string;
  jobNumber: string;
  client: string;
  clientNumber: string | null;
  clientEmail: string | null;
  address: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  managerId: number | null;
  supervisorId: number | null;
  dropboxPath: string | null;
  description: string | null;
  contact2Name: string | null;
  contact2Phone: string | null;
  contact2Email: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface JobUpsertRequest {
  name: string;
  jobNumber: string;
  client: string;
  clientNumber: string | null;
  clientEmail: string | null;
  address: string;
  status: string | null;
  startDate: string | null;
  endDate: string | null;
  managerId: number | null;
  supervisorId: number | null;
  dropboxPath: string | null;
  description: string | null;
  contact2Name: string | null;
  contact2Phone: string | null;
  contact2Email: string | null;
}

export interface AssignmentDto {
  /**
   * The assigned user's id. The legacy response called this `id` while it
   * held a user id; both are emitted so existing clients keep working.
   */
  id: number;
  userId: number;
  name: string;
  role: string;
  isPrimary: boolean;
  assignedAt: string;
}

export interface AddAssignmentRequest {
  userId: number;
  isPrimary?: boolean;
}

export interface JobTaskDto {
  id: number;
  jobId: number;
  title: string;
  status: string;
  notes: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface JobTaskRequest {
  title: string;
  status: string | null;
  notes: string | null;
  sortOrder: number | null;
}

export interface TaskNotesRequest {
  notes: string | null;
}

export interface JobListQuery {
  status: string | null;
  supervisorId: number | null;
  search: string | null;
}

/**
 * A cloud-storage link on a job.
 *
 * Stored in `job_dropbox_folders`, but provider-agnostic: the client's
 * requirement is "any cloud based server. Google, Dropbox etc."
 */
export interface JobLinkDto {
  id: number;
  jobId: number;
  label: string;
  url: string;
  sortOrder: number;
  createdAt: string;
}

export interface JobLinkRequest {
  label: string;
  /** Accepts `path` too, which is what the legacy column is called. */
  url: string;
  sortOrder: number | null;
}

/**
 * `DELETE /jobs/{id}?purge=true` deletes for real instead of archiving.
 *
 * Opt-in rather than the default because the cascade reaches diary entries,
 * media, call-forward items and scheduler allocations.
 */
export interface DeleteJobQuery {
  purge?: boolean;
}

// ── media ───────────────────────────────────────────────────────

export interface UploadFileRequest {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}

export interface PrepareUploadRequest {
  /** Attaches the upload to a specific note within the diary entry. */
  noteId: number | null;
  files: UploadFileRequest[];
}

export interface PreparedUploadDto {
  /** PUT the bytes here. Expires; not stored anywhere. */
  uploadUrl: string;
  expiresInSecs: number;
  /** Echo this back to `confirm`. */
  storedName: string;
  originalName: string;
  mimeType: string;
}

export interface ConfirmUploadRequest {
  noteId: number | null;
  storedName: string;
  originalName: string;
  mimeType: string;
}

export interface MediaDto {
  id: number;
  diaryEntryId: number | null;
  noteId: number | null;
  jobId: number | null;
  fileType: string;
  mimeType: string;
  originalName: string;
  storedName: string;
  fileSize: number;
  uploadedBy: number | null;
  createdAt: string;
}

export interface DownloadUrlDto {
  url: string;
}

/**
 * Identifies which table a media id belongs to.
 *
 * `diary_media` and `job_media` have independent sequences, so an id alone is
 * ambiguous. The legacy API had separate routes per table; this keeps that
 * distinction explicit rather than guessing.
 */
export interface MediaScopeQuery {
  jobMedia?: boolean;
}

export interface JobFileDto {
  id: number;
  fileType: string;
  mimeType: string;
  originalName: string;
  /** `inspection-form:{id}` for a draft, a UUID filename for a document. */
  storedName: string;
  fileSize: number;
  url: string;
  createdAt: string;
  uploaderName: string | null;
}

/**
 * One entry of a bulk delete request.
 */
export interface MediaSelectionRequest {
  /** `job` or `diary`. A job's gallery shows both. */
  source: MediaSource;
  id: number;
}

export type MediaSource = "job" | "diary";

export interface BulkDeleteRequest {
  media: MediaSelectionRequest[];
}

export interface BulkDeleteDto {
  deleted: number;
  /**
   * True when objects are queued for the sweeper, which the UI shows as
   * "removing…" until the worker catches up.
   */
  cleanupPending: boolean;
}

// ── notifications ───────────────────────────────────────────────

export interface NotificationDto {
  id: number;
  userId: number;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  readAt: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

/**
 * The bell: a list plus the badge count.
 */
export interface NotificationFeedDto {
  notifications: NotificationDto[];
  unread: number;
}

export interface NotificationPrefsDto {
  notifyActionNotes: boolean;
  notifyCallForward: boolean;
}

/**
 * Absent fields keep their current value, so a client can toggle one switch
 * without having to know the other's state.
 */
export interface UpdatePrefsRequest {
  notifyActionNotes: boolean | null;
  notifyCallForward: boolean | null;
}

export interface PushKeys {
  p256dh: string;
  auth: string;
}

/**
 * The shape `PushSubscription.toJSON()` produces in the browser.
 */
export interface SubscribeRequest {
  endpoint: string;
  keys: PushKeys;
}

export interface UnsubscribeRequest {
  endpoint: string;
}

export interface VapidKeyDto {
  /**
   * Empty when push is not configured. The app works without it, so this
   * is not an error state -- the frontend simply does not offer push.
   */
  publicKey: string;
}

/**
 * `{ "ok": true }`, which several of these routes return verbatim.
 */
export interface OkDto {
  ok: boolean;
}

// ── progress ────────────────────────────────────────────────────

export interface ProgressDto {
  id: number;
  jobId: number;
  date: string;
  percentComplete: number;
  milestone: string | null;
  description: string | null;
  photos: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ProgressRequest {
  /** Ignored on update: a record stays on the job it was raised against. */
  jobId?: number;
  date: string;
  percentComplete: number;
  milestone: string | null;
  description: string | null;
  photos?: string[];
}

export interface ProgressListQuery {
  jobId: number | null;
}

// ── reports ─────────────────────────────────────────────────────

/**
 * The query string every report shares.
 */
export interface ReportQueryParams {
  jobId: number | null;
  supervisorId: number | null;
  authorId: number | null;
  dateFrom: string | null;
  dateTo: string | null;
  status: string | null;
}

/**
 * The daily-progress report names its job and date explicitly.
 */
export interface DailyProgressQuery {
  jobId: number;
  date: string;
}

export interface StoredReportDto {
  id: number;
  jobId: number;
  type: string;
  title: string;
  content: string;
  generatedAt: string;
  createdAt: string;
}

export interface CreateReportRequest {
  jobId: number;
  type: string;
  title: string;
  content?: string;
}

export interface ReportMetaJobDto {
  id: number;
  name: string;
  jobNumber: string;
  status: string;
  address: string | null;
}

export interface ReportMetaDto {
  jobs: ReportMetaJobDto[];
  supervisors: CalendarFilterSupervisorDto[];
}

export interface JobProgressDto {
  jobId: number;
  jobNumber: string;
  jobName: string;
  client: string | null;
  address: string | null;
  status: string;
  startDate: string | null;
  endDate: string | null;
  supervisorId: number | null;
  supervisorName: string | null;
  totalTasks: number;
  notStarted: number;
  inProgress: number;
  completed: number;
  onHold: number;
  delayedCount: number;
  completionPct: number;
  health: string;
}

export interface DelayDto {
  taskId: number;
  title: string;
  itemType: string;
  supplierTrade: string | null;
  jobId: number;
  jobNumber: string;
  jobName: string;
  jobAddress: string | null;
  supervisorId: number | null;
  supervisorName: string | null;
  estFinish: string | null;
  actualFinish: string | null;
  delayDays: number;
  status: string;
  severity: string;
}

export interface DiaryReportDto {
  id: number;
  date: string;
  jobId: number;
  jobNumber: string;
  jobName: string;
  jobAddress: string | null;
  authorId: number | null;
  authorName: string | null;
  weather: string | null;
  workforce: number | null;
  workCompleted: string;
  materials: string;
  tradesOnSite: string;
  safetyNotes: string;
  clientInstructions: string;
  issues: string;
  notes: string;
}

export interface UpcomingTaskDto {
  taskId: number;
  title: string;
  itemType: string;
  supplierTrade: string | null;
  jobId: number;
  jobNumber: string;
  jobName: string;
  jobAddress: string | null;
  supervisorId: number | null;
  supervisorName: string | null;
  estStart: string | null;
  estFinish: string | null;
  daysUntilStart: number | null;
  daysUntilFinish: number | null;
  status: string;
}

export interface StageClaimDto {
  id: number;
  title: string;
  jobId: number;
  jobNumber: string;
  jobName: string;
  jobAddress: string | null;
  supervisorName: string | null;
  supplierTrade: string | null;
  estFinish: string | null;
  actualFinish: string | null;
  status: string;
  /** `YYYY-MM` of the estimated finish, which is how the forecast groups. */
  forecastMonth: string | null;
}

export interface InspectionDto {
  id: number;
  date: string;
  jobId: number;
  jobNumber: string;
  jobName: string;
  jobAddress: string | null;
  inspector: string | null;
  safetyNotes: string | null;
  issues: string | null;
  status: string;
  workforce: number | null;
  tradesOnSite: string | null;
}

export interface WeatherRowDto {
  id: number;
  date: string;
  jobId: number;
  jobNumber: string;
  jobName: string;
  authorName: string | null;
  locationName: string | null;
  weatherCondition: string | null;
  temperature: number | null;
  rainfallMm: number | null;
  windSpeedKmh: number | null;
  isWeatherImpactDay: boolean;
  impactReason: string | null;
  issues: string | null;
  workforce: number | null;
}

export interface WeatherImpactDto {
  rows: WeatherRowDto[];
  totalImpactDays: number;
  totalRainfallMm: number;
  avgTemperature: number | null;
  rainyDays: number;
}

export interface DailyProgressDto {
  date: string;
  jobId: number;
  jobNumber: string;
  jobName: string;
  client: string | null;
  supervisorId: number | null;
  supervisorName: string | null;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  notStartedTasks: number;
  delayedTasks: number;
  daysBehindProgram: number;
  completionPct: number;
  health: string;
  /** Ids of the programme items whose window covers the report date. */
  plannedToday: number[];
  diary: DiaryReportDto | null;
}

export interface SupervisorPerformanceDto {
  supervisorId: number;
  name: string;
  email: string;
  activeJobs: number;
  completedJobs: number;
  totalJobs: number;
  onTimeStartRate: number | null;
  onTimeCompletionRate: number | null;
  delayedTaskCount: number;
  avgDelayDays: number | null;
  diaryComplianceRate: number | null;
  performanceScore: number;
}

// ── scheduler ───────────────────────────────────────────────────

export interface WorkerDto {
  id: number;
  companyId: number;
  name: string;
  trade: string | null;
  color: string;
  active: boolean;
  onLeave: boolean;
  leaveFrom: string | null;
  leaveTo: string | null;
}

export interface WorkerRequest {
  name: string;
  trade: string | null;
  color: string | null;
  active: boolean | null;
}

export interface AbsenceDto {
  id: number;
  workerId: number;
  absenceType: string;
  startDate: string;
  endDate: string;
}

export interface AbsenceRequest {
  workerId: number;
  /** Accepts `type` too, which is what the legacy client sent. */
  absenceType: string;
  startDate: string;
  endDate: string;
}

export interface AllocationDto {
  id: number;
  workerId: number;
  jobId: number | null;
  maintenanceJobId: number | null;
  assignedDate: string;
  note: string | null;
}

export interface AllocationRequest {
  workerId: number;
  jobId: number | null;
  maintenanceJobId: number | null;
  assignedDate: string;
  note: string | null;
}

export interface MaintenanceJobDto {
  id: number;
  name: string;
  reference: string | null;
  address: string | null;
  status: string;
}

export interface MaintenanceJobRequest {
  name: string;
  reference: string | null;
  address: string | null;
  status: string | null;
}

export interface DayNoteDto {
  id: number;
  jobId: number;
  noteDate: string;
  note: string;
}

export interface DayNoteRequest {
  jobId: number;
  noteDate: string;
  note: string;
}

/**
 * The whole board window in one response.
 *
 * The legacy UI assembled this from several calls per worker per day; one
 * consistent snapshot is both faster and free of the tearing that produced.
 */
export interface BoardDto {
  from: string;
  to: string;
  workers: WorkerDto[];
  absences: AbsenceDto[];
  allocations: AllocationDto[];
  dayNotes: DayNoteDto[];
}

/**
 * A date window. Both ends are required: an unbounded scheduler query would
 * scan every allocation the company has ever made.
 */
export interface RangeQuery {
  from: string;
  to: string;
}

export interface WorkerListQuery {
  includeInactive?: boolean;
}

// ── settings ────────────────────────────────────────────────────

export interface BrandingDto {
  companyName: string;
  /**
   * The API path that serves the image, not the object key: the bucket is
   * closed and the key is an internal detail.
   */
  logoUrl: string | null;
  bannerUrl: string | null;
  primaryColor: string;
  sidebarColor: string;
  jobDisplayMode: string;
  emailSendMode: string;
  updatedAt: string;
}

export interface BrandingRequest {
  companyName: string;
  primaryColor: string;
  sidebarColor: string;
  jobDisplayMode?: string | null;
  emailSendMode?: string | null;
}

export interface PreparedBrandingUploadDto {
  storedName: string;
  uploadUrl: string;
  expiresInSecs: number;
}

export interface PrepareBrandingRequest {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}

export interface ConfirmBrandingRequest {
  storedName: string;
  originalName: string;
  mimeType: string;
}

export interface EmailSettingsDto {
  smtpHost: string | null;
  smtpPort: number | null;
  smtpUser: string | null;
  smtpFrom: string | null;
  smtpSecure: boolean;
}

/**
 * An absent password means "keep the stored one", which is how the settings
 * form can be re-saved without the password being present in the page.
 */
export interface EmailSettingsRequest {
  smtpHost: string | null;
  smtpPort: number | null;
  smtpUser: string | null;
  smtpPass: string | null;
  smtpFrom: string | null;
  smtpSecure?: boolean;
}

export interface EmailStatusDto {
  configured: boolean;
  hasPassword: boolean;
  secure: boolean;
}

export interface TestEmailRequest {
  to: string;
}

// ── users ───────────────────────────────────────────────────────

export interface UserRequest {
  name: string;
  email: string;
  role: string;
  phone: string | null;
  /** Defaults to active: the admin form's checkbox starts ticked. */
  active?: boolean;
  /** Required on create. On update, absent or empty means "unchanged". */
  password: string | null;
}

export interface RecoveryCodeDto {
  /** Shown once, then unrecoverable: only its hash is stored. */
  recoveryCode: string;
  expiresAt: string;
  user: RecoveryUserDto;
}

export interface RecoveryUserDto {
  id: number;
  name: string;
}

/**
 * What `resend-invite` returns.
 *
 * The legacy endpoint sent no email -- it only echoed the address back, and
 * the frontend showed it for the manager to pass on by hand. Reproduced
 * as-is; sending a real invitation is Phase 14's email work.
 */
export interface InviteDto {
  email: string;
  name: string;
}

// ── weather ─────────────────────────────────────────────────────

/**
 * The stamp, with the decimals rendered as numbers rather than strings.
 *
 * The legacy returned JSON numbers here and the UI does arithmetic on them,
 * so serialising `Decimal` in its string form would break the display.
 */
export interface WeatherDto {
  locationName: string | null;
  locationLat: number | null;
  locationLng: number | null;
  temperature: number | null;
  weatherCondition: string | null;
  weatherIcon: string | null;
  windSpeedKmh: number | null;
  rainfallMm: number | null;
  sunriseTime: string | null;
  sunsetTime: string | null;
}

/**
 * The structured reading stored against a diary entry.
 */
export interface WeatherSnapshotDto {
  diaryEntryId: number;
  temperatureC: number | null;
  conditions: string | null;
  rain: string | null;
  windDescription: string | null;
  windSpeedKmh: number | null;
  humidityPct: number | null;
  source: string;
  snapshotAt: string;
}
