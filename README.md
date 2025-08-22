# CK-Store

## Description

This is a demo app for an online store built around docker containers and dapr.

It can be launched locally with `docker compose up --build`, and navigate to http://localhost:3001/.

There is also a deploy script that attempts to replicate the same setup in Azure, it is located at the root of the repo: [deploy.sh](deploy.sh)

The app is split into three services, detailed below.

### Frontend

The frontend is a React app that connects to the products and orders services via their Dapr sidecards. For now it's only showing a badage with the count of items in the cart.

The React side of things uses a SSE connection to it's BFF (backend for frontend) counterpart, the SSE connection is needed in order to receive updates from PubSub.

Opening the frontend in two separate tabs proves the fact that the Dapr PubSub works as expected - the cart items count is updated in real time in both tabs.

### Products

This is a simple services that returns a list of hardcoded products.

### Orders

Another simple service that keeps the shopping cart contents in memory, and notifies the Dapr PubSub when new items are added. The React app updates its state based on the events triggered by this service.

## Deliverables

### 1. Azure Container Registry Setup

![Azure Container Registry](artifacts/1.%20ACR.png)

### 2. ACR Login

![ACR Login](artifacts/2.%20az%20acr%20login.png)

### 3. Building Docker Images

![Build Products Docker Image](artifacts/3.%20build%20the%20products%20docker%20image.png)

### 4. Pushing Images to ACR

![Push Docker Image to ACR](artifacts/4.%20push%20the%20docker%20image%20to%20ACR.png)

### 5. Azure Container App Creation Process

#### 5.1 Initial Setup

![Create Azure Container App - Step 1](artifacts/5.1%20Create%20the%20Azure%20Container%20App.png)

#### 5.2 Configuration

![Create Azure Container App - Step 2](artifacts/5.2%20Create%20the%20Azure%20Container%20App.png)

#### 5.3 Advanced Settings

![Create Azure Container App - Step 3](artifacts/5.3%20Create%20the%20Azure%20Container%20App.png)

#### 5.4 Final Configuration

![Create Azure Container App - Step 4](artifacts/5.4%20Create%20the%20Azure%20Container%20App.png.png)

#### 5.5 Enable Dapr

![Enable Dapr](artifacts/5.5%20Enable%20Dapr.png)

### Deployment Logs

For detailed deployment logs, see [logs.txt](artifacts/logs.txt)

### Dapr config files

Can be found in the [dapr-components](dapr-components) directory.

### dapr pubsub yaml file for local docker compose:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: pubsub
spec:
  type: pubsub.redis
  version: v1
  metadata:
    - name: redisHost
      value: redis:6379
    - name: redisPassword
      value: ""
scopes:
  - orders
  - frontend
```

### dapr pubsub yaml file for ACA

```yaml
componentType: pubsub.redis
version: v1
metadata:
  - name: redisHost
    value: redis:6379
scopes:
  - orders
  - frontend
```
