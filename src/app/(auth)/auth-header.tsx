type AuthHeaderProps = {
  title: string;
  description: string;
};

/** The page's single <h1> plus a one-line intro. */
export function AuthHeader({ title, description }: AuthHeaderProps) {
  return (
    <div className="space-y-2">
      <h1 className="text-4xl font-extrabold">{title}</h1>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
}
