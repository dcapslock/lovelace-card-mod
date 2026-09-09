---
title: Always patch ha-card (Experimental)
description: Learn how to enable the patching of ha-card at all times with this experimental setting
---
# Always patch ha-card

By default, UIX does not patch `ha-card` if it cannot find a card config in the first Frontend or custom element in its ancestor DOM tree. This experimental option allows for always patching ha-card element so theme variable `uix-card(-yaml)` can apply. `ha-card` without config may be used on config or custom panels.

When `ha-card` is patched without config the class `type-generic-card` will be added to `ha-card`.

## Setting via the integration UI

The option is **unset by default**. To set the option:

1. In Home Assistant, go to **Settings → Devices & Services → UI eXtension → Configure**.
2. Select **Experimental settings** from the menu.
3. Toggle **Always patch ha-card** on.
4. Save.

The setting is available immediately across all connected browser sessions. A page reload may be required for the setting to take effect.

## Behavior when set

When this option is set:

- `ha-card` is always patched even when there is no card config available.
- When patched in this way the class `type-generic-card` will be added to `ha-card`.
