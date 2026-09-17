import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth/session";
import Workspace from "./Workspace";

export const dynamic = "force-dynamic";

export default async function WorkspacePage() {
  const user = await currentUser();
  if (!user) redirect("/");
  return <Workspace username={user.username} />;
}
