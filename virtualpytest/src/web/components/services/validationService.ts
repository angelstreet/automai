import { 
  ValidationPreview, 
  ValidationResults, 
  ValidationProgress,
  ValidationPreviewResponse,
  ValidationRunResponse,
  ValidationExportResponse 
} from '../types/validationTypes';

class ValidationService {
  private baseUrl = 'http://localhost:5009/api/validation';
  private progressCallback: ((progress: ValidationProgress) => void) | null = null;
  private eventSource: EventSource | null = null;

  setProgressCallback(callback: ((progress: ValidationProgress) => void) | null) {
    this.progressCallback = callback;
  }

  async getPreview(treeId: string): Promise<ValidationPreview> {
    console.log(`[@service:validationService] Getting preview for tree: ${treeId}`);
    
    try {
      const response = await fetch(`${this.baseUrl}/preview/${treeId}`);
      const data: ValidationPreviewResponse = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to get validation preview');
      }
      
      console.log(`[@service:validationService] Preview received: ${data.preview.totalNodes} nodes, ${data.preview.estimatedTime}s estimated`);
      return data.preview;
    } catch (error) {
      console.error(`[@service:validationService] Error getting preview:`, error);
      throw error;
    }
  }

  async runValidation(treeId: string): Promise<ValidationResults> {
    console.log(`[@service:validationService] Running validation for tree: ${treeId}`);
    
    // Generate a unique session ID for this validation run
    const sessionId = `validation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      // Start Server-Sent Events connection for progress updates if callback is set
      if (this.progressCallback) {
        this.setupProgressStream(sessionId);
      }
      
      const response = await fetch(`${this.baseUrl}/run/${treeId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: this.progressCallback ? sessionId : undefined
        })
      });
      
      const data: ValidationRunResponse = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Validation failed');
      }
      
      console.log(`[@service:validationService] Validation completed: ${data.results.summary.validNodes}/${data.results.summary.totalNodes} nodes valid`);
      
      // Close progress stream
      this.closeProgressStream();
      
      return data.results;
    } catch (error) {
      console.error(`[@service:validationService] Error running validation:`, error);
      // Close progress stream on error
      this.closeProgressStream();
      throw error;
    }
  }

  private setupProgressStream(sessionId: string): void {
    console.log(`[@service:validationService] Setting up progress stream for session: ${sessionId}`);
    
    try {
      this.eventSource = new EventSource(`${this.baseUrl}/progress/${sessionId}`);
      
      this.eventSource.onmessage = (event) => {
        try {
          const progressData = JSON.parse(event.data);
          
          // Skip heartbeat messages
          if (progressData.type === 'heartbeat') {
            return;
          }
          
          console.log(`[@service:validationService] Progress update:`, progressData);
          
          // Convert backend progress format to frontend format
          const progress: ValidationProgress = {
            currentStep: progressData.currentStep || 0,
            totalSteps: progressData.totalSteps || 0,
            currentNode: progressData.currentEdgeTo || '',
            currentNodeName: progressData.currentEdgeToName || '',
            currentEdgeFrom: progressData.currentEdgeFrom || '',
            currentEdgeTo: progressData.currentEdgeTo || '',
            currentEdgeFromName: progressData.currentEdgeFromName || '',
            currentEdgeToName: progressData.currentEdgeToName || '',
            currentEdgeStatus: progressData.currentEdgeStatus as any || 'testing',
            retryAttempt: progressData.retryAttempt || 0,
            status: progressData.currentEdgeStatus === 'completed' ? 'completed' : 'running',
            completedNodes: [] // TODO: Track completed nodes if needed
          };
          
          // Call the progress callback
          if (this.progressCallback) {
            this.progressCallback(progress);
          }
          
        } catch (error) {
          console.error(`[@service:validationService] Error parsing progress data:`, error);
        }
      };
      
      this.eventSource.onerror = (error) => {
        console.error(`[@service:validationService] SSE connection error:`, error);
        this.closeProgressStream();
      };
      
    } catch (error) {
      console.error(`[@service:validationService] Error setting up progress stream:`, error);
    }
  }

  private closeProgressStream(): void {
    if (this.eventSource) {
      console.log(`[@service:validationService] Closing progress stream`);
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  async exportReport(treeId: string, format: 'json' | 'csv' = 'json'): Promise<Blob> {
    console.log(`[@service:validationService] Exporting report for tree: ${treeId}, format: ${format}`);
    
    try {
      const response = await fetch(`${this.baseUrl}/export/${treeId}?format=${format}`);
      const data: ValidationExportResponse = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Export failed');
      }
      
      // Convert the report data to a blob
      let blob: Blob;
      if (format === 'csv') {
        blob = new Blob([data.report], { type: 'text/csv' });
      } else {
        blob = new Blob([JSON.stringify(data.report, null, 2)], { type: 'application/json' });
      }
      
      console.log(`[@service:validationService] Report exported successfully`);
      return blob;
    } catch (error) {
      console.error(`[@service:validationService] Error exporting report:`, error);
      throw error;
    }
  }

  downloadBlob(blob: Blob, filename: string): void {
    console.log(`[@service:validationService] Downloading file: ${filename}`);
    
    try {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      console.log(`[@service:validationService] File download initiated: ${filename}`);
    } catch (error) {
      console.error(`[@service:validationService] Error downloading file:`, error);
      throw error;
    }
  }
}

export const validationService = new ValidationService(); 