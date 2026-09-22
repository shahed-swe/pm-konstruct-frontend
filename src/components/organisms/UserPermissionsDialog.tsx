"use client";

/**
 * Granting someone access to parts of the product.
 *
 * Three levels per area rather than a grid of checkboxes: none, view, edit.
 * Write without read is meaningless and has never been wanted, so the two
 * move together.
 *
 * Managers do not appear here: they bypass permission rows entirely, both in
 * the UI and in the API, so a permissions dialog for one would be a lie.
 */
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/atoms/Button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/molecules/Dialog";
import { useSetUserPermissions, useUserPermissions } from "@/lib/api/resources/users";
import {
  ACCESS_AREAS,
  levelOf,
  toPermissions,
  withLevel,
  type AccessLevel,
} from "@/lib/auth/accessAreas";
import { cn } from "@/lib/utils/cn";
import { useUiStore } from "@/stores/ui.store";
import type { UserDto } from "@/lib/api/types";

const LEVELS: { value: AccessLevel; label: string }[] = [
  { value: "none", label: "No access" },
  { value: "view", label: "View" },
  { value: "edit", label: "Edit" },
];

export function UserPermissionsDialog({
  user,
  open,
  onOpenChange,
}: {
  user: UserDto;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const toast = useUiStore((s) => s.toast);
  const { data: permissions, isLoading } = useUserPermissions(user.id, open);
  const save = useSetUserPermissions(user.id);
  const [held, setHeld] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (permissions === undefined) return;
    setHeld(new Set(permissions.map((p) => `${p.resource}:${p.action}`)));
  }, [permissions]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>What {user.name} can reach</DialogTitle>
          <DialogDescription>
            Changes take effect the next time they load a page. They will not be signed out.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
        ) : (
          <ul className="divide-y">
            {ACCESS_AREAS.map((area) => {
              const level = levelOf(area.resource, held);
              const options = LEVELS.filter((l) => l.value !== "edit" || area.edit !== null);

              return (
                <li key={area.resource} className="space-y-2 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{area.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {level === "edit" && area.edit !== null
                          ? area.edit
                          : level === "view"
                            ? area.view
                            : "Hidden from them entirely"}
                      </p>
                    </div>

                    <div
                      className="flex shrink-0 rounded-lg border p-0.5"
                      role="group"
                      aria-label={`Access to ${area.label}`}
                    >
                      {options.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          aria-pressed={level === option.value}
                          onClick={() =>
                            setHeld((prev) => withLevel(area.resource, option.value, prev))
                          }
                          className={cn(
                            "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                            level === option.value
                              ? "bg-primary text-primary-foreground"
                              : "text-muted-foreground hover:text-foreground",
                          )}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={save.isPending || isLoading}
            onClick={() =>
              save.mutate(toPermissions(held), {
                onSuccess: () => {
                  toast({ title: "Access updated", variant: "success" });
                  onOpenChange(false);
                },
                onError: () =>
                  toast({ title: "The changes were not saved", variant: "destructive" }),
              })
            }
          >
            {save.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            Save access
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
