"use client";
import * as React from "react";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
// import { Button } from "@/components/ui/button" // Replaced Button with native div/span for internal logic
// actually I should use Button from shadcn
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
// import { Select } from "@/components/ui/select"
// Wait, I missed importing Select components properly.
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
// import ScrollArea? No, maybe simple overflow.
// I'll stick to simple native select if ScrollArea is too much, but Shadcn Select handles scrolling.

interface DateTimePickerProps {
  date: Date | undefined;
  setDate: (date: Date | undefined) => void;
}

export function DateTimePicker({ date, setDate }: DateTimePickerProps) {
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(
    date,
  );

  React.useEffect(() => {
    if (date) {
      setSelectedDate(date);
    }
  }, [date]);

  const now = new Date();
  const isToday =
    selectedDate &&
    selectedDate.getDate() === now.getDate() &&
    selectedDate.getMonth() === now.getMonth() &&
    selectedDate.getFullYear() === now.getFullYear();

  const handleSelect = (newDate: Date | undefined) => {
    if (!newDate) {
      setDate(undefined);
      return;
    }

    const finalDate = new Date(newDate);
    if (selectedDate) {
      finalDate.setHours(selectedDate.getHours());
      finalDate.setMinutes(selectedDate.getMinutes());
    } else {
      const now = new Date();
      finalDate.setHours(now.getHours());
      finalDate.setMinutes(now.getMinutes());
    }

    setDate(finalDate);
    setSelectedDate(finalDate);
  };

  const handleTimeChange = (type: "hour" | "minute", value: string) => {
    if (!selectedDate) return;

    const newDate = new Date(selectedDate);
    const val = parseInt(value, 10);

    if (type === "hour") {
      newDate.setHours(val);
    } else {
      newDate.setMinutes(val);
    }

    setDate(newDate);
    setSelectedDate(newDate);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full justify-start text-left font-normal",
            !date && "text-muted-foreground",
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "PPP p") : <span>Pick a date & time</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex flex-col sm:flex-row gap-2 p-2">
          <div className="rounded-md border">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleSelect}
              initialFocus
              captionLayout="dropdown"
              fromYear={new Date().getFullYear()}
              toYear={new Date().getFullYear() + 5}
              disabled={(date) =>
                date < new Date(new Date().setHours(0, 0, 0, 0))
              }
            />
          </div>

          {/* Time Picker Section */}
          <div className="flex flex-col gap-2 p-2 min-w-[140px] border-l pl-4">
            <div className="text-sm font-medium mb-1">Time</div>
            <div className="flex gap-2 items-center">
                <Select
                  value={
                    selectedDate ? selectedDate.getHours().toString() : "0"
                  }
                  onValueChange={(val) => handleTimeChange("hour", val)}
                  disabled={!selectedDate}
                >
                  <SelectTrigger className="w-[70px]">
                    <SelectValue placeholder="Hr" />
                  </SelectTrigger>
                  <SelectContent className="h-[200px]">
                    {Array.from({ length: 24 }).map((_, i) => (
                      <SelectItem
                        key={i}
                        value={i.toString()}
                        disabled={isToday && i < now.getHours()}
                      >
                        {i.toString().padStart(2, "0")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span>:</span>
                <Select
                  value={
                    selectedDate ? selectedDate.getMinutes().toString() : "0"
                  }
                  onValueChange={(val) => handleTimeChange("minute", val)}
                  disabled={!selectedDate}
                >
                  <SelectTrigger className="w-[70px]">
                    <SelectValue placeholder="Min" />
                  </SelectTrigger>
                  <SelectContent className="h-[200px]">
                    {Array.from({ length: 60 }).map((_, i) => (
                      <SelectItem
                        key={i}
                        value={i.toString()}
                        disabled={
                          isToday &&
                          selectedDate &&
                          selectedDate.getHours() === now.getHours() &&
                          i < now.getMinutes()
                        }
                      >
                        {i.toString().padStart(2, "0")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
      </PopoverContent>
    </Popover>
  );
}
