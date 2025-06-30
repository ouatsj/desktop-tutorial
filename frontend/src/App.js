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

// Edit forms
const EditZoneForm = ({ zone, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: zone?.name || '',
    description: zone?.description || ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await axios.put(`${API}/zones/${zone.id}`, formData);
      onSuccess();
      onClose();
    } catch (error) {
      setError(error.response?.data?.detail || 'Erreur lors de la modification');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">Modifier la zone</h3>
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
            {loading ? 'Modification...' : 'Modifier'}
          </button>
        </div>
      </form>
    </div>
  );
};

const EditAgencyForm = ({ agency, zones, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: agency?.name || '',
    zone_id: agency?.zone_id || '',
    description: agency?.description || ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await axios.put(`${API}/agencies/${agency.id}`, formData);
      onSuccess();
      onClose();
    } catch (error) {
      setError(error.response?.data?.detail || 'Erreur lors de la modification');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">Modifier l'agence</h3>
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
            {loading ? 'Modification...' : 'Modifier'}
          </button>
        </div>
      </form>
    </div>
  );
};

const EditGareForm = ({ gare, agencies, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: gare?.name || '',
    agency_id: gare?.agency_id || '',
    description: gare?.description || ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await axios.put(`${API}/gares/${gare.id}`, formData);
      onSuccess();
      onClose();
    } catch (error) {
      setError(error.response?.data?.detail || 'Erreur lors de la modification');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">Modifier la gare</h3>
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
            {loading ? 'Modification...' : 'Modifier'}
          </button>
        </div>
      </form>
    </div>
  );
};

