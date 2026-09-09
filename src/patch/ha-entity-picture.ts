import { apply_uix, ModdedElement } from "../helpers/apply_uix";
import { patch_element } from "../helpers/patch_function";
import { nextAnimationFrame, UIX_PATCH_DEBOUNCE_MS } from "../helpers/raf";
import { Uix } from "../uix";

/*
Patch badge/marker elements to consider the following variable:
--uix-image-for-<entity_id_with_dots_as_underscores>

e.g. to override the background image for person.jim:
  --uix-image-for-person_jim: url('/local/photo.jpg')

If the element is for that entity, the replacement will take place.
If not, it is ignored.

Supported elements:
- ha-entity-marker
- ha-tile-icon
- ha-state-badge
- ha-user-badge
- ha-person-badge
- hui-entity-badge
*/

const getEntityId = (el: any): string | null => {
  const tag = el.tagName.toLowerCase();
  switch (tag) {
    case "ha-tile-icon":
      // Entity ID is on ha-tile-card
      const parentCard = el.closest("ha-card")?.parentNode?.host;
      return parentCard?._config?.entity || null;
    case "state-badge":
      return el.stateObj?.entity_id || null;
    case "ha-entity-marker":
      return el.entityId || null;
    case "ha-user-badge":
      return el._personEntityId || null;
    case "ha-person-badge":
      return el.person?.id ? `person.${el.person.id}` : null;
    case "hui-entity-badge":
      return (el.config ?? el._config)?.entity || null;
  }
};

const subscribeImageVars = (el, imageVars: { imageVar: string }) => {
  // Subscription happens when updating so clear any debounced updates
  if (el._uixImageForEntityDebounce) {
    clearTimeout(el._uixImageForEntityDebounce);
    el._uixImageForEntityDebounce = undefined;
  }
  if (el._uixImageVars?.imageVar === imageVars.imageVar) return;
  const uixCoordinator = (window as any)?.uixCoordinator;
  if (!uixCoordinator) return;
  if (!uixCoordinator._registerImageForEntityCallback || !uixCoordinator._unregisterImageForEntityCallback) return;
  if (el._uixImageVars?.imageVar) {
    uixCoordinator._unregisterImageForEntityCallback(el, el._uixImageVars.imageVar);
  }
  el._uixImageVars = imageVars;
  uixCoordinator._registerImageForEntityCallback(el, imageVars.imageVar, () => {
    updateImageDebounced(el);
  });
};

const applyImage = (el: any, imageUrl: string | null): void => {
  const tag = el.tagName.toLowerCase();
  switch (tag) {
    case "ha-tile-icon": {
      const haStateIcon = el.querySelector("ha-state-icon");
      if (imageUrl) {
        el._uix_replaced_image = el._uix_replaced_image ?? el.imageUrl ?? false;
        el.imageUrl = imageUrl;
        if (haStateIcon) {
          haStateIcon.style.display = "none";
          haStateIcon.style.visibility = "hidden";
          haStateIcon.setAttribute("slot", "none");
        }
      } else if (el._uix_replaced_image !== undefined) {
        el.imageUrl = el._uix_replaced_image ? el._uix_replaced_image : undefined;
        delete el._uix_replaced_image;
        if (haStateIcon) {
          haStateIcon.style.display = "";
          haStateIcon.style.visibility = "";
          haStateIcon.setAttribute("slot", "icon");
        }
      }
      break;
    }
    case "state-badge":
      if (imageUrl) {
        el._uix_replaced_image = el._uix_replaced_image ?? el.overrideImage ?? false;
        el.overrideImage = imageUrl;
      } else if (el._uix_replaced_image !== undefined) {
        el.overrideImage = el._uix_replaced_image ? el._uix_replaced_image : undefined;
        delete el._uix_replaced_image;
      }
      break;
    case "ha-entity-marker":
      if (imageUrl) {
        el._uix_replaced_image = el._uix_replaced_image ?? el.entityPicture ?? false;
        el.entityPicture = imageUrl;
      } else if (el._uix_replaced_image !== undefined) {
        el.entityPicture = el._uix_replaced_image ? el._uix_replaced_image : undefined;
        delete el._uix_replaced_image;
      }
      break;
    case "ha-user-badge":
    case "ha-person-badge":
      const pictureEl = el.shadowRoot?.querySelector(".picture");
      if (pictureEl) {
        if (imageUrl) {
          let imageEL = el.shadowRoot?.querySelector(".picture.uix-image");
          if (!imageEL) {
            imageEL = document.createElement("div");
            imageEL?.classList.add("picture", "uix-image");
            el.shadowRoot?.prepend(imageEL);
          } 
          if (imageEL) {
            imageEL.style.backgroundImage = `url(${imageUrl})`;
          }
          let style = el.shadowRoot?.querySelector("#uix-image");
          if (!style) {
            style = document.createElement("style");
            style.id = "uix-image";
            style.textContent = `.picture:not(.uix-image) { display: none !important; }`;
            el.shadowRoot?.prepend(style);
          }
        } else {
          const imageEL = el.shadowRoot?.querySelector(".picture.uix-image");
          if (imageEL) {
            imageEL.remove();
          }
          const style = el.shadowRoot?.querySelector("#uix-image");
          if (style) {
            style.remove();
          }
        }
      }
      break;
    case "hui-entity-badge":
      if (!imageUrl && el._uix_replaced_image === undefined) return;
      if (el._uix_replaced_image && imageUrl === el._uix_replaced_image) return;
      const previousReplacedImage = el._uix_replaced_image;
      if (imageUrl) {
        el._uix_replaced_image = imageUrl;
      } else if (el._uix_replaced_image !== undefined) {
        el._uix_replaced_image = undefined;
      }
      el.requestUpdate("_uix_replaced_image", previousReplacedImage);
      break;
  }
};

