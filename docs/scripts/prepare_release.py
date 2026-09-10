#!/usr/bin/env python3
"""Prepare the UIX documentation release configuration and version contract.

External translations are deliberately optional: a bad, stale, or unavailable
translation is omitted from the language selector without blocking publication
of the canonical English documentation.
"""

from __future__ import annotations

import argparse
import datetime as dt
import html
import ipaddress
import json
import re
import socket
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any


MAX_METADATA_BYTES = 64 * 1024
METADATA_SCHEMA = 1
SEMVER = re.compile(
    r"^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)"
    r"(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?"
    r"(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$"
)
LANGUAGE_CODE = re.compile(r"^[a-z]{2}$")


class NoRedirect(urllib.request.HTTPRedirectHandler):
    """Do not allow a registry URL to silently change its destination."""

    def redirect_request(self, req, fp, code, msg, headers, newurl):  # type: ignore[no-untyped-def]
        raise urllib.error.HTTPError(
            req.full_url, code, "Redirects are not permitted", headers, fp
        )


def fail(message: str) -> None:
    raise ValueError(message)


def parse_version(value: str) -> tuple[int, int, int]:
    match = SEMVER.fullmatch(value)
    if not match:
        fail(f"invalid semantic version {value!r}")
    return tuple(int(part) for part in match.group(1, 2, 3))


def is_prerelease(value: str) -> bool:
    """Return whether a validated semantic version carries a prerelease label."""

    parse_version(value)
    return "-" in value.split("+", maxsplit=1)[0]


def validate_https_url(value: Any, field: str) -> str:
    if not isinstance(value, str) or not value:
        fail(f"{field} must be a non-empty URL")

    parsed = urllib.parse.urlsplit(value)
    if (
        parsed.scheme != "https"
        or not parsed.hostname
        or parsed.username
        or parsed.password
        or parsed.fragment
    ):
        fail(f"{field} must be an absolute HTTPS URL without credentials or fragments")
    return value


def validate_public_host(url: str) -> None:
    """Reject DNS targets that resolve only to private or local addresses."""

    host = urllib.parse.urlsplit(url).hostname
    assert host is not None
    try:
        addresses = socket.getaddrinfo(host, 443, type=socket.SOCK_STREAM)
    except socket.gaierror as error:
        fail(f"could not resolve metadata host {host!r}: {error}")

    if not addresses:
        fail(f"metadata host {host!r} has no addresses")

    for _, _, _, _, sockaddr in addresses:
        if not ipaddress.ip_address(sockaddr[0]).is_global:
            fail(f"metadata host {host!r} resolves to a non-public address")


def fetch_metadata(url: str) -> dict[str, Any]:
    validate_public_host(url)
    request = urllib.request.Request(
        url,
        headers={
            "Accept": "application/json",
            "User-Agent": "UIX-docs-release-check/1",
        },
    )
    opener = urllib.request.build_opener(NoRedirect)
    try:
        with opener.open(request, timeout=10) as response:
            if response.status != 200:
                fail(f"metadata request returned HTTP {response.status}")
            payload = response.read(MAX_METADATA_BYTES + 1)
    except (OSError, urllib.error.URLError, urllib.error.HTTPError) as error:
        fail(f"could not fetch metadata: {error}")

    if len(payload) > MAX_METADATA_BYTES:
        fail("metadata response exceeds 64 KiB")
    try:
        metadata = json.loads(payload)
    except (UnicodeDecodeError, json.JSONDecodeError) as error:
        fail(f"metadata is not valid JSON: {error}")
    if not isinstance(metadata, dict):
        fail("metadata must be a JSON object")
    return metadata


def check_site(url: str) -> None:
    """Confirm that the language selector destination is reachable."""

    validate_public_host(url)
    request = urllib.request.Request(
        url,
        headers={
            "Range": "bytes=0-0",
            "User-Agent": "UIX-docs-release-check/1",
        },
    )
    opener = urllib.request.build_opener(NoRedirect)
    try:
        with opener.open(request, timeout=10) as response:
            if response.status not in (200, 206):
                fail(f"site request returned HTTP {response.status}")
    except (OSError, urllib.error.URLError, urllib.error.HTTPError) as error:
        fail(f"could not reach translation site: {error}")


