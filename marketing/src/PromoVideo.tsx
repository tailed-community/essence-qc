import React from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  spring,
  Sequence,
  Img,
  staticFile,
} from "remotion";

const BLUE = "#003DA5";
const WHITE = "#FFFFFF";
const LIGHT_BLUE = "#E8F0FE";

const FleurDeLis: React.FC<{ size?: number; color?: string }> = ({
  size = 60,
  color = WHITE,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 100 100"
    fill={color}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M50 5c-3 10-10 18-10 28 0 8 4 14 10 17-6-3-10-9-10-17 0-10 7-18 10-28zm0 0c3 10 10 18 10 28 0 8-4 14-10 17 6-3 10-9 10-17 0-10-7-18-10-28z" />
    <path d="M50 50c-10 3-18 10-28 10-8 0-14-4-17-10 3 6 9 10 17 10 10 0 18-7 28-10zm0 0c10 3 18 10 28 10 8 0 14-4 17-10-3 6-9 10-17 10-10 0-18-7-28-10z" />
    <path d="M50 50c-3 10-10 18-10 28 0 8 4 14 10 17-6-3-10-9-10-17 0-10 7-18 10-28zm0 0c3 10 10 18 10 28 0 8-4 14-10 17 6-3 10-9 10-17 0-10-7-18-10-28z" />
    <circle cx="50" cy="50" r="6" />
  </svg>
);

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

const SceneIntro: React.FC<{ wide?: boolean }> = ({ wide }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoScale = spring({ frame, fps, config: { damping: 12 } });
  const bgOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(135deg, ${BLUE} 0%, #001f5c 100%)`,
        justifyContent: "center",
        alignItems: "center",
        opacity: bgOpacity,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: wide ? 20 : 30,
          transform: `scale(${logoScale})`,
        }}
      >
        <div
          style={{
            width: wide ? 120 : 180,
            height: wide ? 120 : 180,
            borderRadius: 32,
            background: BLUE,
            border: `4px solid rgba(255,255,255,0.3)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
            overflow: "hidden",
          }}
        >
          <Img
            src={staticFile("icon-512.png")}
            style={{ width: "100%", height: "100%" }}
          />
        </div>

        <FadeSlideIn delay={15}>
          <div
            style={{
              fontSize: wide ? 48 : 72,
              fontWeight: 900,
              color: WHITE,
              textAlign: "center",
              fontFamily: "system-ui, sans-serif",
              letterSpacing: -2,
            }}
          >
            Essence QC
          </div>
        </FadeSlideIn>

        <FadeSlideIn delay={25}>
          <div
            style={{
              fontSize: wide ? 22 : 28,
              color: "rgba(255,255,255,0.8)",
              textAlign: "center",
              fontFamily: "system-ui, sans-serif",
              maxWidth: wide ? 600 : 800,
              lineHeight: 1.4,
            }}
          >
            Prix de l'essence au Québec en temps réel
          </div>
        </FadeSlideIn>
      </div>

      {/* Decorative fleur-de-lis */}
      <div
        style={{
          position: "absolute",
          top: wide ? 30 : 60,
          left: wide ? 40 : 60,
          opacity: 0.15,
          transform: `rotate(-15deg) scale(${logoScale})`,
        }}
      >
        <FleurDeLis size={wide ? 60 : 80} />
      </div>
      <div
        style={{
          position: "absolute",
          bottom: wide ? 30 : 60,
          right: wide ? 40 : 60,
          opacity: 0.15,
          transform: `rotate(15deg) scale(${logoScale})`,
        }}
      >
        <FleurDeLis size={wide ? 60 : 80} />
      </div>
    </AbsoluteFill>
  );
};

const FeatureCard: React.FC<{
  emoji: string;
  title: string;
  desc: string;
  delay: number;
  wide?: boolean;
}> = ({ emoji, title, desc, delay, wide }) => (
  <FadeSlideIn delay={delay} direction="left">
    <div
      style={{
        background: "rgba(255,255,255,0.12)",
        backdropFilter: "blur(10px)",
        borderRadius: 20,
        padding: wide ? "20px 28px" : "28px 32px",
        display: "flex",
        alignItems: "center",
        gap: wide ? 16 : 20,
        border: "1px solid rgba(255,255,255,0.15)",
      }}
    >
      <div style={{ fontSize: wide ? 36 : 48, flexShrink: 0 }}>{emoji}</div>
      <div>
        <div
          style={{
            fontSize: wide ? 20 : 26,
            fontWeight: 700,
            color: WHITE,
            fontFamily: "system-ui, sans-serif",
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: wide ? 14 : 18,
            color: "rgba(255,255,255,0.7)",
            fontFamily: "system-ui, sans-serif",
            marginTop: 4,
          }}
        >
          {desc}
        </div>
      </div>
    </div>
  </FadeSlideIn>
);

const SceneFeatures: React.FC<{ wide?: boolean }> = ({ wide }) => {
  const features = [
    {
      emoji: "🗺️",
      title: "Carte interactive",
      desc: "Stations les moins chères près de vous",
    },
    {
      emoji: "💰",
      title: "Économies en temps réel",
      desc: "Comparez les prix de + de 2 300 stations",
    },
    {
      emoji: "🚗",
      title: "Planificateur de trajet",
      desc: "Stations les moins chères sur votre route",
    },
    {
      emoji: "🏪",
      title: "Mode Costco",
      desc: "Trouvez les 3 Costco les plus proches",
    },
  ];

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(135deg, #001f5c 0%, ${BLUE} 100%)`,
        justifyContent: "center",
        alignItems: "center",
        padding: wide ? 60 : 80,
      }}
    >
      <FadeSlideIn delay={0}>
        <div
          style={{
            fontSize: wide ? 36 : 48,
            fontWeight: 900,
            color: WHITE,
            textAlign: "center",
            fontFamily: "system-ui, sans-serif",
            marginBottom: wide ? 30 : 50,
          }}
        >
          Tout ce qu'il vous faut ⛽
        </div>
      </FadeSlideIn>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: wide ? 16 : 24,
          width: "100%",
          maxWidth: wide ? 700 : 900,
        }}
      >
        {features.map((f, i) => (
          <FeatureCard
            key={f.title}
            {...f}
            delay={10 + i * 8}
            wide={wide}
          />
        ))}
      </div>
    </AbsoluteFill>
  );
};

