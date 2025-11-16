import { Link, type LinkComponentProps } from "@tanstack/react-router";
import { useAuth } from "./hooks/auth";
import { useE2ee } from "./hooks/e2ee";
import { usePasskeys } from "./hooks/passkeys";
import {
  ArrowRightStartOnRectangleIcon,
  Cog8ToothIcon,
  LockClosedIcon,
} from "@heroicons/react/24/outline";

function LinkButton(props: LinkComponentProps & { variant?: "icon" }) {
  return (
    <Link
      {...props}
      activeProps={{
        className: "text-zinc-100 bg-zinc-700",
      }}
      inactiveProps={{
        className: "text-zinc-400 hover:bg-zinc-800",
      }}
      className={`rounded-xs p-1 text-xs ${
        props.variant === "icon" ? "p-1" : "px-2 py-1"
      }`}
    />
  );
}

function Button(
  props: React.ComponentPropsWithoutRef<"button"> & { variant?: "icon" },
) {
  return (
    <button
      {...props}
      className={`rounded-xs p-1 text-xs text-zinc-400 hover:bg-zinc-800 ${
        props.variant === "icon" ? "p-1" : "px-2 py-1"
      }`}
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
        <LinkButton to="/opportunities">Opportunities</LinkButton>
        <LinkButton to="/privacy">Privacy Policy</LinkButton>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="icon"
          onClick={auth.lock}
          disabled={!isDekUnlocked && triedAutoUnlock}
        >
          <LockClosedIcon className="size-4" />
        </Button>
        <Button onClick={auth.signOut} variant="icon">
          <ArrowRightStartOnRectangleIcon className="size-4" />
        </Button>
        <LinkButton to="/profile" variant="icon">
          <Cog8ToothIcon className="size-4" />
        </LinkButton>
      </div>
    </div>
  );
}
