from __future__ import annotations

import subprocess
from functools import lru_cache
from pathlib import Path

from playwright.sync_api import Page

REPO_ROOT = Path(__file__).resolve().parent.parent
CONSOLE_DEBUG_TS = REPO_ROOT / "src" / "console_debug.ts"


@lru_cache(maxsize=1)
def _transpiled_console_debug() -> str:
    return subprocess.check_output(
        [
            "node",
            "-e",
            (
                "const fs = require('fs');"
                "const esbuild = require('esbuild');"
                "const path = process.argv[1];"
                "const source = fs.readFileSync(path, 'utf8');"
                "const { code: outputText } = esbuild.transformSync(source, {"
                "  loader: 'ts', target: 'es2020'"
                "});"
                "process.stdout.write(outputText);"
            ),
            str(CONSOLE_DEBUG_TS),
        ],
        cwd=REPO_ROOT,
        text=True,
    )


def _load_console_debug(page: Page) -> None:
    page.set_content("<!doctype html><html><body></body></html>")
    page.add_script_tag(content=_transpiled_console_debug())


def _run_helper(page: Page, helper_name: str, setup_script: str) -> list[dict[str, str]]:
    return page.evaluate(
        """({ helperName, setupScript }) => {
          document.body.innerHTML = "";
          const messages = [];
          const methods = ["log", "warn", "error", "group", "groupCollapsed", "groupEnd"];
          const originals = {};
          const stringify = (value) => {
            if (typeof value === "string") return value;
            if (value?.localName) return `<${value.localName}>`;
            return String(value);
          };
          for (const method of methods) {
            originals[method] = console[method];
            console[method] = (...args) => {
              messages.push({
                type: method,
                text: args.map(stringify).join(" "),
              });
            };
          }
          try {
            const target = new Function(`return ${setupScript}`)();
            window[helperName](target);
          } finally {
            for (const method of methods) {
              console[method] = originals[method];
            }
          }
          return messages;
        }""",
        {"helperName": helper_name, "setupScript": setup_script},
    )


def _has_message(messages: list[dict[str, str]], text: str, message_type: str | None = None) -> bool:
    return any(
        text in message["text"] and (message_type is None or message["type"] == message_type)
        for message in messages
    )


def test_uix_path_finds_shadow_context_parent(page: Page) -> None:
    _load_console_debug(page)
    messages = _run_helper(
        page,
        "uix_path",
        """(() => {
          const host = document.createElement("div");
          const shadow = host.attachShadow({ mode: "open" });
          const target = document.createElement("span");
          target.id = "shadow-target";
          shadow.append(target);
          host._uix = [{ type: "card", parentNode: shadow, variables: {} }];
          document.body.append(host);
          return target;
        })()""",
    )

    assert not _has_message(messages, "No UIX parent found for this element.", "warn")
    assert _has_message(messages, "📦 Closest UIX Parent", "log")
    assert _has_message(messages, 'Path: "."', "log")


def test_uix_path_ignores_shadow_only_parent_for_light_dom_target(page: Page) -> None:
    _load_console_debug(page)
    messages = _run_helper(
        page,
        "uix_path",
        """(() => {
          const host = document.createElement("div");
          const shadow = host.attachShadow({ mode: "open" });
          shadow.append(document.createElement("uix-node"));
          const target = document.createElement("span");
          target.id = "light-target";
          host.append(target);
          host._uix = [{ type: "card", parentNode: shadow, variables: {} }];
          document.body.append(host);
          return target;
        })()""",
    )

    assert _has_message(messages, "No UIX parent found for this element.", "warn")
    assert not _has_message(messages, "📦 Closest UIX Parent", "log")


def test_uix_path_uses_matching_context_when_parent_has_multiple_uix_nodes(page: Page) -> None:
    _load_console_debug(page)
    messages = _run_helper(
        page,
        "uix_path",
        """(() => {
          const drawer = document.createElement("ha-drawer");
          const shadow = drawer.attachShadow({ mode: "open" });
          shadow.append(document.createElement("uix-node"));

          const notificationDrawer = document.createElement("notification-drawer");
          const child = document.createElement("button");
          child.id = "notification-target";
          notificationDrawer.append(child);
          drawer.append(notificationDrawer);

          drawer._uix = [
            { type: "drawer", parentNode: shadow, variables: {} },
            { type: "dialog", parentNode: drawer, variables: {} },
          ];
          document.body.append(drawer);
          return child;
        })()""",
    )

    assert not _has_message(messages, "No UIX parent found for this element.", "warn")
    assert _has_message(messages, "📦 Closest UIX Parent", "log")
    assert _has_message(messages, "UIX type: dialog", "log")
    assert _has_message(messages, 'Path: "."', "log")


def test_uix_forge_path_finds_forged_subtree_target(page: Page) -> None:
    _load_console_debug(page)
    messages = _run_helper(
        page,
        "uix_forge_path",
        """(() => {
          const forge = document.createElement("uix-forge");
          const shadow = forge.attachShadow({ mode: "open" });
          const forged = document.createElement("div");
          const target = document.createElement("button");
          target.id = "forge-target";
          forged.append(target);
          shadow.append(forged);
          forge.forgedElement = forged;
          document.body.append(forge);
          return target;
        })()""",
    )

    assert not _has_message(messages, "No uix-forge parent found for this element.", "warn")
    assert _has_message(messages, "📦 Closest UIX Forge Parent", "log")
    assert _has_message(messages, 'Path: "button#forge-target"', "log")


def test_uix_forge_path_ignores_light_dom_target_outside_forged_subtree(page: Page) -> None:
    _load_console_debug(page)
    messages = _run_helper(
        page,
        "uix_forge_path",
        """(() => {
          const forge = document.createElement("uix-forge");
          const shadow = forge.attachShadow({ mode: "open" });
          const forged = document.createElement("div");
          shadow.append(forged);
          forge.forgedElement = forged;
          const target = document.createElement("span");
          target.id = "light-target";
          forge.append(target);
          document.body.append(forge);
          return target;
        })()""",
    )

    assert _has_message(messages, "No uix-forge parent found for this element.", "warn")
    assert not _has_message(messages, "📦 Closest UIX Forge Parent", "log")
