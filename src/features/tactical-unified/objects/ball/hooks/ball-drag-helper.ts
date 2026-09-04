export function setupGhostGroup(
  ghostGroup: any,
  ghostLine: any,
  pPxX: number,
  pPxY: number,
  currX: number,
  currY: number,
) {
  if (ghostGroup) {
    ghostGroup.position({ x: pPxX, y: pPxY });
    ghostGroup.visible(true);
    ghostGroup.getLayer()?.batchDraw();
  }
  if (ghostLine) {
    ghostLine.points([pPxX, pPxY, currX, currY]);
  }
}

export function hideGhostGroup(ghostGroup: any) {
  if (ghostGroup) {
    ghostGroup.visible(false);
    ghostGroup.getLayer()?.batchDraw();
  }
}
