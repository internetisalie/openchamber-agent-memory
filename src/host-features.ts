export const supportsOpenCodeRequest = (context: object): boolean => (
  'features' in context
  && Array.isArray(context.features)
  && context.features.includes('openCodeRequest')
);