const SceneData: React.FC<{ wide?: boolean }> = ({ wide }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const counterProgress = spring({
    frame: frame - 5,
    fps,
    config: { damping: 20, mass: 1.5 },
  });

  const count = Math.round(interpolate(counterProgress, [0, 1], [0, 2300]));

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(180deg, ${BLUE} 0%, #0052cc 50%, ${BLUE} 100%)`,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <FadeSlideIn delay={0}>
        <div
          style={{
            fontSize: wide ? 100 : 140,
            fontWeight: 900,
            color: WHITE,
            fontFamily: "system-ui, sans-serif",
            textAlign: "center",
            letterSpacing: -4,
          }}
        >
          {count.toLocaleString("fr-CA")}+
        </div>
      </FadeSlideIn>

      <FadeSlideIn delay={10}>
        <div
          style={{
            fontSize: wide ? 28 : 36,
            color: "rgba(255,255,255,0.85)",
            fontFamily: "system-ui, sans-serif",
            textAlign: "center",
            marginTop: 10,
          }}
        >
          stations-service au Québec
        </div>
      </FadeSlideIn>

      <FadeSlideIn delay={20}>
        <div
          style={{
            fontSize: wide ? 18 : 22,
            color: "rgba(255,255,255,0.6)",
            fontFamily: "system-ui, sans-serif",
            textAlign: "center",
            marginTop: 20,
            maxWidth: wide ? 500 : 600,
          }}
        >
          Données officielles de la Régie de l'énergie du Québec
          <br />
          Mises à jour quotidiennement
        </div>
      </FadeSlideIn>
    </AbsoluteFill>
  );
};

