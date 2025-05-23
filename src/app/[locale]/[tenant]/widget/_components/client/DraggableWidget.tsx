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
  const dragHandleRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    // Only allow dragging from the drag handle area
    if (!dragHandleRef.current?.contains(e.target as Node)) {
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
      }`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
    >
      {/* Smaller Drag Handle - positioned to avoid widget content */}
      <div
        ref={dragHandleRef}
        className={`absolute left-1/2 top-1 transform -translate-x-1/2 w-12 h-6 cursor-grab active:cursor-grabbing rounded-full flex items-center justify-center ${
          isDragging ? 'bg-blue-500/50' : 'bg-black/20 hover:bg-black/30'
        } transition-all duration-200`}
        onMouseDown={handleMouseDown}
        title="Drag to move widget"
      >
        {/* Drag indicator - smaller and centered */}
        <div className="flex space-x-0.5 opacity-60 hover:opacity-80 transition-opacity">
          <div className="w-1 h-1 bg-white rounded-full"></div>
          <div className="w-1 h-1 bg-white rounded-full"></div>
          <div className="w-1 h-1 bg-white rounded-full"></div>
        </div>
      </div>

      {children}
    </div>
  );
};

export default DraggableWidget;
