import { supabase } from './supabase';

// Cloudflare API Configuration
const CLOUDFLARE_API_BASE = 'https://api.cloudflare.com/client/v4';

interface CloudflareZone {
    id: string;
    name: string;
}

interface CloudflareDNSRecord {
    id: string;
    type: string;
    name: string;
    content: string;
    ttl: number;
}

// Domain configurations for each provider
const DOMAIN_CONFIGS = {
    'sidu.me': {
        zoneId: process.env.CLOUDFLARE_SIDU_ME_ZONE_ID,
        githubPagesIPs: ['185.199.108.153', '185.199.109.153', '185.199.110.153', '185.199.111.153']
    },
    'codeer.org': {
        zoneId: process.env.CLOUDFLARE_CODEER_ORG_ZONE_ID,
        githubPagesIPs: ['185.199.108.153', '185.199.109.153', '185.199.110.153', '185.199.111.153']
    }
};

export class CloudflareAPI {
    private apiToken: string;

    constructor(customApiToken?: string) {
        this.apiToken = customApiToken || process.env.CLOUDFLARE_API_TOKEN || '';
        if (!this.apiToken) {
            throw new Error('Cloudflare API token not configured');
        }
    }

    public async makeRequest(endpoint: string, method: string = 'GET', data?: any) {
        const url = `${CLOUDFLARE_API_BASE}${endpoint}`;

        const response = await fetch(url, {
            method,
            headers: {
                'Authorization': `Bearer ${this.apiToken}`,
                'Content-Type': 'application/json',
            },
            body: data ? JSON.stringify(data) : undefined,
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Cloudflare API error: ${errorData.errors?.[0]?.message || response.statusText}`);
        }

        return response.json();
    }

    /**
     * Create a subdomain DNS record
     */
    async createSubdomain(subdomain: string, domain: string, githubUsername: string, repoName: string): Promise<boolean> {
        try {
            const domainConfig = DOMAIN_CONFIGS[domain as keyof typeof DOMAIN_CONFIGS];
            if (!domainConfig) {
                throw new Error(`Domain ${domain} not configured`);
            }

            const zoneId = domainConfig.zoneId;
            if (!zoneId) {
                throw new Error(`Zone ID not configured for ${domain}`);
            }

            // Create CNAME record pointing to GitHub Pages
            const recordData = {
                type: 'CNAME',
                name: subdomain,
                content: `${githubUsername}.github.io`,
                ttl: 300, // 5 minutes
                comment: `Auto-created for user page: ${repoName}`
            };

            const response = await this.makeRequest(`/zones/${zoneId}/dns_records`, 'POST', recordData);

            if (response.success) {
                console.log(`DNS record created successfully for ${subdomain}.${domain}`);
                return true;
            } else {
                console.error('Failed to create DNS record:', response.errors);
                return false;
            }
        } catch (error) {
            console.error('Error creating subdomain:', error);
            return false;
        }
    }

    /**
     * Delete a subdomain DNS record
     */
    async deleteSubdomain(subdomain: string, domain: string): Promise<boolean> {
        try {
            const domainConfig = DOMAIN_CONFIGS[domain as keyof typeof DOMAIN_CONFIGS];
            if (!domainConfig) {
                throw new Error(`Domain ${domain} not configured`);
            }

            const zoneId = domainConfig.zoneId;
            if (!zoneId) {
                throw new Error(`Zone ID not configured for ${domain}`);
            }

            // First, find the DNS record
            const recordsResponse = await this.makeRequest(
                `/zones/${zoneId}/dns_records?name=${subdomain}.${domain}&type=CNAME`
            );

            if (recordsResponse.success && recordsResponse.result.length > 0) {
                const recordId = recordsResponse.result[0].id;

                // Delete the DNS record
                const deleteResponse = await this.makeRequest(
                    `/zones/${zoneId}/dns_records/${recordId}`,
                    'DELETE'
                );

                if (deleteResponse.success) {
                    console.log(`DNS record deleted successfully for ${subdomain}.${domain}`);
                    return true;
                } else {
                    console.error('Failed to delete DNS record:', deleteResponse.errors);
                    return false;
                }
            } else {
                console.log(`No DNS record found for ${subdomain}.${domain}`);
                return true; // Consider it successful if record doesn't exist
            }
        } catch (error) {
            console.error('Error deleting subdomain:', error);
            return false;
        }
    }

    /**
     * Check if subdomain is available
     */
    async isSubdomainAvailable(subdomain: string, domain: string): Promise<boolean> {
        try {
            const domainConfig = DOMAIN_CONFIGS[domain as keyof typeof DOMAIN_CONFIGS];
            if (!domainConfig) {
                console.error(`Domain ${domain} not configured`);
                return false;
            }

            const zoneId = domainConfig.zoneId;
            if (!zoneId) {
                console.error(`Zone ID not configured for ${domain}`);
                return false;
            }

            const response = await this.makeRequest(
                `/zones/${zoneId}/dns_records?name=${subdomain}.${domain}`
            );

            return response.success && response.result.length === 0;
        } catch (error) {
            console.error(`Error checking subdomain availability for ${subdomain}.${domain}:`, error);
            // If there's an API error (like 403), assume the subdomain is available
            // This prevents blocking users when there are token permission issues
            return true;
        }
    }

    /**
     * List all DNS records for a domain
     */
    async listDNSRecords(domain: string): Promise<CloudflareDNSRecord[]> {
        try {
            const domainConfig = DOMAIN_CONFIGS[domain as keyof typeof DOMAIN_CONFIGS];
            if (!domainConfig) {
                return [];
            }

            const zoneId = domainConfig.zoneId;
            if (!zoneId) {
                return [];
            }

            const response = await this.makeRequest(`/zones/${zoneId}/dns_records`);

            if (response.success) {
                return response.result;
            } else {
                console.error('Failed to list DNS records:', response.errors);
                return [];
            }
        } catch (error) {
            console.error('Error listing DNS records:', error);
            return [];
        }
    }
}

/**
 * Extended CloudflareAPI for donated domains
 */
export class DonatedDomainCloudflare {
    /**
     * Create subdomain for donated domain with custom credentials
     */
    static async createSubdomainForDonatedDomain(
        subdomain: string,
        domain: string,
        githubPagesUrl: string,
        zoneId: string,
        apiToken: string
    ): Promise<boolean> {
        try {
            // Create a new instance with the donated domain's credentials
            const donatedCloudflare = new CloudflareAPI(apiToken);

            // Create CNAME record pointing to GitHub Pages
            const dnsData = {
                type: 'CNAME',
                name: `${subdomain}.${domain}`,
                content: githubPagesUrl,
                ttl: 300, // 5 minutes TTL for faster updates
            };

            const response = await donatedCloudflare.makeRequest(
                `/zones/${zoneId}/dns_records`,
                'POST',
                dnsData
            );

            if (response.success) {
                console.log(`DNS record created successfully for ${subdomain}.${domain}`);
                return true;
            } else {
                console.error('Failed to create DNS record:', response.errors);
                return false;
            }
        } catch (error) {
            console.error('Error creating subdomain for donated domain:', error);
            return false;
        }
    }

    /**
     * Delete subdomain for donated domain with custom credentials
     */
    static async deleteSubdomainForDonatedDomain(
        subdomain: string,
        domain: string,
        zoneId: string,
        apiToken: string
    ): Promise<boolean> {
        try {
            // Create a new instance with the donated domain's credentials
            const donatedCloudflare = new CloudflareAPI(apiToken);

            // First, find the DNS record
            const recordsResponse = await donatedCloudflare.makeRequest(
                `/zones/${zoneId}/dns_records?name=${subdomain}.${domain}&type=CNAME`
            );

            if (recordsResponse.success && recordsResponse.result.length > 0) {
                const recordId = recordsResponse.result[0].id;

                // Delete the DNS record
                const deleteResponse = await donatedCloudflare.makeRequest(
                    `/zones/${zoneId}/dns_records/${recordId}`,
                    'DELETE'
                );

                if (deleteResponse.success) {
                    console.log(`DNS record deleted successfully for ${subdomain}.${domain}`);
                    return true;
                } else {
                    console.error('Failed to delete DNS record:', deleteResponse.errors);
                    return false;
                }
            } else {
                console.log(`No DNS record found for ${subdomain}.${domain}`);
                return true;
            }
        } catch (error) {
            console.error('Error deleting subdomain for donated domain:', error);
            return false;
        }
    }

    /**
     * Check if subdomain is available on donated domain
     */
    static async isSubdomainAvailableOnDonatedDomain(
        subdomain: string,
        domain: string,
        zoneId: string,
        apiToken: string
    ): Promise<boolean> {
        try {
            // Create a new instance with the donated domain's credentials
            const donatedCloudflare = new CloudflareAPI(apiToken);

            const response = await donatedCloudflare.makeRequest(
                `/zones/${zoneId}/dns_records?name=${subdomain}.${domain}`
            );

            return response.success && response.result.length === 0;
        } catch (error) {
            console.error('Error checking subdomain availability on donated domain:', error);
            return false;
        }
    }
}

/**
 * Utility function to validate subdomain name
 */
export function validateSubdomain(subdomain: string): { valid: boolean; error?: string } {
    // Check length
    if (subdomain.length < 1 || subdomain.length > 63) {
        return { valid: false, error: 'Subdomain must be between 1 and 63 characters' };
    }

    // Check format (alphanumeric and hyphens only, not starting/ending with hyphen)
    const validPattern = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;
    if (!validPattern.test(subdomain.toLowerCase())) {
        return { valid: false, error: 'Subdomain can only contain letters, numbers, and hyphens (not at start/end)' };
    }

    // Check reserved subdomains
    const reserved = ['www', 'mail', 'ftp', 'localhost', 'admin', 'api', 'app', 'dev', 'staging', 'test'];
    if (reserved.includes(subdomain.toLowerCase())) {
        return { valid: false, error: 'This subdomain is reserved' };
    }

    return { valid: true };
}

/**
 * Check if subdomain is available across all domains
 */
export async function checkSubdomainAvailability(subdomain: string): Promise<{
    available: boolean;
    domains: { [key: string]: boolean };
}> {
    const cloudflare = new CloudflareAPI();
    const domains = Object.keys(DOMAIN_CONFIGS);
    const results: { [key: string]: boolean } = {};

    // Also check database for existing pages
    const { data: existingPages } = await supabase
        .from('user_pages')
        .select('subdomain, domain')
        .eq('subdomain', subdomain.toLowerCase());

    const dbTakenDomains = new Set(existingPages?.map(page => page.domain) || []);

    console.log(`Checking subdomain availability for: ${subdomain}`);
    console.log(`Database taken domains:`, Array.from(dbTakenDomains));

    for (const domain of domains) {
        if (dbTakenDomains.has(domain)) {
            results[domain] = false;
            console.log(`${domain}: TAKEN (in database)`);
        } else {
            results[domain] = await cloudflare.isSubdomainAvailable(subdomain, domain);
            console.log(`${domain}: ${results[domain] ? 'AVAILABLE' : 'TAKEN'}`);
        }
    }

    const available = Object.values(results).some(Boolean);

    console.log('Final availability results:', { available, domains: results });

    return { available, domains: results };
}
