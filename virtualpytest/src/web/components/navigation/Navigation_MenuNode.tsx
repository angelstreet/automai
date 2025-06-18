import React, { useState } from 'react';
import { Handle, Position, NodeProps, useReactFlow } from 'reactflow';

import { UI_BADGE_COLORS } from '../../config/validationColors';
import { useValidationColors } from '../../hooks/validation';
import { UINavigationNode } from '../../types/pages/Navigation_Types';

export const UIMenuNode: React.FC<NodeProps<UINavigationNode['data']>> = ({
  data,
  selected: _selected,
  id,
}) => {
  const [isScreenshotModalOpen, setIsScreenshotModalOpen] = useState(false);
  const [imageKey, setImageKey] = useState<string | number>(0); // Key to force image refresh
  const { getEdges } = useReactFlow();
  const currentEdges = getEdges();
  const { getNodeColors, getHandleColors } = useValidationColors(
    data.tree_id || 'default',
    currentEdges,
  );

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
  React.useEffect(() => {
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

  // Get handle colors for different positions
  const topLeftHandle = getHandleColors(id, 'topLeft', 'top-left-menu-source', 'menu');
  const topRightHandle = getHandleColors(id, 'topRight', 'top-right-menu-target', 'menu');
  const bottomLeftHandle = getHandleColors(id, 'bottomLeft', 'bottom-left-menu-target', 'menu');
  const bottomRightHandle = getHandleColors(id, 'bottomRight', 'bottom-right-menu-source', 'menu');
  const leftHandle = getHandleColors(id, 'leftTop', 'left-target', 'menu');

  const handleScreenshotDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
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
        background: nodeColors.background,
        border: `1px solid ${nodeColors.border}`,
        borderRadius: '8px',
        padding: '12px',
        minWidth: '200px',
        maxWidth: '200px',
        minHeight: '180px',
        fontSize: '12px',
        color: '#333',
        boxShadow: nodeColors.boxShadow,
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
      className={nodeColors.className || ''}
    >
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
            left: '4px',
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
          {/* Top-left: SOURCE for menu connections */}
          <Handle
            type="source"
            position={Position.Top}
            id="top-left-menu-source"
            isConnectable={true}
            isConnectableStart={true}
            isConnectableEnd={false}
            style={{
              background: topLeftHandle.background,
              width: '14px',
              height: '14px',
              border: '2px solid #fff',
              borderRadius: '50%',
              left: '30%',
              top: -5,
              boxShadow:
                topLeftHandle.boxShadow ||
                '0 3px 8px rgba(156, 39, 176, 0.4), 0 0 12px rgba(156, 39, 176, 0.3)',
            }}
            className={topLeftHandle.className}
          />

          {/* Top-right: TARGET for menu connections */}
          <Handle
            type="target"
            position={Position.Top}
            id="top-right-menu-target"
            isConnectable={true}
            isConnectableStart={false}
            isConnectableEnd={true}
            style={{
              background: topRightHandle.background,
              width: '14px',
              height: '14px',
              border: '2px solid #fff',
              borderRadius: '50%',
              left: '70%',
              top: -5,
              boxShadow: topRightHandle.boxShadow || '0 1px 2px rgba(0,0,0,0.3)',
              opacity: 0.8,
            }}
            className={topRightHandle.className}
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
            background: leftHandle.background,
            width: '14px',
            height: '14px',
            border: '2px solid #fff',
            borderRadius: '50%',
            left: -7,
            top: '50%',
            transform: 'translateY(-50%)',
            boxShadow: leftHandle.boxShadow || '0 2px 8px rgba(255, 193, 7, 0.4)',
            opacity: 1,
          }}
          className={leftHandle.className}
        />
      )}

      {/* Bottom Handles for Menu Navigation */}
      {/* Bottom-left: TARGET for menu connections */}
      <Handle
        type="target"
        position={Position.Bottom}
        id="bottom-left-menu-target"
        isConnectable={true}
        isConnectableStart={false}
        isConnectableEnd={true}
        style={{
          background: bottomLeftHandle.background,
          width: '14px',
          height: '14px',
          border: '2px solid #fff',
          borderRadius: '50%',
          left: '30%',
          bottom: -5,
          boxShadow: bottomLeftHandle.boxShadow || '0 1px 2px rgba(0,0,0,0.3)',
          opacity: 0.8,
        }}
        className={bottomLeftHandle.className}
      />

      {/* Bottom-right: SOURCE for menu connections */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom-right-menu-source"
        isConnectable={true}
        isConnectableStart={true}
        isConnectableEnd={false}
        style={{
          background: bottomRightHandle.background,
          width: '14px',
          height: '14px',
          border: '2px solid #fff',
          borderRadius: '50%',
          left: '70%',
          bottom: -5,
          boxShadow:
            bottomRightHandle.boxShadow ||
            '0 3px 8px rgba(76, 175, 80, 0.4), 0 0 12px rgba(76, 175, 80, 0.3)',
        }}
        className={bottomRightHandle.className}
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
            zIndex: 10000,
            cursor: 'pointer',
            paddingTop: '0px',
          }}
          onClick={closeModal}
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
