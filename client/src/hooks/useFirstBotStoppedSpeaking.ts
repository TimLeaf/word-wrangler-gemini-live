import { useEffect, useRef } from "react";
import { RTVIEvent } from "@pipecat-ai/client-js";
import { useRTVIClientEvent } from "@pipecat-ai/client-react";

/**
 * RTVIEvent.BotStoppedSpeaking の発火に対し、`enabled` のときに限り `onFire`
 * を **1 回だけ** 呼ぶ。`resetKey` が変化すると「発火済み」状態がリセットされ、
 * 再び 1 回呼べるようになる（例: 切断 → 再接続）。
 */
export function useFirstBotStoppedSpeaking({
  enabled,
  resetKey,
  onFire,
}: {
  enabled: boolean;
  resetKey: unknown;
  onFire: () => void;
}): void {
  const firedRef = useRef(false);

  useEffect(() => {
    firedRef.current = false;
  }, [resetKey]);

  useRTVIClientEvent(RTVIEvent.BotStoppedSpeaking, () => {
    if (enabled && !firedRef.current) {
      firedRef.current = true;
      onFire();
    }
  });
}
