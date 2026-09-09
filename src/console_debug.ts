/**
 * UIX Console Debug Helpers
 *
 * Three functions are attached to `window` for use in the browser DevTools console:
 *
 *   uix_tree($0)        – General helper: reports the UIX parent, active child paths and
 *                         all element paths available for styling within the UIX parent's
 *                         subtree.
 *
 *   uix_style_path($0)  – Specific helper: reports the UIX path from the UIX parent to the
 *                         selected element, CSS targeting info within its shadow root and a
 *                         boilerplate UIX YAML snippet.
 *
 *   uix_path($0)        – Shorthand alias for uix_style_path().
 *
 *   uix_forge_path($0)  – Forge helper: reports the path from the closest uix-forge parent's
 *                         forged element to the selected element, for use as the `for`,
 *                         `before`, or `after` value in a forge spark config.
 *
 *   uix_broker_path($0) – Broker helper: reports the select_tree path from the closest recent
 *                         resolved Broker interaction anchor to the selected element, for use
 *                         as a property or event directive `anchor`.
 *
 *   uix_broker_absolute_path($0) – Broker helper: reports a compact select_tree path from the
 *                         document root to the selected element, ready for an interaction `anchor`.
 */

interface UixParentInfo {
  element: Element;
  uixNodes: any[];
  primaryType: string;
}

// ---------------------------------------------------------------------------
// Utility: traverse the DOM upward, crossing shadow-root boundaries
// ---------------------------------------------------------------------------

function* domAncestorsAndSelf(el: Node): Generator<Node> {
  let current: Node = el;
  while (current) {
    yield current;
    if (current.parentNode) {
      current = current.parentNode;
    } else if ((current as ShadowRoot).host) {
      // Cross shadow-root boundary
      current = (current as ShadowRoot).host;
    } else {
      break;
    }
  }
}

