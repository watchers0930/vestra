"use client";

import { useState } from "react";
import { FileText, ExternalLink } from "lucide-react";
import { Card } from "@/components/common";

interface DocumentItem {
  name: string;
  description?: string;
  where: string;
  cost?: string;
  online?: boolean;
  onlineUrl?: string;
}

export default function DocumentChecklist({ documents, title = "필요 서류 체크리스트" }: { documents: DocumentItem[]; title?: string }) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  return (
    <Card className="p-5">
      <h4 className="font-semibold mb-3 flex items-center gap-2">
        <FileText size={18} className="text-primary" />
        {title}
      </h4>
      <div className="space-y-2">
        {documents.map((doc, i) => (
          <label key={i} className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-gray-50 cursor-pointer">
            <input
              type="checkbox"
              checked={checked[doc.name] || false}
              onChange={(e) => setChecked({ ...checked, [doc.name]: e.target.checked })}
              className="w-4 h-4 accent-primary mt-0.5"
            />
            <div className="flex-1">
              <div className="text-sm font-medium">{doc.name}</div>
              {doc.description && <div className="text-xs text-secondary mt-0.5">{doc.description}</div>}
              <div className="flex flex-wrap gap-2 mt-1">
                <span className="text-xs text-muted">발급처: {doc.where}</span>
                {doc.cost && <span className="text-xs text-muted">비용: {doc.cost}</span>}
                {doc.online && doc.onlineUrl && (
                  <a
                    href={doc.onlineUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <ExternalLink size={10} /> 온라인 가능
                  </a>
                )}
              </div>
            </div>
          </label>
        ))}
      </div>
    </Card>
  );
}