const EditConnectionForm = ({ connection, gares, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    line_number: connection?.line_number || '',
    gare_id: connection?.gare_id || '',
    operator: connection?.operator || '',
    operator_type: connection?.operator_type || '',
    connection_type: connection?.connection_type || '',
    description: connection?.description || ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await axios.put(`${API}/connections/${connection.id}`, formData);
      onSuccess();
      onClose();
    } catch (error) {
      setError(error.response?.data?.detail || 'Erreur lors de la modification');
    } finally {
      setLoading(false);
    }
  };

  const mobileOperators = ['Orange', 'Telecel', 'Moov'];
  const fibreOperators = ['Onatel Fibre', 'Orange Fibre', 'Telecel Fibre', 'Canalbox', 'Faso Net', 'Wayodi'];

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">Modifier la ligne de connexion</h3>
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
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Gare *
          </label>
          <SearchableSelect
            options={gares}
            value={formData.gare_id}
            onChange={(value) => setFormData({...formData, gare_id: value})}
            placeholder="Sélectionner une gare"
            displayField="name"
            valueField="id"
          />
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
            {(formData.operator_type === 'mobile' ? mobileOperators : fibreOperators).map((operator) => (
              <option key={operator} value={operator}>
                {operator}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Type de service *
          </label>
          <input
            type="text"
            value={formData.connection_type}
            onChange={(e) => setFormData({...formData, connection_type: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            rows="2"
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
            {loading ? 'Modification...' : 'Modifier'}
          </button>
        </div>
      </form>
    </div>
  );
};

// Confirmation modal
const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message, confirmText = "Supprimer", isDestructive = true }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-gray-600 mb-6">{message}</p>
        <div className="flex space-x-4">
          <button
            onClick={onClose}
            className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition duration-200"
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-2 px-4 rounded-lg transition duration-200 ${
              isDestructive 
                ? 'bg-red-600 text-white hover:bg-red-700' 
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

// Composant de sélection avec saisie
const SearchableSelect = ({ options, value, onChange, placeholder, displayField = "name", valueField = "id" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredOptions, setFilteredOptions] = useState(options);

  useEffect(() => {
    if (searchTerm) {
      const filtered = options.filter(option => 
        option[displayField].toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredOptions(filtered);
    } else {
      setFilteredOptions(options);
    }
  }, [searchTerm, options, displayField]);

  const selectedOption = options.find(option => option[valueField] === value);

  const handleSelect = (option) => {
    onChange(option[valueField]);
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <div className="relative">
      <div
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer bg-white"
        onClick={() => setIsOpen(!isOpen)}
      >
        {selectedOption ? selectedOption[displayField] : placeholder}
        <span className="float-right text-gray-400">▼</span>
      </div>
      
      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-hidden">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border-b border-gray-200 focus:outline-none"
            placeholder="Rechercher..."
            autoFocus
          />
          <div className="max-h-48 overflow-y-auto">
            {filteredOptions.map((option) => (
              <div
                key={option[valueField]}
                className="px-3 py-2 hover:bg-blue-50 cursor-pointer"
                onClick={() => handleSelect(option)}
              >
                {option[displayField]}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Form components
const ConnectionForm = ({ gares, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    line_number: '',
    gare_id: '',
    operator: '',
    operator_type: '',
    connection_type: '',
    description: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await axios.post(`${API}/connections`, formData);
      onSuccess();
      onClose();
    } catch (error) {
      setError(error.response?.data?.detail || 'Erreur lors de la création');
    } finally {
      setLoading(false);
    }
  };

  const mobileOperators = ['Orange', 'Telecel', 'Moov'];
  const fibreOperators = ['Onatel Fibre', 'Orange Fibre', 'Telecel Fibre', 'Canalbox', 'Faso Net', 'Wayodi'];
  
  const handleOperatorTypeChange = (type) => {
    setFormData({
      ...formData,
      operator_type: type,
      operator: '',
      connection_type: type === 'mobile' ? 'Internet Mobile' : 'Fibre Optique'
    });
  };

  const generateLineNumber = () => {
    if (formData.operator && formData.gare_id) {
      const gare = gares.find(g => g.id === formData.gare_id);
      const operatorCode = formData.operator.replace(/\s+/g, '').substring(0, 3).toUpperCase();
      const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      const suggested = `${operatorCode}-${gare?.name?.substring(0, 3).toUpperCase() || 'GAR'}-${randomNum}`;
      setFormData({...formData, line_number: suggested});
    }
  };

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">Créer une nouvelle ligne de connexion</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Gare *
          </label>
          <SearchableSelect
            options={gares}
            value={formData.gare_id}
            onChange={(value) => setFormData({...formData, gare_id: value})}
            placeholder="Sélectionner une gare"
            displayField="name"
            valueField="id"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Type de connexion *
          </label>
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => handleOperatorTypeChange('mobile')}
              className={`p-3 border rounded-lg text-center transition duration-200 ${
                formData.operator_type === 'mobile'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              📱 Mobile
            </button>
            <button
              type="button"
              onClick={() => handleOperatorTypeChange('fibre')}
              className={`p-3 border rounded-lg text-center transition duration-200 ${
                formData.operator_type === 'fibre'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              🌐 Fibre
            </button>
          </div>
        </div>

        {formData.operator_type && (
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
              {(formData.operator_type === 'mobile' ? mobileOperators : fibreOperators).map((operator) => (
                <option key={operator} value={operator}>
                  {operator}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Numéro de ligne *
          </label>
          <div className="flex space-x-2">
            <input
              type="text"
              value={formData.line_number}
              onChange={(e) => setFormData({...formData, line_number: e.target.value})}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ex: ONG-GAR-001"
              required
            />
            <button
              type="button"
              onClick={generateLineNumber}
              disabled={!formData.operator || !formData.gare_id}
              className="bg-gray-500 text-white px-3 py-2 rounded-lg hover:bg-gray-600 transition duration-200 disabled:opacity-50"
              title="Générer automatiquement"
            >
              🎲
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            💡 Format conseillé: OPERATEUR-GARE-NUMERO (ex: ONG-CENTRAL-001)
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Type de service *
          </label>
          <input
            type="text"
            value={formData.connection_type}
            onChange={(e) => setFormData({...formData, connection_type: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Ex: Internet Mobile, Fibre Optique, Data"
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
            placeholder="Informations additionnelles sur cette ligne..."
            rows="2"
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

const RechargeForm = ({ connections, gares, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    connection_id: '',
    payment_type: '',
    start_date: '',
    end_date: '',
    volume: '',
    cost: '',
    description: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedConnection, setSelectedConnection] = useState(null);

  // Set default dates (start: today, end: 30 days from today)
  React.useEffect(() => {
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

  const getMobileVolumeOptions = () => ['1GB', '5GB', '10GB', '25GB', '50GB', '100GB', 'Illimité'];
  const getFibreVolumeOptions = () => ['10Mbps', '20Mbps', '50Mbps', '100Mbps', '200Mbps', '500Mbps', '1Gbps'];

  const handleConnectionChange = (connectionId) => {
    const connection = connections.find(c => c.id === connectionId);
    setSelectedConnection(connection);
    setFormData({
      ...formData,
      connection_id: connectionId,
      payment_type: connection?.operator_type === 'fibre' ? 'prepaid' : 'prepaid',
      volume: ''
    });
  };

  // Préparer les options de connexion avec les noms des gares
  const connectionOptions = connections
    .filter(c => c.status === 'active')
    .map(connection => {
      const gare = gares.find(g => g.id === connection.gare_id);
      return {
        id: connection.id,
        name: `${connection.line_number} - ${gare?.name || 'Gare inconnue'} - ${connection.operator} (${connection.connection_type})`,
        connection: connection
      };
    });

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">Recharger une ligne de connexion</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Ligne de connexion *
          </label>
          <SearchableSelect
            options={connectionOptions}
            value={formData.connection_id}
            onChange={(value) => {
              handleConnectionChange(value);
            }}
            placeholder="Rechercher et sélectionner une ligne"
            displayField="name"
            valueField="id"
          />
          {selectedConnection && (
            <div className="mt-2 p-3 bg-blue-50 rounded-lg text-sm border border-blue-200">
              <div className="flex items-center space-x-4">
                <div className="flex-1">
                  <p><strong>📍 Gare:</strong> {gares.find(g => g.id === selectedConnection.gare_id)?.name || 'Inconnue'}</p>
                  <p><strong>📞 Ligne:</strong> {selectedConnection.line_number}</p>
                </div>
                <div className="flex-1">
                  <p><strong>📡 Opérateur:</strong> {selectedConnection.operator}</p>
                  <p><strong>🔧 Type:</strong> {selectedConnection.operator_type === 'mobile' ? '📱 Mobile' : '🌐 Fibre'}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {selectedConnection && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type de paiement *
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setFormData({...formData, payment_type: 'prepaid'})}
                className={`p-2 border rounded-lg text-center transition duration-200 ${
                  formData.payment_type === 'prepaid'
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                💳 Prépayé
              </button>
              <button
                type="button"
                onClick={() => setFormData({...formData, payment_type: 'postpaid'})}
                className={`p-2 border rounded-lg text-center transition duration-200 ${
                  formData.payment_type === 'postpaid'
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                📅 Postpayé (Mensuel)
              </button>
            </div>
          </div>
        )}

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

        {selectedConnection && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {selectedConnection.operator_type === 'mobile' ? 'Volume de données' : 'Débit'} *
            </label>
            <select
              value={formData.volume}
              onChange={(e) => setFormData({...formData, volume: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Sélectionner {selectedConnection.operator_type === 'mobile' ? 'un volume' : 'un débit'}</option>
              {(selectedConnection.operator_type === 'mobile' ? getMobileVolumeOptions() : getFibreVolumeOptions()).map((volume) => (
                <option key={volume} value={volume}>
                  {volume}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Coût (FCFA) *
          </label>
          <input
            type="number"
            value={formData.cost}
            onChange={(e) => setFormData({...formData, cost: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={formData.payment_type === 'postpaid' ? 'Ex: 50000 (mensuel)' : 'Ex: 25, 50, 1050, 25000'}
            min="1"
            step="1"
            required
          />
          {formData.payment_type === 'postpaid' && (
            <p className="text-xs text-gray-500 mt-1">
              💡 Pour les abonnements mensuels, entrez le coût mensuel
            </p>
          )}
          {!formData.payment_type && (
            <p className="text-xs text-gray-500 mt-1">
              💡 Tous les montants sont acceptés : 25, 50, 1050, 5000, 25000, etc.
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Notes additionnelles..."
            rows="2"
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
            {loading ? 'Création...' : 'Recharger'}
          </button>
        </div>
      </form>
    </div>
  );
};

// Reports component
const ReportsModal = ({ isOpen, onClose, type, entityId, entityName }) => {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showShareOptions, setShowShareOptions] = useState(false);

  useEffect(() => {
    if (isOpen && entityId) {
      fetchReport();
    }
  }, [isOpen, entityId, type]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/reports/${type}/${entityId}`);
      setReport(response.data);
    } catch (error) {
      console.error('Error fetching report:', error);
    } finally {
      setLoading(false);
    }
  };

  const shareWhatsApp = async () => {
    if (!phoneNumber || !report) return;

    try {
      const response = await axios.post(`${API}/reports/share/whatsapp`, {
        report_data: {
          type,
          entity_name: entityName,
          statistics: report.statistics
        },
        phone_number: phoneNumber
      });
      
      // Open WhatsApp
      window.open(response.data.whatsapp_url, '_blank');
      setShowShareOptions(false);
      setPhoneNumber('');
    } catch (error) {
      console.error('Error sharing report:', error);
    }
  };

  const exportReport = () => {
    if (!report) return;

    // Create detailed CSV content with consumption and costs
    const csvData = [
      ['RAPPORT ' + type.toUpperCase() + ' - ' + entityName],
      ['Généré le', new Date(report.generated_at).toLocaleDateString('fr-FR')],
      [],
      ['=== STATISTIQUES GÉNÉRALES ==='],
      ['Total zones', type === 'zone' ? '1' : report.statistics.total_zones || 'N/A'],
      ['Total agences', report.statistics.total_agencies || report.statistics.total_gares ? '1' : 'N/A'],
      ['Total gares', report.statistics.total_gares || '1'],
      ['Total recharges', report.statistics.total_recharges],
      ['Recharges actives', report.statistics.active_recharges],
      ['Recharges expirées', report.statistics.expired_recharges],
      ['Recharges expirant bientôt', report.statistics.expiring_recharges],
      [],
      ['=== ANALYSE FINANCIÈRE ==='],
      ['Coût total des recharges', report.statistics.total_cost.toLocaleString() + ' FCFA'],
      ['Coût moyen par recharge', report.statistics.total_recharges > 0 ? Math.round(report.statistics.total_cost / report.statistics.total_recharges).toLocaleString() + ' FCFA' : '0 FCFA'],
      ['Investissement actuel', report.statistics.active_recharges > 0 ? Math.round((report.statistics.active_recharges / report.statistics.total_recharges) * report.statistics.total_cost).toLocaleString() + ' FCFA' : '0 FCFA'],
      [],
      ['=== RÉPARTITION PAR OPÉRATEUR ==='],
      ['Opérateur', 'Recharges', 'Coût Total (FCFA)', 'Recharges Actives', 'Taux d\'utilisation (%)']
    ];

    // Add operator statistics
    if (report.statistics.operator_stats) {
      Object.entries(report.statistics.operator_stats).forEach(([operator, stats]) => {
        const utilizationRate = stats.count > 0 ? Math.round((stats.active / stats.count) * 100) : 0;
        csvData.push([
          operator,
          stats.count,
          stats.cost.toLocaleString(),
          stats.active,
          utilizationRate + '%'
        ]);
      });
    }

    // Add gare-level details for agency and zone reports
    if ((type === 'agency' || type === 'zone') && report.statistics.gare_stats) {
      csvData.push([]);
      csvData.push(['=== DÉTAIL PAR GARE ===']);
      csvData.push(['Gare', 'Recharges', 'Coût Total (FCFA)', 'Recharges Actives', 'Efficacité (%)']);
      
      Object.entries(report.statistics.gare_stats).forEach(([gareId, stats]) => {
        const efficiency = stats.count > 0 ? Math.round((stats.active / stats.count) * 100) : 0;
        csvData.push([
          stats.name,
          stats.count,
          stats.cost.toLocaleString(),
          stats.active,
          efficiency + '%'
        ]);
      });
    }

    // Add monthly consumption analysis if recharges exist
    if (report.recharges && report.recharges.length > 0) {
      csvData.push([]);
      csvData.push(['=== ANALYSE DE CONSOMMATION MENSUELLE ===']);
      
      const monthlyData = {};
      report.recharges.forEach(recharge => {
        const month = new Date(recharge.start_date).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long' });
        if (!monthlyData[month]) {
          monthlyData[month] = { count: 0, cost: 0, volume: [] };
        }
        monthlyData[month].count++;
        monthlyData[month].cost += recharge.cost;
        monthlyData[month].volume.push(recharge.volume);
      });

      csvData.push(['Mois', 'Nombre de recharges', 'Coût total (FCFA)', 'Coût moyen (FCFA)', 'Volumes principaux']);
      Object.entries(monthlyData).forEach(([month, data]) => {
        const avgCost = Math.round(data.cost / data.count);
        const topVolumes = [...new Set(data.volume)].slice(0, 3).join(', ');
        csvData.push([month, data.count, data.cost.toLocaleString(), avgCost.toLocaleString(), topVolumes]);
      });
    }

    // Convert to CSV string
    const csvContent = csvData.map(row => 
      row.map(cell => `"${cell}"`).join(',')
    ).join('\n');

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `rapport-detaille-${type}-${entityName}-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              📊 Rapport {type.charAt(0).toUpperCase() + type.slice(1)} - {entityName}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Génération du rapport...</p>
            </div>
          ) : report ? (
            <div className="space-y-6">
              {/* Report Header */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-blue-600">{report.statistics.total_recharges}</p>
                    <p className="text-sm text-gray-600">Total recharges</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-600">{report.statistics.active_recharges}</p>
                    <p className="text-sm text-gray-600">Actives</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-yellow-600">{report.statistics.expiring_recharges}</p>
                    <p className="text-sm text-gray-600">Expirent bientôt</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{report.statistics.total_cost?.toLocaleString()} FCFA</p>
                    <p className="text-sm text-gray-600">Coût total</p>
                  </div>
                </div>
              </div>

              {/* Operator Statistics */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Statistiques par opérateur</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(report.statistics.operator_stats || {}).map(([operator, stats]) => (
                    <div key={operator} className="bg-white border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900">{operator}</h4>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          operator.includes('Fibre') ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {operator.includes('Fibre') ? '🌐 Fibre' : '📱 Mobile'}
                        </span>
                      </div>
                      <div className="space-y-1 text-sm text-gray-600">
                        <p>Recharges: {stats.count}</p>
                        <p>Actives: {stats.active}</p>
                        <p>Coût: {stats.cost?.toLocaleString()} FCFA</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Recharges */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Recharges récentes</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Opérateur</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Volume</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Coût</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {report.recharges.slice(0, 10).map((recharge) => (
                        <tr key={recharge.id}>
                          <td className="px-4 py-2 text-sm text-gray-900">
                            {new Date(recharge.created_at).toLocaleDateString('fr-FR')}
                          </td>
                          <td className="px-4 py-2 text-sm font-medium text-gray-900">{recharge.operator}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">{recharge.volume}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">{recharge.cost.toLocaleString()} FCFA</td>
                          <td className="px-4 py-2">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              recharge.status === 'active' ? 'bg-green-100 text-green-800' :
                              recharge.status === 'expiring_soon' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {recharge.status === 'active' ? 'Actif' : 
                               recharge.status === 'expiring_soon' ? 'Expire bientôt' : 'Expiré'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-4 pt-6 border-t border-gray-200">
                <button
                  onClick={exportReport}
                  className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition duration-200"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Exporter CSV</span>
                </button>

                <button
                  onClick={() => setShowShareOptions(!showShareOptions)}
                  className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition duration-200"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                  </svg>
                  <span>Partager WhatsApp</span>
                </button>

                {showShareOptions && (
                  <div className="w-full bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">Partager sur WhatsApp</h4>
                    <div className="flex space-x-2">
                      <input
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="Numéro WhatsApp (ex: 22670123456)"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        onClick={shareWhatsApp}
                        disabled={!phoneNumber}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition duration-200 disabled:opacity-50"
                      >
                        Envoyer
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      💡 Format: code pays + numéro (ex: 22670123456 pour +226 70 12 34 56)
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-600">Aucune donnée disponible pour ce rapport.</p>
            </div>
          )}
        </div>
      </div>
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
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [showReportsModal, setShowReportsModal] = useState(false);
  const [reportConfig, setReportConfig] = useState({ type: '', entityId: '', entityName: '' });

  // États pour les filtres de recherche des recharges
  const [rechargeSearchTerm, setRechargeSearchTerm] = useState('');
  const [selectedOperatorFilter, setSelectedOperatorFilter] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('');

  // États pour les filtres de recherche des recharges
  const [rechargeSearchTerm, setRechargeSearchTerm] = useState('');
  const [selectedOperatorFilter, setSelectedOperatorFilter] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('');

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
      setConnections(connectionsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Logique de filtrage des recharges
  const filteredRecharges = recharges.filter(recharge => {
    const connection = connections.find(c => c.id === recharge.connection_id);
    const gare = gares.find(g => g.id === recharge.gare_id);
    
    // Filtrage par terme de recherche
    const searchMatch = !rechargeSearchTerm || (
      (connection?.line_number?.toLowerCase().includes(rechargeSearchTerm.toLowerCase())) ||
      (gare?.name?.toLowerCase().includes(rechargeSearchTerm.toLowerCase())) ||
      (recharge.operator?.toLowerCase().includes(rechargeSearchTerm.toLowerCase())) ||
      (recharge.volume?.toLowerCase().includes(rechargeSearchTerm.toLowerCase()))
    );
    
    // Filtrage par opérateur
    const operatorMatch = !selectedOperatorFilter || recharge.operator === selectedOperatorFilter;
    
    // Filtrage par statut
    const statusMatch = !selectedStatusFilter || recharge.status === selectedStatusFilter;
    
    return searchMatch && operatorMatch && statusMatch;
  });

  const openAddModal = (type) => {
    setModalType(type);
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
      const endpoints = {
        zone: 'zones',
        agency: 'agencies',
        gare: 'gares',
        connection: 'connections',
        recharge: 'recharges'
      };
      
      await axios.delete(`${API}/${endpoints[modalType]}/${selectedItem.id}`);
      setShowDeleteModal(false);
      setSelectedItem(null);
      fetchData();
    } catch (error) {
      console.error('Error deleting item:', error);
      alert(error.response?.data?.detail || 'Erreur lors de la suppression');
    }
  };

  const toggleConnectionStatus = async (connectionId, newStatus) => {
    try {
      const connection = connections.find(c => c.id === connectionId);
      if (!connection) return;

      await axios.put(`${API}/connections/${connectionId}`, {
        ...connection,
        status: newStatus
      });
      
      fetchData(); // Refresh data to show updated status
    } catch (error) {
      console.error('Error updating connection status:', error);
      alert(error.response?.data?.detail || 'Erreur lors de la mise à jour du statut');
    }
  };

  const openReportModal = (type, entityId, entityName) => {
    setReportConfig({ type, entityId, entityName });
    setShowReportsModal(true);
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
      'Orange': 'text-orange-600',
      'Telecel': 'text-blue-600',
      'Moov': 'text-green-600',
      'Onatel Fibre': 'text-purple-600',
      'Orange Fibre': 'text-orange-600',
      'Telecel Fibre': 'text-blue-600',
      'Canalbox': 'text-red-600',
      'Faso Net': 'text-indigo-600',
      'Wayodi': 'text-cyan-600'
    };
    return colors[operator] || 'text-gray-600';
  };

  const getOperatorIcon = (operator) => {
    if (operator.includes('Fibre') || ['Canalbox', 'Faso Net', 'Wayodi'].includes(operator)) {
      return '🌐';
    }
    return '📱';
  };

  const getConnectionStatusColor = (status) => {
    const colors = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      suspended: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
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
      <header className="bg-white shadow-sm border-b">
        <div className="px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <h1 className="text-lg sm:text-2xl font-bold text-gray-900 truncate">
                Gestion des Recharges - Burkina Faso
              </h1>
              <p className="text-gray-600 text-sm hidden sm:block">Système de suivi des connexions internet</p>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-gray-900">{user?.full_name}</p>
                <p className="text-xs text-gray-500">{user?.role?.replace('_', ' ')}</p>
              </div>
              <div className="text-right sm:hidden">
                <p className="text-xs font-medium text-gray-900 truncate max-w-20">{user?.full_name}</p>
              </div>
              <button
                onClick={logout}
                className="bg-red-600 text-white px-2 py-1 sm:px-4 sm:py-2 rounded-lg hover:bg-red-700 transition duration-200 text-sm"
              >
                <span className="hidden sm:inline">Déconnexion</span>
                <span className="sm:hidden">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="px-4 sm:px-6">
          <div className="flex space-x-2 sm:space-x-8 overflow-x-auto">
            {['dashboard', 'connexions', 'recharges', 'gares', 'agencies', 'zones'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-2 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab === 'dashboard' ? (
                  <>
                    <span className="hidden sm:inline">Tableau de bord</span>
                    <span className="sm:hidden">📊</span>
                  </>
                ) : tab === 'connexions' ? (
                  <>
                    <span className="hidden sm:inline">Lignes de connexion</span>
                    <span className="sm:hidden">🔗</span>
                  </>
                ) : tab === 'recharges' ? (
                  <>
                    <span className="hidden sm:inline">Recharges</span>
                    <span className="sm:hidden">💳</span>
                  </>
                ) : tab === 'gares' ? (
                  <>
                    <span className="hidden sm:inline">Gares</span>
                    <span className="sm:hidden">🚂</span>
                  </>
                ) : tab === 'agencies' ? (
                  <>
                    <span className="hidden sm:inline">Agences</span>
                    <span className="sm:hidden">🏢</span>
                  </>
                ) : (
                  <>
                    <span className="hidden sm:inline">Zones</span>
                    <span className="sm:hidden">📍</span>
                  </>
                )}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="p-4 sm:p-6">
        {activeTab === 'dashboard' && stats && (
          <div className="space-y-4 sm:space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
              <div className="bg-white rounded-lg shadow p-4 sm:p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <svg className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <div className="ml-3 sm:ml-4">
                    <p className="text-lg sm:text-2xl font-bold text-gray-900">{stats.total_gares}</p>
                    <p className="text-gray-600 text-xs sm:text-sm">Gares</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-4 sm:p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <svg className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                  </div>
                  <div className="ml-3 sm:ml-4">
                    <p className="text-lg sm:text-2xl font-bold text-gray-900">{stats.total_connections}</p>
                    <p className="text-gray-600 text-xs sm:text-sm">Connexions</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-4 sm:p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <svg className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-3 sm:ml-4">
                    <p className="text-lg sm:text-2xl font-bold text-gray-900">{stats.active_recharges}</p>
                    <p className="text-gray-600 text-xs sm:text-sm">Recharges actives</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-4 sm:p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <svg className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <div className="ml-3 sm:ml-4">
                    <p className="text-lg sm:text-2xl font-bold text-gray-900">{stats.expiring_recharges}</p>
                    <p className="text-gray-600 text-xs sm:text-sm">Expirent bientôt</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Connection Type Statistics */}
            <div className="bg-white rounded-lg shadow p-4 sm:p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Types de connexions</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 sm:p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center justify-center mb-2">
                    <span className="text-xl sm:text-2xl">📱</span>
                  </div>
                  <p className="text-xl sm:text-2xl font-bold text-blue-600">{stats.connection_type_stats.mobile}</p>
                  <p className="text-gray-600 text-xs sm:text-sm">Connexions Mobile</p>
                </div>
                <div className="text-center p-3 sm:p-4 bg-purple-50 rounded-lg">
                  <div className="flex items-center justify-center mb-2">
                    <span className="text-xl sm:text-2xl">🌐</span>
                  </div>
                  <p className="text-xl sm:text-2xl font-bold text-purple-600">{stats.connection_type_stats.fibre}</p>
                  <p className="text-gray-600 text-xs sm:text-sm">Connexions Fibre</p>
                </div>
              </div>
            </div>

            {/* Operator Statistics */}
            <div className="bg-white rounded-lg shadow p-4 sm:p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Statistiques par opérateur</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-3 sm:gap-4">
                {stats.operator_stats.map((stat) => (
                  <div key={stat.operator} className="text-center p-3 sm:p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-center space-x-1 sm:space-x-2 mb-2">
                      <span className="text-lg sm:text-2xl">{getOperatorIcon(stat.operator)}</span>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        stat.type === 'fibre' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {stat.type === 'fibre' ? 'Fibre' : 'Mobile'}
                      </span>
                    </div>
                    <p className={`text-lg sm:text-xl font-bold ${getOperatorColor(stat.operator)}`}>
                      {stat.recharge_count}
                    </p>
                    <p className="text-gray-600 text-xs sm:text-sm truncate">{stat.operator}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      <span className="block sm:inline">{stat.connections_count} connexions</span>
                      <span className="hidden sm:inline"> | </span>
                      <span className="block sm:inline">{stat.total_cost.toLocaleString()} FCFA</span>
                    </p>
                  </div>
                ))}
              </div>

              {/* Payment Type Statistics */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h4 className="text-md font-semibold text-gray-900 mb-3">Types de paiement</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <p className="text-lg sm:text-xl font-bold text-green-600">{stats.payment_type_stats.prepaid}</p>
                    <p className="text-xs sm:text-sm text-gray-600">💳 Prépayé</p>
                  </div>
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <p className="text-lg sm:text-xl font-bold text-blue-600">{stats.payment_type_stats.postpaid}</p>
                    <p className="text-xs sm:text-sm text-gray-600">📅 Postpayé</p>
                  </div>
                </div>
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

        {activeTab === 'connexions' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Lignes de connexion</h2>
              {gares.length > 0 && (
                <button
                  onClick={() => openAddModal('connection')}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition duration-200"
                >
                  Nouvelle ligne
                </button>
              )}
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
                  Vous devez d'abord créer des gares avant de pouvoir ajouter des lignes de connexion.
                </p>
              </div>
            ) : connections.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <div className="text-gray-400 mb-4">
                  <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune ligne de connexion</h3>
                <p className="text-gray-600 mb-4">
                  Créez votre première ligne de connexion pour commencer à gérer les recharges.
                </p>
                <button
                  onClick={() => openAddModal('connection')}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition duration-200"
                >
                  Créer la première ligne
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Numéro de ligne
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Gare
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Opérateur
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Type
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Dernière recharge
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
                      {connections.map((connection) => {
                        const gare = gares.find(g => g.id === connection.gare_id);
                        const connectionRecharges = recharges.filter(r => r.connection_id === connection.id);
                        const lastRecharge = connectionRecharges.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
                        
                        return (
                          <tr key={connection.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {connection.line_number}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {gare?.name || 'Gare inconnue'}
                            </td>
                            <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${getOperatorColor(connection.operator)}`}>
                              <div className="flex items-center space-x-1">
                                <span>{getOperatorIcon(connection.operator)}</span>
                                <span>{connection.operator}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                connection.operator_type === 'fibre' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                              }`}>
                                {connection.connection_type}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {connection.last_recharge_date ? 
                                new Date(connection.last_recharge_date).toLocaleDateString('fr-FR') : 
                                'Jamais'
                              }
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {connection.expiry_date ? 
                                new Date(connection.expiry_date).toLocaleDateString('fr-FR') : 
                                'N/A'
                              }
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getConnectionStatusColor(connection.status)}`}>
                                {connection.status === 'active' ? 'Active' : 
                                 connection.status === 'inactive' ? 'Inactive' : 'Suspendue'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex items-center space-x-2">
                                {connection.status === 'inactive' && (
                                  <button
                                    onClick={() => toggleConnectionStatus(connection.id, 'active')}
                                    className="text-green-600 hover:text-green-900"
                                    title="Activer"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                  </button>
                                )}
                                {connection.status === 'active' && (
                                  <button
                                    onClick={() => toggleConnectionStatus(connection.id, 'inactive')}
                                    className="text-orange-600 hover:text-orange-900"
                                    title="Désactiver"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                  </button>
                                )}
                                <button
                                  onClick={() => openEditModal('connection', connection)}
                                  className="text-indigo-600 hover:text-indigo-900"
                                  title="Modifier"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => openDeleteModal('connection', connection)}
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
            )}
          </div>
        )}

        {activeTab === 'recharges' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h2 className="text-xl font-semibold text-gray-900">Gestion des recharges</h2>
              {connections.filter(c => c.status === 'active').length > 0 && (
                <button
                  onClick={() => openAddModal('recharge')}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition duration-200"
                >
                  Nouvelle recharge
                </button>
              )}
            </div>

            {/* Champ de recherche automatique */}
            {recharges.length > 0 && (
              <div className="bg-white rounded-lg shadow p-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      🔍 Rechercher une ligne de connexion
                    </label>
                    <input
                      type="text"
                      value={rechargeSearchTerm}
                      onChange={(e) => setRechargeSearchTerm(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Tapez le numéro de ligne, nom de gare, ou opérateur..."
                    />
                  </div>
                  <div className="flex-shrink-0">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      📱 Filtrer par opérateur
                    </label>
                    <select
                      value={selectedOperatorFilter}
                      onChange={(e) => setSelectedOperatorFilter(e.target.value)}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Tous les opérateurs</option>
                      <option value="Orange">Orange</option>
                      <option value="Telecel">Telecel</option>
                      <option value="Moov">Moov</option>
                      <option value="Onatel Fibre">Onatel Fibre</option>
                      <option value="Orange Fibre">Orange Fibre</option>
                      <option value="Telecel Fibre">Telecel Fibre</option>
                      <option value="Canalbox">Canalbox</option>
                      <option value="Faso Net">Faso Net</option>
                      <option value="Wayodi">Wayodi</option>
                    </select>
                  </div>
                  <div className="flex-shrink-0">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      📊 Filtrer par statut
                    </label>
                    <select
                      value={selectedStatusFilter}
                      onChange={(e) => setSelectedStatusFilter(e.target.value)}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Tous les statuts</option>
                      <option value="active">Actif</option>
                      <option value="expiring_soon">Expire bientôt</option>
                      <option value="expired">Expiré</option>
                    </select>
                  </div>
                  {(rechargeSearchTerm || selectedOperatorFilter || selectedStatusFilter) && (
                    <div className="flex-shrink-0 flex items-end">
                      <button
                        onClick={() => {
                          setRechargeSearchTerm('');
                          setSelectedOperatorFilter('');
                          setSelectedStatusFilter('');
                        }}
                        className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition duration-200"
                        title="Effacer tous les filtres"
                      >
                        ✖️ Effacer
                      </button>
                    </div>
                  )}
                </div>
                {(rechargeSearchTerm || selectedOperatorFilter || selectedStatusFilter) && (
                  <div className="mt-3 text-sm text-gray-600">
                    {filteredRecharges.length} recharge(s) trouvée(s) sur {recharges.length} au total
                  </div>
                )}
              </div>
            )}

            {connections.filter(c => c.status === 'active').length === 0 ? (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <div className="text-gray-400 mb-4">
                  <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {connections.length === 0 ? 'Aucune ligne de connexion disponible' : 'Aucune ligne de connexion active'}
                </h3>
                <p className="text-gray-600">
                  {connections.length === 0 
                    ? 'Vous devez d\'abord créer des lignes de connexion avant de pouvoir ajouter des recharges.'
                    : 'Activez des lignes de connexion existantes ou créez-en de nouvelles pour pouvoir ajouter des recharges.'
                  }
                </p>
                {connections.length === 0 && (
                  <button
                    onClick={() => setActiveTab('connexions')}
                    className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition duration-200"
                  >
                    Créer une ligne de connexion
                  </button>
                )}
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
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Ligne
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Gare
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Opérateur
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Type
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Volume/Débit
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
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {recharges.map((recharge) => {
                        const gare = gares.find(g => g.id === recharge.gare_id);
                        const connection = connections.find(c => c.id === recharge.connection_id);
                        return (
                          <tr key={recharge.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-600">
                              {recharge.line_number || connection?.line_number || 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {gare?.name || 'Gare inconnue'}
                            </td>
                            <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${getOperatorColor(recharge.operator)}`}>
                              <div className="flex items-center space-x-1">
                                <span>{getOperatorIcon(recharge.operator)}</span>
                                <span>{recharge.operator}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                recharge.payment_type === 'postpaid' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                              }`}>
                                {recharge.payment_type === 'postpaid' ? '📅 Mensuel' : '💳 Prépayé'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {recharge.volume}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {recharge.cost.toLocaleString()} FCFA
                              {recharge.payment_type === 'postpaid' && <span className="text-xs text-gray-500">/mois</span>}
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
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'zones' && (
          <div className="space-y-4 sm:space-y-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
              <h2 className="text-xl font-semibold text-gray-900">Zones</h2>
              {user?.role === 'super_admin' && (
                <button
                  onClick={() => openAddModal('zone')}
                  className="w-full sm:w-auto bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition duration-200"
                >
                  Nouvelle zone
                </button>
              )}
            </div>

            {zones.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-6 sm:p-8 text-center">
                <div className="text-gray-400 mb-4">
                  <svg className="mx-auto h-10 sm:h-12 w-10 sm:w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune zone trouvée</h3>
                <p className="text-gray-600 mb-4 text-sm sm:text-base">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {zones.map((zone) => {
                  const zoneAgencies = agencies.filter(a => a.zone_id === zone.id);
                  const zoneGares = gares.filter(g => zoneAgencies.some(a => a.id === g.agency_id));
                  
                  return (
                    <div key={zone.id} className="bg-white rounded-lg shadow p-4 sm:p-6">
                      <div className="flex items-start justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900 truncate flex-1 mr-2">{zone.name}</h3>
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => openReportModal('zone', zone.id, zone.name)}
                            className="text-gray-400 hover:text-blue-600 transition duration-200 p-1"
                            title="Voir le rapport"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </button>
                          {user?.role === 'super_admin' && (
                            <>
                              <button
                                onClick={() => openEditModal('zone', zone)}
                                className="text-gray-400 hover:text-green-600 transition duration-200 p-1"
                                title="Modifier"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => openDeleteModal('zone', zone)}
                                className="text-gray-400 hover:text-red-600 transition duration-200 p-1"
                                title="Supprimer"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-2 mb-3">
                        <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                          {zoneAgencies.length} agences
                        </span>
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                          {zoneGares.length} gares
                        </span>
                      </div>
                      
                      <div className="space-y-1 text-sm text-gray-600">
                        <p><strong>Créée le:</strong> {new Date(zone.created_at).toLocaleDateString('fr-FR')}</p>
                      </div>

                      {zone.description && (
                        <p className="mt-3 text-sm text-gray-600 line-clamp-2">{zone.description}</p>
                      )}
                    </div>
                  );
                })}
              </div>
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
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition duration-200"
                >
                  Nouvelle agence
                </button>
              )}
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {agencies.map((agency) => {
                  const zone = zones.find(z => z.id === agency.zone_id);
                  const agencyGares = gares.filter(g => g.agency_id === agency.id);
                  
                  return (
                    <div key={agency.id} className="bg-white rounded-lg shadow p-4 sm:p-6">
                      <div className="flex items-start justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900 truncate flex-1 mr-2">{agency.name}</h3>
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => openReportModal('agency', agency.id, agency.name)}
                            className="text-gray-400 hover:text-blue-600 transition duration-200 p-1"
                            title="Voir le rapport"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </button>
                          {(user?.role === 'super_admin' || user?.role === 'zone_admin') && (
                            <>
                              <button
                                onClick={() => openEditModal('agency', agency)}
                                className="text-gray-400 hover:text-green-600 transition duration-200 p-1"
                                title="Modifier"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => openDeleteModal('agency', agency)}
                                className="text-gray-400 hover:text-red-600 transition duration-200 p-1"
                                title="Supprimer"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-2 mb-3">
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                          {agencyGares.length} gares
                        </span>
                      </div>
                      
                      <div className="space-y-1 text-sm text-gray-600">
                        <p><strong>Zone:</strong> {zone?.name || 'N/A'}</p>
                        <p><strong>Créée le:</strong> {new Date(agency.created_at).toLocaleDateString('fr-FR')}</p>
                      </div>

                      {agency.description && (
                        <p className="mt-3 text-sm text-gray-600 line-clamp-2">{agency.description}</p>
                      )}
                    </div>
                  );
                })}
              </div>
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
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition duration-200"
                >
                  Nouvelle gare
                </button>
              )}
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {gares.map((gare) => {
                  const agency = agencies.find(a => a.id === gare.agency_id);
                  const zone = zones.find(z => z.id === agency?.zone_id);
                  const gareRecharges = recharges.filter(r => r.gare_id === gare.id);
                  
                  return (
                    <div key={gare.id} className="bg-white rounded-lg shadow p-4 sm:p-6">
                      <div className="flex items-start justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900 truncate flex-1 mr-2">{gare.name}</h3>
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => openReportModal('gare', gare.id, gare.name)}
                            className="text-gray-400 hover:text-blue-600 transition duration-200 p-1"
                            title="Voir le rapport"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => openEditModal('gare', gare)}
                            className="text-gray-400 hover:text-green-600 transition duration-200 p-1"
                            title="Modifier"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => openDeleteModal('gare', gare)}
                            className="text-gray-400 hover:text-red-600 transition duration-200 p-1"
                            title="Supprimer"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-2 mb-3">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                          {gareRecharges.filter(r => r.status === 'active').length} actives
                        </span>
                      </div>
                      
                      <div className="space-y-1 text-sm text-gray-600">
                        <p><strong>Zone:</strong> {zone?.name || 'N/A'}</p>
                        <p><strong>Agence:</strong> {agency?.name || 'N/A'}</p>
                        <p><strong>Recharges totales:</strong> {gareRecharges.length}</p>
                      </div>

                      {gare.description && (
                        <p className="mt-3 text-sm text-gray-600 line-clamp-2">{gare.description}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
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
            {modalType === 'connection' && <ConnectionForm gares={gares} onClose={() => setShowAddModal(false)} onSuccess={fetchData} />}
            {modalType === 'recharge' && <RechargeForm connections={connections} gares={gares} onClose={() => setShowAddModal(false)} onSuccess={fetchData} />}
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            {modalType === 'zone' && <EditZoneForm zone={selectedItem} onClose={() => {setShowEditModal(false); setSelectedItem(null);}} onSuccess={fetchData} />}
            {modalType === 'agency' && <EditAgencyForm agency={selectedItem} zones={zones} onClose={() => {setShowEditModal(false); setSelectedItem(null);}} onSuccess={fetchData} />}
            {modalType === 'gare' && <EditGareForm gare={selectedItem} agencies={agencies} onClose={() => {setShowEditModal(false); setSelectedItem(null);}} onSuccess={fetchData} />}
            {modalType === 'connection' && <EditConnectionForm connection={selectedItem} gares={gares} onClose={() => {setShowEditModal(false); setSelectedItem(null);}} onSuccess={fetchData} />}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => {setShowDeleteModal(false); setSelectedItem(null);}}
        onConfirm={handleDelete}
        title={`Supprimer ${modalType === 'zone' ? 'la zone' : modalType === 'agency' ? "l'agence" : modalType === 'gare' ? 'la gare' : modalType === 'connection' ? 'la ligne' : 'la recharge'}`}
        message={`Êtes-vous sûr de vouloir supprimer ${selectedItem?.name || selectedItem?.line_number || 'cet élément'} ? Cette action est irréversible.`}
        confirmText="Supprimer"
        isDestructive={true}
      />

      {/* Reports Modal */}
      <ReportsModal
        isOpen={showReportsModal}
        onClose={() => setShowReportsModal(false)}
        type={reportConfig.type}
        entityId={reportConfig.entityId}
        entityName={reportConfig.entityName}
      />
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