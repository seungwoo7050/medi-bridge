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

    const url = new URL(request.url);
    if (url.pathname === '/intro' || url.pathname === '/intro/') {
      return Response.redirect(new URL('/', url.origin).toString(), 301);
    }

    return env.ASSETS.fetch(request);
  },
};

export default worker;
