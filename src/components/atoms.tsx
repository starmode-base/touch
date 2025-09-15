import { Link, type LinkProps } from "@tanstack/react-router";
import { TrashIcon } from "@heroicons/react/24/outline";
import { useState } from "react";

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

function extractLinkedInPath(url: string): string | null {
  try {
    const urlObj = new URL(url);

    // Check if it's a LinkedIn URL
    if (!urlObj.hostname.includes("linkedin.com")) {
      return null;
    }

    // Return the pathname if it starts with /in/ (without leading slash)
    if (urlObj.pathname.startsWith("/in/")) {
      return urlObj.pathname.slice(1);
    }

    return null;
  } catch {
    return null;
  }
}

function Pill(props: { children: React.ReactNode }) {
  return (
    <div className="rounded bg-slate-100 px-2 py-1 text-sm">
      {props.children}
    </div>
  );
}

export function ContactCard(props: {
  name: string;
  linkedin?: string;
  onDelete: () => void;
  onUpdate: (args: { name: string; linkedin?: string }) => void;
  roles: { id: string; name: string }[];
}) {
  return (
    <div className="grid grid-cols-4 items-center justify-between gap-2 rounded border border-slate-200 bg-white p-2">
      <EditInput
        type="text"
        value={props.name}
        onUpdate={(value) => {
          props.onUpdate({ name: value, linkedin: props.linkedin });
        }}
      />
      {props.linkedin ? (
        <EditInput
          type="link"
          value={props.linkedin}
          displayValue={extractLinkedInPath(props.linkedin) ?? undefined}
          onUpdate={(value) => {
            props.onUpdate({ name: props.name, linkedin: value });
          }}
        />
      ) : (
        <EditInput
          type="text"
          value={"https://www.linkedin.com/in/"}
          onUpdate={(value) => {
            props.onUpdate({ name: props.name, linkedin: value });
          }}
        />
      )}
      <div className="flex gap-2">
        {props.roles.map((role) => (
          <Pill key={role.id}>{role.name}</Pill>
        ))}
      </div>
      <button
        onClick={props.onDelete}
        className="rounded p-1 hover:bg-slate-100"
      >
        <TrashIcon className="size-5" />
      </button>
    </div>
  );
}

export function EditInput(props: {
  displayValue?: string;
  value: string;
  onUpdate: (value: string) => void;
  type: "text" | "link";
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(props.value);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Reset to original value
    if (e.key === "Escape") {
      setIsEditing(false);
      setEditValue(props.value);
    }

    // Update the value
    if (e.key === "Enter") {
      setIsEditing(false);
      props.onUpdate(editValue);
    }
  };

  const displayValue =
    typeof props.displayValue === "string" ? props.displayValue : props.value;

  if (isEditing) {
    return (
      <input
        className="rounded px-2 py-1 italic underline decoration-slate-300 decoration-dotted outline-none"
        type="text"
        autoFocus
        value={editValue}
        onChange={(e) => {
          setEditValue(e.target.value);
        }}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          setIsEditing(false);
        }}
        spellCheck={false}
      />
    );
  }

  if (props.type === "text") {
    return (
      <div
        className="rounded px-2 py-1 hover:bg-slate-50"
        onClick={() => {
          setEditValue(props.value);
          setIsEditing(true);
        }}
      >
        {displayValue}
      </div>
    );
  }

  return (
    <div
      className="rounded px-2 py-1 hover:bg-slate-50"
      onClick={() => {
        setEditValue(props.value);
        setIsEditing(true);
      }}
    >
      <a href={props.value} target="_blank" className="text-sky-500">
        {displayValue}
      </a>
    </div>
  );
}
