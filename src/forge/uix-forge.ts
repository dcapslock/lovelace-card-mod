import { html, LitElement, nothing, PropertyValues } from "lit";
import { 
  getNestedTemplateRawDelimiters, 
  HuiBadge, 
  HuiCard, 
  HuiCardFeature, 
  LovelaceElement, 
  UIX_FORGE_ALLOWED_CONFIG_KEYS, 
  UIX_FORGE_DEFAULT_TEMPLATE_VALUE, 
  UIX_FORGE_FORGE_MOLDS, 
  UIX_FORGE_NESTED_TEMPLATE_CLOSE, 
  UIX_FORGE_NESTED_TEMPLATE_OPEN, 
  UIX_FORGE_PASSTHROUGH_MARKER, 
  UIX_FORGE_TYPE, UixForgeConfig, 
  UixForgeConfigBuilder, 
  UixForgeConfigPath, 
  UixMacroConfig, 
  UIX_FORGE_ARRAY_MERGE_STRATEGIES, 
  UIX_FORGE_MOLDS_WITH_BLANKS, 
  ignoreTemplate} from "./uix-forge-types";
import { property, state } from "lit/decorators.js";
import { getLovelaceRoot, hass, translate } from "../helpers/hass";
import { bind_template, hasTemplate, unbind_template } from "../helpers/templates";
import { apply_uix, buildMacros, buildBillets, UixConfig } from "../helpers/apply_uix";
import { UIX_FORGE_MOLD_CLASSES, UixForgeMold } from "./molds/uix-mold";
import { UixForgeSparkController } from "./sparks/uix-spark-controller";

declare global {
  interface HTMLElementTagNameMap {
    [UIX_FORGE_TYPE]: UixForge;
  }
}

function _mergeFoundryConfig(foundry: any, local: any, key?: string): any {
  if (foundry === undefined || foundry === null) return local ?? {};
  if (local === undefined || local === null) return foundry ?? {};

  if (Array.isArray(foundry) && Array.isArray(local)) {
    // Explicit local empty array clears inherited entries.
    if (local.length === 0) return [];

    const mergeKey = key && UIX_FORGE_ARRAY_MERGE_STRATEGIES[key];
    if (mergeKey) {
      const result: any[] = [...foundry];
      const strategy = typeof mergeKey === "string"
        ? { idKeys: [mergeKey], requireTypeMatch: false }
        : mergeKey;

      const getIds = (item: any, idKeys: string[]): Array<{ key: string; value: any }> => {
        if (!item || typeof item !== "object" || Array.isArray(item)) return [];
        return idKeys
          .filter((idKey) => idKey in item && item[idKey] !== undefined && item[idKey] !== null)
          .map((idKey) => ({ key: idKey, value: item[idKey] }));
      };

      for (const localItem of local) {
        const localIds = getIds(localItem, strategy.idKeys);
        if (localIds.length === 0) {
          result.push(localItem);
          continue;
        }

        const foundIndex = result.findIndex((foundryItem) => {
          if (!foundryItem || typeof foundryItem !== "object" || Array.isArray(foundryItem)) return false;
          if (strategy.requireTypeMatch && foundryItem.type !== localItem.type) return false;
          return localIds.some(({ key: idKey, value }) => foundryItem[idKey] === value);
        });

        if (foundIndex === -1) {
          result.push(localItem);
        } else {
          result[foundIndex] = _mergeFoundryConfig(result[foundIndex], localItem, key);
        }
      }

      return result;
    } else {
      return local;
    }
  }

  if (
    typeof foundry !== "object" ||
    typeof local !== "object" ||
    Array.isArray(foundry) ||
    Array.isArray(local)
  ) {
    return local;
  }

  const result = { ...foundry };
  for (const k of Object.keys(local)) {
    const lv = local[k];
    const fv = result[k];
    if (
      lv !== null &&
      typeof lv === "object" &&
      fv !== null &&
      typeof fv === "object"
    ) {
      result[k] = _mergeFoundryConfig(fv, lv, k);
    } else {
      result[k] = lv;
    }
  }
  return result;
}

