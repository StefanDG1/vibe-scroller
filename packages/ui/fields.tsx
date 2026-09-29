import type { ComponentProps } from "react";
import { clsx } from "clsx";
export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={clsx("field", className)} {...props} />;
}
export function Label(props: ComponentProps<"label">) {
  return <label {...props} />;
}
export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={clsx("field min-h-24", className)} {...props} />;
}
export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={clsx("field", className)} {...props} />;
}
export function Card({ className, ...props }: ComponentProps<"section">) {
  return <section className={clsx("card", className)} {...props} />;
}
export function Badge({ className, ...props }: ComponentProps<"span">) {
  return <span className={clsx("badge", className)} {...props} />;
}
