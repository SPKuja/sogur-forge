export function cleanManuscriptHtml(html:string){
  const anchor=/<span\b[^>]*data-note-anchor=(?:"[^"]*"|'[^']*')[^>]*>([\s\S]*?)<\/span>/gi;
  return html.replace(anchor,"$1");
}
