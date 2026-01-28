import ParkingValidator from "@/components/UploadReceipt";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <ParkingValidator />
      
      <footer className="mt-8 text-center text-gray-400 text-xs">
        <p>© 2026 App Riomar. Todos os direitos reservados.</p>
      </footer>
    </main>
  );
}
