import React from 'react';
import { Link } from 'react-router-dom';

const Documents = () => {
  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <Link to="/customer/dashboard" className="text-blue-400">← Back</Link>
      <h1 className="text-3xl text-white mt-4">Documents</h1>
      <p className="text-gray-400">Coming soon...</p>
    </div>
  );
};

export default Documents;
