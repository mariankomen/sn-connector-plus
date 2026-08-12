import React, { useState, useEffect } from 'react';
import styles from '../Link.module.css';

interface ConfiguredObject {
  sys_id: string;
  sf_object_name: string;
  sf_object_label: string;
  active: boolean;
}

interface SelectedRelatedObject {
  sys_id: string;
  relationship_name: string;
  relationship_label: string;
}

interface Column {
  name: string;
  label: string;
  type: string;
  selected?: boolean;
}

interface RelatedObjectColumns {
  selectedRelatedObject: SelectedRelatedObject;
  availableColumns: Column[];
  selectedColumns: Set<string>;
  loading: boolean;
  error: string | null;
}

interface ObjectRelatedObjects {
  object: ConfiguredObject;
  selectedRelatedObjects: SelectedRelatedObject[];
  loading: boolean;
  error: string | null;
}

const RelatedObjectsColumnSelect: React.FC = () => {
  const [configuredObjects, setConfiguredObjects] = useState<ConfiguredObject[]>([]);
  const [objectsRelatedObjects, setObjectsRelatedObjects] = useState<Map<string, ObjectRelatedObjects>>(new Map());
  const [relatedObjectsColumns, setRelatedObjectsColumns] = useState<Map<string, RelatedObjectColumns>>(new Map());
  const [expandedObjects, setExpandedObjects] = useState<Set<string>>(new Set());
  const [expandedRelatedObjects, setExpandedRelatedObjects] = useState<Set<string>>(new Set());
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
          '/api/x_peekl_salesfor_0/x_peekl_salesfor_0_salesforce_integratio/salesforce/objects',
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

        const relatedObjectsMap = new Map();
        for (const obj of objects) {
          relatedObjectsMap.set(obj.sys_id, {
            object: obj,
            selectedRelatedObjects: [],
            loading: true,
            error: null
          });
        }
        setObjectsRelatedObjects(relatedObjectsMap);

        for (const obj of objects) {
          fetchSelectedRelatedObjects(obj.sys_id, obj.sf_object_name);
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

  const fetchSelectedRelatedObjects = async (objectConfigSysId: string, objectName: string) => {
    try {
      
      const response = await fetch(
        `/api/x_peekl_salesfor_0/x_peekl_salesfor_0_salesforce_integratio/salesforce/related-objects-columns-get?object_name=${encodeURIComponent(objectName)}`,
        {
          headers: {
            'Accept': 'application/json',
            'X-UserToken': window.g_ck || ''
          },
          credentials: 'include'
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'Failed to fetch related objects');
      }

      const data = await response.json();
      const relatedObjectsData = data.related_objects || [];

      const selectedRelatedObjects: SelectedRelatedObject[] = relatedObjectsData.map((relObj: any) => ({
        sys_id: relObj.selected_related_object_sys_id || '',
        relationship_name: relObj.relationship_name,
        relationship_label: relObj.relationship_label || relObj.relationship_name
      }));

      setObjectsRelatedObjects(prev => {
        const updated = new Map(prev);
        const existing = updated.get(objectConfigSysId);
        if (existing) {
          updated.set(objectConfigSysId, {
            ...existing,
            selectedRelatedObjects: selectedRelatedObjects,
            loading: false,
            error: null
          });
        }
        return updated;
      });

      for (const relObj of relatedObjectsData) {
        const selRelSysId = relObj.selected_related_object_sys_id || '';
        fetchColumnsForRelatedObject(
          objectConfigSysId, 
          objectName, 
          relObj.relationship_name, 
          relObj.fields || [],
          selRelSysId
        );
      }
    } catch (err: any) {
      console.error(`Error fetching related objects for ${objectName}:`, err);
      setObjectsRelatedObjects(prev => {
        const updated = new Map(prev);
        const existing = updated.get(objectConfigSysId);
        if (existing) {
          updated.set(objectConfigSysId, {
            ...existing,
            loading: false,
            error: err.message || 'Failed to load related objects'
          });
        }
        return updated;
      });
    }
  };

  const fetchColumnsForRelatedObject = async (
    objectConfigSysId: string,
    _objectName: string,
    relationshipName: string,
    availableFields: Column[],
    selectedRelatedObjectSysId?: string
  ) => {
    const key = `${objectConfigSysId}_${relationshipName}`;

    const selectedColumnNames = new Set<string>();
    availableFields.forEach(field => {
      if (field.selected === true) {
        selectedColumnNames.add(field.name);
      }
    });

    const sysId = selectedRelatedObjectSysId || '';
    
    setRelatedObjectsColumns(prev => {
      const updated = new Map(prev);
      updated.set(key, {
        selectedRelatedObject: {
          sys_id: sysId,
          relationship_name: relationshipName,
          relationship_label: relationshipName
        },
        availableColumns: availableFields,
        selectedColumns: selectedColumnNames, 
        loading: false,
        error: null
      });
      return updated;
    });
  };

  const toggleObjectSection = (objectConfigSysId: string) => {
    setExpandedObjects(prev => {
      const updated = new Set(prev);
      if (updated.has(objectConfigSysId)) {
        updated.delete(objectConfigSysId);
      } else {
        updated.add(objectConfigSysId);
      }
      return updated;
    });
  };

  const toggleRelatedObjectSection = (key: string) => {
    setExpandedRelatedObjects(prev => {
      const updated = new Set(prev);
      if (updated.has(key)) {
        updated.delete(key);
      } else {
        updated.add(key);
      }
      return updated;
    });
  };

  const toggleColumn = (key: string, columnName: string) => {
    setRelatedObjectsColumns(prev => {
      const updated = new Map(prev);
      const existing = updated.get(key);
      if (existing) {
        const newSelected = new Set(existing.selectedColumns);
        if (newSelected.has(columnName)) {
          newSelected.delete(columnName);
        } else {
          newSelected.add(columnName);
        }
        updated.set(key, {
          ...existing,
          selectedColumns: newSelected
        });
      }
      return updated;
    });
  };

  const handleSaveForRelatedObject = async (key: string) => {
    setSaving(prev => new Set(prev).add(key));
    setSaveErrors(prev => {
      const updated = new Map(prev);
      updated.delete(key);
      return updated;
    });

    try {
      const [objectConfigSysId, relationshipName] = key.split('_');
      const objRelObjs = objectsRelatedObjects.get(objectConfigSysId);
      const relObjCols = relatedObjectsColumns.get(key);
      
      if (!objRelObjs || !relObjCols) {
        throw new Error('Related object data not found');
      }

      const colsForThisRelObj: any[] = [];
      relObjCols.selectedColumns.forEach(columnName => {
        const column = relObjCols.availableColumns.find(c => c.name === columnName);
        if (column) {
          colsForThisRelObj.push({
            object_name: objRelObjs.object.sf_object_name,
            relationship_name: relationshipName,
            column_name: columnName,
            column_label: column.label || columnName,
            active: true,
            order: 100
          });
        }
      });

      
      const url = colsForThisRelObj.length === 0
        ? `/api/x_peekl_salesfor_0/x_peekl_salesfor_0_salesforce_integratio/salesforce/related-objects-columns-select?object_name=${encodeURIComponent(objRelObjs.object.sf_object_name)}&relationship_name=${encodeURIComponent(relationshipName)}`
        : '/api/x_peekl_salesfor_0/x_peekl_salesfor_0_salesforce_integratio/salesforce/related-objects-columns-select';
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'X-UserToken': window.g_ck || ''
        },
        credentials: 'include',
        body: JSON.stringify({
          data: colsForThisRelObj 
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'Failed to save column configuration');
      }

      
      fetchSelectedRelatedObjects(objectConfigSysId, objRelObjs.object.sf_object_name);
    } catch (err: any) {
      console.error(`Error saving column configuration for ${key}:`, err);
      setSaveErrors(prev => {
        const updated = new Map(prev);
        updated.set(key, err.message || 'Failed to save column configuration');
        return updated;
      });
    } finally {
      setSaving(prev => {
        const updated = new Set(prev);
        updated.delete(key);
        return updated;
      });
    }
  };

  if (loading) {
    return (
      <div className={styles.columnConfigureContainer}>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div className={styles.spinner} style={{ margin: '0 auto' }}></div>
          <p className={styles.instruction}>Loading configured objects and related objects columns...</p>
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
        Select which columns to display for each related object. Selected columns will be shown in the Related tab when viewing records.
      </p>

      <div className={styles.objectsColumnsList}>
        {configuredObjects.map(obj => {
          const objRelObjs = objectsRelatedObjects.get(obj.sys_id);
          if (!objRelObjs) return null;

          const isObjectExpanded = expandedObjects.has(obj.sys_id);

          return (
            <div key={obj.sys_id} className={styles.objectColumnsCard}>
              <div 
                className={styles.objectColumnsHeader}
                onClick={() => toggleObjectSection(obj.sys_id)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                  <span className={`${styles.chevron} ${isObjectExpanded ? styles.chevronExpanded : ''}`}>
                    ▼
                  </span>
                  <h3 className={styles.objectColumnsTitle}>
                    {obj.sf_object_label} ({obj.sf_object_name})
                  </h3>
                </div>
                {objRelObjs.loading && (
                  <div className={styles.spinner} style={{ width: '16px', height: '16px' }}></div>
                )}
                {!objRelObjs.loading && !objRelObjs.error && (
                  <span className={styles.selectedCountBadge}>
                    {objRelObjs.selectedRelatedObjects.length} related object{objRelObjs.selectedRelatedObjects.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>

              {objRelObjs.error && (
                <div className={styles.errorMessage} style={{ marginBottom: '12px', fontSize: '13px' }}>
                  {objRelObjs.error}
                </div>
              )}

              {isObjectExpanded && !objRelObjs.loading && !objRelObjs.error && (
                <div style={{ marginLeft: '20px', marginTop: '12px' }}>
                  {objRelObjs.selectedRelatedObjects.length === 0 ? (
                    <p className={styles.instruction} style={{ fontSize: '13px', color: '#6B778C' }}>
                      No related objects selected. Please select related objects in the "Related Objects Select" tab first.
                    </p>
                  ) : (
                    objRelObjs.selectedRelatedObjects.map(relObj => {
                      const key = `${obj.sys_id}_${relObj.relationship_name}`;
                      const relObjCols = relatedObjectsColumns.get(key);
                      const isRelObjExpanded = expandedRelatedObjects.has(key);

                      return (
                        <div key={relObj.relationship_name} className={styles.objectColumnsCard} style={{ marginBottom: '12px' }}>
                          <div 
                            className={styles.objectColumnsHeader}
                            onClick={() => toggleRelatedObjectSection(key)}
                            style={{ padding: '8px 12px' }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                              <span className={`${styles.chevron} ${isRelObjExpanded ? styles.chevronExpanded : ''}`} style={{ fontSize: '10px' }}>
                                ▼
                              </span>
                              <h4 className={styles.objectColumnsTitle} style={{ fontSize: '14px', margin: 0 }}>
                                {relObj.relationship_label} ({relObj.relationship_name})
                              </h4>
                            </div>
                            {relObjCols?.loading && (
                              <div className={styles.spinner} style={{ width: '14px', height: '14px' }}></div>
                            )}
                            {relObjCols && !relObjCols.loading && !relObjCols.error && (
                              <span className={styles.selectedCountBadge} style={{ fontSize: '11px' }}>
                                {relObjCols.selectedColumns.size} / {relObjCols.availableColumns.length}
                              </span>
                            )}
                          </div>

                          {relObjCols?.error && (
                            <div className={styles.errorMessage} style={{ marginBottom: '8px', fontSize: '12px', padding: '8px' }}>
                              {relObjCols.error}
                            </div>
                          )}

                          {isRelObjExpanded && relObjCols && !relObjCols.loading && !relObjCols.error && (
                            <>
                              <div className={styles.fieldsList} style={{ marginLeft: '20px' }}>
                                {relObjCols.availableColumns.length === 0 ? (
                                  <p className={styles.instruction} style={{ fontSize: '12px', color: '#6B778C' }}>
                                    No columns available
                                  </p>
                                ) : (
                                  relObjCols.availableColumns.map(column => (
                                    <label 
                                      key={column.name} 
                                      className={styles.fieldItem}
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={relObjCols.selectedColumns.has(column.name)}
                                        onChange={() => toggleColumn(key, column.name)}
                                      />
                                      <span className={styles.fieldLabel}>
                                        {column.label} ({column.name})
                                      </span>
                                      {column.type && (
                                        <span className={styles.nameFieldBadge} style={{ fontSize: '10px', padding: '2px 6px' }}>
                                          {column.type}
                                        </span>
                                      )}
                                    </label>
                                  ))
                                )}
                              </div>
                              {saveErrors.has(key) && (
                                <div className={styles.errorMessage} style={{ margin: '8px 20px', fontSize: '12px', padding: '8px' }}>
                                  {saveErrors.get(key)}
                                </div>
                              )}
                              <div style={{ margin: '12px 20px' }}>
                                <button
                                  className={styles.saveButton}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSaveForRelatedObject(key);
                                  }}
                                  disabled={saving.has(key)}
                                  style={{ fontSize: '12px', padding: '6px 12px' }}
                                >
                                  {saving.has(key) ? 'Saving...' : 'Save Columns'}
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RelatedObjectsColumnSelect;
