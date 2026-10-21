import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({ auth:vi.fn(), findFirst:vi.fn(), findMany:vi.fn(), enabled:vi.fn(), get:vi.fn(), save:vi.fn() }));
vi.mock("@/lib/auth",()=>({auth:mocks.auth}));
vi.mock("@/lib/prisma",()=>({prisma:{analysis:{findFirst:mocks.findFirst,findMany:mocks.findMany}}}));
vi.mock("@/lib/jeonse/checklist-service",()=>({checklistPersistenceEnabled:mocks.enabled,getChecklist:mocks.get,saveChecklist:mocks.save}));
import { GET as detail } from "@/app/api/user/analyses/[id]/route";
import { GET, PUT } from "@/app/api/user/jeonse-checklists/route";
const row=(id:string,date:string,address="서울 101동 101호")=>({id,type:"rights",typeLabel:"권리분석",address,data:"{}",createdAt:new Date(date)});
const dto={address:"서울 101동 101호",schemaVersion:1,revision:0,state:{},updatedAt:null};
const valid={address:dto.address,schemaVersion:1,expectedRevision:0,state:{"0":true}};
const request=(body:unknown,origin="http://localhost:3000")=>new NextRequest("http://localhost:3000/api/user/jeonse-checklists",{method:"PUT",headers:{origin,"content-type":"application/json"},body:JSON.stringify(body)});
beforeEach(()=>{ vi.resetAllMocks(); mocks.auth.mockResolvedValue({user:{id:"owner"}}); mocks.enabled.mockReturnValue(true); });
describe("이력 상세 권한·계약",()=>{
 const ctx={params:Promise.resolve({id:"record"})};
 it("미인증 시 DB 미조회",async()=>{mocks.auth.mockResolvedValue(null);const r=await detail(new NextRequest("http://localhost/api/user/analyses/record"),ctx);expect(r.status).toBe(401);expect(r.headers.get("cache-control")).toBe("no-store");expect(mocks.findFirst).not.toHaveBeenCalled();});
 it("타인/없는 기록 동일 404 및 본인 조건",async()=>{mocks.findFirst.mockResolvedValue(null);const r=await detail(new NextRequest("http://localhost/api/user/analyses/record"),ctx);expect(r.status).toBe(404);expect(await r.json()).toEqual({error:"분석 기록을 찾을 수 없습니다."});expect(mocks.findFirst.mock.calls[0][0].where).toEqual({id:"record",userId:"owner"});});
 it.each(["includePrevious=0","includePrevious=1&includePrevious=1","other=x"])("잘못된 쿼리 %s",async query=>expect((await detail(new NextRequest(`http://localhost/api/user/analyses/record?${query}`),ctx)).status).toBe(400));
 it("본인·타입·이전 시각 조회 후 물건 일치 선택",async()=>{mocks.findFirst.mockResolvedValue(row("current","2026-10-21"));mocks.findMany.mockResolvedValue([row("other","2026-10-20","서울 101동 102호"),row("previous","2026-10-19")]);const r=await detail(new NextRequest("http://localhost/api/user/analyses/record?includePrevious=1"),ctx);expect(r.status).toBe(200);expect((await r.json()).previous.id).toBe("previous");expect(mocks.findMany.mock.calls[0][0]).toMatchObject({where:{userId:"owner",type:"rights",createdAt:{lt:new Date("2026-10-21")}},orderBy:[{createdAt:"desc"},{id:"desc"}],take:100});});
 it("일치 기록이 없으면 최근 300건에서 중단",async()=>{
   mocks.findFirst.mockResolvedValue(row("current","2026-10-21"));
   mocks.findMany.mockImplementation(async ({cursor})=>Array.from({length:100},(_,i)=>row(`${cursor?.id ?? "start"}_${i}`,"2026-10-20","다른 주소")));
   const r=await detail(new NextRequest("http://localhost/api/user/analyses/record?includePrevious=1"),ctx);
   expect(r.status).toBe(200);
   expect(await r.json()).toMatchObject({previous:null,diff:null});
   expect(mocks.findMany).toHaveBeenCalledTimes(3);
   expect(mocks.findMany.mock.calls.every(([q])=>q.take===100 && q.where.userId==="owner" && q.where.type==="rights")).toBe(true);
   expect(mocks.findMany.mock.calls[1][0]).toMatchObject({cursor:{id:"start_99"},skip:1});
 });
 it("상한의 마지막 후보도 매칭하고 추가 조회하지 않음",async()=>{
   mocks.findFirst.mockResolvedValue(row("current","2026-10-21"));
   const page=Array.from({length:100},(_,i)=>row(`other_${i}`,"2026-10-20","다른 주소"));
   mocks.findMany.mockResolvedValueOnce(page).mockResolvedValueOnce(page)
     .mockResolvedValueOnce([...page.slice(0,99),row("last","2026-10-19")]);
   const r=await detail(new NextRequest("http://localhost/api/user/analyses/record?includePrevious=1"),ctx);
   expect((await r.json()).previous.id).toBe("last");
   expect(mocks.findMany).toHaveBeenCalledTimes(3);
 });
 it("빈 후보 목록은 즉시 종료",async()=>{
   mocks.findFirst.mockResolvedValue(row("current","2026-10-21"));
   mocks.findMany.mockResolvedValue([]);
   const r=await detail(new NextRequest("http://localhost/api/user/analyses/record?includePrevious=1"),ctx);
   expect((await r.json()).previous).toBeNull();
   expect(mocks.findMany).toHaveBeenCalledTimes(1);
 });
 it("깨진 원문은 미확인 지표, 내부 오류 미노출",async()=>{mocks.findFirst.mockResolvedValue({...row("current","2026-10-21"),data:"broken"});const r=await detail(new NextRequest("http://localhost/api/user/analyses/record"),ctx);expect((await r.json()).current.metrics.safetyScore).toBeNull();mocks.findFirst.mockRejectedValue(new Error("secret query"));const fail=await detail(new NextRequest("http://localhost/api/user/analyses/record"),ctx);expect(await fail.json()).toEqual({error:"서버 오류가 발생했습니다."});});
});
describe("체크리스트 HTTP",()=>{
 it("비인증·Origin 거부는 no-store",async()=>{mocks.auth.mockResolvedValue(null);expect((await GET(new NextRequest("http://localhost/api/user/jeonse-checklists?address=서울"))).status).toBe(401);const r=await PUT(request(valid,"https://attacker.invalid"));expect(r.status).toBe(403);expect(r.headers.get("cache-control")).toBe("no-store");expect(mocks.save).not.toHaveBeenCalled();});
 it("DB 미적용 상태에서 기능 비활성·쿼리 없음",async()=>{mocks.enabled.mockReturnValue(false);expect((await PUT(request(valid))).status).toBe(500);expect((await GET(new NextRequest("http://localhost/api/user/jeonse-checklists?address=서울"))).status).toBe(500);expect(mocks.save).not.toHaveBeenCalled();expect(mocks.get).not.toHaveBeenCalled();});
 it("본인·정규화 주소만 조회",async()=>{mocks.get.mockResolvedValue(dto);const r=await GET(new NextRequest("http://localhost/api/user/jeonse-checklists?address=%20서울%20%20101호%20"));expect(r.status).toBe(200);expect(mocks.get).toHaveBeenCalledWith("owner","서울 101호");});
 it("사용자 ID 주입 무시·성공 DTO",async()=>{mocks.save.mockResolvedValue({conflict:false,dto:{...dto,revision:1}});const r=await PUT(request({...valid,userId:"victim",id:"injected"}));expect(r.status).toBe(200);expect(mocks.save).toHaveBeenCalledWith("owner",valid);expect((await r.json()).revision).toBe(1);});
 it("409는 최신 본인 상태",async()=>{mocks.save.mockResolvedValue({conflict:true,dto:{...dto,revision:2}});const r=await PUT(request(valid));expect(r.status).toBe(409);expect((await r.json()).latest.revision).toBe(2);});
 it("미지원 버전·키·과대본문 거부",async()=>{expect((await PUT(request({...valid,schemaVersion:2}))).status).toBe(400);expect((await PUT(request({...valid,state:{"15":true}}))).status).toBe(400);expect((await PUT(request({...valid,address:"가".repeat(6000)}))).status).toBe(413);expect(mocks.save).not.toHaveBeenCalled();});
});
