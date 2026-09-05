import { mailer } from "@/lib/mailer/client";
import { SENDER_EMAIL } from "@/lib/mailer/constants";
import { VerifyEmail } from "@/lib/mailer/templates/verify-email";
import { inngest, isInngestEnabled } from "@/server/inngest";
import { sendWelcomeEmailToUser } from "@/server/inngest/send-welcome-email";
import { render } from "@react-email/components";
import { prisma } from "@workspace/db";
import type { BetterAuthOptions } from "better-auth";

export const emailVerification: NonNullable<
  BetterAuthOptions["emailVerification"]
> = {
  sendOnSignUp: true,
  autoSignInAfterVerification: true,
  afterEmailVerification: async (user) => {
    // The middleware will automatically redirect to onboarding since the user
    // will have autoSignInAfterVerification=true but onboardingCompleted=false

    // Hand off the welcome email to Inngest so a mailer outage can't fail
    // verification, and delivery is retried independently.
    if (isInngestEnabled()) {
      await inngest.send({
        name: "user/email-verified",
        data: { userId: user.id },
      });
      return;
    }

    // No background jobs (self-hosted without Inngest): send inline, but never
    // let a mail failure block the verification itself.
    try {
      await sendWelcomeEmailToUser(user.id);
    } catch (error) {
      console.error("[email-verification] welcome email failed:", error);
    }
  },
  sendVerificationEmail: async ({ user, url }, ctx) => {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
    });

    if (!dbUser) {
      throw Error("This user does not exist.");
    }

    const normalizedEmail = user.email.toLowerCase().trim();
    const from = SENDER_EMAIL;
    const body = await render(<VerifyEmail verificationLink={url} />);

    await mailer.emails.send({
      from,
      to: normalizedEmail,
      subject: "Verify your email",
      body,
    });
  },
};
