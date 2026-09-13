/** Shared UIX tooltip styling for Home Assistant's wa-tooltip component. */
export const UIX_TOOLTIP_CONTENT_ATTR = "data-uix-tooltip-content";
export const UIX_TOOLTIP_STYLE_ATTR = "data-uix-tooltip-style";
export const UIX_TOOLTIP_DEFAULT_TRIGGER = "hover focus";

const UIX_TOOLTIP_TRIGGERS = new Set(["click", "focus", "hover", "manual"]);

export type UixTooltipElement = HTMLElement & {
  distance: number;
  for: string | null;
  hideDelay: number;
  open: boolean;
  placement: string;
  showDelay: number;
  skidding: number;
  trigger: string;
  hide(): Promise<unknown> | undefined;
  show(): Promise<unknown> | undefined;
};

export const UIX_TOOLTIP_CSS = `
  wa-tooltip {
    --wa-tooltip-background-color: var(--uix-tooltip-background-color, var(--ha-tooltip-background-color, var(--ha-color-surface-default)));
    --wa-tooltip-content-color: var(--uix-tooltip-content-color, var(--ha-tooltip-text-color, var(--primary-text-color)));
    --wa-tooltip-font-family: var(
      --uix-tooltip-font-family,
      var(--ha-tooltip-font-family, var(--ha-font-family-body))
    );
    --wa-tooltip-font-size: var(--uix-tooltip-font-size, var(--ha-tooltip-font-size, var(--ha-font-size-m)));
    --wa-tooltip-font-weight: var(
      --uix-tooltip-font-weight,
      var(--ha-tooltip-font-weight, var(--ha-font-weight-medium))
    );
    --wa-tooltip-line-height: var(
      --uix-tooltip-line-height,
      var(--ha-tooltip-line-height, var(--ha-line-height-condensed))
    );
    --wa-tooltip-padding: var(--uix-tooltip-padding, var(--ha-tooltip-padding, var(--ha-space-2)));
    --wa-tooltip-border-radius: var(
      --uix-tooltip-border-radius,
      var(--ha-tooltip-border-radius, var(--ha-border-radius-md))
    );
    --wa-tooltip-arrow-size: var(--uix-tooltip-arrow-size, var(--ha-tooltip-arrow-size, 8px));
    --wa-tooltip-border-width: var(--uix-tooltip-border-width, 0px);
    --wa-tooltip-border-color: var(--uix-tooltip-border-color);
    --wa-tooltip-border-style: var(--uix-tooltip-border-style);
    --max-width: var(--uix-tooltip-max-width, 30ch);
  }
  wa-tooltip::part(base__popup) {
    --show-duration: var(--uix-tooltip-show-duration, 100ms);
    --hide-duration: var(--uix-tooltip-hide-duration, 100ms);
    opacity: var(--uix-tooltip-opacity, 1);
  }
  wa-tooltip::part(body) {
    padding: var(--uix-tooltip-padding, 0.25em 0.5em);
    box-shadow: var(--uix-tooltip-box-shadow, var(--ha-tooltip-box-shadow, var(--ha-box-shadow-m)));
    font-weight: var(--uix-tooltip-font-weight, var(--ha-tooltip-font-weight, medium));
    font-family: var(--uix-tooltip-font-family, var(--ha-tooltip-font-family, inherit));
    text-align: var(--uix-tooltip-text-align, center);
    text-decoration: var(--uix-tooltip-text-decoration, none);
    text-transform: var(--uix-tooltip-text-transform, none);
    overflow-wrap: var(--uix-tooltip-overflow-wrap, normal);
    max-height: var(--uix-tooltip-max-height, none);
    height: max-content;
    overflow: var(--uix-tooltip-overflow, visible);
  }`;

/**
 * Keep a tooltip's completed close event from reaching an enclosing drawer.
 * Older Home Assistant drawers treat nested Web Awesome `wa-after-hide`
 * events as their own close event.
 */
export function stopTooltipHidePropagation(tooltip: HTMLElement) {
  tooltip.addEventListener("wa-after-hide", (event) => {
    if (event.target === tooltip) event.stopPropagation();
  });
}

/** Normalize and validate Web Awesome's space-separated tooltip triggers. */
export function normalizeTooltipTrigger(value: unknown, name = "tooltip trigger"): string {
  if (typeof value !== "string") {
    throw new Error(`${name} must be a string`);
  }
  const triggers = value.trim().split(/\s+/).filter(Boolean);
  if (!triggers.length || triggers.some((trigger) => !UIX_TOOLTIP_TRIGGERS.has(trigger))) {
    throw new Error(`${name} must contain only click, focus, hover, or manual`);
  }
  return triggers.join(" ");
}

/**
 * Backport Web Awesome 3.9's reliable hover-boundary handling.
 *
 * Home Assistant's current Web Awesome version tests `:hover` during mouseout,
 * which can briefly be false when entering slotted tooltip content. Remove only
 * the native hover trigger and drive it through the public show/hide methods;
 * click and focus remain under Web Awesome's control.
 */
export function configureTooltipActivation(
  tooltip: UixTooltipElement,
  target: Element,
  trigger: string,
): () => void {
  const triggers = trigger.split(" ");
  const managesHover = triggers.includes("hover");
  const nativeTriggers = triggers.filter((value) => value !== "hover");
  tooltip.trigger = managesHover ? nativeTriggers.join(" ") || "manual" : trigger;
  if (!managesHover) return () => undefined;

  const controller = new AbortController();
  let showTimeout: number | undefined;
  let hideTimeout: number | undefined;

  const clearShowTimeout = () => {
    if (showTimeout === undefined) return;
    clearTimeout(showTimeout);
    showTimeout = undefined;
  };
  const clearHideTimeout = () => {
    if (hideTimeout === undefined) return;
    clearTimeout(hideTimeout);
    hideTimeout = undefined;
  };
  const isWithinTooltip = (value: EventTarget | null) =>
    value instanceof Node && (target.contains(value) || tooltip.contains(value));
  const handleMouseOver = (event: MouseEvent) => {
    clearHideTimeout();
    if (isWithinTooltip(event.relatedTarget) || tooltip.open) return;
    clearShowTimeout();
    showTimeout = window.setTimeout(() => {
      showTimeout = undefined;
      void tooltip.show();
    }, tooltip.showDelay);
  };
  const handleMouseOut = (event: MouseEvent) => {
    if (isWithinTooltip(event.relatedTarget)) return;
    clearShowTimeout();
    clearHideTimeout();
    hideTimeout = window.setTimeout(() => {
      hideTimeout = undefined;
      void tooltip.hide();
    }, tooltip.hideDelay);
  };
  const options = { signal: controller.signal };
  target.addEventListener("mouseover", handleMouseOver as EventListener, options);
  target.addEventListener("mouseout", handleMouseOut as EventListener, options);
  tooltip.addEventListener("mouseover", handleMouseOver, options);
  tooltip.addEventListener("mouseout", handleMouseOut, options);

  return () => {
    controller.abort();
    clearShowTimeout();
    clearHideTimeout();
  };
}
