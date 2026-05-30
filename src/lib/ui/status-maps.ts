export type BadgeTone = "stone" | "green" | "amber" | "orange" | "red" | "blue" | "purple";

export const badgeToneClasses: Record<BadgeTone, string> = {
  amber: "bg-amber-100 text-amber-800 ring-amber-200",
  blue: "bg-blue-100 text-blue-800 ring-blue-200",
  green: "bg-green-100 text-green-800 ring-green-200",
  orange: "bg-orange-100 text-orange-800 ring-orange-200",
  purple: "bg-purple-100 text-purple-800 ring-purple-200",
  red: "bg-red-100 text-red-800 ring-red-200",
  stone: "bg-stone-100 text-stone-700 ring-stone-200",
};

