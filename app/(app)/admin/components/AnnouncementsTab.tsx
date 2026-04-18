"use client";

import { Megaphone, Plus, Edit3, Trash2 } from "lucide-react";
import { Card, Button } from "@/components/common";
import type { AnnouncementItem } from "../types";

interface Props {
  announcements: AnnouncementItem[];
  announcementForm: { title: string; content: string };
  setAnnouncementForm: (form: { title: string; content: string } | ((prev: { title: string; content: string }) => { title: string; content: string })) => void;
  editingAnnouncementId: string | null;
  setEditingAnnouncementId: (id: string | null) => void;
  announcementLoading: boolean;
  handleSaveAnnouncement: () => Promise<void>;
  handleDeleteAnnouncement: (id: string) => Promise<void>;
  startEditAnnouncement: (item: AnnouncementItem) => void;
}

export function AnnouncementsTab({
  announcements, announcementForm, setAnnouncementForm,
  editingAnnouncementId, setEditingAnnouncementId,
  announcementLoading, handleSaveAnnouncement,
  handleDeleteAnnouncement, startEditAnnouncement,
}: Props) {
  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Megaphone size={16} strokeWidth={1.5} />
          {editingAnnouncementId ? "공지사항 수정" : "새 공지사항"}
        </h3>
        <div className="space-y-3">
          <input
            type="text"
            placeholder="제목"
            value={announcementForm.title}
            onChange={(e) => setAnnouncementForm((f) => ({ ...f, title: e.target.value }))}
            className="w-full px-3 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <textarea
            placeholder="내용"
            value={announcementForm.content}
            onChange={(e) => setAnnouncementForm((f) => ({ ...f, content: e.target.value }))}
            rows={4}
            className="w-full px-3 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
          />
          <div className="flex gap-2">
            <Button
              variant="primary"
              size="md"
              onClick={handleSaveAnnouncement}
              disabled={announcementLoading || !announcementForm.title.trim() || !announcementForm.content.trim()}
            >
              <Plus size={14} strokeWidth={1.5} className="mr-1" />
              {editingAnnouncementId ? "수정" : "등록"}
            </Button>
            {editingAnnouncementId && (
              <Button
                variant="ghost"
                size="md"
                onClick={() => { setEditingAnnouncementId(null); setAnnouncementForm({ title: "", content: "" }); }}
              >
                취소
              </Button>
            )}
          </div>
        </div>
      </Card>

      <div className="space-y-3">
        {announcements.length === 0 ? (
          <Card className="p-12 text-center">
            <Megaphone size={40} strokeWidth={1.5} className="mx-auto text-gray-300 mb-3" />
            <p className="text-sm text-gray-500">등록된 공지사항이 없습니다</p>
          </Card>
        ) : (
          announcements.map((item) => (
            <Card key={item.id} className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-gray-900">{item.title}</h4>
                  <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap line-clamp-3">{item.content}</p>
                  <p className="text-xs text-gray-400 mt-2">
                    {new Date(item.createdAt).toLocaleDateString("ko-KR")}
                    {item.updatedAt !== item.createdAt && " (수정됨)"}
                  </p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => startEditAnnouncement(item)}
                    className="p-1.5 rounded hover:bg-gray-100 text-gray-500 transition-colors"
                    title="수정"
                  >
                    <Edit3 size={14} strokeWidth={1.5} />
                  </button>
                  <button
                    onClick={() => handleDeleteAnnouncement(item.id)}
                    className="p-1.5 rounded hover:bg-red-50 text-red-400 transition-colors"
                    title="삭제"
                  >
                    <Trash2 size={14} strokeWidth={1.5} />
                  </button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
