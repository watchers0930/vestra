import { ExternalLink } from "lucide-react";

export default function GovernmentLink({ name, url, description }: { name: string; url: string; description: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-100 rounded-lg hover:bg-blue-100 transition-colors"
    >
      <ExternalLink size={18} className="text-primary shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-primary">{name}</div>
        <div className="text-xs text-secondary truncate">{description}</div>
      </div>
    </a>
  );
}
