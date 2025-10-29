import { hass, hass_base_el } from "./hass";
import { BrowserID } from "./browser_id";
import { getPanelState } from "./panel";
import HomeAssistantJavaScriptTemplates, {
  HomeAssistant,
  HomeAssistantJavaScriptTemplatesRenderer,
} from "home-assistant-javascript-templates";

const JS_TEMPLATE_REG = /^\s*\[\[\[([\s\S]+)\]\]\]\s*$/;

interface CachedTemplate {
  renderer: Promise<HomeAssistantJavaScriptTemplatesRenderer>;
  template: string;
  variables: object;
  value: string;
  debug: boolean;
  callbacks: Set<(string) => void>;
  untrack?: () => void;
  cooldownTimeoutID?: number;
}

interface RenderTemplateResult {
  result: string;
  listeners: any;
}

(window as any).cardMod_JS_template_cache =
  (window as any).cardMod_JS_template_cache || {};

const cachedJSTemplates: Record<string, CachedTemplate> = (window as any)
  .cardMod_JS_template_cache;

function js_template_updated(key: string, result?: any): Promise<void> {
  const cache = cachedJSTemplates[key];
  const value = result ?? "";
  if (!cache) {
    return;
  }
  cache.value = value;
  if (cache.debug) {
    console.groupCollapsed("CardMod: Template updated");
    console.log("Template:", cache.template);
    console.log("Variables:", cache.variables);
    console.log("Value:", cache.value);
    console.groupEnd();
  }
  cache.callbacks.forEach((f) => f(value));
}

export function is_js_template(str) {
  if (!str) return false;
  return JS_TEMPLATE_REG.test(String(str));
}

export async function bind_js_template(
  callback: (string) => void,
  template: string,
  variables: object
): Promise<void> {
  const hass_el: HomeAssistant = (await hass_base_el()) as HomeAssistant;
  const hs = await hass();
  const panelState = await getPanelState();

  variables = {
    user: hs.user.name,
    browser: BrowserID(),
    ...panelState,
    ...variables,
  };

  const cacheKey = JSON.stringify([template, variables]);
  let cache = cachedJSTemplates[cacheKey];
  if (!cache) {
    let debug = false;
    //unbind_template(callback);
    callback("");

    if (template.includes("card_mod.debug")) {
      debug = true;
      console.groupCollapsed("CardMod: Binding javascript template");
      console.log("Template:", template);
      console.log("Variables:", variables);
      console.groupEnd();
    }

    const renderer = new HomeAssistantJavaScriptTemplates(hass_el, {
      variables: { ...variables },
    }).getRenderer();

    // HomeAssistantJavaScriptTemplates calls back immediately,
    // so we need to set up cache before that
    // then update the cache with untrack function
    cachedJSTemplates[cacheKey] = cache = {
      renderer,
      template,
      variables,
      value: "",
      callbacks: new Set([callback]),
      debug,
    };
    cache.untrack = await renderer.then((renderer) => {
      return renderer.trackTemplate(
        template.match(JS_TEMPLATE_REG)![1],
        (result?: any) => js_template_updated(cacheKey, result)
      );
    });
  } else {
    if (cache.debug) {
      console.groupCollapsed("CardMod: Reusing javascript template");
      console.log("Template:", cache.template);
      console.log("Variables:", cache.variables);
      console.log("Value:", cache.value);
      console.groupEnd();
    }
    if (!cache.callbacks.has(callback)) unbind_js_template(callback);
    callback(cache.value);
    cache.callbacks.add(callback);
    cache.cooldownTimeoutID && clearTimeout(cache.cooldownTimeoutID);
    cache.cooldownTimeoutID = undefined;
  }
}

export async function unbind_js_template(
  callback: (string) => void
): Promise<void> {
  for (const [key, cache] of Object.entries(cachedJSTemplates)) {
    if (cache.callbacks.has(callback)) {
      cache.callbacks.delete(callback);
      if (cache.callbacks.size == 0) {
        if (cache.debug) {
          console.groupCollapsed(
            "CardMod: Template unbound and will be unsubscribed after cooldown"
          );
          console.log("Template:", cache.template);
          console.log("Variables:", cache.variables);
          console.groupEnd();
        }
        cache.cooldownTimeoutID = window.setTimeout(
          untrack_js_template,
          20000,
          key
        );
      }
      break;
    }
  }
}

async function untrack_js_template(key: string) {
  const cache = cachedJSTemplates[key];
  if (!cache) return;
  if (cache.cooldownTimeoutID) {
    clearTimeout(cache.cooldownTimeoutID);
  }
  if (cache.debug) {
    console.groupCollapsed(
      "CardMod: Unsubscribing javascript template after cooldown"
    );
    console.log("Template:", cache.template);
    console.log("Variables:", cache.variables);
    console.groupEnd();
  }

  cache.untrack();
}
