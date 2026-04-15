import { ReactNode } from "react";
import { ExternalLink } from "lucide-react";

interface PostLinkProps {
  url: string;
  className?: string;
  children: ReactNode;
  showIcon?: boolean;
}

export default function PostLink({ url, className = "", children, showIcon = false }: PostLinkProps) {
  const isValid = url && url.startsWith("http");

  if (!isValid) {
    return <span className={`cursor-default ${className}`}>{children}</span>;
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`cursor-pointer hover:underline inline-flex items-center gap-1 group ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
      {showIcon && (
        <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-70 transition-opacity flex-shrink-0" />
      )}
    </a>
  );
}
