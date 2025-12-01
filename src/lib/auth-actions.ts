import { authClient } from "~/lib/auth-client";

export async function sendVerificationOTP(email: string) {
  const { data, error } = await authClient.emailOtp.sendVerificationOtp({
    email,
    type: "sign-in",
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function verifyOTP(email: string, otp: string) {
  const { data, error } = await authClient.signIn.emailOtp({
    email,
    otp,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
