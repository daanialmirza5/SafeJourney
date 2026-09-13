import { db } from "@/lib/db";
import { getEmailProvider, getWhatsAppProvider } from "@/lib/notifications/providers";
import { renderNotificationTemplate } from "@/lib/notifications/templates";
import type { NotificationCategory } from "@/lib/types/enums";

export interface NotifyInput {
  userId: string;
  category: NotificationCategory;
  title: string;
  body: string;
  referralId?: string;
}

/** Creates the in-app notification record (always) and best-effort fans
 * out through the demo email/WhatsApp provider adapters (spec section 30).
 * Provider failures never block the in-app notification from being saved. */
export async function notify(input: NotifyInput) {
  const notification = await db.notification.create({
    data: {
      userId: input.userId,
      category: input.category,
      title: input.title,
      body: input.body,
      referralId: input.referralId,
    },
  });

  try {
    const user = await db.user.findUnique({ where: { id: input.userId } });
    if (user?.email) await getEmailProvider().send(user.email, input.title, input.body);
    if (user?.phone) await getWhatsAppProvider().send(user.phone, input.title, input.body);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[notify] provider dispatch failed", err);
  }

  return notification;
}

export async function notifyMany(inputs: NotifyInput[]) {
  return Promise.all(inputs.map((input) => notify(input)));
}

export interface NotifyFromTemplateInput {
  userId: string;
  templateKey: string;
  vars: Record<string, string>;
  referralId?: string;
}

/** Sends a notification whose title/body come from an admin-editable
 * template (spec section 56) rather than a literal string at the call
 * site -- see src/lib/notifications/templates.ts for the default copy and
 * placeholder contract per key. */
export async function notifyFromTemplate(input: NotifyFromTemplateInput) {
  const { title, body, category } = await renderNotificationTemplate(input.templateKey, input.vars);
  return notify({ userId: input.userId, category, title, body, referralId: input.referralId });
}

export async function notifyManyFromTemplate(inputs: NotifyFromTemplateInput[]) {
  return Promise.all(inputs.map((input) => notifyFromTemplate(input)));
}
