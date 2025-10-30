import { apply_card_mod, ModdedElement } from "../helpers/apply_card_mod";
import {
  is_patched,
  patch_element,
  patch_prototype,
  set_patched,
} from "../helpers/patch_function";

class HaDialogPatch extends ModdedElement {
  async showDialog(_orig, params, ...rest) {
    await _orig?.(params, ...rest);

    this.requestUpdate();
    this.updateComplete.then(async () => {
      let haDialog: HTMLElement | null =
        this.shadowRoot.querySelector("ha-dialog");
      if (!haDialog) {
        haDialog = this.shadowRoot.querySelector("ha-md-dialog");
      }
      if (!haDialog) {
        haDialog = this.shadowRoot.querySelector("ha-wa-dialog");
      }
      if (!haDialog) {
        // Notification 'dialog' is ha-drawer
        haDialog = this.shadowRoot.querySelector("ha-drawer");
      }
      if (!haDialog) return;

      const cls = `type-${this.localName.replace?.("ha-", "")}`;
      apply_card_mod(
        haDialog as ModdedElement,
        "dialog",
        undefined,
        {
          params: params,
        },
        false,
        cls
      );
    });
  }
}

function patchDialog(ev: Event) {
  const dialogTag = (ev as CustomEvent).detail?.dialogTag;

  if (dialogTag && !is_patched(dialogTag)) {
    set_patched(dialogTag);
    patch_prototype(dialogTag, HaDialogPatch);
  }
}

window.addEventListener("show-dialog", patchDialog, { capture: true });
