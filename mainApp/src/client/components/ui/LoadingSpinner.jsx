import React from 'react';
import './LoadingSpinner.css';

const SIZE_CONFIG = {
    small: { width: 14, height: 14, borderWidth: 2 },
    medium: { width: 18, height: 18, borderWidth: 2 },
    large: { width: 24, height: 24, borderWidth: 3 },
    xlarge: { width: 40, height: 40, borderWidth: 4 }
};

export default function LoadingSpinner({ size = 'small' }) {
    const config = SIZE_CONFIG[size] || SIZE_CONFIG.small;
    
    return (
        <span className="loading-spinner">
            <span 
                className="spinner-circle"
                style={{
                    width: `${config.width}px`,
                    height: `${config.height}px`,
                    borderWidth: `${config.borderWidth}px`
                }}
            ></span>
        </span>
    );
}

