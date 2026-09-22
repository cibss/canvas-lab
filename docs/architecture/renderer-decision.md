# Renderer Architecture Decision

## Status

Accepted

## Context

CanvasLab uses Canvas2D as its production document renderer.

The editor architecture separates document rendering from interaction and editor chrome through a small `DocumentRenderer` boundary. This makes it possible to explore alternative rendering backends without changing the document model, selection engine, history system, accessibility architecture, or interaction system.

An isolated WebGPU renderer prototype was implemented to determine whether moving the production renderer to a GPU-backed architecture would provide a meaningful performance advantage.

The WebGPU prototype supports a deliberately small rendering subset:

- root rectangles
- solid fills
- opacity
- rotation
- camera transforms
- instanced GPU drawing

The experiment does not attempt production parity with Canvas2D.

## Benchmark Method

Canvas2D and WebGPU were tested against the same deterministic rectangle documents.

Each renderer received:

- the same document
- the same canvas dimensions
- the same camera movement
- 20 warm-up frames
- 120 measured frames

The benchmark records:

- average synchronous render-call duration
- median render-call duration
- P95 render-call duration
- maximum render-call duration
- average requestAnimationFrame interval
- observed frame cadence

WebGPU measurements represent synchronous CPU-side preparation and command submission.

They do not represent raw GPU execution time because GPU queue execution is asynchronous.

## Results

### 1,000 Rectangles

| Metric                 | Canvas2D |   WebGPU |
| ---------------------- | -------: | -------: |
| Average render call    |  1.69 ms |  2.40 ms |
| Median                 |  1.60 ms |  2.30 ms |
| P95                    |  2.20 ms |  3.20 ms |
| Max                    |  2.60 ms |  3.60 ms |
| Average frame interval | 16.67 ms | 16.67 ms |
| Observed cadence       | 60.0 FPS | 60.0 FPS |

### 4,000 Rectangles

| Metric                 | Canvas2D |   WebGPU |
| ---------------------- | -------: | -------: |
| Average render call    |  2.46 ms |  5.00 ms |
| Median                 |  2.50 ms |  5.00 ms |
| P95                    |  2.70 ms |  5.80 ms |
| Max                    |  3.00 ms |  6.10 ms |
| Average frame interval | 16.67 ms | 16.67 ms |
| Observed cadence       | 60.0 FPS | 60.0 FPS |

### 10,000 Rectangles

| Metric                 | Canvas2D |   WebGPU |
| ---------------------- | -------: | -------: |
| Average render call    |  5.80 ms |  5.76 ms |
| Median                 |  5.80 ms |  5.60 ms |
| P95                    |  6.30 ms |  6.50 ms |
| Max                    |  7.80 ms |  7.30 ms |
| Average frame interval | 16.67 ms | 16.67 ms |
| Observed cadence       | 60.0 FPS | 60.0 FPS |

## Observations

Canvas2D performed better for the 1,000 and 4,000 rectangle workloads.

At 10,000 rectangles, the average synchronous render-call cost was effectively equivalent between the two renderers.

Both backends maintained a 60 FPS observed frame cadence in all tested workloads.

The WebGPU prototype currently rebuilds CPU-side instance data and uploads the instance buffer whenever the camera changes. A more GPU-native architecture could retain world-space geometry in persistent GPU buffers and update only camera uniforms during camera movement.

That architecture could improve WebGPU scaling, but would introduce substantially more renderer complexity.

The production Canvas2D renderer also benefits from optimizations that were intentionally excluded from the raw renderer comparison:

- render invalidation
- animation-frame scheduling
- viewport culling
- layered document and interaction canvases

As a result, large source documents do not necessarily translate into equally large Canvas2D draw workloads in the production editor.

## Decision

Canvas2D remains the production document renderer for CanvasLab.

WebGPU remains an isolated rendering experiment.

The current performance measurements do not demonstrate a sufficient runtime advantage to justify replacing the existing Canvas2D renderer and rebuilding production features such as hierarchy rendering, clipping, text, ellipses, and other document semantics.

## Future Reconsideration

A GPU-backed production renderer should be reconsidered if profiling shows that Canvas2D remains a measurable bottleneck after the existing rendering optimizations.

Potential signals include:

- thousands of simultaneously visible objects
- sustained frame times above the interaction budget
- complex effects or compositing
- large image workloads
- heavy transforms across large visible scenes
- renderer CPU time becoming a dominant performance cost

A future GPU renderer should prefer:

- persistent world-space GPU buffers
- incremental buffer updates
- camera transforms through uniforms
- instanced geometry
- explicit GPU resource lifecycle management

rather than rebuilding and uploading the complete scene every frame.

## Outcome

The experiment validates the renderer abstraction without requiring a production renderer migration.

CanvasLab can continue using Canvas2D while retaining an architecture that allows alternative rendering backends to be explored independently.
