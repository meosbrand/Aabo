/**
 * @fileoverview An organisation's own WhatsApp number on an official API (Developer Mode).
 * Fetch-only: nothing here depends on the linked-device (Baileys) transport.
 */

export type CloudProvider = 'meta' | 'twilio' | 'd360';
export const CLOUD_PROVIDERS: CloudProvider[] = ['meta', 'twilio', 'd360'];

export interface MetaCredentials {
  provider: 'meta';
  /** System-user access token with whatsapp_business_messaging permission */
  accessToken: string;
  /** App secret, used to verify X-Hub-Signature-256 on webhooks */
  appSecret: string;
}

export interface TwilioCredentials {
  provider: 'twilio';
  /** Auth Token: signs webhooks (X-Twilio-Signature); also used for REST calls without an API key */
  authToken: string;
  apiKeySid?: string;
  apiKeySecret?: string;
}

export interface D360Credentials {
  provider: 'd360';
  apiKey: string;
  /** Secret 360dialog sends back in the x-aabo-webhook-secret header */
  webhookSecret: string;
}

export type CloudCredentials = MetaCredentials | TwilioCredentials | D360Credentials;

export interface CloudConfig {
  /** Twilio Account SID (AC…) */
  accountSid?: string;
  /** Twilio Messaging Service SID (MG…), optional */
  messagingServiceSid?: string;
}

export interface CloudConnection {
  id: string;
  orgId: string;
  provider: CloudProvider;
  /** Meta/360dialog phone_number_id, or the Twilio sender in E.164 */
  externalNumberId: string;
  config: CloudConfig;
  credentials: CloudCredentials;
  readReceipts: boolean;
}

/** One inbound chat message from a provider webhook. */
export interface CloudInbound {
  providerMessageId: string;
  /** Sender address: WhatsApp id (digits) for Meta/360dialog, E.164 for Twilio */
  from: string;
  name?: string;
  timestamp: number;
  text?: string;
  isForwarded?: boolean;
  media?: { kind: 'image' | 'document'; ref: string; mime?: string; fileName?: string };
  contact?: { name?: string; phones: string[] };
  /** Audio, stickers, locations… (answered with the welcome text) */
  unsupported?: boolean;
}

export type CloudErrorCode = 'auth_failed' | 'outside_window' | 'invalid_recipient' | 'rate_limited' | 'unreachable' | 'bad_response' | 'not_found';

export class CloudError extends Error {
  constructor(
    readonly code: CloudErrorCode,
    detail?: string,
  ) {
    super(detail ? `${code}: ${detail}` : code);
    this.name = 'CloudError';
  }
}
