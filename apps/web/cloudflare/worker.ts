import {
  handleBoundsEdge,
  handleMatchEdge,
  handleOptionsEdge,
  handleTreatmentsEdge,
} from '../src/lib/edgeApi';

interface StaticAssetsBinding {
  fetch(request: Request): Promise<Response>;
}

export interface WorkerEnv {
  readonly ASSETS: StaticAssetsBinding;
}

const worker = {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/api/v1/hospitals/match') {
      return request.method === 'OPTIONS' ? handleOptionsEdge() : handleMatchEdge(request);
    }

    if (url.pathname === '/api/v1/hospitals/bounds') {
      return request.method === 'OPTIONS' ? handleOptionsEdge() : handleBoundsEdge(request);
    }

    if (url.pathname === '/api/v1/treatments') {
      return request.method === 'OPTIONS' ? handleOptionsEdge() : handleTreatmentsEdge(request);
    }

    if (request.headers.get('RSC') === '1') {
      return new Response('Not Found', { status: 404 });
    }

    return env.ASSETS.fetch(request);
  },
};

export default worker;
