import { Link, type LinkProps } from "@tanstack/react-router";

export function Button(props: React.ComponentPropsWithoutRef<"button">) {
  return (
    <button
      className="h-fit w-fit rounded bg-sky-500 px-4 py-1 text-white disabled:bg-sky-300"
      {...props}
    >
      {props.children}
    </button>
  );
}

export function LinkButton(props: LinkProps) {
  return (
    <Link
      className="h-fit w-fit rounded bg-sky-500 px-4 py-1 text-white disabled:bg-sky-300"
      {...props}
    >
      {props.children}
    </Link>
  );
}
