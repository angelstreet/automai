import React, { useState } from 'react';
import { Handle, Position, NodeProps, useReactFlow } from 'reactflow';
import { UINavigationNode as UINavigationNodeType } from '../../types/navigationTypes';
import { useValidationColors } from '../../hooks/useValidationColors';

export const UINavigationNode: React.FC<NodeProps<UINavigationNodeType['data']>> = ({ 
  data, 
  selected,
  id
}) => {
  const [isScreenshotModalOpen, setIsScreenshotModalOpen] = useState(false);
  const { getEdges } = useReactFlow();
  const currentEdges = getEdges();
  const { getNodeColors, getHandleColors } = useValidationColors(data.treeId || 'default', currentEdges);

  // Check if this node is a root node (should only be true for actual root nodes)
  const isRootNode = data.is_root === true;
  // Check if this is an entry point node
  const isEntryNode = data.type === 'entry';
  
  // Entry node styling - small circular point
  if (isEntryNode) {
    const entryColors = getNodeColors(id, 'entry', false);
    
    return (
      <div
        style={{
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          background: entryColors.background,
          border: `3px solid ${entryColors.border}`,
          boxShadow: entryColors.boxShadow || '0 2px 8px rgba(211, 47, 47, 0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: entryColors.textColor,
          fontSize: '16px',
          fontWeight: 'bold',
          position: 'relative',
          cursor: 'pointer',
        }}
        className={entryColors.className}
        title="Entry Point - Click to edit entry method"
      >
        ⚡
        
        {/* Single source handle for outgoing connections */}
        <Handle 
          type="source" 
          position={Position.Right} 
          id="entry-source"
          isConnectable={true}
          isConnectableStart={true}
          isConnectableEnd={false}
          style={{ 
            background: '#fff',
            width: '12px', 
            height: '12px',
            border: `2px solid ${entryColors.border}`,
            borderRadius: '50%',
            right: -6,
            top: '50%',
            transform: 'translateY(-50%)',
            opacity: 1,
            cursor: 'pointer',
          }} 
        />
      </div>
    );
  }
  
  // Get dynamic colors based on validation status
  const nodeColors = getNodeColors(id, data.type as any, isRootNode);
  
  // Get handle colors for different positions
  const leftTopHandle = getHandleColors(id, 'leftTop', 'left-top-target');
  const leftBottomHandle = getHandleColors(id, 'leftBottom', 'left-bottom-source');
  const rightTopHandle = getHandleColors(id, 'rightTop', 'right-top-source');
  const rightBottomHandle = getHandleColors(id, 'rightBottom', 'right-bottom-target');
  const topLeftHandle = getHandleColors(id, 'topLeft', 'top-left-menu-source');
  const topRightHandle = getHandleColors(id, 'topRight', 'top-right-menu-target');
  const bottomLeftHandle = getHandleColors(id, 'bottomLeft', 'bottom-left-menu-target');
  const bottomRightHandle = getHandleColors(id, 'bottomRight', 'bottom-right-menu-source');

  const handleScreenshotDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent node double-click from triggering
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
        border: `${isRootNode ? '2px' : '1px'} solid ${nodeColors.border}`,
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
      className={`${nodeColors.className || ''} ${isRootNode ? 'root-node' : ''}`}
    >
      {/* Root Node Indicator */}
      {isRootNode && (
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
          ROOT
        </div>
      )}
      
      {/* Left Handles */}
      {/* Top-left: TARGET for receiving connections from right-side nodes */}
      <Handle 
        type="target" 
        position={Position.Left} 
        id="left-top-target"
        isConnectable={true}
        isConnectableStart={false}
        isConnectableEnd={true}
        style={{ 
          background: leftTopHandle.background,
          width: '14px', 
          height: '14px',
          border: '2px solid #fff',
          borderRadius: '50%',
          left: -5,
          top: '30%',
          boxShadow: leftTopHandle.boxShadow || '0 1px 2px rgba(0,0,0,0.3)',
          opacity: 0.8,
        }}
        className={leftTopHandle.className}
      />
      
      {/* Bottom-left: SOURCE for sending connections to left-side nodes */}
      <Handle 
        type="source" 
        position={Position.Left} 
        id="left-bottom-source"
        isConnectable={true}
        isConnectableStart={true}
        isConnectableEnd={false}
        style={{ 
          background: leftBottomHandle.background,
          width: '14px', 
          height: '14px',
          border: '2px solid #fff',
          borderRadius: '50%',
          left: -5,
          top: '70%',
          boxShadow: leftBottomHandle.boxShadow || '0 3px 8px rgba(255, 87, 34, 0.4), 0 0 12px rgba(255, 87, 34, 0.3)',
        }}
        className={leftBottomHandle.className}
      />
      
      {/* Right Handles */}
      {/* Top-right: SOURCE for sending connections to right-side nodes */}
      <Handle 
        type="source" 
        position={Position.Right} 
        id="right-top-source"
        isConnectable={true}
        isConnectableStart={true}
        isConnectableEnd={false}
        style={{ 
          background: rightTopHandle.background,
          width: '14px', 
          height: '14px',
          border: '2px solid #fff',
          borderRadius: '50%',
          right: -5,
          top: '30%',
          boxShadow: rightTopHandle.boxShadow || '0 3px 8px rgba(25, 118, 210, 0.4), 0 0 12px rgba(25, 118, 210, 0.3)',
        }}
        className={rightTopHandle.className}
      />

      {/* Bottom-right: TARGET for receiving connections from left-side nodes */}
      <Handle 
        type="target" 
        position={Position.Right} 
        id="right-bottom-target"
        isConnectable={true}
        isConnectableStart={false}
        isConnectableEnd={true}
        style={{ 
          background: rightBottomHandle.background,
          width: '14px', 
          height: '14px',
          border: '2px solid #fff',
          borderRadius: '50%',
          right: -5,
          top: '70%',
          boxShadow: rightBottomHandle.boxShadow || '0 1px 2px rgba(0,0,0,0.3)',
          opacity: 0.8,
        }}
        className={rightBottomHandle.className}
      />

      {/* NEW MENU NAVIGATION HANDLES */}
      {/* Top Handles for Menu Navigation */}
      {/* Top-left: Purple - SOURCE for menu connections */}
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
      
      {/* Top-right: Green - TARGET for menu connections */}
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

      {/* Bottom Handles for Menu Navigation */}
      {/* Bottom-left: Purple - TARGET for menu connections */}
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
      
      {/* Bottom-right: Green - SOURCE for menu connections */}
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

      {/* Header with node name and type */}
      <div
        style={{
          padding: '4px',
          borderBottom: isRootNode ? `1px solid ${nodeColors.border}` : '1px solid #eee',
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
          {data.type}
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
          cursor: data.screenshot ? 'pointer' : (data.type === 'menu' ? 'pointer' : 'default'),
        }}
        onDoubleClick={handleScreenshotDoubleClick}
        title={data.screenshot ? 'Double-click to view full size' : (data.type === 'menu' ? 'Double-click to navigate to nested tree' : '')}
      >
        {!data.screenshot && (
          <div style={{ 
            fontSize: '11px', 
            color: '#666',
            textAlign: 'center',
          }}>
            {data.type === 'menu' ? 'Menu - Double-click to explore' : 'No Screenshot'}
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
            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking the image
          >
            {/* Full-size screenshot */}
            <img
              src={data.screenshot}
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