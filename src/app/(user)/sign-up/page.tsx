import { SignUpForm } from '@/components/forms/sign-up';
import { ThemeSwitch } from '@/components/theme-switch';
import Link from 'next/link';
import { Suspense } from 'react';

export default function SignUpPage() {
    return (
        <div className="">
            <div className="flex items-center justify-center p-8 lg:p-12">
                <Suspense fallback={<div className="animate-pulse h-96 w-full max-w-md bg-muted rounded-sm" />}>
                    <SignUpForm />
                </Suspense>
            </div>
        </div>
    );
}
