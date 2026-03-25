import React, { useEffect, useMemo, useRef } from "react";
import {
  AbsoluteFill,
  Html5Audio,
  Img,
  Sequence,
  OffthreadVideo,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

type AgendaItem = {
  id?: string;
  title?: string;
  channel_title?: string;
  thumb?: string;
  live?: string;
  start?: string;
  tags?: string[];
  profile_picture?: string;
};

type Props = {
  agenda: AgendaItem[];
};


const VIEW_W = 1080;
const VIEW_H = 1920;
const FPS = 60;
const SPRINT_CONFIG = {
      damping: 10,
      stiffness: 200,
      mass: 1.1,
    };

const overlay60: React.CSSProperties = {
  backgroundColor: "rgba(0,0,0,0.6)",
};

const overlay70: React.CSSProperties = {
  backgroundColor: "rgba(0,0,0,0.7)",
};

const textShadowStrong = "0px 8px 24px rgba(0,0,0,0.95)";

const placeholderItem: AgendaItem = {
  id: "placeholder",
  title: "vtubeschedule.nekoweb.org",
  channel_title: "vtubeschedule",
  thumb: "logo.png",
  live: "none",
  start: "",
  tags: [],
  profile_picture: "",
};

const padAgenda = (agenda: AgendaItem[], minLen: number): AgendaItem[] => {
  const out = [...agenda];
  while (out.length < minLen) {
    out.push(placeholderItem);
  }
  return out;
};

const formatTimeBrazil = (iso: string | undefined): string => {
  if (!iso) {
    return "";
  }

  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(d);
};

const getThumbSrc = (item: AgendaItem): string => {
  const thumb = item.thumb || "logo.png";
  return staticFile(thumb);
};

const makeCardShadow = (progress: number): string => {
  const blur = interpolate(progress, [0, 1], [64, 32]);
  // const y = interpolate(progress, [0, 1], [40, 22]);
  const alpha = interpolate(progress, [0, 1], [0.55, 0.38]);

  return `0px 0px ${blur}px rgba(256,256,256,0.55)`;
};

const useEnterExitProgress = (
  localFrame: number,
  fps: number,
  enterFrames = 60,
  exitFrames = 60,
  totalFrames = 240
) => {
  const enter = spring({
    fps,
    frame: localFrame - enterFrames,
    config: SPRINT_CONFIG,
  });

  const exitStart = totalFrames - exitFrames;
  const exit = spring({
    fps,
    frame: Math.max(0, localFrame - exitStart),
    config: SPRINT_CONFIG,
    reverse: true,
  });

  const inWindow = localFrame < exitStart;
  const progress = inWindow ? enter : exit;

  return interpolate(progress, [0, 1], [0, 1]);
};

const HookBackground: React.FC = () => {
  return (
    <AbsoluteFill>
      <OffthreadVideo
        src={staticFile("out/test.mp4")}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          filter: "blur(15px)",
        }}
      />
      <AbsoluteFill style={overlay60} />
    </AbsoluteFill>
  );
};

type CardProps = {
  item: AgendaItem;
  frame: number;
  enterFrame: number;
  progress: number;
  maxWidth: number;
};


