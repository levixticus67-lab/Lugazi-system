interface AvatarProps {
  name: string;
  photoUrl?: string | null;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}

const SIZES = {
  xs: "w-5 h-5 text-[8px]",
  sm: "w-6 h-6 text-[10px]",
  md: "w-8 h-8 text-xs",
  lg: "w-10 h-10 text-sm",
};

export default function Avatar({ name, photoUrl, size = "md", className = "" }: AvatarProps) {
  const sz = SIZES[size];
  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={name}
        className={`${sz} rounded-full object-cover shrink-0 ${className}`}
      />
    );
  }
  return (
    <div className={`${sz} rounded-full blue-gradient-bg flex items-center justify-center text-white font-bold shrink-0 ${className}`}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}
