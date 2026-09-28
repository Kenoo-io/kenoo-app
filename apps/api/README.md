# Kenoo API

The public integration API for external Kenoo apps such as MurphsLife.

## Ingest an event

Create the event definition first in Flows, then send occurrences with a
scoped API key:

```bash
curl -X POST https://api.kenoo.io/v1/events \
  -H "Authorization: Bearer knp_live_..." \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: murphslife-user-123-profile-updated-2026-09-28" \
  -d '{
    "event": "profile_updated",
    "payload": {
      "user_id": "123",
      "email": "person@example.com"
    },
    "context": {
      "source": "murphslife"
    }
  }'
```

The endpoint returns `202 Accepted` after durably recording the event. The
event occurrence is the input for future workflow triggers and analytics.

API keys should be used from the app's server, never shipped to a browser or
mobile client.
