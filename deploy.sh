#!/bin/bash -euo pipefail

RESOURCE_GROUP="ck-introspect1"
ACR_NAME="ckintrospect1b"
CONTAINER_ENV="ck-introspect1-env"
LOCATION="eastus2"

# Resource group
if ! az group exists --name "$RESOURCE_GROUP"; then
  echo "Creating resource group $RESOURCE_GROUP..."
  az group create --name "$RESOURCE_GROUP" --location "$LOCATION"
else
  echo "Resource group $RESOURCE_GROUP exists"
fi

# ACR
if ! az acr show --name "$ACR_NAME" --resource-group "$RESOURCE_GROUP" &>/dev/null; then
  echo "Creating ACR $ACR_NAME..."
  az acr create --name "$ACR_NAME" --resource-group "$RESOURCE_GROUP" --location "$LOCATION" --sku Basic --admin-enabled true
else
  echo "ACR $ACR_NAME exists"
fi

echo "Logging into ACR..."
az acr login --name "$ACR_NAME"

ACR_USERNAME=$(az acr credential show --name "$ACR_NAME" --query username --output tsv)
ACR_PASSWORD=$(az acr credential show --name "$ACR_NAME" --query passwords[0].value --output tsv)

echo "Building the Docker images..."
docker build --platform linux/amd64 -q -t "$ACR_NAME.azurecr.io/frontend" services/frontend
docker build --platform linux/amd64 -q -t "$ACR_NAME.azurecr.io/products" services/products
docker build --platform linux/amd64 -q -t "$ACR_NAME.azurecr.io/orders" services/orders

echo "Pushing Docker images to ACR..."
docker push -q "$ACR_NAME.azurecr.io/frontend"
docker push -q "$ACR_NAME.azurecr.io/products"
docker push -q "$ACR_NAME.azurecr.io/orders"

# Container Apps environment
if ! az containerapp env show --name "$CONTAINER_ENV" --resource-group "$RESOURCE_GROUP" &>/dev/null; then
  echo "Creating Container Apps Environment $CONTAINER_ENV..."
  az containerapp env create \
    --name "$CONTAINER_ENV" \
    --resource-group "$RESOURCE_GROUP" \
    --location "$LOCATION"
else
  echo "Container Apps Environment $CONTAINER_ENV exists"
fi

# frontend
if ! az containerapp show --name frontend --resource-group "$RESOURCE_GROUP" &>/dev/null; then
  echo "Creating the frontend container..."
  az containerapp create \
    --name frontend \
    --resource-group "$RESOURCE_GROUP" \
    --environment "$CONTAINER_ENV" \
    --image "$ACR_NAME.azurecr.io/frontend" \
    --target-port 3001 \
    --ingress external \
    --enable-dapr \
    --dapr-app-id frontend \
    --dapr-app-port 3001 \
    --registry-server "$ACR_NAME.azurecr.io" \
    --registry-username "$ACR_USERNAME" \
    --registry-password "$ACR_PASSWORD"
else
  echo "Updating the frontend container app with the latest image..."
  az containerapp update \
    --name frontend \
    --resource-group "$RESOURCE_GROUP" \
    --image "$ACR_NAME.azurecr.io/frontend"
fi

# products
if ! az containerapp show --name products --resource-group "$RESOURCE_GROUP" &>/dev/null; then
  echo "Creating the products container..."
  az containerapp create \
    --name products \
    --resource-group "$RESOURCE_GROUP" \
    --environment "$CONTAINER_ENV" \
    --image "$ACR_NAME.azurecr.io/products" \
    --target-port 5001 \
    --ingress internal \
    --enable-dapr \
    --dapr-app-id products \
    --dapr-app-port 5001 \
    --registry-server "$ACR_NAME.azurecr.io" \
    --registry-username "$ACR_USERNAME" \
    --registry-password "$ACR_PASSWORD"
else
  echo "Updating the products container app with the latest image..."
  az containerapp update \
    --name products \
    --resource-group "$RESOURCE_GROUP" \
    --image "$ACR_NAME.azurecr.io/products"
fi

# orders
if ! az containerapp show --name orders --resource-group "$RESOURCE_GROUP" &>/dev/null; then
  echo "Creating the orders container..."
  az containerapp create \
    --name orders \
    --resource-group "$RESOURCE_GROUP" \
    --environment "$CONTAINER_ENV" \
    --image "$ACR_NAME.azurecr.io/orders" \
    --target-port 5002 \
    --ingress internal \
    --enable-dapr \
    --dapr-app-id orders \
    --dapr-app-port 5002 \
    --registry-server "$ACR_NAME.azurecr.io" \
    --registry-username "$ACR_USERNAME" \
    --registry-password "$ACR_PASSWORD"
else
  echo "Updating the orders container app with the latest image..."
  az containerapp update \
    --name orders \
    --resource-group "$RESOURCE_GROUP" \
    --image "$ACR_NAME.azurecr.io/orders"
fi

# redis
if ! az containerapp show --name redis --resource-group "$RESOURCE_GROUP" &>/dev/null; then
  echo "Creating the Redis container..."
  az containerapp create \
    --name redis \
    --resource-group "$RESOURCE_GROUP" \
    --environment "$CONTAINER_ENV" \
    --image redis:7-alpine \
    --target-port 6379 \
    --ingress internal \
    --min-replicas 1 \
    --max-replicas 1
else
  echo "Updating Redis container app with latest image..."
  az containerapp update \
    --name redis \
    --resource-group "$RESOURCE_GROUP" \
    --image redis:7-alpine
fi

# Deploy/Update Dapr pubsub component (always runs to ensure latest config)
echo "Deploying Dapr pubsub component..."
az containerapp env dapr-component set \
  --name "$CONTAINER_ENV" \
  --resource-group "$RESOURCE_GROUP" \
  --dapr-component-name pubsub \
  --yaml ./dapr-components/pubsub-aca.yaml
