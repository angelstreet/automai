import React from 'react';
import { Handle, Position } from 'reactflow';
import { UINavigationNode as UINavigationNodeType } from '../../types/navigationTypes';

interface UINavigationNodeProps {
  data: UINavigationNodeType['data'];
}

export const UINavigationNode: React.FC<UINavigationNodeProps> = ({ data }) => {
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
        border: `2px solid ${getNodeBorderColor(data.type)}`,
        borderRadius: '8px',
        padding: '12px',
        minWidth: '150px',
        maxWidth: '200px',
        fontSize: '12px',
        color: '#333',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        position: 'relative',
      }}
    >
      {/* Top Handles - target and source with unique IDs */}
      <Handle 
        type="target" 
        position={Position.Top} 
        id="top-target"
        style={{ 
          background: '#555', 
          width: '10px', 
          height: '10px',
          border: '2px solid #fff'
        }} 
      />
      <Handle 
        type="source" 
        position={Position.Top} 
        id="top-source"
        style={{ 
          background: '#555', 
          width: '10px', 
          height: '10px',
          border: '2px solid #fff'
        }} 
      />
      
      {/* Bottom Handles - target and source with unique IDs */}
      <Handle 
        type="target" 
        position={Position.Bottom} 
        id="bottom-target"
        style={{ 
          background: '#555', 
          width: '10px', 
          height: '10px',
          border: '2px solid #fff'
        }} 
      />
      <Handle 
        type="source" 
        position={Position.Bottom} 
        id="bottom-source"
        style={{ 
          background: '#555', 
          width: '10px', 
          height: '10px',
          border: '2px solid #fff'
        }} 
      />
      
      {/* Left Handles - target and source with unique IDs */}
      <Handle 
        type="target" 
        position={Position.Left} 
        id="left-target"
        style={{ 
          background: '#555', 
          width: '10px', 
          height: '10px',
          border: '2px solid #fff'
        }} 
      />
      <Handle 
        type="source" 
        position={Position.Left} 
        id="left-source"
        style={{ 
          background: '#555', 
          width: '10px', 
          height: '10px',
          border: '2px solid #fff'
        }} 
      />
      
      {/* Right Handles - target and source with unique IDs */}
      <Handle 
        type="target" 
        position={Position.Right} 
        id="right-target"
        style={{ 
          background: '#555', 
          width: '10px', 
          height: '10px',
          border: '2px solid #fff'
        }} 
      />
      <Handle 
        type="source" 
        position={Position.Right} 
        id="right-source"
        style={{ 
          background: '#555', 
          width: '10px', 
          height: '10px',
          border: '2px solid #fff'
        }} 
      />
      
      <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
        {data.label}
      </div>
      
      <div style={{ 
        fontSize: '10px', 
        color: '#666',
        textTransform: 'uppercase',
        marginBottom: '4px'
      }}>
        {data.type}
      </div>
      
     
      
      {data.hasChildren && (
        <div style={{ 
          fontSize: '10px', 
          color: '#4caf50',
          fontWeight: 'bold'
        }}>
          📁 Has Children
        </div>
      )}
    </div>
  );
}; 