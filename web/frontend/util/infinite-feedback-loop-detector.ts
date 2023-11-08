export type Feedback = 'positive' | 'negative';

export type FeedbackLoopAdjacencyList = {
  [state: string]: {
    [feedback in Feedback]: Set<string>;
  };
};

/**
 * Finds infinite feedback loops in directed graphs.
 * Every edge is either positive or negative.
 * An infinite feedback loop is a cycle that starts with a positive feedback and ends with a negative feedback, vice versa.
 * Uses a simple O(V + E) DFS algorithm
 */
export function findInfiniteFeedbackLoop(adjacencyList: FeedbackLoopAdjacencyList) {
  for (const startNode of Object.keys(adjacencyList)) {
    const infiniteFeedbackLoop = findInfiniteFeedbackLoopFromNode(adjacencyList, startNode);
    if (infiniteFeedbackLoop) {
      return infiniteFeedbackLoop;
    }
  }

  return null;
}

function findInfiniteFeedbackLoopFromNode(
  adjacencyList: FeedbackLoopAdjacencyList,
  node: string,
  /**
   * The feedback at the current node.
   * If this node is the start/end of a cycle, and the feedback is different from the start, then there is an infinite feedback loop.
   */
  feedback: Feedback = 'positive',
  visited = new Set<string>(),
  path: [node: string, feedback: Feedback][] = [],
): [node: string, feedback: Feedback][] | null {
  const cycleNode = path.find(([pathNode]) => pathNode === node);
  if (cycleNode) {
    // found a cycle

    if (feedback !== cycleNode[1]) {
      // infinite feedback loop
      return [...path, [node, feedback]];
    }

    return null;
  }

  path.push([node, feedback]);

  for (const edgeFeedback of ['positive', 'negative'] as const) {
    const neighbors = adjacencyList[node][edgeFeedback];
    const nextFeedback = edgeFeedback === 'positive' ? feedback : toggleFeedback(feedback);

    for (const nextNode of neighbors) {
      if (visited.has(nextNode)) {
        continue;
      }

      const infiniteFeedbackLoop = findInfiniteFeedbackLoopFromNode(
        adjacencyList,
        nextNode,
        nextFeedback,
        visited,
        path,
      );

      if (infiniteFeedbackLoop) {
        return infiniteFeedbackLoop;
      }
    }
  }

  path.pop();
  visited.add(node);

  return null;
}

const toggleFeedback = (feedback: Feedback): Feedback => (feedback === 'positive' ? 'negative' : 'positive');
