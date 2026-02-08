import * as React from "react";
import { CalendarIcon, Clock } from "lucide-react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";

interface DateTimePickerProps {
  date: Date | undefined;
  setDate: (date: Date | undefined) => void;
  disabled?: (date: Date) => boolean;
}

export function DateTimePicker({
  date,
  setDate,
  disabled,
}: DateTimePickerProps) {
  const [selectedDateTime, setSelectedDateTime] = React.useState<
    Date | undefined
  >(date);

  React.useEffect(() => {
    setSelectedDateTime(date);
  }, [date]);

  const handleSelect = (day: Date | undefined) => {
    if (!day) {
      setSelectedDateTime(undefined);
      setDate(undefined);
      return;
    }
    const newDateTime = new Date(day);
    if (selectedDateTime) {
      newDateTime.setHours(selectedDateTime.getHours());
      newDateTime.setMinutes(selectedDateTime.getMinutes());
    } else {
      newDateTime.setHours(0, 0, 0, 0);
    }
    setSelectedDateTime(newDateTime);
    setDate(newDateTime);
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const timeStr = e.target.value;
    if (!selectedDateTime || !timeStr) return;

    const [hours, minutes] = timeStr.split(":").map(Number);
    const newDateTime = new Date(selectedDateTime);
    newDateTime.setHours(hours);
    newDateTime.setMinutes(minutes);

    setSelectedDateTime(newDateTime);
    setDate(newDateTime);
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
          {date ? (
            format(date, "PPP HH:mm", { locale: zhCN })
          ) : (
            <span>选择日期和时间</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selectedDateTime}
          onSelect={handleSelect}
          disabled={disabled}
          initialFocus
          locale={zhCN}
        />
        <div className="p-3 border-t border-border">
          <div className="relative">
            <Input
              type="time"
              className="pl-9 appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
              value={
                selectedDateTime ? format(selectedDateTime, "HH:mm") : "00:00"
              }
              onChange={handleTimeChange}
              disabled={!selectedDateTime}
            />
            <Clock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
