import { heroui } from "@heroui/react";
export default heroui({
    prefix: "heroui", // prefix for themes variables
    addCommonColors: false, // override common colors (e.g. "blue", "green", "pink").
    defaultTheme: "light", // default theme from the themes object
    defaultExtendTheme: "light", // default theme to extend on custom themes

    "themes": {
        "light": {
            "colors": {
                "default": {
                    "50": "#fafafa",
                    "100": "#f4f4f5",
                    "200": "#e4e4e7",
                    "300": "#d4d4d8",
                    "400": "#a1a1aa",
                    "500": "#71717a",
                    "600": "#52525b",
                    "700": "#3f3f46",
                    "800": "#27272a",
                    "900": "#18181b",
                    "foreground": "#000",
                    "DEFAULT": "#71717a"
                },
                "primary": {
                    "50": "#eff6ff",
                    "100": "#dbeafe",
                    "200": "#bfdbfe",
                    "300": "#93c5fd",
                    "400": "#60a5fa",
                    "500": "#3b82f6",
                    "600": "#2563eb",
                    "700": "#1d4ed8",
                    "800": "#1e40af",
                    "900": "#1e3a8a",
                    "foreground": "#fff",
                    "DEFAULT": "#1e3a8a"
                },
                "secondary": {
                    "50": "#eee4f8",
                    "100": "#d7bfef",
                    "200": "#bf99e5",
                    "300": "#a773db",
                    "400": "#904ed2",
                    "500": "#7828c8",
                    "600": "#6321a5",
                    "700": "#4e1a82",
                    "800": "#39135f",
                    "900": "#240c3c",
                    "foreground": "#fff",
                    "DEFAULT": "#7828c8"
                },
                "success": {
                    "50": "#e2f8ec",
                    "100": "#b9efd1",
                    "200": "#91e5b5",
                    "300": "#68dc9a",
                    "400": "#40d27f",
                    "500": "#17c964",
                    "600": "#13a653",
                    "700": "#0f8341",
                    "800": "#0b5f30",
                    "900": "#073c1e",
                    "foreground": "#000",
                    "DEFAULT": "#17c964"
                },
                "warning": {
                    "50": "#fef4e4",
                    "100": "#fce4bd",
                    "200": "#fad497",
                    "300": "#f9c571",
                    "400": "#f7b54a",
                    "500": "#f5a524",
                    "600": "#ca881e",
                    "700": "#9f6b17",
                    "800": "#744e11",
                    "900": "#4a320b",
                    "foreground": "#000",
                    "DEFAULT": "#f5a524"
                },
                "danger": {
                    "50": "#fef2f2",
                    "100": "#fee2e2",
                    "200": "#fecaca",
                    "300": "#fca5a5",
                    "400": "#f87171",
                    "500": "#ef4444",
                    "600": "#dc2626",
                    "700": "#b91c1c",
                    "800": "#991b1b",
                    "900": "#7f1d1d",
                    "foreground": "#fff",
                    "DEFAULT": "#dc2626"
                },
                "background": "#ffffff",
                "foreground": "#000000",
                "content1": {
                    "DEFAULT": "#ffffff",
                    "foreground": "#000"
                },
                "content2": {
                    "DEFAULT": "#f4f4f5",
                    "foreground": "#000"
                },
                "content3": {
                    "DEFAULT": "#e4e4e7",
                    "foreground": "#000"
                },
                "content4": {
                    "DEFAULT": "#d4d4d8",
                    "foreground": "#000"
                },
                "focus": "#006FEE",
                "overlay": "#ffffff"
            }
        },
        "dark": {
            "colors": {                
                "primary": {
                    "50": "#002147",
                    "100": "#003571",
                    "200": "#00489b",
                    "300": "#005cc4",
                    "400": "#006fee",
                    "500": "#2d88f1",
                    "600": "#59a1f4",
                    "700": "#86bbf7",
                    "800": "#b3d4fa",
                    "900": "#dfedfd",
                    "foreground": "#fff",
                    "DEFAULT": "#006fee"
                },
                "secondary": {
                    "50": "#240c3c",
                    "100": "#39135f",
                    "200": "#4e1a82",
                    "300": "#6321a5",
                    "400": "#7828c8",
                    "500": "#904ed2",
                    "600": "#a773db",
                    "700": "#bf99e5",
                    "800": "#d7bfef",
                    "900": "#eee4f8",
                    "foreground": "#fff",
                    "DEFAULT": "#7828c8"
                },
                "success": {
                    "50": "#073c1e",
                    "100": "#0b5f30",
                    "200": "#0f8341",
                    "300": "#13a653",
                    "400": "#17c964",
                    "500": "#40d27f",
                    "600": "#68dc9a",
                    "700": "#91e5b5",
                    "800": "#b9efd1",
                    "900": "#e2f8ec",
                    "foreground": "#000",
                    "DEFAULT": "#17c964"
                },
                "warning": {
                    "50": "#4a320b",
                    "100": "#744e11",
                    "200": "#9f6b17",
                    "300": "#ca881e",
                    "400": "#f5a524",
                    "500": "#f7b54a",
                    "600": "#f9c571",
                    "700": "#fad497",
                    "800": "#fce4bd",
                    "900": "#fef4e4",
                    "foreground": "#000",
                    "DEFAULT": "#f5a524"
                },
                "danger": {
                    "50": "#7f1d1d",
                    "100": "#991b1b",
                    "200": "#b91c1c",
                    "300": "#dc2626",
                    "400": "#ef4444",
                    "500": "#f87171",
                    "600": "#fca5a5",
                    "700": "#fecaca",
                    "800": "#fee2e2",
                    "900": "#fef2f2",
                    "foreground": "#fff",
                    "DEFAULT": "#ef4444"
                },
                "background": "#000000",
                "foreground": "#ffffff",                
                "overlay": "#000000"
            }
        }
    },
    "layout": {
        "disabledOpacity": "0.6",
        "radius": {
            "small": "2px",
            "medium": "2px",
            "large": "2px"
        }
    }

});
