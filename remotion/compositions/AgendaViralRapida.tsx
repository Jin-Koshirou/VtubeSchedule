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
  initialOpacity?: number;
};


const LiveCard: React.FC<CardProps> = ({ item, frame, enterFrame, progress, maxWidth, initialOpacity = 0 }) => {
  const thumbSrc = getThumbSrc(item);

  const scale = interpolate(progress, [0, 1], [1.1, 1.0]);

  const shadow = makeCardShadow(progress);

  const channel = item.channel_title ? `${item.channel_title}` : "";
  const time = formatTimeBrazil(item.start);

  const thumbW = Math.min(maxWidth, 920);
  const thumbH = Math.round(thumbW * (9 / 16));

  const opacity = interpolate(frame - enterFrame, [0, 12], [initialOpacity, 1], {
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
  topItem1: AgendaItem;
  bottomItem1: AgendaItem;
  topItem2: AgendaItem;
  bottomItem2: AgendaItem;
  startFrame: number;
}> = ({ topItem1, topItem2, bottomItem1, bottomItem2, startFrame }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const localFrame = frame; // - startFrame se for usar fora de um Sequence
  
  const totalFrames = 5 * fps; 

  // Definição dos tempos (em frames)
  const enterTop1 = 0;           // Top 1 entra no início (0s)
  const endTop1 = 2 * fps;       // Top 1 sai e Top 2 entra (2s)
  const enterTop2 = 2 * fps;     // Top 2 entra (2s)
  const endTop2 = totalFrames;   // Top 2 sai no final (5s)

  const enterBottom1 = 1 * fps;  // Bottom 1 entra (1s)
  const endBottom1 = 3 * fps;    // Bottom 1 sai e Bottom 2 entra (3s)
  const enterBottom2 = 3 * fps;  // Bottom 2 entra (3s)
  const endBottom2 = totalFrames;// Bottom 2 sai no final (5s)

  // ==========================================
  // LÓGICA DO TOPO
  // ==========================================
  const isTop1 = localFrame < endTop1;
  const currentTopItem = isTop1 ? topItem1 : topItem2;
  const currentEnterTop = isTop1 ? enterTop1 : enterTop2;

  // Calculamos ambos os progressos sempre (Remotion não permite Hooks em condicionais, 
  // mas spring é uma função pura. Fazer assim é a forma mais segura).
  const progressTop1 = useEnterExitProgress(localFrame, fps, enterTop1, 60, endTop1);
  const progressTop2 = useEnterExitProgress(localFrame, fps, enterTop2, 60, endTop2);
  const progressTop = isTop1 ? progressTop1 : progressTop2;

  const topBg = getThumbSrc(currentTopItem);
  
  // O scale do background zera para iniciar o "zoom" novamente a cada novo item
  const topBgScale = isTop1
    ? interpolate(localFrame, [enterTop1, endTop1], [1.12, 1.24], { extrapolateRight: "clamp" })
    : interpolate(localFrame, [enterTop2, endTop2], [1.12, 1.24], { extrapolateRight: "clamp" });

  // ==========================================
  // LÓGICA DO FUNDO
  // ==========================================
  const isBottom1 = localFrame < endBottom1;
  const currentBottomItem = isBottom1 ? bottomItem1 : bottomItem2;
  const currentEnterBottom = isBottom1 ? enterBottom1 : enterBottom2;

  const progressBottom1 = useEnterExitProgress(localFrame, fps, enterBottom1, 60, endBottom1);
  const progressBottom2 = useEnterExitProgress(localFrame, fps, enterBottom2, 60, endBottom2);
  const progressBottom = isBottom1 ? progressBottom1 : progressBottom2;

  const bottomBg = getThumbSrc(currentBottomItem);
  
  const bottomBgScale = isBottom1
    ? interpolate(localFrame, [enterBottom1, endBottom1], [1.12, 1.24], { extrapolateRight: "clamp" })
    : interpolate(localFrame, [enterBottom2, endBottom2], [1.12, 1.24], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill>
      {/* Background Metade Superior */}
      <div
        style={{
          position: "absolute", left: 0, top: 0,
          width: VIEW_W, height: VIEW_H / 2, overflow: "hidden",
        }}
      >
        <Img
          src={topBg}
          style={{
            width: "100%", height: "100%", objectFit: "cover",
            filter: "blur(25px)", transform: `scale(${topBgScale})`,
          }}
        />
        <AbsoluteFill style={overlay60} />
      </div>

      {/* Background Metade Inferior */}
      <div
        style={{
          position: "absolute", left: 0, top: VIEW_H / 2,
          width: VIEW_W, height: VIEW_H / 2, overflow: "hidden",
        }}
      >
        <Img
          src={bottomBg}
          style={{
            width: "100%", height: "100%", objectFit: "cover",
            filter: "blur(25px)", transform: `scale(${bottomBgScale})`,
          }}
        />
        <AbsoluteFill style={overlay60} />
      </div>

      {/* Conteúdo Topo (Card) */}
      <div
        style={{
          position: "absolute", left: 0, top: 0,
          width: VIEW_W, height: VIEW_H / 2,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        <LiveCard
          item={currentTopItem}
          frame={frame}
          enterFrame={currentEnterTop}
          progress={progressTop}
          maxWidth={900}
        />
      </div>

      {/* Conteúdo Base (Card) */}
      <div
        style={{
          position: "absolute", left: 0, top: VIEW_H / 2,
          width: VIEW_W, height: VIEW_H / 2,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        <LiveCard
          item={currentBottomItem}
          frame={frame}
          enterFrame={currentEnterBottom}
          progress={progressBottom}
          maxWidth={900}
        />
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
        <LiveCard item={item} frame={frame} enterFrame={0} progress={cardProgressClamped} maxWidth={960} initialOpacity={1}/>
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

export const AgendaViralRapida: React.FC<Props> = ({ agenda }) => {
  const frame = useCurrentFrame();

  const agendaSafe = useMemo(() => {
    const base = Array.isArray(agenda) ? agenda : [];
    return padAgenda(base, 7);
  }, [agenda]);

  const starts = [0, 115, 415, 475, 835, 960];

  const hookItem = agendaSafe[0];

  const highlights = agendaSafe.slice(1, 7);

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


      <Sequence key={starts[1]} from={starts[1]} durationInFrames={starts[2] - starts[1]}>
        <HighlightsPair topItem1={highlights[0]} bottomItem1={highlights[1]} topItem2={highlights[2]} bottomItem2={highlights[3]} startFrame={starts[1]} />
      </Sequence>

      <Sequence from={starts[2]} durationInFrames={Math.floor(starts[3] - starts[2])}>
        <Cta />
      </Sequence>
    </AbsoluteFill>
  );
};