const LiveCard: React.FC<CardProps> = ({ item, frame, enterFrame, progress, maxWidth }) => {
  const thumbSrc = getThumbSrc(item);

  const scale = interpolate(progress, [0, 1], [1.1, 1.0]);

  const shadow = makeCardShadow(progress);

  const channel = item.channel_title ? `${item.channel_title}` : "";
  const time = formatTimeBrazil(item.start);

  const thumbW = Math.min(maxWidth, 920);
  const thumbH = Math.round(thumbW * (9 / 16));

  const opacity = interpolate(frame - enterFrame, [0, 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const titleY = interpolate(frame - enterFrame, [0, 12], [-20, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const channelRef = useRef(null);

  // Configurações de tamanho da fonte
  const MAX_FONT_SIZE = 120;
  const MIN_FONT_SIZE = 60; // Defina aqui o tamanho mínimo antes de quebrar a linha

  useEffect(() => {
    const el = channelRef.current;
    if (!el) return;

    // 1. Reseta para o tamanho máximo e força a ficar em uma linha para medir
    let currentSize = MAX_FONT_SIZE;
    (el as HTMLElement).style.fontSize = `${currentSize}px`;
    (el as HTMLElement).style.whiteSpace = "nowrap";

    // 2. Enquanto o texto for mais largo que o container E a fonte for maior que o mínimo: diminui a fonte
    while ((el as HTMLElement).scrollWidth > (el as HTMLElement).clientWidth && currentSize > MIN_FONT_SIZE) {
      currentSize -= 2; // Reduz de 2 em 2 pixels para ser rápido e suave
      (el as HTMLElement).style.fontSize = `${currentSize}px`;
    }

    // 3. Se chegou no tamanho mínimo e ainda está vazando, permite a quebra de linha
    if ((el as HTMLElement).scrollWidth > (el as HTMLElement).clientWidth && currentSize <= MIN_FONT_SIZE) {
      (el as HTMLElement).style.whiteSpace = "normal";
      (el as HTMLElement).style.wordWrap = "break-word";
    }
  }, [channel, thumbW]); // Re-executa se o nome do canal ou a largura mudarem

  return (
    <div
      style={{
        position: "relative",
        width: thumbW,
        
        filter: "drop-shadow(0px 0px 0px rgba(0,0,0,0))",
      }}
    >
      <div
        style={{
          position: "absolute",
          bottom: "100%",
          left: 0,
          width: "100%",
          marginBottom: 60,
          textAlign: "center",
          fontFamily: "sans-serif",
          fontWeight: 800,
          color: "#fff",
          textShadow: textShadowStrong,
        }}
      >
        <div
          ref={channelRef}
          style={{
            lineHeight: 1.05,
            width: "100%", // Garante que ele use o espaço do pai para medir corretamente
            margin: "0 auto",
            opacity: opacity,
            transform: `translateY(${titleY}px)`,
          }}
        >
          {channel}
        </div>
      </div>

      <div
        style={{
          width: "100%",
          height: thumbH,
          overflow: "hidden",
          borderRadius: 28,
          opacity: opacity,
          boxShadow: shadow,
          backgroundColor: "#ffffffff",
          transform: `scale(${scale})`,
          transformOrigin: "center center",
        }}
      >
        <Img
          src={thumbSrc}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: opacity,
            display: "block",
          }}
        />
      </div>

      <div
        style={{
          position: "absolute",
          top: "100%",
          left: 0,
          width: "100%",
          marginTop: 60,
          textAlign: "center",
          fontFamily: "sans-serif",
          fontWeight: 800,
          color: "#fff",
          textShadow: textShadowStrong,
        }}
      >
        <div
          style={{
            fontSize: 100,
            lineHeight: 1.05,
            opacity: opacity,
            transform: `translateY(${titleY}px)`,
          }}
        >
          {time}
        </div>
      </div>
    </div>
  );
};

const HighlightsPair: React.FC<{
  topItem: AgendaItem;
  bottomItem: AgendaItem;
  startFrame: number;
}> = ({ topItem, bottomItem, startFrame }) => {
  const frame = useCurrentFrame(); // currentFrame é da sequência, não global
  const { fps } = useVideoConfig();

  const localFrame = frame; // - startFrame;
  const totalFrames = 4 * FPS;

  const bgScale = interpolate(localFrame, [0, totalFrames], [1.12, 1.24], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const enterFrameTop = 0;
  const enterFrameBottom = 60;

  const progressTop = useEnterExitProgress(localFrame, fps, enterFrameTop, 60, totalFrames);
  const progressBottom = useEnterExitProgress(localFrame, fps, enterFrameBottom, 60, totalFrames);

  const topBg = getThumbSrc(topItem);
  const bottomBg = getThumbSrc(bottomItem);

  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: VIEW_W,
          height: VIEW_H / 2,
          overflow: "hidden",
        }}
      >
        <Img
          src={topBg}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            filter: "blur(25px)",
            transform: `scale(${bgScale})`,
          }}
        />
        <AbsoluteFill style={overlay60} />
      </div>

      <div
        style={{
          position: "absolute",
          left: 0,
          top: VIEW_H / 2,
          width: VIEW_W,
          height: VIEW_H / 2,
          overflow: "hidden",
        }}
      >
        <Img
          src={bottomBg}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            filter: "blur(25px)",
            transform: `scale(${bgScale})`,
          }}
        />
        <AbsoluteFill style={overlay60} />
      </div>

      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: VIEW_W,
          height: VIEW_H / 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <LiveCard item={topItem} frame={frame} enterFrame={enterFrameTop} progress={progressTop} maxWidth={900} />
      </div>

      <div
        style={{
          position: "absolute",
          left: 0,
          top: VIEW_H / 2,
          width: VIEW_W,
          height: VIEW_H / 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <LiveCard item={bottomItem} frame={frame} enterFrame={enterFrameBottom} progress={progressBottom} maxWidth={900} />
      </div>
    </AbsoluteFill>
  );
};

