import ClientDetailClient from "./ClientDetailClient";

export function generateStaticParams() {
  return [{ id: "default" }];
}

export default function ClientDetailPage() {
  return <ClientDetailClient />;
}
