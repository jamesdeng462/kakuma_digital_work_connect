// Single entry point for the REST API: /api/* → src/server (see src/server/router.ts for all routes).
import { dispatch } from "@/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ path: string[] }> };

async function handle(req: Request, { params }: Params) {
  const { path } = await params;
  return dispatch(req, "/" + path.join("/"));
}

export { handle as GET, handle as POST, handle as PATCH, handle as DELETE };
