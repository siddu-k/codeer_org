import React, { useState } from 'react';
import { useDomainSubmission } from '@/hooks/useDonatedDomains';

interface DomainDonationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function DomainDonationModal({ isOpen, onClose, onSuccess }: DomainDonationModalProps) {
    const [formData, setFormData] = useState({
        domain_name: '',
        cloudflare_zone_id: '',
        cloudflare_api_token: '',
        max_subdomains: 100,
        donation_message: '',
        contact_email: '',
        terms_of_use: ''
    });

    const [step, setStep] = useState(1);
    const [agreeToTerms, setAgreeToTerms] = useState(false);
    const { submitDomain, loading, error, success, reset } = useDomainSubmission();

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'max_subdomains' ? parseInt(value) || 0 : value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!agreeToTerms) {
            alert('Please agree to the terms and conditions');
            return;
        }

        try {
            await submitDomain(formData);
            onSuccess();
            handleClose();
        } catch (err) {
            // Error is handled by the hook
        }
    };

    const handleClose = () => {
        setFormData({
            domain_name: '',
            cloudflare_zone_id: '',
            cloudflare_api_token: '',
            max_subdomains: 100,
            donation_message: '',
            contact_email: '',
            terms_of_use: ''
        });
        setStep(1);
        setAgreeToTerms(false);
        reset();
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-[#1a1a1a] border border-[#333] rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-white">
                            Donate Your Domain
                        </h2>
                        <button
                            onClick={handleClose}
                            className="text-gray-400 hover:text-gray-600"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Progress Steps */}
                    <div className="mb-8">
                        <div className="flex items-center">
                            {[1, 2, 3].map((stepNum) => (
                                <React.Fragment key={stepNum}>
                                    <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step >= stepNum ? 'bg-blue-500 text-white' : 'bg-[#333] text-gray-400'
                                        }`}>
                                        {stepNum}
                                    </div>
                                    {stepNum < 3 && (
                                        <div className={`flex-1 h-1 mx-2 ${step > stepNum ? 'bg-blue-500' : 'bg-[#333]'
                                            }`} />
                                    )}
                                </React.Fragment>
                            ))}
                        </div>
                        <div className="flex justify-between mt-2 text-sm text-gray-400">
                            <span>Domain Info</span>
                            <span>Cloudflare Setup</span>
                            <span>Configuration</span>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit}>
                        {step === 1 && (
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-white mb-4">Domain Information</h3>

                                <div>
                                    <label className="block text-sm font-medium text-white mb-1">
                                        Domain Name *
                                    </label>
                                    <input
                                        type="text"
                                        name="domain_name"
                                        value={formData.domain_name}
                                        onChange={handleInputChange}
                                        placeholder="example.com"
                                        className="w-full px-3 py-2 bg-[#1a1a1a] border border-[#333] rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        required
                                    />
                                    <p className="text-xs text-gray-400 mt-1">
                                        Enter your domain name (e.g., example.com)
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Contact Email
                                    </label>
                                    <input
                                        type="email"
                                        name="contact_email"
                                        value={formData.contact_email}
                                        onChange={handleInputChange}
                                        placeholder="your@email.com"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        Optional: Contact email for domain-related inquiries
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Donation Message
                                    </label>
                                    <textarea
                                        name="donation_message"
                                        value={formData.donation_message}
                                        onChange={handleInputChange}
                                        placeholder="Why are you sharing this domain?"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 h-20"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        Optional: A message about why you're donating this domain
                                    </p>
                                </div>
                            </div>
                        )}

                        {step === 2 && (
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold mb-4">Cloudflare Configuration</h3>

                                <div className="bg-blue-50 p-4 rounded-md mb-4">
                                    <h4 className="font-medium text-blue-900 mb-2">How to get your Cloudflare credentials:</h4>
                                    <ol className="text-sm text-blue-800 list-decimal list-inside space-y-1">
                                        <li>Go to <a href="https://dash.cloudflare.com" target="_blank" rel="noopener noreferrer" className="underline">Cloudflare Dashboard</a></li>
                                        <li>Navigate to "My Profile" → "API Tokens"</li>
                                        <li>Create a token with Zone:Read and DNS:Edit permissions for your domain</li>
                                        <li>Go to your domain overview page and copy the Zone ID from the right sidebar</li>
                                    </ol>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Cloudflare API Token *
                                    </label>
                                    <input
                                        type="password"
                                        name="cloudflare_api_token"
                                        value={formData.cloudflare_api_token}
                                        onChange={handleInputChange}
                                        placeholder="Your Cloudflare API token"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        required
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        Your API token will be stored securely and used only for DNS management
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Cloudflare Zone ID *
                                    </label>
                                    <input
                                        type="text"
                                        name="cloudflare_zone_id"
                                        value={formData.cloudflare_zone_id}
                                        onChange={handleInputChange}
                                        placeholder="Your domain's Zone ID"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        required
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        Found in your domain's overview page on Cloudflare
                                    </p>
                                </div>
                            </div>
                        )}

                        {step === 3 && (
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold mb-4">Domain Configuration</h3>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Maximum Subdomains
                                    </label>
                                    <input
                                        type="number"
                                        name="max_subdomains"
                                        value={formData.max_subdomains}
                                        onChange={handleInputChange}
                                        min="1"
                                        max="1000"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        Maximum number of subdomains that can be created (1-1000)
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Terms of Use
                                    </label>
                                    <textarea
                                        name="terms_of_use"
                                        value={formData.terms_of_use}
                                        onChange={handleInputChange}
                                        placeholder="Any specific terms or conditions for using your domain..."
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 h-24"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        Optional: Any specific terms for users of your domain
                                    </p>
                                </div>

                                <div className="bg-yellow-50 p-4 rounded-md">
                                    <div className="flex">
                                        <input
                                            type="checkbox"
                                            id="agreeTerms"
                                            checked={agreeToTerms}
                                            onChange={(e) => setAgreeToTerms(e.target.checked)}
                                            className="mt-1 mr-3"
                                        />
                                        <label htmlFor="agreeTerms" className="text-sm text-gray-700">
                                            I understand that by donating my domain, I am allowing other users to create subdomains.
                                            I retain full control and can disable this service at any time. I am responsible for
                                            maintaining my domain and Cloudflare account.
                                        </label>
                                    </div>
                                </div>
                            </div>
                        )}

                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
                                {error}
                            </div>
                        )}

                        <div className="flex justify-between mt-6">
                            <div>
                                {step > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => setStep(step - 1)}
                                        className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                                    >
                                        Previous
                                    </button>
                                )}
                            </div>

                            <div className="space-x-2">
                                <button
                                    type="button"
                                    onClick={handleClose}
                                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                                >
                                    Cancel
                                </button>

                                {step < 3 ? (
                                    <button
                                        type="button"
                                        onClick={() => setStep(step + 1)}
                                        disabled={
                                            (step === 1 && !formData.domain_name) ||
                                            (step === 2 && (!formData.cloudflare_api_token || !formData.cloudflare_zone_id))
                                        }
                                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                                    >
                                        Next
                                    </button>
                                ) : (
                                    <button
                                        type="submit"
                                        disabled={loading || !agreeToTerms}
                                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                                    >
                                        {loading ? 'Submitting...' : 'Donate Domain'}
                                    </button>
                                )}
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
