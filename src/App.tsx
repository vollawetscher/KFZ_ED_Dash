import React, { useState, useEffect } from 'react';
import { Phone, Users, Calendar, TrendingUp, RefreshCw, LogOut, Clock, MessageCircle, BarChart, Star, Settings } from 'lucide-react';
import { StatusIndicator } from './components/StatusIndicator';
import { StatsCard } from './components/StatsCard';
import { SearchFilters } from './components/SearchFilters';
import { CallCard } from './components/CallCard';
import { LoadingSpinner } from './components/LoadingSpinner';
import { ErrorMessage } from './components/ErrorMessage';
import { LoginScreen } from './components/LoginScreen';
import { AdminPanel } from './components/AdminPanel';
import { DashboardUser, AgentConfig } from './types';
import { useCallData } from './hooks/useCallData';
import { useWebSocket } from './hooks/useWebSocket';
import { SearchFilters as SearchFiltersType, CallRecord } from './types';

function App() {
  const [user, setUser] = useState<DashboardUser | null>(null);
  const [currentView, setCurrentView] = useState<'dashboard' | 'admin'>('dashboard');
  const [filters, setFilters] = useState<SearchFiltersType>({
    search: '',
    caller: '',
    conv_id: '',
    from_date: '',
    to_date: '',
    agent_id: ''
  });

  const { calls, stats, loading, error, total, fetchCalls, fetchStats, addNewCall, updateCallFlagStatus } = useCallData();
  const { isConnected, lastMessage } = useWebSocket('wss://kfzeddash-production.up.railway.app');

  // Check authentication on component mount
  useEffect(() => {
    const authToken = localStorage.getItem('dashboard_auth');
    const userData = localStorage.getItem('dashboard_user');
    
    if (authToken && userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        // Fetch initial data for authenticated user
        const agentIds = parsedUser.is_developer ? [] : parsedUser.allowed_agent_ids;
        fetchCalls({}, 50, 0, agentIds);
        fetchStats(agentIds);
      } catch (error) {
        console.error('Error parsing user data from localStorage:', error);
        // Clear invalid data
        localStorage.removeItem('dashboard_auth');
        localStorage.removeItem('dashboard_user');
      }
    } else if (authToken === 'authenticated') {
      // Handle legacy authentication format
      const legacyUser = {
        token: 'authenticated',
        allowed_agent_ids: ['agent_01jzq0y409fdnra9twb7wydcbt'],
        is_developer: true,
        branding_data: [
          {
            id: 'agent_01jzq0y409fdnra9twb7wydcbt',
            branding_name: 'KFZ-Zulassung Erding',
            evaluation_criteria_config: {},
            created_at: new Date().toISOString()
          }
        ]
      };
      setUser(legacyUser);
      // Fetch initial data for legacy user
      const agentIds = legacyUser.is_developer ? [] : legacyUser.allowed_agent_ids;
      fetchCalls({}, 50, 0, agentIds);
      fetchStats(agentIds);
    }
  }, [fetchCalls, fetchStats]);

  // Handle real-time updates
  useEffect(() => {
    if (lastMessage?.type === 'new_call' && lastMessage?.data) {
      const agentIds = user?.is_developer ? [] : user?.allowed_agent_ids;
      addNewCall(lastMessage.data, agentIds, filters.agent_id || undefined);
    }
  }, [lastMessage, addNewCall, user, filters.agent_id]);

  const handleSearch = () => {
    if (user) {
      let agentIds: string[] = [];
      
      if (filters.agent_id) {
        // If a specific agent is selected, only fetch calls from that agent
        agentIds = [filters.agent_id];
      } else if (user.is_developer) {
        // Developer with no agent filter sees all agents
        agentIds = [];
      } else {
        // Regular user sees their allowed agents
        agentIds = user.allowed_agent_ids;
      }
      
      fetchCalls(filters, 50, 0, agentIds);
    }
  };

  const handleRefresh = () => {
    if (user) {
      let agentIds: string[] = [];
      
      if (filters.agent_id) {
        // If a specific agent is selected, only fetch calls from that agent
        agentIds = [filters.agent_id];
      } else if (user.is_developer) {
        // Developer with no agent filter sees all agents
        agentIds = [];
      } else {
        // Regular user sees their allowed agents
        agentIds = user.allowed_agent_ids;
      }
      
      fetchCalls(filters, 50, 0, agentIds);
      fetchStats(agentIds);
    }
  };

  const handleLogin = (userData: DashboardUser) => {
    setUser(userData);
    // Fetch initial data immediately after login
    const agentIds = userData.is_developer ? [] : userData.allowed_agent_ids;
    fetchCalls({}, 50, 0, agentIds);
    fetchStats(agentIds);
  };

  const handleLogout = () => {
    localStorage.removeItem('dashboard_auth');
    localStorage.removeItem('dashboard_user');
    setUser(null);
  };

  // Helper function to get agent config for a specific call
  const getAgentConfigForCall = (call: CallRecord): AgentConfig | undefined => {
    if (!user?.branding_data || !call.agent_id) {
      return undefined;
    }
    return user.branding_data.find(agent => agent.id === call.agent_id);
  };

  // Show login screen if not authenticated
  if (!user) {
    return <LoginScreen onLogin={handleLogin} />;
    fetchStats(agentIds);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <Phone className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  {user.is_developer ? 'AI Sprachassistent' : (user.branding_data?.[0]?.branding_name || 'AI Sprachassistent')} Dashboard
                </h1>
                <p className="text-sm text-gray-500">Echtzeit-Anrufüberwachung und Transkription</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <StatusIndicator isConnected={isConnected} />
              {user.is_developer && (
                <button
                  onClick={() => setCurrentView(currentView === 'dashboard' ? 'admin' : 'dashboard')}
                  className="flex items-center gap-2 px-3 py-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                  title={currentView === 'dashboard' ? 'Open Admin Panel' : 'Back to Dashboard'}
                >
                  <Settings className="h-4 w-4" />
                  <span className="text-sm">{currentView === 'dashboard' ? 'Admin' : 'Dashboard'}</span>
                </button>
              )}
              <button
                onClick={handleRefresh}
                className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                title="Refresh data"
              >
                <RefreshCw className="h-5 w-5" />
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                title="Logout"
              >
                <LogOut className="h-4 w-4" />
                <span className="text-sm">Abmelden</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {currentView === 'admin' ? (
        <AdminPanel user={user} />
      ) : (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        {stats && (
          <div className="mb-8 space-y-4">
            {/* First Row - Basic Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatsCard
                title="Gesamtanrufe"
                value={stats.total_calls.toLocaleString()}
                icon={Phone}
                color="bg-blue-500"
              />
              <StatsCard
                title="Heutige Anrufe"
                value={stats.today_calls.toLocaleString()}
                icon={TrendingUp}
                color="bg-green-500"
              />
              <StatsCard
                title="Diese Woche"
                value={stats.week_calls.toLocaleString()}
                icon={Calendar}
                color="bg-purple-500"
              />
              <StatsCard
                title="Individuelle Anrufer"
                value={stats.unique_callers.toLocaleString()}
                icon={Users}
                color="bg-orange-500"
              />
            </div>
            
            {/* Second Row - Advanced Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatsCard
                title="Gesprächdauer"
                value={`${Math.floor(stats.total_duration_minutes / 60)}:${(stats.total_duration_minutes % 60).toString().padStart(2, '0')} h`}
                icon={Clock}
                color="bg-indigo-500"
              />
              <StatsCard
                title="Antworten"
                value={stats.total_bot_replies.toLocaleString()}
                icon={MessageCircle}
                color="bg-cyan-500"
              />
              <StatsCard
                title="Durchschnittsdauer"
                value={`${Math.floor(stats.average_duration_minutes)}:${Math.round((stats.average_duration_minutes % 1) * 60).toString().padStart(2, '0')} min`}
                icon={BarChart}
                color="bg-emerald-500"
              />
              <StatsCard
                title="Rating"
                value={`${stats.overall_rating_percent}%`}
                icon={Star}
                color="bg-amber-500"
              />
            </div>
          </div>
        )}

        {/* Search and Filters */}
        <SearchFilters
          filters={filters}
          onFiltersChange={setFilters}
          onSearch={handleSearch}
          availableAgents={user.branding_data || []}
        />

        {/* Error Message */}
        {error && (
          <div className="mb-6">
            <ErrorMessage message={error} onRetry={handleRefresh} />
          </div>
        )}

        {/* Call List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900">
                Letzte Anrufe {total > 0 && `(${total})`}
              </h2>
              {!isConnected && (
                <span className="text-sm text-amber-600 bg-amber-50 px-2 py-1 rounded">
                  Echtzeit-Updates deaktiviert
                </span>
              )}
            </div>
          </div>

          <div className="p-6">
            {loading ? (
              <LoadingSpinner />
            ) : calls.length === 0 ? (
              <div className="text-center py-8">
                <Phone className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Keine Anrufe gefunden</p>
                <p className="text-sm text-gray-400 mt-1">
                  Anrufe erscheinen hier, sobald der Webhook Daten empfängt
                </p>
              </div>
            ) : (
              <div className="grid gap-6">
                {calls.map((call) => (
                  <CallCard 
                    key={call.id} 
                    call={call} 
                    agentConfig={getAgentConfigForCall(call)}
                    onUpdateFlag={updateCallFlagStatus} 
                  />
                ))}
              </div>
            )}
          </div>
        </div>
        </main>
      )}
    </div>
  );
}

export default App;
