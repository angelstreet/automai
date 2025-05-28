import React from 'react';

interface StatusMessagesProps {
  error: string | null;
  success: string | null;
}

export const StatusMessages: React.FC<StatusMessagesProps> = ({
  error,
  success,
}) => {
  if (!error && !success) return null;

  return (
    <div style={{
      position: 'absolute',
      top: '80px',
      left: '10px',
      right: '10px',
      zIndex: 10,
    }}>
      {error && (
        <div style={{
          backgroundColor: '#ffebee',
          color: '#c62828',
          padding: '12px 16px',
          borderRadius: '4px',
          border: '1px solid #ffcdd2',
          marginBottom: '8px',
          fontSize: '14px',
        }}>
          ❌ {error}
        </div>
      )}
      
      {success && (
        <div style={{
          backgroundColor: '#e8f5e8',
          color: '#2e7d32',
          padding: '12px 16px',
          borderRadius: '4px',
          border: '1px solid #c8e6c9',
          marginBottom: '8px',
          fontSize: '14px',
        }}>
          ✅ {success}
        </div>
      )}
    </div>
  );
}; 