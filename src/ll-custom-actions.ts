import { hass, hass_base_el } from "./helpers/hass";
import {
  createLockRetryState,
  LockRetryState,
  requestLockAccess,
} from "./helpers/lock-access";

const lockedActionRetryStates = new Map<string, LockRetryState>();
const fallbackLockedActionRetryStates = new WeakMap<EventTarget, Map<string, LockRetryState>>();

const lockedActionState = (source: EventTarget, data: Record<string, any>): LockRetryState => {
  const hasId = data.id != null && data.id !== "";
  const id = hasId
    ? String(data.id)
    : JSON.stringify({
      locks: data.locks,
      permissive: data.permissive,
      code_dialog: data.code_dialog,
      locked_action: data.locked_action,
    });
  if (hasId) {
    let state = lockedActionRetryStates.get(id);
    if (!state) {
      state = createLockRetryState();
      lockedActionRetryStates.set(id, state);
    }
    return state;
  }

  let states = fallbackLockedActionRetryStates.get(source);
  if (!states) {
    states = new Map();
    fallbackLockedActionRetryStates.set(source, states);
  }
  // The fallback keeps ordinary static actions stable for as long as their
  // source control is retained. An explicit id survives control recreation.
  let state = states.get(id);
  if (!state) {
    state = createLockRetryState();
    states.set(id, state);
  }
  return state;
};

// Add a listener to execute UIX custom actions via the Home Assistant `fire-dom-event` / `ll-custom` action
window.addEventListener("uix-bootstrap", async (ev: Event) => {
  ev.stopPropagation();
  document.addEventListener("ll-custom", (event: Event) => {
    const detail = (event as CustomEvent).detail;
    if (!detail || typeof detail !== "object") {
      return;
    }
    const uix = (detail as any).uix ?? (detail as any).card_mod;
    if (!uix || typeof uix !== "object") {
      return;
    }
    const actionName = (uix as any).action;
    if (actionName && typeof actionName === "string" && typeof actionList[actionName] === "function") {
      try {
        const data = (uix as any).data ?? {};
        const source = (event.composedPath().find((target) => target instanceof HTMLElement)
          ?? event.target) as EventTarget;
        const result = (actionList as any)[actionName](data, uix, source);
        if (result && typeof (result as Promise<unknown>).catch === "function") {
          (result as Promise<unknown>).catch((error: unknown) => {
            console.error(`UIX: Error while executing action "${actionName}":`, error);
          });
        }
      } catch (error) {
        console.error(`UIX: Error while executing action "${actionName}":`, error);
      }
    }
  });
});

