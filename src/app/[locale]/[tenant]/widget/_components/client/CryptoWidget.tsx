'use client';

import React, { useState, useEffect } from 'react';

const CryptoWidget = () => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 30000); // Update every 30 seconds

    return () => clearInterval(timer);
  }, []);

  // Mock crypto data for demo
  const cryptoData = [
    {
      symbol: 'BTC',
      name: 'Bitcoin',
      price: 42071.21,
      change: 2.8,
      icon: '₿',
    },
    {
      symbol: 'ETH',
      name: 'Ethereum',
      price: 2355.51,
      change: 1.38,
      icon: 'Ξ',
    },
    {
      symbol: 'SOL',
      name: 'Solana',
      price: 96.42,
      change: -1.2,
      icon: '◎',
    },
    {
      symbol: 'XRP',
      name: 'Ripple',
      price: 0.58,
      change: 4.1,
      icon: '⊕',
    },
    {
      symbol: 'BNB',
      name: 'Binance',
      price: 309.15,
      change: 0.9,
      icon: '🔸',
    },
  ];

  const formatPrice = (price: number) => {
    if (price < 1) {
      return `$${price.toFixed(3)}`;
    }
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
    <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-lg shadow-lg w-56 min-h-[296px] h-full text-white relative p-4">
      <h3 className="text-sm font-semibold mb-2 opacity-90 text-center">Crypto Prices</h3>

      <div className="space-y-1.5">
        {cryptoData.map((crypto, index) => (
          <div
            key={crypto.symbol}
            className="flex items-center justify-between bg-white/10 rounded-lg p-1.5"
          >
            <div className="flex items-center space-x-1.5">
              <span className="text-sm">{crypto.icon}</span>
              <div>
                <div className="font-semibold text-xs">{crypto.symbol}</div>
                <div className="text-xs opacity-75">{crypto.name}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-semibold text-xs">{formatPrice(crypto.price)}</div>
              <div className={`text-xs ${crypto.change >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                {formatChange(crypto.change)}
              </div>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};

export default CryptoWidget;
