import { spawn } from "child_process";
import fs from "fs/promises";
import { accessSync } from "fs";
import path from "path";
import os from "os";

const FFMPEG = process.env.FFMPEG_PATH || "ffmpeg";
const WIDTH = 1080;
const HEIGHT = 1920;
const FPS = 30;
const SECONDS_PER_SLIDE = 1.6;

const FONT =
  process.env.CLIP_FONT_PATH ||
  "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf";

function run(cmd: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
    let err = "";
    child.stderr.on("data", (d) => {
      err += d.toString();
    });
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(err.slice(-800) || `ffmpeg exit ${code}`));
    });
  });
}

async function downloadToFile(url: string, dest: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download failed ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await fs.writeFile(dest, buf);
}

function pickMusic(): string {
  const dir = path.join(process.cwd(), "assets/clips/music");
  const preferred = [
    "uplifting-hope.m4a",
    "acoustic-jazz.m4a",
    "world-chill.m4a",
    "smooth-rb.m4a",
    "tech-house-vibes.m4a",
  ];
  const existing = preferred.filter((name) => {
    try {
      accessSync(path.join(dir, name));
      return true;
    } catch {
      return false;
    }
  });
  const pool = existing.length ? existing : preferred;
  const name = pool[Math.floor(Math.random() * pool.length)];
  return path.join(dir, name);
}

function escapeAss(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/\{/g, "\\{")
    .replace(/\}/g, "\\}")
    .replace(/\n/g, "\\N");
}

/** Karaoke tags → typewriter reveal (~cs centiseconds per char). */
function typewriterAss(text: string, csPerChar = 7): string {
  const chars = [...text];
  return chars.map((ch) => `{\\k${csPerChar}}${escapeAss(ch)}`).join("");
}

function wrapTitle(title: string, maxLen = 22): string {
  const t = title.trim().replace(/\s+/g, " ");
  if (t.length <= maxLen) return t;
  const cut = t.slice(0, maxLen);
  const sp = cut.lastIndexOf(" ");
  return `${(sp > 10 ? cut.slice(0, sp) : cut).trim()}…`;
}

function formatAssTime(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const whole = Math.floor(s);
  const cs = Math.min(99, Math.round((s - whole) * 100));
  return `${h}:${String(m).padStart(2, "0")}:${String(whole).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
}

function buildAss(opts: {
  title: string;
  priceLabel: string;
  durationSec: number;
}): string {
  const title = wrapTitle(opts.title, 26);
  const price = opts.priceLabel.trim();
  const end = formatAssTime(Math.max(opts.durationSec, 2));
  const titleLine = typewriterAss(title, 6);
  const priceLine = price ? typewriterAss(price, 8) : "";

  // PlayRes matches 1080x1920. Alignment 2 = bottom-center.
  return `[Script Info]
ScriptType: v4.00+
PlayResX: ${WIDTH}
PlayResY: ${HEIGHT}
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Title,DejaVu Sans,68,&H00FFFFFF,&HFF000000,&H00111111,&H90000000,-1,0,0,0,100,100,0,0,1,4,0,2,48,48,320,1
Style: Price,DejaVu Sans,52,&H00FFFFFF,&HFF000000,&H00111111,&H90000000,-1,0,0,0,100,100,0,0,1,3,0,2,48,48,220,1
Style: Brand,DejaVu Sans,30,&H00EEEEEE,&HFF000000,&H00111111,&H80000000,0,0,0,0,100,100,0,0,1,2,0,2,48,48,90,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:00.25,${end},Title,,0,0,0,,${titleLine}
${priceLine ? `Dialogue: 0,0:00:01.10,${end},Price,,0,0,0,,${priceLine}` : ""}
Dialogue: 0,0:00:01.80,${end},Brand,,0,0,0,,Boro · Боровичи
`;
}

export type ClipRenderInput = {
  imageUrls: string[];
  title: string;
  priceLabel: string;
};

/**
 * Build a vertical 9:16 Ken Burns slideshow MP4 + typewriter title/price + music.
 */
export async function renderPhotoClip(
  input: ClipRenderInput | string[]
): Promise<Buffer> {
  // Back-compat if called with bare urls
  const imageUrls = Array.isArray(input) ? input : input.imageUrls;
  const title = Array.isArray(input) ? "Boro" : input.title;
  const priceLabel = Array.isArray(input) ? "" : input.priceLabel;

  if (imageUrls.length < 2) {
    throw new Error("Нужно минимум 2 фото для клипа");
  }

  const work = await fs.mkdtemp(path.join(os.tmpdir(), "boro-clip-"));
  const slides = imageUrls.slice(0, 7);
  const durationSec = slides.length * SECONDS_PER_SLIDE;

  try {
    const segPaths: string[] = [];

    for (let i = 0; i < slides.length; i++) {
      const imgPath = path.join(work, `img-${i}.jpg`);
      await downloadToFile(slides[i], imgPath);

      const seg = path.join(work, `seg-${i}.mp4`);
      const frames = Math.round(SECONDS_PER_SLIDE * FPS);
      const zoomExpr =
        i % 2 === 0
          ? "min(zoom+0.0012,1.12)"
          : "if(eq(on,1),1.12,max(zoom-0.0012,1.0))";

      await run(FFMPEG, [
        "-y",
        "-loop",
        "1",
        "-i",
        imgPath,
        "-vf",
        `scale=${WIDTH}:${HEIGHT}:force_original_aspect_ratio=increase,crop=${WIDTH}:${HEIGHT},zoompan=z='${zoomExpr}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=${WIDTH}x${HEIGHT}:fps=${FPS}`,
        "-t",
        String(SECONDS_PER_SLIDE),
        "-an",
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-preset",
        "veryfast",
        "-crf",
        "23",
        seg,
      ]);
      segPaths.push(seg);
    }

    const listFile = path.join(work, "list.txt");
    await fs.writeFile(
      listFile,
      segPaths.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join("\n")
    );

    const silent = path.join(work, "silent.mp4");
    await run(FFMPEG, [
      "-y",
      "-f",
      "concat",
      "-safe",
      "0",
      "-i",
      listFile,
      "-c",
      "copy",
      silent,
    ]);

    const assPath = path.join(work, "titles.ass");
    await fs.writeFile(
      assPath,
      buildAss({ title, priceLabel, durationSec }),
      "utf8"
    );

    const music = pickMusic();
    const out = path.join(work, "final.mp4");
    // Re-encode video to burn-in bottom fade + ASS typewriter text
    const assEsc = assPath.replace(/\\/g, "/").replace(/:/g, "\\:");
    const vf = [
      `drawbox=x=0:y=ih-460:w=iw:h=460:color=black@0.48:t=fill`,
      `ass='${assEsc}'`,
    ].join(",");

    void FONT; // available via fonts.conf / DejaVu name in ASS

    await run(FFMPEG, [
      "-y",
      "-i",
      silent,
      "-i",
      music,
      "-filter_complex",
      `[0:v]${vf}[v];[1:a]volume=0.35,afade=t=in:st=0:d=0.8[a]`,
      "-map",
      "[v]",
      "-map",
      "[a]",
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-preset",
      "veryfast",
      "-crf",
      "23",
      "-c:a",
      "aac",
      "-b:a",
      "128k",
      "-shortest",
      "-movflags",
      "+faststart",
      out,
    ]);

    return await fs.readFile(out);
  } finally {
    await fs.rm(work, { recursive: true, force: true }).catch(() => undefined);
  }
}
