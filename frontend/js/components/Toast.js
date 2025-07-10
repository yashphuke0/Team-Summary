// Toast Notification Component
class Toast {
    constructor() {
        this.errorToast = null;
        this.successToast = null;
        this.errorMessage = null;
        this.successMessage = null;
    }

    initialize(errorToastId, errorMessageId, successToastId, successMessageId) {
        this.errorToast = document.getElementById(errorToastId);
        this.successToast = document.getElementById(successToastId);
        this.errorMessage = document.getElementById(errorMessageId);
        this.successMessage = document.getElementById(successMessageId);
    }

    showError(message, duration = 5000) {
        if (!this.errorToast || !this.errorMessage) return;
        
        this.errorMessage.textContent = message;
        this.errorToast.classList.remove('translate-y-full');
        
        setTimeout(() => {
            this.errorToast.classList.add('translate-y-full');
        }, duration);
    }

    showSuccess(message, duration = 4000) {
        if (!this.successToast || !this.successMessage) return;
        
        this.successMessage.textContent = message;
        this.successToast.classList.remove('translate-y-full');
        
        setTimeout(() => {
            this.successToast.classList.add('translate-y-full');
        }, duration);
    }

    showWarning(message, duration = 5000) {
        // Use error toast for warnings with different styling
        this.showError(message, duration);
    }

    showInfo(message, duration = 4000) {
        // Use success toast for info messages
        this.showSuccess(message, duration);
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Toast;
} else {
    window.Toast = Toast;
} 