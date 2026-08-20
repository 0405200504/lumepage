import Image from "next/image";

type LogoProps = {
  className?: string;
};

export default function Logo({ className = "" }: LogoProps) {
  return (
    <Image
      src="/logo.png"
      alt="Lume"
      width={1000}
      height={1000}
      className={`object-contain ${className}`}
      priority
    />
  );
}
