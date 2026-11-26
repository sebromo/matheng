import { redirect } from "next/navigation";
import { currentSession } from "../../server/auth/session";
import { SignInForm } from "../../features/auth/sign-in-form";

export const dynamic = "force-dynamic";

export default async function SignInPage() {
  if (await currentSession()) redirect("/");
  return <SignInForm />;
}
