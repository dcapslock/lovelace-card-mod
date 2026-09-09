---
title: Examples
description: UIX Broker examples
---
# Examples

## Make the card tab the default in the UI add-card dialog

Outcome:

- Select the card tab when the add-card dialog opens.
- Make sure the first expander, Suggested or Favorites, is open.
- Collapse all other expanders.

Method:

<!-- markdownlint-configure-file {"MD007": { "indent": 4 }} -->
- Listen to `show-dialog` in the `browser` realm.
- The matching rule passes only when the `show-dialog` event's `dialogTag` is `hui-dialog-create-card`.
- Use an absolute short-form interaction anchor that matches the dialog (`hui-dialog-create-card`).
- Directives:
    - Set the dialog's `_currTab` property to `card`. As this property is reactive, there is no need to force an update.
    - Set the first expander's `expanded` property to `true`, using a relative short-form anchor.
    - Set the other expanders' `expanded` property to `false`, using relative short-form anchors.

```yaml
uix_broker:
  - realm: browser
    listen: show-dialog
    anchor: '&home-assistant $ hui-dialog-create-card'

    rules:
      - '@captured.dialogTag': hui-dialog-create-card
    directives:
      - type: property
        set: _currTab
        value: card
        wait: 1000
      - type: property
        anchor: >-
          $ ha-dialog div.body hui-card-picker $ div#content div:nth-of-type(1)
          ha-expansion-panel
        set: expanded
        value: true
      - type: property
        anchor: >-
          $ ha-dialog div.body hui-card-picker $
          div#content>ha-expansion-panel:nth-of-type(1)
        set: expanded
        value: false
      - type: property
        anchor: >-
          $ ha-dialog div.body hui-card-picker $
          div#content>ha-expansion-panel:nth-of-type(2)
        set: expanded
        value: false
      - type: property
        anchor: >-
          $ ha-dialog div.body hui-card-picker $
          div#content>ha-expansion-panel:nth-of-type(3)
        set: expanded
        value: false
```

!!! tip
    Save the YAML as a new file in your Home Assistant configuration directory or subdirectory, then register it using the UIX options config flow.

## Automation sidebar and YAML mode

### Open the automation editor sidebar in YAML mode by default

Combine this with the following example to allow changing YAML mode; by itself, this example locks the automation sidebar to **always** use YAML mode.

Outcome:

- Set the automation sidebar to YAML mode.
- Add button in automation sidebar header to toggle YAML mode.

Method:

- Listen to the `open-sidebar` event in the `browser` realm.
- Set `reentrant: false` to prevent re-entry when toggling YAML mode itself fires `open-sidebar`.
- The interaction anchor is `manual-automation-editor`, which is found through an outward search across the event's composed path and shadow-root boundaries.
- Use a short-form host-element path selection rule to continue only when `uixBlockAutoYamlMode` does **not** exist on the interaction anchor's JavaScript object. This is important when combined with the following example.
- Use a call directive to invoke `_toggleYamlMode()` on `ha-automation-sidebar`, resolved by searching the first shadow root of the interaction anchor, `manual-automation-editor`.
- Use a button directive to place a button before the three dots sidebar menu. The action used in UIX `event` action to which UIX Broker injects the anchor element so `toggle-yaml-mode` bubbles up through `manual-automation-editor` allowing the next example, [Allow toggle YAML mode in automation editor](#allow-toggle-yaml-mode-in-automation-editor) to cover both the stock toggle button in the dropdown as well as the added UIX Broker button.

```yaml
  - realm: browser
    listen: open-sidebar
    reentrant: false
    anchor: manual-automation-editor <$$ target
    rules:
      - '{!.uixBlockAutoYamlMode}'
      - anchor: $ ha-automation-sidebar $$ ha-automation-sidebar-card
        match: '{.yamlMode=false}'
    directives:
      - anchor: $ ha-automation-sidebar
        method: _toggleYamlMode
        type: call
      - type: button
        before: $ ha-automation-sidebar $$ ha-automation-sidebar-card $ ha-dialog-header slot:nth-of-type(3) ha-dropdown
        icon: mdi:code-braces
        tap_action:
          action: fire-dom-event
          uix:
            action: event
            name: toggle-yaml-mode
```

### Allow toggle YAML mode in automation editor

Use this example with the previous one and the next example (a keyboard shortcut to toggle YAML mode).

The Toggle YAML Mode menu item in the automation editor runs code that fires `toggle-yaml-mode`, which ultimately calls `_toggleYamlMode()` on `manual-automation-editor`. Without coordination, this would always force YAML mode. This example works around that by blocking the event, setting a guard property, calling the function directly, then clearing the guard.

Outcome:

- Allow the Toggle YAML Mode menu item to switch between the visual editor and YAML mode.

Method:

- Listen to `toggle-yaml-mode` in the `browser` realm.
- The interaction anchor is `manual-automation-editor`, which is found through an outward search across the event's composed path and shadow-root boundaries.
- Directives:
    - Block the event because it will be handled directly.
    - Set `uixBlockAutoYamlMode` to `true` on `manual-automation-editor`.
    - Use a call directive to invoke `_toggleYamlMode()` on `ha-automation-sidebar`, resolved by searching the first shadow root of the interaction anchor, `manual-automation-editor`. As the previous example checks for the absence of `uixBlockAutoYamlMode`, it does not proceed with its directive to force YAML mode.
    - Clear `uixBlockAutoYamlMode` so the previous example once again forces YAML mode when the sidebar opens.

```yaml
  - realm: browser
    listen: toggle-yaml-mode
    anchor: manual-automation-editor <$$ target
    directives:
      - type: block
      - type: property
        set: uixBlockAutoYamlMode
        value: true
      - anchor: $ ha-automation-sidebar
        method: _toggleYamlMode
        type: call
      - type: property
        clear: uixBlockAutoYamlMode
```

### Toggle YAML mode in automation editor with keyboard shortcut

Outcome:

- Use a keyboard shortcut to toggle YAML mode in the automation editor.

Method:

- Listen for a keyboard shortcut in the `shortcut` realm (`$mod+Shift+Y` in the code below; change it to suit).
- Use the absolute interaction anchor `&home-assistant $$ manual-automation-editor` because the keyboard shortcut target can be any DOM element.
- Directives:
    - Set `uixBlockAutoYamlMode` to `true` on `manual-automation-editor`.
    - Use a call directive to invoke `_toggleYamlMode()` on `ha-automation-sidebar`, resolved by searching the first shadow root of the interaction anchor, `manual-automation-editor`. As the automatic YAML-mode example checks for the absence of `uixBlockAutoYamlMode`, it does not proceed with its directive to force YAML mode.
    - Clear `uixBlockAutoYamlMode` so the automatic YAML-mode example once again forces YAML mode when the sidebar opens.

```yaml
  - realm: shortcut
    enabled: true
    listen: $mod+Shift+Y
    anchor: '&home-assistant $$ manual-automation-editor'
    directives:
      - type: property
        set: uixBlockAutoYamlMode
        value: true
      - anchor: $ ha-automation-sidebar
        method: _toggleYamlMode
        type: call
      - type: property
        clear: uixBlockAutoYamlMode
```

## Automation sidebar and YAML mode complete

??? example "Complete YAML for the three automation sidebar examples"
    Save the YAML as a new file in your Home Assistant configuration directory or subdirectory, then register it using the UIX options config flow.
    ```yaml
    uix_broker:
      - realm: browser
        listen: open-sidebar
        reentrant: false
        anchor: manual-automation-editor <$$ target
        rules:
          - '{!.uixBlockAutoYamlMode}'
          - anchor: $ ha-automation-sidebar $$ ha-automation-sidebar-card
            match: '{.yamlMode=false}'
        directives:
          - anchor: $ ha-automation-sidebar
            method: _toggleYamlMode
            type: call
          - type: button
            before: $ ha-automation-sidebar $$ ha-automation-sidebar-card $ ha-dialog-header slot:nth-of-type(3) ha-dropdown
            icon: mdi:code-braces
            tap_action:
              action: fire-dom-event
              uix:
                action: event
                name: toggle-yaml-mode
      - realm: browser
        listen: toggle-yaml-mode
        anchor: manual-automation-editor <$$ target
        directives:
          - type: block
          - type: property
            set: uixBlockAutoYamlMode
            value: true
          - anchor: $ ha-automation-sidebar
            method: _toggleYamlMode
            type: call
          - type: property
            clear: uixBlockAutoYamlMode
      - realm: shortcut
        enabled: true
        listen: $mod+Shift+Y
        anchor: '&home-assistant $$ manual-automation-editor'
        directives:
          - type: property
            set: uixBlockAutoYamlMode
            value: true
          - anchor: $ ha-automation-sidebar
            method: _toggleYamlMode
            type: call
          - type: property
            clear: uixBlockAutoYamlMode
    ```

## Prioritize entity triggers when adding an automation editor element

Outcome:

- Jump straight to entity triggers when adding an automation editor element.

Method:

- Listen for the `show-dialog` event in the `browser` realm.
- First matching rule passes only when the `show-dialog` event's `dialogTag` is `add-automation-element-dialog`.
- Second matching rules passes only when the type is `trigger` and not other types which can be `action` or `condition`.
- Use an absolute short-form interaction anchor that matches the dialog (`add-automation-element-dialog`).
- Directives:
    - Set the `_tab` property to `groups`; `groups` is the value for By Type.
    - Set `_selectedGroup` to `entity` to focus on the generic entity triggers.

```yaml
  - realm: browser
    listen: show-dialog
    anchor: '&home-assistant $ add-automation-element-dialog'
    rules:
      - '@captured.dialogTag': add-automation-element-dialog
      - "@captured.dialogParams.type": trigger
    directives:
      - type: property
        set: _tab
        value: groups
      - type: property
        set: _selectedGroup
        value: entity
```

## Add tools button to sidebar title

Outcome: A tools button that navigates to /config/tools.

Method:

- Listen for the `uix-broker-ready` event in the `browser` realm.
- Uses compact absolute anchor for `ha-sidebar`
- The matching rule only passes when `user.is_admin` property of the `hass` object on `home-assistant` is true (this could also be `user.is_owner` to match only the owner user).
- Uses `button` directive to place button after the title using simple style object to give a box-shadow and reduced icon size.

```yaml
  - realm: browser
    listen: uix-broker-ready
    anchor: "&home-assistant $ home-assistant-main $ ha-sidebar"
    rules:
      - anchor: "&home-assistant"
        match: "{.hass.user.is_admin=true}"
    directives:
      - type: button
        anchor: "$ div.menu div.title"
        icon: mdi:hammer
        color: purple
        size: s
        tap_action:
          action: navigate
          navigation_path: /config/tools
        style:
          "--ha-button-box-shadow": rgba(0, 0, 0, 0.1) 0px 4px 12px
          "--ha-icon-button-size": 32px
```

![Broker button directive example](../assets/page-assets/broker/broker-button-directive.png){ width="450" }

## Change device entities suggested card back to entities for section views

Outcome:

- Make the device entities suggested card for section views an entities card. NOTE: This is not the same as what is suggested for other views which is based on entity domain.

Method:

- Listen for the `show-dialog` event in the `browser` realm.
- The matching rule passes only when the `show-dialog` event's `dialogTag` is `hui-dialog-suggest-card`.
- The interaction is set as `reentrant: false` because it fires `show-dialog` itself.
- The interaction anchor is `&home-assistant`. Since the directives include `block`, an anchor that exists synchronously is required. Alternatively, `anchor: target` could be used as the event-path anchor, with `anchor: "&home-assistant"` set on the event directive.
- Directives:
    - A `block` directive stops propagation on the original event.
    - An `event` directive re-dispatches the event with a modified `dialogParams.sectionConfig`, setting `cards` to a single `entities`. `sectionConfig.type` and `sectionConfig.title` are copied from captured data using the `@captured` form. To avoid copying the rest of the event data object by object, `capture_data: deep` performs a deep merge of `sectionConfig`.

```yaml
  - realm: browser
    listen: show-dialog
    debug: true
    reentrant: false
    anchor: "&home-assistant"
    rules:
      - "@captured.dialogTag": hui-dialog-suggest-card
    directives:
      - type: block
      - type: event
        name: show-dialog
        bubbles: true
        composed: true
        capture_data: deep
        data:
          dialogParams:
            sectionConfig:
              type: "@captured.dialogParams.sectionConfig.type"
              title: "@captured.dialogParams.sectionConfig.title"
              cards:
                - type: entities
                  entities: "@captured.dialogParams.entities"
```

## Light button on Home dashboard menu item on sidebar

Outcome:

- Similar to [Add tools button to sidebar title](#add-tools-button-to-sidebar-title) this example adds a toggle button for a light to the Home sidebar menu item. To reflect the current state of the light, a Server realm to Browser realm helper interaction is used as well to have the main interaction run when the entity state changes.

Method (sidebar interaction):

- Listen for the `uix-broker-ready` and `uix-update-sidebar` events in the `browser` realm. `uix-update-sidebar` is a custom event and any name could be used as long as it matched the helper interaction.
- Uses compact absolute anchor for `ha-sidebar`
- Directives:
    - `javascript` directive to set object parameters to be used in `button` directive. `icon` and `color` are set by entity state.
    - Uses `button` directive to place button after the Home menu item using simple style object to give a box-shadow and reduced icon size. Action set to toggle light. NOTE: Config and operation of this button is per [UIX Forge Button spark](../forge/sparks/button.md), for which the entity is included for action only.

```yaml
  - realm: browser
    listen:
      - uix-broker-ready
      - uix-update-sidebar # custom event from Server realm interaction helper
    anchor: "&home-assistant $ home-assistant-main $ ha-sidebar"
    directives:
      - type: javascript
        id: button_config
        code: |
          const entity = 'light.bed_light';
          const state = hass.states[entity].state;
          return {
            entity: entity,
            icon: state === 'on' ? 'mdi:lightbulb-on' : 'mdi:lightbulb-off',
            color: state === 'on' ? 'var(--state-active-color)' : 'var(--state-inactive-color)'
          };
      - type: button
        anchor: "$ ha-list-item-button#sidebar-panel-home $ a#item div.content"
        icon: "@button_config.icon"
        color: "@button_config.color"
        entity: "@button_config.entity"
        size: s
        tap_action:
          action: toggle
        style:
          "--ha-button-box-shadow": rgba(0, 0, 0, 0.1) 0px 4px 12px
          "--ha-icon-button-size": 32px
          "--uix-button-margin": 6px
```

Method (helper interaction):

Outcome:

- Fire a custom Browser event when the entity state changes. This makes the example interaction above reactive to state changes for `light.bed_light`.

Method:

- Listen for `state_changed` event in server realm.
- Set anchor to home-assistant element using absolute compact anchor form.
- `event` directive to fire the custom Browser event `uix-update-sidebar` if the changed state `entity_id` is `light.bed_light`. This example would also fire if the `entity_id` is `light.other_light`. This is included in this example to show use of `or:` in match; you would use such a technique if you add other button directives to the example above.

```yaml
  - realm: server
    listen: state_changed
    anchor: "&home-assistant"
    directives:
      - type: event
        name: uix-update-sidebar
        rules:
          - type: captured
            path: data.entity_id
            match:
              or:
                - light.bed_light
                - light.other_light
```

![Button directive light toggle example](../assets/page-assets/broker/broker-button-light-directive.gif)