// Walk upward from the target to confirm it is actually inside the provided
// UIX/forge scope, which may be either an element boundary or a shadow root.
function isNodeWithinScope(target: Element, scope: Element | ShadowRoot): boolean {
  for (const node of domAncestorsAndSelf(target)) {
    if (node === scope) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Find the closest ancestor (or self) that has a non-child UIX node
// ---------------------------------------------------------------------------

function findUixParent(element: Element): UixParentInfo | null {
  for (const node of domAncestorsAndSelf(element)) {
    if (!(node instanceof Element)) continue;
    const uixNodes: any[] = (node as any)._uix ?? [];
    const nonChild = uixNodes.filter(
      (u: any) => u.type && !u.type.endsWith("-child")
    );
    // Only match a UIX parent when the target is inside the scope of one of
    // its non-child uix-nodes. When multiple nodes exist on one host (for
    // example ha-drawer shadow + light DOM contexts), keep the matching node
    // first so later context-dependent helpers resolve correctly.
    const matchingUix = nonChild.find((u: any) =>
      isNodeWithinScope(element, uixContext(node, [u]))
    );
    if (matchingUix) {
      const orderedUixNodes = [
        matchingUix,
        ...nonChild.filter((u: any) => u !== matchingUix),
      ];
      return {
        element: node,
        uixNodes: orderedUixNodes,
        primaryType: matchingUix.type,
      };
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Build a CSS selector string for a single element
// ---------------------------------------------------------------------------

// Returns false for IDs that appear auto-generated (e.g. "wa-dropdown-trigger-mN3vlGLuTVbO3N4eJ1k5I").
// An ID segment is treated as auto-generated when it is 8+ characters long and contains
// both upper- and lower-case letters, which is the hallmark of random/hashed identifiers.
function isStableId(id: string): boolean {
  return !id.split("-").some(
    (seg) => seg.length >= 8 && /[A-Z]/.test(seg) && /[a-z]/.test(seg)
  );
}

function buildSelector(el: Element): string {
  const tag = el.localName;

  // ID is the most specific and unambiguous selector — but only if it looks stable.
  if (el.id && isStableId(el.id)) return `${tag}#${el.id}`;

  const parent = el.parentNode as ParentNode | null;
  const sameSiblings = parent
    ? Array.from(parent.children ?? []).filter(
        (s: Element) => s !== el && s.localName === tag
      )
    : [];

  if (sameSiblings.length === 0) {
    // No disambiguation needed.
    // For custom elements (tag includes "-") the tag name alone is usually unique.
    if (tag.includes("-")) return tag;
    // For plain HTML elements add the first meaningful class, if any.
    const firstClass = Array.from(el.classList).find((c) => c.length > 0);
    return firstClass ? `${tag}.${firstClass}` : tag;
  }

  // Disambiguation: try a unique class first, then fall back to :nth-of-type.
  const uniqueClass = Array.from(el.classList).find(
    (c) => !sameSiblings.some((s: Element) => s.classList.contains(c))
  );
  if (uniqueClass) return `${tag}.${uniqueClass}`;

  const allSame = parent
    ? Array.from(parent.children ?? []).filter(
        (s: Element) => s.localName === tag
      )
    : [el];
  // Include any class as a qualifier alongside :nth-of-type to narrow
  // querySelectorAll scope and avoid false matches at different nesting
  // levels when intermediate elements are pruned (e.g. in buildForgeSelectorPath).
  const sharedClass = Array.from(el.classList).find((c) => c.length > 0);
  const classQualifier = sharedClass ? `.${sharedClass}` : "";
  return `${tag}${classQualifier}:nth-of-type(${allSame.indexOf(el) + 1})`;
}

// ---------------------------------------------------------------------------
// The "UIX context" for a parent element is determined by where the uix-nodes
// are actually placed:
//   - Inside the shadow root  (apply_uix called with shadow=true, the default):
//       the shadow root is the context.
//   - Inside the element itself (apply_uix called with shadow=false, used for
//       dialogs, sidebar, view, etc.):
//       the element itself is the context, and its shadow root (if any) is
//       crossed via the "$" path key.
// ---------------------------------------------------------------------------

function uixContext(uixParentEl: Element, uixNodes?: any[]): Element | ShadowRoot {
  if (uixNodes && uixNodes.length > 0) {
    const parent = uixNodes[0].parentNode;
    if (parent instanceof ShadowRoot) return parent;
    if (parent instanceof Element) return parent;
  }
  return uixParentEl.shadowRoot ?? uixParentEl;
}

// ---------------------------------------------------------------------------
// UIX types that are theme-only: they are applied by UIX internally and cannot
// be targeted via a card-level `uix:` key.  uix_path should show theme YAML
// boilerplate for these types rather than card YAML.
// ---------------------------------------------------------------------------

const THEME_UIX_TYPES = new Set([
  "dialog", "root", "view", "more-info", "sidebar",
  "config", "panel-custom", "top-app-bar-fixed",
  "calendar", "history", "profile", "todo", "persistent-notification",
  "drawer", "state-history-charts"
]);

// ---------------------------------------------------------------------------
// Build the UIX YAML path key and matching CSS selector for a target element.
//
// The path KEY stops at the last shadow-root crossing (ends with "$"), so the
// CSS value injected at that key can target the element using a plain selector.
// When no shadow root is crossed between the UIX parent context and the target,
// the key is "." (the UIX parent itself) and the CSS selector covers the full
// element chain from that context.
// ---------------------------------------------------------------------------

interface PathAndSelector {
  /** YAML path key – ends at the last shadow-root boundary or "." */
  pathKey: string;
  /** CSS selector to use inside the style string at pathKey */
  cssSelector: string;
}

function buildPathKeyAndCssSelector(
  uixParentEl: Element,
  targetEl: Element,
  uixNodes?: any[]
): PathAndSelector | null {
  if (targetEl === uixParentEl) {
    return { pathKey: ".", cssSelector: ":host" };
  }

  const ctx = uixContext(uixParentEl, uixNodes);
  type Segment = { kind: "element"; sel: string } | { kind: "shadow" };
  const segments: Segment[] = [];
  let current: Node = targetEl;

  while (current && current !== ctx) {
    if (current instanceof ShadowRoot) {
      segments.unshift({ kind: "shadow" });
      current = current.host;
    } else if (current instanceof Element) {
      if (current.localName !== "uix-node") {
        segments.unshift({ kind: "element", sel: buildSelector(current) });
      }
      current = current.parentNode ?? null;
    } else {
      current = (current as any).parentNode ?? null;
    }
  }

  if (current !== ctx) return null;

  // Find the last shadow-root crossing in the walk
  let lastShadowIdx = -1;
  for (let i = segments.length - 1; i >= 0; i--) {
    if (segments[i].kind === "shadow") {
      lastShadowIdx = i;
      break;
    }
  }

  if (lastShadowIdx === -1) {
    // No shadow crossing – use "." as the key; CSS targets the element directly
    const cssSelector =
      segments
        .filter((s): s is { kind: "element"; sel: string } => s.kind === "element")
        .map((s) => s.sel)
        .join(" ")
        .trim() || targetEl.localName;
    return { pathKey: ".", cssSelector };
  }

  // Path key: only the shadow host (element immediately before each "$") plus "$".
  // Intermediate elements between shadow-root crossings are omitted so the key
  // stays as short as possible, e.g. "ha-select $ ha-picker-field $" rather than
  // "hui-generic-entity-row ha-select $ ha-dropdown ha-picker-field $".
  const keyParts: string[] = [];
  for (let i = 0; i <= lastShadowIdx; i++) {
    const seg = segments[i];
    if (seg.kind === "shadow") {
      keyParts.push("$");
    } else if (i + 1 <= lastShadowIdx && segments[i + 1].kind === "shadow") {
      // Only include an element segment when it is the direct host of the next "$"
      keyParts.push(seg.sel);
    }
    // Otherwise skip: intermediate elements before a shadow boundary are dropped
  }
  const pathKey = keyParts.join(" ").trim();

  // CSS selector: the element chain after the last "$"
  const afterShadow = segments.slice(lastShadowIdx + 1);
  const cssSelector =
    afterShadow
      .filter((s): s is { kind: "element"; sel: string } => s.kind === "element")
      .map((s) => s.sel)
      .join(" ")
      .trim() || targetEl.localName;

  return { pathKey, cssSelector };
}

// ---------------------------------------------------------------------------
// Collect all style groups reachable from the UIX parent context, up to
// (but not including) the next UIX parent boundary.
//
// Each group corresponds to a YAML path key (stopping at the last shadow-root
// crossing, i.e. ending with "$", or "." for the root context).  The selectors
// in the group are valid CSS within the style string for that key.
// ---------------------------------------------------------------------------

interface CssSelectorEntry {
  /** CSS selector within the shadow context */
  selector: string;
  /** The DOM element this selector targets, for inspector linking */
  element: Element;
}

interface StyleGroup {
  /** YAML path key – ends at the last shadow-root boundary or "." */
  pathKey: string;
  /** CSS selector entries (selector + element reference) within that shadow context */
  cssSelectors: CssSelectorEntry[];
}

// Limit traversal depth to avoid spending excessive time on deeply-nested
// shadow DOM trees while still covering the most common two-to-three level
// hierarchies found in Home Assistant cards.
const MAX_TRAVERSAL_DEPTH = 6;

function collectSubtreeGroups(uixParentEl: Element, uixNodes?: any[]): StyleGroup[] {
  // Preserve insertion order so groups appear top-down as encountered.
  const groups = new Map<string, CssSelectorEntry[]>();
  const visited = new WeakSet<Element>();

  function getGroup(pathKey: string): CssSelectorEntry[] {
    let group = groups.get(pathKey);
    if (!group) {
      group = [];
      groups.set(pathKey, group);
    }
    return group;
  }

  /**
   * @param node        - current DOM node being iterated
   * @param shadowParts - path segments that form the path KEY (up to + incl. last "$")
   * @param cssParts    - CSS selector parts within the current shadow context
   * @param depth       - recursion guard
   */
  function traverse(
    node: Element | ShadowRoot,
    shadowParts: string[],
    cssParts: string[],
    depth: number
  ) {
    if (depth > MAX_TRAVERSAL_DEPTH) return;
    for (const child of Array.from((node as ParentNode).children ?? [])) {
      if (child.localName === "uix-node") continue;
      if (child.localName === "style") continue;
      if (visited.has(child)) continue;
      visited.add(child);

      const sel = buildSelector(child);
      const newCssParts = [...cssParts, sel];
      const pathKey = shadowParts.join(" ").trim() || ".";
      getGroup(pathKey).push({ selector: newCssParts.join(" ").trim(), element: child });

      // Do not descend into another UIX parent (different styling boundary)
      const isNextUixParent = ((child as any)._uix ?? []).some(
        (u: any) => u.type && !u.type.endsWith("-child")
      );
      if (!isNextUixParent) {
        if (child.shadowRoot) {
          // Entering a shadow root: the path key only records the direct shadow host
          // (the element immediately before "$"), not the full intermediate chain.
          // This produces concise keys like "ha-select $ ha-picker-field $" rather
          // than "hui-generic-entity-row ha-select $ ha-dropdown ha-picker-field $".
          const newShadowParts = [...shadowParts, sel, "$"];
          traverse(child.shadowRoot, newShadowParts, [], depth + 1);
        }
        traverse(child, shadowParts, newCssParts, depth + 1);
      }
    }
  }

  const ctx = uixContext(uixParentEl, uixNodes);
  if (ctx instanceof Element && ctx.shadowRoot) {
    // The uix-node lives in the element itself (shadow=false).  The element's
    // shadow root is reached from style YAML via the "$" path key.
    traverse(ctx.shadowRoot, ["$"], [], 0);
  } else {
    // ctx is the shadow root (shadow=true) or an element with no shadow root –
    // traverse directly from ctx with no initial path prefix.
    traverse(ctx, [], [], 0);
  }
  return Array.from(groups.entries()).map(([pathKey, cssSelectors]) => ({
    pathKey,
    cssSelectors,
  }));
}

// ---------------------------------------------------------------------------
// Resolve the actively-styled child paths tracked on a UIX node.
// uix_children is Record<path, Promise<Array<Promise<Uix>>>>
// ---------------------------------------------------------------------------

async function getActiveChildren(
  uixParent: UixParentInfo
): Promise<Array<{ path: string; elements: Element[] }>> {
  const results: Array<{ path: string; elements: Element[] }> = [];

  for (const uixNode of uixParent.uixNodes) {
    for (const [path, promise] of Object.entries(
      (uixNode.uix_children as Record<string, Promise<Array<Promise<any>>>>) ??
        {}
    )) {
      try {
        const arr = await promise;
        const elements: Element[] = [];
        if (arr) {
          for (const p of arr) {
            const u = await p.catch(() => null);
            if (!u) continue;
            // The uix-node is inside the child element's shadow root (or the
            // element itself), so the actual styled element is the host.
            const host =
              u.parentNode instanceof ShadowRoot
                ? u.parentNode.host
                : u.parentElement;
            if (host) elements.push(host as Element);
          }
        }
        results.push({ path, elements });
      } catch {
        // Skip failed promises
      }
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Find the closest ancestor (or self) that is a uix-forge element
// ---------------------------------------------------------------------------

interface UixForgeParentInfo {
  forgeEl: Element;
  forgedEl: Element | null;
}

function findUixForgeParent(element: Element): UixForgeParentInfo | null {
  for (const node of domAncestorsAndSelf(element)) {
    if (!(node instanceof Element)) continue;
    if (node.localName === "uix-forge") {
      const forgedEl: Element | null = (node as any).forgedElement ?? null;
      if (forgedEl && isNodeWithinScope(element, forgedEl)) {
        return { forgeEl: node, forgedEl };
      }
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Build a full forge selector path from rootEl (the forgedElement) to targetEl.
//
// The path is a space/dollar-separated string suitable for use as the `for`,
// `before`, or `after` attribute of a forge spark.  It uses the same `$`
// shadow-root crossing syntax as selectTree / UIX style keys, but unlike
// buildPathKeyAndCssSelector it returns the complete path starting from
// rootEl itself (not from rootEl's shadow-root context).
// ---------------------------------------------------------------------------

function buildForgeSelectorPath(rootEl: Element, targetEl: Element): string | null {
  if (targetEl === rootEl) {
    // The special "element" keyword in forge refers to the forged element itself.
    return "element";
  }

  type Segment = { kind: "element"; sel: string } | { kind: "shadow" };
  const segments: Segment[] = [];
  let current: Node = targetEl;

  while (current && current !== rootEl) {
    if (current instanceof ShadowRoot) {
      segments.unshift({ kind: "shadow" });
      current = current.host;
    } else if (current instanceof Element) {
      if (current.localName !== "uix-node") {
        segments.unshift({ kind: "element", sel: buildSelector(current) });
      }
      current = current.parentNode ?? null;
    } else {
      // Text nodes, Comment nodes, etc. — just step to their parent.
      current = (current as any).parentNode ?? null;
    }
  }

  if (current !== rootEl) return null;

  // Build a concise selectTree path:
  // – keep only the element directly preceding each "$" (shadow-root crossing)
  // – drop all intermediate light DOM elements before the target
  // – always append just the target element as the final step
  //
  // Because the walk unshifts from targetEl upward, segments[segments.length - 1]
  // is always the targetEl's own selector — so we stop the loop one short and
  // append it explicitly.
  const parts: string[] = [];
  for (let i = 0; i < segments.length - 1; i++) {
    const seg = segments[i];
    if (seg.kind === "shadow") {
      parts.push("$");
    } else if (segments[i + 1].kind === "shadow") {
      // Element directly before a shadow-root crossing — keep it.
      parts.push(seg.sel);
    }
    // Otherwise: intermediate light DOM element — drop for conciseness.
  }

  // Append the direct target selector as the final step.
  parts.push(buildSelector(targetEl));

  return parts.join(" ").trim() || null;
}

// ---------------------------------------------------------------------------
// Build a complete select_tree path from an interaction anchor to a target.
// Unlike the concise forge helper, this keeps light-DOM ancestor selectors so
// the resulting directive anchor remains precise when similar elements exist.
// ---------------------------------------------------------------------------

function buildBrokerSelectorPath(rootEl: Element, targetEl: Element): string | null {
  if (targetEl === rootEl) return "";

  type Segment = { kind: "element"; sel: string } | { kind: "shadow" };
  const segments: Segment[] = [];
  let current: Node = targetEl;

  while (current && current !== rootEl) {
    if (current instanceof ShadowRoot) {
      segments.unshift({ kind: "shadow" });
      current = current.host;
    } else if (current instanceof Element) {
      if (current.localName !== "uix-node") {
        segments.unshift({ kind: "element", sel: buildSelector(current) });
      }
      current = current.parentNode ?? null;
    } else {
      current = (current as any).parentNode ?? null;
    }
  }

  if (current !== rootEl) return null;
  return segments.map((segment) => segment.kind === "shadow" ? "$" : segment.sel).join(" ");
}

function buildAbsoluteBrokerSelectorPath(targetEl: Element): string | null {
  type Segment = { kind: "element"; sel: string } | { kind: "shadow" };
  const segments: Segment[] = [];
  let current: Node = targetEl;

  while (current && current !== document) {
    if (current instanceof ShadowRoot) {
      segments.unshift({ kind: "shadow" });
      current = current.host;
    } else if (current instanceof Element) {
      if (current.localName !== "uix-node") {
        segments.unshift({ kind: "element", sel: buildSelector(current) });
      }
      current = current.parentNode ?? null;
    } else {
      current = (current as any).parentNode ?? null;
    }
  }

  if (current !== document) return null;

  const parts: string[] = [];
  const lastShadowIndex = segments.map((segment) => segment.kind).lastIndexOf("shadow");
  for (let i = 0; i < segments.length - 1; i++) {
    const segment = segments[i];
    if (segment.kind === "shadow") {
      parts.push("$");
    } else if (segments[i + 1].kind === "shadow") {
      parts.push(segment.sel);
    } else if (i > lastShadowIndex) {
      parts.push(segment.sel);
    }
  }
  parts.push(buildSelector(targetEl));
  return parts.join(" ").trim() || null;
}

function distanceToAncestor(target: Element, ancestor: Element): number | null {
  let distance = 0;
  for (const node of domAncestorsAndSelf(target)) {
    if (node === ancestor) return distance;
    distance++;
  }
  return null;
}



(window as any).uix_tree = async function uix_tree(element: Element) {
  if (!element) {
    console.error(
      "UIX Debug: provide a DOM element – e.g. uix_tree($0) where $0 is the element selected in the Elements panel."
    );
    return;
  }

  const TITLE_STYLE = "color: white; background-color: #CE3226; padding: 2px 5px; font-weight: bold; border-radius: 5px;";
  const SECTION_STYLE = "color:#888;font-weight:bold;";
  console.group("%c💡 UIX Tree 💡", TITLE_STYLE);
  console.log("Target element:", element);

  const parent = findUixParent(element);
  if (!parent) {
    console.warn("No UIX parent found for this element.");
    console.groupEnd();
    return;
  }

  // --- UIX Parent ---
  // Use a styled log instead of a nested group to avoid Chrome DevTools nesting bugs.
  console.log("%c📦 Closest UIX Parent", SECTION_STYLE);
  console.log("  Element:", parent.element);
  console.log("  Variables: ", parent.uixNodes[0].variables ?? {});
  console.log("  UIX type:", parent.primaryType);
  if (parent.uixNodes.length > 1)
    console.log("  All UIX nodes on this element:", parent.uixNodes);

  // --- Active UIX Children ---
  const children = await getActiveChildren(parent);
  const pl = (n: number, word: string) => `${n} ${word}${n !== 1 ? "s" : ""}`;
  if (children.length > 0) {
    console.log(
      `%c👶 Active UIX Children  (${pl(children.length, "path")})`,
      SECTION_STYLE
    );
    for (const { path, elements } of children) {
      if (elements.length === 1) {
        console.log(`  "${path}"  →`, elements[0]);
      } else if (elements.length > 1) {
        console.groupCollapsed(`  "${path}"  (${elements.length} elements)`);
        elements.forEach((el) => console.log(el));
        console.groupEnd();
      } else {
        console.log(`  "${path}"  (no resolved elements)`);
      }
    }
  } else {
    console.log("%c👶 Active UIX Children: none", SECTION_STYLE);
  }

  // --- Available YAML Selectors ---
  const groups = collectSubtreeGroups(parent.element, parent.uixNodes);
  const totalSelectors = groups.reduce((n, g) => n + g.cssSelectors.length, 0);
  console.log(
    `%c🗺️ Available YAML Selectors  (${pl(groups.length, "YAML selector")}, ${pl(totalSelectors, "CSS selector")})`,
    SECTION_STYLE
  );
  console.log(
    "  Each group is a YAML style key; CSS selectors inside are valid within that key's style string:"
  );
  for (const { pathKey, cssSelectors } of groups) {
    console.groupCollapsed(`  "${pathKey}":  (${pl(cssSelectors.length, "CSS selector")})`);
    cssSelectors.forEach(({ selector, element: el }) => console.log(`  ${selector}`, el));
    console.groupEnd();
  }

  console.groupEnd();
};

// ---------------------------------------------------------------------------
// uix_style_path($0) – Specific UIX style path helper
// uix_path($0)       – Shorthand alias for uix_style_path()
// ---------------------------------------------------------------------------

(window as any).uix_style_path = function uix_style_path(element: Element) {
  if (!element) {
    console.error(
      "UIX Debug: provide a DOM element – e.g. uix_style_path($0) where $0 is the element selected in the Elements panel."
    );
    return;
  }

  if (element instanceof ShadowRoot) {
    console.error("UIX Debug: please select an element, not a shadow root.");
    return;
  }

  const TITLE_STYLE = "color: white; background-color: #CE3226; padding: 2px 5px; font-weight: bold; border-radius: 5px;";
  const SECTION_STYLE = "color:#888;font-weight:bold;";
  console.group("%c💡 UIX Style Path 💡", TITLE_STYLE);
  console.log("Target element:", element);

  const parent = findUixParent(element);
  if (!parent) {
    console.warn("No UIX parent found for this element.");
    console.groupEnd();
    return;
  }

  // --- UIX Parent ---
  // Use a styled log instead of a nested group to avoid Chrome DevTools nesting bugs.
  console.log("%c📦 Closest UIX Parent", SECTION_STYLE);
  console.log("  Element:", parent.element);
  console.log("  Variables: ", parent.uixNodes[0].variables ?? {});
  console.log("  UIX type:", parent.primaryType);

  // --- Path key and CSS selector ---
  const result = buildPathKeyAndCssSelector(parent.element, element, parent.uixNodes);
  if (result === null) {
    console.warn(
      "Could not build a path: the element may not be a descendant of the UIX parent."
    );
    console.groupEnd();
    return;
  }

  const { pathKey, cssSelector } = result;

  console.log("%c📍 UIX Path to Target", SECTION_STYLE);
  console.log("  Path:", `"${pathKey}":`);

  // --- CSS target info ---
  console.log("%c🎨 CSS Target", SECTION_STYLE);
  console.log("  Tag:", element.localName);
  if (element.id) console.log("  ID:", `#${element.id}`);
  if (element.classList?.length > 0) {
    console.log(
      "  Classes:",
      Array.from(element.classList)
        .map((c) => `.${c}`)
        .join("  ")
    );
  }
  console.log("  Suggested CSS selector:", cssSelector, element);

  // --- Boilerplate YAML ---
  const isThemeType = THEME_UIX_TYPES.has(parent.primaryType);
  const themeKey = `uix-${parent.primaryType}`;
  const localName = element.localName;

  function buildCardYaml(): string {
    if (pathKey === ".") {
      return (
        `uix:\n` +
        `  style: |\n` +
        `    ${cssSelector} {\n` +
        `      /* your styles for ${localName} */\n` +
        `    }`
      );
    }
    return (
      `uix:\n` +
      `  style:\n` +
      `    "${pathKey}": |\n` +
      `      ${cssSelector} {\n` +
      `        /* your styles for ${localName} */\n` +
      `      }`
    );
  }

  function buildThemeYaml(): string {
    if (pathKey === ".") {
      return (
        `my-awesome-theme:\n` +
        `  uix-theme: my-awesome-theme\n` +
        `  ${themeKey}: |\n` +
        `    ${cssSelector} {\n` +
        `      /* your styles for ${localName} */\n` +
        `    }`
      );
    }
    return (
      `my-awesome-theme:\n` +
      `  uix-theme: my-awesome-theme\n` +
      `  ${themeKey}-yaml: |\n` +
      `    "${pathKey}": |\n` +
      `      ${cssSelector} {\n` +
      `        /* your styles for ${localName} */\n` +
      `      }`
    );
  }

  if (isThemeType) {
    console.log("%c📝 Boilerplate Theme YAML", SECTION_STYLE);
    console.log(buildThemeYaml());
  } else {
    console.log("%c📝 Boilerplate UIX YAML", SECTION_STYLE);
    console.log(buildCardYaml());
    console.log("%c📝 Boilerplate Theme YAML", SECTION_STYLE);
    console.log(buildThemeYaml());
  }

  console.groupEnd();
};

// uix_path is a shorthand alias for uix_style_path.
(window as any).uix_path = (window as any).uix_style_path;

// ---------------------------------------------------------------------------
// uix_forge_path($0) – UIX Forge path helper
// ---------------------------------------------------------------------------

(window as any).uix_forge_path = function uix_forge_path(element: Element) {
  if (!element) {
    console.error(
      "UIX Debug: provide a DOM element – e.g. uix_forge_path($0) where $0 is the element selected in the Elements panel."
    );
    return;
  }

  const TITLE_STYLE = "color: white; background-color: #CE3226; padding: 2px 5px; font-weight: bold; border-radius: 5px;";
  const SECTION_STYLE = "color:#888;font-weight:bold;";
  console.group("%c💡 UIX Forge Path 💡", TITLE_STYLE);
  console.log("Target element:", element);

  const info = findUixForgeParent(element);
  if (!info) {
    console.warn("No uix-forge parent found for this element.");
    console.groupEnd();
    return;
  }

  const { forgeEl, forgedEl } = info;

  // --- UIX Forge Parent ---
  console.log("%c📦 Closest UIX Forge Parent", SECTION_STYLE);
  console.log("  Element:", forgeEl);

  if (!forgedEl) {
    console.warn("The uix-forge element has no forged element yet (templates may still be loading).");
    console.groupEnd();
    return;
  }

  // --- Forge Path ---
  const forgePath = buildForgeSelectorPath(forgedEl, element);
  if (forgePath === null) {
    console.warn(
      "Could not build a forge path: the element may not be a descendant of the forged element."
    );
    console.groupEnd();
    return;
  }

  console.log("%c📍 Forge Path to Target", SECTION_STYLE);
  console.log("  Path:", `"${forgePath}"`);
  console.log("  Use this path as the value of `for`, `before`, or `after` in a spark config.");

  // --- Boilerplate Spark YAML ---
  const yaml =
    `forge:\n` +
    `  sparks:\n` +
    `    - type: tooltip\n` +
    `      for: "${forgePath}"\n` +
    `      content: "..."\n` +
    `    # for tile-icon / state-badge sparks:\n` +
    `    # - type: tile-icon\n` +
    `    #   before: "${forgePath}"\n` +
    `    #   icon: mdi:home`;

  console.log("%c📝 Boilerplate Spark YAML", SECTION_STYLE);
  console.log(yaml);

  console.groupEnd();
};

// ---------------------------------------------------------------------------
// uix_broker_path($0[, interactionAnchor]) – Broker directive-anchor helper
// ---------------------------------------------------------------------------

(window as any).uix_broker_path = function uix_broker_path(
  element: Element,
  interactionAnchor?: Element,
) {
  if (!element || !(element instanceof Element)) {
    console.error(
      "UIX Broker: provide a DOM element – e.g. uix_broker_path($0) where $0 is selected in the Elements panel."
    );
    return null;
  }

  const broker = (window as any).uixBroker;
  const entries = Array.isArray(broker?.recentAnchors) ? broker.recentAnchors : [];
  const candidates = interactionAnchor instanceof Element
    ? [{ anchor: interactionAnchor, distance: distanceToAncestor(element, interactionAnchor), resolvedAt: Date.now() }]
    : entries
      .filter((entry: any) => entry?.anchor instanceof Element && entry.anchor.isConnected)
      .map((entry: any) => ({
        ...entry,
        distance: distanceToAncestor(element, entry.anchor),
      }))
      .filter((entry: any) => entry.distance !== null)
      .sort((a: any, b: any) => a.distance - b.distance || b.resolvedAt - a.resolvedAt);

  const candidate = candidates[0];
  const TITLE_STYLE = "color: white; background-color: #CE3226; padding: 2px 5px; font-weight: bold; border-radius: 5px;";
  const SECTION_STYLE = "color:#888;font-weight:bold;";
  console.group("%c💡 UIX Broker Path 💡", TITLE_STYLE);
  console.log("Target element:", element);

  if (!candidate || candidate.distance === null) {
    console.warn(
      "No recent Broker interaction anchor contains this element. Trigger the interaction first, or pass an explicit anchor: uix_broker_path($0, $1)."
    );
    if (entries.length) console.log("Recent Broker anchors:", entries);
    console.groupEnd();
    return null;
  }

  const path = buildBrokerSelectorPath(candidate.anchor, element);
  if (path === null) {
    console.warn("Could not build a relative Broker path for this target.");
    console.groupEnd();
    return null;
  }

  console.log("%c📦 Interaction Anchor", SECTION_STYLE);
  console.log("  Element:", candidate.anchor);
  console.log("%c📍 Directive Anchor Path", SECTION_STYLE);
  if (!path) {
    console.log("  Target is the interaction anchor; omit the directive anchor.");
  } else {
    console.log("  Path:", `\"${path}\"`);
    console.log("%c📝 Directive YAML", SECTION_STYLE);
    console.log(`anchor: \"${path}\"`);
  }
  console.groupEnd();
  return path || null;
};

// ---------------------------------------------------------------------------
// uix_broker_absolute_path($0) – Broker interaction-anchor helper
// ---------------------------------------------------------------------------

(window as any).uix_broker_absolute_path = function uix_broker_absolute_path(element: Element) {
  if (!element || !(element instanceof Element)) {
    console.error(
      "UIX Broker: provide a DOM element – e.g. uix_broker_absolute_path($0) where $0 is selected in the Elements panel."
    );
    return null;
  }

  const path = buildAbsoluteBrokerSelectorPath(element);
  const TITLE_STYLE = "color: white; background-color: #CE3226; padding: 2px 5px; font-weight: bold; border-radius: 5px;";
  const SECTION_STYLE = "color:#888;font-weight:bold;";
  console.group("%c💡 UIX Broker Absolute Path 💡", TITLE_STYLE);
  console.log("Target element:", element);

  if (!path) {
    console.warn("Could not build a document-root Broker path for this target.");
    console.groupEnd();
    return null;
  }

  const anchor = `&${path}`;
  console.log("%c📍 Interaction Anchor Path", SECTION_STYLE);
  console.log("  Path:", `\"${anchor}\"`);
  console.log("%c📝 Interaction YAML", SECTION_STYLE);
  console.log(`anchor: \"${anchor}\"`);
  console.groupEnd();
  return anchor;
};
