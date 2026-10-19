import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/Card";
import { ComingSoonButton } from "@/components/ui/ComingSoon";
import { Icon } from "@/components/ui/Icon";
import { splitBold } from "@/lib/format";
import { getHardware } from "@/server/services/hardware";
import { LiveClock } from "./LiveClock";

export async function LiveCamCard({ projectId }: { projectId: string }) {
  const [t, { camera }] = await Promise.all([getTranslations("camera"), getHardware(projectId)]);

  return (
    <Card as="section" aria-label={t("title")} id="live-cam" className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-surface-variant bg-surface-container-low p-space-sm">
        <h2 className="flex items-center gap-2 text-title-sm text-on-surface">
          <span aria-hidden="true" className="size-2 animate-ping rounded-full bg-error" />
          {t("title")}
        </h2>
        {camera ? (
          <span className="rounded bg-surface-container-highest px-2 py-0.5 font-mono text-[10px] text-on-surface-variant">
            {camera.resolution} • {camera.fps}fps
          </span>
        ) : null}
      </div>

      {camera ? (
        <>
          <div className="group relative aspect-video w-full overflow-hidden bg-inverse-surface">
            <Image src={camera.imageUrl} alt={camera.label} fill sizes="(min-width: 1024px) 25vw, 100vw" className="object-cover" />
            <div className="absolute inset-0 flex flex-col justify-between bg-gradient-to-t from-black/70 via-transparent to-black/30 p-2.5 text-white">
              <div className="flex items-center justify-between font-mono text-[11px]">
                <span className="flex items-center gap-1 rounded bg-black/50 px-2 py-0.5 backdrop-blur-md">
                  <span aria-hidden="true" className="size-1.5 rounded-full bg-error" />
                  {t("live")} <LiveClock />
                </span>
                <span className="rounded bg-black/50 px-2 py-0.5 backdrop-blur-md">{camera.label}</span>
              </div>
              <div className="flex items-center justify-between gap-1 pt-2">
                <ComingSoonButton label={t("snapshot")} className="flex items-center gap-1 rounded bg-surface-container-lowest/90 px-2.5 py-1 font-mono text-label-sm text-on-surface backdrop-blur-sm">
                  <Icon name="photo_camera" className="text-[15px] text-primary" />
                  {t("snapshot")}
                </ComingSoonButton>
                <div className="flex items-center gap-1">
                  <ComingSoonButton label={t("timelapse")} className="rounded bg-black/40 p-1">
                    <Icon name="timelapse" className="text-[18px]" />
                  </ComingSoonButton>
                  <ComingSoonButton label={t("fullscreen")} className="rounded bg-black/40 p-1">
                    <Icon name="fullscreen" className="text-[18px]" />
                  </ComingSoonButton>
                </div>
              </div>
            </div>
          </div>
          {camera.insight ? (
            <p className="flex items-start gap-2 border-t border-surface-variant bg-surface-container-low p-space-sm text-caption text-on-surface-variant">
              <Icon name="neurology" className="mt-0.5 shrink-0 text-[16px] text-primary-container" />
              <span>
                {splitBold(camera.insight).map((p, i) => (p.bold ? <strong key={i}>{p.text}</strong> : p.text))}
              </span>
            </p>
          ) : null}
        </>
      ) : (
        <p className="p-space-lg text-center text-body-sm text-on-surface-variant">{t("noCamera")}</p>
      )}
    </Card>
  );
}
