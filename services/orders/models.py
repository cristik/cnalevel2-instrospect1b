from pydantic import BaseModel
from typing import List

class OrderItem(BaseModel):
    product_id: int
    name: str
    quantity: int
    price: float

class Order(BaseModel):
    id: int
    items: List[OrderItem]

class AddItemRequest(BaseModel):
    product_id: int
    quantity: int
    price: float
    name: str
