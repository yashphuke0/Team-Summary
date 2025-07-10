// File Upload Component
class FileUpload {
    constructor(config) {
        this.config = {
            maxSize: 5 * 1024 * 1024, // 5MB
            allowedTypes: ['image/jpeg', 'image/jpg', 'image/png'],
            allowedExtensions: ['.jpg', '.jpeg', '.png'],
            ...config
        };
        
        this.currentFile = null;
        this.onFileSelectCallback = null;
        this.onValidationErrorCallback = null;
    }

    initialize(uploadAreaId, fileInputId, previewId = null) {
        this.uploadArea = document.getElementById(uploadAreaId);
        this.fileInput = document.getElementById(fileInputId);
        this.preview = previewId ? document.getElementById(previewId) : null;
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        if (this.uploadArea) {
            this.uploadArea.addEventListener('click', () => this.fileInput.click());
            this.uploadArea.addEventListener('dragover', this.handleDragOver.bind(this));
            this.uploadArea.addEventListener('drop', this.handleDrop.bind(this));
        }
        
        if (this.fileInput) {
            this.fileInput.addEventListener('change', this.handleFileSelect.bind(this));
        }
    }

    handleDragOver(e) {
        e.preventDefault();
        this.uploadArea.classList.add('border-primary', 'bg-primary/5');
    }

    handleDrop(e) {
        e.preventDefault();
        this.uploadArea.classList.remove('border-primary', 'bg-primary/5');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            this.processFile(files[0]);
        }
    }

    handleFileSelect(e) {
        const files = e.target.files;
        if (files.length > 0) {
            this.processFile(files[0]);
        }
    }

    processFile(file) {
        if (!this.validateFile(file)) {
            return;
        }

        this.currentFile = file;
        this.showPreview(file);
        
        if (this.onFileSelectCallback) {
            this.onFileSelectCallback(file);
        }
    }

    validateFile(file) {
        const isValidType = this.config.allowedTypes.includes(file.type) || 
                           this.config.allowedExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
        
        if (!isValidType) {
            this.showError('Please upload a valid image file (JPG, PNG)');
            return false;
        }

        if (file.size > this.config.maxSize) {
            this.showError(`File size must be less than ${this.config.maxSize / (1024 * 1024)}MB`);
            return false;
        }

        return true;
    }

    showPreview(file) {
        if (!this.preview) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            this.preview.src = e.target.result;
            this.preview.parentElement.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    }

    removeFile() {
        this.currentFile = null;
        if (this.fileInput) {
            this.fileInput.value = '';
        }
        if (this.preview) {
            this.preview.parentElement.classList.add('hidden');
        }
    }

    getCurrentFile() {
        return this.currentFile;
    }

    onFileSelect(callback) {
        this.onFileSelectCallback = callback;
    }

    onValidationError(callback) {
        this.onValidationErrorCallback = callback;
    }

    showError(message) {
        if (this.onValidationErrorCallback) {
            this.onValidationErrorCallback(message);
        }
    }

    showLoading(show) {
        if (!this.uploadArea) return;
        
        const content = this.uploadArea.querySelector('#upload-content');
        const loading = this.uploadArea.querySelector('#upload-loading');
        
        if (content && loading) {
            if (show) {
                content.classList.add('hidden');
                loading.classList.remove('hidden');
            } else {
                content.classList.remove('hidden');
                loading.classList.add('hidden');
            }
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FileUpload;
} else {
    window.FileUpload = FileUpload;
} 