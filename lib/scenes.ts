export const SCENE_BREAK_HTML='<p class="scene-break" data-sogur-scene-break="true">* * *</p>';

export function combineSceneContents(contents:string[]){
  return contents.join(SCENE_BREAK_HTML);
}

export function sceneStatus(value:unknown,fallback="DRAFT"){
  const status=String(value||"");
  return ["DRAFT","REVISE","DONE"].includes(status)?status:fallback;
}
