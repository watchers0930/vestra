"use client";

import { User, Save, X, Edit3, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, Badge } from "@/components/common";
import { ROLE_LABELS, ROLE_COLORS, VERIFY_LABELS } from "../constants";
import type { UserItem, ConfirmModalState } from "../types";

interface Props {
  users: UserItem[];
  filteredUsers: UserItem[];
  roleFilter: string;
  setRoleFilter: (v: string) => void;
  editingUserId: string | null;
  setEditingUserId: (id: string | null) => void;
  editRole: string;
  setEditRole: (v: string) => void;
  editLimit: number;
  setEditLimit: (v: number) => void;
  deleteConfirmId: string | null;
  setDeleteConfirmId: (id: string | null) => void;
  startEditing: (user: UserItem) => void;
  setConfirmModal: (modal: ConfirmModalState | null) => void;
  handleUserEdit: (userId: string) => Promise<void>;
  handleDeleteUser: (userId: string) => Promise<void>;
}

export function UsersTab({
  users, filteredUsers, roleFilter, setRoleFilter,
  editingUserId, setEditingUserId, editRole, setEditRole,
  editLimit, setEditLimit, deleteConfirmId, setDeleteConfirmId,
  startEditing, setConfirmModal, handleUserEdit, handleDeleteUser,
}: Props) {
  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {["ALL", ...Object.keys(ROLE_LABELS)].map((r) => (
          <button
            key={r}
            onClick={() => setRoleFilter(r)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
              roleFilter === r
                ? "bg-primary text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            )}
          >
            {r === "ALL" ? "전체" : ROLE_LABELS[r]} ({r === "ALL" ? users.length : users.filter((u) => u.role === r).length})
          </button>
        ))}
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">회원</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">역할</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">인증</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">일일한도</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">가입일</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {user.image ? (
                        <img src={user.image} alt="" className="w-8 h-8 rounded-full" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                          <User size={14} strokeWidth={1.5} className="text-gray-500" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-gray-900">{user.name || "이름 없음"}</p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {editingUserId === user.id ? (
                      <select
                        value={editRole}
                        onChange={(e) => setEditRole(e.target.value)}
                        className="px-2 py-1 rounded border border-border text-xs"
                      >
                        {Object.entries(ROLE_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    ) : (
                      <Badge variant={ROLE_COLORS[user.role] as "info" | "primary" | "success" | "danger" | "neutral"} size="md">
                        {ROLE_LABELS[user.role] || user.role}
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      "text-xs font-medium",
                      user.verifyStatus === "verified" && "text-emerald-600",
                      user.verifyStatus === "pending" && "text-amber-600",
                      user.verifyStatus === "rejected" && "text-red-600",
                      user.verifyStatus === "none" && "text-gray-400",
                    )}>
                      {VERIFY_LABELS[user.verifyStatus] || user.verifyStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {editingUserId === user.id ? (
                      <input
                        type="number"
                        value={editLimit}
                        onChange={(e) => setEditLimit(Number(e.target.value))}
                        className="w-20 px-2 py-1 rounded border border-border text-xs"
                        min={1}
                      />
                    ) : (
                      <span className="text-gray-600">{user.dailyLimit}회/일</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {new Date(user.createdAt).toLocaleDateString("ko-KR")}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {editingUserId === user.id ? (
                        <>
                          <button
                            onClick={() => setConfirmModal({
                              message: `${user.name || user.email} 회원의 역할/한도를 변경하시겠습니까?`,
                              onConfirm: () => { handleUserEdit(user.id); setConfirmModal(null); },
                            })}
                            className="p-1.5 rounded hover:bg-blue-50 text-blue-600 transition-colors"
                            title="저장"
                          >
                            <Save size={14} strokeWidth={1.5} />
                          </button>
                          <button
                            onClick={() => setEditingUserId(null)}
                            className="p-1.5 rounded hover:bg-gray-100 text-gray-500 transition-colors"
                            title="취소"
                          >
                            <X size={14} strokeWidth={1.5} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => startEditing(user)}
                            className="p-1.5 rounded hover:bg-gray-100 text-gray-500 transition-colors"
                            title="편집"
                          >
                            <Edit3 size={14} strokeWidth={1.5} />
                          </button>
                          {deleteConfirmId === user.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleDeleteUser(user.id)}
                                className="px-2 py-1 rounded bg-red-500 text-white text-xs hover:bg-red-600 transition-colors"
                              >
                                확인
                              </button>
                              <button
                                onClick={() => setDeleteConfirmId(null)}
                                className="px-2 py-1 rounded bg-gray-200 text-gray-600 text-xs hover:bg-gray-300 transition-colors"
                              >
                                취소
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirmId(user.id)}
                              disabled={user.role === "ADMIN"}
                              className={cn(
                                "p-1.5 rounded transition-colors",
                                user.role === "ADMIN"
                                  ? "text-gray-300 cursor-not-allowed"
                                  : "hover:bg-red-50 text-red-400"
                              )}
                              title={user.role === "ADMIN" ? "관리자 삭제 불가" : "삭제"}
                            >
                              <Trash2 size={14} strokeWidth={1.5} />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredUsers.length === 0 && (
          <div className="py-12 text-center text-sm text-gray-400">해당 역할의 회원이 없습니다</div>
        )}
      </Card>
    </div>
  );
}
