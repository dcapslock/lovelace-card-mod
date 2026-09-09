---
title: Style custom panels loaded as iframe (Experimental)
description: Learn how to enable the styling of custom panels loaded as iFrame with this experimental setting
---
# Styling custom panels loaded as iframe

By default, UIX does not style custom panels loaded as iframe. Use this experimental setting to enable styling of custom panels. See [Styling custom panels as iframe](../using/custom-panels.md) for more information and examples.

## Setting via the integration UI

The option is **unset by default**. To set the option:

1. In Home Assistant, go to **Settings → Devices & Services → UI eXtension → Configure**.
2. Select **Experimental settings** from the menu.
3. Toggle **Style custom panels loaded as iFrame** on.
4. Save.

The setting is available immediately across all connected browser sessions. A page reload may be required for the setting to take effect on any currently displayed custom panel.

## Behavior when set

When this option is set:

- custom panels are styled by a patch in `ha-panel-custom` to create a patched Home Assistant Frontend `customPanelJS` file to be used by the custom panel iframe, running standard Home Assistant Frontend `customPanelJS` and then a condensed UIX javascript module.
- applies UIX styling to the main custom panel element.
- if UIX detects a theme is not applied, UIX Styling is applied with the currently loaded Home Assistant Frontend theme. Some custom panels like HACS apply the theme, and in this case UIX styling will inherit the applied theme.
