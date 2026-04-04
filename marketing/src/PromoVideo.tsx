import React from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  spring,
  Sequence,
  staticFile,
  Img,
} from "remotion";

const BLUE = "#003DA5";
const DARK_BLUE = "#001f5c";
const WHITE = "#FFFFFF";
const FONT = "system-ui, -apple-system, sans-serif";

/* ─── Helpers ─────────────────────────────────────── */

const FadeSlideIn: React.FC<{
  children: React.ReactNode;
  delay?: number;
  direction?: "up" | "down" | "left" | "right";
  distance?: number;
}> = ({ children, delay = 0, direction = "up", distance = 60 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({
    frame: frame - delay,
    fps,
    config: { damping: 15, mass: 0.8 },
  });
  const translateMap = {
    up: `translateY(${interpolate(progress, [0, 1], [distance, 0])}px)`,
    down: `translateY(${interpolate(progress, [0, 1], [-distance, 0])}px)`,
    left: `translateX(${interpolate(progress, [0, 1], [distance, 0])}px)`,
    right: `translateX(${interpolate(progress, [0, 1], [-distance, 0])}px)`,
  };
  return (
    <div
      style={{
        opacity: interpolate(progress, [0, 1], [0, 1]),
        transform: translateMap[direction],
      }}
    >
      {children}
    </div>
  );
};

/* ═══════════════════════════════════════════════════
   CHAPTER 1 — HOOK  (frames 0-120)
   ═══════════════════════════════════════════════════ */

const SceneHook: React.FC<{ wide?: boolean }> = ({ wide = false }) => {
  const frame = useCurrentFrame();
  const titleSize = wide ? 80 : 100;
  const pulse = interpolate(Math.sin(frame * 0.1), [-1, 1], [0.98, 1.02]);

  return (
    <AbsoluteFill style={{ background: DARK_BLUE }}>
      {/* Background WebP - skipping the first 30 frames to bypass loading */}
      <div style={{ position: "absolute", width: "100%", height: "100%", opacity: 0.6, transform: "scale(1.1) rotate(2deg) blur(5px)" }}>
        <Img 
          src={staticFile("recordings/search_yul_mobile_1775236775190.webp")} 
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </div>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0, 31, 92, 0.7)" }} />

      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <FadeSlideIn delay={10}>
          <div style={{ fontSize: titleSize, fontWeight: 900, color: WHITE, fontFamily: FONT, textAlign: "center", lineHeight: 1.1, textShadow: "0 10px 30px rgba(0,0,0,0.5)", transform: `scale(${pulse})` }}>
            Trouvez le<br />meilleur prix<br />d'essence
          </div>
        </FadeSlideIn>
        <FadeSlideIn delay={30}>
          <div style={{ fontSize: wide ? 36 : 48, color: "#10b981", fontWeight: 800, fontFamily: FONT, marginTop: 20 }}>
            En Quelques Secondes ⚡
          </div>
        </FadeSlideIn>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* ═══════════════════════════════════════════════════
   CHAPTER 2 — THE JOURNEY  (frames 120-270)
   ═══════════════════════════════════════════════════ */

const SceneJourney: React.FC<{ wide?: boolean }> = ({ wide = false }) => {
  const frame = useCurrentFrame();
  // Animate the gif coming in
  const progress = spring({ frame, fps: 30, config: { damping: 14 } });
  const scale = interpolate(progress, [0, 1], [1.2, 1]);
  
  return (
    <AbsoluteFill style={{ background: "#111" }}>
      <div style={{ position: "absolute", inset: 0, transform: `scale(${scale})` }}>
        <Img 
          src={staticFile("recordings/search_yul_demo_1775236491800.webp")} 
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </div>
      
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: wide ? "30px 60px" : "40px 60px", background: "linear-gradient(transparent, rgba(0,0,0,0.9))" }}>
        <FadeSlideIn delay={20} direction="up">
          <div style={{ fontSize: wide ? 48 : 64, fontWeight: 800, color: WHITE, fontFamily: FONT }}>
            Trajets Intelligents 🗺️
          </div>
          <div style={{ fontSize: wide ? 28 : 36, color: "rgba(255,255,255,0.8)", fontFamily: FONT, marginTop: 10 }}>
            Découvrez la station la moins chère sur votre route.
          </div>
        </FadeSlideIn>
      </div>
    </AbsoluteFill>
  );
};

