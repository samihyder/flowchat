export type AutoMessagesConfig = {
  messages: string[];
  welcomeTitle: string;
  welcomeTagline: string;
};

export function parseMessagesText(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

export function messagesToText(messages: string[]): string {
  return messages.join('\n');
}