export function _resolveFoundryConfig(
  config: { foundry?: string; forge?: any; element?: any },
  foundries?: Record<string, any>,
  ready = true,
  visited: Set<string> = new Set(),
  isTopLevel = true
): { forge: any; element: any } | null {
  const foundryName = config.foundry;

  if (isTopLevel && (!foundries || (Object.keys(foundries).length === 0 && !ready))) {
    return null;
  }

  let result: { forge: any; element: any } | null = null;

  if (foundryName) {
    // If the coordinator foundries haven't been loaded yet, return null to indicate "pending"
    if (!foundries || (Object.keys(foundries).length === 0 && !ready)) {
      return null;
    }
    const foundryData = foundries[foundryName];
    if (!foundryData) {
      throw new Error(`Foundry '${foundryName}' not found. Check that it is defined in the UIX integration.`);
    }
    if (visited.has(foundryName)) {
      throw new Error(`Circular foundry reference detected: '${foundryName}'.`);
    }
    const nextVisited = new Set(visited);
    nextVisited.add(foundryName);

    // Recursively resolve the foundry's own base (if it also references another foundry).
    const baseResolved = foundryData.foundry
      ? _resolveFoundryConfig({ foundry: foundryData.foundry }, foundries, ready, nextVisited, false)
      : { forge: {}, element: {} };
    if (baseResolved === null) return null;

    // foundryData overrides base, local config overrides foundry
    const foundryForge = _mergeFoundryConfig(baseResolved.forge, foundryData.forge);
    const foundryElement = _mergeFoundryConfig(baseResolved.element, foundryData.element);
    result = {
      forge: _mergeFoundryConfig(foundryForge, config.forge),
      element: _mergeFoundryConfig(foundryElement, config.element),
    };
  } else {
    result = {
      forge: config.forge ?? {},
      element: config.element ?? {},
    };
  }

  if (isTopLevel && foundries) {
    const moldType = result.forge?.mold;
    const globalFoundry = foundries["global"];
    const globalMoldFoundry = moldType ? foundries[`global_${moldType}`] : undefined;
    const currentVisited = foundryName ? new Set(visited).add(foundryName) : new Set(visited);

    let inheritedForge = {};
    let inheritedElement = {};

    if (globalFoundry && foundryName !== "global") {
      const globalResolved = _resolveFoundryConfig({ foundry: "global" }, foundries, ready, currentVisited, false);
      if (globalResolved === null) return null;
      inheritedForge = _mergeFoundryConfig(inheritedForge, globalResolved.forge);
      inheritedElement = _mergeFoundryConfig(inheritedElement, globalResolved.element);
    }

    if (globalMoldFoundry && foundryName !== `global_${moldType}`) {
      const globalMoldResolved = _resolveFoundryConfig({ foundry: `global_${moldType}` }, foundries, ready, currentVisited, false);
      if (globalMoldResolved === null) return null;
      inheritedForge = _mergeFoundryConfig(inheritedForge, globalMoldResolved.forge);
      inheritedElement = _mergeFoundryConfig(inheritedElement, globalMoldResolved.element);
    }

    result = {
      forge: _mergeFoundryConfig(inheritedForge, result.forge),
      element: _mergeFoundryConfig(inheritedElement, result.element),
    };
  }

  return result;
}

export class UixForge extends LitElement {
  @property({attribute: false}) hass: any;
  @property({attribute: false}) preview: boolean;
  @property({attribute: false}) layout: boolean;
  @property({attribute: false}) connectedWhileHidden: boolean;
  @property({attribute: false}) lovelace: any;
  // Properties passed through by hui-card-feature for card-feature mold
  @property({attribute: false}) context: any;
  @property({attribute: false}) color: any;
  @property({attribute: false}) position: any;
  @state() config: UixForgeConfig;
  @state() forgedElement: LovelaceElement;
  @state() templatesReady: boolean;
  private _mold: UixForgeMold;
  private _macros: UixMacroConfig;
  private _billets: Record<string, any>;
  private _templateNestingOpen: string;
  private _templateNestingClose: string;
  private _showError: boolean;
  private _forgeConfig: UixForgeConfigBuilder;
  private _forgedElementConfig: UixForgeConfigBuilder;
  private _sparkController: UixForgeSparkController;
  private _disconnectTimeout?: number;
  private _foundryUpdateListener?: EventListener;
  private _uixUpdateListener?: EventListener;
  private _resolvedUix?: any;
  private _delayedHass?: boolean;
  private _view: LovelaceElement;
  private _refreshForgeTemplatesInFlight = false;
  private _refreshForgeTemplatesPending = false;

  constructor() {
      super();
      this.connectedWhileHidden = true;
      this.templatesReady = false;
      this._showError = false;
      this._delayedHass = false;
      this._forgeConfig = new UixForgeConfigBuilder(this.refreshForge.bind(this));
      this._forgedElementConfig = new UixForgeConfigBuilder(this.refreshForgedElement.bind(this));
      this._sparkController = new UixForgeSparkController(this);
  }

  public static getStubConfig(): UixForgeConfig {
    return {
      type: `custom:${UIX_FORGE_TYPE}`,
    };
  }

  private hasTemplateOrNestedTemplate(value: any): boolean {
    if (hasTemplate(value)) return true;
    if (typeof value === "string" && this._templateNestingPairs().some(({ open }) => value.includes(open))) return true;
    return false;
  }

  /**
   * Builds the active nested-template delimiter pairs for this forge instance.
   * The configured `template_nesting` pair is always included, and when possible
   * an inferred statement pair (for example `<%`/`%>`) is added alongside it.
   */
  private _templateNestingPairs(): Array<{ open: string; close: string }> {
    const pairs: Array<{ open: string; close: string }> = [];
    const addPair = (open: string, close: string) => {
      if (!pairs.some((pair) => pair.open === open && pair.close === close)) {
        pairs.push({ open, close });
      }
    };
    addPair(this._templateNestingOpen, this._templateNestingClose);
    const openChar = this._templateNestingOpen.charAt(0);
    const closeChar = this._templateNestingClose.charAt(this._templateNestingClose.length - 1);
    if (this._templateNestingOpen.length > 1 && this._templateNestingClose.length > 1) {
      addPair(`${openChar}%`, `%${closeChar}`);
    }
    return pairs;
  }

  private _stripPassthroughNesting(value: string): string {
    let output = value;
    for (const { open, close } of this._templateNestingPairs()) {
      const passthroughOpen = open.charAt(0) + open;
      const passthroughClose = close + close.charAt(close.length - 1);
      output = output
        .split(passthroughOpen).join(open)
        .split(passthroughClose).join(close);
    }
    return output;
  }

