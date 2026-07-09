'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { api } from '@/lib/api';

type Team = {
  id: string;
  name: string;
  description: string | null;
  isEnabled: boolean;
  autoAssignment: boolean;
  conversationsToday: number;
  memberCount: number;
};

type Member = {
  userId: string;
  name: string;
  email: string;
  role: string;
  availability: string;
};

type Agent = {
  userId: string;
  name: string;
  email: string;
  role: string;
};

export default function TeamsPage() {
  const { token, accountId } = useAuthStore();
  const [teams, setTeams] = useState<Team[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamDesc, setNewTeamDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState('');

  const fetchTeams = async () => {
    if (!token || !accountId) {
      setLoading(false);
      return;
    }
    try {
      const [teamsRes, agentsRes] = await Promise.all([
        api.teams.list(accountId, token),
        api.agents.list(accountId, token),
      ]);
      setTeams(teamsRes.teams);
      setAgents(agentsRes.agents);
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async (teamId: string) => {
    if (!token || !accountId) return;
    const res = await api.teams.listMembers(accountId, teamId, token);
    setMembers(res.members);
  };

  useEffect(() => { fetchTeams(); }, [token, accountId]);

  useEffect(() => {
    if (selectedTeam) fetchMembers(selectedTeam.id);
  }, [selectedTeam]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !accountId) return;
    setCreating(true);
    setError('');
    try {
      await api.teams.create(accountId, { name: newTeamName, description: newTeamDesc || undefined }, token);
      setNewTeamName('');
      setNewTeamDesc('');
      setShowCreate(false);
      fetchTeams();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleToggleAutoAssignment = async (team: Team) => {
    if (!token || !accountId) return;
    try {
      await api.teams.update(accountId, team.id, { autoAssignment: !team.autoAssignment }, token);
      const updated = { ...team, autoAssignment: !team.autoAssignment };
      setTeams((prev) => prev.map((t) => (t.id === team.id ? updated : t)));
      setSelectedTeam((prev) => (prev?.id === team.id ? updated : prev));
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async (teamId: string) => {
    if (!token || !accountId || !confirm('Delete this team?')) return;
    try {
      await api.teams.remove(accountId, teamId, token);
      if (selectedTeam?.id === teamId) setSelectedTeam(null);
      fetchTeams();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleAddMember = async (userId: string) => {
    if (!token || !accountId || !selectedTeam) return;
    try {
      await api.teams.addMember(accountId, selectedTeam.id, userId, token);
      fetchMembers(selectedTeam.id);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!token || !accountId || !selectedTeam) return;
    try {
      await api.teams.removeMember(accountId, selectedTeam.id, userId, token);
      fetchMembers(selectedTeam.id);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const memberIds = new Set(members.map((m) => m.userId));
  const nonMembers = agents.filter((a) => !memberIds.has(a.userId));

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-base font-semibold text-gray-900 mb-1">Teams</h2>
          <p className="text-sm text-gray-500">Group agents into teams for better routing.</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          New Team
        </button>
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {showCreate && (
        <form onSubmit={handleCreate} className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Create Team</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Team name</label>
              <input
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                placeholder="e.g. Support, Sales"
                required
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Description <span className="text-gray-400">(optional)</span></label>
              <input
                value={newTeamDesc}
                onChange={(e) => setNewTeamDesc(e.target.value)}
                placeholder="What does this team handle?"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                disabled={creating}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {creating ? 'Creating…' : 'Create Team'}
              </button>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      )}

      <div className="flex gap-4">
        {/* Teams list */}
        <div className="w-56 shrink-0">
          {loading ? (
            <p className="text-sm text-gray-400 p-2">Loading…</p>
          ) : teams.length === 0 ? (
            <p className="text-sm text-gray-400 p-2">No teams yet.</p>
          ) : (
            <div className="space-y-1">
              {teams.map((team) => (
                <button
                  key={team.id}
                  onClick={() => setSelectedTeam(team)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors group flex items-center justify-between ${
                    selectedTeam?.id === team.id
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <span className="min-w-0">
                    <span className="font-medium truncate block">{team.name}</span>
                    <span className="text-[11px] text-gray-400 block">
                      {team.memberCount} member{team.memberCount === 1 ? '' : 's'}
                    </span>
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(team.id); }}
                    className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-opacity ml-1 shrink-0"
                  >
                    <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5" stroke="currentColor" strokeWidth={2}>
                      <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                    </svg>
                  </button>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Team members panel */}
        {selectedTeam && (
          <div className="flex-1 bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-200 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">{selectedTeam.name}</h3>
                {selectedTeam.description && (
                  <p className="text-xs text-gray-400 mt-0.5">{selectedTeam.description}</p>
                )}
                <p className="text-xs text-gray-400 mt-1">
                  {selectedTeam.conversationsToday} conversation{selectedTeam.conversationsToday === 1 ? '' : 's'} today
                </p>
              </div>
              <label className="flex items-center gap-2 text-xs text-gray-600 shrink-0">
                <input
                  type="checkbox"
                  checked={selectedTeam.autoAssignment}
                  onChange={() => void handleToggleAutoAssignment(selectedTeam)}
                />
                Auto-assignment (round-robin)
              </label>
            </div>

            <div className="p-5">
              {/* Current members */}
              {members.length > 0 && (
                <div className="mb-5">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Members</p>
                  <div className="space-y-2">
                    {members.map((m) => (
                      <div key={m.userId} className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-xs font-bold">
                            {m.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{m.name}</p>
                            <p className="text-xs text-gray-400">{m.role}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveMember(m.userId)}
                          className="text-xs text-red-500 hover:text-red-700 font-medium"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add members */}
              {nonMembers.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Add Agents</p>
                  <div className="space-y-2">
                    {nonMembers.map((a) => (
                      <div key={a.userId} className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 text-xs font-bold">
                            {a.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm text-gray-700">{a.name}</p>
                            <p className="text-xs text-gray-400">{a.role}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleAddMember(a.userId)}
                          className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                        >
                          Add
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {members.length === 0 && nonMembers.length === 0 && (
                <p className="text-sm text-gray-400">No agents in this account yet.</p>
              )}
            </div>
          </div>
        )}

        {!selectedTeam && teams.length > 0 && (
          <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
            Select a team to manage members
          </div>
        )}
      </div>
    </div>
  );
}
