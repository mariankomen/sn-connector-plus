import { useEffect, useState } from "react";
import styles from "./Create.module.css";
import Lookup from "./Lookup";
import RichTextEditor from "./RichTextEditor";

interface SalesforceObject {
  name: string;
  label: string;
  labelPlural?: string;
  custom?: boolean;
  createable?: boolean;
  updateable?: boolean;
}

interface Field {
  name: string;
  label: string;
  type: string;
  createable?: boolean;
  required?: boolean;
  picklistValues?: Array<{ label: string; value: string | boolean }>;
  htmlFormatted?: boolean;
  length?: number;
}

interface RecordType {
  name: string;
  recordTypeId: string;
  master: boolean;
}

interface CreateSalesforceRecordProps {
  servicenowTable?: string | null;
  servicenowSysId?: string | null;
}


const CreateSalesforceRecord = ({ servicenowTable, servicenowSysId }: CreateSalesforceRecordProps = {}) => {
  const [availableObjects, setAvailableObjects] = useState<SalesforceObject[]>([]);
  const [selectedObject, setSelectedObject] = useState<string | null>(null);
  const [recordTypes, setRecordTypes] = useState<RecordType[]>([]);
  const [selectedRecordType, setSelectedRecordType] = useState<string | null>(null);
  const [recordTypesLoaded, setRecordTypesLoaded] = useState(false);
  const [fields, setFields] = useState<Field[]>([]);
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [loadingObjects, setLoadingObjects] = useState(false);
  const [loadingRecordTypes, setLoadingRecordTypes] = useState(false);
  const [loadingFields, setLoadingFields] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const isValidSalesforceId = (value: string): boolean => {
    if (!value || typeof value !== 'string') return false;
    const trimmed = value.trim();
    const idPattern = /^[a-zA-Z0-9]{15}$|^[a-zA-Z0-9]{18}$/;
    return idPattern.test(trimmed);
  };

  const createSalesforceRecord = async () => {
    if (!selectedObject) {
      setError('Please select an object first');
      return;
    }
    setError(null);
    setSuccess(null);

    const fieldsToSend: Record<string, any> = {};
    const invalidReferenceFields: string[] = [];
    
    Object.keys(formValues).forEach(key => {
      const value = formValues[key];
      if (value !== '' && value !== null && value !== undefined) {
        const field = fields.find(f => f.name === key);

        if (field && field.type === 'multipicklist') {
          if (Array.isArray(value) && value.length > 0) {
            fieldsToSend[key] = value.join(';');
          }
          return;
        }
        
        if (field && field.type === 'reference') {
          if (!isValidSalesforceId(String(value))) {
            invalidReferenceFields.push(field.label || key);
            return;
          }
        }
        fieldsToSend[key] = value;
      }
    });

    if (invalidReferenceFields.length > 0) {
      setError(`Invalid Salesforce ID format in: ${invalidReferenceFields.join(', ')}. IDs must be 15 or 18 alphanumeric characters.`);
      return;
    }
  
    if (recordTypes.length > 0 && !selectedRecordType) {
      setError('Please select a record type');
      return;
    }


  
    if (selectedRecordType && selectedRecordType !== 'Master') {
      fieldsToSend['RecordTypeId'] = selectedRecordType;
      console.log('✅ Including RecordTypeId in request:', selectedRecordType);
    } else if (selectedRecordType === 'Master') {
      console.log('ℹ️ RecordTypeId not included - Master selected (Salesforce will use default)');
    } else if (recordTypes.length === 0) {
      console.log('ℹ️ RecordTypeId not included - object does not support record types');
    } else {
      console.log('⚠️ RecordTypeId not included - unknown record type value:', selectedRecordType);
    }

    const payload = {
      objectName: selectedObject,
      fields: fieldsToSend
    };
    
    const missingRequired = fields.some(field => {
      const value = formValues[field.name];
      if (!field.required) return false;
      
      
      if (field.type === 'multipicklist') {
        return !Array.isArray(value) || value.length === 0;
      }
      
      
      return value === '' || value == null || value === undefined;
    });
    if (missingRequired) {
      setError('Please fill in all required fields');
      return;
    }
    try {
      setSubmitting(true);
      const response = await fetch(
        '/api/x_peekl_salesfor_0/x_peekl_salesfor_0_salesforce_integratio/salesforce/create-record',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-UserToken': window.g_ck || ''

          },
          body: JSON.stringify(payload)
        }
      );
      
      const data = await response.json();
      
      if (response.ok) {
        if (data.success) {
          const createdRecordId = data.id;
          
          
          if (createdRecordId && servicenowTable && servicenowSysId && selectedObject) {
            try {
              const linkResponse = await fetch(
                '/api/x_peekl_salesfor_0/x_peekl_salesfor_0_salesforce_integratio/salesforce/sync',
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'X-UserToken': window.g_ck || ''
                  },
                  body: JSON.stringify({
                    servicenow_table: servicenowTable,
                    servicenow_sys_id: servicenowSysId,
                    sf_object_type: selectedObject,
                    sf_record_id: createdRecordId
                  })
                }
              );
              
              let linkData;
              try {
                linkData = await linkResponse.json();
              } catch (jsonErr) {
                console.error('Failed to parse link response JSON:', jsonErr);
                const responseText = await linkResponse.text();
                console.error('Link response text:', responseText);
                setSuccess('Record created successfully, but failed to link: Invalid response from server');
                return;
              }
              
              
              const actualData = linkData.result || linkData;
              
              if (linkResponse.ok && actualData.success) {
                setSuccess('Record created and linked successfully');
              } else {
                
                let errorMessage = 'Unknown error';
                if (actualData.error) {
                  errorMessage = actualData.error;
                } else if (actualData.results && actualData.results.length > 0 && actualData.results[0].error) {
                  errorMessage = actualData.results[0].error;
                } else if (actualData.message) {
                  errorMessage = actualData.message;
                }
                console.error('Linking failed:', linkData);
                setSuccess('Record created successfully, but failed to link: ' + errorMessage);
              }
            } catch (linkErr) {
              
              setSuccess('Record created successfully, but failed to link: ' + (linkErr instanceof Error ? linkErr.message : 'Unknown error'));
            }
          } else {
            setSuccess('Record created successfully');
          }
        } else {
          setError(data.error || 'Failed to create record');
        }
      } else {
        const errorMessage = data.error || data.message || `Failed to create record (${response.status})`;
        setError(errorMessage);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create record');
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (!success) return;
    const timer = setTimeout(() => {
      setSuccess(null);
    }, 3000);
    return () => clearTimeout(timer);
  }, [success]);
  useEffect(() => {
    if (fields.length > 0) {
      const initialValues: Record<string, any> = {};
      fields.forEach(field => {
        
        if (field.type === 'multipicklist') {
          initialValues[field.name] = [];
        } else {
          initialValues[field.name] = '';
        }
      });
      setFormValues(initialValues);
    }
  }, [fields]);

  const handleFieldChange = (fieldName: string, value: any) => {
    setFormValues(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  const renderFieldInput = (field: Field) => {
    const value = formValues[field.name] || '';

    if (field.type === 'multipicklist' && field.picklistValues && field.picklistValues.length > 0) {
      const selectedValues = Array.isArray(value) ? value : (value ? [value] : []);
      return (
        <div>
          <select
            className={styles.input}
            multiple
            value={selectedValues}
            onChange={(e) => {
              const selected = Array.from(e.target.selectedOptions, option => option.value);
              handleFieldChange(field.name, selected);
            }}
            required={field.required}
            size={Math.min(5, field.picklistValues.length)}
          >
            {field.picklistValues.map((option, idx) => (
              <option key={idx} value={String(option.value)}>
                {option.label}
              </option>
            ))}
          </select>
          <div className={styles.multipicklistHint}>
            Hold Ctrl (Cmd on Mac) to select multiple values
          </div>
        </div>
      );
    }

    if (field.type === 'picklist' && field.picklistValues && field.picklistValues.length > 0) {
      return (
        <select
          className={styles.input}
          value={value}
          onChange={(e) => handleFieldChange(field.name, e.target.value)}
          required={field.required}
        >
          <option value="">-- Select {field.label} --</option>
          {field.picklistValues.map((option, idx) => (
            <option key={idx} value={String(option.value)}>
              {option.label}
            </option>
          ))}
        </select>
      );
    }

    if (field.type === 'boolean') {
      return (
        <select
          className={styles.input}
          value={value}
          onChange={(e) => handleFieldChange(field.name, e.target.value === 'true')}
          required={field.required}
        >
          <option value="">-- Select {field.label} --</option>
          <option value="true">True</option>
          <option value="false">False</option>
        </select>
      );
    }

 
    
    if (field.type === 'textarea' && field.htmlFormatted) {
      return (
        <RichTextEditor
          field={field}
          value={value}
          onChange={(newValue) => handleFieldChange(field.name, newValue)}
          required={field.required}
        />
      );
    }

    
    if (field.type === 'textarea' || field.name.toLowerCase().includes('description') || field.name.toLowerCase().includes('comment')) {
      return (
        <textarea
          className={styles.textarea}
          value={value}
          onChange={(e) => handleFieldChange(field.name, e.target.value)}
          required={field.required}
          rows={4}
          placeholder={`Enter ${field.label}`}
          maxLength={field.length}

        />
      );
    }

    if (field.type === 'date') {
      return (
        <input
          type="date"
          className={styles.input}
          value={value}
          onChange={(e) => handleFieldChange(field.name, e.target.value)}
          required={field.required}
        />
      );
    }

    
    if (field.type === 'datetime') {
      return (
        <input
          type="datetime-local"
          className={styles.input}
          value={value}
          onChange={(e) => handleFieldChange(field.name, e.target.value)}
          required={field.required}
        />
      );
    }

    if (field.type === 'int' || field.type === 'double' || field.type === 'currency' || field.type === 'percent') {
      return (
        <input
          type="number"
          className={styles.input}
          value={value}
          onChange={(e) => handleFieldChange(field.name, e.target.value)}
          required={field.required}
          placeholder={`Enter ${field.label}`}
        />
      );
    }

    if (field.type === 'email') {
      return (
        <input
          type="email"
          className={styles.input}
          value={value}
          onChange={(e) => handleFieldChange(field.name, e.target.value)}
          required={field.required}
          placeholder={`Enter ${field.label}`}
        />
      );
    }

    if (field.type === 'phone') {
      return (
        <input
          type="tel"
          className={styles.input}
          value={value}
          onChange={(e) => handleFieldChange(field.name, e.target.value)}
          required={field.required}
          placeholder={`Enter ${field.label}`}
        />
      );
    }

    
    if (field.type === 'url') {
      return (
        <input
          type="url"
          className={styles.input}
          value={value}
          onChange={(e) => handleFieldChange(field.name, e.target.value)}
          required={field.required}
          placeholder={`Enter ${field.label}`}

        />
      );
    }

    if (field.type === 'reference') {
      return (
        <Lookup
          field={field}
          objectName={selectedObject || ''}
          value={value}
          onChange={(newValue) => handleFieldChange(field.name, newValue)}
          required={field.required}
          placeholder={`Search ${field.label}...`}
        />
      );
    }

    return (
      <input
        type="text"
        className={styles.input}
        value={value}
        onChange={(e) => handleFieldChange(field.name, e.target.value)}
        required={field.required}
        placeholder={`Enter ${field.label}`}
        maxLength={field.length}
      />
    );
  };

  useEffect(() => {
    const fetchObjects = async () => {
      setLoadingObjects(true);
      setError(null);

      try {
        const response = await fetch(
          '/api/x_peekl_salesfor_0/x_peekl_salesfor_0_salesforce_integratio/salesforce/sobjects',
          {
            headers: {
              'Accept': 'application/json',
              'X-UserToken': window.g_ck || ''

            }
          }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch Salesforce objects');
        }

        const data = await response.json();
        const createableObjects = (data.sobjects || []).filter(
          (obj: SalesforceObject) => obj.createable === true
        );
        setAvailableObjects(createableObjects);
      } catch (err) {
        console.error('Error fetching objects:', err);
        setError(err instanceof Error ? err.message : 'Failed to load Salesforce objects');
      } finally {
        setLoadingObjects(false);
      }
    };

    fetchObjects();
  }, []);

  
  useEffect(() => {
    if (!selectedObject) {
      setRecordTypes([]);
      setSelectedRecordType(null);
      setFields([]);
      setRecordTypesLoaded(false); 
      return;
    }

    const fetchRecordTypes = async () => {
      setLoadingRecordTypes(true);
      setRecordTypesLoaded(false); 
      setError(null);
      setFields([]);
      setSelectedRecordType(null);

      try {
        const response = await fetch(
          `/api/x_peekl_salesfor_0/x_peekl_salesfor_0_salesforce_integratio/salesforce/record-types?object_name=${encodeURIComponent(selectedObject)}`,
          {
            headers: {
              'Accept': 'application/json',
              'X-UserToken': window.g_ck || ''

            }
          }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch object describe');
        }

        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.error || 'Failed to fetch record types');
        }
        
        
        const availableRecordTypes: RecordType[] = [];
        if (data.recordTypes && Array.isArray(data.recordTypes)) {
          data.recordTypes.forEach((rt: any) => {
            availableRecordTypes.push({
              name: rt.name,
              recordTypeId: rt.recordTypeId, 
              master: rt.master || false
            });
          });
        }
        
        setRecordTypes(availableRecordTypes);
        setRecordTypesLoaded(true);
        
        
        if (availableRecordTypes.length === 0) {
          setError('No record types found for this object');
        }
      } catch (err) {
        console.error('Error fetching record types:', err);
        setError(err instanceof Error ? err.message : 'Failed to load record types');
        
        setRecordTypes([]);
        setRecordTypesLoaded(true); 
      } finally {
        setLoadingRecordTypes(false);
      }
    };

    fetchRecordTypes();
  }, [selectedObject]);

  useEffect(() => {
    if (!selectedObject) {
      setFields([]);
      return;
    }

    
    if (loadingRecordTypes) {
      return;
    }

    
    
    if (!recordTypesLoaded) {
      return; 
    }
    
    
    if (recordTypes.length > 0 && !selectedRecordType) {
      setFields([]); 
      return;
    }
    
    const fetchFields = async () => {
      setLoadingFields(true);
      setError(null);

      try {
        
        if (recordTypes.length > 0 && !selectedRecordType) {
          setFields([]);
          setLoadingFields(false);
          return;
        }
    
        let recordTypeParam;
        if (recordTypes.length > 0 && selectedRecordType) {
          recordTypeParam = selectedRecordType === 'Master' ? 'Master' : selectedRecordType;
        } else if (recordTypes.length === 0) {
          
          recordTypeParam = 'Master';
        } else {
          
          setFields([]);
          setLoadingFields(false);
          return;
        }

        const endpoint = `/api/x_peekl_salesfor_0/x_peekl_salesfor_0_salesforce_integratio/salesforce/object/layout?object_name=${encodeURIComponent(selectedObject)}&record_type_id=${encodeURIComponent(recordTypeParam)}`;

        const response = await fetch(endpoint, {
          headers: {
            'Accept': 'application/json',
            'X-UserToken': window.g_ck || ''

          }
        });

        if (!response.ok) {
          const errorText = response.status === 404 
            ? `Layout not found for ${selectedObject}. This may indicate the object doesn't have a page layout configured.`
            : `Failed to fetch object fields (${response.status})`;
          throw new Error(errorText);
        }

        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.error || 'Failed to fetch object fields');
        }
        setFields(data.fields || []);
      } catch (err) {
        console.error('Error fetching fields:', err);
        setError(err instanceof Error ? err.message : 'Failed to load object fields');
        
        setFields([]);
      } finally {
        setLoadingFields(false);
      }
    };

    fetchFields();
  }, [selectedObject, selectedRecordType, recordTypes.length, loadingRecordTypes, recordTypesLoaded]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.pageTitle}>Create Salesforce Record </h1>
      </div>

      {loadingObjects && (
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
          <span className={styles.loadingText}>Loading objects...</span>
        </div>
      )}

   

      {!loadingObjects && (
        <div className={styles.formSection}>
          <div className={styles.formGroup}>
            <label className={styles.label}>
              Select Object
            </label>
            <select
              className={styles.select}
              value={selectedObject || ''}
              onChange={(e) => {
                setSelectedObject(e.target.value || null);
                setRecordTypes([]);
                setSelectedRecordType(null);
                setFields([]);
                setFormValues({});
                setRecordTypesLoaded(false);
              }}
              disabled={loadingObjects}
            >
              <option value="">-- Select an object --</option>
              {availableObjects.map((obj) => (
                <option key={obj.name} value={obj.name}>
                  {obj.label} ({obj.name})
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {selectedObject && loadingRecordTypes && (
        <div className={styles.loadingFields}>
          <div className={styles.spinner}></div>
          <span className={styles.loadingFieldsText}>Loading record types for {selectedObject}...</span>
        </div>
      )}

      {selectedObject && !loadingRecordTypes && recordTypes.length > 0 && (
        <div className={styles.formSection}>
          <div className={styles.formGroup}>
            <label className={styles.label}>
              Select Record Type
              <span className={styles.recordTypeBadge} title={`${recordTypes.length} record type${recordTypes.length !== 1 ? 's' : ''} available`}>
                {recordTypes.length} available
              </span>
            </label>
            <select
              className={styles.select}
              value={selectedRecordType || ''}
              onChange={(e) => {
                const newValue = e.target.value || null;
                setSelectedRecordType(newValue);
                setFields([]);
                setFormValues({});
              }}
              required
            >
              <option value="">-- Select a record type --</option>
              {recordTypes.map((rt) => (
                <option key={rt.recordTypeId} value={rt.recordTypeId}>
                  {rt.name} {rt.master ? '(Master)' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {selectedObject && loadingFields && (
        <div className={styles.loadingFields}>
          <div className={styles.spinner}></div>
          <span className={styles.loadingFieldsText}>Loading fields for {selectedObject}...</span>
        </div>
      )}

      {selectedObject && !loadingFields && fields.length > 0 && (
        <div className={styles.fieldsSection}>
          <h2 className={styles.sectionTitle}>Create {selectedObject} Record</h2>
          <form className={styles.form} onSubmit={async (e) => {
            e.preventDefault();
            await createSalesforceRecord();
          }}>
            <div className={styles.fieldsGrid}>
              {fields.map((field) => (
                <div key={field.name} className={styles.formGroup}>
                  <label className={styles.label}>
                    {field.label}
                    {field.required && <span className={styles.required}> *</span>}
                  </label>
                  {renderFieldInput(field)}
                </div>
              ))}
            </div>
            <div className={styles.formActions}>
              <button
                type="button"
                className={styles.cancelButton}
                onClick={() => {
                  setSelectedObject(null);
                  setRecordTypes([]);
                  setSelectedRecordType(null);
                  setFields([]);
                  setFormValues({});
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={styles.submitButton}
                disabled={submitting}
              >
                {submitting ? 'Creating...' : 'Create Record'}
              </button>
            </div>
            {error && (
              <div className={styles.error}>
                {error}
              </div>
            )}
            {success && (
              <div className={styles.success}>
                {success}
              </div>
            )}
          </form>
        </div>
      )}

      {selectedObject && !loadingFields && fields.length === 0 && (
        <div className={styles.emptyState}>
          <p className={styles.emptyStateText}>No createable fields found for {selectedObject}</p>
        </div>
      )}
    </div>
  );
};

export default CreateSalesforceRecord;