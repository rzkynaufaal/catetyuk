// Dijalankan ulang di setiap perpindahan halaman, sehingga muncul transisi halus
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-in">{children}</div>;
}