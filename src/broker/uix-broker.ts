import { tinykeys } from "tinykeys";
import { BrowserID } from "../helpers/browser_id";
import { hass, provideHass } from "../helpers/hass";
import { getPanelState } from "../helpers/panel";
import { render_template } from "../helpers/templates";
import { matchesHostElementPath, selectTree } from "../helpers/selecttree";
import { apply_uix, ModdedElement, UixConfig } from "../helpers/apply_uix";
import {
  createHaButton,
  dispatchHaButtonAction,
  HA_BUTTON_CSS,
  UixButtonConfig,
  updateHaButton,
} from "../helpers/dom/ha-button";
import {
  dispatchHaTileIconAction,
  UixTileIconConfig,
  updateHaTileIcon,
} from "../helpers/dom/ha-tile-icon";
import {
  stopTooltipHidePropagation,
  UIX_TOOLTIP_CONTENT_ATTR,
  UIX_TOOLTIP_CSS,
  UIX_TOOLTIP_STYLE_ATTR,
} from "../helpers/dom/ha-tooltip";
import {
  UixBrokerAnchor,
  UixBrokerConfig,
  UixBrokerDirective,
  UixBrokerHostElementRule,
  UixBrokerInteraction,
  UixBrokerPanelRule,
  UixBrokerRule,
  UixBrokerTypedRule,
} from "./uix-broker-types";

type BrokerContext = {
  source: Event | Record<string, any>;
  captured: Record<string, any>;
  results: Record<string, any>;
  /** The latest element created by a UI directive in this interaction. */
  previousDirectiveElement?: Element;
  panel?: Record<string, any>;
  realm: "browser" | "shortcut" | "server";
};

export type UixBrokerAnchorHistoryEntry = {
  anchor: Element;
  realm: "browser" | "shortcut" | "server";
  listen: string;
  anchorConfig: UixBrokerAnchor;
  resolvedAt: number;
};

const UNSAFE_PROPERTY_KEYS = new Set(["__proto__", "constructor", "prototype"]);
const BROKER_SELECT_TREE_TIMEOUT_MS = 2_000;
const BROKER_SELECT_TREE_RETRY_MS = 50;
const BROKER_BUTTON_WRAPPER_ATTR = "data-uix-broker-button";
const BROKER_TILE_ICON_ATTR = "data-uix-broker-tile-icon";
const BROKER_TOOLTIP_ATTR = "data-uix-broker-tooltip";

type BrokerButtonElement = HTMLElement & {
  uixBrokerButtonConfig?: UixButtonConfig;
  uixBrokerStyleProperties?: string[];
};

type BrokerTileIconElement = HTMLElement & {
  uixBrokerTileIconConfig?: UixTileIconConfig;
  uixBrokerStyleProperties?: string[];
};

type BrokerTooltipElement = HTMLElement & {
  uixBrokerStyleProperties?: string[];
};

type BrokerTooltip = {
  element: BrokerTooltipElement;
  target: Element;
};

type BrokerTooltipTarget = {
  references: number;
  generatedId?: string;
  pointerEventsValue: string;
  pointerEventsPriority: string;
};

type TemplateCacheEntry = {
  result?: string;
  renderedAt?: number;
  request?: Promise<string>;
};

function isElement(value: unknown): value is Element {
  return value instanceof Element;
}

function asInteractions(config: UixBrokerConfig | UixBrokerInteraction[]): UixBrokerInteraction[] {
  const interactions = Array.isArray(config) ? config : config?.uix_broker;
  return Array.isArray(interactions) ? interactions : [];
}

function isEnabled(interaction: UixBrokerInteraction): boolean {
  return interaction.enabled !== false;
}

function browserEventNames(interaction: UixBrokerInteraction): string[] {
  const listen = interaction.listen;
  return (Array.isArray(listen) ? listen : [listen]).filter((name): name is string => typeof name === "string");
}

function singleListen(interaction: UixBrokerInteraction): string | null {
  return typeof interaction.listen === "string" ? interaction.listen : null;
}

function listensFor(interaction: UixBrokerInteraction, name: string): boolean {
  return interaction.realm === "browser"
    ? browserEventNames(interaction).includes(name)
    : interaction.listen === name;
}

function selectTreeAnchorPath(anchor: UixBrokerAnchor): string | null {
  if (typeof anchor === "string" && anchor.startsWith("&")) return anchor.slice(1).trim() || null;
  return typeof anchor === "object" ? anchor.select_tree : null;
}

function parseOverrideAnchor(
  anchor: unknown,
  description: string,
): { path: string; absolute: boolean } {
  if (typeof anchor === "string") {
    const path = anchor.trim();
    if (!path) throw new Error(`${description} must be a non-empty select_tree path`);
    if (!path.startsWith("&")) return { path, absolute: false };
    const absolutePath = path.slice(1).trim();
    if (!absolutePath) throw new Error(`${description} absolute anchor must include a select_tree path`);
    return { path: absolutePath, absolute: true };
  }
  if (anchor && typeof anchor === "object" && typeof (anchor as { select_tree?: unknown }).select_tree === "string") {
    const path = (anchor as { select_tree: string }).select_tree.trim();
    if (!path) throw new Error(`${description} select_tree must be a non-empty path`);
    return { path, absolute: true };
  }
  throw new Error(`${description} must be a select_tree path string or { select_tree: path }`);
}

type ComposedPathOperator = "target" | "<" | "<$" | "<$$";

function parseComposedPathAnchor(anchor: string): { selector?: string; operator: ComposedPathOperator } | null {
  const value = anchor.trim();
  if (value === "target") return { operator: "target" };
  const match = /^(?:(.+?)\s+)?(<\$\$|<\$|<)(?:\s+target)?$/.exec(value);
  if (!match) return null;
  if (match[2] === "<$$" && !match[1]?.trim()) return null;
  return { selector: match[1]?.trim() || undefined, operator: match[2] as ComposedPathOperator };
}

function findLightDomMatch(root: Element, selector: string): Element | null {
  const path = selector.replace(/^&/, "");
  return Array.from(root.querySelectorAll("*")).find((element) => matchesHostElementPath(element, path)) ?? null;
}

function isHostElementRule(rule: UixBrokerRule): rule is string | UixBrokerHostElementRule {
  return typeof rule === "string" || (
    typeof rule === "object"
    && rule !== null
    && !("type" in rule)
    && typeof rule.match === "string"
  );
}

function isPanelRule(rule: UixBrokerRule): rule is UixBrokerPanelRule {
  return typeof rule === "object" && rule !== null && "type" in rule && rule.type === "panel";
}

function browserHashValue(): { exists: boolean; value: string } {
  const value = window.location.hash.slice(1);
  return { exists: value.length > 0, value };
}

function browserSearchValue(path: string): { exists: boolean; value: string | undefined } {
  const params = new URLSearchParams(window.location.search);
  return { exists: params.has(path), value: params.get(path) ?? undefined };
}

type BrokerUser = {
  id?: unknown;
  name?: unknown;
  is_admin?: unknown;
};

/**
 * Read the user synchronously so user rules can be evaluated before a block
 * directive needs to decide whether to stop browser event propagation.
 */
function browserUser(): BrokerUser | undefined {
  const coordinatorUser = (window as any).uixCoordinator?.user;
  if (coordinatorUser && typeof coordinatorUser === "object") return coordinatorUser;

  for (const element of document.querySelectorAll("home-assistant, hc-main")) {
    const user = (element as any).hass?.user;
    if (user && typeof user === "object") return user;
  }
  return undefined;
}

/**
 * Captured references use dot-separated properties, with bracketed numeric
 * indexes and quoted object keys. `items.0`, `items[0]`, and `items.[0]` are
 * interchangeable; keys that cannot conveniently use dot notation can use
 * `items['icon-color']` or `items["icon-color"]`.
 */
function capturedPathSegments(path: string): string[] | null {
  const segments: string[] = [];
  let index = 0;
  let needsSegment = true;

  while (index < path.length) {
    if (path[index] === ".") {
      if (needsSegment) return null;
      needsSegment = true;
      index += 1;
      continue;
    }

    if (path[index] === "[") {
      index += 1;
      if (index >= path.length) return null;

      if (/\d/.test(path[index])) {
        const start = index;
        while (index < path.length && /\d/.test(path[index])) index += 1;
        if (path[index] !== "]") return null;
        segments.push(path.slice(start, index));
        index += 1;
      } else if (path[index] === "'" || path[index] === '"') {
        const quote = path[index];
        let key = "";
        index += 1;
        while (index < path.length && path[index] !== quote) {
          if (path[index] === "\\") {
            index += 1;
            if (index >= path.length) return null;
          }
          key += path[index];
          index += 1;
        }
        if (path[index] !== quote || path[index + 1] !== "]") return null;
        segments.push(key);
        index += 2;
      } else {
        return null;
      }
      needsSegment = false;
      continue;
    }

    if (!needsSegment) return null;
    const start = index;
    while (index < path.length && path[index] !== "." && path[index] !== "[" && path[index] !== "]") {
      index += 1;
    }
    if (start === index) return null;
    segments.push(path.slice(start, index));
    needsSegment = false;
  }

  return needsSegment ? null : segments;
}

