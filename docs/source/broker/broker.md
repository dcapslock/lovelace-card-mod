---
title: Broker
description: Configure UIX Broker interactions and manage their configuration sources.
---
# UIX Broker

An interaction has a `realm`, a `listen` value, an interaction `anchor`, optional `rules`, and an ordered list of `directives`.

```yaml
uix_broker:
  - realm: shortcut
    debug: true
    listen: "$mod+Shift+Y"
    anchor: '&home-assistant'
    directives:
      - type: action
        action: fire-dom-event
        uix:
          action: toast
          data:
            message: Shortcut pressed
```

See [Realms](./realms.md), [Interaction Anchors](./interaction-anchors.md), [Rules](./rules.md), and [Directives](./directives.md) for each part of an interaction.

## Interaction options

| Key | Description |
| --- | --- |
| `realm` | Where UIX listens: `browser`, `shortcut`, or `server`. |
| `listen` | The DOM event name, [Tinykeys](https://jamiebuilds.github.io/tinykeys/) binding, or Home Assistant event-bus event name for the selected realm. In the `browser` realm, this may also be a list of DOM event names. |
| `anchor` | The element to inspect and use as the default rule and directive target. |
| `rules` | Optional conditions that must all match before directives run. |
| `directives` | Ordered operations to apply when the interaction matches. |
| `enabled` | Defaults to `true`. Set to `false` to retain an interaction in configuration without registering it. |
| `reentrant` | Defaults to `true`. Set to `false` to ignore matching events for the same interaction while it is resolving or running. |
| `debug` | Set to `true` to log the interaction lifecycle in the browser developer console. |

Each interaction is independent. All of its rules must match before directives run, and directives run one at a time in configuration order.

Use a browser-realm `listen` list when the same interaction should run for more than one browser event:

```yaml
- realm: browser
  listen:
    - uix-broker-ready
    - uix-update
  anchor: '&home-assistant'
  directives:
    - type: call
      method: requestUpdate
```

Lists are supported only in the `browser` realm; `shortcut` and `server` interactions each listen for one binding or event name.

`reentrant: false` is useful when an interaction dispatches the same event that started it. The interaction is considered active while anchors are resolving, directives are running, and directive waits are in progress.

## Broker ready event

After UIX Broker applies its configuration, it dispatches a `uix-broker-ready` browser event on `window`. The event fires after Broker has registered its browser-realm listeners, so an interaction can listen to this event to apply an initial UI customisation. It also fires after every Broker configuration reload.

See [Add tools button to sidebar title](./examples.md#add-tools-button-to-sidebar-title) for an example using this event.

## Configuration sources

Configure interactions in one or more of the following ways:

1. In the UIX options flow — **Settings → Devices & services → UIX → Configure (Cog) →
Configure Broker**.
1. In one or more registered YAML files — **Settings → Devices & services → UIX → Configure (Cog) →
Manage Broker files**.

Each YAML file is a mapping with a top-level `uix_broker` list:

```yaml
uix_broker:
  - realm: browser
    listen: click
    anchor: target
    rules:
      - home-assistant
    directives:
      - type: block
```

Use **Manage Broker files** to register, deregister, or reload files. File paths may be absolute or relative to the Home Assistant configuration directory. Registered files are read in registration order, then UI-configured interactions are appended. All interactions are delivered to connected browsers as one list.

YAML file configurations use the same Home Assistant YAML resolution as Foundries, including `!include` and `!secret`. The **UIX Broker** action in **Tools → YAML** reloads all registered Broker files and reports file
errors. For YAML-mode dashboards, the dashboard's built-in **Refresh** action
also reloads registered Broker files.

## Synchronous vs asynchronous interaction execution paths

Captured-data and browser-identity rules run synchronously before interaction-anchor resolution. Event-path interaction anchors are also resolved synchronously. This allows a browser-realm interaction to apply a `block` directive using captured data, browser identity, and elements already in the event's composed path.

Because the `block` [directive](directives.md) must run synchronously, interactions containing `block` require their [interaction anchor](interaction-anchors.md) and [host-element rule](rules.md#host-element-rules) anchors to be immediately available. UIX Broker makes one synchronous lookup; if either is unavailable, it skips the interaction.

After a blocking interaction has resolved and applied `block`, anchors supplied by later `property`, `event`, `call`, and `button` directives still use the normal asynchronous retry behaviour.

For interactions without `block`, missing [interaction anchors](interaction-anchors.md) and [host-element rule](rules.md#host-element-rules) anchors are retried every 50 ms for up to two seconds. This permits an interaction listening to a browser event such as `show-dialog` to wait for the dialog to mount before selecting the dialog or one of its elements as the interaction anchor.

See [Realms](realms.md), [Interaction Anchors](interaction-anchors.md), and [Rules](rules.md) for more information.

## Debugging

Set `debug: true` on an interaction to log listener activity, anchor resolution, every rule result, and each directive before and after it runs. The post-run entry for a `template` or `javascript` directive also includes its saved result. Debug log messages are labelled with the interaction's realm and listen value.

```yaml
- realm: browser
  listen: click
  anchor: target
  debug: true
  rules:
    - ".action-button"
  directives:
    - type: event
      name: another-event
```

## Interaction reactivity

UIX Broker [`template` and `javascript` directives](directives.md) run only when their interaction runs; neither subscribes to state changes. If you wish to have an interaction be reactive to entity state updates you create a helper interaction that listens to `state_changed`, with a [rule](./rules.md) to match the entity you wish an interaction to be reactive for and use a `event` directive to fire custom browser event and add that to your listen list for the interaction.

Server realm to Browser realm interaction:

```yaml
  - realm: server
    listen: state_changed
    anchor: "&home-assistant"
    directives:
      - type: event
        name: uix-update-my-interaction
        rules:
          - type: captured
            path: data.entity_id
            match:
              or:
                - switch.bed_light
                - light.bed_light
```

Browser realm interaction:

```yaml
  - realm: browser
    listen:
      - uix-broker-ready
      - uix-update-my-interaction
    anchor: "&home-assistant $ home-assistant-main $ ha-sidebar"
    #... rules and directives
```

See [Light button on Home dashboard menu item on sidebar](./examples.md#light-button-on-home-dashboard-menu-item-on-sidebar) for a full example.
