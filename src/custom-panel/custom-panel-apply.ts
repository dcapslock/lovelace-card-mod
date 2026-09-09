import { apply_uix } from "../helpers/apply_uix";
import { getCustomPanelName } from "../helpers/hass";
import { themesReady } from "../theme-watcher";

window.addEventListener("uix-bootstrap", async (ev: Event) => {
  ev.stopPropagation();

  const customPanelName = getCustomPanelName();
  if (!customPanelName) return;

  await customElements.whenDefined(customPanelName);
  while (!document.querySelector(customPanelName) || !document.querySelector(customPanelName).hass)
    await new Promise((r) => window.setTimeout(r, 100));

  const customPanelRoot = document.querySelector(customPanelName);
  if (!customPanelRoot) return;

  if (customPanelRoot.updateComplete) await customPanelRoot.updateComplete;
  await themesReady().catch(() => {});

  const primaryBackgroundColor = window.getComputedStyle(customPanelRoot).getPropertyValue("--primary-background-color");
  let theme: string | undefined = undefined;
  if (primaryBackgroundColor === undefined || primaryBackgroundColor === null || primaryBackgroundColor === "") {
    theme = customPanelRoot.hass?.themes?.theme;
    theme = theme === "default" ? customPanelRoot.hass?.themes?.default_theme : theme;
  }
  
  apply_uix(customPanelRoot, customPanelName, theme === undefined ? undefined : { theme });
  // TODO - Add a listener for theme changes and reapply uix when the theme changes
});