def load_registry(path: Path) -> list[dict[str, str]]:
    try:
        registry = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        warning("registry", f"could not read translation registry: {error}")
        return []

    if not isinstance(registry, dict) or registry.get("schema") != METADATA_SCHEMA:
        warning("registry", f"{path} must use schema {METADATA_SCHEMA}")
        return []
    languages = registry.get("languages")
    if not isinstance(languages, list):
        warning("registry", f"{path} must contain a languages array")
        return []

    entries: list[dict[str, str]] = []
    codes: set[str] = set()
    for index, language in enumerate(languages, start=1):
        entry_name = str(index)
        try:
            if not isinstance(language, dict):
                fail(f"languages[{index}] must be an object")
            code = language.get("code")
            name = language.get("name")
            url = language.get("url")
            metadata_url = language.get("metadata_url")
            if isinstance(code, str):
                entry_name = code
            if not isinstance(code, str) or not LANGUAGE_CODE.fullmatch(code):
                fail(f"languages[{index}].code must be a lowercase ISO 639-1 code")
            if code == "en":
                fail("English is the canonical site and must not be in the registry")
            if code in codes:
                fail(f"languages[{index}].code duplicates {code!r}")
            if not isinstance(name, str) or not name.strip():
                fail(f"languages[{index}].name must be a non-empty string")
            entry = {
                "code": code,
                "name": name.strip(),
                "url": validate_https_url(url, f"languages[{index}].url"),
                "metadata_url": validate_https_url(
                    metadata_url, f"languages[{index}].metadata_url"
                ),
            }
        except ValueError as error:
            warning(entry_name, str(error))
            continue
        codes.add(code)
        entries.append(entry)
    return entries


def load_site_config(path: Path) -> dict[str, str]:
    try:
        site = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        fail(f"could not read documentation site configuration: {error}")

    if not isinstance(site, dict) or site.get("schema") != METADATA_SCHEMA:
        fail(f"{path} must use schema {METADATA_SCHEMA}")
    language = site.get("language")
    name = site.get("name")
    if not isinstance(language, str) or not LANGUAGE_CODE.fullmatch(language):
        fail(f"{path}.language must be a lowercase ISO 639-1 code")
    if not isinstance(name, str) or not name.strip():
        fail(f"{path}.name must be a non-empty string")
    notice = site.get("translation_notice", "")
    notice_link = site.get("translation_notice_link", "")
    if language != "en":
        if not isinstance(notice, str) or notice.count("{canonical}") != 1:
            fail(
                f"{path}.translation_notice must contain exactly one "
                "{{canonical}} placeholder"
            )
        if not isinstance(notice_link, str) or not notice_link.strip():
            fail(f"{path}.translation_notice_link must be a non-empty string")
    return {
        "language": language,
        "name": name.strip(),
        "site_url": validate_https_url(site.get("site_url"), f"{path}.site_url"),
        "canonical_url": validate_https_url(
            site.get("canonical_url"), f"{path}.canonical_url"
        ),
        "translation_notice": notice,
        "translation_notice_link": notice_link,
    }


def is_eligible(
    canonical: tuple[int, int, int],
    translation: tuple[int, int, int],
    canonical_is_prerelease: bool,
) -> bool:
    """Keep the latest stable release's two-minor window during prereleases."""

    canonical_major, canonical_minor, _ = canonical
    translation_major, translation_minor, _ = translation
    latest_allowed_minor = canonical_minor - 1 if canonical_is_prerelease else canonical_minor
    oldest_allowed_minor = max(
        0,
        latest_allowed_minor - 1,
    )
    return (
        translation_major == canonical_major
        and oldest_allowed_minor <= translation_minor <= latest_allowed_minor
    )


def warning(code: str, message: str) -> None:
    print(f"::warning title=Translation {code} excluded::{message}")


def accepted_languages(
    entries: list[dict[str, str]],
    canonical_version: tuple[int, int, int],
    canonical_is_prerelease: bool,
) -> list[dict[str, str]]:
    accepted: list[dict[str, str]] = []
    for entry in entries:
        try:
            check_site(entry["url"])
            metadata = fetch_metadata(entry["metadata_url"])
            if metadata.get("schema") != METADATA_SCHEMA:
                fail(f"metadata schema must be {METADATA_SCHEMA}")
            if metadata.get("project") != "uix":
                fail("metadata project must be 'uix'")
            if metadata.get("language") != entry["code"]:
                fail("metadata language does not match the registry")
            version = metadata.get("docs_version")
            if not isinstance(version, str):
                fail("metadata docs_version must be a semantic version")
            translation_version = parse_version(version)
            if not is_eligible(
                canonical_version, translation_version, canonical_is_prerelease
            ):
                fail(
                    f"documentation version {version} is not within the supported "
                    "major/minor range for this release"
                )
        except ValueError as error:
            warning(entry["code"], str(error))
            continue

        accepted.append(entry)
        print(f"Including translation {entry['code']} ({version}).")
    return accepted


def yaml_string(value: str) -> str:
    """JSON string syntax is also a safe, unambiguous YAML scalar."""

    return json.dumps(value, ensure_ascii=False)


def alternate_languages(
    site: dict[str, str], languages: list[dict[str, str]]
) -> list[dict[str, str]]:
    all_languages: list[dict[str, str]] = []
    if site["language"] != "en":
        all_languages.append(
            {"name": "English", "url": site["canonical_url"], "code": "en"}
        )
    all_languages.append(
        {"name": site["name"], "url": site["site_url"], "code": site["language"]}
    )
    known_codes = {site["language"]}
    for language in languages:
        if language["code"] not in known_codes:
            all_languages.append(language)
            known_codes.add(language["code"])
    return all_languages


