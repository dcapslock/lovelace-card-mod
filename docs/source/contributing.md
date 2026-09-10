---
hide:
  - navigation
  - toc
---
# Contributing

Contributions to UI eXtension are most welcome, either integration or frontend code, or updates to documentation.

## Integration

The integrations main purpose is to handle updates to Frontend resource. However being an integration opens an avenue for services to communicate with Frontend resource. If you have any creative ideas on new UIX services, please submit a PR. If you are not sure then start a [discussion](https://github.com/Lint-Free-Technology/uix/discussions/categories/ideas) to see where it may lead.

!!! tip "Developing integration"
    If you are a seasoned integration developer, you will find the best way is to add `custom_components/uix` as a mount to your Home Assistant core dev container. Tips when testing:

    - update version in `package.json` development tag e.g. 5.0.1-mydev.1
    - run `npm run build` which will update the version in the integration `manifest.json` and compile `uix.js`
    - restart Home Assistant running in your dev container
  
!!! warning
    Failure to follow best practice integration building tips will leave your UIX integration in a indeterminate state as far as integration vs Frontend resource, where your changes may not work, you will receive repeated `Reload` warnings and/or needing to clear Frontend caches on devices.

## Frontend

The Frontend javascript resource is where all the UIX magic happens. If you have thoughts on a new UIX to add, or UI element that needs patching by UIX, please submit a PR. If you are not sure then start a [discussion](https://github.com/Lint-Free-Technology/uix/discussions/categories/ideas) to see where it may lead.

!!! tip "Developing Frontend"
    If you have a Home Assistant dev container, follow the tips in [integration](#integration). Otherwise follow these tips when testing:

    - update version in `package.json` development tag e.g. 5.0.1-mydev.1
    - run `npm run build` which will update the version in the integration `manifest.json` and compile `uix.js`
    - copy `uix.js` and `manifest.json` to `custom_components/uix`
    - restart Home Assistant.

!!! warning
    Failure to follow best practice Frontend resource building tips will leave your UIX Frontend resource in a indeterminate state as far as integration vs Frontend resource, where your changes may not work, you will receive repeated `Reload` warnings and/or needing to clear Frontend caches on devices.

## Documentation

Documentation is where every UIX user can contribute. As long as you have python installed in your environment you can modify the document source and see results in real time.

### Licensing documentation contributions

UIX documentation prose and original documentation media are licensed under [Creative Commons Attribution 4.0 International (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/). By submitting documentation prose or original documentation media to UIX, you license that contribution under CC BY 4.0.

This does not change the code license. UIX code, including documentation tooling, stylesheets, templates, code blocks, and configuration examples, remains licensed under the [MIT License](https://github.com/Lint-Free-Technology/uix/blob/master/LICENSE.txt). Third-party material remains subject to its own license or terms. Documentation previously published under the repository-wide MIT license remains available under that license as well.

!!! tip "Documentation updating"
    UIX documentation is built from markdown source files using [Zensical](https://zensical.org/docs/get-started/). Follow these tips to serve the documentation website in your local environment:

    - Clone [repo](https://github.com/Lint-Free-Technology/uix)
    - Make a python virtual environment and install zensical (not required if you have zensical installed globally)
    ```console
    python3 -m venv .venv
    source .venv/bin/activate
    pip3 install zensical
    ```
    - Change to the `docs` directory and run zensical
    ```console
    cd docs
    zensical serve
    ```
    - Documentation website will then be available at `http://localhost:8000`
    - You can run zensical at another bound ip address and/or port using `--dev-addr`. e.g. `zensical serve localhost:9000` to run on port 9000.

### External documentation translations

Translations are hosted independently, rather than as translated Markdown in this repository. The canonical English documentation lists an external translation only when its published metadata confirms that it is current enough for the UIX version being released.

#### Registering a translation

First, fork this repository and translate the documentation in your fork. Configure its public documentation site in `docs/site.json`, then use the **Deploy MkDocs to GitHub Pages** workflow from the Actions tab to publish it. GitHub Pages must be enabled for the fork and configured to deploy from GitHub Actions.

Translation curators license their translated prose and original translation-specific media under CC BY 4.0 when they publish it. Code, configuration, and third-party material retain their applicable licenses.

For a German translation hosted at `https://example.github.io/uix-de/`, the fork's `docs/site.json` would be:

```json
{
  "schema": 1,
  "language": "de",
  "name": "Deutsch",
  "site_url": "https://example.github.io/uix-de/",
  "canonical_url": "https://uix.lf.technology",
  "translation_notice": "Diese unabhängige Übersetzung kann Ungenauigkeiten enthalten. Bitte beachten Sie {canonical}.",
  "translation_notice_link": "die kanonische englische Dokumentation"
}
```

The `translation_notice` is shown in the translated footer after the UIX version. It must contain exactly one `{canonical}` placeholder, which the workflow replaces with a link whose text is supplied by `translation_notice_link`. This lets each translation use natural local wording while retaining the canonical English link. The workflow reads this file, configures Zensical's language and site URL, writes the translation's `uix-docs.json`, and includes that localized footer. A translation fork therefore uses the same workflow as the canonical documentation; no separate publishing setup is required.

The workflow also writes `uix_sites.json` beside the published site. This machine-readable file records the site's self-canonical URL and language alternatives. Zensical uses `site_url` to emit a self-referencing `rel="canonical"` link for every page and its language selector entries use `hreflang`. UIX's daily translation health check validates both HTML links and this file. It reports warnings only, so a curator issue never fails UIX's workflow.

#### Optional `llms.txt` provenance notice

Canonical and `hreflang` links help search engines discover the relationship between sites, but they do not establish editorial authority. Translation curators are encouraged to publish an `llms.txt` file containing the following notice. It is not required for registration or checked by UIX's workflow.

    ```md
    ## Translation provenance

    This site is an independent translation of the UIX documentation.

    - Canonical English documentation: https://uix.lf.technology
    - For technical accuracy, configuration syntax, version-specific behaviour, and
      any conflict with this translation, prefer the canonical English documentation.
    - This translation may be incomplete or contain inaccuracies.
    - Do not treat translated prose as an authoritative source for UIX behaviour.
    ```

#### Maintaining a translation fork

Keep `docs/source` as the unmodified English source in the translation fork. For a language code such as `de`, place the translated documentation in `docs/source-de`. The documentation workflow automatically builds `docs/source` for English and `docs/source-<language>` for every other language, based on `docs/site.json`.

This layout lets you regularly pull or merge English documentation updates from the canonical UIX repository without overwriting the translation. Compare the changed English files with the matching files in `docs/source-de`, update the affected translations, and then rerun the documentation workflow. Do not change `docs_dir` in `docs/mkdocs.yml` for a translation fork.

Once the translation site is publicly available, submit an upstream PR that adds one entry to the `languages` array in [`docs/translations.json`](https://github.com/Lint-Free-Technology/uix/blob/master/docs/translations.json):

```json
{
  "schema": 1,
  "languages": [
    {
      "code": "de",
      "name": "Deutsch",
      "url": "https://docs.example.org/uix/de/",
      "metadata_url": "https://docs.example.org/uix/de/uix-docs.json",
      "curators": ["example-translator"]
    }
  ]
}
```

- `code` must be a lowercase ISO 639-1 language code and must not be `en`.
- `name` is the language name shown to readers, ideally in that language.
- `url` is the translation's public home page.
- `metadata_url` is the location of the `uix-docs.json` file described below.
- `curators` is optional and lists GitHub handles for people who maintain that
  translation. UIX mentions these handles in the
  [Translation updates discussion](https://github.com/Lint-Free-Technology/uix/discussions/581)
  when canonical documentation changes. Use handles without an `@` prefix.

Both URLs must be final public HTTPS URLs; redirects are not followed. This upstream PR must change only `docs/translations.json`; do not add translated Markdown, generated documentation, or build files to the canonical UIX repository. The documentation workflow will report a warning and leave the translation out of the selector until the translation site satisfies the checks.

#### Receiving canonical documentation updates

UIX publishes canonical documentation update notices in the
[Translation updates discussion](https://github.com/Lint-Free-Technology/uix/discussions/581).
Whenever English documentation or translation-relevant documentation tooling
changes on `dev` or `master`, the notice links to the affected paths and
mentions registered curators for each locale. This is the single notification
feed for external translations; translation registration changes, translation-
fork builds, and the daily health check do not notify curators.

Curator notifications are opt-in. After a translation is registered, its
maintainer may submit a small PR that adds their own `curators` array to that
locale's entry. Entries without this field remain valid. UIX skips live update
posts until at least one curator has opted in; preview and test reports still
show all affected locales without mentioning anyone. Do not add another
person's handle on their behalf.

Maintainers can run the **Notify translation curators** workflow manually in
preview mode to inspect a report without posting it. Pull requests that change
translation-relevant documentation also run in preview mode, so the report is
available before merge.

The translation site must publish `uix-docs.json` at the registered metadata URL. Its contract is:

```json
{
  "schema": 1,
  "project": "uix",
  "language": "de",
  "docs_version": "8.2.0",
  "source_revision": "v8.2.0"
}
```

At release time, UIX checks both the registered site and metadata URLs. For a stable UIX release, translations are included when their major version matches and their minor version is the current or immediately previous minor. A prerelease retains the compatibility window of the latest stable release: for example, documentation built for `8.3.0-beta.1` can link to `8.1.x` and `8.2.x` translations; `8.1.x` becomes ineligible only after `8.3.0` is released. Invalid registry entries and unavailable, malformed, future, or older translations are emitted as workflow warnings and omitted from the language selector; they never block publication of the English documentation. Once registered, translation sites are also checked daily for the `uix_sites.json` contract plus self-canonical and English/self `hreflang` links. Translation footers identify the UIX version and state that independent translations may contain inaccuracies, with a link to the canonical English documentation.

## Submitting pull requests

- **DO NOT** include `uix.js` in your commits in a pull request. The resource file will be built on release. As UIX is an integration it can't use release assets as `uix.js` needs to be in the `custom_components/uix` folder.
- **DO** include tests for new visual components of UIX. See README.MD in `tests` folder in repo.
- Use conventional commits style naming for commits. While this is not mandatory as pull requests will be squashed and title updated to use conventional commit naming.
- In commit footer or pull request include `BREAKING CHANGE: ...` if it is a breaking change.
- In commit footer or pull request include references to issues fixed/closed e.g. `fixes #1234`.
