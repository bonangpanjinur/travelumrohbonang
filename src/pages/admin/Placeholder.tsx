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

export default AdminPlaceholder;