def render_alternates(alternates: list[dict[str, str]]) -> str:
    lines = ["  alternate:"]
    for language in alternates:
        lines.extend(
            (
                f"    - name: {yaml_string(language['name'])}",
                f"      link: {yaml_string(language['url'])}",
                f"      lang: {yaml_string(language['code'])}",
            )
        )
    return "\n".join(lines)


def footer_text(site: dict[str, str], version: str) -> str:
    license_notice = (
        'Documentation licensed under '
        '<a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>'
    )
    text = f"Documentation for UIX {version} · {license_notice}"
    if site["language"] == "en":
        return text
    canonical_url = html.escape(site["canonical_url"], quote=True)
    notice = html.escape(site["translation_notice"])
    link_text = html.escape(site["translation_notice_link"])
    link = f'<a href="{canonical_url}">{link_text}</a>'
    return (
        f"{text} · {notice.replace('{canonical}', link)}"
    )


def render_config(
    source: Path,
    output: Path,
    site: dict[str, str],
    version: str,
    languages: list[dict[str, str]],
) -> list[dict[str, str]]:
    content = source.read_text(encoding="utf-8")
    alternates = alternate_languages(site, languages)
    site_url, site_url_count = re.subn(
        r"(?m)^site_url: .* # UIX_RELEASE_SITE_URL$",
        f"site_url: {yaml_string(site['site_url'])}",
        content,
    )
    docs_dir = "source" if site["language"] == "en" else f"source-{site['language']}"
    docs_source, docs_source_count = re.subn(
        r"(?m)^docs_dir: .* # UIX_RELEASE_DOCS_DIR$",
        f"docs_dir: {yaml_string(docs_dir)}",
        site_url,
    )
    language, language_count = re.subn(
        r"(?m)^  language: .* # UIX_RELEASE_LANGUAGE$",
        f"  language: {yaml_string(site['language'])}",
        docs_source,
    )
    alternate, alternate_count = re.subn(
        r"(?m)^  alternate: \[\] # UIX_RELEASE_ALTERNATES$",
        render_alternates(alternates),
        language,
    )
    copyright, copyright_count = re.subn(
        r'(?m)^copyright: (?:".*"|\'.*\') # UIX_RELEASE_COPYRIGHT$',
        f"copyright: {yaml_string(footer_text(site, version))}",
        alternate,
    )
    if (
        site_url_count != 1
        or docs_source_count != 1
        or language_count != 1
        or alternate_count != 1
        or copyright_count != 1
    ):
        fail("docs/mkdocs.yml release markers are missing or duplicated")
    output.write_text(copyright, encoding="utf-8")
    return alternates


def write_metadata(path: Path, version: str, revision: str, site: dict[str, str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(
            {
                "schema": METADATA_SCHEMA,
                "project": "uix",
                "language": site["language"],
                "docs_version": version,
                "source_revision": revision,
                "site_url": site["site_url"],
                "canonical_url": site["canonical_url"],
                "generated_at": dt.datetime.now(dt.timezone.utc).isoformat(),
            },
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )


def write_site_manifest(
    path: Path, version: str, site: dict[str, str], alternates: list[dict[str, str]]
) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(
            {
                "schema": METADATA_SCHEMA,
                "project": "uix",
                "language": site["language"],
                "docs_version": version,
                "site_url": site["site_url"],
                "canonical_url": site["canonical_url"],
                "alternates": [
                    {
                        "name": alternate["name"],
                        "url": alternate["url"],
                        "lang": alternate["code"],
                    }
                    for alternate in alternates
                ],
            },
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--version", required=True)
    parser.add_argument("--source-revision", required=True)
    parser.add_argument("--site", type=Path, default=Path("docs/site.json"))
    parser.add_argument("--registry", type=Path, default=Path("docs/translations.json"))
    parser.add_argument("--config", type=Path, default=Path("docs/mkdocs.yml"))
    parser.add_argument("--output", type=Path, default=Path("docs/mkdocs.release.yml"))
    parser.add_argument(
        "--metadata-output", type=Path, default=Path("docs/source/uix-docs.json")
    )
    parser.add_argument(
        "--site-manifest-output", type=Path, default=Path("docs/source/uix_sites.json")
    )
    args = parser.parse_args()

    try:
        canonical_version = parse_version(args.version)
        canonical_is_prerelease = is_prerelease(args.version)
        site = load_site_config(args.site)
        entries = load_registry(args.registry)
        languages = accepted_languages(
            entries, canonical_version, canonical_is_prerelease
        )
        alternates = render_config(args.config, args.output, site, args.version, languages)
        write_metadata(args.metadata_output, args.version, args.source_revision, site)
        write_site_manifest(args.site_manifest_output, args.version, site, alternates)
    except ValueError as error:
        print(f"error: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
