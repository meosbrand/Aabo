# Connect your own WhatsApp number

Ààbò's built-in WhatsApp (a linked device) needs no setup. If your business already has a number on an **official
WhatsApp API**, you can connect it in **App › Developer › Your own WhatsApp number** so customers and staff get Ààbò
checks from your own number.

Before you start: Developer Mode must be on (the business owner switches it on), and the server must be reachable on
the internet over HTTPS (ask your operator for the address; it is the start of the webhook URL Ààbò shows).

After adding a number, Ààbò shows a **webhook URL** and, depending on the provider, a **verify token** or a **header
secret**. Copy them straight away — the secret is shown only once (use *New webhook secret* if you lose it).

Then press **Verify**: Ààbò checks your credentials with the provider. The number starts receiving messages only after
it is verified. Finally **Send test** to a phone that has messaged your number in the last 24 hours (WhatsApp only
allows free-form replies inside that window).

## Meta WhatsApp Cloud API

You need a Meta developer app with the WhatsApp product, and a phone number added in WhatsApp Manager.

1. **Phone number ID** — WhatsApp Manager › Phone numbers (or the app's *API Setup* page). It is a long number, not
   the phone number itself.
2. **Access token** — create a *system user* in Business Settings, give it the app and the WhatsApp account, and
   generate a token with `whatsapp_business_messaging` (and `whatsapp_business_management`). Temporary tokens from
   *API Setup* expire after a day.
3. **App secret** — App settings › Basic › App secret.
4. In Ààbò: *Add a number* › Meta WhatsApp Cloud API, paste the three values, *Connect*.
5. In the Meta app: WhatsApp › Configuration › Webhook › *Edit*: paste the **webhook URL** as the callback URL and the
   **verify token**, then *Verify and save*. Under *Webhook fields*, subscribe to **messages**.
6. Back in Ààbò: **Verify**, then **Send test**.

Ààbò checks the `X-Hub-Signature-256` signature of every delivery with your app secret and only accepts messages for
your phone number ID.

## Twilio

You need a WhatsApp sender in Twilio (or the WhatsApp Sandbox for testing).

1. **Account SID** and **Auth Token** — Twilio Console home. The Auth Token is required even if you also use an API
   key, because Twilio signs webhooks with it.
2. **WhatsApp sender number** in full international format, e.g. `+2348012345678` (Sandbox: Twilio's sandbox number).
3. Optional: a **Messaging Service SID** (`MG…`) if you send through a messaging service.
4. In Ààbò: *Add a number* › Twilio, *Connect*.
5. In Twilio: Messaging › Senders › WhatsApp senders › your sender (Sandbox: *Sandbox settings*) › **When a message
   comes in**: the webhook URL, method **POST**.
6. Back in Ààbò: **Verify**, then **Send test**.

Twilio signs each request with the exact URL it calls. If your server sits behind a proxy, `PUBLIC_WEBHOOK_BASE_URL`
must match the public address exactly (scheme, host, no trailing slash) or deliveries are rejected.

## 360dialog

1. In the 360dialog hub, generate an **API key** for the number and note its **phone number ID** (the Meta phone number
   ID of that number).
2. In Ààbò: *Add a number* › 360dialog, *Connect*.
3. Press **Verify**: Ààbò checks the key and sets the number's webhook to the webhook URL, with the header
   `x-aabo-webhook-secret: <header secret>`.
4. If Ààbò reports it could not set the webhook automatically, set it yourself in the 360dialog hub (or with its
   `POST /v1/configs/webhook` API): URL = the webhook URL, custom header `x-aabo-webhook-secret` = the header secret.
5. **Send test**.

## Troubleshooting

| Message | What to do |
|---|---|
| *The provider rejected these credentials* | Token expired or lacks permissions; generate a new one |
| *The provider does not know this phone number ID* | Use the phone number **ID**, not the phone number |
| *WhatsApp only allows free-form messages within 24 hours…* | Send "hi" from the test phone to your number first |
| *That number cannot receive messages from this sender* | Test numbers can only message registered recipients |
| Nothing arrives | Check the webhook URL and subscription; deliveries are ignored until the number is **verified** |
| *Stored credentials cannot be read* | The server's encryption key changed; remove the number and add it again |

Messages are stored only until they are answered; Ààbò keeps a short masked excerpt of checked messages for 30 days,
like any other check.
