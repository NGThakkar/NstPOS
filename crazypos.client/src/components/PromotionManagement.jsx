import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Edit, Search, Tag, ToggleLeft, ToggleRight, Shield } from 'lucide-react';
import { Spinner } from './Spinner';
import {
    createPromotion,
    getPromotions,
    setPromotionStatus,
    updatePromotion,
} from '../utils/promotions';
import { loadProducts, loadCategories } from '../utils/storage';

function toDateTimeLocalString(value) {
    if (!value) {
        return '';
    }

    if (typeof value === 'string') {
        const normalized = value.trim();
        const match = normalized.match(/^(\d{4}-\d{2}-\d{2})[T\s](\d{2}:\d{2})/);
        if (match) {
            return `${match[1]}T${match[2]}`;
        }
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return '';
    }

    const pad = (n) => `${n}`.padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toInputDateTime(value) {
    return toDateTimeLocalString(value);
}

function toApiDateTime(value) {
    const localDateTime = toDateTimeLocalString(value);
    if (!localDateTime) {
        return null;
    }

    return `${localDateTime}:00`;
}

function toDisplayDateTime(value) {
    const localDateTime = toDateTimeLocalString(value);
    if (!localDateTime) {
        return 'N/A';
    }

    return localDateTime.replace('T', ' ');
}

function parseLocalDateTime(value) {
    const localDateTime = toDateTimeLocalString(value);
    if (!localDateTime) {
        return null;
    }

    const parsed = new Date(localDateTime);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function asNumberOrNull(value) {
    if (value === '' || value === null || value === undefined) {
        return null;
    }

    const n = Number(value);
    return Number.isNaN(n) ? null : n;
}

function asTrimmedOrNull(value) {
    if (typeof value !== 'string') {
        return value ?? null;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
}

function getProp(obj, camel, pascal, fallback = null) {
    if (obj?.[camel] !== undefined) {
        return obj[camel];
    }

    if (obj?.[pascal] !== undefined) {
        return obj[pascal];
    }

    return fallback;
}

function normalizePromotion(item) {
    return {
        promotionId: getProp(item, 'promotionId', 'PromotionId', 0),
        promotionCode: getProp(item, 'promotionCode', 'PromotionCode', ''),
        name: getProp(item, 'name', 'Name', ''),
        description: getProp(item, 'description', 'Description', ''),
        promotionType: getProp(item, 'promotionType', 'PromotionType', 'basket'),
        valueType: getProp(item, 'valueType', 'ValueType', 'percent'),
        valueAmount: getProp(item, 'valueAmount', 'ValueAmount', 0),
        maxDiscountAmount: getProp(item, 'maxDiscountAmount', 'MaxDiscountAmount', null),
        minBasketAmount: getProp(item, 'minBasketAmount', 'MinBasketAmount', null),
        appliesTo: getProp(item, 'appliesTo', 'AppliesTo', 'all'),
        targetCategoryId: getProp(item, 'targetCategoryId', 'TargetCategoryId', null),
        targetProductId: getProp(item, 'targetProductId', 'TargetProductId', null),
        stackable: getProp(item, 'stackable', 'Stackable', false),
        requiresApproval: getProp(item, 'requiresApproval', 'RequiresApproval', false),
        startsAt: getProp(item, 'startsAt', 'StartsAt', null),
        endsAt: getProp(item, 'endsAt', 'EndsAt', null),
        usageLimit: getProp(item, 'usageLimit', 'UsageLimit', null),
        usageCount: getProp(item, 'usageCount', 'UsageCount', 0),
        isActive: getProp(item, 'isActive', 'IsActive', false),
        qualifiers: getProp(item, 'qualifiers', 'Qualifiers', []),
    };
}

function getWindowState(promotion) {
    const now = new Date();
    const startsAt = parseLocalDateTime(promotion.startsAt);
    const endsAt = parseLocalDateTime(promotion.endsAt);

    if (!promotion.isActive) {
        return 'Inactive';
    }

    if (startsAt && startsAt > now) {
        return 'Scheduled';
    }

    if (endsAt && endsAt < now) {
        return 'Expired';
    }

    return 'Active';
}

const EMPTY_QUALIFIER = {
    qualifierType: 'min_basket',
    qualifierOperator: '>=',
    qualifierValue: '',
};

const initialForm = {
    promotionId: null,
    promotionCode: '',
    name: '',
    description: '',
    promotionType: 'basket',
    valueType: 'percent',
    valueAmount: '',
    maxDiscountAmount: '',
    minBasketAmount: '',
    appliesTo: 'all',
    targetCategoryId: '',
    targetProductId: '',
    stackable: false,
    requiresApproval: false,
    startsAt: toInputDateTime(new Date()),
    endsAt: '',
    usageLimit: '',
    isActive: true,
    qualifiers: [],
};

export function PromotionManagement({ currentUser }) {
    const [promotions, setPromotions] = useState([]);
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [scopeFilter, setScopeFilter] = useState('all');
    const [approvalFilter, setApprovalFilter] = useState('all');
    const [showModal, setShowModal] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [formError, setFormError] = useState('');
    const [formData, setFormData] = useState(initialForm);

    const isManagerUp = currentUser?.role === 'Admin' || currentUser?.role === 'Manager';

    useEffect(() => {
        if (!isManagerUp) {
            return;
        }

        loadScreenData();
    }, [isManagerUp]);

    async function loadScreenData() {
        setIsLoading(true);
        try {
            const [promotionsData, productsData, categoriesData] = await Promise.all([
                getPromotions(),
                loadProducts(),
                loadCategories(),
            ]);

            const normalized = (promotionsData || []).map(normalizePromotion);
            setPromotions(normalized);
            setProducts(productsData || []);
            setCategories(categoriesData || []);
        } catch (error) {
            setMessage({ type: 'error', text: error.message || 'Failed to load promotions data.' });
        } finally {
            setIsLoading(false);
        }
    }

    const filteredPromotions = useMemo(() => {
        return promotions.filter((promotion) => {
            const search = searchTerm.trim().toLowerCase();
            const matchesSearch = search.length === 0
                || (promotion.name || '').toLowerCase().includes(search)
                || (promotion.promotionCode || '').toLowerCase().includes(search)
                || (promotion.description || '').toLowerCase().includes(search);

            const windowState = getWindowState(promotion);
            const matchesStatus = statusFilter === 'all'
                || (statusFilter === 'active' && windowState === 'Active')
                || (statusFilter === 'scheduled' && windowState === 'Scheduled')
                || (statusFilter === 'expired' && windowState === 'Expired')
                || (statusFilter === 'inactive' && windowState === 'Inactive');

            const matchesScope = scopeFilter === 'all' || promotion.appliesTo === scopeFilter;
            const matchesApproval = approvalFilter === 'all'
                || (approvalFilter === 'required' && promotion.requiresApproval)
                || (approvalFilter === 'not-required' && !promotion.requiresApproval);

            return matchesSearch && matchesStatus && matchesScope && matchesApproval;
        });
    }, [promotions, searchTerm, statusFilter, scopeFilter, approvalFilter]);

    function openCreateModal() {
        setIsEditMode(false);
        setFormError('');
        setFormData({
            ...initialForm,
            startsAt: toInputDateTime(new Date()),
        });
        setShowModal(true);
    }

    function openEditModal(promotion) {
        setIsEditMode(true);
        setFormError('');
        setFormData({
            promotionId: promotion.promotionId,
            promotionCode: promotion.promotionCode || '',
            name: promotion.name || '',
            description: promotion.description || '',
            promotionType: promotion.promotionType || 'basket',
            valueType: promotion.valueType || 'percent',
            valueAmount: promotion.valueAmount ?? '',
            maxDiscountAmount: promotion.maxDiscountAmount ?? '',
            minBasketAmount: promotion.minBasketAmount ?? '',
            appliesTo: promotion.appliesTo || 'all',
            targetCategoryId: promotion.targetCategoryId ?? '',
            targetProductId: promotion.targetProductId ?? '',
            stackable: !!promotion.stackable,
            requiresApproval: !!promotion.requiresApproval,
            startsAt: toInputDateTime(promotion.startsAt),
            endsAt: toInputDateTime(promotion.endsAt),
            usageLimit: promotion.usageLimit ?? '',
            isActive: !!promotion.isActive,
            qualifiers: (promotion.qualifiers || []).map((q) => ({
                qualifierType: getProp(q, 'qualifierType', 'QualifierType', 'min_basket'),
                qualifierOperator: getProp(q, 'qualifierOperator', 'QualifierOperator', '>='),
                qualifierValue: getProp(q, 'qualifierValue', 'QualifierValue', ''),
            })),
        });
        setShowModal(true);
    }

    function closeModal() {
        setShowModal(false);
        setFormError('');
        setFormData(initialForm);
    }

    function handleFieldChange(event) {
        const { name, value, type, checked } = event.target;
        setFormData((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));
    }

    function addQualifier() {
        setFormData((prev) => ({
            ...prev,
            qualifiers: [...prev.qualifiers, { ...EMPTY_QUALIFIER }],
        }));
    }

    function updateQualifier(index, field, value) {
        setFormData((prev) => ({
            ...prev,
            qualifiers: prev.qualifiers.map((q, i) => (i === index ? { ...q, [field]: value } : q)),
        }));
    }

    function removeQualifier(index) {
        setFormData((prev) => ({
            ...prev,
            qualifiers: prev.qualifiers.filter((_, i) => i !== index),
        }));
    }

    function validateForm() {
        if (!formData.promotionCode.trim()) {
            return 'Promotion code is required.';
        }

        if (!formData.name.trim()) {
            return 'Promotion name is required.';
        }

        if (formData.valueAmount === '' || Number(formData.valueAmount) <= 0) {
            return 'Value amount must be greater than zero.';
        }

        if (!formData.startsAt) {
            return 'Start date is required.';
        }

        if (formData.endsAt && new Date(formData.startsAt) > new Date(formData.endsAt)) {
            return 'End date must be after the start date.';
        }

        if (formData.maxDiscountAmount !== '' && Number(formData.maxDiscountAmount) < 0) {
            return 'Max discount amount cannot be negative.';
        }

        if (formData.minBasketAmount !== '' && Number(formData.minBasketAmount) < 0) {
            return 'Minimum basket amount cannot be negative.';
        }

        if (formData.usageLimit !== '' && Number(formData.usageLimit) < 0) {
            return 'Usage limit cannot be negative.';
        }

        if (formData.appliesTo === 'category' && !formData.targetCategoryId) {
            return 'Target category is required for category-scoped promotions.';
        }

        if (formData.appliesTo === 'product' && !formData.targetProductId) {
            return 'Target product is required for product-scoped promotions.';
        }

        for (let i = 0; i < formData.qualifiers.length; i += 1) {
            const qualifier = formData.qualifiers[i];
            if (!qualifier.qualifierType || !qualifier.qualifierOperator || `${qualifier.qualifierValue}`.trim() === '') {
                return `Qualifier ${i + 1} is incomplete.`;
            }
        }

        return '';
    }

    async function handleSubmit(event) {
        event.preventDefault();
        setFormError('');

        const validationError = validateForm();
        if (validationError) {
            setFormError(validationError);
            return;
        }

        const payload = {
            PromotionCode: formData.promotionCode.trim(),
            Name: formData.name.trim(),
            Description: asTrimmedOrNull(formData.description),
            PromotionType: formData.promotionType,
            ValueType: formData.valueType,
            ValueAmount: Number(formData.valueAmount),
            MaxDiscountAmount: asNumberOrNull(formData.maxDiscountAmount),
            MinBasketAmount: asNumberOrNull(formData.minBasketAmount),
            AppliesTo: formData.appliesTo,
            TargetCategoryId: formData.appliesTo === 'category' ? asNumberOrNull(formData.targetCategoryId) : null,
            TargetProductId: formData.appliesTo === 'product' ? asNumberOrNull(formData.targetProductId) : null,
            Stackable: !!formData.stackable,
            RequiresApproval: !!formData.requiresApproval,
            StartsAt: toApiDateTime(formData.startsAt),
            EndsAt: toApiDateTime(formData.endsAt),
            UsageLimit: asNumberOrNull(formData.usageLimit),
            Qualifiers: formData.qualifiers.map((q) => ({
                QualifierType: q.qualifierType,
                QualifierOperator: q.qualifierOperator,
                QualifierValue: `${q.qualifierValue}`,
            })),
        };

        if (isEditMode) {
            payload.PromotionId = Number(formData.promotionId);
        }

        setIsSaving(true);
        try {
            if (isEditMode) {
                await updatePromotion(payload);
                setMessage({ type: 'success', text: 'Promotion updated successfully.' });
            } else {
                await createPromotion(payload);
                setMessage({ type: 'success', text: 'Promotion created successfully.' });
            }

            closeModal();
            await loadScreenData();
        } catch (error) {
            setFormError(error.message || 'Failed to save promotion.');
        } finally {
            setIsSaving(false);
        }
    }

    async function handleToggleStatus(promotion) {
        const nextState = !promotion.isActive;
        const confirmLabel = nextState ? 'activate' : 'deactivate';
        if (!window.confirm(`Are you sure you want to ${confirmLabel} this promotion?`)) {
            return;
        }

        const originalPromotions = promotions;
        setPromotions((prev) => prev.map((p) => (
            p.promotionId === promotion.promotionId ? { ...p, isActive: nextState } : p
        )));

        try {
            await setPromotionStatus({
                PromotionId: promotion.promotionId,
                IsActive: nextState,
            });
            setMessage({ type: 'success', text: `Promotion ${nextState ? 'activated' : 'deactivated'} successfully.` });
        } catch (error) {
            setPromotions(originalPromotions);
            setMessage({ type: 'error', text: error.message || 'Failed to update promotion status.' });
        }
    }

    if (!isManagerUp) {
        return (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
                <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h2>
                <p className="text-gray-600">You do not have permission to access Promotions. Manager or Admin role is required.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Promotions</h2>
                    <p className="text-gray-600">Manage coupons, discounts, and approval rules for checkout pricing.</p>
                </div>
                <button
                    type="button"
                    onClick={openCreateModal}
                    className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                    <Plus className="mr-2 h-4 w-4" />
                    New Promotion
                </button>
            </div>

            {message.text && (
                <div className={`rounded-lg border p-3 text-sm ${message.type === 'success' ? 'border-green-200 bg-green-50 text-green-800' : 'border-red-200 bg-red-50 text-red-800'}`}>
                    {message.text}
                </div>
            )}

            <div className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
                    <div className="md:col-span-2">
                        <label className="mb-2 block text-sm font-medium text-gray-700">Search</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Code, name, or description"
                                className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700">Status</label>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="all">All</option>
                            <option value="active">Active</option>
                            <option value="scheduled">Scheduled</option>
                            <option value="expired">Expired</option>
                            <option value="inactive">Inactive</option>
                        </select>
                    </div>
                    <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700">Applies To</label>
                        <select
                            value={scopeFilter}
                            onChange={(e) => setScopeFilter(e.target.value)}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="all">All</option>
                            <option value="basket">Basket</option>
                            <option value="item">Item</option>
                            <option value="category">Category</option>
                            <option value="product">Product</option>
                        </select>
                    </div>
                    <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700">Approval</label>
                        <select
                            value={approvalFilter}
                            onChange={(e) => setApprovalFilter(e.target.value)}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="all">All</option>
                            <option value="required">Required</option>
                            <option value="not-required">Not Required</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white">
                {isLoading ? (
                    <div className="flex h-56 items-center justify-center">
                        <Spinner />
                    </div>
                ) : filteredPromotions.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">No promotions found for the selected filters.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Code</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Name</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Type</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Value</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Window</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Usage</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Status</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-600">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 bg-white">
                                {filteredPromotions.map((promotion) => {
                                    const status = getWindowState(promotion);
                                    return (
                                        <tr key={promotion.promotionId}>
                                            <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">{promotion.promotionCode}</td>
                                            <td className="px-4 py-3 text-sm text-gray-700">
                                                <div className="font-medium text-gray-900">{promotion.name}</div>
                                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                                    <Tag className="h-3 w-3" />
                                                    <span>{promotion.appliesTo}</span>
                                                    {promotion.requiresApproval && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-amber-700">Approval</span>}
                                                </div>
                                            </td>
                                            <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">{promotion.promotionType}</td>
                                            <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                                                {promotion.valueType === 'percent' ? `${Number(promotion.valueAmount).toFixed(2)}%` : `$${Number(promotion.valueAmount).toFixed(2)}`}
                                            </td>
                                            <td className="px-4 py-3 text-xs text-gray-600">
                                                <div>{toDisplayDateTime(promotion.startsAt)}</div>
                                                <div>{promotion.endsAt ? toDisplayDateTime(promotion.endsAt) : 'No end date'}</div>
                                            </td>
                                            <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                                                {promotion.usageCount} / {promotion.usageLimit ?? 'Unlimited'}
                                            </td>
                                            <td className="whitespace-nowrap px-4 py-3 text-sm">
                                                <span className={`rounded px-2 py-1 text-xs font-medium ${
                                                    status === 'Active'
                                                        ? 'bg-green-100 text-green-700'
                                                        : status === 'Scheduled'
                                                            ? 'bg-blue-100 text-blue-700'
                                                            : status === 'Expired'
                                                                ? 'bg-amber-100 text-amber-700'
                                                                : 'bg-gray-100 text-gray-700'
                                                }`}>
                                                    {status}
                                                </span>
                                            </td>
                                            <td className="whitespace-nowrap px-4 py-3 text-right text-sm">
                                                <div className="inline-flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => openEditModal(promotion)}
                                                        className="rounded border border-gray-200 p-2 text-gray-600 hover:bg-gray-50"
                                                        title="Edit"
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleToggleStatus(promotion)}
                                                        className="rounded border border-gray-200 p-2 text-gray-600 hover:bg-gray-50"
                                                        title={promotion.isActive ? 'Deactivate' : 'Activate'}
                                                    >
                                                        {promotion.isActive ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-500/60 p-4">
                    <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-lg bg-white shadow-xl">
                        <div className="border-b border-gray-200 px-6 py-4">
                            <h3 className="text-lg font-semibold text-gray-900">
                                {isEditMode ? 'Edit Promotion' : 'Create Promotion'}
                            </h3>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6 p-6">
                            {formError && (
                                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                                    {formError}
                                </div>
                            )}

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-700">Promotion Code *</label>
                                    <input
                                        type="text"
                                        name="promotionCode"
                                        value={formData.promotionCode}
                                        onChange={handleFieldChange}
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="mb-2 block text-sm font-medium text-gray-700">Name *</label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleFieldChange}
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div className="md:col-span-3">
                                    <label className="mb-2 block text-sm font-medium text-gray-700">Description</label>
                                    <textarea
                                        name="description"
                                        value={formData.description}
                                        onChange={handleFieldChange}
                                        rows={2}
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-700">Promotion Type</label>
                                    <select
                                        name="promotionType"
                                        value={formData.promotionType}
                                        onChange={handleFieldChange}
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="basket">Basket</option>
                                        <option value="item">Item</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-700">Value Type</label>
                                    <select
                                        name="valueType"
                                        value={formData.valueType}
                                        onChange={handleFieldChange}
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="percent">Percent</option>
                                        <option value="fixed">Fixed</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-700">Value Amount *</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        name="valueAmount"
                                        value={formData.valueAmount}
                                        onChange={handleFieldChange}
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-700">Max Discount</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        name="maxDiscountAmount"
                                        value={formData.maxDiscountAmount}
                                        onChange={handleFieldChange}
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-700">Applies To</label>
                                    <select
                                        name="appliesTo"
                                        value={formData.appliesTo}
                                        onChange={handleFieldChange}
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="all">All</option>
                                        <option value="basket">Basket</option>
                                        <option value="item">Item</option>
                                        <option value="category">Category</option>
                                        <option value="product">Product</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-700">Min Basket Amount</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        name="minBasketAmount"
                                        value={formData.minBasketAmount}
                                        onChange={handleFieldChange}
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-700">Usage Limit</label>
                                    <input
                                        type="number"
                                        name="usageLimit"
                                        value={formData.usageLimit}
                                        onChange={handleFieldChange}
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div className="flex items-end">
                                    <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                                        <input
                                            type="checkbox"
                                            name="isActive"
                                            checked={formData.isActive}
                                            onChange={handleFieldChange}
                                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        Active
                                    </label>
                                </div>
                            </div>

                            {(formData.appliesTo === 'category' || formData.appliesTo === 'product') && (
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    {formData.appliesTo === 'category' && (
                                        <div>
                                            <label className="mb-2 block text-sm font-medium text-gray-700">Target Category *</label>
                                            <select
                                                name="targetCategoryId"
                                                value={formData.targetCategoryId}
                                                onChange={handleFieldChange}
                                                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            >
                                                <option value="">Select category</option>
                                                {categories.map((category) => (
                                                    <option key={category.categoryid} value={category.categoryid}>{category.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                    {formData.appliesTo === 'product' && (
                                        <div>
                                            <label className="mb-2 block text-sm font-medium text-gray-700">Target Product *</label>
                                            <select
                                                name="targetProductId"
                                                value={formData.targetProductId}
                                                onChange={handleFieldChange}
                                                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            >
                                                <option value="">Select product</option>
                                                {products.map((product) => (
                                                    <option key={product.productid} value={product.productid}>{product.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-700">Starts At *</label>
                                    <input
                                        type="datetime-local"
                                        name="startsAt"
                                        value={formData.startsAt}
                                        onChange={handleFieldChange}
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-700">Ends At</label>
                                    <input
                                        type="datetime-local"
                                        name="endsAt"
                                        value={formData.endsAt}
                                        onChange={handleFieldChange}
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div className="flex items-end">
                                    <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                                        <input
                                            type="checkbox"
                                            name="stackable"
                                            checked={formData.stackable}
                                            onChange={handleFieldChange}
                                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        Stackable
                                    </label>
                                </div>
                                <div className="flex items-end">
                                    <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                                        <input
                                            type="checkbox"
                                            name="requiresApproval"
                                            checked={formData.requiresApproval}
                                            onChange={handleFieldChange}
                                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        Requires Approval
                                    </label>
                                </div>
                            </div>

                            <div className="rounded-lg border border-gray-200 p-4">
                                <div className="mb-3 flex items-center justify-between">
                                    <h4 className="text-sm font-semibold text-gray-900">Qualifiers</h4>
                                    <button
                                        type="button"
                                        onClick={addQualifier}
                                        className="inline-flex items-center rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                                    >
                                        <Plus className="mr-1 h-3.5 w-3.5" />
                                        Add qualifier
                                    </button>
                                </div>
                                <div className="space-y-3">
                                    {formData.qualifiers.length === 0 && (
                                        <p className="text-xs text-gray-500">No qualifiers configured. This promotion will apply whenever other conditions are met.</p>
                                    )}
                                    {formData.qualifiers.map((qualifier, index) => (
                                        <div key={`${qualifier.qualifierType}-${index}`} className="grid grid-cols-1 gap-2 md:grid-cols-4">
                                            <select
                                                value={qualifier.qualifierType}
                                                onChange={(e) => updateQualifier(index, 'qualifierType', e.target.value)}
                                                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            >
                                                <option value="min_basket">Min Basket</option>
                                                <option value="min_quantity">Min Quantity</option>
                                                <option value="min_amount">Min Amount</option>
                                                <option value="min_line_amount">Min Line Amount</option>
                                            </select>
                                            <select
                                                value={qualifier.qualifierOperator}
                                                onChange={(e) => updateQualifier(index, 'qualifierOperator', e.target.value)}
                                                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            >
                                                <option value=">=">&gt;=</option>
                                                <option value=">">&gt;</option>
                                                <option value="=">=</option>
                                            </select>
                                            <input
                                                type="text"
                                                value={qualifier.qualifierValue}
                                                onChange={(e) => updateQualifier(index, 'qualifierValue', e.target.value)}
                                                placeholder="Value"
                                                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => removeQualifier(index)}
                                                className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-3 border-t border-gray-200 pt-4">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {isSaving ? 'Saving...' : (isEditMode ? 'Save Changes' : 'Create Promotion')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
