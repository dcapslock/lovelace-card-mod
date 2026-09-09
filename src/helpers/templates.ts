import { hass } from "./hass";
import { BrowserID } from "./browser_id";
import { getPanelState } from "./panel";

interface CachedTemplate {
  template: string;
  variables: object;
  value: string;
  debug: boolean;
  callbacks: Set<(string) => void>;
  unsubscribe: Promise<() => Promise<void>>;
  cooldownTimeoutID?: number;
  error?: RenderTemplateError;
  includesIconVars: boolean;
  includesImageVars?: boolean;
}

interface RenderTemplateResult {
  result: string;
  listeners: any;
}

interface RenderTemplateError {
  error: string;
  level: "ERROR" | "WARNING";
}

(window as any).uix_template_cache =
  (window as any).uix_template_cache || {};

const cachedTemplates: Record<string, CachedTemplate> = (window as any)
  .uix_template_cache;

function template_updated(
  key: string,
  result: RenderTemplateResult
): Promise<void> {
  const cache = cachedTemplates[key];
  if (!cache) {
    return;
  }
  if ("error" in result) {
    cache.error = result as unknown as RenderTemplateError;
    cache.value = "";
    if (cache.debug) {
      console.groupCollapsed(`UIX: Template ${cache.error.level}`);
      console.log( { 
        template: cache.template, 
        variables: cache.variables, 
        includesIconVars: cache.includesIconVars,
        includesImageVars: cache.includesImageVars,
        value: cache.value,
        error: cache.error
      });
      console.groupEnd();
    }
  } else {
    cache.value = result.result;
    if (cache.debug) {
      console.groupCollapsed("UIX: Template updated");
      console.log( { 
        template: cache.template, 
        variables: cache.variables, 
        includesIconVars: cache.includesIconVars,
        includesImageVars: cache.includesImageVars,
        value: cache.value,
        error: cache.error
      });
      console.groupEnd();
    }
  }
  cache.callbacks.forEach((f) => f(cache.value));
  if (cache.includesIconVars && ! cache.cooldownTimeoutID) {
    const uixCoordinator = (window as any).uixCoordinator;
    if (uixCoordinator?._refreshIconStyles) {
      uixCoordinator._refreshIconStyles(cache.value, cache.debug);
    }
  }
  if (cache.includesImageVars && ! cache.cooldownTimeoutID) {
    const uixCoordinator = (window as any).uixCoordinator;
    if (uixCoordinator?._refreshImageStyles) {
      uixCoordinator._refreshImageStyles(cache.value, cache.debug);
    }
  }
}

export function hasTemplate(str) {
  if (!str) return false;
  return String(str).includes("{%") || String(str).includes("{{");
}

/** Render a template once without creating a websocket subscription. */
export async function render_template(template: string, variables: Record<string, any> = {}): Promise<string> {
  const hs = await hass();
  const result = await hs.callApi("POST", "template", { template, variables });
  if (typeof result !== "string") throw new Error("Home Assistant returned a non-string template result");
  return result;
}

export async function bind_template(
  callback: (string) => void,
  template: string,
  variables: object,
  defaultValue = ""
): Promise<void> {
  const hs = await hass();
  const panelState = await getPanelState();
  const connection = hs.connection;

  variables = {
    user: hs.user.name,
    browser: BrowserID(),
    ...panelState,
    ...variables,
  };

  const cacheKey = JSON.stringify([template, variables]);
  let cache = cachedTemplates[cacheKey];
  if (!cache) {
    let debug = false;
    unbind_template(callback);
    callback(defaultValue);

    const includesIconVars =
      template.includes("--uix-icon-for-") || template.includes("--uix-icon-color-for-");
    const includesImageVars =
      template.includes("--uix-image-for-");

    if (template.includes("uix.debug") || template.includes("card_mod.debug")) {
      debug = true;
      console.groupCollapsed("UIX: Binding template");
      console.log( { 
        template, 
        variables,
        includesIconVars,
        includesImageVars
      });
      console.groupEnd();
    }

    cachedTemplates[cacheKey] = cache = {
      template,
      variables,
      value: "",
      callbacks: new Set([callback]),
      debug,
      unsubscribe: connection.subscribeMessage(
        (result: RenderTemplateResult) => template_updated(cacheKey, result),
        {
          type: "render_template",
          template,
          variables,
          report_errors: debug,
        }
      ),
      includesIconVars,
      includesImageVars,
    };
  } else {
    if (cache.debug) {
      console.groupCollapsed("UIX: Reusing template");
      console.log( { 
        template: cache.template, 
        variables: cache.variables, 
        includesIconVars: cache.includesIconVars,
        includesImageVars: cache.includesImageVars,
        value: cache.value,
        error: cache.error
      });
      console.groupEnd();
    }
    if (!cache.callbacks.has(callback)) unbind_template(callback);
    callback(cache.value);
    cache.callbacks.add(callback);
    cache.cooldownTimeoutID && clearTimeout(cache.cooldownTimeoutID);
    cache.cooldownTimeoutID = undefined;
  }
}

export function unbind_template(
  callback: (string) => void
): void {
  for (const [key, cache] of Object.entries(cachedTemplates)) {
    if (cache.callbacks.has(callback)) {
      cache.callbacks.delete(callback);
      if (cache.callbacks.size == 0) {
        if (cache.debug) {
          console.groupCollapsed(
            "UIX: Template unbound and will be unsubscribed after cooldown"
          );
          console.log( { 
            template: cache.template, 
            variables: cache.variables,
            includesIconVars: cache.includesIconVars,
            includesImageVars: cache.includesImageVars,
          });
          console.groupEnd();
        }
        // When hidden partial-panel-resolver disconnects the view
        // The app may also be suspending so we can't delay unsubscribe as it won't happen until 
        // after hass.connection is suspended causing the unsubscribe to never happen and lead to duplicate subscriptions 
        // which will match the same template and variables and cause multiple callbacks to be called for the same template update.
        // So when document is hidden we unsubscribe immediately instead of waiting for the cooldown.
        if (document.hidden) {
          delete cachedTemplates[key];
          console.groupCollapsed("UIX: Unsubscribing template immediately due to document hidden");
          console.log( { 
            template: cache.template, 
            variables: cache.variables,
            includesIconVars: cache.includesIconVars,
            includesImageVars: cache.includesImageVars,
          });
          console.groupEnd();
          cache.unsubscribe.then((unsubscribe) => unsubscribe());
          return;
        }
        cache.cooldownTimeoutID = window.setTimeout(
          unsubscribe_template,
          20000,
          key
        );
      }
      break;
    }
  }
}

async function unsubscribe_template(key: string) {
  const cache = cachedTemplates[key];
  if (!cache) return;
  if (cache.cooldownTimeoutID) {
    clearTimeout(cache.cooldownTimeoutID);
  }
  if (cache.debug) {
    console.groupCollapsed("UIX: Unsubscribing template after cooldown");
    console.log( { 
      template: cache.template, 
      variables: cache.variables,
      includesIconVars: cache.includesIconVars,
      includesImageVars: cache.includesImageVars,
    });
    console.groupEnd();
  }
  delete cachedTemplates[key];
  await (
    await cache.unsubscribe
  )();
}
