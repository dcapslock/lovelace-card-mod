import { Unpromise } from "@watchable/unpromise";
import { hass } from "./helpers/hass";
import { apply_uix } from "./helpers/apply_uix";

/**
 * How long (ms) to wait after a style-render event or `uix-update` before
 * reading CSS variables.  Gives the UIX async rendering pipeline time to
 * flush before we call `getComputedStyle`.
 */
export const BACKGROUND_REFRESH_DELAY_MS = 500;

/**
 * How long (ms) to wait for `ha-camera-stream` to be registered before giving
 * up and skipping the camera background.
 */
const CAMERA_ELEMENT_LOAD_TIMEOUT_MS = 15_000;

/**
 * How long (ms) to keep the spinner as a fallback before forcibly removing it.
 * Covers error cases where the stream / video never fires a ready event.
 */
const SPINNER_FALLBACK_MS = 30_000;

/** CSS variable that selects the camera entity for a view background stream. */
const VAR_CAMERA = "--uix-view-background-camera-entity";

/** CSS variable that selects any entity whose entity_picture is the background. */
const VAR_IMAGE = "--uix-view-background-image-entity";

/** CSS variable for a plain video URL (standard <video> element). */
const VAR_VIDEO = "--uix-view-background-video";

/** CSS variable for a plain image URL (CSS background-image). */
const VAR_PLAIN_IMAGE = "--uix-view-background-image";

/**
 * CSS variable for a full CSS `background` shorthand value.
 * The user is responsible for URL handling, background-size, etc.
 * The value is applied directly to the `background` property of the same div
 * used for the plain-image variant.
 */
const VAR_BACKGROUND = "--uix-view-background";

/**
 * CSS variable controlling how much of the viewport the background covers.
 *
 *   full  — the background fills the entire viewport, sitting behind the
 *            topbar and sidebar.
 *   view  — (default) the background fills only the content area, offset by
 *            --header-height at the top and the sidebar width on the left.
 */
const VAR_COVER = "--uix-view-background-cover";

/** CSS custom property names for camera zoom / pan. */
const CAMERA_ZOOM_VAR = "--uix-camera-zoom";
const CAMERA_PAN_X_VAR = "--uix-camera-pan-x";
const CAMERA_PAN_Y_VAR = "--uix-camera-pan-y";

/** CSS custom property for camera position (e.g. center, top, bottom-right). */
const CAMERA_POSITION_VAR = "--uix-camera-position";

/**
 * Internal CSS custom property names written to the camera container as inline
 * styles by `_syncCameraTransformVars`.  They drive the flex alignment in
 * CAMERA_TRANSFORM_CSS and are not part of the public API.
 */
const CAMERA_ALIGN_ITEMS_VAR = "--_uix-cam-flex-align";
const CAMERA_JUSTIFY_CONTENT_VAR = "--_uix-cam-flex-justify";

/**
 * Maps `--uix-camera-position` keyword values to
 * [align-items, justify-content] pairs for a `flex-direction: column` container.
 *
 * In column flex:
 *   align-items     → cross-axis  → horizontal positioning
 *   justify-content → main-axis   → vertical positioning
 */
const CAMERA_POSITION_MAP: Record<string, readonly [string, string]> = {
  center:         ["center",     "center"],
  top:            ["center",     "flex-start"],
  bottom:         ["center",     "flex-end"],
  left:           ["flex-start", "center"],
  right:          ["flex-end",   "center"],
  "top-left":     ["flex-start", "flex-start"],
  "top-right":    ["flex-end",   "flex-start"],
  "bottom-left":  ["flex-start", "flex-end"],
  "bottom-right": ["flex-end",   "flex-end"],
};

