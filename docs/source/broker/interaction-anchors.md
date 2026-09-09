---
title: Interaction Anchors
description: Select the element that UIX Broker rules and directives use by default.
---
# Interaction Anchors

An interaction anchor selects the element that host-element rules inspect and directives use by default. Browser and shortcut interactions can select from the initiating event's composed path or use a UIX `select_tree` path. Server interactions use `select_tree` paths only.

For terse YAML, `anchor` configuration is usually written in compact form. The table below summarises when event-path selection is used and when `select_tree` is used.

| `anchor:` | Method |
| --- | --- |
| `target` | Uses [event-path](#event-path-anchors) selection and resolves to the target of a `browser` or `shortcut` [realm](realms.md) event. It is not available in the `server` realm. |
| `<`, `<$`, `<selector> <$`, or `<selector> <$$` | Uses [event-path](#event-path-anchors) selection. It is not available in the `server` realm. |
| A string starting with `&` | Uses `select_tree` selection from `document`. It is available in all [realms](realms.md). |
| `{ select_tree: <path> }` | Uses long-form `select_tree` selection from `document`. It is available in all realms. |

## Event-path anchors

Event-path expressions are evaluated right to left from the implicit `target`, where `target` is the innermost element returned by [`event.composedPath()`](https://developer.mozilla.org/en-US/docs/Web/API/Event/composedPath).

| Anchor | Result |
| --- | --- |
| `target` | The original innermost event target. In all other forms, `target` is optional for brevity but can be included for readability. |
| `< [target]` | The parent element of `target`. |
| `<$ [target]` | The first shadow-root host above `target`. |
| `<selector> <$ [target]` | The first matching element in the light DOM of that first shadow host. |
| `<selector> <$$ [target]` | The first matching element while walking outward through the composed path and crossing shadow roots. |

!!! note
    Event-path interaction anchors are resolved synchronously and can be used with the [`block` directive](directives.md#block).

```yaml
# Nearest shadow host of the event target
anchor: "<$"

# A matching ha-automation-row element in the target host's light DOM
anchor: "ha-automation-row <$"

# The first matching ha-automation-row element in the outward composed path, including shadow-root boundaries
anchor: "ha-automation-row <$$"
```

`<` and `<$` accept `target` explicitly on the right and can be included for readability, but it is more compact to omit it. `<$$` requires an outward selector.

## Select-tree anchors

Use a normal UIX `select_tree` path when an anchor is not determined by the event path, including every server interaction.

!!! note
    `select_tree` paths are described in detail in [DOM navigation](../concepts/dom.md).

```yaml
# Compact absolute form
anchor: "&home-assistant $ hui-dialog-create-card"

# Long form, always absolute from document without needing `&`
anchor:
  select_tree: "home-assistant $ home-assistant-main $ ha-panel-lovelace $ hui-root"
```

For non-`block` interactions, UIX Broker retries a missing `select_tree` anchor every 50 ms for up to two seconds. This is useful for interfaces, such as dialogs, that mount after their initiating event fires.

## Anchors in rules and directives

Rules and directives use the interaction anchor by default. They can also override the interaction anchor with their own `anchor` configuration, in either compact relative or absolute form, or the long `select_tree` form. For the compact absolute form, the path starts with `&`.

Relative:

```yaml
- type: property
  # property directive anchor is relative to the interaction anchor (a dialog in this example)
  anchor: "$ ha-dialog div.body hui-card-picker $ div#content>ha-expansion-panel:nth-of-type(1)"
  set: expanded
  value: false
```

Absolute short form:

```yaml
- type: call
  anchor: "&home-assistant $ ha-more-info-dialog"
  method: closeDialog
```

Absolute long form:

```yaml
- type: call
  anchor:
    select_tree: "home-assistant $ ha-more-info-dialog"
  method: closeDialog
```

## Finding paths in the browser console

To find an absolute anchor path, select an element in the browser inspector and run:

```javascript
uix_broker_absolute_path($0)
```

This reports a compact absolute interaction-anchor path beginning with `&`.

For a directive or rule anchor relative to a previously resolved interaction
anchor, use:

```javascript
uix_broker_path($0)
```

It chooses the closest matching recent interaction anchor. Pass the anchor
explicitly as a second argument when multiple interactions overlap:

```javascript
uix_broker_path($0, $1)
```

See [DOM inspection helpers](../concepts/dom.md#uix_broker_path0-broker-directive-anchor-helper)
for the console helper details.
