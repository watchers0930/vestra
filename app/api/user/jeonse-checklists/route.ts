import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { validateOrigin } from "@/lib/csrf";
import { checklistAddressSchema, checklistInputSchema } from "@/schemas/jeonse-checklist";
import { checklistPersistenceEnabled, getChecklist, saveChecklist } from "@/lib/jeonse/checklist-service";
import { privateJson, readChecklistBody, ChecklistBodyError } from "@/lib/jeonse/checklist-http";

const disabled = () => privateJson({ error: "체크리스트 서버 저장은 아직 준비 중입니다." }, 500);
export async function GET(req: NextRequest) {
  try {
    const s = await auth();
    if (!s?.user?.id) return privateJson({ error: "인증이 필요합니다." }, 401);
    const params = new URL(req.url).searchParams;
    const address = checklistAddressSchema.safeParse(params.get("address"));
    if (!address.success || params.getAll("address").length !== 1) return privateJson({ error: "주소를 확인해주세요." }, 400);
    if (!checklistPersistenceEnabled()) return disabled();
    return privateJson(await getChecklist(s.user.id, address.data));
  } catch {
    return privateJson({ error: "서버 오류가 발생했습니다." }, 500);
  }
}
export async function PUT(req: NextRequest) {
  try {
    const e = validateOrigin(req);
    if (e) { e.headers.set("Cache-Control", "no-store"); return e; }
    const s = await auth();
    if (!s?.user?.id) return privateJson({ error: "인증이 필요합니다." }, 401);
    const parsed = checklistInputSchema.safeParse(await readChecklistBody(req));
    if (!parsed.success) {
      const version = parsed.error.issues.some(i => i.path[0] === "schemaVersion");
      return privateJson({ error: version ? "버전 미지원" : "입력값을 확인해주세요." }, 400);
    }
    if (!checklistPersistenceEnabled()) return disabled();
    const result = await saveChecklist(s.user.id, parsed.data);
    return result.conflict
      ? privateJson({ error: "다른 기기에서 먼저 저장되었습니다.", latest: result.dto }, 409)
      : privateJson(result.dto);
  } catch (error) {
    if (error instanceof ChecklistBodyError) return privateJson({ error: error.status === 413 ? "요청 본문이 너무 큽니다." : "입력값을 확인해주세요." }, error.status);
    return privateJson({ error: "서버 오류가 발생했습니다." }, 500);
  }
}
