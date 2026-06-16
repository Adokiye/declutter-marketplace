import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          "h-12 w-full rounded-full border border-zinc-200 bg-white px-5 text-sm outline-none transition placeholder:text-zinc-400 focus:border-zinc-500",
          className
        )}
        {...props}
      />
    );
  }
);
