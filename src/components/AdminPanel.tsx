import React, { useState, useEffect } from 'react';
import { Plus, Users, Settings, Eye, EyeOff, Check, X, Loader } from 'lucide-react';
import { DashboardUser, AgentConfig } from '../types';

interface AdminPanelProps {
  user: DashboardUser;
}

interface AgentFormData {
  agent_id: string;
  branding_name: string;
  evaluation_criteria_config: string;
}

interface UserFormData {
  username: string;
  password: string;
  allowed_agent_ids: string;
  is_developer: boolean;
}

const API_BASE_URL = 'https://kfzeddash-production.up.railway.app';

export function AdminPanel({ user }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<'agents' | 'users'>('agents');
  const [showPassword, setShowPassword] = useState(false);
  
  // Agent form state
  const [agentForm, setAgentForm] = useState<AgentFormData>({
    agent_id: '',
    branding_name: '',
    evaluation_criteria_config: JSON.stringify({
      criterion_1: {
        name: 'Sample Criterion',
        description: 'Description of the evaluation criterion'
      }
    }, null, 2)
  });
  const [agentLoading, setAgentLoading] = useState(false);
  const [agentMessage, setAgentMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // User form state
  const [userForm, setUserForm] = useState<UserFormData>({
    username: '',
    password: '',
    allowed_agent_ids: '',
    is_developer: false
  });
  const [userLoading, setUserLoading] = useState(false);
  const [userMessage, setUserMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Lists for display
  const [existingAgents, setExistingAgents] = useState<AgentConfig[]>([]);
  const [existingUsers, setExistingUsers] = useState<any[]>([]);

  // Fetch existing data
  useEffect(() => {
    fetchExistingAgents();
    fetchExistingUsers();
  }, []);

  const fetchExistingAgents = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/agents`);
      if (response.ok) {
        const data = await response.json();
        setExistingAgents(data.agents || []);
      }
    } catch (error) {
      console.error('Error fetching agents:', error);
    }
  };

  const fetchExistingUsers = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/users`);
      if (response.ok) {
        const data = await response.json();
        setExistingUsers(data.users || []);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleAgentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAgentLoading(true);
    setAgentMessage(null);

    try {
      // Validate JSON
      let parsedConfig;
      try {
        parsedConfig = JSON.parse(agentForm.evaluation_criteria_config);
      } catch (error) {
        setAgentMessage({ type: 'error', text: 'Invalid JSON in evaluation criteria configuration' });
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/admin/agents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agent_id: agentForm.agent_id,
          branding_name: agentForm.branding_name,
          evaluation_criteria_config: parsedConfig
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setAgentMessage({ type: 'success', text: `Agent "${agentForm.branding_name}" created successfully!` });
        setAgentForm({
          agent_id: '',
          branding_name: '',
          evaluation_criteria_config: JSON.stringify({
            criterion_1: {
              name: 'Sample Criterion',
              description: 'Description of the evaluation criterion'
            }
          }, null, 2)
        });
        fetchExistingAgents(); // Refresh list
      } else {
        setAgentMessage({ type: 'error', text: data.error || 'Failed to create agent' });
      }
    } catch (error) {
      setAgentMessage({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setAgentLoading(false);
    }
  };

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserLoading(true);
    setUserMessage(null);

    try {
      // Parse agent IDs
      const agentIds = userForm.allowed_agent_ids
        .split(',')
        .map(id => id.trim())
        .filter(id => id);

      const response = await fetch(`${API_BASE_URL}/api/admin/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: userForm.username,
          password: userForm.password,
          allowed_agent_ids: agentIds,
          is_developer: userForm.is_developer
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setUserMessage({ type: 'success', text: `User "${userForm.username}" created successfully!` });
        setUserForm({
          username: '',
          password: '',
          allowed_agent_ids: '',
          is_developer: false
        });
        fetchExistingUsers(); // Refresh list
      } else {
        setUserMessage({ type: 'error', text: data.error || 'Failed to create user' });
      }
    } catch (error) {
      setUserMessage({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setUserLoading(false);
    }
  };

  const clearMessage = (type: 'agent' | 'user') => {
    if (type === 'agent') {
      setAgentMessage(null);
    } else {
      setUserMessage(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Panel</h1>
        <p className="text-gray-600">Manage ElevenLabs agents and dashboard users</p>
      </div>

      {/* Tab Navigation */}
      <div className="mb-8">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('agents')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'agents'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Settings className="inline h-4 w-4 mr-2" />
              Manage Agents ({existingAgents.length})
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'users'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Users className="inline h-4 w-4 mr-2" />
              Manage Users ({existingUsers.length})
            </button>
          </nav>
        </div>
      </div>

      {activeTab === 'agents' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Add New Agent Form */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-6">
              <Plus className="h-5 w-5 text-blue-600" />
              <h2 className="text-lg font-medium text-gray-900">Add New Agent</h2>
            </div>

            <form onSubmit={handleAgentSubmit} className="space-y-4">
              <div>
                <label htmlFor="agent_id" className="block text-sm font-medium text-gray-700 mb-1">
                  ElevenLabs Agent ID*
                </label>
                <input
                  type="text"
                  id="agent_id"
                  required
                  placeholder="agent_01abcd1234..."
                  value={agentForm.agent_id}
                  onChange={(e) => setAgentForm({ ...agentForm, agent_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="branding_name" className="block text-sm font-medium text-gray-700 mb-1">
                  Customer/Branding Name*
                </label>
                <input
                  type="text"
                  id="branding_name"
                  required
                  placeholder="e.g., KFZ-Zulassung München"
                  value={agentForm.branding_name}
                  onChange={(e) => setAgentForm({ ...agentForm, branding_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="evaluation_config" className="block text-sm font-medium text-gray-700 mb-1">
                  Evaluation Criteria Configuration (JSON)*
                </label>
                <textarea
                  id="evaluation_config"
                  required
                  rows={8}
                  placeholder="Enter JSON configuration..."
                  value={agentForm.evaluation_criteria_config}
                  onChange={(e) => setAgentForm({ ...agentForm, evaluation_criteria_config: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                />
              </div>

              {agentMessage && (
                <div className={`flex items-center justify-between p-3 rounded-lg ${
                  agentMessage.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                }`}>
                  <div className="flex items-center gap-2">
                    {agentMessage.type === 'success' ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <X className="h-4 w-4 text-red-600" />
                    )}
                    <span className={`text-sm ${
                      agentMessage.type === 'success' ? 'text-green-800' : 'text-red-800'
                    }`}>
                      {agentMessage.text}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => clearMessage('agent')}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={agentLoading}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {agentLoading ? (
                  <>
                    <Loader className="h-4 w-4 animate-spin" />
                    Creating Agent...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Create Agent
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Existing Agents List */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Existing Agents</h3>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {existingAgents.length === 0 ? (
                <p className="text-gray-500 text-sm">No agents found.</p>
              ) : (
                existingAgents.map((agent) => (
                  <div key={agent.id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">{agent.branding_name}</h4>
                        <p className="text-xs text-gray-500 font-mono">{agent.id}</p>
                      </div>
                      <span className="text-xs text-gray-400">
                        {Object.keys(agent.evaluation_criteria_config || {}).length} criteria
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Add New User Form */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-6">
              <Plus className="h-5 w-5 text-blue-600" />
              <h2 className="text-lg font-medium text-gray-900">Add New User</h2>
            </div>

            <form onSubmit={handleUserSubmit} className="space-y-4">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                  Username*
                </label>
                <input
                  type="text"
                  id="username"
                  required
                  placeholder="customer_username"
                  value={userForm.username}
                  onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password*
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    required
                    placeholder="Secure password"
                    value={userForm.password}
                    onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="allowed_agent_ids" className="block text-sm font-medium text-gray-700 mb-1">
                  Allowed Agent IDs* (comma-separated)
                </label>
                <input
                  type="text"
                  id="allowed_agent_ids"
                  required
                  placeholder="agent_01abcd1234, agent_01efgh5678"
                  value={userForm.allowed_agent_ids}
                  onChange={(e) => setUserForm({ ...userForm, allowed_agent_ids: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_developer"
                  checked={userForm.is_developer}
                  onChange={(e) => setUserForm({ ...userForm, is_developer: e.target.checked })}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="is_developer" className="ml-2 block text-sm text-gray-700">
                  Developer Access (can see all agents and access admin panel)
                </label>
              </div>

              {userMessage && (
                <div className={`flex items-center justify-between p-3 rounded-lg ${
                  userMessage.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                }`}>
                  <div className="flex items-center gap-2">
                    {userMessage.type === 'success' ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <X className="h-4 w-4 text-red-600" />
                    )}
                    <span className={`text-sm ${
                      userMessage.type === 'success' ? 'text-green-800' : 'text-red-800'
                    }`}>
                      {userMessage.text}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => clearMessage('user')}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={userLoading}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {userLoading ? (
                  <>
                    <Loader className="h-4 w-4 animate-spin" />
                    Creating User...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Create User
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Existing Users List */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Existing Users</h3>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {existingUsers.length === 0 ? (
                <p className="text-gray-500 text-sm">No users found.</p>
              ) : (
                existingUsers.map((user) => (
                  <div key={user.id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">{user.username}</h4>
                        <p className="text-xs text-gray-500">
                          {user.allowed_agent_ids.length} agent(s) • 
                          {user.is_developer ? ' Developer' : ' Customer'}
                        </p>
                      </div>
                      <span className="text-xs text-gray-400">
                        {new Date(user.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}