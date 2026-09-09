import { HuiBadge, UixForgeConfigPath } from "../uix-forge-types";
import { UixForgeMoldBase } from "./uix-mold-base";

export class UixForgeMoldBadgeAsRow extends UixForgeMoldBase {
  type = "badge_as_row";
  _hidden = false;

  isBadge(): boolean {
    return true;
  }

  isError(): boolean {
    return (this.forge.forgedElement as HuiBadge)?._element?.tagName?.toLowerCase() === "hui-error-badge";
  }

  hidden(): boolean {
    return this._hidden;
  }

  handleBadgeVisibilityChanged = (event: Event) => {
    const customEvent = event as CustomEvent;
    // badge-visibility-changed: value=true means the badge IS visible, 
    // so we want to set hidden to the opposite of that
    this._hidden = !(customEvent.detail?.value ?? true);
    customEvent.stopPropagation();
    this.updateRowVisibility();
  }

  updateRowVisibility() {
    this.forge.dispatchEvent(new CustomEvent("row-visibility-changed", {
      detail: { row: this.forge, value: !this.forge.hidden },
      bubbles: true,
      composed: true,
    }));
    const parent = this.forge.parentElement;
    if (!parent) return;
    if (!this.forge.hidden && parent.getAttribute("hidden") !== null) {
      parent.removeAttribute("hidden");
    } else if (this.forge.hidden && parent.getAttribute("hidden") === null) {
      parent.setAttribute("hidden", "");
    }
  }

  connectedCallback(): void {
    this.forge.addEventListener("badge-visibility-changed", this.handleBadgeVisibilityChanged);
  }

  disconnectedCallback(): void {
    this.forge.removeEventListener("badge-visibility-changed", this.handleBadgeVisibilityChanged);
  }

  refresh(path: UixForgeConfigPath): void {
    if (path.length === 1 && path[0] === "hidden") {
      this.updateRowVisibility();
    } else {
      this.forge.refreshForgedElement(path);
    }
  }
}
