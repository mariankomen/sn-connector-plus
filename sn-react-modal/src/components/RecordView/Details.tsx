import { useEffect, useState } from "react";
import type { IRecordModalProps } from "../../interfaces/IRecordModal";

interface RecordData {
    [key: string]: any;
}

interface ApiResponse {
    success: boolean;
    recordId?: string;
    objectType?: string;
    data?: RecordData;
    error?: string;
}

const Details = ({ sf_object_type, sf_record_id }: IRecordModalProps) => {
    const [loading, setLoading] = useState<boolean>(true);
    const [recordData, setRecordData] = useState<RecordData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [objectType, setObjectType] = useState<string | null>(null);

    useEffect(() => {
        const fetchDetails = async () => {
            if (!sf_record_id) {
                setError("Record ID is required");
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setError(null);
                
                const url = `/api/x_peekl_salesfor_0/x_peekl_salesfor_0_salesforce_integratio/salesforce/object/detail?sf_record_id=${encodeURIComponent(sf_record_id)}&sf_object_type=${encodeURIComponent(sf_object_type || '')}`;
                
                const response = await fetch(url, {
                    headers: {
                        "Accept": "application/json",
                        'X-UserToken': window.g_ck || ''
                    },
                });

                const data: ApiResponse = await response.json();

                if (!response.ok || !data.success) {
                    throw new Error(data.error || "Failed to fetch record details");
                }

                if (data.data) {
                    setRecordData(data.data);
                }
                if (data.objectType) {
                    setObjectType(data.objectType);
                }
            } catch (err: any) {
                console.error("Error fetching details:", err);
                setError(err.message || "Failed to load record details");
            } finally {
                setLoading(false);
            }
        };

        fetchDetails();
    }, [sf_record_id, sf_object_type]);

    const formatFieldValue = (value: any): string => {
        if (value === null || value === undefined) {
            return "";
        }
        if (typeof value === "boolean") {
            return value ? "Yes" : "No";
        }
        if (typeof value === "object") {
            return JSON.stringify(value);
        }
        return String(value);
    };

  
    const isUrlField = (fieldName: string): boolean => {
        return fieldName.endsWith("_url");
    };

    const formatFieldName = (fieldName: string): string => {
        let name = fieldName.replace("_url", "");
        
       
        if (name === "attributes" || name === "Id" || name === "id") {
            return "";
        }

       
        name = name.replace(/__c$/, "");

      
        name = name.replace(/([A-Z])/g, " $1").trim();
        
   
        return name.charAt(0).toUpperCase() + name.slice(1);
    };

    
    const shouldDisplayField = (fieldName: string, value: any): boolean => {
    
        if (fieldName === "attributes" && typeof value === "object") {
            return false;
        }
        
       
        if (isUrlField(fieldName)) {
            return false;
        }

   

        return true;
    };

    if (loading) {
        return (
            <div style={{ padding: "20px", textAlign: "center" }}>
                <div style={{ 
                    display: "inline-block",
                    width: "20px",
                    height: "20px",
                    border: "3px solid #f3f3f3",
                    borderTop: "3px solid #3498db",
                    borderRadius: "50%",
                    animation: "spin 1s linear infinite"
                }}></div>
                <p style={{ marginTop: "10px", color: "#666" }}>Loading record details...</p>
                <style>{`
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                `}</style>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ padding: "20px" }}>
                <div style={{ 
                    padding: "15px",
                    backgroundColor: "#fee",
                    border: "1px solid #fcc",
                    borderRadius: "4px",
                    color: "#c33"
                }}>
                    <strong>Error:</strong> {error}
                </div>
            </div>
        );
    }

    if (!recordData) {
        return (
            <div style={{ padding: "20px", textAlign: "center", color: "#666" }}>
                <p>No record data available</p>
            </div>
        );
    }

    
    const basicFields: Array<[string, any]> = [];
    const customFields: Array<[string, any]> = [];
    const systemFields: Array<[string, any]> = [];

    for (const [fieldName, value] of Object.entries(recordData)) {
        if (!shouldDisplayField(fieldName, value)) {
            continue;
        }

        if (fieldName.includes("__c")) {
            customFields.push([fieldName, value]);
        } else if (fieldName.includes("Id") || fieldName.includes("Date") || fieldName.includes("By")) {
            systemFields.push([fieldName, value]);
        } else {
            basicFields.push([fieldName, value]);
        }
    }

    const renderField = (fieldName: string, value: any) => {
        const displayName = formatFieldName(fieldName);
        if (!displayName) return null;

        const urlFieldName = fieldName + "_url";
        const hasUrl = recordData[urlFieldName];

        return (
            <div key={fieldName} style={{ 
                marginBottom: "15px",
                paddingBottom: "15px",
                borderBottom: "1px solid #eee"
            }}>
                <div style={{ 
                    fontWeight: "600",
                    color: "#333",
                    marginBottom: "5px",
                    fontSize: "14px"
                }}>
                    {displayName}
                </div>
                <div style={{ color: "#666", fontSize: "14px" }}>
                    {hasUrl ? (
                        <a 
                            href={recordData[urlFieldName]} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            style={{ 
                                color: "#0066cc",
                                textDecoration: "none"
                            }}
                            onMouseOver={(e) => e.currentTarget.style.textDecoration = "underline"}
                            onMouseOut={(e) => e.currentTarget.style.textDecoration = "none"}
                        >
                            {formatFieldValue(value)} <span style={{ fontSize: "12px" }}>🔗</span>
                        </a>
                    ) : (
                        <span>{formatFieldValue(value) || <em style={{ color: "#999" }}>—</em>}</span>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div style={{ 
            height: "100%",
            width: "100%",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column"
        }}>
            <style>{`
                .details-scrollable::-webkit-scrollbar {
                    width: 8px;
                }
                .details-scrollable::-webkit-scrollbar-track {
                    background: #f1f1f1;
                    border-radius: 4px;
                }
                .details-scrollable::-webkit-scrollbar-thumb {
                    background: #888;
                    border-radius: 4px;
                }
                .details-scrollable::-webkit-scrollbar-thumb:hover {
                    background: #555;
                }
                .details-container {
                    max-height: 400px !important;
                    height: 400px !important;
                    min-height: 0 !important;
                    overflow: hidden !important;
                    position: relative !important;
                    width: 100% !important;
                    display: flex !important;
                    flex-direction: column !important;
                }
                @media (max-height: 700px) {
                    .details-container {
                        max-height: 300px !important;
                        height: 300px !important;
                    }
                }
                @media (min-height: 900px) {
                    .details-container {
                        max-height: 500px !important;
                        height: 500px !important;
                    }
                }
            `}</style>
            <div 
                className="details-container"
                style={{ 
                    display: "flex",
                    flexDirection: "column",
                    overflow: "hidden",
                    boxSizing: "border-box",
                    position: "relative",
                    width: "100%"
                }}
            >
            {objectType && (
                <div style={{ 
                    flexShrink: 0,
                    padding: "20px 20px 15px 20px",
                    borderBottom: "2px solid #ddd",
                    backgroundColor: "#fff"
                }}>
                    <h2 style={{ 
                        margin: "0 0 5px 0",
                        fontSize: "18px",
                        fontWeight: "600",
                        color: "#333"
                    }}>
                        {objectType} Details
                    </h2>
                    {recordData.CaseNumber && (
                        <p style={{ 
                            margin: "0",
                            color: "#666",
                            fontSize: "14px"
                        }}>
                            {recordData.CaseNumber}
                        </p>
                    )}
                </div>
            )}

            <div 
                className="details-scrollable"
                style={{ 
                    flex: "1 1 0%", 
                    overflowY: "auto",
                    overflowX: "hidden",
                    padding: "20px",
                    paddingBottom: "40px", 
                    minHeight: "0", 
                    maxHeight: "100%", 
                    height: "0", 
                    scrollBehavior: "smooth",
                    boxSizing: "border-box",
                    position: "relative"
                }}
            >
                {basicFields.length > 0 && (
                    <div style={{ marginBottom: "30px" }}>
                        <h3 style={{ 
                            fontSize: "16px",
                            fontWeight: "600",
                            color: "#333",
                            marginBottom: "15px",
                            paddingBottom: "8px",
                            borderBottom: "1px solid #ddd"
                        }}>
                            Basic Information
                        </h3>
                        {basicFields.map(([fieldName, value]) => renderField(fieldName, value))}
                    </div>
                )}

                {customFields.length > 0 && (
                    <div style={{ marginBottom: "30px" }}>
                        <h3 style={{ 
                            fontSize: "16px",
                            fontWeight: "600",
                            color: "#333",
                            marginBottom: "15px",
                            paddingBottom: "8px",
                            borderBottom: "1px solid #ddd"
                        }}>
                            Custom Fields
                        </h3>
                        {customFields.map(([fieldName, value]) => renderField(fieldName, value))}
                    </div>
                )}

                {systemFields.length > 0 && (
                    <div style={{ marginBottom: "30px" }}>
                        <h3 style={{ 
                            fontSize: "16px",
                            fontWeight: "600",
                            color: "#333",
                            marginBottom: "15px",
                            paddingBottom: "8px",
                            borderBottom: "1px solid #ddd"
                        }}>
                            System Information
                        </h3>
                        {systemFields.map(([fieldName, value]) => renderField(fieldName, value))}
                    </div>
                )}

                {basicFields.length === 0 && customFields.length === 0 && systemFields.length === 0 && (
                    <div style={{ padding: "40px", textAlign: "center", color: "#666" }}>
                        <p>No fields to display</p>
                    </div>
                )}
            </div>
        </div>
        </div>
    );
};

export default Details;
