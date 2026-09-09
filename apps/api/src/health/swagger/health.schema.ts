export const healthResponseExample = {
  status: 'ok',
  service: 'api',
  version: '0.1.0',
};

export const readyResponseExample = {
  status: 'ok',
  service: 'api',
  version: '0.1.0',
  checks: {
    postgres: true,
    redis: true,
  },
};
