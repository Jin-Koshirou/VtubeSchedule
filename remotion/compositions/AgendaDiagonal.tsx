import React, { useMemo } from "react";
import {
  AbsoluteFill,
  Img,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

const FONT_SIZE = 36;
const MARGIN = 8;

const VIEW_W = 1080;
const VIEW_H = 1920;

const ASPECT_RATIO = (9/16);
const ITEMS_PER_COL = 3;
const TILE_COLS = 9;
const TILE_ROWS = 9;
const ITEM_OFFSET = 1;

const ZOOM_FACTOR = 2;
const ITEM_W = VIEW_W / ZOOM_FACTOR;
const ITEM_H = (ITEM_W * ASPECT_RATIO) + (8 * MARGIN) + (2 * FONT_SIZE);
const GAP = 16;

const COL_W = ITEM_W + GAP;
const COL_H = ITEMS_PER_COL * ITEM_H + (ITEMS_PER_COL - 1) * GAP;
const COL_H_OFFSET = (ITEM_H + GAP) / 2

const TILE_W = COL_W * TILE_COLS;
const TILE_H = COL_H * TILE_ROWS / ITEMS_PER_COL;

const CENTER_X = (TILE_W - VIEW_W) / 2;
const CENTER_Y = (TILE_H - VIEW_H) / 2;

const BUFFER = 200; //px

// Estilos Inline

const bodyStyle: React.CSSProperties = {
  backgroundColor: "#1c1c1c",
  fontFamily: "Arial, sans-serif",
};

const liveStyle: React.CSSProperties = {
  position: "absolute",
  top: 100,
  width: "100%",
  zIndex: 10
};

const h2Style: React.CSSProperties = {
  textAlign: "center",
  fontSize: 72,
  padding: "10px",
  color: "#f2f2f2",
  backgroundColor: "#444",
  zIndex: 10
};

const footerStyle: React.CSSProperties = {
  position: "absolute",
  bottom: 0,
  left: 0,
  right: 0,
  width: 'fit-content',
  margin: '0 auto',
  padding: '0 16px',
  zIndex: 10,
  fontSize: `48px`,
  textAlign: 'center',
  fontWeight: 'bold',
  color: '#f2f2f2',
  backgroundColor: '#444',
  borderTopLeftRadius: '16px',
  borderTopRightRadius: '16px',
};

const logoStyle: React.CSSProperties = {
  position: 'absolute',
  bottom: 0,
  right: 0,
  width: '320px',
  height: '180px',
  opacity: 0.6,
  margin: '24px 0px',
  zIndex: 10
}

const cardStyle: React.CSSProperties = {
  backgroundColor: '#2a2a2a',
  padding: '10px',
  borderRadius: '8px',
  position: 'relative',
  opacity: 1,
  transform: 'none',
  // transition: 'opacity .36s ease, transform .36s ease',
  // cursor: 'default',
  border: '2px solid transparent',
  display: 'flex',
  flexDirection: 'column',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  margin: `${MARGIN}px 0`,
  fontSize: `${FONT_SIZE}px`, // Ajustado para harmonia visual
  color: '#f2f2f2',
};

const thumbContainerStyle: React.CSSProperties = {
  position: 'relative',
  width: '100%',
  paddingTop: '56.25%', // Proporção 16:9
  overflow: 'hidden',
  borderRadius: '6px',
  margin: `${MARGIN}px 0`,
  backgroundColor: '#000',
};

const imgStyle: React.CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  display: 'block',
};

const titleStyle: React.CSSProperties = {
  display: '-webkit-box',
  WebkitLineClamp: 1,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  margin: `${MARGIN}px 0`,
  fontSize: `${FONT_SIZE}px`,
  fontWeight: 'bold',
  color: '#aaa',
};


