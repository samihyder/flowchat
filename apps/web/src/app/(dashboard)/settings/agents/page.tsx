'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { ListSkeleton } from '@/components/ui/skeleton';

type Agent = {
  userId: string;
  name: string;
  email: string;
  role: string;
  membershipStatus: string;
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
  const [inviteUrl, setInviteUrl] = useState('');
  const [inboxes, setInboxes] = useState<{ id: string; name: string }[]>([]);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [approveInboxIds, setApproveInboxIds] = useState<string[]>([]);

  const fetchAgents = async () => {
    if (!token || !accountId) {
      setLoading(false);
      return;
    }
    try {
      const [agentRes, inboxRes] = await Promise.all([
        api.agents.list(accountId, token),
        api.inboxes.list(accountId, token),
      ]);
      setAgents(agentRes.agents);
      setInboxes(inboxRes.inboxes.map((i) => ({ id: i.id, name: i.name })));
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
    setInviteUrl('');
    try {
      const res = await api.agents.invite(accountId, { email: inviteEmail, role: inviteRole }, token);
      setSuccess(res.message);
      if (res.inviteUrl) setInviteUrl(res.inviteUrl);
      setInviteEmail('');
      fetchAgents();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invite failed');
    } finally {
      setInviting(false);
    }
  };

  const startApprove = (userId: string) => {
    setApprovingId(userId);
    setApproveInboxIds(inboxes.map((i) => i.id));
    setError('');
  };

  const handleApprove = async () => {
    if (!token || !accountId || !approvingId) return;
    if (approveInboxIds.length === 0) {
      setError('Select at least one inbox for this agent.');
      return;
    }
    try {
      await api.agents.update(
        accountId,
        approvingId,
        { membershipStatus: 'active', inboxIds: approveInboxIds },
        token
      );
      setSuccess('Agent approved with inbox access.');
      setApprovingId(null);
      fetchAgents();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Approve failed');
    }
  };

  const handleRoleChange = async (userId: string, role: 'administrator' | 'agent') => {
    if (!token || !accountId) return;
    try {
      await api.agents.update(accountId, userId, { role }, token);
      fetchAgents();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Update failed');
    }
  };

  const handleRemove = async (userId: string) => {
    if (!token || !accountId || !confirm('Remove this agent from the workspace?')) return;
    try {
      await api.agents.remove(accountId, userId, token);
      fetchAgents();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Remove failed');
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto w-full">
      <Card className="mb-6">
        <CardHeader
          title="Invite agent"
          description="Agents cannot self-register. Invite by email — new users get a link; existing users are added as pending until you approve."
        />
        <CardBody>
          <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-3 sm:items-end">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Work email</label>
              <Input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="agent@company.com"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Role</label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as 'agent' | 'administrator')}
                className="w-full sm:w-auto px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white"
              >
                <option value="agent">Agent</option>
                <option value="administrator">Admin</option>
              </select>
            </div>
            <Button type="submit" disabled={inviting}>
              {inviting ? 'Inviting…' : 'Invite'}
            </Button>
          </form>
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          {success && <p className="mt-3 text-sm text-accent-600 font-medium">{success}</p>}
          {inviteUrl && (
            <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Share invite link:</p>
              <code className="text-xs break-all text-gray-800">{inviteUrl}</code>
            </div>
          )}
        </CardBody>
      </Card>

      <Card className="overflow-hidden">
        {loading ? (
          <ListSkeleton rows={4} />
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Agent</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Role</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Access</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {agents.map((agent) => (
                <tr key={agent.userId} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 text-xs font-bold shrink-0">
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
                        className="text-xs border border-gray-200 rounded-md px-2 py-1 bg-white"
                      >
                        <option value="agent">Agent</option>
                        <option value="administrator">Admin</option>
                      </select>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-medium capitalize ${
                          agent.membershipStatus === 'active'
                            ? 'text-green-700'
                            : agent.membershipStatus === 'pending'
                              ? 'text-amber-700'
                              : 'text-gray-500'
                        }`}
                      >
                        {agent.membershipStatus}
                      </span>
                      <span className={`w-2 h-2 rounded-full ${availabilityColor[agent.availability] ?? 'bg-gray-300'}`} />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    {agent.membershipStatus === 'pending' && agent.userId !== user?.id && (
                      <button
                        onClick={() => startApprove(agent.userId)}
                        className="text-xs text-green-600 hover:text-green-800 font-medium"
                      >
                        Approve
                      </button>
                    )}
                    {agent.userId !== user?.id && (
                      <button
                        onClick={() => handleRemove(agent.userId)}
                        className="text-xs text-red-500 hover:text-red-700 font-medium"
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
      </Card>

      {approvingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Approve agent</h3>
            <p className="text-xs text-gray-500 mb-4">Choose which websites (inboxes) this agent can access.</p>
            <div className="space-y-2 max-h-48 overflow-y-auto mb-4">
              {inboxes.map((inbox) => (
                <label key={inbox.id} className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={approveInboxIds.includes(inbox.id)}
                    onChange={(e) => {
                      setApproveInboxIds((prev) =>
                        e.target.checked ? [...prev, inbox.id] : prev.filter((id) => id !== inbox.id)
                      );
                    }}
                  />
                  {inbox.name}
                </label>
              ))}
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="secondary" onClick={() => setApprovingId(null)}>
                Cancel
              </Button>
              <Button type="button" onClick={handleApprove}>
                Approve access
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
