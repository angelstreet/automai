import React, { useState } from 'react';
import { Handle, Position, NodeProps, useReactFlow } from 'reactflow';
import { UINavigationNode } from '../../types/navigationTypes';
import { useValidationColors } from '../../hooks/useValidationColors';

export const UIMenuNode: React.FC<NodeProps<UINavigationNode['data']>> = ({ 
  data, 
  selected,
  id
}) => {
  const [isScreenshotModalOpen, setIsScreenshotModalOpen] = useState(false);
  const { getEdges } = useReactFlow();
  const currentEdges = getEdges();
  const { getNodeColors, getHandleColors } = useValidationColors(data.tree_id || 'default', currentEdges);

  // Get dynamic colors based on validation status
  const nodeColors = getNodeColors(id, 'menu', false);
  
  // Get handle colors for different positions
  const topLeftHandle = getHandleColors(id, 'topLeft', 'top-left-menu-source');
  const topRightHandle = getHandleColors(id, 'topRight', 'top-right-menu-target');
  const bottomLeftHandle = getHandleColors(id, 'bottomLeft', 'bottom-left-menu-target');
  const bottomRightHandle = getHandleColors(id, 'bottomRight', 'bottom-right-menu-source');

  const handleScreenshotDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (data.screenshot) {
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
          backgroundColor: nodeColors.badgeColor,
          color: 'white',
          fontSize: '10px',
          fontWeight: 'bold',
          padding: '2px 6px',
          borderRadius: '4px',
          zIndex: 10,
        }}
      >
        MENU
      </div>

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
              boxShadow: topLeftHandle.boxShadow || '0 3px 8px rgba(156, 39, 176, 0.4), 0 0 12px rgba(156, 39, 176, 0.3)',
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
            background: '#fff',
            width: '14px', 
            height: '14px',
            border: '2px solid #4caf50',
            borderRadius: '50%',
            left: -7,
            top: '50%',
            transform: 'translateY(-50%)',
            boxShadow: '0 1px 2px rgba(0,0,0,0.3)',
            opacity: 1,
          }}
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
          boxShadow: bottomRightHandle.boxShadow || '0 3px 8px rgba(76, 175, 80, 0.4), 0 0 12px rgba(76, 175, 80, 0.3)',
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
          backgroundColor: data.screenshot ? 'transparent' : '#f5f5f5',
          backgroundImage: data.screenshot ? `url(${data.screenshot})` : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          cursor: data.screenshot ? 'pointer' : 'pointer',
        }}
        onDoubleClick={handleScreenshotDoubleClick}
        title={data.screenshot ? 'Double-click to view full size' : 'Menu - Double-click to explore'}
      >
        {!data.screenshot && (
          <div style={{ 
            fontSize: '11px', 
            color: '#666',
            textAlign: 'center',
          }}>
            Menu - Double-click to explore
          </div>
        )}
      </div>

      {/* Screenshot Modal */}
      {isScreenshotModalOpen && data.screenshot && (
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
              src={data.screenshot}
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