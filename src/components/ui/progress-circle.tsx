
"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface ProgressCircleProps extends React.SVGProps<SVGSVGElement> {
  progress: number
}

// Function to get color based on progress percentage
const getProgressColor = (progress: number): string => {
  const p = Math.max(0, Math.min(100, progress));
  // Interpolate hue from Orange (40) to Primary (173)
  const hue = 40 + (p / 100) * (173 - 40);
  const saturation = 90;
  const lightness = 55;
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
};


export const ProgressCircle = React.forwardRef<
  SVGSVGElement,
  ProgressCircleProps
>(({ className, progress, children, ...props }, ref) => {
  const radius = 18
  const circumference = 2 * Math.PI * radius
  // We allow progress to go over 100% for the visual effect, but cap it at a high number to avoid weird rendering
  const effectiveProgress = Math.min(progress, 1000); 
  const offset = circumference - (effectiveProgress / 100) * circumference
  const color = getProgressColor(progress);

  return (
    <svg
      ref={ref}
      className={cn("h-16 w-16", className)}
      viewBox="0 0 40 40"
      {...props}
    >
      <circle
        className="text-muted/20"
        strokeWidth="4"
        stroke="currentColor"
        fill="transparent"
        r={radius}
        cx="20"
        cy="20"
      />
      <circle
        className="transition-all duration-500 ease-in-out"
        style={{
            strokeDashoffset: offset,
            strokeDasharray: circumference,
            stroke: color,
        }}
        strokeWidth="4"
        strokeLinecap="round"
        fill="transparent"
        r={radius}
        cx="20"
        cy="20"
        transform="rotate(-90 20 20)"
      />
      {children ? (
        <foreignObject x="0" y="0" width="40" height="40">
            <div className="flex items-center justify-center h-full w-full">
                {children}
            </div>
        </foreignObject>
      ) : (
        <text
            x="50%"
            y="50%"
            textAnchor="middle"
            dy=".3em"
            className="text-[0.6rem] font-bold fill-current text-foreground"
        >
            {`${Math.round(progress)}%`}
        </text>
      )}
    </svg>
  )
})
ProgressCircle.displayName = "ProgressCircle"
