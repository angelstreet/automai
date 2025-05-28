import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { UINavigationNode as UINavigationNodeType } from '../../types/navigationTypes';

export const UINavigationNode: React.FC<NodeProps<UINavigationNodeType['data']>> = ({ 
  data, 
  selected 
}) => {
  const getNodeColor = (type: string) => {
    switch (type) {
      case 'screen': return '#e3f2fd';
      case 'dialog': return '#f3e5f5';
      case 'popup': return '#fff3e0';
      case 'overlay': return '#e8f5e8';
      default: return '#f5f5f5';
    }
  };

  const getNodeBorderColor = (type: string) => {
    switch (type) {
      case 'screen': return '#2196f3';
      case 'dialog': return '#9c27b0';
      case 'popup': return '#ff9800';
      case 'overlay': return '#4caf50';
      default: return '#757575';
    }
  };

  return (
    <div
      style={{
        background: getNodeColor(data.type),
        border: selected ? `2px solid #1976d2` : `2px solid ${getNodeBorderColor(data.type)}`,
        borderRadius: '8px',
        padding: '12px',
        minWidth: '200px',
        maxWidth: '200px',
        minHeight: '120px',
        fontSize: '12px',
        color: '#333',
        boxShadow: selected ? '0 4px 12px rgba(0,0,0,0.2)' : '0 2px 4px rgba(0,0,0,0.1)',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Left Handles - for bi-directional navigation */}
      <Handle 
        type="target" 
        position={Position.Left} 
        id="left-go-target"
        style={{ 
          background: '#1976d2', 
          width: '12px', 
          height: '12px',
          border: '2px solid #fff',
          borderRadius: '50%',
          left: -6,
          top: '40%',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
        }} 
      />
      
      <Handle 
        type="source" 
        position={Position.Left} 
        id="left-back-source"
        style={{ 
          background: '#1976d2', 
          width: '12px', 
          height: '12px',
          border: '2px solid #fff',
          borderRadius: '50%',
          left: -6,
          top: '60%',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
        }} 
      />
      
      {/* Right Handles - for bi-directional navigation */}
      <Handle 
        type="source" 
        position={Position.Right} 
        id="right-go-source"
        style={{ 
          background: '#1976d2', 
          width: '12px', 
          height: '12px',
          border: '2px solid #fff',
          borderRadius: '50%',
          right: -6,
          top: '40%',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
        }} 
      />

      <Handle 
        type="target" 
        position={Position.Right} 
        id="right-back-target"
        style={{ 
          background: '#1976d2', 
          width: '12px', 
          height: '12px',
          border: '2px solid #fff',
          borderRadius: '50%',
          right: -6,
          top: '60%',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
        }} 
      />

      {/* Children indicator */}
      {data.hasChildren && (
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
          +
        </div>
      )}

      {/* Header with node name and type */}
      <div
        style={{
          padding: '8px',
          backgroundColor: 'white',
          borderBottom: '1px solid #eee',
          minHeight: '40px',
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
            color: 'black',
            marginBottom: '2px',
          }}
        >
          {data.label}
        </div>
        <div
          style={{
            textAlign: 'center',
            fontSize: '10px',
            color: '#666',
            textTransform: 'uppercase',
          }}
        >
          {data.type}
          {data.hasChildren && ' • Has Children'}
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
        }}
      >
        {!data.screenshot && (
          <div style={{ 
            fontSize: '11px', 
            color: '#666',
            textAlign: 'center',
          }}>
            {data.hasChildren ? 'Double-click to explore' : 'No Screenshot'}
          </div>
        )}
      </div>
    </div>
  );
}; 