const updateImageDebounced = (el) => {
  if ((window as any).uixCoordinator?.disableEntityPictureImageOverride) return;
  if (!el.isConnected) return;
  if (el._uixImageForEntityDebounce) return;
  el._uixImageForEntityDebounce = setTimeout(() => {
    el._uixImageForEntityDebounce = undefined;
    el._uixImagePending = true;
    try {
      updateImage(el);
    } finally {
      el._uixImagePending = false;
    }
  }, UIX_PATCH_DEBOUNCE_MS);
};

const updateImage = (el: any): void => {
  if ((window as any).uixCoordinator?.disableEntityPictureImageOverride) return;
  const styles = window.getComputedStyle(el);
  let imagePath = styles.getPropertyValue(`--uix-image`).trim();
  if (!imagePath) {
    const entityId = getEntityId(el);
    if (entityId) {
      const slug = entityId.replace(/\./g, "_");
      const imageVar = `--uix-image-for-${slug}`;
      imagePath = styles.getPropertyValue(imageVar).trim();
      if (imagePath) {
        subscribeImageVars(el, { imageVar });
      }
    }
  }
  const imageUrl = imagePath ? (document.querySelector("home-assistant") as any)?.hass?.hassUrl(imagePath) : null;
  applyImage(el, imageUrl);
};

const bindUix = async (el: any) => {
  // Coalesce: if a bindUix run is already in progress for this element, skip
  if (el._bindUixPending) return;
  el._bindUixPending = true;
  try {
    // Wait for next animation frame before computing styles: batches reflow reads
    await nextAnimationFrame();

    updateImage(el);
    el._boundUixImage = el._boundUixImage ?? new Set();
    const newUix = await findParentUix(el);

    for (const uix of newUix) {
      if (el._boundUixImage.has(uix)) continue;

      uix.addEventListener("uix-styles-update", async () => {
        // Coalesce rapid style-update events to a single update per frame
        if (el._uixImagePending) return;
        el._uixImagePending = true;
        try {
          await uix.updateComplete;
          await nextAnimationFrame();
          updateImage(el);
        } finally {
          el._uixImagePending = false;
        }
      });
      el._boundUixImage.add(uix);
    }
  } finally {
    el._bindUixPending = false;
  }

  // Find uix elements created later, increased interval
  if (el.uix_image_retries < 5) {
    el.uix_image_retries++;
    window.setTimeout(() => bindUix(el), 250 * el.uix_image_retries);
  }
};

@patch_element("ha-entity-marker")
class HaEntityMarkerPatch extends ModdedElement {
  entityId;
  entityColor;
  entityName;
  entityUnit;
  entityPicture;
  uix_image_retries = 0;
  _bindUixDebounce: ReturnType<typeof setTimeout> | undefined = undefined;
  updated(_orig, ...args) {
    _orig?.(...args);
    if ((window as any).uixCoordinator?.disableEntityPictureImageOverride) return;
    this.uix_image_retries = 0;
    clearTimeout(this._bindUixDebounce);
    this._bindUixDebounce = setTimeout(() => this._applyUix().then(() => bindUix(this)), UIX_PATCH_DEBOUNCE_MS);
  }
  async _applyUix() {
    const entityId = this.entityId;
    if (!entityId) return;
    const map = this.closest("#map");
    if (!map || !map.parentNode) return;
    const haMap = (map.parentNode as any)?.host;
    if (!haMap || haMap.tagName.toLowerCase() !== "ha-map") return;
    const huiMapCard = ((haMap.closest("ha-card") as Element)?.parentNode as any)?.host;
    let entityConfig;
    if (huiMapCard?.tagName.toLowerCase() === "hui-map-card") {
       const config = (huiMapCard as any).config ?? (huiMapCard as any)._config;
       entityConfig = config?.entities?.find((e) => {
        if (typeof e === "string") return e === entityId;
        return e.entity === entityId;
      });
    }
    const variables = { marker: {} };
    variables.marker['entityId'] = this.entityId;
    variables.marker['entityColor'] = this.entityColor;
    variables.marker['entityName'] = this.entityName;
    variables.marker['entityUnit'] = this.entityUnit;
    variables.marker['entityPicture'] = this.entityPicture;
    if (entityConfig) variables['config'] = entityConfig;
    await apply_uix(
      this, 
      "entity-marker", 
      entityConfig ? (entityConfig?.uix ?? entityConfig?.card_mod) : undefined, 
      variables, 
      true,
      "type-entity-marker"
    );
  }
}

