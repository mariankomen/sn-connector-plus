import { useEffect, useState } from "react";
import styles from '../Link.module.css';
import type { IRecordModalProps } from "../../interfaces/IRecordModal";
import RecordModal from "../RecordModal";

interface LinkRecord {
    sys_id: string;
    servicenow_table: string;
    servicenow_sys_id: string;
    sf_object_type: string;
    sf_record_id: string;
}

interface ColumnMetadata {
    name: string;
    label: string;
    order: number;
}

interface SalesforceRecordData {
    link: LinkRecord;
    record: any | null;
    error?: string;
    objectType: string;
    objectLabel: string;
    displayFields: string[];
    columns?: ColumnMetadata[];
}

interface ExistingLinksTableProps {
    servicenowTable?: string;
    servicenowSysId?: string;
    onLinkDeleted?: () => void;
}

const ExistingLinksTable = ({ servicenowTable, servicenowSysId, onLinkDeleted }: ExistingLinksTableProps) => {
    const [linkedRecords, setLinkedRecords] = useState<SalesforceRecordData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [deletingRecords, setDeletingRecords] = useState<Set<string>>(new Set());
    const [deleteErrors, setDeleteErrors] = useState<{ [sysId: string]: string }>({});
    const [recordModalOpen, setRecordModalOpen] = useState<IRecordModalProps | null>(null);

    const handleViewRecord = (recordData: SalesforceRecordData) => {
        setRecordModalOpen({
            sf_object_type: recordData.link.sf_object_type,
            sf_record_id: recordData.link.sf_record_id
        });
    };

    const handleCloseModal = () => {
        setRecordModalOpen(null);
    };
    const fetchLinkedRecords = async () => {
        if (!servicenowSysId) {
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const params = new URLSearchParams({
                servicenow_sys_id: servicenowSysId
            });
            if (servicenowTable) {
                params.append('servicenow_table', servicenowTable);
            }

            const response = await fetch(
                `/api/x_1955226_peeklo_1/x_1955226_peeklo_1_salesforce_integratio/salesforce/record-link?${params.toString()}`,
                {
                    headers: {
                        'Accept': 'application/json',
                        'X-UserToken': window.g_ck || ''
                    }
                }
            );

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to fetch linked records');
            }

            const data = await response.json();
            const result = data.result || data;
            
            if (result.success) {
                setLinkedRecords(result.records || []);
            } else {
                throw new Error(result.error || 'Failed to fetch linked records');
            }
        } catch (err) {
            console.error('Error fetching linked records:', err);
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLinkedRecords();
    }, [servicenowSysId, servicenowTable]);

    const handleUnlink = async (link: LinkRecord) => {
        const sysId = link.sys_id;
        setDeletingRecords(prev => new Set(prev).add(sysId));
        setDeleteErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors[sysId];
            return newErrors;
        });

        try {
            const response = await fetch(
                '/api/x_1955226_peeklo_1/x_1955226_peeklo_1_salesforce_integratio/salesforce/record-link/delete',
                {
                    method: 'POST',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json',
                        'X-UserToken': window.g_ck || ''

                    },
                    body: JSON.stringify({
                        sys_id: sysId
                    })
                }
            );

            let data;
            try {
                data = await response.json();
            } catch (jsonErr) {
                throw new Error('Failed to parse response');
            }

            const result = data.result || data;
            const isSuccess = response.ok && (result.success === true || result.success === 'true');

            if (isSuccess) {
                
                setLinkedRecords(prev => prev.filter(recordData => recordData.link.sys_id !== sysId));
                
                
                setDeleteErrors(prev => {
                    const newErrors = { ...prev };
                    delete newErrors[sysId];
                    return newErrors;
                });

                
                if (onLinkDeleted) {
                    onLinkDeleted();
                }
            } else {
                
                const errorData = result.results?.[0] || result;
                const errorMessage = errorData.error || result.error || data.error || 'Failed to unlink record';
                setDeleteErrors(prev => ({
                    ...prev,
                    [sysId]: errorMessage
                }));
            }
        } catch (err) {
            console.error('Error unlinking record:', err);
            setDeleteErrors(prev => ({
                ...prev,
                [sysId]: err instanceof Error ? err.message : 'An error occurred'
            }));
        } finally {
            setDeletingRecords(prev => {
                const newSet = new Set(prev);
                newSet.delete(sysId);
                return newSet;
            });
        }
    };

    
    const groupedRecords: { [key: string]: SalesforceRecordData[] } = {};
    linkedRecords.forEach(recordData => {
        const objectType = recordData.objectType;
        if (!groupedRecords[objectType]) {
            groupedRecords[objectType] = [];
        }
        groupedRecords[objectType].push(recordData);
    });

    const getFieldValue = (record: any, fieldKey: string): string => {
        if (!record || !fieldKey) return '-';
        const value = record[fieldKey];
        if (value === null || value === undefined) return '-';
        if (typeof value === 'object') return JSON.stringify(value);
        return String(value);
    };

    const getFieldUrl = (record: any, fieldKey: string): string | null => {
        if (!record || !fieldKey) return null;
        const urlFieldName = fieldKey + '_url';
        return record[urlFieldName] || null;
    };

    const renderFieldValue = (record: any, fieldKey: string) => {
        const value = getFieldValue(record, fieldKey);
        const url = getFieldUrl(record, fieldKey);
        
        if (url) {
            return (
                <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                        color: '#0066cc',
                        textDecoration: 'none'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.textDecoration = 'underline'}
                    onMouseOut={(e) => e.currentTarget.style.textDecoration = 'none'}
                >
                    {value} <span style={{ fontSize: '12px' }}>🔗</span>
                </a>
            );
        }
        
        return <span>{value}</span>;
    };

    if (loading) {
        return (
            <div className={styles.loadingContainer}>
                <div className={styles.spinner}></div>
                <span className={styles.loadingText}>Loading linked records...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.error}>
                Error: {error}
            </div>
        );
    }

    if (linkedRecords.length === 0) {
        return (
            <div className={styles.emptyState}>
                <p>No linked Salesforce records found for this ServiceNow record.</p>
            </div>
        );
    }

    return (
        <div className={styles.existingLinksContainer}>
            <h2 className={styles.sectionTitle}>Linked Salesforce Records ({linkedRecords.length})</h2>
            
            {Object.keys(groupedRecords).map((objectType) => {
                const records = groupedRecords[objectType];
                const firstRecord = records[0];
                
                
                let columns: { key: string; label: string }[] = [];
                if (firstRecord.columns && firstRecord.columns.length > 0) {
                    
                    const sortedColumns = [...firstRecord.columns].sort((a, b) => a.order - b.order);
                    columns = sortedColumns.map(col => ({
                        key: col.name,
                        label: col.label || col.name
                    }));
                } else if (firstRecord.displayFields && firstRecord.displayFields.length > 0) {
                    
                    columns = firstRecord.displayFields.map(field => ({
                        key: field,
                        label: field
                    }));
                }
                
                return (
                    <div key={objectType} className={styles.objectTableGroup}>
                        <h3 className={styles.objectTableTitle}>
                            {firstRecord.objectLabel} ({records.length})
                        </h3>
                        <div className={styles.tableWrapper}>
                            <table className={styles.recordTable}>
                                <thead>
                                    <tr>
                                        {columns.map((column) => (
                                            <th key={column.key} className={styles.tableHeader}>
                                                {column.label}
                                            </th>
                                        ))}
                                        <th key="action" className={styles.tableHeader}>
                                            Action
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {records.map((recordData) => {
                                        const isDeleting = deletingRecords.has(recordData.link.sys_id);
                                        const deleteError = deleteErrors[recordData.link.sys_id];
                                        
                                        if (recordData.error || !recordData.record) {
                                            return (
                                                <tr key={recordData.link.sys_id} className={styles.tableRow}>
                                                    <td colSpan={columns.length + 1} className={styles.tableCell}>
                                                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                                                            <span className={styles.errorText}>
                                                                {recordData.error || 'Record not found'}
                                                            </span>
                                                            <span className={styles.recordId}>
                                                                (ID: {recordData.link.sf_record_id})
                                                            </span>
                                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                                <button
                                                                    className={styles.viewButton}
                                                                    onClick={() => handleViewRecord(recordData)}
                                                                    title="View record details"
                                                                >
                                                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                                        <path d="M8 3C4.667 3 2.073 5.56 1 8c1.073 2.44 3.667 5 7 5s5.927-2.56 7-5c-1.073-2.44-3.667-5-7-5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                                                        <path d="M8 10a2 2 0 100-4 2 2 0 000 4z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                                                    </svg>
                                                                </button>
                                                                <button
                                                                    className={styles.unlinkButton}
                                                                    onClick={() => handleUnlink(recordData.link)}
                                                                    disabled={isDeleting}
                                                                    title="Unlink this record"
                                                                >
                                                                    {isDeleting ? 'Unlinking...' : 'Unlink'}
                                                                </button>
                                                            </div>
                                                        </div>
                                                        {deleteError && (
                                                            <div className={styles.connectionError}>
                                                                {deleteError}
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        }
                                        
                                        return (
                                            <tr key={recordData.link.sys_id} className={styles.tableRow}>
                                                {columns.map((column) => (
                                                    <td key={column.key} className={styles.tableCell}>
                                                        {renderFieldValue(recordData.record, column.key)}
                                                    </td>
                                                ))}
                                                <td className={styles.tableCell} onClick={(e) => e.stopPropagation()}>
                                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                        <button
                                                            className={styles.viewButton}
                                                            onClick={() => handleViewRecord(recordData)}
                                                            title="View record details"
                                                        >
                                                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                                <path d="M8 3C4.667 3 2.073 5.56 1 8c1.073 2.44 3.667 5 7 5s5.927-2.56 7-5c-1.073-2.44-3.667-5-7-5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                                                <path d="M8 10a2 2 0 100-4 2 2 0 000 4z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                                            </svg>
                                                        </button>
                                                        <button
                                                            className={styles.unlinkButton}
                                                            onClick={() => handleUnlink(recordData.link)}
                                                            disabled={isDeleting}
                                                            title="Unlink this record"
                                                        >
                                                            {isDeleting ? 'Unlinking...' : 'Unlink'}
                                                        </button>
                                                    </div>
                                                    {deleteError && (
                                                        <div className={styles.connectionError}>
                                                            {deleteError}
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                );
            })}
            
            {recordModalOpen && (
                <div className={styles.modalOverlay} onClick={handleCloseModal}>
                    <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h2>{recordModalOpen.sf_object_type} {recordModalOpen.sf_record_id}</h2>
                            <button className={styles.closeButton} onClick={handleCloseModal}>
                                ×
                            </button>
                        </div>
                        <RecordModal
                            sf_object_type={recordModalOpen.sf_object_type}
                            sf_record_id={recordModalOpen.sf_record_id}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExistingLinksTable;
