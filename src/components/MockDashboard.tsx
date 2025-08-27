import React, { useState } from 'react';
import { Phone, Users, Calendar, TrendingUp, RefreshCw, LogOut, Clock, MessageCircle, BarChart, Star, Settings } from 'lucide-react';
import { StatusIndicator } from './StatusIndicator';
import { StatsCard } from './StatsCard';
import { SearchFilters } from './SearchFilters';
import { CallCard } from './CallCard';
import { AdminPanel } from './AdminPanel';
import { DashboardUser, AgentConfig, CallRecord, CallStats, SearchFilters as SearchFiltersType } from '../types';

// Mock data for impressive marketing screenshots
const mockUser: DashboardUser = {
  user_id: 'mock-user-123',
  username: 'demo_admin',
  token: 'mock-token',
  allowed_agent_ids: ['agent_kfz_muenchen', 'agent_kfz_berlin', 'agent_kfz_hamburg'],
  is_developer: true,
  branding_data: [
    {
      id: 'agent_kfz_muenchen',
      branding_name: 'KFZ-Zulassung München',
      evaluation_criteria_config: {
        response_accuracy: { name: 'Antwortgenauigkeit', description: 'Korrekte Informationen' },
        appointment_reference: { name: 'Terminverweis', description: 'Korrekte Terminbuchung' },
        politeness: { name: 'Höflichkeit', description: 'Professioneller Umgang' },
        completeness: { name: 'Vollständigkeit', description: 'Alle Fragen beantwortet' }
      },
      created_at: '2024-01-15T10:30:00Z'
    },
    {
      id: 'agent_kfz_berlin',
      branding_name: 'KFZ-Zulassung Berlin',
      evaluation_criteria_config: {},
      created_at: '2024-02-20T14:15:00Z'
    },
    {
      id: 'agent_kfz_hamburg',
      branding_name: 'KFZ-Zulassung Hamburg',
      evaluation_criteria_config: {},
      created_at: '2024-03-10T09:45:00Z'
    }
  ]
};

const mockStats: CallStats = {
  total_calls: 47892,
  today_calls: 342,
  week_calls: 2847,
  unique_callers: 28456,
  total_duration_minutes: 89567,
  total_bot_replies: 156789,
  average_duration_minutes: 4.8,
  overall_rating_percent: 94
};

