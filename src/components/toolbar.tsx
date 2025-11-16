import { Link, type LinkComponentProps } from "@tanstack/react-router";
import { useAuth } from "./hooks/auth";
import { useE2ee } from "./hooks/e2ee";
import { usePasskeys } from "./hooks/passkeys";
import {
  ArrowRightStartOnRectangleIcon,
  LockClosedIcon,
} from "@heroicons/react/24/outline";

function LinkButton(props: LinkComponentProps) {
  return (
    <Link
      {...props}
      activeProps={{
        className: "text-white bg-zinc-700",
      }}
      inactiveProps={{
        className: "text-zinc-400 hover:bg-zinc-800",
      }}
      className="rounded-xs px-2 py-1 text-xs"
    />
  );
}

function Button(props: React.ComponentPropsWithoutRef<"button">) {
  const { className = "", ...rest } = props;

  return (
    <button
      {...rest}
      className={`rounded-xs px-2 py-1 text-xs text-zinc-400 hover:text-white ${className}`}
    />
  );
}

export function Toolbar() {
  const auth = useAuth();
  const { isDekUnlocked } = useE2ee();
  const { triedAutoUnlock } = usePasskeys();

  return (
    <div className="flex items-center justify-between gap-2 bg-zinc-900 p-1 text-sm shadow">
      <div className="flex items-center gap-2">
        <LinkButton to="/contacts">Contacts</LinkButton>
        <LinkButton to="/profile">Profile</LinkButton>
      </div>
      <div className="flex items-center gap-2">
        <Button
          onClick={auth.lock}
          disabled={!isDekUnlocked && triedAutoUnlock}
          className="flex items-center gap-2"
        >
          <LockClosedIcon className="size-4" />
          <div>Lock</div>
        </Button>
        <Button onClick={auth.signOut} className="flex items-center gap-2">
          <ArrowRightStartOnRectangleIcon className="size-4" />
          <div>Sign out</div>
        </Button>
      </div>
    </div>
  );
}
