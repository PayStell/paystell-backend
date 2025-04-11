# Sales Summary Endpoints Documentation

This document describes the API endpoints for retrieving sales summary data for merchants in the PayStell platform.

## Base URL

All endpoints are relative to the base URL: `https://api.paystell.com`

## Authentication

All endpoints require merchant authentication using an API key.

Include the API key in the request headers:
```
X-API-Key: your_api_key_here
```

## Endpoints

### Get Complete Sales Summary

Retrieves a comprehensive sales summary including total sales, daily and monthly breakdowns, and top-selling products.

- **URL**: `/api/sales-summary`
- **Method**: `GET`
- **Parameters**:
  - `startDate` (optional): Start date for the summary period (ISO 8601 format)
  - `endDate` (optional): End date for the summary period (ISO 8601 format)

**Example Request**:
```
GET /api/sales-summary?startDate=2023-01-01T00:00:00Z&endDate=2023-12-31T23:59:59Z
```

**Example Response**:
```json
{
  "success": true,
  "data": {
    "totalSales": 15000.50,
    "dailySales": [
      { "date": "2023-12-30", "total": 500.25 },
      { "date": "2023-12-31", "total": 750.75 }
    ],
    "monthlySales": [
      { "date": "2023-11", "total": 5000.00 },
      { "date": "2023-12", "total": 10000.50 }
    ],
    "topProducts": [
      { "name": "Premium Product", "sku": "PRE123", "total": 5000.00, "count": 20 },
      { "name": "Basic Product", "sku": "BAS456", "total": 3000.00, "count": 30 }
    ]
  }
}
```

### Get Total Sales

Retrieves the total sales amount for a merchant.

- **URL**: `/api/sales-summary/total`
- **Method**: `GET`
- **Parameters**:
  - `startDate` (optional): Start date for the summary period (ISO 8601 format)
  - `endDate` (optional): End date for the summary period (ISO 8601 format)

**Example Request**:
```
GET /api/sales-summary/total?startDate=2023-01-01T00:00:00Z&endDate=2023-12-31T23:59:59Z
```

**Example Response**:
```json
{
  "success": true,
  "data": {
    "totalSales": 15000.50
  }
}
```

### Get Sales by Time Period

Retrieves sales data broken down by a specific time period.

- **URL**: `/api/sales-summary/by-period/:timePeriod`
- **Method**: `GET`
- **URL Parameters**:
  - `timePeriod`: The time period to group sales by. Options: `daily`, `weekly`, `monthly`
- **Query Parameters**:
  - `startDate` (optional): Start date for the summary period (ISO 8601 format)
  - `endDate` (optional): End date for the summary period (ISO 8601 format)

**Example Request**:
```
GET /api/sales-summary/by-period/daily?startDate=2023-12-25T00:00:00Z&endDate=2023-12-31T23:59:59Z
```

**Example Response**:
```json
{
  "success": true,
  "data": {
    "timePeriod": "daily",
    "sales": [
      { "date": "2023-12-25", "total": 100.00 },
      { "date": "2023-12-26", "total": 150.50 },
      { "date": "2023-12-27", "total": 200.75 },
      { "date": "2023-12-28", "total": 175.25 },
      { "date": "2023-12-29", "total": 225.00 },
      { "date": "2023-12-30", "total": 500.25 },
      { "date": "2023-12-31", "total": 750.75 }
    ]
  }
}
```

### Get Top Selling Products

Retrieves the top-selling products for a merchant.

- **URL**: `/api/sales-summary/top-products`
- **Method**: `GET`
- **Parameters**:
  - `limit` (optional): Maximum number of products to return (default: 5, max: 100)
  - `startDate` (optional): Start date for the summary period (ISO 8601 format)
  - `endDate` (optional): End date for the summary period (ISO 8601 format)

**Example Request**:
```
GET /api/sales-summary/top-products?limit=3&startDate=2023-01-01T00:00:00Z&endDate=2023-12-31T23:59:59Z
```

**Example Response**:
```json
{
  "success": true,
  "data": {
    "topProducts": [
      { "name": "Premium Product", "sku": "PRE123", "total": 5000.00, "count": 20 },
      { "name": "Basic Product", "sku": "BAS456", "total": 3000.00, "count": 30 },
      { "name": "Special Product", "sku": "SPC789", "total": 2000.50, "count": 10 }
    ]
  }
}
```

## Error Responses

All endpoints follow a consistent error response format:

```json
{
  "success": false,
  "error": "Error message"
}
```

### Common Error Codes

- `400 Bad Request`: Invalid parameters (e.g., invalid date format, invalid time period)
- `401 Unauthorized`: Missing or invalid API key
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server-side error

## Date Formats

All dates should be provided in ISO 8601 format: `YYYY-MM-DDTHH:mm:ssZ`

Example: `2023-12-31T23:59:59Z`