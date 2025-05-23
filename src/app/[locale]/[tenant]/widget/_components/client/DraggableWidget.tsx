'use client';

import React, { useState, useRef, ReactNode, useEffect } from 'react';

interface DraggableWidgetProps {
  children: ReactNode;
  position: { x: number; y: number };
  onPositionChange: (x: number, y: number) => void;
  containerBounds: { minX: number; minY: number; maxX: number; maxY: number };
}

const DraggableWidget: React.FC<DraggableWidgetProps> = ({
  children,
  position,
  onPositionChange,
  containerBounds,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const widgetRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    // Don't drag if clicking on the content area
    if (contentRef.current?.contains(e.target as Node)) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  // Global event listeners for mouse move and up
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;

      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;

      // Apply boundary constraints
      const constrainedX = Math.max(containerBounds.minX, Math.min(containerBounds.maxX, newX));
      const constrainedY = Math.max(containerBounds.minY, Math.min(containerBounds.maxY, newY));

      onPositionChange(constrainedX, constrainedY);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragOffset, containerBounds, onPositionChange]);

  return (
    <div
      ref={widgetRef}
      className={`absolute select-none transition-all duration-200 ${
        isDragging ? 'opacity-80 z-50 scale-105' : 'z-10'
      } ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: '224px',
        height: '256px',
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Drag zone overlay - transparent black shade around edges */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Top drag zone */}
        <div className="absolute top-0 left-0 right-0 h-4 bg-black/20 pointer-events-auto cursor-grab"></div>
        {/* Bottom drag zone */}
        <div className="absolute bottom-0 left-0 right-0 h-4 bg-black/20 pointer-events-auto cursor-grab"></div>
        {/* Left drag zone */}
        <div className="absolute top-4 bottom-4 left-0 w-4 bg-black/20 pointer-events-auto cursor-grab"></div>
        {/* Right drag zone */}
        <div className="absolute top-4 bottom-4 right-0 w-4 bg-black/20 pointer-events-auto cursor-grab"></div>
      </div>

      {/* Content area - positioned in the center, fully interactive */}
      <div
        ref={contentRef}
        className="absolute top-4 left-4 right-4 bottom-4 cursor-auto pointer-events-auto"
      >
        {children}
      </div>
    </div>
  );
};

export default DraggableWidget;
