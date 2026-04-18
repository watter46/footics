/**
 * UI overrides for registering custom tools in the tldraw toolbar.
 * marker_connector は FloatingMarkerToolbar から起動するためここには登録しない。
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
    tools.zone_path = {
      id: 'zone-path',
      icon: 'line',
      label: 'Zone Path',
      kbd: 'p',
      onSelect: () => editor.setCurrentTool('zone_path'),
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
