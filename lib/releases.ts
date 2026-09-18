import packageInfo from "@/package.json";

export type ReleaseNote={
  version:string;
  date:string;
  title:string;
  added:string[];
  changed:string[];
  fixed:string[];
};

export const CURRENT_VERSION=packageInfo.version;

export const RELEASES:ReleaseNote[]=[
  {
    version:"0.0.5",
    date:"18 September 2026",
    title:"Safer manuscript organisation",
    added:[
      "Permanent chapter deletion now uses an explicit warning dialog and requires typing DELETE.",
      "Empty Parts can now be deleted directly from the manuscript tree."
    ],
    changed:[
      "Parts containing chapters cannot be deleted until those chapters are moved or removed.",
      "Move up and Move down now reorder chapters within their current Part or unassigned chapter group."
    ],
    fixed:[
      "Chapter move controls no longer appear to do nothing when neighbouring chapters belong to different Parts.",
      "Server-side safeguards now prevent deleting the final chapter in a novel."
    ]
  },
  {
    version:"0.0.4",
    date:"18 September 2026",
    title:"Short screens, full sidebar",
    added:[],
    changed:[
      "The entire manuscript sidebar now scrolls on shorter displays instead of limiting scrolling to the chapter list.",
      "The sidebar scrollbar stays deliberately subtle and only becomes visible on hover where supported."
    ],
    fixed:[
      "Chapter navigation, writing goals and theme controls can now all be reached comfortably on short-height screens."
    ]
  },
  {
    version:"0.0.3",
    date:"18 September 2026",
    title:"A little more room to write",
    added:[],
    changed:[
      "The manuscript chapter list now uses its own scroll area so navigation and writing goals remain accessible on shorter displays."
    ],
    fixed:[
      "Long chapter lists no longer disappear behind the sidebar footer."
    ]
  },
  {
    version:"0.0.2",
    date:"18 September 2026",
    title:"Choose what leaves the forge",
    added:[
      "A reusable manuscript Content Picker for selecting whole novels, Parts or individual Chapters.",
      "An export-manifest foundation that validates ownership, preserves manuscript order and strips internal linked-note markers from export content."
    ],
    changed:[
      "The manuscript header now includes an Export entry point ready for the upcoming DOCX exporter."
    ],
    fixed:[]
  },
  {
    version:"0.0.1",
    date:"18 September 2026",
    title:"The forge is lit",
    added:[
      "Secure user accounts, persistent sessions and a personal novel library.",
      "Novel parts and chapters with collapsible manuscript groups and drag-and-drop ordering.",
      "A rich manuscript editor with formatting controls, image import and Focus mode.",
      "Semantic paragraph indentation with optional automatic indentation for new paragraphs.",
      "The Cork Board with multiple boards and draggable coloured sticky notes.",
      "Chapter notes, including sticky notes linked directly to selected manuscript passages.",
      "Responsive desktop, tablet and mobile layouts with light, dark and system themes."
    ],
    changed:[
      "Manuscript autosave and save-state feedback were hardened for longer writing sessions.",
      "Chapter organisation and writing tools were moved closer to the manuscript workflow."
    ],
    fixed:[
      "Session cookies now work correctly on local HTTP deployments as well as HTTPS reverse proxies.",
      "Several manuscript save, image-selection and editor interaction edge cases were corrected."
    ]
  }
];

const currentRelease=RELEASES.find(r=>r.version===CURRENT_VERSION);
if(!currentRelease)throw new Error(`No changelog entry exists for Sögur Forge v${CURRENT_VERSION}`);
export const CURRENT_RELEASE:ReleaseNote=currentRelease;
