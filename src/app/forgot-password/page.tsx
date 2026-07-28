import { ForgotPasswordForm } from '@/components/forms/forgot-password';
import { Suspense } from 'react';

export default function ForgotPasswordPage() {
    return (
        <div className="min-h-svh py-20">
            <div className="flex items-center justify-center p-8 lg:p-12">
                <Suspense fallback={<div className="animate-pulse h-96 w-full max-w-md bg-muted rounded-lg" />}>
                    <ForgotPasswordForm />
                </Suspense>
            </div>
        </div>
    );
}