// Generate mock call records
const generateMockCalls = (): CallRecord[] => {
  const agents = ['agent_kfz_muenchen', 'agent_kfz_berlin', 'agent_kfz_hamburg'];
  const sampleTranscripts = [
    "agent: Guten Tag! Sie haben die KFZ-Zulassungsstelle erreicht. Wie kann ich Ihnen helfen?\nuser: Hallo, ich möchte mein neues Auto anmelden. Was brauche ich dafür?\nagent: Für die Fahrzeugzulassung benötigen Sie folgende Unterlagen: Personalausweis, Fahrzeugschein, COC-Papiere vom Hersteller, Nachweis der Haftpflichtversicherung und die Zulassungsbescheinigung Teil II. Haben Sie bereits einen Termin vereinbart?\nuser: Nein, noch nicht. Wie kann ich einen Termin buchen?\nagent: Sie können online unter unserer Website einen Termin buchen oder telefonisch unter der Nummer 089-12345678. Die nächsten verfügbaren Termine sind meist in 2-3 Wochen.\nuser: Vielen Dank für die Information!\nagent: Gern geschehen! Haben Sie noch weitere Fragen zur Fahrzeugzulassung?",
    
    "agent: Willkommen bei der KFZ-Zulassungsstelle. Womit kann ich Ihnen behilflich sein?\nuser: Ich muss mein Motorrad ummelden, bin umgezogen.\nagent: Verstehe. Bei einer Ummeldung aufgrund Wohnsitzwechsel benötigen Sie: Ihren Personalausweis, die Zulassungsbescheinigung Teil I und II, sowie eine aktuelle Meldebescheinigung. Die Gebühr beträgt 28,60 Euro.\nuser: Muss ich dafür extra einen Termin machen?\nagent: Ja, für Ummeldungen ist ein Termin erforderlich. Sie können diesen online auf unserer Website buchen. Benötigen Sie noch weitere Informationen?\nuser: Das reicht, danke!\nagent: Sehr gerne! Bei weiteren Fragen stehe ich Ihnen gerne zur Verfügung.",
    
    "agent: Guten Tag, hier ist die KFZ-Zulassungsstelle. Wie kann ich helfen?\nuser: Hi, ich verkaufe mein Auto. Was muss ich beachten?\nagent: Beim Fahrzeugverkauf sollten Sie das Fahrzeug abmelden oder den Käufer bei der Ummeldung unterstützen. Für die Abmeldung benötigen Sie die Zulassungsbescheinigung Teil I und II sowie die Kennzeichen.\nuser: Kann der Käufer das auch selbst machen?\nagent: Ja, der neue Besitzer kann das Fahrzeug auch direkt auf sich ummelden. Dafür benötigt er zusätzlich zu den Fahrzeugpapieren seinen Personalausweis und einen Versicherungsnachweis.\nuser: Super, das macht es einfacher.\nagent: Genau! Gibt es noch weitere Fragen zum Verkaufsprozess?",
    
    "agent: Hallo und herzlich willkommen! Womit kann ich Ihnen heute helfen?\nuser: Ich brauche ein Kurzzeitkennzeichen für eine Probefahrt.\nagent: Gerne! Für ein Kurzzeitkennzeichen benötigen Sie einen gültigen Personalausweis, einen Versicherungsnachweis für das Kurzzeitkennzeichen und bei Fahrzeugen über 7,5 Tonnen zusätzlich eine gültige Hauptuntersuchung.\nuser: Wie lange ist das Kennzeichen gültig?\nagent: Kurzzeitkennzeichen sind maximal 5 Tage gültig. Die Kosten betragen 13,10 Euro plus die Kosten für die Kennzeichenschilder.\nuser: Kann ich das sofort bekommen?\nagent: Mit Termin ja, ohne Termin leider nicht. Möchten Sie einen Termin vereinbaren?\nuser: Ja, das wäre super!\nagent: Perfekt! Besuchen Sie unsere Website oder rufen Sie uns an, um einen Termin zu buchen.",
  ];

  const calls: CallRecord[] = [];
  const now = new Date();

  for (let i = 0; i < 20; i++) {
    const randomHoursAgo = Math.floor(Math.random() * 720); // Up to 30 days ago
    const callTime = new Date(now.getTime() - (randomHoursAgo * 60 * 60 * 1000));
    const agentId = agents[Math.floor(Math.random() * agents.length)];
    const phoneNumber = `+49${Math.floor(Math.random() * 900 + 100)}${Math.floor(Math.random() * 9000000 + 1000000)}`;
    const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const transcript = sampleTranscripts[Math.floor(Math.random() * sampleTranscripts.length)];
    const duration = Math.floor(Math.random() * 420 + 60); // 1-7 minutes
    
    // Generate evaluation results with high success rate
    const evaluationResults = {
      response_accuracy: {
        result: Math.random() > 0.1 ? 'success' : 'failure' as 'success' | 'failure',
        rationale: Math.random() > 0.1 
          ? 'Der Agent hat präzise und korrekte Informationen zu den erforderlichen Unterlagen und Verfahren bereitgestellt.'
          : 'Einige Details zu den Unterlagen waren nicht vollständig korrekt.',
        criteria_id: 'acc_001'
      },
      appointment_reference: {
        result: Math.random() > 0.15 ? 'success' : 'failure' as 'success' | 'failure',
        rationale: Math.random() > 0.15
          ? 'Der Agent hat den Kunden erfolgreich auf die Online-Terminbuchung und die Kontaktmöglichkeiten hingewiesen.'
          : 'Die Terminbuchung wurde nicht ausreichend erklärt.',
        criteria_id: 'app_001'
      },
      politeness: {
        result: Math.random() > 0.05 ? 'success' : 'failure' as 'success' | 'failure',
        rationale: Math.random() > 0.05
          ? 'Der Agent war durchgehend höflich, professionell und zuvorkommend im Kundengespräch.'
          : 'Der Ton könnte etwas freundlicher sein.',
        criteria_id: 'pol_001'
      },
      completeness: {
        result: Math.random() > 0.12 ? 'success' : 'failure' as 'success' | 'failure',
        rationale: Math.random() > 0.12
          ? 'Alle Kundenfragen wurden vollständig und verständlich beantwortet.'
          : 'Eine Kundenfrage wurde nicht vollständig beantwortet.',
        criteria_id: 'com_001'
      }
    };

    calls.push({
      id: conversationId,
      agent_id: agentId,
      caller_number: phoneNumber,
      transcript: transcript,
      timestamp: callTime.toISOString(),
      duration: duration,
      processed_at: new Date(callTime.getTime() + 30000).toISOString(), // 30 seconds later
      evaluation_results: evaluationResults,
      is_flagged_for_review: Math.random() < 0.03 // 3% flagged calls
    });
  }

  return calls.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};

const mockCalls = generateMockCalls();

