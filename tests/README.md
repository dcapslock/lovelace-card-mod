# UIX Tests

Automated tests for the UIX integration. Tests spin up a real Home Assistant
instance inside a Docker container (via
[ha-testcontainer](https://github.com/Lint-Free-Technology/ha-testcontainer))
and exercise UIX with a real browser (via [Playwright](https://playwright.dev/python/)).

---

## Prerequisites

- **Docker** — required to run the HA container.
- **Python ≥ 3.11**
- Create and activate a virtual environment, then install test dependencies and Playwright browsers:

  ```bash
  python3 -m venv .venv        # use 'python' on Windows
  source .venv/bin/activate    # Windows: .venv\Scripts\activate
  pip install -e ".[test]"
  playwright install chromium
  ```

---

## Running the tests

All commands should be run from the **repository root**.

### Run everything

```bash
pytest tests/
```

### Smoke tests only (no Lovelace scenarios)

```bash
pytest \
  tests/visual/test_uix_styling.py \
  tests/test_connection_disable_entity_picture_image_override.py \
  tests/test_connection_disable_hash_template_variable.py \
  tests/test_connection_disable_icon_styling.py \
  tests/test_connection_style_custom_panels.py \
  tests/test_console_debug_dom_helpers.py \
  tests/test_forge_config_builder.py
```

### Run all visual scenarios

```bash
pytest tests/visual/test_scenarios.py
```

### Run a single scenario by its `id`

```bash
pytest tests/visual/test_scenarios.py -k card_basic_style
```

### Filter scenarios by category

```bash
# All styling scenarios
pytest tests/visual/test_scenarios.py -k "styling or theme or macro"

# All forge scenarios
pytest tests/visual/test_scenarios.py -k forge
```

### Pin a specific HA version

```bash
HA_VERSION=2024.6.0 pytest tests/
```

By default, the harness reads `tests/HA_VERSION`. To change the default version
for all local/CI test runs, edit that file.
Blank lines and lines beginning with `#` are ignored.

Accepted values for `HA_VERSION`: `stable`, `beta`, `dev`, or a pinned version
string such as `2024.6.0`.

### Fast iteration — keep HA running between pytest invocations

By default every `pytest` run boots a fresh HA container (takes ~60–120 s) and
tears it down when the session ends.  When you are tweaking a `doc_image` or
`doc_animation` scenario and want to run pytest repeatedly without the boot
overhead, start a **persistent** HA instance in a separate terminal:

**Terminal 1** (keep this running):

```bash
make ha_up
# or equivalently:
HA_VERSION=$(awk 'NF && $1 !~ /^#/ { print; exit }' tests/HA_VERSION 2>/dev/null || true); HA_VERSION=${HA_VERSION:-stable} HA_CONFIG_PATH=tests/ha-config HA_CUSTOM_COMPONENTS_PATH=custom_components HA_SETUP_INTEGRATION=uix HA_PLUGINS_YAML=tests/plugins.yaml python -m ha_testcontainer.ha_server
```

The script starts HA, sets up UIX, and writes `HA_URL` + `HA_TOKEN` to
`.ha_env`.  It prints them to the console too:

```
export HA_URL=http://localhost:12345
export HA_TOKEN=eyJ...
```

**Terminal 2** (iterate as many times as you like):

```bash
source .ha_env                                                   # set HA_URL / HA_TOKEN
pytest tests/visual/test_doc_images.py -k my_scenario           # no boot wait!
# tweak the YAML, then run again instantly:
pytest tests/visual/test_doc_images.py -k my_scenario
```

When `HA_URL` and `HA_TOKEN` are set, the test suite skips Docker entirely and
connects to the pre-running instance.  The container is **not** stopped at the
end of the session — it keeps running until you press Ctrl-C in Terminal 1.

> **Note:** The persistent container shares state across invocations (Lovelace
> dashboards accumulate, entity state from previous tests persists, etc.).
> This is fine for doc_image/doc_animation iteration.  For a clean-slate run,
> press Ctrl-C to stop HA, then run `pytest` normally (without the env vars).

---

## Test structure

```
tests/
├── conftest.py                       # Session-scoped HA container + Lovelace dashboard fixtures
├── test_doc_audit.py                 # Doc-image audit — checks all PNG/GIF refs are tracked
├── doc-image-audit-exclusions.txt    # Paths excluded from the audit (hand-crafted images)
├── ha-config/
│   ├── configuration.yaml   # HA configuration loaded by the test container
│   └── themes.yaml          # UIX test themes (referenced by scenario YAML files)
└── visual/
    ├── conftest.py          # Playwright browser context + page fixtures
    ├── lovelace_helpers.py  # push_lovelace_config_to() WS helper
    ├── scenario_runner.py   # YAML scenario engine (load, push, navigate, assert, doc images)
    ├── snapshots/           # Baseline PNG snapshots (committed; compared by assert_snapshot)
    ├── test_scenarios.py    # Parametrised test — one test per YAML file
    ├── test_doc_images.py   # Parametrised test — generates/verifies documentation images
    ├── test_uix_styling.py  # Smoke tests (HA boots, UIX integration visible, no JS errors)
    └── scenarios/
        ├── styling/         # Card CSS, template, macro, and theme scenarios
        └── forge/           # UIX-Forge scenarios

docs/
└── scenarios/               # Documentation-image-only scenarios (must declare doc_image:)
```

---

## Visual scenarios (YAML)

Each `.yaml` file under `tests/visual/scenarios/` defines one visual test.
No Python changes are needed to add a new scenario — just create a new file.

### Minimal example

```yaml
id: card_basic_style
description: A card with a red background via uix style
view_path: /lovelace-test/0
cards:
  - type: entities
    entities:
      - light.bed_light
    uix:
      style: |
        ha-card { background: red; }
assertions:
  - type: snapshot
    name: card_basic_style
```

### Full schema reference

| Key | Required | Description |
|-----|----------|-------------|
| `id` | ✅ | Unique identifier used as the pytest test ID and `-k` filter value |
| `description` | — | Human-readable description shown in pytest output |
| `view_path` | ✅ | URL path to navigate to after pushing the config (e.g. `/lovelace-test/0`) |
| `cards` | ✅ | List of Lovelace card configs pushed to the test dashboard |
| `theme` | — | HA theme name to activate before navigating (reset automatically after the test) |
| `interactions` | — | List of interactions to perform after navigation (see below) |
| `assertions` | ✅ | List of assertions to evaluate (see below) |

### Interaction types

Interactions run **after navigation** but **before assertions**.

**`hover`** — hover over an element:

```yaml
interactions:
  - type: hover
    selector: ha-card          # plain CSS selector (main document)
    settle_ms: 500             # optional, default 500 ms

  # Shadow-root traversal form:
  - type: hover
    root: hui-tile-card        # element(s) to enter shadow root of
    selector: ha-state-icon    # selector inside that shadow root
```

**`click`** — click an element (same selector forms as `hover`):

#### Shadow-root traversal

The `root` field accepts a **full CSS selector string** (not just a tag name) or a **list of such strings** forming a chain.  Each entry is resolved with a depth-first, shadow-piercing search; the runner descends into that element's `shadowRoot` before resolving the next entry.

This means pseudo-classes like `:nth-of-type(2)`, `:last-of-type`, and attribute selectors all work:

```yaml
interactions:
  # Target the second uix-forge on the page:
  - type: click
    root:
      - uix-forge:nth-of-type(2)
      - hui-tile-card
    selector: ha-tile-icon
```

> **Caveat:** `:nth-of-type` (and similar pseudo-classes) evaluate among **siblings at the same DOM level** where the element is found — not globally across shadow-root boundaries.  If both `uix-forge` elements are siblings in the same container this works as expected.  In a standard sections/grid view each card is wrapped in a `div.card` (which has no shadow root), so combine it with the child element in a single selector entry:
>
> ```yaml
> root:
>   - div.card:nth-of-type(2) uix-forge
>   - hui-tile-card
> selector: ha-tile-icon
> ```

```yaml
interactions:
  - type: click
    selector: ha-button
```

**`ha_service`** — call a HA REST API service:

```yaml
interactions:
  - type: ha_service
    domain: light
    service: turn_on
    data:
      entity_id: light.bed_light
```

**`wait`** — wait for a fixed duration:

```yaml
interactions:
  - type: wait
    ms: 1000
```

### Assertion types

**`snapshot`** — compare a screenshot against the baseline in `tests/visual/snapshots/`:

```yaml
assertions:
  - type: snapshot
    name: my_scenario_name    # basename of the PNG file (without extension)
    threshold: 0.001          # optional — fraction of pixels that may differ (default: 0)
```

The `threshold` field (0.0–1.0) lets you tolerate minor cross-platform rendering
differences (e.g. sub-pixel font hinting on macOS vs Linux) without masking real
visual regressions.  A value of `0.001` allows up to 0.1 % of pixels to differ.
Leave it unset (or set it to `0`) for an exact pixel-perfect comparison.

> **Cross-platform note:** Snapshot baselines in `tests/visual/snapshots/` were
> created on a specific OS/font stack.  If you run tests on a different operating
> system and the only failures are in snapshot assertions, the most likely cause
> is OS-level font rendering differences.  See [Updating snapshot baselines](#updating-snapshot-baselines) for how to regenerate them on your machine.

---

## Updating snapshot baselines

Baseline PNGs are stored in `tests/visual/snapshots/` and committed to the
repository.  They were created on a specific OS/font stack, so they may not
match pixel-for-pixel on a different operating system (e.g. macOS vs Linux).

### After an intentional visual change

Delete the affected baselines and re-run — new baselines are written automatically:

```bash
# Delete one baseline
rm tests/visual/snapshots/my_scenario_name.png

# Delete all baselines (regenerate everything)
rm tests/visual/snapshots/*.png

pytest tests/visual/test_scenarios.py
```

### When running on a different OS / platform (cross-platform snapshots)

Snapshot failures caused purely by OS-level font rendering (not by a real
visual regression) look nearly identical to the eye but fail pixel comparison.
The fastest fix is to regenerate all baselines for your environment using the
`SNAPSHOT_UPDATE=1` flag — **do not commit these regenerated baselines** unless
you are intentionally replacing the canonical set:

```bash
SNAPSHOT_UPDATE=1 pytest tests/visual/test_scenarios.py
```

Alternatively, add a `threshold` field to the failing scenario's snapshot
assertion (see [Assertion types](#assertion-types)) so that a small fraction of
differing pixels is tolerated on all platforms:

```yaml
assertions:
  - type: snapshot
    name: 01_card_basic_style
    threshold: 0.002    # allow up to 0.2 % of pixels to differ
```

---

## Adding a new scenario

1. Create a `.yaml` file anywhere under `tests/visual/scenarios/` (sub-directories are fine).
2. Fill in at minimum: `id`, `view_path`, `cards`, and `assertions`.
3. Run `pytest tests/visual/test_scenarios.py -k <your_id>` — the first run writes the baseline snapshot.
4. Commit the new `.yaml` **and** the new `.png` in `tests/visual/snapshots/`.

---

## Documentation images

The `doc_image:` key in a scenario YAML links a scenario to a documentation
page asset.  Scenarios that declare it are picked up by
`tests/visual/test_doc_images.py` and the resulting cropped screenshot is saved
(and compared) at the specified path inside the repository.

### Quick commands (Makefile aliases)

```bash
# Generate any missing doc images (first-run bootstrap, verifies existing ones)
make doc_images_gen

# Force-regenerate ALL doc images (use after an intentional HA/UIX visual change)
make doc_images_update
```

### Running directly with pytest

Environment variables are passed to pytest using the `VAR=value pytest ...` syntax
on Linux/macOS, or `set VAR=value && pytest ...` on Windows:

```bash
# Generate / verify all doc images
pytest tests/visual/test_doc_images.py

# Run a single doc image test by scenario id
pytest tests/visual/test_doc_images.py -k doc_theme_red_basic

# Force-regenerate all doc images (overwrites existing files)
DOC_IMAGE_UPDATE=1 pytest tests/visual/test_doc_images.py

# Force-regenerate a single image and also pin a specific HA version
HA_VERSION=2025.1.0 DOC_IMAGE_UPDATE=1 pytest tests/visual/test_doc_images.py -k doc_theme_red_basic
```

### Schema reference

Add a `doc_image:` block to any scenario YAML (alongside `card:`, `assertions:`, etc.):

```yaml
doc_image:
  output: docs/source/assets/page-assets/using/my-feature.png  # relative to repo root
  root: hui-entities-card   # shadow-piercing CSS selector for the element to crop
  padding: 16               # optional — pixels of whitespace border around element (default 0)
  threshold: 0.02           # optional — pixel-diff tolerance 0.0–1.0 (default 0)
```

| Key | Required | Description |
|-----|----------|-------------|
| `output` | ✅ | Output PNG path relative to the repository root.  Parent directories are created automatically. |
| `root` | — | Shadow-piercing CSS selector for the element whose bounding box defines the crop.  When omitted the full viewport is captured. |
| `padding` | — | Extra pixels added on each side of the element's bounding box. |
| `threshold` | — | Maximum fraction of pixels (0.0–1.0) that may differ from the on-disk file before the test fails.  Mirrors the `threshold` field on snapshot assertions. |
| `cursor` | — | Render a visible cursor overlay at the current mouse position before the screenshot.  Accepted values: `"default"` / `"arrow"` (standard arrow) or `"pointer"` / `"hand"` (pointing hand).  The overlay is removed immediately after capture. |

### Stepped captures (multiple images per scenario)

`doc_image` also accepts a **list** of entries.  Each entry captures one PNG; the
optional `interactions` sub-key runs additional interactions before that capture.
Interactions are **cumulative** — each entry picks up from the state left by the
previous one.

```yaml
doc_image:
  - output: docs/source/assets/page-assets/using/my-feature-default.png
    root: hui-tile-card
    padding: 8

  - interactions:
      - type: hover
        root: hui-tile-card
        selector: ha-tile-icon
        settle_ms: 800      # wait for hover CSS to settle before capturing
    output: docs/source/assets/page-assets/using/my-feature-hover.png
    root: hui-tile-card
    padding: 8

  - interactions:
      - type: click
        root: hui-tile-card
        selector: ha-tile-icon
        settle_ms: 1500
    output: docs/source/assets/page-assets/using/my-feature-active.png
    root: hui-tile-card
    padding: 8
```

### Behaviour

* **First run (no existing file):** the image is written automatically.
* **Subsequent runs:** the freshly captured PNG is compared to the on-disk file.
  The test fails when the diff exceeds `threshold`, indicating that the
  documentation image needs updating.
* **`DOC_IMAGE_UPDATE=1`:** always overwrites the on-disk file, regardless of
  differences.  Use this after an intentional visual change to UIX or HA, then
  commit the updated PNGs.

### Where to put doc image scenarios

* If the scenario also has functional `assertions:`, add `doc_image:` to the
  same YAML — the same HA state is used for both the test and the image.
* If the scenario exists solely to capture a documentation image (no functional
  assertions), place it under `docs/scenarios/` instead of `tests/visual/scenarios/`.
  Scenarios in `docs/scenarios/` **must** declare `doc_image:` and are never
  run by `test_scenarios.py`.

### Update workflow

When a Home Assistant update causes a doc image to look different:

```bash
# 1. Regenerate all doc images
make doc_images_update

# 2. Review the diff, then commit
git add docs/source/assets/page-assets/
git commit -m "docs: regenerate documentation images for HA X.Y"
```

---

## Documentation animations (animated GIFs)

The `doc_animation:` key captures N frames at fixed intervals and assembles them
into an animated GIF.  It is an alternative to `doc_image:` for scenarios where
a short looping animation better illustrates the feature.

### Schema reference

```yaml
doc_animation:
  output: docs/source/assets/page-assets/using/my-feature.gif
  root: hui-tile-card   # shadow-piercing CSS selector to crop each frame to
  padding: 8            # optional — pixels of border around element (default 0)
  frames: 12            # number of frames to capture (default 10)
  interval_ms: 100      # milliseconds between frames (default 100)
  threshold: 0.02       # optional — per-frame pixel-diff tolerance (default 0)
```

| Key | Required | Description |
|-----|----------|-------------|
| `output` | ✅ | Output GIF path relative to the repository root.  Parent directories are created automatically. |
| `root` | — | Shadow-piercing CSS selector for the element to crop.  When omitted the full viewport is captured. |
| `padding` | — | Extra pixels added on each side of the element's bounding box per frame. |
| `frames` | — | Number of frames to capture.  Total capture time = `frames × interval_ms` ms. |
| `interval_ms` | — | Delay between frames in milliseconds — also sets the GIF per-frame display duration. |
| `threshold` | — | Maximum fraction of pixels (0.0–1.0) that may differ per frame from the stored GIF.  A small non-zero value (e.g. `0.02`) is recommended to absorb minor GIF palette-quantisation drift across runs. |
| `cursor` | — | Render a visible cursor overlay at the current mouse position in every captured frame.  Accepted values: `"default"` / `"arrow"` or `"pointer"` / `"hand"`.  In segmented mode individual segments may override this with their own `cursor` key; set it to `none` to hide the cursor in that segment. |

### How to trigger an animation before capture

The top-level `interactions:` block in a scenario runs **immediately before**
`capture_doc_animation`, so you can fire an interaction with a very short
`settle_ms` to trigger a CSS transition and then capture frames while it is
still playing.

**Hover-triggered CSS transition** (fire hover, then capture frames mid-animation):

```yaml
interactions:
  - type: hover
    root: hui-tile-card
    selector: ha-tile-icon
    settle_ms: 0      # trigger the hover but don't wait for the animation to finish

doc_animation:
  output: docs/source/assets/page-assets/using/my-feature-hover.gif
  root: hui-tile-card
  padding: 8
  frames: 10          # e.g. 10 × 80 ms = 800 ms total
  interval_ms: 80
  threshold: 0.02
```

**CSS `@keyframes` that plays on page load** (no interaction needed — capture begins right after the HA settle delay):

```yaml
doc_animation:
  output: docs/source/assets/page-assets/using/my-feature-load.gif
  root: hui-tile-card
  padding: 8
  frames: 12
  interval_ms: 100
  threshold: 0.02
```

**State change via HA service** (call service, wait briefly for state to register, then capture):

```yaml
interactions:
  - type: ha_service
    domain: light
    service: turn_on
    data:
      entity_id: light.living_room
  - type: wait
    ms: 50            # let state propagate, but don't let the animation finish

doc_animation:
  output: docs/source/assets/page-assets/using/light-on-animation.gif
  root: hui-tile-card
  padding: 8
  frames: 15
  interval_ms: 100
  threshold: 0.02
```

**Cursor overlay** (show the pointer at the hover position):

```yaml
doc_animation:
  output: docs/source/assets/page-assets/using/my-feature-hover.gif
  root: hui-tile-card
  padding: 8
  frames: 10
  interval_ms: 80
  threshold: 0.02
  cursor: pointer
  interactions:
    - type: hover
      root: hui-tile-card
      selector: ha-tile-icon
      settle_ms: 800
```

**Cursor per segment** (show cursor while hovering, hide it after hover_away):

```yaml
doc_animation:
  output: docs/source/assets/page-assets/using/my-feature-hover-away.gif
  root: hui-tile-card
  padding: 8
  interval_ms: 80
  threshold: 0.02
  cursor: pointer          # default cursor for all segments
  segments:
    - interactions:
        - type: hover
          root: hui-tile-card
          selector: ha-tile-icon
          settle_ms: 800
      frames: 8            # pointer cursor shown (inherited)
    - interactions:
        - type: hover_away
          settle_ms: 400
      frames: 6
      cursor: none         # hide cursor after pointer leaves element
```

### Behaviour

* **First run (no existing file):** the GIF is written automatically.
* **Subsequent runs:** each frame is compared against the corresponding frame in
  the stored GIF.  The test fails when any frame exceeds `threshold`.
* **`DOC_IMAGE_UPDATE=1`:** always overwrites the on-disk file.  Use this after
  an intentional visual change to UIX or HA, then commit the updated GIFs.
* **Pillow is required** — it is included in the `[test]` extra:
  `pip install -e ".[test]"` installs it automatically.

### Where to put doc animation scenarios

Same rules as `doc_image:` scenarios:

* If the scenario also has functional `assertions:`, add `doc_animation:` to the
  same YAML.
* If the scenario exists solely to capture a documentation asset, place it under
  `docs/scenarios/`.  Scenarios there are never run by `test_scenarios.py`.

---

## Documentation image audit

`tests/test_doc_audit.py` scans every `.md` file under `docs/source/` for
Markdown image references (`![...](...)`) and checks that each PNG or GIF is
either:

* **generated by a scenario** — declared as `output:` inside a `doc_image:` or
  `doc_animation:` block in any scenario YAML, or
* **excluded** — listed in `tests/doc-image-audit-exclusions.txt`.

This prevents new documentation images from being added without either a
matching scenario or an explicit acknowledgement that the image is hand-crafted.

### Running the audit

```bash
# Via the Makefile alias (no Docker / browser required)
make doc_audit

# Directly with pytest
pytest tests/test_doc_audit.py
```

The audit does **not** start a Home Assistant container or a browser, so it
runs instantly.

### Exclusion list

`tests/doc-image-audit-exclusions.txt` holds images that are intentionally
hand-crafted — diagrams, logos, screenshots that cannot or need not be
reproduced by automated scenarios.  One repo-relative path per line;
lines beginning with `#` and blank lines are ignored.

When you add a new hand-crafted image to the docs, also add its path here:

```
# My new hand-crafted diagram
docs/source/assets/page-assets/my-page/my-diagram.png
```

If the audit fails because an image was not yet classified, you will see a
message like:

```
FAILED tests/test_doc_audit.py::test_all_doc_images_are_tracked
  2 doc image(s) are not generated by any scenario and are not listed in
  tests/doc-image-audit-exclusions.txt.

  Add a doc_image:/doc_animation: key to a scenario YAML to auto-generate
  each image, or add it to tests/doc-image-audit-exclusions.txt if it is
  intentionally hand-crafted:

    docs/source/assets/page-assets/forge/my-new-image.png
    docs/source/assets/page-assets/forge/my-other-image.gif
```
