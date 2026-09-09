import pjson from "../../package.json";
import { compareVersions } from "compare-versions";
import { hass_base_el, hass, isEmbeddedPanel } from "../helpers/hass";
import { selectTree } from "../helpers/selecttree";
import { Actions } from "../ll-custom-actions";

export const VersionMixin = (SuperClass) => {
  return class VersionMixinClass extends SuperClass {
    _browserVersion: string;
    _versionNotificationPending: boolean = false;
    _reloadIntervalId?: any;

    constructor() {
      super();
      this._browserVersion = pjson.version;
      this.addEventListener("uix-ready", async () => {
        await this._checkVersion();
      });
      this.addEventListener("uix-disconnected", () => {
        this._versionNotificationPending = false;
        if (this._reloadIntervalId !== undefined) {
          clearInterval(this._reloadIntervalId);
          this._reloadIntervalId = undefined;
        }
      });
    }

    async _checkVersion() {
      if (isEmbeddedPanel()) return;
      if (this.version && this.version !== this._browserVersion) {
        if (!this._versionNotificationPending) {
          this._versionNotificationPending = true;
          const cmp = compareVersions(this.version, this._browserVersion);
          if (cmp < 0) {
            // Server version < Browser version: UIX was updated via HACS but HA has not been restarted yet.
            await this._restartNotification();
          } else {
            // Browser version < Server version: browser is running an older JS bundle.
            await this._reloadNotification(this.version, this._browserVersion);
          }
        }
      }
    }

    async _waitForNoToast() {
      let haToast;
      do {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        haToast = await selectTree(
          document.body,
          "home-assistant $ notification-manager $ ha-toast",
          false,
          1000
        );
      } while (haToast);
    }

    async _restartNotification() {
      await this._waitForNoToast();
      const hassInstance = await hass();
      // Only show to admins — non-admins cannot restart HA
      if (!hassInstance?.user?.is_admin) return;

      const message =
        "Restart of Home Assistant is required to finish download/update of UIX";
      const action = {
        text: "Restart",
        action: async () => {
          const base = await hass_base_el();
          const helpers = await (window as any).loadCardHelpers?.();
          if (helpers?.showConfirmationDialog) {
            const confirmed = await helpers.showConfirmationDialog(base, {
              title: hassInstance.localize("ui.dialogs.restart.restart.confirm_title"),
              text: hassInstance.localize("ui.dialogs.restart.restart.confirm_description"),
              confirmText: hassInstance.localize("ui.dialogs.restart.restart.confirm_action"),
              destructive: true,
            });
            if (!confirmed) return;
          }
          // Fallback if dialog helpers are unavailable: restart directly since
          // the user already clicked "Restart" explicitly.
          const h = await hass();
          h.callService("homeassistant", "restart");
        },
      };

      const base = await hass_base_el();
      base.dispatchEvent(
        new CustomEvent("hass-notification", {
          detail: {
            message,
            action,
            duration: -1,
            dismissable: true,
          },
        })
      );
    }

    async _reloadNotification(serverVersion, clientVersion) {
      await this._waitForNoToast();
      if (this._reloadIntervalId !== undefined) {
        clearInterval(this._reloadIntervalId);
        this._reloadIntervalId = undefined;
      }
      let seconds = 60;
      const base = await hass_base_el();

      const activateReload = () => {
        if (this._reloadIntervalId !== undefined) {
          clearInterval(this._reloadIntervalId);
          this._reloadIntervalId = undefined;
        }
        Actions.clear_cache();
      };

      const dismiss = () => {
        if (this._reloadIntervalId !== undefined) {
          clearInterval(this._reloadIntervalId);
          this._reloadIntervalId = undefined;
        }
      };

      const messageBase = `💡 UIX has been updated to ${serverVersion} 💡 Browser is running ${clientVersion}. Reloading in... `;
      const showToast = () => {
        // First message is shown without seconds so we can either style :after if available to avoid flashing 
        // or create a new toast message every second if not available at which stage we add the seconds remaining
        const message = `${messageBase}${seconds === 60 ? "" : seconds + "s"}`;
        const action = {
          text: "Reload Now",
          action: activateReload,
          primary: true,
        };
        const secondaryAction = {
          text: "Cancel",
          action: dismiss,
        };
        base.dispatchEvent(
          new CustomEvent("hass-notification", {
            detail: {
              id: "uix-reload",
              message,
              action,
              secondaryAction,
              duration: -1,
              dismiss,
            },
          })
        );
      };

      showToast();

      let reloadTickRunning = false;
      this._reloadIntervalId = window.setInterval(async () => {
        if (reloadTickRunning) return;
        reloadTickRunning = true;
        try {
          const first = seconds === 60;
          seconds--;
          if (seconds <= 0) {
            activateReload();
          } else {
            // On first refresh If we found toast message update directly then we style :after to add the seconds remaining to avoid flashing. 
            // If we don't find the toast message on first refresh then we create a new one with the seconds remaining.
            // We can only set an :after style on first refresh as after that the toast message will show XXs so would be a double up.
            const toastMessage = await selectTree(base, "$ notification-manager $ ha-toast[data-notification-key='identified-uix-reload'] $", false, 950);
            if (toastMessage) {
              let style = toastMessage.querySelector("style[data-uix-style]");
              if (!style && first) {
                style = document.createElement("style");
                style.setAttribute("data-uix-style", "");
                toastMessage.prepend(style);
              }
              if (style) {
                style.textContent = `
                  span.message::after {
                    content: "${seconds}s";
                  }
                `;
              } else {
                showToast();
              }
            } else {
              showToast();
            }
          }
        } finally {
          reloadTickRunning = false;
        }
      }, 1000);
    }
  };
};

