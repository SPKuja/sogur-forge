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
    version:"0.0.19",
    date:"21 September 2026",
    title:"Your forge, your data",
    added:[
      "A user Settings page now brings account security, data export and backup controls into one place.",
      "Administrators now have server controls for opening or closing registrations, requiring email verification, reviewing accounts, manually verifying an address and revoking user sessions.",
      "New accounts support email verification through SMTP with expiring one-time links and a resend flow.",
      "Users can download a clean ZIP export of their account data, manuscripts, scenes, Story Bible records, planning data and uploaded assets.",
      "Users can also download a provider-neutral backup ZIP designed to become the payload for future Dropbox, Google Drive and OneDrive backups."
    ],
    changed:[
      "The first account on a fresh server becomes the administrator automatically; existing installations promote the oldest account and mark existing accounts verified during migration so nobody is unexpectedly locked out.",
      "Registration honours the administrator switch and refuses additional verified-account sign-ups when SMTP is required but not configured.",
      "Changing a password now revokes every active session for that account."
    ],
    fixed:[
      "Story Bible reference highlighting now builds cleanly after moving the browser-only Highlight API styling out of the server CSS pipeline."
    ]
  },
  {
    version:"0.0.18",
    date:"21 September 2026",
    title:"Story Bible at hand",
    added:[
      "The manuscript editor can now highlight stored Character names and aliases as a display-only Story Bible layer.",
      "Hovering a recognised Character reference shows a compact profile card with portrait, role, age, pronouns, description and aliases when available.",
      "A References toolbar toggle enables or disables the overlay and remembers the preference in the browser."
    ],
    changed:[
      "Reference highlighting uses the browser's visual highlight layer rather than inserting markup into manuscript HTML, so prose, revisions, copying and future exports remain clean.",
      "Character matching is case-insensitive and whole-word aware, and ambiguous names shared by multiple Story Bible entries are deliberately left unhighlighted.",
      "The reference model is category-aware so Locations and other Story Bible entries can join the same editor layer later."
    ],
    fixed:[]
  },
  {
    version:"0.0.17",
    date:"21 September 2026",
    title:"Inside the chapter",
    added:[
      "Chapters can now opt into scene structure without changing chapters that prefer one continuous manuscript.",
      "Existing chapter prose can become Scene 1 in one click, then the editor can split the scene exactly at the current cursor position.",
      "Scene tabs support navigation, direct drag-and-drop ordering, adding and deleting scenes, and live per-scene word counts.",
      "Each scene can keep a private working title, POV character, location, status, summary, goal, conflict and outcome."
    ],
    changed:[
      "Scene-enabled chapters keep a combined chapter manuscript behind the scenes, separated by explicit scene breaks, so existing export and chapter word-count foundations continue to work.",
      "Removing scene structure safely rejoins every scene into the chapter with visible scene breaks.",
      "Duplicating a chapter now duplicates its scene structure and scene metadata as well as its manuscript."
    ],
    fixed:[
      "Whole-chapter revision restoration is now blocked while a chapter uses scenes, preventing an old revision from silently desynchronising scene content."
    ]
  },
  {
    version:"0.0.16",
    date:"20 September 2026",
    title:"Shape the manuscript",
    added:[
      "Manuscript Manager now has a dedicated Sections tab for creating, renaming, deleting and reviewing manuscript sections.",
      "Sections support direct drag-and-drop reordering with before/after indicators, plus up/down controls as a fallback.",
      "Each section shows its manuscript-item count and combined word count."
    ],
    changed:[
      "Reordering sections immediately changes manuscript grouping and dynamic chapter numbering because chapter numbers follow the resulting manuscript order.",
      "The writing interface now refers to these structural groups as Sections while retaining the existing underlying Part data for compatibility.",
      "Sections containing manuscript items must be emptied before deletion to prevent accidental content moves."
    ],
    fixed:[]
  },
  {
    version:"0.0.15",
    date:"20 September 2026",
    title:"Beyond the chapters",
    added:[
      "Manuscripts can now contain non-chapter pages alongside chapters without those pages consuming chapter numbers.",
      "New Page includes presets for title pages, copyright, dedication, epigraph, foreword, preface, afterword, acknowledgements, thank-you pages, About the Author and custom pages.",
      "Non-chapter pages can be placed inside or outside Parts and participate in the same manuscript drag-and-drop ordering as chapters.",
      "Page type can be changed later from the manuscript notes panel or Manuscript Manager."
    ],
    changed:[
      "Chapter Manager is now Manuscript Manager and treats chapters and non-chapter pages as one ordered manuscript.",
      "Chapter numbering now ignores non-chapter pages while remaining dynamic after manuscript reordering.",
      "Export selection metadata now carries page type information so future exporters can preserve front and back matter correctly."
    ],
    fixed:[]
  },
  {
    version:"0.0.14",
    date:"20 September 2026",
    title:"Put chapters in place",
    added:[
      "The Chapter Manager now supports direct drag-and-drop reordering with clear before/after drop indicators.",
      "Dragging a chapter onto a chapter in another Part moves it into that Part and immediately recalculates chapter numbering."
    ],
    changed:[
      "The Chapter Template designer now uses normal page scrolling instead of separate scrollable panes for the template list, preview and inspector.",
      "Manuscript sidebar dragging now uses cursor position to place chapters before or after the target rather than always inserting in one direction."
    ],
    fixed:[]
  },
  {
    version:"0.0.13",
    date:"20 September 2026",
    title:"Choose the chapter",
    added:[
      "Creating a new chapter now opens a template chooser so the author deliberately chooses its layout before writing.",
      "Chapter templates now support a spelled-out number tag with {{chapter_number_word}}, alongside numeric, padded and Roman numeral formats.",
      "Chapter-label and chapter-title text can each use normal, UPPERCASE or lowercase styling and their own custom text colour.",
      "Templates can now be deleted, including the suggested template; another template is promoted automatically when appropriate."
    ],
    changed:[
      "Templates are no longer bulk-applied to existing chapters. Saving a template only saves its design.",
      "The suggested template is simply preselected when creating a new chapter rather than being silently assigned by the server."
    ],
    fixed:[
      "Newly created templates now return their template ID correctly to the designer."
    ]
  },
  {
    version:"0.0.12",
    date:"20 September 2026",
    title:"Design the opening",
    added:[
      "The Chapter Template editor is now a live chapter designer using the same header renderer as the real manuscript.",
      "Templates can preview against any real chapter so authors can judge the opening beside actual manuscript text before saving.",
      "Chapter labels and titles now have independent alignment, font family, size, weight and spacing controls.",
      "Header images can be positioned before the label, between label and title, after the title or after the divider.",
      "Divider width and thickness, image spacing, and top/bottom header spacing are now configurable."
    ],
    changed:[
      "Template edits remain drafts until Save Template is pressed, with unsaved-change protection when switching templates.",
      "The live manuscript and template designer now share one rendering component so saved designs match what authors see while writing."
    ],
    fixed:[
      "Template deletion now explicitly detaches existing chapters before removing the template, avoiding foreign-key edge cases and providing clear failure feedback.",
      "Existing templates now retain their database IDs when the Chapter Manager loads, so templates created before v0.0.13 can be edited and deleted normally.",
      "Chapter numbers now follow the visible manuscript order across Parts instead of sticking to their earlier global position; moving a chapter automatically renumbers the manuscript."
    ]
  },
  {
    version:"0.0.11",
    date:"20 September 2026",
    title:"Shape every chapter",
    added:[
      "A dedicated Chapter Manager for renaming, organising, reordering and opening chapters from one place.",
      "Reusable chapter templates with dynamic tags for chapter number, padded number, Roman numerals, chapter title, Part title and novel title.",
      "Template header images with adjustable width and alignment, plus optional per-chapter image overrides.",
      "A live template preview and one-click option to apply a template to chapters that do not yet have one.",
      "A project-wide image library lets manuscript and chapter-template images be reused instead of uploaded repeatedly."
    ],
    changed:[
      "New chapters automatically inherit the novel's default chapter template when one exists.",
      "Templated chapter openings are rendered separately from manuscript prose, so renaming or reordering a chapter updates the displayed heading automatically."
    ],
    fixed:[
      "Partial chapter metadata updates now preserve existing summary and status values instead of resetting omitted fields.",
      "Pressing Enter in manuscript prose now starts the next paragraph without adding an extra paragraph-sized gap; deliberate blank paragraphs still remain possible.",
      "The manuscript alignment controls now use distinct left, centre and right icons instead of three identical symbols."
    ]
  },
  {
    version:"0.0.10",
    date:"20 September 2026",
    title:"Connect the cast",
    added:[
      "Character profiles can now link directly to other characters using family, romantic, social, rivalry and mentor relationships.",
      "Relationship cards support optional custom labels and private notes, with one-click navigation to the connected character.",
      "A family-tree-style Relationship Map shows parents, grandparents, siblings, partners, children and grandchildren around any selected character.",
      "The Relationship Map also surfaces friendships, allies, rivals, enemies, mentors and other direct connections."
    ],
    changed:[
      "Deleting a character now also removes relationship links involving that character while leaving the remaining character profiles untouched."
    ],
    fixed:[]
  },
  {
    version:"0.0.9",
    date:"20 September 2026",
    title:"Put a face to the name",
    added:[
      "Character profiles can now hold multiple reference images, uploaded by file picker or drag and drop.",
      "The first character image becomes the portrait used in the profile and cast list, and any reference image can be promoted to portrait.",
      "Character images can carry short captions or reference notes and can be removed from a bio without deleting the underlying project asset."
    ],
    changed:[
      "Character portraits now appear throughout the cast list when available."
    ],
    fixed:[
      "Corrected the shared workspace-sidebar imports that caused the previous persistent-sidebar build to fail."
    ]
  },
  {
    version:"0.0.8",
    date:"20 September 2026",
    title:"Stay in the forge",
    added:[
      "A persistent project sidebar for the Characters and Cork Board workspaces, with the same novel navigation and theme controls used by the manuscript."
    ],
    changed:[
      "Moving between Manuscript, Characters and Cork Board now feels like navigating one workspace instead of opening separate mini-apps.",
      "Secondary workspaces use the same responsive sidebar drawer pattern on smaller screens."
    ],
    fixed:[]
  },
  {
    version:"0.0.7",
    date:"20 September 2026",
    title:"Meet the cast",
    added:[
      "A dedicated Characters story-bible workspace linked directly from the manuscript sidebar.",
      "Structured character profiles for aliases, role, pronouns, age, description, appearance, personality, background, motivations, conflict, arc and private notes.",
      "Character search, autosave, quick creation and protected permanent deletion."
    ],
    changed:[
      "Character profiles save independently from manuscript chapters so world-building work can happen without touching chapter content."
    ],
    fixed:[]
  },
  {
    version:"0.0.6",
    date:"20 September 2026",
    title:"Write without fear",
    added:[
      "A chapter Revision History showing automatic writing snapshots with timestamps and read-only previews.",
      "One-click restoration of older chapter versions while automatically saving the current version first.",
      "Revision snapshots now retain chapter summary and status as well as title and manuscript content."
    ],
    changed:[
      "Chapter history can be opened directly from the manuscript header.",
      "Revision previews show word-count differences between the selected snapshot and the current chapter."
    ],
    fixed:[]
  },
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
