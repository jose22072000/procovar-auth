import { Input, InternalForwardRefRenderFunction, type InputProps } from "@heroui/react"
import React from "react";
import { Icons } from "../icons/iconify";
import { useTranslations } from "next-intl";

export const InputPassword = ({ ...props }: InternalForwardRefRenderFunction<"input", InputProps>) => {
    const t = useTranslations();
    const [isVisible, setIsVisible] = React.useState(false);
    const toggleVisibility = () => setIsVisible(!isVisible);
    return <Input endContent={<button
        aria-label={t("common.togglePasswordVisibility")}
        className="focus:outline-solid outline-transparent"
        type="button"
        onClick={toggleVisibility}
    >
        {isVisible ? (
            <Icons.eyeClosed className="size-6 text-default-400 pointer-events-none" />
        ) : (
            <Icons.eye className="size-6 text-default-400 pointer-events-none" />
        )}
    </button>} {...props} type={isVisible ? "text" : "password"} />
}