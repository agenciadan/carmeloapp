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
        @keyframes flicker1 {
          0%   { transform: translateX(-50%) scaleX(1)   scaleY(1)   translateY(0px);  }
          25%  { transform: translateX(-50%) scaleX(0.94) scaleY(1.04) translateY(-3px); }
          50%  { transform: translateX(-50%) scaleX(1.06) scaleY(0.97) translateY(-6px); }
          75%  { transform: translateX(-50%) scaleX(0.97) scaleY(1.06) translateY(-2px); }
          100% { transform: translateX(-50%) scaleX(1)   scaleY(1)   translateY(0px);  }
        }
        @keyframes flicker2 {
          0%   { transform: translateX(-50%) scaleX(1)    scaleY(1)    translateY(0px)  rotate(0deg);  }
          30%  { transform: translateX(-50%) scaleX(0.92) scaleY(1.08) translateY(-5px) rotate(-3deg); }
          60%  { transform: translateX(-50%) scaleX(1.08) scaleY(0.95) translateY(-8px) rotate(3deg);  }
          100% { transform: translateX(-50%) scaleX(1)    scaleY(1)    translateY(0px)  rotate(0deg);  }
        }
        @keyframes flicker3 {
          0%   { transform: translateX(-50%) scaleX(1)    scaleY(1)    translateY(0px);  }
          40%  { transform: translateX(-50%) scaleX(0.88) scaleY(1.12) translateY(-6px); }
          70%  { transform: translateX(-50%) scaleX(1.1)  scaleY(0.92) translateY(-3px); }
          100% { transform: translateX(-50%) scaleX(1)    scaleY(1)    translateY(0px);  }
        }
        @keyframes glowPulse {
          0%   { opacity: 0.4; transform: scaleX(1);   }
          50%  { opacity: 0.7; transform: scaleX(1.15); }
          100% { opacity: 0.4; transform: scaleX(1);   }
        }
        @keyframes breathe {
          0%   { opacity: 0.35; }
          100% { opacity: 1.0;  }
        }
      `}</style>

      {/* Clickable flame container */}
      <div
        onClick={handleClick}
        style={{
          position: "relative",
          width: 120,
          height: 120,
          cursor: "pointer",
          background: "transparent",
          border: "none",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
        }}
      >
        {/* Chama base — a maior, tons dourado/laranja */}
        <div
          style={{
            position: "absolute",
            width: 90,
            height: 110,
            left: "50%",
            top: 0,
            background: "linear-gradient(to top, #C9A84C 0%, #E2690A 35%, #CC3D00 65%, transparent 100%)",
            borderRadius: "50% 50% 30% 30% / 60% 60% 40% 40%",
            animation: "flicker1 1.6s ease-in-out infinite",
            opacity: 0.85,
            filter: "blur(1px)",
          }}
        />

        {/* Chama média — laranja/amarelo */}
        <div
          style={{
            position: "absolute",
            width: 58,
            height: 75,
            left: "48%",
            top: 30,
            background: "linear-gradient(to top, #FFD700 0%, #FF8C00 45%, #FF4500 75%, transparent 100%)",
            borderRadius: "50% 50% 30% 30% / 60% 60% 40% 40%",
            animation: "flicker2 1.2s ease-in-out infinite",
            opacity: 0.9,
          }}
        />

        {/* Chama interna — amarelo claro/branco */}
        <div
          style={{
            position: "absolute",
            width: 30,
            height: 40,
            left: "51%",
            top: 60,
            background: "linear-gradient(to top, #FFFFFF 0%, #FFF8DC 25%, #FFD700 60%, transparent 100%)",
            borderRadius: "50% 50% 30% 30% / 60% 60% 40% 40%",
            animation: "flicker3 0.9s ease-in-out infinite",
            opacity: 0.95,
          }}
        />

        {/* Micro chama lateral esquerda */}

        {/* Micro chama lateral direita */}
      </div>

      {/* Reflexo/brilho no chão */}
      <div
        style={{
          width: 80,
          height: 14,
          marginTop: 6,
          background: "radial-gradient(ellipse, rgba(201,168,76,0.5) 0%, rgba(226,105,10,0.2) 50%, transparent 75%)",
          borderRadius: "50%",
          animation: "glowPulse 2s ease-in-out infinite",
        }}
      />

      {/* Texto */}
      <p
        style={{
          fontFamily: fonts.body,
          fontSize: 13,
          color: colors.textMuted,
          letterSpacing: 4,
          textTransform: "uppercase",
          marginTop: 36,
          animation: "breathe 1.8s ease-in-out infinite alternate",
          userSelect: "none",
        }}
      >
        Toque Para Iniciar
      </p>
    </div>
  );
};

export default SplashScreen;
