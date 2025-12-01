// import { createServerFn } from "@tanstack/react-start";
// import z from "zod";
import { authClient } from "~/lib/auth-client"; //import the auth client

export async function signUp(
  email: string,
  password: string,
  //   name: string,
  //   image: string,
) {
  const { data, error } = await authClient.signUp.email(
    {
      email, // user email address
      password, // user password -> min 8 characters by default
      name: email, // user display name
      //   image, // User image URL (optional)
      //   callbackURL: "/dashboard", // A URL to redirect to after the user verifies their email (optional)
    },
    {
      onRequest: (ctx) => {
        console.log("onRequest⚡️", ctx.credentials);
        //show loading
      },
      onSuccess: (ctx) => {
        console.log("onSuccess⚡️", ctx.data);
        //redirect to the dashboard or sign in page
      },
      onError: (ctx) => {
        console.log("onError⚡️", ctx.error.message);
        // display the error message
        // alert("Error: " + ctx.error.message);
      },
    },
  );

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

// export const signUpSF = createServerFn({ method: "POST" })
//   .inputValidator(
//     z.object({
//       email: z.string(),
//       password: z.string(),
//     }),
//   )
//   .handler(async ({ data }) => {
//     return signUp(data.email, data.password);
//   });

export async function signIn(email: string, password: string) {
  const { data, error } = await authClient.signIn.email(
    {
      email, // user email address
      password, // user password -> min 8 characters by default
      //   callbackURL: "/dashboard", // A URL to redirect to after the user verifies their email (optional)
    },
    {
      onRequest: (ctx) => {
        console.log("onRequest⚡️", ctx.credentials);
        //show loading
      },
      onSuccess: (ctx) => {
        console.log("onSuccess⚡️", ctx.data);
        //redirect to the dashboard or sign in page
      },
      onError: (ctx) => {
        console.log("onError⚡️", ctx.error.message);
        // display the error message
        // alert("Error: " + ctx.error.message);
      },
    },
  );

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
