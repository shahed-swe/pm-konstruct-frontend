"use client";

/**
 * Company settings.
 *
 * Everyone can open this page -- their own notification preferences live
 * here -- but branding and email are manager-only, and the sections say so
 * rather than silently vanishing.
 */
import { Loader2, Palette, Send, Trash2, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ApiError } from "@/lib/api/client";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { PasswordInput } from "@/components/atoms/PasswordInput";
import { Switch } from "@/components/atoms/Switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/molecules/Card";
import { Field } from "@/components/molecules/Field";
import { PageHeader } from "@/components/molecules/PageHeader";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/molecules/Select";
import {
  useBranding,
  useEmailSettings,
  useEmailStatus,
  useRemoveBrandingImage,
  useSendTestEmail,
  useSetBranding,
  useSetEmailSettings,
  useUploadBrandingImage,
} from "@/lib/api/resources/settings";
import { isHex6 } from "@/lib/branding/hex";
import { useAuthStore } from "@/stores/auth.store";
import { useBrandingStore } from "@/stores/branding.store";
import { useUiStore } from "@/stores/ui.store";

const JOB_DISPLAY_MODES = [
  { value: "job_number", label: "Job number", hint: "e.g. BSC-2024-001" },
  { value: "job_name", label: "Project name", hint: "e.g. Riverside Apartments" },
  { value: "job_address", label: "Site address", hint: "e.g. 12 Rae Street" },
] as const;

const EMAIL_MODES = [
  {
    value: "device",
    label: "From the sender's own mail app",
    hint: "Opens in their mail client. The message comes from their address and stays in their sent items.",
  },
  {
    value: "smtp",
    label: "From the server",
    hint: "Sent by this application using the SMTP details below.",
  },
] as const;

function BrandingImage({
  kind,
  label,
  url,
}: {
  kind: "logo" | "banner";
  label: string;
  url: string | null;
}) {
  const toast = useUiStore((s) => s.toast);
  const upload = useUploadBrandingImage(kind);
  const remove = useRemoveBrandingImage(kind);
  const input = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex h-16 w-32 items-center justify-center overflow-hidden rounded-md border bg-muted/40">
        {url === null ? (
          <span className="text-xs text-muted-foreground">None</span>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={label} className="max-h-full max-w-full object-contain" />
        )}
      </div>

      <input
        ref={input}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        className="sr-only"
        aria-label={`Choose a ${label.toLowerCase()}`}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file === undefined) return;
          upload.mutate(file, {
            onSuccess: () => toast({ title: `${label} updated`, variant: "success" }),
            onError: (cause) =>
              toast({
                title: `The ${label.toLowerCase()} was not saved`,
                description: cause instanceof ApiError ? cause.message : undefined,
                variant: "destructive",
              }),
          });
        }}
      />

      <Button variant="outline" size="sm" disabled={upload.isPending} onClick={() => input.current?.click()}>
        {upload.isPending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
        ) : (
          <Upload className="h-3.5 w-3.5" aria-hidden="true" />
        )}
        {url === null ? `Upload a ${label.toLowerCase()}` : "Replace"}
      </Button>

      {url !== null && (
        <Button
          variant="ghost"
          size="sm"
          disabled={remove.isPending}
          onClick={() => remove.mutate()}
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Remove
        </Button>
      )}
    </div>
  );
}

