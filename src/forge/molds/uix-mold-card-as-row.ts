import { HuiCard, UixForgeConfigPath } from "../uix-forge-types";
import { UixForgeMoldBase } from "./uix-mold-base";

export class UixForgeMoldCardAsRow extends UixForgeMoldBase {
  type = "card_as_row";
  _hidden = false;

  isCard(): boolean {
    return true;
  }

  isError(): boolean {
    return (this.forge.forgedElement as HuiCard)?._element?.tagName?.toLowerCase() === "hui-error-card";
  }

  hidden(): boolean {
    return this._hidden;
  }

  handleCardVisibilityChanged = (event: Event) => {
    const customEvent = event as CustomEvent;
    // card-visibility-changed: value=true means the card IS visible, 
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
    this.forge.addEventListener("card-visibility-changed", this.handleCardVisibilityChanged);
  }

  disconnectedCallback(): void {
    this.forge.removeEventListener("card-visibility-changed", this.handleCardVisibilityChanged);
  }

  refresh(path: UixForgeConfigPath): void {
    if (path.length === 1 && path[0] === "hidden") {
      this.updateRowVisibility();
    } else if (path.length >= 1 && path[0] === "grid_options") {
      // Not applicable for row context - ignore
    } else {
      this.forge.refreshForgedElement(path);
    }
  }
}