  private _hasNonPassthroughTemplateOrNestedTemplate(value: string): boolean {
    let masked = value;
    for (const { open, close } of this._templateNestingPairs()) {
      const passthroughOpen = open.charAt(0) + open;
      const passthroughClose = close + close.charAt(close.length - 1);
      masked = masked
        .split(passthroughOpen).join("")
        .split(passthroughClose).join("");
    }
    return this.hasTemplateOrNestedTemplate(masked);
  }

  private _replaceNestedTemplateDelimiters(value: string): string {
    type PassthroughDelimiterMapping = {
      passthroughOpenMarker: string;
      passthroughCloseMarker: string;
      open: string;
      close: string;
    };
    let output = value;
    const passthroughDelimiters: PassthroughDelimiterMapping[] = [];
    for (let pairIndex = 0; pairIndex < this._templateNestingPairs().length; pairIndex++) {
      const { open, close } = this._templateNestingPairs()[pairIndex];
      const passthroughOpen = open.charAt(0) + open;
      const passthroughClose = close + close.charAt(close.length - 1);
      const passthroughOpenMarker = `##UIX_FORGE_NESTED_PASSTHROUGH_OPEN_${pairIndex}##`;
      const passthroughCloseMarker = `##UIX_FORGE_NESTED_PASSTHROUGH_CLOSE_${pairIndex}##`;
      passthroughDelimiters.push({ passthroughOpenMarker, passthroughCloseMarker, open, close });
      output = output
        .split(passthroughOpen).join(passthroughOpenMarker)
        .split(passthroughClose).join(passthroughCloseMarker);
    }
    for (const { open, close } of this._templateNestingPairs()) {
      const { openRaw, closeRaw } = getNestedTemplateRawDelimiters(open);
      output = output
        .split(open).join(openRaw)
        .split(close).join(closeRaw);
    }
    for (const { passthroughOpenMarker, passthroughCloseMarker, open, close } of passthroughDelimiters) {
      output = output
        .split(passthroughOpenMarker).join(open)
        .split(passthroughCloseMarker).join(close);
    }
    return output;
  }

  private _resolveFoundry(
    config: { foundry?: string; forge?: any; element?: any },
    visited: Set<string> = new Set()
  ): { forge: any; element: any } | null {
    const coordinator = (window as any).uixCoordinator;
    return _resolveFoundryConfig(config, coordinator?.foundries, coordinator?.ready, visited);
  }

  public setConfig(config: UixForgeConfig) {
    if (!config) throw new Error("No config");
    if (!config.foundry && !config.forge) {
      throw new Error("uix-forge: forge config or foundry is required");
    }
    if ((config as any).visibility) {
      throw new Error("uix-forge: 'visibility' config key is not supported, use 'forge.hidden' with a template instead");
    }
    Object.keys(config).forEach((k) => {
      if (!UIX_FORGE_ALLOWED_CONFIG_KEYS.includes(k)) {
        throw new Error(`uix-forge: unexpected config key ${k}`);
      }
    });

    this.templatesReady = false;
    this.config = config;

    const resolved = this._resolveFoundry(config);
    if (!resolved) {
      // Foundry not yet available – defer until foundries are loaded
      if (!this._foundryUpdateListener) {
        this._foundryUpdateListener = () => this._onFoundryUpdate();
        window.addEventListener("uix-foundries-updated", this._foundryUpdateListener);
      }
      return;
    }

    this._resolvedUix = resolved.forge?.uix;

    this._applyResolvedConfig(resolved.forge, resolved.element);
  }

