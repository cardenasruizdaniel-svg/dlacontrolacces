import EmployeeDetailClient from "./EmployeeDetailClient";

export function generateStaticParams() {
  return [{ id: "default" }];
}

export default function EmployeeDetailPage() {
  return <EmployeeDetailClient />;
}
