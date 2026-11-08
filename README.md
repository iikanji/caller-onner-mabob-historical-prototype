# Student Caller Micro-App

**A teacher-designed Google Apps Script classroom tool for randomized student selection, participation tracking, and teacher-managed session queues.**

> **Archive status:** De-identified source-code snapshot supplied for academic documentation. This is a historical prototype, **not a security-audited or production-ready application**. Its original behavior has been preserved apart from replacing identifying configuration values and the author's name in the title.

## Why this app exists

Calling on students in a classroom can be difficult to manage fairly. Teachers may unintentionally select the same students repeatedly, lose track of who has participated, or struggle to adjust when someone is absent. This micro-app creates a shuffled class queue and gives teachers a simple way to work through students during a lesson. The teacher remains responsible for deciding how to use each selection.

The app was built with **Google Apps Script (GAS)**, a spreadsheet-based roster, and an optional Google Drive folder of student photos. The teacher can register class/subject combinations as sessions, choose a whole class or a subgroup (前班 / 後班), display the selected student's name and optional information, view the next student on deck, and track selections across a round.

### Teacher–AI Development Conversation

The teacher–AI conversation documenting the development of this application is archived on Zenodo. The transcript provides a record of the conversational design process, illustrating how a teacher used AI assistance to translate a classroom problem into a functioning Google Apps Script micro-app through iterative dialogue, testing, and refinement.

**Reference**

Emmett, D. (2026). *Caller-Onner Mabob: A teacher–AI app development transcript* (Version 1.0). Zenodo. https://doi.org/10.5281/zenodo.24047003

**Access the archived transcript:** https://doi.org/10.5281/zenodo.24047003

## Main features