  private _applyResolvedConfig(resolvedForge: any, resolvedElement: any) {
    if (!resolvedForge || Object.keys(resolvedForge).length === 0) {
      throw new Error("uix-forge: forge config is required (not provided locally or via foundry)");
    }
    // Only support card, badge, row, section, and picture-element molds at this time
    if (!resolvedForge.mold || !UIX_FORGE_FORGE_MOLDS.includes(resolvedForge.mold)) {
      throw new Error(`uix-forge: only forge molds of ${UIX_FORGE_FORGE_MOLDS.join(", ")} are supported at this time`);
    }
    if (( !resolvedElement || Object.keys(resolvedElement).length === 0) && !UIX_FORGE_MOLDS_WITH_BLANKS.includes(resolvedForge.mold)) {
      throw new Error("uix-forge: element config is required (not provided locally or via foundry)");
    }
    if (resolvedForge.macros && typeof resolvedForge.macros !== "object") {
      throw new Error("uix-forge: forge macros must be an object");
    }
    if (resolvedForge.billets && typeof resolvedForge.billets !== "object") {
      throw new Error("uix-forge: forge billets must be an object");
    }
    if (resolvedForge.billets) {
      // Validate billets eagerly and synchronously — throws from setConfig so HA shows the error card
      buildBillets(resolvedForge.billets, undefined, true);
    }
    if (resolvedForge.template_nesting && typeof resolvedForge.template_nesting !== "string") {
      throw new Error("uix-forge: forge template_nesting must be a string");
    }
    if (resolvedForge.template_nesting && resolvedForge.template_nesting.length !== 4) {
      throw new Error("uix-forge: forge template_nesting must be four characters");
    }
    this._mold = new UIX_FORGE_MOLD_CLASSES[resolvedForge.mold](this);
    this._macros = resolvedForge.macros;
    this._billets = resolvedForge.billets;
    this._showError = resolvedForge.show_error || false;
    this._delayedHass = resolvedForge.delayed_hass || false;

    this._templateNestingOpen = resolvedForge.template_nesting ? resolvedForge.template_nesting.slice(0, 2) : UIX_FORGE_NESTED_TEMPLATE_OPEN;
    this._templateNestingClose = resolvedForge.template_nesting ? resolvedForge.template_nesting.slice(2) : UIX_FORGE_NESTED_TEMPLATE_CLOSE;
    const nestedTemplateOpen = this._templateNestingPairs().map(({ open }) => open);
    this._forgeConfig.nestedTemplateOpen = nestedTemplateOpen;
    this._forgedElementConfig.nestedTemplateOpen = nestedTemplateOpen;
    const forgeConfig = { ...resolvedForge };
    delete forgeConfig.type;
    delete forgeConfig.mold;
    delete forgeConfig.macros;
    delete forgeConfig.billets;
    delete forgeConfig.show_error;
    delete forgeConfig.delayed_hass;
    delete forgeConfig.template_nesting;
    delete forgeConfig.uix;
    this.forgeConfig = forgeConfig;
    const elementConfig = { ...resolvedElement };
    if (elementConfig.state_color !== undefined && elementConfig.color === undefined) {
      elementConfig.color = elementConfig.state_color === true ? "state" : elementConfig.state_color === false ? "none" : undefined;
      delete elementConfig.state_color;
    }
    if ((this.config.color !== undefined || this.config.state_color !== undefined) && !elementConfig.color) {
      const configStateColorMigrated: string = this.config.state_color === true ? "state" : this.config.state_color === false ? "none" : undefined;
      elementConfig.color = this.config.color ?? configStateColorMigrated;
    }
    if (this.config?.entities !== undefined) {
      elementConfig.entities = [...this.config.entities, ...(elementConfig.entities ?? [])];
    }
    if (this._mold.isCard() && !elementConfig.type) {
      elementConfig.type = "custom:uix-forge-blank-card";
      if (this._mold.isCardBlankClear()) {
        elementConfig.clear = true;
      }
    }

    this.forgedElementConfig = elementConfig;
    this._refreshForgeTemplatesInFlight = true;
    this._refreshForgeTemplatesPending = false;
    const completeRefresh = () => {
      this._refreshForgeTemplatesInFlight = false;
      if (this._refreshForgeTemplatesPending) {
        this._refreshForgeTemplatesPending = false;
        void Promise.resolve()
          .then(() => this.refreshForgeTemplates())
          .catch((err) => console.error("UIX Forge: Error running deferred forge template refresh:", err));
      }
    };
    void Promise.all([
      this.bindTemplates(this._forgeConfig),
      this.bindTemplates(this._forgedElementConfig),
      this._forgeConfig.configIsReady(),
      this._forgedElementConfig.configIsReady()
    ]).then(() => {
      if (!this.forgedElement) {
        this.forgeElement();
      }
      this.templatesReady = true;
      this.refreshForge([]);
      this._sparkController.setConfig(this.forgeConfig.sparks);
    }, (err) => {
      console.error("UIX Forge: Error applying forge config:", err);
    }).then(completeRefresh);
  }

  private _mergeForgeMacros(uixConfig?: UixConfig): UixConfig | undefined {
    if (!this._macros || Object.keys(this._macros).length === 0) return uixConfig;
    if (!uixConfig) return uixConfig;
    return {
      ...uixConfig,
      macros: { ...this._macros, ...(uixConfig.macros ?? {}) },
    };
  }

  private _mergeForgeBillets(uixConfig?: UixConfig): UixConfig | undefined {
    if (!this._billets || Object.keys(this._billets).length === 0) return uixConfig;
    if (!uixConfig) return uixConfig;
    return {
      ...uixConfig,
      billets: { ...this._billets, ...(uixConfig.billets ?? {}) },
    };
  }

  private _mergeForgeUix(uixConfig?: UixConfig): UixConfig | undefined {
    return this._mergeForgeBillets(this._mergeForgeMacros(uixConfig));
  }

  get forgedElementConfig() {
    const config = this._forgedElementConfig.config;
    if (!config?.uix) return config;
    const mergedUix = this._mergeForgeUix(config.uix);
    if (mergedUix === config.uix) return config;
    return { ...config, uix: mergedUix };
  }

  set forgedElementConfig(config: any) {
    this._forgedElementConfig.config = config;
  }

  get forgeConfig() {
    return this._forgeConfig.config;
  }

  set forgeConfig(config: any) {
    this._forgeConfig.config = config;
  }

  get hidden() {
    if (!this._mold) return true;
    if (this._mold.isPreview()) return false;
    if (!this.templatesReady) return true;
    if (this.forgedElement?.hidden) return true;
    let error = false;
    error = this._mold.isError();
    if (error) return !this._showError;
    return this.hiddenByConfig() || this._mold.hidden();
  }

  get mold() {
    return this._mold;
  }

  public getGridOptions() {
    return this._mold ? this._mold.getGridOptions() : {};
  }

  public async computeCardSize() {
    // only called for cards
    if (!this.templatesReady) return 1;
    if (!this.forgedElement) return 1;
    return await this.forgedElement.getCardSize?.() || 1;
  }

