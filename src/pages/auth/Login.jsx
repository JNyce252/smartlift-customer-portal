import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Zap, Mail, Lock, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const Login = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated, user } = useAuth();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (isAuthenticated && user) {
      navigate(user.role === 'company' ? '/internal/dashboard' : '/customer/dashboard');
    }
  }, [isAuthenticated, user, navigate]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const userData = await login(formData.email, formData.password);
      navigate(userData.role === 'company' ? '/internal/dashboard' : '/customer/dashboard');
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = (type) => {
    const creds = {
      company: { email: 'company@smartlift.com', password: 'SmartLift2025!' },
      customer: { email: 'customer@example.com', password: 'SmartLift2025!' },
    };
    setFormData(creds[type]);
  };

  return (
    
          </div>
          <div className="mt-6 text-center">
            <p className="text-gray-400 text-sm">Interested in Smarterlift? <a href="https://thegoldensignature.com" target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300 font-medium">Contact us</a></p>
          </div>
        </div>
        <p className="mt-8 text-center text-gray-500 text-sm">© 2026 Smarterlift. All rights reserved.</p>
      </div>
    </div>
  );
};

export default Login;
