import type { UIMessage } from "ai";

/** Only omit the SDK's empty text assistant left by stop-before-first-delta.
 * Invalid user input and unsupported parts must still reach server validation.
 */
export function prepareChatRequest({
  messages,
  body,
  id,
  trigger,
  messageId,
}: {
  messages: UIMessage[];
  body: object | undefined;
  id: string;
  trigger: string;
  messageId?: string;
}) {
  return {
    body: {
      ...body,
      id,
      trigger,
      messageId,
      messages: messages.filter(
        (message) =>
          !(
            message.role === "assistant" &&
            message.parts.length > 0 &&
            message.parts.every(
              (part) =>
                (part.type === "text" && part.text.length === 0) ||
                (part.type === "step-start" && Object.keys(part).length === 1),
            )
          ),
      ),
    },
  };
}
