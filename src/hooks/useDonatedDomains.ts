import { useState, useEffect } from 'react';
import { DonatedDomain, DomainSubmission } from '@/lib/donatedDomains';

// Hook for getting available donated domains
export function useAvailableDomains() {
    const [domains, setDomains] = useState<DonatedDomain[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchDomains = async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await fetch('/api/domains/donated?type=available');
            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Failed to fetch domains');
            }

            setDomains(data.domains);
        } catch (err: any) {
            setError(err.message);
            console.error('Error fetching available domains:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDomains();
    }, []);

    return { domains, loading, error, refetch: fetchDomains };
}

// Hook for getting user's donated domains
export function useMyDonatedDomains() {
    const [domains, setDomains] = useState<DonatedDomain[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchDomains = async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await fetch('/api/domains/donated?type=my-domains');
            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Failed to fetch domains');
            }

            setDomains(data.domains);
        } catch (err: any) {
            setError(err.message);
            console.error('Error fetching my donated domains:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDomains();
    }, []);

    return { domains, loading, error, refetch: fetchDomains };
}

// Hook for submitting a domain for donation
export function useDomainSubmission() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const submitDomain = async (submission: DomainSubmission) => {
        try {
            setLoading(true);
            setError(null);
            setSuccess(false);

            const response = await fetch('/api/domains/donated', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(submission),
            });

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Failed to submit domain');
            }

            setSuccess(true);
            return data.domain;
        } catch (err: any) {
            setError(err.message);
            console.error('Error submitting domain:', err);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const reset = () => {
        setError(null);
        setSuccess(false);
    };

    return { submitDomain, loading, error, success, reset };
}

// Hook for checking subdomain availability on donated domains
export function useDonatedSubdomainCheck() {
    const [loading, setLoading] = useState(false);
    const [availability, setAvailability] = useState<{ [key: string]: boolean }>({});

    const checkAvailability = async (domainId: string, subdomain: string) => {
        try {
            setLoading(true);

            const response = await fetch('/api/domains/check-subdomain', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    domain_id: domainId,
                    subdomain: subdomain
                }),
            });

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Failed to check availability');
            }

            const key = `${domainId}-${subdomain}`;
            setAvailability(prev => ({
                ...prev,
                [key]: data.available
            }));

            return data.available;
        } catch (err: any) {
            console.error('Error checking subdomain availability:', err);
            return false;
        } finally {
            setLoading(false);
        }
    };

    const getAvailability = (domainId: string, subdomain: string): boolean | undefined => {
        const key = `${domainId}-${subdomain}`;
        return availability[key];
    };

    return { checkAvailability, getAvailability, loading };
}

// Hook for managing domain settings
export function useDomainManagement() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const toggleDomainStatus = async (domainId: string, isActive: boolean) => {
        try {
            setLoading(true);
            setError(null);

            const response = await fetch(`/api/domains/${domainId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'toggle-status',
                    is_active: isActive
                }),
            });

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Failed to update domain status');
            }

            return true;
        } catch (err: any) {
            setError(err.message);
            console.error('Error toggling domain status:', err);
            return false;
        } finally {
            setLoading(false);
        }
    };

    const updateDomainSettings = async (domainId: string, updates: any) => {
        try {
            setLoading(true);
            setError(null);

            const response = await fetch(`/api/domains/${domainId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'update-settings',
                    ...updates
                }),
            });

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Failed to update domain settings');
            }

            return true;
        } catch (err: any) {
            setError(err.message);
            console.error('Error updating domain settings:', err);
            return false;
        } finally {
            setLoading(false);
        }
    };

    const getDomainUsage = async (domainId: string) => {
        try {
            setLoading(true);
            setError(null);

            const response = await fetch(`/api/domains/${domainId}`);
            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Failed to fetch domain usage');
            }

            return data.usage;
        } catch (err: any) {
            setError(err.message);
            console.error('Error fetching domain usage:', err);
            return [];
        } finally {
            setLoading(false);
        }
    };

    return {
        toggleDomainStatus,
        updateDomainSettings,
        getDomainUsage,
        loading,
        error
    };
}