@patch_element("ha-tile-icon")
class HaTileIconPatch extends ModdedElement {
  uix_image_retries = 0;
  _bindUixDebounce: ReturnType<typeof setTimeout> | undefined = undefined;
  updated(_orig, ...args) {
    _orig?.(...args);
    if ((window as any).uixCoordinator?.disableEntityPictureImageOverride) return;
    this.uix_image_retries = 0;
    clearTimeout(this._bindUixDebounce);
    this._bindUixDebounce = setTimeout(() => bindUix(this), UIX_PATCH_DEBOUNCE_MS);
  }
}

@patch_element("state-badge")
class HaStateBadgePatch extends ModdedElement {
  uix_image_retries = 0;
  _bindUixDebounce: ReturnType<typeof setTimeout> | undefined = undefined;
  updated(_orig, ...args) {
    _orig?.(...args);
    if ((window as any).uixCoordinator?.disableEntityPictureImageOverride) return;
    this.uix_image_retries = 0;
    clearTimeout(this._bindUixDebounce);
    this._bindUixDebounce = setTimeout(() => bindUix(this), UIX_PATCH_DEBOUNCE_MS);
  }
}

@patch_element("ha-user-badge")
class HaUserBadgePatch extends ModdedElement {
  uix_image_retries = 0;
  _bindUixDebounce: ReturnType<typeof setTimeout> | undefined = undefined;
  updated(_orig, ...args) {
    _orig?.(...args);
    if ((window as any).uixCoordinator?.disableEntityPictureImageOverride) return;
    this.uix_image_retries = 0;
    clearTimeout(this._bindUixDebounce);
    this._bindUixDebounce = setTimeout(() => bindUix(this), UIX_PATCH_DEBOUNCE_MS);
  }
}

@patch_element("ha-person-badge")
class HaPersonBadgePatch extends ModdedElement {
  uix_image_retries = 0;
  _bindUixDebounce: ReturnType<typeof setTimeout> | undefined = undefined;
  updated(_orig, ...args) {
    _orig?.(...args);
    if ((window as any).uixCoordinator?.disableEntityPictureImageOverride) return;
    this.uix_image_retries = 0;
    clearTimeout(this._bindUixDebounce);
    this._bindUixDebounce = setTimeout(() => bindUix(this), UIX_PATCH_DEBOUNCE_MS);
  }
}

@patch_element("hui-entity-badge")
class HuiEntityBadgePatch extends ModdedElement {
  uix_image_retries = 0;
  _bindUixDebounce: ReturnType<typeof setTimeout> | undefined = undefined;
  _uix_replaced_image;
  updated(_orig, ...args) {
    _orig?.(...args);
    if (args[0]?.has("_uix_replaced_image")) return;
    if ((window as any).uixCoordinator?.disableEntityPictureImageOverride) return;
    this.uix_image_retries = 0;
    clearTimeout(this._bindUixDebounce);
    this._bindUixDebounce = setTimeout(() => bindUix(this), UIX_PATCH_DEBOUNCE_MS);
  }
  _getImageUrl(_orig, ...args) {
    if (this._uix_replaced_image) {
      return this._uix_replaced_image;
    }
    return _orig?.(...args);
  }
}

function joinSet(dst: Set<any>, src: Set<any>) {
  for (const s of src) dst.add(s);
}

// Shadow-root crossings count as steps, so 20 is needed to reliably traverse
// deeply nested shadow trees (e.g. map markers inside dialogs inside cards).
const MAX_PARENT_STEPS = 20;

async function findParentUix(node: any, step = 0): Promise<Set<Uix>> {
  let uixElements: Set<Uix> = new Set();
  if (step === MAX_PARENT_STEPS) return uixElements;
  if (!node) return uixElements;

  if (node.updateComplete) await node.updateComplete;

  if (node._uix) {
    for (const uix of node._uix) {
      if (uix.styles) uixElements.add(uix);
    }
  }

  if (node.parentElement)
    joinSet(uixElements, await findParentUix(node.parentElement, step + 1));
  else if (node.parentNode)
    joinSet(uixElements, await findParentUix(node.parentNode, step + 1));
  if ((node as any).host)
    joinSet(uixElements, await findParentUix((node as any).host, step + 1));
  return uixElements;
}
