# Konva.js + react-konva Performance Optimization

### listening
*   **Purpose:** Konva shapes and layers listen for mouse and touch events by default. The library maintains a "hit graph" to detect which shape is under the cursor.
*   **Performance Impact:** Maintaining this hit graph has a significant performance cost. For shapes or layers that do not require interactivity (e.g., background elements, static decorations, or dense data visualizations), setting `listening` to `false` removes this overhead.
*   **Usage in react-konva:** Set `listening={false}` on `<Layer>`, `<Group>`, or individual shapes (e.g., `<Rect>`) that do not need to respond to pointer events.

### perfectDrawEnabled
*   **Purpose:** By default, Konva uses a "buffer canvas" to render shapes with complex combinations of `fill`, `stroke`, and `opacity`. This prevents unwanted visual artifacts where strokes and fills overlap.
*   **Performance Impact:** This extra work can become a bottleneck when rendering many translucent shapes. Setting `perfectDrawEnabled(false)` skips the buffer canvas, directly drawing the shape to the layer.
*   **Usage in react-konva:** Set `perfectDrawEnabled={false}` on shapes where perfect stroke/fill overlapping with opacity is not critical, especially when drawing thousands of shapes.

### Summary
*   **listening={false}**: Best for static shapes or background layers that don't need interactions.
*   **perfectDrawEnabled={false}**: Best for complex scenes with many shapes where perfect rendering is not critical.