function getCapturedPathValue(value: unknown, path: string): { exists: boolean; value: unknown } {
  let current = value;
  const segments = capturedPathSegments(path);
  if (!segments) return { exists: false, value: undefined };
  for (const key of segments) {
    if (current == null || UNSAFE_PROPERTY_KEYS.has(key)) return { exists: false, value: undefined };
    const target = Object(current) as Record<string, unknown>;
    if (!Object.prototype.hasOwnProperty.call(target, key)) return { exists: false, value: undefined };
    current = target[key];
  }
  return { exists: true, value: current };
}

function getPathValue(value: unknown, path: string): unknown {
  return getCapturedPathValue(value, path).value;
}

function resolveCaptured(value: any, captured: Record<string, any>, results: Record<string, any> = {}): any {
  if (typeof value === "string" && (value === "@captured" || value.startsWith("@captured.") || value.startsWith("@captured["))) {
    if (value === "@captured") return captured;
    const path = value.slice("@captured".length);
    return getPathValue(captured, path.startsWith(".") ? path.slice(1) : path);
  }
  if (typeof value === "string") {
    const match = /^@([A-Za-z_][A-Za-z0-9_-]*)(.*)$/.exec(value);
    if (match && Object.prototype.hasOwnProperty.call(results, match[1])) {
      if (!match[2]) return results[match[1]];
      const path = match[2].startsWith(".") ? match[2].slice(1) : match[2];
      if (match[2].startsWith(".") || match[2].startsWith("[")) {
        return getPathValue(results[match[1]], path);
      }
    }
  }
  if (Array.isArray(value)) return value.map((item) => resolveCaptured(item, captured, results));
  if (value && typeof value === "object") {
    return Object.entries(value).reduce<Record<string, any>>((result, [key, item]) => {
      if (UNSAFE_PROPERTY_KEYS.has(key)) return result;
      result[key] = resolveCaptured(item, captured, results);
      return result;
    }, {});
  }
  return value;
}

function templateCacheKey(template: string, directive: Record<string, any>): string {
  try {
    return JSON.stringify([template, directive]);
  } catch {
    throw new Error("template directive cache key requires JSON-serializable prior directive results");
  }
}

function isPlainObject(value: unknown): value is Record<string, any> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

/**
 * Recursively overlays plain-object values without mutating captured event data.
 * Arrays and non-plain objects are complete replacements, matching normal event
 * detail expectations.
 */
function deepMergeEventData(
  captured: Record<string, any>,
  data: Record<string, any>,
): Record<string, any> {
  const merged: Record<string, any> = {};
  for (const [key, capturedValue] of Object.entries(captured)) {
    if (!UNSAFE_PROPERTY_KEYS.has(key)) merged[key] = capturedValue;
  }
  for (const [key, dataValue] of Object.entries(data)) {
    if (UNSAFE_PROPERTY_KEYS.has(key)) continue;
    const capturedValue = merged[key];
    merged[key] = capturedValue !== dataValue && isPlainObject(capturedValue) && isPlainObject(dataValue)
      ? deepMergeEventData(capturedValue, dataValue)
      : dataValue;
  }
  return merged;
}

/**
 * Captured-rule paths are relative to the captured object. Keep accepting the
 * former @captured prefix so existing configurations continue to work.
 */
function capturedRulePath(path: string): string {
  return path.replace(/^@captured(?:\.)?/, "");
}

