# Interactive features

## Workflow diagram (`src/components/WorkflowDiagram.tsx`, `src/lib/workflow.ts`)

- **Views:** Simple (main components only, laid out in reading order), Detailed (every component at its configured grid position), When something fails (choose a scenario).
- **Send request:** plays the configured path. For each step a blue pulse travels the arrow, the arrow fills in behind it, the receiving component is highlighted, and the step is explained below the diagram. Responses are steps back to the user. Recovery steps pulse green. In the failure view the failing component turns red and is labelled Failed; the run then follows only the configured recovery steps and ends with what the user sees and how the problem is detected. It never shows "Request complete" for a failure.
- **Controls:** Send request or Send again, Pause and Resume, previous step, next step, Reset. All share one state, and one animation loop runs at a time.
- **Explanations:** select a component (mouse, Enter or Space) to see what it is, why we need it, what goes in, what happens inside, what comes out, and what can go wrong.
- **Text version:** a numbered list of the same steps, shown on phones and via "Show as text" elsewhere, synchronized with playback.
- **Reduced motion:** the pulse does not move; steps advance with longer pauses, and manual stepping always works.

## Traffic and capacity (`src/components/charts/TrafficCapacity.tsx`)

Inputs: average requests per second, peak multiplier, requests per server per second, target utilization.

```
peak    = average × multiplier
servers = ceil(peak ÷ (per server × utilization))
```

The chart shows a sale curve (normal, rise at minute 30, plateau, gradual fall) and a line for what the computed servers handle at target load. Out-of-range input is rejected with a message and the last valid value stays in use. It is an educational estimate: real traffic is burstier and servers take minutes to start.

## Queue demo (`src/components/charts/QueueDemo.tsx`)

Inputs: fans arriving per second during the rush, rush length, fans let in per second. A deterministic fluid model computes the line length over time, the peak, the wait for the last fan (line ÷ admission rate) and when the line empties. After the rush, arrivals continue at a quarter of the admission rate. Real fans give up and leave, so real lines shrink faster.
