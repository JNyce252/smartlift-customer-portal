import React from 'react';
import { Link } from 'react-router-dom';

const Support = () => {
  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <Link to="/customer/dashboard" className="text-blue-400">← Back</Link>
      <h1 className="text-3xl text-white mt-4">Support</h1>
      <p className="text-gray-400">Call (555) 911-LIFT for emergencies</p>
    </div>
  );
};

export default Support;
