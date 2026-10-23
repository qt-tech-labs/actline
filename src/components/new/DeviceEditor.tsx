"use client";

import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import type { Blueprint, BlueprintDevice } from "@/lib/types";
import { useNewProject } from "./NewProjectProvider";

const KINDS: BlueprintDevice["kind"][] = ["gateway", "soil_probe", "valve", "camera"];

const FIELD =
  "w-full rounded-lg border border-surface-variant bg-surface px-3 py-2 text-body-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary";

type Values = { role: string; name: string; detail: string; protocol: string; kind: BlueprintDevice["kind"] };

const EMPTY: Values = { role: "", name: "", detail: "", protocol: "", kind: "soil_probe" };

function DeviceForm({
  initial,
  disabled,
  onSubmit,
  onCancel,
}: {
  initial: Values;
  disabled: boolean;
  onSubmit: (values: Values) => void | Promise<void>;
  onCancel: () => void;
}) {
  const t = useTranslations("newProject.blueprint.hardware");
  const id = useId();
  const [values, setValues] = useState(initial);
  const set = <K extends keyof Values>(key: K, value: Values[K]) => setValues((current) => ({ ...current, [key]: value }));
  const valid = values.name.trim() !== "" && values.role.trim() !== "";

  return (
    <form
      className="grid grid-cols-1 gap-3 rounded-lg border border-surface-variant bg-surface-container-low p-3 sm:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault();
        if (valid) void onSubmit({ ...values, name: values.name.trim(), role: values.role.trim(), detail: values.detail.trim(), protocol: values.protocol.trim() });
      }}
    >
      <label className="flex flex-col gap-1 font-mono text-label-sm text-on-surface-variant sm:col-span-2" htmlFor={`${id}-name`}>
        {t("deviceName")}
        <input id={`${id}-name`} value={values.name} onChange={(event) => set("name", event.target.value)} className={FIELD} autoFocus />
      </label>
      <label className="flex flex-col gap-1 font-mono text-label-sm text-on-surface-variant" htmlFor={`${id}-role`}>
        {t("deviceRole")}
        <input id={`${id}-role`} value={values.role} onChange={(event) => set("role", event.target.value)} placeholder={t("deviceRolePlaceholder")} className={FIELD} />
      </label>
      <label className="flex flex-col gap-1 font-mono text-label-sm text-on-surface-variant" htmlFor={`${id}-protocol`}>
        {t("deviceProtocol")}
        <input id={`${id}-protocol`} value={values.protocol} onChange={(event) => set("protocol", event.target.value)} placeholder="I2C, ADC, MQTT" className={FIELD} />
      </label>
      <label className="flex flex-col gap-1 font-mono text-label-sm text-on-surface-variant sm:col-span-2" htmlFor={`${id}-detail`}>
        {t("deviceDetail")}
        <input id={`${id}-detail`} value={values.detail} onChange={(event) => set("detail", event.target.value)} className={FIELD} />
      </label>
      <label className="flex flex-col gap-1 font-mono text-label-sm text-on-surface-variant" htmlFor={`${id}-kind`}>
        {t("deviceKind")}
        <select id={`${id}-kind`} value={values.kind} onChange={(event) => set("kind", event.target.value as Values["kind"])} className={FIELD}>
          {KINDS.map((kind) => (
            <option key={kind} value={kind}>
              {t(`kinds.${kind}`)}
            </option>
          ))}
        </select>
      </label>
      <div className="flex items-end justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-lg border border-surface-variant px-3 py-2 text-body-sm text-on-surface">
          {t("cancel")}
        </button>
        <button
          type="submit"
          disabled={disabled || !valid}
          className="rounded-lg bg-primary px-4 py-2 text-title-sm text-on-primary interactive hover:bg-primary-container active:scale-[0.98] disabled:opacity-60"
        >
          {t("save")}
        </button>
      </div>
    </form>
  );
}

