import React from "react";
import { Link } from "react-router-dom";
import { Phone, Mail, MessageSquare } from "lucide-react";

const Support = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        <Link to="/customer/dashboard" className="text-blue-400 hover:text-blue-300 mb-4 inline-block">← Back to Dashboard</Link>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Support</h1>
          <p className="text-gray-400">Get help with your elevator service</p>
        </div>
        <div className="bg-red-600/20 border-2 border-red-500 rounded-lg p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-white mb-1">Emergency?</h3>
              <p className="text-red-200">Call immediately for trapped passengers</p>
            </div>
            <a href="tel:5559111548" className="px-8 py-4 bg-red-600 text-white font-bold rounded-lg">(555) 911-LIFT</a>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <Phone className="w-8 h-8 text-blue-400 mb-3" />
            <h3 className="text-white font-semibold mb-1">Main Office</h3>
            <p className="text-blue-400 font-bold">(555) 123-LIFT</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <Mail className="w-8 h-8 text-green-400 mb-3" />
            <h3 className="text-white font-semibold mb-1">Email</h3>
            <p className="text-green-400 font-bold">support@smartlift.com</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <MessageSquare className="w-8 h-8 text-purple-400 mb-3" />
            <h3 className="text-white font-semibold mb-1">Live Chat</h3>
            <p className="text-purple-400 font-bold">Available Now</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Support;
