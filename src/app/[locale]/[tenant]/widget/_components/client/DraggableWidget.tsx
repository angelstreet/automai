'use client';

import React, { useState, useRef, ReactNode, useEffect } from 'react';

interface DraggableWidgetProps {
  children: ReactNode;
  position: { x: number; y: number };
  onPositionChange: (x: number, y: number) => void;
  containerBounds: { minX: number; minY: number; maxX: number; maxY: number };
  height?: number; // Optional height prop
}

const DraggableWidget: React.FC<DraggableWidgetProps> = ({
  children,
  position,
  onPositionChange,
  containerBounds,
  height = 256, // Default height
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
      className={`absolute select-none ${
        isDragging ? 'z-50' : 'z-10'
      } ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: '224px',
        height: `${height}px`,
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Widget content with internal drag zones */}
      <div className="relative w-full h-full">
        {/* Content area - positioned to fill the entire widget with higher z-index */}
        <div ref={contentRef} className="absolute inset-0 cursor-auto pointer-events-auto z-20">
          {children}
        </div>

        {/* Internal drag zones overlay - dark overlays inside the widget, subtle */}
        <div className="absolute inset-0 pointer-events-none rounded-lg overflow-hidden z-30">
          {/* Top drag zone */}
          <div className="absolute top-0 left-0 right-0 h-2 bg-black/20 pointer-events-auto cursor-grab"></div>
          {/* Bottom drag zone */}
          <div className="absolute bottom-0 left-0 right-0 h-2 bg-black/20 pointer-events-auto cursor-grab"></div>
          {/* Left drag zone */}
          <div className="absolute top-2 bottom-2 left-0 w-2 bg-black/20 pointer-events-auto cursor-grab"></div>
          {/* Right drag zone */}
          <div className="absolute top-2 bottom-2 right-0 w-2 bg-black/20 pointer-events-auto cursor-grab"></div>
        </div>
      </div>
    </div>
  );
};

export default DraggableWidget;
