import { ModdedElement, apply_uix } from "../helpers/apply_uix";
import { patch_element } from "../helpers/patch_function";
import {
  cleanupViewBackground,
  manageViewBackground,
  refreshCameraBackground,
} from "../view-background";

/*
Patch ha-drawer for theme styling

There is no style passed to apply_uix here, everything comes only from themes.

ha-drawer wraps the entire HA content area (Lovelace views AND config panels),
so backgrounds defined here are available everywhere, not just in Lovelace.

Three optional CSS variables can be set in the theme's uix-drawer style to
control the background behind the content area:

  --uix-view-background-camera-entity
      A camera entity ID.  UIX will create a muted ha-camera-stream element
      positioned as a background.

  --uix-view-background-image-entity
      Any entity with an entity_picture attribute.  UIX will sign the picture
      URL and render it as a cover-sized background image.

  --uix-view-background-cover
      Controls how much of the viewport the background covers.
        view  (default) — content area only; offset below the topbar and to
                          the right of the sidebar.
        full            — entire viewport, sitting behind topbar and sidebar.

Because ha-drawer persists across navigation, templates using the `panel`
variable can select a different entity per panel/view without any teardown
overhead:

  uix-drawer: |
    :host {
      --uix-view-background-camera-entity:
        {% if panel.viewUrlPath == 'garage' %}camera.garage
        {% elif panel.viewUrlPath == 'driveway' %}camera.driveway
        {% endif %};
    }

Background containers have a shadow root; UIX injects a uix-node into that
shadow root under the type "view-background".  Theme authors can style the
background content (opacity, filter, etc.) with:

  uix-view-background: |
    :host { opacity: 0.5; }

Note: variables must be set on :host in uix-drawer so they are readable via
getComputedStyle(ha-drawer).

*/

@patch_element("ha-drawer")
class HaDrawerPatch extends ModdedElement {
  _uixBgController?: AbortController;
  _uixBgRetries = 0;

  updated(_orig, ...args) {
    _orig?.(...args);
    apply_uix(this, "drawer", undefined, {}, true);

    // Set up the background-entity lifecycle once per ha-drawer element instance.
    if (this._uixBgController) return;

    this._uixBgController = new AbortController();

    // Listen on the drawer's uix-node for style re-renders.
    // This fires on every template evaluation, so it covers:
    //   - Initial style render on load.
    //   - Template re-renders driven by HA state changes (e.g. is_state(...)).
    //   - Template re-renders on navigation (panel variable changes).
    //   - Re-renders after a theme reload (uix-update always re-renders styles).
    //
    // `uix-styles-update` fires synchronously when `_rendered_styles` is set
    // (before Lit has re-rendered the <style> element), so we wait for
    // `updateComplete` before reading CSS variables via getComputedStyle().
    this._uixBgRetries = 0;
    this._setupStylesUpdateListener();
  }

  private _setupStylesUpdateListener() {
    const signal = this._uixBgController?.signal;
    if (!signal || signal.aborted) return;
    const drawerUixNode = this._uix?.find((u) => u.type === "drawer");
    if (drawerUixNode) {
      drawerUixNode.addEventListener(
        "uix-styles-update",
        () =>
          drawerUixNode.updateComplete.then(() => manageViewBackground(this)),
        { signal }
      );
      // Recover stale/frozen camera streams when the user returns to this tab.
      // Browsers may suspend or drop WebRTC/HLS streams while backgrounded;
      // we force-recreate the stream element on every visibility-restored event.
      document.addEventListener(
        "visibilitychange",
        () => {
          if (document.visibilityState === "visible") {
            refreshCameraBackground(this);
          }
        },
        { signal }
      );
      // Catch any styles that already rendered before the listener was attached.
      drawerUixNode.updateComplete.then(() => manageViewBackground(this));
      return;
    }
    // uix-node may not exist yet (apply_uix is async) — retry with backoff,
    // matching the pattern used by the icon patch.
    if (this._uixBgRetries < 5) {
      this._uixBgRetries++;
      window.setTimeout(
        () => this._setupStylesUpdateListener(),
        250 * this._uixBgRetries
      );
    }
  }

  disconnectedCallback(_orig?: () => void) {
    _orig?.();
    this._uixBgController?.abort();
    this._uixBgController = undefined;
    cleanupViewBackground(this);
  }
}
