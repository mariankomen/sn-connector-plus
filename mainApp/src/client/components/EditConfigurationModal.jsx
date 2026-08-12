import React, { useMemo, useState } from 'react';
import '../app.css';
import './EditConfigurationModal.css';
import Button from './ui/Button';

export default function EditConfigurationModal({
    availableTaskTypes,
    pendingTaskTypes,
    setPendingTaskTypes,
    loading,
    onSave,
    onCancel
}) {
    const [searchQuery, setSearchQuery] = useState('');

    const normalizedQuery = searchQuery.trim().toLowerCase();

    const filteredTaskTypes = useMemo(() => {
        if (!normalizedQuery) {
            return availableTaskTypes;
        }

        return availableTaskTypes.filter((taskType) => {
            const label = (taskType.label || '').toLowerCase();
            const name = (taskType.name || '').toLowerCase();

            return label.includes(normalizedQuery) || name.includes(normalizedQuery);
        });
    }, [availableTaskTypes, normalizedQuery]);

    const togglePendingTaskType = (taskType) => {
        const isSelected = pendingTaskTypes.some(pt => pt.table_name === taskType.name);

        if (isSelected) {
            setPendingTaskTypes(pendingTaskTypes.filter(pt => pt.table_name !== taskType.name));
        } else {
            setPendingTaskTypes([...pendingTaskTypes, {
                table_name: taskType.name,
                table_label: taskType.label
            }]);
        }
    };

    const toggleSelectAll = () => {
        const allSelected = pendingTaskTypes.length === availableTaskTypes.length;
        
        if (allSelected) {
            setPendingTaskTypes([]);
        } else {
            const allTaskTypes = availableTaskTypes.map(taskType => ({
                table_name: taskType.name,
                table_label: taskType.label
            }));
            setPendingTaskTypes(allTaskTypes);
        }
    };

    const isAllSelected = pendingTaskTypes.length === availableTaskTypes.length && availableTaskTypes.length > 0;
    const hasNoMatches = filteredTaskTypes.length === 0;

    const handleSearchChange = (event) => {
        setSearchQuery(event.target.value);
    };

    const handleClearSearch = () => {
        setSearchQuery('');
    };

    return (
        <div className="dialog-overlay">
            <div className="dialog-content">
                <div className="dialog-header">
                    <h3>✏️ Edit Task Types Configuration</h3>
                    <button className="dialog-close" onClick={onCancel} aria-label="Close">
                        ✕
                    </button>
                </div>
                <p className="dialog-description">
                    Select task types to synchronize with Salesforce.
                    Selected types will be monitored for Create, Update, and Delete operations.
                </p>

                <div className="task-types-selector">
                    <div className="select-all-container">
                        <div className="select-all-search-row">
                            <label className="select-all-label">
                                <input
                                    type="checkbox"
                                    checked={isAllSelected}
                                    onChange={toggleSelectAll}
                                    className="select-all-checkbox"
                                />
                                <span>{isAllSelected ? 'Unselect all' : 'Select all'}</span>
                            </label>

                            <div className="task-search-wrapper">
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={handleSearchChange}
                                    placeholder="Search task types..."
                                    className="task-search-input"
                                    aria-label="Search task types"
                                />
                                <button
                                    type="button"
                                    className="task-search-clear"
                                    onClick={handleClearSearch}
                                    disabled={!searchQuery}
                                >
                                    Clear
                                </button>
                            </div>
                        </div>
                    </div>
                    <h4>All Task Types:</h4>
                    <div className="task-types-list-container">
                        {hasNoMatches ? (
                            <div className="task-types-empty-state">
                                No task types match “{searchQuery}”
                            </div>
                        ) : (
                            filteredTaskTypes.map((taskType) => {
                                const isSelected = pendingTaskTypes.some(pt => pt.table_name === taskType.name);
                                return (
                                    <div
                                        key={taskType.name}
                                        onClick={() => togglePendingTaskType(taskType)}
                                        className={`task-type-item ${isSelected ? 'selected' : ''}`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => { }}
                                            className="task-type-checkbox"
                                        />
                                        <div>
                                            <strong>{taskType.label}</strong>
                                            <br />
                                            <small className="settings-description">
                                                Table: {taskType.name}
                                            </small>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {pendingTaskTypes.length > 0 && (
                    <div className="pending-selection">
                        <strong>Selected ({pendingTaskTypes.length}):</strong>
                        <div className="pending-selection-list">
                            {pendingTaskTypes.map(pt => pt.table_label).join(', ')}
                        </div>
                    </div>
                )}

                <div className="dialog-actions">
                    <Button
                        variant="secondary"
                        onClick={onCancel}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="success"
                        onClick={onSave}
                        disabled={loading}
                        loading={loading}
                    >
                        Save
                    </Button>
                </div>
            </div>
        </div>
    );
}

