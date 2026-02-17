import React, { useState, useRef, useEffect } from 'react';
import { Search, Package, Plus, Check } from 'lucide-react';

/**
 * ProductCombobox - Select existing product or type new name
 * @param {Array} products - List of products from context
 * @param {Object} value - { ProductID: number|null, ItemName: string }
 * @param {Function} onChange - Called with { ProductID, ItemName }
 */
const ProductCombobox = ({ products = [], value = {}, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState(value.ItemName || '');
    const [highlightIndex, setHighlightIndex] = useState(-1);
    const inputRef = useRef(null);
    const dropdownRef = useRef(null);

    // Filter products based on search
    const filteredProducts = products.filter(p =>
        p.ProductName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Check if typed text is new (not matching any product)
    const isNewItem = searchTerm.trim() && !products.some(
        p => p.ProductName.toLowerCase() === searchTerm.toLowerCase()
    );

    // Sync searchTerm with value prop (for auto-fill/OCR)
    useEffect(() => {
        if (value.ItemName && value.ItemName !== searchTerm) {
            setSearchTerm(value.ItemName);
        }
    }, [value.ItemName]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Handle keyboard navigation
    const handleKeyDown = (e) => {
        if (!isOpen) {
            if (e.key === 'ArrowDown' || e.key === 'Enter') {
                setIsOpen(true);
            }
            return;
        }

        const maxIndex = filteredProducts.length + (isNewItem ? 0 : -1);

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setHighlightIndex(prev => Math.min(prev + 1, maxIndex));
                break;
            case 'ArrowUp':
                e.preventDefault();
                setHighlightIndex(prev => Math.max(prev - 1, 0));
                break;
            case 'Enter':
                e.preventDefault();
                if (highlightIndex >= 0 && highlightIndex < filteredProducts.length) {
                    selectProduct(filteredProducts[highlightIndex]);
                } else if (isNewItem) {
                    selectNewItem();
                }
                break;
            case 'Escape':
                setIsOpen(false);
                break;
        }
    };

    const selectProduct = (product) => {
        setSearchTerm(product.ProductName);
        onChange({
            ProductID: product.ProductID,
            ItemName: product.ProductName,
            LastPrice: product.LastPrice || 0
        });
        setIsOpen(false);
        setHighlightIndex(-1);
    };

    const selectNewItem = () => {
        onChange({ ProductID: null, ItemName: searchTerm.trim() });
        setIsOpen(false);
        setHighlightIndex(-1);
    };

    const handleInputChange = (e) => {
        const val = e.target.value;
        setSearchTerm(val);
        setIsOpen(true);
        setHighlightIndex(-1);
        // Clear selection if typing
        if (value.ProductID) {
            onChange({ ProductID: null, ItemName: val });
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Input */}
            <div className="relative">
                <input
                    ref={inputRef}
                    type="text"
                    value={searchTerm}
                    onChange={handleInputChange}
                    onFocus={() => setIsOpen(true)}
                    onKeyDown={handleKeyDown}
                    placeholder="🔍 ค้นหาหรือพิมพ์ชื่ออุปกรณ์..."
                    className={`w-full bg-white border p-2.5 pr-10 rounded-lg text-sm outline-none transition-all ${value.ProductID
                        ? 'border-emerald-300 bg-emerald-50'
                        : 'border-slate-200 focus:border-indigo-500'
                        }`}
                />
                {value.ProductID && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2">
                        <Check size={16} className="text-emerald-600" />
                    </div>
                )}
            </div>

            {/* Dropdown */}
            {isOpen && (searchTerm || filteredProducts.length > 0) && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-[200] max-h-64 overflow-y-auto">
                    {/* Product list */}
                    {filteredProducts.length > 0 && (
                        <div className="py-1">
                            <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                อุปกรณ์ใน Master
                            </div>
                            {filteredProducts.slice(0, 10).map((product, idx) => (
                                <button
                                    key={product.ProductID}
                                    type="button"
                                    onClick={() => selectProduct(product)}
                                    className={`w-full text-left px-3 py-2 flex items-center gap-3 hover:bg-indigo-50 transition-colors ${idx === highlightIndex ? 'bg-indigo-50' : ''
                                        }`}
                                >
                                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                                        <Package size={14} className="text-slate-500" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-slate-800 truncate">{product.ProductName}</p>
                                        <p className="text-[10px] text-slate-400">
                                            {product.DeviceType} • คงเหลือ: {product.CurrentStock}
                                        </p>
                                    </div>
                                    {value.ProductID === product.ProductID && (
                                        <Check size={16} className="text-emerald-600 shrink-0" />
                                    )}
                                </button>
                            ))}
                            {filteredProducts.length > 10 && (
                                <div className="px-3 py-2 text-xs text-slate-400 text-center">
                                    +{filteredProducts.length - 10} รายการ (พิมพ์เพิ่มเพื่อกรอง)
                                </div>
                            )}
                        </div>
                    )}

                    {/* New item option */}
                    {isNewItem && (
                        <div className="border-t border-slate-100">
                            <button
                                type="button"
                                onClick={selectNewItem}
                                className={`w-full text-left px-3 py-3 flex items-center gap-3 hover:bg-amber-50 transition-colors ${highlightIndex === filteredProducts.length ? 'bg-amber-50' : ''
                                    }`}
                            >
                                <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                                    <Plus size={14} className="text-amber-600" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-amber-700">
                                        สร้างอุปกรณ์ใหม่: "{searchTerm}"
                                    </p>
                                    <p className="text-[10px] text-amber-500">
                                        รายการนี้จะถูกสร้างเมื่อรับของ
                                    </p>
                                </div>
                            </button>
                        </div>
                    )}

                    {/* No results */}
                    {filteredProducts.length === 0 && !isNewItem && searchTerm && (
                        <div className="px-4 py-6 text-center text-slate-400">
                            <Package size={24} className="mx-auto mb-2 opacity-50" />
                            <p className="text-sm">ไม่พบอุปกรณ์</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ProductCombobox;
