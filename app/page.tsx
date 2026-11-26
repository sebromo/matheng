import { redirect } from "next/navigation";
import { currentSession } from "../server/auth/session";
import { WorksheetWorkspace } from "../features/worksheets/components/worksheet-workspace";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await currentSession();
  if (!session) redirect("/sign-in");
  return <WorksheetWorkspace userId={session.user.id} />;
}