  connectedCallback(): void {
    super.connectedCallback();
    this._mold?.connectedCallback();
    this._sparkController.connectedCallback();

    if (!this._uixUpdateListener) {
      this._uixUpdateListener = (ev: Event) => this._onUixUpdate(ev);
      document.addEventListener("uix-update", this._uixUpdateListener);
    }

    // Listen for foundry updates from the coordinator
    if (this.config?.foundry && !this._foundryUpdateListener) {
      this._foundryUpdateListener = () => this._onFoundryUpdate();
      window.addEventListener("uix-foundries-updated", this._foundryUpdateListener);
    }

    if (this._disconnectTimeout) {
      clearTimeout(this._disconnectTimeout);
      this._disconnectTimeout = undefined;
      return;
    }
    if (this.forgedElement && !this.templatesReady) {
      const resolved = this._resolveFoundry({ ...this.config });
      if (!resolved) return;
      this._resolvedUix = resolved.forge?.uix;
      const forgeConfig = { ...resolved.forge };
      delete forgeConfig.type;
      delete forgeConfig.mold;
      delete forgeConfig.macros;
      delete forgeConfig.billets;
      delete forgeConfig.show_error;
      delete forgeConfig.delayed_hass;
      delete forgeConfig.template_nesting;
      delete forgeConfig.uix;
      const elementConfig = { ...resolved.element };
      if (elementConfig.state_color !== undefined && elementConfig.color === undefined) {
        elementConfig.color = elementConfig.state_color === true ? "state" : elementConfig.state_color === false ? "none" : undefined;
        delete elementConfig.state_color;
      }
      if ((this.config.color !== undefined || this.config.state_color !== undefined) && !elementConfig.color) {
        const configStateColorMigrated: string = this.config.state_color === true ? "state" : this.config.state_color === false ? "none" : undefined;
        elementConfig.color = this.config.color ?? configStateColorMigrated;
      }
      if (this.config?.entities !== undefined) {
        elementConfig.entities = [...this.config.entities, ...(elementConfig.entities ?? [])];
      }
      if (this._mold.isCard() && !elementConfig.type) {
        elementConfig.type = "custom:uix-forge-blank-card";
        if (this._mold.isCardBlankClear()) {
          elementConfig.clear = true;
        }
      }
      this.forgeConfig = forgeConfig;
      this.forgedElementConfig = { ...elementConfig };
      Promise.all([
        this.bindTemplates(this._forgeConfig),
        this.bindTemplates(this._forgedElementConfig),
        this._forgeConfig.configIsReady(),
        this._forgedElementConfig.configIsReady()
      ]).then(() => {
        this.templatesReady = true;
        this.refreshForge([]);
        this._sparkController.setConfig(this.forgeConfig.sparks);
      });
    }
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this._mold?.disconnectedCallback();
    this._sparkController.disconnectedCallback();

    if (this._uixUpdateListener) {
      document.removeEventListener("uix-update", this._uixUpdateListener);
      this._uixUpdateListener = undefined;
    }

    if (this._foundryUpdateListener) {
      window.removeEventListener("uix-foundries-updated", this._foundryUpdateListener);
      this._foundryUpdateListener = undefined;
    }

    // Delay unbinding to allow for quick reconnects without rebinding
    this._disconnectTimeout = window.setTimeout(() => {
      super.disconnectedCallback();
      this._forgeConfig.bindings().forEach((binding) => {
      unbind_template(binding.callback);
      });
      this._forgeConfig.bindings().clear();
      this._forgedElementConfig.bindings().forEach((binding) => {
      unbind_template(binding.callback);
      });
      this._forgedElementConfig.bindings().clear();
      this.templatesReady = false;
      this._disconnectTimeout = undefined;
    }, 1000); // 1000ms timeout, adjust as needed
  }

  private _onFoundryUpdate() {
    if (!this.config) return;
    // If the forge was waiting for foundry to load initially, complete setup now
    if (!this._mold) {
      const resolved = this._resolveFoundry({ ...this.config });
      if (!resolved) return;
      this._resolvedUix = resolved.forge?.uix;
      try {
        this._applyResolvedConfig(resolved.forge, resolved.element);
      } catch (err) {
        console.error("UIX Forge: Error applying foundry config:", err);
      }
      return;
    }
    // Otherwise refresh templates with updated foundry data
    this.refreshForgeTemplates();
  }

  private _onUixUpdate(ev: Event) {
    if (!(ev as CustomEvent).detail?.variablesChanged) return;
    if (!this.config) return;
    this.refreshForgeTemplates();
  }

  private async bindTemplates(base: any, current: any = undefined, path: string[] = []) {
    const hs = await hass();
    if (current === undefined) {
      current = base.config;
    }
    for (const k of Object.keys(current)) {
      if (current[k] === undefined) continue;
      if (current[k] === null) continue;
      if (k === "uix") continue;
      const currentPath = [...path, k];
      if (typeof current[k] === "object" || Array.isArray(current[k])) {
        await this.bindTemplates(base, current[k], currentPath);
      } else if (
        typeof current[k] === "string" &&
        this._stripPassthroughNesting(current[k]) !== current[k] &&
        !this._hasNonPassthroughTemplateOrNestedTemplate(current[k])
      ) {
        // Passthrough template: strip one nesting level and pass through to the inner forge
        const passthrough = this._stripPassthroughNesting(current[k]);
        base.nested = { keys: currentPath, value: UIX_FORGE_PASSTHROUGH_MARKER + passthrough };
      } else if (this.hasTemplateOrNestedTemplate(current[k])) {
        // If already bound, unbind first
        const bindingPath = currentPath.join("|");
        if (base.hasBinding(bindingPath)) {
          const binding = base.getBinding(bindingPath);
          base.deleteBinding(bindingPath);
          if (binding) {
            unbind_template(binding.callback);
          }
        }
        if (ignoreTemplate(current[k])) {
          base.nested = { keys: currentPath, value: current[k] };
          continue;
        }
        const template = this._replaceNestedTemplateDelimiters(current[k]);
        const macroStr = buildMacros(this._macros, template);
        const billetStr = buildBillets(this._billets, macroStr + template);
        const callback = (res: any) => {
          if (typeof res === "string") {
            res = translate(hs, res);
          }
          base.nested = { keys: currentPath, value: res };
          if (this.templatesReady) {
            base.refreshCallback?.(currentPath);
          }
        };
        bind_template(
          callback,
          `${macroStr}${billetStr}${template}`,
          { config: this.config, uixForge: this._sparkController.templateVariables(), ...this._mold.templateVariables() },
          UIX_FORGE_DEFAULT_TEMPLATE_VALUE
        );
        base.setBinding(bindingPath, callback);
      } else if (typeof current[k] === "string") {
        base.nested = { keys: currentPath, value: translate(hs, current[k]) };
      }
    }
  }

