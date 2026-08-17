import { useState, useCallback } from 'react';
import styles from './Lookup.module.css';

interface LookupOption {
  value: string;
  label: string;
  description?: string;
}

interface LookupProps {
  field: {
    name: string;
    label: string;
    type: string;
  };
  objectName: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
}


const namedFields = new Set([
  'Name',
  'DeveloperName',
  'Subject',
  'AlternativePaymentMethodNumber',
  'TestSuiteName',
  'ApiAnomalyEventNumber',
  'AssetActionNumber',
  'AssetActionSourceNumber',
  'AssetRelationshipNumber',
  'AssetStatePeriodNumber',
  'AssociatedLocationNumber',
  'AsyncOperationNumber',
  'Title',
  'FriendlyName',
  'CardPaymentMethodNumber',
  'CaseNumber',
  'ApiName',
  'ContractNumber',
  'CredentialStuffingEventNumber',
  'DocumentNumber',
  'CreditMemoInvoiceNumber',
  'DigitalWalletNumber',
  'Domain',
  'LocalPart',
  'FunctionName',
  'EventRelayNumber',
  'FinanceBalanceSnapshotNumber',
  'FinanceTransactionNumber',
  'MasterLabel',
  'LocationGroupName',
  'LocationGroupAssignment',
  'OrderNumber',
  'OrderItemNumber',
  'PaymentNumber',
  'PaymentAuthAdjustmentNumber',
  'PaymentAuthorizationNumber',
  'PaymentGatewayName',
  'PaymentGatewayLogNumber',
  'PaymentGroupNumber',
  'PaymentLineInvoiceNumber',
  'ProcessExceptionNumber',
  'RefundNumber',
  'RefundLinePaymentNumber',
  'ReportAnomalyEventNumber',
  'SessionHijackingEventNumber',
  'SolutionName',
  'ThreatDetectionFeedbackNumber',
  'Label',
  'AccountNumber',
  'Email',
  'Phone'
]);

const Lookup: React.FC<LookupProps> = ({ field, objectName, value, onChange, required, placeholder }) => {
  const [options, setOptions] = useState<LookupOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOption, setSelectedOption] = useState<LookupOption | null>(null);

  const fetchLookupSuggestions = useCallback(async (searchParams: string) => {
    setIsLoading(true);
    try {
      const uri = `/${objectName}/${field.name}${searchParams}`;
      const response = await fetch(
        `/api/x_1955226_peeklo_1/x_1955226_peeklo_1_salesforce_integratio/salesforce/lookup-suggestions?uri=${encodeURIComponent(uri)}`,
        {
          headers: {
            'Accept': 'application/json',
            'X-UserToken': window.g_ck || ''
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch lookup suggestions');
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch lookup suggestions');
      }

      const lookupData = data.data;
      const results: LookupOption[] = [];
      const metadata = new Map<string, string>();

      
      if (lookupData.metadata) {
        for (const [key, value] of Object.entries(lookupData.metadata as Record<string, any>)) {
          if (value && value.secondaryField) {
            metadata.set(key, value.secondaryField);
          }
        }
      }

      
      if (lookupData.lookupResults) {
        for (const [, lookupResult] of Object.entries(lookupData.lookupResults as Record<string, any>)) {
          if (lookupResult && lookupResult.records && Array.isArray(lookupResult.records)) {
            for (const record of lookupResult.records) {
              const option: LookupOption = {
                value: record.id,
                label: '',
                description: ''
              };

              let secondaryField: string | undefined;
              if (metadata.has(record.apiName)) {
                secondaryField = metadata.get(record.apiName);
              }

              if (record.fields) {
                for (const [fieldKey, fieldValue] of Object.entries(record.fields as Record<string, any>)) {
                  if (namedFields.has(fieldKey) && secondaryField !== fieldKey) {
                    option.label = fieldValue?.value || fieldKey;
                  }
                }

                if (secondaryField) {
                  try {
                    const fieldPath = secondaryField.split('.');
                    let recordValue: any = record.fields;
                    for (const path of fieldPath) {
                      const pathValue = recordValue[path];
                      if (pathValue) {
                        if (pathValue.value !== undefined) {
                          if (typeof pathValue.value === 'object' && pathValue.value.fields) {
                            recordValue = pathValue.value.fields;
                          } else {
                            option.description = pathValue.value || '';
                            break;
                          }
                        } else if (pathValue.fields) {
                          recordValue = pathValue.fields;
                        } else {
                          break;
                        }
                      } else {
                        break;
                      }
                    }
                  } catch (error) {
                    console.error('Error parsing secondary field:', error);
                  }
                }
              }

              if (option.label) {
                results.push(option);
              }
            }
          }
        }
      }

      setOptions(results);
    } catch (error) {
      console.error('Error fetching lookup suggestions:', error);
      setOptions([]);
    } finally {
      setIsLoading(false);
    }
  }, [objectName, field.name]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    setSearchTerm(inputValue);
    setSelectedOption(null);

    if (inputValue.length === 15 || inputValue.length === 18) {
      const idPattern = /^[a-zA-Z0-9]{15}$|^[a-zA-Z0-9]{18}$/;
      if (idPattern.test(inputValue)) {
        onChange(inputValue);
        return;
      }
    }

    
    if (inputValue.length === 0) {
      onChange('');
      setIsOpen(false);
      setOptions([]);
      return;
    }

    if (inputValue.length >= 3) {
      const searchParams = `?searchType=Search&q=${encodeURIComponent(inputValue)}`;
      fetchLookupSuggestions(searchParams);
      setIsOpen(true);
    } else {
      setIsOpen(false);
      setOptions([]);
    }
  };

  const handleOptionSelect = (option: LookupOption) => {
    setSelectedOption(option);
    setSearchTerm(option.label);
    onChange(option.value);
    setIsOpen(false);
  };

  const handleFocus = () => {
    if (options.length === 0 && searchTerm.length === 0) {
      fetchLookupSuggestions('');
    }
    setIsOpen(true);
  };

  const handleBlur = () => {
    setTimeout(() => {
      setIsOpen(false);
    }, 200);
  };

  return (
    <div className={styles.lookupContainer}>
      <input
        type="text"
        className={styles.lookupInput}
        value={selectedOption ? selectedOption.label : (searchTerm !== '' ? searchTerm : (value || ''))}
        onChange={handleInputChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        required={required}
        placeholder={placeholder || `Search ${field.label}...`}
        autoComplete="off"
      />
      {isLoading && (
        <div className={styles.loadingIndicator}>Searching...</div>
      )}
      {isOpen && options.length > 0 && (
        <div className={styles.dropdown}>
          {options.map((option, index) => (
            <div
              key={option.value || index}
              className={styles.option}
              onClick={() => handleOptionSelect(option)}
              onMouseDown={(e) => e.preventDefault()} 
            >
              <div className={styles.optionLabel}>{option.label}</div>
              {option.description && (
                <div className={styles.optionDescription}>{option.description}</div>
              )}
            </div>
          ))}
        </div>
      )}
      {isOpen && !isLoading && options.length === 0 && searchTerm.length >= 3 && (
        <div className={styles.dropdown}>
          <div className={styles.noResults}>No records found</div>
        </div>
      )}
    </div>
  );
};

export default Lookup;

