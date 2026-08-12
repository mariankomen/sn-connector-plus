import React from 'react'
import './Button.css'
import LoadingSpinner from './LoadingSpinner.jsx'

export type ButtonProps = {
    variant?: string
    loading?: boolean
} & React.ButtonHTMLAttributes<HTMLButtonElement>

export default function Button({
    variant = 'primary',
    disabled = false,
    onClick,
    loading = false,
    className = '',
    title,
    children,
    ...props
}: ButtonProps) {
    const buttonClasses = `btn btn-${variant} ${className}`.trim()

    return (
        <button
            type="button"
            className={buttonClasses}
            disabled={disabled || loading}
            onClick={onClick}
            title={title}
            {...props}
        >
            {loading && <LoadingSpinner />}
            {children}
        </button>
    )
}
