import "server-only";
import { headers } from "next/headers";
import { getAuth } from "./auth";

export async function currentSession() {
  return getAuth().api.getSession({ headers: await headers() });
}

export async function sessionFromRequest(request: Request) {
  return getAuth().api.getSession({ headers: request.headers });
}
