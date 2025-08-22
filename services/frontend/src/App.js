import React, { useState, useEffect } from 'react';
import './index.css';

function App() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cartItemCount, setCartItemCount] = useState(0);
  const [addingToCart, setAddingToCart] = useState({});

  const setupSSEConnection = () => {
    const eventSource = new EventSource('/api/cart-updates');

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('Received cart update via SSE:', data);

        if (data.type === 'connected') {
          return;
        }

        if (data.order) {
          updateCartCount(data.order);
        }
      } catch (error) {
        console.error('Error parsing SSE data:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('SSE error:', error);
    };

    return () => {
      eventSource.close();
    };
  };

  const initializeOrder = async () => {
    setCartItemCount(0);
  };

  const updateCartCount = (order) => {
    const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0);
    setCartItemCount(totalItems);
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/products`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setProducts(data);
    } catch (err) {
      setError(`Failed to fetch products: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentOrder = async () => {
    try {
      const response = await fetch('/api/orders/current');

      if (response.ok) {
        const order = await response.json();
        setCartItemCount(order.items.reduce((total, item) => total + item.quantity, 0));
        console.log('Current order loaded:', order);
      }
    } catch (error) {
      console.error('Error fetching current order:', error);
      initializeOrder();
    }
  };

  const addToCart = async (product) => {
    setAddingToCart(prev => ({ ...prev, [product.id]: true }));

    try {
      const response = await fetch(`/api/orders/current/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          product_id: product.id,
          quantity: 1,
          price: product.price,
          name: product.name,
        }),
      });

      if (response.ok) {
        const updatedOrder = await response.json();
        updateCartCount(updatedOrder);
        console.log('Item added to cart via Dapr service invocation');
      } else {
        throw new Error('Failed to add item to cart');
      }
    } catch (err) {
      console.error('Error adding to cart:', err);
    } finally {
      setAddingToCart(prev => ({ ...prev, [product.id]: false }));
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  useEffect(() => {
    fetchProducts();
    fetchCurrentOrder();
  }, []);

  useEffect(() => {
    const cleanup = setupSSEConnection();
    return cleanup;
  }, []);

  if (loading) {
    return (
      <div className="container">
        <div className="loading">Loading products...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <div className="error">{error}</div>
        <button onClick={fetchProducts}>Retry</button>
      </div>
    );
  }

  return (
    <div className="app">

      <div className="top-bar">
        <div className="top-bar-content">
          <h1 className="store-title">CK Store</h1>
          <div className="cart-info">
            <span className="cart-icon">🛒</span>
            <span className="cart-count">{cartItemCount}</span>
            <span className="cart-text">Items in Cart</span>
          </div>
        </div>
      </div>

      <div className="container">
        <header className="header">
          <h2>Product Catalog</h2>
          <p>Browse our amazing collection of products</p>
        </header>

        {products.length === 0 ? (
          <div className="no-products">
            No products available at the moment.
          </div>
        ) : (
          <div className="products-grid">
            {products.map((product) => (
              <div key={product.id} className="product-card">
                <img
                  src={product.image}
                  alt={product.name}
                  className="product-image"
                  onError={(e) => {
                    e.target.src = 'https://via.placeholder.com/300x200?text=No+Image';
                  }}
                />
                <h3 className="product-name">{product.name}</h3>
                <p className="product-description">{product.description}</p>
                <div className="product-footer">
                  <div className="product-price">{formatPrice(product.price)}</div>
                  <button
                    className={`add-to-cart-btn ${addingToCart[product.id] ? 'loading' : ''}`}
                    onClick={() => addToCart(product)}
                    disabled={addingToCart[product.id]}
                  >
                    {addingToCart[product.id] ? 'Adding...' : 'Add to Cart'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