function panelRulePath(path: string): string {
  return path.replace(/^@panel(?:\.)?/, "");
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function escapedWildcardPattern(value: string): string {
  return value
    .split("*")
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join(".*");
}

/**
 * Match a captured value with wildcard and regular-expression strings, numeric
 * comparison expressions, explicit operators, and boolean composition.
 */
export function matchesCapturedValue(actual: unknown, matcher: any, ignoreCase = false, exists = true): boolean {
  if (Array.isArray(matcher)) {
    return matcher.every((item) => matchesCapturedValue(actual, item, ignoreCase, exists));
  }

  if (matcher && typeof matcher === "object") {
    if (matcher.exists !== undefined && (typeof matcher.exists !== "boolean" || matcher.exists !== exists)) {
      return false;
    }
    if (matcher.and !== undefined) {
      const items = Array.isArray(matcher.and) ? matcher.and : [matcher.and];
      return items.every((item) => matchesCapturedValue(actual, item, ignoreCase, exists));
    }
    if (matcher.or !== undefined) {
      const items = Array.isArray(matcher.or) ? matcher.or : [matcher.or];
      return items.some((item) => matchesCapturedValue(actual, item, ignoreCase, exists));
    }
    if (matcher.not !== undefined) return !matchesCapturedValue(actual, matcher.not, ignoreCase, exists);

    const expected = matcher.value ?? matcher.match;
    const caseInsensitive = matcher.ignore_case ?? ignoreCase;
    if (matcher.operator !== undefined) {
      return matchesCapturedOperator(actual, expected, matcher.operator, caseInsensitive, exists);
    }
    if (Object.prototype.hasOwnProperty.call(matcher, "value") || Object.prototype.hasOwnProperty.call(matcher, "match")) {
      return matchesCapturedValue(actual, expected, caseInsensitive, exists);
    }
    if (matcher.exists !== undefined) return true;
  }

  if (matcher === null || matcher === undefined) return actual === matcher;

  let expected = String(matcher);
  let received: string;
  if (expected.startsWith("$$")) {
    expected = expected.slice(2);
    try {
      received = JSON.stringify(actual) ?? "";
    } catch {
      received = "";
    }
  } else {
    received = String(actual ?? "");
  }
  if (ignoreCase) {
    expected = expected.toLocaleLowerCase();
    received = received.toLocaleLowerCase();
  }

  const numeric = expected.match(/^\s*(<=|>=|!=|==|=|<|>)\s*(.+?)\s*$/);
  if (numeric) return matchesCapturedOperator(actual, numeric[2], numeric[1], ignoreCase, exists);

  const regex = expected.match(/^\/(.*)\/([a-z]*)$/i);
  if (regex) {
    try {
      return new RegExp(regex[1], regex[2].replace(/[gy]/g, "")).test(received);
    } catch {
      return false;
    }
  }
  if (expected.includes("*")) return new RegExp(`^${escapedWildcardPattern(expected)}$`).test(received);
  return received === expected;
}

/**
 * Match a user name or id. A positive matcher may match either identity; a
 * negated matcher must exclude both. This keeps `not` and `!=` useful when a
 * user has a human-readable name and an unrelated stable id.
 */
function matchesUserValue(user: BrokerUser | undefined, matcher: any): boolean {
  const identities = user === undefined
    ? []
    : [user.name, user.id].filter((value) => value !== undefined && value !== null);
  const exists = identities.length > 0;

  if (Array.isArray(matcher)) return matcher.every((item) => matchesUserValue(user, item));

  if (matcher && typeof matcher === "object") {
    if (matcher.exists !== undefined && (typeof matcher.exists !== "boolean" || matcher.exists !== exists)) {
      return false;
    }
    if (matcher.and !== undefined) {
      const items = Array.isArray(matcher.and) ? matcher.and : [matcher.and];
      return items.every((item) => matchesUserValue(user, item));
    }
    if (matcher.or !== undefined) {
      const items = Array.isArray(matcher.or) ? matcher.or : [matcher.or];
      return items.some((item) => matchesUserValue(user, item));
    }
    if (matcher.not !== undefined) return !matchesUserValue(user, matcher.not);
    if (matcher.exists !== undefined && matcher.operator === undefined && matcher.value === undefined && matcher.match === undefined) {
      return true;
    }
  }

  if (!identities.length) return matchesCapturedValue(undefined, matcher, false, false);
  const operator = matcher && typeof matcher === "object" ? matcher.operator : undefined;
  const isNotEqual = typeof operator === "string" && operator.toLocaleLowerCase() === "!=";
  const isInlineNotEqual = typeof matcher === "string" && /^\s*!=\s*/.test(matcher);
  const matchIdentity = (identity: unknown) => matchesCapturedValue(identity, matcher);
  return (isNotEqual || isInlineNotEqual)
    ? identities.every(matchIdentity)
    : identities.some(matchIdentity);
}

function matchesCapturedOperator(
  actual: unknown,
  expected: unknown,
  operator: string,
  ignoreCase: boolean,
  exists = true,
): boolean {
  const normalized = operator === "=" ? "==" : operator.toLocaleLowerCase();
  if (normalized === "is_undefined") return exists && actual === undefined;
  if ([">", "<", ">=", "<="].includes(normalized)) {
    const left = Number(actual);
    const right = Number(expected);
    if (!Number.isFinite(left) || !Number.isFinite(right)) return false;
    if (normalized === ">") return left > right;
    if (normalized === "<") return left < right;
    if (normalized === ">=") return left >= right;
    return left <= right;
  }

  if (normalized === "==" || normalized === "!=") {
    const left = Number(actual);
    const right = Number(expected);
    const equal = isFiniteNumber(left) && isFiniteNumber(right)
      ? left === right
      : matchesCapturedValue(actual, expected, ignoreCase, exists);
    return normalized === "==" ? equal : !equal;
  }
  const received = String(actual ?? "");
  const wanted = String(expected ?? "");
  const left = ignoreCase ? received.toLocaleLowerCase() : received;
  const right = ignoreCase ? wanted.toLocaleLowerCase() : wanted;
  if (normalized === "contains") return left.includes(right);
  if (normalized === "starts_with") return left.startsWith(right);
  if (normalized === "ends_with") return left.endsWith(right);
  return false;
}

/**
 * Synchronous tree selection used only by `block`. It deliberately never waits
 * for a custom element to render: browser propagation cannot wait for it.
 */
function selectTreeSync(root: ParentNode, path: string): Element | null {
  const tokens = path.trim().split(/\s*(\$\$|\$)\s*|\s+/).filter(Boolean);
  let current: Array<Element | ShadowRoot> = [root as Element];
  let deepSearch = false;

  const deepQuery = (roots: Array<Element | ShadowRoot>, selector: string) => {
    const matches: Element[] = [];
    const visited = new Set<Node>();
    const visit = (node: Element | ShadowRoot) => {
      if (visited.has(node)) return;
      visited.add(node);
      if (node instanceof Element && node.matches(selector)) matches.push(node);
      for (const child of Array.from(node.querySelectorAll(selector))) matches.push(child);
      for (const child of Array.from(node.querySelectorAll("*"))) {
        if (child.shadowRoot) visit(child.shadowRoot);
      }
    };
    roots.forEach(visit);
    return matches;
  };

  for (const token of tokens) {
    if (token === "$") {
      current = current
        .map((node) => node instanceof Element ? node.shadowRoot : null)
        .filter((node): node is ShadowRoot => node !== null);
      continue;
    }
    if (token === "$$") {
      deepSearch = true;
      continue;
    }
    if (deepSearch) {
      current = deepQuery(current, token);
      deepSearch = false;
    } else {
      const parent = current[0];
      current = parent ? Array.from(parent.querySelectorAll(token)) : [];
    }
    if (!current.length) return null;
  }
  const first = current[0];
  return first instanceof ShadowRoot ? first.host : first ?? null;
}

export class UixBroker {
  private brokerHass: any;
  private interactions: UixBrokerInteraction[] = [];
  private browserListeners = new Map<string, EventListener>();
  private shortcutUnsubscribers: Array<() => void> = [];
  private serverUnsubscribers: Array<() => void> = [];
  private configurationVersion = 0;
  private anchorHistory: UixBrokerAnchorHistoryEntry[] = [];
  private activeInteractions = new Set<UixBrokerInteraction>();
  private buttonWrappers = new Map<UixBrokerDirective, HTMLElement>();
  private tileIcons = new Map<UixBrokerDirective, HTMLElement>();
  private tooltips = new Map<UixBrokerDirective, BrokerTooltip>();
  private tooltipTargets = new Map<Element, BrokerTooltipTarget>();
  private retainedReferenceObservers = new Map<Node, MutationObserver>();
  private templateCache = new Map<string, TemplateCacheEntry>();

  get hass() {
    return this.brokerHass;
  }

  set hass(value: any) {
    this.brokerHass = value;
    this.refreshTileIcons(value);
  }

  async provideHass() {
    await provideHass(this);
  }

  configure(config: UixBrokerConfig | UixBrokerInteraction[]) {
    this.removeInsertedElements();
    this.templateCache = new Map();
    this.interactions = asInteractions(config);
    this.configurationVersion += 1;
    this.interactions.filter(isEnabled).forEach((interaction) => {
      this.debug(interaction, "listen", {
        configured: true,
        anchor: interaction.anchor,
      });
    });
    this.rebuildBrowserListeners();
    this.rebuildShortcutListeners();
    void this.rebuildServerListeners(this.configurationVersion);
    window.dispatchEvent(new CustomEvent("uix-broker-ready"));
  }

  get config(): UixBrokerInteraction[] {
    return [...this.interactions];
  }

  get recentAnchors(): UixBrokerAnchorHistoryEntry[] {
    return [...this.anchorHistory];
  }

  private rebuildBrowserListeners() {
    this.browserListeners.forEach((listener, name) => window.removeEventListener(name, listener, true));
    this.browserListeners.clear();

    const eventNames = new Set<string>();
    this.interactions
      .filter((interaction) => isEnabled(interaction) && interaction.realm === "browser")
      .forEach((interaction) => browserEventNames(interaction).forEach((name) => eventNames.add(name)));
    eventNames.forEach((name) => {
      const listener: EventListener = (event) => this.handleBrowserEvent(name, event);
      window.addEventListener(name, listener, true);
      this.browserListeners.set(name, listener);
    });
  }

  private rebuildShortcutListeners() {
    this.shortcutUnsubscribers.splice(0).forEach((unsubscribe) => unsubscribe());

    const bindings = [...new Set(
      this.interactions
        .filter((interaction) => isEnabled(interaction) && interaction.realm === "shortcut")
        .map(singleListen)
        .filter((binding): binding is string => binding !== null),
    )];
    if (!bindings.length) return;

    const keybindings = bindings.reduce<Record<string, (event: KeyboardEvent) => void>>((result, binding) => {
      result[binding] = (event) => this.handleShortcutEvent(binding, event);
      return result;
    }, {});
    this.shortcutUnsubscribers.push(tinykeys(window, keybindings));
  }

  private async rebuildServerListeners(version: number) {
    this.serverUnsubscribers.splice(0).forEach((unsubscribe) => unsubscribe());
    const eventNames = [...new Set(
      this.interactions
        .filter((interaction) => isEnabled(interaction) && interaction.realm === "server")
        .map(singleListen)
        .filter((name): name is string => name !== null),
    )];
    if (!eventNames.length) return;

    try {
      const connection = (await hass()).connection;
      if (version !== this.configurationVersion) return;
      for (const name of eventNames) {
        const unsubscribe = await connection.subscribeEvents((event) => {
          void this.handleServerEvent(name, event);
        }, name);
        if (version !== this.configurationVersion) {
          unsubscribe();
          return;
        }
        this.serverUnsubscribers.push(unsubscribe);
      }
    } catch (error) {
      console.error("UIX Broker: unable to subscribe to Home Assistant events:", error);
    }
  }

  private handleBrowserEvent(name: string, event: Event) {
    this.handleClientEvent("browser", name, event);
  }

  private handleShortcutEvent(name: string, event: KeyboardEvent) {
    this.handleClientEvent("shortcut", name, event);
  }

  private handleClientEvent(realm: "browser" | "shortcut", name: string, event: Event) {
    const interactions = this.interactions.filter(
      (interaction) => isEnabled(interaction) && interaction.realm === realm && listensFor(interaction, name),
    );
    for (const interaction of interactions) {
      if (this.hasBlockDirectiveRules(interaction)) {
        console.warn("UIX Broker: block directives do not support directive rules.", interaction);
        continue;
      }
      if (interaction.reentrant === false && this.activeInteractions.has(interaction)) {
        this.debug(interaction, "interaction skipped", { reason: "already running" });
        continue;
      }
      this.debug(interaction, "listen", { event });
      const context: BrokerContext = {
        source: event,
        captured: this.eventData(event),
        results: Object.create(null),
        realm,
      };
      if (!this.preAnchorRulesMatchSync(interaction, context)) continue;
      if (this.hasPanelRules(interaction) && interaction.directives?.some((directive) => directive.type === "block")) {
        console.warn("UIX Broker: panel rules cannot be used with block directives.", interaction);
        continue;
      }
      if (interaction.reentrant === false) this.activeInteractions.add(interaction);
      // Blocking must be determined in this call stack; later directives may await.
      let blockAnchor: Element | null = null;
      if (interaction.directives?.some((directive) => directive.type === "block")) {
        blockAnchor = this.runSynchronousBlock(interaction, context);
        if (!blockAnchor) {
          this.activeInteractions.delete(interaction);
          continue;
        }
      }
      const run = this.runInteraction(
        interaction,
        context,
        Boolean(blockAnchor),
        blockAnchor ?? undefined,
        !this.hasPanelRules(interaction),
      );
      if (interaction.reentrant === false) {
        void run.then(
          () => this.activeInteractions.delete(interaction),
          () => this.activeInteractions.delete(interaction),
        );
      }
    }
  }

  private async handleServerEvent(name: string, event: Record<string, any>) {
    const interactions = this.interactions.filter(
      (interaction) => isEnabled(interaction) && interaction.realm === "server" && listensFor(interaction, name),
    );
    for (const interaction of interactions) {
      if (this.hasBlockDirectiveRules(interaction)) {
        console.warn("UIX Broker: block directives do not support directive rules.", interaction);
        continue;
      }
      if (interaction.reentrant === false && this.activeInteractions.has(interaction)) {
        this.debug(interaction, "interaction skipped", { reason: "already running" });
        continue;
      }
      this.debug(interaction, "listen", { event });
      if (interaction.reentrant === false) this.activeInteractions.add(interaction);
      try {
        await this.runInteraction(interaction, {
          source: event,
          captured: { data: { ...(event.data ?? {}) } },
          results: Object.create(null),
          realm: "server",
        });
      } finally {
        this.activeInteractions.delete(interaction);
      }
    }
  }

  private eventData(event: Event): Record<string, any> {
    const detail = (event as CustomEvent).detail;
    return detail && typeof detail === "object" ? { ...detail } : {};
  }

  private runSynchronousBlock(interaction: UixBrokerInteraction, context: BrokerContext): Element | null {
    const anchor = this.resolveAnchorSync(interaction.anchor, context);
    if (anchor) this.rememberAnchor(interaction, anchor);
    this.debug(interaction, "anchor resolution", { anchor: interaction.anchor, resolved: anchor });
    if (!anchor || !this.anchorRulesMatchSync(interaction, anchor, context)) return null;
    const browserEvent = context.source as Event;
    this.debug(interaction, "directive application", { directive: { type: "block" }, synchronous: true });
    browserEvent.preventDefault();
    browserEvent.stopImmediatePropagation();
    this.debug(interaction, "directive applied", { directive: { type: "block" }, synchronous: true });
    return anchor;
  }

  private async runInteraction(
    interaction: UixBrokerInteraction,
    context: BrokerContext,
    blockHandled = false,
    prevalidatedAnchor?: Element,
    preAnchorRulesValidated = false,
  ) {
    try {
      if (!preAnchorRulesValidated && !await this.preAnchorRulesMatch(interaction, context)) return;
      const anchor = prevalidatedAnchor ?? await this.resolveAnchor(interaction.anchor, context);
      if (anchor) this.rememberAnchor(interaction, anchor);
      if (!prevalidatedAnchor) {
        this.debug(interaction, "anchor resolution", { anchor: interaction.anchor, resolved: anchor });
        if (!anchor || !await this.anchorRulesMatch(interaction, anchor, context)) return;
      }
      for (const [index, directive] of (interaction.directives ?? []).entries()) {
        if (directive.type === "block") {
          if (!blockHandled) {
            this.debug(interaction, "directive application", { index, directive });
            this.executeBlock(context);
            this.debug(interaction, "directive applied", { index, directive });
          }
          await this.waitAfterDirective(interaction, directive, index);
          continue;
        }
        if (directive.type === "wait") {
          if (directive.wait === undefined) throw new Error("wait directive requires wait");
          if (!await this.directiveRulesMatch(interaction, directive, anchor, context, index)) continue;
          this.debug(interaction, "directive application", { index, directive });
          await this.waitAfterDirective(interaction, directive, index);
          this.debug(interaction, "directive applied", { index, directive });
          continue;
        }
        const directiveAnchor = await this.resolveDirectiveAnchor(directive, anchor);
        if (!directiveAnchor) {
          this.debug(interaction, "directive anchor resolution", {
            index,
            anchor: directive.anchor,
            resolved: null,
          });
          continue;
        }
        if (directive.anchor !== undefined && (directive.type !== "event" || directive.target === undefined || directive.target === "anchor")) {
          this.debug(interaction, "directive anchor resolution", {
            index,
            anchor: directive.anchor,
            resolved: directiveAnchor,
          });
        }
        if (!await this.directiveRulesMatch(interaction, directive, directiveAnchor, context, index)) continue;
        this.debug(interaction, "directive application", { index, directive, anchor: directiveAnchor });
        const createdElement = await this.executeDirective(directive, directiveAnchor, context);
        if (createdElement) context.previousDirectiveElement = createdElement;
        const applied = { index, directive, anchor: directiveAnchor } as Record<string, unknown>;
        if ((directive.type === "template" || directive.type === "javascript") && typeof directive.id === "string") {
          applied.result = context.results[directive.id];
        }
        this.debug(interaction, "directive applied", applied);
        await this.waitAfterDirective(interaction, directive, index);
      }
    } catch (error) {
      console.error("UIX Broker: interaction failed:", error, interaction);
    }
  }

  private resolveAnchorSync(anchorConfig: UixBrokerAnchor, context: BrokerContext): Element | null {
    const selectPath = selectTreeAnchorPath(anchorConfig);
    if (selectPath) return selectTreeSync(document, selectPath);
    if (context.realm === "server") {
      return null;
    }
    const event = context.source as Event;
    const path = event.composedPath();
    const parsed = typeof anchorConfig === "string" ? parseComposedPathAnchor(anchorConfig) : null;
    if (!parsed) {
      console.warn(`UIX Broker: unknown client-event anchor "${anchorConfig}".`);
      return null;
    }
    const targetIndex = path.findIndex(isElement);
    const target = path[targetIndex] as Element | undefined;
    if (!target) return null;
    if (parsed.operator === "target") return target;
    const ancestors = path.slice(targetIndex + 1);
    if (parsed.operator === "<$$") {
      const elements = ancestors.filter(isElement);
      return elements.find((element) => matchesHostElementPath(element, parsed.selector!.replace(/^&/, ""))) ?? null;
    }
    let base: Element | null;
    if (parsed.operator === "<") {
      base = ancestors.find(isElement) ?? null;
    } else {
      const boundaryIndex = path.findIndex((node, index) => index > targetIndex && node instanceof ShadowRoot);
      base = boundaryIndex === -1 ? null : path.slice(boundaryIndex + 1).find(isElement) ?? null;
    }
    if (!base || !parsed.selector) return base;
    return findLightDomMatch(base, parsed.selector);
  }

  private async resolveAnchor(anchorConfig: UixBrokerAnchor, context: BrokerContext): Promise<Element | null> {
    const selectPath = selectTreeAnchorPath(anchorConfig);
    if (selectPath) return this.waitForSelectTreeAnchor(selectPath);
    if (context.realm === "server") return null;
    return this.resolveAnchorSync(anchorConfig, context);
  }

  private rememberAnchor(interaction: UixBrokerInteraction, anchor: Element) {
    this.pruneDetachedReferences();
    if (!anchor.isConnected) return;
    this.anchorHistory = [
      {
        anchor,
        realm: interaction.realm,
        listen: Array.isArray(interaction.listen) ? interaction.listen.join(", ") : interaction.listen,
        anchorConfig: interaction.anchor,
        resolvedAt: Date.now(),
      },
      ...this.anchorHistory.filter((entry) => entry.anchor !== anchor),
    ].slice(0, 50);
    this.refreshRetainedReferenceObservers();
  }

  /**
   * Broker keeps anchors only for the developer console helper and keeps
   * buttons, tile icons, and tooltips only to update previously inserted elements. Neither
   * needs to outlive its DOM subtree.
   */
  private pruneDetachedReferences() {
    this.anchorHistory = this.anchorHistory.filter(({ anchor }) => anchor.isConnected);
    for (const [directive, wrapper] of this.buttonWrappers) {
      if (!wrapper.isConnected) this.buttonWrappers.delete(directive);
    }
    for (const [directive, tileIcon] of this.tileIcons) {
      if (!tileIcon.isConnected) this.tileIcons.delete(directive);
    }
    for (const [directive, tooltip] of this.tooltips) {
      if (!tooltip.element.isConnected || !tooltip.target.isConnected) this.removeTooltip(directive, tooltip);
    }
    this.refreshRetainedReferenceObservers();
  }

  /**
   * Document observers do not see mutations inside shadow roots, so observe
   * each root currently containing a retained reference as well as document.
   * Observers are disconnected as soon as there is nothing left to retain.
   */
  private refreshRetainedReferenceObservers() {
    const roots = new Set<Node>();
    if (this.anchorHistory.length || this.buttonWrappers.size || this.tileIcons.size || this.tooltips.size) {
      roots.add(document);
      this.anchorHistory.forEach(({ anchor }) => roots.add(anchor.getRootNode()));
      this.buttonWrappers.forEach((wrapper) => roots.add(wrapper.getRootNode()));
      this.tileIcons.forEach((tileIcon) => roots.add(tileIcon.getRootNode()));
      this.tooltips.forEach(({ element, target }) => {
        roots.add(element.getRootNode());
        roots.add(target.getRootNode());
      });
    }

    this.retainedReferenceObservers.forEach((observer, root) => {
      if (roots.has(root)) return;
      observer.disconnect();
      this.retainedReferenceObservers.delete(root);
    });
    roots.forEach((root) => {
      if (this.retainedReferenceObservers.has(root)) return;
      const observer = new MutationObserver(() => this.pruneDetachedReferences());
      observer.observe(root, { childList: true, subtree: true });
      this.retainedReferenceObservers.set(root, observer);
    });
  }

  private async resolveDirectiveAnchor(
    directive: UixBrokerDirective,
    interactionAnchor: Element,
  ): Promise<Element | null> {
    if (directive.type !== "property" && directive.type !== "event" && directive.type !== "call" && directive.type !== "button" && directive.type !== "tile-icon" && directive.type !== "tooltip") {
      return interactionAnchor;
    }
    if (directive.type === "event" && directive.target !== undefined && directive.target !== "anchor") {
      return interactionAnchor;
    }
    if (directive.anchor === undefined) return interactionAnchor;
    const { path, absolute } = parseOverrideAnchor(directive.anchor, `${directive.type} directive anchor`);
    return absolute ? this.waitForSelectTreeAnchor(path) : this.waitForSelectTreeAnchor(path, interactionAnchor);
  }

  private async resolveRuleAnchor(
    rule: string | UixBrokerHostElementRule,
    interactionAnchor: Element,
  ): Promise<Element | null> {
    if (typeof rule === "string" || rule.anchor === undefined) return interactionAnchor;
    const { path, absolute } = parseOverrideAnchor(rule.anchor, "host-element rule anchor");
    return absolute ? this.waitForSelectTreeAnchor(path) : this.waitForSelectTreeAnchor(path, interactionAnchor);
  }

  private resolveRuleAnchorSync(
    rule: string | UixBrokerHostElementRule,
    interactionAnchor: Element,
  ): Element | null {
    if (typeof rule === "string" || rule.anchor === undefined) return interactionAnchor;
    const { path, absolute } = parseOverrideAnchor(rule.anchor, "host-element rule anchor");
    return selectTreeSync(absolute ? document : interactionAnchor, path);
  }

  private async waitForSelectTreeAnchor(path: string, root: ParentNode = document): Promise<Element | null> {
    const deadline = Date.now() + BROKER_SELECT_TREE_TIMEOUT_MS;
    do {
      const remaining = deadline - Date.now();
      const anchor = await selectTree(root, path, false, Math.max(1, remaining));
      if (anchor) return anchor;
      if (remaining <= 0) return null;
      await new Promise((resolve) => window.setTimeout(resolve, Math.min(BROKER_SELECT_TREE_RETRY_MS, remaining)));
    } while (Date.now() < deadline);
    return null;
  }

  private hasPanelRules(interaction: UixBrokerInteraction): boolean {
    return (interaction.rules ?? []).some(isPanelRule);
  }

  private hasBlockDirectiveRules(interaction: UixBrokerInteraction): boolean {
    return (interaction.directives ?? []).some((directive) => directive.type === "block" && directive.rules !== undefined);
  }

  private async directiveRulesMatch(
    interaction: UixBrokerInteraction,
    directive: UixBrokerDirective,
    anchor: Element,
    context: BrokerContext,
    directiveIndex: number,
  ): Promise<boolean> {
    const rules = directive.rules ?? [];
    if (!rules.length) {
      this.debug(interaction, "directive rule validation", { directiveIndex, result: true, reason: "no rules" });
      return true;
    }
    const immediateRules = rules.filter((rule) => !isHostElementRule(rule) && !isPanelRule(rule));
    if (!this.rulesMatch(interaction, immediateRules, undefined, context, "directive", directiveIndex)) return false;

    const panelRules = rules.filter(isPanelRule);
    if (panelRules.length) {
      if (context.panel === undefined) {
        try {
          const panelState = await getPanelState();
          context.panel = panelState?.panel ?? {};
        } catch (error) {
          console.warn("UIX Broker: unable to get panel state for directive rules:", error);
          return false;
        }
      }
      if (!this.rulesMatch(interaction, panelRules, undefined, context, "directive", directiveIndex)) return false;
    }

    const hostRules = rules.filter(isHostElementRule);
    if (!hostRules.length) {
      this.debug(interaction, "directive rule validation", { directiveIndex, result: true, reason: "no host-element rules" });
      return true;
    }
    for (const [index, rule] of hostRules.entries()) {
      const ruleAnchor = await this.resolveRuleAnchor(rule, anchor);
      if (typeof rule !== "string" && rule.anchor !== undefined) {
        this.debug(interaction, "directive rule anchor resolution", {
          directiveIndex,
          index,
          anchor: rule.anchor,
          resolved: ruleAnchor,
        });
      }
      const match = typeof rule === "string" ? rule : rule.match;
      const result = ruleAnchor ? matchesHostElementPath(ruleAnchor, match.replace(/^&/, "")) : false;
      this.debug(interaction, "directive rule validation", { directiveIndex, index, rule, result });
      if (!result) return false;
    }
    return true;
  }

  private preAnchorRulesMatchSync(interaction: UixBrokerInteraction, context: BrokerContext): boolean {
    return this.rulesMatch(
      interaction,
      (interaction.rules ?? []).filter((rule) => !isHostElementRule(rule) && !isPanelRule(rule)),
      undefined,
      context,
      "pre-anchor",
    );
  }

  private async preAnchorRulesMatch(interaction: UixBrokerInteraction, context: BrokerContext): Promise<boolean> {
    if (!this.preAnchorRulesMatchSync(interaction, context)) return false;
    const rules = (interaction.rules ?? []).filter(isPanelRule);
    if (!rules.length) return true;
    try {
      const panelState = await getPanelState();
      context.panel = panelState?.panel ?? {};
    } catch (error) {
      console.warn("UIX Broker: unable to get panel state for panel rules:", error);
      return false;
    }
    return this.rulesMatch(interaction, rules, undefined, context, "pre-anchor");
  }

  private async anchorRulesMatch(interaction: UixBrokerInteraction, anchor: Element, context: BrokerContext): Promise<boolean> {
    const rules = (interaction.rules ?? []).filter(isHostElementRule);
    if (!rules.length) {
      this.debug(interaction, "rule validation", { phase: "anchor", result: true, reason: "no rules" });
      return true;
    }
    for (const [index, rule] of rules.entries()) {
      const ruleAnchor = await this.resolveRuleAnchor(rule, anchor);
      if (typeof rule !== "string" && rule.anchor !== undefined) {
        this.debug(interaction, "rule anchor resolution", { index, anchor: rule.anchor, resolved: ruleAnchor });
      }
      const match = typeof rule === "string" ? rule : rule.match;
      const result = ruleAnchor ? matchesHostElementPath(ruleAnchor, match.replace(/^&/, "")) : false;
      this.debug(interaction, "rule validation", { phase: "anchor", index, rule, result });
      if (!result) return false;
    }
    return true;
  }

  private anchorRulesMatchSync(interaction: UixBrokerInteraction, anchor: Element, context: BrokerContext): boolean {
    const rules = (interaction.rules ?? []).filter(isHostElementRule);
    if (!rules.length) {
      this.debug(interaction, "rule validation", { phase: "anchor", result: true, reason: "no rules" });
      return true;
    }
    for (const [index, rule] of rules.entries()) {
      const ruleAnchor = this.resolveRuleAnchorSync(rule, anchor);
      if (typeof rule !== "string" && rule.anchor !== undefined) {
        this.debug(interaction, "rule anchor resolution", { index, anchor: rule.anchor, resolved: ruleAnchor, synchronous: true });
      }
      const match = typeof rule === "string" ? rule : rule.match;
      const result = ruleAnchor ? matchesHostElementPath(ruleAnchor, match.replace(/^&/, "")) : false;
      this.debug(interaction, "rule validation", { phase: "anchor", index, rule, result, synchronous: true });
      if (!result) return false;
    }
    return true;
  }

  private rulesMatch(
    interaction: UixBrokerInteraction,
    rules: UixBrokerRule[],
    anchor: Element | undefined,
    context: BrokerContext,
    phase: "pre-anchor" | "anchor" | "directive",
    directiveIndex?: number,
  ): boolean {
    if (!rules.length) {
      this.debug(interaction, "rule validation", { phase, directiveIndex, result: true, reason: "no rules" });
      return true;
    }
    for (const [index, rule] of rules.entries()) {
      let result: boolean;
      if (typeof rule === "string") {
        result = anchor ? matchesHostElementPath(anchor, rule.replace(/^&/, "")) : false;
      } else if ("match" in rule && !("type" in rule)) {
        result = anchor ? matchesHostElementPath(anchor, rule.match.replace(/^&/, "")) : false;
      } else {
        const typedRule = rule as UixBrokerTypedRule;
        if (typedRule.type === "browserid") {
          const expected = typedRule.browser_id ?? typedRule.id ?? typedRule.value;
          result = expected === undefined || expected === BrowserID();
        } else if (typedRule.type === "user") {
          if (!Object.prototype.hasOwnProperty.call(typedRule, "match") && !Object.prototype.hasOwnProperty.call(typedRule, "value")) {
            console.warn("UIX Broker: user rule requires match or value.");
            result = false;
          } else {
            result = matchesUserValue(
              browserUser(),
              Object.prototype.hasOwnProperty.call(typedRule, "match") ? typedRule.match : typedRule.value,
            );
          }
        } else if (typedRule.type === "user_is_admin") {
          const user = browserUser();
          const adminValue = getCapturedPathValue(user, "is_admin");
          result = matchesCapturedValue(
            adminValue.value,
            Object.prototype.hasOwnProperty.call(typedRule, "match")
              ? typedRule.match
              : Object.prototype.hasOwnProperty.call(typedRule, "value") ? typedRule.value : true,
            false,
            adminValue.exists,
          );
        } else if (typedRule.type === "hash") {
          const hashValue = browserHashValue();
          result = matchesCapturedValue(
            hashValue.value,
            typedRule.match ?? typedRule.value,
            false,
            hashValue.exists,
          );
        } else if (typedRule.type === "search") {
          const path = typedRule.path;
          if (typeof path !== "string" || !path) {
            console.warn("UIX Broker: search rule requires path.");
            result = false;
          } else {
            const searchValue = browserSearchValue(path);
            result = matchesCapturedValue(
              searchValue.value,
              typedRule.match ?? typedRule.value,
              false,
              searchValue.exists,
            );
          }
        } else if (typedRule.type === "panel") {
          const path = typedRule.path ?? typedRule.property;
          if (typeof path !== "string") {
            console.warn("UIX Broker: panel rule requires path.");
            result = false;
          } else {
            const panelValue = getCapturedPathValue(context.panel, panelRulePath(path));
            result = matchesCapturedValue(
              panelValue.value,
              typedRule.match ?? typedRule.value,
              false,
              panelValue.exists,
            );
          }
        } else if (typedRule.type === "captured") {
          const path = typedRule.path ?? typedRule.property;
          if (typeof path !== "string") {
            console.warn("UIX Broker: captured rule requires path.");
            result = false;
          } else {
            const capturedValue = getCapturedPathValue(context.captured, capturedRulePath(path));
            result = matchesCapturedValue(
              capturedValue.value,
              typedRule.match ?? typedRule.value,
              false,
              capturedValue.exists,
            );
          }
        } else {
          const capturedMatchers = Object.entries(typedRule).filter(
            ([key]) => key === "@captured" || key.startsWith("@captured."),
          );
          if (capturedMatchers.length) {
            result = capturedMatchers.every(([path, matcher]) => {
              const capturedValue = getCapturedPathValue(context.captured, capturedRulePath(path));
              return matchesCapturedValue(capturedValue.value, matcher, false, capturedValue.exists);
            });
          } else {
            console.warn(`UIX Broker: unknown rule type "${typedRule.type}".`);
            result = false;
          }
        }
      }
      this.debug(interaction, "rule validation", { phase, directiveIndex, index, rule, result });
      if (!result) return false;
    }
    return true;
  }

  private debug(interaction: UixBrokerInteraction, stage: string, detail?: Record<string, unknown>) {
    if (!interaction.debug) return;
    const prefix = `UIX Broker [${interaction.realm}:${interaction.listen}] ${stage}`;
    if (detail) console.debug(prefix, detail);
    else console.debug(prefix);
  }

  private executeBlock(context: BrokerContext) {
    if (context.realm === "server") return;
    const event = context.source as Event;
    event.preventDefault();
    event.stopImmediatePropagation();
  }

  private refreshTileIcons(currentHass: any) {
    this.tileIcons.forEach((tileIcon) => {
      const config = (tileIcon as BrokerTileIconElement).uixBrokerTileIconConfig;
      if (config) updateHaTileIcon(tileIcon, config, currentHass);
    });
  }

  private async executeDirective(directive: UixBrokerDirective, anchor: Element, context: BrokerContext): Promise<Element | undefined> {
    if (directive.type === "property") {
      this.executeProperty(directive, anchor, context);
    } else if (directive.type === "event") {
      this.executeEvent(directive, anchor, context);
    } else if (directive.type === "call") {
      await this.executeCall(directive, anchor, context);
    } else if (directive.type === "action") {
      await this.executeAction(directive, anchor, context);
    } else if (directive.type === "button") {
      return this.executeButton(directive, anchor, context);
    } else if (directive.type === "tile-icon") {
      return this.executeTileIcon(directive, anchor, context);
    } else if (directive.type === "tooltip") {
      await this.executeTooltip(directive, anchor, context);
    } else if (directive.type === "template") {
      await this.executeTemplate(directive, context);
    } else if (directive.type === "javascript") {
      await this.executeJavascript(directive, anchor, context);
    } else {
      console.warn(`UIX Broker: unknown directive type "${directive.type}".`);
    }
  }

  private directiveResultID(directive: UixBrokerDirective): string {
    if (typeof directive.id !== "string" || !/^[A-Za-z_][A-Za-z0-9_-]*$/.test(directive.id)) {
      throw new Error("template and javascript directives require an id starting with a letter or underscore, followed by letters, numbers, underscores, or hyphens");
    }
    if (directive.id === "captured") throw new Error("template and javascript directive id 'captured' is reserved");
    return directive.id;
  }

  private async executeTemplate(directive: UixBrokerDirective, context: BrokerContext) {
    const id = this.directiveResultID(directive);
    const template = resolveCaptured(directive.template, context.captured, context.results);
    if (typeof template !== "string") throw new Error("template directive requires template");
    const variables = { directive: context.results };
    const cacheDuration = directive.cache;
    if (cacheDuration !== undefined && (!Number.isFinite(cacheDuration) || cacheDuration < 0)) {
      throw new Error("template directive cache must be a non-negative number of milliseconds");
    }
    if (!cacheDuration) {
      context.results[id] = await render_template(template, variables);
      return;
    }

    const cache = this.templateCache;
    const cacheKey = templateCacheKey(template, context.results);
    const entry = cache.get(cacheKey);
    if (entry?.result !== undefined && entry.renderedAt !== undefined && Date.now() - entry.renderedAt < cacheDuration) {
      context.results[id] = entry.result;
      return;
    }

    const request = entry?.request ?? render_template(template, variables);
    cache.set(cacheKey, { request });
    try {
      const result = await request;
      cache.set(cacheKey, { result, renderedAt: Date.now() });
      context.results[id] = result;
    } catch (error) {
      cache.delete(cacheKey);
      throw error;
    }
  }

  private async executeJavascript(directive: UixBrokerDirective, anchor: Element, context: BrokerContext) {
    const id = this.directiveResultID(directive);
    if (typeof directive.code !== "string") throw new Error("javascript directive requires code");
    const fn = new Function("hass", "anchor", "event", "captured", "directive", `"use strict";\n${directive.code}`);
    context.results[id] = fn(await hass(), anchor, context.source, context.captured, context.results);
  }

  private async waitAfterDirective(interaction: UixBrokerInteraction, directive: UixBrokerDirective, index: number) {
    if (directive.wait === undefined) return;
    if (typeof directive.wait !== "number" || !Number.isFinite(directive.wait) || directive.wait < 0) {
      throw new Error("directive wait must be a non-negative number of milliseconds");
    }
    if (directive.wait === 0) return;
    this.debug(interaction, "directive wait", { index, milliseconds: directive.wait });
    await new Promise((resolve) => window.setTimeout(resolve, directive.wait));
  }

  private executeProperty(directive: UixBrokerDirective, anchor: Element, context: BrokerContext) {
    const path = directive.set ?? directive.clear;
    if (typeof path !== "string" || !path) throw new Error("property directive requires set or clear");
    const keys = path.split(".");
    if (keys.some((key) => UNSAFE_PROPERTY_KEYS.has(key))) throw new Error("unsafe property path");
    const last = keys.pop()!;
    let target: Record<string, any> = anchor as any;
    for (const key of keys) target = target[key] ?? (target[key] = {});
    if (directive.clear) delete target[last];
    else target[last] = resolveCaptured(directive.value, context.captured, context.results);
  }

  private executeEvent(directive: UixBrokerDirective, anchor: Element, context: BrokerContext) {
    if (typeof directive.name !== "string" || !directive.name) throw new Error("event directive requires name");
    const data = resolveCaptured(directive.data ?? {}, context.captured, context.results);
    const eventData = data && typeof data === "object" && !Array.isArray(data) ? data : {};
    const detail = directive.capture_data
      ? directive.capture_data === "deep"
        ? deepMergeEventData(context.captured, eventData)
        : { ...context.captured, ...eventData }
      : data;
    const event = new CustomEvent(directive.name, {
      bubbles: directive.bubbles ?? false,
      composed: directive.composed ?? false,
      detail,
    });
    const target = directive.target ?? "anchor";
    if (target === "anchor") {
      anchor.dispatchEvent(event);
    } else if (target === "window") {
      window.dispatchEvent(event);
    } else if (target === "document") {
      document.dispatchEvent(event);
    } else {
      throw new Error(`event directive target must be anchor, window, or document: ${target}`);
    }
  }

  private async executeCall(directive: UixBrokerDirective, anchor: Element, context: BrokerContext) {
    if (typeof directive.method !== "string" || !directive.method.trim()) {
      throw new Error("call directive requires method");
    }
    const keys = directive.method.trim().split(".");
    if (keys.some((key) => !key || UNSAFE_PROPERTY_KEYS.has(key))) {
      throw new Error("unsafe call method path");
    }
    const args = resolveCaptured(directive.args ?? [], context.captured, context.results);
    if (!Array.isArray(args)) throw new Error("call directive args must be an array");
    const methodName = keys.pop()!;
    let target: Record<string, any> | null = anchor as any;
    for (const key of keys) {
      target = target?.[key] ?? null;
      if (target === null) throw new Error(`call directive method path not found: ${directive.method}`);
    }
    const method = target?.[methodName];
    if (typeof method !== "function") throw new Error(`call directive method not found: ${directive.method}`);
    await method.apply(target, args);
  }

  private async executeAction(directive: UixBrokerDirective, anchor: Element, context: BrokerContext) {
    const action = directive.action;
    if (action === "fire-dom-event") {
      anchor.dispatchEvent(new CustomEvent("ll-custom", {
        bubbles: true,
        composed: true,
        detail: { uix: resolveCaptured(directive.uix ?? {}, context.captured, context.results) },
      }));
      return;
    }
    if (action === "javascript") {
      if (typeof directive.data?.code !== "string") throw new Error("javascript action requires data.code");
      const fn = new Function("hass", "anchor", "event", "captured", `"use strict";\n${directive.data.code}`);
      await fn(await hass(), anchor, context.source, context.captured);
      return;
    }

    const { wait: _wait, anchor: _anchor, rules: _rules, ...actionDirective } = directive;
    const config = resolveCaptured(actionDirective, context.captured, context.results);
    const service = action === "perform-action" ? config.perform_action : action;
    if (typeof service === "string" && service.includes(".")) {
      const [domain, name] = service.split(".", 2);
      await (await hass()).callService(domain, name, config.data ?? {}, config.target);
      return;
    }
    anchor.dispatchEvent(new CustomEvent("hass-action", {
      bubbles: true,
      composed: true,
      detail: { config: { tap_action: config }, action: "tap" },
    }));
  }

  private async executeButton(directive: UixBrokerDirective, anchor: Element, context: BrokerContext): Promise<Element | undefined> {
    const target = await this.resolveButtonTarget(directive, anchor);
    if (!target) return undefined;
    const parent = target.parentElement || target.parentNode;
    if (!parent) return undefined;

    let wrapper = this.buttonWrappers.get(directive);
    if (wrapper && (!wrapper.isConnected || wrapper.parentNode !== parent)) {
      wrapper.remove();
      this.buttonWrappers.delete(directive);
      wrapper = undefined;
    }

    let button: BrokerButtonElement;
    if (!wrapper) {
      wrapper = document.createElement("div");
      wrapper.setAttribute(BROKER_BUTTON_WRAPPER_ATTR, "");
      wrapper.style.display = "contents";
      wrapper.style.pointerEvents = "auto";

      const style = document.createElement("style");
      style.textContent = HA_BUTTON_CSS;
      wrapper.appendChild(style);

      const stopPropagation = (event: Event) => event.stopPropagation();
      wrapper.addEventListener("pointerdown", stopPropagation);
      wrapper.addEventListener("click", stopPropagation);
      wrapper.addEventListener("mousedown", stopPropagation);
      wrapper.addEventListener("touchstart", stopPropagation);

      const slot = target.getAttribute("slot");
      if (slot) wrapper.setAttribute("slot", slot);

      button = createHaButton(this.buttonConfig(directive, context, target), (event) => {
        dispatchHaButtonAction(button, button.uixBrokerButtonConfig ?? {}, event);
      }) as BrokerButtonElement;
      wrapper.appendChild(button);
      this.buttonWrappers.set(directive, wrapper);
    } else {
      button = wrapper.querySelector("ha-button") as BrokerButtonElement;
      if (!button) {
        button = createHaButton(this.buttonConfig(directive, context, target), (event) => {
          dispatchHaButtonAction(button, button.uixBrokerButtonConfig ?? {}, event);
        }) as BrokerButtonElement;
        wrapper.appendChild(button);
      }
    }

    this.clearButtonStyle(button);
    button.uixBrokerButtonConfig = this.buttonConfig(directive, context, target);
    updateHaButton(button, button.uixBrokerButtonConfig);
    this.applyButtonStyle(button, directive.style, context);
    await this.applyButtonUix(button, directive, context, button.uixBrokerButtonConfig);
    this.placeButton(wrapper, target, directive.before !== undefined);
    this.refreshRetainedReferenceObservers();
    return button;
  }

  private async executeTileIcon(directive: UixBrokerDirective, anchor: Element, context: BrokerContext): Promise<Element | undefined> {
    const target = await this.resolveTileIconTarget(directive, anchor);
    if (!target) return undefined;
    const parent = target.parentElement || target.parentNode;
    if (!parent) return undefined;

    let tileIcon = this.tileIcons.get(directive);
    if (tileIcon && (!tileIcon.isConnected || tileIcon.parentNode !== parent)) {
      tileIcon.remove();
      this.tileIcons.delete(directive);
      tileIcon = undefined;
    }

    if (!tileIcon) {
      tileIcon = document.createElement("ha-tile-icon");
      tileIcon.setAttribute(BROKER_TILE_ICON_ATTR, "");
      const slot = target.getAttribute("slot");
      if (slot) tileIcon.setAttribute("slot", slot);
      this.tileIcons.set(directive, tileIcon);
      tileIcon.addEventListener("action", (event) => {
        const icon = tileIcon as BrokerTileIconElement;
        dispatchHaTileIconAction(icon, icon.uixBrokerTileIconConfig ?? {}, event as CustomEvent);
      });
      const stopPropagation = (event: Event) => event.stopPropagation();
      tileIcon.addEventListener("pointerdown", stopPropagation);
      tileIcon.addEventListener("mousedown", stopPropagation);
      tileIcon.addEventListener("touchstart", stopPropagation);
      tileIcon.addEventListener("click", stopPropagation);
    }

    const config = this.tileIconConfig(directive, context, target);
    const brokerTileIcon = tileIcon as BrokerTileIconElement;
    this.clearTileIconStyle(brokerTileIcon);
    brokerTileIcon.uixBrokerTileIconConfig = config;
    updateHaTileIcon(tileIcon, config, await hass());
    this.applyTileIconStyle(brokerTileIcon, directive.style, context);
    await this.applyTileIconUix(brokerTileIcon, directive, context, config);
    this.placeTileIcon(tileIcon, target, directive.before !== undefined);
    this.refreshRetainedReferenceObservers();
    return tileIcon;
  }

  private async executeTooltip(directive: UixBrokerDirective, anchor: Element, context: BrokerContext) {
    const target = await this.resolveTooltipTarget(directive, anchor, context);
    if (!target) return;
    const parent = target.parentElement || target.parentNode;
    if (!parent) return;

    let brokerTooltip = this.tooltips.get(directive);
    if (brokerTooltip && (!brokerTooltip.element.isConnected || brokerTooltip.element.parentNode !== parent)) {
      this.removeTooltip(directive, brokerTooltip);
      brokerTooltip = undefined;
    }

    if (!brokerTooltip) {
      const tooltip = document.createElement("wa-tooltip") as BrokerTooltipElement;
      tooltip.setAttribute(BROKER_TOOLTIP_ATTR, "");
      stopTooltipHidePropagation(tooltip);
      brokerTooltip = { element: tooltip, target };
      this.retainTooltipTarget(target);
      this.tooltips.set(directive, brokerTooltip);
    } else if (brokerTooltip.target !== target) {
      this.releaseTooltipTarget(brokerTooltip.target);
      this.retainTooltipTarget(target);
      brokerTooltip.target = target;
    }

    const tooltip = brokerTooltip.element;
    (tooltip as any).for = target.id;
    const slot = target.getAttribute("slot");
    if (slot) tooltip.setAttribute("slot", slot);
    else tooltip.removeAttribute("slot");

    let content = Array.from(tooltip.children).find((child) =>
      child.hasAttribute(UIX_TOOLTIP_CONTENT_ATTR)
    ) as HTMLDivElement | undefined;
    if (!content) {
      content = document.createElement("div");
      content.setAttribute(UIX_TOOLTIP_CONTENT_ATTR, "");
      tooltip.appendChild(content);
    }
    const resolvedContent = resolveCaptured(directive.content ?? "", context.captured, context.results);
    if (typeof resolvedContent !== "string") throw new Error("tooltip directive content must be a string");
    content.innerHTML = resolvedContent;

    let style = Array.from(tooltip.children).find((child) =>
      child instanceof HTMLStyleElement && child.hasAttribute(UIX_TOOLTIP_STYLE_ATTR)
    ) as HTMLStyleElement | undefined;
    if (!style) {
      style = document.createElement("style");
      style.setAttribute(UIX_TOOLTIP_STYLE_ATTR, "");
      tooltip.appendChild(style);
    }
    style.textContent = UIX_TOOLTIP_CSS;

    const placement = resolveCaptured(directive.placement ?? "top", context.captured, context.results);
    if (typeof placement !== "string") throw new Error("tooltip directive placement must be a string");
    (tooltip as any).placement = placement;
    (tooltip as any).skidding = this.tooltipNumber(directive.skidding, 0, "skidding", context);
    (tooltip as any).distance = this.tooltipNumber(directive.distance, 8, "distance", context);
    (tooltip as any).showDelay = this.tooltipNumber(directive.show_delay, 150, "show_delay", context);
    (tooltip as any).hideDelay = this.tooltipNumber(directive.hide_delay, 150, "hide_delay", context);
    const withoutArrow = resolveCaptured(directive.without_arrow ?? false, context.captured, context.results);
    if (typeof withoutArrow !== "boolean") throw new Error("tooltip directive without_arrow must be a boolean");
    tooltip.toggleAttribute("without-arrow", withoutArrow);
    this.clearTooltipStyle(tooltip);
    tooltip.style.setProperty("display", "contents");
    this.applyTooltipStyle(tooltip, directive.style, context);

    if (tooltip.parentNode !== parent) parent.appendChild(tooltip);
    this.refreshRetainedReferenceObservers();
  }

  private clearTooltipStyle(tooltip: BrokerTooltipElement) {
    tooltip.uixBrokerStyleProperties?.forEach((property) => tooltip.style.removeProperty(property));
    tooltip.uixBrokerStyleProperties = [];
  }

  private applyTooltipStyle(tooltip: BrokerTooltipElement, style: unknown, context: BrokerContext) {
    if (style === undefined) return;
    const resolvedStyle = resolveCaptured(style, context.captured, context.results);
    if (!resolvedStyle || typeof resolvedStyle !== "object" || Array.isArray(resolvedStyle)) {
      throw new Error("tooltip directive style must be an object of CSS property names and values");
    }
    for (const [property, value] of Object.entries(resolvedStyle)) {
      if (!property.trim() || (typeof value !== "string" && typeof value !== "number")) {
        throw new Error("tooltip directive style values must be strings or numbers");
      }
      tooltip.style.setProperty(property, String(value));
      tooltip.uixBrokerStyleProperties!.push(property);
    }
  }

  private retainTooltipTarget(target: Element) {
    const existing = this.tooltipTargets.get(target);
    if (existing) {
      existing.references += 1;
      return;
    }

    const style = (target as HTMLElement).style;
    const state: BrokerTooltipTarget = {
      references: 1,
      pointerEventsValue: style.getPropertyValue("pointer-events"),
      pointerEventsPriority: style.getPropertyPriority("pointer-events"),
    };
    if (!target.id) {
      state.generatedId = `for-uix-broker-tooltip-${Math.random().toString(36).substring(2, 11)}`;
      target.id = state.generatedId;
    }
    style.setProperty("pointer-events", "auto");
    this.tooltipTargets.set(target, state);
  }

  private releaseTooltipTarget(target: Element) {
    const state = this.tooltipTargets.get(target);
    if (!state) return;
    state.references -= 1;
    if (state.references > 0) return;

    if (state.generatedId && target.id === state.generatedId) target.removeAttribute("id");
    const style = (target as HTMLElement).style;
    if (state.pointerEventsValue) {
      style.setProperty("pointer-events", state.pointerEventsValue, state.pointerEventsPriority);
    } else {
      style.removeProperty("pointer-events");
    }
    this.tooltipTargets.delete(target);
  }

  private removeTooltip(directive: UixBrokerDirective, tooltip: BrokerTooltip) {
    tooltip.element.remove();
    this.releaseTooltipTarget(tooltip.target);
    this.tooltips.delete(directive);
  }

  private tooltipNumber(value: unknown, defaultValue: number, name: string, context: BrokerContext): number {
    const resolved = resolveCaptured(value ?? defaultValue, context.captured, context.results);
    if (typeof resolved !== "number" || !Number.isFinite(resolved)) {
      throw new Error(`tooltip directive ${name} must be a finite number`);
    }
    return resolved;
  }

  private async resolveTooltipTarget(
    directive: UixBrokerDirective,
    anchor: Element,
    context: BrokerContext,
  ): Promise<Element | null> {
    const target = directive.for;
    if (target === undefined) return anchor;
    if (target === "previous") {
      if (!context.previousDirectiveElement?.isConnected) {
        throw new Error("tooltip directive for: previous requires a preceding element directive");
      }
      return context.previousDirectiveElement;
    }
    if (typeof target !== "string" || !target.trim()) {
      throw new Error("tooltip directive for must be previous or a non-empty path relative to the directive anchor");
    }
    const resolvedTarget = await this.waitForSelectTreeAnchor(target, anchor);
    if (!resolvedTarget) return null;
    if (!(resolvedTarget instanceof Element)) {
      throw new Error("tooltip directive for must resolve to an Element");
    }
    return resolvedTarget;
  }

  private async resolveButtonTarget(directive: UixBrokerDirective, anchor: Element): Promise<Element | null> {
    if (directive.after !== undefined && directive.before !== undefined) {
      throw new Error("button directive accepts either after or before, not both");
    }
    const path = directive.after ?? directive.before;
    if (path === undefined) return anchor;
    if (typeof path !== "string" || !path.trim()) {
      throw new Error("button directive after or before must be a non-empty path relative to the directive anchor");
    }
    return this.waitForSelectTreeAnchor(path, anchor);
  }

  private async resolveTileIconTarget(directive: UixBrokerDirective, anchor: Element): Promise<Element | null> {
    if (directive.after !== undefined && directive.before !== undefined) {
      throw new Error("tile-icon directive accepts either after or before, not both");
    }
    const path = directive.after ?? directive.before;
    if (path === undefined) return anchor;
    if (typeof path !== "string" || !path.trim()) {
      throw new Error("tile-icon directive after or before must be a non-empty path relative to the directive anchor");
    }
    return this.waitForSelectTreeAnchor(path, anchor);
  }

  private buttonConfig(
    directive: UixBrokerDirective,
    context: BrokerContext,
    anchor: Element,
  ): UixButtonConfig {
    const config = resolveCaptured({
      entity: directive.entity,
      icon: directive.icon,
      color: directive.color,
      label: directive.label,
      size: directive.size,
      variant: directive.variant,
      appearance: directive.appearance,
      start_icon: directive.start_icon,
      end_icon: directive.end_icon,
      tap_action: directive.tap_action,
      hold_action: directive.hold_action,
      double_tap_action: directive.double_tap_action,
    }, context.captured, context.results);
    this.setEventActionAnchor(config, anchor);
    return config;
  }

  private tileIconConfig(
    directive: UixBrokerDirective,
    context: BrokerContext,
    anchor: Element,
  ): UixTileIconConfig {
    const config = resolveCaptured({
      entity: directive.entity,
      icon: directive.icon,
      color: directive.color,
      icon_path: directive.icon_path,
      image_url: directive.image_url,
      tap_action: directive.tap_action,
      hold_action: directive.hold_action,
      double_tap_action: directive.double_tap_action,
    }, context.captured, context.results) as UixTileIconConfig;
    this.setEventActionAnchor(config, anchor);
    return config;
  }

  private setEventActionAnchor(
    config: Pick<UixButtonConfig & UixTileIconConfig, "tap_action" | "hold_action" | "double_tap_action">,
    anchor: Element,
  ) {
    for (const actionKey of ["tap_action", "hold_action", "double_tap_action"] as const) {
      const action = config[actionKey];
      if (action?.action !== "fire-dom-event") continue;
      const uix = action.uix ?? action.card_mod;
      if (uix?.action === "event") uix.anchor = anchor;
    }
  }

  private clearButtonStyle(button: BrokerButtonElement) {
    button.uixBrokerStyleProperties?.forEach((property) => button.style.removeProperty(property));
    button.uixBrokerStyleProperties = [];
  }

  private applyButtonStyle(button: BrokerButtonElement, style: unknown, context: BrokerContext) {
    if (style === undefined) return;
    const resolvedStyle = resolveCaptured(style, context.captured, context.results);
    if (!resolvedStyle || typeof resolvedStyle !== "object" || Array.isArray(resolvedStyle)) {
      throw new Error("button directive style must be an object of CSS property names and values");
    }
    for (const [property, value] of Object.entries(resolvedStyle)) {
      if (!property.trim() || (typeof value !== "string" && typeof value !== "number")) {
        throw new Error("button directive style values must be strings or numbers");
      }
      button.style.setProperty(property, String(value));
      button.uixBrokerStyleProperties.push(property);
    }
  }

  private async applyButtonUix(
    button: BrokerButtonElement,
    directive: UixBrokerDirective,
    context: BrokerContext,
    config: UixButtonConfig,
  ) {
    const uixConfig = resolveCaptured(directive.uix, context.captured, context.results) as UixConfig | undefined;
    await apply_uix(button as ModdedElement, "uix-broker-button", uixConfig, {
      config,
      directive: context.results,
    });
  }

  private clearTileIconStyle(tileIcon: BrokerTileIconElement) {
    tileIcon.uixBrokerStyleProperties?.forEach((property) => tileIcon.style.removeProperty(property));
    tileIcon.uixBrokerStyleProperties = [];
  }

  private applyTileIconStyle(tileIcon: BrokerTileIconElement, style: unknown, context: BrokerContext) {
    if (style === undefined) return;
    const resolvedStyle = resolveCaptured(style, context.captured, context.results);
    if (!resolvedStyle || typeof resolvedStyle !== "object" || Array.isArray(resolvedStyle)) {
      throw new Error("tile-icon directive style must be an object of CSS property names and values");
    }
    for (const [property, value] of Object.entries(resolvedStyle)) {
      if (!property.trim() || (typeof value !== "string" && typeof value !== "number")) {
        throw new Error("tile-icon directive style values must be strings or numbers");
      }
      tileIcon.style.setProperty(property, String(value));
      tileIcon.uixBrokerStyleProperties.push(property);
    }
  }

  private async applyTileIconUix(
    tileIcon: BrokerTileIconElement,
    directive: UixBrokerDirective,
    context: BrokerContext,
    config: UixTileIconConfig,
  ) {
    const uixConfig = resolveCaptured(directive.uix, context.captured, context.results) as UixConfig | undefined;
    await apply_uix(tileIcon as ModdedElement, "broker-tile-icon", uixConfig, {
      config,
      directive: context.results,
    });
  }

  private placeButton(wrapper: HTMLElement, target: Element, before: boolean) {
    const parent = target.parentNode;
    if (!parent) return;
    if (before) {
      if (wrapper.nextSibling !== target) parent.insertBefore(wrapper, target);
      return;
    }
    const nextSibling = target.nextSibling;
    if (nextSibling !== wrapper) parent.insertBefore(wrapper, nextSibling);
  }

  private placeTileIcon(tileIcon: HTMLElement, target: Element, before: boolean) {
    const parent = target.parentNode;
    if (!parent) return;
    if (before) {
      if (tileIcon.nextSibling !== target) parent.insertBefore(tileIcon, target);
      return;
    }
    const nextSibling = target.nextSibling;
    if (nextSibling !== tileIcon) parent.insertBefore(tileIcon, nextSibling);
  }

  private removeInsertedElements() {
    this.buttonWrappers.forEach((wrapper) => wrapper.remove());
    this.buttonWrappers.clear();
    this.tileIcons.forEach((tileIcon) => tileIcon.remove());
    this.tileIcons.clear();
    [...this.tooltips.entries()].forEach(([directive, tooltip]) => this.removeTooltip(directive, tooltip));
    this.refreshRetainedReferenceObservers();
  }
}

window.addEventListener("uix-bootstrap", (event: Event) => {
  event.stopPropagation();
  const broker = new UixBroker();
  (window as any).uixBroker = broker;
  void broker.provideHass();
  window.addEventListener("uix-broker-updated", (update: Event) => {
    broker.configure((update as CustomEvent).detail?.uix_broker ?? []);
  });
  const configured = (window as any).uixCoordinator?.broker;
  if (configured) broker.configure(configured);
});
