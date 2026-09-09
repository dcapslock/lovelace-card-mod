import { actionHandlerBind } from "./action-handler";

export const HA_BUTTON_CSS = `
  ha-button.uix-forge-spark-button {
    margin: var(--uix-button-margin, -6px);
  }
  ha-button.uix-forge-spark-button::part(base) {
    border-color: var(--uix-button-border-color, revert-layer);
  }
  ha-button.uix-forge-spark-icon-button {
    margin: var(--uix-button-margin, 0px);
    display: inline-block;
    outline: none;
    --ha-button-height: var(--ha-icon-button-size, 48px);
    height: var(--ha-button-height);
    position: relative;
    isolation: isolate;
    --wa-form-control-padding-inline: var(--ha-icon-button-padding-inline, var(--ha-space-2));
    --wa-color-on-normal: currentColor;
    --wa-color-fill-quiet: transparent;
    --ha-button-label-overflow: visible;
    align-self: center;
  }
  ha-button.uix-forge-spark-icon-button::after {
    content: "";
    position: absolute;
    inset: 0;
    z-index: -1;
    border-radius: 50%;
    background-color: var(--uix-icon-button-background-color, currentColor);
    opacity: var(--uix-icon-button-background-opacity, 0);
    pointer-events: none;
  }
  ha-button.uix-forge-spark-icon-button::part(base) {
    width: var(--wa-form-control-height);
    aspect-ratio: 1;
    outline-offset: -4px;
    border-color: var(--uix-button-border-color, revert-layer);
  }
  ha-button.uix-forge-spark-icon-button::part(label) {
    display: flex;
  }
  ha-button span.uix-button-label {
    text-wrap: var(--uix-button-label-text-wrap, wrap);
  }
  @media (hover: hover) {
    ha-button.uix-forge-spark-icon-button:hover:not([disabled])::after {
      opacity: var(--uix-icon-button-background-opacity-hover, calc(var(--uix-icon-button-background-opacity, 0) + 0.1));
      background-color: var(--uix-icon-button-background-color-hover, var(--uix-icon-button-background-color, currentColor));
    }
  }
`;

const BUTTON_CLASS = "uix-forge-spark-button";
const ICON_BUTTON_CLASS = "uix-forge-spark-icon-button";
const BUTTON_VARIANTS = ["brand", "neutral", "danger", "warning", "success"] as const;
const BUTTON_APPEARANCES = ["accent", "filled", "outlined", "plain"] as const;

type ButtonVariant = typeof BUTTON_VARIANTS[number];
type ButtonAppearance = typeof BUTTON_APPEARANCES[number];

export type UixButtonConfig = {
  entity?: string;
  icon?: string;
  color?: string;
  label?: string;
  size?: string;
  variant?: ButtonVariant;
  appearance?: ButtonAppearance;
  start_icon?: string;
  end_icon?: string;
  tap_action?: Record<string, any>;
  hold_action?: Record<string, any>;
  double_tap_action?: Record<string, any>;
};

export function createHaButton(config: UixButtonConfig, handleAction: (event: CustomEvent) => void): HTMLElement {
  const button = document.createElement("ha-button");
  button.addEventListener("action", handleAction as EventListener);
  updateHaButton(button, config);
  return button;
}

export function updateHaButton(button: HTMLElement, config: UixButtonConfig) {
  const icon = config.icon || "";
  const label = config.label || "";
  const color = config.color || "";
  const size = config.size || "";
  const variant = BUTTON_VARIANTS.includes(config.variant as ButtonVariant)
    ? config.variant
    : icon ? "neutral" : "";
  const appearance = BUTTON_APPEARANCES.includes(config.appearance as ButtonAppearance)
    ? config.appearance
    : icon ? "plain" : "";

  if (icon && !label) {
    button.classList.remove(BUTTON_CLASS);
    button.classList.add(ICON_BUTTON_CLASS);
    if (color) button.style.color = color;
    else button.style.removeProperty("color");
  } else {
    button.classList.add(BUTTON_CLASS);
    button.classList.remove(ICON_BUTTON_CLASS);
    button.style.removeProperty("color");
  }

  setOptionalAttribute(button, "size", size);
  setOptionalAttribute(button, "variant", variant);
  setOptionalAttribute(button, "appearance", appearance);

  let labelEl = button.querySelector(`:scope > .uix-button-label`);
  let labelIconEl = button.querySelector(`:scope > ha-icon.uix-button-icon`) as (HTMLElement & { icon: string }) | null;
  if (icon) {
    if (labelEl) labelEl.remove();
    if (!labelIconEl) {
      labelIconEl = document.createElement("ha-icon") as HTMLElement & { icon: string };
      labelIconEl.className = "uix-button-icon";
      button.appendChild(labelIconEl);
    }
    labelIconEl.icon = icon;
  } else {
    if (labelIconEl) labelIconEl.remove();
    if (label) {
      if (!labelEl) {
        labelEl = document.createElement("span");
        labelEl.className = "uix-button-label";
        button.appendChild(labelEl);
      }
      labelEl.innerHTML = label;
    } else if (labelEl) {
      labelEl.remove();
    }
  }

  updateSlottedIcon(button, "start", config.start_icon, true);
  updateSlottedIcon(button, "end", config.end_icon, false);

  const hasHold = !!(config.hold_action && config.hold_action.action !== "none");
  const hasDoubleClick = !!(config.double_tap_action && config.double_tap_action.action !== "none");
  const hasTap = !!(config.tap_action && config.tap_action.action !== "none");
  if (hasTap || hasHold || hasDoubleClick) {
    actionHandlerBind(button, { hasHold, hasDoubleClick });
  }
}

export function dispatchHaButtonAction(button: HTMLElement, config: UixButtonConfig, event: CustomEvent) {
  const action = event.detail?.action as string;
  if (!action) return;

  const actionKey = `${action}_action` as keyof UixButtonConfig;
  const actionConfig: Record<string, any> = {};
  if (config.entity) actionConfig.entity = config.entity;
  if (config.tap_action) actionConfig.tap_action = config.tap_action;
  if (config.hold_action) actionConfig.hold_action = config.hold_action;
  if (config.double_tap_action) actionConfig.double_tap_action = config.double_tap_action;
  if (!actionConfig[actionKey]) return;

  button.dispatchEvent(new CustomEvent("hass-action", {
    bubbles: true,
    composed: true,
    detail: { config: actionConfig, action },
  }));
}

function setOptionalAttribute(element: Element, name: string, value: string | undefined) {
  if (value) element.setAttribute(name, value);
  else element.removeAttribute(name);
}

function updateSlottedIcon(button: HTMLElement, slot: "start" | "end", icon: string | undefined, insertFirst: boolean) {
  let iconEl = button.querySelector(`:scope > ha-icon[slot="${slot}"]`);
  if (!icon) {
    iconEl?.remove();
    return;
  }
  if (!iconEl) {
    iconEl = document.createElement("ha-icon");
    iconEl.setAttribute("slot", slot);
    if (insertFirst) button.insertBefore(iconEl, button.firstChild);
    else button.appendChild(iconEl);
  }
  (iconEl as HTMLElement & { icon: string }).icon = icon;
}
