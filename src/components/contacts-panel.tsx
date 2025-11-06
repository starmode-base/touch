import { Contacts } from "~/components/contacts";
import { Button } from "~/components/atoms";
import { contactsStore } from "~/collections/contacts";
import { createContactInputSchema } from "~/server-functions/contacts";
import { useState } from "react";
import { extractLinkedInAndName } from "~/lib/linkedin-extractor";

export function ContactsPanel(props: { userId: string }) {
  const [isValid, setIsValid] = useState(false);

  return (
    <div className="flex flex-col p-1">
      <Contacts userId={props.userId} />
      <form
        className="flex items-center border-t border-slate-200 bg-slate-100 px-2"
        onInput={(e) => {
          const fd = new FormData(e.currentTarget);

          const ok = createContactInputSchema.safeParse({
            name: fd.get("name"),
            linkedin: null,
          }).success;

          setIsValid(e.currentTarget.checkValidity() && ok);
        }}
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);

          const values = createContactInputSchema.parse({
            name: fd.get("name"),
            linkedin: null,
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
