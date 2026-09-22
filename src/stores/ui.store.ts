/**
 * Chrome state: the sidebar, the command palette, the active toasts.
 *
 * Client-only by definition -- none of it is worth a round trip, and none of
 * it should survive a sign-out. The sidebar's collapsed state is the one
 * thing persisted, because re-collapsing it on every visit is the kind of
 * small irritation people notice daily.
 */
import { createPersistedStore } from "./createStore";

export interface Toast {
  id: string;
  title: string;
  description?: string | undefined;
  variant: "default" | "success" | "destructive";
}

export interface UiState {
  sidebarCollapsed: boolean;
  /** Separate from the desktop state: a phone's drawer starts closed every time. */
  mobileNavOpen: boolean;
  toasts: Toast[];

  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setMobileNavOpen: (open: boolean) => void;
  toast: (toast: Omit<Toast, "id">) => string;
  dismissToast: (id: string) => void;
}

let toastSeq = 0;

export const useUiStore = createPersistedStore<UiState>(
  (set) => ({
    sidebarCollapsed: false,
    mobileNavOpen: false,
    toasts: [],

    toggleSidebar: () =>
      set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed }), false, "ui/toggleSidebar"),

    setSidebarCollapsed: (sidebarCollapsed) =>
      set({ sidebarCollapsed }, false, "ui/setSidebarCollapsed"),

    setMobileNavOpen: (mobileNavOpen) => set({ mobileNavOpen }, false, "ui/setMobileNavOpen"),

    toast: (toast) => {
      const id = `t${++toastSeq}`;
      set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }), false, "ui/toast");
      return id;
    },

    dismissToast: (id) =>
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }), false, "ui/dismissToast"),
  }),
  { name: "ui", keys: ["sidebarCollapsed"] },
);
