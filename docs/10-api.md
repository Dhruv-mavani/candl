# API Documentation

> This document outlines the REST and WebSocket APIs exposed by the Candl backend.

---

## Base URL
`/api/v1`

---

## REST Endpoints

### Markets

#### `GET /markets`
List all markets.
- **Query Params**: `status` (active/settling/settled), `sort` (volume/newest), `limit`, `offset`
- **Response**: Array of market objects with basic stats.

#### `GET /markets/:mint`
Get details for a specific market by its NFT mint address.
- **Response**: Market configuration, current price, reserve, and NFT metadata.

### Data & Analytics

#### `GET /markets/:mint/candles`
Fetch OHLC data for the chart.
- **Query Params**: `resolution` (1m, 5m, 15m, 1h, 1d), `from` (timestamp), `to` (timestamp)
- **Response**: Array of `{ time, open, high, low, close, volume }`.

#### `GET /markets/:mint/trades`
Fetch recent trades.
- **Query Params**: `limit`, `offset`
- **Response**: Array of trade events (buyer/seller, amount, price, time).

#### `GET /markets/:mint/stats`
Fetch 24h rolling stats.
- **Response**: `{ volume24h, priceChange24h, holders }`.

---

## WebSocket API

The WebSocket API is used for live chart and feed updates.

**Endpoint**: `wss://api.candl.finance/v1/ws`

### Subscription Format

**Client Sends:**
```json
{
  "action": "subscribe",
  "topic": "market:trade",
  "market": "MintAddressHere"
}
```

### Event Messages

**Trade Executed:**
```json
{
  "event": "trade",
  "data": {
    "market": "MintAddressHere",
    "type": "buy",
    "price": 1.25,
    "size": 100,
    "timestamp": 1690000000
  }
}
```

**Candle Updated:**
```json
{
  "event": "candle_update",
  "data": {
    "market": "MintAddressHere",
    "resolution": "1m",
    "candle": {
      "time": 1690000000,
      "open": 1.2,
      "high": 1.3,
      "low": 1.2,
      "close": 1.25,
      "volume": 500
    }
  }
}
```
