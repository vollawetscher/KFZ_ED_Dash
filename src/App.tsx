import React, { useState, useEffect } from 'react';
import { Phone, Users, Calendar, TrendingUp, RefreshCw, LogOut } from 'lucide-react';
import { StatusIndicator } from './components/StatusIndicator';
import { StatsCard } from './components/StatsCard';
import { SearchFilters } from './components/SearchFilters';
import { CallCard } from './components/CallCard';
import { LoadingSpinner } from './components/LoadingSpinner';
import { ErrorMessage } from './components/ErrorMessage';
import { LoginScreen } from './components/LoginScreen';
import { useCallData } from './hooks/useCallData';
import { useWebSocket } from './hooks/useWebSocket';
import { SearchFilters as SearchFiltersType } from './types';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [filters, setFilters] = useState<SearchFiltersType>({
    search: '',
    caller: '',
    conv_id: '',
    from_date: '',
    to_date: ''
  });

  const { calls, stats, loading, error, total, fetchCalls, addNewCall } = useCallData();
  const { calls, stats, loading, error, total, fetchCalls, addNewCall, updateCallFlagStatus } = useCallData();
  const { isConnected, lastMessage } = useWebSocket('wss://kfzeddash-production.up.railway.app');

  // Check authentication on component mount
  useEffect(() => {
    const authToken = localStorage.getItem('dashboard_auth');
    if (authToken === 'authenticated') {
      setIsAuthenticated(true);
    }
  }, []);

  // Handle real-time updates
  useEffect(() => {
    if (lastMessage?.type === 'new_call' && lastMessage?.data) {
      addNewCall(lastMessage.data);
    }
  }, [lastMessage, addNewCall]);

  const handleSearch = () => {
    fetchCalls(filters);
  };

  const handleRefresh = () => {
    fetchCalls(filters);
  };

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('dashboard_auth');
    setIsAuthenticated(false);
  };

  // Show login screen if not authenticated
  if (!isAuthenticated) {
    return <LoginScreen onLogin={handleLogin} />;
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
                <h1 className="text-xl font-bold text-gray-900">KFZ-Zulassung Erding Call Dashboard</h1>
                <p className="text-sm text-gray-500">Echtzeit-Anrufüberwachung und Transkription</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <StatusIndicator isConnected={isConnected} />
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatsCard
              title="Gesamtanrufe"
              value={stats.total_calls}
              icon={Phone}
              color="bg-blue-500"
            />
            <StatsCard
              title="Heutige Anrufe"
              value={stats.today_calls}
              icon={TrendingUp}
              color="bg-green-500"
            />
            <StatsCard
              title="Diese Woche"
              value={stats.week_calls}
              icon={Calendar}
              color="bg-purple-500"
            />
            <StatsCard
              title="Einzigartige Anrufer"
              title="Individuelle Anrufer"
              value={stats.unique_callers}
              icon={Users}
              color="bg-orange-500"
            />
          </div>
        )}

        {/* Search and Filters */}
        <SearchFilters
          filters={filters}
          onFiltersChange={setFilters}
          onSearch={handleSearch}
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
                  <CallCard key={call.id} call={call} onUpdateFlag={updateCallFlagStatus} />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
