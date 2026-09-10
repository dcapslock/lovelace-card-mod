import { computeDomain } from "../common/entity/compute_domain";
import { stateActive } from "../common/entity/state_active";
import { computeCssColor } from "../common/entity/compute_color";
import { stateColorCss } from "../common/entity/state_color";
import { hsv2rgb, rgb2hex, rgb2hsv } from "../common/color/convert_color";
import { DOMAINS_TOGGLE } from "../common/const";

export type UixTileIconConfig = {
  entity?: string;
  icon?: string;
  color?: string;
  icon_path?: string;
  image_url?: string;
  tap_action?: Record<string, any>;
  hold_action?: Record<string, any>;
  double_tap_action?: Record<string, any>;
};

export function getEntityDefaultTileIconAction(entityId: string) {
  const domain = computeDomain(entityId);
  return DOMAINS_TOGGLE.has(domain) || ["button", "input_button", "scene"].includes(domain)
    ? "toggle"
    : "none";
}

export function createHaTileIcon(config: UixTileIconConfig, hass: any, handleAction: (event: CustomEvent) => void): HTMLElement {
  const tileIcon = document.createElement("ha-tile-icon");
  tileIcon.addEventListener("action", handleAction as EventListener);
  updateHaTileIcon(tileIcon, config, hass);
  return tileIcon;
}

export function updateHaTileIcon(tileIcon: HTMLElement, config: UixTileIconConfig, hass: any) {
  const entity = config.entity || "";
  const tapAction = config.tap_action ?? (entity ? { action: getEntityDefaultTileIconAction(entity) } : undefined);
  const hasActions = !![
    tapAction,
    config.hold_action,
    config.double_tap_action,
  ].some((action) => action?.action !== "none");
  const tileIconElement = tileIcon as HTMLElement & Record<string, any>;
  tileIconElement.interactive = hasActions;
  tileIconElement.actionHandlerOptions = hasActions
    ? {
      hasHold: !!(config.hold_action && config.hold_action.action !== "none"),
      hasDoubleClick: !!(config.double_tap_action && config.double_tap_action.action !== "none"),
    }
    : undefined;
  const existingStateIcon = tileIcon.querySelector(':scope > ha-state-icon[slot="icon"]') as (HTMLElement & Record<string, any>) | null;
  if (entity) {
    let stateIcon = existingStateIcon;
    if (!stateIcon) {
      stateIcon = document.createElement("ha-state-icon") as HTMLElement & Record<string, any>;
      stateIcon.setAttribute("slot", "icon");
      tileIcon.appendChild(stateIcon);
    }
    const stateObj = hass?.states?.[entity];
    if (stateObj) {
      stateIcon.stateObj = stateObj;
      stateIcon.hass = hass;
      const color = computeTileIconStateColor(stateObj, config.color);
      if (color) tileIcon.style.setProperty("--tile-icon-color", color);
      stateIcon.icon = config.icon || undefined;
    }
    tileIconElement.icon = undefined;
    tileIconElement.iconPath = undefined;
    tileIconElement.imageUrl = undefined;
    return;
  }

  existingStateIcon?.remove();
  tileIconElement.imageUrl = config.image_url || undefined;
  tileIconElement.iconPath = config.icon_path || undefined;
  tileIconElement.icon = config.icon || undefined;
  if (config.color) tileIcon.style.setProperty("--tile-icon-color", config.color);
  else tileIcon.style.removeProperty("--tile-icon-color");
}

export function dispatchHaTileIconAction(tileIcon: HTMLElement, config: UixTileIconConfig, event: CustomEvent) {
  const action = event.detail?.action as string;
  if (!action) return;
  const actionKey = `${action}_action` as keyof UixTileIconConfig;
  const entity = config.entity || "";
  const tapAction = config.tap_action ?? (entity ? { action: getEntityDefaultTileIconAction(entity) } : undefined);
  const actionConfig: Record<string, any> = { entity };
  if (tapAction) actionConfig.tap_action = tapAction;
  if (config.hold_action) actionConfig.hold_action = config.hold_action;
  if (config.double_tap_action) actionConfig.double_tap_action = config.double_tap_action;
  if (!actionConfig[actionKey]) return;
  tileIcon.dispatchEvent(new CustomEvent("hass-action", {
    bubbles: true,
    composed: true,
    detail: { config: actionConfig, action },
  }));
}

function computeTileIconStateColor(entity: any, color?: string) {
  if (color) return stateActive(entity) ? computeCssColor(color) : undefined;
  if (["person", "device_tracker"].includes(computeDomain(entity.entity_id))) return undefined;
  if (computeDomain(entity.entity_id) === "light" && entity.attributes.rgb_color) {
    const hsvColor = rgb2hsv(entity.attributes.rgb_color);
    if (hsvColor[1] < 0.4) {
      if (hsvColor[1] < 0.1) hsvColor[2] = 225;
      else hsvColor[1] = 0.4;
    }
    return rgb2hex(hsv2rgb(hsvColor));
  }
  return stateColorCss(entity);
}
