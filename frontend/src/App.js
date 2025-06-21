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

// Dashboard component
const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [recharges, setRecharges] = useState([]);
  const [zones, setZones] = useState([]);
  const [agencies, setAgencies] = useState([]);
  const [gares, setGares] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalType, setModalType] = useState('');

  const { user, logout } = useAuth();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, alertsRes, rechargesRes, zonesRes, agenciesRes, garesRes] = await Promise.all([
        axios.get(`${API}/dashboard/stats`),
        axios.get(`${API}/alerts`),
        axios.get(`${API}/recharges`),
        axios.get(`${API}/zones`),
        axios.get(`${API}/agencies`),
        axios.get(`${API}/gares`)
      ]);

      setStats(statsRes.data);
      setAlerts(alertsRes.data);
      setRecharges(rechargesRes.data);
      setZones(zonesRes.data);
      setAgencies(agenciesRes.data);
      setGares(garesRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = (type) => {
    setModalType(type);
    setShowAddModal(true);
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
      <header className="bg-white shadow-sm border-b">
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
      <nav className="bg-white shadow-sm border-b">
        <div className="px-6">
          <div className="flex space-x-8">
            {['dashboard', 'recharges', 'gares', 'agencies', 'zones'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-2 border-b-2 font-medium text-sm capitalize ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab === 'dashboard' ? 'Tableau de bord' : tab}
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
              <button
                onClick={() => openAddModal('recharge')}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition duration-200"
              >
                Nouvelle recharge
              </button>
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
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {recharges.map((recharge) => {
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
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'gares' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Gares</h2>
              <button
                onClick={() => openAddModal('gare')}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition duration-200"
              >
                Nouvelle gare
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {gares.map((gare) => {
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
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'agencies' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Agences</h2>
              <button
                onClick={() => openAddModal('agency')}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition duration-200"
              >
                Nouvelle agence
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {agencies.map((agency) => {
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
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'zones' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Zones</h2>
              {user?.role === 'super_admin' && (
                <button
                  onClick={() => openAddModal('zone')}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition duration-200"
                >
                  Nouvelle zone
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {zones.map((zone) => {
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
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* Add Modal (simplified placeholder) */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              Ajouter {modalType === 'zone' ? 'une zone' : 
                      modalType === 'agency' ? 'une agence' : 
                      modalType === 'gare' ? 'une gare' : 'une recharge'}
            </h3>
            <p className="text-gray-600 mb-4">
              Formulaire d'ajout pour {modalType} (à implémenter)
            </p>
            <div className="flex space-x-4">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition duration-200"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  // Add logic here
                }}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition duration-200"
              >
                Ajouter
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