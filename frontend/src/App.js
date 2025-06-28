import React, { useState, useEffect, createContext, useContext } from 'react';
import './App.css';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Context for authentication
const AuthContext = createContext(null);

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Auth provider component
const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchUser();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchUser = async () => {
    try {
      const response = await axios.get(`${API}/auth/me`);
      setUser(response.data);
    } catch (error) {
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await axios.post(`${API}/auth/login`, { email, password });
      const { access_token, user: userData } = response.data;
      
      localStorage.setItem('token', access_token);
      setToken(access_token);
      setUser(userData);
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.detail || 'Login failed' };
    }
  };

  const register = async (userData) => {
    try {
      await axios.post(`${API}/auth/register`, userData);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.detail || 'Registration failed' };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    delete axios.defaults.headers.common['Authorization'];
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

// Login component
const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('field_agent');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { login, register } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (isRegister) {
      const result = await register({
        email,
        password,
        full_name: fullName,
        role,
        assigned_zones: [],
        assigned_agencies: [],
        assigned_gares: []
      });
      
      if (result.success) {
        setIsRegister(false);
        setError('Account created successfully! Please login.');
      } else {
        setError(result.error);
      }
    } else {
      const result = await login(email, password);
      if (!result.success) {
        setError(result.error);
      }
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-8 w-full max-w-md border border-white/20">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            {isRegister ? 'Créer un compte' : 'Connexion'}
          </h1>
          <p className="text-gray-300">
            Système de gestion des recharges - Burkina Faso
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-white text-sm font-medium mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="votre@email.com"
              required
            />
          </div>

          {isRegister && (
            <div>
              <label className="block text-white text-sm font-medium mb-2">
                Nom complet
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Votre nom complet"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-white text-sm font-medium mb-2">
              Mot de passe
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="••••••••"
              required
            />
          </div>

          {isRegister && (
            <div>
              <label className="block text-white text-sm font-medium mb-2">
                Rôle
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="field_agent" className="text-black">Agent de terrain</option>
                <option value="zone_admin" className="text-black">Admin Zone</option>
                <option value="super_admin" className="text-black">Super Admin</option>
              </select>
            </div>
          )}

          {error && (
            <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold py-3 px-4 rounded-lg hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-transparent transition duration-200 disabled:opacity-50"
          >
            {loading ? 'Chargement...' : (isRegister ? 'Créer le compte' : 'Se connecter')}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setIsRegister(!isRegister);
              setError('');
            }}
            className="text-blue-300 hover:text-blue-200 transition duration-200"
          >
            {isRegister ? 'Déjà un compte ? Se connecter' : 'Pas de compte ? S\'inscrire'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Form components
const ZoneForm = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await axios.post(`${API}/zones`, formData);
      onSuccess();
      onClose();
    } catch (error) {
      setError(error.response?.data?.detail || 'Erreur lors de la création');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">Ajouter une nouvelle zone</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nom de la zone *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Ex: Zone Centre"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Description de la zone"
            rows="3"
          />
        </div>
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}
        <div className="flex space-x-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition duration-200"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition duration-200 disabled:opacity-50"
          >
            {loading ? 'Création...' : 'Créer'}
          </button>
        </div>
      </form>
    </div>
  );
};

const AgencyForm = ({ zones, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    zone_id: '',
    description: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await axios.post(`${API}/agencies`, formData);
      onSuccess();
      onClose();
    } catch (error) {
      setError(error.response?.data?.detail || 'Erreur lors de la création');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">Ajouter une nouvelle agence</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nom de l'agence *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Ex: Agence Ouagadougou"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Zone *
          </label>
          <select
            value={formData.zone_id}
            onChange={(e) => setFormData({...formData, zone_id: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="">Sélectionner une zone</option>
            {zones.map((zone) => (
              <option key={zone.id} value={zone.id}>
                {zone.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Description de l'agence"
            rows="3"
          />
        </div>
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}
        <div className="flex space-x-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition duration-200"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition duration-200 disabled:opacity-50"
          >
            {loading ? 'Création...' : 'Créer'}
          </button>
        </div>
      </form>
    </div>
  );
};

const GareForm = ({ agencies, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    agency_id: '',
    description: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await axios.post(`${API}/gares`, formData);
      onSuccess();
      onClose();
    } catch (error) {
      setError(error.response?.data?.detail || 'Erreur lors de la création');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">Ajouter une nouvelle gare</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nom de la gare *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Ex: Gare Centrale de Ouagadougou"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Agence *
          </label>
          <select
            value={formData.agency_id}
            onChange={(e) => setFormData({...formData, agency_id: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="">Sélectionner une agence</option>
            {agencies.map((agency) => (
              <option key={agency.id} value={agency.id}>
                {agency.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Description de la gare"
            rows="3"
          />
        </div>
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}
        <div className="flex space-x-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition duration-200"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition duration-200 disabled:opacity-50"
          >
            {loading ? 'Création...' : 'Créer'}
          </button>
        </div>
      </form>
    </div>
  );
};

const RechargeForm = ({ gares, onClose, onSuccess }) => {
  const [connectionLines, setConnectionLines] = useState([]);
  const [formData, setFormData] = useState({
    connection_line_id: '',
    volume: '',
    cost: '',
    start_date: '',
    end_date: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch connection lines when component mounts
  useEffect(() => {
    const fetchConnectionLines = async () => {
      try {
        const response = await axios.get(`${API}/connections`);
        setConnectionLines(response.data);
      } catch (error) {
        console.error('Error fetching connection lines:', error);
      }
    };
    fetchConnectionLines();
  }, []);

  // Set default dates if creating new recharge
  useEffect(() => {
    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + 30);
    
    setFormData(prev => ({
      ...prev,
      start_date: today.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0]
    }));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const submitData = {
        ...formData,
        cost: parseFloat(formData.cost),
        start_date: new Date(formData.start_date).toISOString(),
        end_date: new Date(formData.end_date).toISOString()
      };
      await axios.post(`${API}/recharges`, submitData);
      onSuccess();
      onClose();
    } catch (error) {
      setError(error.response?.data?.detail || 'Erreur lors de la création');
    } finally {
      setLoading(false);
    }
  };

  const volumeOptions = ['1GB', '5GB', '10GB', '25GB', '50GB', '100GB', 'Illimité'];

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">Ajouter une nouvelle recharge</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Ligne de connexion *
          </label>
          <select
            value={formData.connection_line_id}
            onChange={(e) => setFormData({...formData, connection_line_id: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="">Sélectionner une ligne</option>
            {connectionLines.map((line) => {
              const gare = gares.find(g => g.id === line.gare_id);
              return (
                <option key={line.id} value={line.id}>
                  {line.line_number} - {gare?.name} ({line.operator} - {line.connection_type})
                </option>
              );
            })}
          </select>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date de début *
            </label>
            <input
              type="date"
              value={formData.start_date}
              onChange={(e) => setFormData({...formData, start_date: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date de fin *
            </label>
            <input
              type="date"
              value={formData.end_date}
              onChange={(e) => setFormData({...formData, end_date: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Volume *
          </label>
          <select
            value={formData.volume}
            onChange={(e) => setFormData({...formData, volume: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="">Sélectionner un volume</option>
            {volumeOptions.map((volume) => (
              <option key={volume} value={volume}>
                {volume}
              </option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Coût (FCFA) *
          </label>
          <input
            type="number"
            value={formData.cost}
            onChange={(e) => setFormData({...formData, cost: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Ex: 25000"
            min="0"
            step="100"
            required
          />
        </div>
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}
        
        <div className="flex space-x-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition duration-200"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition duration-200 disabled:opacity-50"
          >
            {loading ? 'Création...' : 'Créer'}
          </button>
        </div>
      </form>
    </div>
  );
};

// Action buttons component
const ActionButtons = ({ item, type, onEdit, onDelete, onExport, onPrint }) => {
  return (
    <div className="flex items-center space-x-2 mt-4 pt-4 border-t border-gray-200">
      <button
        onClick={() => onPrint(item, type)}
        className="flex items-center px-3 py-1 text-xs bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition duration-200"
        title="Imprimer"
      >
        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
        </svg>
        Imprimer
      </button>
      
      <button
        onClick={() => onExport(item, type)}
        className="flex items-center px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition duration-200"
        title="Exporter"
      >
        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Exporter
      </button>
      
      <button
        onClick={() => onEdit(type, item)}
        className="flex items-center px-3 py-1 text-xs bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 transition duration-200"
        title="Modifier"
      >
        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
        Modifier
      </button>
      
      <button
        onClick={() => onDelete(type, item)}
        className="flex items-center px-3 py-1 text-xs bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition duration-200"
        title="Supprimer"
      >
        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
        Supprimer
      </button>
    </div>
  );
};

const ConnectionLineForm = ({ gares, item, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    line_number: item?.line_number || '',
    gare_id: item?.gare_id || '',
    operator: item?.operator || '',
    connection_type: item?.connection_type || '',
    payment_type: item?.payment_type || ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (item) {
        await axios.put(`${API}/connections/${item.id}`, formData);
      } else {
        await axios.post(`${API}/connections`, formData);
      }
      onSuccess();
      onClose();
    } catch (error) {
      setError(error.response?.data?.detail || `Erreur lors de ${item ? 'la modification' : 'la création'}`);
    } finally {
      setLoading(false);
    }
  };

  const operators = ['Orange', 'Telecel', 'Moov'];
  const connectionTypes = [
    { value: 'mobile', label: 'Mobile' },
    { value: 'fibre', label: 'Fibre' }
  ];
  const paymentTypes = [
    { value: 'prepaid', label: 'Prépayé' },
    { value: 'postpaid', label: 'Postpayé' }
  ];

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">
        {item ? 'Modifier la ligne de connexion' : 'Ajouter une nouvelle ligne de connexion'}
      </h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Numéro de ligne *
          </label>
          <input
            type="text"
            value={formData.line_number}
            onChange={(e) => setFormData({...formData, line_number: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Ex: ONG-001, TEL-FIBRE-025"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Gare *
          </label>
          <select
            value={formData.gare_id}
            onChange={(e) => setFormData({...formData, gare_id: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="">Sélectionner une gare</option>
            {gares.map((gare) => (
              <option key={gare.id} value={gare.id}>
                {gare.name}
              </option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Opérateur *
          </label>
          <select
            value={formData.operator}
            onChange={(e) => setFormData({...formData, operator: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="">Sélectionner un opérateur</option>
            {operators.map((operator) => (
              <option key={operator} value={operator}>
                {operator}
              </option>
            ))}
          </select>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type de connexion *
            </label>
            <select
              value={formData.connection_type}
              onChange={(e) => setFormData({...formData, connection_type: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Sélectionner</option>
              {connectionTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type de paiement *
            </label>
            <select
              value={formData.payment_type}
              onChange={(e) => setFormData({...formData, payment_type: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Sélectionner</option>
              {paymentTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}
        
        <div className="flex space-x-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition duration-200"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition duration-200 disabled:opacity-50"
          >
            {loading ? (item ? 'Modification...' : 'Création...') : (item ? 'Modifier' : 'Créer')}
          </button>
        </div>
      </form>
    </div>
  );
};

// Dashboard component
const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [recharges, setRecharges] = useState([]);
  const [zones, setZones] = useState([]);
  const [agencies, setAgencies] = useState([]);
  const [gares, setGares] = useState([]);
  const [connectionLines, setConnectionLines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);

  // Search and filter states
  const [searchTerms, setSearchTerms] = useState({
    zones: '',
    agencies: '',
    gares: '',
    recharges: ''
  });
  const [filters, setFilters] = useState({
    recharges: {
      status: '',
      operator: '',
      gare_id: '',
      startDate: '',
      endDate: ''
    }
  });

  const { user, logout } = useAuth();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, alertsRes, rechargesRes, zonesRes, agenciesRes, garesRes, connectionsRes] = await Promise.all([
        axios.get(`${API}/dashboard/stats`),
        axios.get(`${API}/alerts`),
        axios.get(`${API}/recharges`),
        axios.get(`${API}/zones`),
        axios.get(`${API}/agencies`),
        axios.get(`${API}/gares`),
        axios.get(`${API}/connections`)
      ]);

      setStats(statsRes.data);
      setAlerts(alertsRes.data);
      setRecharges(rechargesRes.data);
      setZones(zonesRes.data);
      setAgencies(agenciesRes.data);
      setGares(garesRes.data);
      setConnectionLines(connectionsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = (type) => {
    setModalType(type);
    setSelectedItem(null);
    setShowAddModal(true);
  };

  const openEditModal = (type, item) => {
    setModalType(type);
    setSelectedItem(item);
    setShowEditModal(true);
  };

  const openDeleteModal = (type, item) => {
    setModalType(type);
    setSelectedItem(item);
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    try {
      await axios.delete(`${API}/${modalType}s/${selectedItem.id}`);
      setShowDeleteModal(false);
      setSelectedItem(null);
      fetchData();
    } catch (error) {
      console.error('Error deleting:', error);
    }
  };

  const exportItem = (item, type) => {
    const dataStr = JSON.stringify(item, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `${type}_${item.name || item.id}_${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const printItem = (item, type) => {
    const printWindow = window.open('', '_blank');
    const printContent = `
      <html>
        <head>
          <title>Impression ${type} - ${item.name}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
            .info { margin-bottom: 10px; }
            .label { font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Fiche ${type}</h1>
            <p>Système de gestion des recharges - Burkina Faso</p>
          </div>
          <div class="info"><span class="label">Nom:</span> ${item.name}</div>
          ${item.description ? `<div class="info"><span class="label">Description:</span> ${item.description}</div>` : ''}
          ${item.operator ? `<div class="info"><span class="label">Opérateur:</span> ${item.operator}</div>` : ''}
          ${item.volume ? `<div class="info"><span class="label">Volume:</span> ${item.volume}</div>` : ''}
          ${item.cost ? `<div class="info"><span class="label">Coût:</span> ${item.cost.toLocaleString()} FCFA</div>` : ''}
          ${item.start_date ? `<div class="info"><span class="label">Date début:</span> ${new Date(item.start_date).toLocaleDateString('fr-FR')}</div>` : ''}
          ${item.end_date ? `<div class="info"><span class="label">Date fin:</span> ${new Date(item.end_date).toLocaleDateString('fr-FR')}</div>` : ''}
          <div class="info"><span class="label">Créée le:</span> ${new Date(item.created_at).toLocaleDateString('fr-FR')}</div>
          <div class="info"><span class="label">ID:</span> ${item.id}</div>
        </body>
      </html>
    `;
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
  };

  // Filter functions
  const filterZones = (zones, searchTerm) => {
    return zones.filter(zone =>
      zone.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (zone.description && zone.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  };

  const filterAgencies = (agencies, searchTerm) => {
    return agencies.filter(agency => {
      const zone = zones.find(z => z.id === agency.zone_id);
      return agency.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (agency.description && agency.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (zone && zone.name.toLowerCase().includes(searchTerm.toLowerCase()));
    });
  };

  const filterGares = (gares, searchTerm) => {
    return gares.filter(gare => {
      const agency = agencies.find(a => a.id === gare.agency_id);
      const zone = zones.find(z => z.id === agency?.zone_id);
      return gare.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (gare.description && gare.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (agency && agency.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (zone && zone.name.toLowerCase().includes(searchTerm.toLowerCase()));
    });
  };

  const filterRecharges = (recharges, searchTerm, filters) => {
    return recharges.filter(recharge => {
      const gare = gares.find(g => g.id === recharge.gare_id);
      const agency = agencies.find(a => a.id === gare?.agency_id);
      const zone = zones.find(z => z.id === agency?.zone_id);

      // Text search
      const matchesSearch = !searchTerm || (
        recharge.operator.toLowerCase().includes(searchTerm.toLowerCase()) ||
        recharge.volume.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (gare && gare.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (agency && agency.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (zone && zone.name.toLowerCase().includes(searchTerm.toLowerCase()))
      );

      // Filter by status
      const matchesStatus = !filters.status || recharge.status === filters.status;
      
      // Filter by operator
      const matchesOperator = !filters.operator || recharge.operator === filters.operator;
      
      // Filter by gare
      const matchesGare = !filters.gare_id || recharge.gare_id === filters.gare_id;
      
      // Filter by date range
      const rechargeDate = new Date(recharge.end_date);
      const matchesStartDate = !filters.startDate || rechargeDate >= new Date(filters.startDate);
      const matchesEndDate = !filters.endDate || rechargeDate <= new Date(filters.endDate);

      return matchesSearch && matchesStatus && matchesOperator && matchesGare && matchesStartDate && matchesEndDate;
    });
  };

  // Export functions
  const exportToCSV = (data, filename, headers) => {
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => 
        typeof row[header] === 'string' && row[header].includes(',') 
          ? `"${row[header]}"` 
          : row[header]
      ).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportZones = () => {
    const filteredZones = filterZones(zones, searchTerms.zones);
    const exportData = filteredZones.map(zone => {
      const zoneAgencies = agencies.filter(a => a.zone_id === zone.id);
      const zoneGares = gares.filter(g => zoneAgencies.some(a => a.id === g.agency_id));
      return {
        'Nom': zone.name,
        'Description': zone.description || '',
        'Nombre d\'agences': zoneAgencies.length,
        'Nombre de gares': zoneGares.length,
        'Date de création': new Date(zone.created_at).toLocaleDateString('fr-FR')
      };
    });
    exportToCSV(exportData, 'zones.csv', ['Nom', 'Description', 'Nombre d\'agences', 'Nombre de gares', 'Date de création']);
  };

  const exportAgencies = () => {
    const filteredAgencies = filterAgencies(agencies, searchTerms.agencies);
    const exportData = filteredAgencies.map(agency => {
      const zone = zones.find(z => z.id === agency.zone_id);
      const agencyGares = gares.filter(g => g.agency_id === agency.id);
      return {
        'Nom': agency.name,
        'Zone': zone?.name || '',
        'Description': agency.description || '',
        'Nombre de gares': agencyGares.length,
        'Date de création': new Date(agency.created_at).toLocaleDateString('fr-FR')
      };
    });
    exportToCSV(exportData, 'agences.csv', ['Nom', 'Zone', 'Description', 'Nombre de gares', 'Date de création']);
  };

  const exportGares = () => {
    const filteredGares = filterGares(gares, searchTerms.gares);
    const exportData = filteredGares.map(gare => {
      const agency = agencies.find(a => a.id === gare.agency_id);
      const zone = zones.find(z => z.id === agency?.zone_id);
      const gareRecharges = recharges.filter(r => r.gare_id === gare.id);
      return {
        'Nom': gare.name,
        'Agence': agency?.name || '',
        'Zone': zone?.name || '',
        'Description': gare.description || '',
        'Recharges actives': gareRecharges.filter(r => r.status === 'active').length,
        'Total recharges': gareRecharges.length,
        'Date de création': new Date(gare.created_at).toLocaleDateString('fr-FR')
      };
    });
    exportToCSV(exportData, 'gares.csv', ['Nom', 'Agence', 'Zone', 'Description', 'Recharges actives', 'Total recharges', 'Date de création']);
  };

  const exportRecharges = () => {
    const filteredRecharges = filterRecharges(recharges, searchTerms.recharges, filters.recharges);
    const exportData = filteredRecharges.map(recharge => {
      const gare = gares.find(g => g.id === recharge.gare_id);
      const agency = agencies.find(a => a.id === gare?.agency_id);
      const zone = zones.find(z => z.id === agency?.zone_id);
      return {
        'Gare': gare?.name || '',
        'Agence': agency?.name || '',
        'Zone': zone?.name || '',
        'Opérateur': recharge.operator,
        'Volume': recharge.volume,
        'Coût (FCFA)': recharge.cost,
        'Date de début': new Date(recharge.start_date).toLocaleDateString('fr-FR'),
        'Date de fin': new Date(recharge.end_date).toLocaleDateString('fr-FR'),
        'Statut': recharge.status === 'active' ? 'Actif' : 
                  recharge.status === 'expiring_soon' ? 'Expire bientôt' : 'Expiré',
        'Date de création': new Date(recharge.created_at).toLocaleDateString('fr-FR')
      };
    });
    exportToCSV(exportData, 'recharges.csv', ['Gare', 'Agence', 'Zone', 'Opérateur', 'Volume', 'Coût (FCFA)', 'Date de début', 'Date de fin', 'Statut', 'Date de création']);
  };

  const printPage = () => {
    window.print();
  };

  const getStatusBadge = (status) => {
    const statusStyles = {
      active: 'bg-green-100 text-green-800',
      expiring_soon: 'bg-yellow-100 text-yellow-800',
      expired: 'bg-red-100 text-red-800'
    };
    return statusStyles[status] || 'bg-gray-100 text-gray-800';
  };

  const getOperatorColor = (operator) => {
    const colors = {
      Orange: 'text-orange-600',
      Telecel: 'text-blue-600',
      Moov: 'text-green-600'
    };
    return colors[operator] || 'text-gray-600';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b no-print">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Gestion des Recharges - Burkina Faso
              </h1>
              <p className="text-gray-600">Système de suivi des connexions internet</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{user?.full_name}</p>
                <p className="text-xs text-gray-500">{user?.role?.replace('_', ' ')}</p>
              </div>
              <button
                onClick={logout}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition duration-200"
              >
                Déconnexion
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b no-print">
        <div className="px-6">
          <div className="flex space-x-8">
            {['dashboard', 'recharges', 'lignes-connexion', 'gares', 'agencies', 'zones', 'rapports'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-2 border-b-2 font-medium text-sm capitalize ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab === 'dashboard' ? 'Tableau de bord' : 
                 tab === 'lignes-connexion' ? 'Lignes de connexion' :
                 tab === 'rapports' ? 'Rapports' : tab}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="p-6">
        {activeTab === 'dashboard' && stats && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-2xl font-bold text-gray-900">{stats.total_gares}</p>
                    <p className="text-gray-600">Gares</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-2xl font-bold text-gray-900">{stats.active_recharges}</p>
                    <p className="text-gray-600">Recharges actives</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-2xl font-bold text-gray-900">{stats.expiring_recharges}</p>
                    <p className="text-gray-600">Expirent bientôt</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-2xl font-bold text-gray-900">{stats.pending_alerts}</p>
                    <p className="text-gray-600">Alertes en attente</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Operator Statistics */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Statistiques par opérateur</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {stats.operator_stats.map((stat) => (
                  <div key={stat.operator} className="text-center p-4 bg-gray-50 rounded-lg">
                    <p className={`text-2xl font-bold ${getOperatorColor(stat.operator)}`}>
                      {stat.count}
                    </p>
                    <p className="text-gray-600">{stat.operator}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Alerts */}
            {alerts.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Alertes récentes</h3>
                <div className="space-y-3">
                  {alerts.slice(0, 5).map((alert) => (
                    <div key={alert.id} className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{alert.message}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(alert.alert_date).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          // Dismiss alert logic
                          axios.put(`${API}/alerts/${alert.id}/dismiss`).then(() => {
                            fetchData();
                          });
                        }}
                        className="text-yellow-600 hover:text-yellow-800"
                      >
                        Ignorer
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'recharges' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Gestion des recharges</h2>
              {gares.length > 0 && (
                <button
                  onClick={() => openAddModal('recharge')}
                  className="no-print bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition duration-200"
                >
                  Nouvelle recharge
                </button>
              )}
            </div>

            {/* Advanced Search and Filter Controls */}
            <div className="bg-white rounded-lg shadow p-4 no-print">
              <div className="space-y-4">
                {/* Search */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Recherche globale
                  </label>
                  <input
                    type="text"
                    value={searchTerms.recharges}
                    onChange={(e) => setSearchTerms({...searchTerms, recharges: e.target.value})}
                    placeholder="Rechercher par opérateur, volume, gare, agence..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Statut
                    </label>
                    <select
                      value={filters.recharges.status}
                      onChange={(e) => setFilters({
                        ...filters,
                        recharges: {...filters.recharges, status: e.target.value}
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Tous les statuts</option>
                      <option value="active">Actif</option>
                      <option value="expiring_soon">Expire bientôt</option>
                      <option value="expired">Expiré</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Opérateur
                    </label>
                    <select
                      value={filters.recharges.operator}
                      onChange={(e) => setFilters({
                        ...filters,
                        recharges: {...filters.recharges, operator: e.target.value}
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Tous les opérateurs</option>
                      <option value="Orange">Orange</option>
                      <option value="Telecel">Telecel</option>
                      <option value="Moov">Moov</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Gare
                    </label>
                    <select
                      value={filters.recharges.gare_id}
                      onChange={(e) => setFilters({
                        ...filters,
                        recharges: {...filters.recharges, gare_id: e.target.value}
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Toutes les gares</option>
                      {gares.map((gare) => (
                        <option key={gare.id} value={gare.id}>
                          {gare.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date début
                    </label>
                    <input
                      type="date"
                      value={filters.recharges.startDate}
                      onChange={(e) => setFilters({
                        ...filters,
                        recharges: {...filters.recharges, startDate: e.target.value}
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date fin
                    </label>
                    <input
                      type="date"
                      value={filters.recharges.endDate}
                      onChange={(e) => setFilters({
                        ...filters,
                        recharges: {...filters.recharges, endDate: e.target.value}
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Clear filters and export buttons */}
                <div className="flex justify-between items-center pt-4 border-t">
                  <button
                    onClick={() => {
                      setSearchTerms({...searchTerms, recharges: ''});
                      setFilters({
                        ...filters,
                        recharges: {
                          status: '',
                          operator: '',
                          gare_id: '',
                          startDate: '',
                          endDate: ''
                        }
                      });
                    }}
                    className="text-gray-600 hover:text-gray-800 transition duration-200"
                  >
                    Effacer tous les filtres
                  </button>
                  <div className="flex space-x-2">
                    <button
                      onClick={exportRecharges}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition duration-200 flex items-center"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Exporter CSV
                    </button>
                    <button
                      onClick={printPage}
                      className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition duration-200 flex items-center"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    Imprimer
                  </button>
                </div>
              </div>
            </div>
          </div>

            {gares.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <div className="text-gray-400 mb-4">
                  <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune gare disponible</h3>
                <p className="text-gray-600">
                  Vous devez d'abord créer des gares avant de pouvoir ajouter des recharges.
                </p>
              </div>
            ) : recharges.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <div className="text-gray-400 mb-4">
                  <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 4h6m-6 0l-.5 8a2 2 0 002 2h6a2 2 0 002-2L13 11H7z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune recharge trouvée</h3>
                <p className="text-gray-600 mb-4">
                  Commencez par enregistrer votre première recharge pour une gare.
                </p>
                <button
                  onClick={() => openAddModal('recharge')}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition duration-200"
                >
                  Créer la première recharge
                </button>
              </div>
            ) : (
              <>
                {/* Results summary */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-blue-700">
                    {filterRecharges(recharges, searchTerms.recharges, filters.recharges).length} recharge(s) trouvée(s)
                    {recharges.length !== filterRecharges(recharges, searchTerms.recharges, filters.recharges).length && 
                      ` sur ${recharges.length} au total`
                    }
                  </p>
                </div>

                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Gare
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Opérateur
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Volume
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Coût
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Expiration
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Statut
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filterRecharges(recharges, searchTerms.recharges, filters.recharges).map((recharge) => {
                          const gare = gares.find(g => g.id === recharge.gare_id);
                          return (
                            <tr key={recharge.id}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {gare?.name || 'Gare inconnue'}
                              </td>
                              <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${getOperatorColor(recharge.operator)}`}>
                                {recharge.operator}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {recharge.volume}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {recharge.cost.toLocaleString()} FCFA
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {new Date(recharge.end_date).toLocaleDateString('fr-FR')}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(recharge.status)}`}>
                                  {recharge.status === 'active' ? 'Actif' : 
                                   recharge.status === 'expiring_soon' ? 'Expire bientôt' : 'Expiré'}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <div className="flex items-center space-x-2">
                                  <button
                                    onClick={() => printItem(recharge, 'recharge')}
                                    className="text-green-600 hover:text-green-900"
                                    title="Imprimer"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={() => exportItem(recharge, 'recharge')}
                                    className="text-blue-600 hover:text-blue-900"
                                    title="Exporter"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={() => openEditModal('recharge', recharge)}
                                    className="text-yellow-600 hover:text-yellow-900"
                                    title="Modifier"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={() => openDeleteModal('recharge', recharge)}
                                    className="text-red-600 hover:text-red-900"
                                    title="Supprimer"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Show "No results" message when filters return empty */}
                {filterRecharges(recharges, searchTerms.recharges, filters.recharges).length === 0 && (
                  <div className="bg-white rounded-lg shadow p-8 text-center">
                    <div className="text-gray-400 mb-4">
                      <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun résultat trouvé</h3>
                    <p className="text-gray-600">
                      Aucune recharge ne correspond à vos critères de recherche.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === 'gares' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Gares</h2>
              {agencies.length > 0 && (
                <button
                  onClick={() => openAddModal('gare')}
                  className="no-print bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition duration-200"
                >
                  Nouvelle gare
                </button>
              )}
            </div>

            {/* Search and Export Controls */}
            <div className="bg-white rounded-lg shadow p-4 no-print">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
                <div className="flex-1 max-w-md">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rechercher
                  </label>
                  <input
                    type="text"
                    value={searchTerms.gares}
                    onChange={(e) => setSearchTerms({...searchTerms, gares: e.target.value})}
                    placeholder="Rechercher par nom, agence, zone ou description..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={exportGares}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition duration-200 flex items-center"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Exporter CSV
                  </button>
                  <button
                    onClick={printPage}
                    className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition duration-200 flex items-center"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    Imprimer
                  </button>
                </div>
              </div>
            </div>

            {agencies.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <div className="text-gray-400 mb-4">
                  <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune agence disponible</h3>
                <p className="text-gray-600">
                  Vous devez d'abord créer une agence avant de pouvoir ajouter des gares.
                </p>
              </div>
            ) : gares.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <div className="text-gray-400 mb-4">
                  <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune gare trouvée</h3>
                <p className="text-gray-600 mb-4">
                  Créez votre première gare pour commencer à gérer les recharges.
                </p>
                <button
                  onClick={() => openAddModal('gare')}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition duration-200"
                >
                  Créer la première gare
                </button>
              </div>
            ) : (
              <>
                {/* Results summary */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-blue-700">
                    {filterGares(gares, searchTerms.gares).length} gare(s) trouvée(s)
                    {gares.length !== filterGares(gares, searchTerms.gares).length && 
                      ` sur ${gares.length} au total`
                    }
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filterGares(gares, searchTerms.gares).map((gare) => {
                    const agency = agencies.find(a => a.id === gare.agency_id);
                    const zone = zones.find(z => z.id === agency?.zone_id);
                    const gareRecharges = recharges.filter(r => r.gare_id === gare.id);
                    
                    return (
                      <div key={gare.id} className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-semibold text-gray-900">{gare.name}</h3>
                          <div className="flex space-x-2">
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                              {gareRecharges.filter(r => r.status === 'active').length} actives
                            </span>
                          </div>
                        </div>
                        
                        <div className="space-y-2 text-sm text-gray-600">
                          <p><strong>Zone:</strong> {zone?.name || 'N/A'}</p>
                          <p><strong>Agence:</strong> {agency?.name || 'N/A'}</p>
                          <p><strong>Recharges totales:</strong> {gareRecharges.length}</p>
                        </div>

                        {gare.description && (
                          <p className="mt-3 text-sm text-gray-600">{gare.description}</p>
                        )}
                        
                        <ActionButtons 
                          item={gare} 
                          type="gare" 
                          onEdit={openEditModal}
                          onDelete={openDeleteModal}
                          onExport={exportItem}
                          onPrint={printItem}
                        />
                      </div>
                    );
                  })}
                </div>

                {/* Show "No results" message when search returns empty */}
                {filterGares(gares, searchTerms.gares).length === 0 && (
                  <div className="bg-white rounded-lg shadow p-8 text-center">
                    <div className="text-gray-400 mb-4">
                      <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun résultat trouvé</h3>
                    <p className="text-gray-600">
                      Aucune gare ne correspond à votre recherche "{searchTerms.gares}".
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === 'agencies' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Agences</h2>
              {(user?.role === 'super_admin' || user?.role === 'zone_admin') && zones.length > 0 && (
                <button
                  onClick={() => openAddModal('agency')}
                  className="no-print bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition duration-200"
                >
                  Nouvelle agence
                </button>
              )}
            </div>

            {/* Search and Export Controls */}
            <div className="bg-white rounded-lg shadow p-4 no-print">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
                <div className="flex-1 max-w-md">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rechercher
                  </label>
                  <input
                    type="text"
                    value={searchTerms.agencies}
                    onChange={(e) => setSearchTerms({...searchTerms, agencies: e.target.value})}
                    placeholder="Rechercher par nom, zone ou description..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={exportAgencies}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition duration-200 flex items-center"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Exporter CSV
                  </button>
                  <button
                    onClick={printPage}
                    className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition duration-200 flex items-center"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    Imprimer
                  </button>
                </div>
              </div>
            </div>

            {zones.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <div className="text-gray-400 mb-4">
                  <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune zone disponible</h3>
                <p className="text-gray-600">
                  Vous devez d'abord créer une zone avant de pouvoir ajouter des agences.
                </p>
              </div>
            ) : agencies.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <div className="text-gray-400 mb-4">
                  <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune agence trouvée</h3>
                <p className="text-gray-600 mb-4">
                  Créez votre première agence pour organiser les gares de votre zone.
                </p>
                {(user?.role === 'super_admin' || user?.role === 'zone_admin') && (
                  <button
                    onClick={() => openAddModal('agency')}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition duration-200"
                  >
                    Créer la première agence
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* Results summary */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-blue-700">
                    {filterAgencies(agencies, searchTerms.agencies).length} agence(s) trouvée(s)
                    {agencies.length !== filterAgencies(agencies, searchTerms.agencies).length && 
                      ` sur ${agencies.length} au total`
                    }
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filterAgencies(agencies, searchTerms.agencies).map((agency) => {
                    const zone = zones.find(z => z.id === agency.zone_id);
                    const agencyGares = gares.filter(g => g.agency_id === agency.id);
                    
                    return (
                      <div key={agency.id} className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-semibold text-gray-900">{agency.name}</h3>
                          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                            {agencyGares.length} gares
                          </span>
                        </div>
                        
                        <div className="space-y-2 text-sm text-gray-600">
                          <p><strong>Zone:</strong> {zone?.name || 'N/A'}</p>
                          <p><strong>Créée le:</strong> {new Date(agency.created_at).toLocaleDateString('fr-FR')}</p>
                        </div>

                        {agency.description && (
                          <p className="mt-3 text-sm text-gray-600">{agency.description}</p>
                        )}
                        
                        <ActionButtons 
                          item={agency} 
                          type="agency" 
                          onEdit={openEditModal}
                          onDelete={openDeleteModal}
                          onExport={exportItem}
                          onPrint={printItem}
                        />
                      </div>
                    );
                  })}
                </div>

                {/* Show "No results" message when search returns empty */}
                {filterAgencies(agencies, searchTerms.agencies).length === 0 && (
                  <div className="bg-white rounded-lg shadow p-8 text-center">
                    <div className="text-gray-400 mb-4">
                      <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun résultat trouvé</h3>
                    <p className="text-gray-600">
                      Aucune agence ne correspond à votre recherche "{searchTerms.agencies}".
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === 'zones' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Zones</h2>
              {user?.role === 'super_admin' && (
                <button
                  onClick={() => openAddModal('zone')}
                  className="no-print bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition duration-200"
                >
                  Nouvelle zone
                </button>
              )}
            </div>

            {/* Search and Export Controls */}
            <div className="bg-white rounded-lg shadow p-4 no-print">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
                <div className="flex-1 max-w-md">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rechercher
                  </label>
                  <input
                    type="text"
                    value={searchTerms.zones}
                    onChange={(e) => setSearchTerms({...searchTerms, zones: e.target.value})}
                    placeholder="Rechercher par nom ou description..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={exportZones}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition duration-200 flex items-center"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Exporter CSV
                  </button>
                  <button
                    onClick={printPage}
                    className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition duration-200 flex items-center"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    Imprimer
                  </button>
                </div>
              </div>
            </div>

            {zones.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <div className="text-gray-400 mb-4">
                  <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune zone trouvée</h3>
                <p className="text-gray-600 mb-4">
                  Commencez par créer votre première zone pour organiser vos agences et gares.
                </p>
                {user?.role === 'super_admin' && (
                  <button
                    onClick={() => openAddModal('zone')}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition duration-200"
                  >
                    Créer la première zone
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* Results summary */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-blue-700">
                    {filterZones(zones, searchTerms.zones).length} zone(s) trouvée(s)
                    {zones.length !== filterZones(zones, searchTerms.zones).length && 
                      ` sur ${zones.length} au total`
                    }
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filterZones(zones, searchTerms.zones).map((zone) => {
                    const zoneAgencies = agencies.filter(a => a.zone_id === zone.id);
                    const zoneGares = gares.filter(g => zoneAgencies.some(a => a.id === g.agency_id));
                    
                    return (
                      <div key={zone.id} className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-semibold text-gray-900">{zone.name}</h3>
                          <div className="flex space-x-2">
                            <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                              {zoneAgencies.length} agences
                            </span>
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                              {zoneGares.length} gares
                            </span>
                          </div>
                        </div>
                        
                        <div className="space-y-2 text-sm text-gray-600">
                          <p><strong>Créée le:</strong> {new Date(zone.created_at).toLocaleDateString('fr-FR')}</p>
                        </div>

                        {zone.description && (
                          <p className="mt-3 text-sm text-gray-600">{zone.description}</p>
                        )}
                        
                        <ActionButtons 
                          item={zone} 
                          type="zone" 
                          onEdit={openEditModal}
                          onDelete={openDeleteModal}
                          onExport={exportItem}
                          onPrint={printItem}
                        />
                      </div>
                    );
                  })}
                </div>

                {/* Show "No results" message when search returns empty */}
                {filterZones(zones, searchTerms.zones).length === 0 && (
                  <div className="bg-white rounded-lg shadow p-8 text-center">
                    <div className="text-gray-400 mb-4">
                      <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun résultat trouvé</h3>
                    <p className="text-gray-600">
                      Aucune zone ne correspond à votre recherche "{searchTerms.zones}".
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === 'lignes-connexion' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Lignes de connexion</h2>
              <button
                onClick={() => openAddModal('ligne')}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition duration-200"
              >
                Nouvelle ligne
              </button>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">État des connexions par opérateur</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {['Orange', 'Telecel', 'Moov'].map((operator) => {
                  const operatorRecharges = recharges.filter(r => r.operator === operator);
                  const activeRecharges = operatorRecharges.filter(r => r.status === 'active');
                  const expiringRecharges = operatorRecharges.filter(r => r.status === 'expiring_soon');
                  
                  return (
                    <div key={operator} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className={`font-semibold ${getOperatorColor(operator)}`}>{operator}</h4>
                        <div className="flex space-x-2">
                          <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                          <span className="text-sm text-gray-600">{activeRecharges.length} actives</span>
                        </div>
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Connexions actives:</span>
                          <span className="font-medium text-green-600">{activeRecharges.length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Expirent bientôt:</span>
                          <span className="font-medium text-yellow-600">{expiringRecharges.length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Total gares:</span>
                          <span className="font-medium">{new Set(operatorRecharges.map(r => r.gare_id)).size}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Historique des connexions</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Gare
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Opérateur
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Statut
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date expiration
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {recharges.slice(0, 10).map((recharge) => {
                      const gare = gares.find(g => g.id === recharge.gare_id);
                      return (
                        <tr key={recharge.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {gare?.name || 'Gare inconnue'}
                          </td>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${getOperatorColor(recharge.operator)}`}>
                            {recharge.operator}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(recharge.status)}`}>
                              {recharge.status === 'active' ? 'Actif' : 
                               recharge.status === 'expiring_soon' ? 'Expire bientôt' : 'Expiré'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(recharge.end_date).toLocaleDateString('fr-FR')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => openEditModal('recharge', recharge)}
                              className="text-indigo-600 hover:text-indigo-900 mr-3"
                            >
                              Modifier
                            </button>
                            <button
                              onClick={() => openDeleteModal('recharge', recharge)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Supprimer
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'rapports' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Rapports et Analyses</h2>
              <button
                onClick={() => window.print()}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition duration-200"
              >
                Imprimer
              </button>
            </div>

            {/* Rapport mensuel */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Rapport mensuel des recharges</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <p className="text-2xl font-bold text-gray-900">
                        {recharges.reduce((sum, r) => sum + r.cost, 0).toLocaleString()} FCFA
                      </p>
                      <p className="text-gray-600">Coût total</p>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 rounded-lg p-4">
                  <div className="flex items-center">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <p className="text-2xl font-bold text-gray-900">
                        {recharges.filter(r => r.status === 'active').length}
                      </p>
                      <p className="text-gray-600">Connexions actives</p>
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-50 rounded-lg p-4">
                  <div className="flex items-center">
                    <div className="p-2 bg-yellow-100 rounded-lg">
                      <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <p className="text-2xl font-bold text-gray-900">
                        {recharges.filter(r => r.status === 'expiring_soon').length}
                      </p>
                      <p className="text-gray-600">Expirent bientôt</p>
                    </div>
                  </div>
                </div>

                <div className="bg-red-50 rounded-lg p-4">
                  <div className="flex items-center">
                    <div className="p-2 bg-red-100 rounded-lg">
                      <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <p className="text-2xl font-bold text-gray-900">
                        {recharges.filter(r => r.status === 'expired').length}
                      </p>
                      <p className="text-gray-600">Expirées</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tableau détaillé */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Opérateur
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Gares couvertes
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Connexions actives
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Coût total (FCFA)
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Taux de couverture
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {['Orange', 'Telecel', 'Moov'].map((operator) => {
                      const operatorRecharges = recharges.filter(r => r.operator === operator);
                      const uniqueGares = new Set(operatorRecharges.map(r => r.gare_id)).size;
                      const activeConnections = operatorRecharges.filter(r => r.status === 'active').length;
                      const totalCost = operatorRecharges.reduce((sum, r) => sum + r.cost, 0);
                      const coverageRate = gares.length > 0 ? ((uniqueGares / gares.length) * 100).toFixed(1) : 0;
                      
                      return (
                        <tr key={operator}>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${getOperatorColor(operator)}`}>
                            {operator}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {uniqueGares} / {gares.length}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {activeConnections}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {totalCost.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {coverageRate}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            {modalType === 'zone' && <ZoneForm onClose={() => setShowAddModal(false)} onSuccess={fetchData} />}
            {modalType === 'agency' && <AgencyForm zones={zones} onClose={() => setShowAddModal(false)} onSuccess={fetchData} />}
            {modalType === 'gare' && <GareForm agencies={agencies} onClose={() => setShowAddModal(false)} onSuccess={fetchData} />}
            {modalType === 'recharge' && <RechargeForm gares={gares} onClose={() => setShowAddModal(false)} onSuccess={fetchData} />}
            {modalType === 'ligne' && <ConnectionLineForm gares={gares} onClose={() => setShowAddModal(false)} onSuccess={fetchData} />}
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            {modalType === 'zone' && <ZoneForm item={selectedItem} onClose={() => setShowEditModal(false)} onSuccess={fetchData} />}
            {modalType === 'agency' && <AgencyForm zones={zones} item={selectedItem} onClose={() => setShowEditModal(false)} onSuccess={fetchData} />}
            {modalType === 'gare' && <GareForm agencies={agencies} item={selectedItem} onClose={() => setShowEditModal(false)} onSuccess={fetchData} />}
            {modalType === 'recharge' && <RechargeForm gares={gares} item={selectedItem} onClose={() => setShowEditModal(false)} onSuccess={fetchData} />}
            {modalType === 'ligne' && <ConnectionLineForm gares={gares} item={selectedItem} onClose={() => setShowEditModal(false)} onSuccess={fetchData} />}
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Confirmer la suppression</h3>
            <p className="text-gray-600 mb-6">
              Êtes-vous sûr de vouloir supprimer {selectedItem?.name || 'cet élément'} ? Cette action est irréversible.
            </p>
            <div className="flex space-x-4">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition duration-200"
              >
                Annuler
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition duration-200"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Main App component
function App() {
  return (
    <AuthProvider>
      <div className="App">
        <AuthContent />
      </div>
    </AuthProvider>
  );
}

const AuthContent = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return user ? <Dashboard /> : <Login />;
};

export default App;