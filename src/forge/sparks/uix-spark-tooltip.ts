import { PropertyValues } from "lit";
import {
  configureTooltipActivation,
  normalizeTooltipTrigger,
  stopTooltipHidePropagation,
  UIX_TOOLTIP_DEFAULT_TRIGGER,
  UIX_TOOLTIP_CONTENT_ATTR,
  UIX_TOOLTIP_CSS,
  UIX_TOOLTIP_STYLE_ATTR,
  UixTooltipElement,
} from "../../helpers/dom/ha-tooltip";
import { UixForgeSparkBase } from "./uix-spark-base";

export class UixForgeSparkTooltip extends UixForgeSparkBase {
  type = "tooltip";

  private for: string = "";
  private content: string = "";
  private placement: string = "top";
  private skidding: number = 0;
  private distance: number = 8;
  private withoutArrow: boolean = false;
  private showDelay: number = 150;
  private hideDelay: number = 150;
  private trigger: string = UIX_TOOLTIP_DEFAULT_TRIGGER;
  private open: boolean | undefined;
  private _tooltipElement: Element | null = null;
  private _cleanupActivation?: () => void;
  private _openWasConfigured = false;
  private _appliedOpen: boolean | undefined;

  constructor(controller: any, config: Record<string, any>) {
    super(controller, config);
    this._applyConfig(config);
  }

  configUpdated(config: Record<string, any>): void {
    super.configUpdated(config);
    this._applyConfig(config);
  }

  private _applyConfig(config: Record<string, any>) {
    this.for = config.for || this.defaultTarget();
    this.content = config.content || "";
    this.placement = config.placement || "top";
    this.skidding = config.skidding ?? 0;
    this.distance = config.distance ?? 8;
    this.showDelay = config.show_delay ?? 150;
    this.hideDelay = config.hide_delay ?? 150;
    this.withoutArrow = config.without_arrow ?? false;
    this.trigger = normalizeTooltipTrigger(
      config.trigger ?? UIX_TOOLTIP_DEFAULT_TRIGGER,
      "tooltip spark trigger",
    );
    if (config.open !== undefined && typeof config.open !== "boolean") {
      throw new Error("tooltip spark open must be a boolean");
    }
    this.open = config.open;
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
    this._cleanupActivation?.();
    this._cleanupActivation = undefined;
    if (this._tooltipElement) {
      this._tooltipElement.remove();
      this._tooltipElement = null;
    }
    this._openWasConfigured = false;
    this._appliedOpen = undefined;
  }

  private async _attach(generation: number) {
    const elements = await this.controller.target(this.for, this._cancel);
    const element = elements?.[0];
    if (!element) return;
    if (generation !== this._callGeneration) return;

    const parent = element.parentElement || element.parentNode;
    if (!parent) return;
    if (!element.id) {
      element.id = `for-uix-forge-tooltip-${Math.random().toString(36).substring(2, 11)}`;
    }

    // If our tracked tooltip is no longer in this parent, remove it and start fresh
    const existingInParent = ((parent as Element).querySelector?.("wa-tooltip") as any)?.for == element.id;
    if (this._tooltipElement && !existingInParent) {
      this._remove();
    }

    const isNew = !this._tooltipElement;
    let tooltip = this._tooltipElement as UixTooltipElement | null;
    if (!tooltip) {
      tooltip = document.createElement("wa-tooltip") as UixTooltipElement;
      tooltip.for = element.id;
      tooltip.style.setProperty("display", "contents");
      stopTooltipHidePropagation(tooltip);
      if (element.getAttribute("slot")) {
        tooltip.setAttribute("slot", element.getAttribute("slot")!);
      }
      element.style.setProperty("pointer-events", "auto");
    }

    // Update content in-place
    let content = Array.from(tooltip.children as HTMLCollectionOf<Element>).find((child) =>
      child.hasAttribute(UIX_TOOLTIP_CONTENT_ATTR)
    ) as HTMLDivElement | undefined;
    if (!content) {
      content = document.createElement("div");
      content.setAttribute(UIX_TOOLTIP_CONTENT_ATTR, "");
      tooltip.appendChild(content);
    }
    content.innerHTML = this.content;

    // Update styles in-place
    let style = Array.from(tooltip.children as HTMLCollectionOf<Element>).find((child) =>
      child instanceof HTMLStyleElement && child.hasAttribute(UIX_TOOLTIP_STYLE_ATTR)
    ) as HTMLStyleElement | undefined;
    if (!style) {
      style = document.createElement("style");
      style.setAttribute(UIX_TOOLTIP_STYLE_ATTR, "");
      tooltip.appendChild(style);
    }
    style.textContent = UIX_TOOLTIP_CSS;

    // Update properties in-place
    tooltip.placement = this.placement;
    tooltip.skidding = this.skidding;
    tooltip.distance = this.distance;
    tooltip.showDelay = this.showDelay;
    tooltip.hideDelay = this.hideDelay;
    if (this.withoutArrow) {
      tooltip.setAttribute("without-arrow", "");
    } else {
      tooltip.removeAttribute("without-arrow");
    }
    this._cleanupActivation?.();
    this._cleanupActivation = configureTooltipActivation(tooltip, element, this.trigger);

    const openConfigured = this.open !== undefined;
    if (
      (openConfigured && (!this._openWasConfigured || this._appliedOpen !== this.open)) ||
      (!openConfigured && this._openWasConfigured)
    ) {
      tooltip.open = this.open ?? false;
    }
    this._openWasConfigured = openConfigured;
    this._appliedOpen = this.open;

    // Only insert into the DOM when newly created
    if (isNew) {
      parent.appendChild(tooltip);
    }

    this._tooltipElement = tooltip;
  }
}
