export interface NFT {
  id: string;
  name: string;
  collection: string;
  image: string;
  currentPrice: number;
  priceChange24h: number;
  circulatingSupply: number;
  reserveLiquidity: number;
  volume24h: number;
  marketCap: number;
  holders: number;
  category: string;
}

export interface PricePoint {
  timestamp: string;
  price: number;
  volume: number;
}

export interface CandleData {
  time: number | string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Transaction {
  id: string;
  type: 'buy' | 'sell';
  nftId: string;
  nftName: string;
  shares: number;
  price: number;
  total: number;
  timestamp: string;
}

export const nftData: NFT[] = [
  {
    id: '1',
    name: 'Genesis #001',
    collection: 'Candl Genesis',
    image: '/nfts/001.jpg',
    currentPrice: 24.5,
    priceChange24h: 12.4,
    circulatingSupply: 10000,
    reserveLiquidity: 342000,
    volume24h: 125000,
    marketCap: 245000,
    holders: 1245,
    category: 'Art'
  },
  {
    id: '2',
    name: 'Apex #002',
    collection: 'Candl Genesis',
    image: '/nfts/002.jpg',
    currentPrice: 18.2,
    priceChange24h: -5.3,
    circulatingSupply: 10000,
    reserveLiquidity: 567000,
    volume24h: 89000,
    marketCap: 182000,
    holders: 892,
    category: 'Collectibles'
  },
  {
    id: '3',
    name: 'Phantom #003',
    collection: 'Candl Genesis',
    image: '/nfts/003.jpg',
    currentPrice: 35.8,
    priceChange24h: 8.7,
    circulatingSupply: 10000,
    reserveLiquidity: 234000,
    volume24h: 178000,
    marketCap: 358000,
    holders: 1876,
    category: 'Art'
  },
  {
    id: '4',
    name: 'Griffin #004',
    collection: 'Candl Genesis',
    image: '/nfts/004.jpg',
    currentPrice: 12.4,
    priceChange24h: 3.2,
    circulatingSupply: 10000,
    reserveLiquidity: 678000,
    volume24h: 65000,
    marketCap: 124000,
    holders: 567,
    category: 'Gaming'
  },
  {
    id: '5',
    name: 'Kitsune #005',
    collection: 'Candl Genesis',
    image: '/nfts/005.jpg',
    currentPrice: 28.9,
    priceChange24h: 15.6,
    circulatingSupply: 10000,
    reserveLiquidity: 412000,
    volume24h: 142000,
    marketCap: 289000,
    holders: 1456,
    category: 'Art'
  }
];

// Generate realistic price history for charts
export const generatePriceHistory = (currentPrice: number, days: number = 30): PricePoint[] => {
  const data: PricePoint[] = [];
  let price = currentPrice * 0.85; // Start 15% lower
  
  for (let i = days; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    
    // Random price movement
    const change = (Math.random() - 0.48) * (currentPrice * 0.05);
    price = Math.max(price + change, currentPrice * 0.7);
    
    data.push({
      timestamp: date.toISOString(),
      price: parseFloat(price.toFixed(2)),
      volume: Math.floor(Math.random() * 50000) + 10000
    });
  }
  
  // Ensure last price matches current price
  data[data.length - 1].price = currentPrice;
  
  return data;
};

// Generate realistic OHLC candlestick data for TradingView
export const generateCandlestickHistory = (currentPrice: number, days: number = 30): CandleData[] => {
  const data: CandleData[] = [];
  let currentOpen = currentPrice * 0.85; // Start 15% lower
  
  // Create data ending at current timestamp
  const now = Math.floor(Date.now() / 1000);
  
  for (let i = days; i >= 0; i--) {
    const timestamp = now - (i * 86400); // 86400 seconds in a day
    
    // Simulate daily volatility
    const change = (Math.random() - 0.48) * (currentPrice * 0.05);
    const close = Math.max(currentOpen + change, currentPrice * 0.5);
    
    const noiseHigh = Math.random() * (currentPrice * 0.02);
    const noiseLow = Math.random() * (currentPrice * 0.02);
    
    const high = Math.max(currentOpen, close) + noiseHigh;
    const low = Math.min(currentOpen, close) - noiseLow;
    
    // Volume spikes on big price moves, base volume relative to market cap
    const priceChangePercent = Math.abs((close - currentOpen) / currentOpen);
    const baseVolume = Math.floor(Math.random() * 50000) + 10000;
    const volume = Math.floor(baseVolume * (1 + priceChangePercent * 10));
    
    data.push({
      time: timestamp,
      open: parseFloat(currentOpen.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      close: parseFloat(close.toFixed(2)),
      volume
    });
    
    currentOpen = close;
  }
  
  // Ensure the final close perfectly matches the current market price
  data[data.length - 1].close = currentPrice;
  if (currentPrice > data[data.length - 1].high) data[data.length - 1].high = currentPrice;
  if (currentPrice < data[data.length - 1].low) data[data.length - 1].low = currentPrice;
  
  return data;
};

export function getPortfolioData(): Transaction[] {
  return [
    {
      id: 't1',
      type: 'buy',
      nftId: '1',
      nftName: 'Genesis #001',
      shares: 50,
      price: 23.8,
      total: 1190,
      timestamp: new Date(Date.now() - 3600000 * 24).toISOString()
    },
    {
      id: 't2',
      type: 'buy',
      nftId: '3',
      nftName: 'Phantom #003',
      shares: 30,
      price: 32.1,
      total: 963,
      timestamp: new Date(Date.now() - 3600000 * 48).toISOString()
    },
    {
      id: 't3',
      type: 'sell',
      nftId: '2',
      nftName: 'Apex #002',
      shares: 25,
      price: 19.5,
      total: 487.5,
      timestamp: new Date(Date.now() - 3600000 * 72).toISOString()
    },
    {
      id: 't4',
      type: 'buy',
      nftId: '5',
      nftName: 'Kitsune #005',
      shares: 40,
      price: 25.2,
      total: 1008,
      timestamp: new Date(Date.now() - 3600000 * 96).toISOString()
    }
  ];
}
