import { Link, type LinkProps } from "@tanstack/react-router";
import { TrashIcon, PencilSquareIcon } from "@heroicons/react/24/outline";
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

export function ContactCard(props: {
  name: string;
  linkedin?: string;
  onDelete: () => void;
  onUpdate: (args: { name: string; linkedin?: string }) => void;
}) {
  return (
    <div className="flex items-center gap-2 rounded border border-slate-200 bg-white p-2">
      <div className="flex-1">
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
            onUpdate={(value) => {
              props.onUpdate({ name: props.name, linkedin: value });
            }}
          />
        ) : null}
      </div>
      <button
        onClick={props.onDelete}
        className="h-fit w-fit rounded p-1 hover:bg-slate-100"
      >
        <TrashIcon className="size-5" />
      </button>
      <button
        onClick={props.onDelete}
        className="h-fit w-fit rounded p-1 hover:bg-slate-100"
      >
        <PencilSquareIcon className="size-5" />
      </button>
    </div>
  );
}

function EditInput(props: {
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

  return (
    <>
      {isEditing ? (
        <div className="group flex items-center gap-2">
          <input
            className="flex-1 italic outline-none"
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
          />
        </div>
      ) : (
        <div className="group flex items-center gap-2">
          {props.type === "text" ? (
            <div>{props.value}</div>
          ) : (
            <a
              href={props.value}
              target="_blank"
              className="text-sm text-sky-500"
            >
              {props.value}
            </a>
          )}
          <button
            onClick={() => {
              setEditValue(props.value);
              setIsEditing(true);
            }}
          >
            <PencilSquareIcon className="hidden size-5 group-hover:block" />
          </button>
        </div>
      )}
    </>
  );
}
