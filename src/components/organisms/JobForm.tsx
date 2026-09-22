"use client";

/**
 * The job form, shared by create and edit.
 *
 * Grouped into the same five sections the current form uses -- identity,
 * client, timeline, personnel, notes -- because managers fill these in from
 * a contract in that order.
 *
 * Every value is a string while it is in the form, including the ids and the
 * dates, because that is what an `<input>` and a `<select>` hold. The
 * conversion to the API's shape happens once, in `toRequest`, rather than at
 * each call site.
 */
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, UserPlus, X } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { Textarea } from "@/components/atoms/Textarea";
import { Card, CardContent } from "@/components/molecules/Card";
import { Field } from "@/components/molecules/Field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/molecules/Select";
import type { JobDto, JobUpsertRequest, UserDto } from "@/lib/api/types";
import { toDateInput } from "@/lib/utils/format";

const STATUSES = ["active", "on_hold", "completed", "cancelled", "archived"] as const;

/** An optional email: either blank or a real address, matching the legacy. */
const optionalEmail = z.union([z.literal(""), z.email("Enter a valid email address")]);

/*
 * No `.default()` on any field.
 *
 * A zod default makes the schema's input type differ from its output, which
 * react-hook-form then has to be told about at three separate type
 * parameters. The form supplies its own defaults from `EMPTY` below, so the
 * two types stay identical and the wiring stays readable.
 */
export const jobSchema = z.object({
  name: z.string(),
  jobNumber: z.string().min(1, "Job number is required"),
  client: z.string().min(1, "Client name is required"),
  clientNumber: z.string(),
  clientEmail: optionalEmail,
  address: z.string().min(1, "Site address is required"),
  status: z.enum(STATUSES),
  startDate: z.string(),
  endDate: z.string(),
  managerId: z.string(),
  supervisorId: z.string(),
  dropboxPath: z.string(),
  description: z.string(),
  contact2Name: z.string(),
  contact2Phone: z.string(),
  contact2Email: optionalEmail,
});

export type JobFormValues = z.infer<typeof jobSchema>;

