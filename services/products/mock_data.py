def mock_products():
    sample_products = [
        {
            'name': 'Wireless Headphones',
            'description': 'High-quality wireless headphones with noise cancellation',
            'price': 99.99,
            'image': 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&h=200&fit=crop'
        },
        {
            'name': 'Smartphone',
            'description': 'Latest generation smartphone with advanced camera features',
            'price': 699.99,
            'image': 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=300&h=200&fit=crop'
        },
        {
            'name': 'Laptop',
            'description': 'Lightweight laptop perfect for work and entertainment',
            'price': 1299.99,
            'image': 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=300&h=200&fit=crop'
        }
    ]

    product_id = 1
    products = {}
    for product_data in sample_products:
        product = product_data.copy()
        product['id'] = product_id
        products[product_id] = product
        product_id += 1

    return products
