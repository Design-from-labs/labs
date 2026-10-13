"use client";

import { FlowDiagram, FlowNodeList } from "./flow-diagram-canvas";
import { FlowNode, FlowAnchor } from "./flow-diagram-node";
import { FlowParallelNode } from "./flow-diagram-parallel";

// ---- upstream: index.ts ----

/**
 * Flow - Components for visualizing workflows and data flows.
 *
 * @example
 * ```tsx
 * <Flow>
 *   <Flow.Node>Step 1</Flow.Node>
 *   <Flow.Node>Step 2</Flow.Node>
 *   <Flow.Parallel>
 *     <Flow.Node>Branch A</Flow.Node>
 *     <Flow.Node>Branch B</Flow.Node>
 *   </Flow.Parallel>
 *   <Flow.Node>Step 3</Flow.Node>
 * </Flow>
 * ```
 */
const Flow = Object.assign(FlowDiagram, {
  Node: FlowNode,
  Parallel: FlowParallelNode,
  List: FlowNodeList,
  Anchor: FlowAnchor,
});

export { Flow };
