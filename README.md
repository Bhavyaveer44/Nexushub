# WhatsApp Cloud Webhook Service

A production-ready Express webhook service for WhatsApp Cloud API that normalizes incoming messages and enqueues them into BullMQ.

## Setup

```bash
cd whatsapp-webhook-service
npm install
cp .env.example .env
npm start
```

## Service behavior

- Accepts `POST /webhook`
- Validates requests with a placeholder token/signature check
- Extracts WhatsApp message payload fields
- Normalizes them to a standard shape
- Pushes the normalized payload to BullMQ queue `incoming-messages`
- Returns HTTP 200 quickly even when queueing

## Normalized payload

```json
{
  "message_id": "wamid.HBgMNTU1...",
  "conversation_id": "15559876543",
  "direction": "inbound",
  "content": "Hello World",
  "timestamp": "2026-04-29T15:00:00.000Z"
}
```

## Example WhatsApp Cloud webhook payload

```json
{
  "object": "whatsapp_business_account",
  "entry": [
    {
      "id": "1234567890",
      "changes": [
        {
          "value": {
            "messaging_product": "whatsapp",
            "metadata": {
              "display_phone_number": "15551234567",
              "phone_number_id": "9876543210"
            },
            "contacts": [
              {
                "profile": {
                  "name": "John Doe"
                },
                "wa_id": "15559876543"
              }
            ],
            "messages": [
              {
                "from": "15559876543",
                "id": "wamid.HBgMNTU1...",
                "timestamp": "1714354496",
                "text": {
                  "body": "Hello World"
                },
                "type": "text"
              }
            ]
          },
          "field": "messages"
        }
      ]
    }
  ]
}
```

## Notes

- Replace `validateWebhookRequest` with actual WhatsApp Cloud API signature verification before production.
- For a production deployment, separate the worker process from the API process.
- Configure Redis access through environment variables.
