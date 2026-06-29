export const WORKFLOWS_DEPRECATED_BODY = {
  code: 'WORKFLOWS_DEPRECATED',
  error: 'deprecated',
  message: 'CRM marketing workflows are retired. Use Marketing → Campaigns.',
};

export function workflowsDeprecatedResponse() {
  return Response.json(WORKFLOWS_DEPRECATED_BODY, { status: 410 });
}
