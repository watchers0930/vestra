import { ExternalLink } from "lucide-react";

export default function GovernmentLink({ name, url, description }: { name: string; url: string; description: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 p-3 bg-[#f5f5f7] border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
    >
      <ExternalLink size={18} strokeWidth={1.5} className="text-[#1d1d1f] shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-[#1d1d1f]">{name}</div>
        <div className="text-xs text-secondary truncate">{description}</div>
      </div>
    </a>
  );
}
