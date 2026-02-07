"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { InputMethodSelector } from "@/components/dashboard/reminder/input-method-selector";
import { ManualInputForm } from "@/components/dashboard/reminder/manual-input-form";
import { VoiceInputForm } from "@/components/dashboard/reminder/voice-input-form";
import { NaturalLanguageForm } from "@/components/dashboard/reminder/natural-language-form";
import { Reminder } from "@/types/reminder";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

type DialogStage = "selection" | "manual" | "voice" | "natural_language";

export function NewReminderDialog({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const [stage, setStage] = React.useState<DialogStage>("selection");
  const [draftReminder, setDraftReminder] = React.useState<Partial<Reminder>>(
    {},
  );

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      // Reset state when closing
      setTimeout(() => {
        setStage("selection");
        setDraftReminder({});
      }, 300);
    }
  };

  const handleMethodSelect = (method: DialogStage) => {
    setStage(method);
  };

  const handleBack = () => {
    setStage("selection");
  };

  const handleDraftUpdate = (data: Partial<Reminder>) => {
    setDraftReminder((prev) => ({ ...prev, ...data }));
  };

  const handleProceedToManual = (data?: Partial<Reminder>) => {
    if (data) handleDraftUpdate(data);
    setStage("manual");
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent className="sm:max-w-[600px] gap-0 p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="flex items-center gap-2">
            {stage !== "selection" && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 -ml-2"
                onClick={handleBack}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <span>
              {stage === "selection" && "Create New Reminder"}
              {stage === "manual" && "Reminder Details"}
              {stage === "voice" && "Voice Input"}
              {stage === "natural_language" && "Quick Add"}
            </span>
          </DialogTitle>
          <DialogDescription>
            {stage === "selection" &&
              "Choose how you want to create this reminder."}
            {stage === "manual" && "Fill in the details for your reminder."}
            {stage === "voice" && "Speak clearly to create a reminder."}
            {stage === "natural_language" &&
              "Type naturally to create a reminder."}
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 pt-2">
          {stage === "selection" && (
            <InputMethodSelector onSelect={handleMethodSelect} />
          )}

          {stage === "manual" && (
            <ManualInputForm
              initialData={draftReminder}
              onBack={handleBack}
              onClose={() => handleOpenChange(false)}
            />
          )}

          {stage === "voice" && (
            <VoiceInputForm
              onBack={handleBack}
              onProceed={handleProceedToManual}
            />
          )}

          {stage === "natural_language" && (
            <NaturalLanguageForm onProceed={handleProceedToManual} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
