---
description: Learn how to review the Home Assistant DOM to become a UI eXtension expert.
---
# DOM navigation

Home Assistant makes extensive use of a concept called [shadow DOM](https://developer.mozilla.org/en-US/docs/Web/Web_Components/Using_shadow_DOM). This allows for easy reuse of components (such as `<ha-card>` or `<ha-icon>`) but requires some advanced techniques when applying CSS styles to elements.

When exploring cards in your browser's element inspector, you may have come across a line that says something like `#shadow-root (open)` (exactly what it says depends on your browser) and have noticed that elements inside that do not inherit the styles from outside.

In order to style elements inside a `#shadow-root`, you will need to make your `style:` a dictionary rather than a string.

For each dictionary entry the key will be used to select one or several elements through a modified [`querySelector()`](https://developer.mozilla.org/en-US/docs/Web/API/Document/querySelector) function. The value of the entry will then be injected into those elements.

!!! tip
    The modified `querySelector()` function will replace a dollar sign `$` with a `#shadow-root` in the selector.

The process is recursive, so the value may also be a dictionary. A key of `.` (a period) will select the current element.

??? example
    Let's change the color of all third level titles `### like this` in a markdown card, and also change the card's background.
    ```yaml
    type: markdown
    content: |-
        # Example
        ## A teal markdown card where h3 tags are purple
        ### Like this
    ```

    In the element inspector of chrome, the HTML will be similar to the image below.

    ![markdown-card-dom](../assets/page-assets/concepts/dom-1-light.png#only-light){: width="400" }
    ![markdown-card-dom](../assets/page-assets/concepts/dom-1-dark.png#only-dark){: width="400" }

    The `<ha-card>` element is the base, and from there we see that we need to go through one `#shadow-root` to reach the `<h3>`. That `#shadow-root` is inside an `<ha-markdown>` element, so our selector will be:
    ```yaml
      ha-markdown $:
    ```
    which will find the first `<ha-markdown>` element and then all `#shadow-root`s inside that.

    To add the background to the `<ha-card>`, we want to apply the styles to the base element directly, which has the key

    ```yaml
      .:
    ```

    This gives the final style:

    ```yaml
    uix:
      style:
        ha-markdown$: |
          h3 {
            color: purple;
          }
        .: |
          ha-card {
            background: teal;
          }
    ```

    ![DOM-navigation](../assets/page-assets/concepts/concepts-markdown.png)

The selector chain of the queue will look for one element at a time separated by spaces or `$`. For each step, only the first match will be selected. But for the final selector of the chain (i.e. in a given dictionary key) **all** matching elements will be selected.

Chains ending with `$` is a special case for convenience, selecting the shadow roots of all elements.

!!! example "Chaining example"
    The following will select the `div` elements in the first marker on a map card:
    ```yaml
      ha-map $ ha-entity-marker $ div: |
    ```
    But the following will select the div elements in all map markers on a map card (because we end the first key on the `ha-entity-marker $` selector and start a new search within each result for `div`):
    ```yaml
      ha-map $ ha-entity-marker $:
        div: |
    ```

!!! warning "Load order optimization"
    Following on the note above, due to the high level of load order optimization used in Home Assistant, it is not guaranteed that the `ha-entity-marker` elements exist at the time when UIX is looking for them.

    If you break the chain once more:
    ```yaml
      ha-map $:
        ha-entity-marker $:
          div: |
    ```
    then UIX will be able to retry looking from the `ha-map $` point at a later time, which may lead to more stable results.

    In short, if things seem to be working intermittently, then try splitting up the chain into several steps.

## Express search selector `$$`

For deeply-nested elements — especially card features and more-info controls — writing out the full chain of intermediate shadow-root crossings can be verbose. The `$$` **express search selector** provides a shorthand: it performs a **recursive, shadow-piercing search** through all descendants of the current context, regardless of how many shadow-root boundaries lie in between.

```
A $$ B $
```

is equivalent to

```
A $ <intermediate-1> $ <intermediate-2> $ … B $
```

where all the intermediate shadow-host hops are resolved automatically.

!!! tip
    `$$` is a **mid-path selector** — it must always appear between two selector steps, never at the very start of a path.

!!! example "Card features — before and after"
    The verbose explicit path:
    ```yaml
    uix:
      style:
        hui-card-features $:
          hui-card-feature $:
            hui-humidifier-toggle-card-feature $:
              ha-control-select $: |
                .container {
                  opacity: 0.8;
                }
    ```
    Using `$$`:
    ```yaml
    uix:
      style:
        "hui-card-features $$ ha-control-select $": |
          .container {
            opacity: 0.8;
          }
    ```

!!! example "Multiple card feature types"
    ```yaml
    uix:
      style:
        "hui-card-features $$ ha-control-number-buttons $": |
          #input::before {
            background: red;
          }
        "hui-card-features $$ ha-control-select-menu $": |
          .select-anchor {
            --control-select-menu-background-color: red !important;
          }
          .select-anchor:hover {
            --control-select-menu-background-color: purple !important;
          }
    ```

!!! warning "Performance"
    Because `$$` traverses the entire shadow DOM subtree of the current context, it is inherently slower than an explicit path. For performance-sensitive use cases, prefer the explicit path.

!!! warning "Load order and retries"
    The retry mechanism (splitting chains into separate dictionary levels) that provides load-order stability for `$` paths applies per dictionary entry. When `$$` express selector is used, the entire deep search is retried as one unit. If the target element loads very late, consider an explicit path split into two dictionary levels:
    ```yaml
    uix:
      style:
        hui-card-features $:
          "hui-card-feature $$ ha-control-select $": |
            .container { opacity: 0.8; }
    ```
    This lets UIX retry from `hui-card-features $` independently.

## Host/element path selection

A path may begin with a `&` **host/element** as its first step. It filters the initial element where UIX is applied before any traversal takes place:

- If the initial element where UIX is applied is a **ShadowRoot** the filter is tested against the shadow root **host** element.
- If the initial element where UIX is applied is a regular **Element** the filter is tested against the element.

Generally you would use the host/element path selector in a theme to allow applying a selector path when the host/element has a specific class and/or id/attribute.

Matching is done by directly inspecting the parent/host properties — not via CSS selector engine — as required since the host/element itself is being filtered. The following tokens are supported (all present tokens must match):

| Token | Checks |
|-------|--------|
| `tagname` | `element.localName === 'tagname'` |
| `.classname` | `element.classList.contains('classname')` |
| `#id` | `element.id === 'id'` |
| `[attr]` | `element.hasAttribute('attr')` |
| `[attr=val]` | exact value match |
| `[attr^=val]` | value starts with |
| `[attr$=val]` | value ends with |
| `[attr*=val]` | value contains |
| `[attr~=val]` | whitespace-separated word match |
| `[attr\|=val]` | value equals or is a `-`-prefixed sub-tag |
| `{.prop}` | `element.prop` is not `null`/`undefined` |
| `{!.prop}` | property path does not exist |
| `{.prop=val}` | `String(element.prop) === val` |
| `{.prop=undefined}` | `element.prop` exists and is strictly `undefined` |
| `{.prop^=val}` | stringified value starts with `val` |
| `{.prop$=val}` | stringified value ends with `val` |
| `{.prop*=val}` | stringified value contains `val` |
| `{.prop~=val}` | whitespace-separated word match on stringified value |
| `{.prop\|=val}` | value equals or is a `-`-prefixed sub-tag |

Tokens may be combined — e.g. `&ha-dialog.my-class[data-type="video"]` — and all must match. Spaces **outside** attribute-selector brackets and property-selector braces split the path and are therefore **not** supported in a `&` selector. Spaces and `$` inside `[…]` and `{…}` (including inside quoted values) are treated as literals, so operators such as `$=` (ends-with) and values containing dots or spaces work correctly.

Property selectors navigate actual JS element properties via a dot-separated path using optional chaining (e.g. `{.notification.notification_id='1234567'}` resolves `element.notification?.notification_id`). Plain integer path segments are treated as array indices when the current value is an `Array` (e.g. `{.items.0.name}` accesses `element.items[0].name`). Named keys on arrays also work, since arrays are objects in JavaScript. Values may be double-quoted, single-quoted, or bare.
The bare value `undefined` is reserved for an explicit undefined-value check;
quote it (`'undefined'` or `"undefined"`) to match that literal string.
Use the bare negated form `{!.prop}` to match a missing property path; it does
not match a property that exists with an `undefined` or `null` value.

Class-based selectors may optionally be wrapped in parentheses for readability: `&(.my-class)` is equivalent to `&.my-class`.

!!! example "Example styling dialog"
    Style the content of a dialog only when it is of type `type-hui-dialog-web-browser-play-media`:
    ```yaml
    uix-dialog-yaml: |
      "&(.type-hui-dialog-web-browser-play-media) $ ha-dialog-header $": |
      section.header-content {
        display: none;
      }
    ```
    The `&(.type-...)` step filters the initial nodes by checking whether the host element carries that class, then `$` crosses the shadow root.

!!! example "Example styling badge"
    Style the energy dashboard power total badge border which has class `.type-power-total`. The border can only be styled in shadow root so using `&` host/element selector we can target only badges which have class `.type-power-total` while still crossing shadow root.
    ```yaml
    uix-badge-yaml: |
      .: |
        :host(.type-power-total) {
          --ha-card-border-width: 3px;
          --ha-card-border-color: red;
        }
      "&.type-power-total ha-badge $": |
        .badge {
          border-style: double !important;
        }
    ```

!!! example "Example attribute selectors with `$=` and dots"
    Attribute selectors — including ends-with (`$=`) and values containing dots — work correctly because `$` and `.` inside `[…]` are never treated as path separators or class tokens.

    Apply styles to a map entity marker whose `entity-id` attribute ends with `dev`:
    ```yaml
    uix-entity-marker-yaml: |
      "&[entity-id$='dev']": |
        :host {
          --uix-image: /local/media/person_grey.png;
        }
        div.marker {
          border-color: red !important;
          border-width: 5px;
        }
    ```

    Apply styles to a map entity marker for the entity `person.dev` (dot in the entity id):
    ```yaml
    uix-entity-marker-yaml: |
      "&[entity-id='person.dev']": |
        :host {
          --uix-image: /local/media/person_grey.png;
        }
        div.marker {
          border-color: red !important;
          border-width: 5px;
        }
    ```

!!! example "Example property selectors `{.prop}`"
    Property selectors read actual JS element properties (not HTML attributes). They are written with curly braces and a dot-prefixed path:

    ```yaml
    uix:
      style:
        # bare presence check — passes when element.notification is not null/undefined
        "&{.notification}":
          ".": |
            ha-card { opacity: 0.5; }

        # exact match on a nested property
        "&{.notification.notification_id='1234567'}":
          ".": |
            ha-card { border: 2px solid red; }

        # starts-with operator
        "&{.type^=light}":
          ".": |
            ha-card { background: yellow; }

        # array index access — resolves element.items[0].name
        "&{.items.0.name='foo'}":
          ".": |
            ha-card { background: teal; }
    ```

    All the same operators as attribute selectors are supported (`=`, `~=`, `^=`, `$=`, `*=`, `|=`). Integer path segments are used as array indices when the current value is an `Array`; named (string) keys always use plain property access and work on both arrays and plain objects.

## DOM inspection helpers

UIX ships browser console helpers that make it easier to discover valid style paths, forge spark paths, Broker directive anchors, and understand the UIX element hierarchy at runtime. Open your browser's DevTools console, select an element in the **Elements** panel (it becomes `$0`), then call one of the functions below.

### `uix_tree($0)` — general helper

Reports everything UIX knows about the area surrounding the selected element:

| Section | What it shows |
| ------- | ------------- |
| **📦 Closest UIX Parent** | The nearest ancestor element that has a non-child `uix-node` attached, with UIX template variables (usually `config`) and its UIX type (e.g. `card`, `view`). |
| **👶 Active UIX Children** | Paths that are currently being styled as children of the UIX parent, with the resolved DOM elements shown. |
| **🗺️ Available YAML Selectors** | Every YAML style key reachable within the UIX parent's shadow DOM subtree (stopping at the next UIX parent boundary). Each key maps to one shadow context; inside you'll find the CSS selectors valid for that key's style string. |

```js
uix_tree($0)
```

??? example
    After selecting a card element in the inspector and running `uix_tree($0)`, the console output might look like:

    ```
    💡 UIX Tree 💡
      Target element: <hui-card>
      📦 Closest UIX Parent
        Element: <hui-card>
        UIX type: card
      👶 Active UIX Children: none
      🗺️ Available YAML Selectors  (2 YAML selectors, 5 CSS selectors)
        ".":  (2 CSS selectors)
          ha-card  <ha-card>
          ha-card ha-markdown  <ha-markdown>
        "ha-markdown $":  (3 CSS selectors)
          h3  <h3>
          p  <p>
          p span  <span>
    ```

    Each group label shows a YAML style key followed by the required `:` syntax. The CSS selectors inside are valid within that key's style string. Each selector is followed by a clickable element reference — click it to jump straight to that element in the DevTools inspector.

### `uix_style_path($0)` — specific helper

Reports the exact UIX path to the selected element and generates a ready-to-paste YAML snippet:

| Section | What it shows |
| ------- | ------------- |
| **📦 Closest UIX Parent** | Same as `uix_tree`. |
| **📍 UIX Path to Target** | The exact path string (using `$` for shadow-root crossings) from the UIX parent context to `$0`. Use this as the key in a UIX `style:` config. |
| **🎨 CSS Target** | Tag name, id, classes and a suggested CSS selector for the element — each followed by a clickable element reference to jump straight to it in the DevTools inspector. |
| **📝 Boilerplate UIX YAML** | A paste-ready card-level YAML snippet to get you started. Shown only for types that can be styled via a card-level `uix:` key. |
| **📝 Boilerplate Theme YAML** | A paste-ready theme YAML snippet. Shown for all types — for theme-only types (e.g. `dialog`, `sidebar`, `view`) this is the only boilerplate shown. When shadow-root crossings are needed, the `-yaml` variant of the theme variable is used.

```js
uix_style_path($0)
```

`uix_path($0)` is a shorthand alias for `uix_style_path($0)`.

??? example
    After selecting the `<h3>` heading inside a markdown card and running `uix_style_path($0)`:

    ```
    💡 UIX Style Path 💡
      Target element: <h3>
      📦 Closest UIX Parent
        Element: <hui-markdown-card>
        UIX type: card
      📍 UIX Path to Target
        Path: "ha-markdown $":
      🎨 CSS Target
        Tag: h3
        Suggested CSS selector: h3  <h3>
      📝 Boilerplate UIX YAML
        uix:
          style:
            "ha-markdown $": |
              h3 {
                /* your styles for h3 */
              }
      📝 Boilerplate Theme YAML
        my-awesome-theme:
          uix-theme: my-awesome-theme
          uix-card-yaml: |
            "ha-markdown $": |
              h3 {
                /* your styles for h3 */
              }
    ```

    The **Path** line shows the YAML key including the required `:`. The **Suggested CSS selector** is followed by a clickable element reference that jumps to the element in DevTools.

### `uix_forge_path($0)` — forge helper

Reports the path from the closest `uix-forge` forge to the selected element. Use the reported path as the value of `for`, `before`, or `after` in a forge spark config.

| Section | What it shows |
| ------- | ------------- |
| **📦 Closest UIX Forge Parent** | The nearest ancestor `uix-forge` element. |
| **📍 Forge Path to Target** | The selector path (using `$` for shadow-root crossings) from the forged element to `$0`. |
| **📝 Boilerplate Spark YAML** | A paste-ready spark YAML snippet showing how to use the path. |

```js
uix_forge_path($0)
```

!!! warning
    If you are adding a spark element of the same type, e.g. a tile icon **before** `ha-tile-icon` then pay particular attention to the documentation for that spark which will provide guidance on path specificity so as to not select the spark element itself during updates.

??? example
    After selecting `ha-tile-icon` in a tile card and running `uix_forge_path($0)`

    ```
    📦 Closest UIX Forge Parent
      Element: <uix-forge class=​"type-custom-uix-forge">​…​</uix-forge>​
    📍 Forge Path to Target
      Path: "hui-tile-card $ ha-card ha-tile-container ha-tile-icon"
      Use this path as the value of `for`, `before`, or `after` in a spark config.
    📝 Boilerplate Spark YAML
    forge:
      sparks:
        - type: tooltip
          for: "hui-tile-card $ ha-card ha-tile-container ha-tile-icon"
          content: "..."
        # for tile-icon / state-badge sparks:
        # - type: tile-icon
        #   before: "hui-tile-card $ ha-card ha-tile-container ha-tile-icon"
        #   icon: mdi:home
    ```

### `uix_broker_path($0)` — Broker directive-anchor helper

After triggering a Broker interaction, select an element inside its resolved
interaction anchor and run:

```js
uix_broker_path($0)
```

The helper finds the most specific recent interaction anchor containing `$0` and
prints a complete UIX tree path relative to it. Use that result as `anchor` on a
`property` or `event` directive. When several active interactions overlap, pass
the intended interaction anchor explicitly as the second argument:

```js
uix_broker_path($0, $1)
```

### `uix_broker_absolute_path($0)` — Broker interaction-anchor helper

Select an element in the **Elements** panel and run:

```js
uix_broker_absolute_path($0)
```

It prints and returns a document-root UIX tree path with the `&` prefix, ready
to use as an interaction `anchor`:

```yaml
anchor: "&home-assistant $ hui-dialog-create-card"
```