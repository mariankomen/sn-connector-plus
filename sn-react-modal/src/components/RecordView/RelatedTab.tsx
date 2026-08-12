import { useEffect, useState, useCallback } from "react";
import type { IRecordModalProps } from "../../interfaces/IRecordModal";
import styles from "../Feeds.module.css";

interface RelatedRecord {
    [key: string]: any;
}

interface RelatedRecordsData {
    relationship_name: string;
    relationship_label: string;
    child_object_name: string;
    relationship_field?: string;
    success: boolean;
    totalSize: number;
    records: RelatedRecord[];
    columns: string[];
    soql_query?: string;
    query_status?: number;
    error?: string;
    column_labels?: { [columnName: string]: string };
}

interface RelatedRecordsResponse {
    success: boolean;
    object_name: string;
    record_id: string;
    total_relationships: number;
    total_records: number;
    related_records: {
        [relationshipName: string]: RelatedRecordsData;
    };
}

const ITEMS_PER_PAGE = 10;

const isNotQueryableRelationship = (relationshipData: RelatedRecordsData & { [key: string]: any }): boolean => {
    if (!relationshipData || relationshipData.success) {
        return false;
    }

    const errorMessage = (relationshipData.error || "").toLowerCase();
    const errorDetails = relationshipData.error_details;

    if (errorMessage.includes("does not support query")) {
        return true;
    }

    if (Array.isArray(errorDetails) && errorDetails.length > 0) {
        const firstError = errorDetails[0];
        if (firstError && typeof firstError.errorCode === "string" && firstError.errorCode === "INVALID_TYPE_FOR_OPERATION") {
            return true;
        }
    }

    return false;
};

