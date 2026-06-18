import * as React from "react";
import { DayPicker } from "react-day-picker";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  components,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn(
        "rounded-2xl border border-amber-500/15 bg-stone-950/75 p-3 text-amber-50 shadow-xl shadow-amber-500/5 backdrop-blur-md",
        className,
      )}
      classNames={{
        months: "flex flex-col sm:flex-row gap-2",
        month: "flex flex-col gap-4",
        month_caption: "flex justify-center pt-1 relative items-center w-full",
        caption_label: "text-sm font-semibold text-amber-50",
        nav: "flex items-center gap-1",
        button_previous:
          "absolute left-1 top-0 z-10 inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium text-slate-300 transition-colors hover:bg-amber-400/10 hover:text-amber-50 h-7 w-7 bg-transparent p-0 opacity-70 hover:opacity-100",
        button_next:
          "absolute right-1 top-0 z-10 inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium text-slate-300 transition-colors hover:bg-amber-400/10 hover:text-amber-50 h-7 w-7 bg-transparent p-0 opacity-70 hover:opacity-100",
        month_grid: "w-full border-collapse space-x-1",
        weekdays: "flex",
        weekday: "rounded-md w-9 font-normal text-[0.8rem] text-slate-300",
        week: "mt-2 flex w-full",
        day: "relative h-9 w-9 p-0 text-center text-sm text-amber-50 focus-within:relative focus-within:z-20 [&:has([aria-selected])]:bg-amber-400/10 [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-amber-400/10",
        day_button:
          "inline-flex h-9 w-9 items-center justify-center gap-2 rounded-md p-0 text-sm font-medium text-amber-50 transition-colors hover:bg-amber-400/10 hover:text-amber-50 aria-selected:opacity-100",
        range_end: "day-range-end",
        selected:
          "rounded-md bg-linear-to-r from-amber-400 via-orange-400 to-yellow-500 text-stone-950 hover:bg-linear-to-r hover:from-yellow-300 hover:via-orange-300 hover:to-amber-400 hover:text-stone-950 focus:bg-linear-to-r focus:from-cyan-300 focus:via-sky-300 focus:to-indigo-400 focus:text-stone-950",
        today:
          "rounded-md border border-cyan-400/30 bg-amber-400/10 font-semibold text-amber-50",
        outside:
          "day-outside text-slate-500 aria-selected:text-slate-600 opacity-50",
        disabled: "text-slate-500 opacity-50",
        range_middle:
          "aria-selected:bg-amber-400/10 aria-selected:text-amber-50",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) => {
          if (orientation === "left")
            return <ChevronLeft className="h-4 w-4" />;
          return <ChevronRight className="h-4 w-4" />;
        },
        ...components,
      }}
      {...props}
    />
  );
}

Calendar.displayName = "Calendar";

export { Calendar };
