import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';

export interface UserPage {
    id: string;
    title: string;
    domain: string;
    status: 'creating' | 'active' | 'error' | 'disabled';
    deployment_status: 'pending' | 'building' | 'deployed' | 'failed';
    github_repo: string;
    custom_url: string;
    created_at: string;
    last_updated: string;
    file_count: number;
    page_views: number;
}

export interface CreatePageForm {
    title: string;
    subdomain: string;
    domain: string;
    files: FileList | null;
    donatedDomainId?: string;
}

export interface PageCreationResult {
    success: boolean;
    page?: {
        id: string;
        title: string;
        domain: string;
        github_url: string;
        pages_url: string;
        custom_url: string;
        status: string;
    };
    error?: string;
}

export function useUserPages() {
    const { data: session } = useSession();
    const [pages, setPages] = useState<UserPage[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchPages = useCallback(async () => {
        if (!session?.user?.email) return;

        setLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/pages/create');

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            setPages(data.pages || []);
        } catch (err: any) {
            console.error('Error fetching pages:', err);
            setError(err.message || 'Failed to fetch pages');
        } finally {
            setLoading(false);
        }
    }, [session?.user?.email]);

    useEffect(() => {
        fetchPages();
    }, [fetchPages]);

    return {
        pages,
        loading,
        error,
        refresh: fetchPages
    };
}

export function useCreatePage() {
    const { data: session } = useSession();
    const [creating, setCreating] = useState(false);
    const [progress, setProgress] = useState(0);
    const [currentStep, setCurrentStep] = useState('');

    const createPage = useCallback(async (formData: CreatePageForm): Promise<PageCreationResult> => {
        if (!session?.user?.email) {
            return { success: false, error: 'Authentication required' };
        }

        if (!formData.files || formData.files.length === 0) {
            return { success: false, error: 'No files selected' };
        }

        setCreating(true);
        setProgress(0);
        setCurrentStep('Validating files...');

        try {
            // Create FormData for file upload
            const uploadData = new FormData();
            uploadData.append('title', formData.title);
            uploadData.append('subdomain', formData.subdomain);
            uploadData.append('domain', formData.domain);

            // Add donated domain ID if provided
            if (formData.donatedDomainId) {
                uploadData.append('donatedDomainId', formData.donatedDomainId);
            }

            // Add all files
            Array.from(formData.files).forEach((file) => {
                uploadData.append('files', file);
            });

            // Simulate progress updates
            const progressSteps = [
                { progress: 10, step: 'Checking subdomain availability...' },
                { progress: 20, step: 'Creating GitHub repository...' },
                { progress: 40, step: 'Uploading files...' },
                { progress: 60, step: 'Enabling GitHub Pages...' },
                { progress: 80, step: 'Configuring custom domain...' },
                { progress: 90, step: 'Setting up DNS...' },
                { progress: 100, step: 'Finalizing deployment...' }
            ];

            let currentProgressIndex = 0;
            const progressInterval = setInterval(() => {
                if (currentProgressIndex < progressSteps.length) {
                    const step = progressSteps[currentProgressIndex];
                    setProgress(step.progress);
                    setCurrentStep(step.step);
                    currentProgressIndex++;
                } else {
                    clearInterval(progressInterval);
                }
            }, 1000);

            const response = await fetch('/api/pages/create', {
                method: 'POST',
                body: uploadData,
            });

            clearInterval(progressInterval);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP ${response.status}`);
            }

            const result = await response.json();

            setProgress(100);
            setCurrentStep('Page created successfully!');

            return { success: true, page: result.page };

        } catch (err: any) {
            console.error('Error creating page:', err);
            return { success: false, error: err.message || 'Failed to create page' };
        } finally {
            setCreating(false);
            // Reset progress after a short delay
            setTimeout(() => {
                setProgress(0);
                setCurrentStep('');
            }, 2000);
        }
    }, [session?.user?.email]);

    return {
        createPage,
        creating,
        progress,
        currentStep
    };
}

export function useSubdomainAvailability() {
    const [checking, setChecking] = useState(false);
    const [availability, setAvailability] = useState<{
        available: boolean;
        domains: { [key: string]: boolean };
    } | null>(null);

    const checkAvailability = useCallback(async (subdomain: string) => {
        if (!subdomain || subdomain.length < 1) {
            setAvailability(null);
            return;
        }

        setChecking(true);

        try {
            const response = await fetch(`/api/pages/check-availability?subdomain=${encodeURIComponent(subdomain)}`);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            setAvailability(data);
        } catch (err: any) {
            console.error('Error checking availability:', err);
            setAvailability(null);
        } finally {
            setChecking(false);
        }
    }, []);

    return {
        checkAvailability,
        checking,
        availability
    };
}

export function usePageManagement() {
    const { data: session } = useSession();
    const [updating, setUpdating] = useState<string | null>(null);

    const updatePage = useCallback(async (pageId: string, files: FileList): Promise<boolean> => {
        if (!session?.user?.email) return false;

        setUpdating(pageId);

        try {
            const formData = new FormData();
            Array.from(files).forEach((file) => {
                formData.append('files', file);
            });

            const response = await fetch(`/api/pages/${pageId}/update`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            return true;
        } catch (err: any) {
            console.error('Error updating page:', err);
            return false;
        } finally {
            setUpdating(null);
        }
    }, [session?.user?.email]);

    const deletePage = useCallback(async (pageId: string): Promise<boolean> => {
        if (!session?.user?.email) return false;

        try {
            const response = await fetch(`/api/pages/${pageId}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            return true;
        } catch (err: any) {
            console.error('Error deleting page:', err);
            return false;
        }
    }, [session?.user?.email]);

    return {
        updatePage,
        deletePage,
        updating
    };
}
