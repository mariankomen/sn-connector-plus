import { useEffect, useState, useCallback } from "react";
import styles from '../Link.module.css';
import QueryFilters from './QueryFilters';
import { buildWhereClause } from './queryUtils';
import type { Filter } from './queryUtils';

interface MatchedFieldValue {
    field: string;
    value: string;
}

interface SalesforceRecord {
    Id: string;
    Name?: string;
    Name__c?: string;
    attributes?: {
        type: string;
        url: string;
    };
    matchedFields?: string[]; 
    matchedFieldValues?: MatchedFieldValue[]; 
    [key: string]: any;
}

interface ColumnMetadata {
    name: string;
    label: string;
    order: number;
}

interface GroupedRecord {
    objectType: string;
    objectLabel: string;
    nameField: string;
    columns?: ColumnMetadata[];
    records: SalesforceRecord[];
}

interface GroupedRecords {
    [objectType: string]: GroupedRecord;
}

interface TableColumn {
    key: string;
    label: string;
}

interface RecordTableProps {
    servicenowTable?: string;
    servicenowSysId?: string;
    onRecordLinked?: (link: any) => void;
}

const RecordTable = ({ servicenowTable, servicenowSysId, onRecordLinked }: RecordTableProps) => {
    const [records, setRecords] = useState<SalesforceRecord[]>([]);
    const [groupedRecords, setGroupedRecords] = useState<GroupedRecords>({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [searchedObjects, setSearchedObjects] = useState<string[]>([]);
    const [currentPages, setCurrentPages] = useState<{ [objectType: string]: number }>({});
    const [connectingRecords, setConnectingRecords] = useState<Set<string>>(new Set());
    const [connectionErrors, setConnectionErrors] = useState<{ [recordId: string]: string }>({});
    const [linkedRecords, setLinkedRecords] = useState<Set<string>>(new Set());
    const [selectedObject, setSelectedObject] = useState<{ name: string; label: string } | null>(null);
    const [filters, setFilters] = useState<Filter[]>([]);
    const [configuredObjects, setConfiguredObjects] = useState<Array<{ name: string; label: string }>>([]);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const ROWS_PER_PAGE = 15;

    useEffect(() => {
        const fetchConfiguredObjects = async () => {
            try {
                const response = await fetch(
                    '/api/x_peekl_salesfor_0/x_peekl_salesfor_0_salesforce_integratio/salesforce/objects',
                    {
                        headers: {
                            'Accept': 'application/json',
                            'X-UserToken': window.g_ck || ''
                        }
                    }
                );

                if (!response.ok) {
                    throw new Error('Failed to fetch configured objects');
                }

                const data = await response.json();
                const objects = data.objects || data.result?.objects || [];
                const validObjects = objects
                    .filter((obj: any) => obj.sys_id && obj.sf_object_name)
                    .map((obj: any) => ({
                        name: obj.sf_object_name,
                        label: obj.sf_object_label || obj.sf_object_name
                    }));
                
                setConfiguredObjects(validObjects);
            } catch (err) {
                console.error('Error fetching configured objects:', err);
            }
        };

        fetchConfiguredObjects();
    }, []);

    const performSearch = async (searchTerm: string) => {
        setLoading(true);
        setError(null);

        try {
           
            if (!searchTerm || searchTerm.trim().length < 2) {
               
                setRecords([]);
                setGroupedRecords({});
                setLoading(false);
                return;
            }

            const whereClause = filters.length > 0 ? buildWhereClause(filters) : null;

            const requestBody: any = {
                q: searchTerm.trim(),
                limit: selectedObject ? 200 : 20,
                servicenow_sys_id: servicenowSysId || null,
                servicenow_table: servicenowTable || null
            };

           
            if (selectedObject) {
                requestBody.object = selectedObject.name;
            }

           
            if (selectedObject && whereClause) {
                requestBody.filters = { [selectedObject.name]: whereClause };
            }
            const response = await fetch(
                '/api/x_peekl_salesfor_0/x_peekl_salesfor_0_salesforce_integratio/salesforce/search/all',
                {
                    method: 'POST',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json',
                        'X-UserToken': window.g_ck || ''
                    },
                    body: JSON.stringify(requestBody)
                }
            );

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to search records');
            }

            const data = await response.json();
            
            if (data.success) {
                setRecords(data.searchRecords || []);
                setGroupedRecords(data.groupedByObject || {});
                setSearchedObjects(data.searchedObjects || []);
                setCurrentPages({});
            } else {
                throw new Error(data.error || 'Search failed');
            }
        } catch (err) {
            console.error('Search error:', err);
            setError(err instanceof Error ? err.message : 'An error occurred');
            setRecords([]);
            setGroupedRecords({});
        } finally {
            setLoading(false);
        }
    };

    
    const debouncedSearch = useCallback(
        (() => {
            let timeoutId: number | null = null;
            return (searchTerm: string) => {
                if (timeoutId) {
                    clearTimeout(timeoutId);
                }
                timeoutId = window.setTimeout(() => {
                    
                    performSearch(searchTerm);
                }, 300); 
            };
        })(),
        [filters, selectedObject]
    );

   
    useEffect(() => {
        if (search.trim().length >= 2) {
            debouncedSearch(search);
        } else {
            setRecords([]);
            setGroupedRecords({});
            setError(null);
        }
    }, [search, debouncedSearch]);

   
    const getFieldValue = (record: SalesforceRecord, fieldKey: string): string => {
        if (!fieldKey || !record) return '';
        
      
        if (fieldKey === 'matchedFields') {
            if (record.matchedFieldValues && record.matchedFieldValues.length > 0) {
                
                return record.matchedFieldValues
                    .map(mfv => `${mfv.field}: ${mfv.value}`)
                    .join(' | ');
            }
            return '';
        }
        
        const keys = fieldKey.split('.');
        let value: any = record;
        for (const key of keys) {
            if (value && typeof value === 'object') {
                value = value[key];
            } else {
                return '';
            }
        }
        
        if (value === null || value === undefined) return '';
        if (typeof value === 'object') return JSON.stringify(value);
        return String(value);
    };


    const getPageForObject = (objectType: string): number => {
        return currentPages[objectType] || 1;
    };

    const setPageForObject = (objectType: string, page: number) => {
        setCurrentPages(prev => ({
            ...prev,
            [objectType]: page
        }));
    };

    const getPaginatedRecords = (records: SalesforceRecord[], objectType: string): SalesforceRecord[] => {
        const currentPage = getPageForObject(objectType);
        const startIndex = (currentPage - 1) * ROWS_PER_PAGE;
        const endIndex = startIndex + ROWS_PER_PAGE;
        return records.slice(startIndex, endIndex);
    };

    const getTotalPages = (recordCount: number): number => {
        return Math.ceil(recordCount / ROWS_PER_PAGE);
    };

   
    const handleConnect = async (record: SalesforceRecord, objectType: string) => {
        if (!servicenowTable || !servicenowSysId) {
            setConnectionErrors(prev => ({
                ...prev,
                [record.Id]: 'ServiceNow record information not available'
            }));
            return;
        }

        const recordId = record.Id;
        setConnectingRecords(prev => new Set(prev).add(recordId));
        setConnectionErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors[recordId];
            return newErrors;
        });

        try {
            const response = await fetch(
                '/api/x_peekl_salesfor_0/x_peekl_salesfor_0_salesforce_integratio/salesforce/sync',
                {
                    method: 'POST',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json',
                        'X-UserToken': window.g_ck || ''
                    },
                    body: JSON.stringify({
                        servicenow_table: servicenowTable,
                        servicenow_sys_id: servicenowSysId,
                        sf_object_type: objectType,
                        sf_record_id: recordId
                    })
                }
            );

            let data;
            try {
                data = await response.json();
            } catch (jsonErr) {
                throw new Error('Failed to parse response: ' + (jsonErr instanceof Error ? jsonErr.message : String(jsonErr)));
            }

          
            const result = data.result || data;
            const isSuccess = response.ok && (result.success === true || result.success === 'true');

            if (isSuccess) {
               
                setLinkedRecords(prev => new Set(prev).add(recordId));
                
            
                if (onRecordLinked) {
                    const linkData = result.results?.[0]?.link || result.link || result;
                    onRecordLinked(linkData);
                }
             
                setConnectionErrors(prev => {
                    const newErrors = { ...prev };
                    delete newErrors[recordId];
                    return newErrors;
                });
            } else {
    
                const errorData = result.results?.[0] || result;
                let errorMessage = errorData.error || result.error || data.error || 'Failed to connect record';
                if (result.debug || data.debug) {
                    errorMessage += ' (Debug: ' + JSON.stringify(result.debug || data.debug) + ')';
                }
                setConnectionErrors(prev => ({
                    ...prev,
                    [recordId]: errorMessage
                }));
            }
        } catch (err) {
            console.error('Error connecting record:', err);
            setConnectionErrors(prev => ({
                ...prev,
                [recordId]: err instanceof Error ? err.message : 'An error occurred'
            }));
        } finally {
            setConnectingRecords(prev => {
                const newSet = new Set(prev);
                newSet.delete(recordId);
                return newSet;
            });
        }
    };

  
    const getColumnsForObject = useCallback((_objectType: string, records: SalesforceRecord[], configuredColumns?: ColumnMetadata[]): TableColumn[] => {
        if (!records || records.length === 0) return [];
        
        const columns: TableColumn[] = [];
        if (!configuredColumns || configuredColumns.length === 0) {
            return columns;
        }
        const sortedColumns = [...configuredColumns].sort((a, b) => a.order - b.order);
        
        sortedColumns.forEach(col => {
            const fieldExists = records.some(record => record.hasOwnProperty(col.name));
            if (fieldExists) {
                columns.push({ key: col.name, label: col.label || col.name });
            }
        });
        
        
        if (servicenowTable && servicenowSysId) {
            columns.push({ key: '_connect', label: 'Action' });
        }
        
        return columns;
    }, []);

    return (
        <div className={styles.recordTableContainer}>
            <div className={styles.recordTableLayout}>
                <div className={`${styles.filtersSidebar} ${sidebarCollapsed ? styles.filtersSidebarCollapsed : ''}`}>
                    <QueryFilters
                        selectedObject={selectedObject}
                        onObjectSelect={(obj) => {
                            setSelectedObject(obj);
                            setFilters([]); 
                            setCurrentPages({}); 
                        }}
                        onFiltersChange={useCallback((newFilters) => {
                            setFilters(newFilters);
                            setCurrentPages({});
                        }, [])}
                        configuredObjects={configuredObjects}
                        onCollapsedChange={setSidebarCollapsed}
                    />
                </div>

                <div className={styles.recordTableContent}>
                    <div className={styles.searchContainer}>
                        <input
                            type="text"
                            className={styles.searchInput}
                            placeholder={
                                selectedObject
                                    ? `Search in ${selectedObject.label} (min 2 characters)...`
                                    : "Search across all configured objects (min 2 characters)..."
                            }
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                        {loading && <div className={styles.spinner}></div>}
                    </div>

                    {selectedObject && (
                        <div className={styles.selectedObjectInfo}>
                            <span className={styles.selectedObjectLabel}>
                                Filtering: <strong>{selectedObject.label}</strong>
                            </span>
                            <button
                                className={styles.clearObjectButton}
                                onClick={() => {
                                    setSelectedObject(null);
                                    setFilters([]);
                                    setCurrentPages({});
                                }}
                            >
                                Clear Filter
                            </button>
                        </div>
                    )}

                    {error && (
                        <div className={styles.error}>
                            Error: {error}
                        </div>
                    )}

                    {search.trim().length < 2 && search.trim().length > 0 && (
                        <div className={styles.instruction}>
                            Please enter at least 2 characters to search
                        </div>
                    )}

                    {search.trim().length === 0 && (
                        <div className={styles.emptyState}>
                            <p>Enter a search term to find Salesforce records across all configured objects</p>
                        </div>
                    )}

                    {!loading && search.trim().length >= 2 && records.length === 0 && Object.keys(groupedRecords).length === 0 && !error && (
                        <div className={styles.emptyState}>
                            <p>No records found for "{search}"</p>
                        </div>
                    )}

                    {!loading && (records.length > 0 || Object.keys(groupedRecords).length > 0) && (
                        <div className={styles.resultsContainer}>
                            {searchedObjects.length > 0 && (
                                <div className={styles.searchInfo}>
                                    Searching in: {searchedObjects.join(', ')}
                                </div>
                            )}

                            {Object.keys(groupedRecords).length > 0 && (
                                <div className={styles.groupedResults}>
                            {Object.keys(groupedRecords).map((objectType: string) => {
                                const group = groupedRecords[objectType];
                                if (!group || !group.records || group.records.length === 0) return null;
                                
                               
                                const columns = getColumnsForObject(objectType, group.records, group.columns);
                                
                               
                                const paginatedRecords = getPaginatedRecords(group.records, objectType);
                                const currentPage = getPageForObject(objectType);
                                const totalPages = getTotalPages(group.records.length);
                                
                                return (
                                    <div key={objectType} className={styles.objectTableGroup}>
                                        <h3 className={styles.objectTableTitle}>
                                            {group.objectLabel} ({group.records.length})
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
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {paginatedRecords.map((record: SalesforceRecord) => {
                                                        const isConnecting = connectingRecords.has(record.Id);
                                                        const isLinked = linkedRecords.has(record.Id);
                                                        const connectionError = connectionErrors[record.Id];
                                                        return (
                                                            <tr
                                                                key={record.Id}
                                                                className={styles.tableRow}
                                                            >
                                                                {columns.map((column) => {
                                                                    if (column.key === '_connect') {
                                                                        
                                                                        if (isLinked) {
                                                                            return (
                                                                                <td 
                                                                                    key={column.key} 
                                                                                    className={styles.tableCell}
                                                                                    onClick={(e) => e.stopPropagation()}
                                                                                >
                                                                                    <span className={styles.linkedIndicator}>
                                                                                        ✓ Linked
                                                                                    </span>
                                                                                </td>
                                                                            );
                                                                        }
                                                                        return (
                                                                            <td 
                                                                                key={column.key} 
                                                                                className={styles.tableCell}
                                                                                onClick={(e) => e.stopPropagation()}
                                                                            >
                                                                                <button
                                                                                    className={styles.connectButton}
                                                                                    onClick={() => handleConnect(record, objectType)}
                                                                                    disabled={isConnecting}
                                                                                    title={connectionError || 'Connect this record'}
                                                                                >
                                                                                    {isConnecting ? 'Connecting...' : 'Connect'}
                                                                                </button>
                                                                                {connectionError && (
                                                                                    <div className={styles.connectionError}>
                                                                                        {connectionError}
                                                                                    </div>
                                                                                )}
                                                                            </td>
                                                                        );
                                                                    }
                                                                    const cellValue = getFieldValue(record, column.key);
                                                                    return (
                                                                        <td 
                                                                            key={column.key} 
                                                                            className={styles.tableCell}
                                                                        >
                                                                            {cellValue || '-'}
                                                                        </td>
                                                                    );
                                                                })}
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                        
                                      
                                        {totalPages > 1 && (
                                            <div className={styles.pagination}>
                                                <button
                                                    className={styles.paginationButton}
                                                    onClick={() => setPageForObject(objectType, currentPage - 1)}
                                                    disabled={currentPage === 1}
                                                >
                                                    Previous
                                                </button>
                                                <span className={styles.paginationInfo}>
                                                    Page {currentPage} of {totalPages}
                                                </span>
                                                <button
                                                    className={styles.paginationButton}
                                                    onClick={() => setPageForObject(objectType, currentPage + 1)}
                                                    disabled={currentPage >= totalPages}
                                                >
                                                    Next
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                                </div>
                            )}

                            {records.length > 0 && (
                                <div className={styles.totalResults}>
                                    Total results: {records.length}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RecordTable;