/** `""` and the literal `"none"` both mean "no one selected". */
function idOrNull(value: string): number | null {
  if (value === "" || value === "none") return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function textOrNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

export function toRequest(values: JobFormValues): JobUpsertRequest {
  return {
    name: values.name.trim(),
    jobNumber: values.jobNumber.trim(),
    client: values.client.trim(),
    clientNumber: textOrNull(values.clientNumber),
    clientEmail: textOrNull(values.clientEmail),
    address: values.address.trim(),
    status: values.status,
    startDate: textOrNull(values.startDate),
    endDate: textOrNull(values.endDate),
    managerId: idOrNull(values.managerId),
    supervisorId: idOrNull(values.supervisorId),
    dropboxPath: textOrNull(values.dropboxPath),
    description: textOrNull(values.description),
    contact2Name: textOrNull(values.contact2Name),
    contact2Phone: textOrNull(values.contact2Phone),
    contact2Email: textOrNull(values.contact2Email),
  };
}

/** Fills the form from an existing job. */
export function fromJob(job: JobDto): JobFormValues {
  return {
    name: job.name,
    jobNumber: job.jobNumber,
    client: job.client,
    clientNumber: job.clientNumber ?? "",
    clientEmail: job.clientEmail ?? "",
    address: job.address,
    status: (STATUSES as readonly string[]).includes(job.status)
      ? (job.status as JobFormValues["status"])
      : "active",
    startDate: toDateInput(job.startDate),
    endDate: toDateInput(job.endDate),
    managerId: job.managerId === null ? "" : String(job.managerId),
    supervisorId: job.supervisorId === null ? "" : String(job.supervisorId),
    dropboxPath: job.dropboxPath ?? "",
    description: job.description ?? "",
    contact2Name: job.contact2Name ?? "",
    contact2Phone: job.contact2Phone ?? "",
    contact2Email: job.contact2Email ?? "",
  };
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <div className="border-b px-5 py-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </h2>
      </div>
      <CardContent className="space-y-4 px-5 py-5">{children}</CardContent>
    </Card>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>;
}

interface JobFormProps {
  defaultValues?: Partial<JobFormValues> | undefined;
  supervisors: UserDto[];
  managers: UserDto[];
  onSubmit: (values: JobFormValues) => void;
  isSubmitting: boolean;
  submitLabel?: string | undefined;
  /**
   * A server-side failure.
   *
   * When the API names a field -- a duplicate job number, a malformed email
   * -- the message is attached to that input, where the user is looking.
   * Anything unattributable is shown above the buttons. A toast alone is not
   * enough: it fades, and the form is left rejected with no explanation.
   */
  error?: { message: string; field?: string | undefined } | undefined;
}

const EMPTY: JobFormValues = {
  name: "",
  jobNumber: "",
  client: "",
  clientNumber: "",
  clientEmail: "",
  address: "",
  status: "active",
  startDate: "",
  endDate: "",
  managerId: "",
  supervisorId: "",
  dropboxPath: "",
  description: "",
  contact2Name: "",
  contact2Phone: "",
  contact2Email: "",
};

export function JobForm({
  defaultValues,
  supervisors,
  managers,
  onSubmit,
  isSubmitting,
  submitLabel = "Save",
  error,
}: JobFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<JobFormValues>({
    resolver: zodResolver(jobSchema),
    defaultValues: { ...EMPTY, ...defaultValues },
  });

  // Shown when the job already has a second contact, so an existing one is
  // never hidden behind a button the user has to think to press.
  const [showContact2, setShowContact2] = useState(
    defaultValues?.contact2Name !== undefined && defaultValues.contact2Name !== "",
  );

  // The API's field names match the form's, because both are the DTO's.
  const serverField =
    error?.field !== undefined && error.field in EMPTY ? (error.field as keyof JobFormValues) : null;
  const errorFor = (field: keyof JobFormValues): string | undefined =>
    errors[field]?.message ?? (serverField === field ? error?.message : undefined);

  const status = watch("status");
  const managerId = watch("managerId");
  const supervisorId = watch("supervisorId");

  return (
    <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="space-y-5" noValidate>
      <Section title="Project identity">
        <Row>
          <Field label="Job number" required error={errorFor("jobNumber")}>
            {(props) => (
              <Input {...props} {...register("jobNumber")} className="font-mono" placeholder="e.g. BSC-001" />
            )}
          </Field>
          <Field label="Status" required error={errorFor("status")}>
            {(props) => (
              <Select value={status} onValueChange={(v) => setValue("status", v as JobFormValues["status"])}>
                <SelectTrigger id={props.id} aria-describedby={props["aria-describedby"]}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="on_hold">On hold</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            )}
          </Field>
        </Row>

        <Field label="Project name" error={errorFor("name")}>
          {(props) => (
            <Input {...props} {...register("name")} placeholder="e.g. Riverside Apartments Stage 2" />
          )}
        </Field>

        <Field label="Site address" required error={errorFor("address")}>
          {(props) => (
            <Input {...props} {...register("address")} placeholder="e.g. 123 Main Street, Sydney NSW 2000" />
          )}
        </Field>
      </Section>

      <Section title="Client">
        <Row>
          <Field label="Client name" required error={errorFor("client")}>
            {(props) => <Input {...props} {...register("client")} placeholder="e.g. ABC Developments" />}
          </Field>
          <Field label="Client number or phone" error={errorFor("clientNumber")}>
            {(props) => (
              <Input {...props} {...register("clientNumber")} placeholder="e.g. CL-123 or 0400 000 000" />
            )}
          </Field>
        </Row>
        <Field label="Client email" error={errorFor("clientEmail")}>
          {(props) => (
            <Input {...props} {...register("clientEmail")} type="email" placeholder="client@example.com" />
          )}
        </Field>

        {showContact2 ? (
          <div className="relative space-y-4 rounded-lg border bg-muted/20 px-4 pb-4 pt-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Second contact
              </p>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                aria-label="Remove the second contact"
                onClick={() => {
                  setShowContact2(false);
                  setValue("contact2Name", "");
                  setValue("contact2Phone", "");
                  setValue("contact2Email", "");
                }}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
            <Row>
              <Field label="Name" error={errorFor("contact2Name")}>
                {(props) => <Input {...props} {...register("contact2Name")} placeholder="e.g. Jane Smith" />}
              </Field>
              <Field label="Phone" error={errorFor("contact2Phone")}>
                {(props) => <Input {...props} {...register("contact2Phone")} placeholder="e.g. 0400 000 000" />}
              </Field>
            </Row>
            <Field label="Email" error={errorFor("contact2Email")}>
              {(props) => (
                <Input {...props} {...register("contact2Email")} type="email" placeholder="jane@example.com" />
              )}
            </Field>
          </div>
        ) : (
          <Button type="button" variant="outline" size="sm" onClick={() => setShowContact2(true)}>
            <UserPlus className="h-3.5 w-3.5" /> Add another person
          </Button>
        )}
      </Section>

      <Section title="Timeline">
        <Row>
          <Field label="Start date" error={errorFor("startDate")}>
            {(props) => <Input {...props} {...register("startDate")} type="date" />}
          </Field>
          <Field label="Completion date" error={errorFor("endDate")}>
            {(props) => <Input {...props} {...register("endDate")} type="date" />}
          </Field>
        </Row>
      </Section>

      {(managers.length > 0 || supervisors.length > 0) && (
        <Section title="Personnel">
          <Row>
            {managers.length > 0 && (
              <Field label="Project manager">
                {(props) => (
                  <Select value={managerId} onValueChange={(v) => setValue("managerId", v)}>
                    <SelectTrigger id={props.id}>
                      <SelectValue placeholder="Select manager…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {managers.map((m) => (
                        <SelectItem key={m.id} value={String(m.id)}>
                          {m.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </Field>
            )}
            {supervisors.length > 0 && (
              <Field
                label="Site supervisor"
                hint="Setting this here also assigns them to the job."
              >
                {(props) => (
                  <Select value={supervisorId} onValueChange={(v) => setValue("supervisorId", v)}>
                    <SelectTrigger id={props.id} aria-describedby={props["aria-describedby"]}>
                      <SelectValue placeholder="Assign supervisor…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {supervisors.map((s) => (
                        <SelectItem key={s.id} value={String(s.id)}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </Field>
            )}
          </Row>
        </Section>
      )}

      <Section title="Additional">
        <Field label="Notes" error={errorFor("description")}>
          {(props) => (
            <Textarea
              {...props}
              {...register("description")}
              className="min-h-[100px] resize-y"
              placeholder="Any relevant notes or project details…"
            />
          )}
        </Field>
      </Section>

      {error !== undefined && serverField === null && (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error.message}
        </p>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <Button type="submit" disabled={isSubmitting} className="min-w-32">
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
