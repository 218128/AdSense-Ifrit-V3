/**
 * WooCommerce Feature - Barrel Export
 * FSD: features/woocommerce/index.ts
 * 
 * WooCommerce integration for product management and affiliate imports.
 */

// WooCommerce API
export {
    createProduct,
    updateProduct,
    getProduct,
    listProducts,
    deleteProduct,
    batchProducts,
    listCategories,
    createCategory,
    findOrCreateCategory,
    setWooCredentials,
    getWooCredentials,
    isWooConfigured,
    generateSku,
    validateProduct,
    type WooCredentials,
    type WooProduct,
    type WooAttribute,
    type WooCategory,
    type WooApiResponse,
} from './lib/wooApi';

// Product Mapper
export {
    mapAmazonProduct,
    mapEbayProduct,
    mapCustomProduct,
    mapAmazonProducts,
    mapEbayProducts,
    type ProductMappingOptions,
    type MappedProduct,
    type CustomProductData,
} from './lib/productMapper';
