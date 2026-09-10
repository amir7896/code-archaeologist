import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE = __ENV.API_URL || 'http://127.0.0.1:3000';

export const options = {
  vus: 10,
  duration: '30s',
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<800'],
  },
};

export default function () {
  const health = http.get(`${BASE}/api/v1/health`);
  check(health, { 'liveness is 200': (res) => res.status === 200 });

  const metrics = http.get(`${BASE}/api/v1/metrics`);
  check(metrics, { 'metrics is 200': (res) => res.status === 200 });
  sleep(0.5);
}
