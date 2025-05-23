'use client';

import React, { useState, useEffect } from 'react';

const WeatherWidget = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentCityIndex, setCurrentCityIndex] = useState(3); // Start with Zurich

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  // Cities data for demo
  const cities = [
    {
      name: 'Paris, FR',
      temperature: 18,
      condition: 'Cloudy',
      humidity: 72,
      windSpeed: 8,
      icon: '☁️',
      high: 22,
      low: 14,
    },
    {
      name: 'Marseille, FR',
      temperature: 25,
      condition: 'Sunny',
      humidity: 58,
      windSpeed: 15,
      icon: '☀️',
      high: 28,
      low: 20,
    },
    {
      name: 'Rouen, FR',
      temperature: 16,
      condition: 'Rainy',
      humidity: 85,
      windSpeed: 6,
      icon: '🌧️',
      high: 19,
      low: 12,
    },
    {
      name: 'Zurich, CH',
      temperature: 22,
      condition: 'Sunny',
      humidity: 65,
      windSpeed: 12,
      icon: '☀️',
      high: 25,
      low: 18,
    },
  ];

  const currentCity = cities[currentCityIndex];

  const nextCity = () => {
    setCurrentCityIndex((prev) => (prev + 1) % cities.length);
  };

  const prevCity = () => {
    setCurrentCityIndex((prev) => (prev - 1 + cities.length) % cities.length);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  return (
    <div className="bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg shadow-lg w-56 h-64 text-white relative p-4">
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={prevCity}
          className="text-white/80 hover:text-white transition-colors p-1 rounded hover:bg-white/10"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
        <h3 className="text-sm font-semibold opacity-90">Weather</h3>
        <button
          onClick={nextCity}
          className="text-white/80 hover:text-white transition-colors p-1 rounded hover:bg-white/10"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <div className="text-center mb-3">
        <div className="text-3xl mb-1">{currentCity.icon}</div>
        <div className="text-xl font-bold">{currentCity.temperature}°C</div>
        <div className="text-sm opacity-90">{currentCity.condition}</div>
        <div className="text-xs opacity-75 mt-1">{currentCity.name}</div>
      </div>

      <div className="space-y-1 text-sm">
        <div className="flex justify-between items-center">
          <span className="opacity-75">Humidity</span>
          <span>{currentCity.humidity}%</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="opacity-75">Wind</span>
          <span>{currentCity.windSpeed} km/h</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="opacity-75">Time</span>
          <span>{formatTime(currentTime)}</span>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-white/20">
        <div className="flex justify-between text-xs opacity-75">
          <span>Today</span>
          <span>{currentCity.condition}</span>
        </div>
        <div className="flex justify-between items-center mt-1">
          <span className="text-sm">H: {currentCity.high}°</span>
          <span className="text-sm">L: {currentCity.low}°</span>
        </div>
      </div>
    </div>
  );
};

export default WeatherWidget;