const RelatedTab = ({ sf_object_type, sf_record_id }: IRecordModalProps) => {
    const [loading, setLoading] = useState<boolean>(true);
    const [data, setData] = useState<RelatedRecordsResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    
    const [pagination, setPagination] = useState<{ [key: string]: number }>({});

    const fetchRelatedRecords = useCallback(async (objectName: string, recordId: string) => {
        try {
            setLoading(true);
            setError(null);

            const url = `/api/x_peekl_salesfor_0/x_peekl_salesfor_0_salesforce_integratio/salesforce/related-records?object_name=${encodeURIComponent(objectName)}&record_id=${encodeURIComponent(recordId)}`;
            
            const response = await fetch(url, {
                headers: {
                    "Accept": "application/json",
                    'X-UserToken': window.g_ck || ''
                },
            });

            const responseData = await response.json();

            if (!response.ok || !responseData.success) {
                throw new Error(responseData.error || "Failed to fetch related records");
            }

            setData(responseData);
        } catch (err: any) {
            console.error("Error fetching related records:", err);
            setError(err.message || "Failed to load related records");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (sf_object_type && sf_record_id) {
            fetchRelatedRecords(sf_object_type, sf_record_id);
        }
    }, [sf_object_type, sf_record_id, fetchRelatedRecords]);

    const formatCellValue = (value: any): string => {
        if (value === null || value === undefined) return '-';
        if (typeof value === 'boolean') return value ? 'Yes' : 'No';
        if (typeof value === 'object') return JSON.stringify(value);
        if (typeof value === 'string' && value.includes('T') && value.includes('Z')) {
            
            try {
                const date = new Date(value);
                return date.toLocaleString();
            } catch {
                return value;
            }
        }
        return String(value);
    };

    const getCurrentPage = (relationshipName: string): number => {
        return pagination[relationshipName] || 1;
    };

    const setCurrentPage = (relationshipName: string, page: number) => {
        setPagination(prev => ({
            ...prev,
            [relationshipName]: page
        }));
    };

    const getPaginatedRecords = (records: RelatedRecord[], relationshipName: string) => {
        const currentPage = getCurrentPage(relationshipName);
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;
        return records.slice(startIndex, endIndex);
    };

    const getTotalPages = (recordsCount: number): number => {
        return Math.ceil(recordsCount / ITEMS_PER_PAGE);
    };

    if (loading) {
        return (
            <div className={styles.loadingContainer}>
                <div className={styles.spinner}></div>
                <p className={styles.loadingText}>Loading related records...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.errorContainer}>
                <p className={styles.errorText}>{error}</p>
            </div>
        );
    }

    if (!data || !data.related_records || Object.keys(data.related_records).length === 0) {
        return (
            <div className={styles.emptyState}>
                <p className={styles.emptyStateText}>No related records found</p>
                <p className={styles.emptyStateHint}>There are no related records configured for this object.</p>
            </div>
        );
    }

    const relationshipEntries = Object.entries(data.related_records);

    return (
        <div className={styles.feedsContainer} style={{ padding: '20px' }}>
            <div style={{ marginBottom: '20px', paddingBottom: '16px', borderBottom: '2px solid #DFE1E6' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#172B4D', margin: 0 }}>
                    Related Records
                </h2>
                <p style={{ fontSize: '14px', color: '#6B778C', margin: '4px 0 0 0' }}>
                    {data.total_relationships} relationship{data.total_relationships !== 1 ? 's' : ''} • {data.total_records} total record{data.total_records !== 1 ? 's' : ''}
                </p>
            </div>

            {relationshipEntries.map(([relationshipName, relationshipData]) => {
                const notQueryable = isNotQueryableRelationship(relationshipData as any);

                if (!relationshipData.success && !notQueryable) {
                    return (
                        <div key={relationshipName} style={{ 
                            marginBottom: '24px', 
                            padding: '16px', 
                            backgroundColor: '#FFEBE6', 
                            border: '1px solid #FF5630', 
                            borderRadius: '4px' 
                        }}>
                            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#DE350B', margin: '0 0 8px 0' }}>
                                {relationshipData.relationship_label || relationshipName}
                            </h3>
                            <p style={{ fontSize: '14px', color: '#DE350B', margin: 0 }}>
                                Error: {relationshipData.error || 'Unknown error'}
                            </p>
                        </div>
                    );
                }

                const records = relationshipData.records || [];
                const columns = relationshipData.columns || [];
                const columnLabels = relationshipData.column_labels || {};
                const currentPage = getCurrentPage(relationshipName);
                const totalPages = getTotalPages(records.length);
                const paginatedRecords = getPaginatedRecords(records, relationshipName);
                const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
                const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, records.length);

                return (
                    <div key={relationshipName} style={{ marginBottom: '32px' }}>
                        <div style={{ 
                            marginBottom: '12px', 
                            paddingBottom: '8px', 
                            borderBottom: '1px solid #DFE1E6',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#172B4D', margin: 0 }}>
                                {relationshipData.relationship_label || relationshipName}
                                {records.length > 0 && (
                                    <span style={{ 
                                        fontSize: '14px', 
                                        fontWeight: 400, 
                                        color: '#6B778C',
                                        marginLeft: '8px'
                                    }}>
                                        ({records.length})
                                    </span>
                                )}
                            </h3>
                            {relationshipData.child_object_name && (
                                <span style={{ 
                                    fontSize: '12px', 
                                    color: '#6B778C',
                                    fontStyle: 'italic'
                                }}>
                                    {relationshipData.child_object_name}
                                </span>
                            )}
                        </div>

                        {records.length === 0 ? (
                            <div style={{ 
                                padding: '20px', 
                                backgroundColor: '#F4F5F7', 
                                borderRadius: '4px',
                                textAlign: 'center'
                            }}>
                                <p style={{ fontSize: '14px', color: '#6B778C', margin: 0 }}>
                                    {notQueryable ? '(no records or table is not queryable)' : 'No records found'}
                                </p>
                            </div>
                        ) : (
                            <>
                                <div style={{ 
                                    overflowX: 'auto', 
                                    overflowY: 'visible',
                                    width: '100%',
                                    WebkitOverflowScrolling: 'touch'
                                }}>
                                    <table style={{
                                        minWidth: '100%',
                                        width: 'max-content',
                                        borderCollapse: 'collapse',
                                        backgroundColor: '#FFFFFF',
                                        border: '1px solid #DFE1E6',
                                        borderRadius: '4px',
                                        overflow: 'hidden'
                                    }}>
                                        <thead>
                                            <tr style={{ backgroundColor: '#F4F5F7' }}>
                                                {columns.map((column) => (
                                                    <th
                                                        key={column}
                                                        style={{
                                                            padding: '12px 16px',
                                                            textAlign: 'left',
                                                            fontWeight: 600,
                                                            fontSize: '14px',
                                                            color: '#172B4D',
                                                            borderBottom: '2px solid #DFE1E6',
                                                            whiteSpace: 'nowrap',
                                                            minWidth: '100px'
                                                        }}
                                                    >
                                                        {columnLabels[column] || column}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {paginatedRecords.map((record, index) => (
                                                <tr
                                                    key={record.Id || index}
                                                    style={{
                                                        borderBottom: index < paginatedRecords.length - 1 ? '1px solid #DFE1E6' : 'none'
                                                    }}
                                                >
                                                    {columns.map((column) => {
                                                        const cellValue = formatCellValue(record[column]);
                                                        const urlFieldName = column + '_url';
                                                        const hasUrl = record[urlFieldName];
                                                        
                                                        return (
                                                            <td
                                                                key={column}
                                                                style={{
                                                                    padding: '12px 16px',
                                                                    fontSize: '14px',
                                                                    color: '#172B4D',
                                                                    whiteSpace: 'nowrap',
                                                                    maxWidth: '300px',
                                                                    overflow: 'hidden',
                                                                    textOverflow: 'ellipsis'
                                                                }}
                                                                title={cellValue}
                                                            >
                                                                {hasUrl ? (
                                                                    <a
                                                                        href={record[urlFieldName]}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        style={{
                                                                            color: '#0066cc',
                                                                            textDecoration: 'none'
                                                                        }}
                                                                        onMouseOver={(e) => e.currentTarget.style.textDecoration = 'underline'}
                                                                        onMouseOut={(e) => e.currentTarget.style.textDecoration = 'none'}
                                                                    >
                                                                        {cellValue} <span style={{ fontSize: '12px' }}>🔗</span>
                                                                    </a>
                                                                ) : (
                                                                    <span>{cellValue}</span>
                                                                )}
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {totalPages > 1 && (
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        marginTop: '16px',
                                        padding: '12px 16px',
                                        backgroundColor: '#F4F5F7',
                                        borderRadius: '4px'
                                    }}>
                                        <div style={{ fontSize: '14px', color: '#6B778C' }}>
                                            Showing {startIndex + 1} to {endIndex} of {records.length} records
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <button
                                                onClick={() => setCurrentPage(relationshipName, currentPage - 1)}
                                                disabled={currentPage === 1}
                                                style={{
                                                    padding: '6px 12px',
                                                    fontSize: '14px',
                                                    fontWeight: 500,
                                                    color: currentPage === 1 ? '#6B778C' : '#172B4D',
                                                    backgroundColor: currentPage === 1 ? '#F4F5F7' : '#FFFFFF',
                                                    border: '1px solid #DFE1E6',
                                                    borderRadius: '3px',
                                                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                                                    opacity: currentPage === 1 ? 0.6 : 1
                                                }}
                                            >
                                                Previous
                                            </button>
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                                fontSize: '14px',
                                                color: '#172B4D'
                                            }}>
                                                <span style={{ padding: '0 8px' }}>
                                                    Page {currentPage} of {totalPages}
                                                </span>
                                            </div>
                                            <button
                                                onClick={() => setCurrentPage(relationshipName, currentPage + 1)}
                                                disabled={currentPage === totalPages}
                                                style={{
                                                    padding: '6px 12px',
                                                    fontSize: '14px',
                                                    fontWeight: 500,
                                                    color: currentPage === totalPages ? '#6B778C' : '#172B4D',
                                                    backgroundColor: currentPage === totalPages ? '#F4F5F7' : '#FFFFFF',
                                                    border: '1px solid #DFE1E6',
                                                    borderRadius: '3px',
                                                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                                                    opacity: currentPage === totalPages ? 0.6 : 1
                                                }}
                                            >
                                                Next
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

export default RelatedTab;
