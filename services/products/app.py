from fastapi import FastAPI
from typing import List
import uvicorn
from models import Product
from mock_data import mock_products

app = FastAPI(title="CK Store Products API", version="1.0.0")

products = mock_products()

@app.get("/products", response_model=List[Product])
def get_products():
    return list(products.values())

if __name__ == '__main__':
    uvicorn.run(app, host="0.0.0.0", port=5001)
