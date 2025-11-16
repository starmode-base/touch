import { Link } from "@tanstack/react-router";
import { useAuth } from "./hooks/auth";
import { Button } from "./atoms";
import { UserButton } from "@clerk/tanstack-react-start";
import { useE2ee } from "./hooks/e2ee";
import { usePasskeys } from "./hooks/passkeys";
import {
  ArrowRightStartOnRectangleIcon,
  LockClosedIcon,
} from "@heroicons/react/24/outline";

export function Toolbar() {
  const auth = useAuth();
  const { isDekUnlocked } = useE2ee();
  const { triedAutoUnlock } = usePasskeys();

  return (
    <div className="flex items-center justify-end gap-2 bg-white p-1 text-sm shadow">
      <Link to="/contacts">Contacts</Link>
      <Link to="/profile">Profile</Link>
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
      <UserButton
        appearance={{
          elements: {
            userButtonPopoverActionButton__signOut: { display: "none" },
          },
        }}
      />
    </div>
  );
}
