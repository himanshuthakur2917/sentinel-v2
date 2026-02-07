"use client";

import * as React from "react";
import { ArrowUp, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Reminder } from "@/types/reminder";

interface NaturalLanguageFormProps {
  onProceed: (data: Partial<Reminder>) => void;
}

export function NaturalLanguageForm({ onProceed }: NaturalLanguageFormProps) {
  const [input, setInput] = React.useState("");
  const [isAnalyzing, setIsAnalyzing] = React.useState(false);

  const handleAnalyze = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    setIsAnalyzing(true);

    // Simulate AI analysis delay
    setTimeout(() => {
      setIsAnalyzing(false);
      // Mock analyzed data
      onProceed({
        title: "Mock: " + input,
        description: "Auto-generated description from AI analysis.",
        category: "personal",
        priority: "medium",
      });
    }, 1500);
  };

  return (
    <div className="flex flex-col min-h-[350px]">
      {/* Chat Area - Empty state or instructions */}
      <div className="flex-1 p-4 flex flex-col items-center justify-center text-center space-y-4 opacity-70">
        <Bot className="w-10 h-10 text-primary/50" />
        <div className="max-w-xs space-y-1">
          <p className="font-medium">AI Assistant</p>
          <p className="text-sm text-muted-foreground">
            Describe your reminder naturally. I&apos;ll extract dates, times,
            and priorities for you.
          </p>
        </div>
      </div>

      {/* Input Area */}
      <form
        onSubmit={handleAnalyze}
        className="p-4 border-t bg-muted/20 rounded-b-lg flex flex-col gap-2"
      >
        <div className="relative">
          <Input
            placeholder="e.g. Remind me to water plants every Monday at 9am..."
            className="pr-12 py-6 text-base shadow-sm bg-background border-transparent focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:ring-primary/20"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isAnalyzing}
          />
          <Button
            size="icon"
            type="submit"
            disabled={!input.trim() || isAnalyzing}
            className="absolute right-1.5 top-1.5 h-9 w-9 rounded-full transition-all"
          >
            <ArrowUp className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex justify-between items-center text-xs text-muted-foreground px-1">
          {isAnalyzing ? (
            <span className="animate-pulse text-primary">Analyzing...</span>
          ) : (
            <span>Press Enter to analyze</span>
          )}
        </div>
      </form>
    </div>
  );
}
