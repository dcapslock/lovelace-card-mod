---
title: Directives
description: Apply declarative UIX Broker operations to a selected element.
---
# Directives

Directives run one at a time after every interaction rule matches. Each directive performs one configured operation, using the interaction anchor by default or an explicitly selected directive anchor where supported. Except for `block`, a directive may also have its own `rules`; the directive runs only when all of them match, otherwise Broker skips it and continues with the next directive.

- [Block](#block) — prevent the initiating browser event's default action and propagation.
- [Property](#property) — set or clear a JavaScript object property.
- [Event](#event) — dispatch a `CustomEvent`.
- [Call](#call) — invoke an element method.
- [Button](#button) — insert an interactive Home Assistant button.
- [Tile icon](#tile-icon) — insert an interactive Home Assistant tile icon.
- [Action](#action) — run a Home Assistant, frontend, or UIX action.
- [Template](#template) — render a Jinja2 template once and save its result.
- [JavaScript](#javascript) — synchronously evaluate JavaScript and save its return value.
- [Wait](#wait) — delay the next directive.

## Directive rules

Add `rules` to any directive except `block` to condition just that directive. The syntax is the same as [interaction rules](./rules.md). For `property`, `event`, `call`, `button`, and `tile-icon`, host-element rules inspect the resolved directive anchor by default. For `action` and `wait`, they inspect the interaction anchor. A rule's own `anchor` remains relative to that default anchor, or can be absolute as usual.

```yaml
directives:
  - type: property
    set: config.mode
    value: advanced
  - type: call
    method: openAdvancedEditor
    rules:
      - type: captured
        path: allow_advanced
        match: true
```

`panel` rules obtain the current panel state when the directive is reached. This lets an earlier directive run regardless of the current panel while a later directive only runs on a matching panel.

`block` does not accept directive rules. Put its condition in the interaction's `rules` so that the event is synchronously blocked only when the complete interaction matches.

## Block

`block` calls `preventDefault()` and `stopImmediatePropagation()` on the initiating browser event.

```yaml
- type: block
```

It is available only in `browser` and `shortcut` realms. The interaction anchor and host-element rule anchors must resolve synchronously; if a required `select_tree` anchor is not already present, UIX Broker skips the complete interaction. A `block` directive is applied before the remaining directives are processed, even when it appears later in the list.

## Directive anchors

`property`, `event`, `call`, `button`, and `tile-icon` directives use the interaction anchor by default. Each can override that default with its own `anchor` configuration. A bare string is relative to the interaction anchor, a string beginning with `&` is a compact absolute document-root `select_tree` path, and `{ select_tree: ... }` is the equivalent long absolute form.

```yaml
directives:
  - type: property
    anchor: "$ ha-dialog"
    set: withoutHeader
    value: true
  - type: event
    anchor: "&home-assistant $$ ha-automation-sidebar"
    name: broker-sidebar-event
  - type: call
    anchor:
      select_tree: "home-assistant $ ha-more-info-dialog"
    method: closeDialog
```

Use the `uix_broker_path($0)` console helper in the browser console to find a relative directive-anchor path.

See [Interaction Anchors](./interaction-anchors.md#anchors-in-rules-and-directives) for the selection formats.

See [Finding paths in the browser console](./interaction-anchors.md#finding-paths-in-the-browser-console) for more information on the console helpers available.

## Property

`property` directive changes the selected anchor's JavaScript object. `set` takes a dot-separated property path, creates any missing intermediate plain-object levels, and assigns the value at the final property. `clear` takes the same kind of path and deletes only the final property; it does not remove its parent objects.

```yaml
- type: property
  set: config.heading
  value: New title
- type: property
  clear: config.icon
```

Values can refer to captured data or a previous `template` or `javascript` result. `@captured` resolves to the complete captured-data object, while `@captured.path` resolves to the value at that dot-separated path. Array indexes can use either dot notation (`items.0`) or brackets (`items[0]`); use a quoted bracket key for object properties that contain punctuation, such as `settings['icon-color']`. The reference is substituted before the property is set and must be quoted in YAML as it starts with `@`.

```yaml
- type: property
  set: config.entity
  value: "@captured.entity_id"
```

`template` and `javascript` directives save their value under their `id`. A later directive can use `@id` or a property such as `@id.path`; the value keeps its original type, including objects and arrays. References occupy a complete YAML value — Broker does not interpolate them into a longer string.

## Event

`event` dispatches a `CustomEvent`. Its `target` defaults to `anchor`, meaning the selected directive anchor (or the interaction anchor when no directive anchor is set). Set `target: window` or `target: document` to dispatch globally instead; these targets do not use or resolve an event-specific directive anchor. `bubbles` and `composed` default to `false`, matching the DOM API.

```yaml
- type: event
  name: broker-demo-event
  bubbles: true
  composed: true
  data:
    entity: light.bed_light
```

```yaml
- type: event
  target: window
  name: broker-window-event
  data:
    source: uixBroker
- type: event
  target: document
  name: broker-document-event
```

Set `capture_data: true` to copy captured event data into a modified event. The outgoing event's `detail` starts with the initiating interaction's captured data, then shallowly overlays values from this directive's `data` object. The `capture_data` option is only available to the `event` directive.

```yaml
- type: event
  name: broker-forwarded-event
  capture_data: true
  data:
    source: uixBroker
```

Set `capture_data: deep` when nested plain objects should be merged instead. Directive `data` wins for conflicting values; arrays and non-plain objects are replaced as complete values. This leaves `capture_data: true` unchanged.

```yaml
- type: event
  name: broker-forwarded-event
  capture_data: deep
  data:
    params:
      source: uixBroker
```

## Call

`call` invokes a method on the selected anchor. `method` accepts a safe dot-separated method path and preserves the method object's `this` binding. `args`, when provided, must be an array and supports captured-data substitution.

```yaml
- type: call
  method: focus
- type: call
  method: setSelectionRange
  args: [0, 5]
```

## Button

`button` inserts a Home Assistant `ha-button` beside the directive anchor. It uses the same button configuration and action handling as the [Forge button spark](../forge/sparks/button.md). The button is inserted after the directive anchor by default.

Use `after` or `before` to select a different reference element. These paths are relative to the resolved directive anchor and support the usual UIX `select_tree` syntax. The button is still inserted as a sibling of the matched reference element.

```yaml
- type: button
  label: Toggle
  entity: light.living_room
  tap_action:
    action: toggle
```

```yaml
- type: button
  anchor: "$ ha-dialog"
  before: "div.header"
  label: Toggle
  entity: light.living_room
  tap_action:
    action: toggle
```

Use `style` for a flat mapping of CSS property names and values. The properties are set inline on the generated `ha-button`, which is useful for button dimensions and spacing that cannot be styled from dashboard configuration.

```yaml
- type: button
  anchor: "$ div.menu div.title"
  icon: mdi:hammer
  color: red
  size: s
  tap_action:
    action: navigate
    navigation_path: /config/tools
  style:
    "--ha-button-box-shadow": rgba(0, 0, 0, 0.1) 0px 4px 12px
    "--ha-icon-button-size": 32px
```

### Further UIX styling

Use `style` for simple inline properties. For further customisation, use UIX styling — normally through a theme. First create the button, select the generated `ha-button` in your browser's element inspector, then run `uix_path($0)` to generate the appropriate theme variable and selector path.

Use a theme when you need templates or styles inside a shadow root. See [DOM navigation](../concepts/dom.md) for selector paths and [UIX application](../concepts/application.md) for how UIX styling is applied.

For example, a button inserted into the sidebar can be styled through `uix-sidebar-yaml`:

```yaml
uix-sidebar-yaml: |
  .: |
    div[data-uix-broker-button] ha-button {
      --uix-button-margin: 6px;
    }
```

| Key | Type | Default | Description |
| --- | --- | --- | --- |
| `after` | `string` | directive anchor | Relative selector for the reference element. The button is inserted after it. |
| `before` | `string` | — | Relative selector for the reference element. The button is inserted before it. |
| `entity` | `string` | — | Entity ID used by entity-based actions. |
| `icon` | `string` | — | MDI icon placed in the button label slot. It takes precedence over `label`. |
| `color` | `string` | — | Icon colour for an icon-only button. |
| `label` | `string` | `""` | Button label. |
| `start_icon` / `end_icon` | `string` | — | MDI icon before or after the label. |
| `variant` | `string` | Home Assistant default | `brand`, `neutral`, `danger`, `warning`, or `success`. Icon-only buttons default to `neutral`. |
| `appearance` | `string` | Home Assistant default | `accent`, `filled`, `outlined`, or `plain`. Icon-only buttons default to `plain`. |
| `size` | `string` | — | `s` (small) or `m` (medium). |
| `style` | object | — | Flat map of CSS property names and string or numeric values, set inline on `ha-button`. |
| `tap_action` / `hold_action` / `double_tap_action` | action | — | Home Assistant action to run from the button. |

!!! note
    - Set at most one of `after` and `before`.
    - Button clicks are isolated from the reference element's own action handler.
    - Ripples from the reference element are not prevented.
    - The same `--uix-button-margin` CSS variable as the Forge button spark apply. The default margin is `-6px` for a labelled button and `0px` for an icon-only button.
    - Other CSS variables applicable to the Forge button spark also apply.

## Tile icon

`tile-icon` inserts a Home Assistant `ha-tile-icon` beside the directive anchor. It uses the same icon rendering and action handling as the [Forge tile-icon spark](../forge/sparks/tile-icon.md). The tile icon is inserted after the directive anchor by default.

Use `after` or `before` to select a different reference element. These paths are relative to the resolved directive anchor and support the usual UIX `select_tree` syntax. The tile icon is inserted as a sibling of the matched reference element.

```yaml
- type: tile-icon
  entity: light.living_room
  tap_action:
    action: toggle
```

```yaml
- type: tile-icon
  anchor: "$ ha-dialog"
  before: "div.header"
  entity: light.living_room
  icon: mdi:star
  color: orange
  tap_action:
    action: more-info
```

Use `style` for a flat mapping of CSS property names and values. The properties are set inline on the generated `ha-tile-icon`, which is useful for positioning and sizing the icon where dashboard styling cannot reach it.

```yaml
- type: tile-icon
  entity: light.living_room
  style:
    margin-inline-start: 8px
    "--tile-icon-size": 28px
    z-index: 1
```

Use `uix` for UIX styling, including styles inside the tile icon's shadow root. Its UIX type is `broker-tile-icon`, and the resolved tile-icon settings are available as `config` in UIX templates.

```yaml
- type: tile-icon
  entity: light.living_room
  uix:
    style: |
      :host {
        --tile-icon-size: {{ '32px' if is_state(config.entity, 'on') else '24px' }};
      }
```

| Key | Type | Default | Description |
| --- | --- | --- | --- |
| `after` | `string` | directive anchor | Relative selector for the reference element. The tile icon is inserted after it. |
| `before` | `string` | — | Relative selector for the reference element. The tile icon is inserted before it. |
| `entity` | `string` | — | Entity whose state icon is rendered. It supplies the default tap action: `toggle` for toggleable entities, otherwise `none`. |
| `icon` | `string` | — | MDI icon. With `entity`, it overrides the entity's normal state icon. |
| `icon_path` | `string` | — | SVG path passed to `ha-tile-icon` as `iconPath`. |
| `image_url` | `string` | — | Image URL passed to `ha-tile-icon` as `imageUrl`. |
| `color` | CSS color | — | Tile icon colour. With `entity`, this is applied while the entity is active. |
| `style` | object | — | Flat map of CSS property names and string or numeric values, set inline on `ha-tile-icon`. |
| `uix` | object | — | UIX configuration applied to the generated tile icon as type `broker-tile-icon`. |
| `tap_action` / `hold_action` / `double_tap_action` | action | — | Home Assistant action to run from the tile icon. |

!!! note
    - Set at most one of `after` and `before`.
    - Supply an icon source with `icon`, `icon_path`, `image_url`, or `entity`.
    - Entity-based tile icons update when Home Assistant state updates.
    - Pointer, mouse, touch, and click events stop at the generated icon. This prevents a containing element's ripple or action handler from reacting while retaining the tile icon's own action and ripple.
    - Broker adds the `data-uix-broker-tile-icon` attribute to each generated tile icon, so it can be selected from UIX styling.

## Action

`action` runs a Home Assistant service call, a standard frontend action, or one of the UIX Broker-specific actions.

```yaml
- type: action
  action: light.turn_on
  target:
    entity_id: light.example

- type: action
  action: fire-dom-event
  uix:
    action: toast
    data:
      message: Done
```

### JavaScript action

`action: javascript` is a UIX Broker action. Put the code in `data.code`. UIX Broker automatically passes `hass`, `anchor`, `event`, and `captured` as variables. `hass` is the active Home Assistant object, `anchor` is the resolved interaction anchor DOM element, `event` is the initiating event, and `captured` is the interaction's captured data.

```yaml
- type: action
  action: javascript
  data:
    code: |
      console.log(anchor, event, captured)
```

Use JavaScript only from trusted UIX configurations.

## Template

`template` renders a Home Assistant Jinja2 template once through the template API; it does not create a template subscription. Its string result is stored under `id` for the remaining directives in that interaction.

Every uncached render is a round trip to the Home Assistant server. Avoid using it on interactions that can run frequently. Set `cache` to a positive number of milliseconds when a slightly stale value is acceptable:

```yaml
- type: template
  id: example
  cache: 5000
  template: "{{ states('sensor.example') }}"
```

The cache is held in the browser and shared by template directives using the same template text and prior directive results. A cached value is used only when it is younger than the directive's `cache` duration; `cache: 0` (or omitting `cache`) always renders again. The cache stores only successful results, is cleared when Broker configuration reloads, and does not observe template changes during the cache period. When `cache` is enabled, prior directive results must be JSON-serializable because they form part of the cache key; circular objects cannot be cached.

```yaml
- type: template
  id: log_provider_url
  template: "/config/logs?provider={{ states('input_select.log_provider') }}"
- type: button
  after: "&home-assistant $ home-assistant-main $ ha-config-system-navigation $ ha-config-navigation-list $ ha-list-item-button:nth-of-type(4) $ a#item div.content"
  icon: mdi:open-in-new
  color: var(--primary-color)
  tap_action:
    action: url
    url_path: "@log_provider_url"
```

`id` must start with a letter or underscore and can then contain letters, numbers, underscores, and hyphens. The name `captured` is reserved for `@captured` event data and cannot be used as an ID. Use dot or bracket array paths to select a saved object or array value, just as for `@captured`. Quoted bracket keys also work, for example `@config_path['icon-color']` or `@config_path["icon-color"]`.

Templates receive prior directive results in the top-level `directive` variable. For example, a prior directive with `id: provider` is available as `{{ directive.provider }}`. This namespace contains only results from earlier directives in the same interaction.

## JavaScript

`javascript` evaluates `code` once and saves its synchronous return value under `id`. The code receives `hass`, `anchor`, `event`, `captured`, and `directive`; `directive` contains prior directive results from the same interaction. Return a scalar, object, or array; the following directives can use it as `@id` without conversion.

```yaml
- type: javascript
  id: config_path
  code: |
    const provider = hass.states['input_select.log_provider'].state;
    return {
      path: `/config/logs?provider=${provider}`,
      label: `Open ${provider.charAt(0).toUpperCase() + provider.slice(1)} logs`,
    };
- type: button
  icon: mdi:open-in-new
  label: "@config_path.label"
  tap_action:
    action: url
    url_path: "@config_path.path"
```

Use JavaScript only from trusted UIX configurations.

## Wait

Use `wait` to pause a directive sequence without performing another operation. It requires a non-negative number of milliseconds.

```yaml
directives:
  - type: wait
    wait: 500
  - type: action
    action: light.turn_on
    target:
      entity_id: light.example
```

Every directive also accepts `wait`, a non-negative number of milliseconds. In that form, UIX Broker waits after applying the directive before starting the next one. A `block` directive always runs synchronously, though it can include `wait` to delay later directives.

```yaml
directives:
  - type: event
    name: broker-started-event
    wait: 250
  - type: action
    action: light.turn_on
```
