import { 
  ValidationPreview, 
  ValidationResults, 
  ValidationPreviewResponse,
  ValidationRunResponse,
  ValidationExportResponse 
} from '../types/validationTypes';

class ValidationService {
  private baseUrl = '/api/validation';

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
    
    try {
      const response = await fetch(`${this.baseUrl}/run/${treeId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const data: ValidationRunResponse = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Validation failed');
      }
      
      console.log(`[@service:validationService] Validation completed: ${data.results.summary.validNodes}/${data.results.summary.totalNodes} nodes valid`);
      return data.results;
    } catch (error) {
      console.error(`[@service:validationService] Error running validation:`, error);
      throw error;
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