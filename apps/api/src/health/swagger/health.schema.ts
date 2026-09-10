export const healthResponseExample = {
  status: 'ok',
  service: 'api',
  version: '1.0.0',
};

export const metricsResponseExample = {
  requests: 12,
  errors: 0,
  status: { '200': 12 },
  uptimeSeconds: 80,
};

export const readyResponseExample = {
  status: 'ok',
  service: 'api',
  version: '1.0.0',
  checks: {
    postgres: true,
    redis: true,
  },
};
