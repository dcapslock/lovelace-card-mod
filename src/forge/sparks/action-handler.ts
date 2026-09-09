/* eslint-disable max-classes-per-file */
import { noChange } from "lit";
import type { AttributePart, DirectiveParameters } from "lit/directive.js";
import { directive, Directive } from "lit/directive.js";
import type { ActionHandlerOptions } from "../../helpers/data/lovelace/action_handler";
import { actionHandlerBind } from "../../helpers/dom/action-handler";

export { actionHandlerBind };

export const actionHandler = directive(
  class extends Directive {
    update(part: AttributePart, [options]: DirectiveParameters<this>) {
      actionHandlerBind(part.element as HTMLElement, options);
      return noChange;
    }

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    render(_options?: ActionHandlerOptions) {}
  }
);
