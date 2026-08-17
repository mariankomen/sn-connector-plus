import React, { useState, useEffect } from 'react';
import styles from '../Link.module.css';

interface ConfiguredObject {
  sys_id: string;
  sf_object_name: string;
  sf_object_label: string;
  active: boolean;
  searchable: boolean;
}

interface SalesforceField {
  name: string;
  label: string;
  type: string;
  required?: boolean;
  searchable?: boolean;
  nameField?: boolean;
}

interface ObjectColumns {
  object: ConfiguredObject;
  availableFields: SalesforceField[];
  selectedFields: Set<string>;
  loading: boolean;
  error: string | null;
}

const ColumnConfigure: React.FC = () => {
  const [configuredObjects, setConfiguredObjects] = useState<ConfiguredObject[]>([]);
  const [objectsColumns, setObjectsColumns] = useState<Map<string, ObjectColumns>>(new Map());
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<Set<string>>(new Set()); 
  const [saveErrors, setSaveErrors] = useState<Map<string, string>>(new Map()); 

  useEffect(() => {
    const fetchObjects = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          '/api/x_1955226_peeklo_1/x_1955226_peeklo_1_salesforce_integratio/salesforce/objects',
          {
            headers: {
              'Accept': 'application/json',
              'X-UserToken': window.g_ck || ''
            },
            credentials: 'include'
          }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch configured objects');
        }

        const data = await response.json();
        const objects = data.objects || data.result?.objects || [];
        setConfiguredObjects(objects);


        const columnsMap = new Map<string, ObjectColumns>();
        for (const obj of objects) {
          columnsMap.set(obj.sys_id, {
            object: obj,
            availableFields: [],
            selectedFields: new Set(),
            loading: true,
            error: null
          });
        }
        setObjectsColumns(columnsMap);

        for (const obj of objects) {
          fetchColumnsForObject(obj.sys_id, obj.sf_object_name);
        }
      } catch (err: any) {
        console.error('Error fetching objects:', err);
        setError(err.message || 'Failed to load configured objects');
      } finally {
        setLoading(false);
      }
    };

    fetchObjects();
  }, []);

  const fetchColumnsForObject = async (objectConfigSysId: string, objectName: string) => {
    try {
      const fieldsResponse = await fetch(
        `/api/x_1955226_peeklo_1/x_1955226_peeklo_1_salesforce_integratio/salesforce/objects/columns-get?object_name=${encodeURIComponent(objectName)}`,
        {
          headers: {
            'Accept': 'application/json',
            'X-UserToken': window.g_ck || ''
          },
          credentials: 'include'
        }
      );

      if (!fieldsResponse.ok) {
        const errorData = await fieldsResponse.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'Failed to fetch columns');
      }

      const fieldsData = await fieldsResponse.json();
      const fields: SalesforceField[] = fieldsData.fields || [];

      
      let savedColumns: string[] = [];
      try {
        const savedResponse = await fetch(
          `/api/x_1955226_peeklo_1/x_1955226_peeklo_1_salesforce_integratio/salesforce/objects/saved-columns-get?object_config=${encodeURIComponent(objectConfigSysId)}`,
          {
            headers: {
              'Accept': 'application/json',
              'X-UserToken': window.g_ck || ''
            },
            credentials: 'include'
          }
        );

        if (savedResponse.ok) {
          const savedData = await savedResponse.json();
          const result = savedData.result || savedData;
          if (result.success && result.columns) {
            savedColumns = result.columns
              .filter((col: any) => col.active !== false)
              .map((col: any) => col.column_name);
          }
        }
      } catch (savedErr) {
        console.warn(`Failed to fetch saved columns for ${objectName}:`, savedErr);
      }

      setObjectsColumns(prev => {
        const updated = new Map(prev);
        const existing = updated.get(objectConfigSysId);
        if (existing) {
          updated.set(objectConfigSysId, {
            ...existing,
            availableFields: fields,
            selectedFields: new Set(savedColumns),
            loading: false,
            error: null
          });
        }
        return updated;
      });
    } catch (err: any) {
      console.error(`Error fetching columns for ${objectName}:`, err);
      setObjectsColumns(prev => {
        const updated = new Map(prev);
        const existing = updated.get(objectConfigSysId);
        if (existing) {
          updated.set(objectConfigSysId, {
            ...existing,
            loading: false,
            error: err.message || 'Failed to load columns'
          });
        }
        return updated;
      });
    }
  };

  const toggleSection = (objectConfigSysId: string) => {
    setExpandedSections(prev => {
      const updated = new Set(prev);
      if (updated.has(objectConfigSysId)) {
        updated.delete(objectConfigSysId);
      } else {
        updated.add(objectConfigSysId);
      }
      return updated;
    });
  };

  const toggleField = (objectConfigSysId: string, fieldName: string) => {
    setObjectsColumns(prev => {
      const updated = new Map(prev);
      const existing = updated.get(objectConfigSysId);
      if (existing) {
        const newSelected = new Set(existing.selectedFields);
        if (newSelected.has(fieldName)) {
          newSelected.delete(fieldName);
        } else {
          newSelected.add(fieldName);
        }
        updated.set(objectConfigSysId, {
          ...existing,
          selectedFields: newSelected
        });
      }
      return updated;
    });
  };

  const handleSaveForObject = async (objectConfigSysId: string) => {
    setSaving(prev => new Set(prev).add(objectConfigSysId));
    setSaveErrors(prev => {
      const updated = new Map(prev);
      updated.delete(objectConfigSysId);
      return updated;
    });

    try {
      const objCols = objectsColumns.get(objectConfigSysId);
      if (!objCols) {
        throw new Error('Object data not found');
      }

      const colsForThisObject: any[] = [];
      
      objCols.selectedFields.forEach(fieldName => {
        const field = objCols.availableFields.find(f => f.name === fieldName);
        if (field) {
          colsForThisObject.push({
            object_config: objectConfigSysId,
            column_name: fieldName,
            column_label: field.label,
            active: true,
            order: 100
          });
        }
      });

      
      const url = colsForThisObject.length === 0
        ? `/api/x_1955226_peeklo_1/x_1955226_peeklo_1_salesforce_integratio/salesforce/objects/columns-add?object_config=${encodeURIComponent(objectConfigSysId)}`
        : '/api/x_1955226_peeklo_1/x_1955226_peeklo_1_salesforce_integratio/salesforce/objects/columns-add';
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'X-UserToken': window.g_ck || ''
        },
        credentials: 'include',
        body: JSON.stringify(colsForThisObject) 
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'Failed to save column configuration');
      }

      
      fetchColumnsForObject(objectConfigSysId, objCols.object.sf_object_name);
    } catch (err: any) {
      console.error(`Error saving column configuration for ${objectConfigSysId}:`, err);
      setSaveErrors(prev => {
        const updated = new Map(prev);
        updated.set(objectConfigSysId, err.message || 'Failed to save column configuration');
        return updated;
      });
    } finally {
      setSaving(prev => {
        const updated = new Set(prev);
        updated.delete(objectConfigSysId);
        return updated;
      });
    }
  };

  if (loading) {
    return (
      <div className={styles.columnConfigureContainer}>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div className={styles.spinner} style={{ margin: '0 auto' }}></div>
          <p className={styles.instruction}>Loading configured objects and columns...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.columnConfigureContainer}>
        <div className={styles.errorMessage}>
          Error: {error}
        </div>
      </div>
    );
  }

  if (configuredObjects.length === 0) {
    return (
      <div className={styles.columnConfigureContainer}>
        <p className={styles.instruction}>
          No configured objects found. Please configure objects first in the "Objects" tab.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.columnConfigureContainer}>
      <p className={styles.instruction}>
        Select which columns to display for each Salesforce object. Selected columns will be shown when viewing linked records.
      </p>

      <div className={styles.objectsColumnsList}>
        {configuredObjects.map(obj => {
          const objCols = objectsColumns.get(obj.sys_id);
          if (!objCols) return null;

          const isExpanded = expandedSections.has(obj.sys_id);

          return (
            <div key={obj.sys_id} className={styles.objectColumnsCard}>
              <div 
                className={styles.objectColumnsHeader}
                onClick={() => toggleSection(obj.sys_id)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                  <span className={`${styles.chevron} ${isExpanded ? styles.chevronExpanded : ''}`}>
                    ▼
                  </span>
                  <h3 className={styles.objectColumnsTitle}>
                    {obj.sf_object_label} ({obj.sf_object_name})
                  </h3>
                </div>
                {objCols.loading && (
                  <div className={styles.spinner} style={{ width: '16px', height: '16px' }}></div>
                )}
                {!objCols.loading && !objCols.error && (
                  <span className={styles.selectedCountBadge}>
                    {objCols.selectedFields.size} / {objCols.availableFields.length}
                  </span>
                )}
              </div>

              {objCols.error && (
                <div className={styles.errorMessage} style={{ marginBottom: '12px', fontSize: '13px' }}>
                  {objCols.error}
                </div>
              )}

              {isExpanded && !objCols.loading && !objCols.error && (
                <>
                  <div className={styles.fieldsList}>
                    {objCols.availableFields.length === 0 ? (
                      <p className={styles.instruction} style={{ fontSize: '13px', color: '#6B778C' }}>
                        No fields available
                      </p>
                    ) : (
                      objCols.availableFields.map(field => (
                        <label 
                          key={field.name} 
                          className={styles.fieldItem}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={objCols.selectedFields.has(field.name)}
                            onChange={() => toggleField(obj.sys_id, field.name)}
                          />
                          <span className={styles.fieldLabel}>
                            {field.label} ({field.name})
                          </span>
                          {field.nameField && (
                            <span className={styles.nameFieldBadge}>Name Field</span>
                          )}
                          {field.required && (
                            <span className={styles.requiredBadge}>Required</span>
                          )}
                        </label>
                      ))
                    )}
                  </div>
                  {saveErrors.has(obj.sys_id) && (
                    <div className={styles.errorMessage} style={{ margin: '12px', fontSize: '13px', padding: '8px' }}>
                      {saveErrors.get(obj.sys_id)}
                    </div>
                  )}
                  <div className={styles.selectedCount}>
                    {objCols.selectedFields.size} of {objCols.availableFields.length} columns selected
                  </div>
                  <div style={{ margin: '12px', display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      className={styles.saveButton}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSaveForObject(obj.sys_id);
                      }}
                      disabled={saving.has(obj.sys_id)}
                    >
                      {saving.has(obj.sys_id) ? 'Saving...' : 'Save Columns'}
                    </button>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ColumnConfigure;
