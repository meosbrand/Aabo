import { AssistantChat } from "@/components/app/assistant-chat";
import { prisma } from "@/server/db";
import { getSessionUser } from "@/server/session";

export const dynamic = "force-dynamic";

export default async function CopilotPage() {
  const user = (await getSessionUser())!;
  const history = await prisma.chatMessage.findMany({ where: { userId: user.id, identityId: null }, orderBy: { createdAt: "desc" }, take: 20 });
  return <AssistantChat history={history.reverse().map((m) => ({ id: m.id, role: m.role === "assistant" ? "bot" : "user", content: m.content }))} />;
}
