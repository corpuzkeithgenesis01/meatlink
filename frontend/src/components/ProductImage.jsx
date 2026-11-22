import { useEffect, useState } from 'react';
import { productEmoji, productImage, productImageFallback } from '../utils/productImages';

function ProductImage({ product, className = '', alt }) {
  const photoSrc = productImage(product);
  const fallbackSrc = productImageFallback(product);
  const [stage, setStage] = useState('photo');

  useEffect(() => setStage('photo'), [photoSrc]);

  const src = stage === 'photo' ? photoSrc : fallbackSrc;

  if (stage === 'emoji' || !src) {
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
      onError={() => setStage(stage === 'photo' && fallbackSrc ? 'illustration' : 'emoji')}
    />
  );
}

export default ProductImage;
