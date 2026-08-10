import type { ComponentProps } from "react";
import { Icon as IconifyIcon } from "@iconify/react";

type IconProps = Omit<ComponentProps<typeof IconifyIcon>, "icon">;

function makeIcon(icon: string) {
    return function IconComponent(props: IconProps) {
        return <IconifyIcon icon={icon} {...props} />;
    };
}

export const Icons = {
    started: makeIcon("lucide:sparkles"),
    powerOff: makeIcon("lucide:power"),
    contact: makeIcon("lucide:phone-call"),
    property: makeIcon("lucide:building-2"),
    info: makeIcon("lucide:info"),
    bed: makeIcon("lucide:bed-double"),
    dialog: makeIcon("lucide:message-circle"),
    dialogCheck: makeIcon("lucide:message-circle-check"),
    sun: makeIcon("lucide:sun"),
    moon: makeIcon("lucide:moon"),
    google: makeIcon("logos:google-icon"),
    eyeClosed: makeIcon("lucide:eye-off"),
    eye: makeIcon("lucide:eye"),
    shieldKey: makeIcon("lucide:shield-check"),
    system: makeIcon("lucide:monitor"),
    mailOutline: makeIcon("lucide:mail"),
    keyMinimalistic: makeIcon("lucide:key-round"),
    user: makeIcon("lucide:user"),
    userCircle: makeIcon("lucide:circle-user-round"),
    userPlus: makeIcon("lucide:user-plus"),
    close: makeIcon("lucide:x-circle"),
    building: makeIcon("lucide:building"),
    link: makeIcon("lucide:link"),
    key: makeIcon("lucide:key"),
    github: makeIcon("lucide:github"),
    reservation: makeIcon("lucide:calendar-days"),
    arrowLeft: makeIcon("lucide:arrow-left"),
    search: makeIcon("lucide:search"),
    trashIcon: makeIcon("lucide:trash-2"),
    moneyBill: makeIcon("lucide:banknote"),
    wallet: makeIcon("lucide:wallet-minimal"),
    service: makeIcon("lucide:wrench"),
    clock: makeIcon("lucide:clock-3"),
    settings: makeIcon("lucide:settings"),
    bell: makeIcon("lucide:bell"),
    plus: makeIcon("lucide:plus-circle"),
    chevronLeft: makeIcon("lucide:chevron-left"),
    chevronRight: makeIcon("lucide:chevron-right"),
    checkCircle: makeIcon("lucide:check-circle-2"),
    chevronDown: makeIcon("lucide:chevron-down"),
    settingsLinear: makeIcon("lucide:settings"),
    sortVertical: makeIcon("lucide:arrow-up-down"),
    chevronsUpDown: makeIcon("lucide:chevrons-up-down"),
    creditCard: makeIcon("lucide:credit-card"),
    phone: makeIcon("lucide:phone"),
    arrowRight: makeIcon("lucide:arrow-right"),
    login: makeIcon("lucide:log-in"),
    archive: makeIcon("lucide:archive"),
    save: makeIcon("lucide:save"),
    refresh: makeIcon("lucide:refresh-cw"),
    ban: makeIcon("lucide:ban"),
    voucher: makeIcon("lucide:ticket-percent"),
    loader: makeIcon("lucide:loader-2"),
};

export function LogoAgenda(props: IconProps) {
    return <IconifyIcon icon="lucide:calendar-check-2" {...props} />;
}

export function IconSiderbar(props: IconProps) {
    return <IconifyIcon icon="lucide:panel-left-open" {...props} />;
}

/** Renders a dynamic icon by name using @iconify/react — centralised here so nothing else imports @iconify/react directly. */
export function AmenityIcon({ iconName, width, height, className }: { iconName: string; width?: number | string; height?: number | string; className?: string }) {
    return <IconifyIcon icon={iconName} width={width} height={height} className={className} />;
}