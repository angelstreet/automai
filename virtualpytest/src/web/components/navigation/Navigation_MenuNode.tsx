import React, { useState, useEffect } from 'react';
import { Handle, Position, NodeProps, useReactFlow } from 'reactflow';

import { UI_BADGE_COLORS } from '../../config/validationColors';
import { useNavigation } from '../../contexts/navigation/NavigationContext';
import { useValidationColors } from '../../hooks/validation';
import { UINavigationNode } from '../../types/pages/Navigation_Types';
import { getZIndex } from '../../utils/zIndexUtils';

export const UIMenuNode: React.FC<NodeProps<UINavigationNode['data']>> = ({
  data,
  selected: _selected,
  id,
}) => {
  const { currentNodeId } = useNavigation();
  const [isScreenshotModalOpen, setIsScreenshotModalOpen] = useState(false);
  const [imageKey, setImageKey] = useState<string | number>(0); // Key to force image refresh
  const { getEdges } = useReactFlow();
  const currentEdges = getEdges();
  const { getNodeColors } = useValidationColors(currentEdges);

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
        console.log(`[@component:UIMenuNode] Screenshot updated for node ${id}, forcing refresh`);

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

  // Get dynamic colors based on validation status
  const nodeColors = getNodeColors(id, 'menu', false);

  const handleScreenshotDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent node double-click from triggering
    e.preventDefault(); // Prevent default double-click behavior
    e.nativeEvent.stopImmediatePropagation(); // Stop all event propagation immediately

    console.log('[@component:UIMenuNode] Screenshot double-clicked, preventing node focus');

    if (screenshotUrl) {
      setIsScreenshotModalOpen(true);
    }
  };

  const closeModal = () => {
    setIsScreenshotModalOpen(false);
  };

  // Check if this is the current position
  const isCurrentPosition = currentNodeId === id;

  return (
    <div
      style={{
        background: nodeColors.background,
        border: isCurrentPosition ? '3px solid #2196f3' : `1px solid ${nodeColors.border}`,
        borderRadius: '8px',
        padding: '12px',
        minWidth: '200px',
        maxWidth: '200px',
        minHeight: '180px',
        fontSize: '12px',
        color: '#333',
        boxShadow: isCurrentPosition
          ? '0 0 15px rgba(33, 150, 243, 0.6), 0 0 25px rgba(33, 150, 243, 0.4), 0 2px 8px rgba(33, 150, 243, 0.3)'
          : nodeColors.boxShadow,
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        animation: isCurrentPosition ? 'currentPositionPulse 2s ease-in-out infinite' : 'none',
      }}
      className={nodeColors.className || ''}
    >
      {/* Current Position Indicator */}
      {isCurrentPosition && (
        <div
          style={{
            position: 'absolute',
            top: '4px',
            [data.is_root ? 'right' : 'left']: data.is_root ? '50px' : '4px', // Position to right of ROOT badge for root nodes
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

      {/* Menu Type Indicator */}
      <div
        style={{
          position: 'absolute',
          top: '4px',
          right: '4px',
          backgroundColor: UI_BADGE_COLORS.menu.background,
          color: UI_BADGE_COLORS.menu.textColor,
          fontSize: '10px',
          fontWeight: 'bold',
          padding: '2px 6px',
          borderRadius: '4px',
          zIndex: 10,
        }}
      >
        MENU
      </div>

      {/* Root Node Indicator */}
      {data.is_root && (
        <div
          style={{
            position: 'absolute',
            top: '4px',
            left: isCurrentPosition ? '60px' : '4px', // Adjust position if current position indicator is shown
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

      {/* Top Handles for Menu Navigation - Only show for non-root nodes */}
      {!data.is_root && (
        <>
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
              top: -7,
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
              top: -7,
              cursor: 'crosshair',
              zIndex: 10,
              opacity: 0,
            }}
          />
        </>
      )}

      {/* Left Handle - Only for root nodes */}
      {data.is_root && (
        <Handle
          type="target"
          position={Position.Left}
          id="left-target"
          isConnectable={true}
          isConnectableStart={false}
          isConnectableEnd={true}
          style={{
            background: '#ffc107',
            border: '2px solid #fff',
            width: '16px',
            height: '16px',
            borderRadius: '50%',
            left: -7,
            top: '50%',
            transform: 'translateY(-50%)',
            cursor: 'crosshair',
            zIndex: 10,
          }}
        />
      )}

      {/* Bottom Handles for Menu Navigation - Overlapping */}
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
          bottom: -7,
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
          bottom: -7,
          cursor: 'crosshair',
          zIndex: 10,
          opacity: 0,
        }}
      />

      {/* Header with menu name */}
      <div
        style={{
          padding: '4px',
          borderBottom: '1px solid #eee',
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
            color: nodeColors.textColor,
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
            color: nodeColors.textColor,
            textTransform: 'uppercase',
          }}
        >
          Menu
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
          cursor: screenshotUrl ? 'pointer' : 'pointer',
        }}
        onDoubleClick={handleScreenshotDoubleClick}
        title={screenshotUrl ? 'Double-click to view full size' : 'Menu - Double-click to explore'}
      >
        {!screenshotUrl && (
          <div
            style={{
              fontSize: '11px',
              color: '#666',
              textAlign: 'center',
            }}
          >
            Menu - Double-click to explore
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
              '[@component:UIMenuNode] Modal overlay double-clicked, preventing node focus',
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
            onClick={(e) => e.stopPropagation()}
            onDoubleClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              e.nativeEvent.stopImmediatePropagation();
              console.log(
                '[@component:UIMenuNode] Modal content double-clicked, preventing node focus',
              );
            }}
          >
            <img
              src={screenshotUrl}
              alt={`Screenshot of ${data.label}`}
              style={{
                width: 'auto',
                height: 'auto',
                maxWidth: '100%',
                maxHeight: 'calc(85vh - 60px)',
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

            <div
              style={{
                marginTop: '0px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0px',
                height: '40px',
                margin: '0px 0 0 0',
                padding: 0,
              }}
            >
              <div
                style={{
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: '500',
                  flex: 1,
                }}
              >
                {data.label} - Menu
              </div>

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
