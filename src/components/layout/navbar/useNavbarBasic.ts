"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState, useRef } from "react";

/**
 * Custom hook to manage active scroll section for the navbar.
 * Listens to scroll events and determines which section is currently in view.
 * Uses throttling to improve performance and make updates more fluent.
 */
export function useNavbarBasic() {
    const pathname = usePathname();
    const [activeScrollId, setActiveScrollId] = useState<string | null>(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    // Track if a scroll frame is already requested (throttle)
    const tickingRef = useRef(false);
    // Record timestamp of the last manual scroll to allow scroll-driven updates after hash navigation
    const lastManualScrollRef = useRef<number | null>(null);

    // Dynamic list of section ids (collected from <section id="..."> elements on the page)
    const sectionsRef = useRef<string[]>([]);

    // Populate sectionsRef from the DOM and keep it updated if the DOM changes
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const basePath = window.location.pathname || pathname;
        if (basePath !== '/') return; // only collect sections on homepage

        const collect = () => {
            sectionsRef.current = Array.from(document.querySelectorAll('section[id]')).map(el => el.id);
        };

        collect();

        // Observe DOM changes to keep the list up-to-date (useful for client-side route changes)
        const observer = new MutationObserver(() => collect());
        observer.observe(document.body, { childList: true, subtree: true });

        return () => observer.disconnect();
    }, [pathname]);

    // Update active section based on window scroll position.
    // Only runs when we're on the homepage (pathname === '/') and there is no explicit hash in the URL.
    const updateActiveSection = useCallback(() => {
        if (typeof window === 'undefined') return;

        const basePath = window.location.pathname || pathname;
        if (basePath !== '/') return;

        const hash = window.location.hash.slice(1);
        // If a hash is present, prefer hash-driven navigation and don't update by scroll
        // UNLESS the user has manually scrolled recently (allow window of 1.5s)
        if (hash) {
            const last = lastManualScrollRef.current;
            const now = Date.now();
            const allowByScroll = last !== null && now - last < 1500;
            if (!allowByScroll) return;
        }

        const scrollPosition = window.scrollY + 200; // offset for fixed navbar

        const sectionIds = sectionsRef.current;
        for (const sectionId of sectionIds) {
            const el = document.getElementById(sectionId);
            if (!el) continue;
            const { offsetTop, offsetHeight } = el;
            if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
                setActiveScrollId(prev => (prev === sectionId ? prev : sectionId));
                return;
            }
        }
        // If no section matched, clear active
        setActiveScrollId(null);
    }, [pathname]);

    // Throttled scroll listener using requestAnimationFrame
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const handleScroll = () => {
            // mark this as a manual scroll
            lastManualScrollRef.current = Date.now();
            if (tickingRef.current) return;
            tickingRef.current = true;
            requestAnimationFrame(() => {
                updateActiveSection();
                tickingRef.current = false;
            });
        };

        // Only attach listener when on homepage (use browser pathname so hashes don't break the check)
        const basePath = typeof window !== 'undefined' ? window.location.pathname : pathname;
        if (basePath === '/') {
            window.addEventListener('scroll', handleScroll, { passive: true });
            // run once to initialize
            updateActiveSection();
        }

        return () => {
            window.removeEventListener('scroll', handleScroll);
        };
    }, [pathname, updateActiveSection]);

    // Close the menu whenever the pathname changes (including navigation away)
    useEffect(() => {
        setIsMenuOpen(false);
    }, [pathname]);

    // Listen to hash changes: update current active id and close menu
    // Only active on the homepage (pathname === '/')
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const basePath = window.location.pathname || pathname;
        if (basePath !== '/') return; // only care about hashes on homepage

        const handleHashChange = () => {
            const hash = window.location.hash.slice(1);
            if (hash) {
                setActiveScrollId(hash);
            }
        };

        window.addEventListener('hashchange', handleHashChange);
        // run once in case navigation already set a hash
        handleHashChange();

        return () => window.removeEventListener('hashchange', handleHashChange);
    }, [pathname]);

    // If we navigate away from the homepage, clear collected sections and active id
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const basePath = window.location.pathname || pathname;
        if (basePath !== '/') {
            sectionsRef.current = [];
            lastManualScrollRef.current = null;
            setActiveScrollId(null);
        }
    }, [pathname]);

    useEffect(() => {
        setIsMenuOpen(false);
    }, [activeScrollId]);

    return { activeScrollId, isMenuOpen, setIsMenuOpen };
}
