'use client';

import React, { useState, useEffect } from 'react';

const StocksWidget = () => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 30000); // Update every 30 seconds

    return () => clearInterval(timer);
  }, []);

  // Mock stock data for demo
  const stockData = [
    {
      symbol: 'GOLD',
      name: 'Gold Futures',
      price: 2018.5,
      change: -0.8,
      icon: '🥇',
    },
    {
      symbol: 'NVDA',
      name: 'NVIDIA Corp',
      price: 875.28,
      change: 3.2,
      icon: '🎮',
    },
    {
      symbol: 'AAPL',
      name: 'Apple Inc',
      price: 192.53,
      change: 1.1,
      icon: '🍎',
    },
    {
      symbol: 'MSFT',
      name: 'Microsoft Corp',
      price: 420.55,
      change: 2.4,
      icon: '💻',
    },
    {
      symbol: 'TSLA',
      name: 'Tesla Inc',
      price: 238.85,
      change: -1.8,
      icon: '🚗',
    },
  ];

  const formatPrice = (price: number) => {
    return `$${price.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatChange = (change: number) => {
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(2)}%`;
  };

  return (
    <div className="bg-gradient-to-br from-green-600 to-blue-600 rounded-lg shadow-lg w-56 min-h-[296px] h-full text-white relative p-4">
      <h3 className="text-sm font-semibold mb-2 opacity-90 text-center">Stock Prices</h3>

      <div className="space-y-1.5">
        {stockData.map((stock) => (
          <div
            key={stock.symbol}
            className="flex items-center justify-between bg-white/10 rounded-lg p-1.5"
          >
            <div className="flex items-center space-x-1.5">
              <span className="text-sm">{stock.icon}</span>
              <div>
                <div className="font-semibold text-xs">{stock.symbol}</div>
                <div className="text-xs opacity-75">{stock.name}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-semibold text-xs">{formatPrice(stock.price)}</div>
              <div className={`text-xs ${stock.change >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                {formatChange(stock.change)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StocksWidget;
