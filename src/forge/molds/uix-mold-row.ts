import { UixForgeConfigPath } from "../uix-forge-types";
import { UixForgeMoldBase } from "./uix-mold-base";

export class UixForgeMoldRow extends UixForgeMoldBase {
  type = "row";
  _hidden = false;

  hidden(): boolean {
    return this._hidden;
  }

  handleRowVisibilityChanged = (event: Event) => {
    const customEvent = event as CustomEvent;
    if (customEvent.detail.row !== this.forge.forgedElement) return;
    customEvent.stopPropagation();
    this.updateRowVisibility(customEvent);
  }

  updateRowVisibility(event: CustomEvent = undefined as any) {
    if (event) {
      this._hidden = !event.detail?.value;
    }
    this.forge.dispatchEvent(new CustomEvent("row-visibility-changed", { detail: { row: this.forge, value: !this.forge.hidden }, bubbles: true, composed: true }));
    // entities card sets hidden which will be true until templates are bound, so we need to ensure the row is shown after templates are bound
    const parent = this.forge.parentElement;
    if (!parent) return;
    if (!this.forge.hidden && parent.getAttribute("hidden") !== null) {
      parent.removeAttribute("hidden");
    } else if (this.forge.hidden && parent.getAttribute("hidden") === null) {
      parent.setAttribute("hidden", "");
    }
  }

  connectedCallback(): void {
    this.forge.addEventListener("row-visibility-changed", this.handleRowVisibilityChanged);
  }

  disconnectedCallback(): void {
    this.forge.removeEventListener("row-visibility-changed", this.handleRowVisibilityChanged);
  }

  refresh(path: UixForgeConfigPath): void {
    if (path.length == 0 || (path.length === 1 && path[0] === "hidden")) {
      this.updateRowVisibility();
    } else {
      this.forge.refreshForgedElement(path);
    }
  }
}