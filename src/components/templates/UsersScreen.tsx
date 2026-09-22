"use client";

/**
 * Who is in the company, and what each of them can reach.
 *
 * Manager-only. Two things here are worth the care they take:
 *
 * - A recovery code is shown once and then unrecoverable, because only its
 *   hash is stored. The dialog that shows it makes that plain and offers a
 *   copy button, since re-issuing is the only alternative to reading it off
 *   the screen.
 * - Deactivating is offered before deleting. Deleting a user takes their
 *   diary entries' authorship with them, and on a building site that is a
 *   record somebody may need.
 */
import { Copy, KeyRound, Mail, Plus, Shield, Trash2, UserCog } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/atoms/Badge";
import { Button } from "@/components/atoms/Button";
import { Skeleton } from "@/components/atoms/Skeleton";
import { initialsOf } from "@/components/atoms/Avatar";
import { ConfirmDialog } from "@/components/molecules/ConfirmDialog";
import { EmptyState } from "@/components/molecules/EmptyState";
import { PageHeader } from "@/components/molecules/PageHeader";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/molecules/Dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/molecules/Table";
import { UserFormDialog } from "@/components/organisms/UserFormDialog";
import { UserPermissionsDialog } from "@/components/organisms/UserPermissionsDialog";
import {
  useDeleteUser,
  useIssueRecoveryCode,
  useResendInvite,
  useUsers,
} from "@/lib/api/resources/users";
import { formatDateTime } from "@/lib/utils/format";
import { useAuthStore } from "@/stores/auth.store";
import { useUiStore } from "@/stores/ui.store";
import type { RecoveryCodeDto, UserDto } from "@/lib/api/types";

const ROLE_STYLE: Record<string, string> = {
  MANAGER: "border-primary/30 bg-primary/10 text-primary",
  SUPERVISOR: "border-blue-400/30 bg-blue-500/10 text-blue-600 dark:text-blue-400",
  OFFICE: "border-border bg-muted text-muted-foreground",
};

