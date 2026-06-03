'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { api } from '@/lib/api';

type Agent = {
  userId: string;
  name: string;
  email: string;
  role: string;
  availability: string;
  avatarUrl: string | null;
  isActive: boolean;
  displayName: string | null;
};

const availabilityColor: Record<string, string> = {
  online: 'bg-green-500',
  busy: 'bg-yellow-500',
  offline: 'bg-gray-300',
};

export default function AgentsPage() {
  const { token, accountId, user } = useAuthStore();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'agent' | 'administrator'>('agent');
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchAgents = async () => {
    if (!token || !accountId) return;
    try {
      const res = await api.agents.list(accountId, token);
      setAgents(res.agents);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAgents(); }, [token, accountId]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !accountId) return;
    setInviting(true);
    setError('');
    setSuccess('');
    try {
      await api.agents.invite(accountId, { email: inviteEmail, role: inviteRole }, token);
      setSuccess(`Agent added successfully.`);
      setInviteEmail('');
      fetchAgents();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setInviting(false);
    }
  };

  const handleRoleChange = async (userId: string, role: 'administrator' | 'agent') => {
    if (!token || !accountId) return;
    try {
      await api.agents.update(accountId, userId, { role }, token);
      fetchAgents();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleRemove = async (userId: string) => {
    if (!token || !accountId || !confirm('Remove this agent from the account?')) return;
    try {
      await api.agents.remove(accountId, userId, token);
      fetchAgents();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6">
        <h2 className="text-base font-semibold text-gray-900 mb-1">Agents</h2>
        <p className="text-sm text-gray-500">Manage who has access to this account.</p>
      </div>

      {/* Invite form */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Invite Agent</h3>
        <form onSubmit={handleInvite} className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Email address</label>
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="agent@company.com"
              required
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Role</label>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as 'agent' | 'administrator')}
              className="px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 bg-white"
            >
              <option value="agent">Agent</option>
              <option value="administrator">Admin</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={inviting}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {inviting ? 'Adding…' : 'Add Agent'}
          </button>
        </form>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        {success && <p className="mt-3 text-sm text-green-600">{success}</p>}
      </div>

      {/* Agents list */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400">Loading…</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Agent</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Role</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {agents.map((agent) => (
                <tr key={agent.userId} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-xs font-bold shrink-0">
                        {agent.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{agent.name}</p>
                        <p className="text-xs text-gray-400">{agent.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {agent.userId === user?.id ? (
                      <span className="text-xs font-medium text-gray-500 capitalize">{agent.role}</span>
                    ) : (
                      <select
                        value={agent.role}
                        onChange={(e) => handleRoleChange(agent.userId, e.target.value as 'administrator' | 'agent')}
                        className="text-xs border border-gray-200 rounded-md px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="agent">Agent</option>
                        <option value="administrator">Admin</option>
                      </select>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${availabilityColor[agent.availability] ?? 'bg-gray-300'}`} />
                      <span className="text-xs text-gray-500 capitalize">{agent.availability}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {agent.userId !== user?.id && (
                      <button
                        onClick={() => handleRemove(agent.userId)}
                        className="text-xs text-red-500 hover:text-red-700 font-medium transition-colors"
                      >
                        Remove
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
