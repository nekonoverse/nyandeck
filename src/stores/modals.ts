import { createSignal } from "solid-js";
import type { Note } from "@nekonoverse/ui/api/statuses";

// --- Compose Modal ---
interface ComposeState {
  open: boolean;
  replyTo: Note | null;
  quoteNote: Note | null;
}

const [composeState, setComposeState] = createSignal<ComposeState>({
  open: false,
  replyTo: null,
  quoteNote: null,
});

export { composeState };

export function openComposer(opts?: { replyTo?: Note; quoteNote?: Note }) {
  setComposeState({
    open: true,
    replyTo: opts?.replyTo ?? null,
    quoteNote: opts?.quoteNote ?? null,
  });
}

export function closeComposer() {
  setComposeState({ open: false, replyTo: null, quoteNote: null });
}

// --- Profile Modal ---
interface ProfileState {
  open: boolean;
  acct: string | null;
  accountId: string | null;
}

const [profileState, setProfileState] = createSignal<ProfileState>({
  open: false,
  acct: null,
  accountId: null,
});

export { profileState };

export function openProfile(opts: { acct?: string; accountId?: string }) {
  setProfileState({
    open: true,
    acct: opts.acct ?? null,
    accountId: opts.accountId ?? null,
  });
}

export function closeProfile() {
  setProfileState({ open: false, acct: null, accountId: null });
}

// Helper: convert actor-like object to acct string and open profile
export function navigateToProfile(actor: { username: string; domain?: string | null; id?: string }) {
  const acct = actor.domain
    ? `${actor.username}@${actor.domain}`
    : actor.username;
  openProfile({ acct, accountId: actor.id });
}
