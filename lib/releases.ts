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
    version:"0.0.61",
    date:"25 September 2026",
    title:"Simplify chapters by removing scenes",
    added:[],
    changed:[
      "Chapters now edit as one continuous manuscript surface with no scene strip, scene metadata or nested scene editor.",
      "Existing scene-enabled chapters are folded back into chapter content during migration, preserving their writing and visible * * * manuscript breaks.",
      "Scene creation, splitting, reordering, deletion, metadata, scene-specific navigation, APIs and the Scene database model have been removed."
    ],
    fixed:[]
  },
  {
    version:"0.0.60",
    date:"25 September 2026",
    title:"Make paragraph splitting native to Pages",
    added:[],
    changed:[
      "Pages mode now creates paragraph breaks through the logical manuscript paginator instead of relying on the browser to split fragmented page DOM."
    ],
    fixed:[
      "Pressing Enter inside an existing paragraph no longer allows the browser's contentEditable re-anchoring to send the manuscript view back to the top.",
      "Paragraph splits preserve their logical block identity, inline content and scene ownership across page boundaries."
    ]
  },
  {
    version:"0.0.59",
    date:"25 September 2026",
    title:"Keep paragraph splits in place",
    added:[],
    changed:[],
    fixed:[
      "Pressing Enter to split a paragraph in Pages mode now preserves the manuscript viewport instead of jumping back to the top.",
      "Viewport preservation now includes scrollable editor ancestors as well as the browser window, covering embedded manuscript and template writing surfaces."
    ]
  },
  {
    version:"0.0.58",
    date:"25 September 2026",
    title:"Repair empty template paragraphs",
    added:[],
    changed:[],
    fixed:[
      "Existing template chapters with empty zero-height paragraphs now restore a visible editable line beneath their images.",
      "Empty manuscript paragraphs now have a visible caret target in Pages and continuous writing modes."
    ]
  },
  {
    version:"0.0.57",
    date:"25 September 2026",
    title:"Keep the caret on the clicked page",
    added:[],
    changed:[],
    fixed:[
      "Clicking beneath a template image now focuses a paragraph on that page, even when the template's original blank paragraph appears on the next page.",
      "Clicks on empty manuscript paragraphs explicitly place the caret so typing can begin."
    ]
  },
  {
    version:"0.0.56",
    date:"24 September 2026",
    title:"Reach the blank page caret",
    added:[],
    changed:[],
    fixed:[
      "Blank-area clicks beneath template images now reach the caret placement handler; the editor root no longer causes those clicks to be ignored."
    ]
  },
  {
    version:"0.0.55",
    date:"24 September 2026",
    title:"Edit below template images",
    added:[],
    changed:[],
    fixed:[
      "Clicking the white space below a template image now places the caret in an editable paragraph.",
      "Existing chapters with no editable block on the clicked page receive one before typing."
    ]
  },
  {
    version:"0.0.54",
    date:"24 September 2026",
    title:"Keep image-only chapters editable",
    added:[],
    changed:[],
    fixed:[
      "Image-only chapters now retain an editable paragraph after the final image, including after reload or deletion.",
      "Backspace and Delete preserve the viewport while Pages mode rebuilds the chapter."
    ]
  },
  {
    version:"0.0.53",
    date:"24 September 2026",
    title:"Keep pasted image groups intact",
    added:[],
    changed:[],
    fixed:[
      "Whole-chapter cut and copy now capture the logical manuscript, including every image, even when browser selection HTML omits some figures.",
      "Backspace or Delete on an empty chapter keeps an editable paragraph and caret.",
      "Deleting a selected image removes only that figure while preserving the other images in its pasted group.",
      "Pasted figures containing multiple image elements are separated into individual figures."
    ]
  },
  {
    version:"0.0.52",
    date:"24 September 2026",
    title:"Cut and paste chapters with images",
    added:[],
    changed:[],
    fixed:[
      "Cutting selected manuscript text now keeps embedded images in the clipboard HTML.",
      "Pasting a selection with text and images restores the entire selection rather than only its first image.",
      "Cutting an entire chapter leaves a valid blank paragraph so the chapter can be pasted back immediately."
    ]
  },
  {
    version:"0.0.51",
    date:"24 September 2026",
    title:"Copy images between chapters",
    added:[],
    changed:[],
    fixed:[
      "Copying a selected image or a text selection containing images now puts those figures on the clipboard.",
      "Pasting manuscript figures and clipboard image files works in both Pages and continuous editor modes."
    ]
  },
  {
    version:"0.0.50",
    date:"24 September 2026",
    title:"Clean chapter-to-chapter paste",
    added:[],
    changed:[],
    fixed:[
      "Copying an entire paged chapter into another chapter no longer pastes the physical page frame around its text.",
      "Previously pasted page wrappers are flattened back into manuscript blocks when the chapter loads.",
      "Ctrl+Z and Ctrl+Y (or Cmd+Z and Cmd+Shift+Z) now undo and redo Pages mode edits after repagination.",
      "Selected manuscript images can be copied and pasted, and clipboard image files upload at the caret."
    ]
  },
  {
    version:"0.0.49",
    date:"24 September 2026",
    title:"Keep mid-word edits in place",
    added:[],
    changed:[],
    fixed:[
      "Pages mode finishes restoring the caret before sending edits to the rest of the app.",
      "If an edited page is rebuilt during React synchronisation, its logical caret block keeps the same identity."
    ]
  },
  {
    version:"0.0.48",
    date:"24 September 2026",
    title:"Keep the caret where you put it",
    added:[],
    changed:[
      "Pages mode now preserves the viewport itself during repagination instead of relying on browser scroll anchoring.",
      "New paragraphs receive a stable logical block identity before the page document is rebuilt."
    ],
    fixed:[
      "Pressing Enter near a page boundary no longer leaves the new paragraph temporarily anonymous, which could lose the selection and send the caret to the top of the chapter.",
      "Empty paragraphs created by Enter now have a valid caret restoration target, so a new blank line no longer drops the selection after repagination.",
      "Pressing Enter in the middle of existing text now finalises the browser-created paragraph split before the first repagination, so both halves keep distinct logical identities and the caret stays with the second half.",
      "Browser scroll anchoring no longer competes with Sögur Forge while physical pages are rebuilt.",
      "After a reflow, the caret is restored to the same logical character and the viewport only moves if that position would otherwise be off-screen."
    ]
  },
  {
    version:"0.0.47",
    date:"24 September 2026",
    title:"Images behave like images",
    added:[
      "Selected manuscript images now have an explicit Remove action alongside alignment and size controls."
    ],
    changed:[
      "Images are now atomic editor objects: they can be selected, resized, aligned and removed, but manuscript text cannot be typed into the image frame."
    ],
    fixed:[
      "Deleting an image no longer leaves an editable empty figure that can swallow surrounding manuscript text.",
      "Broken image figures from earlier editing are repaired automatically: any prose trapped inside an empty image frame is recovered into normal manuscript paragraphs.",
      "Editor-only contenteditable and draggable image attributes are stripped before manuscript HTML is saved."
    ]
  },
  {
    version:"0.0.46",
    date:"24 September 2026",
    title:"Keep the last character",
    added:[],
    changed:[
      "Pages mode now distinguishes visible text overflow from trailing paragraph spacing at the bottom of a physical page."
    ],
    fixed:[
      "A paragraph is no longer split just because its bottom margin crosses the page boundary when the final rendered line itself still fits.",
      "Closing quotation marks and other final punctuation are no longer orphaned onto a new page when there is room on the preceding line.",
      "Previously stranded punctuation-only blocks at the top of a page can be deleted without throwing the caret back to the chapter start."
    ]
  },
  {
    version:"0.0.45",
    date:"24 September 2026",
    title:"Delete across the page",
    added:[],
    changed:[],
    fixed:[
      "Backspace and Delete now edit the logical paragraph when the caret sits inside a paragraph rendered across multiple physical pages.",
      "Deleting the final character from a page-continuation fragment no longer throws the caret back to the top of the chapter."
    ]
  },
  {
    version:"0.0.44",
    date:"24 September 2026",
    title:"Pages polish",
    added:[],
    changed:[
      "The manuscript formatting toolbar now sits in the editor flow and becomes sticky as you scroll, so it remains accessible without covering the top of the physical page."
    ],
    fixed:[
      "Pressing Enter in Pages mode no longer shifts the whole page just to preserve the caret at the exact same screen pixel.",
      "Caret restoration now scrolls only when the typing position would otherwise fall outside the visible viewport."
    ]
  },
  {
    version:"0.0.43",
    date:"24 September 2026",
    title:"Pages, rebuilt",
    added:[
      "Pages mode now uses real fixed-size page containers with the selected physical dimensions and real top, bottom, inside, outside and gutter margins.",
      "A browser-independent pagination engine splits logical manuscript blocks into rendered page fragments and recombines them unchanged when saving.",
      "Mirrored margins and true recto chapter starts are handled by physical pages, including genuine blank verso pages when required."
    ],
    changed:[
      "Live chapter editing, scene-enabled chapters, chapter templates and Full Manuscript now share the same Pages v2 pagination model.",
      "Scene-enabled chapters are edited as one paged manuscript flow while each block still belongs to its original scene record.",
      "Full Manuscript chapter, scene and section navigation anchors are preserved inside the paginated page stack."
    ],
    fixed:[
      "Page margins can no longer drift between pages because margins are padding on each page itself rather than simulated spacing in a continuous flow.",
      "Text can no longer render through grey page gaps or depend on Chromium-only column-height and column-wrap behaviour.",
      "Paragraphs crossing a page boundary remain one logical paragraph even though they are rendered as fragments on separate physical pages."
    ]
  },
  {
    version:"0.0.42",
    date:"24 September 2026",
    title:"Margins that stay put",
    added:[],
    changed:[
      "Physical sheet backgrounds are now laid out as one CSS page stack using the same page-height and gap variables as the native text fragments.",
      "Wrapped page fragments now use the standards-documented two-axis gap shorthand so every row reserves the full bottom margin, grey page gap and next-page top margin."
    ],
    fixed:[
      "Top-margin alignment no longer drifts page by page from cumulative JavaScript/CSS pixel rounding.",
      "The Pages fallback message is now browser-neutral and never implies trustworthy physical pagination when the current browser lacks the required fragmentation support."
    ]
  },
  {
    version:"0.0.41",
    date:"24 September 2026",
    title:"Native pages",
    added:[
      "Live Pages mode now uses Chromium's native wrapped multi-column fragmentation so editable prose flows between physical page bodies without injecting page-break nodes into the manuscript.",
      "Unsupported browsers fall back to one continuous paper surface instead of allowing text to cross fake page gaps."
    ],
    changed:[
      "Physical sheets are now visual only; the browser's layout engine handles line fragmentation, page-body height and inter-page spacing.",
      "Scene ornaments remain optional and can be suppressed when the next scene naturally fragments onto a fresh page without touching editable text.",
      "New-page chapter starts use native column fragmentation in Full Manuscript."
    ],
    fixed:[
      "Typing can no longer split a word or paragraph around temporary pagination markers, such as leaving a single character stranded before a page gap.",
      "Live page boundaries no longer depend on runtime BR, spacer or margin mutations inside contentEditable.",
      "Caret movement, scrolling and browser editing behaviour are no longer coupled to Sögur Forge inserting and removing page-break nodes while the author types."
    ]
  },
  {
    version:"0.0.40",
    date:"24 September 2026",
    title:"Keep typing",
    added:[],
    changed:[
      "Character profile text fields now use a stable shared field component rather than recreating the textarea component on every character-state update."
    ],
    fixed:[
      "Autosave/state updates on the Characters page no longer unmount the active biography textarea and steal focus after each keystroke."
    ]
  },
  {
    version:"0.0.39",
    date:"24 September 2026",
    title:"Cross the page cleanly",
    added:[],
    changed:[
      "Live line-level pagination now inserts an explicit temporary line break before its measured page spacer, giving contentEditable paragraphs an unambiguous continuation boundary."
    ],
    fixed:[
      "Scene paragraphs that cross a physical page edge no longer rely on a full-width inline spacer alone to force the continuation onto the next page.",
      "Temporary line-break and spacer markers are both stripped before autosave, preserving clean manuscript HTML."
    ]
  },
  {
    version:"0.0.38",
    date:"24 September 2026",
    title:"Keep live pages alive",
    added:[
      "Live manuscript pagination now watches rendered flow height as well as DOM edits, so asynchronously loaded scene content and layout-height changes trigger a fresh page pass."
    ],
    changed:[
      "Page counts now fall back to the actual rendered manuscript height when block measurement is incomplete."
    ],
    fixed:[
      "A transient live-editor DOM range failure can no longer leave pagination permanently locked and unable to recalculate.",
      "The internal pagination lock is always cleared, even when a layout pass encounters temporary contentEditable DOM changes.",
      "The chapter editor can no longer remain on a single physical sheet while prose continues into the grey canvas after a failed layout pass."
    ]
  },
  {
    version:"0.0.37",
    date:"24 September 2026",
    title:"Let paragraphs cross the page",
    added:[],
    changed:[
      "Ordinary prose paragraphs and blockquotes now split by line across physical pages instead of being kept together as a whole block whenever possible."
    ],
    fixed:[
      "Live chapter editing no longer pushes an entire first paragraph — and therefore an apparent whole scene — onto the next page simply because the paragraph does not fully fit in the remaining space.",
      "The live chapter editor now follows the same Word-like line-flow behaviour expected from Full Manuscript pagination."
    ]
  },
  {
    version:"0.0.36",
    date:"23 September 2026",
    title:"Let scenes flow",
    added:[],
    changed:[
      "Scene separators in Pages mode are now treated as optional decoration rather than pagination blocks.",
      "A scene continues naturally on the current page whenever there is usable space."
    ],
    fixed:[
      "Scene breaks no longer force the following scene onto a new physical page.",
      "The * * * ornament is suppressed when the next scene already begins on a new page or when showing the ornament would itself create the page break."
    ]
  },
  {
    version:"0.0.35",
    date:"23 September 2026",
    title:"Clean page boundaries",
    added:[],
    changed:[
      "Line-level page breaks now use a measured full-width inline spacer that participates in the paragraph’s own layout."
    ],
    fixed:[
      "Text no longer relies on block elements embedded inside editable paragraphs to clear a physical page boundary.",
      "Continuation lines now account for the actual rendered spacer position before being moved to the next page body, including the next page’s top margin."
    ]
  },
  {
    version:"0.0.34",
    date:"23 September 2026",
    title:"Keep the prose on the page",
    added:[
      "Page Setup now includes a Paperback defaults shortcut for 11 pt body text, 1.5 line height and a more typical fiction first-line indent."
    ],
    changed:[
      "New unsaved manuscript layouts now use 11 pt / 1.5 leading instead of the oversized 14 pt draft-style defaults."
    ],
    fixed:[
      "Long paragraphs can now break at a line boundary and continue on the next physical sheet instead of running through the page gap.",
      "Runtime line-break spacers are removed before autosave, so physical pagination remains display-only and never contaminates manuscript HTML."
    ]
  },
  {
    version:"0.0.33",
    date:"23 September 2026",
    title:"Put the manuscript on paper",
    added:[
      "Pages mode now renders manuscript prose on physical Word-style sheets using the novel’s saved paper dimensions and margins.",
      "The Pages / Continuous preference can be switched from the manuscript editor, manuscript manager/templates, Full Manuscript and Page Setup.",
      "The same physical-page renderer now serves ordinary chapters, scene-enabled chapters, non-chapter manuscript pages, chapter templates and Full Manuscript.",
      "Pages mode shows the currently viewed page and total pages for the active writing surface and recalculates as prose, formatting or images change.",
      "UK B-format (129 × 198 mm) is now available and is the default layout for novels that have not saved a page setup yet."
    ],
    changed:[
      "Continuous-scene chapters paginate as one chapter rather than restarting pagination for every scene; planning controls do not consume manuscript page space.",
      "Scene boundaries use a clean manuscript scene break in Pages mode while the normal planning divider remains available in Continuous mode.",
      "Full Manuscript uses the same chapter-start flow/new-page/recto markers as the shared paginator.",
      "Runtime page-position adjustments are display-only and are stripped before manuscript autosave, so changing view mode never rewrites prose."
    ],
    fixed:[
      "Formatting and image changes now notify the page renderer immediately so page counts can refresh without a reload."
    ]
  },
  {
    version:"0.0.32",
    date:"23 September 2026",
    title:"Page setup stays in frame",
    added:[],
    changed:[
      "Page Setup now keeps its header and action footer fixed while only the settings area scrolls."
    ],
    fixed:[
      "Page Setup no longer clips lower controls behind the sticky footer on shorter browser windows.",
      "The dialog now stays within the visible viewport on desktop and mobile-height layouts."
    ]
  },
  {
    version:"0.0.31",
    date:"23 September 2026",
    title:"One book, one layout",
    added:[
      "A shared per-novel Page Setup model now stores paper size, custom dimensions, margins, binding gutter, mirrored margins, default prose typography, paragraph rhythm and chapter-start behaviour.",
      "Page Setup is available from the chapter editor, manuscript manager/template area and Full Manuscript view.",
      "Common presets include A4, A5, US Letter, 5 × 8, 5.5 × 8.5 and 6 × 9, with millimetre/inch display and custom dimensions.",
      "The author’s Pages/Continuous preference now has its own user-and-novel record so it stays separate from the book’s physical layout."
    ],
    changed:[
      "Saved default font, font size, line height, paragraph spacing and first-line indent now flow through the same CSS variables across chapters, scenes, non-chapter pages, templates and Full Manuscript.",
      "Page-layout data is stored once for the novel rather than separately on individual writing screens.",
      "The shared layout provider exposes physical page and content dimensions for the next pagination renderer without introducing fake page breaks in this foundation pass."
    ],
    fixed:[]
  },
  {
    version:"0.0.30",
    date:"22 September 2026",
    title:"See the whole story",
    added:[
      "A Full manuscript view now assembles the complete novel in one continuous reading surface, including manuscript sections, chapters, non-chapter pages and scene breaks.",
      "A sticky manuscript navigator jumps to sections, chapters, pages and individual scenes across long books.",
      "Every chapter and scene in the full view links back to the editor at that exact location.",
      "The view exposes Continuous as the current display mode and reserves the same surface for the upcoming Pages mode once page setup is available."
    ],
    changed:[
      "Opening Full manuscript now flushes pending scene edits and the current chapter before navigation; save failures block the view instead of silently showing stale content.",
      "Scene-enabled chapters in Full manuscript are assembled directly from authoritative Scene records rather than relying on the cached Chapter aggregate.",
      "Full manuscript and export now share the same manuscript ordering helper and internal-note-markup cleanup."
    ],
    fixed:[]
  },
  {
    version:"0.0.29",
    date:"22 September 2026",
    title:"Move the scene",
    added:[
      "Scene dividers now include a drag handle so authors can reorder whole scenes directly inside the continuous chapter.",
      "The first scene has a matching Move scene handle so every scene can be repositioned without using the scene strip."
    ],
    changed:[
      "Dropping a dragged scene into the upper or lower half of another scene moves it before or after that scene using the existing scene reorder API.",
      "Direct manuscript dragging shows before/after insertion indicators while leaving normal prose selection and editing untouched."
    ],
    fixed:[]
  },
  {
    version:"0.0.28",
    date:"22 September 2026",
    title:"One chapter, every scene",
    added:[
      "Scene-enabled chapters now display every scene in manuscript order on one continuous scrolling writing surface.",
      "Visible editor-only scene dividers make scene boundaries easy to follow without turning them into chapter or page breaks.",
      "Scene navigation now scrolls directly to the selected scene while keeping the rest of the chapter visible.",
      "Each mounted scene receives its own Story Bible highlight layer so References work across the full continuous chapter."
    ],
    changed:[
      "Scene titles and word counts now sit inline with each scene, while the active scene exposes its planning metadata without hiding other prose.",
      "The shared formatting toolbar follows the active scene instead of rendering a separate permanent toolbar for every scene.",
      "Scene autosave, reorder and structure-removal operations flush pending scene edits before structural changes to reduce aggregate-content race conditions.",
      "Scene records remain the authoritative editable content; the Chapter aggregate remains a generated compatibility and export snapshot."
    ],
    fixed:[
      "Multiple simultaneously visible scene editors no longer overwrite each other's Story Bible reference highlights.",
      "Continuous scene editors no longer inherit the full-screen minimum height and bottom padding used by a standalone chapter editor."
    ]
  },
  {
    version:"0.0.27",
    date:"22 September 2026",
    title:"Type your way",
    added:[
      "The manuscript editor now includes shared font-family and point-size controls for chapters, scenes and chapter templates.",
      "Font and size controls follow the current caret or selection and show when a selection contains mixed typography.",
      "A central writing-font and size registry now provides one source for editor typography and the upcoming page-layout and export work."
    ],
    changed:[
      "The formatting toolbar now wraps into organised control groups instead of squeezing or horizontally colliding on narrow writing areas.",
      "Typography controls preserve the active manuscript selection when a dropdown is used, so formatting applies to the selected prose and subsequent typing.",
      "Image formatting controls now remain in normal document flow so a multi-row formatting toolbar cannot overlap them."
    ],
    fixed:[
      "Formatting controls no longer overlap when the available editor width becomes too narrow."
    ]
  },
  {
    version:"0.0.26",
    date:"22 September 2026",
    title:"Corkboard interaction fix",
    added:[],
    changed:[
      "Corkboard double-click creation now only fires on empty board space, never from controls inside an existing sticky note."
    ],
    fixed:[
      "Deleting a corkboard sticky no longer starts a drag or accidentally creates a replacement note.",
      "A sticky is only removed from the local board after its delete request succeeds."
    ]
  },
  {
    version:"0.0.25",
    date:"22 September 2026",
    title:"Templates become manuscript",
    added:[
      "Chapter templates now use the same RichEditor writing area and formatting tools as ordinary manuscript chapters.",
      "The template toolbar can insert dynamic chapter, section and novel tags directly at the writing cursor.",
      "Any existing chapter can be copied into a new template from its chapter tools.",
      "New chapters can choose their Section before creation so section-title tags resolve correctly at seed time."
    ],
    changed:[
      "Choosing a template now copies its complete editor content into the new chapter and resolves dynamic tags once at creation time.",
      "After creation, template text, images and formatting are normal chapter content with no live presentation layer or automatic future rewriting.",
      "Existing legacy template headers are materialised into their chapters on first load, including scene-based chapters and chapter-specific header images, so current manuscript openings are preserved while moving to the new model.",
      "The Manuscript Manager now shows which template a chapter started from as provenance rather than allowing a live template to be swapped onto an existing chapter."
    ],
    fixed:[
      "Template editing no longer uses a separate header designer with its own alignment, spacing, divider and image controls."
    ]
  },
  {
    version:"0.0.24",
    date:"21 September 2026",
    title:"Write-only secrets",
    added:[
      "Admin forms now explicitly identify OAuth client secrets as write-only and explain that saved secret values can only be replaced, never viewed.",
      "SMTP password handling now follows the same write-only presentation, showing only whether a password is configured."
    ],
    changed:[
      "Sensitive OAuth access tokens, refresh tokens, client secrets and SMTP passwords remain excluded from Admin responses, user interfaces and data exports.",
      "OAuth Client IDs remain visible because they are public application identifiers used in provider authorization URLs, not secrets.",
      "Backup setup documentation now reflects the in-app Admin configuration flow instead of obsolete Docker environment variables."
    ],
    fixed:[]
  },
  {
    version:"0.0.23",
    date:"21 September 2026",
    title:"Set it up in the Forge",
    added:[
      "Enabling Google Drive or OneDrive for the first time now opens an Admin setup dialog for the OAuth Client ID and Client secret.",
      "The setup dialog shows the exact callback URL to register with Google or Microsoft and includes a one-click Copy action.",
      "Administrators can reopen provider setup later to replace OAuth application credentials."
    ],
    changed:[
      "Google Drive and OneDrive application credentials are now stored through the Admin panel instead of the Docker stack.",
      "Cloud OAuth client secrets are encrypted with AUTH_SECRET before being written to the database.",
      "A provider cannot be enabled through either the UI or API until its OAuth application is configured.",
      "Changing an OAuth application ID or secret clears existing user refresh tokens for that provider and asks users to reconnect safely.",
      "Dropbox remains unavailable until its connection flow is implemented."
    ],
    fixed:[]
  },
  {
    version:"0.0.22",
    date:"21 September 2026",
    title:"Back it up",
    added:[
      "Google Drive and OneDrive now support one-click per-user OAuth connection from User Settings.",
      "Connected users can choose a personal Sögur Forge backup subfolder and run a cloud backup immediately.",
      "Cloud backup cards show the connected account, last successful backup and the most recent upload error.",
      "Google Drive backups use the narrow drive.file permission; OneDrive uses its dedicated application folder permission."
    ],
    changed:[
      "Google Drive and OneDrive refresh tokens are encrypted with AUTH_SECRET and belong only to the user who connected the account.",
      "Administrator switches remain policy controls only; provider account connections and folders stay in User Settings.",
      "Google uploads use resumable Drive sessions, while OneDrive automatically switches to an upload session for files above the simple-upload limit.",
      "Dropbox remains disabled at the connection layer until Google Drive and OneDrive have been exercised first."
    ],
    fixed:[]
  },
  {
    version:"0.0.21",
    date:"21 September 2026",
    title:"Own the connection",
    added:[
      "Administrators can configure the application SMTP server directly in the Admin panel, including public URL, host, port, TLS, username, password and sender address.",
      "SMTP passwords stored through Admin are encrypted with a key derived from AUTH_SECRET, and administrators can send a test email before relying on the configuration.",
      "Password reset is now available from the sign-in screen using expiring one-time email links and automatic session revocation after a successful reset.",
      "Each user can now save their own Dropbox, Google Drive and OneDrive backup preference and target folder in User Settings."
    ],
    changed:[
      "Backup policy and backup ownership are now separated: administrators only enable or disable provider types, while individual users configure their own destinations.",
      "Cloud provider availability no longer depends on administrator-owned storage credentials.",
      "Application email settings in the Admin panel take priority over SMTP environment-variable fallbacks.",
      "User data exports now include the user's non-secret backup destination preferences."
    ],
    fixed:[]
  },
  {
    version:"0.0.20",
    date:"21 September 2026",
    title:"Choose the safety net",
    added:[
      "Administrators can now decide which backup destinations are available to users: browser download, Dropbox, Google Drive and OneDrive.",
      "Cloud backup methods report whether the server has the required OAuth application credentials before the administrator can enable them.",
      "User Settings now only surfaces backup destinations enabled by the administrator."
    ],
    changed:[
      "The clean Download all my data export remains available regardless of backup-destination policy so users retain direct control of their information.",
      "Cloud backup credentials are separated into server-owned OAuth application credentials and future per-user cloud authorisation tokens.",
      "The local backup endpoint now enforces the administrator's backup-download policy server-side rather than only hiding the button."
    ],
    fixed:[]
  },
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
