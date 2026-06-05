/**
 * Form Validation Utilities
 * Provides reusable validation functions and error messages
 */

export interface ValidationError {
    field: string;
    message: string;
    code: string;
}

export interface ValidationResult {
    isValid: boolean;
    errors: ValidationError[];
}

// Email validation
export const validateEmail = (email: string): ValidationError | null => {
    if (!email) {
        return { field: 'email', message: 'Email is required', code: 'EMAIL_REQUIRED' };
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return { field: 'email', message: 'Please enter a valid email address', code: 'EMAIL_INVALID' };
    }
    return null;
};

// Password validation
export const validatePassword = (password: string, minLength = 8): ValidationError | null => {
    if (!password) {
        return { field: 'password', message: 'Password is required', code: 'PASSWORD_REQUIRED' };
    }
    if (password.length < minLength) {
        return {
            field: 'password',
            message: `Password must be at least ${minLength} character${minLength > 1 ? 's' : ''}`,
            code: 'PASSWORD_TOO_SHORT',
        };
    }
    return null;
};

// SSID validation (WiFi network name)
export const validateSSID = (ssid: string): ValidationError | null => {
    if (!ssid || ssid.trim() === '') {
        return { field: 'ssid', message: 'Network name (SSID) is required', code: 'SSID_REQUIRED' };
    }
    if (ssid.length > 32) {
        return { field: 'ssid', message: 'Network name must be 32 characters or less', code: 'SSID_TOO_LONG' };
    }
    return null;
};

// IP Address validation
export const validateIPAddress = (ip: string): ValidationError | null => {
    if (!ip) {
        return { field: 'ip', message: 'IP address is required', code: 'IP_REQUIRED' };
    }
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(ip)) {
        return { field: 'ip', message: 'Please enter a valid IP address', code: 'IP_INVALID_FORMAT' };
    }
    const parts = ip.split('.');
    if (parts.some(part => parseInt(part) > 255)) {
        return { field: 'ip', message: 'Each IP octet must be between 0 and 255', code: 'IP_INVALID_RANGE' };
    }
    return null;
};

// MAC Address validation
export const validateMACAddress = (mac: string): ValidationError | null => {
    if (!mac) {
        return { field: 'mac', message: 'MAC address is required', code: 'MAC_REQUIRED' };
    }
    const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$|^([0-9A-Fa-f]{4}\.){2}([0-9A-Fa-f]{4})$/;
    if (!macRegex.test(mac)) {
        return {
            field: 'mac',
            message: 'Please enter a valid MAC address (e.g., 00:1A:2B:3C:4D:5E or 001a.2b3c.4d5e)',
            code: 'MAC_INVALID_FORMAT',
        };
    }
    return null;
};

// Hostname validation
export const validateHostname = (hostname: string): ValidationError | null => {
    if (!hostname) {
        return { field: 'hostname', message: 'Hostname is required', code: 'HOSTNAME_REQUIRED' };
    }
    if (hostname.length > 63) {
        return { field: 'hostname', message: 'Hostname must be 63 characters or less', code: 'HOSTNAME_TOO_LONG' };
    }
    const hostnameRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/;
    if (!hostnameRegex.test(hostname)) {
        return {
            field: 'hostname',
            message: 'Hostname can only contain letters, numbers, and hyphens',
            code: 'HOSTNAME_INVALID_FORMAT',
        };
    }
    return null;
};

// Required field validation
export const validateRequired = (value: string | undefined | null, fieldName: string): ValidationError | null => {
    if (!value || value.trim() === '') {
        return { field: fieldName, message: `${fieldName} is required`, code: 'FIELD_REQUIRED' };
    }
    return null;
};

// Number range validation
export const validateNumberRange = (
    value: number | string,
    min: number,
    max: number,
    fieldName: string
): ValidationError | null => {
    const num = typeof value === 'string' ? parseInt(value) : value;
    if (isNaN(num)) {
        return { field: fieldName, message: `${fieldName} must be a number`, code: 'NOT_A_NUMBER' };
    }
    if (num < min || num > max) {
        return {
            field: fieldName,
            message: `${fieldName} must be between ${min} and ${max}`,
            code: 'OUT_OF_RANGE',
        };
    }
    return null;
};

// VLAN ID validation
export const validateVLANId = (vlanId: string | number): ValidationError | null => {
    return validateNumberRange(vlanId, 1, 4094, 'VLAN ID');
};

// Port number validation
export const validatePort = (port: string | number): ValidationError | null => {
    return validateNumberRange(port, 1, 65535, 'Port');
};

// Subnet mask validation
export const validateSubnetMask = (subnet: string): ValidationError | null => {
    if (!subnet) {
        return { field: 'subnet', message: 'Subnet mask is required', code: 'SUBNET_REQUIRED' };
    }
    const validSubnets = [
        '255.255.255.0',
        '255.255.255.128',
        '255.255.255.192',
        '255.255.255.224',
        '255.255.255.240',
        '255.255.255.248',
        '255.255.255.252',
        '255.255.0.0',
        '255.0.0.0',
    ];
    if (!validSubnets.includes(subnet)) {
        return { field: 'subnet', message: 'Please enter a valid subnet mask', code: 'SUBNET_INVALID' };
    }
    return null;
};

// Batch validation
export const validateForm = (
    data: Record<string, any>,
    validators: Record<string, (value: any) => ValidationError | null>
): ValidationResult => {
    const errors: ValidationError[] = [];

    for (const [field, validator] of Object.entries(validators)) {
        const error = validator(data[field]);
        if (error) {
            errors.push(error);
        }
    }

    return {
        isValid: errors.length === 0,
        errors,
    };
};

// Get error message by field
export const getErrorByField = (errors: ValidationError[], field: string): string | null => {
    const error = errors.find(e => e.field === field);
    return error?.message || null;
};

// Check if field has error
export const hasFieldError = (errors: ValidationError[], field: string): boolean => {
    return errors.some(e => e.field === field);
};
