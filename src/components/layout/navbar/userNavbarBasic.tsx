"use client";

import {
    Link,
    DropdownItem,
    DropdownTrigger,
    Dropdown,
    DropdownMenu,
    Avatar,
    Button,
    DropdownSection,
    cn,
} from "@heroui/react";
import { LogoutModal } from "./LogoutModal";
import { useLogoutModalContext } from "./LogoutModalProvider";
import { authClient } from "@/lib/auth-client";
import { Icons } from "@/components/icons/iconify";

export const UserNavbarBasic = () => {
    const { data: session } = authClient.useSession();
    const { openModal } = useLogoutModalContext();
    const iconClasses = "!size-8 text-default-500 pointer-events-none shrink-0";
    return (
        <>
            {session?.user ? (
                <Dropdown placement="bottom-end">
                    <DropdownTrigger>
                        <Avatar
                            isBordered
                            as="button"
                            className="transition-transform"
                            color="primary"
                            size="sm"
                            src={session?.user?.image || undefined}
                            imgProps={{
                                referrerPolicy: "no-referrer"
                            }}
                        />
                    </DropdownTrigger>
                    <DropdownMenu aria-label="Acciones del Perfil" variant="flat">
                        <DropdownSection showDivider title="Actions">
                            <DropdownItem
                                key="new"
                                description="Create a new file"
                                startContent={<Icons.user className={iconClasses} />}
                            >
                                New file
                            </DropdownItem>
                            <DropdownItem
                                key="copy"
                                description="Copy the file link"
                                startContent={<Icons.user className={iconClasses} />}
                            >
                                Copy link
                            </DropdownItem>
                            <DropdownItem
                                key="edit"
                                description="Allows you to edit the file"
                                startContent={<Icons.user className={iconClasses} />}
                            >
                                Edit file
                            </DropdownItem>
                        </DropdownSection>
                        <DropdownSection title="System">
                            <DropdownItem
                                key="delete"
                                className="text-danger"
                                color="danger"
                                description="Log out of your account"
                                startContent={<Icons.powerOff className={cn(iconClasses, "text-danger")} />}
                                onPress={() => {
                                    openModal();
                                }}
                            >
                                <span className="font-semibold">Log Out</span>
                            </DropdownItem>
                        </DropdownSection>
                    </DropdownMenu>
                </Dropdown>
            ) : (
    <Button
        endContent={<Icons.started className="!size-6 text-yellow-200" />}
        as={Link} href="/sign-up" variant="bordered" className="font-semibold rounded-full text-white border-white/25 hover:bg-white/10">
        Get Started
    </Button>
)
            }
< LogoutModal />
        </>
    );
};