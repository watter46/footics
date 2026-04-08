import { useEffect, useRef, useCallback } from 'react';
import * as fabric from 'fabric';
import { useEditorStore } from '../stores/useEditorStore';
import { DrawingObject } from '../lib/models/drawing';
import { denormalize, fabricToModel, normalize, denormalizeSize } from '../lib/models/converter';
import { ConnectedLine } from '../lib/fabric/Connector';
import { Spotlight } from '../lib/fabric/Spotlight';

/**
 * useFabricSync
 * Synchronizes the Fabric.js canvas with the Zustand store (Model).
 * Handles reconciliation and event feedback.
 */
export const useFabricSync = (canvas: fabric.Canvas | null) => {
  const { 
    objects, 
    hoveredObjectId, 
    updateObject, 
    setSelectedObject, 
    saveHistory 
  } = useEditorStore();

  const isSyncingRef = useRef(false);
  const needsSyncRef = useRef(false);
  const objectsMapRef = useRef<Map<string, fabric.FabricObject>>(new Map());

  const sync = useCallback(async () => {
    if (!canvas || isSyncingRef.current) {
        needsSyncRef.current = true;
        return;
    }

    isSyncingRef.current = true;
    needsSyncRef.current = false;
    
    try {
        const canvasWidth = canvas.width || 1;
        const canvasHeight = canvas.height || 1;

        // 1. Remove objects that are no longer in the model
        const modelIds = new Set(objects.map(obj => obj.id));
        objectsMapRef.current.forEach((fabricObj, id) => {
          if (!modelIds.has(id)) {
            canvas.remove(fabricObj);
            objectsMapRef.current.delete(id);
          }
        });

        // 2. Create or Update objects from the model
        for (let index = 0; index < objects.length; index++) {
          const modelObj = objects[index];
          let fabricObj: fabric.FabricObject | undefined = objectsMapRef.current.get(modelObj.id);

          if (!fabricObj) {
            const newObj = await createFabricObject(modelObj, canvasWidth, canvasHeight);
            if (newObj) {
              fabricObj = newObj;
              (fabricObj as any).id = modelObj.id;
              canvas.add(fabricObj);
              objectsMapRef.current.set(modelObj.id, fabricObj);
            }
          }

          if (fabricObj) {
            updateFabricObject(fabricObj, modelObj, canvasWidth, canvasHeight);
            
            // --- Hover Highlight (using shadow to avoid shifting bounding box) ---
            if (modelObj.id === hoveredObjectId) {
                fabricObj.set({
                    shadow: new fabric.Shadow({
                        color: 'rgba(59, 130, 246, 0.8)',
                        blur: 15
                    })
                });
            } else {
                fabricObj.set({
                    shadow: null
                });
            }

            // Sync Z-Index (Order)
            if (canvas.getObjects().indexOf(fabricObj) !== index) {
                canvas.moveObjectTo(fabricObj, index);
            }
          }
        }

        canvas.renderAll();
    } catch (err) {
        console.error('Sync failed', err);
    } finally {
        isSyncingRef.current = false;
        if (needsSyncRef.current) {
            sync();
        }
    }
  }, [objects, canvas, hoveredObjectId]);

  useEffect(() => {
    sync();
  }, [objects, canvas, sync]);

  // --- External Feedback (Sync back to Model) ---
  useEffect(() => {
    if (!canvas) return;

    const handleModified = (e: any) => {
      if (isSyncingRef.current) return;
      
      const fabricObj = e.target as any;
      if (!fabricObj || !fabricObj.id) return;

      const canvasWidth = canvas.width || 1;
      const canvasHeight = canvas.height || 1;
      
      const updatedModel = fabricToModel(fabricObj, canvasWidth, canvasHeight);
      updateObject(fabricObj.id, updatedModel);
      saveHistory();
    };

    const handleSelection = (e: any) => {
        const selectedIds = e.selected?.map((o: any) => o.id).filter(Boolean) || [];
        setSelectedObject(selectedIds[0] || null);
    };

    canvas.on('object:modified', handleModified);
    canvas.on('selection:created', handleSelection);
    canvas.on('selection:updated', handleSelection);
    canvas.on('selection:cleared', () => setSelectedObject(null));

    return () => {
      canvas.off('object:modified', handleModified);
      canvas.off('selection:created', handleSelection);
      canvas.off('selection:updated', handleSelection);
    };
  }, [canvas, updateObject, setSelectedObject, saveHistory]);
};

