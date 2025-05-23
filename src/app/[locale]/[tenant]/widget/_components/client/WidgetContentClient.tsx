'use client';

import React, { useState, useCallback, useEffect } from 'react';

import CalculatorWidget from './CalculatorWidget';
import ClockWidget from './ClockWidget';
import CryptoWidget from './CryptoWidget';
import DraggableWidget from './DraggableWidget';
import StocksWidget from './StocksWidget';
import WeatherWidget from './WeatherWidget';

/**
 * Client component for displaying and managing draggable widgets
 */
export { WidgetContentClient as default, WidgetContentClient };

interface WidgetPosition {
  id: string;
  x: number;
  y: number;
}

const WIDGET_WIDTH = 224; // w-56 = 224px
const BASE_WIDGET_HEIGHT = 256; // h-64 = 256px (base height)

// Widget-specific height adjustments
const WIDGET_HEIGHTS = {
  calculator: BASE_WIDGET_HEIGHT + 32, // h-72 = 288px (needs more space for buttons)
  weather: BASE_WIDGET_HEIGHT + 16, // h-68 = 272px (compact layout)
  clock: BASE_WIDGET_HEIGHT + 24, // h-70 = 280px (medium space for analog clock)
  crypto: BASE_WIDGET_HEIGHT + 40, // h-74 = 296px (5 items need more space)
  stocks: BASE_WIDGET_HEIGHT + 40, // h-74 = 296px (5 items need more space)
};

const CONTAINER_PADDING = 32; // p-8 = 32px

function WidgetContentClient() {
  const [containerBounds, setContainerBounds] = useState({
    minX: 0,
    minY: 0,
    maxX: 800, // fallback
    maxY: 600, // fallback
  });

  const [widgets, setWidgets] = useState<WidgetPosition[]>([
    { id: 'calculator', x: 50, y: 10 },
    { id: 'weather', x: 300, y: 50 },
    { id: 'clock', x: 550, y: 10 },
    { id: 'crypto', x: 800, y: 50 },
    { id: 'stocks', x: 150, y: 200 },
  ]);

  // Calculate container bounds on client side
  useEffect(() => {
    const updateBounds = () => {
      if (typeof window !== 'undefined') {
        const containerWidth = window.innerWidth - CONTAINER_PADDING * 2;
        const containerHeight = window.innerHeight - CONTAINER_PADDING * 2;
        const maxWidgetHeight = Math.max(...Object.values(WIDGET_HEIGHTS));
        setContainerBounds({
          minX: 0,
          minY: 0,
          maxX: Math.max(0, containerWidth - WIDGET_WIDTH),
          maxY: Math.max(0, containerHeight - maxWidgetHeight),
        });
      }
    };

    // Set initial bounds
    updateBounds();

    // Update bounds on window resize
    window.addEventListener('resize', updateBounds);
    return () => window.removeEventListener('resize', updateBounds);
  }, []);

  const handleWidgetDrag = useCallback(
    (widgetId: string, newX: number, newY: number) => {
      const constrainedX = Math.max(containerBounds.minX, Math.min(containerBounds.maxX, newX));
      const constrainedY = Math.max(containerBounds.minY, Math.min(containerBounds.maxY, newY));

      setWidgets((prevWidgets) =>
        prevWidgets.map((widget) =>
          widget.id === widgetId ? { ...widget, x: constrainedX, y: constrainedY } : widget,
        ),
      );
    },
    [containerBounds],
  );

  const getWidgetPosition = (widgetId: string) => {
    return widgets.find((w) => w.id === widgetId) || { x: 0, y: 0 };
  };

  return (
    <div className="relative w-full h-screen bg-transparent p-8 overflow-hidden">
      {/* Widget Container */}
      <div className="relative w-full h-full">
        {/* Calculator Widget */}
        <DraggableWidget
          position={getWidgetPosition('calculator')}
          onPositionChange={(x, y) => handleWidgetDrag('calculator', x, y)}
          containerBounds={containerBounds}
          height={WIDGET_HEIGHTS.calculator}
        >
          <CalculatorWidget />
        </DraggableWidget>

        {/* Weather Widget */}
        <DraggableWidget
          position={getWidgetPosition('weather')}
          onPositionChange={(x, y) => handleWidgetDrag('weather', x, y)}
          containerBounds={containerBounds}
          height={WIDGET_HEIGHTS.weather}
        >
          <WeatherWidget />
        </DraggableWidget>

        {/* Clock Widget */}
        <DraggableWidget
          position={getWidgetPosition('clock')}
          onPositionChange={(x, y) => handleWidgetDrag('clock', x, y)}
          containerBounds={containerBounds}
          height={WIDGET_HEIGHTS.clock}
        >
          <ClockWidget />
        </DraggableWidget>

        {/* Crypto Widget */}
        <DraggableWidget
          position={getWidgetPosition('crypto')}
          onPositionChange={(x, y) => handleWidgetDrag('crypto', x, y)}
          containerBounds={containerBounds}
          height={WIDGET_HEIGHTS.crypto}
        >
          <CryptoWidget />
        </DraggableWidget>

        {/* Stocks Widget */}
        <DraggableWidget
          position={getWidgetPosition('stocks')}
          onPositionChange={(x, y) => handleWidgetDrag('stocks', x, y)}
          containerBounds={containerBounds}
          height={WIDGET_HEIGHTS.stocks}
        >
          <StocksWidget />
        </DraggableWidget>
      </div>
    </div>
  );
}
