from fastapi import FastAPI, HTTPException
import requests
import uvicorn
import json
from settings import *
from models import *

app = FastAPI(title="CK Store Orders API", version="1.0.0")

current_order = {
    'id': 1,
    'items': []
}

@app.get("/orders/current", response_model=Order)
def get_current_order():
    return Order(id=current_order['id'], items=current_order['items'])

@app.post("/orders/current/items", response_model=Order)
def add_item_to_current_order(item_data: AddItemRequest):
    existing_item = None
    for item in current_order['items']:
        if item['product_id'] == item_data.product_id:
            existing_item = item
            break

    if existing_item:
        existing_item['quantity'] += item_data.quantity
    else:
        item = {
            'product_id': item_data.product_id,
            'quantity': item_data.quantity,
            'price': item_data.price,
            'name': item_data.name
        }
        current_order['items'].append(item)

    publish_cart_update(current_order)
    return Order(id=current_order['id'], items=current_order['items'])

def publish_cart_update(order_data):
    try:
        event = {
            'event_type': 'cart_updated',
            'order_id': 1,
            'order': order_data,
            'timestamp': 'simplified'
        }

        url = f'{DAPR_BASE_URL}/v1.0/publish/{PUBSUB_NAME}/{CART_TOPIC}'
        response = requests.post(
            url,
            data=json.dumps(event),
            headers={'Content-Type': 'application/json'}
        )

        if not (200 <= response.status_code < 300):
            print(f"Failed to publish cart update: {response.status_code}")

    except Exception as e:
        print(f"Error publishing cart update: {e}")


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=5002)
