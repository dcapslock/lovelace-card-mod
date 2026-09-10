import { PropertyValues } from "lit";
import { UixForgeSparkBase } from "./uix-spark-base";
import {
  createHaTileIcon,
  dispatchHaTileIconAction,
  getEntityDefaultTileIconAction,
  updateHaTileIcon,
} from "../../helpers/dom/ha-tile-icon";

const TILE_ICON_ID_ATTR = "data-uix-forge-tile-icon-id";

export { getEntityDefaultTileIconAction };

export class UixForgeSparkTileIcon extends UixForgeSparkBase {
  type = "tile-icon";

  private after: string = "";
  private before: string = "";
  private icon: string = "";
  private color: string = "";
  private iconPath: string = "";
  private imageUrl: string = "";
  private entity: string = "";
  private tapAction: Record<string, any> | null = null;
  private holdAction: Record<string, any> | null = null;
  private doubleTapAction: Record<string, any> | null = null;
  private _iconElement: HTMLElement | null = null;
  private readonly _id: string;

  constructor(controller: any, config: Record<string, any>) {
    super(controller, config);
    this._id = `uix-forge-tile-icon-${Math.random().toString(36).slice(2, 11)}`;
    this._applyConfig(config);
  }

  configUpdated(config: Record<string, any>): void {
    super.configUpdated(config);
    this._applyConfig(config);
  }

  private _applyConfig(config: Record<string, any>) {
    this.after = config.after || config.for || this.defaultTarget("");
    this.before = config.before || "";
    this.icon = config.icon || "";
    this.color = config.color || "";
    this.iconPath = config.icon_path || "";
    this.imageUrl = config.image_url || "";
    this.entity = config.entity || "";
    this.tapAction = config.tap_action || null;
    this.holdAction = config.hold_action || null;
    this.doubleTapAction = config.double_tap_action || null;

    if (!this.tapAction && this.entity) {
      this.tapAction = { action: getEntityDefaultTileIconAction(this.entity) };
    }
  }

  updated(_changedProperties: PropertyValues): void {
    const gen = this._beginUpdate();
    this._attach(gen);
  }

  connectedCallback(): void {
    const gen = this._beginUpdate();
    this._attach(gen);
  }

  disconnectedCallback(): void {
    this._cancelPending();
    this._remove();
  }

  private _remove() {
    if (this._iconElement) {
      this._iconElement.remove();
      this._iconElement = null;
    }
  }

  private async _attach(generation: number) {
    const selector = this.after || this.before;
    if (!selector) return;
    if (!this.icon && !this.iconPath && !this.imageUrl && !this.entity) return;

    const elements = await this.controller.target(selector, this._cancel);
    const element = elements?.[0];
    if (!element) return;
    if (generation !== this._callGeneration) return;

    const parent = element.parentElement || element.parentNode;
    if (!parent) return;

    // Find an existing tile-icon element for this spark instance in the current parent
    const existingInParent = (parent as ParentNode).querySelector?.(
      `ha-tile-icon[${TILE_ICON_ID_ATTR}="${this._id}"]`
    ) as HTMLElement | null;

    // If our tracked element moved to a different parent, remove it
    if (this._iconElement && !existingInParent) {
      this._iconElement.remove();
      this._iconElement = null;
    }

    let tileIconEl = existingInParent as any;
    if (!tileIconEl) {
      tileIconEl = createHaTileIcon(this.tileIconConfig(), this.controller.forge.hass, (event) => {
        dispatchHaTileIconAction(tileIconEl, this.tileIconConfig(), event);
      }) as any;
      tileIconEl.setAttribute(TILE_ICON_ID_ATTR, this._id);

      if (element.getAttribute("slot")) {
        tileIconEl.setAttribute("slot", element.getAttribute("slot")!);
      }

      if (this.after) {
        const nextSibling = element.nextSibling;
        if (nextSibling) {
          parent.insertBefore(tileIconEl, nextSibling);
        } else {
          parent.appendChild(tileIconEl);
        }
      } else {
        parent.insertBefore(tileIconEl, element);
      }

    }

    this._updateElement(tileIconEl);
    this._iconElement = tileIconEl;
  }

  private _updateElement(tileIconEl: any) {
    updateHaTileIcon(tileIconEl, this.tileIconConfig(), this.controller.forge.hass);
  }

  private tileIconConfig() {
    return {
      entity: this.entity,
      icon: this.icon,
      color: this.color,
      icon_path: this.iconPath,
      image_url: this.imageUrl,
      tap_action: this.tapAction ?? undefined,
      hold_action: this.holdAction ?? undefined,
      double_tap_action: this.doubleTapAction ?? undefined,
    };
  }
}
