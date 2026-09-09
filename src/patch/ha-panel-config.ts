import { patch_element } from "../helpers/patch_function";
import { ModdedElement, apply_uix } from "../helpers/apply_uix";
import pjson from "../../package.json";

/*
Patch ha-panel-config for theme styling
Config panels are routed via removing last Child and adding a new one.
Hence we need to prepend uix element to not interfere with the routing.

There is no style passed to apply_uix here, everything comes only from themes.
*/

@patch_element("ha-panel-config")
class HaConfigPatch extends ModdedElement {
  updated(_orig, ...args) {
    _orig?.(...args);
    if (args[0].has("route")) {
      apply_uix(this, "config", { prepend: true });
    }
  }
}

/*
Patch ha-panel-custom
*/

@patch_element("ha-panel-custom")
class HaPanelCustomPatch extends ModdedElement {
  updated(_orig, ...args) {
    _orig?.(...args);
    if (args[0].has("route") || args[0].has("panel")) {
      apply_uix(this, "panel-custom", { prepend: true });
    }
  }
  _createPanel(_orig, ...args) {
    _orig?.(...args);
    const coordinator = (window as any).uixCoordinator;

    let hasRun = false;
    let timeout: any;

    const run = () => {
      if (hasRun) return;
      hasRun = true;
      cleanup();

      const injectLoader = (iframe: HTMLIFrameElement) => {
        try {
          const doc = iframe.contentDocument || iframe.contentWindow?.document;
          if (!doc) return;
          if (doc.getElementById("uix-custom-panel-loader")) return;
          const script = doc.createElement("script");
          script.id = "uix-custom-panel-loader";
          script.src = `/uix/uixCustomPanel.js?v=${pjson.version}`;
          doc.head?.appendChild(script) || doc.body?.appendChild(script) || doc.documentElement.appendChild(script);
        } catch (e) {
          console.warn("UIX: failed to inject custom panel javascript into iframe", e);
        }
      };

      const setupIframe = (iframe: HTMLIFrameElement) => {
        iframe.addEventListener("load", () => {
          injectLoader(iframe);
        });
        injectLoader(iframe);
      };

      const findAndSetup = () => {
        const iframe = this.shadowRoot?.querySelector("iframe") || this.querySelector("iframe");
        if (iframe) {
          setupIframe(iframe as HTMLIFrameElement);
          return true;
        }
        return false;
      };

      if (!findAndSetup()) {
        const observer = new MutationObserver(() => {
          if (findAndSetup()) {
            observer.disconnect();
          }
        });
        observer.observe(this.shadowRoot || this, { childList: true, subtree: true });
        setTimeout(() => observer.disconnect(), 10000);
      }
    };

    const checkAndRun = () => {
      if (coordinator?.styleCustomPanels) {
        run();
      }
    };

    const cleanup = () => {
      clearTimeout(timeout);
      coordinator?.removeEventListener?.("uix-config-update", checkAndRun);
    };

    if (coordinator?.styleCustomPanels) {
      run();
    } else {
      coordinator?.addEventListener?.("uix-config-update", checkAndRun);
      timeout = setTimeout(cleanup, 30000);
    }
  }
}

/* Patch ha-top-app-bar-fixed for theme styling
This is needed to best style the top app bar in the config panel.
The ultimate background styling for config panels come from this element.
*/

@patch_element("ha-top-app-bar-fixed")
class HaTopAppBarFixedPatch extends ModdedElement {
  updated(_orig, ...args) {
    _orig?.(...args);
    apply_uix(this, "top-app-bar-fixed");
  }
}
