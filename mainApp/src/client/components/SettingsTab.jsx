import React, { useState } from 'react';
import '../app.css';
import './SettingsTab.css';
import EditConfigurationModal from './EditConfigurationModal.jsx';
import Button from './ui/Button';
import LoadingSpinner from './ui/LoadingSpinner.jsx';
import { useTaskConfig } from '../context/TaskConfigContext.jsx';

export default function SettingsTab({ isAuthenticated }) {
    const {
        availableTaskTypes = [],
        selectedTaskTypes = [],
        isLoading,
        error: contextError,
        saveTaskTypes
    } = useTaskConfig();
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [pendingTaskTypes, setPendingTaskTypes] = useState([]);
    const [statusMessage, setStatusMessage] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const startEditTaskTypes = () => {
        setPendingTaskTypes([...(selectedTaskTypes || [])]);
        setShowAddDialog(true);
        setStatusMessage('');
    };

    const handleSaveSelectedTaskTypes = async () => {
        setIsSaving(true);
        setStatusMessage('');

        const result = await saveTaskTypes(pendingTaskTypes);

        setIsSaving(false);

        if (result.success) {
            setShowAddDialog(false);
            setPendingTaskTypes([]);
            setStatusMessage('✅ Task types configuration saved successfully!');
            setTimeout(() => setStatusMessage(''), 3000);
        } else {
            setStatusMessage('❌ ' + (result.error || 'Failed to save configuration'));
        }
    };

    const cancelAddDialog = () => {
        setShowAddDialog(false);
        setPendingTaskTypes([]);
        setStatusMessage('');
    };

    if (!isAuthenticated) {
        return (
            <div className="alert alert-warning">
                <h3>🔐 Connection Required</h3>
                <p>Please connect to Salesforce first in the Connection tab to configure task type synchronization.</p>
            </div>
        );
    }


    return (
        <div>
            <div className="settings-header">
                <div>
                    <h2>📋 Task Type Configuration</h2>
                    <p>Configure which ServiceNow task types (tables) should be synchronized with Salesforce.</p>
                </div>
            </div>

            {isLoading ? (
                <div className="loading">
                    <LoadingSpinner size="xlarge" />
                </div>
            ) : (
                <div className="settings-section">
                    <div className="settings-section-header">
                        <h3>📌 Selected Task Types for synchronization</h3>
                        <Button
                            variant="primary"
                            onClick={startEditTaskTypes}
                            disabled={isLoading || isSaving}
                            title="Edit task types configuration"
                        >
                            ✏️ Edit
                        </Button>
                    </div>

                    {(selectedTaskTypes || []).length > 0 ? (
                        <div className="selected-task-types-container">
                            <div className="task-types-list">
                                {selectedTaskTypes.map((taskType) => (
                                    <div
                                        key={taskType.table_name}
                                        className="task-type-chip"
                                    >
                                        <span className="task-type-label">
                                            <strong>{taskType.table_label}</strong>
                                            <small className="task-type-name">
                                                ({taskType.table_name})
                                            </small>
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="alert alert-info">
                            <p>📋 You haven't added task types for synchronization yet.</p>
                            <p>Click "Edit" to configure which ServiceNow task tables should sync with Salesforce.</p>
                        </div>
                    )}

                    {contextError && (
                        <div className="alert alert-error alert-error-top-margin">
                            {contextError}
                        </div>
                    )}

                    {statusMessage && !statusMessage.startsWith('✅') && (
                        <div className="alert alert-error alert-error-top-margin">
                            {statusMessage}
                        </div>
                    )}
                </div>
            )}

            {statusMessage && statusMessage.startsWith('✅') && (
                <div className="alert alert-success">
                    {statusMessage}
                </div>
            )}

            {showAddDialog && (
                <EditConfigurationModal
                    availableTaskTypes={availableTaskTypes}
                    pendingTaskTypes={pendingTaskTypes}
                    setPendingTaskTypes={setPendingTaskTypes}
                    loading={isSaving}
                    onSave={handleSaveSelectedTaskTypes}
                    onCancel={cancelAddDialog}
                />
            )}
        </div>
    );
}