/** Shared UIX tooltip styling for Home Assistant's wa-tooltip component. */
export const UIX_TOOLTIP_CONTENT_ATTR = "data-uix-tooltip-content";
export const UIX_TOOLTIP_STYLE_ATTR = "data-uix-tooltip-style";

export const UIX_TOOLTIP_CSS = `
  wa-tooltip {
    --wa-tooltip-background-color: var(--uix-tooltip-background-color, var(--ha-tooltip-background-color, var(--ha-color-surface-default)));
    --wa-tooltip-content-color: var(--uix-tooltip-content-color, var(--primary-text-color));
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
