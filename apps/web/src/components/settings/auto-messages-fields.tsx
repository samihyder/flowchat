'use client';

import { Input } from '@/components/ui/input';
import { labelClass } from '@/components/ui/form-field';
import { messagesToText, parseMessagesText } from '@/lib/auto-messages';

export type AutoMessagesFieldsValue = {
  messagesText: string;
  welcomeTitle: string;
  welcomeTagline: string;
};

type Props = {
  value: AutoMessagesFieldsValue;
  onChange: (value: AutoMessagesFieldsValue) => void;
  idPrefix?: string;
};

export function AutoMessagesFields({ value, onChange, idPrefix = 'auto' }: Props) {
  return (
    <div className="space-y-4">
      <div>
        <label htmlFor={`${idPrefix}-messages`} className={labelClass}>
          Auto messages
        </label>
        <p className="text-xs text-gray-500 mb-1">
          One message per line. Sent automatically when a visitor starts chat — including offline mode.
        </p>
        <textarea
          id={`${idPrefix}-messages`}
          value={value.messagesText}
          onChange={(e) => onChange({ ...value, messagesText: e.target.value })}
          rows={5}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/25"
          placeholder={'Hi, welcome!\nHow can we help you today?'}
        />
        <p className="text-xs text-gray-400 mt-1">
          {parseMessagesText(value.messagesText).length} message
          {parseMessagesText(value.messagesText).length === 1 ? '' : 's'} configured
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor={`${idPrefix}-title`} className={labelClass}>
            Widget header title
          </label>
          <Input
            id={`${idPrefix}-title`}
            value={value.welcomeTitle}
            onChange={(e) => onChange({ ...value, welcomeTitle: e.target.value })}
            placeholder="Chat with us"
          />
        </div>
        <div>
          <label htmlFor={`${idPrefix}-tagline`} className={labelClass}>
            Widget header subtitle
          </label>
          <Input
            id={`${idPrefix}-tagline`}
            value={value.welcomeTagline}
            onChange={(e) => onChange({ ...value, welcomeTagline: e.target.value })}
            placeholder="We typically reply in a few minutes"
          />
        </div>
      </div>
    </div>
  );
}

export function autoMessagesFromText(fields: AutoMessagesFieldsValue) {
  const messages = parseMessagesText(fields.messagesText);
  return {
    greetingMessages: messages,
    greetingMessage: messagesToText(messages),
    welcomeTitle: fields.welcomeTitle.trim() || null,
    welcomeTagline: fields.welcomeTagline.trim() || null,
  };
}

export function fieldsFromInboxMessages(
  messages: string[],
  welcomeTitle: string,
  welcomeTagline: string
): AutoMessagesFieldsValue {
  return {
    messagesText: messagesToText(messages),
    welcomeTitle,
    welcomeTagline,
  };
}
