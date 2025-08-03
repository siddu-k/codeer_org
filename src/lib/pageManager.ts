import { supabase } from './supabase';

export interface UserPage {
    id: string;
    user_id: string;
    title: string;
    subdomain: string;
    domain: string;
    full_domain: string; // subdomain.domain
    github_repo: string;
    github_pages_url: string;
    custom_domain_url: string;
    status: 'creating' | 'active' | 'error' | 'disabled';
    deployment_status: 'pending' | 'building' | 'deployed' | 'failed';
    last_updated: string;
    created_at: string;
    file_count: number;
    repo_size: number;
    page_views?: number;
    metadata?: {
        description?: string;
        tags?: string[];
        thumbnail_url?: string;
        last_commit?: string;
        build_time?: number;
    };
}

export interface PageDeployment {
    id: string;
    page_id: string;
    status: 'pending' | 'building' | 'deployed' | 'failed';
    started_at: string;
    completed_at?: string;
    error_message?: string;
    commit_sha?: string;
    file_changes: number;
    build_logs?: string;
}

export class PageManager {
    /**
     * Create a new page record in database
     */
    async createPage(pageData: {
        user_id: string;
        title: string;
        subdomain: string;
        domain: string;
        github_repo: string;
        file_count: number;
        repo_size: number;
        donated_domain_id?: string | null;
        is_using_donated_domain?: boolean;
        metadata?: any;
    }): Promise<UserPage | null> {
        try {
            const fullDomain = `${pageData.subdomain}.${pageData.domain}`;

            const { data, error } = await supabase
                .from('user_pages')
                .insert({
                    user_id: pageData.user_id,
                    title: pageData.title,
                    subdomain: pageData.subdomain.toLowerCase(),
                    domain: pageData.domain,
                    full_domain: fullDomain,
                    github_repo: pageData.github_repo,
                    github_pages_url: `https://${pageData.github_repo.split('/')[0]}.github.io/${pageData.github_repo.split('/')[1]}`,
                    custom_domain_url: `https://${fullDomain}`,
                    status: 'creating',
                    deployment_status: 'pending',
                    file_count: pageData.file_count,
                    repo_size: pageData.repo_size,
                    donated_domain_id: pageData.donated_domain_id || null,
                    is_using_donated_domain: pageData.is_using_donated_domain || false,
                    metadata: pageData.metadata || {},
                    created_at: new Date().toISOString(),
                    last_updated: new Date().toISOString()
                })
                .select()
                .single();

            if (error) {
                console.error('Error creating page record:', error);
                return null;
            }

            console.log('Page record created:', data);
            return data;
        } catch (error) {
            console.error('Unexpected error creating page:', error);
            return null;
        }
    }

    /**
     * Update page status
     */
    async updatePageStatus(
        pageId: string,
        status: UserPage['status'],
        deploymentStatus?: UserPage['deployment_status'],
        additionalData?: Partial<UserPage>
    ): Promise<boolean> {
        try {
            const updateData: any = {
                status,
                last_updated: new Date().toISOString(),
                ...additionalData
            };

            if (deploymentStatus) {
                updateData.deployment_status = deploymentStatus;
            }

            const { error } = await supabase
                .from('user_pages')
                .update(updateData)
                .eq('id', pageId);

            if (error) {
                console.error('Error updating page status:', error);
                return false;
            }

            console.log(`Page ${pageId} status updated to ${status}`);
            return true;
        } catch (error) {
            console.error('Unexpected error updating page status:', error);
            return false;
        }
    }

