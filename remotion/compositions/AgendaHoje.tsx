import { AbsoluteFill, Img, interpolate, useCurrentFrame } from "remotion";

export const AgendaHoje = ({ agenda }: any) => {
  const frame = useCurrentFrame();

  const x = interpolate(frame, [0, 300], [0, -600]);
  const y = interpolate(frame, [0, 300], [0, -900]);

  return (
    <AbsoluteFill style={{ backgroundColor: "#0B0B0F" }}>
      <h1 style={{
        position: "absolute",
        top: 100,
        width: "100%",
        textAlign: "center",
        fontSize: 96,
        color: "white"
      }}>
        HOJE AO VIVO
      </h1>

      <div style={{
        position: "absolute",
        top: 300,
        left: 0,
        transform: `translate(${x}px, ${y}px)`
      }}>
        {agenda.items.map((item: any, i: number) => (
          <Img
            key={i}
            src={item.thumbnail}
            style={{
              width: 340,
              height: 260,
              marginBottom: 16,
              borderRadius: 12
            }}
          />
        ))}
      </div>
    </AbsoluteFill>
  );
};
