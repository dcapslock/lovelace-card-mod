import { hass, provideHass } from "../helpers/hass";

export const ConnectionMixin = (SuperClass) => {
  class UixConnection extends SuperClass {
    public hass;
    public connection;
    public ready = false;

    private _data;
    private _connected = false;
    private _connectionResolve;
    private _foundries: Record<string, any> = {};
    private _broker: Record<string, any>[] = [];
    private _hassThrottleOverride: { enable?: boolean; ms?: number } | null = null;
    private _dialogApplyAfterShowOverride: boolean | null = null;
    private _disableHashTemplateVariableOverride: boolean | null = null;
    private _disableIconStylingOverride: boolean | null = null;
    private _disableEntityPictureImageOverrideOverride: boolean | null = null;
    private _alwaysPatchHaCardOverride: boolean | null = null;
    private _styleCustomPanelsOverride: boolean | null = null;

    public connectionPromise = new Promise((resolve) => {
      this._connectionResolve = resolve;
    });

    LOG(...args) {
      if ((window as any).uix_log === undefined) return;
      const dt = new Date();
      console.log(`${dt.toLocaleTimeString()}`, ...args);

      if (this._connected) {
        try {
          this.connection.sendMessage({
            type: "uix/log",
            message: args[0],
          });
        } catch (err) {
         console.log("UIX: Error sending log:", err);
        }
      }
    }

    // Fire window event
    private fireWindowEvent(event, detail = undefined) {
      window.dispatchEvent(new CustomEvent(event, { detail }));
    }

    // Propagate internal browser event
    private fireBrowserEvent(event, detail = undefined) {
      this.dispatchEvent(new CustomEvent(event, { detail, bubbles: true }));
    }

    /*
     * Main state flags explained:
     * * `connected` and `disconnected` refers to WS connection,
     * * `ready` refers to established communication between browser and component counterpart.
     */

    // Component and frontend are mutually ready
    private onReady = () => {
      this.ready = true;
      this.LOG("Integration ready: UIX loaded and update received");
      this.fireBrowserEvent("uix-ready");
      this.userReady()
        .then(() => {
          this.onUserReady();
        })
        .catch((err) => {
          console.log(`UIX: ${err}. User Frontend settings have not been applied`);
        });
    }

    // WebSocket has connected
    private onConnected = () => {
      this._connected = true;
      this.LOG("WebSocket connected");
    }

    // WebSocket has disconnected
    private onDisconnected = () => {
      this.ready = false;
      this._connected = false;
      this.LOG("WebSocket disconnected");
      this.fireBrowserEvent("uix-disconnected");
    }

    private async userReady() {
      if (this.user) {
        return true;
      } else {
        let cnt = 0;
        while (!this.user&& cnt++ < 20) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        if (this.user) return true;
        throw new Error("User data not available after 10 seconds");
      }
    }

    private onUserReady = () => {
      this.LOG("Hass user data ready");
      this.fireBrowserEvent("uix-user-ready");
    }

    // Handle incoming message
    private incoming_message(msg) {
      // Set that have a connection. Allows logging
      if (!this._connected) {
        this.onConnected();
      }
      // Handle messages
      if (msg.command) {
        this.LOG("Command:", msg);
        this.fireBrowserEvent(`uix-command-${msg.command}`, msg);
      } else if (msg.result) {
        this.update_config(msg.result);
      }
      // Resolve first connection promise
      this._connectionResolve?.();
      this._connectionResolve = undefined;
    }

    private update_config(cfg) {
      // Future update handling can be added here, for now just update config and fire event
      this._data = cfg;
      this.LOG("Receive:", cfg);

      let update = false;

      // Check for readiness (of component and browser)
      if (!this.ready) {
        this.onReady();
      }

      // Handle foundries data pushed from the backend via the uix/connect subscription.
      // This works for all users (admin and non-admin) without requiring a separate event subscription.
      if (cfg.foundries !== undefined) {
        this._foundries = cfg.foundries;
        this.LOG("Foundries updated:", this._foundries);
        this.fireWindowEvent("uix-foundries-updated", { foundries: this._foundries });
      }

      if (cfg.uix_broker !== undefined) {
        this._broker = Array.isArray(cfg.uix_broker) ? cfg.uix_broker : [];
        this.fireWindowEvent("uix-broker-updated", { uix_broker: this._broker });
      }

      this.fireBrowserEvent("uix-config-update");

      // future update handling can be added here
      // if (update) this.sendUpdate({});
    }

    public async fetchFoundries() {
      if (!this.connection) return;
      try {
        const result = await this.connection.sendMessagePromise({
          type: "uix/get_foundries",
        });
        this._foundries = (result as any)?.foundries ?? {};
        this.LOG("Foundries retrieved:", this._foundries);
        this.fireWindowEvent("uix-foundries-updated", { foundries: this._foundries });
      } catch (err) {
        console.log("UIX: Error fetching foundries:", err);
      }
    }

    private async reloadBrokerFiles() {
      if (!this.connection) return;
      try {
        await this.connection.sendMessagePromise({ type: "uix/reload_broker_files" });
      } catch (err) {
        console.log("UIX: Error reloading Broker files:", err);
      }
    }

    async connect() {
      const conn = (await hass()).connection;
      this.connection = conn;

      const connectUixComponent = () => {
        this.LOG("Subscribing to uix/connect events");
        conn.subscribeMessage((msg) => this.incoming_message(msg), {
          type: "uix/connect",
          browserID: this.browserID,
        }).catch((err) => {
          console.error("UIX: Error connecting");
        });
      };

      // Initial connect component subscription
      connectUixComponent();
      // Observe `component_loaded` to track when `uix` is added after Home Assistant startup, such as during a restart or update. 
      // This ensures the connection is re-established and the component receives updates.
      conn.subscribeEvents((haEvent) => {
        if (haEvent.data?.component === "uix") {
          this.LOG("Detected uix component load");
          connectUixComponent();
        }
      }, "component_loaded");

      // Keep connection status up to date
      conn.addEventListener("ready", () => {
        this.onConnected();
      });
      conn.addEventListener("disconnected", () => {
        this.onDisconnected();
      });
      window.addEventListener("connection-status", (ev: Event) => {
        if ((ev as CustomEvent).detail === "connected") {
          this.onConnected();
        }
        if ((ev as CustomEvent).detail === "disconnected") {
          this.onDisconnected();
        }
      });

      window.addEventListener("config-refresh", () => {
        this.fetchFoundries();
        this.reloadBrokerFiles();
      });

      provideHass(this);
    }

    get config() {
      return this._data?.config ?? {};
    }

    get user() {
      return this.hass?.user;
    }

    get version() {
      return this._data?.version;
    }

    get foundries(): Record<string, any> {
      return this._foundries;
    }

    get broker(): Record<string, any>[] {
      return this._broker;
    }

    get hassThrottleEnable(): boolean {
      if (this._hassThrottleOverride?.enable !== undefined) {
        return this._hassThrottleOverride.enable;
      }
      return this._data?.hass_throttle_enable ?? false;
    }

    get hassThrottleMs(): number {
      if (this._hassThrottleOverride?.ms !== undefined) {
        return this._hassThrottleOverride.ms;
      }
      return this._data?.hass_throttle_ms ?? 200;
    }

    get dialogApplyAfterShow(): boolean {
      if (this._dialogApplyAfterShowOverride !== null) {
        return this._dialogApplyAfterShowOverride;
      }
      return this._data?.dialog_apply_after_show ?? false;
    }

    get disableHashTemplateVariable(): boolean {
      if (this._disableHashTemplateVariableOverride !== null) {
        return this._disableHashTemplateVariableOverride;
      }
      return this._data?.disable_hash_template_variable ?? false;
    }

    get disableIconStyling(): boolean {
      if (this._disableIconStylingOverride !== null) {
        return this._disableIconStylingOverride;
      }
      return this._data?.disable_icon_styling ?? false;
    }

    get disableEntityPictureImageOverride(): boolean {
      if (this._disableEntityPictureImageOverrideOverride !== null) {
        return this._disableEntityPictureImageOverrideOverride;
      }
      return this._data?.disable_entity_picture_image_override ?? false;
    }

    get alwaysPatchHaCard(): boolean {
      if (this._alwaysPatchHaCardOverride !== null) {
        return this._alwaysPatchHaCardOverride;
      }
      return this._data?.always_patch_ha_card ?? false;
    }

    get styleCustomPanels(): boolean {
      if (this._styleCustomPanelsOverride !== null) {
        return this._styleCustomPanelsOverride;
      }
      return this._data?.style_custom_panels ?? false;
    }

    /**
     * Set a client-side override for the hass throttle settings.
     *
     * This is intended for use by external integrations such as Browser Mod
     * that want to apply per-user or per-device throttle settings without
     * requiring a backend configuration change.  The override takes precedence
     * over the server-side config pushed by the UIX integration.
     *
     * Call with `null` (or no argument) to clear the override and revert to
     * the server-configured values.
     *
     * @example
     * // Enable throttle with a 500 ms interval for this browser session:
     * window.uixCoordinator.setThrottleOverride({ enable: true, ms: 500 });
     *
     * // Override only the interval (inherits the server enable/disable flag):
     * window.uixCoordinator.setThrottleOverride({ ms: 1000 });
     *
     * // Remove the override and revert to server defaults:
     * window.uixCoordinator.setThrottleOverride(null);
     */
    public setThrottleOverride(override: { enable?: boolean; ms?: number } | null = null): void {
      this._hassThrottleOverride = override;
    }

    /**
     * Set a client-side override for the dialog apply-after-show setting.
     *
     * This is intended for use by external integrations such as Browser Mod
     * that want to apply per-browser, per-user, or per-device settings without
     * requiring a backend configuration change.  The override takes precedence
     * over the server-side config pushed by the UIX integration.
     *
     * Call with `null` (or no argument) to clear the override and revert to
     * the server-configured value.
     *
     * @example
     * // Enable delay for this browser session:
     * window.uixCoordinator.setDialogApplyAfterShowOverride(true);
     *
     * // Disable delay for this browser session:
     * window.uixCoordinator.setDialogApplyAfterShowOverride(false);
     *
     * // Remove the override and revert to server defaults:
     * window.uixCoordinator.setDialogApplyAfterShowOverride(null);
     */
    public setDialogApplyAfterShowOverride(value: boolean | null = null): void {
      this._dialogApplyAfterShowOverride = value;
    }

    /**
     * Set a client-side override for hash template variable updates.
     *
     * This allows integrations to disable hash-based template updates for the
     * current browser session without changing backend settings.
     *
     * Call with `null` (or no argument) to clear the override and revert to
     * the server-configured value.
     */
    public setDisableHashTemplateVariableOverride(value: boolean | null = null): void {
      this._disableHashTemplateVariableOverride = value;
    }

    /**
     * Set a client-side override for disabling icon styling.
     *
     * This allows integrations to disable icon styling for the current
     * browser session without changing backend settings.
     *
     * Call with `null` (or no argument) to clear the override and revert to
     * the server-configured value.
     */
    public setDisableIconStylingOverride(value: boolean | null = null): void {
      this._disableIconStylingOverride = value;
    }

    /**
     * Set a client-side override for disabling entity picture image overrides.
     *
     * This allows integrations to disable entity picture image overrides for the
     * current browser session without changing backend settings.
     *
     * Call with `null` (or no argument) to clear the override and revert to
     * the server-configured value.
     */
    public setDisableEntityPictureImageOverrideOverride(value: boolean | null = null): void {
      this._disableEntityPictureImageOverrideOverride = value;
    }

    /** 
     * Set a client-side override for always patching ha-card.
     *
     * This allows integrations to always patch ha-card for the current
     * browser session without changing backend settings.
     *
     * Call with `null` (or no argument) to clear the override and revert to
     * the server-configured value.
     * 
     * A page refresh will be required to cover all ha-card instances on the page, 
     * as this setting is only checked when a ha-card is first patched or updated
     */
    public setAlwaysPatchHaCardOverride(value: boolean | null = null): void {
      this._alwaysPatchHaCardOverride = value;
    }

    /**
     * Set a client-side override for styling custom panels.
     *
     * This allows integrations to style custom panels for the current
     * browser session without changing backend settings.
     *
     * Call with `null` (or no argument) to clear the override and revert to
     * the server-configured value.
     * 
     * A page refresh will be required to cover any currently loaded custom panel, 
     * as this setting is only checked when a custom panel is first patched or updated
     */
    public setStyleCustomPanelsOverride(value: boolean | null = null): void {
      this._styleCustomPanelsOverride = value;
    }
  }

  return UixConnection;
};
