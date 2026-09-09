import { WorkerRuntimeService } from './worker-runtime.service';

describe('WorkerRuntimeService', () => {
  it('exposes a dependency check method', () => {
    expect(typeof WorkerRuntimeService.prototype.check).toBe('function');
  });
});
