'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth';
import { api, type Inbox } from '@/lib/api';
import {
  MUTEX_DEFAULT_GREETING_MESSAGES,
  MUTEX_DEFAULT_WELCOME_TAGLINE,
  MUTEX_DEFAULT_WELCOME_TITLE,
} from '@/lib/welcome-messages';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  AutoMessagesFields,
  autoMessagesFromText,
  fieldsFromInboxMessages,
  type AutoMessagesFieldsValue,
} from '@/components/settings/auto-messages-fields';
import { parseMessagesText } from '@/lib/auto-messages';

function inboxUsesWorkspaceDefaults(inbox: Inbox): boolean {
  const custom = inbox.greetingMessages?.filter(Boolean) ?? [];
  if (custom.length > 0) return false;
  if (inbox.greetingMessage?.trim()) return false;
  return true;
}

export default function AutoMessagesSettingsPage() {
  const { token, accountId } = useAuthStore();
  const [loaded, setLoaded] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [inboxes, setInboxes] = useState<Inbox[]>([]);
  const [workspace, setWorkspace] = useState<AutoMessagesFieldsValue>({
    messagesText: MUTEX_DEFAULT_GREETING_MESSAGES.join('\n'),
    welcomeTitle: MUTEX_DEFAULT_WELCOME_TITLE,
    welcomeTagline: MUTEX_DEFAULT_WELCOME_TAGLINE,
  });
  const [inboxDrafts, setInboxDrafts] = useState<Record<string, AutoMessagesFieldsValue>>({});
  const [savingWorkspace, setSavingWorkspace] = useState(false);
  const [applyingAll, setApplyingAll] = useState(false);
  const [savingInboxId, setSavingInboxId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    if (!token || !accountId) return;
    try {
      const [accountRes, inboxRes, access] = await Promise.all([
        api.account.get(accountId, token),
        api.inboxes.list(accountId, token),
        api.contacts.access(accountId, token),
      ]);
      setIsAdmin(access.isAdmin);

      const settings = accountRes.account.settings ?? {};
      const defaultMessages =
        settings.autoMessages && settings.autoMessages.length > 0
          ? settings.autoMessages
          : MUTEX_DEFAULT_GREETING_MESSAGES;

      setWorkspace({
        messagesText: defaultMessages.join('\n'),
        welcomeTitle: settings.autoWelcomeTitle ?? MUTEX_DEFAULT_WELCOME_TITLE,
        welcomeTagline: settings.autoWelcomeTagline ?? MUTEX_DEFAULT_WELCOME_TAGLINE,
      });

      const webInboxes = inboxRes.inboxes.filter((i) => i.channelType === 'web_widget');
      setInboxes(webInboxes);

      const drafts: Record<string, AutoMessagesFieldsValue> = {};
      for (const inbox of webInboxes) {
        const messages =
          inbox.greetingMessages && inbox.greetingMessages.length > 0
            ? inbox.greetingMessages
            : inbox.greetingMessage
              ? parseMessagesText(inbox.greetingMessage)
              : defaultMessages;
        drafts[inbox.id] = fieldsFromInboxMessages(
          messages,
          inbox.welcomeTitle ?? settings.autoWelcomeTitle ?? MUTEX_DEFAULT_WELCOME_TITLE,
          inbox.welcomeTagline ?? settings.autoWelcomeTagline ?? MUTEX_DEFAULT_WELCOME_TAGLINE
        );
      }
      setInboxDrafts(drafts);
    } catch {
      setError('Failed to load auto message settings.');
    } finally {
      setLoaded(true);
    }
  };

  useEffect(() => {
    void load();
  }, [token, accountId]);

  const saveWorkspaceDefaults = async () => {
    if (!token || !accountId || !isAdmin) return;
    setSavingWorkspace(true);
    setError('');
    setMessage('');
    try {
      const messages = parseMessagesText(workspace.messagesText);
      await api.account.update(
        accountId,
        {
          settings: {
            autoMessages: messages,
            autoWelcomeTitle: workspace.welcomeTitle.trim() || undefined,
            autoWelcomeTagline: workspace.welcomeTagline.trim() || undefined,
          },
        },
        token
      );
      setMessage('Workspace auto message defaults saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save defaults');
    } finally {
      setSavingWorkspace(false);
    }
  };

  const applyWorkspaceToAll = async () => {
    if (!token || !accountId || !isAdmin || inboxes.length === 0) return;
    setApplyingAll(true);
    setError('');
    setMessage('');
    try {
      const payload = autoMessagesFromText(workspace);
      await Promise.all(
        inboxes.map((inbox) =>
          api.inboxes.update(accountId, inbox.id, payload, token)
        )
      );
      await load();
      setMessage(`Applied workspace defaults to ${inboxes.length} inbox${inboxes.length === 1 ? '' : 'es'}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to apply to inboxes');
    } finally {
      setApplyingAll(false);
    }
  };

  const saveInbox = async (inboxId: string) => {
    if (!token || !accountId || !isAdmin) return;
    const draft = inboxDrafts[inboxId];
    if (!draft) return;
    setSavingInboxId(inboxId);
    setError('');
    setMessage('');
    try {
      await api.inboxes.update(accountId, inboxId, autoMessagesFromText(draft), token);
      await load();
      setMessage('Inbox auto messages saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save inbox');
    } finally {
      setSavingInboxId(null);
    }
  };

  const resetInboxToWorkspace = (inboxId: string) => {
    setInboxDrafts((prev) => ({ ...prev, [inboxId]: { ...workspace } }));
  };

  if (!loaded) {
    return <div className="p-6 text-sm text-gray-400">Loading…</div>;
  }

  if (!isAdmin) {
    return (
      <div className="p-6 max-w-2xl">
        <p className="text-sm text-gray-500">Only administrators can configure auto messages.</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <Card>
        <CardHeader
          title="Workspace auto messages"
          description="Default messages for new chats when agents are online or offline. Inboxes without custom messages inherit these."
        />
        <CardBody className="space-y-4">
          <AutoMessagesFields value={workspace} onChange={setWorkspace} idPrefix="workspace" />
          <div className="flex flex-wrap gap-2">
            <Button type="button" disabled={savingWorkspace} onClick={() => void saveWorkspaceDefaults()}>
              {savingWorkspace ? 'Saving…' : 'Save workspace defaults'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={applyingAll || inboxes.length === 0}
              onClick={() => void applyWorkspaceToAll()}
            >
              {applyingAll ? 'Applying…' : 'Apply to all website inboxes'}
            </Button>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Per-inbox overrides"
          description="Customize auto messages per website widget. Used for both online and offline chat. Inboxes with no custom messages use workspace defaults."
        />
        <CardBody className="space-y-6">
          {inboxes.length === 0 ? (
            <p className="text-sm text-gray-400">
              No website inboxes yet.{' '}
              <Link href="/settings/inboxes" className="text-primary-600 hover:underline">
                Create one in Inboxes
              </Link>
              .
            </p>
          ) : (
            inboxes.map((inbox) => {
              const draft = inboxDrafts[inbox.id];
              if (!draft) return null;
              const usesDefaults = inboxUsesWorkspaceDefaults(inbox);
              return (
                <div key={inbox.id} className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{inbox.name}</p>
                      {usesDefaults && (
                        <span className="inline-block mt-1 text-[10px] font-medium uppercase tracking-wide text-primary-700 bg-primary-50 px-2 py-0.5 rounded">
                          Using workspace defaults
                        </span>
                      )}
                    </div>
                    <Link
                      href="/settings/inboxes"
                      className="text-xs text-gray-500 hover:text-gray-800 shrink-0"
                    >
                      Edit widget
                    </Link>
                  </div>
                  <AutoMessagesFields
                    value={draft}
                    onChange={(next) =>
                      setInboxDrafts((prev) => ({ ...prev, [inbox.id]: next }))
                    }
                    idPrefix={`inbox-${inbox.id}`}
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      disabled={savingInboxId === inbox.id}
                      onClick={() => void saveInbox(inbox.id)}
                    >
                      {savingInboxId === inbox.id ? 'Saving…' : 'Save inbox'}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => resetInboxToWorkspace(inbox.id)}
                    >
                      Reset to workspace defaults
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </CardBody>
      </Card>

      {message && <p className="text-sm text-green-700">{message}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
