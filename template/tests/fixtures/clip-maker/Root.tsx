import { Audio } from "@remotion/media";
import { AbsoluteFill, Composition, staticFile, useCurrentFrame } from "remotion";

const TestClip: React.FC<{ readonly seconds: number }> = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: "#2f7a5a", justifyContent: "center", alignItems: "center" }}>
      <div style={{ color: "white", fontSize: 180, fontFamily: "sans-serif" }}>{(frame / 30).toFixed(1)}</div>
      <Audio src={staticFile("voice.wav")} />
    </AbsoluteFill>
  );
};

export const ClipMakerRoot: React.FC = () => (
  <Composition
    id="TestClip"
    component={TestClip}
    fps={30}
    width={1080}
    height={1920}
    durationInFrames={30}
    defaultProps={{ seconds: 1 }}
    calculateMetadata={({ props }) => ({ durationInFrames: Math.ceil(props.seconds * 30) })}
  />
);
