"use client";

import { useEffect, useState } from "react";
import { Button, Input, Spinner, addToast } from "@heroui/react";
import { Icon } from "@iconify/react";
import { useTranslations } from "next-intl";
import { getHoldMinutes, setHoldMinutes } from "@/app/(user)/dashboard/_actions";

export function PlatformSettings() {
	const t = useTranslations();
	const [minutes, setMinutes] = useState("15");
	const [loaded, setLoaded] = useState(false);
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		getHoldMinutes().then((m) => { setMinutes(String(m)); setLoaded(true); });
	}, []);

	const onSave = async () => {
		setSaving(true);
		const r = await setHoldMinutes(Number(minutes));
		setSaving(false);
		if (r.ok) addToast({ title: t("myProfile.admin.platformSettings.savedTitle"), description: t("myProfile.admin.platformSettings.savedDescription"), color: "success" });
		else addToast({ title: t("myProfile.admin.platformSettings.saveErrorTitle"), description: r.error ?? "", color: "danger" });
	};

	return (
		<div className="rounded-sm border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 mb-4">
			<div className="mb-4 flex items-center gap-2">
				<span className="flex size-8 items-center justify-center rounded-sm bg-[#0A2252]/8 text-[#0A2252] dark:bg-white/10 dark:text-sky-400">
					<Icon icon="lucide:sliders-horizontal" className="size-4" aria-hidden />
				</span>
				<div>
					<h3 className="text-sm font-bold text-gray-900 dark:text-white">{t("myProfile.admin.platformSettings.title")}</h3>
					<p className="text-xs text-gray-400">{t("myProfile.admin.platformSettings.subtitle")}</p>
				</div>
			</div>
			<div className="flex items-end gap-3 max-w-sm">
				<Input
					type="number"
					label={t("myProfile.admin.platformSettings.holdMinutesLabel")}
					min={1}
					max={1440}
					value={minutes}
					onValueChange={setMinutes}
					size="sm"
					isDisabled={!loaded}
					startContent={<Icon icon="lucide:clock" className="size-4 text-slate-400" aria-hidden />}
					endContent={!loaded ? <Spinner size="sm" /> : undefined}
				/>
				<Button variant="bordered" color="primary" size="sm" isLoading={saving} isDisabled={saving || !loaded} startContent={<Icon icon="lucide:save" className="size-4" aria-hidden />} onPress={onSave}>
					{t("myProfile.admin.platformSettings.saveButton")}
				</Button>
			</div>
			<p className="text-xs text-gray-400 mt-2">{t("myProfile.admin.platformSettings.holdMinutesHint")}</p>
		</div>
	);
}
