"use client";

import { Button } from "@heroui/react";
import { Icons } from "./icons/iconify";
import { useTheme } from "next-themes";
import { useClient } from "@/hooks/useClient";

export function ThemeSwitch() {
    const { theme, setTheme } = useTheme()
    const isClient = useClient();
    const toggleTheme = () => {
        setTheme(theme === "light" ? "dark" : "light");
    };

    if (!isClient) return <Button isIconOnly variant="light">
        <Icons.moon

            className="!size-6 !text-white"
        />
    </Button>;

    return (
        <Button onPress={toggleTheme} isIconOnly variant="light">
            {theme === "light" ? (
                <Icons.moon

                    className="!size-6 !text-white"
                />
            ) : (
                <Icons.sun
                    className="!size-6 !text-white"
                />
            )}
        </Button>
    )
}