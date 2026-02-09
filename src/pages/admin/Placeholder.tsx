const AdminPlaceholder = ({ title }: { title: string }) => {
  return (
    <div>
      <h1 className="text-2xl font-display font-bold mb-4">{title}</h1>
      <div className="bg-card border border-border rounded-xl p-8 text-center">
        <p className="text-muted-foreground">Halaman ini sedang dalam pengembangan</p>
      </div>
    </div>
  );
};

export const AdminDepartures = () => <AdminPlaceholder title="Keberangkatan" />;
export const AdminPilgrims = () => <AdminPlaceholder title="Data Jemaah" />;
export const AdminAgents = () => <AdminPlaceholder title="Agen" />;
export const AdminPages = () => <AdminPlaceholder title="Halaman CMS" />;
export const AdminSettings = () => <AdminPlaceholder title="Pengaturan" />;
