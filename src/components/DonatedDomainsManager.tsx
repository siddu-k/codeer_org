import React, { useState } from 'react';
import { useMyDonatedDomains, useDomainManagement } from '@/hooks/useDonatedDomains';
import { DomainDonationModal } from './DomainDonationModal';

export function DonatedDomainsManager() {
    const { domains, loading, error, refetch } = useMyDonatedDomains();
    const { toggleDomainStatus, updateDomainSettings, getDomainUsage, loading: managementLoading } = useDomainManagement();
    const [showDonationModal, setShowDonationModal] = useState(false);
    const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
    const [domainUsage, setDomainUsage] = useState<any[]>([]);
    const [showUsageModal, setShowUsageModal] = useState(false);

    const handleToggleStatus = async (domainId: string, currentStatus: boolean) => {
        const success = await toggleDomainStatus(domainId, !currentStatus);
        if (success) {
            refetch();
        }
    };

    const handleViewUsage = async (domainId: string) => {
        const usage = await getDomainUsage(domainId);
        setDomainUsage(usage);
        setSelectedDomain(domainId);
        setShowUsageModal(true);
    };

    const handleDonationSuccess = () => {
        refetch();
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                <span className="ml-2 text-gray-400">Loading your donated domains...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-white">My Donated Domains</h2>
                <button
                    onClick={() => setShowDonationModal(true)}
                    className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                >
                    + Donate New Domain
                </button>
            </div>

            {error && (
                <div className="bg-red-900/20 border border-red-700 text-red-400 px-4 py-3 rounded-md">
                    {error}
                </div>
            )}

            {domains.length === 0 ? (
                <div className="text-center py-12">
                    <div className="text-gray-400 mb-4">
                        <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-6m-2-5a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-medium text-white mb-2">No Donated Domains</h3>
                    <p className="text-gray-400 mb-4">
                        You haven't donated any domains yet. Share your domains with the community!
                    </p>
                    <button
                        onClick={() => setShowDonationModal(true)}
                        className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                    >
                        Donate Your First Domain
                    </button>
                </div>
            ) : (
                <div className="grid gap-6">
                    {domains.map(domain => (
                        <div key={domain.id} className="bg-[#1a1a1a] border border-[#333] rounded-lg p-6">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-xl font-semibold text-white">
                                        {domain.domain_name}
                                    </h3>
                                    {domain.donation_message && (
                                        <p className="text-gray-400 mt-1">{domain.donation_message}</p>
                                    )}
                                </div>
                                <div className="flex items-center space-x-2">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${domain.is_active
                                        ? 'bg-green-900/30 text-green-400'
                                        : 'bg-red-900/30 text-red-400'
                                        }`}>
                                        {domain.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                <div>
                                    <div className="text-sm text-gray-400">Subdomains Used</div>
                                    <div className="text-2xl font-bold text-white">
                                        {domain.current_subdomains}
                                    </div>
                                    <div className="text-sm text-gray-400">
                                        of {domain.max_subdomains} max
                                    </div>
                                </div>
                                <div>
                                    <div className="text-sm text-gray-400">Usage</div>
                                    <div className="w-full bg-[#333] rounded-full h-2 mt-1">
                                        <div
                                            className="bg-blue-500 h-2 rounded-full"
                                            style={{
                                                width: `${Math.min((domain.current_subdomains / domain.max_subdomains) * 100, 100)}%`
                                            }}
                                        ></div>
                                    </div>
                                    <div className="text-sm text-gray-400 mt-1">
                                        {((domain.current_subdomains / domain.max_subdomains) * 100).toFixed(1)}%
                                    </div>
                                </div>
                                <div>
                                    <div className="text-sm text-gray-400">Created</div>
                                    <div className="text-sm font-medium text-white">
                                        {new Date(domain.created_at).toLocaleDateString()}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-sm text-gray-400">Last Updated</div>
                                    <div className="text-sm font-medium text-white">
                                        {new Date(domain.updated_at).toLocaleDateString()}
                                    </div>
                                </div>
                            </div>

                            {domain.contact_email && (
                                <div className="mb-4">
                                    <span className="text-sm text-gray-400">Contact: </span>
                                    <span className="text-sm text-white">{domain.contact_email}</span>
                                </div>
                            )}

                            {domain.terms_of_use && (
                                <div className="mb-4 p-3 bg-[#0a0a0a] border border-[#333] rounded-md">
                                    <div className="text-sm text-gray-400 mb-1">Terms of Use:</div>
                                    <div className="text-sm text-gray-300">{domain.terms_of_use}</div>
                                </div>
                            )}

                            <div className="flex space-x-3">
                                <button
                                    onClick={() => handleToggleStatus(domain.id, domain.is_active)}
                                    disabled={managementLoading}
                                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${domain.is_active
                                        ? 'bg-red-900/30 text-red-400 hover:bg-red-900/50'
                                        : 'bg-green-900/30 text-green-400 hover:bg-green-900/50'
                                        } disabled:opacity-50`}
                                >
                                    {domain.is_active ? 'Deactivate' : 'Activate'}
                                </button>

                                <button
                                    onClick={() => handleViewUsage(domain.id)}
                                    disabled={managementLoading}
                                    className="px-4 py-2 bg-blue-900/30 text-blue-400 rounded-md text-sm font-medium hover:bg-blue-900/50 transition-colors disabled:opacity-50"
                                >
                                    View Usage
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Domain Donation Modal */}
            <DomainDonationModal
                isOpen={showDonationModal}
                onClose={() => setShowDonationModal(false)}
                onSuccess={handleDonationSuccess}
            />

            {/* Usage Modal */}
            {showUsageModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-[#1a1a1a] border border-[#333] rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-white">
                                    Domain Usage - {domains.find(d => d.id === selectedDomain)?.domain_name}
                                </h3>
                                <button
                                    onClick={() => setShowUsageModal(false)}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            {domainUsage.length === 0 ? (
                                <div className="text-center py-8">
                                    <div className="text-gray-400">No subdomains created yet.</div>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-[#333]">
                                        <thead className="bg-[#0a0a0a]">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                                                    Subdomain
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                                                    Page Title
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                                                    Status
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                                                    Created
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-[#1a1a1a] divide-y divide-[#333]">
                                            {domainUsage.map((usage) => (
                                                <tr key={usage.id}>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                                                        {usage.subdomain}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                                                        {usage.user_pages?.title || 'N/A'}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${usage.user_pages?.status === 'active'
                                                            ? 'bg-green-900/30 text-green-400'
                                                            : usage.user_pages?.status === 'error'
                                                                ? 'bg-red-900/30 text-red-400'
                                                                : 'bg-yellow-900/30 text-yellow-400'
                                                            }`}>
                                                            {usage.user_pages?.status || 'unknown'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                                                        {new Date(usage.created_at).toLocaleDateString()}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
