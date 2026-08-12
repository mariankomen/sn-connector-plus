export interface Filter {
    field: { label: string; value: { name: string; type: string } } | null;
    operator: { label: string; value: '=' | '!=' } | null;
    fieldValue: Array<{ label: string; value: any }>;
}

export const buildWhereClause = (filters: Filter[]): string | null => {
    if (!filters || filters.length === 0) {
        return null;
    }

    const whereStatements: string[] = [];

    filters.forEach(filter => {
        if (!filter.field || !filter.operator || !filter.fieldValue || filter.fieldValue.length === 0) {
            console.warn('Skipping incomplete filter:', filter);
            return;
        }

        if (!filter.field.value || !filter.field.value.name) {
            console.warn('Filter field missing name:', filter);
            return;
        }

        const fieldName = filter.field.value.name;
        const operator = filter.operator.value;
        const fieldType = filter.field.value.type?.toLowerCase() || '';
        const isBoolean = fieldType === 'boolean';
        
        const fieldExpressions: string[] = [];
        
        filter.fieldValue.forEach(fv => {
            let expression: string;
            
            if (isBoolean) {
                expression = `${fieldName} ${operator} ${fv.value}`;
            } else {
                const escapedValue = String(fv.value).replace(/'/g, "''");
                expression = `${fieldName} ${operator} '${escapedValue}'`;
            }
            
            fieldExpressions.push(expression);
        });

       
        if (fieldExpressions.length > 0) {
            whereStatements.push(`( ${fieldExpressions.join(' OR ')} )`);
        }
    });

    if (whereStatements.length > 0) {
        const result = whereStatements.join(' AND ');
        return result;
    }

    console.warn('No valid WHERE statements built from filters');
    return null;
};


export const isValidFilter = (filter: Filter): boolean => {
    return !!(
        filter.field &&
        filter.operator &&
        filter.fieldValue &&
        filter.fieldValue.length > 0
    );
};

