## [8.3.0-beta.3](https://github.com/Lint-Free-Technology/uix/compare/v8.3.0-beta.2...v8.3.0-beta.3) (2026-09-10)

### ⭐ New Features

* **broker:** Add `tile-icon` directive to add a tile-icon before/after an interaction anchor ([#601](https://github.com/Lint-Free-Technology/uix/issues/601)) ([7b3e83c](https://github.com/Lint-Free-Technology/uix/commit/7b3e83cf918164e5d20c952f7d4e6cc73cec0b85))
* **broker:** Add uix styling to `button` directive. Fix underlying element ripply firing. ([286d272](https://github.com/Lint-Free-Technology/uix/commit/286d2726028b5402394c5f4f572459d8f21104e5))

## [8.3.0-beta.2](https://github.com/Lint-Free-Technology/uix/compare/v8.3.0-beta.1...v8.3.0-beta.2) (2026-09-10)

### ⭐ New Features

* UIX action `locked_action`. Uses same `locks` and `code_dialog` config of Forge lock spark. ([#600](https://github.com/Lint-Free-Technology/uix/issues/600)) ([8cd595d](https://github.com/Lint-Free-Technology/uix/commit/8cd595d616546730ff61f1f0e760f348a4a96704))

## [8.3.0-beta.1](https://github.com/Lint-Free-Technology/uix/compare/v8.2.0...v8.3.0-beta.1) (2026-09-09)

### ⭐ New Features

* **broker:** Add typed rules user and user_is_admin ([#599](https://github.com/Lint-Free-Technology/uix/issues/599)) ([e4ff93f](https://github.com/Lint-Free-Technology/uix/commit/e4ff93f04380c25193bfff45cb1409de3fa32758))

[## [8.2.0](https://github.com/Lint-Free-Technology/uix/compare/v8.1.0...v8.2.0) (2026-09-09)

### ⭐ New Features

* Add experimental option to always patch ha-card even when there is no card config. Allows for ha-card used on settings and custom panels to be styled from theme. ([#541](https://github.com/Lint-Free-Technology/uix/issues/541)) ([3f3f74d](https://github.com/Lint-Free-Technology/uix/commit/3f3f74d2f160d7009ee61ce34e70e1f9b48119af))
* Apply entity picture styling to entity badges. ([#548](https://github.com/Lint-Free-Technology/uix/issues/548)) ([42be874](https://github.com/Lint-Free-Technology/uix/commit/42be874ff89a6c01d512640bd70800915166c6c3)), references [#547](https://github.com/Lint-Free-Technology/uix/issues/547)
* Apply UIX styling to custom panels loaded by iframe ([#549](https://github.com/Lint-Free-Technology/uix/issues/549)) ([45cc20c](https://github.com/Lint-Free-Technology/uix/commit/45cc20c7ec3f3a68a78d2cc0d6f3101dc87cd8fa))
* **broker:** `event` directive now supports `captured_data: deep` to do a deep merge of interaction captured data and `event.data`. ([27c164a](https://github.com/Lint-Free-Technology/uix/commit/27c164acae2beef096b82778445bbb465e3112de))
* **broker+action:** Add `event` UIX Action. Inject target of UIX Broker button action to UIX Action as `event` dispatch target. Allows UIX Broker buttons to fire a Browser event on its target. ([d5ef901](https://github.com/Lint-Free-Technology/uix/commit/d5ef90106067d9ebf548a806371300c94bfdddf6))
* **broker+forge:** Add border color and icon background color/opacity to UIX Forge/Broker button. ([1bc51b6](https://github.com/Lint-Free-Technology/uix/commit/1bc51b645880a93f09520e2b3b6ddd48b02d4098))
* **broker:** Add `template` and `javascript` directives that render a template or calls javascript and provides the result for further directives. ([#580](https://github.com/Lint-Free-Technology/uix/issues/580)) ([e4206c3](https://github.com/Lint-Free-Technology/uix/commit/e4206c37623aaa740c2ab80420c14223a3d2af7b))
* **broker:** Add `uix-broker-ready` event which can be used as `listen` in browser realm. Update tools sidebar button example. ([3b5110f](https://github.com/Lint-Free-Technology/uix/commit/3b5110f22aaceb068f4218bc0f46d7b36b63f12a))
* **broker:** Add button directive which allows to add a button in UI, similar to a forge button spark. ([21e3c01](https://github.com/Lint-Free-Technology/uix/commit/21e3c01346ae73e56567fb6d9323739276be975a))
* **broker:** Add matching rules to directives so a specific directive can be excluded based on rules matching or not, except for `type: block` ([7c2ed9a](https://github.com/Lint-Free-Technology/uix/commit/7c2ed9a84e36ecbd4770ed7a883f605f38d8715f))
* **broker:** Add standalone wait directive. ([a86e81f](https://github.com/Lint-Free-Technology/uix/commit/a86e81ff22b8cdaf06984544d6bb0bc20a167b96))
* **broker:** Add typed rules `hash` and `search` to allow for rules based on Browser hash and search string. ([f75e153](https://github.com/Lint-Free-Technology/uix/commit/f75e153906b9db11432ed9fa55beea1761aecad6))
* **broker:** Allow multiple `listen` events in Browser realm ([e90d033](https://github.com/Lint-Free-Technology/uix/commit/e90d03349925b1b3913ca68026605aa894df4727))
* **broker:** New rule type `panel`. Allow `event` directive to fire on window or document with new `target` parameter (defaults to anchor). ([b1f3504](https://github.com/Lint-Free-Technology/uix/commit/b1f35043641d7a620453b42c774b0b2a8e70d11a))
* **forge+broker:** Add `--uix-icon-button-background-color-hover` and `--uix-icon-button-background-opacity-hover` CSS styling variables. ([d41b62d](https://github.com/Lint-Free-Technology/uix/commit/d41b62d85fb2ca9cab79800fe22ceddd88443c81))
* **forge:** Add `outlined` as an appearance option to button spark. Update docs and visual example. ([0254777](https://github.com/Lint-Free-Technology/uix/commit/02547770dd7b18f129238a78393f1218fe14a4bc))
* UIX Broker. See documentation for further information. ([#556](https://github.com/Lint-Free-Technology/uix/issues/556)) ([4a6d2ff](https://github.com/Lint-Free-Technology/uix/commit/4a6d2ffecf8d55cecb6d2e80a966ef5d52916a70))

### 🐞 Bug Fixes

* **beta:** Regression with 8.2.0-beta.1 not loading UIX in regular dashboard hosted in an iFrame ([#562](https://github.com/Lint-Free-Technology/uix/issues/562)) ([6390f86](https://github.com/Lint-Free-Technology/uix/commit/6390f867dd478a2f300587e7ec30e53406595021)), references [#558](https://github.com/Lint-Free-Technology/uix/issues/558)
* **broker:** Fix `@id` captured rule not accepting quoted bracketed keys ([67253e8](https://github.com/Lint-Free-Technology/uix/commit/67253e8e56e2d7e1bf42149f7b05c7a4163a0c7e))
* **broker:** Remove reference to detached elements for anchor console helpers as well as button wrappers. Removes strong reference to detached DOM elements preventing them being garbage collected. ([2df5ebb](https://github.com/Lint-Free-Technology/uix/commit/2df5ebbdd4d7631ad46f607df3300848c5fb3c7d))
* **broker:** Use correct Frontend action config for action directive ([ba6043a](https://github.com/Lint-Free-Technology/uix/commit/ba6043ac1b779111662c8f587a51af064e045202))
* Entities card render crash for uninitialized forge molds when UIX coordinator is not ready ([#551](https://github.com/Lint-Free-Technology/uix/issues/551)) ([282a513](https://github.com/Lint-Free-Technology/uix/commit/282a51355ff5cdd53c5ba63b76163bd4d909e4a3)), references [#550](https://github.com/Lint-Free-Technology/uix/issues/550)
* Remove event uix-update listener for detached uix-node preventing resource leak in edge case UIX Styling scenarios. ([f9db963](https://github.com/Lint-Free-Technology/uix/commit/f9db963e6e894510a31f29b691786222af11329b))
* Set `drawer` and `state-history-charts` as theme types for console debug helpers so they give correct uix_path() results. ([7e24078](https://github.com/Lint-Free-Technology/uix/commit/7e240786e10ac4ef3388a41c5f4672e652942586))
* UIX theme styling not always applied to config pages and custom panels when page/panel is initial page loaded. ([209e388](https://github.com/Lint-Free-Technology/uix/commit/209e388cb3c5594b5796b8045c7d0f2156708af0)), references [#573](https://github.com/Lint-Free-Technology/uix/issues/573)

### 📔 Documentation

* register German translation ([e079f50](https://github.com/Lint-Free-Technology/uix/commit/e079f50808e9488d5c5577d42f422d4627b5ca91))

### 📦 Dependency Upgrades

* bump js-yaml from 5.3.0 to 5.4.0 ([#560](https://github.com/Lint-Free-Technology/uix/issues/560)) ([e1b759f](https://github.com/Lint-Free-Technology/uix/commit/e1b759fd9fce92823106eeb53aa69cd63124be2f))

### ⚙️ Miscellaneous

* Migrate snake-case `uix_update` event to kebab-case `uix-update` ([23e1d0a](https://github.com/Lint-Free-Technology/uix/commit/23e1d0a8eb49d6d73e4f0f41fb38a2387272953c))](https://github.com/Lint-Free-Technology/uix/releases/tag/v8.2.0)

## [8.1.0](https://github.com/Lint-Free-Technology/uix/compare/v8.0.1...v8.1.0) (2026-08-22)

### ⭐ New Features

* Add icon styling coordinator to dispatch refresh to icons when theme style templates include `--uix-icon-for-<entity_id>` or `--uix-icon-color-for-<entity_id>` ([#532](https://github.com/Lint-Free-Technology/uix/issues/532)) ([72f4efe](https://github.com/Lint-Free-Technology/uix/commit/72f4efe05738004cbfe0a82bb978090b27736571))
* Add image for entity styling coordinator to dispatch refresh to images when theme style templates include --uix-image-for-<entity_id> ([#533](https://github.com/Lint-Free-Technology/uix/issues/533)) ([27fb83d](https://github.com/Lint-Free-Technology/uix/commit/27fb83d296b293a922194a24c6f68f7e2d6aa7b2)), references [#528](https://github.com/Lint-Free-Technology/uix/issues/528)
* Add performance option to disable entity picture image styling ([#534](https://github.com/Lint-Free-Technology/uix/issues/534)) ([daa590e](https://github.com/Lint-Free-Technology/uix/commit/daa590e2896e8ec405510b36d1575571486d4f64)), references [#529](https://github.com/Lint-Free-Technology/uix/issues/529)
* Add performance option to disable icon styling patching. ([#526](https://github.com/Lint-Free-Technology/uix/issues/526)) ([08db74d](https://github.com/Lint-Free-Technology/uix/commit/08db74dd389bc24da1ae9aa6a5adb0e6f8b52cef))
* Allow for icon and icon color override by entity for ha-state-icon, ha-icon, ha-svg-icon ([#519](https://github.com/Lint-Free-Technology/uix/issues/519)) ([0ef0c43](https://github.com/Lint-Free-Technology/uix/commit/0ef0c431fb21090904ec91c5c51bbda71d19b608))
* Enhance `toast` UIX action with `secondary_action` button which is now available in Home Assistant 2026.8.0. Adds `primary` to style either action button in primary style. ([#505](https://github.com/Lint-Free-Technology/uix/issues/505)) ([8450cd7](https://github.com/Lint-Free-Technology/uix/commit/8450cd7a9937a71a6485a0cd8b3f6a3bb338ec62))
* Implement 60-second countdown for version mismatch reload toast. Auto reload on countdown finished. ([#517](https://github.com/Lint-Free-Technology/uix/issues/517)) ([09f8a86](https://github.com/Lint-Free-Technology/uix/commit/09f8a86ff2127eac644eb5ff66d21f8405602a35))
* UIX action `javascript` to enable javascript code to be run. `hass` provided as well as optional `variables` object. ([#506](https://github.com/Lint-Free-Technology/uix/issues/506)) ([7197a6e](https://github.com/Lint-Free-Technology/uix/commit/7197a6e5f698d631fa8e535bafe1d239f614dd62))
* Update 60s countdown for version mismatch reload toast to use `:after` style for seconds remaining if available to stop any toast UIX styling from causing flashing due to toast reloads. ([#535](https://github.com/Lint-Free-Technology/uix/issues/535)) ([8314904](https://github.com/Lint-Free-Technology/uix/commit/8314904fa714a4029b8f45fb8a861a427221a3b4))

### 🐞 Bug Fixes

* entity image override for ha-user-badge not working since Home Assistant 2026.7. For ha-user-badge and ha-person-badge, use inserted div.picture.uix-image and style existing div.picture as hidden while overridden to stop flickering. ([a25b9e3](https://github.com/Lint-Free-Technology/uix/commit/a25b9e305527a91e42ba23616e9c8c66b88f7d10))
* Multiple template subscriptions may be created for same UIX Styling node when Home Assistant app is suspended and restored in Browser. This causes multiple updates to the UIX Styling node when the template updates which may cause visual artifacts and will add up to a small resource increase over time. ([#540](https://github.com/Lint-Free-Technology/uix/issues/540)) ([791ea08](https://github.com/Lint-Free-Technology/uix/commit/791ea08e88336b5e7b811e86f82840c0cc06a40c))
* Support whitespace padding in billet interpolation braces and list indices ([#530](https://github.com/Lint-Free-Technology/uix/issues/530)) ([26c266e](https://github.com/Lint-Free-Technology/uix/commit/26c266e4699f16325e22c6eeb8bfb7138e6f2c47)), references [#503](https://github.com/Lint-Free-Technology/uix/issues/503)
* UIX styling of toast removed if another stacked toast message subsequently shows. ([#536](https://github.com/Lint-Free-Technology/uix/issues/536)) ([04e89d1](https://github.com/Lint-Free-Technology/uix/commit/04e89d12af317fdf9509d12ae39d3cc83bbb0d7a))

### ⚙️ Miscellaneous

* Use js-yaml directly to load theme YAML rather than loading ha-yaml-editor via surrogate tools event tab. ([#520](https://github.com/Lint-Free-Technology/uix/issues/520)) ([b014858](https://github.com/Lint-Free-Technology/uix/commit/b0148580237b6568616d7a8390b0048bb87bcce1)), references [#518](https://github.com/Lint-Free-Technology/uix/issues/518)

## [8.0.1](https://github.com/Lint-Free-Technology/uix/compare/v8.0.0...v8.0.1) (2026-08-13)

### 🐞 Bug Fixes

* Correctly apply uix theme config, theme spark or more-info theme following view. ([#511](https://github.com/Lint-Free-Technology/uix/issues/511)) ([29d20de](https://github.com/Lint-Free-Technology/uix/commit/29d20de885fa3349accfc01324c160377c3a288e)), closes [#510](https://github.com/Lint-Free-Technology/uix/issues/510)
* custom cards that use Lit local scoped customElements registry correctly apply uix on cards customElement shadow roots. e.g. custom:mini-climate ([#513](https://github.com/Lint-Free-Technology/uix/issues/513)) ([00a8e37](https://github.com/Lint-Free-Technology/uix/commit/00a8e37ba073c70990d0935eadec090dd5c4ed7c)), references [#512](https://github.com/Lint-Free-Technology/uix/issues/512)
* **forge:** Also fix actions not working in Home Assistant 2026.8.0 for forged picture-elements of types icon, state-badge, state-icon and state-label when one of these has no actions. ([4a47eff](https://github.com/Lint-Free-Technology/uix/commit/4a47eff4f8590a616b3145caead8f69dd264c865))
* **forge:** Correctly apply overlay-icon spark right and bottom parts of icon_position. ([#502](https://github.com/Lint-Free-Technology/uix/issues/502)) ([53aef12](https://github.com/Lint-Free-Technology/uix/commit/53aef1230399cd6d119fbf99700fe655711d59bc)), references [#501](https://github.com/Lint-Free-Technology/uix/issues/501)
* **forge:** Fix actions not working in Home Assistant 2026.8.0 for forged picture-elements of types icon, state-badge, state-icon and state-label. ([#497](https://github.com/Lint-Free-Technology/uix/issues/497)) ([3225c92](https://github.com/Lint-Free-Technology/uix/commit/3225c929b1d3b934c6f57bd9144ae228e0b2a348)), closes [#495](https://github.com/Lint-Free-Technology/uix/issues/495)
* Restore UIX Foundries to YAML tab on Frontend Tools after 2026.8.0 ([350000f](https://github.com/Lint-Free-Technology/uix/commit/350000f0845d8c954bb5fa2175cd6f4eb6f8b511))
* Send foundries on initial backend connect so they are immediately available. ([193ff15](https://github.com/Lint-Free-Technology/uix/commit/193ff158eac79d561eea27f80ca7dd62b58a6f1f)), references [#494](https://github.com/Lint-Free-Technology/uix/issues/494)

### ⚙️ Miscellaneous

* Remove no longer used ha-developer-tools patch. Update documentation removing Developer from any reference to Home Assistant tools. ([a150edb](https://github.com/Lint-Free-Technology/uix/commit/a150edb89c0a3e38799e29714c6210920eed3875))

## [8.0.1-beta.6](https://github.com/Lint-Free-Technology/uix/compare/v8.0.1-beta.5...v8.0.1-beta.6) (2026-08-11)

### 🐞 Bug Fixes

* Correctly apply uix theme config, theme spark or more-info theme following view. ([#511](https://github.com/Lint-Free-Technology/uix/issues/511)) ([29d20de](https://github.com/Lint-Free-Technology/uix/commit/29d20de885fa3349accfc01324c160377c3a288e)), closes [#510](https://github.com/Lint-Free-Technology/uix/issues/510)
* custom cards that use Lit local scoped customElements registry correctly apply uix on cards customElement shadow roots. ([#513](https://github.com/Lint-Free-Technology/uix/issues/513)) ([00a8e37](https://github.com/Lint-Free-Technology/uix/commit/00a8e37ba073c70990d0935eadec090dd5c4ed7c)), references [#512](https://github.com/Lint-Free-Technology/uix/issues/512)

### ⚙️ Miscellaneous

* Remove no longer used ha-developer-tools patch. Update documentation removing Developer from any reference to Home Assistant tools. ([a150edb](https://github.com/Lint-Free-Technology/uix/commit/a150edb89c0a3e38799e29714c6210920eed3875))

## [8.0.0](https://github.com/Lint-Free-Technology/uix/compare/v7.7.1...v8.0.0) (2026-08-05)

### ⚠ BREAKING CHANGES

* **forge:** Home Assistant 2026.8.0 or greater required.

### ⭐ New Features

* **forge:** Allow templates to be ignored by UIX Forge and included in element config unchanged using `{# uix-forge.ignore #}`. ([#466](https://github.com/Lint-Free-Technology/uix/issues/466)) ([2e4a1d1](https://github.com/Lint-Free-Technology/uix/commit/2e4a1d13cab2e1291b9b05d200c152ddcd25c515)), closes [#455](https://github.com/Lint-Free-Technology/uix/issues/455)
* **forge:** For lock spark select multiple locks for same user based on active property ([#488](https://github.com/Lint-Free-Technology/uix/issues/488)) ([7f55326](https://github.com/Lint-Free-Technology/uix/commit/7f55326ae2a04acf3cb946f08ea4e1f16e1acfef)), references [#484](https://github.com/Lint-Free-Technology/uix/issues/484)

### 🐞 Bug Fixes

* Console error in settings page in 2026.8.0 ([af74dc0](https://github.com/Lint-Free-Technology/uix/commit/af74dc0f0f7f97ac4d9be4f3e98edeeb2634afc0)), references [#481](https://github.com/Lint-Free-Technology/uix/issues/481)
* **forge:** Fix row element editor wrap in UIX Forge adding `mold: row111` ([071e327](https://github.com/Lint-Free-Technology/uix/commit/071e327e82a3feed28bdc813c41120a5d16cc9be))
* Remove debug console log for more-info dialog patch "showDialog called with params" ([ef03713](https://github.com/Lint-Free-Technology/uix/commit/ef0371377702d1177fb08e1250895327a74f7069))

### 📔 Documentation

* **forge:** Update button spark `size` allowed variants to `s` and `m`. Adjust your config if you use button spark and wish to have small.b This both makes small size work and remove ha-button console deprecation warning. ([2ac14fe](https://github.com/Lint-Free-Technology/uix/commit/2ac14fefb299531abb199baa4f0f848fb40d399c))

### ⚙️ Miscellaneous

* **forge:** Accept `color` as forge config and pass to forged element (support forged entities card). Migrate `state_color` to `color` for both forge config and element config. `color` always overrides `state_color` if present in forge or element config. These changes reflect changes in Home Assistant 2026.8.0. ([c05767f](https://github.com/Lint-Free-Technology/uix/commit/c05767fecac482f08fd74c8d2d98793d9cbcb8d0))
* **forge:** Migrate `state_color` to `color` for Overlay icon spark. Map existing `state_color: true` to `color: state` and `state_color: false` to `color: none`.  `color` defaults to `state`. These changes reflect changes in Home Assistant 2026.8.0. ([#478](https://github.com/Lint-Free-Technology/uix/issues/478)) ([89ae527](https://github.com/Lint-Free-Technology/uix/commit/89ae527a9e84883d74d92dd9845677e11fd209a1))
* **forge:** Migrate `state_color` to `color` for State badge spark. Map existing `state_color: true` to `color: true` and `state_color: false` to `color: none`. `color` defaults to `state`. These changes reflect changes in Home Assistant 2026.8.0. ([#477](https://github.com/Lint-Free-Technology/uix/issues/477)) ([1a5e75f](https://github.com/Lint-Free-Technology/uix/commit/1a5e75f02d96d6b7443c8aaf2cd04487f24d4a88))
* Set minimum HA Version to 2026.8.0.dev0 so HACS will allow against dev builds and greater. ([d5e0f40](https://github.com/Lint-Free-Technology/uix/commit/d5e0f4029d669430fc78362dd8e3e92c37d8bc50))

## [7.7.1](https://github.com/Lint-Free-Technology/uix/compare/v7.7.0...v7.7.1) (2026-07-22)

### 🐞 Bug Fixes

* Correct fix for [#450](https://github.com/Lint-Free-Technology/uix/issues/450) to allow ha-card dom search upwards through custom card shadow root tree. ([ca0a958](https://github.com/Lint-Free-Technology/uix/commit/ca0a958561a27d1d19ca458ba520f4e834a3b1b6)), closes [#452](https://github.com/Lint-Free-Technology/uix/issues/452)
* **forge:** For more-info spark show any more-info child views in regular more-info dialog. ([#457](https://github.com/Lint-Free-Technology/uix/issues/457)) ([2be654f](https://github.com/Lint-Free-Technology/uix/commit/2be654fdf62a4a7cbe9c146bfa6b2224cb1b6557)), references [#456](https://github.com/Lint-Free-Technology/uix/issues/456)
* **forge:** Map spark fit_map option may ont work on initial page load. ([6b7450c](https://github.com/Lint-Free-Technology/uix/commit/6b7450cc13d30285f741a045b30748edfd567ae0))
* ha-card in element may incorrectly get type and styling of ancestor element ([cc5a285](https://github.com/Lint-Free-Technology/uix/commit/cc5a28525487b723b534d572f68440fd078f2e6a)), references [#450](https://github.com/Lint-Free-Technology/uix/issues/450)
* When using `theme:` config resolve correctly to `uix-theme` when it defined but different from Home Assistant theme applied. ([#463](https://github.com/Lint-Free-Technology/uix/issues/463)) ([01e88a3](https://github.com/Lint-Free-Technology/uix/commit/01e88a350b870544596b0971116d5506ad870b63)), closes [#462](https://github.com/Lint-Free-Technology/uix/issues/462)

### ⚙️ Miscellaneous

* Update panel.theme to be defined only when a view theme is defined. Add panel.globalTheme ([#465](https://github.com/Lint-Free-Technology/uix/issues/465)) ([2825ea0](https://github.com/Lint-Free-Technology/uix/commit/2825ea0a68d26c6b2c44cb2419427d49360ae840)), closes [#464](https://github.com/Lint-Free-Technology/uix/issues/464)

## [7.7.0](https://github.com/Lint-Free-Technology/uix/compare/v7.6.2...v7.7.0) (2026-07-14)

### ⭐ New Features

* Add UIX Forge more-info spark ([#437](https://github.com/Lint-Free-Technology/uix/issues/437)) ([da1a943](https://github.com/Lint-Free-Technology/uix/commit/da1a94347bfa07903b5d37be5616469d5f62f111))
* **button-spark:** Allow for styling of label text-wrap by CSS var. ([b391849](https://github.com/Lint-Free-Technology/uix/commit/b391849ca6baeaeb13d6880d437257cd5403e302)), closes [#428](https://github.com/Lint-Free-Technology/uix/issues/428)
* **forge:** add info option to more-info spark allowing to show details only with `info: false` and `details: true` ([#444](https://github.com/Lint-Free-Technology/uix/issues/444)) ([23ec5fc](https://github.com/Lint-Free-Technology/uix/commit/23ec5fcbe9ab11fc9bd85ca3ca16a98aa3b452a6))
* **forge:** Overall global and global mold-specific foundries ([#426](https://github.com/Lint-Free-Technology/uix/issues/426)) ([2781a74](https://github.com/Lint-Free-Technology/uix/commit/2781a743945d61d2ca4c3cb2c65188868112df60))
* more-info dialog styling to get theme from panel state allowing for dialog to set view theme when applying UIX styling. ([58ae10e](https://github.com/Lint-Free-Technology/uix/commit/58ae10ed82f430a2158723d206d1236185bd4989))
* New UIX actions `more-info` and `toast`. `more-info` action allows to set more-info view. `toast` actions shows Home Assistant toast message with optional action. ([#446](https://github.com/Lint-Free-Technology/uix/issues/446)) ([7022caa](https://github.com/Lint-Free-Technology/uix/commit/7022caaf95a4d181b662c76982efeb2d589cb5ab))
* UIX Forge blank card. Use as a base for sparks. Can have `title`. Can be used with `card`, `card_as_row` and `card_as_badge` molds. ([#436](https://github.com/Lint-Free-Technology/uix/issues/436)) ([a226d7c](https://github.com/Lint-Free-Technology/uix/commit/a226d7c3878f1d5cfb5d54050d78a6e8e48f21ac))

### 🐞 Bug Fixes

* A connected element may disconnect while style pre-process (theme etc) takes place so should not be refreshed as disconnected element will have no theme, so no theme macros etc. causing downstream errors. A connected check now takes place after pre-process and does not refresh if disconnected. ([d33664e](https://github.com/Lint-Free-Technology/uix/commit/d33664e69f5251e6e8749c0d67d6bb8b6e0048e2))
* Allow theme yaml loading via either `developer-tools` or `tools` in preparation for Home Assistant 2026.8.0. UIX uses ha-yaml-editor as a yaml2json loader and loads via (developer-)tools. ([3a82a23](https://github.com/Lint-Free-Technology/uix/commit/3a82a23c44760b1d3f68234f9f90d73e39d54a2a)), closes [#425](https://github.com/Lint-Free-Technology/uix/issues/425)
* **forge-overlay-icon-spark:** Prepend overlay div in shadowRoot rather than appendChild as Lit update cycle may remove appended child. ([4d45c21](https://github.com/Lint-Free-Technology/uix/commit/4d45c21dcb221d51892d1c8de18d09fcb6cf4b17)), closes [#427](https://github.com/Lint-Free-Technology/uix/issues/427)
* **forge:** Change more-info spark more-info details wrapper form ha-card to div with styling like ha-card. Fixes having a child ha-card of blank card not in shadowRoot. ([1412d15](https://github.com/Lint-Free-Technology/uix/commit/1412d157cbbff71b3890084d62c398d052752481))
* **forge:** Toggle details on click on entire details head. ([ae68047](https://github.com/Lint-Free-Technology/uix/commit/ae68047a09dbe5d7578ca7a31e4d9e83fac516f9))
* UIX Forge blank card ha-card does not include class type-custom-uix-forge-blank-card ([8e520c6](https://github.com/Lint-Free-Technology/uix/commit/8e520c64969b0df92d77d0adcf7b610a3c1adc59))
* Unhandled exception when theme `-yaml` section has invalid yaml. Correct to show UIX error and group invalid yaml with console group. ([0a77e6a](https://github.com/Lint-Free-Technology/uix/commit/0a77e6afb8a42c1c2b16fb19638fa608534b2003))
* Update console helpers to give theme only boilerplate for 'profile', 'todo' and 'persistent-notification' ([cc0376b](https://github.com/Lint-Free-Technology/uix/commit/cc0376b7d32478c473e103a509ecace9f1d683c1))

### 📦 Dependency Upgrades

* bump parse-duration from 2.1.6 to 2.1.8 ([#443](https://github.com/Lint-Free-Technology/uix/issues/443)) ([3e0f741](https://github.com/Lint-Free-Technology/uix/commit/3e0f7410ce25fd01791537505356be91183b25cb))

### ⚙️ Miscellaneous

* Add nl to integration strings (not Frontend)([#438](https://github.com/Lint-Free-Technology/uix/issues/438)) ([3bd3027](https://github.com/Lint-Free-Technology/uix/commit/3bd3027b7095fda217f9024365c07ff8ce5dbef1))
* Add simplified Chinese (zh-Hans) to integration strings (not Frontend). ([#435](https://github.com/Lint-Free-Technology/uix/issues/435)) ([8e66373](https://github.com/Lint-Free-Technology/uix/commit/8e66373fc46d9760e7bea8fa7c428d8e8e0b4bcc))
* bump typescript from 6.0.3 to 7.0.2. Switch to esbuild rollup plugin from typescript2 plugin. Switch to babel input rollup plugin from output. Remove terser rollup plugin now handled by esbuild ([#440](https://github.com/Lint-Free-Technology/uix/issues/440)) ([0dd3d33](https://github.com/Lint-Free-Technology/uix/commit/0dd3d335e0da67e512c55bf02de1a3965ba44c41))
* Update new `more-info` action to use `entity` instead of `entityId` ([ebbd5dc](https://github.com/Lint-Free-Technology/uix/commit/ebbd5dc2a2456dce7e0a2c54ee6dbc05aab4e1a7))
* Update primary UIX action names to `clear-cache` and `more-info` so as to align more-info with what is commonly recognised. Prior `clear_cache` will continue to work as an action. ([072aa52](https://github.com/Lint-Free-Technology/uix/commit/072aa5207e53bf891705cb452f1d1c3fc9390c9a))

## [7.6.2](https://github.com/Lint-Free-Technology/uix/compare/v7.6.1...v7.6.2) (2026-07-04)

### 🐞 Bug Fixes

* duplicate sparks from Forge foundries when no sparks in local forge ([#421](https://github.com/Lint-Free-Technology/uix/issues/421)) ([2bfb6a6](https://github.com/Lint-Free-Technology/uix/commit/2bfb6a681a2acd49cc1a3d990ea45f3dbfac7f9f)), references [#420](https://github.com/Lint-Free-Technology/uix/issues/420)
* UIX Styling removed from badge when editing in UI Editor ([6d693f9](https://github.com/Lint-Free-Technology/uix/commit/6d693f9b587024b115285f436edbf03984ab4161))

## [7.6.1](https://github.com/Lint-Free-Technology/uix/compare/v7.6.0...v7.6.1) (2026-07-01)

### 🐞 Bug Fixes

* `uix_style_path` (`uix_path`) context selection for dual-scope shadowDom and light DOM parents ([#410](https://github.com/Lint-Free-Technology/uix/issues/410)) ([c61b8e3](https://github.com/Lint-Free-Technology/uix/commit/c61b8e342306db5d9b28b41d4fbb70a83053f80c)), references [#409](https://github.com/Lint-Free-Technology/uix/issues/409)
* Patch row element editor to allow use of visual row editor when UIX config exists ([8431bef](https://github.com/Lint-Free-Technology/uix/commit/8431bef31430d6fa7cdf771964e51638daf35921))
* UIX config removed from entities config when Home Assistant upgrades `format` to `time_format` ([5631aea](https://github.com/Lint-Free-Technology/uix/commit/5631aeaabf3822ac50f0c5956fc29dc23ab08aac))

### 📦 Dependency Upgrades

* Update npm to 11.18. Also updates undici to resolve security vulnerability in dev tools. ([a6c68f3](https://github.com/Lint-Free-Technology/uix/commit/a6c68f3130ffaf5f3dc289b3b4cc18bc7f4691af))

## [7.6.0](https://github.com/Lint-Free-Technology/uix/compare/v7.5.0...v7.6.0) (2026-06-29)

### ⭐ New Features

* Add box shadow to UIX Forge map spark tour icon ([#395](https://github.com/Lint-Free-Technology/uix/issues/395)) ([084d42d](https://github.com/Lint-Free-Technology/uix/commit/084d42da326d4f13c40510a71163848601802433))
* Allow grouping for UIX Forge map spark entity filter using `group` config. ([#402](https://github.com/Lint-Free-Technology/uix/issues/402)) ([3d3789a](https://github.com/Lint-Free-Technology/uix/commit/3d3789a646eed5f3fc79ba0a241815e6e975c54d))
* **forge:** Allow event spark data to replace existing data rather than deep merge. ([e08c9c4](https://github.com/Lint-Free-Technology/uix/commit/e08c9c4d56181bc86e6b1e53f77d6c132a66a365))
* Map spark hours_to_show slider option ([#393](https://github.com/Lint-Free-Technology/uix/issues/393)) ([e6af7cf](https://github.com/Lint-Free-Technology/uix/commit/e6af7cf03b58230f0edb445d452607aa04372166)), closes [#392](https://github.com/Lint-Free-Technology/uix/issues/392)
* UIX Forge `card-feature` mold ([#389](https://github.com/Lint-Free-Technology/uix/issues/389)) ([ef1fdc8](https://github.com/Lint-Free-Technology/uix/commit/ef1fdc868fb42807b0b487e6a7abbffa42a68396))
* UIX Forge map spark `entity_filter` option. ([#400](https://github.com/Lint-Free-Technology/uix/issues/400)) ([fb9988c](https://github.com/Lint-Free-Technology/uix/commit/fb9988c65a9b6f47cfeb8518183521a5e7acd567)), closes [#399](https://github.com/Lint-Free-Technology/uix/issues/399)

### 🐞 Bug Fixes

* Allow for deep merge of sparks lists with nested foundries ([#394](https://github.com/Lint-Free-Technology/uix/issues/394)) ([a815887](https://github.com/Lint-Free-Technology/uix/commit/a8158872a1e7a3641a53d2fe215bbeff171f9cab)), closes [#390](https://github.com/Lint-Free-Technology/uix/issues/390)
* UIX may not always apply `uix-view(-yaml)` on strategy dashboards. ([a69721f](https://github.com/Lint-Free-Technology/uix/commit/a69721fa75f22e47a7f22f4f2d130a6fb853272f))

### 📦 Dependency Upgrades

* bump @babel/core from 7.29.7 to 8.0.1 and @babel/preset-env to 8.0.2 managing plugins overrides for rollup babel plugin([#382](https://github.com/Lint-Free-Technology/uix/issues/382)) ([d7e5074](https://github.com/Lint-Free-Technology/uix/commit/d7e50747dd6134814258a6964d81243b47a35ce9))

## [7.5.0](https://github.com/Lint-Free-Technology/uix/compare/v7.4.2...v7.5.0) (2026-06-16)

### ⭐ New Features

* Add integration option to disable hash variable and hash-driven UIX template/Forge refreshes ([#376](https://github.com/Lint-Free-Technology/uix/issues/376)) ([bfa0814](https://github.com/Lint-Free-Technology/uix/commit/bfa0814beb4d72dae9190b67d2c4eac40c21d89c)), closes [#375](https://github.com/Lint-Free-Technology/uix/issues/375)
* Support UIX styling by theme on todo panel. ([1c0b6a8](https://github.com/Lint-Free-Technology/uix/commit/1c0b6a8ecfd59353df3f859f0aa03476d94ba1a3))
* UIX Forge Overlay icon spark  ([#369](https://github.com/Lint-Free-Technology/uix/issues/369)) ([98ad150](https://github.com/Lint-Free-Technology/uix/commit/98ad1508e12e4bd4cc75e3e2a3b05b5f5a4c555e)), closes [#368](https://github.com/Lint-Free-Technology/uix/issues/368)

### 🐞 Bug Fixes

* Correct CSS var `--uix-overlay-icon-border-radius`. Add example for button card noting shadowRoot requirement. ([92dfffb](https://github.com/Lint-Free-Technology/uix/commit/92dfffb672814289a89a2786977c5569dfbfee3b))
* Only force UIX updates when panel state has actually change. Avoids forge refreshes on more-info dialog history state changes ([#373](https://github.com/Lint-Free-Technology/uix/issues/373)) ([5d04b30](https://github.com/Lint-Free-Technology/uix/commit/5d04b30f844763f34f3634914b475b255bddcd9a)), closes [#372](https://github.com/Lint-Free-Technology/uix/issues/372)

## [7.4.2](https://github.com/Lint-Free-Technology/uix/compare/v7.4.1...v7.4.2) (2026-06-05)

### 🐞 Bug Fixes

* Strip internal nested-template readiness marker during forge config assignment ([#364](https://github.com/Lint-Free-Technology/uix/issues/364)) ([5882b6c](https://github.com/Lint-Free-Technology/uix/commit/5882b6c698b1c1ed3438db70a83d7ab1a50fce2d)), closes [#361](https://github.com/Lint-Free-Technology/uix/issues/361)

### ⚙️ Miscellaneous

* Update Home Assistant test version to 2026.6.0. ([67547d1](https://github.com/Lint-Free-Technology/uix/commit/67547d1f8cbc8430a48826aae7a2b432ebc602dc))

## [7.4.1](https://github.com/Lint-Free-Technology/uix/compare/v7.4.0...v7.4.1) (2026-06-01)

### 🐞 Bug Fixes

* **forge:** Forge with templates may show incorrect output if forge or element has `uix:` styling key. ([017ec33](https://github.com/Lint-Free-Technology/uix/commit/017ec33f3f2fb467268721c693cc616c43b33811)), closes [#355](https://github.com/Lint-Free-Technology/uix/issues/355)
* **forge:** Serialize forge template refreshes to prevent transient default-value rendering ([#356](https://github.com/Lint-Free-Technology/uix/issues/356)) ([bf5c259](https://github.com/Lint-Free-Technology/uix/commit/bf5c259aebfb840f5e8451cee13c95fdd057fcf1))

## [7.4.0](https://github.com/Lint-Free-Technology/uix/compare/v7.3.0...v7.4.0) (2026-05-28)

### ⭐ New Features

* Add a UIX Forge `theme` spark for local frontend theme application ([#338](https://github.com/Lint-Free-Technology/uix/issues/338)) ([dceaeb6](https://github.com/Lint-Free-Technology/uix/commit/dceaeb62d574b885ce21608a0ce7990b056bf994))
* Allow to style states-history-charts by theme variable. ([7594b21](https://github.com/Lint-Free-Technology/uix/commit/7594b2173c1cf91c38ae53442339d5b1bff9e2e0)), closes [#342](https://github.com/Lint-Free-Technology/uix/issues/342)
* **styling:** Apply theme override to element with `uix.theme` ([#337](https://github.com/Lint-Free-Technology/uix/issues/337)) ([ab02453](https://github.com/Lint-Free-Technology/uix/commit/ab02453a688343ed47007bbda08675eede905b94))

### 🐞 Bug Fixes

* Refresh forge templates on hash/panel updates. Correct related section mold visibility issues ([#348](https://github.com/Lint-Free-Technology/uix/issues/348)) ([3c9bed6](https://github.com/Lint-Free-Technology/uix/commit/3c9bed65d2d91371cfcea75a8c21bf7a72f59430)), closes [#347](https://github.com/Lint-Free-Technology/uix/issues/347)
* Update hash/panel on all history state changes including pushState and replaceState ([97cd49e](https://github.com/Lint-Free-Technology/uix/commit/97cd49ee48af83119042e7c8acba089956d3bc04)), closes [#349](https://github.com/Lint-Free-Technology/uix/issues/349)

## [7.3.0](https://github.com/Lint-Free-Technology/uix/compare/v7.2.0...v7.3.0) (2026-05-17)

### ⭐ New Features

* Apply UIX to history panel so it can be styled by `uix-history(-yaml)` theme variable ([d1cdb80](https://github.com/Lint-Free-Technology/uix/commit/d1cdb80d5a762581f2ee436ba19dc97b10f94fc7))

### 🐞 Bug Fixes

* `uix_path`/`uix_forge_path` false positives across shadow-root boundaries, particularly on panels not patched by UIX where uix-top-app-bar-fixed is incorrectly reported as a UIX parent ([#332](https://github.com/Lint-Free-Technology/uix/issues/332)) ([793321e](https://github.com/Lint-Free-Technology/uix/commit/793321ed90800400182752bac96cdb94a29540ca))
* Console errors and broken forged element when returning to a view containing a row in entities card with `state_color` set or forged elements via `auto-entities`. ([913e97a](https://github.com/Lint-Free-Technology/uix/commit/913e97a1edc3816cf48d91e39009abdc84f7949f))
* Exclude history and calendar UIX types from suggesting non-theme boilerplate for UIX DOM helpers ([97c33fb](https://github.com/Lint-Free-Technology/uix/commit/97c33fb85f4bc9fb816cf2943d522056f584b30b))

## [7.2.0](https://github.com/Lint-Free-Technology/uix/compare/v7.1.0...v7.2.0) (2026-05-14)

### ⭐ New Features

* **forge:** add cross-context mold types (card_as_row, card_as_badge, row_as_card, row_as_badge, badge_as_card, badge_as_row, badge_as_picture_element) ([#316](https://github.com/Lint-Free-Technology/uix/issues/316)) ([bcda0e5](https://github.com/Lint-Free-Technology/uix/commit/bcda0e51ad6cb2b51ab5af8fe419257f5145bca3)), closes [#314](https://github.com/Lint-Free-Technology/uix/issues/314)

### 🐞 Bug Fixes

* Add inferred JInja statement/flow-control `{% %}` template nesting support in UIX Forge `template_nesting` ([#320](https://github.com/Lint-Free-Technology/uix/issues/320)) ([c27dfbc](https://github.com/Lint-Free-Technology/uix/commit/c27dfbcba37fa0cf997203fdac47aee975548c70))
* Allow Jinja templates in billet-provided `uix` objects ([#319](https://github.com/Lint-Free-Technology/uix/issues/319)) ([1269b27](https://github.com/Lint-Free-Technology/uix/commit/1269b27b2a4df6a9d50241937138b4957b9b59f0)), closes [#318](https://github.com/Lint-Free-Technology/uix/issues/318)

### ⚙️ Miscellaneous

* migrate to ha-testcontainer 2.0.0, remove replicated test infrastructure ([#310](https://github.com/Lint-Free-Technology/uix/issues/310)) ([5759af8](https://github.com/Lint-Free-Technology/uix/commit/5759af846df1f2f095f7b185167d2b2f348d2740))
* Use mold type as UIX styling theme type for UIX Styling ([cddae81](https://github.com/Lint-Free-Technology/uix/commit/cddae81731c3ca447cd4f03e0846108e0e08c8fa))

## [7.1.0](https://github.com/Lint-Free-Technology/uix/compare/v7.0.0...v7.1.0) (2026-05-06)

### ⭐ New Features

* **dialog-styling:** UIX integration option to allow delaying UIX application until after-show ([#304](https://github.com/Lint-Free-Technology/uix/issues/304)) ([0eb9a0b](https://github.com/Lint-Free-Technology/uix/commit/0eb9a0bcb4c48aafe7ba846996b0ad2e5b266a31))

## [7.0.0](https://github.com/Lint-Free-Technology/uix/compare/v6.4.0...v7.0.0) (2026-05-04)

### ⭐ New Features

* `$$` express deep-search selector for shadow-piercing yaml path navigation ([#283](https://github.com/Lint-Free-Technology/uix/issues/283)) ([048c22e](https://github.com/Lint-Free-Technology/uix/commit/048c22eddfe539c359d576ebfa90539fed88e699))
* Add "Wrap in UIX Forge" lightbulb icon button to card, badge, row, and picture-element YAML editors ([#284](https://github.com/Lint-Free-Technology/uix/issues/284)) ([763c6d3](https://github.com/Lint-Free-Technology/uix/commit/763c6d38d786276914d2cc8951dc1e408b4d8187))
* Compress uix.js for client network inflight efficiency ([#296](https://github.com/Lint-Free-Technology/uix/issues/296)) ([9ca77b4](https://github.com/Lint-Free-Technology/uix/commit/9ca77b4f9e13541b32b4cb201839b68473e6e3b5))
* **file-foundries:** Add UIX foundry file check and reload to HA developer tools YAML page ([#279](https://github.com/Lint-Free-Technology/uix/issues/279)) ([cb30b52](https://github.com/Lint-Free-Technology/uix/commit/cb30b52e78f7416d67c5c34607e8e8d169ea78c1))
* **major:** add background spark for UIX Forge allowing for a target of a forged element to have a background from camera_entity, image_entity, video_url, image_url backgrounds as well as straight full shorthand CSS background([#262](https://github.com/Lint-Free-Technology/uix/issues/262)) ([c8294da](https://github.com/Lint-Free-Technology/uix/commit/c8294dabfcb385fe6fd83da874c208fa599925d4)), closes [#236](https://github.com/Lint-Free-Technology/uix/issues/236)
* **major:** Footer mold for UIX Forge. Use a footer in section, masonry and panel dashboards. ([#277](https://github.com/Lint-Free-Technology/uix/issues/277)) ([6992aaf](https://github.com/Lint-Free-Technology/uix/commit/6992aafe22bde1e28be83ce148ea8c6255805cb4))
* **performance:** Dashboard view states update throttle, configurable via integration UI and client-side override API ([#292](https://github.com/Lint-Free-Technology/uix/issues/292)) ([bfbad63](https://github.com/Lint-Free-Technology/uix/commit/bfbad639fca065daa3908e7277b34c2bbad3e34c))
* **styling:** Look for ha-adaptive-popover for dialog adaptive popover styling by theme ([#294](https://github.com/Lint-Free-Technology/uix/issues/294)) ([9f7617c](https://github.com/Lint-Free-Technology/uix/commit/9f7617c73ede4fc28ccb0e10f16cda9e0191ed84))

### ⚙️ Miscellaneous

* Debounce icon and picture-entity updates at 250ms to maintain performance when icons rapidly update ([#287](https://github.com/Lint-Free-Technology/uix/issues/287)) ([5b8e5ba](https://github.com/Lint-Free-Technology/uix/commit/5b8e5ba38393f8702a07b1734ba0d80fd9125348))
* For performance only apply UIX to view when view config will have changed (narrow, lovelace, index). ([a77844e](https://github.com/Lint-Free-Technology/uix/commit/a77844ef2943bcaa89574024f216db1abe81c402))
* show debug on apply_uix if existing element has UIX debug set. Properly outputs debug on subsequent calls to apply_uix for elements where debug is set by theme. ([3679ebb](https://github.com/Lint-Free-Technology/uix/commit/3679ebb6ed9bd7bd91116d73f2cbf25ceb204aea))
* **styling:** Performance optimizations for theme, icon, picture-entity - awaiting animation frame and single code flight path ([#286](https://github.com/Lint-Free-Technology/uix/issues/286)) ([ea3656f](https://github.com/Lint-Free-Technology/uix/commit/ea3656f2d9c72fb92ee459a2dbb56a0f3b4ac8aa))

## [6.4.0](https://github.com/Lint-Free-Technology/uix/compare/v6.3.0...v6.4.0) (2026-04-25)

### ⭐ New Features

* add {}-interpolation between billets (order-independent) ([#253](https://github.com/Lint-Free-Technology/uix/issues/253)) ([d0fbbae](https://github.com/Lint-Free-Technology/uix/commit/d0fbbae4a5ab007db3f2b821cd4d97d3539fd896))
* Add foundry file loading: manage foundries via YAML files in Home Assistant config dir ([#264](https://github.com/Lint-Free-Technology/uix/issues/264)) ([966e5d7](https://github.com/Lint-Free-Technology/uix/commit/966e5d74b6e134a469918961ccecfe210ee51e37)), closes [#263](https://github.com/Lint-Free-Technology/uix/issues/263)

### 🐞 Bug Fixes

* billet interpolation does not descend into objects inside lists ([#254](https://github.com/Lint-Free-Technology/uix/issues/254)) ([2895fd4](https://github.com/Lint-Free-Technology/uix/commit/2895fd4d4773bfea3962312b805005cc120988c5))

### 📔 Documentation

* explain how to use billets inside nested templates (with auto-entities example) ([#267](https://github.com/Lint-Free-Technology/uix/issues/267)) ([16065c9](https://github.com/Lint-Free-Technology/uix/commit/16065c9949a2a5fcd181c3a39fbcb4aac4a749bb))
* **foundries:** fix misleading YAML anchors example and remove confusing note ([#271](https://github.com/Lint-Free-Technology/uix/issues/271)) ([3ec565f](https://github.com/Lint-Free-Technology/uix/commit/3ec565fee39f3b94c2046682b18a820ff9d677c9))

### ⚙️ Miscellaneous

* Differentiate reload (all users) vs. restart needed (admins) notification on UIX version mismatch ([#258](https://github.com/Lint-Free-Technology/uix/issues/258)) ([e4a197a](https://github.com/Lint-Free-Technology/uix/commit/e4a197abee9eb7708e164c6d8b17815ab329b8cc)), closes [#256](https://github.com/Lint-Free-Technology/uix/issues/256)
* Rename config foundries to UI Foundries in config flow and docs ([#266](https://github.com/Lint-Free-Technology/uix/issues/266)) ([2190931](https://github.com/Lint-Free-Technology/uix/commit/2190931e6879278c87d4f81a19718d19e9a6233d))
* Update Foundry config UI: split menus, show loaded lists, rename to Register/Deregister, and add Foundries docs links ([#265](https://github.com/Lint-Free-Technology/uix/issues/265)) ([7a5245d](https://github.com/Lint-Free-Technology/uix/commit/7a5245dca9c77a14e155d787ff57085998badb9c))

## [6.3.0](https://github.com/Lint-Free-Technology/uix/compare/v6.2.0...v6.3.0) (2026-04-18)

### ⭐ New Features

* add `--uix-view-background` shorthand variable and camera zoom/pan/position CSS variables ([#241](https://github.com/Lint-Free-Technology/uix/issues/241)) ([c26f892](https://github.com/Lint-Free-Technology/uix/commit/c26f892b4c6d5400d58ab435a18eb0bae06314e5))
* add `uix-bg-image` class to image view background divs + docs ([#239](https://github.com/Lint-Free-Technology/uix/issues/239)) ([820cd09](https://github.com/Lint-Free-Technology/uix/commit/820cd096b6a1e3d07256212a792b0c1d66e59ec4))
* add billets — named YAML values as UIX Forge and UIX Styling template constants ([#240](https://github.com/Lint-Free-Technology/uix/issues/240)) ([35781bf](https://github.com/Lint-Free-Technology/uix/commit/35781bf01b19dbbf930274e747e623e540b5eea9))
* **foundry:** support `!include` and `!secret` in forge foundry config ([#250](https://github.com/Lint-Free-Technology/uix/issues/250)) ([d53d410](https://github.com/Lint-Free-Technology/uix/commit/d53d41057eb2295e63b511b199104a0c4ddcc393))
* **selectors:** add {.prop} property-match with array index support to `&` path selector ([#242](https://github.com/Lint-Free-Technology/uix/issues/242)) ([01fa601](https://github.com/Lint-Free-Technology/uix/commit/01fa6015c6cea2563cbac585ff7b1403bc6b8f44))
* **styling:** allow for generic image override with --uix-image and fix entity override not updating once styling removed ([#210](https://github.com/Lint-Free-Technology/uix/issues/210)) ([7c64eda](https://github.com/Lint-Free-Technology/uix/commit/7c64edaeedbd75fad80c06f29fc021a073d571e2))
* **styling:** Allow styling of entity markers either directly by config on map card or through theme variable `uix-entity-marker(-yaml)` ([#215](https://github.com/Lint-Free-Technology/uix/issues/215)) ([38c9009](https://github.com/Lint-Free-Technology/uix/commit/38c9009ba90d435f760db43b000077963a9fbe2b))
* **styling:** Support styling of `persistent-notification-item` allowing theme styling of persistent notifications. ([ea825d5](https://github.com/Lint-Free-Technology/uix/commit/ea825d57607a02289168f4c8d2a668206d02a822))
* **styling:** view background camera stream, video, and image via theme UIX CSS variables ([#235](https://github.com/Lint-Free-Technology/uix/issues/235)) ([1990a62](https://github.com/Lint-Free-Technology/uix/commit/1990a6255b12dc44f5a8035987a54a47ea60b75a)), closes [#227](https://github.com/Lint-Free-Technology/uix/issues/227)

### 🐞 Bug Fixes

* `&` host/element selector broken by `$=` operator and `.` in attribute values. Allow spaces in attribute selection. ([#213](https://github.com/Lint-Free-Technology/uix/issues/213)) ([3416921](https://github.com/Lint-Free-Technology/uix/commit/3416921fc4ac697dc2aa40808063d85981ce4557))
* **billets:** billets reference in macro only not included in template ([#249](https://github.com/Lint-Free-Technology/uix/issues/249)) ([ed76352](https://github.com/Lint-Free-Technology/uix/commit/ed76352da302c7420905c4cf60f344da7d8808d8))
* **forge:** nothing rendered and console error when using templates in lists in forge or element config ([adc0a87](https://github.com/Lint-Free-Technology/uix/commit/adc0a875ace9e727667855649334a26e672645aa))
* **forge:** Pass global entity config to forge uix styling ([bf49329](https://github.com/Lint-Free-Technology/uix/commit/bf493290043ad7fcab79544f383787d15390bac4))
* **test-runner:** Correct custom-card-features asset filename and add dist/ fallback for plugins without release assets ([#238](https://github.com/Lint-Free-Technology/uix/issues/238)) ([1159ea6](https://github.com/Lint-Free-Technology/uix/commit/1159ea6c5274d5ddc1fb74a88c4cae49fda1e6b9))

### 📔 Documentation

* **agents:** add Forge, sparks, testing, host filter, section backgrounds, image overrides ([ffb8593](https://github.com/Lint-Free-Technology/uix/commit/ffb859372457905031d4f113fb071d7d89204822))
* **agents:** address review feedback - clarity and formatting improvements ([2a37223](https://github.com/Lint-Free-Technology/uix/commit/2a3722387e02e0cd4d1c2628ea2d3b801f2450af))
* documentation image generation from scenario YAML files ([#218](https://github.com/Lint-Free-Technology/uix/issues/218)) ([411d165](https://github.com/Lint-Free-Technology/uix/commit/411d1655cd8608cb6b6df03405f8ac20bcea2897))
* Update tooltip spark documentation with animations ([f6a9bb8](https://github.com/Lint-Free-Technology/uix/commit/f6a9bb8e3a499949afd48b4f16360acb56d7367e))

### ⚙️ Miscellaneous

* add `add_foundry` / `delete_foundry` scenario interactions + `teardown:` key ([#243](https://github.com/Lint-Free-Technology/uix/issues/243)) ([b4475ae](https://github.com/Lint-Free-Technology/uix/commit/b4475aeb774d9717fc8fea55d0ff73e448539402))
* add click_circle overlay for visualising clicks in doc animations ([#229](https://github.com/Lint-Free-Technology/uix/issues/229)) ([2eb732e](https://github.com/Lint-Free-Technology/uix/commit/2eb732e6563f0c95160a4536633da1dfbb67fd12))
* add cursor overlay support to doc_image and doc_animation ([#226](https://github.com/Lint-Free-Technology/uix/issues/226)) ([e045529](https://github.com/Lint-Free-Technology/uix/commit/e0455295b3ac695ec45fd00f5d1d63a569e359f6))
* Add hover_away interaction type to scenario runner ([#225](https://github.com/Lint-Free-Technology/uix/issues/225)) ([ad93b76](https://github.com/Lint-Free-Technology/uix/commit/ad93b762784fea5c410e21a5b4ff16956a79390a))
* add segments for interleaved interactions and frame capture ([#222](https://github.com/Lint-Free-Technology/uix/issues/222)) ([9e368ef](https://github.com/Lint-Free-Technology/uix/commit/9e368ef3b562fc9a040bbbcd89e7bbd4e24f4d24))
* allow CSS-like multi-value padding for snapshot, doc_image, doc_animation ([#228](https://github.com/Lint-Free-Technology/uix/issues/228)) ([7b085b2](https://github.com/Lint-Free-Technology/uix/commit/7b085b23ee6eecacc251f9992ce70f4d1f070ed0))
* doc_image stepped captures + doc_animation GIF support + doc image audit ([#219](https://github.com/Lint-Free-Technology/uix/issues/219)) ([cd50b2d](https://github.com/Lint-Free-Technology/uix/commit/cd50b2dd41f8801b5d5ae7840741306079979c3e))
* Map entity marker test ([#217](https://github.com/Lint-Free-Technology/uix/issues/217)) ([acdead6](https://github.com/Lint-Free-Technology/uix/commit/acdead646ee0dc02a858e1e534d075f3c3521965)), closes [#216](https://github.com/Lint-Free-Technology/uix/issues/216)
* persistent HA dev server + VS Code task integration ([#230](https://github.com/Lint-Free-Technology/uix/issues/230)) ([4450256](https://github.com/Lint-Free-Technology/uix/commit/44502566fcb53633f9c01cee62417e2644c3b05d))
* **styling:** Correct new entity marker patch to provide variable config rather than entityConfig ([f1fb013](https://github.com/Lint-Free-Technology/uix/commit/f1fb013aaee290256bc0559b16c324469423e13b))
* support cards list in scenario runner alongside card ([#221](https://github.com/Lint-Free-Technology/uix/issues/221)) ([468a53a](https://github.com/Lint-Free-Technology/uix/commit/468a53a95a5c0454861d9f967003a2e9644867b8))
* **tests:** Update tests to use Lint-Free-Technology/ha-testcontainer with visual snapshot comparisons ([a521e48](https://github.com/Lint-Free-Technology/uix/commit/a521e48562e9933f6264c00f005f82180bbe1767))
* wrap card in sections view and support dashboard key in push_scenario ([#220](https://github.com/Lint-Free-Technology/uix/issues/220)) ([a3180e5](https://github.com/Lint-Free-Technology/uix/commit/a3180e56e28e87743fee96b6b5e9d146abc5bba9))

## [6.2.0](https://github.com/Lint-Free-Technology/uix/compare/v6.1.0...v6.2.0) (2026-04-11)

### ⭐ New Features

* **forge:** extend nested template syntax to multiple layers for nested forges (e.g. 3 layers `<<<`/`>>>`)  ([#202](https://github.com/Lint-Free-Technology/uix/issues/202)) ([b1a6b62](https://github.com/Lint-Free-Technology/uix/commit/b1a6b629abfd6cdffd4652a8b11700d8d477b208)), closes [#201](https://github.com/Lint-Free-Technology/uix/issues/201)
* **forge:** Support UIX Forge to be card for auto-entities allowing and passing entities to forged element ([daf383a](https://github.com/Lint-Free-Technology/uix/commit/daf383a8dda6e71b9f7eaaf81051e077d18466dd))
* **lock-spark:** Add --uix-lock-icon-background, --uix-lock-icon-border-radius, --uix-lock-icon-padding, and state-variant icon background CSS variables ([#194](https://github.com/Lint-Free-Technology/uix/issues/194)) ([3e2770c](https://github.com/Lint-Free-Technology/uix/commit/3e2770c9e2e9d8fcd84288e3c63cbae45bb83e7a))
* **lock-spark:** add color CSS vars for lock icon and set defaults when target is ha-tile-icon ([#197](https://github.com/Lint-Free-Technology/uix/issues/197)) ([701227b](https://github.com/Lint-Free-Technology/uix/commit/701227b7ca012c42e157aa620d67dd6e051fdd81))
* **lock-spark:** Allow for target to be ha-tile-icon to lock tile icon only ([26dfa91](https://github.com/Lint-Free-Technology/uix/commit/26dfa91e298914dd4ed3003619d7896ddf75612d))
* **lock:** add CSS variable cursor control to lock spark overlay ([#204](https://github.com/Lint-Free-Technology/uix/issues/204)) ([0325409](https://github.com/Lint-Free-Technology/uix/commit/0325409d200626b8dd785692ce127c9100ec607b)), closes [#192](https://github.com/Lint-Free-Technology/uix/issues/192)
* **map-spark:** Add fit_map option to map spark allowing to work around maps in custom cards which may initially hide map (e.g. auto-entities). ([#195](https://github.com/Lint-Free-Technology/uix/issues/195)) ([1a47b91](https://github.com/Lint-Free-Technology/uix/commit/1a47b9145216571ce00d66e423d61cf4c3fa1843))
* **map-spark:** Add map spark tour mode ([#196](https://github.com/Lint-Free-Technology/uix/issues/196)) ([5a6db26](https://github.com/Lint-Free-Technology/uix/commit/5a6db26d21c7c0f881486d6b9ff5f60af6fe6a41))

### 🐞 Bug Fixes

* **beta:** Don't delete entities from config in case locked ([8edf7bd](https://github.com/Lint-Free-Technology/uix/commit/8edf7bdc80dddfdad49b4bdec539918d53b109cc))
* **beta:** Regression with state_color causing configuration error ([598e2cb](https://github.com/Lint-Free-Technology/uix/commit/598e2cbe651ae5f656c862971a09544b33121ff1))
* **forge:** Fix template nesting not resolving correctly ([db6ebce](https://github.com/Lint-Free-Technology/uix/commit/db6ebce26cb01df42b5c9fdb18f523e0d95cd489))

### ⚙️ Miscellaneous

* Add entity card support for auto-entities ([9087bfc](https://github.com/Lint-Free-Technology/uix/commit/9087bfc46a65e1c2c8104419cff66709403c3980))
* **lock-spark:** Adjust top/left lock icon when target is ha-tile-icon ([f9d377f](https://github.com/Lint-Free-Technology/uix/commit/f9d377f86729708c280c9e843ad05b692129e7fc))

## [6.1.0](https://github.com/Lint-Free-Technology/uix/compare/v6.0.0...v6.1.0) (2026-04-08)

### ⭐ New Features

* **forge:** Add Button Spark ([#168](https://github.com/Lint-Free-Technology/uix/issues/168)) ([51cfbe8](https://github.com/Lint-Free-Technology/uix/commit/51cfbe8110eedf6046bebc2259ab29702a8dfd8a)), closes [#166](https://github.com/Lint-Free-Technology/uix/issues/166)
* **forge:** add lock spark for UIX Forge ([#178](https://github.com/Lint-Free-Technology/uix/issues/178)) ([24e2860](https://github.com/Lint-Free-Technology/uix/commit/24e28607505b1703e28ad9bc9128619010c483e9))
* **forge:** add Search Spark for shadow DOM element mutation ([#136](https://github.com/Lint-Free-Technology/uix/issues/136)) ([3343b31](https://github.com/Lint-Free-Technology/uix/commit/3343b316b6dc13a56ded00838366f0cad20d4540))
* **forge:** map spark with memory mode ([#177](https://github.com/Lint-Free-Technology/uix/issues/177)) ([9b60a99](https://github.com/Lint-Free-Technology/uix/commit/9b60a997b98380d11a268482d8bc6722b3cdeb7c)), closes [#176](https://github.com/Lint-Free-Technology/uix/issues/176)
* **forge:** merge forge.macros into uix.macros for forge and forgedElement ([#187](https://github.com/Lint-Free-Technology/uix/issues/187)) ([82c3d0e](https://github.com/Lint-Free-Technology/uix/commit/82c3d0ed62a410104a7b0c7ac08fafa52162ca93))
* **forge:** Resolve `!secret` references in foundry configs ([#184](https://github.com/Lint-Free-Technology/uix/issues/184)) ([13cde4f](https://github.com/Lint-Free-Technology/uix/commit/13cde4f67a91bae718cc613d406e178c825d4998))
* **forge:** support multiple sparks of the same type ([#152](https://github.com/Lint-Free-Technology/uix/issues/152)) ([b0b2b37](https://github.com/Lint-Free-Technology/uix/commit/b0b2b37fa8e443067ea90fe63c27ca4a2845d47a))
* **lock-spark:** add `code_dialog` config to lock spark for customising the PIN/passphrase dialog title, submit_text and cancel_text ([#185](https://github.com/Lint-Free-Technology/uix/issues/185)) ([53c4f90](https://github.com/Lint-Free-Technology/uix/commit/53c4f90c3cb3ffdc1cf367137419d47cb25ef612))
* **lock-spark:** Support confirmation object with title and text in lock spark ([#182](https://github.com/Lint-Free-Technology/uix/issues/182)) ([40b2551](https://github.com/Lint-Free-Technology/uix/commit/40b2551adf87732f5a1181e082b1bd1020974526))
* **macros:** transitively resolve macro dependencies in buildMacros ([#175](https://github.com/Lint-Free-Technology/uix/issues/175)) ([82c55f8](https://github.com/Lint-Free-Technology/uix/commit/82c55f888d5dba71f02e67d70923dd291cece40e))
* **sections:** Support styling section backgrounds by UIX config. ([#149](https://github.com/Lint-Free-Technology/uix/issues/149)) ([b6b1946](https://github.com/Lint-Free-Technology/uix/commit/b6b19464239f86da453a8b3d5a8b6050954deb20))

### 🐞 Bug Fixes

* **event-spark:** event spark events causing all forged elements with event spark to refresh even if forge_id does not match ([54a3202](https://github.com/Lint-Free-Technology/uix/commit/54a3202cb93113715871bc822abc6c58f94bdac5))
* **forge sparks:** centralize spark lifecycle guards - stops growing prepend/append in search spark ([#172](https://github.com/Lint-Free-Technology/uix/issues/172)) ([1fc2446](https://github.com/Lint-Free-Technology/uix/commit/1fc244692ac13bde38d3fbbe42a3f214676d7ee8))
* **forge sparks:** Template updates not applying to sparks after first update ([1704219](https://github.com/Lint-Free-Technology/uix/commit/1704219cbbc5802d3f97c1702e1f0e657f1d42c0))
* **forge:** Add `delayed_hass` forge config option to suppress console errors on load for some custom cards. e.g. apexcharts_card ([8592c12](https://github.com/Lint-Free-Technology/uix/commit/8592c126d517f6db11426547bf9521d0bab5534d))
* **forge:** allow and pass state_color through to forged element in row mold ([#180](https://github.com/Lint-Free-Technology/uix/issues/180)) ([e78a87e](https://github.com/Lint-Free-Technology/uix/commit/e78a87e79e92fc88a00ad73b4b7d5267de76b19e))
* **forge:** Console errors when editing UIX Forge in UI editor ([afebb46](https://github.com/Lint-Free-Technology/uix/commit/afebb467a24290694ddeb1ae58c706becd80c9f7))
* **forge:** Templates in uix in element config cause element not to show due to unfulfilled ready promise ([12e4ac7](https://github.com/Lint-Free-Technology/uix/commit/12e4ac737deb6c6ca212a7c0962c4ea5e2be749e))
* **lock-spark:** prevent overlay continuous updates ([#183](https://github.com/Lint-Free-Technology/uix/issues/183)) ([9073462](https://github.com/Lint-Free-Technology/uix/commit/907346251c5daf36bb610bc5ef9ff924db63448f))
* **lock-spark:** Set lock spark display to block by default and allow override by CSS ([3879182](https://github.com/Lint-Free-Technology/uix/commit/3879182a924924f9aca8d6c8705eff828903f375))
* **lock-spark:** Update icon display to inline-block so --uix-icon-position applies ([37e3175](https://github.com/Lint-Free-Technology/uix/commit/37e3175e6c64d698ebe5dc7e4bc6ed39c967dbf2))
* **toast:** Refactor for timing reliability ([1eb319f](https://github.com/Lint-Free-Technology/uix/commit/1eb319fd310050ae914a7fcae63d6222875b507e))
* **tooltip-spark:** fix flickering of tooltip spark from constant recreation ([#174](https://github.com/Lint-Free-Technology/uix/issues/174)) ([f508bc7](https://github.com/Lint-Free-Technology/uix/commit/f508bc7e73a65ac9bdf2e138ba494cb0f34f20a8))

### 📦 Dependency Upgrades

* bump @babel/preset-env from 7.23.6 to 7.29.2 ([#145](https://github.com/Lint-Free-Technology/uix/issues/145)) ([ecd93ae](https://github.com/Lint-Free-Technology/uix/commit/ecd93ae9fdde7e31becfecdeb6be1f9f5a7b4432))
* bump @rollup/plugin-babel from 6.0.4 to 7.0.0 ([#146](https://github.com/Lint-Free-Technology/uix/issues/146)) ([c8d690e](https://github.com/Lint-Free-Technology/uix/commit/c8d690e5abc7d9cc02b28ddc43e2b7e1a90873a4))
* bump lit from 3.1.0 to 3.3.2 ([#161](https://github.com/Lint-Free-Technology/uix/issues/161)) ([97816ce](https://github.com/Lint-Free-Technology/uix/commit/97816ce60844dd3541c5a4642c0c0289c5045dc7))
* bump rollup from 2.80.0 to 4.60.1 ([#143](https://github.com/Lint-Free-Technology/uix/issues/143)) ([2400e1b](https://github.com/Lint-Free-Technology/uix/commit/2400e1b5d15f0adbd766cab452148ffe125b6961))
* bump rollup-plugin-typescript2 from 0.36.0 to 0.37.0 ([#144](https://github.com/Lint-Free-Technology/uix/issues/144)) ([7475217](https://github.com/Lint-Free-Technology/uix/commit/7475217403aef8132f89e1961fcae4e18126b85f))

### ⚙️ Miscellaneous

* **button-spark:** add `icon` config for icon-only buttons ([#169](https://github.com/Lint-Free-Technology/uix/issues/169)) ([32b52b7](https://github.com/Lint-Free-Technology/uix/commit/32b52b7ef414915a1d1a6f9aebd07c7cf68c85ef))
* **button-spark:** Adjust icon button height and alignment ([70a22b5](https://github.com/Lint-Free-Technology/uix/commit/70a22b539cebf8870fb6ecc57819ce2e82addcc1))
* **button-spark:** style matching Home Assistant icon button when using with icon only ([#170](https://github.com/Lint-Free-Technology/uix/issues/170)) ([ae5fdf0](https://github.com/Lint-Free-Technology/uix/commit/ae5fdf0e72770960d42397f9bb38ebadf2c3e2e1))
* **forge:** Provide action-handler scaffold for for UIX Forge Sparks ([#167](https://github.com/Lint-Free-Technology/uix/issues/167)) ([2d8144e](https://github.com/Lint-Free-Technology/uix/commit/2d8144e077b829f82f22d96a40ad5ef7f056f54d))
* TypeScript 6 build errors and VSCode linting alignment ([#165](https://github.com/Lint-Free-Technology/uix/issues/165)) ([c68b011](https://github.com/Lint-Free-Technology/uix/commit/c68b0110119f126ffd2430a8702b8d1cb594ba4f))

## [6.0.0](https://github.com/Lint-Free-Technology/uix/compare/v5.3.1...v6.0.0) (2026-04-01)

### ⚠ BREAKING CHANGES

* **toast:** Use uix-toast theme variable for toast notifications. uix-dialog will no longer apply to toast notifications.

### ⭐ New Features

* **major:** UIX Forge - see https://uix.lf.technology/forge ([#110](https://github.com/Lint-Free-Technology/uix/issues/110)) ([ec48f88](https://github.com/Lint-Free-Technology/uix/commit/ec48f88e62f65dacea496af90b3eafa74968b3f1)), closes [#98](https://github.com/Lint-Free-Technology/uix/issues/98)
* Add `&` host/element filter to yaml selector path syntax ([#121](https://github.com/Lint-Free-Technology/uix/issues/121)) ([4dfb987](https://github.com/Lint-Free-Technology/uix/commit/4dfb9875c8598a628566d21840198b822429b73d))
* Apply UIX to calendar panel ([833569c](https://github.com/Lint-Free-Technology/uix/commit/833569ca0e4069d92220ce46b32bf8bfdb811160))
* Apply UIX to calendar panel ([#129](https://github.com/Lint-Free-Technology/uix/issues/129)) ([7adc4c6](https://github.com/Lint-Free-Technology/uix/commit/7adc4c637a2a0bcea321aca48ed462bdde04b440))
* override entity images via --uix-image-for-<entityId> CSS variable ([#114](https://github.com/Lint-Free-Technology/uix/issues/114)) ([c70357f](https://github.com/Lint-Free-Technology/uix/commit/c70357fc2028f1070144aeb60e0f7bf85c7fa255))
* Section background color and opacity support ([#125](https://github.com/Lint-Free-Technology/uix/issues/125)) ([3f2b8f9](https://github.com/Lint-Free-Technology/uix/commit/3f2b8f91da944ea2867175fd8c89f5ee8fcf8672))

### 🐞 Bug Fixes

* **dialog:** Apply dialog patch on updated rather than showDialog to suit Home Assistant 2026.4.0 ([d055e07](https://github.com/Lint-Free-Technology/uix/commit/d055e0752ec18f7addce1c364c2b57e12143de56)), closes [#87](https://github.com/Lint-Free-Technology/uix/issues/87)
* **toast:** Correctly fix toast notifications reusing template variables ([#135](https://github.com/Lint-Free-Technology/uix/issues/135)) ([6b0d566](https://github.com/Lint-Free-Technology/uix/commit/6b0d5665114bfa45f646d89f5b67256b265bdf9f)), closes [#127](https://github.com/Lint-Free-Technology/uix/issues/127)

### ⚙️ Miscellaneous

* **console_debug:** Update uix_forge_pah to include class specificity when required ([#115](https://github.com/Lint-Free-Technology/uix/issues/115)) ([ab5ea6f](https://github.com/Lint-Free-Technology/uix/commit/ab5ea6ff712e47531ff8d3637c485a077bdc8f62))

## [5.3.1](https://github.com/Lint-Free-Technology/uix/compare/v5.3.0...v5.3.1) (2026-03-15)

### 🐞 Bug Fixes

* Console error with uix_path(). Don't allow selection of shadow root. ([#83](https://github.com/Lint-Free-Technology/uix/issues/83)) ([d61692d](https://github.com/Lint-Free-Technology/uix/commit/d61692d4ad473ae2311ba5a32530c5fbb117cb54))
* **console_debug:** correct shadow-root path key for dialog/theme elements and add theme boilerplate ([#94](https://github.com/Lint-Free-Technology/uix/issues/94)) ([85bcea8](https://github.com/Lint-Free-Technology/uix/commit/85bcea816daf35b05f1b2da9a73b1b78cc6ea82a)), closes [#86](https://github.com/Lint-Free-Technology/uix/issues/86) [#86](https://github.com/Lint-Free-Technology/uix/issues/86)

### 📔 Documentation

* Change card-mod to UIX in cards doc ([#92](https://github.com/Lint-Free-Technology/uix/issues/92)) ([48bc6d1](https://github.com/Lint-Free-Technology/uix/commit/48bc6d13da664bf2c9ee652527640c9c10a8f7dd))
* Expand theme documentation section ([#93](https://github.com/Lint-Free-Technology/uix/issues/93)) ([73a463b](https://github.com/Lint-Free-Technology/uix/commit/73a463ba617544be90e436979d002e70fbd5088f))

### 📦 Dependency Upgrades

* bump tar and npm ([#85](https://github.com/Lint-Free-Technology/uix/issues/85)) ([be38cbc](https://github.com/Lint-Free-Technology/uix/commit/be38cbc53956fa8b56aa8c1d90609960ab4c6638))

## [5.3.0](https://github.com/Lint-Free-Technology/uix/compare/v5.2.2...v5.3.0) (2026-03-09)

### ⭐ New Features

* Add UIX parent variables to uix_tree() and uix_path(). ([6e027b3](https://github.com/Lint-Free-Technology/uix/commit/6e027b3e125a1a7520b752fabd5bc7e8091601ce))
* DOM inspecton helpers uix_tree() and uix_path() ([#78](https://github.com/Lint-Free-Technology/uix/issues/78)) ([51cabd5](https://github.com/Lint-Free-Technology/uix/commit/51cabd5fb5665131b6dd272b6269a03579d02a84))
* Macro support for UIX templates - See https://uix.lf.technology/using/templates/[#macros](https://github.com/Lint-Free-Technology/uix/issues/macros) ([#75](https://github.com/Lint-Free-Technology/uix/issues/75)) ([3f6dd64](https://github.com/Lint-Free-Technology/uix/commit/3f6dd64a504d2760503b315803c9f08f02c6e034))

### 🐞 Bug Fixes

* Applying Uix to section strategy causes it to not show and console errors ([899163e](https://github.com/Lint-Free-Technology/uix/commit/899163ee2dd07b6b060d46f91e148a54013ac60b))

### 📔 Documentation

* Update documentation for release ([1d7cf79](https://github.com/Lint-Free-Technology/uix/commit/1d7cf7900c5c1eb148e9b7917b047e2f6d554a20))

## [5.2.1](https://github.com/Lint-Free-Technology/uix/compare/v5.2.0...v5.2.1) (2026-03-03)

### 🐞 Bug Fixes

* hassfest updates ahead of submission to HACS ([065dc1c](https://github.com/Lint-Free-Technology/uix/commit/065dc1cbe07297bdd73aa0023722ad44be317dee))

### ⚙️ Miscellaneous

* Uix naming in integration code and dev container ([f6a782a](https://github.com/Lint-Free-Technology/uix/commit/f6a782af9c4e023cebc42f2150082f1bb0d39242))

## [5.2.0](https://github.com/Lint-Free-Technology/uix/compare/v5.1.0...v5.2.0) (2026-02-27)

### ⭐ New Features

* Add dashboard resources and extra_module_url to UIX diagnostics download ([7219214](https://github.com/Lint-Free-Technology/uix/commit/72192140504caa065f1be64832ddba9ea7f66282)), closes [#57](https://github.com/Lint-Free-Technology/uix/issues/57)

### 🐞 Bug Fixes

* Apply dialog patch to edit card dialog. Previously this was missed by dialog patch as edit card has its own patch for brush icon. ([ae1d818](https://github.com/Lint-Free-Technology/uix/commit/ae1d8184b58a7cc43af2c849440004f829416106))

### ⚙️ Miscellaneous

* Add local brand icons which can be used by Home Assistant 2026.3+ ([4bf0662](https://github.com/Lint-Free-Technology/uix/commit/4bf0662a00e17f8d036f432929e7d5eaaafeaaeb))

## [5.1.0](https://github.com/Lint-Free-Technology/uix/compare/v5.0.0...v5.1.0) (2026-02-24)

### ⭐ New Features

* Support for notifications via Home Assistant notification manager and ha-toast element. ([e8e2297](https://github.com/Lint-Free-Technology/uix/commit/e8e2297eca9be3aa077338b737f0797b3f4859f3)), closes [#51](https://github.com/Lint-Free-Technology/uix/issues/51)

### 🐞 Bug Fixes

* Fix --uix-icon not working ha-icon-button (and any other element that does not use ha-icon in slot) ([34a71d2](https://github.com/Lint-Free-Technology/uix/commit/34a71d281c67ae16c1ff4e21445f3e684c00b9da)), closes [#54](https://github.com/Lint-Free-Technology/uix/issues/54)
* Use custom card's original config (hui-card) if uix and card_mod are empty in custom card's altered config. ([7ce8830](https://github.com/Lint-Free-Technology/uix/commit/7ce883093c566cf9eff7833435b8549db80ec3d5)), closes [#56](https://github.com/Lint-Free-Technology/uix/issues/56)

## [5.0.0](https://github.com/Lint-Free-Technology/uix/compare/v4.2.1...v5.0.0) (2026-02-22)

### ⭐ New Features

* Apply UIX to ha-panel-profile ([6bd54f7](https://github.com/Lint-Free-Technology/uix/commit/6bd54f7b9c9d479f8bf845eed9b670a7fcaa9b5e))

### 🐞 Bug Fixes

* Add ha-adaptive-dialog to dialogs where UIX is added. Remove old ha-wa-dialog and ha-md-dialog. ([6f186a8](https://github.com/Lint-Free-Technology/uix/commit/6f186a8c792e274f26bf505b11ffc70365a265b3))
* Fix reading uix-theme. ([b645d17](https://github.com/Lint-Free-Technology/uix/commit/b645d17d12e95b43f57f133e911e094e38e7d81f))
* Restore babel in rollup ([d216a38](https://github.com/Lint-Free-Technology/uix/commit/d216a3895f90c090d8ff6191d197d5259f31d79b))
* Restore ha-wa-dialog and ha-md-dialog until 2026.3 ([beff1bd](https://github.com/Lint-Free-Technology/uix/commit/beff1bd3e6c1d260b50d40300099d87be93e99f7))
* UIX not showing in UI editor when editing card ([1520a9c](https://github.com/Lint-Free-Technology/uix/commit/1520a9cb72e0d4f2752b4e41cb95a71f37507768))
* Update theme load warning to UIX ([17ac8d8](https://github.com/Lint-Free-Technology/uix/commit/17ac8d883df7342ba488cd35e1edbdc8ec085578))

### ⚙️ Miscellaneous

* Adjust Toast reload warning to be more friendly. ([a0cbe37](https://github.com/Lint-Free-Technology/uix/commit/a0cbe3799dd448f71d4980d30989d26a8d202e9f))
* Migrate to UIX ([b6c0672](https://github.com/Lint-Free-Technology/uix/commit/b6c0672f4a134429c32d6484e059506cbda9ab14))
