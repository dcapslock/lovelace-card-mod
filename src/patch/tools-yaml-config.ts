import { patch_element } from "../helpers/patch_function";
import { ModdedElement } from "../helpers/apply_uix";

const UIX_RELOAD_BTN_ID = "uix-reload-foundries-btn";
const UIX_BROKER_RELOAD_BTN_ID = "uix-reload-broker-btn";
const UIX_FOUNDRIES_RELOAD_ACTIONS_ID = "uix-reload-foundries-actions";
const UIX_BROKER_RELOAD_ACTIONS_ID = "uix-reload-broker-actions";

const ERROR_LABELS: Record<string, string> = {
  file_not_found: "The file was not found. Check the path and try again.",
  file_parse_error:
    "The file could not be parsed as YAML. Check the file for syntax errors. See Home Assistant log for YAML parser error details.",
  file_invalid_structure: "The file must be a YAML mapping.",
  file_missing_key: "The file must have a top-level 'uix_foundries' key.",
  file_invalid_foundries:
    "The 'uix_foundries' key must be a YAML mapping of foundry names to configurations.",
  broker_file_not_found: "The Broker file was not found. Check the path and try again.",
  broker_file_parse_error:
    "The Broker file could not be parsed as YAML. Check the file for syntax errors. See Home Assistant log for YAML parser error details.",
  broker_file_invalid_structure: "The Broker file must be a YAML mapping.",
  broker_file_missing_key: "The Broker file must have a top-level 'uix_broker' key.",
  broker_file_invalid_config:
    "The 'uix_broker' key must be a YAML list of Broker interactions.",
};

@patch_element("tools-yaml-config")
class ToolsYamlConfigPatch extends ModdedElement {
  declare hass: any;

  updated(_orig, changedProperties) {
    _orig?.(changedProperties);
    this._uixEnsureReloadBtn();
  }

  _uixEnsureReloadBtn(): void {
    if (!this.shadowRoot) return;

    // NOTE: ha-card order is tied to tools-yaml-config's internal DOM
    // structure. If HA changes this, the injection won't happen.
    const cards = this.shadowRoot.querySelectorAll("ha-card");
    if (cards.length < 2) return;

    const secondCard = cards[1];
    const ensureActionsDiv = (id: string) => {
      let actionsDiv = secondCard.querySelector(`#${id}`) as HTMLElement | null;
      if (!actionsDiv) {
        actionsDiv = document.createElement("div");
        actionsDiv.id = id;
        actionsDiv.className = "card-actions";
        secondCard.appendChild(actionsDiv);
      }
      return actionsDiv;
    };
    const foundriesActions = ensureActionsDiv(UIX_FOUNDRIES_RELOAD_ACTIONS_ID);
    const brokerActions = ensureActionsDiv(UIX_BROKER_RELOAD_ACTIONS_ID);

    // Reload buttons appended to the second card (the "Reloading" card),
    // matching the existing ha-call-service-button card-actions pattern.
    const addReloadButton = (
      actionsDiv: HTMLElement,
      id: string,
      label: string,
      reloadType: string,
      checkType: string,
      errorTitle: string,
    ) => {
      if (this.shadowRoot!.querySelector(`#${id}`)) return;

      const btn = document.createElement("ha-progress-button") as any;
      btn.id = id;
      btn.appearance = "plain";
      btn.textContent = label;
      btn.addEventListener("click", async () => {
        btn.progress = true;
        try {
          await this.hass.connection.sendMessagePromise({
            type: reloadType,
          });

          const checkResult: any =
            await this.hass.connection.sendMessagePromise({
              type: checkType,
            });

          const errors: Array<{ file_path: string; error_key: string }> =
            checkResult?.errors ?? [];

          btn.progress = false;

          if (errors.length > 0) {
            btn.actionError();
            const message = errors
              .map(
                (e) =>
                  `${e.file_path}: ${ERROR_LABELS[e.error_key] ?? e.error_key}`
              )
              .join("\n");
            btn.dispatchEvent(
              new CustomEvent("hass-notification", {
                bubbles: true,
                composed: true,
                detail: { message: `${errorTitle}:\n${message}`, duration: 10000 },
              })
            );
          } else {
            btn.actionSuccess();
          }
        } catch {
          btn.progress = false;
          btn.actionError();
        }
      });

      actionsDiv.appendChild(btn);
    };

    addReloadButton(
      foundriesActions,
      UIX_RELOAD_BTN_ID,
      "UIX Foundries",
      "uix/reload_foundry_files",
      "uix/check_foundry_files",
      "UIX foundry errors",
    );
    addReloadButton(
      brokerActions,
      UIX_BROKER_RELOAD_BTN_ID,
      "UIX Broker",
      "uix/reload_broker_files",
      "uix/check_broker_files",
      "UIX Broker errors",
    );
  }
}