  refreshForgeTemplates() {
    if (this._refreshForgeTemplatesInFlight) {
      this._refreshForgeTemplatesPending = true;
      return;
    }
    this._refreshForgeTemplatesInFlight = true;
    this._refreshForgeTemplatesPending = false;
    this.templatesReady = false;
    const resolved = this._resolveFoundry({ ...this.config });
    if (!resolved) {
      this._refreshForgeTemplatesInFlight = false;
      return;
    }
    this._resolvedUix = resolved.forge?.uix;
    const forgeConfig = { ...resolved.forge };
    this._macros = forgeConfig.macros;
    this._billets = forgeConfig.billets;
    this._templateNestingOpen = forgeConfig.template_nesting ? forgeConfig.template_nesting.slice(0, 2) : UIX_FORGE_NESTED_TEMPLATE_OPEN;
    this._templateNestingClose = forgeConfig.template_nesting ? forgeConfig.template_nesting.slice(2) : UIX_FORGE_NESTED_TEMPLATE_CLOSE;
    const nestedTemplateOpen = this._templateNestingPairs().map(({ open }) => open);
    this._forgeConfig.nestedTemplateOpen = nestedTemplateOpen;
    this._forgedElementConfig.nestedTemplateOpen = nestedTemplateOpen;
    delete forgeConfig.type;
    delete forgeConfig.mold;
    delete forgeConfig.macros;
    delete forgeConfig.billets;
    delete forgeConfig.show_error;
    delete forgeConfig.delayed_hass;
    delete forgeConfig.template_nesting;
    delete forgeConfig.uix;
    this.forgeConfig = forgeConfig;
    const elementConfig = { ...resolved.element };
    if (elementConfig.state_color !== undefined && elementConfig.color === undefined) {
      elementConfig.color = elementConfig.state_color === true ? "state" : elementConfig.state_color === false ? "none" : undefined;
      delete elementConfig.state_color;
    }
    if ((this.config.color !== undefined || this.config.state_color !== undefined) && !elementConfig.color) {
      const configStateColorMigrated: string = this.config.state_color === true ? "state" : this.config.state_color === false ? "none" : undefined;
      elementConfig.color = this.config.color ?? configStateColorMigrated;
    }
    if (this.config?.entities !== undefined) {
      elementConfig.entities = [...this.config.entities, ...(elementConfig.entities ?? [])];
    }
    if (this._mold.isCard() && !elementConfig.type) {
      elementConfig.type = "custom:uix-forge-blank-card";
      if (this._mold.isCardBlankClear()) {
        elementConfig.clear = true;
      }
    }
    this.forgedElementConfig = elementConfig;
    const completeRefresh = () => {
      this._refreshForgeTemplatesInFlight = false;
      if (this._refreshForgeTemplatesPending) {
        this._refreshForgeTemplatesPending = false;
        void Promise.resolve()
          .then(() => this.refreshForgeTemplates())
          .catch((err) => console.error("UIX Forge: Error running deferred forge template refresh:", err));
      }
    };
    void Promise.all([
      this.bindTemplates(this._forgeConfig),
      this.bindTemplates(this._forgedElementConfig),
      this._forgeConfig.configIsReady(),
      this._forgedElementConfig.configIsReady()
    ]).then(() => {
      this.templatesReady = true;
      this.refreshForge([]);
    }, (err) => {
      console.error("UIX Forge: Error refreshing forge templates:", err);
    }).then(completeRefresh);
  }

  refreshForge(path: UixForgeConfigPath) {
    if (path.includes("sparks")) {
      this._sparkController.setConfig(this.forgeConfig.sparks);
    } else {
      this._mold.refresh(path);
      this._sparkController.setConfig(this.forgeConfig.sparks);
    }
    apply_uix(
      (this as any),
      this._mold.type.split("_").join("-"),
      this._mergeForgeUix(this._resolvedUix),
      { config: 
        { 
          entity: this.config?.entity,
          forge: this.forgeConfig, 
          element: this.forgedElementConfig 
        }, 
        uixForge: this._sparkController.templateVariables(),
        ...this._mold.templateVariables() 
      },
      true,
      "type-custom-uix-forge"
    );
  }

