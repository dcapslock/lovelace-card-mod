import "https://unpkg.com/wired-card@2.1.0/lib/wired-card.js?module";
import {
  LitElement,
  html,
  css,
} from "https://unpkg.com/lit-element@2.4.0/lit-element.js?module";

class TestCustomPanel extends LitElement {
  static get properties() {
    return {
      _hass: { type: Object },
      narrow: { type: Boolean },
      route: { type: Object },
      panel: { type: Object },
    };
  }

  // Intercept the hass assignment from Home Assistant
  set hass(val) {
    const oldVal = this._hass;
    this._hass = val;
    this.requestUpdate("_hass", oldVal); // Explicitly force Lit to re-render the template
  }

  get hass() {
    return this._hass;
  }

  render() {
    return html`
      <wired-card elevation="2">
        <p>Test boolean is: ${this.hass.states['input_boolean.test_boolean'].state}</p>
        <p>The screen is${this.narrow ? "" : " not"} narrow.</p>
        Configured panel config
        <pre>${JSON.stringify(this.panel.config, undefined, 2)}</pre>
        Current route
        <pre>${JSON.stringify(this.route, undefined, 2)}</pre>
      </wired-card>
    `;
  }

  static get styles() {
    return css`
      :host {
        background-color: #fafafa;
        padding: 16px;
        display: block;
      }
      wired-card {
        background-color: white;
        padding: 16px;
        display: block;
        font-size: 18px;
        max-width: 600px;
        margin: 0 auto;
      }
    `;
  }
}
customElements.define("test-custom-panel", TestCustomPanel);