"""UIX-specific extensions for the ha-tests scenario runner.

Importing this module registers the UIX interaction types
(``add_foundry``, ``delete_foundry``, ``add_foundry_file``,
``remove_foundry_file``, ``reload_foundry_files``, ``add_broker_file``,
``remove_broker_file``, ``reload_broker_files``, ``set_theme_file``) with
:mod:`scenario_runner` so they can be used in scenario YAML files.

This module is imported by ``tests/conftest.py`` at session start, which
ensures the handlers are registered before pytest collects and parametrises
tests.

Interaction types registered
-----------------------------
add_foundry
    Create or update a named UIX foundry via ``uix/set_foundry``.

    .. code-block:: yaml

        - type: add_foundry
          name: my-foundry
          config:
            forge:
              mold: card
            element:
              type: tile
              entity: light.bed_light

delete_foundry
    Delete a named UIX foundry via ``uix/delete_foundry``.

    .. code-block:: yaml

        - type: delete_foundry
          name: my-foundry

add_foundry_file
    Register a YAML foundry file with UIX via ``uix/add_foundry_file``.
    The file must already exist in the HA config directory.

    .. code-block:: yaml

        - type: add_foundry_file
          file_path: uix_test_foundries.yaml

remove_foundry_file
    Deregister a foundry YAML file via ``uix/remove_foundry_file``.

    .. code-block:: yaml

        - type: remove_foundry_file
          file_path: uix_test_foundries.yaml

reload_foundry_files
    Re-read all registered foundry files via ``uix/reload_foundry_files``.

    .. code-block:: yaml

        - type: reload_foundry_files

add_broker_file
    Register a YAML Broker file with UIX via ``uix/add_broker_file``.
    The file must already exist in the HA config directory.

    .. code-block:: yaml

        - type: add_broker_file
          file_path: uix_test_broker.yaml

remove_broker_file
    Deregister a Broker YAML file via ``uix/remove_broker_file``.

    .. code-block:: yaml

        - type: remove_broker_file
          file_path: uix_test_broker.yaml

reload_broker_files
    Re-read all registered Broker files via ``uix/reload_broker_files``.

    .. code-block:: yaml

        - type: reload_broker_files

set_theme_file
    Write Home Assistant ``themes.yaml`` for scenario setup/interactions.
    Can either write full file content directly, or update a single theme
    from the base ``themes.yaml``.

    .. code-block:: yaml

        - type: set_theme_file
          theme: uix-local-orange
          values:
            primary-color: "#ff00ff"
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import TYPE_CHECKING, Any

import yaml
from ha_testcontainer.visual.scenario_runner import (
    _write_config_file,
    register_interaction_type,
)

if TYPE_CHECKING:
    from playwright.sync_api import Page


# ---------------------------------------------------------------------------
# Handler implementations
# ---------------------------------------------------------------------------


def _add_foundry(page: "Page | None", interaction: dict[str, Any], ha: Any = None) -> None:
    """Create or update a UIX foundry via the WebSocket API (``uix/set_foundry``)."""
    if ha is None:
        raise ValueError(
            "add_foundry interaction requires the ha container — "
            "pass ha= to run_interactions()"
        )
    name: str = interaction["name"]
    config: dict[str, Any] = dict(interaction["config"])
    result = ha._ws_call(
        {
            "id": 1,
            "type": "uix/set_foundry",
            "name": name,
            "config": config,
        }
    )
    if not result.get("success"):
        raise RuntimeError(f"uix/set_foundry failed for {name!r}: {result}")


def _delete_foundry(page: "Page | None", interaction: dict[str, Any], ha: Any = None) -> None:
    """Delete a UIX foundry via the WebSocket API (``uix/delete_foundry``)."""
    if ha is None:
        raise ValueError(
            "delete_foundry interaction requires the ha container — "
            "pass ha= to run_interactions()"
        )
    name: str = interaction["name"]
    result = ha._ws_call(
        {
            "id": 1,
            "type": "uix/delete_foundry",
            "name": name,
        }
    )
    if not result.get("success"):
        raise RuntimeError(f"uix/delete_foundry failed for {name!r}: {result}")


def _add_foundry_file(page: "Page | None", interaction: dict[str, Any], ha: Any = None) -> None:
    """Register a foundry YAML file via ``uix/add_foundry_file``.

    The file must already exist in the HA config directory.
    """
    if ha is None:
        raise ValueError(
            "add_foundry_file interaction requires the ha container — "
            "pass ha= to run_interactions()"
        )
    file_path: str = interaction["file_path"]
    result = ha._ws_call(
        {
            "id": 1,
            "type": "uix/add_foundry_file",
            "file_path": file_path,
        }
    )
    if not result.get("success"):
        raise RuntimeError(f"uix/add_foundry_file failed for {file_path!r}: {result}")


def _remove_foundry_file(page: "Page | None", interaction: dict[str, Any], ha: Any = None) -> None:
    """Deregister a foundry YAML file via ``uix/remove_foundry_file``.

    The file itself is not deleted; only its path is removed from the UIX
    config entry.
    """
    if ha is None:
        raise ValueError(
            "remove_foundry_file interaction requires the ha container — "
            "pass ha= to run_interactions()"
        )
    file_path: str = interaction["file_path"]
    result = ha._ws_call(
        {
            "id": 1,
            "type": "uix/remove_foundry_file",
            "file_path": file_path,
        }
    )
    if not result.get("success"):
        raise RuntimeError(f"uix/remove_foundry_file failed for {file_path!r}: {result}")


def _reload_foundry_files(page: "Page | None", interaction: dict[str, Any], ha: Any = None) -> None:
    """Trigger a re-read of all registered foundry files via ``uix/reload_foundry_files``."""
    if ha is None:
        raise ValueError(
            "reload_foundry_files interaction requires the ha container — "
            "pass ha= to run_interactions()"
        )
    result = ha._ws_call(
        {
            "id": 1,
            "type": "uix/reload_foundry_files",
        }
    )
    if not result.get("success"):
        raise RuntimeError(f"uix/reload_foundry_files failed: {result}")


def _add_broker_file(page: "Page | None", interaction: dict[str, Any], ha: Any = None) -> None:
    """Register a Broker YAML file via ``uix/add_broker_file``.

    The file must already exist in the HA config directory.
    """
    if ha is None:
        raise ValueError(
            "add_broker_file interaction requires the ha container — "
            "pass ha= to run_interactions()"
        )
    file_path: str = interaction["file_path"]
    result = ha._ws_call(
        {
            "id": 1,
            "type": "uix/add_broker_file",
            "file_path": file_path,
        }
    )
    if not result.get("success"):
        raise RuntimeError(f"uix/add_broker_file failed for {file_path!r}: {result}")


def _remove_broker_file(page: "Page | None", interaction: dict[str, Any], ha: Any = None) -> None:
    """Deregister a Broker YAML file via ``uix/remove_broker_file``.

    The file itself is not deleted; only its path is removed from the UIX
    config entry.
    """
    if ha is None:
        raise ValueError(
            "remove_broker_file interaction requires the ha container — "
            "pass ha= to run_interactions()"
        )
    file_path: str = interaction["file_path"]
    result = ha._ws_call(
        {
            "id": 1,
            "type": "uix/remove_broker_file",
            "file_path": file_path,
        }
    )
    if not result.get("success"):
        raise RuntimeError(f"uix/remove_broker_file failed for {file_path!r}: {result}")


def _reload_broker_files(page: "Page | None", interaction: dict[str, Any], ha: Any = None) -> None:
    """Trigger a re-read of all registered Broker files via ``uix/reload_broker_files``."""
    if ha is None:
        raise ValueError(
            "reload_broker_files interaction requires the ha container — "
            "pass ha= to run_interactions()"
        )
    result = ha._ws_call(
        {
            "id": 1,
            "type": "uix/reload_broker_files",
        }
    )
    if not result.get("success"):
        raise RuntimeError(f"uix/reload_broker_files failed: {result}")


def _set_theme_file(page: "Page | None", interaction: dict[str, Any], ha: Any = None) -> None:
    """Write ``themes.yaml`` content for a scenario.

    Supported forms:
    1) full file write:
         {type: set_theme_file, content: "...yaml..."}
    2) update one theme from the base themes file:
         {type: set_theme_file, theme: "my-theme", values: {...}}
    """
    if ha is None:
        raise ValueError(
            "set_theme_file interaction requires the ha container — "
            "pass ha= to run_interactions()"
        )

    path = interaction.get("path", "themes.yaml")
    content = interaction.get("content")

    if content is None:
        theme_name = interaction["theme"]
        values = interaction["values"]

        ha_config_path = os.environ.get("HA_CONFIG_PATH")
        if not ha_config_path:
            raise RuntimeError(
                "set_theme_file requires HA_CONFIG_PATH environment variable to locate the base themes.yaml for theme updates"
            )
        themes_path = Path(ha_config_path) / "themes.yaml"
        base_content = themes_path.read_text(encoding="utf-8")
        themes_data = yaml.safe_load(base_content) or {}

        theme_data = themes_data.get(theme_name)
        if theme_data is None:
            theme_data = {}
            themes_data[theme_name] = theme_data
        if not isinstance(theme_data, dict):
            raise ValueError(
                f"Theme {theme_name!r} must be a mapping, got {type(theme_data).__name__}"
            )

        theme_data.update(values)
        content = yaml.safe_dump(themes_data, sort_keys=False)

    _write_config_file(
        ha,
        {
            "path": path,
            "content": content,
        },
    )


def _mock_history(page: "Page | None", interaction: dict[str, Any], ha: Any = None) -> None:
    """Inject location history mock script on page load via page.add_init_script."""
    import json
    import time

    if page is None:
        raise ValueError(
            "mock_history interaction requires the playwright page — "
            "make sure it is run in a visual/page test context."
        )

    entity_id: str = interaction["entity_id"]
    points: list[dict[str, Any]] = interaction.get("points", [])

    # Calculate actual epoch timestamps for historical records based on age_hours
    now = time.time()
    mock_points = []
    for p in points:
        lat = p["lat"]
        lng = p["lng"]
        age_hours = p.get("age_hours", 0)
        timestamp = now - (age_hours * 3600)

        mock_points.append({
            "a": {
                "latitude": lat,
                "longitude": lng,
                "source_type": "gps",
                "gps_accuracy": p.get("accuracy", 1),
            },
            "s": p.get("state", "not_home"),
            "lc": timestamp,
            "lu": timestamp
        })

    # JS script generation
    js_script = f"""
    (() => {{
      const entityId = {json.dumps(entity_id)};
      const mockPoints = {json.dumps(mock_points)};

      if (!window.__uixMockHistory) {{
        window.__uixMockHistory = {{}};
      }}
      window.__uixMockHistory[entityId] = mockPoints;

      if (window.__uixWebSocketMocked) {{
        return;
      }}
      window.__uixWebSocketMocked = true;

      const OriginalWS = window.WebSocket;
      window.WebSocket = class extends OriginalWS {{
        constructor(...args) {{
          super(...args);
          
          const originalSend = this.send;
          this.send = (data) => {{
            let parsed;
            try {{
              parsed = JSON.parse(data);
            }} catch (e) {{
              originalSend.call(this, data);
              return;
            }}

            if (parsed && (parsed.type === "history/stream" || parsed.type === "history/history_during_period")) {{
              const subId = parsed.id;
              const entityIds = parsed.entity_ids || [];
              
              const mockedStates = {{}};
              let anyMocked = false;
              
              for (const entId of entityIds) {{
                if (window.__uixMockHistory && window.__uixMockHistory[entId]) {{
                  mockedStates[entId] = window.__uixMockHistory[entId];
                  anyMocked = true;
                }}
              }}

              if (anyMocked) {{
                console.log("[UIX Mock History] Intercepted mock history call:", parsed.type, entityIds);
                const triggerMessage = (payloadStr) => {{
                  const event = new MessageEvent("message", {{ data: payloadStr }});
                  this.dispatchEvent(event);
                  if (typeof this.onmessage === "function") {{
                    this.onmessage(event);
                  }}
                }};

                if (parsed.type === "history/history_during_period") {{
                  setTimeout(() => {{
                    triggerMessage(JSON.stringify({{
                      id: subId,
                      type: "result",
                      success: true,
                      result: mockedStates
                    }}));
                  }}, 15);
                }} else {{
                  // history/stream
                  // 1. Success response
                  setTimeout(() => {{
                    triggerMessage(JSON.stringify({{
                      id: subId,
                      type: "result",
                      success: true,
                      result: null
                    }}));
                  }}, 10);

                  // 2. Data response
                  setTimeout(() => {{
                    const startTimeStr = parsed.start_time || new Date(Date.now() - 24 * 3600 * 1000).toISOString();
                    const endTimeStr = parsed.end_time || new Date().toISOString();
                    
                    triggerMessage(JSON.stringify({{
                      id: subId,
                      type: "event",
                      event: {{
                        states: mockedStates,
                        start_time: startTimeStr,
                        end_time: endTimeStr
                      }}
                    }}));
                  }}, 30);
                }}
                
                return;
              }}
            }}

            originalSend.call(this, data);
          }};
        }}
      }};
    }})();
    """

    page.add_init_script(js_script)


def _webhook(page: "Page | None", interaction: dict[str, Any], ha: Any = None) -> None:
    """Send a webhook via fetch() in the page JavaScript context."""
    if ha is None:
        raise ValueError(
            "webhook interaction requires the ha container — "
            "pass ha= to run_interactions()"
        )
    
    webhook_id: str = interaction["webhook_id"]
    payload: dict[str, Any] = interaction.get("payload", {})

    ha.api(
        "POST",
        f"webhook/{webhook_id}",
        json=payload,
    ).raise_for_status()

# ---------------------------------------------------------------------------
# Registration — executed at import time
# ---------------------------------------------------------------------------

register_interaction_type("add_foundry", _add_foundry)
register_interaction_type("delete_foundry", _delete_foundry)
register_interaction_type("add_foundry_file", _add_foundry_file)
register_interaction_type("remove_foundry_file", _remove_foundry_file)
register_interaction_type("reload_foundry_files", _reload_foundry_files)
register_interaction_type("add_broker_file", _add_broker_file)
register_interaction_type("remove_broker_file", _remove_broker_file)
register_interaction_type("reload_broker_files", _reload_broker_files)
register_interaction_type("set_theme_file", _set_theme_file)
register_interaction_type("mock_history", _mock_history)
register_interaction_type("webhook", _webhook)