function RecoveryCodeDialog({
  code,
  onClose,
}: {
  code: RecoveryCodeDto;
  onClose: () => void;
}) {
  const toast = useUiStore((s) => s.toast);
  const [copied, setCopied] = useState(false);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Recovery code for {code.user.name}</DialogTitle>
          <DialogDescription>
            Read it to them now. It is shown once — only a hash of it is kept, so it cannot be
            shown again. It expires at {formatDateTime(code.expiresAt)}.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 rounded-md border bg-muted/40 p-4">
          <code className="flex-1 break-all font-mono text-lg tracking-wider">
            {code.recoveryCode}
          </code>
          <Button
            variant="outline"
            size="icon"
            aria-label="Copy the recovery code"
            onClick={() => {
              void navigator.clipboard
                .writeText(code.recoveryCode)
                .then(() => {
                  setCopied(true);
                  toast({ title: "Copied", variant: "success" });
                })
                .catch(() =>
                  // Clipboard access can be refused. The code is on screen,
                  // so this is a convenience, not the only way out.
                  toast({
                    title: "Could not copy",
                    description: "Read it from the screen instead.",
                  }),
                );
            }}
          >
            <Copy className="h-4 w-4" />
          </Button>
        </div>

        <DialogFooter>
          <Button onClick={onClose}>{copied ? "Done" : "I have written it down"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function UsersScreen() {
  const currentUser = useAuthStore((s) => s.user);
  const toast = useUiStore((s) => s.toast);
  const { data: users, isLoading } = useUsers();
  const remove = useDeleteUser();
  const issueCode = useIssueRecoveryCode();
  const resendInvite = useResendInvite();

  const [editing, setEditing] = useState<UserDto | null>(null);
  const [adding, setAdding] = useState(false);
  const [permissionsFor, setPermissionsFor] = useState<UserDto | null>(null);
  const [deleting, setDeleting] = useState<UserDto | null>(null);
  const [recoveryCode, setRecoveryCode] = useState<RecoveryCodeDto | null>(null);

  return (
    <>
      <PageHeader
        title="Users"
        description="Who can sign in, and what each of them can reach."
        actions={
          <Button onClick={() => setAdding(true)}>
            <Plus className="h-4 w-4" /> Add someone
          </Button>
        }
      />

      {isLoading ? (
        <div className="space-y-2" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-14 rounded-md" />
          ))}
        </div>
      ) : (users ?? []).length === 0 ? (
        <EmptyState
          title="Nobody else yet"
          description="Add your supervisors so they can write diary entries."
          action={<Button onClick={() => setAdding(true)}>Add someone</Button>}
        />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <Table>
            <TableHeader className="bg-secondary/40">
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-4">Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(users ?? []).map((user) => {
                const isSelf = currentUser?.id === user.id;
                return (
                  <TableRow key={user.id}>
                    <TableCell className="pl-4">
                      <div className="flex items-center gap-2.5">
                        <span
                          aria-hidden="true"
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold"
                        >
                          {initialsOf(user.name)}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {user.name}
                            {isSelf && (
                              <span className="ml-2 text-xs text-muted-foreground">(you)</span>
                            )}
                          </p>
                          {user.phone !== null && (
                            <p className="text-xs text-muted-foreground">{user.phone}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{user.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={ROLE_STYLE[user.role]}>
                        {user.role.charAt(0) + user.role.slice(1).toLowerCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.active ? (
                        <span className="text-sm text-muted-foreground">Active</span>
                      ) : (
                        <Badge variant="outline">Cannot sign in</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          aria-label={`Edit ${user.name}`}
                          onClick={() => setEditing(user)}
                        >
                          <UserCog className="h-4 w-4" />
                        </Button>

                        {user.role !== "MANAGER" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            aria-label={`Set what ${user.name} can reach`}
                            onClick={() => setPermissionsFor(user)}
                          >
                            <Shield className="h-4 w-4" />
                          </Button>
                        )}

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          aria-label={`Issue a recovery code for ${user.name}`}
                          disabled={issueCode.isPending}
                          onClick={() =>
                            issueCode.mutate(user.id, {
                              onSuccess: (code) => setRecoveryCode(code),
                              onError: () =>
                                toast({
                                  title: "A code could not be issued",
                                  variant: "destructive",
                                }),
                            })
                          }
                        >
                          <KeyRound className="h-4 w-4" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          aria-label={`Show ${user.name}'s invitation details`}
                          onClick={() =>
                            resendInvite.mutate(user.id, {
                              onSuccess: (invite) =>
                                toast({
                                  title: "Invitation details",
                                  // The endpoint does not send mail: it
                                  // echoes the address back for the manager
                                  // to pass on, as the legacy did.
                                  description: `${invite.name} — ${invite.email}`,
                                }),
                            })
                          }
                        >
                          <Mail className="h-4 w-4" />
                        </Button>

                        {!isSelf && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            aria-label={`Delete ${user.name}`}
                            onClick={() => setDeleting(user)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <UserFormDialog open={adding} onOpenChange={setAdding} />

      {editing !== null && (
        <UserFormDialog
          user={editing}
          open
          onOpenChange={(open) => {
            if (!open) setEditing(null);
          }}
        />
      )}

      {permissionsFor !== null && (
        <UserPermissionsDialog
          user={permissionsFor}
          open
          onOpenChange={(open) => {
            if (!open) setPermissionsFor(null);
          }}
        />
      )}

      {recoveryCode !== null && (
        <RecoveryCodeDialog code={recoveryCode} onClose={() => setRecoveryCode(null)} />
      )}

      {deleting !== null && (
        <ConfirmDialog
          open
          onOpenChange={(open) => {
            if (!open) setDeleting(null);
          }}
          title={`Delete ${deleting.name}?`}
          // Says the alternative, because it is almost always the right one.
          description="Their diary entries stay, but stop showing who wrote them. If you only want to stop them signing in, edit them and turn off “Can sign in” instead."
          confirmLabel="Delete the user"
          destructive
          onConfirm={() => {
            const name = deleting.name;
            remove.mutate(deleting.id, {
              onSuccess: () => toast({ title: `${name} deleted`, variant: "success" }),
              onError: () =>
                toast({ title: "They could not be deleted", variant: "destructive" }),
            });
            setDeleting(null);
          }}
        />
      )}
    </>
  );
}
