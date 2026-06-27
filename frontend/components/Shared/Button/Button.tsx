type ButtonVariant = "primary" | "secondary";

interface ButtonProps {
  children: React.ReactNode;
  variant?: ButtonVariant;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
}

export default function Button({
  children,
  variant = "primary",
  onClick,
  type = "button",
}: ButtonProps) {
  const baseStyles =
    "rounded-2xl px-7 py-4 font-medium transition duration-300";

  const variants = {
    primary:
      "bg-black text-white hover:opacity-90",

    secondary:
      "border border-gray-300 bg-white text-black hover:bg-gray-100",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      className={`${baseStyles} ${variants[variant]}`}
    >
      {children}
    </button>
  );
}