function BrandingSection() {
  const toast = useUiStore((s) => s.toast);
  const setStoreBranding = useBrandingStore((s) => s.setBranding);
  const { data: branding, isLoading } = useBranding();
  const save = useSetBranding();

  const [companyName, setCompanyName] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#E84E1B");
  const [sidebarColor, setSidebarColor] = useState("#0f1117");
  const [jobDisplayMode, setJobDisplayMode] = useState("job_number");
  const [emailSendMode, setEmailSendMode] = useState("device");
  const [error, setError] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (branding === undefined) return;
    setCompanyName(branding.companyName);
    setPrimaryColor(branding.primaryColor);
    setSidebarColor(branding.sidebarColor);
    setJobDisplayMode(branding.jobDisplayMode);
    setEmailSendMode(branding.emailSendMode);
  }, [branding]);

  function submit() {
    if (!isHex6(primaryColor) || !isHex6(sidebarColor)) {
      setError("A colour must be six hex digits, like #E84E1B.");
      return;
    }
    setError(undefined);
    save.mutate(
      { companyName: companyName.trim(), primaryColor, sidebarColor, jobDisplayMode, emailSendMode },
      {
        onSuccess: (updated) => {
          // Applies the new colours to the page immediately, rather than
          // waiting for the next navigation to re-render the server's block.
          setStoreBranding(updated);
          toast({ title: "Branding saved", variant: "success" });
        },
        onError: (cause) =>
          setError(cause instanceof ApiError ? cause.message : "The changes were not saved."),
      },
    );
  }

  if (isLoading) return null;

  return (
    <Card>
      <CardHeader className="border-b px-4 py-2.5">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Palette className="h-4 w-4 text-primary" aria-hidden="true" /> Branding
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 p-4">
        {error !== undefined && (
          <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <Field label="Company name" required>
          {(props) => (
            <Input {...props} value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
          )}
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Primary colour" hint="Buttons, links and the focus ring.">
            {(props) => (
              <div className="flex gap-2">
                <Input
                  {...props}
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="font-mono"
                />
                <input
                  type="color"
                  value={isHex6(primaryColor) ? primaryColor : "#E84E1B"}
                  onChange={(e) => setPrimaryColor(e.target.value.toUpperCase())}
                  aria-label="Pick the primary colour"
                  className="h-9 w-12 shrink-0 cursor-pointer rounded-md border bg-transparent"
                />
              </div>
            )}
          </Field>

          <Field label="Sidebar colour">
            {(props) => (
              <div className="flex gap-2">
                <Input
                  {...props}
                  value={sidebarColor}
                  onChange={(e) => setSidebarColor(e.target.value)}
                  className="font-mono"
                />
                <input
                  type="color"
                  value={isHex6(sidebarColor) ? sidebarColor : "#0f1117"}
                  onChange={(e) => setSidebarColor(e.target.value.toUpperCase())}
                  aria-label="Pick the sidebar colour"
                  className="h-9 w-12 shrink-0 cursor-pointer rounded-md border bg-transparent"
                />
              </div>
            )}
          </Field>
        </div>

        <Field
          label="Show jobs by"
          hint={JOB_DISPLAY_MODES.find((m) => m.value === jobDisplayMode)?.hint}
        >
          {(props) => (
            <Select value={jobDisplayMode} onValueChange={setJobDisplayMode}>
              <SelectTrigger id={props.id} aria-describedby={props["aria-describedby"]}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {JOB_DISPLAY_MODES.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </Field>

        <Field
          label="Send email"
          hint={EMAIL_MODES.find((m) => m.value === emailSendMode)?.hint}
        >
          {(props) => (
            <Select value={emailSendMode} onValueChange={setEmailSendMode}>
              <SelectTrigger id={props.id} aria-describedby={props["aria-describedby"]}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EMAIL_MODES.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </Field>

        <div className="space-y-4 border-t pt-4">
          <div>
            <p className="mb-2 text-sm font-medium">Logo</p>
            <BrandingImage kind="logo" label="Logo" url={branding?.logoUrl ?? null} />
          </div>
          <div>
            <p className="mb-2 text-sm font-medium">Email banner</p>
            <BrandingImage kind="banner" label="Banner" url={branding?.bannerUrl ?? null} />
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={submit} disabled={save.isPending}>
            {save.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            Save branding
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function EmailSection() {
  const toast = useUiStore((s) => s.toast);
  const { data: settings } = useEmailSettings();
  const { data: status } = useEmailStatus();
  const save = useSetEmailSettings();
  const sendTest = useSendTestEmail();

  const [host, setHost] = useState("");
  const [port, setPort] = useState("587");
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [from, setFrom] = useState("");
  const [secure, setSecure] = useState(true);
  const [testTo, setTestTo] = useState("");
  const [error, setError] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (settings === undefined) return;
    setHost(settings.smtpHost ?? "");
    setPort(settings.smtpPort === null ? "587" : String(settings.smtpPort));
    setUser(settings.smtpUser ?? "");
    setFrom(settings.smtpFrom ?? "");
    setSecure(settings.smtpSecure);
  }, [settings]);

  return (
    <Card>
      <CardHeader className="border-b px-4 py-2.5">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Send className="h-4 w-4 text-primary" aria-hidden="true" /> Email server
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-4">
        <p className="text-xs text-muted-foreground">
          {status?.configured === true
            ? `Configured${status.hasPassword ? " with a stored password" : ", but with no password stored"}.`
            : "Not configured. Diary emails will open in the sender's own mail app instead."}
        </p>

        {error !== undefined && (
          <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Host" hint="e.g. smtp.office365.com">
            {(props) => <Input {...props} value={host} onChange={(e) => setHost(e.target.value)} />}
          </Field>
          <Field label="Port">
            {(props) => (
              <Input {...props} type="number" value={port} onChange={(e) => setPort(e.target.value)} />
            )}
          </Field>
          <Field label="Username">
            {(props) => (
              <Input {...props} value={user} onChange={(e) => setUser(e.target.value)} autoComplete="off" />
            )}
          </Field>
          <Field
            label="Password"
            hint="Leave blank to keep the stored one. It is never sent back to this page."
          >
            {(props) => (
              <PasswordInput
                {...props}
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                autoComplete="new-password"
              />
            )}
          </Field>
          <Field label="Send from" hint="The address recipients will see.">
            {(props) => (
              <Input {...props} type="email" value={from} onChange={(e) => setFrom(e.target.value)} />
            )}
          </Field>
        </div>

        <div className="flex items-center justify-between rounded-md border px-3 py-2">
          <div>
            <p className="text-sm font-medium">Use TLS</p>
            <p className="text-xs text-muted-foreground">
              Leave on unless your provider says otherwise.
            </p>
          </div>
          <Switch checked={secure} onCheckedChange={setSecure} aria-label="Use TLS" />
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          <Button
            variant="outline"
            disabled={save.isPending}
            onClick={() => {
              setError(undefined);
              save.mutate(
                {
                  smtpHost: host.trim() === "" ? null : host.trim(),
                  smtpPort: port.trim() === "" ? null : Number.parseInt(port, 10),
                  smtpUser: user.trim() === "" ? null : user.trim(),
                  // Absent means "keep the stored one", which is how this
                  // form can be re-saved without the password being in the
                  // page at all.
                  smtpPass: pass === "" ? null : pass,
                  smtpFrom: from.trim() === "" ? null : from.trim(),
                  smtpSecure: secure,
                },
                {
                  onSuccess: () => {
                    toast({ title: "Email settings saved", variant: "success" });
                    setPass("");
                  },
                  onError: (cause) =>
                    setError(
                      cause instanceof ApiError ? cause.message : "The settings were not saved.",
                    ),
                },
              );
            }}
          >
            {save.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            Save email settings
          </Button>
        </div>

        <div className="space-y-2 border-t pt-4">
          <Field label="Send a test message to" hint="Proves the settings rather than hoping.">
            {(props) => (
              <div className="flex gap-2">
                <Input
                  {...props}
                  type="email"
                  value={testTo}
                  onChange={(e) => setTestTo(e.target.value)}
                  placeholder="you@example.com"
                />
                <Button
                  variant="outline"
                  disabled={sendTest.isPending || testTo.trim() === ""}
                  onClick={() =>
                    sendTest.mutate(testTo.trim(), {
                      onSuccess: (result) =>
                        toast({ title: result.message, variant: "success" }),
                      onError: (cause) =>
                        toast({
                          title: "The test did not send",
                          description: cause instanceof ApiError ? cause.message : undefined,
                          variant: "destructive",
                        }),
                    })
                  }
                >
                  Send test
                </Button>
              </div>
            )}
          </Field>
        </div>
      </CardContent>
    </Card>
  );
}

export function SettingsScreen() {
  const user = useAuthStore((s) => s.user);
  const isManager = user?.role === "MANAGER";

  return (
    <>
      <PageHeader title="Settings" description="How the product looks and how it sends email." />

      {isManager ? (
        <div className="max-w-3xl space-y-4">
          <BrandingSection />
          <EmailSection />
        </div>
      ) : (
        <Card className="max-w-3xl">
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">
              Branding and email are set by a manager. Ask yours if something here needs changing.
            </p>
          </CardContent>
        </Card>
      )}
    </>
  );
}