export class Actions {
  static event(name: unknown, data: unknown = {}, anchor?: unknown) {
    if (typeof name !== "string" || !name.trim()) {
      console.error("UIX: event action requires a non-empty name:", name);
      return;
    }
    const target = anchor instanceof EventTarget ? anchor : window;
    target.dispatchEvent(new CustomEvent(name, {
      bubbles: true,
      composed: true,
      detail: data,
    }));
  }
  static async clear_cache() {
    if (window.caches) {
      try {
        const cacheNames = await window.caches.keys();
        const deletePromises: Promise<boolean>[] = [];
        cacheNames.forEach((cacheName) => {
          deletePromises.push(window.caches.delete(cacheName));
        });
        await Promise.all(deletePromises);
        window.location.reload();
      } catch (error) {
        console.error("UIX: Failed to clear caches:", error);
        // Fallback: force a full reload even if cache clearing fails
        window.location.reload();
      }
    } else {
      window.location.reload();
    }
  }
  static async more_info(data: Record<string, any>) {
    const base = await hass_base_el();
    const eventName = "hass-more-info";
    const eventDetail = { ...data };
    eventDetail.entityId =  eventDetail.entity ?? eventDetail.entity_id ?? eventDetail.entityId ?? undefined;
    delete eventDetail.entity;
    delete eventDetail.entity_id;
    const event = new CustomEvent(eventName, {
      detail: eventDetail,
      bubbles: true,
      composed: true,
    });
    base.dispatchEvent(event);
  }
  static async toast(data: Record<string, any>) {
    const dataExtensible = { ...data };
    const base = await hass_base_el();
    const eventName = "hass-notification";
    const _triggerHassAction = (action: Record<string, any>, source: HTMLElement) => {
      const config: Record<string, any> = {};
      config.tap_action = { ...action };
      source.dispatchEvent(
        new CustomEvent("hass-action", {
          bubbles: true,
          composed: true,
          detail: { config, action: "tap" },
        })
      );
    };
    if (dataExtensible.action && typeof dataExtensible.action === "object") {
      const tapAction = dataExtensible.action.tap_action ? { ...dataExtensible.action.tap_action } : {};
      dataExtensible.action = {
        ...dataExtensible.action,
        action: () => {
          _triggerHassAction(tapAction, base as HTMLElement);
        },
      };
      delete dataExtensible.action.tap_action;
    }
    if (dataExtensible.secondary_action && typeof dataExtensible.secondary_action === "object") {
      dataExtensible.secondaryAction = { ...dataExtensible.secondary_action };
      delete dataExtensible.secondary_action;
      const secondaryAction = dataExtensible.secondaryAction.tap_action ? { ...dataExtensible.secondaryAction.tap_action } : {};
      dataExtensible.secondaryAction = {
        ...dataExtensible.secondaryAction,
        action: () => {
          _triggerHassAction(secondaryAction, base as HTMLElement);
        },
      };
      delete dataExtensible.secondaryAction.tap_action;
    }
    const event = new CustomEvent(eventName, {
      detail: dataExtensible,
      bubbles: true,
      composed: true,
    });
    base.dispatchEvent(event);
  }
  static async javascript(data: Record<string, any>) {
    if (!data || typeof data.code !== "string" || !data.code.trim()) {
      console.error("UIX: Invalid or empty code for javascript action:", data);
      return;
    }
    if (
      data.variables != null &&
      (typeof data.variables !== "object" || Array.isArray(data.variables))
    ) {
      console.error("UIX: Variables must be an object for javascript action:", data.variables);
      return;
    }
    const hs = await hass();
    const code = `
      "use strict";
      ${data.code}
    `;

    let fn: Function;
    try {
      fn = new Function("hass", "variables", code);
    } catch (error) {
      console.error(
        "UIX: Failed to compile javascript action code (CSP may block unsafe-eval):",
        error
      );
      return;
    }

    try {
      fn(hs, data.variables ?? {});
    } catch (error) {
      console.error("UIX: Error while executing javascript action code:", error);
    }
  }
  static async locked_action(data: Record<string, any>, _uix: Record<string, any>, source: EventTarget) {
    if (!data || typeof data !== "object" || !data.locked_action || typeof data.locked_action !== "object") {
      console.error("UIX: locked_action requires a locked_action object:", data);
      return;
    }
    if (!(source instanceof HTMLElement)) {
      console.error("UIX: locked_action could not determine an element to show its dialog:", data);
      return;
    }

    const hs = await hass();
    const allowed = await requestLockAccess({
      config: {
        locks: Array.isArray(data.locks) ? data.locks : [],
        permissive: data.permissive === true,
        code_dialog: data.code_dialog && typeof data.code_dialog === "object" ? data.code_dialog : {},
      },
      user: hs?.user,
      anchor: source,
      retryState: lockedActionState(source, data),
    });
    if (!allowed) return;

    const config: Record<string, any> = {
      tap_action: { ...data.locked_action },
    };
    if (data.entity) config.entity = data.entity;
    source.dispatchEvent(new CustomEvent("hass-action", {
      bubbles: true,
      composed: true,
      detail: { config, action: "tap" },
    }));
  }
}

const actionList: Record<string, Function> = {
  event: (data: unknown, uix: Record<string, any>) => Actions.event(uix.name, data, uix.anchor),
  clear_cache: Actions.clear_cache,
  more_info: Actions.more_info,
  toast: Actions.toast,
  "clear-cache": Actions.clear_cache,
  "more-info": Actions.more_info,
  javascript: Actions.javascript,
  locked_action: Actions.locked_action,
};
