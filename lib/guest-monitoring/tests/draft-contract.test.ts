import { beforeEach, describe, expect, it, vi } from "vitest";
const f = vi.hoisted(() => ({ create: vi.fn(), extract: vi.fn(), fields: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { guestMonitoring: { create: f.create } } }));
vi.mock("../pdf-extraction", () => ({ extractGuestPDF: f.extract, extractRegistryFields: f.fields }));
vi.mock("../identity-hash", () => ({ guestIdentityHash: () => "server-identity", normalizeGuestName: (v: string) => v.trim(), normalizeGuestPhone: (v: string) => v.replace(/-/g, "") }));
import { createDraft } from "../draft";

function upload() {
  const form = new FormData();
  form.set("guestName", "홍길동");
  form.set("guestPhone", "01012345678");
  form.set("file", new File(["%PDF-1.7\nserver fixture"], "registry.pdf", { type: "application/pdf" }));
  return form;
}
const fields = { address: "서울 강남구 테스트로 1 101동 1502호", commUniqueNo: "1146-1234-123456", ownerName: "홍길동",
  unitNumber: { buildingDong: "101", unitHo: "1502", isAggregate: true } };
beforeEach(() => {
  vi.resetAllMocks();
  f.create.mockResolvedValue({ id: "server-draft" });
  f.extract.mockResolvedValue("server-pdf-text");
  f.fields.mockReturnValue(fields);
});
describe("PDF draft DTO and persistence allowlist", () => {
  it("accepts an address-free upload and persists only extracted database fields", async () => {
    const result = await createDraft(upload());
    expect(f.fields).toHaveBeenCalledWith("server-pdf-text");
    expect(f.create).toHaveBeenCalledWith({ data: {
      guestName: "홍길동", guestPhone: "01012345678", guestIdentityHash: "server-identity",
      address: fields.address, ownerName: fields.ownerName, commUniqueNo: fields.commUniqueNo,
      draftExpiresAt: expect.any(Date),
    }, select: { id: true } });
    expect(result).toEqual({ draftId: "server-draft", address: fields.address, unitNumber: fields.unitNumber,
      commUniqueNoMasked: "1146-****-******", ownerNameMasked: "홍**", extractionOk: true,
      draftExpiresAt: expect.any(String) });
    expect(result).not.toHaveProperty("ownerName");
    expect(result).not.toHaveProperty("commUniqueNo");
  });
  it.each(["address", "dong", "ho", "ownerName", "commUniqueNo", "unitNumber", "role", "amount"])("rejects injected %s before parsing or persistence", async key => {
    const form = upload();
    form.set(key, "injected");
    await expect(createDraft(form)).rejects.toMatchObject({ code: "invalid_input" });
    expect(f.extract).not.toHaveBeenCalled();
    expect(f.create).not.toHaveBeenCalled();
  });
  it.each(["file", "guestName", "guestPhone"])("rejects duplicate %s", async key => {
    const form = upload();
    form.append(key, "duplicate");
    await expect(createDraft(form)).rejects.toMatchObject({ code: "invalid_input" });
    expect(f.create).not.toHaveBeenCalled();
  });
  it("does not save a draft after incomplete extraction", async () => {
    const { GuestError } = await import("../errors");
    f.fields.mockImplementation(() => { throw new GuestError("extraction_incomplete"); });
    await expect(createDraft(upload())).rejects.toMatchObject({ code: "extraction_incomplete" });
    expect(f.create).not.toHaveBeenCalled();
  });
});
