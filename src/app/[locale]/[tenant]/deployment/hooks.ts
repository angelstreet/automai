import { useState, useEffect } from 'react';
import { getCICDProvidersAction, getCICDJobsAction, getCICDJobDetailsAction } from './actions';

export function useCICDProviders() {
  const [providers, setProviders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchProviders() {
      try {
        setIsLoading(true);
        const result = await getCICDProvidersAction();
        setProviders(result.providers || []);
        if (result.error) setError(result.error);
      } catch (err) {
        setError(err.message || 'Failed to fetch CI/CD providers');
        console.error('Error fetching CI/CD providers:', err);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchProviders();
  }, []);

  return { providers, isLoading, error };
}

export function useCICDJobs(providerId) {
  const [jobs, setJobs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchJobs() {
      if (!providerId) {
        setJobs([]);
        return;
      }
      
      try {
        setIsLoading(true);
        const result = await getCICDJobsAction(providerId);
        setJobs(result.jobs || []);
        if (result.error) setError(result.error);
      } catch (err) {
        setError(err.message || 'Failed to fetch CI/CD jobs');
        console.error('Error fetching CI/CD jobs:', err);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchJobs();
  }, [providerId]);

  return { jobs, isLoading, error };
}

export function useCICDJobDetails(providerId, jobId) {
  const [jobDetails, setJobDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchJobDetails() {
      if (!providerId || !jobId) {
        setJobDetails(null);
        return;
      }
      
      try {
        setIsLoading(true);
        const result = await getCICDJobDetailsAction(providerId, jobId);
        setJobDetails(result.jobDetails || null);
        if (result.error) setError(result.error);
      } catch (err) {
        setError(err.message || 'Failed to fetch job details');
        console.error('Error fetching job details:', err);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchJobDetails();
  }, [providerId, jobId]);

  return { jobDetails, isLoading, error };
}