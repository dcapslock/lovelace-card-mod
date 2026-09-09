import { patch_element, patch_object } from "../helpers/patch_function";
import { apply_uix } from "../helpers/apply_uix";
import { ModdedElement } from "../helpers/apply_uix";

/*
Patch the ha-card element to on first update:
- if it's parent is a hui-card, do nothing (as that is already handled in hui-card patch)
- try to find the config parameter of it's parent element
- Apply uix styles according to that config
*/

@patch_element("ha-card")
class HaCardPatch extends ModdedElement {
  _uix = [];
  _uixPatchPromise?: Promise<unknown>;
  async firstUpdated(_orig, ...args) {
    await _orig?.(...args);

    const huiCard = (this.parentNode as any)?.host?.parentNode;
    if (huiCard && huiCard.localName === "hui-card") return;

    let config = findConfig(this);
    if (!config) {
      const coordinator = (window as any).uixCoordinator;
      if (coordinator?.alwaysPatchHaCard) {
        config = { type: "generic-card" };
      } else {
        return;
      }
    }

    const cls = `type-${config?.type?.replace?.(":", "-")}`;
    const patchPromise = apply_uix(
      this,
      "card",
      config?.uix ?? config?.card_mod ?? undefined,
      { config },
      false,
      cls
    );
    this._uixPatchPromise = patchPromise;
    try {
      await patchPromise;
    } finally {
      if (this._uixPatchPromise === patchPromise) {
        this._uixPatchPromise = undefined;
      }
    }

    // Don't patch generic-card parent
    if (config.type == "generic-card") return;

    const parent = (this.parentNode as any)?.host;
    if (!parent) return;

    patch_object(parent, ModdedElement);
    parent._uix = this._uix;
  }

  updated(_orig, ...args) {
    _orig?.(...args);
    
    const coordinator = (window as any).uixCoordinator;
    // Await any firstUpdated or updated patching to complete before checking if we need to patch
    // due to firstUpdate not being patched due to early load ha-card before UIX running
    if (coordinator?.alwaysPatchHaCard && !this._uixPatchPromise && (!this._uix || this._uix.length === 0)) {
      const huiCard = (this.parentNode as any)?.host?.parentNode;
      if (huiCard && huiCard.localName === "hui-card") return;
      
      // Make sure generic ha-card is patched if it was not patched on firstUpdated
      const cls = `type-generic-card`;
      const patchPromise = apply_uix(
        this,
        "card",
        undefined,
        { config: { type: "generic-card" } },
        false,
        cls
      );
      this._uixPatchPromise = patchPromise;
      patchPromise.then(
        () => {
          if (this._uixPatchPromise === patchPromise) {
            this._uixPatchPromise = undefined;
          }
        }
      );
    }
  }
}

interface LovelaceCard extends Node {
  config?: any;
  _config?: any;
  host?: LovelaceCard;
}

export function findConfig(node: LovelaceCard) {
  if (node.config) return node.config;
  if (node._config) return node._config;
  // If we have made it to a custom element, we can stop searching
  const nodeName = node.nodeName?.toLowerCase();
  if (
    nodeName &&
    nodeName !== "ha-card" && 
    window.customElements.get(nodeName) && 
    (nodeName.startsWith("hui-") || nodeName.startsWith("ha-"))
  ) return null;
  if (node.host) return findConfig(node.host);
  if (node.parentElement) return findConfig(node.parentElement);
  if (node.parentNode) return findConfig(node.parentNode);
  return null;
}
