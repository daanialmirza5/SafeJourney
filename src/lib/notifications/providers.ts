/**
 * Notification provider abstractions (spec section 30). Each provider
 * exposes the same `send` contract; a demo adapter (default, no
 * credentials required) logs the send server-side instead of dispatching
 * a real message. Setting EMAIL_PROVIDER/WHATSAPP_PROVIDER to a real
 * provider name and supplying an API key would select a real adapter here
 * -- no call sites elsewhere need to change.
 */

export interface NotificationProvider {
  name: string;
  send(to: string, subject: string, body: string): Promise<{ delivered: boolean; simulated: boolean }>;
}

function demoProvider(channel: string): NotificationProvider {
  return {
    name: `demo-${channel}`,
    async send(to, subject, body) {
      // eslint-disable-next-line no-console
      console.log(`[demo-${channel}] -> ${to}: ${subject} :: ${body}`);
      return { delivered: true, simulated: true };
    },
  };
}

export function getEmailProvider(): NotificationProvider {
  const configured = process.env.EMAIL_PROVIDER ?? "demo";
  if (configured === "demo" || !process.env.EMAIL_API_KEY) return demoProvider("email");
  // A real provider adapter would be selected here based on `configured`.
  return demoProvider("email");
}

export function getWhatsAppProvider(): NotificationProvider {
  const configured = process.env.WHATSAPP_PROVIDER ?? "demo";
  if (configured === "demo" || !process.env.WHATSAPP_API_KEY) return demoProvider("whatsapp");
  return demoProvider("whatsapp");
}
