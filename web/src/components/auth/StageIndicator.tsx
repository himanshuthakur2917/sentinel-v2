"use client";

import { Check, Mail, Phone, UserCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface Stage {
  id: string;
  label: string;
  icon: React.ElementType;
}

const STAGES: Stage[] = [
  { id: "email", label: "Email", icon: Mail },
  { id: "phone", label: "Phone", icon: Phone },
  { id: "complete", label: "Complete", icon: UserCheck },
];

interface StageIndicatorProps {
  currentStage: "email" | "phone" | "complete";
  emailVerified: boolean;
  phoneVerified: boolean;
}

export function StageIndicator({
  currentStage,
  emailVerified,
  phoneVerified,
}: StageIndicatorProps) {
  const getStageStatus = (
    stageId: string,
  ): "completed" | "current" | "upcoming" => {
    if (stageId === "email") {
      return emailVerified
        ? "completed"
        : currentStage === "email"
          ? "current"
          : "upcoming";
    }
    if (stageId === "phone") {
      return phoneVerified
        ? "completed"
        : currentStage === "phone"
          ? "current"
          : "upcoming";
    }
    if (stageId === "complete") {
      return currentStage === "complete" ? "current" : "upcoming";
    }
    return "upcoming";
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between relative">
        {/* Progress Line */}
        <div
          className="absolute top-5 left-0 right-0 h-0.5 bg-muted"
          style={{ zIndex: 0 }}
        >
          <div
            className="h-full bg-primary transition-all duration-500"
            style={{
              width:
                currentStage === "email"
                  ? "0%"
                  : currentStage === "phone"
                    ? "50%"
                    : "100%",
            }}
          />
        </div>

        {/* Stages */}
        {STAGES.map((stage, index) => {
          const status = getStageStatus(stage.id);
          const Icon = stage.icon;

          return (
            <div
              key={stage.id}
              className="flex flex-col items-center relative"
              style={{ zIndex: 1 }}
            >
              <div
                className={cn(
                  "w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all duration-300",
                  status === "completed" &&
                    "bg-primary border-primary text-primary-foreground",
                  status === "current" &&
                    "bg-background border-primary text-primary",
                  status === "upcoming" &&
                    "bg-background border-muted text-muted-foreground",
                )}
              >
                {status === "completed" ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <Icon className="h-5 w-5" />
                )}
              </div>
              <span
                className={cn(
                  "mt-2 text-xs font-medium transition-colors",
                  status === "completed" && "text-primary",
                  status === "current" && "text-foreground",
                  status === "upcoming" && "text-muted-foreground",
                )}
              >
                {stage.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