const Hook: React.FC<{ item: AgendaItem }> = ({ item }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleOpacity = interpolate(frame, [0, 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const titleY = interpolate(frame, [0, 12], [-20, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const cardProgress = spring({
    fps,
    frame: Math.max(0, frame - 6),
    config: SPRINT_CONFIG,
  });

  const blurPx = interpolate(cardProgress, [0, 1], [15, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const cardProgressClamped = useEnterExitProgress(frame, fps, 0, 60, 120);

  return (
    <AbsoluteFill>
      <HookBackground />

      <div
        style={{
          position: "absolute",
          left: 0,
          top: 120,
          width: VIEW_W,
          display: "flex",
          justifyContent: "center",
          opacity: titleOpacity,
          transform: `translateY(${titleY}px)`,
        }}
      >
        <div
          style={{
            fontFamily: "sans-serif",
            fontWeight: 900,
            fontSize: 120, //@TODO padronizar fontes
            color: "#ffffff",
            textShadow: textShadowStrong,
            WebkitTextStroke: "10px rgba(0,0,0,0.35)",
            letterSpacing: -2,
            textAlign: "center",
          }}
        >
          VTUBERS AO VIVO!
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          left: 0,
          top: 120,
          width: VIEW_W,
          height: VIEW_H,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          filter: `blur(${blurPx}px)`,
        }}
      >
        <LiveCard item={item} frame={frame} enterFrame={0} progress={cardProgressClamped} maxWidth={960} />
      </div>
    </AbsoluteFill>
  );
};

const Cta: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleOpacity = interpolate(frame, [0, 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const titleY = interpolate(frame, [0, 12], [-20, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const progress = spring({
    fps,
    frame: Math.max(0, frame),
    config: SPRINT_CONFIG,
  });

  const progressClamped = interpolate(progress, [0, 1], [0, 1]);

  const scale = interpolate(progressClamped, [0, 1], [1.2, 1.0]);

  return (
    <AbsoluteFill>
      <HookBackground />

      <div
        style={{
          position: "absolute",
          left: 0,
          top: 120,
          width: VIEW_W,
          display: "flex",
          justifyContent: "center",
          opacity: titleOpacity,
          transform: `translateY(${titleY}px)`,
        }}
      >
        <div
          style={{
            fontFamily: "sans-serif",
            fontWeight: 900,
            fontSize: 120,
            color: "#ffffff",
            textShadow: textShadowStrong,
            WebkitTextStroke: "10px rgba(0,0,0,0.35)",
            letterSpacing: -2,
            textAlign: "center",
          }}
        >
          E MUITO MAIS EM
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: VIEW_W,
          height: VIEW_H,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: 980,
            marginTop: 120,
            textAlign: "center",
            fontFamily: "sans-serif",
            fontWeight: 900,
            color: "#ffffff",
            textShadow: textShadowStrong,
          }}
        >
          <div
            style={{
              marginTop: 36,
              transform: `scale(${scale})`,
              transformOrigin: "center center",
            }}
          >
            <div
              style={{
                // width: 520,
                margin: "0 auto",
                // borderRadius: 32,
                // overflow: "hidden",
                // boxShadow: shadow,
                // backgroundColor: "rgba(0,0,0,0.2)",
              }}
            >
              <Img
                src={staticFile("logo.png")}
                style={{
                  width: "100%",
                  height: "100%",
                  display: "block",
                  objectFit: "contain",
                  padding: 28,
                }}
              />
            </div>
          </div>

          <div
            style={{
              marginTop: 40,
              fontSize: 80,
              lineHeight: 1.05,
              // opacity: 0.98,
              WebkitTextStroke: "8px rgba(0,0,0,0.25)",
            }}
          >
            (Links na BIO)
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const AgendaViral: React.FC<Props> = ({ agenda }) => {
  const frame = useCurrentFrame();

  const agendaSafe = useMemo(() => {
    const base = Array.isArray(agenda) ? agenda : [];
    return padAgenda(base, 7);
  }, [agenda]);

  const starts = [0, 115, 355, 595, 835, 960];

  const hookItem = agendaSafe[0];

  const highlights = agendaSafe.slice(1, 7);
  const pairs = [
    { top: highlights[0], bottom: highlights[1], start: starts[1] },
    { top: highlights[2], bottom: highlights[3], start: starts[2] },
    { top: highlights[4], bottom: highlights[5], start: starts[3] },
  ];

  const audioVol = interpolate(frame, [0, 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <Html5Audio src={staticFile("Eyes On You - Network 415.mp3")} volume={1} />

      <Sequence from={starts[0]} durationInFrames={starts[1] - starts[0]}>
        <Hook item={hookItem} />
      </Sequence>

      {pairs.map((p) => {
        return (
          <Sequence key={p.start} from={p.start} durationInFrames={starts[2] - starts[1]}>
            <HighlightsPair topItem={p.top} bottomItem={p.bottom} startFrame={p.start} />
          </Sequence>
        );
      })}

      <Sequence from={starts[4]} durationInFrames={starts[5] - starts[4]}>
        <Cta />
      </Sequence>
    </AbsoluteFill>
  );
};
