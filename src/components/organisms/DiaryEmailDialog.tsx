"use client";

/**
 * Emailing a diary entry to whoever needs to see it.
 *
 * The recipients are typed rather than picked from a list: the people who
 * receive these are clients, engineers and certifiers, not users of the
 * product. The legacy did the same.
 *
 * How it is sent depends on the company's setting. On `device` the API hands
 * back a `mailto:` for the user's own mail app, so the message comes from
 * their address and lands in their sent items; on `smtp` the server sends it.
 * The dialog says which, because "sent" means different things.
 */
import { Loader2, Mail } from "lucide-react";
import { useState } from "react";
import { ApiError } from "@/lib/api/client";
import { useEmailDiaryEntry } from "@/lib/api/resources/diary";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { Textarea } from "@/components/atoms/Textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/molecules/Dialog";
import { Field } from "@/components/molecules/Field";
import { useBrandingStore } from "@/stores/branding.store";
import { useUiStore } from "@/stores/ui.store";
import type { DiaryEntryDto } from "@/lib/api/types";
import { formatDate } from "@/lib/utils/format";

/** Splits on commas, semicolons or whitespace, which is how people paste them. */
function parseRecipients(raw: string): string[] {
  return raw
    .split(/[,;\s]+/)
    .map((s) => s.trim())
    .filter((s) => s !== "");
}

/**
 * The dialog itself, shared by the diary entry and the forms.
 *
 * The legacy had two of these -- `diary-email-dialog` and
 * `form-email-dialog` -- with the same fields and different wording for the
 * same send modes. One is enough.
 */
export function EmailDialog({
  title,
  defaultSubject,
  open,
  onOpenChange,
  onSend,
  isSending,
}: {
  title: string;
  defaultSubject: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSend: (payload: { to: string[]; subject: string; message: string | null }) => Promise<string>;
  isSending: boolean;
}) {
  const toast = useUiStore((s) => s.toast);
  const sendMode = useBrandingStore((s) => s.branding.emailSendMode);

  const [to, setTo] = useState("");
  const [subject, setSubject] = useState(defaultSubject);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | undefined>(undefined);

  function submit() {
    const recipients = parseRecipients(to);
    if (recipients.length === 0) {
      setError("Add at least one email address.");
      return;
    }
    setError(undefined);

    void onSend({
      to: recipients,
      subject,
      message: message.trim() === "" ? null : message.trim(),
    })
      .then((result) => {
        toast({ title: result, variant: "success" });
        onOpenChange(false);
      })
      .catch((cause: unknown) =>
        setError(cause instanceof ApiError ? cause.message : "The email could not be sent."),
      );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {sendMode === "smtp"
              ? "Sent by the server from your company's address."
              : "Opens in your own mail app, so it comes from your address and stays in your sent items."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error !== undefined && (
            <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          <Field label="To" required hint="Separate several addresses with commas.">
            {(props) => (
              <Input
                {...props}
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="client@example.com, engineer@example.com"
                inputMode="email"
                autoComplete="off"
              />
            )}
          </Field>

          <Field label="Subject">
            {(props) => (
              <Input {...props} value={subject} onChange={(e) => setSubject(e.target.value)} />
            )}
          </Field>

          <Field label="Message" hint="Added above it. Optional.">
            {(props) => (
              <Textarea
                {...props}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="min-h-24"
              />
            )}
          </Field>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={isSending}>
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Mail className="h-4 w-4" aria-hidden="true" />
            )}
            Send
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** The diary entry's own wrapper. */
export function DiaryEmailDialog({
  entry,
  open,
  onOpenChange,
}: {
  entry: DiaryEntryDto;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const send = useEmailDiaryEntry(entry.id);

  return (
    <EmailDialog
      title="Email this diary entry"
      defaultSubject={`Site diary — ${entry.jobNumber ?? `job ${entry.jobId}`} — ${formatDate(entry.date)}`}
      open={open}
      onOpenChange={onOpenChange}
      isSending={send.isPending}
      onSend={async ({ to, subject, message }) => {
        const result = await send.mutateAsync({ to, subject, customMessage: message });
        return result.message;
      }}
    />
  );
}
