import { SignInForm } from '@/components/forms/sign-in';
import { AccountView } from '@/components/account-view';
import { ThemeSwitch } from '@/components/theme-switch';
import Link from 'next/link';
import { Suspense } from 'react';
import { handleFlowState } from '@/lib/flow-state';
import { cookies } from 'next/headers';
import { getCurrentUser } from '@/server/auth.server';

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ op?: string }>;
}) {
  const params = await searchParams;
  const op = params.op;

  if (op) {
    await handleFlowState(op);
  }

  const userResponse = await getCurrentUser();
  const user = userResponse.data;

  const cookieStore = await cookies();
  const savedEmail = cookieStore.get("remember-email")?.value;

  return (
    <div className="min-h-svh py-20">
      {/* Left Side - Form */}
      <div className="flex items-center justify-center p-8 lg:p-12">
        <Suspense fallback={<div className="animate-pulse h-96 w-full max-w-md bg-muted rounded-lg" />}>
          {user ? (
            <AccountView user={user} />
          ) : (
            <SignInForm savedEmail={savedEmail} />
          )}
        </Suspense>
      </div>
    </div>
  );
}
