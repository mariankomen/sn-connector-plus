import { useState, useEffect } from 'react';
import styles from './Link.module.css';
import RecordTable from './Link/RecordTable';
import ExistingLinksTable from './Link/ExistingLinksTable';
import ColumnConfigure from './Link/ColumnConfigure';
import RelatedObjectsSelect from './Link/RelatedObjectsSelect';
import RelatedObjectsColumnSelect from './Link/RelatedObjectsColumnSelect';

const Spinner = () => (
  <div className={styles.spinner}></div>
);


const SettingsModal = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('objects');
  const [availableObjects, setAvailableObjects] = useState([]);
  const [configuredObjects, setConfiguredObjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedObjects, setSelectedObjects] = useState(new Set());

  useEffect(() => {
    if (!isOpen) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
       
        const sobjectsResponse = await fetch(
          '/api/x_1955226_peeklo_1/x_1955226_peeklo_1_salesforce_integratio/salesforce/sobjects',
          {
            headers: {
              'Accept': 'application/json',
              'X-UserToken': window.g_ck || ''

            }
          }
        );
        
        if (!sobjectsResponse.ok) {
          throw new Error('Failed to fetch Salesforce objects');
        }

        const sobjectsData = await sobjectsResponse.json();
        setAvailableObjects(sobjectsData.sobjects || []);
        const configResponse = await fetch(
          '/api/x_1955226_peeklo_1/x_1955226_peeklo_1_salesforce_integratio/salesforce/objects',
          {
            headers: {
              'Accept': 'application/json',
              'X-UserToken': window.g_ck || ''

            }
          }
        );

        if (configResponse.ok) {
          const configData = await configResponse.json();
          const objects = configData.objects || configData.result?.objects || [];
          
         
          const validObjects = objects.filter(obj => {
            if (!obj.sf_object_name) {
              console.warn('Object missing sf_object_name:', obj);
              return false;
            }
            if (!obj.sys_id) {
              console.warn('Object missing sys_id:', obj);
            }
            return true;
          });
          
          setConfiguredObjects(validObjects);
          
        
          const configured = new Set(
            validObjects.map(obj => obj.sf_object_name)
          );
          setSelectedObjects(configured);
        } else {
          console.error('Failed to fetch configured objects:', configResponse.status, configResponse.statusText);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isOpen]);

  const handleToggleObject = (objectName, objectLabel) => {
    setSelectedObjects(prev => {
      const newSet = new Set(prev);
      if (newSet.has(objectName)) {
        newSet.delete(objectName);
      } else {
        newSet.add(objectName);
      }
      return newSet;
    });
  };

  const handleSave = async () => {
    setLoading(true);
    setError(null);

    try {
    
      const currentNames = new Set(configuredObjects.map(obj => obj.sf_object_name));
      
     
      const toAdd = [...selectedObjects].filter(name => !currentNames.has(name));
      
   
      const toRemove = configuredObjects.filter(obj => !selectedObjects.has(obj.sf_object_name));

      let addErrors = [];
      let deleteErrors = [];

    
      if (toAdd.length > 0) {
        const objectsToAdd = toAdd.map(objectName => {
          const objectInfo = availableObjects.find(obj => obj.name === objectName);
          return {
            sf_object_name: objectName,
            sf_object_label: objectInfo?.label || objectName,
            active: true,
            searchable: true
          };
        });

        const addResponse = await fetch(
          '/api/x_1955226_peeklo_1/x_1955226_peeklo_1_salesforce_integratio/salesforce/objects',
          {
            method: 'POST',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
              'X-UserToken': window.g_ck || ''
            },
            body: JSON.stringify(objectsToAdd)
          }
        );

        if (addResponse.ok) {
          const addResult = await addResponse.json();
          
          
          if (addResult.failed > 0) {
            const failures = addResult.results.filter(r => !r.success);
            addErrors = failures.map(f => `${f.sf_object_name}: ${f.error}`);
          }
        } else {
          const errorData = await addResponse.json();
          addErrors.push(`Failed to add objects: ${errorData.error || 'Unknown error'}`);
        }
      }

     
      if (toRemove.length > 0) {
        const objectsToDelete = toRemove.map(obj => {
          if (obj.sys_id) {
            return { sys_id: obj.sys_id };
          } else if (obj.sf_object_name) {
            console.warn('Deleting by object_name (sys_id missing):', obj.sf_object_name);
            return { sf_object_name: obj.sf_object_name };
          } else {
            console.error('Cannot delete object - missing both sys_id and sf_object_name:', obj);
            return null;
          }
        }).filter(obj => obj !== null);

        if (objectsToDelete.length > 0) {
          const deleteResponse = await fetch(
            '/api/x_1955226_peeklo_1/x_1955226_peeklo_1_salesforce_integratio/salesforce/objects/delete',
            {
              method: 'POST',
              headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'X-UserToken': window.g_ck || ''
              },
              body: JSON.stringify(objectsToDelete)
            }
          );

          if (deleteResponse.ok) {
            const deleteResult = await deleteResponse.json();
           
            if (deleteResult.failed > 0) {
              const failures = deleteResult.results.filter(r => !r.success);
              deleteErrors = failures.map(f => {
                const identifier = f.sf_object_name || f.sys_id || 'object';
                return `${identifier}: ${f.error}`;
              });
            }
          } else {
            const errorData = await deleteResponse.json().catch(() => ({ error: 'Unknown error' }));
            deleteErrors.push(`Failed to delete objects: ${errorData.error || deleteResponse.statusText}`);
          }
        }
      }

      const allErrors = [...addErrors, ...deleteErrors];
      if (allErrors.length > 0) {
        setError(allErrors.join('; '));

      } else {
       
        onClose();
      }
    } catch (err) {
      console.error('Error saving configuration:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
    };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>Configure Salesforce Objects</h2>
          <button className={styles.closeButton} onClick={onClose}>×</button>
        </div>

        <div className={styles.modalTabs}>
          <button
            className={`${styles.tabButton} ${activeTab === 'objects' ? styles.tabButtonActive : ''}`}
            onClick={() => setActiveTab('objects')}
          >
            Objects
          </button>
          <button
            className={`${styles.tabButton} ${activeTab === 'columns' ? styles.tabButtonActive : ''}`}
            onClick={() => setActiveTab('columns')}
          >
            Column Configure
          </button>
          <button
            className={`${styles.tabButton} ${activeTab === 'related-objects' ? styles.tabButtonActive : ''}`}
            onClick={() => setActiveTab('related-objects')}
          >
            Related Objects Select
          </button>
          <button
            className={`${styles.tabButton} ${activeTab === 'related-objects-columns' ? styles.tabButtonActive : ''}`}
            onClick={() => setActiveTab('related-objects-columns')}
          >
            Related Objects Columns
          </button>
        </div>

        <div className={styles.modalBody}>
          {loading && <Spinner />}
          
          {error && (
            <div className={styles.errorMessage}>
              Error: {error}
            </div>
          )}

          {activeTab === 'objects' && !loading && !error && (
            <div className={styles.objectsList}>
              <p className={styles.instruction}>
                Select which Salesforce objects you want to work with:
              </p>
              
              {availableObjects.map((obj) => (
                <label key={obj.name} className={styles.objectItem}>
                  <input
                    type="checkbox"
                    checked={selectedObjects.has(obj.name)}
                    onChange={() => handleToggleObject(obj.name, obj.label)}
                  />
                  <span className={styles.objectLabel}>
                    {obj.label} ({obj.name})
                  </span>
                </label>
              ))}
            </div>
          )}

          {activeTab === 'columns' && !loading && (
            <ColumnConfigure />
          )}

          {activeTab === 'related-objects' && !loading && (
            <RelatedObjectsSelect />
          )}

          {activeTab === 'related-objects-columns' && !loading && (
            <RelatedObjectsColumnSelect />
          )}
        </div>

        {activeTab === 'objects' && (
          <div className={styles.modalFooter}>
            <button 
              className={styles.cancelButton} 
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button 
              className={styles.saveButton} 
              onClick={handleSave}
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

function LinkSalesforceRecord({ onRecordLinked, servicenowTable, servicenowSysId }) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [configuredObjects, setConfiguredObjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [linksRefreshKey, setLinksRefreshKey] = useState(0);

  const fetchConfiguredObjects = async () => {
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
          credentials: 'same-origin'
        }
      );
      if (!response.ok) {
        throw new Error('Failed to fetch configured objects');
      }

      const data = await response.json();
      const objects = data.objects || data.result?.objects || [];
      const validObjects = objects.filter(obj => {
        if (!obj.sys_id) {
          console.warn('Object missing sys_id (cannot delete):', obj);
        }
        return obj.sys_id && obj.sf_object_name;
      });
      
      setConfiguredObjects(validObjects);
    } catch (err) {
      console.error('Error fetching configured objects:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfiguredObjects();
  }, []);
      
  const handleSettingsClose = () => {
    setIsSettingsOpen(false);
   
    fetchConfiguredObjects();
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Link Salesforce Record</h1>
            <button
          className={styles.settingsButton}
          onClick={() => setIsSettingsOpen(true)}
          title="Configure Salesforce Objects"
        >
          ⚙️ Settings
            </button>
          </div>

      {loading && (
        <div className={styles.loadingContainer}>
          <Spinner />
          <span className={styles.loadingText}>Loading configured objects...</span>
        </div>
          )}

          {error && (
        <div className={styles.error}>
          Error: {error}
            </div>
          )}

      {!loading && !error && configuredObjects.length === 0 && (
        <div className={styles.emptyState}>
          <p className={styles.emptyStateText}>
            No Salesforce objects configured yet.
          </p>
          <p className={styles.emptyStateHint}>
            Click the <strong>⚙️ Settings</strong> button to configure which Salesforce objects you want to work with.
          </p>
        </div>
      )}

      {!loading && !error && servicenowTable && servicenowSysId && (
        <div className={styles.existingLinksSection}>
          <ExistingLinksTable 
            key={linksRefreshKey}
            servicenowTable={servicenowTable}
            servicenowSysId={servicenowSysId}
            onLinkDeleted={() => {
              setLinksRefreshKey(prev => prev + 1);
            }}
          />
        </div>
      )}

      {!loading && !error && configuredObjects.length > 0 && (
        <div className={styles.searchSection}>
          <h2 className={styles.sectionTitle}>Search Salesforce Records</h2>
          <RecordTable 
            servicenowTable={servicenowTable}
            servicenowSysId={servicenowSysId}
            onRecordLinked={(link) => {
             
              setLinksRefreshKey(prev => prev + 1);
              if (onRecordLinked) {
                onRecordLinked(link);
              }
            }}
          />
        </div>
      )}

      <SettingsModal 
        isOpen={isSettingsOpen}
        onClose={handleSettingsClose}
      />
    </div>
  );
}

export default LinkSalesforceRecord;

