import { PropertyValues } from "lit";
import { UixForgeSparkBase } from "./uix-spark-base";
import { createHaButton, dispatchHaButtonAction, HA_BUTTON_CSS, updateHaButton } from "../../helpers/dom/ha-button";

const WRAPPER_ID_ATTR = "data-uix-forge-button-id";
export class UixForgeSparkButton extends UixForgeSparkBase {
  type = "button";

  private after: string = "";
  private before: string = "";
  private entity: string = "";
  private icon: string = "";
  private color: string = "";
  private label: string = "";
  private size: string = "";
  private variant: string = "";
  private appearance: string = "";
  private startIcon: string = "";
  private endIcon: string = "";
  private tapAction: Record<string, any> | null = null;
  private holdAction: Record<string, any> | null = null;
  private doubleTapAction: Record<string, any> | null = null;
  private _wrapperElement: HTMLElement | null = null;
  private readonly _id: string;

  constructor(controller: any, config: Record<string, any>) {
    super(controller, config);
    this._id = `uix-forge-button-${Math.random().toString(36).slice(2, 11)}`;
    this._applyConfig(config);
  }

  configUpdated(config: Record<string, any>): void {
    super.configUpdated(config);
    this._applyConfig(config);
  }

  private _applyConfig(config: Record<string, any>) {
    this.after = config.after || config.for || this.defaultTarget("");
    this.before = config.before || "";
    this.entity = config.entity || "";
    this.icon = config.icon || "";
    this.color = config.color || "";
    this.label = config.label || "";
    this.size = config.size || "";
    this.variant = config.variant || "";
    this.appearance = config.appearance || "";
    this.startIcon = config.start_icon || "";
    this.endIcon = config.end_icon || "";
    this.tapAction = config.tap_action || null;
    this.holdAction = config.hold_action || null;
    this.doubleTapAction = config.double_tap_action || null;
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
    if (this._wrapperElement) {
      this._wrapperElement.remove();
      this._wrapperElement = null;
    }
  }

  private async _attach(generation: number) {
    const selector = this.after || this.before;
    if (!selector) return;

    const elements = await this.controller.target(selector, this._cancel);
    const element = elements?.[0];
    if (!element) return;
    if (generation !== this._callGeneration) return;

    const parent = element.parentElement || element.parentNode;
    if (!parent) return;

    const existingWrapper = (parent as ParentNode).querySelector?.(
      `div[${WRAPPER_ID_ATTR}="${this._id}"]`
    ) as HTMLElement | null;

    if (this._wrapperElement && !existingWrapper) {
      this._wrapperElement.remove();
      this._wrapperElement = null;
    }

    let wrapperEl = existingWrapper;
    let buttonEl: any;

    if (!wrapperEl) {
      wrapperEl = document.createElement("div");
      wrapperEl.setAttribute(WRAPPER_ID_ATTR, this._id);
      wrapperEl.style.display = "contents";
      wrapperEl.style.pointerEvents = "auto";

      // Inject icon-button styles into this wrapper so they are scoped to its lifetime
      const styleEl = document.createElement("style");
      styleEl.textContent = HA_BUTTON_CSS;
      wrapperEl.appendChild(styleEl);

      // Stop pointer events from bubbling to the parent card's action handler
      const stopProp = (ev: Event) => ev.stopPropagation();
      wrapperEl.addEventListener("click", stopProp);
      wrapperEl.addEventListener("mousedown", stopProp);
      wrapperEl.addEventListener("touchstart", stopProp);

      const slot = element.getAttribute("slot");
      if (slot) {
        wrapperEl.setAttribute("slot", slot);
      }

      buttonEl = this._createButtonElement();
      wrapperEl.appendChild(buttonEl);

      if (this.before) {
        parent.insertBefore(wrapperEl, element);
      } else {
        // `after` or `for` — insert after the target element
        const nextSibling = element.nextSibling;
        if (nextSibling) {
          parent.insertBefore(wrapperEl, nextSibling);
        } else {
          parent.appendChild(wrapperEl);
        }
      }
    } else {
      buttonEl = wrapperEl.querySelector("ha-button") as any;
      if (!buttonEl) {
        buttonEl = this._createButtonElement();
        wrapperEl.appendChild(buttonEl);
      }
    }

    this._updateElement(buttonEl);
    this._wrapperElement = wrapperEl;
  }

  private _createButtonElement(): any {
    const buttonEl = createHaButton(this.buttonConfig(), (ev) => {
      this._handleAction(ev, buttonEl);
    });
    return buttonEl;
  }

  private _updateElement(buttonEl: HTMLElement) {
    updateHaButton(buttonEl, this.buttonConfig());
  }

  private buttonConfig() {
    return {
      entity: this.entity,
      icon: this.icon,
      color: this.color,
      label: this.label,
      size: this.size,
      variant: this.variant as any,
      appearance: this.appearance as any,
      start_icon: this.startIcon,
      end_icon: this.endIcon,
      tap_action: this.tapAction ?? undefined,
      hold_action: this.holdAction ?? undefined,
      double_tap_action: this.doubleTapAction ?? undefined,
    };
  }

  private _handleAction(ev: CustomEvent, buttonEl: HTMLElement) {
    dispatchHaButtonAction(buttonEl, this.buttonConfig(), ev);
  }
}
