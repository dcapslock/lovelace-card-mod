export type UixBrokerRealm = "browser" | "shortcut" | "server";

/** A browser event name, or several browser event names for one interaction. */
export type UixBrokerListen = string | string[];

export type UixBrokerAnchor =
  | "target"
  | "<"
  | "<$"
  | `${string} <`
  | `${string} <$`
  | `${string} <$$`
  | `${string} < target`
  | `${string} <$ target`
  | `${string} <$$ target`
  | `&${string}`
  | { select_tree: string };

/** A select_tree anchor that can be written compactly or in long form. */
export type UixBrokerSelectTreeAnchor = string | { select_tree: string };

export type UixBrokerHostElementRule = {
  /** UIX host-element path evaluated against this rule's anchor. */
  match: string;
  /** Optional select_tree path, relative as a string or absolute with `&`/long form. */
  anchor?: UixBrokerSelectTreeAnchor;
};

export type UixBrokerTypedRule = {
  type: string;
  [key: string]: any;
};

export type UixBrokerPanelRule = {
  /** Matches a dot-separated property path on the current UIX panel object. */
  type: "panel";
  path?: string;
  /** Alias for path. */
  property?: string;
  /** Value matcher, with the same operators as captured-data rules. */
  match?: any;
  /** Alias for match. */
  value?: any;
};

export type UixBrokerHashRule = {
  /** Matches the browser URL fragment, excluding its leading `#`. */
  type: "hash";
  /** Value matcher, with the same operators as captured-data rules. */
  match?: any;
  /** Alias for match. */
  value?: any;
};

export type UixBrokerSearchRule = {
  /** Matches a named browser URL search parameter. */
  type: "search";
  /** Name of the URL search parameter to read. */
  path?: string;
  /** Value matcher, with the same operators as captured-data rules. */
  match?: any;
  /** Alias for match. */
  value?: any;
};

export type UixBrokerRule =
  | string
  | UixBrokerHostElementRule
  | UixBrokerPanelRule
  | UixBrokerHashRule
  | UixBrokerSearchRule
  | UixBrokerTypedRule;

export type UixBrokerEventTarget = "anchor" | "window" | "document";

export type UixBrokerDirective = {
  type: "block" | "action" | "property" | "event" | "call" | "button" | "template" | "javascript" | "wait";
  /** Optional conditions that must all match before this directive runs. Not supported by block. */
  rules?: UixBrokerRule[];
  /** Optional select_tree target for property, event, call, and button directives. */
  anchor?: UixBrokerSelectTreeAnchor;
  /** Event dispatch target. Applies only to event directives and defaults to anchor. */
  target?: UixBrokerEventTarget;
  /** Milliseconds to wait before applying the next directive. */
  wait?: number;
  [key: string]: any;
};

export interface UixBrokerInteraction {
  realm: UixBrokerRealm;
  listen: UixBrokerListen;
  anchor: UixBrokerAnchor;
  /** Defaults to true. Disabled interactions do not register event listeners. */
  enabled?: boolean;
  /** Set to false to ignore matching events while this interaction is running. */
  reentrant?: boolean;
  /** Log this interaction's lifecycle to the browser developer console. */
  debug?: boolean;
  rules?: UixBrokerRule[];
  directives: UixBrokerDirective[];
}

export interface UixBrokerConfig {
  uix_broker: UixBrokerInteraction[];
}
