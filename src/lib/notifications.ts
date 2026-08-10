import crypto from "crypto";
import { logger } from "./logger";

/**
 * QB Notify v2 client (Go service, HMAC-signed /v1 API).
 * Each `type` below must exist as a "Tipo de notificación" in the QB Notify SPA
 * for this Application — its name binds channel + template + destination.
 * Config (via Dokploy env): QB_NOTIFY_URL (no /v1 suffix), QB_NOTIFY_KEY_ID, QB_NOTIFY_SECRET.
 */
type NotificationType =
  | "email-verification"
  | "welcome-register"
  | "forgot-password"
  | "password-reset-success"
  | "invitation";

type NotificationPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";

type NotificationRequest = {
  type: NotificationType;
  email: string;
  name?: string | null;
  userId?: string;
  payload: Record<string, unknown>;
  priority?: NotificationPriority;
  idempotencyKey?: string;
};

type BaseNotificationData = {
  email: string;
  userId?: string;
  userName?: string | null;
  appName: string;
  supportEmail?: string;
  logoUrl?: string;
  primaryColor?: string;
};

type ExpiringNotificationData = BaseNotificationData & {
  expirationSeconds: number;
};

// Base URL of the QB Notify v2 deployment (NO /v1 suffix — the path is signed).
const notifyBaseUrl = (process.env.QB_NOTIFY_URL ?? "http://localhost:8080").replace(/\/$/, "");
const notifyKeyId = process.env.QB_NOTIFY_KEY_ID;
const notifySecret = process.env.QB_NOTIFY_SECRET;
const defaultPrimaryColor = process.env.NOTIFY_PRIMARY_COLOR ?? "#4F46E5";

// Computed per send: a module-level constant goes stale on a process that stays
// up across New Year, silently stamping last year's copyright on every email.
const currentYear = () => String(new Date().getFullYear());

/** Templates greet the user by first name (`{{firstName}}`), not the full name. */
const firstNameOf = (userName?: string | null) =>
  (userName ?? "").trim().split(/\s+/)[0] || userName || "";

const cleanPayload = (payload: Record<string, unknown>) =>
  Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined && value !== null)
  );

/**
 * `expirationTime` is rendered verbatim inside the email template, so it must
 * match the template's language. Templates are English-only today; `locale` is
 * here so Spanish templates can be added without touching call sites again.
 */
export type NotificationLocale = "en" | "es";

const EXPIRATION_UNITS: Record<NotificationLocale, { minute: string; minutes: string; hour: string; hours: string; day: string; days: string }> = {
  en: { minute: "minute", minutes: "minutes", hour: "hour", hours: "hours", day: "day", days: "days" },
  es: { minute: "minuto", minutes: "minutos", hour: "hora", hours: "horas", day: "día", days: "días" },
};

const humanizeExpiration = (seconds: number, locale: NotificationLocale = "en") => {
  const u = EXPIRATION_UNITS[locale];
  if (Number.isNaN(seconds) || seconds <= 0) return `60 ${u.minutes}`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} ${minutes === 1 ? u.minute : u.minutes}`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? u.hour : u.hours}`;
  const days = Math.round(hours / 24);
  return `${days} ${days === 1 ? u.day : u.days}`;
};

/** Same wording rules, for callers that only know a day count (e.g. invitations). */
export const humanizeExpirationDays = (days: number, locale: NotificationLocale = "en") =>
  humanizeExpiration(days * 24 * 60 * 60, locale);

/** HMAC-SHA256 headers: sign METHOD\nPATH\nQUERY\nSHA256(BODY)\nTIMESTAMP. */
const qbnHeaders = (method: string, path: string, body: string) => {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const bodyHash = crypto.createHash("sha256").update(body, "utf8").digest("hex");
  const stringToSign = [method.toUpperCase(), path, "", bodyHash, timestamp].join("\n");
  const signature = crypto.createHmac("sha256", notifySecret!).update(stringToSign).digest("hex");
  return {
    "X-QBN-Key-Id": notifyKeyId!,
    "X-QBN-Timestamp": timestamp,
    "X-QBN-Signature": signature,
  };
};

