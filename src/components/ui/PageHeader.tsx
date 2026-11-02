export default function PageHeader({
  eyebrow,
  title,
  lead,
}: {
  eyebrow: string;
  title: string;
  lead?: string;
}) {
  return (
    <header className="container-x pb-12 pt-32 md:pt-40">
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="display mt-4 max-w-4xl">{title}</h1>
      {lead && <p className="mt-6 max-w-2xl text-lg text-muted">{lead}</p>}
    </header>
  );
}
