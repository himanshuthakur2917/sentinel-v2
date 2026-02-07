"use client";

import { Keyboard, Mic, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface InputMethodSelectorProps {
  onSelect: (method: "manual" | "voice" | "natural_language") => void;
}

export function InputMethodSelector({ onSelect }: InputMethodSelectorProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 pt-4">
      <MethodCard
        icon={Sparkles}
        title="AI Chat"
        description="Type naturally like 'Remind me to call John tomorrow at 2pm'"
        onClick={() => onSelect("natural_language")}
        className="bg-indigo-50/50 hover:bg-indigo-50 border-indigo-100 hover:border-indigo-200 dark:bg-indigo-950/20 dark:hover:bg-indigo-950/30 dark:border-indigo-800"
      />

      <MethodCard
        icon={Mic}
        title="Voice"
        description="Speak your reminder details efficiently"
        onClick={() => onSelect("voice")}
        className="bg-orange-50/50 hover:bg-orange-50 border-orange-100 hover:border-orange-200 dark:bg-orange-950/20 dark:hover:bg-orange-950/30 dark:border-orange-800"
      />

      <MethodCard
        icon={Keyboard}
        title="Manual"
        description="Fill out the detailed form manually"
        onClick={() => onSelect("manual")}
        className="bg-slate-50/50 hover:bg-slate-50 border-slate-100 hover:border-slate-200 dark:bg-slate-900/20 dark:hover:bg-slate-900/30 dark:border-slate-800"
      />
    </div>
  );
}

function MethodCard({
  icon: Icon,
  title,
  description,
  onClick,
  className,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center text-center p-4 rounded-xl border transition-all duration-200 hover:scale-[1.02] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        className,
      )}
    >
      <div className="p-3 rounded-full bg-background shadow-sm mb-3 ring-1 ring-border/50">
        <Icon className="w-6 h-6 text-foreground" />
      </div>
      <h3 className="font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-xs text-muted-foreground leading-snug">
        {description}
      </p>
    </button>
  );
}
