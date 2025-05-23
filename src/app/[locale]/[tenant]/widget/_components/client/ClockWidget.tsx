'use client';

import React, { useState, useEffect } from 'react';

const ClockWidget = () => {
  const [currentCityIndex, setCurrentCityIndex] = useState(3); // Start with Zurich
  const [, setTrigger] = useState(0); // Force re-render trigger

  useEffect(() => {
    const timer = setInterval(() => {
      setTrigger((prev) => prev + 1); // Force re-render every second
    }, 1000); // Update every second

    return () => clearInterval(timer);
  }, []);

  // Cities with their time zones
  const cities = [
    {
      name: 'Paris',
      country: 'FR',
      timezone: 'Europe/Paris',
    },
    {
      name: 'Marseille',
      country: 'FR',
      timezone: 'Europe/Paris',
    },
    {
      name: 'Rouen',
      country: 'FR',
      timezone: 'Europe/Paris',
    },
    {
      name: 'Zurich',
      country: 'CH',
      timezone: 'Europe/Zurich',
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
      second: '2-digit',
      hour12: false,
      timeZone: currentCity.timezone,
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: currentCity.timezone,
    });
  };

  const getLocalTime = () => {
    return new Date().toLocaleString('en-US', { timeZone: currentCity.timezone });
  };

  const getCityTime = () => {
    const localTime = new Date(getLocalTime());
    return localTime;
  };

  return (
    <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg shadow-lg w-56 min-h-[280px] h-full text-white relative p-4">
      <div className="flex items-center justify-between mb-3">
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
        <h3 className="text-sm font-semibold opacity-90">Clock</h3>
        <button
          onClick={nextCity}
          className="text-white/80 hover:text-white transition-colors p-1 rounded hover:bg-white/10"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <div className="text-center space-y-2">
        {/* Digital Time Display */}
        <div className="font-mono text-2xl font-bold tracking-wider">
          {formatTime(getCityTime())}
        </div>

        {/* City and Country */}
        <div className="text-sm opacity-90">
          {currentCity.name}, {currentCity.country}
        </div>

        {/* Date Display */}
        <div className="text-xs opacity-75 leading-relaxed">{formatDate(getCityTime())}</div>

        {/* Time Zone */}
        <div className="text-xs opacity-60">{currentCity.timezone}</div>
      </div>

      {/* Simple Analog Clock Representation */}
      <div className="mt-4 flex justify-center">
        <div className="relative w-20 h-20 border-2 border-white/30 rounded-full">
          {/* Clock face dots */}
          <div className="absolute top-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-white/50 rounded-full"></div>
          <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-white/50 rounded-full"></div>
          <div className="absolute left-1 top-1/2 transform -translate-y-1/2 w-1 h-1 bg-white/50 rounded-full"></div>
          <div className="absolute right-1 top-1/2 transform -translate-y-1/2 w-1 h-1 bg-white/50 rounded-full"></div>

          {/* Center dot */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full"></div>

          {/* Hour hand */}
          <div
            className="absolute top-1/2 left-1/2 origin-bottom bg-white rounded-full"
            style={{
              width: '2px',
              height: '16px',
              transform: `translate(-50%, -100%) rotate(${(getCityTime().getHours() % 12) * 30 + getCityTime().getMinutes() * 0.5}deg)`,
            }}
          ></div>

          {/* Minute hand */}
          <div
            className="absolute top-1/2 left-1/2 origin-bottom bg-white/80 rounded-full"
            style={{
              width: '1px',
              height: '20px',
              transform: `translate(-50%, -100%) rotate(${getCityTime().getMinutes() * 6}deg)`,
            }}
          ></div>
        </div>
      </div>
    </div>
  );
};

export default ClockWidget;
