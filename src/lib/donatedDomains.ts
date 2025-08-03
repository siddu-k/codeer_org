import { supabase } from './supabase';

export interface DonatedDomain {
    id: string;
    domain_name: string;
    donor_user_id: string;
    cloudflare_zone_id: string;
    cloudflare_api_token: string;
    is_active: boolean;
    max_subdomains: number;
    current_subdomains: number;
    donation_message?: string;
    contact_email?: string;
    terms_of_use?: string;
    created_at: string;
    updated_at: string;
}

export interface DonatedDomainUsage {
    id: string;
    donated_domain_id: string;
    user_page_id: string;
    subdomain: string;
    created_at: string;
}

export interface DomainSubmission {
    domain_name: string;
    cloudflare_zone_id: string;
    cloudflare_api_token: string;
    max_subdomains?: number;
    donation_message?: string;
    contact_email?: string;
    terms_of_use?: string;
}

export class DonatedDomainManager {
    /**
     * Submit a domain for donation
     */
    async submitDomain(userId: string, submission: DomainSubmission): Promise<DonatedDomain | null> {
        try {
            // Validate domain format
            if (!this.validateDomainName(submission.domain_name)) {
                throw new Error('Invalid domain name format');
            }

            // Test Cloudflare API credentials before storing
            const isValidCredentials = await this.validateCloudflareCredentials(
                submission.cloudflare_api_token,
                submission.cloudflare_zone_id
            );

            if (!isValidCredentials) {
                throw new Error('Invalid Cloudflare credentials');
            }

            const { data, error } = await supabase
                .from('donated_domains')
                .insert({
                    domain_name: submission.domain_name.toLowerCase(),
                    donor_user_id: userId,
                    cloudflare_zone_id: submission.cloudflare_zone_id,
                    cloudflare_api_token: submission.cloudflare_api_token, // In production, encrypt this
                    max_subdomains: submission.max_subdomains || 100,
                    donation_message: submission.donation_message,
                    contact_email: submission.contact_email,
                    terms_of_use: submission.terms_of_use,
                    is_active: true,
                    current_subdomains: 0
                })
                .select()
                .single();

            if (error) {
                console.error('Error submitting donated domain:', error);
                return null;
            }

            return data;
        } catch (error) {
            console.error('Error in submitDomain:', error);
            throw error;
        }
    }

    /**
     * Get all available donated domains
     */
    async getAvailableDomains(): Promise<DonatedDomain[]> {
        try {
            const { data, error } = await supabase
                .from('donated_domains')
                .select('*')
                .eq('is_active', true)
                .lt('current_subdomains', supabase.rpc('max_subdomains'))
                .order('domain_name');

            if (error) {
                console.error('Error fetching donated domains:', error);
                return [];
            }

            return data || [];
        } catch (error) {
            console.error('Error in getAvailableDomains:', error);
            return [];
        }
    }

