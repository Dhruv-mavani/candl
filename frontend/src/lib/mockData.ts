export interface NFT {
  id: string;
  name: string;
  collection: string;
  image: string;
  currentPrice: number;
  priceChange24h: number;
  totalShares: number;
  availableShares: number;
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
    name: 'Cosmic Ape #4521',
    collection: 'Cosmic Apes',
    image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&h=400&fit=crop',
    currentPrice: 24.5,
    priceChange24h: 12.4,
    totalShares: 10000,
    availableShares: 3420,
    volume24h: 125000,
    marketCap: 245000,
    holders: 1245,
    category: 'Art'
  },
  {
    id: '2',
    name: 'CyberPunk #892',
    collection: 'CyberPunks',
    image: 'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?w=400&h=400&fit=crop',
    currentPrice: 18.2,
    priceChange24h: -5.3,
    totalShares: 10000,
    availableShares: 5670,
    volume24h: 89000,
    marketCap: 182000,
    holders: 892,
    category: 'Collectibles'
  },
  {
    id: '3',
    name: 'Digital Dreams #156',
    collection: 'Digital Dreams',
    image: 'https://images.unsplash.com/photo-1634973357973-f2ed2657db3c?w=400&h=400&fit=crop',
    currentPrice: 35.8,
    priceChange24h: 8.7,
    totalShares: 10000,
    availableShares: 2340,
    volume24h: 178000,
    marketCap: 358000,
    holders: 1876,
    category: 'Art'
  },
  {
    id: '4',
    name: 'Meta Kitty #723',
    collection: 'Meta Kitties',
    image: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=400&h=400&fit=crop',
    currentPrice: 12.4,
    priceChange24h: 3.2,
    totalShares: 10000,
    availableShares: 6780,
    volume24h: 65000,
    marketCap: 124000,
    holders: 567,
    category: 'Gaming'
  },
  {
    id: '5',
    name: 'Abstract Wave #45',
    collection: 'Abstract Waves',
    image: 'https://images.unsplash.com/photo-1618172193622-ae2d025f4032?w=400&h=400&fit=crop',
    currentPrice: 28.9,
    priceChange24h: 15.6,
    totalShares: 10000,
    availableShares: 4120,
    volume24h: 142000,
    marketCap: 289000,
    holders: 1456,
    category: 'Art'
  },
  {
    id: '6',
    name: 'Neon Skull #982',
    collection: 'Neon Skulls',
    image: 'https://images.unsplash.com/photo-1635322966219-b75ed372eb01?w=400&h=400&fit=crop',
    currentPrice: 42.1,
    priceChange24h: -2.8,
    totalShares: 10000,
    availableShares: 1890,
    volume24h: 198000,
    marketCap: 421000,
    holders: 2134,
    category: 'Collectibles'
  },
  {
    id: '7',
    name: 'Pixel Warriors #334',
    collection: 'Pixel Warriors',
    image: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=400&h=400&fit=crop',
    currentPrice: 19.7,
    priceChange24h: 6.4,
    totalShares: 10000,
    availableShares: 5230,
    volume24h: 94000,
    marketCap: 197000,
    holders: 978,
    category: 'Gaming'
  },
  {
    id: '8',
    name: 'Galaxy Girls #1203',
    collection: 'Galaxy Girls',
    image: 'https://images.unsplash.com/photo-1617791160505-6f00504e3519?w=400&h=400&fit=crop',
    currentPrice: 31.5,
    priceChange24h: 9.1,
    totalShares: 10000,
    availableShares: 3670,
    volume24h: 156000,
    marketCap: 315000,
    holders: 1687,
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

export const portfolioData: Transaction[] = [
  {
    id: 't1',
    type: 'buy',
    nftId: '1',
    nftName: 'Cosmic Ape #4521',
    shares: 50,
    price: 23.8,
    total: 1190,
    timestamp: new Date(Date.now() - 3600000 * 24).toISOString()
  },
  {
    id: 't2',
    type: 'buy',
    nftId: '3',
    nftName: 'Digital Dreams #156',
    shares: 30,
    price: 32.1,
    total: 963,
    timestamp: new Date(Date.now() - 3600000 * 48).toISOString()
  },
  {
    id: 't3',
    type: 'sell',
    nftId: '2',
    nftName: 'CyberPunk #892',
    shares: 25,
    price: 19.5,
    total: 487.5,
    timestamp: new Date(Date.now() - 3600000 * 72).toISOString()
  },
  {
    id: 't4',
    type: 'buy',
    nftId: '5',
    nftName: 'Abstract Wave #45',
    shares: 40,
    price: 25.2,
    total: 1008,
    timestamp: new Date(Date.now() - 3600000 * 96).toISOString()
  }
];
