import React, { useState, useEffect } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

import { NODE_TYPE_COLORS, UI_BADGE_COLORS } from '../../config/validationColors';
import { useNavigation } from '../../contexts/navigation/NavigationContext';
import type { UINavigationNode as UINavigationNodeType } from '../../types/pages/Navigation_Types';
import { getZIndex } from '../../utils/zIndexUtils';

export const UINavigationNode: React.FC<NodeProps<UINavigationNodeType['data']>> = ({
  data,
  selected,
  id,
}) => {
  const { currentNodeId } = useNavigation();
  const [isScreenshotModalOpen, setIsScreenshotModalOpen] = useState(false);
  const [imageKey, setImageKey] = useState<string | number>(0); // Key to force image refresh

  // Use screenshot URL with aggressive cache-busting
  const screenshotUrl = React.useMemo(() => {
    if (!data.screenshot) return null;

    // Use multiple cache-busting parameters to ensure fresh load
    const baseUrl = data.screenshot.split('?')[0]; // Remove existing params
    const timestamp = data.screenshot_timestamp || Date.now();
    const randomKey = imageKey || Math.random().toString(36).substr(2, 9);

    return `${baseUrl}?v=${timestamp}&key=${randomKey}&cb=${Date.now()}`;
  }, [data.screenshot, data.screenshot_timestamp, imageKey]);

  // Listen for screenshot update events and force immediate refresh
  useEffect(() => {
    const handleScreenshotUpdate = (event: CustomEvent) => {
      if (event.detail.nodeId === id) {
        console.log(
          `[@component:UINavigationNode] Screenshot updated for node ${id}, forcing refresh`,
        );

        // Use cache-buster from event for immediate refresh
        if (event.detail.cacheBuster) {
          setImageKey(event.detail.cacheBuster);
        } else {
          setImageKey(Date.now().toString() + Math.random().toString(36).substr(2, 9));
        }
      }
    };

    window.addEventListener('nodeScreenshotUpdated', handleScreenshotUpdate as EventListener);
    return () => {
      window.removeEventListener('nodeScreenshotUpdated', handleScreenshotUpdate as EventListener);
    };
  }, [id]);

  // Check if this node is a root node (should only be true for actual root nodes)
  const isRootNode = data.is_root === true;
  // Check if this is an entry point node
  const isEntryNode = data.type === 'entry';
  // Check if this is the current position
  const isCurrentPosition = currentNodeId === id;

  // Entry node styling - small circular point
  if (isEntryNode) {
    const entryColors = NODE_TYPE_COLORS.entry;
    return (
      <div
        style={{
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          background: entryColors.background,
          border: isCurrentPosition ? '3px solid #2196f3' : `3px solid ${entryColors.border}`,
          boxShadow: isCurrentPosition
            ? '0 0 15px rgba(33, 150, 243, 0.6), 0 0 25px rgba(33, 150, 243, 0.4), 0 2px 8px rgba(33, 150, 243, 0.3)'
            : selected
              ? '0 4px 12px rgba(211, 47, 47, 0.6)'
              : '0 2px 8px rgba(211, 47, 47, 0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: entryColors.textColor,
          fontSize: '16px',
          fontWeight: 'bold',
          position: 'relative',
          cursor: 'pointer',
          animation: isCurrentPosition ? 'currentPositionPulse 2s ease-in-out infinite' : 'none',
        }}
        title={
          isCurrentPosition
            ? 'Entry Point - Current Position'
            : 'Entry Point - Click to edit entry method'
        }
      >
        ⚡{/* Single source handle for outgoing connections */}
        <Handle
          type="source"
          position={Position.Right}
          id="entry-source"
          isConnectable={false}
          isConnectableStart={false}
          isConnectableEnd={false}
          style={{
            background: entryColors.border,
            width: '12px',
            height: '12px',
            border: '2px solid #fff',
            borderRadius: '50%',
            right: -6,
            top: '50%',
            transform: 'translateY(-50%)',
            opacity: 1,
            cursor: 'not-allowed',
          }}
        />
      </div>
    );
  }

  // Root node styling - more prominent than normal nodes
  const rootNodeStyle = {
    background: 'linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%)',
    border: '2px solid #d32f2f',
    boxShadow: selected ? '0 4px 12px rgba(211, 47, 47, 0.4)' : '0 2px 8px rgba(211, 47, 47, 0.3)',
  };

  // Current position styling - blue theme
  const currentPositionStyle = {
    border: '3px solid #2196f3',
    boxShadow: selected
      ? '0 0 20px rgba(33, 150, 243, 0.8), 0 0 30px rgba(33, 150, 243, 0.6), 0 4px 12px rgba(33, 150, 243, 0.4)'
      : '0 0 15px rgba(33, 150, 243, 0.6), 0 0 25px rgba(33, 150, 243, 0.4), 0 2px 8px rgba(33, 150, 243, 0.3)',
    animation: 'currentPositionPulse 2s ease-in-out infinite',
  };

  // Normal node styling - based on node type
  const getNodeColor = (type: string) => {
    switch (type) {
      case 'screen':
        return '#e3f2fd';
      case 'dialog':
        return '#f3e5f5';
      case 'popup':
        return '#fff3e0';
      case 'overlay':
        return '#e8f5e8';
      case 'menu':
        return '#fff8e1';
      default:
        return '#f5f5f5';
    }
  };

  const getNodeBorderColor = (type: string) => {
    switch (type) {
      case 'screen':
        return '#2196f3';
      case 'dialog':
        return '#9c27b0';
      case 'popup':
        return '#ff9800';
      case 'overlay':
        return '#4caf50';
      case 'menu':
        return '#ffc107';
      default:
        return '#757575';
    }
  };

  const handleScreenshotDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent node double-click from triggering
    e.preventDefault(); // Prevent default double-click behavior
    e.nativeEvent.stopImmediatePropagation(); // Stop all event propagation immediately

    console.log('[@component:UINavigationNode] Screenshot double-clicked, preventing node focus');

    if (screenshotUrl) {
      setIsScreenshotModalOpen(true);
    }
  };

  const closeModal = () => {
    setIsScreenshotModalOpen(false);
  };

  return (
    <div
      style={{
        background: isRootNode ? rootNodeStyle.background : getNodeColor(data.type),
        border: isCurrentPosition
          ? currentPositionStyle.border
          : isRootNode
            ? rootNodeStyle.border
            : `1px solid ${getNodeBorderColor(data.type)}`,
        borderRadius: '8px',
        padding: '12px',
        minWidth: '200px',
        maxWidth: '200px',
        minHeight: '180px',
        fontSize: '12px',
        color: '#333',
        boxShadow: isCurrentPosition
          ? currentPositionStyle.boxShadow
          : isRootNode
            ? rootNodeStyle.boxShadow
            : selected
              ? '0 4px 12px rgba(0,0,0,0.2)'
              : '0 2px 4px rgba(0,0,0,0.1)',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        animation: isCurrentPosition ? currentPositionStyle.animation : 'none',
      }}
    >
      {/* Current Position Indicator */}
      {isCurrentPosition && (
        <div
          style={{
            position: 'absolute',
            top: '4px',
            [isRootNode ? 'right' : 'left']: isRootNode ? '50px' : '4px', // Position to right of ROOT badge for root nodes
            backgroundColor: '#2196f3',
            color: 'white',
            fontSize: '14px',
            fontWeight: 'bold',
            padding: '4px 6px',
            borderRadius: '4px',
            zIndex: 15,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: '24px',
            minHeight: '24px',
          }}
        >
          ↓
        </div>
      )}

      {/* Root Node Indicator */}
      {isRootNode && (
        <div
          style={{
            position: 'absolute',
            top: '4px',
            right: '4px',
            backgroundColor: UI_BADGE_COLORS.root.background,
            color: UI_BADGE_COLORS.root.textColor,
            fontSize: '10px',
            fontWeight: 'bold',
            padding: '2px 6px',
            borderRadius: '4px',
            zIndex: 10,
          }}
        >
          ROOT
        </div>
      )}

      {/* Left Handles - Overlapping for Bidirectional Effect */}
      {/* Left: TARGET for receiving connections */}
      <Handle
        type="target"
        position={Position.Left}
        id="left-target"
        isConnectable={true}
        isConnectableStart={false}
        isConnectableEnd={true}
        style={{
          background: '#1976d2',
          border: '2px solid #fff',
          width: '16px',
          height: '16px',
          borderRadius: '50%',
          left: -5,
          top: '50%',
          transform: 'translateY(-50%)',
          cursor: 'crosshair',
          zIndex: 11,
        }}
      />

      {/* Left: SOURCE for sending connections - same position, lower z-index */}
      <Handle
        type="source"
        position={Position.Left}
        id="left-source"
        isConnectable={true}
        isConnectableStart={true}
        isConnectableEnd={false}
        style={{
          background: '#ff5722',
          border: '2px solid #fff',
          width: '16px',
          height: '16px',
          borderRadius: '50%',
          left: -5,
          top: '50%',
          transform: 'translateY(-50%)',
          cursor: 'crosshair',
          zIndex: 10,
          opacity: 0,
        }}
      />

      {/* Right Handles - Overlapping for Bidirectional Effect */}
      {/* Right: SOURCE for sending connections */}
      <Handle
        type="source"
        position={Position.Right}
        id="right-source"
        isConnectable={true}
        isConnectableStart={true}
        isConnectableEnd={false}
        style={{
          background: '#1976d2',
          border: '2px solid #fff',
          width: '16px',
          height: '16px',
          borderRadius: '50%',
          right: -5,
          top: '50%',
          transform: 'translateY(-50%)',
          cursor: 'crosshair',
          zIndex: 11,
        }}
      />

      {/* Right: TARGET for receiving connections - same position, lower z-index */}
      <Handle
        type="target"
        position={Position.Right}
        id="right-target"
        isConnectable={true}
        isConnectableStart={false}
        isConnectableEnd={true}
        style={{
          background: '#ff5722',
          border: '2px solid #fff',
          width: '16px',
          height: '16px',
          borderRadius: '50%',
          right: -5,
          top: '50%',
          transform: 'translateY(-50%)',
          cursor: 'crosshair',
          zIndex: 10,
          opacity: 0,
        }}
      />

      {/* MENU NAVIGATION HANDLES - Overlapping for Bidirectional Effect */}
      {/* Top Handles - Overlapping */}
      {/* Top: SOURCE for menu connections */}
      <Handle
        type="source"
        position={Position.Top}
        id="top-left-menu-source"
        isConnectable={true}
        isConnectableStart={true}
        isConnectableEnd={false}
        style={{
          background: '#9c27b0',
          border: '2px solid #fff',
          width: '16px',
          height: '16px',
          borderRadius: '50%',
          left: '50%',
          transform: 'translateX(-50%)',
          top: -5,
          cursor: 'crosshair',
          zIndex: 11,
        }}
      />

      {/* Top: TARGET for menu connections - same position, lower z-index */}
      <Handle
        type="target"
        position={Position.Top}
        id="top-right-menu-target"
        isConnectable={true}
        isConnectableStart={false}
        isConnectableEnd={true}
        style={{
          background: '#4caf50',
          border: '2px solid #fff',
          width: '16px',
          height: '16px',
          borderRadius: '50%',
          left: '50%',
          transform: 'translateX(-50%)',
          top: -5,
          cursor: 'crosshair',
          zIndex: 10,
          opacity: 0,
        }}
      />

      {/* Bottom Handles - Overlapping */}
      {/* Bottom: TARGET for menu connections */}
      <Handle
        type="target"
        position={Position.Bottom}
        id="bottom-left-menu-target"
        isConnectable={true}
        isConnectableStart={false}
        isConnectableEnd={true}
        style={{
          background: '#9c27b0',
          border: '2px solid #fff',
          width: '16px',
          height: '16px',
          borderRadius: '50%',
          left: '50%',
          transform: 'translateX(-50%)',
          bottom: -5,
          cursor: 'crosshair',
          zIndex: 11,
        }}
      />

      {/* Bottom: SOURCE for menu connections - same position, lower z-index */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom-right-menu-source"
        isConnectable={true}
        isConnectableStart={true}
        isConnectableEnd={false}
        style={{
          background: '#4caf50',
          border: '2px solid #fff',
          width: '16px',
          height: '16px',
          borderRadius: '50%',
          left: '50%',
          transform: 'translateX(-50%)',
          bottom: -5,
          cursor: 'crosshair',
          zIndex: 10,
          opacity: 0,
        }}
      />

      {/* Header with node name and type */}
      <div
        style={{
          padding: '4px',
          borderBottom: isRootNode ? '1px solid #ef5350' : '1px solid #eee',
          minHeight: '10px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            fontWeight: 'bold',
            textAlign: 'center',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            color: isRootNode ? '#d32f2f' : 'black',
            marginBottom: '0px',
            fontSize: '18px',
          }}
        >
          {data.label}
        </div>
        <div
          style={{
            textAlign: 'center',
            fontSize: '10px',
            color: isRootNode ? '#ef5350' : '#666',
            textTransform: 'uppercase',
          }}
        >
          {data.type}
        </div>
      </div>

      {/* Screenshot area */}
      <div
        style={{
          flex: 1,
          backgroundColor: screenshotUrl ? 'transparent' : '#f5f5f5',
          backgroundImage: screenshotUrl ? `url(${screenshotUrl})` : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          cursor: screenshotUrl ? 'pointer' : data.type === 'menu' ? 'pointer' : 'default',
        }}
        onDoubleClick={handleScreenshotDoubleClick}
        title={
          screenshotUrl
            ? 'Double-click to view full size'
            : data.type === 'menu'
              ? 'Double-click to navigate to nested tree'
              : ''
        }
      >
        {!screenshotUrl && (
          <div
            style={{
              fontSize: '11px',
              color: '#666',
              textAlign: 'center',
            }}
          >
            {data.type === 'menu' ? 'Menu - Double-click to explore' : 'No Screenshot'}
          </div>
        )}
      </div>

      {/* Screenshot Modal */}
      {isScreenshotModalOpen && screenshotUrl && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            zIndex: getZIndex('SCREENSHOT_MODAL'),
            cursor: 'pointer',
            paddingTop: '0px',
          }}
          onClick={closeModal}
          onDoubleClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            e.nativeEvent.stopImmediatePropagation();
            console.log(
              '[@component:UINavigationNode] Modal overlay double-clicked, preventing node focus',
            );
          }}
        >
          <div
            style={{
              position: 'relative',
              maxWidth: '90vw',
              maxHeight: '80vh',
              display: 'flex',
              flexDirection: 'column',
              margin: 0,
              padding: 0,
            }}
            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking the image
            onDoubleClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              e.nativeEvent.stopImmediatePropagation();
              console.log(
                '[@component:UINavigationNode] Modal content double-clicked, preventing node focus',
              );
            }}
          >
            {/* Full-size screenshot */}
            <img
              src={screenshotUrl}
              alt={`Screenshot of ${data.label}`}
              style={{
                width: 'auto',
                height: 'auto',
                maxWidth: '100%',
                maxHeight: 'calc(85vh - 60px)', // Account for caption area
                objectFit: 'contain',
                borderRadius: '8px',
                boxShadow: '0 4px 0px rgba(0, 0, 0, 0.5)',
                display: 'block',
                margin: 0,
                padding: 0,
                cursor: 'pointer',
              }}
              onDoubleClick={closeModal}
              title="Double-click to close"
            />

            {/* Caption and Close Button */}
            <div
              style={{
                marginTop: '0px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0px',
                height: '40px', // Fixed height for consistent layout
                margin: '0px 0 0 0',
                padding: 0,
              }}
            >
              {/* Image caption */}
              <div
                style={{
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: '500',
                  flex: 1,
                }}
              >
                {data.label} - {data.type}
              </div>

              {/* Close button */}
              <button
                onClick={closeModal}
                style={{
                  background: 'rgba(255, 255, 255, 0.9)',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '4px 8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  color: '#333',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.9)';
                }}
                title="Close"
              >
                <span style={{ fontSize: '14px' }}>×</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