- Registers or unregisters teacher-specific class/subject sessions (identified in the original code through the active user's email).
- Creates a randomly shuffled queue using Fisher–Yates, excluding students previously recorded as `Called` or `Skipped` for the selected teacher/session.
- Supports whole-class selection and two optional groups, identified by `1` and `2` in the roster.
- Displays student name, furigana, identifier, optional notes, and photo when available.
- Offers **Next Student**, **Absent / 欠席**, and **Skip** actions; includes a **Photo** display toggle and an **On Deck** preview.
- Provides **Start New Round** to reset saved session statuses.
- Uses a compact, mobile-oriented interface with a short transition animation.

**Important behavior:** In the supplied version, *Absent* and *Next Student* both record `Called`, while *Skip* records `Skipped`. Absences are therefore **not separately distinguishable in the Tracking sheet**. Do not describe it as producing validated attendance records.

## Relationship to the seven-stage voice-assisted development workflow

This repository illustrates the type of teacher-built micro-app discussed in the accompanying scholarly project on conversational AI and teacher agency. That project describes seven stages:

1. **State the seed:** Identify the practical classroom problem: choosing students without repeatedly relying on memory or paper lists.
2. **Keep the AI in inquiry mode:** Clarify the classroom routine, roster structure, absence handling, and what fairness means for a teacher's context before generating code.
3. **Produce a mission brief:** Agree on who will use the app, which records it reads, how selection and tracking should work, and what constitutes success.
4. **Map the logic:** Read a class roster, filter eligible students, shuffle a queue, display a student, record the action, and move to the next student or begin another round.
5. **Define the interface:** Prioritize large controls, readable student information, optional images, and a straightforward selection workflow.
6. **Generate the blueprint:** Specify GAS functions, Sheets tabs, Drive photo lookup, HTML templates, the client-side queue, and expected error states.
7. **Transfer to code, test, and repair:** Deploy within a controlled Google Workspace environment; test class filtering, absent/skipped cases, photo permissions, status tracking, and concurrency; refine based on actual classroom use.

**Provenance caveat:** These seven stages are an *interpretive mapping of the provided implementation onto the project's workflow*, **not a verbatim record proving that this particular app was developed in precisely this conversational order**. No development chat log for this specific app was provided for this archive. A separately documented conversational transcript should be cited if one is later released.

## Repository contents

```text
student-caller-gas/
├── README.md
├── Code.gs
├── index.html
├── styles.css.html
└── LICENSE
```

The source is meant to be copied into a GAS project rather than served from GitHub directly. In the Apps Script editor, create HTML files named **`index`** and **`styles.css`**; the Apps Script UI adds `.html` to HTML-file names. The literal filename `styles.css.html` in this archive follows the exported/source naming convention, and `include('styles.css')` must match the created GAS HTML file.

## Data structure

The app expects a Google Spreadsheet with three tabs, and an optional Google Drive photo directory. Columns below reflect the provided code rather than a newly designed schema.

### `Roster` tab

| Column | Field | Notes |
| --- | --- | --- |
| A | Grade | Used in session and class filtering |
| B | Class number | Used in session and class filtering |
| C | Student number | Combined with grade and class to create the app's student ID |
| D | Student name | Displayed on screen |
| E | Furigana | Displayed on screen |
| F | Unused by this source | Preserve column position |
| G | Group (`1` or `2`) | Optional 前班 / 後班 filtering |
| H | Student details | Displayed as optional notes |

### `Tracking` tab

| Column | Field |
| --- | --- |
| A | Teacher email |
| B | Session ID (`Grade-Class (Subject)`) |
| C | Student ID |
| D | Status (`Called`, `Skipped`, or reset to `Uncalled`) |
| E | Last updated timestamp |

### `Users` tab

| Column | Field |
| --- | --- |
| A | Teacher email |
| B | Comma-separated registered sessions |

Use headers in row 1. The code assumes at least one student roster row exists; a header-only `Roster` may cause an invalid range in `getAllClasses()` or `getShuffledStudentQueue()`.

### Photos (optional in concept; fetched in this prototype)

`PHOTO_FOLDER_ID` points to a **restricted** Google Drive parent folder. The code looks for a subfolder named for the class (for example `2-3`) and a photo whose filename starts with a zero-padded student number (such as `007...`) or the number plus underscore (such as `7_...`). It converts the image to base64 for display in the browser.

**The code requests photo data even if the Photo toggle is off.** The toggle only changes display visibility; it does not prevent the server from reading or transferring the photo. A privacy-hardened release should conditionally load images only when needed and authorized.

## Setup for inspection or controlled testing

1. Copy the source into a new Google Apps Script project; create `Code.gs`, `index.html`, and an HTML file corresponding to `styles.css`.
2. Create a **new testing spreadsheet**, not a copy containing real student records, with `Roster`, `Tracking`, and `Users` tabs using the schemas above. Add fictional test students.
3. In `Code.gs`, replace `[YOUR_SPREADSHEET_ID_HERE]` with the testing spreadsheet ID and `[YOUR_PHOTO_FOLDER_ID_HERE]` with an appropriately restricted test-photo folder ID. Do not commit the configured files back to a public repository.
4. Ensure the deploying account has authorized access to the spreadsheet and Drive folder and grants the necessary Apps Script scopes.
5. Test through **Deploy → Test deployments**, then configure an appropriate **Web app** deployment for a tightly controlled group of authorized teachers.
6. Verify session registration, correct class filtering, progress through a shuffled queue, status persistence, new-round behavior, missing-photo handling, and denied-access errors.

### Deployment identity and permissions: important

**Do not assume that "Execute as me" + "Anyone" is safe for this particular app.** Unlike a simple anonymous response collector, this application reads and returns student names, IDs, notes, and potentially photos, and also writes tracking data.

- **Recommended for any actual student data:** Limit web-app access to authenticated, authorized educators, preferably within an institution-managed Google Workspace domain. An administrator should assess whether executing as the accessing user or as the developer is appropriate for your institution's configured permissions and identity behavior.
- With **Execute as me**, Apps Script server functions run with the deploying developer's authorized access. A visitor must not be allowed to use those privileges to retrieve rosters or photos unless the app has robust, server-side authorization. This snapshot does **not** contain such an authorization layer.
- `Session.getActiveUser().getEmail()` may return an empty string under some deployment/security contexts. This app depends on that identity for session and status tracking. Test it using the *actual* deployment/access combination, not only the script editor.
- The spreadsheet and photo folder should have **Restricted** sharing and only the minimum authorized school staff access. Do not give students general Viewer access to either source. "Anyone with the link" is not an acceptable folder-sharing setting for student photos.
- Protect the sheet's `Users` and `Tracking` tabs because they contain staff email addresses and student activity metadata. Keep full names, furigana, photos, personal notes, and live spreadsheet/folder IDs out of GitHub and public example screenshots.
- Follow institutional privacy rules, consent practices, retention schedules, and any applicable legal requirements before processing real student information.

**A public GitHub repository makes the source code public, not the connected private spreadsheet or Drive folder.** Nonetheless, copying real credentials, private records, or non-public identifiers into Git history may expose them indefinitely. Review the entire repository before publishing.

## Known limitations and repair priorities

This archive deliberately preserves the supplied application's observable structure; it does not quietly change historical logic.

1. **Insufficient server-side authorization.** Functions that obtain rosters, return photo data, register sessions, and update tracking do not enforce a verified staff-role/roster ownership policy. Restrict deployments until proper access controls are added.
2. **Presence and participation are conflated.** The `absent-btn` calls `handleStudentAction('Called')`. An absence is not marked as `Absent` in the data; tallying `Called` as participation will overstate participation if teachers use this button.
3. **Client-managed queue and asynchronous writes.** The queue is shuffled on the server and then advanced in browser memory, while status writes are asynchronous. Rapid taps, closing the browser, or using multiple devices can cause lost or out-of-order updates. Add acknowledgment, idempotency, and transaction/locking controls for a hardened version.
4. **Status scope is user/session-specific, not a global class-wide rotation.** Separate teachers or subjects can have different selection histories. This is appropriate in some classrooms but should not be misrepresented as global fairness.
5. **Shuffling is not fairness proof.** Fisher–Yates randomizes available students; it does not independently guarantee equitable opportunities across multiple lessons or account for different attendance rates.
6. **Photo handling.** Photos are returned as base64 without an explicit per-photo authorization check; the UI toggle is not a privacy control. Errors during photo retrieval are silently treated as no photo.
7. **Roster and data assumptions.** The app requires its exact tab names/column order and a populated roster. Registration values are not fully verified against server-side class membership.
8. **Input and identity trust.** `markStudentStatus` accepts status/session/student IDs from the browser without verifying allowed status values or class membership. `getShuffledStudentQueue` returns student details for a supplied class/session independently of whether that session is registered to the caller.
9. **Operational edge cases.** Network failures in photo display and status updates lack complete failure handlers; the new-round restart and page transitions merit end-to-end tests.

## Reproducibility and archival ethics

- This package contains **code and documentation only**. It contains no live roster, user list, photos, or student tracking records.
- Replace placeholders locally; never publish populated Apps Script configuration, personally identifiable data, or authenticated URLs.
- For scholarly reuse, describe the artifact as a **de-identified source snapshot** and disclose that deployment safety, classroom effects, and fairness outcomes have not been independently validated from this repository alone.
- If a DOI is minted through Zenodo, archive a tagged release and cite the specific version and DOI rather than only the changing GitHub default branch.
- This README documents software behavior visible in supplied code; it does not establish usage statistics or learning outcomes.

## License

See [`LICENSE`](LICENSE). **No license has been chosen or granted in this package.** The placeholder must be replaced by a deliberate license selection before the repository can be presented as open-source software. Publicly readable code is not automatically licensed for reuse.
