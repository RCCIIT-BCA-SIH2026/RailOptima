import asyncio
import httpx
import json

async def run():
    payload = {
      "object": "whatsapp_business_account",
      "entry": [{
        "id": "1427701192902981",
        "changes": [{
          "value": {
            "messaging_product": "whatsapp",
            "metadata": {
              "display_phone_number": "15551406999",
              "phone_number_id": "1271448056060123"
            },
            "contacts": [{"wa_id": "917439033504"}],
            "messages": [{
              "from": "917439033504",
              "id": "wamid.TEST9999",
              "text": {"body": "hi"},
              "type": "text"
            }]
          },
          "field": "messages"
        }]
      }]
    }
    
    print("Sending POST request to Render webhook...")
    async with httpx.AsyncClient() as client:
        res = await client.post("https://railoptima-7e81.onrender.com/api/whatsapp/webhook", json=payload, timeout=30.0)
        print("Response:", res.status_code, res.text)

if __name__ == "__main__":
    asyncio.run(run())
