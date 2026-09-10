import { parseDuration } from "./common/parse-duration";

export interface LockEntry {
  active?: boolean;
  /** Numeric PIN code (e.g. 1234) – shown with a numpad dialog. */
  pin?: string | number;
  /** Text or numeric code – numeric codes use the numpad dialog, text codes use a password-field dialog. */
  code?: string | number;
  /** Confirmation: `true` for default HA text, a plain string for custom text, or an object with optional `title` and `text`. */
  confirmation?: string | boolean | { title?: string; text?: string };
  /** Usernames this lock applies to. If omitted the lock applies to all non-admin users. */
  users?: string[];
  /** When `true` this lock also applies to (or, when no `users` list, exclusively targets) admins. */
  admins?: boolean;
  /** Usernames exempt from this lock when no `users` list is set. */
  except?: string[];
  /** Milliseconds (or a human-readable duration) to wait before another code attempt after a wrong entry. */
  retry_delay?: string | number;
  /** Maximum consecutive wrong attempts before the extended delay kicks in. */
  max_retries?: number;
  /** Milliseconds (or a human-readable duration) to wait after `max_retries` wrong attempts. */
  max_retries_delay?: string | number;
}

/** Options forwarded to the HA `showEnterCodeDialog` helper. */
export interface CodeDialogConfig {
  title?: string;
  submit_text?: string;
  cancel_text?: string;
}

export interface LockUser {
  name?: string;
  is_admin?: boolean;
}

export interface LockAccessConfig {
  locks?: LockEntry[];
  permissive?: boolean;
  code_dialog?: CodeDialogConfig;
}

export interface LockAccessState {
  lock: LockEntry | null;
  requiresUnlock: boolean;
  blocked: boolean;
}

export interface LockRetryState {
  retryCount: number;
  retryUntil: number;
}

export const createLockRetryState = (): LockRetryState => ({
  retryCount: 0,
  retryUntil: 0,
});

/**
 * Select the first active lock applicable to a user, falling back to the first
 * matching inactive entry when there is no active match.
 */
export const findMatchingLock = (locks: LockEntry[], user?: LockUser): LockEntry | null => {
  const userName = user?.name ?? "";
  const isAdmin = user?.is_admin === true;
  let firstInactiveMatch: LockEntry | null = null;

  for (const lock of locks) {
    const hasUsersList = Array.isArray(lock.users) && lock.users.length > 0;
    let matches = false;

    if (hasUsersList) {
      matches = lock.users!.includes(userName) || (isAdmin && lock.admins === true);
    } else {
      if (isAdmin && lock.admins !== true) continue;
      if (Array.isArray(lock.except) && lock.except.includes(userName)) continue;
      matches = true;
    }

    if (matches) {
      if (lock.active !== false) return lock;
      if (firstInactiveMatch === null) firstInactiveMatch = lock;
    }
  }

  return firstInactiveMatch;
};

/** Resolve whether the user needs to unlock, is already allowed, or is blocked. */
export const getLockAccessState = (config: LockAccessConfig, user?: LockUser): LockAccessState => {
  const lock = findMatchingLock(Array.isArray(config.locks) ? config.locks : [], user);
  if (lock !== null) {
    return { lock, requiresUnlock: lock.active !== false, blocked: false };
  }
  if (config.permissive === true || user?.is_admin === true) {
    return { lock: null, requiresUnlock: false, blocked: false };
  }
  return { lock: null, requiresUnlock: false, blocked: true };
};

/**
 * Run the matching code and confirmation challenges. Returns true only when
 * the user may proceed. Retry state belongs to the caller so it can survive
 * repeated attempts for the same lock.
 */
export const requestLockAccess = async ({
  config,
  user,
  anchor,
  retryState,
}: {
  config: LockAccessConfig;
  user?: LockUser;
  anchor: HTMLElement;
  retryState: LockRetryState;
}): Promise<boolean> => {
  const state = getLockAccessState(config, user);
  if (!state.requiresUnlock) return !state.blocked;
  if (Date.now() < retryState.retryUntil) return false;

  let helpers: any;
  try {
    helpers = await (window as any).loadCardHelpers();
  } catch {
    return false;
  }

  const lock = state.lock!;
  const codeValue = lock.code ?? lock.pin;
  if (codeValue !== undefined && codeValue !== null && String(codeValue) !== "") {
    const dialog = config.code_dialog ?? {};
    const entered = await helpers.showEnterCodeDialog(anchor, {
      codeFormat: /^\d+$/.test(String(codeValue)) ? "number" : "text",
      ...(dialog.title !== undefined && { title: dialog.title }),
      ...(dialog.submit_text !== undefined && { submitText: dialog.submit_text }),
      ...(dialog.cancel_text !== undefined && { cancelText: dialog.cancel_text }),
    }) as string | null;

    if (entered === null) return false;
    if (String(entered) !== String(codeValue)) {
      retryState.retryCount++;
      if (lock.max_retries !== undefined && retryState.retryCount >= lock.max_retries) {
        retryState.retryUntil = Date.now() + (parseDuration(lock.max_retries_delay) ?? 30000);
        retryState.retryCount = 0;
      } else if (lock.retry_delay) {
        retryState.retryUntil = Date.now() + (parseDuration(lock.retry_delay) ?? 0);
      }
      await helpers.showAlertDialog(anchor, { title: "Wrong code" });
      return false;
    }
    retryState.retryCount = 0;
  }

  if (lock.confirmation !== undefined && lock.confirmation !== false) {
    const confirmation = lock.confirmation;
    const confirmed = await helpers.showConfirmationDialog(anchor, {
      title: typeof confirmation === "object" ? confirmation.title : undefined,
      text: typeof confirmation === "string"
        ? confirmation
        : typeof confirmation === "object"
          ? confirmation.text
          : undefined,
    }) as boolean;
    if (!confirmed) return false;
  }

  return true;
};
