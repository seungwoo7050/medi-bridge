interface StaticAssetsBinding {
  fetch(request: Request): Promise<Response>;
}

export interface WorkerEnv {
  readonly ASSETS: StaticAssetsBinding;
}

const worker = {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    if (request.headers.get('RSC') === '1') {
      return new Response('Not Found', { status: 404 });
    }

    return env.ASSETS.fetch(request);
  },
};

export default worker;