const SceneFree: React.FC<{ wide?: boolean }> = ({ wide }) => (
  <AbsoluteFill
    style={{
      background: `linear-gradient(135deg, ${BLUE} 0%, #002266 100%)`,
      justifyContent: "center",
      alignItems: "center",
    }}
  >
    <FadeSlideIn delay={0}>
      <div
        style={{
          fontSize: wide ? 60 : 80,
          fontWeight: 900,
          color: WHITE,
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
        }}
      >
        100% Gratuit
      </div>
    </FadeSlideIn>

    <FadeSlideIn delay={10}>
      <div
        style={{
          fontSize: wide ? 24 : 32,
          color: "rgba(255,255,255,0.8)",
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
          marginTop: 20,
        }}
      >
        Open source · Sans publicité
      </div>
    </FadeSlideIn>

    <FadeSlideIn delay={20}>
      <div
        style={{
          display: "flex",
          gap: 20,
          marginTop: wide ? 30 : 50,
        }}
      >
        {["📱", "💻", "🌐"].map((emoji, i) => (
          <FadeSlideIn key={emoji} delay={25 + i * 5}>
            <div
              style={{
                width: wide ? 70 : 90,
                height: wide ? 70 : 90,
                borderRadius: 20,
                background: "rgba(255,255,255,0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: wide ? 32 : 40,
                border: "1px solid rgba(255,255,255,0.15)",
              }}
            >
              {emoji}
            </div>
          </FadeSlideIn>
        ))}
      </div>
    </FadeSlideIn>

    <FadeSlideIn delay={35}>
      <div
        style={{
          fontSize: wide ? 16 : 20,
          color: "rgba(255,255,255,0.5)",
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
          marginTop: wide ? 20 : 30,
        }}
      >
        Web · Android · iOS (PWA)
      </div>
    </FadeSlideIn>
  </AbsoluteFill>
);

const SceneCTA: React.FC<{ wide?: boolean }> = ({ wide }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const pulse =
    1 + 0.03 * Math.sin((frame / fps) * Math.PI * 2);

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(135deg, ${BLUE} 0%, #001f5c 100%)`,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <FadeSlideIn delay={0}>
        <div
          style={{
            width: wide ? 100 : 140,
            height: wide ? 100 : 140,
            borderRadius: 28,
            overflow: "hidden",
            boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
            marginBottom: wide ? 20 : 40,
          }}
        >
          <Img
            src={staticFile("icon-512.png")}
            style={{ width: "100%", height: "100%" }}
          />
        </div>
      </FadeSlideIn>

      <FadeSlideIn delay={10}>
        <div
          style={{
            fontSize: wide ? 48 : 64,
            fontWeight: 900,
            color: WHITE,
            fontFamily: "system-ui, sans-serif",
            textAlign: "center",
            letterSpacing: -2,
          }}
        >
          Essence QC
        </div>
      </FadeSlideIn>

      <FadeSlideIn delay={20}>
        <div
          style={{
            marginTop: wide ? 24 : 40,
            padding: wide ? "16px 40px" : "20px 60px",
            borderRadius: 60,
            background: WHITE,
            color: BLUE,
            fontSize: wide ? 22 : 28,
            fontWeight: 800,
            fontFamily: "system-ui, sans-serif",
            transform: `scale(${pulse})`,
            boxShadow: "0 8px 30px rgba(0,0,0,0.3)",
          }}
        >
          essenceqc.ca
        </div>
      </FadeSlideIn>

      <FadeSlideIn delay={30}>
        <div
          style={{
            fontSize: wide ? 16 : 20,
            color: "rgba(255,255,255,0.6)",
            fontFamily: "system-ui, sans-serif",
            textAlign: "center",
            marginTop: wide ? 16 : 24,
          }}
        >
          Fait avec ❤️ au Québec
        </div>
      </FadeSlideIn>
    </AbsoluteFill>
  );
};

export const PromoVideo: React.FC<{ wide?: boolean }> = ({ wide = false }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  // Scene timing (30fps): 0-89, 90-209, 210-299, 300-374, 375-449
  return (
    <AbsoluteFill style={{ background: BLUE }}>
      <Sequence from={0} durationInFrames={90}>
        <SceneIntro wide={wide} />
      </Sequence>

      <Sequence from={90} durationInFrames={120}>
        <SceneFeatures wide={wide} />
      </Sequence>

      <Sequence from={210} durationInFrames={90}>
        <SceneData wide={wide} />
      </Sequence>

      <Sequence from={300} durationInFrames={75}>
        <SceneFree wide={wide} />
      </Sequence>

      <Sequence from={375} durationInFrames={75}>
        <SceneCTA wide={wide} />
      </Sequence>
    </AbsoluteFill>
  );
};