export const AgendaDiagonal = ({ agenda }: any) => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();

  const tiles = useMemo(() => {
    const out = [];
    for (let r = 0; r < TILE_ROWS; r++) {
        for (let c = 0; c < TILE_COLS; c++) {
        out.push({ r, c });
        }
    }
    return out;
    }, []);

  const t = frame / fps;

  const speedX = COL_W * (ITEMS_PER_COL - 1) * fps / durationInFrames;  // px/s
  const speedY = -speedX * ASPECT_RATIO; // px/s

  const offsetX = (CENTER_X + t * speedX); // % (TILE_W - VIEW_W);
  const offsetY = (CENTER_Y + t * speedY); // % (TILE_H - VIEW_H);

  // agrupar itens em colunas de 3
  const columns: any[][] = [];
  for (let i = 0; i < agenda.length; i += ITEMS_PER_COL) {
    columns.push(agenda.slice(i, i + ITEMS_PER_COL));
  }

  const containerBaseX = ((TILE_W - COL_W) / 2) - ((columns.length - ITEM_OFFSET) * COL_W);
  const containerBaseY = (TILE_H - (ITEMS_PER_COL + ITEM_OFFSET) * COL_H) / 2;


  return (
    <AbsoluteFill style={bodyStyle}>
      {/* Título fixo */}
      <div
        style={liveStyle}
      >
        <h2 style={h2Style}>
          🔴 HOJE AO VIVO
        </h2>
      </div>

      {/* Footer */}
      <div style={footerStyle}>
        <span>vtubeschedule.nekoweb.org</span>
      </div>
      <Img
        key={`img-logo`}
        src={staticFile("logo.png")}
        alt="Logo"
        style={logoStyle}
      />


      {/* Viewport */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: VIEW_W,
          height: VIEW_H,
          overflow: "hidden"
        }}
      >
        {/* Tile */}
        <div
          style={{
            position: "absolute",
            top: containerBaseY,
            left: containerBaseX,
            width: TILE_W,
            height: TILE_H,
            transform: `translate(${-offsetX}px, ${-offsetY}px)`
          }}
        >
          {tiles.map(({ r, c }) => {
            // Posição relativa dentro do container
            const tileLeft = c * (ITEM_W + GAP);
            const tileTop = r * (ITEM_H + 2 * GAP) + COL_H_OFFSET * (c % 2);

            // Posição absoluta em relação ao viewport (0,0)
            const absoluteX = containerBaseX + tileLeft - offsetX;
            const absoluteY = containerBaseY + tileTop - offsetY;

            // Verificação de visibilidade
            const isVisible = 
              absoluteX + ITEM_W > -BUFFER && 
              absoluteX < VIEW_W + BUFFER &&
              absoluteY + ITEM_H > -BUFFER && 
              absoluteY < VIEW_H + BUFFER;

            // Se não estiver visível, não renderiza nada para este tile
            if (!isVisible) {
              return null;
            }

            const colIndex = c % columns.length;
            const rowOffset = r % ITEMS_PER_COL;
            const items = columns[colIndex];
            const itemData = items[rowOffset];

            let formattedTime = "";
            if (itemData.start) {
              formattedTime = new Intl.DateTimeFormat("pt-BR", {
                hour: "2-digit",
                minute: "2-digit"
              }).format(new Date(itemData.start));
            }

            return (
              <div
                key={`${r}-${c}`}
                style={{
                  position: "absolute",
                  left: tileLeft,
                  top: tileTop,
                  width: ITEM_W
                }}
              >
                  {<div 
                    style={cardStyle} 
                    title={itemData.title}
                  >
                    {/* Header */}
                    <div style={headerStyle}>
                      <span style={{ color: '#f2f2f2' }}>{formattedTime}</span>
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginLeft: '10px' }}>
                        {itemData.channel_title}
                      </span>
                    </div>

                    {/* Thumb Container */}
                    <div style={thumbContainerStyle}>
                      <Img
                        key={`img-${r}-${c}`}
                        src={staticFile(itemData.thumb)}
                        alt={itemData.title}
                        style={imgStyle}
                      />
                    </div>

                    {/* Title */}
                    <strong style={titleStyle}>
                      {itemData.title}
                    </strong>
                  </div>}
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