    /**
     * Get domains donated by a specific user
     */
    async getUserDonatedDomains(userId: string): Promise<DonatedDomain[]> {
        try {
            const { data, error } = await supabase
                .from('donated_domains')
                .select('*')
                .eq('donor_user_id', userId)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching user donated domains:', error);
                return [];
            }

            return data || [];
        } catch (error) {
            console.error('Error in getUserDonatedDomains:', error);
            return [];
        }
    }

    /**
     * Check if subdomain is available on a donated domain
     */
    async checkSubdomainAvailability(domainId: string, subdomain: string): Promise<boolean> {
        try {
            const { data, error } = await supabase
                .from('donated_domain_usage')
                .select('id')
                .eq('donated_domain_id', domainId)
                .eq('subdomain', subdomain.toLowerCase())
                .single();

            if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
                console.error('Error checking subdomain availability:', error);
                return false;
            }

            return !data; // Available if no data found
        } catch (error) {
            console.error('Error in checkSubdomainAvailability:', error);
            return false;
        }
    }

    /**
     * Reserve a subdomain on a donated domain
     */
    async reserveSubdomain(domainId: string, pageId: string, subdomain: string): Promise<boolean> {
        try {
            // Check if domain has capacity
            const { data: domain, error: domainError } = await supabase
                .from('donated_domains')
                .select('current_subdomains, max_subdomains')
                .eq('id', domainId)
                .eq('is_active', true)
                .single();

            if (domainError || !domain) {
                console.error('Domain not found or inactive:', domainError);
                return false;
            }

            if (domain.current_subdomains >= domain.max_subdomains) {
                console.error('Domain has reached maximum subdomain limit');
                return false;
            }

            // Create usage record
            const { error } = await supabase
                .from('donated_domain_usage')
                .insert({
                    donated_domain_id: domainId,
                    user_page_id: pageId,
                    subdomain: subdomain.toLowerCase()
                });

            if (error) {
                console.error('Error reserving subdomain:', error);
                return false;
            }

            return true;
        } catch (error) {
            console.error('Error in reserveSubdomain:', error);
            return false;
        }
    }

    /**
     * Release a subdomain reservation
     */
    async releaseSubdomain(pageId: string): Promise<boolean> {
        try {
            const { error } = await supabase
                .from('donated_domain_usage')
                .delete()
                .eq('user_page_id', pageId);

            if (error) {
                console.error('Error releasing subdomain:', error);
                return false;
            }

            return true;
        } catch (error) {
            console.error('Error in releaseSubdomain:', error);
            return false;
        }
    }

    /**
     * Get domain usage statistics for a donor
     */
    async getDomainUsageStats(domainId: string): Promise<DonatedDomainUsage[]> {
        try {
            const { data, error } = await supabase
                .from('donated_domain_usage')
                .select(`
                    *,
                    user_pages (
                        title,
                        subdomain,
                        status,
                        created_at
                    )
                `)
                .eq('donated_domain_id', domainId)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching domain usage stats:', error);
                return [];
            }

            return data || [];
        } catch (error) {
            console.error('Error in getDomainUsageStats:', error);
            return [];
        }
    }

    /**
     * Toggle domain active status
     */
    async toggleDomainStatus(domainId: string, isActive: boolean): Promise<boolean> {
        try {
            const { error } = await supabase
                .from('donated_domains')
                .update({
                    is_active: isActive,
                    updated_at: new Date().toISOString()
                })
                .eq('id', domainId);

            if (error) {
                console.error('Error toggling domain status:', error);
                return false;
            }

            return true;
        } catch (error) {
            console.error('Error in toggleDomainStatus:', error);
            return false;
        }
    }

    /**
     * Update domain settings
     */
    async updateDomainSettings(
        domainId: string,
        updates: Partial<Pick<DonatedDomain, 'max_subdomains' | 'donation_message' | 'contact_email' | 'terms_of_use'>>
    ): Promise<boolean> {
        try {
            const { error } = await supabase
                .from('donated_domains')
                .update({
                    ...updates,
                    updated_at: new Date().toISOString()
                })
                .eq('id', domainId);

            if (error) {
                console.error('Error updating domain settings:', error);
                return false;
            }

            return true;
        } catch (error) {
            console.error('Error in updateDomainSettings:', error);
            return false;
        }
    }

    /**
     * Get Cloudflare credentials for a donated domain (for API use)
     */
    async getDomainCredentials(domainId: string): Promise<{ apiToken: string; zoneId: string } | null> {
        try {
            const { data, error } = await supabase
                .from('donated_domains')
                .select('cloudflare_api_token, cloudflare_zone_id')
                .eq('id', domainId)
                .eq('is_active', true)
                .single();

            if (error || !data) {
                console.error('Error fetching domain credentials:', error);
                return null;
            }

            return {
                apiToken: data.cloudflare_api_token,
                zoneId: data.cloudflare_zone_id
            };
        } catch (error) {
            console.error('Error in getDomainCredentials:', error);
            return null;
        }
    }

    /**
     * Validate domain name format
     */
    private validateDomainName(domain: string): boolean {
        const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9]*\.[a-zA-Z]{2,}$/;
        return domainRegex.test(domain);
    }

    /**
     * Validate Cloudflare API credentials
     */
    private async validateCloudflareCredentials(apiToken: string, zoneId: string): Promise<boolean> {
        try {
            const response = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}`, {
                headers: {
                    'Authorization': `Bearer ${apiToken}`,
                    'Content-Type': 'application/json'
                }
            });

            const result = await response.json();
            return result.success === true;
        } catch (error) {
            console.error('Error validating Cloudflare credentials:', error);
            return false;
        }
    }
}

export const donatedDomainManager = new DonatedDomainManager();