export function MockDashboard() {
  const [currentView, setCurrentView] = useState<'dashboard' | 'admin'>('dashboard');
  const [filters, setFilters] = useState<SearchFiltersType>({
    search: '',
    caller: '',
    conv_id: '',
    from_date: '',
    to_date: '',
    agent_id: ''
  });

  const handleSearch = () => {
    // In mock mode, we don't actually filter data
    console.log('Mock search triggered with filters:', filters);
  };

  const handleRefresh = () => {
    console.log('Mock refresh triggered');
  };

  const handleLogout = () => {
    // Remove mock parameter from URL and reload
    window.location.href = window.location.pathname;
  };

  const updateCallFlagStatus = async (callId: string, isFlagged: boolean) => {
    console.log(`Mock flag update: ${callId} -> ${isFlagged}`);
    return true;
  };

  const getAgentConfigForCall = (call: CallRecord): AgentConfig | undefined => {
    return mockUser.branding_data?.find(agent => agent.id === call.agent_id);
  };

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
                  AI Sprachassistent Dashboard
                </h1>
                <p className="text-sm text-gray-500">Echtzeit-Anrufüberwachung und Transkription</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <StatusIndicator isConnected={true} />
              <button
                onClick={() => setCurrentView(currentView === 'dashboard' ? 'admin' : 'dashboard')}
                className="flex items-center gap-2 px-3 py-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                title={currentView === 'dashboard' ? 'Open Admin Panel' : 'Back to Dashboard'}
              >
                <Settings className="h-4 w-4" />
                <span className="text-sm">{currentView === 'dashboard' ? 'Admin' : 'Dashboard'}</span>
              </button>
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
                title="Exit Demo"
              >
                <LogOut className="h-4 w-4" />
                <span className="text-sm">Demo beenden</span>
              </button>
            </div>
          </div>
        </div>

        {/* Demo Banner */}
        <div className="bg-amber-50 border-b border-amber-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
            <div className="flex items-center justify-center gap-2 text-amber-800">
              <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium">DEMO-MODUS - Alle Daten sind anonymisiert und dienen nur zur Demonstration</span>
              <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
            </div>
          </div>
        </div>
      </header>

      {currentView === 'admin' ? (
        <AdminPanel user={mockUser} />
      ) : (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Stats */}
          <div className="mb-8 space-y-4">
            {/* First Row - Basic Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatsCard
                title="Gesamtanrufe"
                value={mockStats.total_calls.toLocaleString()}
                icon={Phone}
                color="bg-blue-500"
              />
              <StatsCard
                title="Heutige Anrufe"
                value={mockStats.today_calls.toLocaleString()}
                icon={TrendingUp}
                color="bg-green-500"
              />
              <StatsCard
                title="Diese Woche"
                value={mockStats.week_calls.toLocaleString()}
                icon={Calendar}
                color="bg-purple-500"
              />
              <StatsCard
                title="Individuelle Anrufer"
                value={mockStats.unique_callers.toLocaleString()}
                icon={Users}
                color="bg-orange-500"
              />
            </div>
            
            {/* Second Row - Advanced Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatsCard
                title="Gesprächdauer"
                value={`${Math.floor(mockStats.total_duration_minutes / 60)}:${(mockStats.total_duration_minutes % 60).toString().padStart(2, '0')} h`}
                icon={Clock}
                color="bg-indigo-500"
              />
              <StatsCard
                title="Antworten"
                value={mockStats.total_bot_replies.toLocaleString()}
                icon={MessageCircle}
                color="bg-cyan-500"
              />
              <StatsCard
                title="Durchschnittsdauer"
                value={`${Math.floor(mockStats.average_duration_minutes)}:${Math.round((mockStats.average_duration_minutes % 1) * 60).toString().padStart(2, '0')} min`}
                icon={BarChart}
                color="bg-emerald-500"
              />
              <StatsCard
                title="Rating"
                value={`${mockStats.overall_rating_percent}%`}
                icon={Star}
                color="bg-amber-500"
              />
            </div>
          </div>

          {/* Search and Filters */}
          <SearchFilters
            filters={filters}
            onFiltersChange={setFilters}
            onSearch={handleSearch}
            availableAgents={mockUser.branding_data || []}
          />

          {/* Call List */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium text-gray-900">
                  Letzte Anrufe ({mockCalls.length})
                </h2>
                <span className="text-sm text-green-600 bg-green-50 px-2 py-1 rounded">
                  Echtzeit-Updates aktiv
                </span>
              </div>
            </div>

            <div className="p-6">
              <div className="grid gap-6">
                {mockCalls.map((call) => (
                  <CallCard 
                    key={call.id} 
                    call={call} 
                    agentConfig={getAgentConfigForCall(call)}
                    onUpdateFlag={updateCallFlagStatus} 
                  />
                ))}
              </div>
            </div>
          </div>
        </main>
      )}
    </div>
  );
}