// Tailwind Configuration
window.tailwindConfig = {
    theme: {
        extend: {
            colors: {
                primary: '#137f66',
                secondary: '#FFFFFF',
                background: {
                    main: '#6B21A8',
                    gradient: 'linear-gradient(135deg, #6B21A8 0%, #4C1D95 100%)',
                    cards: '#FFFFFF',
                    darkCards: '#1F2937'
                },
                text: {
                    primary: '#000000',
                    secondary: '#6B7280',
                    inverse: '#FFFFFF',
                    muted: '#9CA3AF'
                },
                status: {
                    success: '#10B981',
                    error: '#EF4444',
                    warning: '#F59E0B',
                    info: '#3B82F6',
                    neutral: '#6B7280'
                },
                ui: {
                    border: '#E5E7EB',
                    divider: '#F3F4F6',
                    overlay: 'rgba(0, 0, 0, 0.5)',
                    shadow: 'rgba(0, 0, 0, 0.1)'
                }
            },
            fontFamily: {
                'primary': ['Saira', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
                'inter': ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
                'numeric': ['Saira', 'SF Pro Display', '-apple-system', 'BlinkMacSystemFont', 'monospace'],
                'cricket': ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif']
            },
            spacing: {
                'xs': '4px',
                'sm': '8px',
                'md': '16px',
                'lg': '24px',
                'xl': '32px',
                '2xl': '48px',
                '3xl': '64px'
            },
            borderRadius: {
                'sm': '0.25rem',
                'md': '0.25rem',
                'lg': '0.25rem',
                'xl': '0.25rem',
                'full': '9999px',
                DEFAULT: '0.25rem'
            },
            boxShadow: {
                'sm': '0 2px 4px rgba(0, 0, 0, 0.05)',
                'md': '0 4px 12px rgba(0, 0, 0, 0.08)',
                'lg': '0 8px 24px rgba(0, 0, 0, 0.12)',
                'xl': '0 16px 32px rgba(0, 0, 0, 0.16)'
            },
            animation: {
                'fade-in': 'fadeIn 0.5s ease-in-out',   
                'slide-up': 'slideUp 0.3s ease-out',
                'bounce-subtle': 'bounceSubtle 2s infinite',
            }
        }
    }
};

// Apply Tailwind config
if (window.tailwind) {
    window.tailwind.config = window.tailwindConfig;
}

// Handle different primary colors for different pages
document.addEventListener('DOMContentLoaded', function() {
    const currentPage = window.location.pathname;
    
    // Override primary color for bulk-analysis page
    if (currentPage.includes('bulk-analysis.html')) {
        const style = document.createElement('style');
        style.textContent = `
            .bg-primary { background-color: #11755d !important; }
            .text-primary { color: #11755d !important; }
            .border-primary { border-color: #11755d !important; }
            .ring-primary { --tw-ring-color: #11755d !important; }
            .hover\\:bg-primary\\/90:hover { background-color: rgba(17, 117, 93, 0.9) !important; }
            .from-primary { --tw-gradient-from: #11755d !important; }
            .to-primary { --tw-gradient-to: #11755d !important; }
        `;
        document.head.appendChild(style);
    }
}); 