import React, { useState, useRef, useEffect } from 'react';
import { Search, Building2, Plus, Check } from 'lucide-react';

/**
 * VendorCombobox - Select existing vendor or type new name
 * @param {Array} vendors - List of vendors from context
 * @param {Object} value - { VendorID: number|null, VendorName: string }
 * @param {Function} onChange - Called with { VendorID, VendorName }
 */
const VendorCombobox = ({ vendors = [], value = {}, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState(value.VendorName || '');
    const [highlightIndex, setHighlightIndex] = useState(-1);
    const dropdownRef = useRef(null);

    // Filter vendors based on search
    const filteredVendors = vendors.filter(v =>
        v.VendorName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Check if typed text is new (not matching any vendor)
    const isNewItem = searchTerm.trim() && !vendors.some(
        v => v.VendorName.toLowerCase() === searchTerm.toLowerCase()
    );

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

        const maxIndex = filteredVendors.length + (isNewItem ? 0 : -1);

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
                if (highlightIndex >= 0 && highlightIndex < filteredVendors.length) {
                    selectVendor(filteredVendors[highlightIndex]);
                } else if (isNewItem) {
                    selectNewItem();
                }
                break;
            case 'Escape':
                setIsOpen(false);
                break;
        }
    };

    const selectVendor = (vendor) => {
        setSearchTerm(vendor.VendorName);
        onChange({ VendorID: vendor.VendorID, VendorName: vendor.VendorName });
        setIsOpen(false);
        setHighlightIndex(-1);
    };

    const selectNewItem = () => {
        onChange({ VendorID: null, VendorName: searchTerm.trim() });
        setIsOpen(false);
        setHighlightIndex(-1);
    };

    const handleInputChange = (e) => {
        const val = e.target.value;
        setSearchTerm(val);
        setIsOpen(true);
        setHighlightIndex(-1);
        if (value.VendorID) {
            onChange({ VendorID: null, VendorName: val });
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Input */}
            <div className="relative">
                <input
                    type="text"
                    value={searchTerm}
                    onChange={handleInputChange}
                    onFocus={() => setIsOpen(true)}
                    onKeyDown={handleKeyDown}
                    placeholder="🔍 ค้นหาหรือพิมพ์ชื่อ Vendor..."
                    className={`w-full bg-white border p-2.5 pr-10 rounded-lg text-sm outline-none transition-all ${value.VendorID
                        ? 'border-emerald-300 bg-emerald-50'
                        : 'border-slate-200 focus:border-indigo-500'
                        }`}
                />
                {value.VendorID && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2">
                        <Check size={16} className="text-emerald-600" />
                    </div>
                )}
            </div>

            {/* Dropdown */}
            {isOpen && (searchTerm || filteredVendors.length > 0) && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-[200] max-h-64 overflow-y-auto">
                    {/* Vendor list */}
                    {filteredVendors.length > 0 && (
                        <div className="py-1">
                            <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                Vendor Master
                            </div>
                            {filteredVendors.map((vendor, idx) => (
                                <button
                                    key={vendor.VendorID}
                                    type="button"
                                    onClick={() => selectVendor(vendor)}
                                    className={`w-full text-left px-3 py-2 flex items-center gap-3 hover:bg-indigo-50 transition-colors ${idx === highlightIndex ? 'bg-indigo-50' : ''
                                        }`}
                                >
                                    <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
                                        <Building2 size={14} className="text-purple-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-slate-800 truncate">{vendor.VendorName}</p>
                                        {vendor.ContactInfo && (
                                            <p className="text-[10px] text-slate-400 truncate">{vendor.ContactInfo}</p>
                                        )}
                                    </div>
                                    {value.VendorID === vendor.VendorID && (
                                        <Check size={16} className="text-emerald-600 shrink-0" />
                                    )}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* New item option */}
                    {isNewItem && (
                        <div className="border-t border-slate-100">
                            <button
                                type="button"
                                onClick={selectNewItem}
                                className={`w-full text-left px-3 py-3 flex items-center gap-3 hover:bg-amber-50 transition-colors ${highlightIndex === filteredVendors.length ? 'bg-amber-50' : ''
                                    }`}
                            >
                                <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                                    <Plus size={14} className="text-amber-600" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-amber-700">
                                        ใช้ Vendor ใหม่: "{searchTerm}"
                                    </p>
                                    <p className="text-[10px] text-amber-500">
                                        Vendor นี้จะถูกบันทึกพร้อม PO
                                    </p>
                                </div>
                            </button>
                        </div>
                    )}

                    {/* No results */}
                    {filteredVendors.length === 0 && !isNewItem && searchTerm && (
                        <div className="px-4 py-6 text-center text-slate-400">
                            <Building2 size={24} className="mx-auto mb-2 opacity-50" />
                            <p className="text-sm">ไม่พบ Vendor</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default VendorCombobox;
