import { Composition } from "remotion";
import { AgendaViral } from "./compositions/AgendaViral";
import agenda from "../public/cache/agenda.cached.json";

export const Root: React.FC = () => {
  return (
    <Composition
      id="agenda-hoje"
      component={AgendaViral}
      durationInFrames={960} // 16s
      fps={60}
      width={1080}
      height={1920}
      defaultProps={{ agenda }}
    />
  );
};
