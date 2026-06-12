"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Card } from "@/components/common";

interface ResearchJournalEntry {
  id?: string;
  date: string;
  title: string;
  content: string;
  commits: string[];
  source?: "git" | "weekday-fill" | "manual";
}

function entriesToMarkdown(entries: ResearchJournalEntry[]) {
  return entries
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((entry) => [
      `## ${entry.date} ${entry.title}`,
      "",
      entry.content,
      "",
      entry.commits.length > 0 ? "커밋 근거" : "",
      ...entry.commits.map((commit) => `- ${commit}`),
    ].filter(Boolean).join("\n"))
    .join("\n\n");
}

export function ResearchJournalTab() {
  const [entries, setEntries] = useState<ResearchJournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [form, setForm] = useState<ResearchJournalEntry>({
    date: new Date().toISOString().slice(0, 10),
    title: "",
    content: "",
    commits: [],
  });

  const sortedEntries = useMemo(
    () => entries.slice().sort((a, b) => b.date.localeCompare(a.date)),
    [entries]
  );
  const months = useMemo(
    () => Array.from(new Set(entries.map((entry) => entry.date.slice(0, 7)))).sort().reverse(),
    [entries]
  );
  const visibleEntries = useMemo(
    () => selectedMonth === "all"
      ? sortedEntries
      : sortedEntries.filter((entry) => entry.date.startsWith(selectedMonth)),
    [selectedMonth, sortedEntries]
  );
  const visibleMarkdown = useMemo(() => entriesToMarkdown(visibleEntries), [visibleEntries]);
  const visibleGitCount = visibleEntries.filter((entry) => entry.commits.length > 0).length;
  const visibleFillCount = visibleEntries.filter((entry) => entry.commits.length === 0).length;

  async function loadEntries() {
    setLoading(true);
    const res = await fetch("/api/admin/research-journal");
    if (res.ok) {
      const data = await res.json();
      setEntries(data.entries || []);
    }
    setLoading(false);
  }

  useEffect(() => {
    void (async () => {
      await loadEntries();
    })();
  }, []);

  async function syncGit() {
    setSyncing(true);
    setMessage("");
    const res = await fetch("/api/admin/research-journal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "sync-git" }),
    });
    const data = await res.json();
    if (res.ok) {
      setEntries(data.entries || []);
      setMessage(`${data.count || 0}일치 연구일지를 동기화했습니다.`);
    } else {
      setMessage(data.error || "동기화에 실패했습니다.");
    }
    setSyncing(false);
  }

  async function saveManualEntry() {
    setMessage("");
    const res = await fetch("/api/admin/research-journal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "upsert", entry: form }),
    });
    const data = await res.json();
    if (res.ok) {
      setEntries(data.entries || []);
      setMessage("연구일지 항목을 저장했습니다.");
      setForm({ date: new Date().toISOString().slice(0, 10), title: "", content: "", commits: [] });
    } else {
      setMessage(data.error || "저장에 실패했습니다.");
    }
  }

  function editEntry(entry: ResearchJournalEntry) {
    setForm({
      date: entry.date,
      title: entry.title,
      content: entry.content,
      commits: entry.commits,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-[16px] font-bold text-[#1d1d1f]">연구일지 동기화</h3>
            <p className="mt-1 text-[13px] text-[#6e6e73]">
              Git 변경이력과 커밋 없는 평일의 자료조사·검토·테스트 기록을 저장하고, 매일 Cron으로 자동 갱신합니다.
            </p>
          </div>
          <Button onClick={syncGit} disabled={syncing}>
            {syncing ? "동기화 중..." : "최초일~현재 동기화"}
          </Button>
        </div>
        {message && <p className="mt-3 text-[13px] text-[#0071e3]">{message}</p>}
      </Card>

      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-[15px] font-bold text-[#1d1d1f]">월별 보기</h3>
            <p className="mt-1 text-[13px] text-[#6e6e73]">
              {selectedMonth === "all" ? "전체 기간" : selectedMonth} · {visibleEntries.length}일치 · 커밋일 {visibleGitCount}일 · 보강일 {visibleFillCount}일
            </p>
          </div>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="min-w-[180px] rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
          >
            <option value="all">전체</option>
            {months.map((month) => (
              <option key={month} value={month}>{month}</option>
            ))}
          </select>
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="text-[15px] font-bold text-[#1d1d1f]">수동 기록/수정</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-[160px_1fr]">
          <input
            type="date"
            value={form.date}
            onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
          <input
            value={form.title}
            onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
            placeholder="연구일지 제목"
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
        </div>
        <textarea
          value={form.content}
          onChange={(e) => setForm((prev) => ({ ...prev, content: e.target.value }))}
          placeholder="주요 작업, 연구개발 의미, 테스트 결과 등을 기록하세요."
          className="mt-3 min-h-[160px] w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
        />
        <div className="mt-3 flex justify-end">
          <Button onClick={saveManualEntry} disabled={!form.date || !form.title || !form.content}>
            저장
          </Button>
        </div>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
        <Card className="p-5">
          <h3 className="text-[15px] font-bold text-[#1d1d1f]">저장된 연구일지</h3>
          <div className="mt-4 space-y-3">
            {loading ? (
              <p className="text-sm text-[#86868b]">불러오는 중...</p>
            ) : visibleEntries.length === 0 ? (
              <p className="text-sm text-[#86868b]">저장된 연구일지가 없습니다.</p>
            ) : (
              visibleEntries.map((entry) => (
                <button
                  key={`${entry.date}-${entry.id || entry.title}`}
                  onClick={() => editEntry(entry)}
                  className="w-full rounded-xl border border-gray-100 bg-white p-4 text-left transition hover:border-[#0071e3]/30 hover:bg-blue-50/30"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[13px] font-semibold text-[#0071e3]">{entry.date}</span>
                    <span className="text-[12px] text-[#86868b]">
                      {entry.commits.length > 0 ? `${entry.commits.length} commits` : "평일 보강"}
                    </span>
                  </div>
                  <p className="mt-1 text-[14px] font-bold text-[#1d1d1f]">{entry.title}</p>
                  <p className="mt-2 line-clamp-3 whitespace-pre-line text-[12.5px] leading-5 text-[#6e6e73]">
                    {entry.content}
                  </p>
                </button>
              ))
            )}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-[15px] font-bold text-[#1d1d1f]">마크다운 출력</h3>
            <Button variant="secondary" size="sm" onClick={() => navigator.clipboard.writeText(visibleMarkdown)}>
              복사
            </Button>
          </div>
          <textarea
            readOnly
            value={visibleMarkdown}
            className="mt-4 h-[560px] w-full resize-none rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 font-mono text-[12px] leading-5"
          />
        </Card>
      </div>
    </div>
  );
}
