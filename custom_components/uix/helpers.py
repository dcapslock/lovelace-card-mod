import json
import logging
from io import StringIO
from pathlib import Path

from homeassistant.core import HomeAssistant
from homeassistant.util.yaml import parse_yaml, Secrets

from .const import DOMAIN

_LOGGER = logging.getLogger(__name__)

FOUNDRY_FILE_TOP_LEVEL_KEY = "uix_foundries"
BROKER_FILE_TOP_LEVEL_KEY = "uix_broker"

def get_version(hass: HomeAssistant):
    with open(hass.config.path(f"custom_components/{DOMAIN}/manifest.json"), "r") as fp:
        manifest = json.load(fp)
        return manifest["version"]

def resolve_foundries(hass: HomeAssistant, foundries: dict) -> dict:
    """Resolve foundry configs at serve time using annotatedyaml's ``parse_yaml``.

    Recursively walks each foundry config and, for any string value that begins
    with ``!``, re-parses it as a YAML fragment via
    :func:`homeassistant.util.yaml.parse_yaml`.  This delegates resolution to
    annotatedyaml's native constructors, giving full support for:

    - ``!include <path>`` — loads a YAML file relative to the HA config
      directory; nested ``!include`` and ``!secret`` inside that file are also
      resolved automatically.
    - ``!secret <name>`` — resolves the named secret from ``secrets.yaml``.
    - ``!include_dir_list``, ``!include_dir_named``, ``!env_var``, etc.

    String values that do not begin with ``!`` are left unchanged.

    This function performs file I/O and must be called from an executor thread
    (e.g. via :meth:`~homeassistant.core.HomeAssistant.async_add_executor_job`).
    """
    secrets = Secrets(Path(hass.config.config_dir))
    # A path inside the config dir so the annotatedyaml loader resolves
    # !include paths relative to the HA config directory.
    base_path = hass.config.path("configuration.yaml")

    def _resolve(value, foundry_name: str):
        if isinstance(value, dict):
            return {k: _resolve(v, foundry_name) for k, v in value.items()}
        if isinstance(value, list):
            return [_resolve(item, foundry_name) for item in value]
        if isinstance(value, str) and value.startswith("!"):
            # Wrap the YAML tag string in a StringIO and set its name to a
            # path inside the config dir.  annotatedyaml's loader uses
            # os.path.dirname(stream.name) as the base directory for
            # !include resolution, so this makes relative !include paths
            # resolve relative to the HA config directory.
            sio = StringIO(value)
            sio.name = base_path
            try:
                return parse_yaml(sio, secrets)
            except Exception:
                _LOGGER.error(
                    "Failed to resolve %r in foundry %r — "
                    "check that any !include paths exist and are readable, "
                    "and that any !secret names are defined in secrets.yaml",
                    value,
                    foundry_name,
                )
                return value
        return value

    return {name: _resolve(config, name) for name, config in foundries.items()}


def validate_foundry_file(hass: HomeAssistant, file_path: str) -> str | None:
    """Validate a foundry file.

    Returns an error key string if the file fails validation, or ``None`` if
    the file is valid and ready to load.

    This function performs file I/O and must be called from an executor thread
    (e.g. via :meth:`~homeassistant.core.HomeAssistant.async_add_executor_job`).
    """
    path = Path(file_path)
    if not path.is_absolute():
        path = Path(hass.config.config_dir) / path

    if not path.exists():
        return "file_not_found"

    try:
        secrets = Secrets(Path(hass.config.config_dir))
        with open(path, "r") as fp:
            content = parse_yaml(fp, secrets)
    except Exception:
        _LOGGER.exception("Failed to parse foundry file: %s", path)
        return "file_parse_error"

    if not isinstance(content, dict):
        return "file_invalid_structure"

    foundries = content.get(FOUNDRY_FILE_TOP_LEVEL_KEY)
    if foundries is None:
        return "file_missing_key"

    if not isinstance(foundries, dict):
        return "file_invalid_foundries"

    return None


def check_all_foundry_files(
    hass: HomeAssistant, file_paths: list[str]
) -> dict:
    """Validate all registered foundry files.

    Returns a dict with:
    - ``errors``: list of ``{file_path, error_key}`` dicts for files that
      failed validation.
    - ``file_count``: total number of registered files.

    This function performs file I/O and must be called from an executor thread
    (e.g. via :meth:`~homeassistant.core.HomeAssistant.async_add_executor_job`).
    """
    errors = []
    for file_path in file_paths:
        error_key = validate_foundry_file(hass, file_path)
        if error_key is not None:
            errors.append({"file_path": file_path, "error_key": error_key})
    return {"errors": errors, "file_count": len(file_paths)}