/**
 * CSS injected into every camera-background shadow root.
 *
 * Layout: the host is a column-flex container so alignment keywords map
 * intuitively — `align-items` controls horizontal, `justify-content`
 * controls vertical.  `--_uix-cam-flex-align` / `--_uix-cam-flex-justify` are
 * set by `_syncCameraTransformVars` when the user supplies
 * `--uix-camera-position`.  Both default to `center` so the camera is centred
 * out of the box.
 *
 * `ha-camera-stream` is left at its natural intrinsic height (derived from the
 * video's aspect ratio and the element's 100% width).  This allows the flex
 * container to centre it — forcing `height:100%` causes the internal video
 * content to anchor to the top of the element regardless of flex alignment.
 * Any overflow is clipped by the container's `overflow:hidden`.
 *
 * Transform order: translateX/Y first, then scale.  This keeps pan independent
 * of zoom — 10% pan is always a 10% screen-space shift regardless of the zoom
 * factor, and scaling always happens around the centre of the stream.
 *
 * Supported variables (set in `uix-drawer` or `uix-view-background`):
 *   --uix-camera-position   Named position keyword (default "center").
 *   --uix-camera-zoom       Scale factor (default 1).
 *   --uix-camera-pan-x      Horizontal translate, any CSS length / % (default 0%).
 *   --uix-camera-pan-y      Vertical translate, any CSS length / % (default 0%).
 */
const CAMERA_TRANSFORM_CSS =
  ":host{" +
  "display:flex;" +
  "flex-direction:column;" +
  "align-items:var(--_uix-cam-flex-align,center);" +
  "justify-content:var(--_uix-cam-flex-justify,center);" +
  "}" +
  "ha-camera-stream{" +
  "flex-shrink:0;" +
  "transform-origin:center;" +
  "transform:" +
  "translateX(var(--uix-camera-pan-x,0%))" +
  " translateY(var(--uix-camera-pan-y,0%))" +
  " scale(var(--uix-camera-zoom,1))" +
  "}";

const CAMERA_DOMAIN = "camera";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Subset of the ha-camera-stream custom element's public interface that UIX
 * accesses.  The full element is defined in the HA frontend and not available
 * as a package dependency, so we declare only what we use.
 */
interface HaCameraStreamElement extends HTMLElement {
  hass: unknown;
  stateObj: unknown;
  muted: boolean;
  controls: boolean;
}

// ---------------------------------------------------------------------------
// Per-view state
// ---------------------------------------------------------------------------

interface BgEntry {
  entityId: string;
  /** The fixed-position container prepended to <body>. */
  container: HTMLElement;
}

interface ViewBg {
  camera: BgEntry | null;
  image: BgEntry | null;
  video: BgEntry | null;
  plainImage: BgEntry | null;
  /** Full CSS background shorthand variant. */
  background: BgEntry | null;
  /** ResizeObserver watching ha-sidebar for width changes (view cover mode). */
  sidebarObserver: ResizeObserver | null;
}

const _state = new WeakMap<HTMLElement, ViewBg>();