  refreshForgedElement(path?: UixForgeConfigPath) {
    if (!this.forgedElement) return;
    if (!this.templatesReady) return;
    this._sparkController.beforeForgedElementRefresh();
    if (this._mold.isCard()) {
      this.forgedElement.config = this.forgedElementConfig;
      this._delayedHass && (this.forgedElement.hass = undefined);
      (this.forgedElement as HuiCard).load();
      this._delayedHass && (this.forgedElement.hass = this.hass);
      this.refreshForge(["hidden"]);
      this.refreshForge(["grid_options"]);
    }
    if (this._mold.isBadge()) {
      this.forgedElement.config = this.forgedElementConfig;
      !this._delayedHass && (this.forgedElement.hass = this.hass);
      (this.forgedElement as HuiBadge).load();
      this._delayedHass && (this.forgedElement.hass = this.hass);
      this.refreshForge(["hidden"]);
    }
    if (this._mold.isRow()) {
      this._mold.cardHelpers().then((helpers) => {
        const newElement = helpers.createRowElement(this.forgedElementConfig);
        newElement.hass = this.hass;
        newElement.preview = this._mold.isPreview();
        this.forgedElement.replaceWith(newElement);
        this.forgedElement = newElement;
        this.refreshForge(["hidden"]);
      });

    }
    if (this._mold.isSection()) {
      this.forgedElement.config = this.forgedElementConfig;
      this.refreshForge(["hidden"]);
    }
    if (this._mold.isPictureElement()) {
      const config = {
        type: "conditional",
        conditions: [
          {
            condition: "screen",
            media_query: `(max-width: ${this.hidden ? 0 : 99999}px)`
          }
        ],
        elements: [
          {
            ...this.forgedElementConfig,
          }
        ]
      };
      this._mold.cardHelpers().then((helpers) => {
        this.forgedElement = helpers.createHuiElement(config);
        this.forgedElement.hass = this.hass;
        this.forgedElement.preview = this._mold.isPreview();
        this.style.setProperty("position", "static");
        this.style.setProperty("transform", "none");
        void this._mold.callAuxiliaryFunction("setupNearestRoutedTypeDelegation");
      });
    }
    if (this._mold.isFooter()) {
      (this.forgedElement.config as any) = { card: this.forgedElementConfig, max_width: this.forgeConfig.max_width ?? "600" };
      this.forgedElement.hass = this.hass;
      this.refreshForge(["hidden"]);
    }
    if (this._mold.isCardFeature()) {
      const cardFeature = this.forgedElement as HuiCardFeature;
      cardFeature._element = undefined;
      cardFeature.feature = this.forgedElementConfig;
      cardFeature.hass = this.hass;
      cardFeature.color = this.color;
      cardFeature.position = this.position;
      cardFeature.context = this.context;
      this.refreshForge(["hidden"]);
    }
  }

  private forgeElement() {
    if (this.forgedElement) return;
    if (!this.templatesReady) return;
    if (this._mold.isCard()) {
      this.forgedElement = document.createElement("hui-card") as LovelaceElement;
      this.forgedElement.config = this.forgedElementConfig;
      !this._delayedHass && (this.forgedElement.hass = this.hass);
      this.forgedElement.preview = this._mold.isPreview();
      this.forgedElement.layout = this.layout;
      (this.forgedElement as HuiCard).load();
      this._delayedHass && (this.forgedElement.hass = this.hass);
      return;
    }
    if (this._mold.isBadge()) {
      this.forgedElement = document.createElement("hui-badge") as LovelaceElement;
      this.forgedElement.config = this.forgedElementConfig;
      !this._delayedHass && (this.forgedElement.hass = this.hass);
      this.forgedElement.preview = this._mold.isPreview();
      (this.forgedElement as HuiBadge).load();
      this._delayedHass && (this.forgedElement.hass = this.hass);
      return;
    }
    if (this._mold.isRow()) {
      this._mold.cardHelpers().then((helpers) => {
        this.forgedElement = helpers.createRowElement(this.forgedElementConfig);
        this.forgedElement.hass = this.hass;
        this.forgedElement.preview = this._mold.isPreview();  
      });

      return;
    }
    if (this._mold.isSection()) {
      (this.parentElement as any)._updateVisibility = () => {}
      getLovelaceRoot(document).then((root) => {
        if (!root) {
          return;
        }
        const view = root._viewRoot?.querySelector("hui-view");
        if (view && view._sections) {
          this.forgedElement = view.createSectionElement?.(this.forgedElementConfig);
        }
        this.refreshForge(["hidden"]);
      });
      return;
    }
    if (this._mold.isPictureElement()) {
      const config = {
        type: "conditional",
        conditions: [
          {
            condition: "screen",
            media_query: `(max-width: ${this.hidden ? 0 : 99999}px)`
          }
        ],
        elements: [
          {
            ...this.forgedElementConfig,
          }
        ]
      };
      this._mold.cardHelpers().then((helpers) => {
        this.forgedElement = helpers.createHuiElement(config);
        this.forgedElement.hass = this.hass;
        this.forgedElement.preview = this._mold.isPreview();
        this.style.setProperty("position", "static");
        this.style.setProperty("transform", "none");
        this._mold.callAuxiliaryFunction("setupNearestRoutedTypeDelegation");
      });
      return;
    }
    if (this._mold.isFooter()) {
      // Create a dummy hui-view to load sections view which loads hui-view-footer, 
      // which is needed to forge the footer element even if not used in a view with a footer. 
      // The dummy view is hidden and not added to the DOM if hui-view-footer is already defined, 
      // otherwise it is added to the DOM until hui-view-footer is defined and then removed.
      if (!window.customElements.get("hui-view-footer") && !this._view) {
        this._view = document.createElement("hui-view") as LovelaceElement;
        (this._view as any).index = 0;
        this._view.lovelace = { config: { views: [{ type: "sections", sections: [] }] } };
        this._view.hass = this.hass;
        this._view.style.setProperty("display", "none");
        document.body.appendChild(this._view);
      }
      window.customElements.whenDefined("hui-view-footer").then(() => {
        this.forgedElement = document.createElement("hui-view-footer") as LovelaceElement;
        (this.forgedElement.config as any) = { card: this.forgedElementConfig, max_width: this.forgeConfig.max_width ?? "600" };
        this.forgedElement.hass = this.hass;
        this.forgedElement.lovelace = { editMode: false };
        document.body.contains(this._view) && document.body.removeChild(this._view);
        this._view = undefined;
        this.refreshForge(["hidden"]);
      });
      return;
    }
    if (this._mold.isCardFeature()) {
      this.forgedElement = document.createElement("hui-card-feature") as LovelaceElement;
      (this.forgedElement as HuiCardFeature).feature = this.forgedElementConfig;
      (this.forgedElement as HuiCardFeature).hass = this.hass;
      (this.forgedElement as HuiCardFeature).color = this.color;
      (this.forgedElement as HuiCardFeature).position = this.position;
      (this.forgedElement as HuiCardFeature).context = this.context;
      this.refreshForge(["hidden"]);
      return;
    }
  }

