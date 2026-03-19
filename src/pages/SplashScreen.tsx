import React, { useState } from "react";
import { colors, fonts } from "@/styles/theme";

interface SplashScreenProps {
  onStart: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onStart }) => {
  const [fading, setFading] = useState(false);

  const handleClick = () => {
    setFading(true);
    setTimeout(onStart, 400);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#000000",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        opacity: fading ? 0 : 1,
        transition: "opacity 0.4s ease",
      }}
    >
      <style>{`
        @keyframes flameOuter {
          0%, 100% { box-shadow: 0 0 20px ${colors.gold}44, 0 0 40px ${colors.gold}22, 0 -10px 30px #E2690A33; }
          50% { box-shadow: 0 0 30px ${colors.gold}66, 0 0 60px ${colors.gold}33, 0 -15px 45px #E2690A44; }
        }
        @keyframes flameInner {
          0%, 100% { transform: scale(1) translateY(0); opacity: 0.8; }
          25% { transform: scale(1.05) translateY(-2px); opacity: 1; }
          50% { transform: scale(0.95) translateY(-4px); opacity: 0.9; }
          75% { transform: scale(1.08) translateY(-1px); opacity: 1; }
        }
        @keyframes flicker1 {
          0%, 100% { transform: translateY(0) scaleY(1); opacity: 0.7; }
          50% { transform: translateY(-8px) scaleY(1.3); opacity: 1; }
        }
        @keyframes flicker2 {
          0%, 100% { transform: translateY(0) scaleY(1) rotate(-5deg); opacity: 0.5; }
          50% { transform: translateY(-12px) scaleY(1.5) rotate(5deg); opacity: 0.8; }
        }
        @keyframes breathe {
          0% { opacity: 0.4; }
          100% { opacity: 1.0; }
        }
      `}</style>

      <button
        onClick={handleClick}
        style={{
          width: 100,
          height: 100,
          borderRadius: "50%",
          background: `radial-gradient(circle at 50% 60%, ${colors.gold}, #8B6914)`,
          border: "none",
          cursor: "pointer",
          position: "relative",
          animation: "flameOuter 2s ease-in-out infinite",
        }}
      >
        {/* Inner flame layers */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "-1px",
            transform: "translateX(-50%)",
            width: 24,
            height: 40,
            background: `linear-gradient(to top, ${colors.gold}, #E2690A, transparent)`,
            borderRadius: "50% 50% 50% 50% / 60% 60% 40% 40%",
            animation: "flicker1 1.2s ease-in-out infinite",
          }}
        />

        <div
          style={{
            position: "absolute",
            left: "45%",
            top: "-10px",
            transform: "translateX(-50%)",
            width: 16,
            height: 30,
            background: `linear-gradient(to top, #FFD700, #FF8C00, transparent)`,
            borderRadius: "50% 50% 50% 50% / 60% 60% 40% 40%",
            animation: "flicker2 1.5s ease-in-out infinite",
          }}
        />

        <div
          style={{
            position: "absolute",
            left: "55%",
            top: "-8px",
            transform: "translateX(-50%)",
            width: 12,
            height: 25,
            background: `linear-gradient(to top, #FFF5CC, #FFD700, transparent)`,
            borderRadius: "50% 50% 50% 50% / 60% 60% 40% 40%",
            animation: "flicker1 0.9s ease-in-out infinite",
          }}
        />
      </button>

      <p
        style={{
          fontFamily: fonts.body,
          fontSize: 14,
          color: colors.textMuted,
          letterSpacing: 3,
          textTransform: "uppercase",
          marginTop: 32,
          animation: "breathe 1.8s infinite alternate ease-in-out",
        }}
      >
        Toque Para Iniciar
      </p>
    </div>
  );
};

export default SplashScreen;
