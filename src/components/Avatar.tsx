import { CSSProperties } from "react";

const palettes = [
  { skin: "#9c5f43", hair: "#231c24", shirt: "#ff6b57" },
  { skin: "#d89b78", hair: "#4b2925", shirt: "#f4c95d" },
  { skin: "#b97550", hair: "#17191e", shirt: "#82b4ff" },
  { skin: "#7b493b", hair: "#241923", shirt: "#c7a0f8" },
];

export function Avatar({ name, color, avatar = 0, size = 48, className = "" }: { name: string; color: string; avatar?: number; size?: number; className?: string }) {
  const palette = palettes[avatar % palettes.length];
  const style = { "--avatar-color": color, width: size, height: size } as CSSProperties;
  return (
    <div className={`avatar ${className}`} style={style} aria-label={`${name} avatar`} role="img">
      <svg viewBox="0 0 100 100" width="100%" height="100%" aria-hidden="true">
        <defs><clipPath id={`clip-${avatar}`}><rect width="100" height="100" rx="28" /></clipPath></defs>
        <g clipPath={`url(#clip-${avatar})`}>
          <rect width="100" height="100" fill={color} opacity=".2" />
          <circle cx="82" cy="14" r="28" fill={color} opacity=".32" />
          <path d="M9 105c2-30 18-42 41-42s40 13 43 42" fill={palette.shirt} />
          <path d="M39 59h22v19c-7 6-15 6-22 0z" fill={palette.skin} />
          <ellipse cx="50" cy="43" rx="25" ry="29" fill={palette.skin} />
          {avatar % 4 === 0 && <path d="M24 44C19 13 35 5 52 7c21-1 31 16 24 42l-7-24c-15 6-27 3-36-3z" fill={palette.hair} />}
          {avatar % 4 === 1 && <path d="M24 49C13 20 30 4 50 6c24-3 35 20 25 51l-4-28c-8-9-26-12-39-2z" fill={palette.hair} />}
          {avatar % 4 === 2 && <path d="M25 38C20 15 33 7 51 7c21 0 29 13 25 36l-8-19c-13 5-24 3-34-3z" fill={palette.hair} />}
          {avatar % 4 === 3 && <><path d="M22 54C10 20 28 2 50 5c26-3 39 21 28 55l-8-30c-13-11-29-9-40 1z" fill={palette.hair} /><circle cx="23" cy="28" r="10" fill={palette.hair} /><circle cx="78" cy="28" r="10" fill={palette.hair} /></>}
          <ellipse cx="40" cy="43" rx="2.2" ry="2.8" fill="#211b23" />
          <ellipse cx="61" cy="43" rx="2.2" ry="2.8" fill="#211b23" />
          <path d={avatar % 2 ? "M42 56c5 4 11 4 16 0" : "M43 56c4 3 10 3 14-1"} fill="none" stroke="#502f32" strokeWidth="2" strokeLinecap="round" />
          {avatar === 2 && <g fill="none" stroke="#211b23" strokeWidth="2"><rect x="31" y="36" width="17" height="13" rx="5" /><rect x="53" y="36" width="17" height="13" rx="5" /><path d="M48 41h5" /></g>}
          {avatar === 1 && <path d="M67 63l9 5-8 5" fill="none" stroke="#f4c95d" strokeWidth="3" />}
        </g>
      </svg>
    </div>
  );
}