/** "Configure sensors": opens an editor over the plan's device list (add, edit, remove). */
export function DeviceEditor({ blueprint }: { blueprint: Blueprint }) {
  const t = useTranslations("newProject.blueprint.hardware");
  const { applyOps, editing, blueprintId } = useNewProject();
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const locked = editing || !blueprintId;

  return (
    <>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        disabled={!blueprintId}
        className="rounded-lg border border-surface-variant bg-surface-container px-2.5 py-1 font-mono text-[11px] font-medium text-on-surface interactive hover:bg-surface-container-high disabled:cursor-not-allowed disabled:opacity-60"
      >
        {t("configure")}
      </button>

      {open ? (
        <div className="basis-full">
          <div className="mt-3 flex flex-col gap-3 rounded-xl border border-surface-variant bg-surface p-4">
            <div className="flex items-center justify-between gap-2">
              <h5 className="text-title-sm font-bold text-on-surface">{t("editorTitle")}</h5>
              <button
                type="button"
                onClick={() => {
                  setAdding((value) => !value);
                  setEditIndex(null);
                }}
                disabled={locked}
                className="inline-flex items-center gap-1.5 rounded-lg border border-surface-variant px-3 py-1.5 text-body-sm font-medium text-on-surface interactive hover:bg-surface-container disabled:opacity-60"
              >
                <Icon name="add_circle" className="text-[16px] text-primary" />
                {t("addDevice")}
              </button>
            </div>

            {adding ? (
              <DeviceForm
                initial={EMPTY}
                disabled={locked}
                onCancel={() => setAdding(false)}
                onSubmit={async (values) => {
                  await applyOps([{ op: "addDevice", ...values }]);
                  setAdding(false);
                }}
              />
            ) : null}

            {blueprint.devices.length === 0 && !adding ? <p className="text-body-sm text-on-surface-variant">{t("noDevices")}</p> : null}

            <ul className="flex flex-col gap-2">
              {blueprint.devices.map((device, position) => {
                const index = position + 1;
                return (
                  <li key={`${index}-${device.name}`} className="flex flex-col gap-2">
                    <div className="flex items-center gap-3 rounded-lg border border-surface-variant/60 bg-surface-container-low p-3">
                      <Icon name={device.icon} className={cn("text-[20px]", device.tone === "secondary" ? "text-secondary" : "text-primary")} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-body-sm font-semibold text-on-surface">{device.name}</p>
                        <p className="truncate font-mono text-[11px] text-on-surface-variant">
                          {[device.role, device.protocol, device.detail].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setEditIndex(editIndex === index ? null : index);
                          setAdding(false);
                        }}
                        disabled={locked}
                        aria-label={t("editDevice")}
                        title={t("editDevice")}
                        className="flex size-8 items-center justify-center rounded-lg border border-surface-variant text-outline interactive hover:border-primary hover:text-primary disabled:opacity-50"
                      >
                        <Icon name="edit_note" className="text-[18px]" />
                      </button>
                      <button
                        type="button"
                        onClick={() => void applyOps([{ op: "deleteDevice", index }])}
                        disabled={locked}
                        aria-label={t("deleteDevice")}
                        title={t("deleteDevice")}
                        className="flex size-8 items-center justify-center rounded-lg border border-surface-variant text-outline interactive hover:border-error hover:text-error disabled:opacity-50"
                      >
                        <Icon name="delete" className="text-[18px]" />
                      </button>
                    </div>
                    {editIndex === index ? (
                      <DeviceForm
                        initial={{ role: device.role, name: device.name, detail: device.detail, protocol: device.protocol, kind: device.kind }}
                        disabled={locked}
                        onCancel={() => setEditIndex(null)}
                        onSubmit={async (values) => {
                          await applyOps([{ op: "updateDevice", index, ...values }]);
                          setEditIndex(null);
                        }}
                      />
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      ) : null}
    </>
  );
}