function _get(view: HTMLElement): ViewBg {
  if (!_state.has(view)) {
    _state.set(view, {
      camera: null,
      image: null,
      video: null,
      plainImage: null,
      background: null,
      sidebarObserver: null,
    });
  }
  return _state.get(view)!;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function _readVar(view: HTMLElement, name: string): string {
  return window
    .getComputedStyle(view)
    .getPropertyValue(name)
    .trim()
    .replace(/^['"]|['"]$/g, "");
}

/**
 * Returns the width (px) that the sidebar currently occupies.
 *
 * When `ha-drawer` is in modal mode the sidebar is an overlay and does not
 * push content to the side, so the sidebar should not be subtracted from the
 * background area.
 */
function _getSidebarWidth(drawer: HTMLElement): number {
  if ((drawer as any).type === "modal") return 0;
  return (
    (drawer.querySelector("ha-sidebar") as HTMLElement | null)?.offsetWidth ?? 0
  );
}

/**
 * Updates the `top` and `left` positioning of `container` to reflect the
 * current `--uix-view-background-cover` value read from `drawer`.
 *
 *   full  → top: 0; left: 0  (behind topbar and sidebar)
 *   view  → top: --header-height; left: <sidebarWidth>px  (content area only, default)
 */
function _applyCoverStyles(container: HTMLElement, drawer: HTMLElement): void {
  const cover = _readVar(drawer, VAR_COVER);
  if (cover === "full") {
    container.style.top = "0";
    container.style.left = "0";
  } else {
    // Default: "view" — content area only.
    container.style.top = "var(--header-height, 0px)";
    container.style.left = `${_getSidebarWidth(drawer)}px`;
  }
}

/**
 * Ensures a single `ResizeObserver` is watching `ha-sidebar` for the given
 * drawer so that background containers are repositioned whenever the sidebar
 * width changes (e.g. the user expands/collapses it or resizes the window).
 *
 * Safe to call repeatedly — it is a no-op if the observer is already active or
 * if `ha-sidebar` is not yet present in the DOM.
 */
function _ensureSidebarObserver(bg: ViewBg, drawer: HTMLElement): void {
  if (bg.sidebarObserver) return;
  const sidebar = drawer.querySelector("ha-sidebar") as HTMLElement | null;
  if (!sidebar) return;
  bg.sidebarObserver = new ResizeObserver(() => {
    if (bg.camera) _applyCoverStyles(bg.camera.container, drawer);
    if (bg.image) _applyCoverStyles(bg.image.container, drawer);
    if (bg.video) _applyCoverStyles(bg.video.container, drawer);
    if (bg.plainImage) _applyCoverStyles(bg.plainImage.container, drawer);
    if (bg.background) _applyCoverStyles(bg.background.container, drawer);
  });
  bg.sidebarObserver.observe(sidebar);
}

/**
 * Reads camera transform / position variables from the drawer element and
 * forwards non-empty values to the camera container as inline CSS custom
 * properties.
 *
 * Because the camera container lives directly on `<body>` rather than inside
 * `<ha-drawer>`, CSS custom properties from `uix-drawer` don't reach it via
 * normal inheritance.  This function copies them explicitly, so users can
 * place all camera variables alongside `--uix-view-background-camera-entity`
 * in `uix-drawer` without needing a separate `uix-view-background` entry.
 *
 * Zoom / pan variables are forwarded directly.
 *
 * `--uix-camera-position` is decomposed into the internal
 * `--_uix-cam-ai` (align-items) and `--_uix-cam-jc` (justify-content)
 * variables that drive the flex layout in CAMERA_TRANSFORM_CSS.  When the
 * position variable is absent the internal vars are removed so CAMERA_TRANSFORM_CSS
 * defaults (both `center`) take effect.
 *
 * Values forwarded as inline styles take precedence over author stylesheet
 * rules (e.g. `uix-view-background`).
 *
 * Safe to call on every manageViewBackground tick — it is a no-op when no
 * camera background is active.
 */
function _syncCameraTransformVars(drawer: HTMLElement, bg: ViewBg): void {
  const container = bg.camera?.container;
  if (!container) return;

  // Zoom / pan vars: forward directly.
  for (const varName of [CAMERA_ZOOM_VAR, CAMERA_PAN_X_VAR, CAMERA_PAN_Y_VAR]) {
    const val = _readVar(drawer, varName);
    if (val) {
      container.style.setProperty(varName, val);
    } else {
      container.style.removeProperty(varName);
    }
  }

  // Position var: decompose into internal align-items / justify-content vars.
  const pos = _readVar(drawer, CAMERA_POSITION_VAR);
  const positioning = pos ? CAMERA_POSITION_MAP[pos] : undefined;
  if (positioning) {
    container.style.setProperty(CAMERA_ALIGN_ITEMS_VAR, positioning[0]);
    container.style.setProperty(CAMERA_JUSTIFY_CONTENT_VAR, positioning[1]);
  } else {
    container.style.removeProperty(CAMERA_ALIGN_ITEMS_VAR);
    container.style.removeProperty(CAMERA_JUSTIFY_CONTENT_VAR);
  }
}

/**
 * Creates the fixed-position shell element that acts as the background layer.
 *
 * The shell itself is a light-DOM child of `<body>` (for z-ordering) with
 * `pointer-events: none`.  All actual content (camera stream, image) lives
 * inside its shadow root so that `apply_uix` can target it with the
 * `view-background` type, giving users full theme-based styling control
 * (opacity, filter, grayscale, etc.).
 */
function _createContainer(drawer: HTMLElement): HTMLElement {
  const el = document.createElement("div");
  el.setAttribute("uix-view-background", "");
  // Use right:0/bottom:0 instead of width/height so top/left offsets
  // automatically shrink the element in "view" cover mode.
  el.style.cssText =
    "position:fixed;right:0;bottom:0;overflow:hidden;pointer-events:none;";
  el.attachShadow({ mode: "open" });
  _applyCoverStyles(el, drawer);
  // Inject a uix-node into the shadow root so theme authors can style
  // the background content with `uix-view-background` in their theme.
  apply_uix(el as any, "view-background", undefined, {}, true);
  return el;
}

async function _signPath(hs: any, path: string): Promise<string> {
  try {
    const result = await hs.callWS({
      type: "auth/sign_path",
      path,
      expires: 3600,
    });
    return result.path;
  } catch (e) {
    console.warn(
      `UIX: Failed to sign path '${path}'; falling back to unsigned URL.`,
      e
    );
    return path;
  }
}

// ---------------------------------------------------------------------------
// Spinner helpers
// ---------------------------------------------------------------------------

/**
 * Appends a CSS-only loading spinner to `root` and returns the spinner element
 * so the caller can remove it once the media is ready.
 */
function _addSpinner(root: ShadowRoot): HTMLElement {
  const style = document.createElement("style");
  style.textContent =
    "@keyframes uix-bg-spin{to{transform:rotate(360deg)}}" +
    ".uix-spinner{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;transition:opacity .4s}" +
    ".uix-spinner::after{content:'';width:48px;height:48px;border-radius:50%;" +
    "border:3px solid rgba(255,255,255,.15);border-top-color:rgba(255,255,255,.7);" +
    "animation:uix-bg-spin .8s linear infinite}";
  root.appendChild(style);

  const spinner = document.createElement("div");
  spinner.className = "uix-spinner";
  root.appendChild(spinner);
  return spinner;
}

/** Fade the spinner out, then remove it from the DOM. */
function _removeSpinner(spinner: HTMLElement): void {
  // Defer to the next animation frame to guarantee the browser has painted
  // the spinner at opacity 1 before we start the fade.  Without this, if the
  // media-ready event fires in the same paint frame the spinner was added, the
  // browser sees no computed-style delta and skips the transition entirely,
  // making the spinner vanish instantly.
  requestAnimationFrame(() => {
    spinner.style.opacity = "0";
    // Fallback: remove the spinner directly if transitionend never fires (e.g.
    // the element leaves the render tree before the transition completes, or
    // the browser decided not to run it).
    const remove = () => spinner.remove();
    const fallback = setTimeout(remove, 600); // safely after the 0.4 s fade
    spinner.addEventListener(
      "transitionend",
      () => {
        clearTimeout(fallback);
        remove();
      },
      { once: true }
    );
  });
}

/**
 * Watches `streamEl` (an `ha-camera-stream` LitElement) for the media element
 * inside its shadow root and removes the spinner once media is ready.
 *
 * `ha-camera-stream` renders the actual player (e.g. `ha-hls-player`,
 * `ha-web-rtc-player`) as a child custom element with its own shadow root, so
 * the underlying `<video>` or `<img>` may live one or more shadow-root levels
 * below `streamEl`.  This function searches recursively through all reachable
 * shadow roots and observes each one so that late-rendered elements are caught
 * regardless of nesting depth.
 *
 * Falls back to removing the spinner after `SPINNER_FALLBACK_MS` so that a
 * broken / slow stream does not leave the spinner on screen indefinitely.
 */
function _removeSpinnerWhenCameraPlays(
  streamEl: HTMLElement,
  spinner: HTMLElement
): void {
  let finished = false;
  const allObs: MutationObserver[] = [];
  const observedRoots = new Set<ShadowRoot>();

  const finish = () => {
    if (finished) return;
    finished = true;
    clearTimeout(fallback);
    for (const obs of allObs) obs.disconnect();
    _removeSpinner(spinner);
  };

  const fallback = setTimeout(finish, SPINNER_FALLBACK_MS);

  // Recursively search through shadow roots to find the first <video> or <img>.
  // Only custom elements (tag names containing "-") can have open shadow roots,
  // so we restrict recursion to them to avoid iterating native elements.
  const findMedia = (
    root: ParentNode
  ): HTMLVideoElement | HTMLImageElement | null => {
    const v = root.querySelector("video") as HTMLVideoElement | null;
    if (v) return v;
    const i = root.querySelector("img") as HTMLImageElement | null;
    if (i) return i;
    for (const el of Array.from(root.querySelectorAll("*"))) {
      if (!el.localName.includes("-")) continue;
      const sr = (el as any).shadowRoot as ShadowRoot | null;
      if (sr) {
        const found = findMedia(sr);
        if (found) return found;
      }
    }
    return null;
  };

  // The element we most recently bound to; guards against redundant re-binding
  // when the same element triggers multiple observer callbacks.
  let boundTo: HTMLVideoElement | HTMLImageElement | null = null;

  // Find and bind to the media element.  Skips silently when already bound to
  // the same element.  Rebinds when the element changes (e.g. ha-camera-stream
  // re-renders and replaces the video).  Safe to call multiple times.
  const tryBind = (): void => {
    if (finished) return;
    const hostShadow = (streamEl as any).shadowRoot as ShadowRoot | null;
    if (!hostShadow) return;
    const media = findMedia(hostShadow);
    if (!media || media === boundTo) return;

    boundTo = media;

    if (media instanceof HTMLVideoElement) {
      if (!media.paused && media.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
        finish();
      } else {
        media.addEventListener("playing", finish, { once: true });
        // Video load errors are also a signal to dismiss the spinner.
        media.addEventListener("error", finish, { once: true });
      }
    } else {
      // `img.complete` is true for both successfully loaded and errored images.
      // Treat either outcome as "done" — a broken image won't become loadable
      // without a full rebuild.
      if (media.complete) {
        finish();
      } else {
        media.addEventListener("load", finish, { once: true });
        media.addEventListener("error", finish, { once: true });
      }
    }
  };

  // Observe `root` for DOM mutations and expand to any nested shadow roots
  // that appear inside it.
  const observeRoot = (root: ShadowRoot): void => {
    if (observedRoots.has(root)) return;
    observedRoots.add(root);
    const obs = new MutationObserver(() => {
      tryBind();
      expandToNestedRoots(root);
    });
    obs.observe(root, { childList: true, subtree: true });
    allObs.push(obs);
  };

  // Start observing the shadow roots of any custom elements within `root`
  // that have not yet been tracked.  Only custom elements (tag names with "-")
  // can have open shadow roots, so we skip native elements.
  const expandToNestedRoots = (root: ParentNode): void => {
    for (const el of Array.from(root.querySelectorAll("*"))) {
      if (!el.localName.includes("-")) continue;
      const sr = (el as any).shadowRoot as ShadowRoot | null;
      if (sr && !observedRoots.has(sr)) {
        observeRoot(sr);
        expandToNestedRoots(sr);
      }
    }
  };

  tryBind();
  if (finished) return;

  // Shadow root is open (LitElement) but not yet populated — observe it.
  const shadow = (streamEl as any).shadowRoot as ShadowRoot | null;
  if (!shadow) return; // should never happen for a LitElement

  observeRoot(shadow);
  expandToNestedRoots(shadow);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Force-recreate the camera and video background elements.
 *
 * Browsers may suspend or drop camera streams and video playback while a tab
 * is backgrounded.  Call this when `document.visibilityState` returns to
 * `'visible'` to tear down stale stream/video containers and let
 * `manageViewBackground` rebuild them from scratch, which re-negotiates WebRTC
 * / HLS connections and restarts autoplay.
 *
 * Entity-image and plain-image backgrounds are left untouched because they are
 * static <div> elements that do not go stale on tab switch.
 */
export function refreshCameraBackground(element: HTMLElement): void {
  const bg = _state.get(element);
  if (bg) {
    if (bg.camera) {
      bg.camera.container.remove();
      bg.camera = null;
    }
    if (bg.video) {
      bg.video.container.remove();
      bg.video = null;
    }
  }
  manageViewBackground(element);
}

/**
 * Remove all background containers associated with `element`.
 * Called from the `ha-drawer` patch `disconnectedCallback`.
 */
export function cleanupViewBackground(element: HTMLElement): void {
  const bg = _state.get(element);
  if (bg) {
    bg.camera?.container.remove();
    bg.image?.container.remove();
    bg.video?.container.remove();
    bg.plainImage?.container.remove();
    bg.background?.container.remove();
    bg.sidebarObserver?.disconnect();
    _state.delete(element);
  }
}

/**
 * Read the two background CSS variables from the element's computed styles and
 * create / update / remove the corresponding background elements.
 *
 * Called from the ha-drawer patch so that backgrounds work in both Lovelace
 * views and config panels.  Variables must be set on the :host selector in the
 * uix-drawer theme style so they are readable via getComputedStyle(element).
 *
 * Safe to call repeatedly — it reuses existing containers when the entity has
 * not changed, and tears down stale containers when it has.
 */
export async function manageViewBackground(element: HTMLElement): Promise<void> {
  const hs = await hass();
  if (!hs) return;

  const cameraId = _readVar(element, VAR_CAMERA);
  const imageId = _readVar(element, VAR_IMAGE);
  const videoSrc = _readVar(element, VAR_VIDEO);
  const plainImageSrc = _readVar(element, VAR_PLAIN_IMAGE);
  const backgroundValue = _readVar(element, VAR_BACKGROUND);
  const bg = _get(element);

  // --- Camera background ---
  if (cameraId !== (bg.camera?.entityId ?? "")) {
    bg.camera?.container.remove();
    bg.camera = null;

    if (cameraId) {
      if (cameraId.split(".")[0] !== CAMERA_DOMAIN) {
        console.warn(
          `UIX: ${VAR_CAMERA} must be a camera entity (got '${cameraId}')`
        );
      } else {
        await _setupCameraBackground(hs, bg, cameraId, element);
      }
    }
  } else if (bg.camera) {
    // Entity unchanged — keep cover positioning, hass and stateObj up to date
    // for token refresh / reconnection and state changes.
    _applyCoverStyles(bg.camera.container, element);
    const streamEl = bg.camera.container.shadowRoot?.querySelector(
      "ha-camera-stream"
    ) as HaCameraStreamElement | null;
    if (streamEl) {
      streamEl.hass = hs;
      streamEl.stateObj = hs.states[bg.camera.entityId];
    }
  }

  // Forward camera zoom / pan variables from uix-drawer to the container so
  // users can keep everything in one place.  No-op when no camera is active.
  _syncCameraTransformVars(element, bg);

  // --- Image background ---
  if (imageId !== (bg.image?.entityId ?? "")) {
    bg.image?.container.remove();
    bg.image = null;

    if (imageId) {
      await _setupImageBackground(hs, bg, imageId, element);
    }
  } else if (bg.image) {
    // Entity unchanged — keep cover positioning up to date.
    _applyCoverStyles(bg.image.container, element);
  }

  // --- Video background (plain <video> URL) ---
  if (videoSrc !== (bg.video?.entityId ?? "")) {
    bg.video?.container.remove();
    bg.video = null;

    if (videoSrc) {
      _setupVideoBackground(bg, videoSrc, element);
    }
  } else if (bg.video) {
    _applyCoverStyles(bg.video.container, element);
  }

  // --- Plain image background (CSS background-image URL) ---
  if (plainImageSrc !== (bg.plainImage?.entityId ?? "")) {
    bg.plainImage?.container.remove();
    bg.plainImage = null;

    if (plainImageSrc) {
      _setupPlainImageBackground(bg, plainImageSrc, element);
    }
  } else if (bg.plainImage) {
    _applyCoverStyles(bg.plainImage.container, element);
  }

  // --- Full CSS background shorthand ---
  if (backgroundValue !== (bg.background?.entityId ?? "")) {
    bg.background?.container.remove();
    bg.background = null;

    if (backgroundValue) {
      _setupBackgroundShorthand(bg, backgroundValue, element);
    }
  } else if (bg.background) {
    _applyCoverStyles(bg.background.container, element);
  }

  // Keep the sidebar ResizeObserver active so cover positioning updates
  // automatically whenever the sidebar is resized.
  _ensureSidebarObserver(bg, element);
}

async function _setupCameraBackground(
  hs: any,
  bg: ViewBg,
  entityId: string,
  drawer: HTMLElement
): Promise<void> {
  // Wait for ha-camera-stream to be registered (it is loaded lazily by HA).
  const defined = await Unpromise.race([
    customElements.whenDefined("ha-camera-stream").then(() => true),
    new Promise<boolean>((resolve) =>
      setTimeout(() => resolve(false), CAMERA_ELEMENT_LOAD_TIMEOUT_MS)
    ),
  ]);

  if (!defined) {
    console.warn(
      "UIX: ha-camera-stream is not available; camera background skipped."
    );
    return;
  }

  const container = _createContainer(drawer);

  const streamEl = document.createElement(
    "ha-camera-stream"
  ) as HaCameraStreamElement;
  streamEl.style.cssText = "display:block;width:100%;";
  streamEl.muted = true;
  streamEl.setAttribute("muted", "");
  streamEl.controls = false;
  // ha-camera-stream needs stateObj (full entity state) rather than entityId.
  streamEl.stateObj = hs.states[entityId];
  // Content lives in the shadow root so apply_uix can style it via the
  // view-background theme key.
  container.shadowRoot!.appendChild(streamEl);

  // Inject the zoom/pan transform style so users can control it via CSS
  // custom properties (--uix-camera-zoom, --uix-camera-pan-x/y) in their
  // uix-view-background theme style.
  const transformStyle = document.createElement("style");
  transformStyle.textContent = CAMERA_TRANSFORM_CSS;
  container.shadowRoot!.appendChild(transformStyle);

  document.body.prepend(container);
  bg.camera = { entityId, container };

  // Providing hass triggers stream negotiation inside ha-camera-stream.
  streamEl.hass = hs;

  // Show a spinner until the inner video starts playing.
  const spinner = _addSpinner(container.shadowRoot!);
  _removeSpinnerWhenCameraPlays(streamEl, spinner);
}

// ---------------------------------------------------------------------------
// Image background
// ---------------------------------------------------------------------------

async function _setupImageBackground(
  hs: any,
  bg: ViewBg,
  entityId: string,
  drawer: HTMLElement
): Promise<void> {
  const entity = hs.states[entityId];
  const picturePath = entity?.attributes?.entity_picture as string | undefined;

  if (!picturePath) {
    console.warn(
      `UIX: entity '${entityId}' has no entity_picture; image background skipped.`
    );
    return;
  }

  const signedUrl = await _signPath(hs, picturePath);

  const container = _createContainer(drawer);

  // The image fill div lives in the shadow root so apply_uix can target it.
  const imgEl = document.createElement("div");
  imgEl.className = "uix-bg-image";
  imgEl.style.cssText = [
    "width:100%",
    "height:100%",
    `background-image:url('${signedUrl}')`,
    "background-size:cover",
    "background-position:center",
    "background-repeat:no-repeat",
  ].join(";");
  container.shadowRoot!.appendChild(imgEl);

  document.body.prepend(container);
  bg.image = { entityId, container };

  // Spinner disappears once the image has loaded (or on error).
  const spinner = _addSpinner(container.shadowRoot!);
  const preload = new window.Image();
  const done = () => _removeSpinner(spinner);
  preload.onload = done;
  preload.onerror = done;
  preload.src = signedUrl;
}

// ---------------------------------------------------------------------------
// Video background (plain URL)
// ---------------------------------------------------------------------------

function _setupVideoBackground(
  bg: ViewBg,
  src: string,
  drawer: HTMLElement
): void {
  const container = _createContainer(drawer);

  const videoEl = document.createElement("video");
  videoEl.style.cssText =
    "display:block;width:100%;height:100%;object-fit:cover;";
  videoEl.autoplay = true;
  videoEl.muted = true;
  videoEl.loop = true;
  videoEl.setAttribute("playsinline", "");

  // Attach the canplay listener BEFORE setting src so we never miss the event
  // even for cached / fast-loading local videos (e.g. /local/background.mp4).
  const spinner = _addSpinner(container.shadowRoot!);
  const fallback = setTimeout(() => _removeSpinner(spinner), SPINNER_FALLBACK_MS);
  const onCanPlay = () => {
    clearTimeout(fallback);
    _removeSpinner(spinner);
  };
  videoEl.addEventListener("canplay", onCanPlay, { once: true });

  videoEl.src = src;
  container.shadowRoot!.appendChild(videoEl);

  document.body.prepend(container);
  bg.video = { entityId: src, container };

  // Belt-and-suspenders: if the browser already has enough data by the time
  // we reach here (e.g. the video was preloaded by the browser), remove the
  // spinner immediately instead of waiting for an event that already fired.
  if (videoEl.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
    videoEl.removeEventListener("canplay", onCanPlay);
    onCanPlay();
  }
}

// ---------------------------------------------------------------------------
// Plain image background (URL)
// ---------------------------------------------------------------------------

function _setupPlainImageBackground(
  bg: ViewBg,
  src: string,
  drawer: HTMLElement
): void {
  const container = _createContainer(drawer);

  const imgEl = document.createElement("div");
  imgEl.className = "uix-bg-image";
  imgEl.style.cssText = [
    "width:100%",
    "height:100%",
    `background-image:url('${src}')`,
    "background-size:cover",
    "background-position:center",
    "background-repeat:no-repeat",
  ].join(";");
  container.shadowRoot!.appendChild(imgEl);

  document.body.prepend(container);
  bg.plainImage = { entityId: src, container };

  // Spinner disappears once the image has loaded (or on error).
  const spinner = _addSpinner(container.shadowRoot!);
  const preload = new window.Image();
  const done = () => _removeSpinner(spinner);
  preload.onload = done;
  preload.onerror = done;
  preload.src = src;
}

// ---------------------------------------------------------------------------
// Full CSS background shorthand
// ---------------------------------------------------------------------------

function _setupBackgroundShorthand(
  bg: ViewBg,
  value: string,
  drawer: HTMLElement
): void {
  const container = _createContainer(drawer);

  const imgEl = document.createElement("div");
  imgEl.className = "uix-bg-image";
  imgEl.style.cssText = ["width:100%", "height:100%", `background:${value}`].join(
    ";"
  );
  container.shadowRoot!.appendChild(imgEl);

  document.body.prepend(container);
  bg.background = { entityId: value, container };
}
