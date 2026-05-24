import LaTeXRenderer from "./LaTeXRenderer";
import { AlertCircle } from "lucide-react";

interface ExplanationCardProps {
  explanationText: string;
}

export default function ExplanationCard({ explanationText }: ExplanationCardProps) {
  if (!explanationText) return null;

  // Split explanation by blocks/paragraphs to identify candidate error highlights
  const paragraphs = explanationText.split(/\n+/);

  return (
    <div className="space-y-3 mt-2">
      {paragraphs.map((p, index) => {
        const trimmed = p.trim();
        if (!trimmed) return null;

        // Check if this paragraph outlines highly critical student pitfalls
        const isWarning = 
          trimmed.includes("常见错误") || 
          trimmed.includes("容易错") || 
          trimmed.includes("易错点") ||
          trimmed.includes("忽略") ||
          trimmed.includes("忘记讨论") ||
          trimmed.includes("陷阱");

        if (isWarning) {
          return (
            <div 
              key={index} 
              className="p-3.5 bg-amber-50/70 border-l-4 border-amber-500 rounded-r-lg text-amber-900 shadow-sm transition-all duration-200 hover:bg-amber-100/60"
            >
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-1" />
                <div className="text-sm font-medium">
                  <span className="text-amber-700 font-bold block mb-1">【易错诊断】</span>
                  <LaTeXRenderer text={trimmed} />
                </div>
              </div>
            </div>
          );
        }

        // Standard explanation paragraph
        return (
          <div key={index} className="text-sm text-gray-700 leading-relaxed pl-1">
            <LaTeXRenderer text={trimmed} />
          </div>
        );
      })}
    </div>
  );
}