const sendNotification = async ({
  type,
  email,
  name,
  userId,
  payload,
  priority = "NORMAL",
  idempotencyKey,
}: NotificationRequest) => {
  if (!notifyKeyId || !notifySecret) {
    logger.warn("Notification skipped: missing QB_NOTIFY_KEY_ID/QB_NOTIFY_SECRET", { type });
    return;
  }

  const body = JSON.stringify({
    type,
    recipient: { email, ...(name ? { name } : {}) },
    ...(userId && { recipientUserId: userId }),
    priority,
    payload,
    ...(idempotencyKey && { idempotencyKey }),
  });

  const path = "/v1/notifications";
  try {
    const response = await fetch(`${notifyBaseUrl}${path}`, {
      method: "POST",
      cache: "no-store",
      headers: { "Content-Type": "application/json", ...qbnHeaders("POST", path, body) },
      body,
    });
    if (!response.ok) {
      logger.error("QB Notify responded with an error", {
        type,
        status: response.status,
        error: await response.text().catch(() => ""),
      });
    }
  } catch (error) {
    logger.error("Failed to send notification", {
      type,
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

export const notifyEmailVerification = async (
  data: ExpiringNotificationData & { verificationUrl: string }
) => {
  const { email, userId, userName, verificationUrl, expirationSeconds, appName, supportEmail, logoUrl, primaryColor } = data;
  await sendNotification({
    type: "email-verification",
    email,
    name: userName,
    userId,
    priority: "HIGH",
    payload: cleanPayload({
      email, userName, firstName: firstNameOf(userName), appName, verificationUrl,
      expirationTime: humanizeExpiration(expirationSeconds),
      logoUrl, primaryColor: primaryColor ?? defaultPrimaryColor, supportEmail, year: currentYear(),
    }),
  });
};

export const notifyWelcome = async (
  data: BaseNotificationData & { actionUrl?: string; actionLabel?: string; features?: string[] }
) => {
  const { email, userId, userName, appName, actionUrl } = data;
  // The `welcome_email` template's variables: firstName, appName, actionUrl, year.
  // (QB Notify validates the payload against the template's required_variables
  // JSON Schema. It does NOT set additionalProperties:false, so extra keys are
  // harmless — what breaks a send is a REQUIRED variable that is missing.)
  await sendNotification({
    type: "welcome-register",
    email,
    name: userName,
    userId,
    payload: {
      firstName: firstNameOf(userName),
      appName,
      actionUrl: actionUrl ?? "",
      year: currentYear(),
    },
  });
};

export const notifyForgotPassword = async (
  data: ExpiringNotificationData & { resetUrl: string }
) => {
  const { email, userId, userName, resetUrl, expirationSeconds, appName, supportEmail, logoUrl, primaryColor } = data;
  await sendNotification({
    type: "forgot-password",
    email,
    name: userName,
    userId,
    priority: "HIGH",
    payload: cleanPayload({
      email, userName, firstName: firstNameOf(userName), appName, resetUrl,
      expirationTime: humanizeExpiration(expirationSeconds),
      logoUrl, primaryColor: primaryColor ?? defaultPrimaryColor, supportEmail, year: currentYear(),
    }),
  });
};

export const notifyPasswordResetSuccess = async (
  data: BaseNotificationData & { loginUrl?: string; changedAt?: string; ipAddress?: string }
) => {
  const { email, userId, userName, changedAt, loginUrl, ipAddress, appName, supportEmail, logoUrl, primaryColor } = data;
  await sendNotification({
    type: "password-reset-success",
    email,
    name: userName,
    userId,
    payload: cleanPayload({
      email, userName, firstName: firstNameOf(userName), appName,
      changedAt: changedAt ?? new Date().toISOString(),
      ipAddress, loginUrl, logoUrl, primaryColor: primaryColor ?? defaultPrimaryColor, supportEmail, year: currentYear(),
    }),
  });
};

export const notifyOrganizationInvitation = async (
  data: BaseNotificationData & {
    inviterName: string;
    organizationName: string;
    role: string;
    invitationUrl: string;
    expirationTime: string;
  }
) => {
  const { email, userId, userName, inviterName, organizationName, role, invitationUrl, expirationTime, appName, supportEmail, logoUrl, primaryColor } = data;
  await sendNotification({
    type: "invitation",
    email,
    name: userName,
    userId,
    priority: "HIGH",
    // No `inviteeName`: an invitee usually has no account yet, so the caller never
    // has a name to send and cleanPayload would strip it anyway.
    payload: cleanPayload({
      email, inviterName, organizationName, role, invitationUrl, expirationTime,
      appName, logoUrl, primaryColor: primaryColor ?? defaultPrimaryColor, supportEmail, year: currentYear(),
    }),
  });
};
