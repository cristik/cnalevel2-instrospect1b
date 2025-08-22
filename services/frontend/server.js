const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());
app.use(express.text({ type: 'application/cloudevents+json' }));

let sseConnections = [];

// Add request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.use(express.static(path.join(__dirname, 'build')));

app.get('/dapr/subscribe', (req, res) => {
  const subscriptions = [
    {
      pubsubname: 'pubsub',
      topic: 'cart-updates',
      route: '/cart-updates'
    }
  ];
  res.json(subscriptions);
});

app.post('/cart-updates', (req, res) => {
  let eventData = {};

  if (typeof req.body === 'string') {
    try {
      const cloudEvent = JSON.parse(req.body);

      if (cloudEvent.data) {
        eventData = cloudEvent.data;
      } else {
        eventData = cloudEvent;
      }
    } catch (error) {
      console.error('Error parsing CloudEvent:', error);
      eventData = {};
    }
  } else {
    eventData = req.body;
  }

  console.info('Received cart update event:', eventData);
  sseConnections.forEach((connection) => {
    try {
      console.info("Dispatching the event data to SSE connection");
      connection.write(`data: ${JSON.stringify(eventData)}\n\n`);
    } catch (error) {
      console.error('Error sending SSE:', error);
    }
  });

  res.status(200).send('OK');
});

app.get('/api/cart-updates', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);

  sseConnections.push(res);

  req.on('close', () => {
    sseConnections = sseConnections.filter(connection => connection !== res);
  });
});

app.get('/api/products', async (req, res) => {
  try {
    console.log('Getting products...');
    const response = await fetch('http://frontend-dapr:3500/v1.0/invoke/products/method/products');

    console.info('Dapr response status:', response.status);

    if (response.ok) {
      const text = await response.text();
      const data = JSON.parse(text);
      res.json(data);
    } else {
      console.error('Dapr service invocation failed:', response.status);
      res.status(response.status).json({ error: 'Dapr service invocation failed' });
    }
  } catch (error) {
    console.error('Error getting products:', error);
    res.status(500).json({ error: 'Failed to get products' });
  }
});

app.get('/api/orders/current', async (req, res) => {
  try {
    console.info('Getting current order...');
    const response = await fetch('http://frontend-dapr:3500/v1.0/invoke/orders/method/orders/current');

    console.info('Dapr response status:', response.status);

    if (response.ok) {
      const text = await response.text();
      const data = JSON.parse(text);
      res.json(data);
    } else {
      console.error('Dapr service invocation failed:', response.status);
      res.status(response.status).json({ error: 'Dapr service invocation failed' });
    }
  } catch (error) {
    console.error('Error getting current order:', error);
    res.status(500).json({ error: 'Failed to get current order' });
  }
});

app.post('/api/orders/current/items', async (req, res) => {
  try {
    console.info('Adding item to current order...');

    const response = await fetch(`http://frontend-dapr:3500/v1.0/invoke/orders/method/orders/current/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });

    console.info('Dapr response status:', response.status);

    if (response.ok) {
      const text = await response.text();
      const data = JSON.parse(text);
      res.json(data);
    } else {
      console.error('Dapr service invocation failed:', response.status);
      res.status(response.status).json({ error: 'Dapr service invocation failed' });
    }
  } catch (error) {
    console.error('Error adding item:', error);
    res.status(500).json({ error: 'Failed to add item to cart' });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Frontend server running on port ${PORT}`);
  console.log(`SSE endpoint available at /api/cart-updates`);
});
