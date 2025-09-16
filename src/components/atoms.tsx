import { Link, type LinkProps } from "@tanstack/react-router";
import {
  CalendarIcon,
  TrashIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
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

function Chip(props: {
  children: React.ReactNode;
  onClick: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center gap-1 rounded-full bg-slate-300 pr-2 pl-3 text-xs font-medium text-slate-800">
      <div
        className="py-1 whitespace-nowrap"
        onClick={() => {
          console.log("clicked 1");
          props.onClick();
        }}
      >
        {props.children}
      </div>
      <button
        className="flex size-4 items-center justify-center rounded-full hover:bg-white/25"
        onClick={() => {
          console.log("clicked 2");
          props.onDelete();
        }}
      >
        <XMarkIcon className="size-3" />
      </button>
    </div>
  );
}

export function ContactCard(props: {
  name: string;
  linkedin?: string;
  onDelete: () => void;
  onUpdate: (args: { name: string; linkedin?: string }) => void;
  roles: { id: string; name: string }[];
  onRoleClick: (roleId: string) => void;
  onRoleDelete: (roleId: string) => void;
}) {
  return (
    <div className="grid grid-cols-5 items-center justify-between gap-2 rounded border border-slate-200 bg-white p-2">
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
          <Chip
            key={role.id}
            onDelete={() => {
              props.onRoleDelete(role.id);
            }}
            onClick={() => {
              props.onRoleClick(role.id);
              // contactRoleAssignmentsCollection.insert({
              //   contact_id: props.id,
              //   role_id: role.id,
              //   workspace_id: props.workspaceId,
              // });
            }}
          >
            {role.name}
          </Chip>
        ))}
      </div>
      <div className="flex items-center justify-center gap-1 text-xs text-slate-800">
        <CalendarIcon className="size-4" />
        2025-01-01
      </div>
      <button
        onClick={props.onDelete}
        className="w-fit rounded p-1 hover:bg-slate-100"
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
