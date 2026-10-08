/**
 * @fileoverview Bilingual messages for Developer settings results (client-safe).
 */

import type { ConnectionErrorCode, DevCode } from './developer-types';
import { L } from './i18n';

export const DEV_ERROR_TEXT: Record<DevCode, { en: string; pidgin: string }> = {
  forbidden: L("You don't have permission to do that.", 'You no get permission for that one.'),
  operator_off: L('Developer Mode is turned off on this server.', 'Dem don off Developer Mode for this server.'),
  secrets_unavailable: L('This server cannot store secrets yet. Ask the operator to set AABO_SECRET_KEYS.', 'This server never fit keep secrets. Tell the operator make dem set AABO_SECRET_KEYS.'),
  developer_mode_off: L('Turn on Developer Mode first.', 'On Developer Mode first.'),
  invalid: L('Some settings are not valid.', 'Some settings no correct.'),
  rate_limited: L('Too many tests. Try again in an hour.', 'Una don test too much. Try again after one hour.'),
  not_found: L('Save the settings first.', 'Save the settings first.'),
  platform_ai_missing: L("Ààbò's AI is not set up on this server, so checks use rules only.", 'Ààbò AI never set for this server, so checks dey use rules only.'),
  duplicate: L('This number is already connected.', 'This number don already connect.'),
  not_verified: L('Verify the credentials first.', 'Verify the credentials first.'),
  provider_error: L('The WhatsApp provider returned an error.', 'The WhatsApp provider return error.'),
};

export const CONNECTION_ERROR_TEXT: Record<ConnectionErrorCode | 'webhook_setup_failed' | 'secret_unreadable', { en: string; pidgin: string }> = {
  auth_failed: L('The provider rejected these credentials.', 'The provider reject these credentials.'),
  outside_window: L(
    'WhatsApp only allows free-form messages within 24 hours of the person writing to you. Send "hi" from that phone first, then test again.',
    'WhatsApp only allow normal message inside 24 hours after the person write you. Send "hi" from that phone first, then test again.',
  ),
  invalid_recipient: L('That number cannot receive messages from this sender (check the number, or add it as a test number).', 'That number no fit receive message from this sender (check the number, or add am as test number).'),
  rate_limited: L('The provider is rate-limiting this number.', 'The provider dey limit this number.'),
  unreachable: L('Could not reach the provider.', 'We no fit reach the provider.'),
  bad_response: L('The provider sent an unexpected answer.', 'The provider send answer wey we no expect.'),
  not_found: L('The provider does not know this phone number ID.', 'The provider no know this phone number ID.'),
  webhook_setup_failed: L('Credentials work, but the webhook could not be set automatically — set it by hand (see below).', 'Credentials dey work, but we no fit set the webhook by ourself — set am by hand (see below).'),
  secret_unreadable: L('Stored credentials cannot be read (server key changed). Delete and add the number again.', 'We no fit read the saved credentials (server key don change). Delete am and add the number again.'),
};
