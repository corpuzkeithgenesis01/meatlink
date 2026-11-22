import { useEffect, useState } from 'react';
import { productEmoji, productImage } from '../utils/productImages';

function ProductImage({ product, className = '', alt }) {
  const src = productImage(product);
  const [failed, setFailed] = useState(false);

  useEffect(() => setFailed(false), [src]);

  if (failed) {
    return (
      <div className={`product-image product-image--fallback ${className}`} role="img" aria-label={alt || product?.name || 'Product'}>
        {productEmoji(product)}
      </div>
    );
  }

  return (
    <img
      className={`product-image ${className}`}
      src={src}
      alt={alt || product?.name || 'Product'}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}

export default ProductImage;
