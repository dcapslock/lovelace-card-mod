import { Unpromise } from "@watchable/unpromise";
import { selectTree } from "./selecttree";

function getEmbeddedCustomPanelConfig() {
  try {
    if (window.self === window.parent) return null;
    return (window.parent as any).customPanel?.panel?.config?._panel_custom ?? null;
  } catch {
    return null;
  }
}

// True when UIX is running inside a Home Assistant `panel_custom` iframe (embed_iframe: true).
export function isEmbeddedPanel() {
  return getEmbeddedCustomPanelConfig() !== null;
}

export function getCustomPanelName() {
  return getEmbeddedCustomPanelConfig()?.name || null;
}

export async function panel_base_el() {
  if (isEmbeddedPanel()) {
    const customPanelName = getCustomPanelName();
    if (customPanelName) {
      await customElements.whenDefined(customPanelName);
      while (!document.querySelector(customPanelName))
        await new Promise((r) => window.setTimeout(r, 100));
      return document.querySelector(customPanelName);
    } else {
      return Promise.reject("UIX: Not in a custom panel");
    }
  } else {
    return hass_base_el();
  }
}

export async function hass_base_el() {
  await Unpromise.race([
    customElements.whenDefined("home-assistant"),
    customElements.whenDefined("hc-main"),
  ]);

  const element = customElements.get("home-assistant")
    ? "home-assistant"
    : "hc-main";

  while (!document.querySelector(element))
    await new Promise((r) => window.setTimeout(r, 100));
  return document.querySelector(element);
}

export async function hass() {
  const base: any = await panel_base_el();
  while (!base.hass) await new Promise((r) => window.setTimeout(r, 100));
  return base.hass;
}

export async function provideHass(el) {
  const base: any = await panel_base_el();
  if (base.provideHass) {
    base.provideHass(el);
  } else {
    el.hass = base.hass;
    const hassDescriptor =
      Object.getOwnPropertyDescriptor(base, "hass") ||
      Object.getOwnPropertyDescriptor(Object.getPrototypeOf(base), "hass");
    let hass = base.hass;
    const originalSetter = hassDescriptor?.set?.bind(base);

    Object.defineProperty(base, "hass", {
      configurable: true,
      enumerable: hassDescriptor?.enumerable ?? true,
      get() {
        return hass;
      },
      set(value) {
        hass = value;
        originalSetter?.(value);
        el.hass = value;
      },
    });
  }
}

export async function getLovelaceRoot(document) {
  let _lovelaceRoot = await _getLovelaceRoot(document);
  while (_lovelaceRoot === null) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    _lovelaceRoot = await _getLovelaceRoot(document);
  }
  return _lovelaceRoot || null;
  
  async function _getLovelaceRoot(document)
  {  let root = await selectTree(
      document,
      "home-assistant$home-assistant-main$ha-panel-lovelace$hui-root"
    );
    if (!root) {
      let panel = await selectTree(
        document,
        "home-assistant$home-assistant-main$partial-panel-resolver>*"
      );
      if (panel?.localName !== "ha-panel-lovelace")
        return false;
    }
    if (!root)
      root = await selectTree(
        document,
        "hc-main $ hc-lovelace $ hui-view"
      );
    if (!root)
      root = await selectTree(
        document,
        "hc-main $ hc-lovelace $ hui-panel-view"
      );
    return root;
  }
}

const LOCALIZE_PATTERN = /__[^_]+__/g;

export const translate = (hass, text: String) => {
  return text.replace(LOCALIZE_PATTERN, (key) => {
    const params = key
      .slice(2, -2)
      .split(/\s*,\s*/);
    return hass?.localize?.apply(null, params) || key;
  });
};

export type Context = {
  id: string;
  user_id: string | null;
  parent_id: string | null;
};

export type HassEntityBase = {
  entity_id: string;
  state: string;
  last_changed: string;
  last_updated: string;
  attributes: HassEntityAttributeBase;
  context: Context;
};

export type HassEntityAttributeBase = {
  friendly_name?: string;
  unit_of_measurement?: string;
  icon?: string;
  entity_picture?: string;
  supported_features?: number;
  hidden?: boolean;
  assumed_state?: boolean;
  device_class?: string;
  state_class?: string;
  restored?: boolean;
};

export type HassEntity = HassEntityBase & {
  attributes: { [key: string]: any };
};
