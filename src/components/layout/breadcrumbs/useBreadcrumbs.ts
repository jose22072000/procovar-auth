"use client";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { BREADCRUMBS_MAP } from "@/constants/breadcrumbs";

function toTitleCase(slug: string) {
    return slug
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
}

export function useBreadcrumbs() {
    const pathname = usePathname();

    return useMemo(() => {
        if (!pathname) return [];
        const segments = pathname.split("/").filter(Boolean);
        if (segments.length === 0) return [];

        return segments.map((_, index) => {
            const href = `/${segments.slice(0, index + 1).join("/")}`;
            return {
                href,
                label: BREADCRUMBS_MAP[href] ?? toTitleCase(segments[index]),
            };
        });
    }, [pathname]);
}
