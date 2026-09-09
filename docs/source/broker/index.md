---
title: UIX Broker
description: Create declarative frontend event interactions for Home Assistant with UIX Broker.
---
# UIX Broker

UIX Broker turns browser events, keyboard shortcuts, and Home Assistant event-bus events into declarative interactions. An interaction selects a browser element, checks optional rules, then runs directives in their configured order.

```text
Realm → Listen → Interaction anchor → Rules (Optional anchors) → Directives (Optional anchors)
```

Use UIX Broker when an interface behaviour can be configured rather than written as a custom card, script, or patch. UIX Broker can react to a click, customise an event before redispatching it, focus an element, update an object property, invoke a safe element method, add an interactive button, and run JavaScript actions with interaction variables available.

```yaml
uix_broker:
  - realm: browser
    listen: click
    anchor: target
    rules:
      - ".action-button"
    directives:
      - type: block
      - type: event
        name: another-action
        data:
          source: action-button
```

## UIX Broker guides

- [Broker](./broker.md) — interaction structure, configuration sources, lifecycle, and debugging.
- [Realms](./realms.md) — browser events, keyboard shortcuts, and Home Assistant event-bus events.
- [Interaction Anchors](./interaction-anchors.md) — composed event-path and `select_tree` element selection.
- [Rules](./rules.md) — host-element, captured-data, and browser-identity matching.
- [Directives](./directives.md) — `block`, `property`, `event`, `call`, `button`, and Home Assistant actions.
- [Examples](./examples.md) — examples. Also see [UIX Guides](https://uix-guides.lf.technology), where further detailed examples may be published.

!!! note
    For browser-identity matching, [Browser Mod](https://github.com/thomasloven/hass-browser_mod) is required.

## Future features

UIX Broker is in active development. All features and examples so far have come from user ideas shared in the Community forum. If you have an idea for how UIX Broker can be extended, please start a [GitHub discussion](https://github.com/Lint-Free-Technology/uix/discussions). Features that get 10 upvotes can be moved to a Feature Request in the UIX GitHub issue tracker.

Planned future UIX Broker features include:

- **JavaScript rule**: runs JavaScript with current interaction state provided as variables. Returns an object with `{result: <truthy>, [optional] namedObject: <object data>}`, with the optional `namedObject` then available for further rules and all directives.
- **Expanded JavaScript action directive**: supports return from the current JavaScript action directive. Return format: `{continue: <truthy>, [optional] namedObject: <object data>}`. If `continue` is false, no further directives are run. The optional `namedObject` is then available for the rest of the directive operations.
- **Jinja2 template rule**: renders a one-off Jinja2 template which returns a truthy result and can optionally return object data.
