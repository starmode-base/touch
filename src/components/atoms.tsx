import { Link, type LinkProps } from "@tanstack/react-router";
import type { ButtonHTMLAttributes } from "react";

export function Button(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className="h-fit w-fit rounded bg-sky-500 px-4 py-1 text-white"
    >
      {props.children}
    </button>
  );
}

export function LinkButton(props: LinkProps) {
  return (
    <Link
      {...props}
      className="h-fit w-fit rounded bg-sky-500 px-4 py-1 text-white"
    >
      {props.children}
    </Link>
  );
}
