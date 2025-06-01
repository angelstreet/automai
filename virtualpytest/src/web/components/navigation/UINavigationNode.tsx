import React, { useState } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { UINavigationNode as UINavigationNodeType } from '../../types/navigationTypes';

export const UINavigationNode: React.FC<NodeProps<UINavigationNodeType['data']>> = ({ 
  data, 
  selected 
}) => {
  const [isScreenshotModalOpen, setIsScreenshotModalOpen] = useState(false);

  // Check if this node is a root node (no parent)
  const isRootNode = !data.parent || data.parent.length === 0;
  
  // Root node styling - more prominent than normal nodes
  const rootNodeStyle = {
    background: 'linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%)',
    border: '2px solid #d32f2f',
    boxShadow: selected ? '0 4px 12px rgba(211, 47, 47, 0.4)' : '0 2px 8px rgba(211, 47, 47, 0.3)'
  };
  
  // Normal node styling - based on node type
  const getNodeColor = (type: string) => {
    switch (type) {
      case 'screen': return '#e3f2fd';
      case 'dialog': return '#f3e5f5';
      case 'popup': return '#fff3e0';
      case 'overlay': return '#e8f5e8';
      case 'menu': return '#fff8e1';
      default: return '#f5f5f5';
    }
  };

  const getNodeBorderColor = (type: string) => {
    switch (type) {
      case 'screen': return '#2196f3';
      case 'dialog': return '#9c27b0';
      case 'popup': return '#ff9800';
      case 'overlay': return '#4caf50';
      case 'menu': return '#ffc107';
      default: return '#757575';
    }
  };

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
        background: isRootNode ? rootNodeStyle.background : getNodeColor(data.type),
        border: isRootNode ? rootNodeStyle.border : `1px solid ${getNodeBorderColor(data.type)}`,
        borderRadius: '8px',
        padding: '12px',
        minWidth: '200px',
        maxWidth: '200px',
        minHeight: '180px',
        fontSize: '12px',
        color: '#333',
        boxShadow: isRootNode ? rootNodeStyle.boxShadow : (selected ? '0 4px 12px rgba(0,0,0,0.2)' : '0 2px 4px rgba(0,0,0,0.1)'),
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Root Node Indicator */}
      {isRootNode && (
        <div
          style={{
            position: 'absolute',
            top: '4px',
            right: '4px',
            backgroundColor: '#d32f2f',
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
          background: 'linear-gradient(135deg, #90caf9, #64b5f6)', // Muted blue gradient
          width: '14px', 
          height: '14px',
          border: '2px solid #fff',
          borderRadius: '50%',
          left: -5,
          top: '30%',
          boxShadow: '0 1px 2px rgba(0,0,0,0.3)',
          opacity: 0.8,
        }} 
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
          background: 'linear-gradient(135deg, #ff5722, #ff8a65)', // Bright red gradient
          width: '14px', 
          height: '14px',
          border: '2px solid #fff',
          borderRadius: '50%',
          left: -5,
          top: '70%',
          boxShadow: '0 3px 8px rgba(255, 87, 34, 0.4), 0 0 12px rgba(255, 87, 34, 0.3)',
        }} 
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
          background: 'linear-gradient(135deg, #1976d2, #42a5f5)', // Bright blue gradient
          width: '14px', 
          height: '14px',
          border: '2px solid #fff',
          borderRadius: '50%',
          right: -5,
          top: '30%',
          boxShadow: '0 3px 8px rgba(25, 118, 210, 0.4), 0 0 12px rgba(25, 118, 210, 0.3)',
        }} 
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
          background: 'linear-gradient(135deg, #ef9a9a, #e57373)', // Muted red gradient
          width: '14px', 
          height: '14px',
          border: '2px solid #fff',
          borderRadius: '50%',
          right: -5,
          top: '70%',
          boxShadow: '0 1px 2px rgba(0,0,0,0.3)',
          opacity: 0.8,
        }} 
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
          background: 'linear-gradient(135deg, #9c27b0, #ba68c8)', // Bright purple gradient
          width: '14px', 
          height: '14px',
          border: '2px solid #fff',
          borderRadius: '50%',
          left: '30%',
          top: -5,
          boxShadow: '0 3px 8px rgba(156, 39, 176, 0.4), 0 0 12px rgba(156, 39, 176, 0.3)',
        }} 
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
          background: 'linear-gradient(135deg, #a5d6a7, #81c784)', // Muted green gradient
          width: '14px', 
          height: '14px',
          border: '2px solid #fff',
          borderRadius: '50%',
          left: '70%',
          top: -5,
          boxShadow: '0 1px 2px rgba(0,0,0,0.3)',
          opacity: 0.8,
        }} 
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
          background: 'linear-gradient(135deg, #ce93d8, #ba68c8)', // Muted purple gradient
          width: '14px', 
          height: '14px',
          border: '2px solid #fff',
          borderRadius: '50%',
          left: '30%',
          bottom: -5,
          boxShadow: '0 1px 2px rgba(0,0,0,0.3)',
          opacity: 0.8,
        }} 
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
          background: 'linear-gradient(135deg, #4caf50, #66bb6a)', // Bright green gradient
          width: '14px', 
          height: '14px',
          border: '2px solid #fff',
          borderRadius: '50%',
          left: '70%',
          bottom: -5,
          boxShadow: '0 3px 8px rgba(76, 175, 80, 0.4), 0 0 12px rgba(76, 175, 80, 0.3)',
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