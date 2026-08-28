/**
 * Windows system audio capture for Obsidian/Electron.
 *
 * Captures desktop system audio using Chromium's desktop media source.
 * The capture API also creates a temporary video track, but LexVoice
 * only needs audio, so the video track is stopped immediately.
 */

const WINDOWS_SYSTEM_AUDIO_CONSTRAINTS = {
  audio: {
    mandatory: {
      chromeMediaSource: "desktop",
    },
  },
  video: {
    mandatory: {
      chromeMediaSource: "desktop",
    },
  },
} as unknown as MediaStreamConstraints;

/**
 * Capture Windows system audio.
 *
 * Returns an audio-only MediaStream.
 */
export async function acquireWindowsSystemAudio(): Promise<MediaStream> {
  const rawStream = await navigator.mediaDevices.getUserMedia(
    WINDOWS_SYSTEM_AUDIO_CONSTRAINTS,
  );

  const audioTracks = rawStream.getAudioTracks();

  if (audioTracks.length === 0) {
    rawStream.getTracks().forEach((track) => track.stop());

    throw new Error("未取得 Windows 系统音频轨道。");
  }

  // Desktop capture also creates a video track.
  // We verified that stopping it does not interrupt system audio.
  rawStream.getVideoTracks().forEach((track) => track.stop());

  const audioStream = new MediaStream(audioTracks);

  const hasLiveAudio = audioStream
    .getAudioTracks()
    .some((track) => track.readyState === "live");

  if (!hasLiveAudio) {
    audioStream.getTracks().forEach((track) => track.stop());

    throw new Error("Windows 系统音频轨道初始化后已结束。");
  }

  return audioStream;
}

/**
 * Safely stop all tracks in a MediaStream.
 */
export function stopMediaStream(
  stream: MediaStream | null | undefined,
): void {
  if (!stream) return;

  for (const track of stream.getTracks()) {
    try {
      track.stop();
    } catch {
      // Best-effort cleanup.
    }
  }
}