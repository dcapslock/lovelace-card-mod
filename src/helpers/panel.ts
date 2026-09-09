import { isEmbeddedPanel, getCustomPanelName } from "./hass";
import { selectTree } from "./selecttree";

var PanelState: Promise<any> | null = null;
var LastDispatchedPanelState: string | null = null;

function _panelStateKey(panelState: any): string {
  const key: { panel: any; hash?: string } = {
    panel: panelState?.panel || {},
  };
  if (panelState?.hash !== undefined) {
    key.hash = panelState?.hash || "";
  }
  return JSON.stringify(key);
}

async function _getPanel(document) {
  let _panel = await _getPanel(document);
  while (_panel === null) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    _panel = await _getPanel(document);
  }
  return _panel;

  async function _getPanel(document) {
    let panel = await selectTree(
      document,
      "home-assistant $ home-assistant-main $ partial-panel-resolver>*"
    );
    if (!panel) {
      panel = await selectTree(document, "hc-main $ hc-lovelace");
    }
    if (!panel) {
      panel = await selectTree(document, "hc-main $ hc-lovelace");
    }
    if (!panel && isEmbeddedPanel()) {
      const customPanelName = getCustomPanelName();
      if (customPanelName) {
        panel = await selectTree(document, getCustomPanelName());
      } else {
        panel = undefined;
      }
    }
    return panel;
  }
}

function _getPanelNameTranslationKey(panel) {
  if (panel?.url_path === "lovelace") {
    return "panel.states" as const;
  }

  if (panel?.url_path === "profile") {
    return "panel.profile" as const;
  }

  return `panel.${panel?.title}` as const;
}

function _panelTitle(panel) {
  if (panel?.hass?.localize) {
    const translationKey = _getPanelNameTranslationKey(panel.panel);
    return panel.hass.localize(translationKey) || panel.panel?.title || "";
  }
  return panel?.panel?.title || "";
}

function _panelAttributes(panel) {
  return {
    panelTitle: _panelTitle(panel),
    panelUrlPath: panel?.route?.prefix?.replace(/^\/|\/$/g, "") || "",
    panelComponentName: panel?.panel?.component_name || "",
    panelIcon: panel?.panel?.icon || "",
    panelNarrow: panel?.narrow || false,
    panelRequireAdmin: panel?.panel?.require_admin || false,
  };
}

async function _viewAttributes(panel) {
  if (panel?.panel?.component_name !== "lovelace") {
    const theme = panel?.hass?.themes?.theme;
    return {
      viewTitle: "",
      viewUrlPath: panel?.route?.path?.replace(/^\/|\/$/g, "") || "",
      viewNarrow: panel?.narrow || false,
      theme: undefined,
      globalTheme: theme,
    };
  }
  let cnt = 0;
  while (!panel.shadowRoot?.querySelector("hui-root") && cnt < 100) {
    await new Promise((resolve) => setTimeout(resolve, 10));
    cnt++;
  }
  const lovelace = panel.shadowRoot.querySelector("hui-root");
  if (!lovelace) return {};
  const _curView = lovelace._curView || 0;
  const theme = lovelace.config?.views?.[_curView]?.theme || undefined;
  const globalTheme = panel?.hass?.themes?.theme || undefined;
  return {
    viewTitle: lovelace.config?.views?.[_curView]?.title || "",
    viewUrlPath: lovelace.config?.views?.[_curView]?.path || `${_curView}`,
    viewNarrow: lovelace.narrow || false,
    theme: theme,
    globalTheme: globalTheme,
  };
}

async function _current_panel_state() {
  const coordinator = (window as any).uixCoordinator;
  const includeHash = !coordinator?.disableHashTemplateVariable;
  const panel = await _getPanel(document);
  if (!panel) {
    return {
      panel: {}
    };
  }
  const panelAttributes = _panelAttributes(panel);
  const viewAttributes = await _viewAttributes(panel);
  const fullTitle = [];
  if (panelAttributes.panelTitle) {
    fullTitle.push(panelAttributes.panelTitle);
  }
  if (viewAttributes.viewTitle) {
    fullTitle.push(viewAttributes.viewTitle);
  }
  const fullUrlPath = [];
  if (panelAttributes.panelUrlPath) {
    fullUrlPath.push(panelAttributes.panelUrlPath);
  }
  if (viewAttributes.viewUrlPath) {
    fullUrlPath.push(viewAttributes.viewUrlPath);
  }
  const panelState: any = {
    panel: {
      title: fullTitle.join(" - "),
      fullUrlPath: fullUrlPath.join("/"),
      ...panelAttributes,
      ...viewAttributes,
    },
  };
  if (includeHash) {
    panelState.hash = location.hash.substr(1) || "";
  }
  return panelState;
}

function _panel_state_update() {
  const update = async () => {
    var panelState = await _current_panel_state();
    if (!panelState.panel.fullUrlPath) {
      return panelState;
    }
    var browserPath = window.location.pathname.slice(1).toLowerCase();
    var panelPath = panelState.panel.fullUrlPath.toLowerCase();
    let retry = 0;
    while (browserPath !== panelPath && retry++ < 200) {
      await new Promise((resolve) => setTimeout(resolve, 10));
      panelState = await _current_panel_state();
      browserPath = window.location.pathname.slice(1).toLowerCase();
      panelPath = panelState.panel.fullUrlPath.toLowerCase();
    }
    if (browserPath !== panelPath) {
      console.groupCollapsed(
        "UIX: cannot resolve Panel information after 2s."
      );
      console.log("Browser path:", browserPath);
      console.log("Panel path:", panelPath);
      console.log("Final panel state:", panelState);
      console.groupEnd();
    }
    return panelState;
  };
  PanelState = new Promise((resolve) => resolve(update()));
}

function _refresh_panel_state(dispatchOnChange = true) {
  _panel_state_update();
  PanelState.then((panelState) => {
    const panelStateKey = _panelStateKey(panelState);
    const changed = panelStateKey !== LastDispatchedPanelState;
    if (dispatchOnChange && changed) {
      LastDispatchedPanelState = panelStateKey;
      document.dispatchEvent(
        new CustomEvent("uix-update", { detail: { variablesChanged: true } })
      );
    } else if (LastDispatchedPanelState === null) {
      LastDispatchedPanelState = panelStateKey;
    }
  });
}

export function getPanelState(): Promise<any> {
  if (!PanelState) {
    _panel_state_update();
    PanelState.then((panelState) => {
      LastDispatchedPanelState = _panelStateKey(panelState);
    });
  }
  return PanelState as Promise<any>;
}

window.addEventListener("uix-bootstrap", async (ev: Event) => {
  ev.stopPropagation();
  const onPanelLocationChange = () => _refresh_panel_state(true);
  ["popstate", "location-changed", "historystatechanged"].forEach((event) => {
    window.addEventListener(event, onPanelLocationChange);
  });
  const coordinator = (window as any).uixCoordinator;
  coordinator?.addEventListener("uix-config-update", () => {
    const dispatchOnChange = LastDispatchedPanelState !== null;
    _refresh_panel_state(dispatchOnChange);
  });
  (function() {
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function(...args) {
      const ret = originalPushState.apply(this, args);
      window.dispatchEvent(new Event("historystatechanged"));
      return ret;
    };

    history.replaceState = function(...args) {
      const ret = originalReplaceState.apply(this, args);
      window.dispatchEvent(new Event("historystatechanged"));
      return ret;
    };
  })();
});
