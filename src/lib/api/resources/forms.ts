"use client";

/**
 * The two forms: an extra to order, and a site inspection.
 *
 * Neither is a record of its own. An ETO is a diary note awaiting a
 * manager's approval; an inspection is a draft that files itself into the
 * diary when it is finished. That is why both live under a job's diary
 * afterwards rather than in a forms archive.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { keys } from "@/lib/query/keys";
import type {
  EmailFormRequest,
  EmailSentDto,
  EtoRaisedDto,
  EtoRequest,
  ConfirmInspectionPhoto,
  InspectionDraftRequest,
  InspectionFormDto,
  PreparedInspectionUploadDto,
} from "@/lib/api/types";

export function useRaiseEto() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: EtoRequest) => api.post<EtoRaisedDto>("/forms/eto", body),
    onSuccess: () => {
      // It lands as a diary note, which the dashboard's action list reads.
      void client.invalidateQueries({ queryKey: keys.diary.all });
      void client.invalidateQueries({ queryKey: keys.dashboard.all });
    },
  });
}

/**
 * Opens the job's inspection draft, creating it if there is not one.
 *
 * One draft per job at a time: an inspection is a walk through a house, and
 * two half-finished ones on the same site would be impossible to reconcile.
 */
export function useInspectionDraft(jobId: number | null) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      api.post<InspectionFormDto>("/forms/property-inspection/draft", { jobId: id }),
    onSuccess: (form) => {
      client.setQueryData(keys.forms.inspection(form.id), form);
      if (jobId !== null) void client.invalidateQueries({ queryKey: keys.jobs.files(jobId) });
    },
  });
}

/**
 * Saves the draft.
 *
 * `revision` is the version the client last read. The API rejects a save
 * built on a stale one rather than letting the second inspector's save wipe
 * the first's -- two people walking the same house is exactly how this goes
 * wrong.
 */
export function useSaveInspection(formId: number) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: InspectionDraftRequest) =>
      api.put<InspectionFormDto>(`/forms/property-inspection/${formId}`, body),
    onSuccess: (form) => {
      client.setQueryData(keys.forms.inspection(formId), form);
      void client.invalidateQueries({ queryKey: keys.diary.all });
    },
  });
}

export function useEmailForm() {
  return useMutation({
    mutationFn: (body: EmailFormRequest) => api.post<EmailSentDto>("/forms/email", body),
  });
}

/**
 * Uploads photos against one inspection item.
 *
 * Addressed by the item's `clientKey` rather than its database id, because
 * the photos are picked before the item has been saved and therefore before
 * it has an id at all.
 */
export async function uploadInspectionPhotos(
  formId: number,
  clientKey: string,
  files: File[],
): Promise<void> {
  if (files.length === 0) return;

  const base = `/forms/property-inspection/${formId}/items/${encodeURIComponent(clientKey)}/photos`;

  const prepared = await api.post<PreparedInspectionUploadDto[]>(`${base}/prepare`, {
    files: files.map((f) => ({
      fileName: f.name,
      mimeType: f.type === "" ? "application/octet-stream" : f.type,
      sizeBytes: f.size,
    })),
  });

  const confirmed: ConfirmInspectionPhoto[] = [];

  for (const [index, plan] of prepared.entries()) {
    const file = files[index];
    if (file === undefined) continue;

    const response = await fetch(plan.uploadUrl, {
      method: "PUT",
      body: file,
      headers: { "Content-Type": file.type },
      credentials: "omit",
    });
    if (!response.ok) throw new Error(`${file.name} could not be uploaded.`);

    confirmed.push({
      storedName: plan.storedName,
      originalName: file.name,
      mimeType: file.type,
    });
  }

  await api.post(base, { files: confirmed });
}

export function useDeleteInspectionPhoto(formId: number) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (photoId: number) =>
      api.delete<void>(`/forms/property-inspection/${formId}/photos/${photoId}`),
    onSuccess: () => void client.invalidateQueries({ queryKey: keys.forms.inspection(formId) }),
  });
}

/** One inspection form, by id. */
export function useInspectionForm(formId: number, enabled = true) {
  return useQuery({
    queryKey: keys.forms.inspection(formId),
    queryFn: ({ signal }) =>
      api.get<InspectionFormDto>(`/forms/property-inspection/${formId}`, signal),
    enabled: enabled && Number.isFinite(formId),
  });
}
