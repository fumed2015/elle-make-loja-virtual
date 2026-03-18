import { useAllProductsUnified } from "@/hooks/useProducts";

const Catalogo = () => {
  const { data: products, isLoading } = useAllProductsUnified();

  if (isLoading) return <p style={{ padding: 40, fontFamily: 'sans-serif' }}>Carregando...</p>;

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: 24, fontFamily: 'sans-serif' }}>
      <h1 style={{ fontSize: 24, marginBottom: 8 }}>Catálogo Elle Make — {products?.length || 0} produtos</h1>
      <p style={{ color: '#888', marginBottom: 24, fontSize: 14 }}>Página auxiliar para extração de dados.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
        {(products || []).map((p: any) => (
          <div key={p.id} style={{ border: '1px solid #eee', borderRadius: 8, overflow: 'hidden', background: '#fff' }}>
            {p.images?.[0] && (
              <img
                src={p.images[0]}
                alt={p.name}
                style={{ width: '100%', height: 200, objectFit: 'contain', background: '#fafafa' }}
              />
            )}
            <div style={{ padding: 12 }}>
              <p style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{p.name}</p>
              <p style={{ fontSize: 12, color: '#666' }}>{p.brand || '—'}</p>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#7a2d3a', marginTop: 4 }}>
                R$ {Number(p.price).toFixed(2).replace('.', ',')}
              </p>
              {p.slug && <p style={{ fontSize: 10, color: '#aaa', marginTop: 2 }}>/produto/{p.slug}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Catalogo;
