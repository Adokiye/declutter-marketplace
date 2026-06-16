import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-[28px] bg-white shadow-soft ring-1 ring-white/70", className)} {...props} />;
}
