import { Link } from "@tanstack/react-router";
import { Contacts } from "~/components/contacts";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { Button } from "~/components/atoms";
import { contactsStore } from "~/collections/contacts-collection";
import { createContactInputSchema } from "~/server-functions/contacts";
import { useState } from "react";
import { extractLinkedInAndName } from "~/lib/linkedin-extractor";
import { useAuth } from "~/components/hooks/auth";
import { UserButton } from "@clerk/tanstack-react-start";

export function ContactsPanel(props: { userId: string }) {
  const [isValid, setIsValid] = useState(false);
  const auth = useAuth();

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-2 py-1">
        <div className="flex items-center gap-2">
          <Link to="/" className="rounded p-2">
            <ArrowLeftIcon className="size-5" />
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={auth.lock}>Lock</Button>
          <UserButton
            appearance={{
              elements: {
                userButtonPopoverActionButton__signOut: { display: "none" },
              },
            }}
          />
        </div>
      </div>
      <Contacts userId={props.userId} />
      <form
        className="flex items-center border-t border-slate-200 bg-slate-100 px-2"
        onInput={(e) => {
          const fd = new FormData(e.currentTarget);

          const ok = createContactInputSchema.safeParse({
            name: fd.get("name"),
            linkedin: null,
            userId: props.userId,
          }).success;

          setIsValid(e.currentTarget.checkValidity() && ok);
        }}
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);

          const values = createContactInputSchema.parse({
            name: fd.get("name"),
            linkedin: null,
            userId: props.userId,
          });

          const { name, linkedinUrl } = extractLinkedInAndName(values.name);

          void contactsStore.insert({
            userId: props.userId,
            name,
            linkedin: linkedinUrl,
          });

          e.currentTarget.reset();
          setIsValid(false);
        }}
      >
        <input
          type="text"
          name="name"
          placeholder="Contact name"
          required
          autoFocus
          data-1p-ignore // 1password ignore
          className="flex-1 p-2 outline-none"
        />
        <Button type="submit" disabled={!isValid} role="button">
          Add [Enter]
        </Button>
      </form>
    </div>
  );
}
