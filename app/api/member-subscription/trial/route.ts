import { auth } from "@/lib/auth";
import { memberEndpoint, memberJson, requireUser, memberMutation, memberBody } from "@/lib/member-subscription/http";
import { trialSchema } from "@/lib/member-subscription/schemas";
import { startMemberTrial } from "@/lib/member-subscription/trial";
export async function POST(req: Request) {
  return memberEndpoint(async () => {
    const userId = requireUser(await auth());
    await memberMutation(req, userId);
    const input = await memberBody(req, trialSchema);
    return memberJson(await startMemberTrial(userId, input.plan), 201);
  });
}
