"use client";

/**
 * The call forward: a job's programme of trades and stage claims.
 *
 * Items form a tree -- a stage with its trades under it -- ordered by
 * `sortOrder` within each parent. `delayStatus` and `delayDays` are computed
 * by the API from the estimated and actual dates, never stored, so they are
 * read-only here.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { keys } from "@/lib/query/keys";
import type {
  AppliedDto,
  BulkCreateRequest,
  CallForwardDto,
  CallForwardPatchRequest,
  CallForwardRequest,
  CreateTemplateRequest,
  RenameTemplateRequest,
  ReorderItem,
  ReorderResponse,
  TemplateDto,
} from "@/lib/api/types";

export interface CallForwardFilters {
  jobId?: number;
  status?: string;
  parentId?: number;
}

function listPath(filters: CallForwardFilters): string {
  const params = new URLSearchParams();
  if (filters.jobId !== undefined) params.set("jobId", String(filters.jobId));
  if (filters.status !== undefined && filters.status !== "") params.set("status", filters.status);
  if (filters.parentId !== undefined) params.set("parentId", String(filters.parentId));
  const query = params.toString();
  return query === "" ? "/call-forward" : `/call-forward?${query}`;
}

export function useCallForwardItems(filters: CallForwardFilters = {}, enabled = true) {
  return useQuery({
    queryKey: keys.callForward.list(filters as Record<string, unknown>),
    queryFn: ({ signal }) => api.get<CallForwardDto[]>(listPath(filters), signal),
    enabled,
  });
}

/** What is coming up across every job the user can see -- the landing view. */
export function useUpcomingCallForward(days?: number) {
  return useQuery({
    queryKey: [...keys.callForward.all, "upcoming", days ?? null],
    queryFn: ({ signal }) =>
      api.get<CallForwardDto[]>(
        days === undefined ? "/call-forward/upcoming" : `/call-forward/upcoming?days=${days}`,
        signal,
      ),
  });
}

function invalidateAll(client: ReturnType<typeof useQueryClient>) {
  void client.invalidateQueries({ queryKey: keys.callForward.all });
  // The dashboard counts delayed items and the reports read the same rows.
  void client.invalidateQueries({ queryKey: keys.dashboard.all });
}

export function useCreateCallForwardItem() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: CallForwardRequest) => api.post<CallForwardDto>("/call-forward", body),
    onSuccess: () => invalidateAll(client),
  });
}

export function useBulkCreateCallForward() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: BulkCreateRequest) =>
      api.post<CallForwardDto[]>("/call-forward/bulk", body),
    onSuccess: () => invalidateAll(client),
  });
}

/**
 * Updates one item.
 *
 * Takes a patch, not the whole row: the board sends the one field that
 * changed, so two people editing different columns of the same item do not
 * overwrite each other.
 */
export function useUpdateCallForwardItem() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: CallForwardPatchRequest & { id: number }) =>
      api.put<CallForwardDto>(`/call-forward/${id}`, body),
    onSuccess: () => invalidateAll(client),
  });
}

export function useDeleteCallForwardItem() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete<void>(`/call-forward/${id}`),
    onSuccess: () => invalidateAll(client),
  });
}

/**
 * Saves a new order, and optionally a new parent for each item.
 *
 * One request for the whole board rather than one per moved row: a drag that
 * reorders ten siblings would otherwise be ten requests racing each other,
 * and a half-applied order is worse than none.
 */
export function useReorderCallForward() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (items: ReorderItem[]) =>
      api.post<ReorderResponse>("/call-forward/reorder", { items }),
    onSuccess: () => invalidateAll(client),
  });
}

export function useCallForwardTemplates() {
  return useQuery({
    queryKey: keys.callForward.templates(),
    queryFn: ({ signal }) => api.get<TemplateDto[]>("/call-forward/templates", signal),
  });
}

export function useCreateTemplate() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateTemplateRequest) =>
      api.post<TemplateDto>("/call-forward/templates", body),
    onSuccess: () => void client.invalidateQueries({ queryKey: keys.callForward.templates() }),
  });
}

export function useRenameTemplate(id: number) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: RenameTemplateRequest) =>
      api.put<TemplateDto>(`/call-forward/templates/${id}`, body),
    onSuccess: () => void client.invalidateQueries({ queryKey: keys.callForward.templates() }),
  });
}

export function useDeleteTemplate() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete<void>(`/call-forward/templates/${id}`),
    onSuccess: () => void client.invalidateQueries({ queryKey: keys.callForward.templates() }),
  });
}

export function useApplyTemplate(id: number) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: { jobId: number; replace?: boolean }) =>
      api.post<AppliedDto>(`/call-forward/templates/${id}/apply`, body),
    onSuccess: () => invalidateAll(client),
  });
}

/**
 * The tree, from the flat list the API sends.
 *
 * Items whose parent is missing -- deleted, or filtered out -- are treated as
 * roots rather than dropped, so nothing disappears from a board because of a
 * broken link.
 */
export interface CallForwardNode extends CallForwardDto {
  children: CallForwardNode[];
  depth: number;
}

export function buildTree(items: CallForwardDto[]): CallForwardNode[] {
  const byId = new Map<number, CallForwardNode>();
  for (const item of items) {
    byId.set(item.id, { ...item, children: [], depth: 0 });
  }

  const roots: CallForwardNode[] = [];
  for (const node of byId.values()) {
    const parent = node.parentId === null ? undefined : byId.get(node.parentId);
    if (parent === undefined) roots.push(node);
    else parent.children.push(node);
  }

  const order = (nodes: CallForwardNode[], depth: number) => {
    nodes.sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
    for (const node of nodes) {
      node.depth = depth;
      order(node.children, depth + 1);
    }
  };
  order(roots, 0);

  return roots;
}

/** Depth-first, the order the board draws them in. */
export function flattenTree(nodes: CallForwardNode[]): CallForwardNode[] {
  return nodes.flatMap((node) => [node, ...flattenTree(node.children)]);
}
