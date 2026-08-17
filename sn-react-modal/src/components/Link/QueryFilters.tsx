import { useState, useEffect } from 'react';
import styles from '../Link.module.css';

interface PicklistValue {
    label: string;
    value: any;
}

interface FilterableField {
    name: string;
    label: string;
    type: string;
    filterable: boolean;
    picklistValues: PicklistValue[];
}

interface Filter {
    field: { label: string; value: FilterableField } | null;
    operator: { label: string; value: '=' | '!=' } | null;
    fieldValue: Array<{ label: string; value: any }>;
    editing: boolean;
    picklistValues: PicklistValue[];
}

interface QueryFiltersProps {
    selectedObject: { name: string; label: string } | null;
    onObjectSelect: (object: { name: string; label: string } | null) => void;
    onFiltersChange: (filters: Filter[]) => void;
    configuredObjects: Array<{ name: string; label: string }>;
    onCollapsedChange?: (collapsed: boolean) => void;
}

const QueryFilters = ({ 
    selectedObject, 
    onObjectSelect, 
    onFiltersChange,
    configuredObjects,
    onCollapsedChange
}: QueryFiltersProps) => {
    const [filters, setFilters] = useState<Filter[]>([]);
    const [filterableFields, setFilterableFields] = useState<FilterableField[]>([]);
    const [loadingFields, setLoadingFields] = useState(false);
    const [fieldsError, setFieldsError] = useState<string | null>(null);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    
    useEffect(() => {
        if (onCollapsedChange) {
            onCollapsedChange(sidebarCollapsed);
        }
    }, [sidebarCollapsed, onCollapsedChange]);

    
    useEffect(() => {
        if (selectedObject) {
            fetchFilterableFields(selectedObject.name);
        } else {
            setFilterableFields([]);
            setFilters([]);
        }
    }, [selectedObject]);

    
    useEffect(() => {
        onFiltersChange(filters);
    }, [filters]);

    const fetchFilterableFields = async (objectName: string) => {
        setLoadingFields(true);
        setFieldsError(null);

        try {
            const response = await fetch(
                `/api/x_1955226_peeklo_1/x_1955226_peeklo_1_salesforce_integratio/salesforce/object/describe?object_name=${encodeURIComponent(objectName)}`,
                {
                    headers: {
                        'Accept': 'application/json',
                        'X-UserToken': window.g_ck || ''
                    }
                }
            );

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to fetch filterable fields');
            }

            const data = await response.json();
            
            if (data.success && data.fields) {
                
                const fieldsWithPicklists = data.fields.filter((field: FilterableField) => 
                    field.filterable && 
                    field.picklistValues && 
                    field.picklistValues.length > 0
                );
                setFilterableFields(fieldsWithPicklists);
            } else {
                setFilterableFields([]);
            }
        } catch (err) {
            console.error('Error fetching filterable fields:', err);
            setFieldsError(err instanceof Error ? err.message : 'Failed to load fields');
            setFilterableFields([]);
        } finally {
            setLoadingFields(false);
        }
    };

    const handleObjectSelect = (object: { name: string; label: string }) => {
        onObjectSelect(object);
        setFilters([]);
    };

    const handleReturnToObjectList = () => {
        onObjectSelect(null);
        setFilters([]);
        setFilterableFields([]);
    };

    const addNewFilter = () => {
        const newFilter: Filter = {
            field: null,
            operator: null,
            fieldValue: [],
            editing: true,
            picklistValues: []
        };
        setFilters(prev => [newFilter, ...prev]);
    };

    const cancelFilter = (index: number) => {
        setFilters(prev => {
            const newFilters = prev.filter((_, i) => i !== index);
            if (newFilters.length === 0 && selectedObject) {
                onObjectSelect(null);
            }
            return newFilters;
        });
    };

    const removeFilter = (index: number) => {
        setFilters(prev => {
            const newFilters = prev.filter((_, i) => i !== index);
            if (newFilters.length === 0 && selectedObject) {
                onObjectSelect(null);
            }
            return newFilters;
        });
    };

    const editFilter = (index: number) => {
        setFilters(prev => prev.map((filter, i) => 
            i === index ? { ...filter, editing: true } : filter
        ));
    };

    const saveFilter = (index: number, formData: {
        field: { label: string; value: FilterableField };
        operator: { label: string; value: '=' | '!=' };
        fieldValue: Array<{ label: string; value: any }>;
    }) => {
        setFilters(prev => prev.map((filter, i) => {
            if (i === index) {
                return {
                    field: formData.field,
                    operator: formData.operator,
                    fieldValue: formData.fieldValue,
                    editing: false,
                    picklistValues: formData.field.value.picklistValues || []
                };
            }
            return filter;
        }));
    };

    const handleFieldChange = (index: number, field: FilterableField) => {
        setFilters(prev => prev.map((filter, i) => {
            if (i === index) {
                return {
                    ...filter,
                    field: { label: field.label, value: field },
                    picklistValues: field.picklistValues || [],
                    fieldValue: [] 
                };
            }
            return filter;
        }));
    };

    return (
        <div className={`${styles.sidebar} ${sidebarCollapsed ? styles.sidebarCollapsed : ''}`}>
            <div className={styles.sidebarHeader}>
                {!sidebarCollapsed && <h3>Filters</h3>}
                <button
                    className={styles.sidebarToggle}
                    onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                    title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                    {sidebarCollapsed ? '→' : '←'}
                </button>
            </div>

            {!sidebarCollapsed && (
                <div className={styles.sidebarContent}>
                    {!selectedObject ? (
                        
                        <div className={styles.objectListSection}>
                            <h4 className={styles.sectionTitle}>Select Object</h4>
                            <p className={styles.sectionHint}>
                                Select an object to search within and add filters
                            </p>
                            <div className={styles.objectList}>
                                {configuredObjects.map((obj) => (
                                    <button
                                        key={obj.name}
                                        className={styles.objectListItem}
                                        onClick={() => handleObjectSelect(obj)}
                                    >
                                        {obj.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        
                        <div className={styles.filterSection}>
                            <div className={styles.filterSectionHeader}>
                                <h4 className={styles.sectionTitle}>
                                    {selectedObject.label} Filters
                                </h4>
                                <button
                                    className={styles.backButton}
                                    onClick={handleReturnToObjectList}
                                    title="Return to object list"
                                >
                                    ← Back
                                </button>
                            </div>

                            {loadingFields && (
                                <div className={styles.loadingFields}>
                                    <div className={styles.spinner}></div>
                                    <span>Loading filterable fields...</span>
                                </div>
                            )}

                            {fieldsError && (
                                <div className={styles.error}>
                                    {fieldsError}
                                </div>
                            )}

                            {!loadingFields && !fieldsError && filterableFields.length === 0 && (
                                <div className={styles.emptyState}>
                                    <p>No filterable fields available for this object.</p>
                                </div>
                            )}

                            {!loadingFields && !fieldsError && filterableFields.length > 0 && (
                                <>
                                    <button
                                        className={styles.addFilterButton}
                                        onClick={addNewFilter}
                                    >
                                        + Add Filter
                                    </button>

                                    <div className={styles.filtersList}>
                                        {filters.map((filter, index) => (
                                            <FilterItem
                                                key={index}
                                                filter={filter}
                                                filterableFields={filterableFields}
                                                onFieldChange={(field) => handleFieldChange(index, field)}
                                                onSave={(formData) => saveFilter(index, formData)}
                                                onCancel={() => cancelFilter(index)}
                                                onRemove={() => removeFilter(index)}
                                                onEdit={() => editFilter(index)}
                                            />
                                        ))}
                                    </div>

                                    {filters.length === 0 && (
                                        <div className={styles.emptyState}>
                                            <p>No filters added yet. Click "Add Filter" to create one.</p>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};


interface FilterItemProps {
    filter: Filter;
    filterableFields: FilterableField[];
    onFieldChange: (field: FilterableField) => void;
    onSave: (formData: {
        field: { label: string; value: FilterableField };
        operator: { label: string; value: '=' | '!=' };
        fieldValue: Array<{ label: string; value: any }>;
    }) => void;
    onCancel: () => void;
    onRemove: () => void;
    onEdit: () => void;
}

const FilterItem = ({
    filter,
    filterableFields,
    onFieldChange,
    onSave,
    onCancel,
    onRemove,
    onEdit
}: FilterItemProps) => {
    const [selectedField, setSelectedField] = useState<FilterableField | null>(filter.field?.value || null);
    const [selectedOperator, setSelectedOperator] = useState<'=' | '!=' | null>(
        filter.operator?.value || null
    );
    const [selectedValues, setSelectedValues] = useState<Array<{ label: string; value: any }>>(
        filter.fieldValue || []
    );

    const handleFieldSelect = (fieldName: string) => {
        const field = filterableFields.find(f => f.name === fieldName);
        if (field) {
            setSelectedField(field);
            setSelectedValues([]);
            onFieldChange(field);
        }
    };

    const handleOperatorSelect = (operator: '=' | '!=') => {
        setSelectedOperator(operator);
    };

    const handleValueToggle = (value: { label: string; value: any }) => {
        setSelectedValues(prev => {
            const exists = prev.find(v => v.value === value.value);
            if (exists) {
                return prev.filter(v => v.value !== value.value);
            } else {
                return [...prev, value];
            }
        });
    };

    const handleSave = () => {
        if (selectedField && selectedOperator && selectedValues.length > 0) {
            onSave({
                field: { label: selectedField.label, value: selectedField },
                operator: {
                    label: selectedOperator === '=' ? 'Equals' : 'Not equals',
                    value: selectedOperator
                },
                fieldValue: selectedValues
            });
        }
    };

    const handleCancel = () => {
        onCancel();
    };

    if (filter.editing) {
        
        return (
            <div className={styles.filterCardEditing}>
                <div className={styles.filterForm}>
                    <div className={styles.filterFormField}>
                        <label>Field</label>
                        <select
                            value={selectedField?.name || ''}
                            onChange={(e) => handleFieldSelect(e.target.value)}
                            className={styles.filterSelect}
                        >
                            <option value="">Choose a Field</option>
                            {filterableFields.map(field => (
                                <option key={field.name} value={field.name}>
                                    {field.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className={styles.filterFormField}>
                        <label>Operator</label>
                        <select
                            value={selectedOperator || ''}
                            onChange={(e) => handleOperatorSelect(e.target.value as '=' | '!=')}
                            className={styles.filterSelect}
                            disabled={!selectedField}
                        >
                            <option value="">Choose an Operator</option>
                            <option value="=">Equals</option>
                            <option value="!=">Not equals</option>
                        </select>
                    </div>

                    <div className={styles.filterFormField}>
                        <label>Field Values</label>
                        {selectedField ? (
                            <div className={styles.filterValuesList}>
                                {selectedField.picklistValues.map((option) => {
                                    const isSelected = selectedValues.some(v => v.value === option.value);
                                    return (
                                        <label key={option.value} className={styles.filterValueOption}>
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => handleValueToggle(option)}
                                            />
                                            <span>{option.label}</span>
                                        </label>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className={styles.filterHint}>
                                Select a field first
                            </div>
                        )}
                    </div>

                    <div className={styles.filterFormActions}>
                        <button
                            className={styles.filterCancelButton}
                            onClick={handleCancel}
                        >
                            Cancel
                        </button>
                        <button
                            className={styles.filterSaveButton}
                            onClick={handleSave}
                            disabled={!selectedField || !selectedOperator || selectedValues.length === 0}
                        >
                            Done
                        </button>
                    </div>
                </div>
            </div>
        );
    } else {
        return (
            <div className={styles.filterCard}>
                <div className={styles.filterCardHeader}>
                    <span className={styles.filterFieldName}>
                        {filter.field?.label || 'Unknown Field'}
                    </span>
                    <div className={styles.filterCardActions}>
                        <button
                            className={styles.filterEditButton}
                            onClick={onEdit}
                            title="Edit filter"
                        >
                            ✏️
                        </button>
                        <button
                            className={styles.filterRemoveButton}
                            onClick={onRemove}
                            title="Remove filter"
                        >
                            ✕
                        </button>
                    </div>
                </div>
                <div className={styles.filterCardContent}>
                    <div className={styles.filterOperator}>
                        {filter.operator?.label || 'Unknown'}:
                    </div>
                    <div className={styles.filterValues}>
                        {filter.fieldValue.map((value, idx) => (
                            <span key={idx} className={styles.filterBadge}>
                                {value.label}
                            </span>
                        ))}
                    </div>
                </div>
            </div>
        );
    }
};

export default QueryFilters;

