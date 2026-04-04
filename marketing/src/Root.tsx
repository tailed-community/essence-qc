import { Composition } from "remotion";
import { PromoVideo } from "./PromoVideo";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="PromoVideo"
        component={PromoVideo}
        durationInFrames={520}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="PromoVideoWide"
        component={PromoVideo}
        durationInFrames={520}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{ wide: true }}
      />
    </>
  );
};