/* ═══════════════════════════════════════════════════
   CHAPTER 3 — SECRET WEAPON  (frames 270-420)
   ═══════════════════════════════════════════════════ */

const SceneSecretWeapon: React.FC<{ wide?: boolean }> = ({ wide = false }) => {
  const frame = useCurrentFrame();
  const panY = interpolate(frame, [0, 150], [0, -50], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: DARK_BLUE }}>
      <div style={{ position: "absolute", inset: 0, transform: `translateY(${panY}px)` }}>
        <Img 
          src={staticFile("recordings/essence_qc_tour_1775232023594.webp")} 
          style={{ width: "100%", height: "100%", objectFit: "cover", filter: "saturate(1.2)" }}
        />
      </div>

      <div style={{ position: "absolute", top: wide ? 40 : 60, left: wide ? 60 : 40, right: wide ? 60 : 40 }}>
        <FadeSlideIn delay={15} direction="down">
          <div style={{ background: "#e31837", padding: "20px 40px", borderRadius: 24, boxShadow: "0 20px 40px rgba(227, 24, 55, 0.4)", display: "flex", alignItems: "center", gap: 20 }}>
            <span style={{ fontSize: wide ? 48 : 60, fontWeight: 900, color: WHITE, fontFamily: FONT }}>COSTCO</span>
            <span style={{ fontSize: wide ? 24 : 32, color: "rgba(255,255,255,0.9)", fontFamily: FONT }}>Voir les prix réservés aux membres</span>
          </div>
        </FadeSlideIn>
      </div>
    </AbsoluteFill>
  );
};

/* ═══════════════════════════════════════════════════
   CHAPTER 4 — RESOLUTION  (frames 420-520)
   ═══════════════════════════════════════════════════ */

const SceneResolution: React.FC<{ wide?: boolean }> = ({ wide = false }) => {
  const frame = useCurrentFrame();
  const titleSize = wide ? 100 : 130;
  const pulse = interpolate(Math.sin(frame * 0.12), [-1, 1], [0.97, 1.03]);

  return (
    <AbsoluteFill style={{ background: `linear-gradient(135deg, ${DARK_BLUE}, ${BLUE})`, justifyContent: "center", alignItems: "center", padding: 60 }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: wide ? 30 : 40, transform: `scale(${pulse})` }}>
        <FadeSlideIn delay={0}>
          <div style={{ fontSize: titleSize, fontWeight: 900, color: WHITE, fontFamily: FONT, letterSpacing: -3 }}>
            100% Gratuit
          </div>
        </FadeSlideIn>
        <FadeSlideIn delay={10}>
          <div style={{ fontSize: wide ? 40 : 54, color: "rgba(255,255,255,0.9)", fontFamily: FONT, textAlign: "center", fontWeight: 700 }}>
            Aucune publicité. Aucun compte.
          </div>
        </FadeSlideIn>
        <FadeSlideIn delay={20}>
          <div style={{ marginTop: 30, background: "rgba(255,255,255,0.2)", borderRadius: 30, padding: wide ? "20px 50px" : "24px 60px", fontSize: wide ? 36 : 48, color: WHITE, fontFamily: FONT, fontWeight: 800, border: "2px solid rgba(255,255,255,0.4)" }}>
            🌐 essence-qc.app
          </div>
        </FadeSlideIn>
      </div>
    </AbsoluteFill>
  );
};

/* ═══════════════════════════════════════════════════
   MAIN COMPOSITION
   ═══════════════════════════════════════════════════ */

export const PromoVideo: React.FC<{ wide?: boolean }> = ({ wide = false }) => {
  return (
    <AbsoluteFill style={{ background: DARK_BLUE }}>
      <Sequence from={0} durationInFrames={120}>
        <SceneHook wide={wide} />
      </Sequence>

      <Sequence from={120} durationInFrames={150}>
        <SceneJourney wide={wide} />
      </Sequence>

      <Sequence from={270} durationInFrames={150}>
        <SceneSecretWeapon wide={wide} />
      </Sequence>

      <Sequence from={420} durationInFrames={100}>
        <SceneResolution wide={wide} />
      </Sequence>
    </AbsoluteFill>
  );
};
