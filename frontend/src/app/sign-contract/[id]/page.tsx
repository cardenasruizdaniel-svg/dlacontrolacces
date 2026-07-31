import SignContractClient from "./SignContractClient";

export function generateStaticParams() {
  return [{ id: "default" }];
}

export default function MobileSignContractPage() {
  return <SignContractClient />;
}
