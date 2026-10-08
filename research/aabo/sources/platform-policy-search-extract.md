---
capture: web-search extract (full-page fetch blocked by sandbox egress policy)
captured: 2026-10-07
query: "Google Play policy NotificationListenerService spam blocker app reading WhatsApp notifications allowed 2026"
category: government/platform policy + news
---

# Platform policy for notification-reading apps (search extract)

Sources: https://support.google.com/googleplay/android-developer/answer/9214102?hl=en , https://support.google.com/googleplay/android-developer/answer/9047303 ,
https://ptkd.com/journal/android-notification-listener-service-security , https://www.xatakandroid.com/comunicacion-y-mensajeria/whatsapp-empieza-combatir-apps-que-muestran-mensajes-que-hayan-sido-borrados ,
https://source.android.com/docs/automotive/hmi/notifications/notification-access , https://dev.to/mr_manushukla/google-plays-july-2026-policy-update-5-changes-to-ship-before-the-31-august-deadline-3bie

- Notification access is one of Android's most privacy-sensitive capabilities, granted via a special settings screen.
- Play: usage "must fall within permitted uses and be directly tied to core functionality"; sensitive APIs may not be used "for undisclosed, unimplemented, or disallowed features or purposes"; non-compliant apps "may be removed from Google Play".
- Third-party guide: request only for a core feature; "never harvest or transmit notification content".
- Developer Distribution Agreement 4.9 bars interference with third-party services; Google reportedly told a developer an app interfering with WhatsApp violates WhatsApp's terms; WhatsRemoved returned to Play only after dropping WhatsApp support; DirectChat developer received a WhatsApp cease-and-desist.
- Play's call/SMS policy explicitly allows spam blocking as a use case; no equivalent explicit exception found for notification listeners.
