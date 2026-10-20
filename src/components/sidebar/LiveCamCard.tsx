import Image from "next/image";
import { getFormatter, getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/Card";
import { ComingSoonButton } from "@/components/ui/ComingSoon";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import { splitBold } from "@/lib/format";
import { getHardware } from "@/server/services/hardware";
import { CameraOfflineOverlay } from "./CameraOfflineOverlay";
import { LiveClock } from "./LiveClock";

export async function LiveCamCard({ projectId }: { projectId: string }) {
  const [t, format, { hub, camera }] = await Promise.all([getTranslations("camera"), getFormatter(), getHardware(projectId)]);
  const offline = !!hub && !hub.online;

  return (
    <Card as="section" aria-label={t("title")} id="live-cam" className={cn("overflow-hidden", offline && "border-error/40")}>
      <div className={cn("flex items-center justify-between border-b border-surface-variant p-space-sm", offline ? "bg-error-container/20" : "bg-surface-container-low")}>
        <h2 className={cn("flex items-center gap-2 text-title-sm", offline ? "text-error" : "text-on-surface")}>
          <span aria-hidden="true" className={cn("size-2 rounded-full", offline ? "animate-pulse bg-error" : "bg-error")} />
          {t("title")}
        </h2>
        {offline ? (
          <span className="rounded bg-error px-2 py-0.5 font-mono text-[10px] font-bold text-white">{t("rtspLost")}</span>
        ) : camera ? (
          <span className="rounded bg-surface-container-highest px-2 py-0.5 font-mono text-[10px] text-on-surface-variant">
            {camera.resolution} • {camera.fps}fps
          </span>
        ) : null}
      </div>

      {camera ? (
        <>
          <div className="group relative aspect-video w-full overflow-hidden bg-inverse-surface">
            <Image
              src={camera.imageUrl}
              alt={camera.label}
              fill
              sizes="(min-width: 1024px) 25vw, 100vw"
              className={cn("object-cover", offline && "opacity-20 grayscale")}
            />
            {offline ? (
              <CameraOfflineOverlay projectId={projectId} cameraLabel={camera.label} />
            ) : (
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
            )}
          </div>
          {camera.insight ? (
            <p className="flex items-start gap-2 border-t border-surface-variant bg-surface-container-low p-space-sm text-caption text-on-surface-variant">
              <Icon name={offline ? "warning" : "neurology"} className={cn("mt-0.5 shrink-0 text-[16px]", offline ? "text-error" : "text-primary-container")} />
              <span>
                {offline ? (
                  <>
                    {t("snapshotStale", {
                      time: camera.insightAt ? format.dateTime(new Date(camera.insightAt), { hour: "2-digit", minute: "2-digit", hour12: false }) : "",
                    })}{" "}
                    {splitBold(camera.insight).map((p, i) => (p.bold ? <strong key={i}>{p.text}</strong> : p.text))}{" "}
                    {t("verifyOnSite")}
                  </>
                ) : (
                  splitBold(camera.insight).map((p, i) => (p.bold ? <strong key={i}>{p.text}</strong> : p.text))
                )}
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
