import React, { useState, useEffect } from 'react';
import styles from '../Link.module.css';

interface ConfiguredObject {
  sys_id: string;
  sf_object_name: string;
  sf_object_label: string;
  active: boolean;
}

interface RelatedObject {
  name: string;
  relationshipName: string;
  selected?: boolean;
}

const RelatedObjectsSelect: React.FC = () => {
  const [configuredObjects, setConfiguredObjects] = useState<ConfiguredObject[]>([]);
  const [objectsRelatedObjects, setObjectsRelatedObjects] = useState<Map<string, {
    object: ConfiguredObject;
    availableRelatedObjects: RelatedObject[];
    selectedRelatedObjects: Set<string>;
    loading: boolean;
    error: string | null;
  }>>(new Map());
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
            availableRelatedObjects: [],
            selectedRelatedObjects: new Set(),
            loading: true,
            error: null
          });
        }
        setObjectsRelatedObjects(relatedObjectsMap);

        for (const obj of objects) {
          fetchRelatedObjectsForObject(obj.sys_id, obj.sf_object_name);
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

  const fetchRelatedObjectsForObject = async (objectConfigSysId: string, objectName: string) => {
    try {
      const response = await fetch(
        `/api/x_peekl_salesfor_0/x_peekl_salesfor_0_salesforce_integratio/salesforce/related-objects-get?object_name=${encodeURIComponent(objectName)}`,
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
      const relatedObjects: RelatedObject[] = data.relatedObjects || [];

      const selectedRelationshipNames = new Set<string>();
      relatedObjects.forEach(relObj => {
        if (relObj.selected === true) {
          selectedRelationshipNames.add(relObj.relationshipName);
        }
      });

      setObjectsRelatedObjects(prev => {
        const updated = new Map(prev);
        const existing = updated.get(objectConfigSysId);
        if (existing) {
          updated.set(objectConfigSysId, {
            ...existing,
            availableRelatedObjects: relatedObjects,
            selectedRelatedObjects: selectedRelationshipNames, 
            loading: false,
            error: null
          });
        }
        return updated;
      });
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

  const toggleRelatedObject = (objectConfigSysId: string, relationshipName: string) => {
    setObjectsRelatedObjects(prev => {
      const updated = new Map(prev);
      const existing = updated.get(objectConfigSysId);
      if (existing) {
        const newSelected = new Set(existing.selectedRelatedObjects);
        if (newSelected.has(relationshipName)) {
          newSelected.delete(relationshipName);
        } else {
          newSelected.add(relationshipName);
        }
        updated.set(objectConfigSysId, {
          ...existing,
          selectedRelatedObjects: newSelected
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
      const objRelObjs = objectsRelatedObjects.get(objectConfigSysId);
      if (!objRelObjs) {
        throw new Error('Object data not found');
      }

      const relatedObjectsToSave = Array.from(objRelObjs.selectedRelatedObjects).map(relationshipName => {
        const relObj = objRelObjs.availableRelatedObjects.find(r => r.relationshipName === relationshipName);
        return {
          name: relObj?.name || relationshipName,
          relationshipName: relationshipName
        };
      });

      
      
      const response = await fetch(
        '/api/x_peekl_salesfor_0/x_peekl_salesfor_0_salesforce_integratio/salesforce/related-objects-select',
        {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'X-UserToken': window.g_ck || ''
          },
          credentials: 'include',
          body: JSON.stringify({
            object_name: objRelObjs.object.sf_object_name,
            relatedObjects: relatedObjectsToSave
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'Failed to save related objects');
      }

      
      fetchRelatedObjectsForObject(objectConfigSysId, objRelObjs.object.sf_object_name);
    } catch (err: any) {
      console.error(`Error saving related objects for ${objectConfigSysId}:`, err);
      setSaveErrors(prev => {
        const updated = new Map(prev);
        updated.set(objectConfigSysId, err.message || 'Failed to save related objects configuration');
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
          <p className={styles.instruction}>Loading configured objects and related objects...</p>
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
        Select which related objects to display for each Salesforce object. Selected related objects will be shown in the Related tab when viewing records.
      </p>

      <div className={styles.objectsColumnsList}>
        {configuredObjects.map(obj => {
          const objRelObjs = objectsRelatedObjects.get(obj.sys_id);
          if (!objRelObjs) return null;

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
                {objRelObjs.loading && (
                  <div className={styles.spinner} style={{ width: '16px', height: '16px' }}></div>
                )}
                {!objRelObjs.loading && !objRelObjs.error && (
                  <span className={styles.selectedCountBadge}>
                    {objRelObjs.selectedRelatedObjects.size} / {objRelObjs.availableRelatedObjects.length}
                  </span>
                )}
              </div>

              {objRelObjs.error && (
                <div className={styles.errorMessage} style={{ marginBottom: '12px', fontSize: '13px' }}>
                  {objRelObjs.error}
                </div>
              )}

              {isExpanded && !objRelObjs.loading && !objRelObjs.error && (
                <>
                  <div className={styles.fieldsList}>
                    {objRelObjs.availableRelatedObjects.length === 0 ? (
                      <p className={styles.instruction} style={{ fontSize: '13px', color: '#6B778C' }}>
                        No related objects available
                      </p>
                    ) : (
                      objRelObjs.availableRelatedObjects.map(relObj => (
                        <label 
                          key={relObj.relationshipName} 
                          className={styles.fieldItem}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={objRelObjs.selectedRelatedObjects.has(relObj.relationshipName)}
                            onChange={() => toggleRelatedObject(obj.sys_id, relObj.relationshipName)}
                          />
                          <span className={styles.fieldLabel}>
                            {relObj.name} ({relObj.relationshipName})
                          </span>
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
                    {objRelObjs.selectedRelatedObjects.size} of {objRelObjs.availableRelatedObjects.length} related objects selected
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
                      {saving.has(obj.sys_id) ? 'Saving...' : 'Save Related Objects'}
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

export default RelatedObjectsSelect;
