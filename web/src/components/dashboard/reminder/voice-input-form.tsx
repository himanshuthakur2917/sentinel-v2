"use client";

import { MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";

interface VoiceInputFormProps {
  onBack: () => void;
  onProceed: (data: any) => void;
}

export function VoiceInputForm({ onBack }: VoiceInputFormProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 gap-4 text-center min-h-[300px]">
      <div className="p-6 rounded-full bg-muted/20 ring-1 ring-border shadow-sm">
        <MicOff className="w-12 h-12 text-muted-foreground" />
      </div>

      <div className="max-w-[280px] space-y-2">
        <h3 className="text-lg font-semibold">Coming Soon</h3>
        <p className="text-sm text-muted-foreground">
          Voice input is currently under development. Please use the manual or
          AI chat method for now.
        </p>
      </div>

      <Button variant="outline" onClick={onBack} className="mt-4">
        Go Back
      </Button>
    </div>
  );
}
