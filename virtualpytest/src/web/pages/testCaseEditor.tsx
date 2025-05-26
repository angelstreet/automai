import React, { useState, useEffect } from 'react';
import { TestCase } from '../type';

interface TestCaseEditorProps {
  testId?: string;
  onSave?: (testCase: TestCase) => void;
  onCancel?: () => void;
}

const TestCaseEditor: React.FC<TestCaseEditorProps> = ({ testId, onSave, onCancel }) => {
  const [testCase, setTestCase] = useState<TestCase>({
    test_id: '',
    name: '',
    test_type: 'functional',
    start_node: '',
    steps: []
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (testId) {
      fetchTestCase(testId);
    }
  }, [testId]);

  const fetchTestCase = async (id: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/testcases/${id}`);
      if (response.ok) {
        const data = await response.json();
        setTestCase(data);
      } else {
        setError('Failed to fetch test case');
      }
    } catch (err) {
      setError('Error fetching test case');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const method = testId ? 'PUT' : 'POST';
      const url = testId ? `/api/testcases/${testId}` : '/api/testcases';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testCase),
      });

      if (response.ok) {
        onSave?.(testCase);
      } else {
        setError('Failed to save test case');
      }
    } catch (err) {
      setError('Error saving test case');
    } finally {
      setLoading(false);
    }
  };

  const addStep = () => {
    setTestCase(prev => ({
      ...prev,
      steps: [...prev.steps, {
        target_node: '',
        verify: {
          type: 'single',
          conditions: [{ type: 'element_exists', condition: '', timeout: 5000 }]
        }
      }]
    }));
  };

  const updateStep = (index: number, field: string, value: string) => {
    setTestCase(prev => ({
      ...prev,
      steps: prev.steps.map((step, i) => 
        i === index ? { ...step, [field]: value } : step
      )
    }));
  };

  const updateStepCondition = (stepIndex: number, conditionIndex: number, field: string, value: string | number) => {
    setTestCase(prev => ({
      ...prev,
      steps: prev.steps.map((step, i) => 
        i === stepIndex ? {
          ...step,
          verify: {
            ...step.verify,
            conditions: step.verify.conditions.map((condition, j) =>
              j === conditionIndex ? { ...condition, [field]: value } : condition
            )
          }
        } : step
      )
    }));
  };

  const removeStep = (index: number) => {
    setTestCase(prev => ({
      ...prev,
      steps: prev.steps.filter((_, i) => i !== index)
    }));
  };

  const addCondition = (stepIndex: number) => {
    setTestCase(prev => ({
      ...prev,
      steps: prev.steps.map((step, i) => 
        i === stepIndex ? {
          ...step,
          verify: {
            ...step.verify,
            conditions: [...step.verify.conditions, { type: 'element_exists', condition: '', timeout: 5000 }]
          }
        } : step
      )
    }));
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="test-case-editor">
      <h2>{testId ? 'Edit Test Case' : 'Create Test Case'}</h2>
      
      {error && <div className="error">{error}</div>}
      
      <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
        <div className="form-group">
          <label>Test ID:</label>
          <input
            type="text"
            value={testCase.test_id}
            onChange={(e) => setTestCase(prev => ({ ...prev, test_id: e.target.value }))}
            required
          />
        </div>

        <div className="form-group">
          <label>Name:</label>
          <input
            type="text"
            value={testCase.name}
            onChange={(e) => setTestCase(prev => ({ ...prev, name: e.target.value }))}
            required
          />
        </div>

        <div className="form-group">
          <label>Test Type:</label>
          <select
            value={testCase.test_type}
            onChange={(e) => setTestCase(prev => ({ ...prev, test_type: e.target.value as any }))}
          >
            <option value="functional">Functional</option>
            <option value="performance">Performance</option>
            <option value="endurance">Endurance</option>
            <option value="robustness">Robustness</option>
          </select>
        </div>

        <div className="form-group">
          <label>Start Node:</label>
          <input
            type="text"
            value={testCase.start_node}
            onChange={(e) => setTestCase(prev => ({ ...prev, start_node: e.target.value }))}
          />
        </div>

        <div className="form-group">
          <label>Steps:</label>
          {testCase.steps.map((step, stepIndex) => (
            <div key={stepIndex} className="step-group">
              <h4>Step {stepIndex + 1}</h4>
              <div>
                <label>Target Node:</label>
                <input
                  type="text"
                  value={step.target_node}
                  onChange={(e) => updateStep(stepIndex, 'target_node', e.target.value)}
                />
              </div>
              
              <div>
                <label>Verification Type:</label>
                <select
                  value={step.verify.type}
                  onChange={(e) => setTestCase(prev => ({
                    ...prev,
                    steps: prev.steps.map((s, i) => 
                      i === stepIndex ? {
                        ...s,
                        verify: { ...s.verify, type: e.target.value as 'single' | 'compound' }
                      } : s
                    )
                  }))}
                >
                  <option value="single">Single</option>
                  <option value="compound">Compound</option>
                </select>
              </div>

              <div>
                <label>Conditions:</label>
                {step.verify.conditions.map((condition, conditionIndex) => (
                  <div key={conditionIndex} className="condition-group">
                    <input
                      type="text"
                      placeholder="Type"
                      value={condition.type}
                      onChange={(e) => updateStepCondition(stepIndex, conditionIndex, 'type', e.target.value)}
                    />
                    <input
                      type="text"
                      placeholder="Condition"
                      value={condition.condition}
                      onChange={(e) => updateStepCondition(stepIndex, conditionIndex, 'condition', e.target.value)}
                    />
                    <input
                      type="number"
                      placeholder="Timeout (ms)"
                      value={condition.timeout}
                      onChange={(e) => updateStepCondition(stepIndex, conditionIndex, 'timeout', parseInt(e.target.value))}
                    />
                  </div>
                ))}
                <button type="button" onClick={() => addCondition(stepIndex)}>Add Condition</button>
              </div>
              
              <button type="button" onClick={() => removeStep(stepIndex)}>Remove Step</button>
            </div>
          ))}
          <button type="button" onClick={addStep}>Add Step</button>
        </div>

        <div className="form-actions">
          <button type="submit" disabled={loading}>
            {loading ? 'Saving...' : 'Save'}
          </button>
          <button type="button" onClick={onCancel}>Cancel</button>
        </div>
      </form>
    </div>
  );
};

export default TestCaseEditor;
