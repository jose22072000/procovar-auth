"use client";

// Shared primitives for the Mi perfil sections (moved out of the old
// /profile/config form, which no longer exists).

export const outlinedButtonClass =
    "font-semibold border-pv-azul/85 text-pv-azul bg-transparent hover:bg-pv-azul/8 dark:text-white dark:border-white/35 dark:hover:bg-white/10";

export function SectionCard({
    icon,
    title,
    children,
}: {
    icon: React.ReactNode;
    title: string;
    children: React.ReactNode;
}) {
    return (
        <div className="p-4 md:p-5 rounded-sm bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-gray-100 dark:border-slate-700">
                {icon}
                <h2 className="font-semibold text-gray-900 dark:text-white">{title}</h2>
            </div>
            {children}
        </div>
    );
}

export function ToggleRow({
    label,
    description,
    checked,
    onChange,
}: {
    label: string;
    description?: string;
    checked: boolean;
    onChange: (v: boolean) => void;
}) {
    return (
        <div className="flex items-center justify-between gap-4">
            <div>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{label}</p>
                {description && <p className="text-xs text-gray-400 mt-0.5">{description}</p>}
            </div>
            <button
                role="switch"
                aria-checked={checked}
                onClick={() => onChange(!checked)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-sm transition-colors focus:outline-none ${
                    checked ? "bg-blue-600" : "bg-gray-300 dark:bg-slate-600"
                }`}
            >
                <span
                    className={`inline-block size-5 rounded-sm bg-white shadow transform transition-transform ${
                        checked ? "translate-x-4" : "translate-x-0"
                    }`}
                />
            </button>
        </div>
    );
}

export function StatusMsg({ msg }: { msg: string }) {
    if (!msg) return null;
    const isError = msg.toLowerCase().includes("error") || msg.toLowerCase().includes("fallo");
    return (
        <span className={`text-xs ${isError ? "text-red-500" : "text-green-600 dark:text-green-400"}`}>
            {msg}
        </span>
    );
}
