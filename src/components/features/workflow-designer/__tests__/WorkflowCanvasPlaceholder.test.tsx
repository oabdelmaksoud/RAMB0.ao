import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import WorkflowCanvas from '../WorkflowCanvasPlaceholder';
import { WorkflowNode, WorkflowEdge } from '@/types';

describe('WorkflowCanvas', () => {
  const mockNodes: WorkflowNode[] = [
    {
      id: 'node1',
      name: 'Analysis Agent',
      type: 'Analysis Agent',
      x: 100,
      y: 100,
      config: {},
    },
    {
      id: 'node2',
      name: 'CI/CD Agent',
      type: 'CI/CD Agent',
      x: 300,
      y: 300,
      config: {},
    }
  ];

  const mockEdges: WorkflowEdge[] = [
    {
      id: 'edge1',
      sourceNodeId: 'node1',
      targetNodeId: 'node2',
    }
  ];

  beforeEach(() => {
    // Mock getBoundingClientRect to return a non-zero dimension
    HTMLDivElement.prototype.getBoundingClientRect = jest.fn(() => ({
      width: 1000,
      height: 800,
      left: 0,
      top: 0,
      right: 1000,
      bottom: 800,
      x: 0,
      y: 0,
      toJSON: () => {}
    }));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders nodes correctly', () => {
    const { getByText } = render(
      <WorkflowCanvas 
        nodes={mockNodes} 
        edges={[]} 
      />
    );

    expect(getByText('Analysis Agent')).toBeInTheDocument();
    expect(getByText('CI/CD Agent')).toBeInTheDocument();
  });

  it('renders edges correctly', () => {
    const { container } = render(
      <WorkflowCanvas 
        nodes={mockNodes} 
        edges={mockEdges} 
      />
    );

    const paths = container.querySelectorAll('path[data-edge-id]');
    expect(paths.length).toBe(1);
  });

  it('calls onNodesChange when dropping a new node', () => {
    const mockOnNodesChange = jest.fn();
    const { container } = render(
      <WorkflowCanvas 
        nodes={[]} 
        edges={[]} 
        onNodesChange={mockOnNodesChange}
      />
    );

    const dropContainer = container.querySelector('div[data-testid="workflow-canvas"]');
    
    if (dropContainer) {
      const dataTransfer = {
        getData: () => 'Testing Agent',
        setData: jest.fn(),
        dropEffect: 'move'
      };

      const dropEvent = new Event('drop', { bubbles: true, cancelable: true });
      Object.assign(dropEvent, {
        clientX: 500,
        clientY: 400,
        dataTransfer
      });

      fireEvent.dragOver(dropContainer, { dataTransfer });
      fireEvent(dropContainer, dropEvent);
    }

    expect(mockOnNodesChange).toHaveBeenCalledTimes(1);
    expect(mockOnNodesChange.mock.calls[0][0]).toHaveLength(1);
    expect(mockOnNodesChange.mock.calls[0][0][0].name).toBe('Testing Agent');
  });

  it('calls onEdgesChange when creating an edge', () => {
    const mockOnEdgesChange = jest.fn();
    const { getByText } = render(
      <WorkflowCanvas 
        nodes={mockNodes} 
        edges={[]} 
        onEdgesChange={mockOnEdgesChange}
      />
    );

    const analysisAgent = getByText('Analysis Agent');
    const cicdAgent = getByText('CI/CD Agent');

    // Simulate node clicks to create an edge
    fireEvent.click(analysisAgent);
    fireEvent.click(cicdAgent);

    expect(mockOnEdgesChange).toHaveBeenCalledTimes(1);
    expect(mockOnEdgesChange.mock.calls[0][0]).toHaveLength(1);
  });

  it('calls onNodesChange when removing a node', () => {
    const mockOnNodesChange = jest.fn();
    const { getAllByTitle } = render(
      <WorkflowCanvas 
        nodes={mockNodes} 
        edges={mockEdges} 
        onNodesChange={mockOnNodesChange}
      />
    );

    const removeButtons = getAllByTitle('Remove agent');
    fireEvent.click(removeButtons[0]);

    expect(mockOnNodesChange).toHaveBeenCalledTimes(1);
    expect(mockOnNodesChange.mock.calls[0][0]).toHaveLength(1);
  });

  it('calls onEdgesChange when removing an edge', () => {
    const mockOnEdgesChange = jest.fn();
    const { container } = render(
      <WorkflowCanvas 
        nodes={mockNodes} 
        edges={mockEdges} 
        onEdgesChange={mockOnEdgesChange}
      />
    );

    const edgePath = container.querySelector('path[data-edge-id]');
    if (edgePath) {
      fireEvent.click(edgePath);
    }

    expect(mockOnEdgesChange).toHaveBeenCalledTimes(1);
    expect(mockOnEdgesChange.mock.calls[0][0]).toHaveLength(0);
  });
});
