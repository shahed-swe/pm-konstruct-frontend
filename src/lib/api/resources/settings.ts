"use client";

/**
 * Company settings: branding, and how email leaves the building.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { keys } from "@/lib/query/keys";
import type {
  BrandingDto,
  BrandingRequest,
  EmailSettingsDto,
  EmailSettingsRequest,
  EmailStatusDto,
  MessageDto,
  PreparedBrandingUploadDto,
} from "@/lib/api/types";

export function useBranding() {
  return useQuery({
    queryKey: keys.branding.current(),
    queryFn: ({ signal }) => api.get<BrandingDto>("/settings/branding", signal),
  });
}

export function useSetBranding() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: BrandingRequest) => api.put<BrandingDto>("/settings/branding", body),
    onSuccess: (branding) => {
      client.setQueryData(keys.branding.current(), branding);
      // The job label depends on `jobDisplayMode`, so every list showing a
      // job is now drawn from the wrong field.
      void client.invalidateQueries({ queryKey: keys.jobs.all });
      void client.invalidateQueries({ queryKey: keys.diary.all });
    },
  });
}

/**
 * Uploads a logo or a banner.
 *
 * The same three-step dance as the rest of the media: presign, PUT the bytes
 * to storage, confirm. The bytes never pass through the API.
 */
async function uploadBrandingImage(
  kind: "logo" | "banner",
  file: File,
): Promise<BrandingDto> {
  const prepared = await api.post<PreparedBrandingUploadDto>(
    `/settings/branding/${kind}/prepare`,
    {
      fileName: file.name,
      mimeType: file.type === "" ? "application/octet-stream" : file.type,
      sizeBytes: file.size,
    },
  );

  const response = await fetch(prepared.uploadUrl, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": file.type },
    credentials: "omit",
  });
  if (!response.ok) throw new Error("The image could not be uploaded.");

  // Confirmed by POSTing to the image's own path, not to a `/confirm`
  // suffix -- which is where the legacy's route lived too.
  return api.post<BrandingDto>(`/settings/branding/${kind}`, {
    storedName: prepared.storedName,
    originalName: file.name,
    mimeType: file.type,
  });
}

export function useUploadBrandingImage(kind: "logo" | "banner") {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => uploadBrandingImage(kind, file),
    onSuccess: (branding) => client.setQueryData(keys.branding.current(), branding),
  });
}

export function useRemoveBrandingImage(kind: "logo" | "banner") {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => api.delete<BrandingDto>(`/settings/branding/${kind}`),
    onSuccess: (branding) => client.setQueryData(keys.branding.current(), branding),
  });
}

export function useEmailSettings() {
  return useQuery({
    queryKey: keys.settings.email(),
    queryFn: ({ signal }) => api.get<EmailSettingsDto>("/settings/email", signal),
  });
}

export function useEmailStatus() {
  return useQuery({
    queryKey: keys.settings.emailStatus(),
    queryFn: ({ signal }) => api.get<EmailStatusDto>("/settings/email/status", signal),
  });
}

export function useSetEmailSettings() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: EmailSettingsRequest) =>
      api.put<EmailSettingsDto>("/settings/email", body),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: keys.settings.all });
    },
  });
}

/** Sends one message, so the settings can be proved rather than hoped for. */
export function useSendTestEmail() {
  return useMutation({
    mutationFn: (to: string) => api.post<MessageDto>("/settings/email/test", { to }),
  });
}
