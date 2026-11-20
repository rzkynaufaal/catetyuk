import TxFormPage from "@/components/TxFormPage";
export default async function Page({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { id } = await searchParams;
  return <TxFormPage type="expense" id={id} />;
}