import { useState } from 'react';

const emptyForm = {
  name: '',
  category: 'chicken',
  price: '',
  stock: '',
  unit: 'kg',
};

function ProductForm({ editingProduct, onSave, onCancel }) {
  const [form, setForm] = useState(
    editingProduct
      ? {
          name: editingProduct.name,
          category: editingProduct.category,
          price: editingProduct.price,
          stock: editingProduct.stock,
          unit: editingProduct.unit,
        }
      : emptyForm
  );

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const ok = await onSave({
      ...form,
      price: Number(form.price),
      stock: Number(form.stock),
    });
    if (ok && !editingProduct) setForm(emptyForm);
  }

  return (
    <form onSubmit={handleSubmit} className="product-form">
      <h3>{editingProduct ? 'Edit Product' : 'Add Product'}</h3>

      <input
        name="name"
        placeholder="Product name"
        value={form.name}
        onChange={handleChange}
        required
      />

      <select name="category" value={form.category} onChange={handleChange}>
        <option value="chicken">Chicken</option>
        <option value="pork">Pork</option>
      </select>

      <input
        name="price"
        type="number"
        min="0"
        step="0.01"
        placeholder="Price"
        value={form.price}
        onChange={handleChange}
        required
      />

      <input
        name="stock"
        type="number"
        min="0"
        placeholder="Stock"
        value={form.stock}
        onChange={handleChange}
      />

      <input
        name="unit"
        placeholder="Unit (kg, pc)"
        value={form.unit}
        onChange={handleChange}
      />

      <div className="form-buttons">
        <button type="submit">{editingProduct ? 'Update' : 'Add'}</button>
        {editingProduct && (
          <button type="button" className="secondary" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

export default ProductForm;