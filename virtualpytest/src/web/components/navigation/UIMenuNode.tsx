import React, { useState } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { UINavigationNode as UINavigationNodeType } from '../../types/navigationTypes';

export const UIMenuNode: React.FC<NodeProps<UINavigationNodeType['data']>> = ({ 
  data, 
  selected 
}) => {
  const [isScreenshotModalOpen, setIsScreenshotModalOpen] = useState(false);

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
        background: 'linear-gradient(135deg, #fff8e1 0%, #ffecb3 100%)',
        border: selected ? `3px solid #ff6f00` : `2px solid #ffc107`,
        borderRadius: '8px',
        padding: '12px',
        minWidth: '200px',
        maxWidth: '200px',
        minHeight: '180px',
        fontSize: '12px',
        color: '#333',
        boxShadow: selected 
          ? '0 4px 12px rgba(255, 193, 7, 0.4)' 
          : '0 2px 4px rgba(255, 193, 7, 0.2)',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Left Handles */}
      <Handle 
        type="target" 
        position={Position.Left} 
        id="left-top-target"
        isConnectable={true}
        isConnectableStart={false}
        isConnectableEnd={true}
        style={{ 
          background: '#ff6f00', 
          width: '14px', 
          height: '14px',
          border: '2px solid #fff',
          borderRadius: '50%',
          left: -5,
          top: '30%',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
        }} 
      />
      
      <Handle 
        type="source" 
        position={Position.Left} 
        id="left-bottom-source"
        isConnectable={true}
        isConnectableStart={true}
        isConnectableEnd={false}
        style={{ 
          background: '#f44336', 
          width: '14px', 
          height: '14px',
          border: '2px solid #fff',
          borderRadius: '50%',
          left: -5,
          top: '70%',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
        }} 
      />
      
      {/* Right Handles */}
      <Handle 
        type="source" 
        position={Position.Right} 
        id="right-top-source"
        isConnectable={true}
        isConnectableStart={true}
        isConnectableEnd={false}
        style={{ 
          background: '#ff6f00', 
          width: '14px', 
          height: '14px',
          border: '2px solid #fff',
          borderRadius: '50%',
          right: -5,
          top: '30%',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
        }} 
      />

      <Handle 
        type="target" 
        position={Position.Right} 
        id="right-bottom-target"
        isConnectable={true}
        isConnectableStart={false}
        isConnectableEnd={true}
        style={{ 
          background: '#f44336', 
          width: '14px', 
          height: '14px',
          border: '2px solid #fff',
          borderRadius: '50%',
          right: -5,
          top: '70%',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
        }} 
      />

      {/* Tree status indicator */}
      {data.tree_id && (
        <div
          style={{
            position: 'absolute',
            top: '4px',
            right: '4px',
            width: '16px',
            height: '16px',
            backgroundColor: '#4caf50',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '10px',
            color: 'white',
            fontWeight: 'bold',
            zIndex: 10,
          }}
        >
          ✓
        </div>
      )}

      {/* Header with menu name */}
      <div
        style={{
          padding: '4px',
          borderBottom: '1px solid #ffc107',
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
            color: '#e65100',
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
            color: '#ff8f00',
            textTransform: 'uppercase',
            fontWeight: 'bold',
          }}
        >
          MENU
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
          cursor: 'pointer',
        }}
        onDoubleClick={handleScreenshotDoubleClick}
      >
        {!data.screenshot && (
          <div style={{ 
            fontSize: '11px', 
            color: '#ff8f00',
            textAlign: 'center',
            fontWeight: '500',
          }}>
            No Screenshot
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
            paddingTop: '5vh',
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
              }}
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
                {data.label} - MENU
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