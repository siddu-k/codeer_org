import React, { useState, useEffect } from 'react';
import { useAvailableDomains, useDonatedSubdomainCheck } from '@/hooks/useDonatedDomains';

interface DomainSelectorProps {
    selectedType: 'default' | 'donated';
    onTypeChange: (type: 'default' | 'donated') => void;
    selectedDomain: string;
    onDomainChange: (domain: string) => void;
    selectedDonatedDomainId: string;
    onDonatedDomainIdChange: (id: string) => void;
    subdomain: string;
    onAvailabilityChange: (available: boolean) => void;
}

const DEFAULT_DOMAINS = ['sidu.me', 'codeer.org'];

export function DomainSelector({
    selectedType,
    onTypeChange,
    selectedDomain,
    onDomainChange,
    selectedDonatedDomainId,
    onDonatedDomainIdChange,
    subdomain,
    onAvailabilityChange
}: DomainSelectorProps) {
    const { domains: donatedDomains, loading: domainsLoading } = useAvailableDomains();
    const { checkAvailability, getAvailability, loading: checkingAvailability } = useDonatedSubdomainCheck();
    const [lastCheckedSubdomain, setLastCheckedSubdomain] = useState('');

    // Check availability when subdomain or domain selection changes
    useEffect(() => {
        if (subdomain && subdomain !== lastCheckedSubdomain && selectedType === 'donated' && selectedDonatedDomainId) {
            setLastCheckedSubdomain(subdomain);
            checkAvailability(selectedDonatedDomainId, subdomain).then(available => {
                onAvailabilityChange(available);
            });
        }
    }, [subdomain, selectedType, selectedDonatedDomainId, lastCheckedSubdomain]);

    const handleDonatedDomainSelect = (domainId: string) => {
        onDonatedDomainIdChange(domainId);
        const selectedDomain = donatedDomains.find(d => d.id === domainId);
        if (selectedDomain) {
            onDomainChange(selectedDomain.domain_name);
        }
    };

    const getAvailabilityStatus = () => {
        if (selectedType === 'donated' && selectedDonatedDomainId && subdomain) {
            const availability = getAvailability(selectedDonatedDomainId, subdomain);
            if (availability !== undefined) {
                return availability ? 'available' : 'taken';
            }
        }
        return null;
    };

    const availabilityStatus = getAvailabilityStatus();

    return (
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-white mb-2">
                    Domain Type
                </label>
                <div className="flex space-x-4">
                    <label className="flex items-center">
                        <input
                            type="radio"
                            name="domainType"
                            value="default"
                            checked={selectedType === 'default'}
                            onChange={() => onTypeChange('default')}
                            className="mr-2 text-blue-500 focus:ring-blue-500 bg-[#1a1a1a] border-[#333]"
                        />
                        <span className="text-white">Default Domains</span>
                    </label>
                    <label className="flex items-center">
                        <input
                            type="radio"
                            name="domainType"
                            value="donated"
                            checked={selectedType === 'donated'}
                            onChange={() => onTypeChange('donated')}
                            className="mr-2 text-blue-500 focus:ring-blue-500 bg-[#1a1a1a] border-[#333]"
                        />
                        <span className="text-white">Community Donated Domains</span>
                    </label>
                </div>
            </div>

            {selectedType === 'default' && (
                <div>
                    <label className="block text-sm font-medium text-white mb-2">
                        Select Domain
                    </label>
                    <select
                        value={selectedDomain}
                        onChange={(e) => onDomainChange(e.target.value)}
                        className="w-full px-3 py-2 bg-[#1a1a1a] border border-[#333] rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                    >
                        <option value="">Select a domain</option>
                        {DEFAULT_DOMAINS.map(domain => (
                            <option key={domain} value={domain}>
                                {domain}
                            </option>
                        ))}
                    </select>
                </div>
            )}

            {selectedType === 'donated' && (
                <div>
                    <label className="block text-sm font-medium text-white mb-2">
                        Select Donated Domain
                    </label>
                    {domainsLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                            <span className="ml-2 text-gray-400">Loading donated domains...</span>
                        </div>
                    ) : donatedDomains.length === 0 ? (
                        <div className="text-gray-400 py-4 text-center bg-[#1a1a1a] border border-[#333] rounded-md">
                            No donated domains available at the moment.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {donatedDomains.map(domain => (
                                <div
                                    key={domain.id}
                                    className={`border rounded-lg p-4 cursor-pointer transition-all ${selectedDonatedDomainId === domain.id
                                        ? 'border-blue-500 bg-[#1a1a1a]'
                                        : 'border-[#333] bg-[#111] hover:border-[#404040] hover:bg-[#1a1a1a]'
                                        }`}
                                    onClick={() => handleDonatedDomainSelect(domain.id)}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center">
                                            <input
                                                type="radio"
                                                name="donatedDomain"
                                                value={domain.id}
                                                checked={selectedDonatedDomainId === domain.id}
                                                onChange={() => handleDonatedDomainSelect(domain.id)}
                                                className="mr-3 text-blue-500 focus:ring-blue-500 bg-[#1a1a1a] border-[#333]"
                                            />
                                            <div>
                                                <div className="font-medium text-white">
                                                    {domain.domain_name}
                                                </div>
                                                {domain.donation_message && (
                                                    <div className="text-sm text-gray-400 mt-1">
                                                        {domain.donation_message}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-sm text-gray-400">
                                                {domain.current_subdomains} / {domain.max_subdomains} used
                                            </div>
                                            <div className="w-20 bg-[#333] rounded-full h-2 mt-1">
                                                <div
                                                    className="bg-blue-500 h-2 rounded-full"
                                                    style={{
                                                        width: `${(domain.current_subdomains / domain.max_subdomains) * 100}%`
                                                    }}
                                                ></div>
                                            </div>
                                        </div>
                                    </div>

                                    {domain.contact_email && (
                                        <div className="text-xs text-gray-500 mt-2">
                                            Contact: {domain.contact_email}
                                        </div>
                                    )}

                                    {domain.terms_of_use && (
                                        <div className="text-xs text-gray-400 mt-2 p-2 bg-[#0a0a0a] rounded border border-[#333]">
                                            Terms: {domain.terms_of_use}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Domain Preview */}
            {subdomain && selectedDomain && (
                <div className="mt-4 p-4 bg-[#0a0a0a] border border-[#333] rounded-lg">
                    <div className="text-sm text-gray-400 mb-2">Your website will be available at:</div>
                    <div className="flex items-center">
                        <span className="text-lg font-mono text-white bg-[#1a1a1a] px-3 py-2 rounded border border-[#444]">
                            {subdomain}.{selectedDomain}
                        </span>
                        <button
                            type="button"
                            onClick={() => {
                                navigator.clipboard.writeText(`${subdomain}.${selectedDomain}`);
                            }}
                            className="ml-2 p-2 text-gray-400 hover:text-white transition-colors"
                            title="Copy domain"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                        </button>
                    </div>
                    <div className="text-xs text-gray-500 mt-2">
                        Full URL: https://{subdomain}.{selectedDomain}
                    </div>
                </div>
            )}

            {/* Availability indicator for donated domains */}
            {selectedType === 'donated' && selectedDonatedDomainId && subdomain && (
                <div className="mt-3">
                    {checkingAvailability ? (
                        <div className="flex items-center text-gray-400">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"></div>
                            Checking availability...
                        </div>
                    ) : availabilityStatus === 'available' ? (
                        <div className="flex items-center text-green-400">
                            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            Subdomain is available!
                        </div>
                    ) : availabilityStatus === 'taken' ? (
                        <div className="flex items-center text-red-400">
                            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                            Subdomain is already taken
                        </div>
                    ) : null}
                </div>
            )}
        </div>
    );
}