  private hiddenByConfig() {
    if (this.forgeConfig.hidden !== undefined) {
      if (typeof this.forgeConfig.hidden === "boolean") {
        return this.forgeConfig.hidden;
      } else if (this.forgeConfig.hidden === "") {
        return true;
      }
    }
    return false;
  }

  protected shouldUpdate(_changedProperties: PropertyValues): boolean {
    if (!this.config) return false;
    return true;
  }

  protected willUpdate(_changedProperties: PropertyValues): void {
    if (!this.forgedElement && this.templatesReady) {
      this.forgeElement();
    }
  }

  protected updated(_changedProperties: PropertyValues): void {
    if (_changedProperties.has("hass")) {
      this.forgedElement && (this.forgedElement.hass = this.hass);
    }
    if (_changedProperties.has("preview")) {
      this.forgedElement && (this.forgedElement.preview = this.preview);
      if (!this.preview || this._mold?.isPictureElement()) {
        this.refreshForge(["hidden"]);
      }
      if (this.preview && this._mold?.isFooter()) {
        this.refreshForge(["hidden"]);
      }
      if (this.preview && this._mold?.isSection()) {
        this.refreshForge(["hidden"]);
      }
    }
    if (_changedProperties.has("lovelace") && this._mold?.isSection()) {
      if (this.forgedElement) {
        // Force lovelace of forged section to be in non-editable mode
        // A section in non-editable mode does not need anything else in lovelace
        const lovelace = { editMode: false };
        this.forgedElement.lovelace = lovelace;
        this.forgedElement.updateComplete?.then(() => {
          if (this.lovelace?.editMode) {
            this.forgedElement._layoutElement?.style.setProperty("border", "2px dashed #CE3226");
            this.forgedElement._layoutElement?.style.setProperty("border-radius", "var(--ha-card-border-radius, var(--ha-border-radius-lg))");
            this.forgedElement._layoutElement?.style.setProperty("padding", "2px");
          } else {
            this.forgedElement._layoutElement?.style.removeProperty("border");
            this.forgedElement._layoutElement?.style.removeProperty("border-radius");
            this.forgedElement._layoutElement?.style.removeProperty("padding");
          }
        });
      }
    }
    if (_changedProperties.has("layout")) {
      this.forgedElement && (this.forgedElement.layout = this.layout);
    }
    if (_changedProperties.has("templatesReady")) {
      this.refreshForgedElement([]);
    }
    if (this._mold?.isCardFeature()) {
      if (
        _changedProperties.has("context") ||
        _changedProperties.has("color") ||
        _changedProperties.has("position")
      ) {
        this.refreshForgeTemplates();
      }
      if (this._mold?.isPreview()) {
        this.refreshForgedElement(["hidden"]);
      }
    }
    this._sparkController.updated(_changedProperties);
  }

  protected render() {
    return this.forgedElement ? 
      html`
      ${this.forgedElement}
      ${this._mold.hasStyle() ? html`<style>${this._mold.style()}</style>` : nothing}
      ` 
      : nothing;
  }
}

window.addEventListener("uix-bootstrap", async (ev: Event) => {
  ev.stopPropagation();
  if (!customElements.get(UIX_FORGE_TYPE)) {
    customElements.define(UIX_FORGE_TYPE, UixForge);
    (window as any).customCards = (window as any).customCards || [];
    (window as any).customCards.push({
      type: "uix-forge",
      name: "UIX Forge",
      preview: true,
      description: "UIX Forge allows you to forge templates into Home Assistant lovelace element configurations. Add Sparks to to get even more customisation",
    });
    (window as any).customBadges = (window as any).customBadges || [];
    (window as any).customBadges.push({
      type: "uix-forge",
      name: "UIX Forge",
      preview: true,
      description: "UIX Forge allows you to forge templates into Home Assistant lovelace element configurations. Add Sparks to to get even more customisation",
    });
  }
  while (customElements.get("home-assistant") === undefined)
    await new Promise((resolve) => window.setTimeout(resolve, 100));

  if (!customElements.get("uix-forge")) {
    customElements.define("uix-forge", UixForge);
  }
});