def load_foundries_from_files(hass: HomeAssistant, file_paths: list[str]) -> dict:
    """Load and merge foundries from a list of YAML files.

    Each file must have a top-level ``uix_foundries`` key that is a mapping.
    Files that cannot be found, fail to parse, or have an invalid structure are
    logged and skipped.  Later files in *file_paths* override earlier ones when
    foundry names collide.

    This function performs file I/O and must be called from an executor thread
    (e.g. via :meth:`~homeassistant.core.HomeAssistant.async_add_executor_job`).
    """
    secrets = Secrets(Path(hass.config.config_dir))
    result: dict = {}

    for file_path in file_paths:
        path = Path(file_path)
        if not path.is_absolute():
            path = Path(hass.config.config_dir) / path

        if not path.exists():
            _LOGGER.error("Foundry file not found: %s", path)
            continue

        try:
            with open(path, "r") as fp:
                content = parse_yaml(fp, secrets)
        except Exception:
            _LOGGER.error("Failed to parse foundry file: %s", path, exc_info=True)
            continue

        if not isinstance(content, dict):
            _LOGGER.error("Foundry file %s must be a YAML mapping", path)
            continue

        foundries = content.get(FOUNDRY_FILE_TOP_LEVEL_KEY)
        if not isinstance(foundries, dict):
            _LOGGER.error(
                "Foundry file %s must have a top-level '%s' mapping",
                path,
                FOUNDRY_FILE_TOP_LEVEL_KEY,
            )
            continue

        result.update(foundries)

    return result


def get_all_foundries(
    hass: HomeAssistant, foundries: dict, file_paths: list[str]
) -> dict:
    """Return all foundries merged from files and the config entry.

    File-based foundries are loaded first; config-entry foundries are applied
    on top so that UI-configured entries take precedence over file entries when
    names collide.  The merged result is then passed through
    :func:`resolve_foundries` so that ``!secret`` / ``!include`` tags are
    expanded.

    This function performs file I/O and must be called from an executor thread
    (e.g. via :meth:`~homeassistant.core.HomeAssistant.async_add_executor_job`).
    """
    file_foundries = load_foundries_from_files(hass, file_paths)
    merged = {**file_foundries, **foundries}
    return resolve_foundries(hass, merged)


def resolve_broker_config(hass: HomeAssistant, interactions: list[dict]) -> list[dict]:
    """Resolve YAML tags in UIX Broker interactions before sending them to clients."""
    secrets = Secrets(Path(hass.config.config_dir))
    base_path = hass.config.path("configuration.yaml")

    def _resolve(value):
        if isinstance(value, dict):
            return {key: _resolve(item) for key, item in value.items()}
        if isinstance(value, list):
            return [_resolve(item) for item in value]
        if isinstance(value, str) and value.startswith("!"):
            sio = StringIO(value)
            sio.name = base_path
            try:
                return parse_yaml(sio, secrets)
            except Exception:
                _LOGGER.error(
                    "Failed to resolve %r in UIX Broker configuration — "
                    "check that any !include paths exist and are readable, "
                    "and that any !secret names are defined in secrets.yaml",
                    value,
                )
        return value

    return _resolve(interactions)


def validate_broker_file(hass: HomeAssistant, file_path: str) -> str | None:
    """Validate a YAML file containing a top-level ``uix_broker`` list."""
    path = Path(file_path)
    if not path.is_absolute():
        path = Path(hass.config.config_dir) / path
    if not path.exists():
        return "broker_file_not_found"

    try:
        secrets = Secrets(Path(hass.config.config_dir))
        with open(path, "r") as fp:
            content = parse_yaml(fp, secrets)
    except Exception:
        _LOGGER.exception("Failed to parse UIX Broker file: %s", path)
        return "broker_file_parse_error"

    if not isinstance(content, dict):
        return "broker_file_invalid_structure"
    if BROKER_FILE_TOP_LEVEL_KEY not in content:
        return "broker_file_missing_key"
    if not isinstance(content[BROKER_FILE_TOP_LEVEL_KEY], list):
        return "broker_file_invalid_config"
    return None


def load_broker_configs_from_files(
    hass: HomeAssistant, file_paths: list[str]
) -> list[dict]:
    """Load Broker interactions in registration order from valid YAML files."""
    secrets = Secrets(Path(hass.config.config_dir))
    interactions: list[dict] = []
    for file_path in file_paths:
        path = Path(file_path)
        if not path.is_absolute():
            path = Path(hass.config.config_dir) / path
        if not path.exists():
            _LOGGER.error("UIX Broker file not found: %s", path)
            continue
        try:
            with open(path, "r") as fp:
                content = parse_yaml(fp, secrets)
        except Exception:
            _LOGGER.error("Failed to parse UIX Broker file: %s", path, exc_info=True)
            continue
        if not isinstance(content, dict) or not isinstance(content.get(BROKER_FILE_TOP_LEVEL_KEY), list):
            _LOGGER.error(
                "UIX Broker file %s must have a top-level '%s' list",
                path,
                BROKER_FILE_TOP_LEVEL_KEY,
            )
            continue
        interactions.extend(content[BROKER_FILE_TOP_LEVEL_KEY])
    return interactions


def check_all_broker_files(
    hass: HomeAssistant, file_paths: list[str]
) -> dict:
    """Validate all registered Broker files."""
    errors = []
    for file_path in file_paths:
        error_key = validate_broker_file(hass, file_path)
        if error_key is not None:
            errors.append({"file_path": file_path, "error_key": error_key})
    return {"errors": errors, "file_count": len(file_paths)}


def get_all_broker_configs(
    hass: HomeAssistant, interactions: list[dict], file_paths: list[str]
) -> list[dict]:
    """Return resolved Broker interactions from files followed by UI settings.

    File interactions preserve their registration and YAML order. The UI-managed
    interaction list is appended, so it is the final configuration source.
    """
    merged = [*load_broker_configs_from_files(hass, file_paths), *interactions]
    return resolve_broker_config(hass, merged)
