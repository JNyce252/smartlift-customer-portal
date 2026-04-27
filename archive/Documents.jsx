import React from "react";
import { Link } from "react-router-dom";
import { FileText } from "lucide-react";

const Documents = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        <Link to="/customer/dashboard" className="text-blue-400 hover:text-blue-300 mb-4 inline-block">← Back to Dashboard</Link>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Documents</h1>
          <p className="text-gray-400">Access certificates, contracts, and reports</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-12 border border-gray-700 text-center">
          <FileText className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">Documents Coming Soon</h3>
          <p className="text-gray-400">Your certificates and reports will appear here</p>
        </div>
      </div>
    </div>
  );
};

export default Documents;
