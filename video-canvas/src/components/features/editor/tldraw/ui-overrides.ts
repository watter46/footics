/**
 * UI overrides for registering custom Zone tools in the tldraw toolbar.
 */
export const uiOverrides: any = {
  tools(editor: any, tools: any) {
    tools.zone_circle = {
      id: 'zone-circle',
      icon: 'geo-ellipse',
      label: 'Zone Circle',
      kbd: 'o',
      onSelect: () => editor.setCurrentTool('zone-circle'),
    };
    tools.zone_rect = {
      id: 'zone-rect',
      icon: 'geo-rectangle',
      label: 'Zone Rect',
      kbd: 'r',
      onSelect: () => editor.setCurrentTool('zone-rect'),
    };
    tools.link_line = {
      id: 'link-line',
      icon: 'line',
      label: 'Link Line',
      kbd: 'l',
      onSelect: () => editor.setCurrentTool('link-line'),
    };
    tools.marker = {
      id: 'marker',
      icon: 'geo-ellipse',
      label: 'Marker',
      kbd: 'm',
      onSelect: () => editor.setCurrentTool('marker'),
    };
    return tools;
  },
};
