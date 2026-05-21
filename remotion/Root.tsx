import { Composition } from "remotion";
import { AgendaViralRapida } from "./compositions/AgendaViralRapida";
import agenda from "../public/cache/agenda.cached.json";

export const Root: React.FC = () => {
  return (
    <Composition
      id="agenda-hoje"
      component={AgendaViralRapida}
      durationInFrames={475} // 7.916s
      fps={60}
      width={1080}
      height={1920}
      defaultProps={{ agenda }}
    />
  );
};