    /**
     * Get user's pages
     */
    async getUserPages(userId: string): Promise<UserPage[]> {
        try {
            const { data, error } = await supabase
                .from('user_pages')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching user pages:', error);
                return [];
            }

            return data || [];
        } catch (error) {
            console.error('Unexpected error fetching user pages:', error);
            return [];
        }
    }

    /**
     * Get page by ID
     */
    async getPage(pageId: string): Promise<UserPage | null> {
        try {
            const { data, error } = await supabase
                .from('user_pages')
                .select('*')
                .eq('id', pageId)
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    return null; // Page not found
                }
                console.error('Error fetching page:', error);
                return null;
            }

            return data;
        } catch (error) {
            console.error('Unexpected error fetching page:', error);
            return null;
        }
    }

    /**
     * Check if subdomain is available for user
     */
    async isSubdomainAvailable(subdomain: string, domain: string, excludePageId?: string): Promise<boolean> {
        try {
            let query = supabase
                .from('user_pages')
                .select('id')
                .eq('subdomain', subdomain.toLowerCase())
                .eq('domain', domain)
                .neq('status', 'disabled'); // Don't count disabled pages

            if (excludePageId) {
                query = query.neq('id', excludePageId);
            }

            const { data, error } = await query;

            if (error) {
                console.error('Error checking subdomain availability:', error);
                return false;
            }

            return data.length === 0;
        } catch (error) {
            console.error('Unexpected error checking subdomain availability:', error);
            return false;
        }
    }

    /**
     * Delete a page
     */
    async deletePage(pageId: string): Promise<boolean> {
        try {
            // First update status to disabled
            await this.updatePageStatus(pageId, 'disabled');

            // Then soft delete by setting status
            const { error } = await supabase
                .from('user_pages')
                .update({
                    status: 'disabled',
                    last_updated: new Date().toISOString()
                })
                .eq('id', pageId);

            if (error) {
                console.error('Error deleting page:', error);
                return false;
            }

            console.log(`Page ${pageId} deleted successfully`);
            return true;
        } catch (error) {
            console.error('Unexpected error deleting page:', error);
            return false;
        }
    }

    /**
     * Create deployment record
     */
    async createDeployment(pageId: string, fileChanges: number): Promise<string | null> {
        try {
            const { data, error } = await supabase
                .from('page_deployments')
                .insert({
                    page_id: pageId,
                    status: 'pending',
                    started_at: new Date().toISOString(),
                    file_changes: fileChanges
                })
                .select()
                .single();

            if (error) {
                console.error('Error creating deployment record:', error);
                return null;
            }

            return data.id;
        } catch (error) {
            console.error('Unexpected error creating deployment:', error);
            return null;
        }
    }

    /**
     * Update deployment status
     */
    async updateDeployment(
        deploymentId: string,
        status: PageDeployment['status'],
        errorMessage?: string,
        commitSha?: string,
        buildLogs?: string
    ): Promise<boolean> {
        try {
            const updateData: any = {
                status,
                ...(status === 'deployed' || status === 'failed' ? { completed_at: new Date().toISOString() } : {}),
                ...(errorMessage ? { error_message: errorMessage } : {}),
                ...(commitSha ? { commit_sha: commitSha } : {}),
                ...(buildLogs ? { build_logs: buildLogs } : {})
            };

            const { error } = await supabase
                .from('page_deployments')
                .update(updateData)
                .eq('id', deploymentId);

            if (error) {
                console.error('Error updating deployment:', error);
                return false;
            }

            return true;
        } catch (error) {
            console.error('Unexpected error updating deployment:', error);
            return false;
        }
    }

    /**
     * Get page deployments
     */
    async getPageDeployments(pageId: string, limit: number = 10): Promise<PageDeployment[]> {
        try {
            const { data, error } = await supabase
                .from('page_deployments')
                .select('*')
                .eq('page_id', pageId)
                .order('started_at', { ascending: false })
                .limit(limit);

            if (error) {
                console.error('Error fetching deployments:', error);
                return [];
            }

            return data || [];
        } catch (error) {
            console.error('Unexpected error fetching deployments:', error);
            return [];
        }
    }

    /**
     * Update page view count
     */
    async incrementPageViews(pageId: string): Promise<boolean> {
        try {
            const { error } = await supabase.rpc('increment_page_views', {
                page_id: pageId
            });

            if (error) {
                console.error('Error incrementing page views:', error);
                return false;
            }

            return true;
        } catch (error) {
            console.error('Unexpected error incrementing page views:', error);
            return false;
        }
    }

    /**
     * Get page analytics
     */
    async getPageAnalytics(pageId: string, days: number = 30): Promise<any> {
        try {
            // This would typically integrate with analytics service
            // For now, return basic data from database
            const page = await this.getPage(pageId);
            const deployments = await this.getPageDeployments(pageId, 10);

            return {
                page_views: page?.page_views || 0,
                total_deployments: deployments.length,
                last_deployment: deployments[0] || null,
                uptime: page?.status === 'active' ? 100 : 0, // Simple uptime calculation
                created_at: page?.created_at,
                last_updated: page?.last_updated
            };
        } catch (error) {
            console.error('Unexpected error fetching analytics:', error);
            return null;
        }
    }
}

// Export singleton instance
export const pageManager = new PageManager();