async function createFabricObject(model: DrawingObject, canvasWidth: number, canvasHeight: number): Promise<fabric.FabricObject | null> {
  const common = {
    left: denormalize(model.x, canvasWidth),
    top: denormalize(model.y, canvasHeight),
    fill: model.fill,
    stroke: model.stroke,
    strokeWidth: denormalizeSize(model.strokeWidth, canvasWidth),
    strokeDashArray: model.strokeDashArray ? model.strokeDashArray.map(v => denormalizeSize(v, canvasWidth)) : null,
    angle: model.angle,
    opacity: model.opacity,
  };

  switch (model.type) {
    case 'rect':
      return new fabric.Rect({
        ...common,
        width: denormalize(model.width || 0, canvasWidth),
        height: denormalize(model.height || 0, canvasHeight),
      });
    case 'circle':
    case 'ellipse':
        return new fabric.Ellipse({
            ...common,
            rx: denormalize(model.rx || 0, canvasWidth),
            ry: denormalize(model.ry || 0, canvasHeight),
        });
    case 'line':
        return new fabric.Line([
            denormalize(model.x1 || 0, canvasWidth),
            denormalize(model.y1 || 0, canvasHeight),
            denormalize(model.x2 || 0, canvasWidth),
            denormalize(model.y2 || 0, canvasHeight)
        ], common);
    case 'spotlight':
        return new Spotlight({ ...common });
    case 'image':
        if (!model.url) return null;
        try {
            const img = await fabric.FabricImage.fromURL(model.url, {
                crossOrigin: 'anonymous'
            });
            return img;
        } catch (e) {
            console.error('Failed to load image', e);
            return null;
        }
    default:
      return null;
  }
}

function updateFabricObject(fabricObj: fabric.FabricObject, model: DrawingObject, canvasWidth: number, canvasHeight: number) {
  fabricObj.set({
    left: denormalize(model.x, canvasWidth),
    top: denormalize(model.y, canvasHeight),
    angle: model.angle,
    fill: model.fill,
    stroke: model.stroke,
    strokeWidth: denormalizeSize(model.strokeWidth, canvasWidth),
    strokeDashArray: model.strokeDashArray ? model.strokeDashArray.map(v => denormalizeSize(v, canvasWidth)) : null,
    visible: model.visible,
    opacity: model.opacity,
    lockMovementX: model.locked,
    lockMovementY: model.locked,
    lockScalingX: model.locked,
    lockScalingY: model.locked,
    lockRotation: model.locked,
    selectable: !model.locked,
    evented: !model.locked || (fabricObj as any).id, 
  } as any);

  if (model.scaleX && model.scaleY) {
      fabricObj.set({ scaleX: model.scaleX, scaleY: model.scaleY });
  }
  
  if (fabricObj instanceof fabric.Rect && model.width && model.height) {
      fabricObj.set({
          width: denormalize(model.width, canvasWidth),
          height: denormalize(model.height, canvasHeight),
      });
  }
  
  if (fabricObj instanceof fabric.FabricImage) {
      // Auto-scale background image if it hasn't been scaled in model
      if ((model.id === 'bg-image' || model.name === 'image') && model.scaleX === 1 && model.scaleY === 1) {
          const scale = Math.max(
              canvasWidth / (fabricObj.width || 1),
              canvasHeight / (fabricObj.height || 1)
          );
          fabricObj.set({ scaleX: scale, scaleY: scale });
          fabricObj.set({
              left: (canvasWidth - (fabricObj.width || 0) * scale) / 2,
              top: (canvasHeight - (fabricObj.height || 0) * scale) / 2
          });
      }
  }

  fabricObj.setCoords();
}
