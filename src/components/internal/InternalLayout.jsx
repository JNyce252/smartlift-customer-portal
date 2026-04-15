import React from 'react';
import RoleNav from './RoleNav';

const InternalLayout = ({ children }) => {
  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      background: '#0a0a0f',
      fontFamily: "'DM Sans', system-ui, sans-serif",
    }}>
      <RoleNav />
      <main style={{
        flex: 1,
        overflowX: 'hidden',
        overflowY: 'auto',
        minWidth: 0,
      }}>
        {children}
      </main>
    </div>
  );
};

export default InternalLayout;
