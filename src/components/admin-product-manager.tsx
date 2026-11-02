'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type Category = { id: string; name: string; slug: string };
type Variant = {
  id: string;
  sku: string;
  name: string;
  price: number;
};
type Product = {
  id: string;
  name: string;
  slug: string;
  description: string;
  material: string;
  image: string;
  active: boolean;
  featured: boolean;
  category: Category;
  variants: Variant[];
};

const initial = {
  name: '',
  slug: '',
  description: '',
  material: '',
  image: '/images/vase.jpg',
  categorySlug: '',
  sku: '',
  variantName: 'Standard',
  price: '',
  active: false,
  featured: false
};

export function AdminProductManager({ demo }: { demo: boolean }) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [editing, setEditing] = useState<Product | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    const res = await fetch('/api/admin/products', {
      cache: 'no-store'
    });
    if (!res.ok) throw new Error('Unable to load product manager.');
    const data = await res.json();
    setProducts(data.products);
    setCategories(data.categories);
  }

  useEffect(() => {
    if (!demo) {
      load().catch(error => setMessage(error.message));
    }
  }, [demo]);

  function edit(product: Product) {
    const variant = product.variants[0];
    setEditing(product);
    setForm({
      name: product.name,
      slug: product.slug,
      description: product.description,
      material: product.material,
      image: product.image,
      categorySlug: product.category.slug,
      sku: variant?.sku ?? '',
      variantName: variant?.name ?? 'Standard',
      price: variant ? String(variant.price / 100) : '',
      active: product.active,
      featured: product.featured
    });
    setMessage('');
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      const variant = editing?.variants[0];
      const payload = {
        name: form.name,
        slug: form.slug,
        description: form.description,
        material: form.material,
        image: form.image,
        categorySlug: form.categorySlug,
        active: form.active,
        featured: form.featured,
        ...(!editing && {
          sku: form.sku,
          variantName: form.variantName
        }),
        ...(editing && variant && {
          variantId: variant.id,
          variantName: form.variantName
        }),
        ...((!editing || variant) && {
          price: Math.round(Number(form.price) * 100)
        }),
        ...(editing && { id: editing.id })
      };

      const res = await fetch('/api/admin/products', {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unable to save.');

      setEditing(null);
      setForm(initial);
      setMessage('Product saved successfully.');
      await load();
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Save failed.');
    } finally {
      setBusy(false);
    }
  }

  async function archive(product: Product) {
    if (!window.confirm(`Archive ${product.name}?`)) return;
    setBusy(true);
    try {
      const res = await fetch('/api/admin/products', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: product.id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Archive failed.');
      setMessage('Product archived.');
      await load();
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Archive failed.');
    } finally {
      setBusy(false);
    }
  }

  if (demo) return (
    <section className="panel" style={{ marginTop: 24 }}>
      <h3>Product Management</h3>
      <p>
        Connect PostgreSQL and configure staff access to create,
        edit or archive real products.
      </p>
    </section>
  );

  return (
    <section className="panel" style={{ marginTop: 24 }}>
      <h3>{editing ? 'Edit product' : 'Add a new product'}</h3>
      <p>Catalog changes require products.write permission.</p>

      <form onSubmit={save} style={{ marginTop: 20 }}>
        <div className="form-grid">
          {([
            ['name', 'Product name'],
            ['slug', 'Product slug'],
            ['material', 'Material / specifications'],
            ['image', 'Image path or HTTPS URL'],
            ['sku', 'SKU'],
            ['variantName', 'Variant name'],
            ['price', 'Price in INR']
          ] as const).map(([key, label]) => (
            <label className="field" key={key}>
              {label}
              <input
                required={key !== 'price' || !editing || !!editing.variants[0]}
                disabled={busy || (key === 'sku' && !!editing)}
                value={form[key]}
                type={key === 'price' ? 'number' : 'text'}
                min={key === 'price' ? '0.01' : undefined}
                step={key === 'price' ? '0.01' : undefined}
                onChange={e => setForm(p => ({
                  ...p, [key]: e.target.value
                }))}
              />
            </label>
          ))}

          <label className="field">
            Category
            <select
              required
              value={form.categorySlug}
              onChange={e => setForm(p => ({
                ...p, categorySlug: e.target.value
              }))}
            >
              <option value="">Select category</option>
              {categories.map(c => (
                <option key={c.id} value={c.slug}>{c.name}</option>
              ))}
            </select>
          </label>

          <label className="field">
            Description
            <textarea
              required
              value={form.description}
              onChange={e => setForm(p => ({
                ...p, description: e.target.value
              }))}
            />
          </label>

          <label>
            <input
              type="checkbox"
              checked={form.active}
              onChange={e => setForm(p => ({
                ...p, active: e.target.checked
              }))}
            /> Active
          </label>

          <label>
            <input
              type="checkbox"
              checked={form.featured}
              onChange={e => setForm(p => ({
                ...p, featured: e.target.checked
              }))}
            /> Featured
          </label>
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 22 }}>
          <button className="button" disabled={busy}>
            {busy ? 'Saving…' : editing ? 'Update product' : 'Add product'}
          </button>
          {editing && (
            <button
              type="button"
              className="button"
              disabled={busy}
              onClick={() => {
                setEditing(null);
                setForm(initial);
              }}
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      {message && <p role="status" style={{ marginTop: 18 }}>{message}</p>}

      <div style={{ marginTop: 30 }}>
        <h3>Manage products</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {products.map(product => (
                <tr key={product.id}>
                  <td>{product.name}</td>
                  <td>{product.variants[0]?.sku ?? '—'}</td>
                  <td>{product.active ? 'Active' : 'Draft'}</td>
                  <td>
                    <button type="button" disabled={busy}
                      onClick={() => edit(product)}>Edit</button>
                    {' · '}
                    <button type="button" disabled={busy}
                      onClick={() => archive(product)}>Archive</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
