"use client";
import Link from "next/link";
import { useBreadcrumbs } from "./useBreadcrumbs";

export function Breadcrumbs() {
    const crumbs = useBreadcrumbs();

    if (crumbs.length === 0) return null;

    const current = crumbs[crumbs.length - 1];

    return (
        <nav aria-label="Breadcrumb" className="flex w-full items-center overflow-hidden">
            <ol className="hidden xl:flex items-center gap-2 text-large text-default-700">
                {crumbs.map((crumb, index) => {
                    const isLast = index === crumbs.length - 1;
                    return (
                        <li key={crumb.href} className="flex items-center gap-2 whitespace-nowrap">
                            {!isLast ? (
                                <Link href={crumb.href} className="transition-colors hover:text-primary-600">
                                    {crumb.label}
                                </Link>
                            ) : (
                                <span aria-current="page" className="font-medium text-default-900">
                                    {crumb.label}
                                </span>
                            )}
                            {!isLast && <span className="text-default-400">/</span>}
                        </li>
                    );
                })}
            </ol>

            <div className="flex xl:hidden items-center text-large font-medium text-default-900">
                <span className="truncate" aria-current="page">
                    {current.label}
                </span>
            </div>
        </nav>
    );
}
